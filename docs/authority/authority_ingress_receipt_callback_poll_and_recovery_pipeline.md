# Authority Ingress Receipt, Callback, Poll, And Recovery Pipeline

This card implements the ingress-first path for provider-originated authority observations.
`AuthorityIngressReceipt` is checkpoint truth only. It authenticates and records provider bytes before response normalization, but it does not settle legal truth by itself.

## Dedupe Spine

The canonical delivery dedupe key is derived only from:

- `provider_delivery_ref`
- `response_body_hash`
- `ingress_channel_metadata_hash`

The implementation hashes that exact spine with the `AUTHORITY_INGRESS_DELIVERY_DEDUPE_V1` profile and stores the resulting `delivery_dedupe_key`. Callback, poll, inbox, worker-observed, and recovery views of the same provider-visible delivery therefore converge on the same canonical ingress identity.

The first persisted receipt for a dedupe key is canonical. Later receipts with the same key persist as `DUPLICATE_SUPPRESSED`, point `canonical_ingress_receipt_ref` at the first receipt, and cannot create a second normalized response or legal mutation.

## Correlation Taxonomy

- `BOUND`: one exact request lineage matched by `request_hash` or by the exact `(idempotency_key, duplicate_meaning_key, identity_namespace_hash)` tuple.
- `BOUND_WITH_AUTHORITY_REFERENCE_ONLY`: one candidate matched only by `authority_reference`; this stays quarantined.
- `AMBIGUOUS`: more than one candidate matched; `candidate_lineages[]` is preserved for support and reconciliation.
- `UNBOUND`: no candidate matched.
- `UNBOUND_MISSING_IDENTITY_CLAIMS`: unbound substate when the provider payload carries no usable authority reference, request hash, or idempotency tuple.
- `DUPLICATE_SUPPRESSED`: receipt state for repeated delivery of the same dedupe spine; it points to the canonical receipt.

## Mutation Gate

The ingress mutation gate separates four outcomes:

- Response normalization only: authenticated and `BOUND` first-seen receipts may build an async `AuthorityResponseEnvelope`.
- Investigation only: authentication failure, weak binding, ambiguity, and missing-provider-key cases project to `AuthorityIngressInvestigationSnapshot`.
- Reconciliation opening: weak, ambiguous, and unbound cases carry explicit owner/reason codes and safe next actions.
- Legal mutation: allowed only after a receipt is normalized, strongly bound, and a downstream settlement/mirror proof is explicitly scoped to the target artifact.

Inline HTTP and transport timeout responses keep `authority_ingress_proof_contract = null`; they are not authenticated ingress-backed observations.

## Investigation Snapshot Rules

`AuthorityIngressInvestigationSnapshot` is read-side only. It is built solely from the persisted receipt, payload ref/hash, proof contract, correlation contract, duplicate lineage, and audit refs. It exposes candidate comparison and safe next actions such as reconciliation handoff, authentication review, canonical duplicate review, or escalation. It never mutates settlement, mirror, workflow, or customer-visible truth directly.

## Response Merge Rules

Response history remains append-only. A new observation is classified before persistence:

- same authority meaning: `CORROBORATING_OBSERVATION`, no second mutation
- concrete observation after timeout: `SUPERSEDES_TIMEOUT_PLACEHOLDER`, reconciliation required
- contradictory callback/poll/recovery meaning: `CONFLICTING_OBSERVATION`, both refs retained, reconciliation required

`active_response_id` represents the currently admissible meaning, not the latest arrival.

