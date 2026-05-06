# Erasure Proof, Legal Hold, And Privacy Minimization Workflows

Status: `pc_0210` implemented.

## Canonical Paths

The erasure and legal-hold workflow now extends `packages/backend-retention`.

- `deriveErasureEligibility(...)` is the canonical decision ladder for delete, pseudonymise, retain-with-limitation, or block.
- `applyLegalHold(...)` applies legal-hold state and moves the governed artifact into `LEGAL_HOLD` with checkpoint and workflow refs.
- `releaseLegalHold(...)` releases hold lineage while publishing a release preview before destructive action.
- `executeErasureOrPseudonymisation(...)` performs the lawful completed branch only after a durable action result exists.
- `buildErasureProof(...)` creates the append-only `ErasureProof` and freezes request, basis, target, action, outcome, and timing in `proof_hash`.
- `applyPrivacyMinimizationTransform(...)` centralizes masking, hashing, redaction, tombstoning, dropping, and restore re-entry compensation posture.

## Decision Ladder

Erasure eligibility fails closed in this order:

1. unresolved legal hold
2. unmet statutory minimum or effective retention window
3. unresolved authority ambiguity
4. missing proof-preservation precondition
5. proof-preservation basis that cannot be pseudonymised

If none of those blockers applies, the lawful action is `DELETE` unless the caller requests and the policy permits `PSEUDONYMISE`. Proof-preserving objects with satisfied proof preconditions use pseudonymisation when the policy allows it, preserving explicit limitation behavior and retained basis refs.

## Legal Hold

Legal-hold application never overwrites proof-preservation or authority-ambiguity blockers. A held object must carry `hold_ref`, `next_checkpoint_at`, and non-empty `workflow_item_refs[]`.

Legal-hold release keeps the historical `legal_hold_ref` on `RetentionTag`, clears pending hold controls from `ArtifactRetention`, and emits a preview posture. A release can make an item eligible, but destructive execution remains a separate erasure request/action/proof path.

## Proof

`ErasureProof` follows `erasure_proof.schema.json`: `erasure_proof_id`, `manifest_id`, `target_ref`, `erasure_action_ref`, `proof_hash`, and `created_at`.

Because the schema intentionally does not include request and basis fields directly, `buildErasureProof(...)` includes those details in the deterministic proof preimage and signs them into `proof_hash`. Proof creation is rejected unless the durable action result is already present and `created_at` is not earlier than the action completion time.

## Privacy Minimization

Privacy minimization is centralized for runtime views, exports, diagnostics, support tools, and restore re-entry. Supported field actions are `KEEP`, `MASK`, `HASH`, `DROP`, `REDACT`, and `TOMBSTONE`.

Restore re-entry of resurrected restricted data produces a compensating re-erasure posture. If cleanup is blocked by legal hold, proof preservation, or authority ambiguity, the posture remains blocked and explicit instead of silently re-exposing data.

## Validation

Tests validate `RetentionTag`, `ArtifactRetention`, and `ErasureProof` payloads against canonical schemas and cover legal-hold blocking, minimum-retention blocking, release preview, delete proof creation, pseudonymised proof preservation, privacy minimization, and restore compensating re-erasure posture.
