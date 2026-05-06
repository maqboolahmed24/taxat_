import { expect, test } from "@playwright/test";

import {
  AcceptedRiskApprovalRepository,
  advanceRemediationTask,
  buildFailureLifecycleDashboard,
  CompensationRecordRepository,
  createRemediationTask,
  FailureInvestigationRepository,
  FailureLifecycleDashboardRepository,
  failureInvestigationRef,
  openFailureInvestigation,
  queryFailureLifecycleDashboard,
  RemediationTaskRepository,
  recordAcceptedRiskApproval,
  recordCompensation,
  remediationTaskRef,
  resolveFailureInvestigation,
  updateFailureInvestigation,
  verifyOrSupersedeCompensation,
} from "../../../packages/backend-workflow/src/index.ts";

test("builds and stores a failure lifecycle dashboard from typed failure objects", async () => {
  const remediationRepository = new RemediationTaskRepository();
  const compensationRepository = new CompensationRecordRepository();
  const investigationRepository = new FailureInvestigationRepository();
  const acceptedRiskRepository = new AcceptedRiskApprovalRepository();
  const dashboardRepository = new FailureLifecycleDashboardRepository();
  const shared = {
    error_id: "error-0154-lineage",
    manifest_id: "manifest-0154-current",
    root_manifest_id: "manifest-0154-root",
    workflow_item_id: "workflow-0154-lineage",
  };

  const remediation = await createRemediationTask({
    ...shared,
    audit_refs: ["audit://failure-0154/remediation/open"],
    blocking_class: "BLOCKS_FILING",
    created_at: "2026-05-03T09:05:00Z",
    owner_ref: "operator://failure-team/remediation",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://failure-0154/root"],
    remediation_steps_ref: "remediation-steps://failure-0154/reconcile-authority",
    repository: remediationRepository,
    task_id: "task-0154-lineage",
    task_type: "RECONCILE_SUBMISSION_STATE",
  });
  await advanceRemediationTask({
    audit_refs: ["audit://failure-0154/remediation/start"],
    repository: remediationRepository,
    task_id: remediation.task_id,
    to_state: "IN_PROGRESS",
    transitioned_at: "2026-05-03T09:10:00Z",
  });
  const completedRemediation = await advanceRemediationTask({
    audit_refs: ["audit://failure-0154/remediation/complete"],
    closure_evidence_refs: ["evidence://failure-0154/reconciliation"],
    closure_outcome: "ACCEPTED_RISK",
    error_resolution_effect: "ERROR_MOVES_TO_ACCEPTED_RISK",
    accepted_risk_approval_ref: "accepted-risk-approval://risk-0154-lineage",
    repository: remediationRepository,
    resolution_basis_ref: "resolution-basis://failure-0154/reconcile-risk",
    task_id: remediation.task_id,
    to_state: "COMPLETED",
    transitioned_at: "2026-05-03T09:30:00Z",
  });

  const compensation = await recordCompensation({
    ...shared,
    audit_refs: ["audit://failure-0154/compensation/applied"],
    closure_evidence_refs: ["evidence://failure-0154/limited-state"],
    compensated_at: "2026-05-03T09:40:00Z",
    compensation_id: "compensation-0154-lineage",
    compensation_mode: "PRESERVE_AND_LIMIT",
    compensation_status: "APPLIED",
    compensation_steps_ref: "compensation-steps://failure-0154/preserve-limit",
    created_at: "2026-05-03T09:35:00Z",
    artifact_retention_ref: "artifact-retention://failure-0154",
    owner_ref: "operator://failure-team/compensation",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://failure-0154/compensation"],
    repository: compensationRepository,
    resolution_basis_ref: "resolution-basis://failure-0154/compensation",
    retention_class: "regulated_record",
    target_object_refs: ["derived-artifact://filing-state"],
  });
  const verifiedCompensation = await verifyOrSupersedeCompensation({
    action: "VERIFY",
    audit_refs: ["audit://failure-0154/compensation/verified"],
    compensation_id: compensation.compensation_id,
    repository: compensationRepository,
    verification_ref: "verification://failure-0154/compensation",
  });

  const investigation = await openFailureInvestigation({
    ...shared,
    audit_refs: ["audit://failure-0154/investigation/open"],
    investigation_class: "AUTHORITY_STATE_AMBIGUITY",
    investigation_id: "investigation-0154-lineage",
    investigation_steps_ref: "investigation-steps://failure-0154/authority-state",
    opened_at: "2026-05-03T09:45:00Z",
    owner_ref: "reviewer://failure-team/investigator",
    owner_type: "REVIEWER",
    provenance_refs: ["provenance://failure-0154/investigation"],
    repository: investigationRepository,
  });
  await updateFailureInvestigation({
    audit_refs: ["audit://failure-0154/investigation/review"],
    investigation_id: investigation.investigation_id,
    last_activity_at: "2026-05-03T09:55:00Z",
    repository: investigationRepository,
    to_state: "IN_REVIEW",
  });

  const approval = await recordAcceptedRiskApproval({
    ...shared,
    accepted_risk_approval_id: "risk-0154-lineage",
    approved_at: "2026-05-03T10:00:00Z",
    approver_ref: "security-operator://failure-risk/approver",
    approver_type: "SECURITY_OPERATOR",
    audit_refs: ["audit://failure-0154/accepted-risk/approved"],
    bounded_scope_refs: ["error://failure-0154-root", "submission-record://preview"],
    decision_basis: "EXPLICIT_APPROVAL",
    expires_at: "2026-06-03T10:00:00Z",
    provenance_refs: ["provenance://failure-0154/accepted-risk"],
    rationale_ref: "rationale://failure-0154/accepted-risk",
    repository: acceptedRiskRepository,
  });
  const resolvedInvestigation = await resolveFailureInvestigation({
    accepted_risk_approval_ref: "accepted-risk-approval://risk-0154-lineage",
    audit_refs: ["audit://failure-0154/investigation/accepted-risk"],
    closure_evidence_refs: ["evidence://failure-0154/risk-basis"],
    investigation_id: investigation.investigation_id,
    repository: investigationRepository,
    resolution_basis_ref: "resolution-basis://failure-0154/accepted-risk",
    resolved_at: "2026-05-03T10:00:00Z",
    to_state: "ACCEPTED_RISK",
  });

  const dashboard = await buildFailureLifecycleDashboard({
    accepted_risk_accountable_owners: [
      {
        approval_ref: "accepted-risk-approval://risk-0154-lineage",
        owner_ref: "tenant-admin://failure-owner",
        owner_type: "TENANT_ADMIN",
      },
    ],
    accepted_risk_approvals: [approval],
    audit_refs: ["audit://failure-0154/source-error"],
    compensation_records: [verifiedCompensation],
    current_error_ref: "error://failure-0154-current",
    dashboard_id: "failure-dashboard-0154-lineage",
    investigations: [resolvedInvestigation],
    lineage_error_refs_in_order: ["error://failure-0154-root", "error://failure-0154-current"],
    manifest_id: "manifest-0154-current",
    provenance_refs: ["provenance://failure-0154/source-error"],
    remediation_tasks: [completedRemediation],
    repository: dashboardRepository,
    root_error_ref: "error://failure-0154-root",
    root_manifest_id: "manifest-0154-root",
    source_error: {
      affected_object_refs: ["submission-record://preview"],
      blocking_class: "BLOCKS_FILING",
      closure_evidence_refs: ["evidence://failure-0154/source-closure"],
      last_activity_at: "2026-05-03T10:00:00Z",
      opened_at: "2026-05-03T09:00:00Z",
      reason_codes: ["AUTHORITY_STATE_UNRESOLVED"],
      resolution_basis_ref: "resolution-basis://failure-0154/accepted-risk",
      resolution_state: "ACCEPTED_RISK",
      resolved_at: "2026-05-03T10:00:00Z",
      resolved_by_task_id: remediationTaskRef(completedRemediation),
    },
    updated_at: "2026-05-03T10:05:00Z",
    workflow: {
      current_assignee_owner_type: "TENANT_ADMIN",
      current_assignee_ref_or_null: "tenant-admin://failure-owner",
      customer_status_projection_or_null: "UNDER_REVIEW",
      lifecycle_state_or_null: "OPEN",
      waiting_on_actor_or_null: "STAFF",
      workflow_item_ref: "workflow-item://workflow-0154-lineage",
    },
  });

  expect(dashboard.current_lineage_state).toBe("ACCEPTED_RISK_ACTIVE");
  expect(dashboard.current_owner.owner_ref_or_null).toBe("tenant-admin://failure-owner");
  expect(dashboard.next_legal_action.action_ref_or_null).toBe(
    "workflow-item://workflow-0154-lineage",
  );
  expect(dashboard.lineage_refs.failure_investigation_refs).toContain(
    failureInvestigationRef(resolvedInvestigation),
  );

  const stored = await queryFailureLifecycleDashboard({
    dashboard_id: "failure-dashboard-0154-lineage",
    repository: dashboardRepository,
  });
  expect(stored?.dashboard_id).toBe("failure-dashboard-0154-lineage");

  const successorDashboard = await buildFailureLifecycleDashboard({
    audit_refs: ["audit://failure-0154-successor/open"],
    current_error_ref: "error://failure-0154-successor",
    dashboard_id: "failure-dashboard-0154-successor",
    lineage_error_refs_in_order: [
      "error://failure-0154-root",
      "error://failure-0154-current",
      "error://failure-0154-successor",
    ],
    manifest_id: "manifest-0154-successor",
    provenance_refs: ["provenance://failure-0154-successor/root"],
    repository: dashboardRepository,
    root_error_ref: "error://failure-0154-root",
    root_manifest_id: "manifest-0154-root",
    source_error: {
      affected_object_refs: ["submission-record://preview"],
      blocking_class: "BLOCKS_REVIEW_PROGRESS",
      last_activity_at: "2026-05-03T11:00:00Z",
      opened_at: "2026-05-03T11:00:00Z",
      owner_ref: "reviewer://failure-team/successor",
      owner_type: "REVIEWER",
      reason_codes: ["SUCCESSOR_FAILURE_OPENED"],
    },
    updated_at: "2026-05-03T11:00:00Z",
    workflow: {
      current_assignee_owner_type: "REVIEWER",
      current_assignee_ref_or_null: "reviewer://failure-team/successor",
      customer_status_projection_or_null: "UNDER_REVIEW",
      lifecycle_state_or_null: "OPEN",
      waiting_on_actor_or_null: "STAFF",
      workflow_item_ref: "workflow-item://workflow-0154-successor",
    },
  });

  expect(successorDashboard.lineage_error_refs_in_order.at(-1)).toBe(
    "error://failure-0154-successor",
  );
  expect(successorDashboard.current_lineage_state).toBe("OPEN_FAILURE");
});
