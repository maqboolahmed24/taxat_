# RunManifest Repository And Lifecycle

`pc_0097` creates the first durable manifest spine. The package is [packages/backend-manifest](/Users/test/Code/taxat_/packages/backend-manifest), and the control-store shape is [phase03_0097_run_manifest_core.sql](/Users/test/Code/taxat_/db/migrations/phase03_0097_run_manifest_core.sql).

## Storage shape

The root row lives in `control_manifest.run_manifest_register`.

- Scalar columns hold immutable identity, lineage mirrors, lifecycle state, row version, idempotency key, and the frozen build or environment envelope.
- Typed `jsonb` columns carry nested contracts that are authoritative packets in the algorithm corpus:
  `truth_boundary_contract`, `schema_reader_window_contract`, `invariant_enforcement_contract`,
  `state_transition_contract`, `manifest_branch_decision`, `continuation_set`,
  `scope_execution_binding`, `config_freeze`, `input_freeze`, `hash_set`,
  `frozen_execution_binding`, `preseal_gate_evaluation`, `manifest_start_claim`,
  and `append_only_outcome_projection`.
- Structured output links are projected into `control_manifest.run_manifest_output_link_register`
  so dependency identity refs stay queryable and never degrade into loose string arrays.
- Named lifecycle transitions are appended to `control_manifest.run_manifest_transition_log`
  rather than inferred from row rewrites.

This keeps one authoritative aggregate shape while still giving the control store direct indexes for lineage, access binding, lifecycle posture, and output-link lookup.

## Concurrency rules

The in-memory repository mirrors the SQL contract with `manifest_row_version`.

- `createManifest(...)` is idempotent for byte-identical payloads.
- `compareAndSwapManifest(...)` rejects stale row versions with
  `RUN_MANIFEST_COMPARE_AND_SWAP_CONFLICT`.
- Indexed identity fields such as `access_binding_hash`, `idempotency_key`,
  `root_manifest_id`, and `parent_manifest_id` are immutable once created.
- Every successful transition writes an append-only transition-log entry with
  the event code, audit ref, reason code, and the new row version.

This closes the gap where manifest lifecycle could otherwise be mutated by arbitrary row updates.

## Mirror policy

Two mirror families are handled differently on purpose.

- Lineage mirrors are fail-closed.
  `root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`,
  `replay_of_manifest_id`, `supersedes_manifest_id`, and `manifest_generation`
  must stay byte-identical across the top-level manifest, `continuation_set`,
  `manifest_branch_decision`, and `frozen_execution_binding` where applicable.
  Loader reads reject drift with typed mirror-validation errors.
- Outcome mirrors are subordinate to `append_only_outcome_projection`.
  Repository writes normalize the structured output-link map and then synchronize
  top-level `gating_decisions`, `output_refs`, `audit_refs`, `submission_refs`,
  `drift_refs`, `decision_bundle_hash`, `deterministic_outcome_hash`,
  and `replay_attestation_ref` from the nested authoritative packet.
  Loader reads still reject corrupted stored drift rather than guessing.

## Placeholder-compatible lifecycle posture

This card does not implement the later orchestration modules for pre-seal evaluation or start claims, but it does make their durable shape unavoidable.

- `freeze_success` requires the frozen execution envelope plus a typed `preseal_gate_evaluation`.
  The default placeholder is `PENDING_PREREQUISITES`, which preserves the rule that pre-seal provenance must exist once a manifest is frozen.
- `seal_success` requires `preseal_gate_evaluation.completion_state = COMPLETE_READY_TO_SEAL`
  and synthesizes an `UNCLAIMED_SEALED` `manifest_start_claim` when the caller has not supplied one.
- Pre-start blocked outcomes keep `BLOCKED` and never disappear as abandoned rows.
- Post-start `system_fault` transitions become `FAILED`; pre-start `system_fault` transitions become `BLOCKED`,
  with `invariant_enforcement_contract` carrying the stage-specific terminal mapping.

## Output-link normalization

`output_ref_projection_normalizer.ts` is the guard against alias-string decay.

- Every output entry must remain a structured object.
- `dependency_identity_refs[]` are sorted and deduplicated deterministically.
- `decision_bundle_hash`, `submission_refs[]`, `drift_refs[]`, and `replay_attestation_ref`
  require matching structured output-link entries.
- The normalized projection recomputes `post_seal_basis_hash` and `projection_hash`
  from canonical content so replay or reload uses one deterministic packet.

## Load behavior

[load_manifest.ts](/Users/test/Code/taxat_/packages/backend-manifest/src/services/load_manifest.ts) validates mirror parity on every read.

- Corrupted lineage mirrors raise `MANIFEST_LINEAGE_PROJECTION_MISMATCH`.
- Corrupted append-only outcome mirrors raise `MANIFEST_OUTCOME_PROJECTION_MISMATCH`.
- Frozen-binding, hash-set, preseal, start-claim, and runtime-posture drift also fail closed.

That gives later cards one durable manifest control object with explicit state, explicit mirrors, and explicit lifecycle evidence instead of controller-local assumptions.
