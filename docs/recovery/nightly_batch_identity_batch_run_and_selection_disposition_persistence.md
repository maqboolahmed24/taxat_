# Nightly Batch Identity, Batch Run, and Selection Disposition Persistence

`pc_0206` adds the canonical backend path for tenant-scoped nightly batch allocation and persisted selection rows.

## Contract Grounding

- `NightlyBatchIdentityContract` is built from the full scheduler, release, policy, schema, build, environment, universe, and recovery tuple. Its `identity_contract_hash` is the canonical hash of those structured fields, not an opaque scheduler token.
- `scheduler_dedupe_key` is the SHA-256 digest of `tenant_id | nightly_window_key | trigger_class | release_verification_manifest_ref | policy_snapshot_hash | autopilot_policy_hash`, matching `nightly_autopilot_contract.md`.
- `selection_universe_hash` is the canonical hash of the sorted persisted `candidate_identity_hash` set. `selection_universe_count` must equal `selection_entries.length`.
- `NightlyBatchRun` keeps `run_kind = NIGHTLY`, `execution_posture = LIVE_COMPLIANCE`, `legal_effect_boundary = COMPLIANCE_CAPABLE`, `schema_reader_window_contract.writer_schema_bundle_hash = schema_bundle_hash`, and `state_transition_contract.object_family = NIGHTLY_BATCH_RUN`.

## Allocation And Duplicate Delivery

`allocateNightlyBatchRun(...)` first looks up the scheduler dedupe key in `NightlyBatchRunRepository`.

- If a matching non-terminal batch exists, the service returns `REUSED_ACTIVE_BATCH`.
- If a matching terminal batch exists, it returns `BATCH_ALREADY_TERMINAL`.
- If release admissibility, policy snapshot, or tenant schedule scope is not frozen, the persisted batch lands in `BLOCKED` with an empty universe instead of starting selection or execution.
- Otherwise the service selects the portfolio and persists a `PLANNED` batch with complete `selection_entries[]` and shard coverage in one repository write.

The repository also rejects a second non-abandoned batch for the same `tenant_id` and `nightly_window_key`.

## Selection Disposition Precedence

`selectNightlyPortfolio(...)` resolves every candidate to exactly one persisted row. The implemented precedence is:

1. reusable terminal result
2. stale-attempt continuation child
3. same-window active-attempt deferral
4. retry-window deferral
5. operator escalation
6. ineligible skip
7. fresh execution

Terminal-result reuse therefore wins before any fresh or continuation manifest allocation. Same-window active attempts cannot silently become `EXECUTE_NEW_MANIFEST`.

## Persistence Rules

`persistNightlySelectionDispositions(...)` transitions the batch from `SELECTING` to `PLANNED`, rebuilds the identity contract with the persisted universe hash/count, derives accounting counters from row outcomes, and builds execution-only shard coverage.

Non-execution dispositions remain off-shard with `fairness_group_key = null` and `shard_key = null`. Reuse, defer, escalation, and skip rows retain explicit outcome buckets so digest and recovery paths do not reconstruct intent from queue state, worker memory, or logs.

`RECOVERY_RECLAIM_WINDOW` batches require `reclaimed_predecessor_batch_run_ref` and a non-`NOT_APPLICABLE` `recovery_resume_state`; scheduled and manual retry windows force predecessor linkage to `null`.
