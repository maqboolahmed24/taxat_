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

A user-facing message may be derived from the error, but it SHALL not replace the canonical error
object.

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
- `retry_class`
- `remediation_class`
- `remediation_owner_type`
- `reason_codes[]`
- `affected_object_refs[]`
- `source_object_refs[]`
- `caused_by_error_id`
- `originating_activity_ref`
- `actor_ref`
- `service_ref`
- `authority_operation_ref` where relevant
- `customer_visibility_class`
- `operator_visibility_class`
- `opened_at`
- `resolved_at`
- `resolution_state`
- `resolution_notes_ref`

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
- `AMENDMENT_WINDOW_CLOSED`
- `RETENTION_HOLD_PREVENTS_ERASURE`

### Invariant-failure codes used by the core engine

When a persisted or derived artifact violates a supposedly impossible invariant, the engine SHALL fail
closed with a typed `SYSTEM_FAULT` or family-specific error code rather than crashing. Minimum codes:

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

## 13.6 Retry model

Every error SHALL carry a machine-readable retry class:

- `NO_RETRY`
- `SAFE_RETRY`
- `RECONCILE_THEN_RETRY`
- `HUMAN_REVIEW_THEN_RETRY`
- `REBUILD_THEN_RETRY`
- `MANUAL_INTERVENTION_REQUIRED`

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

## 13.8 Remediation task object

Where remediation requires action, the engine SHALL create a `RemediationTask` with:

- `task_id`
- `error_id`
- `task_type`
- `owner_type`
- `owner_ref` if assigned
- `due_at`
- `priority`
- `task_state`
- `remediation_steps_ref`
- `blocking_class`
- `superseded_by_task_id`
- `closure_outcome`

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

## 13.9 Compensation model

If a failure occurs after a stateful action has partially progressed, the engine SHALL create a
`CompensationRecord` rather than silently rewinding history.

Each `CompensationRecord` SHALL include:

- `compensation_id`
- `error_id`
- `compensation_mode`
- `target_object_refs[]`
- `compensation_status`
- `compensation_steps_ref`
- `compensated_at`
- `verification_ref`

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

`RESOLVED`
The root condition was corrected and the blocked path can progress or was cleanly terminated.

`ACCEPTED_RISK`
A bounded, approved exception exists and has been recorded.

`SUPERSEDED`
A later error or a later manifest replaced the original operational context.

## 13.11 Family-specific remediation rules

### A. Manifest/config failures

Examples:

- manifest not sealed
- non-approved config in compliance mode
- schema bundle mismatch

Default remediation:

- `REBUILD_ARTIFACT` or `SUPERSEDE_AND_REPLAN`
- retry class usually `NO_RETRY` or `REBUILD_THEN_RETRY`

### B. Input/data-quality failures

Examples:

- critical domain missing
- blocking conflict
- stale filing-critical source
- low-confidence critical extraction

Default remediation:

- `REQUEST_CLIENT_INPUT`
- `REQUEST_OPERATOR_REVIEW`
- `FIX_DATA`
- possibly `APPROVE_OVERRIDE` only where policy allows

### C. Parity/trust failures

Examples:

- blocking parity difference
- trust below submit threshold
- unresolved critical workflow

Default remediation:

- `REVIEW_PARITY`
- `SPAWN_WORKFLOW`
- `REQUEST_APPROVAL`
- `SUPERSEDE_AND_REPLAN`

### D. Authority protocol failures

Examples:

- token/client mismatch
- timeout with unknown authority state
- request-body/idempotency collision

Default remediation:

- `RELINK_AUTHORITY`
- `RECONCILE_SUBMISSION_STATE`
- `RETRY_AUTHORITY_OPERATION` only after reconciliation

### E. Amendment failures

Examples:

- no confirmed final-declaration baseline
- amendment window closed
- intent-to-amend validation failed

Default remediation:

- `OPEN_INVESTIGATION`
- `REQUEST_OPERATOR_REVIEW`
- `ABORT_TERMINALLY` where legally closed

### F. Retention/privacy failures

Examples:

- legal hold prevents erasure
- evidence required for active legal baseline is expired
- attempted export of restricted data

Default remediation:

- `CHECK_RETENTION_HOLD`
- `PRESERVE_AND_LIMIT`
- `ESCALATE_SECURITY_ISSUE`

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

The engine SHALL deduplicate recurring errors using a stable `dedupe_key` derived from:

- error family
- client scope
- affected object
- blocking class
- core reason code set

### Escalation rules

- repeated unresolved `CRITICAL` errors SHALL escalate automatically
- repeated authority ambiguity for the same obligation SHALL escalate to reconciliation ownership
- repeated access or token-binding failures SHALL escalate to security/tenant admin ownership

## 13.14 Invariants

The error model SHALL satisfy these invariants:

1. no blocking failure without structured error object
2. no retry without retry class
3. no remediation without owner type
4. no accepted risk without explicit approval or policy basis
5. no legal-state ambiguity silently downgraded to success
6. no compensation that destroys audit truth
7. no user-facing error that exposes secrets or unsafe raw internals

## 13.15 One-sentence summary

The error and remediation model turns every failure into a typed, owned, replayable operational object
so the engine always knows whether to retry, reconcile, review, override, compensate, or stop.
