# Pre-Seal Gate Chain And Seal

`pc_0105` adds the manifest-owned pre-seal gate tape and the seal transition that consumes it.

## Gate Tape

The canonical pre-seal prefix is fixed:

1. `MANIFEST_GATE`
2. `ARTIFACT_CONTRACT_GATE`
3. `INPUT_BOUNDARY_GATE`
4. `DATA_QUALITY_GATE`

`preseal_gate_evaluation` stores the exact `execution_basis_hash`, `access_binding_hash`, authorized executable scope, required gate order, evaluated gate order, ordered gate decision ids, blocking gate codes, completion state, durability boundary, and reuse policy. `PENDING_PREREQUISITES` publishes no persisted gate tape. `COMPLETE_READY_TO_SEAL` and `COMPLETE_BLOCKED_PRESTART` require all four canonical gates exactly once.

## Storage Boundary

Gate decisions are carried through `append_only_outcome_projection.gating_decisions`; the top-level `RunManifest.gating_decisions` array is a synchronized mirror. Pre-seal persistence replaces the pending placeholder with the canonical four-gate prefix. Post-seal appends may add later gates after that prefix, but cannot rewrite, reorder, or weaken the published pre-seal gate records.

## Seal Readiness

`sealManifest` requires a `FROZEN` manifest with config freeze, input freeze, `hash_set.execution_basis_hash`, `hash_set.manifest_hash`, frozen execution binding, append-only outcome projection, aligned lineage mirrors, and a `COMPLETE_READY_TO_SEAL` pre-seal evaluation. The transition writes `sealed_at`, creates the `UNCLAIMED_SEALED` start-claim placeholder, and records the lifecycle transition through the repository compare-and-swap boundary.

If any pre-seal gate has blocking semantics (`OVERRIDABLE_BLOCK`, `HARD_BLOCK`, or `blocking_class = BLOCKED`), the same service persists the blocked pre-start gate tape and transitions to `BLOCKED` through `seal_blocked`; it does not set `sealed_at`.

## Reuse

Same-manifest pre-start reuse and future replay work must reload the persisted pre-seal tape and validate it against `preseal_gate_evaluation`. Recomputing that tape from ambient live state is not an acceptable substitute.
