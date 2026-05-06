# Failure Investigation And Dashboard Models

Task `pc_0154` adds the durable forensic branch and the persisted failure-lineage read model.
The implementation is grounded in:

- `Algorithm/data_model.md`
- `Algorithm/error_model_and_remediation_model.md`
- `Algorithm/failure_lifecycle_dashboard_and_lineage_contract.md`
- `Algorithm/failure_resolution_ownership_and_closure_contract.md`
- `Algorithm/observability_and_audit_contract.md`
- `Algorithm/audit_and_provenance.md`
- `Algorithm/schemas/failure_investigation.schema.json`
- `Algorithm/schemas/failure_lifecycle_dashboard.schema.json`
- `Algorithm/schemas/failure_resolution_contract.schema.json`

## FailureInvestigation

`FailureInvestigation` is a typed failure companion object, not a workflow note. It always stores a
`failure_resolution_contract` stamped with `lifecycle_role = FAILURE_INVESTIGATION` and
`role_specific_binding_policy = INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE`.

Allowed states:

`OPEN`, `EVIDENCE_GATHERING`, `AWAITING_EXTERNAL_INPUT`, `IN_REVIEW`, `RESOLVED`,
`ACCEPTED_RISK`, `SUPERSEDED`, `CANCELLED`.

Transition matrix:

- `OPEN` -> `EVIDENCE_GATHERING`, `AWAITING_EXTERNAL_INPUT`, `IN_REVIEW`, `RESOLVED`,
  `ACCEPTED_RISK`, `SUPERSEDED`, `CANCELLED`
- `EVIDENCE_GATHERING` -> `AWAITING_EXTERNAL_INPUT`, `IN_REVIEW`, `RESOLVED`,
  `ACCEPTED_RISK`, `SUPERSEDED`, `CANCELLED`
- `AWAITING_EXTERNAL_INPUT` -> `EVIDENCE_GATHERING`, `IN_REVIEW`, `RESOLVED`,
  `ACCEPTED_RISK`, `SUPERSEDED`, `CANCELLED`
- `IN_REVIEW` -> `EVIDENCE_GATHERING`, `AWAITING_EXTERNAL_INPUT`, `RESOLVED`,
  `ACCEPTED_RISK`, `SUPERSEDED`, `CANCELLED`
- terminal states have no outgoing transitions

Direct terminal transitions are allowed only through `resolveFailureInvestigation`, which writes
`resolved_at`, `resolution_basis_ref`, `closure_evidence_refs[]`, outcome, audit refs, and
provenance refs atomically.

Chronology and evidence rules:

- `due_at` must not predate `opened_at`
- `last_activity_at` must not predate `opened_at`
- `resolved_at` must not predate `opened_at` or `last_activity_at`
- non-terminal states must clear `resolved_at`, `resolution_basis_ref`, `outcome`,
  `accepted_risk_approval_ref`, `superseded_by_investigation_id`, and `closure_evidence_refs[]`
- terminal states require `resolved_at`, `resolution_basis_ref`, and non-empty
  `closure_evidence_refs[]`
- `ACCEPTED_RISK` requires `outcome = ACCEPTED_RISK` and `accepted_risk_approval_ref`
- `SUPERSEDED` requires `outcome = SUPERSEDED` and a non-self
  `superseded_by_investigation_id`
- `CANCELLED` requires `outcome = CANCELLED`
- `REMEDIATION_SPAWNED` and `RECONCILIATION_REQUIRED` outcomes require
  `remediation_task_refs[]`
- `RETENTION_PRIVACY_EXCEPTION` requires `retention_class` plus `artifact_retention_ref`

## FailureLifecycleDashboard

`FailureLifecycleDashboard` is the authoritative persisted read model for one governed failure
lineage. Query services return this stored artifact; UI routes do not rebuild lifecycle meaning from
logs, notes, or local joins.

The builder consumes only typed inputs:

- source error projection
- `RemediationTask[]`
- `CompensationRecord[]`
- `FailureInvestigation[]`
- `AcceptedRiskApproval[]`
- workflow coordination projection
- audit refs
- provenance refs

Lineage rules:

- `lineage_error_refs_in_order[0]` must equal `root_error_ref`
- the final lineage entry must equal `current_error_ref`
- task, compensation, investigation, accepted-risk, workflow, audit, and provenance refs are grouped
  under `lineage_refs`
- active/latest posture refs and `next_legal_action.action_ref_or_null` must appear in the matching
  grouped lineage refs

Current state and owner precedence:

1. active accepted risk
2. active investigation
3. active compensation
4. active remediation
5. workflow coordination
6. source error/system fallback

Active accepted-risk posture requires a future expiry, bounded scope, approval ref, and an
accountable non-system owner. The dashboard rejects active accepted risk unless `current_owner`
matches that accountable owner.

Next legal action derivation:

- terminal `RESOLVED`, `SUPERSEDED`, and `CANCELLED` dashboards force `NO_FURTHER_ACTION`
- active accepted risk creates `REVIEW_ACCEPTED_RISK_EXPIRY`
- active investigations create `PROGRESS_FAILURE_INVESTIGATION` or
  `AWAIT_INVESTIGATION_INPUT`
- active compensation creates `COMPLETE_COMPENSATION` or `VERIFY_COMPENSATION`
- active remediation creates `PROGRESS_REMEDIATION_TASK` or `AWAIT_REMEDIATION_INPUT`
- retry-scheduled errors create `WAIT_FOR_RETRY_WINDOW`
- workflow-owned failures create `REVIEW_FAILURE_WORKFLOW` or `AWAIT_WORKFLOW_INPUT`
- otherwise the source error creates `REVIEW_FAILURE`

Rebuild strategy:

The builder is deterministic and can be called eagerly after typed lifecycle changes. When a
repository is supplied it persists the dashboard immediately. `queryFailureLifecycleDashboard`
returns stored dashboards only, preserving the backend-authored read model as the inspection source.
