# Authority Operation, Binding, Request, and Response Models

`pc_0135` adds the sealed authority transport spine used before any live authority call and during
response normalization.

## Model Boundaries

- `AuthorityOperation` freezes requested scope, executable runtime scope, tenant/client/attempt
  lineage, provider environment/version/scope, target obligation/basis, partition scope, and the
  authority binding lineage selected during preflight.
- `AuthorityBinding` freezes the executable authority edge: internal authorization lineage,
  authority link, delegation posture, token/client binding, binding lineage, preflight token version,
  binding health, expiry, and step-up or approval evidence.
- `AuthorityRequestEnvelope` freezes canonical path/query/body identity, sorted header and partition
  profiles, normalized `<NONE>` sentinels, fraud-header evidence refs, idempotency, request hash,
  duplicate meaning key, authority-layer boundary, and the grouped `request_identity_contract`.
- `AuthorityResponseEnvelope` records one normalized authority observation. It distinguishes inline
  HTTP, callback, poll, timeout placeholders, recovery reads, corroboration, conflict, timeout
  supersession, and ambiguous correlation without overwriting earlier observations.

## Guarded Rules

- `runtime_scope[]` must remain canonical and within `requested_scope[]`.
- Mutation, calculation, and submission families must carry non-empty business partitions.
- `token_version_ref` stays sealed on `AuthorityBinding`; send-time rotation belongs to later
  interaction records, not request identity.
- Delegated acting requires `delegation_grant_ref`; self-acting clears it.
- Null request or response bodies use the literal `<NONE>` body-hash sentinel.
- Async responses require `ingress_receipt_ref` and `authority_ingress_proof_contract`; inline and
  timeout responses keep ingress proof null.
- Timeout placeholders keep body, status, delivery, and ingress refs empty, with provisional legal
  effect.
- Response repositories are append-only by `response_id`, preserving earlier provisional/conflict
  observations when later recovery or corroborating responses arrive.

## Persistence

The migration
`db/migrations/phase03_0135_authority_operation_binding_request_response_models.sql` creates tables
for operations, bindings, request envelopes, and response envelopes with JSONB columns for the
schema-backed subcontracts and indexes for manifest, binding, duplicate, idempotency, and response
history lookup.
