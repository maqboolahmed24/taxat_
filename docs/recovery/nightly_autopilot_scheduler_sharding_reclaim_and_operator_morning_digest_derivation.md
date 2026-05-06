# Nightly Autopilot Scheduler, Reclaim, and Morning Digest

## Scope

`pc_0207` adds the canonical backend recovery path for nightly shard planning, durable shard leases,
batch heartbeats, stale batch reclaim, quiescence aggregation, and `OperatorMorningDigest`
publication. The services read and mutate persisted `NightlyBatchRun` records only; worker memory,
queue leftovers, logs, and process-local timers are not accepted as recovery or digest truth.

## Stable Shard Assignment

Shard planning derives from persisted `NightlyBatchRun.selection_entries[]` after selection has
completed. Execution-capable rows are only `EXECUTE_NEW_MANIFEST` and
`EXECUTE_CONTINUATION_CHILD`; reuse, defer, escalation, and skip rows remain off-shard.

The stable assignment is:

1. read each execution-capable row's frozen `shard_key`;
2. group rows by that key;
3. sort shard keys lexicographically;
4. sort each shard's `entry_refs[]` by descending `priority_score`, then
   `priority_tuple.stable_tie_break_key`, then `entry_id`; and
5. set `max_concurrent_manifests` from the persisted
   `global_concurrency_profile.per_shard_manifest_limit`.

Duplicate planning calls compare the materialized plan with the persisted one and reuse it when it
already matches. Running or later lifecycle states do not re-plan, so duplicate scheduler delivery
cannot erase active shard ownership.

## Lease and Heartbeat Rules

`claimNightlyShardLease(...)` is the only shard-claim path in `backend-recovery`.

- A claim is legal only from `PLANNED` or idempotently from `RUNNING` by the same owner.
- The first shard claim transitions the batch `PLANNED --batch_started--> RUNNING`.
- Each claim and heartbeat is persisted through `upsertNightlyBatchRunIfRowVersion(...)`, so the
  repository row version acts as the compare-and-swap guard.
- Heartbeats are accepted only from the persisted shard owner and update both
  `shard_plan[].last_heartbeat_at` and `NightlyBatchRun.last_heartbeat_at`.

The stale threshold is the frozen
`NightlyBatchRun.global_concurrency_profile.stale_heartbeat_after_seconds`.

## Stale Reclaim

`resolveStaleNightlyBatch(...)` reclaims only when all durable proof checks are true:

- `last_heartbeat_at` exists and is older than the stale threshold;
- durable selection cursor state was recovered;
- active manifest lease posture was checked; and
- persisted attempt recovery was checked before any successor can resume.

The predecessor is first transitioned to
`RUNNING|QUIESCING|BLOCKED|FAILED --reclaimed_by_successor--> ABANDONED`, records
`successor_batch_run_ref`, and marks null execution outcomes as `FAILED_RETRYABLE` with explicit
workflow handoff refs. A successor `RECOVERY_RECLAIM_WINDOW` batch is then persisted with
`reclaimed_predecessor_batch_run_ref` and `recovery_resume_state =
PREDECESSOR_SELECTION_REUSED_RESHARDED`. Successor selection rows reuse the predecessor candidate
universe and recompute selection-basis hashes under the recovery trigger; no fresh universe query is
performed.

## Lifecycle Decisions

The implemented transitions are:

- `PLANNED --batch_started--> RUNNING`
- `RUNNING --quiescence_reached--> QUIESCING`
- `RUNNING|QUIESCING|BLOCKED|FAILED --reclaimed_by_successor--> ABANDONED`
- `QUIESCING --batch_completed_clean--> COMPLETED`
- `QUIESCING --batch_completed_with_failures--> COMPLETED_WITH_FAILURES`

`QUIESCING` means every selected entry has an explicit terminal or handoff-safe `outcome_bucket`;
it does not mean every client succeeded. `COMPLETED_WITH_FAILURES` is used when the completed digest
contains deferred, waiting, escalated, blocked, or failed outcomes.

## Digest Derivation and Publication QA

`publishOperatorMorningDigest(...)` advances through explicit publication phases:

1. missing workflow settlement leaves `WORKFLOW_PUBLICATION_PENDING`;
2. missing notification or QA settlement leaves `NOTIFICATION_PUBLICATION_PENDING`; and
3. only settled workflow publication, settled notification publication, and QA completion can set
   `PUBLISHED_COMPLETE`.

Before digest publication, unresolved entries are normalized to exactly one persisted workflow item
ref; resolved entries keep no digest workflow refs. The digest derives:

- `summary_counts` from persisted `selection_entries[].outcome_bucket`;
- `outcome_entry_refs` as an exact partition of covered selection entries;
- `queue_summaries` as a partition of persisted published workflow item refs;
- highlighted outcomes ordered by deterministic entry-loss score and `selection_entry_ref` tie-break;
- waiting-on-authority and late-data refs from persisted selection entry identity; and
- backlog, tail-risk, and stability basis hashes from one source batch set.

`OperatorDigestDerivationContract.derivation_contract_hash` freezes the execution boundary hash,
source batch set, persisted and workflow outcome counts, workflow and notification settlement
timestamps, QA timestamp, covered-entry hash, outcome partition hash, queue partition hash,
highlight order hash, workflow ref-set hash, notification ref-set hash, authority-wait hash,
late-data-hold hash, and supersession lineage.

Publication QA fails closed when any mirrored partition hash drifts from the published digest.

## Supersession

Initial digest publication uses `supersession_state = INITIAL_PUBLICATION` and no supersession
pointer. Recovery publication uses `RECOVERY_SUPERSESSION`, increments generation, preserves the
root digest lineage, points at the replaced digest, and requires non-empty reason codes.
