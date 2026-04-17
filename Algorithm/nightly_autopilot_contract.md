# Nightly Autopilot Contract

## Purpose

`run_kind = NIGHTLY` already exists in the core engine, but the control-plane behavior that selects,
orders, executes, recovers, and hands off a nightly portfolio run is otherwise under-specified.
This contract closes that gap.

The nightly autopilot is the tenant-scoped scheduler-driven control plane that:

1. freezes one deterministic overnight operating window;
2. selects the eligible client-period workload for that window;
3. executes only the unattended actions permitted by frozen policy, gate posture, and authority state;
4. fails closed when approval, step-up, ambiguity, or unresolved external truth is required;
5. aggregates outcomes across the portfolio without hiding partial failure; and
6. publishes the next-morning operator digest as `OperatorMorningDigest` and queue-visible next
   actions from persisted truth.
That operator morning digest is a first-class derived artifact of the nightly batch.

The nightly autopilot SHALL remain an orchestrator around `RUN_ENGINE(...)`, not a second decision
engine with independent legal logic.

## 1. Core control-plane principles

1. Nightly automation SHALL be **deterministic**. Given the same frozen portfolio universe,
   policy snapshot, release identity, and durable truth, selection order and batch behavior SHALL be
   reproducible.
2. Nightly automation SHALL be **fail-closed**. Missing governance state, missing release
   admissibility, ambiguous authority truth, step-up requirements, approval requirements,
   unresolved out-of-band truth, and unresolved stale leases SHALL stop or narrow progression rather
   than invite best-effort continuation.
3. Nightly automation SHALL be **manifest-native**. Every autonomous client execution SHALL be
   represented through ordinary `RunManifest` lineage, `DecisionBundle`, gate, workflow,
   authority-protocol, and audit artifacts. The batch controller SHALL not invent a shadow state
   model.
4. Nightly automation SHALL be **portfolio-aware but client-isolated**. One client failure SHALL NOT
   corrupt successful outcomes for other clients, but one tenant-wide safety failure MAY stop the
   whole batch.
5. Nightly automation SHALL be **human-bounded**. It MAY collect, compute, prepare, submit,
   reconcile, or open follow-up work only when those actions are explicitly permitted by frozen
   unattended policy and current legal state. It SHALL NOT self-satisfy approval, step-up,
   exceptional-authority, or ambiguous-authority requirements.
6. Nightly automation SHALL be **handoff-complete**. When work cannot finish autonomously, the
   system SHALL persist deterministic queue-visible next actions plus a next-morning
   `OperatorMorningDigest`; it SHALL NOT leave operators to reconstruct overnight posture from raw
   logs.

## 2. Trigger contract and frozen operating window

### 2.1 Trigger source

A nightly batch MAY be started only by one of the following trigger classes:

- `SCHEDULED_WINDOW`
- `MANUAL_RETRY_WINDOW`
- `RECOVERY_RECLAIM_WINDOW`

`SCHEDULED_WINDOW` is the ordinary tenant schedule.
`MANUAL_RETRY_WINDOW` is an operator-approved rerun of the same nightly window.
`RECOVERY_RECLAIM_WINDOW` is a successor batch created only to reclaim a stale or failed prior batch.

No other trigger SHALL allocate `run_kind = NIGHTLY` manifests.

### 2.2 Batch allocation and duplicate suppression

Before any client selection begins, the scheduler SHALL allocate or recover exactly one
`NightlyBatchRun` for the tuple:

`(tenant_id, nightly_window_key, trigger_class, release_verification_manifest_ref, policy_snapshot_hash)`

using:

`batch_scheduler_dedupe_key = hash(tenant_id | nightly_window_key | trigger_class | release_verification_manifest_ref | policy_snapshot_hash | autopilot_policy_hash)`

Rules:

- duplicate scheduler deliveries for the same dedupe tuple SHALL return the same active batch or a
  typed `BATCH_ALREADY_TERMINAL` result;
- a second active batch for the same tenant and `nightly_window_key` SHALL NOT exist unless the
  earlier batch has already been marked `ABANDONED` by successor reclamation;
- selection SHALL NOT begin until release admissibility, policy snapshot capture, and tenant schedule
  scope are all frozen and referenced from the allocated batch; and
- a batch SHALL be marked `BLOCKED` rather than `RUNNING` when those prerequisites cannot be proven.

### 2.3 Frozen batch envelope

`NightlyBatchRun` SHALL freeze at minimum:

- `identity_contract{ tenant_id, nightly_window_key, trigger_class, release_verification_manifest_ref, policy_snapshot_hash, autopilot_policy_hash, scheduler_dedupe_key, identity_binding_policy, same_window_duplicate_policy, cross_window_continuity_policy, recovery_lineage_policy }`
- `identity_contract_hash`
- `tenant_id`
- `nightly_window_key`
- `trigger_class`
- `reclaimed_predecessor_batch_run_ref` when `trigger_class = RECOVERY_RECLAIM_WINDOW`
- `scheduled_for`
- `trigger_observed_at`
- `initiating_principal_context_ref`
- `policy_snapshot_hash`
- `autopilot_policy_hash`
- `release_verification_manifest_ref`
- `schema_bundle_hash`
- `code_build_id`
- `environment_ref`
- `global_concurrency_profile{...}`
- `selection_universe_hash`
- `selection_universe_count`
- `scheduler_dedupe_key`
- `recovery_resume_state`

The batch envelope SHALL be append-only after allocation except for lifecycle, heartbeat, counters,
selection results, shard ownership, and outcome aggregates.
`reclaimed_predecessor_batch_run_ref` SHALL remain null for non-recovery triggers so ordinary
scheduled or manual-retry windows cannot masquerade as stale-batch reclamation.
`identity_contract{...}` SHALL mirror the structured scheduler dedupe tuple so batch identity is
not reduced to one opaque hash string. It SHALL also freeze schema/build/environment lineage,
selection-universe identity, typed same-window reuse posture, typed active-attempt isolation, and
typed shard-failure isolation so nightly recovery cannot hand-wave which batch lawfully owns one
window.

## 3. Nightly manifest launch context

A `run_kind = NIGHTLY` manifest SHALL carry:

- `nightly_batch_run_ref`
- `nightly_window_key`

These fields are part of the frozen manifest identity, not ambient scheduler metadata.
They close two otherwise unsafe ambiguities:

1. **same-window duplicate suppression**: a duplicate scheduler event in the same operating window
   SHALL reuse the same manifest identity or existing decision outcome rather than allocate a second
   autonomous run; and
2. **cross-window continuity**: a later nightly window SHALL NOT collapse into an older terminal
   manifest merely because frozen config and input content happened not to change.

Rules:

- `nightly_batch_run_ref` and `nightly_window_key` SHALL be present on every newly allocated
  `run_kind = NIGHTLY` manifest;
- they SHALL be frozen before manifest freeze/seal and SHALL NOT be patched later;
- child manifests created by the same batch for continuation, late-data branching, or same-window
  recovery SHALL preserve the same `nightly_window_key`;
- a successor recovery batch MAY allocate a new `nightly_batch_run_ref`, but it SHALL preserve or
  explicitly supersede the earlier `nightly_window_key` according to the recovery intent; and
- the manifest-level idempotency key for `run_kind = NIGHTLY` SHALL include `nightly_window_key`.

## 4. Portfolio selection and eligibility contract

### 4.1 Candidate universe

`SELECT_NIGHTLY_PORTFOLIO(...)` SHALL derive its candidate universe only from durable truth,
including at minimum:

- active client roster scoped to the tenant schedule;
- open obligation / filing-case posture for the relevant period;
- latest `DecisionBundle` and `RunManifest` lineage for the client-period scope;
- open workflow items and request-for-info posture;
- authority-link and delegation readiness;
- latest `SubmissionRecord` and reconciliation posture;
- latest `LateDataMonitorResult` and `LateDataPolicyBinding[]`;
- latest drift / amendment posture;
- error and remediation posture when active; and
- the frozen unattended policy matrix for the tenant and client.

The selector SHALL NOT read transient queue position, browser/session state, or ad hoc operator notes
as eligibility truth.

### 4.2 Selection dispositions

Every candidate SHALL resolve to exactly one `selection_disposition`:

- `EXECUTE_NEW_MANIFEST`
- `EXECUTE_CONTINUATION_CHILD`
- `REUSE_EXISTING_TERMINAL_RESULT`
- `DEFER_ACTIVE_ATTEMPT`
- `DEFER_RETRY_WINDOW`
- `ESCALATE_ONLY`
- `SKIP_INELIGIBLE`

The disposition plus its `reason_codes[]` SHALL be persisted on the batch. The selector SHALL never
silently drop a candidate.
`selection_universe_count` SHALL equal the number of persisted `selection_entries[]` so silent
omission becomes invalid state rather than a logging problem.
Each selection row SHALL also retain a canonical `candidate_identity_hash`,
`terminal_result_reuse_state`, `active_attempt_resolution_state`, and
`predecessor_selection_entry_ref_or_null` when continuation-child reclaim lineage is required.

### 4.3 Ineligible or deferred cases

At minimum, the selector SHALL choose `SKIP_INELIGIBLE` or `DEFER_*` rather than execution when any
of the following holds:

- the client is out of tenant schedule scope or onboarding is not yet complete for the requested
  action family;
- no valid delegation or authority-link basis exists for the planned action token;
- the effective unattended policy matrix denies automation for the required stage family;
- an active human-owned workflow item of exclusive class already controls the same legal next step;
- an active manifest start lease still exists for the same client-period/exclusive scope and has not
  expired under policy;
- automatic retry is not yet legal because `next_retry_at` has not been reached;
- the previous authority state is `UNKNOWN` or `OUT_OF_BAND_UNRECONCILED` and the unattended policy
  does not allow reconciliation-only processing for that client;
- the prior run depends on unresolved step-up, approval, or override posture; or
- the client is in a tenant-wide blocked cohort such as legal-hold or incident quarantine where
  autonomous filing progression is suspended.

### 4.4 Reuse before new execution

`REUSE_EXISTING_TERMINAL_RESULT` SHALL be evaluated before any new manifest allocation.
The selector SHALL reuse the prior persisted `DecisionBundle` rather than allocate a new nightly
manifest when all of the following are true:

- the prior manifest is terminal and not superseded for the requested scope;
- no newer late-data, authority, workflow, remediation, or amendment checkpoint has become due for
  the candidate since that terminal outcome;
- no policy change frozen for the current nightly window requires a narrower or broader unattended
  action boundary; and
- the operator-visible next actions derived from the reused bundle remain current.

### 4.5 Continuation and recovery selection

`EXECUTE_CONTINUATION_CHILD` SHALL be used only when the batch can prove that ordinary same-request
bundle reuse is insufficient and one of the following is true:

- sealed-manifest late data requires a new branch under the late-data policy contract;
- a started run requires same-attempt recovery and no active start lease remains;
- drift or amendment posture now requires a new continuation child;
- a prior manifest is waiting on authority and a policy-approved reconciliation checkpoint has become
  due; or
- a successor recovery batch is reclaiming a stale predecessor batch and must continue from durable
  lineage rather than start a second unrelated run.

The selector SHALL NOT allocate a continuation child merely because the scheduler ran again.
When a continuation child is selected, the batch SHALL retain the concrete prior-manifest lineage
that made ordinary result reuse insufficient.
Each `selection_entries[]` row SHALL also retain `candidate_identity_hash`,
`terminal_result_reuse_state`, and `active_attempt_resolution_state` so same-window duplicate
suppression, terminal-result reuse precedence, and recovery-child legality remain durable
control-plane truth.

### 4.6 Autonomous progression admissibility

For every selection entry `i`, the batch SHALL derive a binary unattended-admissibility indicator at
selection time and SHALL recompute it immediately before dispatch:

`admissible_i(t) = I[selection_disposition_i in {EXECUTE_NEW_MANIFEST, EXECUTE_CONTINUATION_CHILD}] * I[policy_allow_i] * I[trust_allow_i] * I[step_up_clear_i] * I[approval_clear_i] * I[override_clear_i] * I[authority_truth_clear_i] * I[exclusive_human_owner_absent_i] * I[manifest_lease_clear_i] * I[(retry_not_required_i) or (next_retry_at_i <= t)] * I[idempotency_preconditions_satisfied_i] * I[(first_attempt_i = 1) or (retry_expected_gain_i(t) > 0)]`

Where each indicator is `1` only when the corresponding safety predicate can be proven from durable
truth. If `admissible_i(t) = 0`, the batch SHALL NOT execute the entry and SHALL instead persist the
strongest applicable non-execution disposition and reason-code set.

`admissible_i(t)` SHALL be computed from persisted truth only; no worker-local cache, broker state,
or optimistic in-memory guess may substitute for a missing proof term.

## 5. Priority and ordering contract

### 5.1 Stable priority score and explainable tuple

The nightly batch SHALL compute a frozen fixed-point `priority_score_i` for each selection entry `i`
at selection time `t0`. The score SHALL be quantized to at least `1e-6` precision and SHALL be
recomputed only by explicit successor-batch recovery or immediate pre-dispatch revalidation against
fresher durable truth.

Let:

- `s_i = max(service_time_floor_minutes, expected_service_minutes_i)`
- `u_i = min(due_at_i, next_checkpoint_at_i)` treating missing terms as `+inf`
- `slack_i = u_i - t0 - s_i`
- `deadline_pressure_i = 0` when `due_at_i = null`; otherwise `sigmoid((-slack_i) / tau_deadline)`
- `checkpoint_pressure_i = 0` when `next_checkpoint_at_i = null`; otherwise `sigmoid((t0 - next_checkpoint_at_i) / tau_checkpoint)`
- `risk_pressure_i = clamp(risk_score_i / 100, 0, 1)`
- `fairness_credit_i = min(1, log(1 + eligible_wait_minutes_i / tau_age) / log(1 + fairness_cap_minutes / tau_age))`
- `retry_value_i = 1` when `first_attempt_i = 1`; otherwise `max(0, min(1, retry_expected_gain_i / progress_value_floor))`
- `backlog_pressure_b = clamp(backlog_work_minutes_b / max(window_service_capacity_minutes_b, service_time_floor_minutes), 0, backlog_pressure_cap)`

Where `sigmoid(x) = 1 / (1 + exp(-x))`.
All weights, floors, caps, and time constants in this section SHALL come from the frozen unattended
policy snapshot or the frozen `global_concurrency_profile`.

The dispatch-value numerator SHALL be:

`dispatch_value_i = w_deadline * (1 + backlog_pressure_b) * deadline_pressure_i + w_checkpoint * checkpoint_pressure_i + w_risk * risk_pressure_i + w_fair * fairness_credit_i + w_retry * retry_value_i`

and the frozen priority score SHALL be:

`priority_score_i = admissible_i(t0) * dispatch_value_i / s_i`

This ratio intentionally normalizes by expected service time so that short, high-value work is not
trapped behind long low-yield work under finite nightly capacity.

For `selection_disposition not in {EXECUTE_NEW_MANIFEST, EXECUTE_CONTINUATION_CHILD}`,
`priority_score_i` SHALL be `0`, but the component pressures MAY still be persisted for digest and
handoff ranking.
Those non-execution rows SHALL remain off-shard with `fairness_group_key = null` and
`shard_key = null` so batch recovery or shard failure does not make reuse, defer, escalation, or
skip posture look like missing state.

The existing explainable tuple SHALL remain present, but it becomes a deterministic coarse
projection of the same underlying inputs rather than an independent ranking rule:

1. `deadline_bucket`
2. `filing_state_bucket`
3. `authority_checkpoint_bucket`
4. `risk_bucket`
5. `automation_readiness_bucket`
6. `retry_ready_bucket`
7. `stable_tie_break_key`

Where:

- `deadline_bucket` orders `OVERDUE`, `DUE_WITHIN_24H`, `DUE_WITHIN_72H`, `FUTURE`, `NO_DEADLINE`;
- `filing_state_bucket` orders `AMENDMENT_WINDOW_ACTIVE`, `READY_TO_SUBMIT`,
  `WAITING_ON_AUTHORITY_CHECKPOINT`, `READY_REVIEW_ONLY`, `GENERAL_ANALYSIS`;
- `authority_checkpoint_bucket` orders candidates whose `next_checkpoint_at` is already due before
  those whose checkpoint is later or absent;
- `risk_bucket` orders higher frozen material risk ahead of lower risk;
- `automation_readiness_bucket` orders fully auto-progressable work before review-only work when
  deadline and risk are equal, so the batch consumes autonomous capacity first without starving
  urgent blocked items from the digest; and
- `stable_tie_break_key_i = hash(client_id | period | ordered(requested_scope[]) | selection_basis_hash)`.

The stable execution order inside one fairness group SHALL be descending by:

`(priority_score_i, deadline_pressure_i, checkpoint_pressure_i, risk_pressure_i, fairness_credit_i, stable_tie_break_key_i)`.

The priority tuple and `priority_score_i` SHALL be frozen per selection entry and SHALL NOT be
recomputed mid-batch except through explicit successor-batch recovery or immediate pre-dispatch
revalidation against fresher durable truth.

### 5.2 Deterministic fairness and anti-starvation scheduler

Execution SHALL NOT consume the batch in pure global score order alone. Within each shard, runnable
entries SHALL first be partitioned by `fairness_group_key`, where:

- `fairness_group_key = authority_name | operation_family` when the next runnable action consumes an
  authority-transmit token; otherwise
- `fairness_group_key = client_id`.

Each group `g` SHALL use deterministic deficit scheduling:

- `quantum_g = base_deficit_quantum_minutes * (1 + overdue_share_weight * overdue_share_g)`
- `deficit_g(r + 1) = min(deficit_cap_minutes, deficit_g(r) + quantum_g)`

When group `g` is visited in stable `group_order_key = hash(fairness_group_key | nightly_window_key)`
order, the head-of-line entry `i` MAY dispatch iff `s_i <= deficit_g(r)` and all resource ceilings
allow it. After dispatch, `deficit_g(r) := deficit_g(r) - s_i`. A skipped group SHALL keep its
accumulated deficit.

`base_deficit_quantum_minutes` SHALL come from the frozen `global_concurrency_profile`.
`overdue_share_weight` and `deficit_cap_minutes` SHALL come from frozen unattended policy.
This rule SHALL prevent one large client or one hot authority edge from starving other admissible
work while remaining deterministic and constant-work per dispatch round.

### 5.3 Capacity deferral and admission control

Let, for each shard `q` over the remaining nightly window:

- `work_q = sum(s_i)` across runnable entries assigned to `q`
- `capacity_q = max_concurrent_manifests_q * remaining_window_minutes_q`
- `rho_q = work_q / max(capacity_q, service_time_floor_minutes)`

and at batch scope:

- `work_b = sum_q work_q`
- `capacity_b = sum_q capacity_q`
- `rho_b = work_b / max(capacity_b, service_time_floor_minutes)`
- `rho_soft = global_concurrency_profile.soft_stability_rho`
- `rho_hard = global_concurrency_profile.hard_stability_rho`

The batch SHALL persist:

- `stability_state = NORMAL` when `rho_b < rho_soft` and every `rho_q < rho_soft`
- `stability_state = SOFT_THROTTLE` when no ratio breaches `rho_hard` but at least one of `rho_b`
  or `rho_q` is `>= rho_soft`
- `stability_state = HARD_THROTTLE` when `rho_b >= rho_hard` or any `rho_q >= rho_hard`

`NightlyBatchRun.backlog_pressure` SHALL equal `backlog_pressure_b`.
For admission control, let `rho = max(rho_b, rho_q)` for the shard currently being considered.

Admission rules:

- `rho < rho_soft`: normal admission
- `rho_soft <= rho < rho_hard`: admit only first attempts plus retries whose
  `retry_expected_gain_i > retry_gain_floor` and whose `deadline_pressure_i` or
  `checkpoint_pressure_i` exceeds the frozen policy floor
- `rho >= rho_hard`: suspend all in-batch retries and non-deadline analysis-only execution; reserve
  remaining capacity for overdue items, due-soon items, checkpoint-due reconciliation, queue
  publication, and deterministic handoff generation

If a candidate is admissible but not admitted under the active `stability_state`, the batch SHALL
record `selection_disposition = DEFER_RETRY_WINDOW` or a batch-level capacity-deferred outcome with
explicit reason codes. It SHALL NOT silently vanish because the window filled up.

## 6. Per-client and per-stage unattended policy matrix

### 6.1 Matrix requirement

Each nightly batch SHALL freeze a tenant/client unattended policy matrix that answers, for every
selected candidate and stage family, one of:

- `ALLOW`
- `ALLOW_IF_TRUST_GREEN`
- `ALLOW_IF_TRUST_GREEN_AND_NO_OPEN_HUMAN_ITEM`
- `REVIEW_REQUIRED`
- `DENY`

At minimum the matrix SHALL exist for these stage families:

- `COLLECT_AND_NORMALIZE`
- `COMPUTE_AND_PARITY`
- `TRUST_AND_GRAPH`
- `PREPARE_FILING_PACKET`
- `SUBMIT_TO_AUTHORITY`
- `AUTHORITY_RECONCILIATION`
- `LATE_DATA_CONTINUATION`
- `DRIFT_AND_AMENDMENT_BRANCH`
- `OPEN_INTERNAL_WORKFLOW`
- `OPEN_CUSTOMER_REQUEST`
- `REPLAY_OR_RECOVERY`
- `OVERRIDE_OR_EXCEPTION`
- `OUT_OF_BAND_STATE_MARKING`

### 6.2 Necessary-but-not-sufficient trust rule

`TrustSummary.automation_level = ALLOWED` is necessary but not sufficient for unattended progression.
Nightly automation SHALL additionally require that:

- `TrustSummary.trust_input_basis_contract.automation_ceiling = ALLOWED` and
  `TrustSummary.trust_input_basis_contract.filing_readiness_ceiling = READY_TO_SUBMIT`;
- `TrustSummary.decision_constraint_codes[] = []` and `TrustSummary.required_human_steps[] = []`;
- `TrustSummary.trust_fresh_until` is either null because no expiring dependency classes exist or is
  still in the future for the current run; and
- the frozen unattended matrix allows the target stage family;
- no current access result requires step-up or approval;
- no current gate requires human review for the same progression point;
- the authority state is not ambiguous for the requested action; and
- no customer-signatory or non-delegable legal act remains unresolved.

Nightly selectors and digests SHALL consume the persisted `trust_input_basis_contract` and
`decision_constraint_codes[]` directly; they SHALL NOT reclassify stale authority, unresolved
pre-trust human steps, or baseline ambiguity from raw scores alone.

### 6.3 Hard unattended boundaries

Nightly automation SHALL NEVER autonomously:

- satisfy `REQUIRE_STEP_UP` or `REQUIRE_APPROVAL` as if already met;
- approve or originate filing-critical overrides;
- originate or self-approve exceptional authority;
- mark `UNKNOWN` or `OUT_OF_BAND` authority truth as `CONFIRMED` without normalized authority basis;
- resend an externally visible mutation after reconciliation-budget exhaustion;
- auto-close a human-review workflow item that it did not resolve through durable upstream truth;
- fabricate client declaration, signatory acknowledgement, or legal sign-off; or
- publish customer-visible legal explanation text that is not derived from a frozen template family
  approved for unattended use.

### 6.4 Safe customer-visible automation

Customer-visible follow-up MAY be published automatically only when all of the following are true:

- the unattended policy matrix explicitly allows `OPEN_CUSTOMER_REQUEST`;
- the outward content is rendered entirely from a frozen template family with typed placeholders;
- the content is derived from persisted workflow/gate posture rather than free-text model inference;
- the action does not itself satisfy sign-off, step-up, or override requirements; and
- the generated request remains fully reconstructible from persisted artifacts and audit evidence.

If any of those conditions fails, the batch SHALL open internal workflow only.

## 7. Batch-run sharding, concurrency, and retry windows

### 7.1 Stable shard plan

`PLAN_NIGHTLY_SHARDS(...)` SHALL derive a stable shard assignment from frozen selection entries.
At minimum it SHALL freeze:

- shard count
- shard key for every selected entry
- per-shard max concurrent manifests
- global max concurrent manifests
- per-authority transmit ceiling
- per-client serialization rule
- soft stability threshold
- hard stability threshold
- retry-capacity fraction
- base deficit quantum
- batch heartbeat interval
- stale-heartbeat threshold

The same frozen selection set and concurrency profile SHALL produce the same shard plan.

### 7.2 Concurrency ceilings

The nightly control plane SHALL enforce at minimum:

- at most one active manifest writer per manifest, using the ordinary manifest start lease;
- at most one active nightly execution for the same client-period and exclusive legal action family;
- a lower or equal authority-transmit ceiling than the generic worker pool ceiling, so portfolio
  scale cannot flood the authority boundary; and
- shard-local failure isolation, so one stuck shard does not serialize unrelated shards.

### 7.3 Retry classes inside a batch

The batch MAY auto-retry only when the linked `ErrorRecord` posture permits retry under the ordinary
error/remediation model.

Rules:

- `SAFE_RETRY` MAY occur inside the same batch only after `next_retry_at`, only while the batch is
  still `RUNNING` or `QUIESCING`, and only while retry admission remains inside the frozen
  `retry_capacity_fraction` of total manifest capacity;
- a retry SHALL additionally require `retry_expected_gain_i > 0`; a non-positive-gain retry SHALL
  become explicit defer or escalation posture instead of speculative overnight churn;
- `RECONCILE_THEN_RETRY` SHALL first complete the required reconciliation artifact and SHALL NOT
  blind-resend a mutation;
- `HUMAN_REVIEW_THEN_RETRY`, `MANUAL_INTERVENTION_REQUIRED`, and `NO_RETRY` SHALL become queue-visible
  handoff outcomes, not background retries;
- retry attempts SHALL preserve the original manifest or authority idempotency scope when the
  operation remains the same;
- deterministic retry phase offset SHALL be derived from the retry idempotency scope so that large
  same-family retry cohorts are spread without introducing replay-breaking randomness;
- when a retry would cross a nightly window boundary, the original batch SHALL defer to a successor
  batch rather than extending indefinitely; and
- batch-level retry counters SHALL be separate from manifest-level or authority-operation-level retry
  counters; neither may overwrite the other.

## 8. Per-client execution algorithm

For each selected entry in deterministic fair-scheduler order, `EXECUTE_NIGHTLY_CLIENT_ATTEMPT(...)` SHALL:

1. re-read the latest durable truth for that specific client-period tuple;
2. confirm the selection entry has not been superseded by a fresher manifest, workflow, or authority
   fact since selection freeze;
3. if the entry disposition is `REUSE_EXISTING_TERMINAL_RESULT`, attach the reused outcome to the
   batch and publish queue/digest consequences without allocating a new manifest;
4. if the entry disposition is `DEFER_ACTIVE_ATTEMPT` or `DEFER_RETRY_WINDOW`, record the defer
   reason and next checkpoint and stop;
5. if the entry disposition is `SKIP_INELIGIBLE`, persist the skip posture and stop;
6. if the entry disposition is `ESCALATE_ONLY`, open or refresh the relevant workflow item and stop;
7. recompute `admissible_i(now)`, `priority_score_i`, and the active shard stability regime from the
   latest durable truth;
8. if execution is still legal and admitted under the active stability regime, invoke
   `RUN_ENGINE(...)` with `run_kind = NIGHTLY` plus the frozen `nightly_batch_run_ref` and
   `nightly_window_key` launch context;
9. adopt the returned `DecisionBundle`, workflow refs, authority refs, and error refs;
10. classify the client outcome into one dominant terminal bucket for aggregation; and
11. release shard capacity without affecting unrelated clients.

Client outcome buckets SHALL include at minimum:

- `AUTO_COMPLETED`
- `WAITING_ON_AUTHORITY`
- `WAITING_ON_LATE_DATA`
- `REVIEW_REQUIRED`
- `REQUEST_CLIENT_INFO`
- `BLOCKED_INTERNAL`
- `FAILED_RETRYABLE`
- `FAILED_NON_RETRYABLE`
- `REUSED_RESULT`
- `DEFERRED`
- `SKIPPED`

## 9. Late data, drift, amendment, replay, and continuation semantics

### 9.1 Late data

If post-seal late data is detected for a client selected by the batch:

- the batch SHALL consult the frozen `LateDataPolicyBinding[]` attached to the current lineage;
- it SHALL NOT mutate the old sealed manifest in place;
- when policy permits automatic adoption, the batch MAY allocate a continuation child with
  `selection_disposition = EXECUTE_CONTINUATION_CHILD`;
- when policy requires review, the batch SHALL open or refresh review workflow and record
  `WAITING_ON_LATE_DATA` or `REVIEW_REQUIRED`; and
- the next-morning digest SHALL explicitly surface the late-data hold rather than collapsing it into
  a generic failure count.

### 9.2 Drift and amendment

The batch MAY automatically branch into amendment or drift reassessment only when:

- the unattended matrix allows `DRIFT_AND_AMENDMENT_BRANCH` for the client;
- amendment eligibility is already deterministically provable from persisted truth;
- no signatory or explicit human approval remains required for the next step; and
- the branch uses ordinary continuation semantics rather than mutating prior truth in place.

Otherwise the batch SHALL create operator-facing amendment workflow and stop autonomous progression.

### 9.3 Replay and recovery

Nightly batches SHALL not use `REPLAY_CHILD` as a general substitute for ordinary overnight reruns.
Replay is reserved for explicit replay/audit intent.

Started-run recovery from an abandoned in-progress nightly manifest SHALL use ordinary
`RECOVERY_CHILD` rules only when:

- the earlier manifest start lease has expired or been formally released;
- recovery preserves the same request identity and idempotency scope;
- any external mutation path first performs persisted-attempt recovery before resend; and
- the successor records the reclamation linkage on `NightlyBatchRun.successor_batch_run_ref` or
  equivalent audit evidence.

## 10. Crash recovery and stale-checkpoint resolution

### 10.1 Batch heartbeat

Every active shard and batch owner SHALL emit durable heartbeats.
`NightlyBatchRun.last_heartbeat_at` SHALL advance from persisted worker ownership, not from ephemeral
in-memory timers only.

### 10.2 Stale-batch reclamation

A batch MAY be reclaimed only when:

- `last_heartbeat_at` is older than the frozen stale threshold;
- the reclaiming worker can read the last durable selection cursor and shard ownership state;
- active manifest start leases linked to the abandoned shard are either absent, released, or still
  recoverable through ordinary manifest recovery semantics; and
- the reclaiming worker records explicit successor linkage before continuing work.

If any of those checks cannot be proven, the batch SHALL move to `ESCALATE_ONLY` for the affected
entries rather than guessing whether the prior worker committed.
The recovery batch itself SHALL freeze `reclaimed_predecessor_batch_run_ref`, and the abandoned
predecessor SHALL record the matching `successor_batch_run_ref`, before the successor continues any
selection or dispatch work.
Recovery-triggered batches SHALL also freeze `recovery_resume_state` as either
`PREDECESSOR_SELECTION_AND_SHARDS_RESUMED` or `PREDECESSOR_SELECTION_REUSED_RESHARDED`; successor
reclaim SHALL NOT look like a fresh scheduled window.

### 10.3 No blind resend rule

After crash recovery, the successor batch or shard SHALL first recover persisted authority attempt
state before any resend. Broker message absence or worker death SHALL NOT be treated as proof that no
external request occurred.

### 10.4 Quiescence rule

A batch SHALL enter `QUIESCING` only when every selection entry is in exactly one terminal or
handoff-safe state:

- completed autonomously;
- waiting on authority with persisted checkpoint;
- waiting on late data with persisted checkpoint;
- deferred to a later retry/checkpoint;
- escalated to human workflow; or
- skipped as ineligible.

`QUIESCING` SHALL therefore mean "no more autonomous work is legally runnable in this window," not
"all clients succeeded."

### 10.5 Finite-progress convergence guarantee

For each selected entry `i`, define `stage_distance_i` as the number of remaining autonomous stage
families in the finite progression lattice from its current durable state to one of the
quiescence-safe states `{AUTO_COMPLETED, WAITING_ON_AUTHORITY, WAITING_ON_LATE_DATA, DEFERRED, REVIEW_REQUIRED, REQUEST_CLIENT_INFO, BLOCKED_INTERNAL, FAILED_RETRYABLE, FAILED_NON_RETRYABLE, REUSED_RESULT, SKIPPED}`.
Let `retry_tokens_i` be the remaining automatic retry opportunities permitted by current budget and
let `reconcile_steps_i` be the remaining bounded reconciliation prerequisites.

Define the batch potential:

`phi(batch) = sum_i (k_stage * stage_distance_i + k_retry * retry_tokens_i + k_reconcile * reconcile_steps_i)`

with strictly positive integer coefficients `k_stage`, `k_retry`, and `k_reconcile`.

Every autonomous state transition inside one nightly batch SHALL either:

- strictly decrease `phi(batch)`; or
- convert the entry into a non-runnable quiescence-safe waiting or handoff state with no further
  autonomous action in the current window.

Automatic retries SHALL therefore be legal only when they consume one retry token, satisfy
deterministic backoff, and preserve idempotency scope. Any loop that would leave `phi(batch)`
unchanged SHALL be prohibited as livelock.
Once `selection_completed_at` is non-null and the batch reaches `QUIESCING`, `COMPLETED`,
`COMPLETED_WITH_FAILURES`, `BLOCKED`, `FAILED`, or `ABANDONED`, every persisted `selection_entries[]`
row SHALL retain a non-null `outcome_bucket` so shard failure or worker death cannot erase
explainable non-execution posture for unrelated candidates.

Because the selection set, stage lattice, and retry budgets are all finite, repeated autonomous
execution under this rule SHALL converge to `QUIESCING`, `BLOCKED`, `FAILED`, or `ABANDONED`; it
SHALL NOT legally cycle forever inside `RUNNING`.

## 11. Global stop conditions and partial-failure handling

### 11.1 Portfolio tail-risk aggregation

The batch SHALL not summarize overnight exposure by simple counts alone. For each selection entry
`i`, let:

`entry_loss_i = v_deadline * deadline_pressure_i + v_risk * risk_pressure_i + v_block * I[outcome_bucket_i in {REVIEW_REQUIRED, BLOCKED_INTERNAL, FAILED_NON_RETRYABLE}] + v_authority * I[outcome_bucket_i = WAITING_ON_AUTHORITY and next_checkpoint_at_i <= now]`

For the selected set `S`, the frozen portfolio tail-risk at policy `alpha_tail` SHALL be:

`portfolio_tail_risk = min_z ( z + (1 / ((1 - alpha_tail) * |S|)) * sum_{i in S} max(0, entry_loss_i - z) )`

`alpha_tail` SHALL come from frozen policy and default to `0.90`.
This coherent tail metric SHALL drive highlighted digest ordering, emergency capacity reservation,
and batch-level escalation summaries. Simple counts MAY accompany it, but SHALL NOT replace it.

The entire batch SHALL stop or fail closed when any of the following tenant-wide conditions is true:

- release admissibility for the serving build can no longer be proven;
- governance or unattended policy snapshot cannot be loaded or validated;
- audit event persistence is unavailable for compliance-significant events;
- control-store durability for batch state, manifests, or workflow state is unavailable;
- authority edge is in a tenant-wide blocked incident posture where autonomous mutation is suspended;
- `rho_b >= rho_hard` or any `rho_q >= rho_hard` for longer than the frozen persistence interval
  such that completion ordering, retry economics, or handoff publication can no longer be trusted; or
- restore/recovery mode has narrowed the environment to investigation-only.

Per-client failures SHALL NOT cause a batch-level `FAILED` state by themselves.
A batch SHALL use `COMPLETED_WITH_FAILURES` when at least one client ended in failed, blocked,
deferred, or escalated posture but the batch still achieved quiescence and produced a complete digest.

## 12. Operator handoff, queues, and next-morning digest

### 12.1 Queue generation

Whenever autonomous execution stops short of a finished legal outcome, the batch SHALL publish or
refresh the corresponding workflow items before digest publication.

Rules:

- workflow items created or refreshed by nightly automation SHALL include both `manifest_id` (when one
  exists) and `nightly_batch_run_ref` inside `context_refs[]`;
- batch-generated internal workflow SHALL target the deterministic queue or escalation target derived
  from the frozen unattended policy and collaboration routing policy;
- repeated nightly runs SHALL upsert or supersede the same underlying work item when the operator
  problem is unchanged, rather than opening duplicate queue entries; and
- customer-visible notifications SHALL obey the existing collaboration notification suppression and
  access revalidation rules.

### 12.2 OperatorMorningDigest

Once the batch reaches quiescence, `PUBLISH_OPERATOR_MORNING_DIGEST(...)` SHALL publish one
`OperatorMorningDigest` per tenant coverage date.
The digest SHALL be derived only from persisted `NightlyBatchRun`, `RunManifest`, `DecisionBundle`,
`WorkflowItem`, `SubmissionRecord`, `LateDataMonitorResult`, `DriftRecord`, and `ErrorRecord` truth.

The digest SHALL include at minimum:

- `coverage_date`
- `source_batch_run_refs[]`
- `derivation_contract{ nightly_window_key, source_batch_set_hash, source_batch_count, source_batch_window_state, persisted_outcome_counts{...}, published_workflow_outcome_counts{...}, publication_qa_profile, publication_qa_state, publication_qa_completed_at, covered_selection_entry_ref_set_hash, outcome_entry_partition_hash, queue_partition_hash, highlight_order_hash, published_workflow_item_ref_set_hash, published_notification_ref_set_hash, waiting_on_authority_ref_set_hash, late_data_hold_ref_set_hash, workflow_publication_state, workflow_publication_settled_at, notification_publication_state, notification_publication_settled_at, covered_selection_entry_count, publication_generation, supersession_state, supersession_root_digest_id, supersedes_digest_id_or_null, supersession_reason_codes[] }`
- `covered_selection_entry_refs[]`
- `summary_counts{...}` grouped by the client outcome buckets above
- `outcome_entry_refs{...}` partitioning the same persisted selection-entry set by outcome bucket
- `queue_summaries[]` grouped by deterministic routing target with `source_basis = PUBLISHED_WORKFLOW_ITEMS`
- `highlighted_client_outcomes[]` for critical / urgent / breached items ordered by frozen
  `entry_loss_i` and carrying `selection_entry_ref`, `highlight_rank`, and persisted
  `entry_loss_score`
- `waiting_on_authority_refs[]` or equivalent counts and checkpoint refs
- `late_data_hold_refs[]` or equivalent counts and checkpoint refs
- `backlog_pressure`
- `portfolio_tail_risk`
- `stability_state`
- `published_workflow_item_refs[]`
- `published_notification_refs[]`
- `generated_at`
- `published_at`
- `supersedes_digest_id` when a later recovery digest replaces an earlier incomplete one

`queue_summaries[].item_refs[]` and any highlighted `work_item_ref` SHALL resolve only to persisted
workflow items that were published or refreshed before digest publication. The digest SHALL not use
ephemeral queue snapshots or operator logs as the source of truth for those refs.
`covered_selection_entry_refs[]` SHALL equal the exact union of `outcome_entry_refs{...}`, and
`summary_counts{...}` SHALL therefore remain replayable from persisted selection-entry identity
rather than queue-local counters.
`published_workflow_item_refs[]` SHALL cover every unresolved outcome bucket
`{WAITING_ON_AUTHORITY, WAITING_ON_LATE_DATA, REVIEW_REQUIRED, REQUEST_CLIENT_INFO, BLOCKED_INTERNAL, FAILED_RETRYABLE, FAILED_NON_RETRYABLE, DEFERRED}`
exactly once, and `queue_summaries[].item_refs[]` SHALL partition that same published set without
duplication.
`waiting_on_authority_refs[]` and `late_data_hold_refs[]` SHALL exactly cover their corresponding
summary counts, and backlog / tail-risk / stability SHALL derive from one frozen
`(nightly_window_key, source_batch_run_refs[])` basis rather than mixed or stale batch windows.
`derivation_contract{...}` SHALL also retain the publication-time QA proof for the published digest:
the exact covered selection-entry set hash, exact outcome partition hash, exact queue grouping hash,
exact highlight ordering hash, exact published workflow and notification ref-set hashes, and the
exact waiting-on-authority / late-data hold ref-set hashes. `publication_qa_completed_at` SHALL
not predate settled workflow or notification publication, and digest generation SHALL not predate
that QA completion boundary.
`NightlyBatchRun`, `OperatorDigestDerivationContract`, and `OperatorMorningDigest` SHALL each retain
the shared `execution_mode_boundary_contract`, pinned to `run_kind = NIGHTLY`,
`execution_posture = LIVE_COMPLIANCE`, and `legal_effect_boundary = COMPLIANCE_CAPABLE`. A nightly
digest SHALL therefore never summarize replay or analysis output as if it were the live overnight
legal run for that window.

### 12.3 Digest publication rule

The digest SHALL be published exactly once per tenant coverage date unless a later successor digest
explicitly supersedes it.
A superseding digest SHALL preserve the earlier digest identifier in `supersedes_digest_id` and SHALL
not delete the earlier publication from audit history.
`NightlyBatchRun.operator_digest_publication_state` SHALL therefore advance through explicit
workflow-publication, notification-publication, and published-complete phases rather than letting
`completed_at` or `operator_digest_ref` imply that the handoff is already complete.
`PUBLISHED_COMPLETE` SHALL only be legal once the batch is in a quiescence-safe lifecycle state,
every selected entry has one explicit persisted `outcome_bucket`, workflow and notification
publication are settled, and digest QA has frozen the exact handoff grouping and ref evidence.

### 12.4 Deterministic nightly portfolio what-if simulation

Nightly autopilot SHALL also support a non-mutating `NightlyPortfolioWhatIfSimulation` artifact for
operators and release owners who need to inspect alternate unattended policy, retry budget,
capacity, release-admissibility, or authority-readiness scenarios before rollout.

The simulator SHALL be expressed as a deterministic projection over persisted nightly truth rather
than a second orchestrator.
Its `basis_contract{ execution_mode_boundary_hash, source_batch_run_refs[], source_batch_set_hash, covered_selection_entry_refs[], baseline_selection_universe_hash, baseline_policy_snapshot_hash, baseline_autopilot_policy_hash, baseline_release_verification_manifest_ref, baseline_schema_bundle_hash, baseline_code_build_id, baseline_environment_ref, counterfactual_* }`
SHALL freeze one coherent nightly window, one exact source-batch set, one exact covered selection
partition, and one modeled-only execution boundary.

The simulation SHALL only read persisted:

- `NightlyBatchRun.selection_entries[]`, including `candidate_identity_hash`, `selection_basis_hash`,
  `priority_tuple`, `priority_score`, `expected_service_minutes`, and the persisted bucket or
  reason-code posture for each entry;
- `OperatorMorningDigest` coverage and highlight partitions from the same source batch set;
- release admissibility truth from the frozen baseline release manifest plus any explicitly declared
  counterfactual release candidate identity; and
- durable authority, workflow, and checkpoint truth already covered by the source batch set.

The simulator SHALL NOT:

- query live queue state to reconstruct baseline selection or digest partitions;
- mutate `NightlyBatchRun`, `RunManifest`, workflow items, notifications, or any authority-facing
  state;
- auto-clear hard unattended boundaries such as step-up, approval, release inadmissibility, or
  authority ambiguity; or
- mix multiple release/schema identities inside one basis contract.

Instead, it SHALL publish explicit baseline-versus-simulated comparison fields:

- summary-count diffs;
- backlog / tail-risk / stability diffs;
- `entry_diffs[]` carrying baseline and simulated disposition, bucket, order, and reason codes; and
- `highlight_diffs[]` carrying baseline and simulated digest-highlight movement plus reason-code
  diffs.

Every simulated bucket movement, ordering change, and digest-highlight change SHALL therefore remain
explainable from one persisted source basis and one explicit counterfactual packet.

## 13. Audit, provenance, and service-principal guarantees

Nightly autopilot SHALL emit first-class audit and observability evidence for at minimum:

- batch allocation and duplicate suppression;
- portfolio selection completion;
- every non-executed disposition (`REUSE`, `DEFER`, `ESCALATE`, `SKIP`) with reason codes;
- shard ownership claim and stale-lease reclamation;
- every autonomous manifest launch with `nightly_batch_run_ref` and `nightly_window_key`;
- every automatic retry and every retry refusal;
- batch quiescence and terminal completion state; and
- operator digest publication and supersession.

All nightly execution SHALL run under explicit service-principal `PrincipalContext`.
No scheduler, shard worker, or notification worker may act under implicit system bypass.

## 14. Minimum conformance tests

Production readiness for nightly autopilot SHALL include at minimum:

1. duplicate scheduler delivery reuses the same `NightlyBatchRun`;
2. same-window duplicate client selection does not allocate a second nightly manifest;
3. next-window identical inputs may still create a fresh nightly manifest when reuse is not legally
   sufficient;
4. active manifest heartbeat causes `DEFER_ACTIVE_ATTEMPT`, not duplicate execution;
5. stale manifest lease reclaim performs persisted attempt recovery before any resend;
6. authority-unknown posture opens escalation and does not auto-confirm;
7. capacity exhaustion records explicit deferral and still yields a complete digest;
8. late-data continuation creates a child manifest only when policy allows;
9. amendment-eligible material drift opens or executes the correct continuation path;
10. per-client failure still allows the batch to complete with failures and publish the digest;
11. digest supersession preserves audit lineage when a recovery batch finishes later;
12. customer-visible unattended requests are suppressed when access or template safety revalidation
    fails;
13. a shorter urgent item outranks a longer lower-value item when legacy buckets are equal because
    `priority_score_i` is normalized by expected service time;
14. `rho_soft <= rho < rho_hard` suppresses non-positive-gain retries while preserving first
    attempts and checkpoint-due work;
15. deterministic retry phase offset spreads same-family retries without replay-breaking randomness;
16. deterministic deficit scheduling prevents one fairness group from starving another under a mixed
    long-job / short-job portfolio; and
17. same-window autonomous execution cannot livelock because every legal transition decreases
    `phi(batch)` or exits to a quiescence-safe waiting or handoff state.

## 15. One-sentence summary

The nightly autopilot contract turns `run_kind = NIGHTLY` from a batch-shaped label into a fully
specified scheduler-driven control plane that deterministically selects, executes, recovers,
escalates, aggregates, and hands off overnight compliance work without violating manifest, authority,
or audit guarantees.
