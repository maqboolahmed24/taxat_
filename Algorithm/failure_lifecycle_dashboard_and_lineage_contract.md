# Failure Lifecycle Dashboard And Lineage Contract

## Purpose

The backend SHALL persist one authoritative read-side dashboard for each governed failure lineage so
operators and downstream surfaces can inspect the current failure state, accountable owner, next
legal action, blocking scope, compensation posture, accepted-risk expiry, and closure evidence
without reconstructing meaning from raw tables, logs, or free-text notes.

The machine contract for this boundary is `schemas/failure_lifecycle_dashboard.schema.json`.

## Governing Model

`FailureLifecycleDashboard` is a persisted projection, not mutation-side truth. It SHALL summarize
typed lifecycle objects only:

- `ErrorRecord`
- `RemediationTask`
- `CompensationRecord`
- `FailureInvestigation`
- `AcceptedRiskApproval`
- `WorkflowItem`
- `audit_refs[]`
- `provenance_refs[]`

Every dashboard SHALL retain:

- one `root_error_ref`
- one `current_error_ref`
- ordered `lineage_error_refs_in_order[]` from root to current successor/reopen node
- one typed `current_state_source{ source_artifact_type, source_ref, state_code, state_changed_at }`
- one typed `current_owner{ owner_type, owner_ref_or_null, source_artifact_type, source_ref }`
- one typed `next_legal_action{...}` bound to an object ref or an explicit terminal no-action state
- explicit `blocking_scope{...}`
- explicit `remediation_summary{...}`
- explicit `compensation_posture{...}`
- explicit `investigation_posture{...}`
- explicit `accepted_risk_posture{...}`
- explicit `workflow_coordination{...}`
- explicit `closure_posture{...}`
- grouped lineage refs for task, compensation, investigation, approval, workflow, audit, and
  provenance continuity

The projection SHALL also pin these invariant policies directly on the artifact:

- `underlying_error_visibility_policy = UNDERLYING_ERROR_ALWAYS_VISIBLE`
- `accepted_risk_owner_policy = ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY`
- `data_source_policy = PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY`
- `log_reconstruction_policy = NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION`

## Required Outcomes

The architecture SHALL reject the following ambiguity classes:

- dashboards that summarize compensation without still exposing the underlying failure lineage
- accepted-risk posture that surfaces expiry without a current accountable owner
- reopened or successor failures that lose the root-to-current error chain
- dashboards whose next action is inferred from logs, stale notes, or UI heuristics instead of a
  typed object-backed source
- lifecycle views that lose closure evidence, audit refs, or provenance refs once compensation,
  supersession, or accepted risk appears

## Read-Model Rules

`lineage_error_refs_in_order[]` SHALL remain the canonical lineage spine. The first entry SHALL
equal `root_error_ref` and the last entry SHALL equal `current_error_ref`.

`current_state_source` SHALL name the typed artifact that currently governs the lineage posture. If
the active posture is remediation, investigation, compensation, accepted risk, or workflow-owned
follow-up, the source ref SHALL point at that exact child object rather than at a free-text status.

`current_owner` SHALL expose the currently accountable owner even when the active posture is
accepted risk. Accepted-risk dashboards SHALL therefore retain both approval lineage and the current
accountable owner for expiry review.

`next_legal_action` SHALL be explicit and typed. Non-terminal dashboards SHALL retain a concrete
action code plus either an action ref or an explicit waiting or due posture. Terminal dashboards
SHALL force `NO_FURTHER_ACTION`.

`compensation_posture` SHALL never replace or hide the root/current error chain. Compensation is a
settlement branch within the failure lineage, not a substitute for the error object.

`accepted_risk_posture` SHALL distinguish `NONE`, `ACTIVE`, `EXPIRED`, `REVOKED`, and `SUPERSEDED`.
`ACTIVE` posture SHALL retain approval ref, bounded scope, expiry, and accountable owner.

## Construction Rule

`BUILD_FAILURE_LIFECYCLE_DASHBOARD(...)` SHALL consume persisted lifecycle objects, workflow state,
audit refs, and provenance refs only. It SHALL not derive lifecycle truth from:

- operational log text
- operator notes
- message copy
- UI-local joins
- unordered raw table scans with no typed lineage basis

The dashboard is the authoritative backend-authored read model for failure-lifecycle inspection.
