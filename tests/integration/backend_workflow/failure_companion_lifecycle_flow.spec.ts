import { expect, test } from "@playwright/test";

import {
  AcceptedRiskApprovalRepository,
  advanceRemediationTask,
  CompensationRecordRepository,
  createRemediationTask,
  RemediationTaskRepository,
  recordAcceptedRiskApproval,
  recordCompensation,
  verifyOrSupersedeCompensation,
} from "../../../packages/backend-workflow/src/index.ts";

test("creates remediation, compensation, and accepted-risk artifacts from one error lineage", async () => {
  const remediationRepository = new RemediationTaskRepository();
  const compensationRepository = new CompensationRecordRepository();
  const acceptedRiskRepository = new AcceptedRiskApprovalRepository();
  const shared = {
    error_id: "error-0153-lineage",
    manifest_id: "manifest-0153",
    root_manifest_id: "manifest-root-0153",
    workflow_item_id: "workflow-item-0153",
  };

  const remediation = await createRemediationTask({
    ...shared,
    artifact_retention_ref: "artifact-retention://error-0153-lineage",
    audit_refs: ["audit://error-0153-lineage/remediation/open"],
    blocking_class: "BLOCKS_ERASURE",
    created_at: "2026-05-03T09:00:00Z",
    owner_ref: "operator://ops-1",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://error-0153-lineage/root"],
    remediation_steps_ref: "remediation-steps://error-0153-lineage/check-hold",
    repository: remediationRepository,
    retention_class: "regulated_record",
    task_id: "remediation-task-0153-lineage",
    task_type: "CHECK_RETENTION_HOLD",
  });
  const inProgress = await advanceRemediationTask({
    audit_refs: ["audit://error-0153-lineage/remediation/start"],
    repository: remediationRepository,
    task_id: remediation.task_id,
    to_state: "IN_PROGRESS",
    transitioned_at: "2026-05-03T09:05:00Z",
  });
  const completed = await advanceRemediationTask({
    audit_refs: ["audit://error-0153-lineage/remediation/complete"],
    closure_evidence_refs: ["evidence://error-0153-lineage/hold-confirmed"],
    closure_outcome: "HOLD_CONFIRMED",
    error_resolution_effect: "ERROR_MOVES_TO_MONITORING",
    repository: remediationRepository,
    resolution_basis_ref: "resolution-basis://error-0153-lineage/retention-hold",
    task_id: inProgress.task_id,
    to_state: "COMPLETED",
    transitioned_at: "2026-05-03T09:30:00Z",
  });

  const compensation = await recordCompensation({
    ...shared,
    artifact_retention_ref: "artifact-retention://error-0153-lineage",
    audit_refs: ["audit://error-0153-lineage/compensation/applied"],
    closure_evidence_refs: ["evidence://error-0153-lineage/limited-state"],
    compensated_at: "2026-05-03T09:40:00Z",
    compensation_id: "compensation-0153-lineage",
    compensation_mode: "PRESERVE_AND_LIMIT",
    compensation_status: "APPLIED",
    compensation_steps_ref: "compensation-steps://error-0153-lineage/preserve-limit",
    created_at: "2026-05-03T09:35:00Z",
    owner_ref: "operator://ops-1",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://error-0153-lineage/root"],
    repository: compensationRepository,
    resolution_basis_ref: "resolution-basis://error-0153-lineage/compensation",
    retention_class: "regulated_record",
    target_object_refs: ["artifact://derived-state-0153"],
  });
  const verified = await verifyOrSupersedeCompensation({
    action: "VERIFY",
    audit_refs: ["audit://error-0153-lineage/compensation/verified"],
    compensation_id: compensation.compensation_id,
    repository: compensationRepository,
    verification_ref: "verification://error-0153-lineage/compensation",
  });

  const approval = await recordAcceptedRiskApproval({
    ...shared,
    artifact_retention_ref: "artifact-retention://error-0153-lineage",
    accepted_risk_approval_id: "accepted-risk-0153-lineage",
    approved_at: "2026-05-03T10:00:00Z",
    approver_ref: "approver://tenant-admin-1",
    approver_type: "TENANT_ADMIN",
    audit_refs: ["audit://error-0153-lineage/accepted-risk/approved"],
    bounded_scope_refs: [
      "error://error-0153-lineage",
      "manifest://manifest-0153",
      "compensation-record://compensation-0153-lineage",
    ],
    decision_basis: "EXPLICIT_APPROVAL",
    expires_at: "2026-06-03T10:00:00Z",
    provenance_refs: ["provenance://error-0153-lineage/root"],
    rationale_ref: "rationale://error-0153-lineage/accepted-risk",
    repository: acceptedRiskRepository,
    retention_class: "regulated_record",
  });

  expect(completed.error_id).toBe(shared.error_id);
  expect(verified.error_id).toBe(shared.error_id);
  expect(approval.error_id).toBe(shared.error_id);
  expect(completed.failure_resolution_contract.lifecycle_role).toBe("REMEDIATION_TASK");
  expect(verified.failure_resolution_contract.lifecycle_role).toBe("COMPENSATION_RECORD");
  expect(approval.failure_resolution_contract.lifecycle_role).toBe("ACCEPTED_RISK_APPROVAL");

  expect(await remediationRepository.listRemediationTasksByError(shared.error_id)).toHaveLength(1);
  expect(await compensationRepository.listCompensationRecordsByError(shared.error_id)).toHaveLength(
    1,
  );
  expect(
    await acceptedRiskRepository.listAcceptedRiskApprovalsByError(shared.error_id),
  ).toHaveLength(1);
});
