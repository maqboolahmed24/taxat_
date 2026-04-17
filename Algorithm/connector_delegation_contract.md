# Connector & Delegation Contract

This contract defines the durable artifact surface for the connector-delegation layer.

The connector-delegation layer covers provider credential binding, delegated client authority,
external authority-link readiness, bounded exceptional authority, and the frozen operation profiles
used by preflight and governance tooling.

## Connector and delegation artifacts

`ConnectorBinding` SHALL validate against `schemas/connector_binding.schema.json`.

It freezes:

- the provider, environment, and API-version binding
- the client and reporting-subject association
- the scope ceiling and any narrowed partition scope
- token lineage and health posture
- delegation and client-binding readiness

`ConnectorBinding` SHALL therefore bind one immutable `(provider, provider_environment,
provider_api_version, client_id, subject_ref, scopes[], partition_scope_refs[],
binding_lineage_ref)` identity. Token rotation MAY advance `token_version_ref`, but only inside the
same `binding_lineage_ref` and the same client, subject, and executable scope ceiling. Any change to
client, subject, provider environment, provider API version, or lineage basis SHALL allocate a new
binding rather than silently rebinding the old one.

`DelegationGrant` SHALL validate against `schemas/delegation_grant.schema.json`.

It freezes:

- the reporting subject and delegate identity basis
- delegated authority scope and partition scope
- basis type and supporting evidence refs
- imported-basis freshness where the grant comes from authority or handshake evidence
- revocation, expiry, limitation, and supersession posture

`DelegationGrant` SHALL bind one reporting subject to one explicit delegate identity or delegate
class over one canonical authority-scope set and partition-scope set. Imported freshness MAY appear
only for imported or handshake-derived bases. Any change to the reporting subject, delegate, or
granted scope basis SHALL allocate a new grant or superseding grant rather than mutating the old one
in place.
`DelegationGrant` SHALL never encode internal tenant or system-assigned permission. Those facts live
in `PrincipalContext` / `AuthorizationDecision`; collapsing them into client delegation would allow
authority-facing actions to appear delegated when only internal policy allowed them.

`AuthorityLink` SHALL validate against `schemas/authority_link.schema.json`.

It freezes:

- the external authority edge for one client, subject, and authority scope
- delegation linkage when delegated authority is required
- token-binding profile lineage
- validation timing, expiry, and revocation posture
- explicit binding-health and blocked-reason state

`AuthorityLink` SHALL freeze one external-authority edge for one
`(client_id, reporting_subject_ref, authorised_party_ref, authority_name, authority_scope,
provider_environment, provider_api_version)` tuple. If `authorised_party_ref` differs from
`reporting_subject_ref`, the link SHALL retain a non-null `DelegationGrant` lineage; if delegation
is not required, the authorised party SHALL remain the reporting subject. Token profile refresh MAY
advance within the same link lineage, but SHALL NOT silently rebind the link to a different client,
reporting subject, authorised party, or provider contract.

`ExceptionalAuthorityGrant` SHALL validate against
`schemas/exceptional_authority_grant.schema.json`.

It freezes:

- the incident-driven exception scope
- who requested and who approved it
- the required human step-up evidence
- the remaining bounded-use budget
- the compensating controls and explicit non-permitted capabilities

`ExceptionalAuthorityGrant` is a bounded exception, not a replacement authority path. It SHALL keep
requester and approver distinct, SHALL remain incident-scoped and action-family-scoped, SHALL keep
`remaining_uses <= usage_limit`, and SHALL NOT widen client, subject, partition, or token lineage.
It MAY relax only the explicitly approved blocked path for the same client and partition scope, and
it SHALL keep authority acknowledgement, unsupported declaration signing, truth confirmation, and
silent partition widening permanently disallowed.

`AuthorityOperationProfile` SHALL validate against
`schemas/authority_operation_profile.schema.json`.

It freezes:

- the provider contract for one authority operation family
- transport method and path behavior
- required executable scope
- fraud-header posture
- idempotency semantics
- success, pending, unknown, and reconciliation interpretation rules

`AuthorityOperationProfile` SHALL bind one operation family to one provider contract surface. Fraud
header behavior SHALL be explicit through either a profile ref or a concrete exemption reason, never
both, and the required executable scopes SHALL remain canonical so preflight, request hashing, and
replay cannot reinterpret the provider contract from mutable caller context.

## Persistence rule

Before any live authority mutation, calculation trigger, or governance projection that depends on
delegated client authority, the engine SHALL resolve and persist the current:

- `ConnectorBinding`
- `DelegationGrant` where delegated client authority is required
- `AuthorityLink`
- `AuthorityOperationProfile`
- `ExceptionalAuthorityGrant` where any bounded control exception is invoked

This keeps send-time revalidation, UI governance views, and audit or replay flows anchored to the
same explicit control objects rather than to reconstructed ambient session state.

The persistence boundary is also the no-rebind boundary: once the authority path is frozen, later
send-time logic MAY only refresh token versions or validation timestamps inside the already-persisted
lineage. It SHALL fail closed on any attempt to swap client, reporting subject, authorised party, or
token lineage under an existing live authority operation.
