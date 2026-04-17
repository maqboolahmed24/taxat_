# Nightly Selection Disposition and Batch Isolation Contract

This contract closes FE-55 for nightly autopilot selection completeness, same-window duplicate
suppression, shard isolation, and recovery-reclaim lineage.

## Authoritative surfaces

- `schemas/nightly_batch_identity_contract.schema.json`
- `schemas/nightly_batch_run.schema.json`
- `scripts/validate_contracts.py`
- `tools/forensic_contract_guard.py`

`NightlyBatchRun.identity_contract{...}` is the frozen batch-identity envelope.
`NightlyBatchRun.selection_entries[]` is the authoritative persisted per-candidate disposition set.
`NightlyBatchRun.shard_plan[]` is the authoritative execution-only shard ownership map.

## Identity law

The frozen nightly batch identity SHALL include:

- scheduler tuple fields: `tenant_id`, `nightly_window_key`, `trigger_class`,
  `release_verification_manifest_ref`, `policy_snapshot_hash`, `autopilot_policy_hash`,
  `scheduler_dedupe_key`
- execution-basis fields: `schema_bundle_hash`, `code_build_id`, `environment_ref`
- candidate-universe fields: `selection_universe_hash`, `selection_universe_count`
- reclaim lineage fields: `reclaimed_predecessor_batch_run_ref_or_null`,
  `recovery_resume_state`
- typed policy fields: `identity_binding_policy`, `same_window_duplicate_policy`,
  `candidate_universe_policy`, `terminal_result_reuse_policy`,
  `active_attempt_isolation_policy`, `shard_failure_isolation_policy`,
  `cross_window_continuity_policy`, `recovery_lineage_policy`

`identity_contract_hash` SHALL be the canonical hash of that full tuple.

## Selection law

Every candidate in the frozen nightly universe SHALL materialize exactly one persisted
`selection_entries[]` row. Omission is invalid state.

Each row SHALL persist:

- canonical candidate identity via `candidate_identity_hash`
- one typed `selection_disposition`
- `terminal_result_reuse_state`
- `active_attempt_resolution_state`
- durable continuation lineage through `prior_manifest_ref` and, for continuation children,
  `predecessor_selection_entry_ref_or_null`
- explicit non-execution posture through `reason_codes[]`, `workflow_item_refs[]`,
  `next_checkpoint_at`, and `outcome_bucket`

`REUSE_EXISTING_TERMINAL_RESULT` SHALL win before new manifest allocation.
Same-window active attempts SHALL resolve to `DEFER_ACTIVE_ATTEMPT` or
`EXECUTE_CONTINUATION_CHILD`; they SHALL not silently allocate a duplicate manifest.

## Shard-isolation law

Only execution-capable rows may appear in `shard_plan[].entry_refs[]`.
Reuse, defer, escalation, and skip dispositions SHALL remain off-shard with
`fairness_group_key = null` and `shard_key = null`.

Shard failure SHALL stay explicit:

- `FAILED_ISOLATED`, `TENANT_WIDE_BLOCKED`, and `RECLAIM_REQUIRED` shards SHALL retain
  `blocked_entry_refs[]`
- those same shard states SHALL retain `failure_reason_codes[]`
- unrelated candidates SHALL keep their own persisted `selection_disposition` and
  `outcome_bucket`; shard failure shall not erase explainability for unaffected rows

## Recovery-reclaim law

`RECOVERY_RECLAIM_WINDOW` batches SHALL retain
`reclaimed_predecessor_batch_run_ref_or_null` plus an explicit
`recovery_resume_state` proving whether successor work resumed predecessor shards or reused
predecessor selection under lawful resharing.

Non-recovery triggers SHALL keep predecessor linkage null and
`recovery_resume_state = NOT_APPLICABLE`.
