# Authority Ingress Correlation Proof And Reconciliation Control Contract Binding

## Scope

`pc_0213` binds callback, poll, inbox, worker, and gateway-recovered authority ingress to one durable checkpoint path before any normalization or legal-state mutation can proceed.

The canonical backend path is:

1. `checkpointAuthorityIngress(...)` authenticates the provider channel, computes the delivery dedupe key, builds `AuthorityIngressCorrelationContract`, builds `authority_ingress_proof_contract{...}`, and persists `AuthorityIngressReceipt`.
2. `normalizeAuthorityResponse(...)` accepts asynchronous authority responses only when a persisted, authenticated, exact-bound receipt is supplied.
3. `mergeAuthorityResponseObservation(...)` appends normalized observations to response history and marks corroborating, timeout-superseding, or conflicting observations without treating freshness as legal truth.
4. `persistAuthorityReconciliationControl(...)` persists the reconciliation budget, resend legality, escalation ownership, and evidence refs on `AuthorityInteractionRecord`.
5. `projectAuthorityIngressInvestigation(...)` projects quarantined and duplicate-suppressed ingress from persisted receipt truth only.

## Contract Decisions

- `AuthorityIngressCorrelationContract` is exposed as a dedicated backend model module and remains bound to `AuthorityIngressReceipt`.
- Correlation uses persisted request-lineage candidates only. Transport-local memory and recent-request heuristics are forbidden.
- Exact `BOUND` correlation requires one candidate with either `REQUEST_HASH_MATCH` or the full idempotency tuple: `IDEMPOTENCY_KEY_MATCH`, `IDENTITY_NAMESPACE_HASH_MATCH`, and `DUPLICATE_MEANING_KEY_MATCH`.
- `BOUND_WITH_AUTHORITY_REFERENCE_ONLY` is intentionally weak. It retains only authority-reference evidence, quarantines the receipt, and opens reconciliation ownership.
- `AMBIGUOUS` requires at least two candidate lineages and remains reconciliation-owned.
- `UNBOUND` with no provider identity claims remains distinct from no-match with provider claims through `MISSING_PROVIDER_KEYS`.
- Newly persisted exact-bound receipts keep proof `mutation_gate_state = CHECKPOINT_ONLY`; normalization later upgrades the receipt proof to `NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT`.
- Direct async response-envelope construction without persisted ingress proof is blocked. Callback, poll, and recovery observations must use `normalizeAuthorityResponse(...)`.
- `DUPLICATE_SUPPRESSED` receipts point to `canonical_ingress_receipt_ref`, clear normalization fields, and cannot normalize a second response.
- Investigation snapshots include `DIRECT_LEGAL_STATE_MUTATION_FORBIDDEN` and expose only safe next-action codes.

## Non-Mutation Guarantees

- Correlation itself uses `legal_mutation_policy = NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION`.
- Investigation snapshots use `legal_mutation_policy = NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION`.
- Weak, ambiguous, unbound, failed-authentication, and duplicate-suppressed ingress can open investigation or reconciliation work, but cannot drive `SubmissionRecord`, `ObligationMirror`, or interaction settlement as confirmed authority truth.
