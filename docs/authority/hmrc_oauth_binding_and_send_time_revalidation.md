# HMRC OAuth Binding And Send-Time Revalidation

HMRC user-restricted endpoints use OAuth 2.0 authorization-code tokens for end-user permission.
The HMRC Developer Hub states that access tokens last 4 hours, refresh tokens are single-use, token
refresh can race under concurrent API access, redirect URIs must match the registered application,
and agents with multiple tokens must use the correct token for each client call:
https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints

Taxat treats those HMRC rules as provider-specific sharpening. The domain invariant is still
stronger: a sealed `AuthorityRequestEnvelope` may never silently rebind to a different subject,
client, authority link, duplicate bucket, or authorization posture after request identity is frozen.

## Seal-Time Identity Tuple

The tuple that must remain unchanged between seal-time and send-time is:

- `authority_link_ref`
- `binding_lineage_ref`
- `tenant_id`
- `client_id`
- `subject_ref`
- `acting_party_ref`
- `delegation_grant_ref_or_null`
- `authority_scope`
- `provider_environment`
- `provider_api_version`
- `access_binding_hash`
- `policy_snapshot_hash`
- required step-up posture and current evidence
- required approval posture and current evidence

`AuthorityBinding.token_version_ref` remains the preflight-selected sealed token version. Delayed
send, queue recovery, replay, and refresh handling must not mutate it.

## Lawful Token Refresh

Refresh is lawful only when `token_version_ref` advances inside the same `binding_lineage_ref` and
the checked token still matches the full tuple above. The service records this as
`TOKEN_ROTATED_WITHIN_LINEAGE`. Reusing the sealed token records `SEALED_TOKEN_VERSION_REUSED`.

Any drift in subject, acting party, client, tenant, authority link, scope, provider environment,
provider API version, access binding hash, policy snapshot hash, or delegation grant blocks the
network action. Required step-up or approval evidence must be explicitly current; missing evidence
is treated as stale.

## Binding Drift Sentinel

`binding_drift_sentinel_contract{...}` freezes:

- sealed binding identity and sealed token version
- checked action class: `TRANSMIT_MUTATION`, `RECONCILIATION_POLL`, or `RECOVERY_READ`
- checked token version, only for clear outcomes
- duplicate bucket consultation state and latest stronger-truth refs
- exclusive send claim state for transmit attempts
- pass reason or sorted block reasons
- `sentinel_contract_hash`

The transmit projection is derived directly from the grouped sentinel:

- `NOT_EVALUATED` -> `send_revalidation_state = NOT_PERFORMED`, no checked time, token, or reasons
- `CLEAR_TO_PROCEED` -> `send_revalidation_state = CLEAR_TO_SEND`, checked time, checked token,
  and one pass reason
- `BLOCKED` -> `send_revalidation_state = BLOCKED`, checked time, null send token, and block reasons

Blocked non-sends remain durable and auditable: checked/send token refs are null and explicit reason
codes are preserved.

## Exclusive Send Claim

The claim compare-and-swap key is `dispatch_ref + request_hash + duplicate_meaning_key`. The
precondition is a dispatch-ready live mutation. The first active owner receives `CLAIM_HELD`, the
same owner can re-enter idempotently after broker redelivery, and any different active owner receives
`CLAIM_CONFLICT`. Claim conflict is persisted as a blocked non-send before any authority bytes leave
the process.

Reconciliation polls and recovery reads reuse the same sentinel vocabulary, but their
`exclusive_send_claim_state` is always `NOT_APPLICABLE`.
