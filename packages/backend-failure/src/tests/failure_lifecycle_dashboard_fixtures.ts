import {
  buildAcceptedRiskApproval,
  buildCompensationRecord,
  buildFailureResolutionContract,
  buildRemediationTask,
  type FailureAcceptedRiskAccountableOwner,
  type FailureLifecycleWorkflowSource,
} from "../../../backend-workflow/src/index.ts";
import type { FailureLifecycleErrorRecord } from "../index.ts";

export function failureErrorRecord(
  overrides: Partial<FailureLifecycleErrorRecord> = {},
): FailureLifecycleErrorRecord {
  const errorId = overrides.error_id ?? "error://pc0217/current";
  return {
    affected_object_refs: ["submission-record://pc0217/current"],
    audit_refs: [`audit://pc0217/${errorId.replaceAll("/", "_")}`],
    blocking_class: "BLOCKS_FILING",
    caused_by_error_id: null,
    closure_evidence_refs: [],
    error_id: errorId,
    first_seen_at: "2026-05-02T09:00:00Z",
    last_seen_at: "2026-05-02T09:05:00Z",
    manifest_id: "manifest.pc0217.current",
    next_retry_at: null,
    opened_at: "2026-05-02T09:00:00Z",
    provenance_refs: [`provenance://pc0217/${errorId.replaceAll("/", "_")}`],
    reason_codes: ["FAILURE_REVIEW_REQUIRED"],
    remediation_owner_ref: "operator://pc0217/current-owner",
    remediation_owner_type: "SERVICE_OPERATOR",
    reopened_by_error_id: null,
    resolved_at: null,
    resolved_by_task_id: null,
    resolution_basis_ref: null,
    resolution_state: "OPEN",
    root_manifest_id: "manifest.pc0217.root",
    workflow_item_id: "workflow-item://pc0217/current",
    ...overrides,
  };
}

export function reopenedLineageFixture() {
  const root = failureErrorRecord({
    audit_refs: ["audit://pc0217/root-closed"],
    closure_evidence_refs: ["evidence://pc0217/root-closure"],
    error_id: "error://pc0217/root",
    first_seen_at: "2026-05-01T09:00:00Z",
    last_seen_at: "2026-05-01T10:00:00Z",
    manifest_id: "manifest.pc0217.root",
    opened_at: "2026-05-01T09:00:00Z",
    provenance_refs: ["provenance://pc0217/root"],
    reopened_by_error_id: "error://pc0217/current",
    resolved_at: "2026-05-01T10:00:00Z",
    resolved_by_task_id: "remediation-task://pc0217/root-close",
    resolution_basis_ref: "resolution-basis://pc0217/root-close",
    resolution_state: "RESOLVED",
  });
  const current = failureErrorRecord({
    audit_refs: ["audit://pc0217/current-open"],
    caused_by_error_id: root.error_id,
    error_id: "error://pc0217/current",
    first_seen_at: "2026-05-02T09:00:00Z",
    last_seen_at: "2026-05-02T09:05:00Z",
    opened_at: "2026-05-02T09:00:00Z",
    provenance_refs: ["provenance://pc0217/current"],
    reason_codes: ["AUTHORITY_STATE_UNRESOLVED"],
  });
  return [root, current] as const;
}

export function workflowSourceFixture(
  overrides: Partial<FailureLifecycleWorkflowSource> = {},
): FailureLifecycleWorkflowSource {
  return {
    current_assignee_owner_type: "SERVICE_OPERATOR",
    current_assignee_ref_or_null: "operator://pc0217/remediation-owner",
    customer_status_projection_or_null: "UNDER_REVIEW",
    due_at_or_null: "2026-05-03T09:30:00Z",
    last_activity_at: "2026-05-02T09:20:00Z",
    lifecycle_state_or_null: "IN_PROGRESS",
    waiting_on_actor_or_null: "STAFF",
    workflow_item_ref: "workflow-item://pc0217/current",
    ...overrides,
  };
}

export function activeRemediationTaskFixture() {
  return buildRemediationTask({
    audit_refs: ["audit://pc0217/current-remediation"],
    blocking_class: "BLOCKS_FILING",
    created_at: "2026-05-02T09:10:00Z",
    due_at: "2026-05-03T09:30:00Z",
    error_id: "error://pc0217/current",
    error_resolution_effect: "ERROR_MOVES_TO_IN_PROGRESS",
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "REMEDIATION_TASK",
    }),
    manifest_id: "manifest.pc0217.current",
    owner_ref: "operator://pc0217/remediation-owner",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://pc0217/current-remediation"],
    remediation_steps_ref: "remediation-steps://pc0217/current",
    root_manifest_id: "manifest.pc0217.root",
    started_at: "2026-05-02T09:15:00Z",
    task_id: "pc0217-current-remediation",
    task_state: "IN_PROGRESS",
    task_type: "RECONCILE_SUBMISSION_STATE",
    workflow_item_id: "workflow-item://pc0217/current",
  });
}

export function verifiedCompensationFixture() {
  return buildCompensationRecord({
    artifact_retention_ref: "artifact-retention://pc0217/derived-filing-state",
    audit_refs: ["audit://pc0217/verified-compensation"],
    closure_evidence_refs: ["evidence://pc0217/verified-compensation"],
    compensated_at: "2026-05-01T10:30:00Z",
    compensation_id: "pc0217-verified-compensation",
    compensation_mode: "PRESERVE_AND_LIMIT",
    compensation_status: "VERIFIED",
    compensation_steps_ref: "compensation-steps://pc0217/verified",
    created_at: "2026-05-01T10:20:00Z",
    error_id: "error://pc0217/root",
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "COMPENSATION_RECORD",
    }),
    manifest_id: "manifest.pc0217.root",
    owner_ref: "operator://pc0217/compensation-owner",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://pc0217/verified-compensation"],
    resolution_basis_ref: "resolution-basis://pc0217/verified-compensation",
    retention_class: "derived_artifact",
    root_manifest_id: "manifest.pc0217.root",
    target_object_refs: ["derived-artifact://pc0217/filing-state"],
    verification_ref: "verification://pc0217/verified-compensation",
    workflow_item_id: "workflow-item://pc0217/current",
  });
}

export function activeAcceptedRiskFixture() {
  const current = failureErrorRecord({
    audit_refs: ["audit://pc0217/accepted-risk-error"],
    closure_evidence_refs: ["evidence://pc0217/accepted-risk"],
    error_id: "error://pc0217/accepted-risk",
    first_seen_at: "2026-05-03T09:00:00Z",
    last_seen_at: "2026-05-03T10:00:00Z",
    manifest_id: "manifest.pc0217.accepted-risk",
    opened_at: "2026-05-03T09:00:00Z",
    provenance_refs: ["provenance://pc0217/accepted-risk"],
    resolved_at: "2026-05-03T10:00:00Z",
    resolution_basis_ref: "resolution-basis://pc0217/accepted-risk",
    resolution_state: "ACCEPTED_RISK",
  });
  const approval = buildAcceptedRiskApproval({
    accepted_risk_approval_id: "pc0217-active-risk",
    approved_at: "2026-05-03T10:00:00Z",
    approver_ref: "tenant-admin://pc0217/approver",
    approver_type: "TENANT_ADMIN",
    audit_refs: ["audit://pc0217/accepted-risk-approval"],
    bounded_scope_refs: ["error://pc0217/accepted-risk", "scope://pc0217/deferment"],
    decision_basis: "EXPLICIT_APPROVAL",
    error_id: current.error_id,
    expires_at: "2026-06-03T10:00:00Z",
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "ACCEPTED_RISK_APPROVAL",
    }),
    manifest_id: current.manifest_id,
    provenance_refs: ["provenance://pc0217/accepted-risk-approval"],
    rationale_ref: "rationale://pc0217/accepted-risk",
    root_manifest_id: current.root_manifest_id,
    workflow_item_id: "workflow-item://pc0217/accepted-risk-review",
  });
  const owner: FailureAcceptedRiskAccountableOwner = {
    approval_ref: "accepted-risk-approval://pc0217-active-risk",
    owner_ref: "tenant-admin://pc0217/accountable-owner",
    owner_type: "TENANT_ADMIN",
  };
  return {
    approval,
    current,
    owner,
  };
}
