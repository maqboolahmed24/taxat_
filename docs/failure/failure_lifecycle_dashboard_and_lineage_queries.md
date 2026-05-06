# Failure Lifecycle Dashboard And Lineage Queries

`packages/backend-failure` exposes a failure-lifecycle read facade over the
authoritative `packages/backend-workflow` `FailureLifecycleDashboard` model. The
facade does not reconstruct lifecycle meaning from logs, operator notes, UI copy,
or unordered table scans. It accepts typed lifecycle objects and delegates final
normalization, invariant checks, and persistence to the backend-workflow model.

## Source Inputs

`buildFailureLifecycleDashboard(...)` consumes these typed inputs only:

- ordered `FailureLifecycleErrorRecord[]` from root to current
- `RemediationTask[]`
- `CompensationRecord[]`
- `FailureInvestigation[]`
- `AcceptedRiskApproval[]`
- accepted-risk accountable-owner records
- optional workflow coordination state
- explicit audit and provenance refs

The first error record is the root failure, the last error record is the current
failure, and every multi-entry lineage step must be linked by
`reopened_by_error_id` or `caused_by_error_id`. Reopened predecessor closure
evidence is retained in lineage provenance refs so non-terminal current errors do
not orphan earlier closure proof.

## State And Owner Precedence

The workflow model determines `current_lineage_state`, `current_state_source`,
and `current_owner` with this typed precedence ladder:

1. Active accepted risk.
2. Active investigation.
3. Active compensation in `PLANNED`, `IN_PROGRESS`, or `APPLIED`.
4. Active remediation.
5. Terminal current error state: `RESOLVED`, `SUPERSEDED`, or `CANCELLED`.
6. Scheduled retry on the current error.
7. Workflow-owned open failure.
8. Current error review fallback.

Owner precedence follows the same object-backed posture, with accepted-risk
accountable owner highest, then investigation, compensation, remediation,
workflow assignment, and finally the current error owner. Active accepted risk
must keep a future expiry and an accountable owner aligned with the dashboard
owner.

## Next Legal Action Grammar

`next_legal_action` is always typed and bound to an object ref unless the lineage
is terminal:

- terminal lineage: `NO_FURTHER_ACTION`
- active accepted risk: `REVIEW_ACCEPTED_RISK_EXPIRY`
- active investigation: `PROGRESS_FAILURE_INVESTIGATION` or
  `AWAIT_INVESTIGATION_INPUT`
- active compensation: `COMPLETE_COMPENSATION` or `VERIFY_COMPENSATION`
- active remediation: `PROGRESS_REMEDIATION_TASK` or
  `AWAIT_REMEDIATION_INPUT`
- scheduled retry: `WAIT_FOR_RETRY_WINDOW`
- workflow-owned open failure: `REVIEW_FAILURE_WORKFLOW` or
  `AWAIT_WORKFLOW_INPUT`
- open failure fallback: `REVIEW_FAILURE`

Non-terminal dashboards therefore cannot emit null action fields plus prose.
Terminal dashboards force `NO_FURTHER_ACTION`.

## Read Queries

`getFailureLifecycleDashboard(...)` retrieves one persisted dashboard by
`dashboard_id`, or by a query that must resolve to exactly one dashboard.
Ambiguous unique reads raise `FailureLifecycleDashboardQueryError`.

`listFailureLifecycleDashboards(...)` applies repository filters and returns
deterministic cursor-offset paging with a bounded `limit` from 1 to 250.

`getFailureLineageSlice(...)` returns the persisted dashboard's root/current
spine, selected lineage row, current owner, current state source, next legal
action, closure posture, and grouped lineage refs. It preserves selected-row
identity by requiring `selected_error_ref` to appear in
`lineage_error_refs_in_order`.

No browser lab or northbound route was added for this task; the implemented
surface is the backend-failure projector and read-query layer over persisted
typed dashboard records.
