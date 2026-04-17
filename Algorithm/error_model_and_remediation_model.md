# Error Model and Remediation Model

## Error model and remediation model

The engine SHALL treat every failure, anomaly, inconsistency, and blocked progression as a typed
operational object, not as a free-text message or an incidental exception. An error is not only a
fault; it is a structured statement that identifies what failed, why it failed, what it blocked,
whether it is safe to retry, who must act next, and what compensating or remedial action is permitted.

The purpose of the error and remediation model is to ensure that every failure path can answer all of
the following deterministically:

1. What failed?
2. Where in the run did it fail?
3. What object or scope was affected?
4. Is the failure retriable, reviewable, overrideable, or terminal?
5. What is the next legal/operational remediation path?
6. Can the failure and its handling be replayed and audited?

## 13.1 Core principle

The engine SHALL never emit a material failure as unstructured text only.

Every material failure SHALL become one of:

- an `ErrorRecord`
- a `RemediationTask`
- a `CompensationRecord`
- or a linked set of those objects

Where investigation or bounded exception handling is required, the linked set SHALL additionally
persist `FailureInvestigation` and `AcceptedRiskApproval` companion artifacts rather than burying
those control decisions in free text.

A user-facing message may be derived from the error, but it SHALL not replace the canonical error
object.

The shared machine contract for this lifecycle is
`schemas/failure_resolution_contract.schema.json`.

## 13.2 Canonical error object

Each `ErrorRecord` SHALL include at minimum:

- `error_id`
- `manifest_id`
- `root_manifest_id`
- `error_family`
- `error_code`
- `error_title`
- `error_description_template`
- `severity`
- `blocking_class`
- `blocking_effects[]`
- `retry_class`
- `retry_attempt_count`
- `retry_budget_class`
- `next_retry_at`
- `retry_precondition_refs[]`
- `retry_idempotency_scope_ref`
- `remediation_class`
- `remediation_owner_type`
- `failure_resolution_contract{ lifecycle_role, role_specific_binding_policy, material_failure_policy,
  ownership_policy, next_action_policy, retry_policy, closure_policy, accepted_risk_policy,
  linkage_policy }`
- `remediation_owner_ref`
- `reason_codes[]`
- `affected_object_refs[]`
- `source_object_refs[]`
- `caused_by_error_id`
- `originating_activity_ref`
- `actor_ref`
- `service_ref`
- `authority_operation_ref` where relevant
- `retention_class` where retention/privacy control state is the failure source
- `artifact_retention_ref` where retention/privacy control state is the failure source
- `workflow_item_id` where the failure opens tracked follow-up work
- `remediation_task_ref` where the failure opens direct remediation
- `failure_investigation_ref` where the failure opens a typed forensic branch
- `compensation_record_ref` where partial progression requires compensating settlement
- `next_action_ref` when the lawful next path is object-backed
- `customer_visibility_class`
- `operator_visibility_class`
- `opened_at`
- `resolved_at`
- `resolution_state`
- `resolution_basis_ref`
- `closure_evidence_refs[]`
- `resolved_by_task_id`
- `accepted_risk_approval_ref` where relevant
- `accepted_risk_expires_at` where relevant
- `reopened_by_error_id` where relevant
- `dedupe_key`
- `dedupe_scope`
- `first_seen_at`
- `last_seen_at`
- `occurrence_count`
- `escalation_state`
- `escalated_at`
- `resolution_notes_ref`
- `audit_refs[]`
- `provenance_refs[]`

`first_seen_at`, `opened_at`, `last_seen_at`, `resolved_at`, `escalated_at`, and any scheduled
`next_retry_at` SHALL remain forward-only when present. `accepted_risk_approval_ref` and
`accepted_risk_expires_at` SHALL appear only under `resolution_state = ACCEPTED_RISK`, and
`resolved_by_task_id` or `reopened_by_error_id` SHALL remain impossible on still-open error states.
Retention/privacy failures SHALL additionally preserve direct `artifact_retention_ref` lineage plus
either `workflow_item_id` or `remediation_task_ref` so operational follow-up cannot hide inside
free-form notes. When `remediation_owner_type != SYSTEM`, `remediation_owner_ref` SHALL be
non-null. While an error remains open, it SHALL preserve either a lawful scheduled retry path or an
object-backed `next_action_ref`; it SHALL NOT sit open with no owner, no next action, and no
linked child object.

## 13.3 Error families

The engine SHALL classify errors into families. At minimum:

- `AUTHN_ERROR`
- `AUTHZ_ERROR`
- `MANIFEST_ERROR`
- `CONFIG_ERROR`
- `INPUT_BOUNDARY_ERROR`
- `SOURCE_COLLECTION_ERROR`
- `CANONICALIZATION_ERROR`
- `DATA_QUALITY_ERROR`
- `PARITY_ERROR`
- `TRUST_ERROR`
- `WORKFLOW_ERROR`
- `AUTHORITY_PROTOCOL_ERROR`
- `AUTHORITY_RECONCILIATION_ERROR`
- `AMENDMENT_ERROR`
- `RETENTION_ERROR`
- `PRIVACY_ERROR`
- `PROVENANCE_ERROR`
- `IDEMPOTENCY_ERROR`
- `SYSTEM_FAULT`

Each family SHALL map to a fixed namespace for `error_code`, for example:

- `AUTHZ_STEP_UP_REQUIRED`
- `MANIFEST_NOT_FROZEN_FOR_PRESEAL`
- `DQ_CRITICAL_DOMAIN_MISSING`
- `PARITY_BLOCKING_DIFFERENCE`
- `AUTH_TIMEOUT_UNRESOLVED`
- `AUTH_AMBIGUOUS_CORRELATION`
- `AUTH_INCONSISTENT_EXTERNAL_STATE`
- `AUTH_RETRY_BUDGET_EXHAUSTED`
- `AUTH_SEND_CLAIM_CONFLICT`
- `AMENDMENT_WINDOW_CLOSED`
- `RETENTION_HOLD_PREVENTS_ERASURE`

### Invariant-failure codes used by the core engine

When a persisted or derived artifact violates a supposedly impossible invariant, the engine SHALL fail
closed with a typed `SYSTEM_FAULT` or family-specific error code rather than crashing. The
governing manifest/error boundary is `schemas/invariant_enforcement_contract.schema.json`, which
binds invariant class, family-specific fault code, pre-start versus post-start terminal posture,
and the required terminal audit event before control leaves the boundary. Minimum codes:

- `RUNTIME_SCOPE_EMPTY`
- `RUNTIME_SCOPE_NOT_SUBSET_OF_REQUEST`
- `REUSED_SEALED_CONTEXT_MUTATED`
- `LATE_DATA_POLICY_UNKNOWN`
- `CROSS_PARTITION_PROMOTION_DETECTED`
- `MANIFEST_NOT_SEALED_FOR_REUSE`
- `PRESEAL_GATE_CHAIN_MISMATCH`
- `MANIFEST_SEAL_TRANSITION_INVALID`
- `MANIFEST_START_CLAIM_INVALID`
- `GRAPH_QUALITY_MISSING`
- `AMENDMENT_CASE_NOT_FOUND`
- `AMENDMENT_CASE_NOT_READY_TO_SUBMIT`
- `FILING_PACKET_MANIFEST_BINDING_MISMATCH`
- `FILING_NOTICE_RESOLUTION_INCOMPLETE`
- `FILING_APPROVAL_UNRESOLVED_AFTER_NOTICE`
- `FILING_DECLARED_BASIS_ACK_UNRESOLVED_AFTER_NOTICE`
- `MANIFEST_EXECUTION_BASIS_HASH_MISSING`
- `REPLAY_CONFIG_FREEZE_MISSING`
- `REPLAY_INPUT_FREEZE_MISSING`
- `REPLAY_POST_SEAL_BASIS_MISSING`
- `REPLAY_BASIS_CORRUPT`
- `REPLAY_SCHEMA_READER_INCOMPATIBLE`
- `REPLAY_RETENTION_LIMITED`
- `REPLAY_UNEXPECTED_MISMATCH`
- `MANIFEST_NOT_READY_FOR_AUTHORITY_PREFLIGHT`

## 13.4 Severity model

Every `ErrorRecord.severity` SHALL be one of:

- `INFO`
- `NOTICE`
- `WARNING`
- `ERROR`
- `CRITICAL`

### Severity interpretation

`INFO`
Informative operational event; no remediation required.

`NOTICE`
Non-blocking condition; preserve in audit and UI.

`WARNING`
Operationally important issue; may reduce automation or trust.

`ERROR`
Blocks one or more actions or requires a user/operator response.

`CRITICAL`
Threatens legal correctness, data integrity, tenant isolation, or authority-facing safety.

## 13.5 Blocking model

Every `ErrorRecord.blocking_class` SHALL be one of:

- `NON_BLOCKING`
- `BLOCKS_AUTOMATION`
- `BLOCKS_REVIEW_PROGRESS`
- `BLOCKS_FILING`
- `BLOCKS_AMENDMENT`
- `BLOCKS_ERASURE`
- `BLOCKS_RUN`
- `BLOCKS_AUTHORITY_CALL`

A single error may block more than one downstream capability, but it SHALL declare its primary
blocking class explicitly.

### Blocking effect semantics

`blocking_class` is the dominant summary posture, not the full impact model.
Every error with any non-trivial downstream consequence SHALL also serialize ordered
`blocking_effects[]`.
Each entry SHALL identify at minimum:

- the affected capability or action family
- the impact level (`BLOCKED`, `DEGRADED`, or `REVIEW_REQUIRED`)
- the basis reason code set
- narrower affected object refs where the effect applies to only part of the parent error scope

`blocking_class` SHALL mirror the highest-impact effect in `blocking_effects[]`.
The engine SHALL NOT hide secondary blocked capabilities merely because one dominant blocking class is
chosen for summary projection.
`blocking_class = NON_BLOCKING` SHALL be incompatible with any `blocking_effects[].impact_level =
BLOCKED`.

## 13.6 Retry model

Every error SHALL carry a machine-readable retry class:

- `NO_RETRY`
- `SAFE_RETRY`
- `RECONCILE_THEN_RETRY`
- `HUMAN_REVIEW_THEN_RETRY`
- `REBUILD_THEN_RETRY`
- `MANUAL_INTERVENTION_REQUIRED`

Every error SHALL also carry a machine-readable retry budget class:

- `NONE`
- `SINGLE_ATTEMPT`
- `BOUNDED_EXPONENTIAL`
- `RECONCILIATION_GATED`
- `HUMAN_GATED`

### Retry rules

`SAFE_RETRY`
The engine may retry without creating duplicate legal or operational side effects.

`RECONCILE_THEN_RETRY`
The engine must first resolve ambiguity, typically around authority state or idempotency.

`HUMAN_REVIEW_THEN_RETRY`
A reviewer must inspect and approve the retry context.

`REBUILD_THEN_RETRY`
The engine must regenerate one or more upstream artifacts before retrying.

`NO_RETRY`
Retry is prohibited for the same run context.

No retry may execute after retry-budget exhaustion or before `next_retry_at`.
If a retry can repeat an authority-facing or otherwise externally visible side effect, it SHALL NOT
run unless:

- `retry_idempotency_scope_ref` is still valid for the retried action
- all `retry_precondition_refs[]` are satisfied against current truth
- the retry remains legal for the current manifest or successor-manifest context

`SAFE_RETRY` SHALL only be used when those checks are expected to succeed without human
interpretation.
`RECONCILE_THEN_RETRY` and `REBUILD_THEN_RETRY` SHALL fail closed until the required reconciliation
or rebuild artifacts are present.
Automatic retry posture SHALL stay structurally coherent: `SAFE_RETRY`,
`RECONCILE_THEN_RETRY`, and `REBUILD_THEN_RETRY` SHALL carry a non-null `next_retry_at`,
`RECONCILE_THEN_RETRY` and `REBUILD_THEN_RETRY` SHALL additionally carry non-empty
`retry_precondition_refs[]`, and `NO_RETRY` SHALL clear both fields.

### Deterministic retry backoff and economic gate

Let `n = retry_attempt_count` prior to scheduling the next automatic attempt.
Let:

- `b0 = retry_base_backoff_seconds(error_code, retry_budget_class, authority_profile, stage_family)`
- `bmax = retry_backoff_cap_seconds(error_code, retry_budget_class, authority_profile, stage_family)`
- `phase_offset_seconds = hash(retry_idempotency_scope_ref | error_code) mod retry_phase_window_seconds`
- `retry_backoff_seconds_n = min(bmax, b0 * 2^n) + phase_offset_seconds`

`next_retry_at` SHALL equal the earlier of the policy hard deadline and
`opened_at + retry_backoff_seconds_n`, except that reconciliation-gated classes MAY anchor the
clock to the most recent failed attempt if and only if that anchor choice is frozen in policy for
the error family.

The phase offset is not random jitter. It is a deterministic spread term that prevents retry
herding while preserving replayability.

### Retry-success decay and admission rule

Let:

- `p_prior = retry_success_prior(error_code, retry_class, authority_profile, stage_family)` in `(0, 1]`
- `lambda_retry = retry_decay_lambda(error_code, retry_class, authority_profile, stage_family) >= 0`
- `preconditions_met` in `{0, 1}`
- `p_success_n = preconditions_met * p_prior * exp(-lambda_retry * n)`

Let `progress_value_n` be the same frozen dispatch-value numerator that the nightly priority model
would assign to successful completion of the blocked progression point, and let `attempt_cost_n`
include at minimum expected service cost, backlog congestion cost, duplicate-side-effect risk cost,
and deadline-overrun cost. Then:

`retry_expected_gain_n = p_success_n * progress_value_n - attempt_cost_n`

All priors, decay constants, floors, caps, deadlines, and cost coefficients in this section SHALL
come from frozen policy or frozen error-family configuration.

An automatic retry is legal only when all of the following hold:

- retry class permits it;
- retry budget is not exhausted;
- `now >= next_retry_at`;
- idempotency and reconciliation preconditions are satisfied; and
- `retry_expected_gain_n > 0`.

When `retry_expected_gain_n <= 0`, the engine SHALL stop autonomous retry and emit the
corresponding handoff or review posture instead of consuming unbounded overnight capacity on a
low-yield loop.

### Quantitative retry-budget rule

Let `k = retry_attempt_count` for the next retry decision and let `N = budget_limit(retry_budget_class)`
where:

- `budget_limit(NONE) = 0`
- `budget_limit(SINGLE_ATTEMPT) = 1`
- `budget_limit(BOUNDED_EXPONENTIAL) = frozen profile maximum`
- `budget_limit(RECONCILIATION_GATED) = 0` until required reconciliation artifacts are present
- `budget_limit(HUMAN_GATED) = 0` until explicit reviewer approval is persisted

For retry classes that admit automatic scheduling, define deterministic spread without destroying
replay reproducibility:

- `j_k = ((u64(hash(retry_idempotency_scope_ref | "|retry|" | k)) mod 2001) - 1000) / 10000`
- `raw_delay_k = base_delay_seconds * 2^(k-1) * (1 + j_k)`
- `delay_k = floor(min(max(base_delay_seconds, raw_delay_k), remaining_retry_window_seconds))`
- `retry_budget_open = 1` iff `k < N`, `now >= next_retry_at`, and all `retry_precondition_refs[]` are currently satisfied

For externally visible mutations, automatic retry SHALL additionally require all of the following:

- unchanged `retry_idempotency_scope_ref`
- unchanged binding lineage and subject authority context
- no open send-claim conflict or idempotency-collision flag
- `external_truth_ambiguity <= 0.15` from the latest authority-grounded reconciliation model

If any of those mutation-side conditions fail, the error SHALL downgrade to
`RECONCILE_THEN_RETRY`, `HUMAN_REVIEW_THEN_RETRY`, or `MANUAL_INTERVENTION_REQUIRED`; it SHALL not
continue as `SAFE_RETRY`.

### Failure-classification precedence

When multiple failure indicators coexist, classification SHALL resolve in descending safety order:

1. `HANDSHAKE_INTEGRITY_FAILURE`
2. `IDEMPOTENCY_COLLISION`
3. `AMBIGUOUS_EXTERNAL_TRUTH`
4. `INCONSISTENT_EXTERNAL_STATE`
5. `DELAYED_ACK_PENDING`
6. `RETRY_BUDGET_EXHAUSTED`
7. residual transport or workflow failure classes

Use the following control predicates:

- if `handshake_integrity_flag = 1`, emit a hard-blocking integrity failure and prohibit retry
- else if `collision_flag = 1`, emit an idempotency collision and prohibit retry
- else if `external_truth_ambiguity > 0.35`, classify as ambiguous external truth and require reconciliation or human review
- else if bound authority evidence is mutually contradictory for the same exact legal meaning, classify as inconsistent external state and require reconciliation
- else if the exchange is still within reconciliation deadline without decisive authority state, classify as delayed-ack pending and continue bounded reconciliation only
- else if `retry_budget_open = 0` for a retry-eligible failure, emit `AUTH_RETRY_BUDGET_EXHAUSTED` and spawn the configured escalation workflow

## 13.7 Remediation model

Every error SHALL map to exactly one primary `remediation_class`:

- `AUTO_RETRY`
- `AUTO_RECONCILE`
- `SPAWN_WORKFLOW`
- `REQUEST_CLIENT_INPUT`
- `REQUEST_OPERATOR_REVIEW`
- `REQUEST_APPROVAL`
- `REBUILD_ARTIFACT`
- `OPEN_INVESTIGATION`
- `SUPERSEDE_AND_REPLAN`
- `ABORT_TERMINALLY`

### Remediation owner types

Each remediation SHALL declare an owner type:

- `SYSTEM`
- `SERVICE_OPERATOR`
- `REVIEWER`
- `APPROVER`
- `CLIENT`
- `TENANT_ADMIN`
- `SECURITY_OPERATOR`

No blocking error SHALL exist without an owner type or explicit owner-resolution rule.

The model has three non-interchangeable control layers:

- `remediation_class` chooses the orchestration lane
- `task_type` chooses the concrete work item emitted when human or workflow action is required
- `compensation_mode` chooses how already-progressed state is preserved, limited, or reconciled

Family rules and runtime emitters SHALL NOT place task types or compensation modes into
`remediation_class`.

## 13.8 Remediation task object

Where remediation requires action, the engine SHALL create a `RemediationTask` with:

- `task_id`
- `error_id`
- `manifest_id`
- `root_manifest_id`
- `task_type`
- `owner_type`
- `owner_ref` if assigned
- `due_at`
- `priority`
- `task_state`
- `remediation_steps_ref`
- `blocking_class`
- `failure_resolution_contract{...}`
- `retention_class` where the task is driven by retention/privacy control state
- `artifact_retention_ref` where the task is driven by retention/privacy control state
- `workflow_item_id` where the task is also surfaced in governed work queues
- `superseded_by_task_id`
- `closure_outcome`
- `resolution_basis_ref`
- `closure_evidence_refs[]`
- `error_resolution_effect`

Every remediation task SHALL declare what effect its closure has on the source error. A completed,
cancelled, or superseded task SHALL therefore retain evidence and basis for that declared effect
instead of implying that the source error resolved merely because task state stopped changing.

### Minimum task types

- `FIX_DATA`
- `RESOLVE_CONFLICT`
- `REVIEW_PARITY`
- `APPROVE_OVERRIDE`
- `RELINK_AUTHORITY`
- `RETRY_AUTHORITY_OPERATION`
- `RECONCILE_SUBMISSION_STATE`
- `REQUEST_SUPPORTING_EVIDENCE`
- `CHECK_RETENTION_HOLD`
- `REPLAY_RUN`
- `ESCALATE_SECURITY_ISSUE`
- `OPEN_FAILURE_INVESTIGATION`

### Investigation companion object

Where `remediation_class = OPEN_INVESTIGATION` or a failure must preserve a typed forensic branch,
the engine SHALL create a `FailureInvestigation` with:

- `investigation_id`
- `error_id`
- `manifest_id`
- `root_manifest_id`
- `failure_resolution_contract{...}`
- `investigation_class`
- `retention_class` where the investigation is a retention/privacy exception branch
- `artifact_retention_ref` where the investigation is a retention/privacy exception branch
- `workflow_item_id` where the investigation is surfaced through governed work
- `owner_type`
- `owner_ref` if assigned
- `priority`
- `investigation_state`
- `investigation_steps_ref`
- `due_at`
- `opened_at`
- `last_activity_at`
- `resolved_at`
- `resolution_basis_ref`
- `outcome`
- `accepted_risk_approval_ref` where relevant
- `superseded_by_investigation_id` where relevant
- `closure_evidence_refs[]`
- `remediation_task_refs[]`
- `audit_refs[]`
- `provenance_refs[]`

The investigation object is not a UI-only workbench view. It is the durable failure-analysis record
that preserves why the engine opened an ambiguity or forensic branch, who owns it, what evidence
closed it, and whether it ended in remediation, accepted risk, or supersession.

## 13.9 Compensation model

If a failure occurs after a stateful action has partially progressed, the engine SHALL create a
`CompensationRecord` rather than silently rewinding history.

Each `CompensationRecord` SHALL include:

- `compensation_id`
- `error_id`
- `manifest_id`
- `root_manifest_id`
- `compensation_mode`
- `failure_resolution_contract{...}`
- `owner_type`
- `owner_ref` where owner_type is not `SYSTEM`
- `retention_class` where compensation preserves or limits post-erasure or post-expiry state
- `artifact_retention_ref` where compensation preserves or limits post-erasure or post-expiry state
- `workflow_item_id` where follow-up remains open
- `target_object_refs[]`
- `compensation_status`
- `compensation_steps_ref`
- `compensated_at`
- `verification_ref`
- `resolution_basis_ref`
- `closure_evidence_refs[]`
- `created_at`
- `superseded_by_compensation_id` where relevant
- `audit_refs[]`
- `provenance_refs[]`

`compensated_at` SHALL NOT predate `created_at`. Non-null `verification_ref` SHALL remain limited to
`compensation_status = VERIFIED`, and non-null `superseded_by_compensation_id` SHALL remain limited
to `compensation_status = SUPERSEDED`.
`compensation_mode = PRESERVE_AND_LIMIT` SHALL retain `artifact_retention_ref` and `retention_class`
so surviving limited state never masquerades as fully retained evidence. Planned or in-progress
compensation SHALL not claim closure evidence or basis prematurely; applied, verified, failed,
cancelled, or superseded compensation SHALL retain both.

### Compensation modes

- `NONE`
- `MARK_AS_VOID`
- `MARK_AS_SUPERSEDED`
- `REVERT_DERIVED_ONLY`
- `OPEN_RECONCILIATION`
- `PRESERVE_AND_LIMIT`
- `REQUIRE_MANUAL_SETTLEMENT`

### Compensation rule

The engine SHALL never compensate a legal authority state by internal deletion or silent rollback.
Where authority ambiguity exists, the remediation path is reconciliation, not history erasure.

## 13.9A Accepted-risk approval companion object

Whenever an error or investigation resolves via bounded exception rather than direct correction, the
engine SHALL persist an `AcceptedRiskApproval` with:

- `accepted_risk_approval_id`
- `error_id`
- `manifest_id`
- `root_manifest_id`
- `failure_resolution_contract{...}`
- `decision_basis`
- `approval_state`
- `retention_class` where the exception is a retention/privacy exception
- `artifact_retention_ref` where the exception is a retention/privacy exception
- `workflow_item_id` where the exception leaves governed follow-up work open
- `approver_type`
- `approver_ref` where approval is explicit
- `policy_basis_ref` where approval is policy-derived
- `rationale_ref`
- `bounded_scope_refs[]`
- `approved_at`
- `expires_at`
- `revoked_at` where relevant
- `superseded_by_approval_id` where relevant
- `audit_refs[]`
- `provenance_refs[]`

`decision_basis` SHALL distinguish explicit human approval from policy-basis authorization so the
engine can satisfy the invariant that no accepted risk exists without an explicit approval path or a
recorded policy basis. `AcceptedRiskApproval` SHALL also bind `failure_resolution_contract{...}` so
accepted-risk closure remains part of the same governed failure lifecycle rather than a detached
exception note.

## 13.9B Failure lifecycle dashboard projection

The engine SHALL persist one `FailureLifecycleDashboard` read model for each governed failure
lineage. This dashboard is the authoritative backend-authored lifecycle view for operators and
downstream surfaces; it SHALL NOT be reconstructed from logs, free-text notes, or ad hoc
table-local joins.

Each dashboard SHALL retain at minimum:

- `root_error_ref`
- `current_error_ref`
- `lineage_error_refs_in_order[]`
- typed `current_state_source{...}`
- typed `current_owner{...}`
- typed `next_legal_action{...}`
- `blocking_scope{...}`
- `remediation_summary{...}`
- `compensation_posture{...}`
- `investigation_posture{...}`
- `accepted_risk_posture{...}`
- `closure_posture{...}`
- grouped task, compensation, investigation, accepted-risk, workflow, audit, and provenance refs

The dashboard SHALL keep the underlying failure visible even when compensation is active or already
verified. Compensation is a branch inside the failure lifecycle, not a replacement for the error
lineage.

Accepted-risk dashboards SHALL expose both expiry and the current accountable owner. Accepted risk
may be approved by one actor and still be owned for review by another; that accountability SHALL
stay typed and explicit on the read model.

If a failure is reopened or superseded, the dashboard SHALL preserve the ordered root-to-current
error chain so successor failures do not orphan prior resolution evidence.

The shared machine contract for this projection is
`schemas/failure_lifecycle_dashboard.schema.json`.

## 13.10 Resolution states

Every error SHALL end in one of:

- `OPEN`
- `IN_PROGRESS`
- `MONITORING`
- `RESOLVED`
- `ACCEPTED_RISK`
- `SUPERSEDED`
- `CANCELLED`

### Resolution semantics

Every terminal or monitoring resolution SHALL carry `resolution_basis_ref`.
Every `RESOLVED`, `ACCEPTED_RISK`, `SUPERSEDED`, or `CANCELLED` outcome SHALL also carry
`closure_evidence_refs[]`, and task-backed closures SHALL point to `resolved_by_task_id`.

`RESOLVED`
The root condition was corrected and the blocked path can progress or was cleanly terminated.

`ACCEPTED_RISK`
A bounded, approved exception exists and has been recorded.
This state SHALL NOT be entered without `accepted_risk_approval_ref` and
`accepted_risk_expires_at`.

`SUPERSEDED`
A later error or a later manifest replaced the original operational context.

If a condition reappears after closure, the engine SHALL open a successor `ErrorRecord` rather than
silently mutating the old record back to `OPEN`.
The closed record SHALL point to `reopened_by_error_id`, preserving the original `resolved_at` and
closure evidence.

## 13.11 Family-specific remediation rules

### A. Manifest/config failures

Examples:

- manifest not sealed
- non-approved config in compliance mode
- schema bundle mismatch

Default remediation:

- remediation classes: `REBUILD_ARTIFACT`, `SUPERSEDE_AND_REPLAN`
- task types where action is emitted: `REPLAY_RUN`
- compensation posture: usually `NONE`
- retry class usually `NO_RETRY` or `REBUILD_THEN_RETRY`

### B. Input/data-quality failures

Examples:

- critical domain missing
- blocking conflict
- stale filing-critical source
- low-confidence critical extraction

Default remediation:

- remediation classes: `REQUEST_CLIENT_INPUT`, `REQUEST_OPERATOR_REVIEW`, `REQUEST_APPROVAL`
- task types: `FIX_DATA`, `RESOLVE_CONFLICT`, `REQUEST_SUPPORTING_EVIDENCE`,
  `APPROVE_OVERRIDE` only where policy allows
- compensation posture: usually `NONE`

### C. Parity/trust failures

Examples:

- blocking parity difference
- trust below submit threshold
- unresolved critical workflow

Default remediation:

- remediation classes: `SPAWN_WORKFLOW`, `REQUEST_APPROVAL`, `SUPERSEDE_AND_REPLAN`
- task types: `REVIEW_PARITY`
- compensation posture: `PRESERVE_AND_LIMIT` only where derived downstream outputs were already
  exposed and must remain auditable

### D. Authority protocol failures

Examples:

- token/client mismatch
- timeout with unknown authority state
- request-body/idempotency collision

Default remediation:

- remediation classes: `AUTO_RECONCILE`, `SPAWN_WORKFLOW`, `SUPERSEDE_AND_REPLAN`
- task types: `RELINK_AUTHORITY`, `RECONCILE_SUBMISSION_STATE`,
  `RETRY_AUTHORITY_OPERATION` only after reconciliation and idempotency validation
- compensation posture: `OPEN_RECONCILIATION`, never silent rollback

### E. Amendment failures

Examples:

- no confirmed final-declaration baseline
- amendment window closed
- intent-to-amend validation failed

Default remediation:

- remediation classes: `OPEN_INVESTIGATION`, `REQUEST_OPERATOR_REVIEW`, `ABORT_TERMINALLY`
- task types: investigation or replay workflow items where policy requires explicit operator action
- compensation posture: usually `MARK_AS_SUPERSEDED` for stale amendment drafts rather than erase

### F. Retention/privacy failures

Examples:

- legal hold prevents erasure
- evidence required for active legal baseline is expired
- attempted export of restricted data

Default remediation:

- remediation classes: `OPEN_INVESTIGATION`, `SPAWN_WORKFLOW`, `ABORT_TERMINALLY`
- task types: `CHECK_RETENTION_HOLD`, `ESCALATE_SECURITY_ISSUE`
- compensation posture: `PRESERVE_AND_LIMIT`

## 13.12 Message projection model

Every error SHALL support at least three projections:

- `user_message`
- `operator_message`
- `audit_message`

The user message SHALL be safe, clear, and action-oriented. The operator message SHALL include
technical remediation context. The audit message SHALL be the full structured representation or a
reference to it.

No projection may contradict the canonical error object.

## 13.13 Deduplication and escalation

The engine SHALL deduplicate recurring errors using a stable `dedupe_key` persisted on the
`ErrorRecord`.
It SHALL also persist a machine-readable `dedupe_scope`, `first_seen_at`, `last_seen_at`, and
`occurrence_count` so operators can distinguish one recurring open problem from many distinct
instances.

The `dedupe_key` SHALL be derived from:

- error family
- error code
- tenant/client scope
- normalized business-partition or obligation scope where relevant
- legal period or authority-operation scope where relevant
- affected object
- blocking class
- ordered blocking-effect capability set
- core reason code set

Distinct legal periods, manifest generations, authority-operation scopes, or materially different
blocking-effect sets SHALL NOT collapse into the same open error merely because the top-level family
matches.

### Escalation rules

- repeated unresolved `CRITICAL` errors SHALL escalate automatically
- repeated authority ambiguity for the same obligation SHALL escalate to reconciliation ownership
- repeated access or token-binding failures SHALL escalate to security/tenant admin ownership

Escalation SHALL be bounded and stateful, not implied only by free-text alerts.
Each open error SHALL track `escalation_state`, and transitions into a higher escalation state SHALL
be driven by at least:

- unresolved age
- `occurrence_count` inside the active dedupe scope
- retry-budget exhaustion where retry was previously legal

Escalation SHALL open or reassign concrete ownership; it SHALL NOT simply increment message
verbosity while leaving the error unowned.

## 13.14 Invariants

The error model SHALL satisfy these invariants:

1. no blocking failure without structured error object
2. no retry without retry class
3. no remediation without owner type
4. no accepted risk without explicit approval or policy basis
5. no legal-state ambiguity silently downgraded to success
6. no compensation that destroys audit truth
7. no user-facing error that exposes secrets or unsafe raw internals
8. no blocking or degraded capability omitted from `blocking_effects[]` when it changes legal or
   operational actionability
9. no side-effecting retry without a valid retry-idempotency scope and satisfied retry preconditions
10. no terminal resolution without a recorded basis and closure evidence
11. no deduplication across materially different legal, authority, or blocking-effect contexts
12. no failure dashboard reconstructed from logs, notes, or free text instead of persisted typed
    lifecycle objects

## 13.15 One-sentence summary

The error and remediation model turns every failure into a typed, owned, replayable operational object
so the engine always knows whether to retry, reconcile, review, override, compensate, or stop.

## 13.15A Replay and reproducibility error families

Additional typed failures SHALL exist for replayability hardening, including at minimum:

- `MANIFEST_EXECUTION_BASIS_HASH_MISSING`
- `REPLAY_CONFIG_FREEZE_MISSING`
- `REPLAY_INPUT_FREEZE_MISSING`
- `REPLAY_POST_SEAL_BASIS_MISSING`
- `REPLAY_BASIS_CORRUPT`
- `REPLAY_SCHEMA_READER_INCOMPATIBLE`
- `REPLAY_RETENTION_LIMITED`
- `REPLAY_UNEXPECTED_MISMATCH`

These failures SHALL distinguish between exact-basis preflight failure, historically limited
comparison, and an actual unexpected deterministic mismatch after a valid replay.
