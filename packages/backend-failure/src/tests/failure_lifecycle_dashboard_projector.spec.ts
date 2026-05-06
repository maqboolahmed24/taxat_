import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildFailureLifecycleDashboard } from "../index.ts";
import {
  activeAcceptedRiskFixture,
  activeRemediationTaskFixture,
  reopenedLineageFixture,
  verifiedCompensationFixture,
  workflowSourceFixture,
} from "./failure_lifecycle_dashboard_fixtures.ts";

test("builds root-to-current failure dashboards from typed lifecycle objects", async () => {
  const [root, current] = reopenedLineageFixture();
  const remediationTask = activeRemediationTaskFixture();
  const compensation = verifiedCompensationFixture();

  const dashboard = await buildFailureLifecycleDashboard({
    compensation_records: [compensation],
    lineage_error_records_in_order: [root, current],
    remediation_tasks: [remediationTask],
    updated_at: "2026-05-02T09:45:00Z",
    workflow: workflowSourceFixture(),
  });

  expect(dashboard.artifact_type).toBe("FailureLifecycleDashboard");
  expect(dashboard.root_error_ref).toBe(root.error_id);
  expect(dashboard.current_error_ref).toBe(current.error_id);
  expect(dashboard.lineage_error_refs_in_order).toEqual([root.error_id, current.error_id]);
  expect(dashboard.current_lineage_state).toBe("REMEDIATION_ACTIVE");
  expect(dashboard.current_state_source).toMatchObject({
    source_artifact_type: "REMEDIATION_TASK",
    source_ref: "remediation-task://pc0217-current-remediation",
  });
  expect(dashboard.current_owner).toMatchObject({
    owner_ref_or_null: "operator://pc0217/remediation-owner",
    owner_type: "SERVICE_OPERATOR",
  });
  expect(dashboard.next_legal_action).toMatchObject({
    action_code_or_null: "PROGRESS_REMEDIATION_TASK",
    action_ref_or_null: "remediation-task://pc0217-current-remediation",
    source_artifact_type_or_null: "REMEDIATION_TASK",
  });
  expect(dashboard.compensation_posture).toMatchObject({
    latest_compensation_ref_or_null: "compensation-record://pc0217-verified-compensation",
    state: "VERIFIED",
  });
  expect(dashboard.lineage_refs.provenance_refs).toContain(
    "evidence://pc0217/root-closure",
  );
  expect(dashboard.underlying_error_visibility_policy).toBe(
    "UNDERLYING_ERROR_ALWAYS_VISIBLE",
  );
  expect(dashboard.data_source_policy).toBe(
    "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY",
  );
  expect(dashboard.log_reconstruction_policy).toBe(
    "NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION",
  );

  await validateContractSchema("failure_lifecycle_dashboard", dashboard);
});

test("keeps active accepted-risk expiry and accountable owner aligned", async () => {
  const { approval, current, owner } = activeAcceptedRiskFixture();

  const dashboard = await buildFailureLifecycleDashboard({
    accepted_risk_accountable_owners: [owner],
    accepted_risk_approvals: [approval],
    lineage_error_records_in_order: [current],
    updated_at: "2026-05-03T10:05:00Z",
    workflow: workflowSourceFixture({
      current_assignee_owner_type: "TENANT_ADMIN",
      current_assignee_ref_or_null: owner.owner_ref,
      due_at_or_null: approval.expires_at,
      workflow_item_ref: "workflow-item://pc0217/accepted-risk-review",
    }),
  });

  expect(dashboard.current_lineage_state).toBe("ACCEPTED_RISK_ACTIVE");
  expect(dashboard.accepted_risk_posture).toMatchObject({
    accountable_owner_ref_or_null: owner.owner_ref,
    accountable_owner_type_or_null: owner.owner_type,
    approval_ref_or_null: "accepted-risk-approval://pc0217-active-risk",
    expires_at_or_null: "2026-06-03T10:00:00Z",
    state: "ACTIVE",
  });
  expect(dashboard.current_owner).toMatchObject({
    owner_ref_or_null: owner.owner_ref,
    owner_type: owner.owner_type,
    source_artifact_type: "ACCEPTED_RISK_APPROVAL",
  });
  expect(dashboard.next_legal_action).toMatchObject({
    action_code_or_null: "REVIEW_ACCEPTED_RISK_EXPIRY",
    action_state: "REVIEW_DUE",
    due_at_or_null: approval.expires_at,
  });
  expect(dashboard.closure_posture).toMatchObject({
    closure_evidence_refs: ["evidence://pc0217/accepted-risk"],
    resolution_state: "ACCEPTED_RISK",
  });

  await validateContractSchema("failure_lifecycle_dashboard", dashboard);
});

test("rejects successor lineage without typed error-record linkage", async () => {
  const [root, current] = reopenedLineageFixture();

  await expect(
    buildFailureLifecycleDashboard({
      lineage_error_records_in_order: [
        {
          ...root,
          reopened_by_error_id: null,
        },
        {
          ...current,
          caused_by_error_id: null,
        },
      ],
      updated_at: "2026-05-02T09:45:00Z",
    }),
  ).rejects.toThrow(/lineage/i);
});
