# Retention Tag, Artifact Retention, And Expiry Limitation Propagation Services

Status: `pc_0209` implemented.

Assumption recorded: `ASSUMPTION_BACKEND_RETENTION_PACKAGE_CREATED`.

## Canonical Source

The canonical backend path now lives in `packages/backend-retention`.

- `deriveRetentionTag(...)` builds the single canonical `RetentionTag`.
- `applyRetentionPolicy(...)` derives the live `ArtifactRetention` lifecycle object bound to that tag.
- `propagateLimitationAndExpiry(...)` projects expiry, limitation, survivability, projection fidelity, and retained basis refs into downstream evidence-bearing artifacts.
- `bindRetentionToErrorAndRemediation(...)` stamps retained failure/remediation companions with the same `artifact_retention_ref`, `retention_class`, and retained basis.

## Explicit Decisions

Anchor events are derived from `RETENTION_ANCHOR_EVENT_BY_OBJECT_CLASS`, not controller-local strings. The mapping covers source records, evidence items, canonical facts, decision bundles, proof bundles, evidence graphs, enquiry packs, run manifests, audit events, error/remediation objects, projections, operational logs, analytics projections, and policy-governed objects.

Expiry is derived from the policy source as:

- `minimum_expiry_at = anchor_timestamp + minimum_retention_days`
- `policy_expiry_at = anchor_timestamp + policy_retention_days`
- `effective_expiry_at = max(minimum_expiry_at, policy_expiry_at)`

Explicit expiry overrides are accepted only when the schema chronology remains valid. Any anchor, minimum, policy, effective, hold-change, or erasure-decision reversal throws a `RetentionModelError`.

Legal hold, proof preservation, and authority ambiguity are exclusive blocking bases on `RetentionTag`. Active or release-eligible legal hold blocks erasure and cannot silently discard proof or authority blocker refs. Proof-preservation and authority-ambiguity refs remain bound to their matching `erasure_eligibility` values.

Limitation-only lifecycle remains distinct from pseudonymisation and erasure. `LIMITED` cannot carry erasure request/action/proof refs. `PSEUDONYMISED` requires `PSEUDONYMISED_SURVIVAL`, limitation reasons, and erasure proof linkage. `ERASED` carries erasure proof linkage but no limitation behavior.

Quantitative semantics follow `retention_and_privacy.md`: `projection_information_ratio <= decision_information_ratio`, `survivability = decision_information_ratio * limitation_explicitness`, and `projection_fidelity = projection_information_ratio / decision_information_ratio` when decision information remains. Silent limitation ambiguity is invalid state and fails closed.

Retained error/remediation/investigation companions must inherit the canonical `artifact_retention_ref` and `retention_class`. The binding service also requires a retained basis ref that matches `retention_basis_ref`, `proof_preservation_basis_ref`, or `authority_ambiguity_ref` on the same tag.

## Validation

Every test-created `RetentionTag` and `ArtifactRetention` is validated through the JSON schema plus Python custom validators. Coverage includes deterministic tag derivation, chronology drift, legal-hold blocking, limitation propagation, survivability/projection fidelity, pseudonymised proof survival, limitation-only separation, and retained failure/remediation binding.
