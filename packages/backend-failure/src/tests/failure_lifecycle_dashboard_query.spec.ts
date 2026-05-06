import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildFailureLifecycleDashboard,
  FailureLifecycleDashboardRepository,
  getFailureLifecycleDashboard,
  getFailureLineageSlice,
  listFailureLifecycleDashboards,
} from "../index.ts";
import {
  activeAcceptedRiskFixture,
  activeRemediationTaskFixture,
  reopenedLineageFixture,
  workflowSourceFixture,
} from "./failure_lifecycle_dashboard_fixtures.ts";

async function populatedRepository() {
  const repository = new FailureLifecycleDashboardRepository();
  const [root, current] = reopenedLineageFixture();
  const remediationDashboard = await buildFailureLifecycleDashboard({
    dashboard_id: "failure-dashboard://pc0217/remediation",
    lineage_error_records_in_order: [root, current],
    remediation_tasks: [activeRemediationTaskFixture()],
    repository,
    updated_at: "2026-05-02T09:45:00Z",
    workflow: workflowSourceFixture(),
  });

  const { approval, current: acceptedRiskError, owner } = activeAcceptedRiskFixture();
  const acceptedRiskDashboard = await buildFailureLifecycleDashboard({
    accepted_risk_accountable_owners: [owner],
    accepted_risk_approvals: [approval],
    dashboard_id: "failure-dashboard://pc0217/accepted-risk",
    lineage_error_records_in_order: [acceptedRiskError],
    repository,
    updated_at: "2026-05-03T10:05:00Z",
    workflow: workflowSourceFixture({
      current_assignee_owner_type: "TENANT_ADMIN",
      current_assignee_ref_or_null: owner.owner_ref,
      due_at_or_null: approval.expires_at,
      workflow_item_ref: "workflow-item://pc0217/accepted-risk-review",
    }),
  });

  return {
    acceptedRiskDashboard,
    remediationDashboard,
    repository,
  };
}

test("gets a persisted failure lifecycle dashboard without rebuilding from logs", async () => {
  const { remediationDashboard, repository } = await populatedRepository();

  const result = await getFailureLifecycleDashboard({
    dashboard_id: remediationDashboard.dashboard_id,
    repository,
  });

  expect(result?.dashboard_id).toBe(remediationDashboard.dashboard_id);
  expect(result?.lineage_error_refs_in_order).toEqual([
    "error://pc0217/root",
    "error://pc0217/current",
  ]);
  expect(result?.data_source_policy).toBe(
    "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY",
  );
  await validateContractSchema("failure_lifecycle_dashboard", result);
});

test("lists dashboards by typed lineage state with deterministic cursor paging", async () => {
  const { repository } = await populatedRepository();

  const firstPage = await listFailureLifecycleDashboards({
    limit: 1,
    repository,
  });
  const remediationOnly = await listFailureLifecycleDashboards({
    current_lineage_state: "REMEDIATION_ACTIVE",
    repository,
  });

  expect(firstPage.page.total_count).toBe(2);
  expect(firstPage.page.next_cursor_offset_or_null).toBe(1);
  expect(firstPage.dashboards).toHaveLength(1);
  expect(remediationOnly.dashboards).toHaveLength(1);
  expect(remediationOnly.dashboards[0]?.current_lineage_state).toBe("REMEDIATION_ACTIVE");
});

test("returns a lineage slice that preserves selected row and typed next action", async () => {
  const { remediationDashboard, repository } = await populatedRepository();

  const slice = await getFailureLineageSlice({
    dashboard_id: remediationDashboard.dashboard_id,
    repository,
    selected_error_ref: "error://pc0217/root",
  });

  expect(slice.root_error_ref).toBe("error://pc0217/root");
  expect(slice.current_error_ref).toBe("error://pc0217/current");
  expect(slice.selected_error_ref).toBe("error://pc0217/root");
  expect(slice.selected_index).toBe(0);
  expect(slice.next_legal_action).toMatchObject({
    action_ref_or_null: "remediation-task://pc0217-current-remediation",
    source_artifact_type_or_null: "REMEDIATION_TASK",
  });
  expect(slice.lineage_refs.remediation_task_refs).toContain(
    "remediation-task://pc0217-current-remediation",
  );
});
