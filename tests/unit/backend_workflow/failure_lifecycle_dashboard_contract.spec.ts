import { expect, test } from "@playwright/test";

import {
  buildFailureLifecycleDashboardRecord,
  FailureLifecycleDashboardRepository,
  queryFailureLifecycleDashboard,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function baseDashboard(
  overrides: Partial<Parameters<typeof buildFailureLifecycleDashboardRecord>[0]> = {},
) {
  return buildFailureLifecycleDashboardRecord({
    accepted_risk_posture: {
      accountable_owner_ref_or_null: "tenant-admin://ops-owner",
      accountable_owner_type_or_null: "TENANT_ADMIN",
      approval_ref_or_null: "accepted-risk-approval://risk-0154",
      approver_ref_or_null: "approver://security-lead",
      approver_type_or_null: "SECURITY_OPERATOR",
      bounded_scope_refs: ["error://error-0154-current", "scope://filing-deferment"],
      decision_basis_or_null: "EXPLICIT_APPROVAL",
      expires_at_or_null: "2026-06-03T10:00:00Z",
      revoked_at_or_null: null,
      state: "ACTIVE",
    },
    audit_refs: ["audit://failure-0154/dashboard"],
    blocking_scope: {
      affected_object_refs: ["submission-record://preview"],
      blocking_class: "BLOCKS_FILING",
      reason_codes: ["AUTHORITY_STATE_UNRESOLVED"],
      workflow_item_ref_or_null: "workflow-item://workflow-0154",
    },
    closure_posture: {
      closure_evidence_refs: ["evidence://failure-0154/accepted-risk"],
      resolution_basis_ref_or_null: "resolution-basis://failure-0154/accepted-risk",
      resolution_state: "ACCEPTED_RISK",
      resolved_at_or_null: "2026-05-03T10:00:00Z",
      resolved_by_task_id_or_null: "remediation-task://task-0154",
    },
    compensation_posture: {
      active_compensation_ref_or_null: null,
      closure_evidence_refs: ["evidence://compensation-0154/verified"],
      latest_compensation_ref_or_null: "compensation-record://compensation-0154",
      resolution_basis_ref_or_null: "resolution-basis://compensation-0154",
      state: "VERIFIED",
      target_object_refs: ["derived-artifact://filing-state"],
      verification_ref_or_null: "verification://compensation-0154",
    },
    current_error_ref: "error://error-0154-current",
    current_lineage_state: "ACCEPTED_RISK_ACTIVE",
    current_owner: {
      owner_ref_or_null: "tenant-admin://ops-owner",
      owner_type: "TENANT_ADMIN",
      source_artifact_type: "ACCEPTED_RISK_APPROVAL",
      source_ref: "accepted-risk-approval://risk-0154",
    },
    current_state_source: {
      source_artifact_type: "ACCEPTED_RISK_APPROVAL",
      source_ref: "accepted-risk-approval://risk-0154",
      state_changed_at: "2026-05-03T10:00:00Z",
      state_code: "ACTIVE",
    },
    dashboard_id: "failure-dashboard-0154",
    first_opened_at: "2026-05-03T09:00:00Z",
    investigation_posture: {
      accepted_risk_approval_ref_or_null: "accepted-risk-approval://risk-0154",
      active_investigation_ref_or_null: null,
      latest_investigation_ref_or_null: "failure-investigation://investigation-0154",
      outcome_or_null: "ACCEPTED_RISK",
      state: "ACCEPTED_RISK",
    },
    last_activity_at: "2026-05-03T10:00:00Z",
    lineage_error_refs_in_order: ["error://error-0154-root", "error://error-0154-current"],
    lineage_refs: {
      accepted_risk_approval_refs: ["accepted-risk-approval://risk-0154"],
      audit_refs: ["audit://failure-0154/dashboard"],
      compensation_record_refs: ["compensation-record://compensation-0154"],
      failure_investigation_refs: ["failure-investigation://investigation-0154"],
      provenance_refs: ["provenance://failure-0154/root"],
      remediation_task_refs: ["remediation-task://task-0154"],
      workflow_item_refs: ["workflow-item://workflow-0154"],
    },
    manifest_id: "manifest-0154-current",
    next_legal_action: {
      action_code_or_null: "REVIEW_ACCEPTED_RISK_EXPIRY",
      action_ref_or_null: "workflow-item://workflow-0154",
      action_state: "REVIEW_DUE",
      due_at_or_null: "2026-06-03T10:00:00Z",
      reason_codes: ["ACCEPTED_RISK_EXPIRY_REVIEW_REQUIRED"],
      source_artifact_type_or_null: "WORKFLOW_ITEM",
      waiting_on_actor_or_null: "STAFF",
    },
    provenance_refs: ["provenance://failure-0154/root"],
    remediation_summary: {
      active_task_ref_or_null: null,
      due_at_or_null: "2026-05-03T09:30:00Z",
      error_resolution_effect_or_null: "ERROR_MOVES_TO_ACCEPTED_RISK",
      latest_task_ref_or_null: "remediation-task://task-0154",
      task_owner_ref_or_null: "operator://ops",
      task_owner_type_or_null: "SERVICE_OPERATOR",
      task_state_or_null: "COMPLETED",
    },
    root_error_ref: "error://error-0154-root",
    root_manifest_id: "manifest-0154-root",
    updated_at: "2026-05-03T10:05:00Z",
    workflow_coordination: {
      current_assignee_ref_or_null: "tenant-admin://ops-owner",
      customer_status_projection_or_null: "UNDER_REVIEW",
      lifecycle_state_or_null: "OPEN",
      waiting_on_actor_or_null: "STAFF",
      workflow_item_ref_or_null: "workflow-item://workflow-0154",
    },
    ...overrides,
  });
}

test("builds a persisted dashboard with root-to-current lineage and typed next action", () => {
  const dashboard = baseDashboard();

  expect(dashboard.artifact_type).toBe("FailureLifecycleDashboard");
  expect(dashboard.lineage_error_refs_in_order[0]).toBe(dashboard.root_error_ref);
  expect(dashboard.lineage_error_refs_in_order.at(-1)).toBe(dashboard.current_error_ref);
  expect(dashboard.next_legal_action.action_ref_or_null).toBe("workflow-item://workflow-0154");
});

test("rejects lineage drift and active accepted-risk owner ambiguity", () => {
  expect(() =>
    baseDashboard({
      lineage_error_refs_in_order: ["error://error-0154-current"],
    }),
  ).toThrow(/root_error_ref/i);

  expect(() =>
    baseDashboard({
      current_owner: {
        owner_ref_or_null: "tenant-admin://different-owner",
        owner_type: "TENANT_ADMIN",
        source_artifact_type: "ACCEPTED_RISK_APPROVAL",
        source_ref: "accepted-risk-approval://risk-0154",
      },
    }),
  ).toThrow(/accepted-risk/i);
});

test("rejects next legal actions that are not backed by grouped lineage refs", () => {
  expect(() =>
    baseDashboard({
      next_legal_action: {
        action_code_or_null: "PROGRESS_REMEDIATION_TASK",
        action_ref_or_null: "remediation-task://missing",
        action_state: "ACTION_AVAILABLE",
        due_at_or_null: null,
        reason_codes: ["REMEDIATION_TASK_ACTION_REQUIRED"],
        source_artifact_type_or_null: "REMEDIATION_TASK",
        waiting_on_actor_or_null: "STAFF",
      },
    }),
  ).toThrow(/next_legal_action/i);
});

test("query service returns the stored dashboard instead of rebuilding", async () => {
  const repository = new FailureLifecycleDashboardRepository();
  const dashboard = baseDashboard();
  await repository.persistFailureLifecycleDashboard({ dashboard });

  const queried = await queryFailureLifecycleDashboard({
    dashboard_id: dashboard.dashboard_id,
    repository,
  });

  expect(queried?.dashboard_id).toBe(dashboard.dashboard_id);
  expect(queried?.data_source_policy).toBe(
    "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY",
  );

  await expect(
    repository.persistFailureLifecycleDashboard({
      dashboard: {
        ...dashboard,
        root_error_ref: "error://error-0154-other-root",
        lineage_error_refs_in_order: [
          "error://error-0154-other-root",
          "error://error-0154-current",
        ],
        updated_at: "2026-05-03T10:10:00Z",
      },
    }),
  ).rejects.toThrow(WorkflowModelError);
});
