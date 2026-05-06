import { expect, test } from "@playwright/test";

import {
  getGovernanceOverviewEndpoint,
  getGovernancePolicySnapshotEndpoint,
  getGovernancePrincipalsEndpoint,
  getGovernanceRoleMatrixEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  governanceReadActorContext,
  governanceReadRepositoriesFixture,
  governanceTenantId,
} from "../../unit/backend_northbound/governance_read_fixtures.ts";

test("governance read endpoints publish no-store schema artifacts with route-stable selection", async () => {
  const {
    accessPreview,
    governancePolicySnapshotRepository,
    overviewRepository,
    principalAccessViewRepository,
    roleTemplateMatrixRepository,
  } = await governanceReadRepositoriesFixture();
  const dependencies = {
    governancePolicySnapshotRepository,
    principalAccessViewRepository,
    roleTemplateMatrixRepository,
    tenantGovernanceSnapshotRepository: overviewRepository,
  };

  const overview = await getGovernanceOverviewEndpoint(
    {
      actorContext: governanceReadActorContext,
      correlationId: "corr.integration.governance.overview",
      method: "GET",
      path: `/v1/governance/tenants/${encodeURIComponent(
        governanceTenantId,
      )}/overview?risk_families=AUDIT_HOTSPOTS&selected_canvas_object_ref=audit.hotspot.authority-link-drift&focus_anchor_ref=audit.hotspot.authority-link-drift`,
    },
    dependencies,
  );
  expect(overview.status).toBe(200);
  expect(overview.headers["Cache-Control"]).toBe("no-store");
  expect(overview.body.artifact_type).toBe("TenantGovernanceSnapshot");
  expect(overview.body.active_filters.risk_families).toEqual(["AUDIT_HOTSPOTS"]);
  expect(overview.body.selected_canvas_object_ref).toBe("audit.hotspot.authority-link-drift");
  expect(overview.body.focus_anchor_ref).toBe("audit.hotspot.authority-link-drift");

  const policy = await getGovernancePolicySnapshotEndpoint(
    {
      activeSectionCode: "SECURITY_POSTURE",
      actorContext: governanceReadActorContext,
      correlationId: "corr.integration.governance.policy",
      method: "GET",
      tenantId: governanceTenantId,
    },
    dependencies,
  );
  expect(policy.status).toBe(200);
  expect(policy.headers["Cache-Control"]).toBe("no-store");
  expect(policy.body.artifact_type).toBe("GovernancePolicySnapshot");
  expect(policy.body.tenant_config_workspace.active_section_code).toBe("SECURITY_POSTURE");
  expect(policy.body.interaction_layer.selected_filter_chip_refs).toEqual([]);
  expect(policy.body.tenant_config_workspace.surface_order).toEqual([
    "SECTION_NAV",
    "CONFIG_FORM",
    "INLINE_POLICY_HELP",
    "BLAST_RADIUS_PANEL",
    "CHANGE_BASKET",
    "APPROVAL_COMPOSER",
    "CONFIG_HISTORY_TIMELINE",
  ]);
  expect(policy.body.policy_snapshot_hash).toBeTruthy();
  await validateContractSchema("governance_policy_snapshot", policy.body);

  const principals = await getGovernancePrincipalsEndpoint(
    {
      actorContext: governanceReadActorContext,
      correlationId: "corr.integration.governance.principals",
      method: "GET",
      principalId: accessPreview.principal_view.principal_id,
      selectedCellRef: accessPreview.principal_view.access_workspace.selected_cell_ref,
      tenantId: governanceTenantId,
    },
    dependencies,
  );
  expect(principals.status).toBe(200);
  expect(principals.headers["Cache-Control"]).toBe("no-store");
  expect(principals.body.artifact_type).toBe("PrincipalAccessView");
  expect(principals.body.access_workspace.selected_principal_ref).toBe(
    principals.body.principal_id,
  );
  expect(principals.body.selected_action_detail?.cell_ref).toBe(principals.body.focus_anchor_ref);
  expect(
    principals.body.action_matrix.find((cell) => cell.decision === "ALLOW_MASKED")?.masking_rules
      .length,
  ).toBeGreaterThan(0);

  const role = await getGovernanceRoleMatrixEndpoint(
    {
      actorContext: governanceReadActorContext,
      correlationId: "corr.integration.governance.role",
      method: "GET",
      path: `/v1/governance/tenants/${encodeURIComponent(
        governanceTenantId,
      )}/roles/${encodeURIComponent(accessPreview.role_template_matrix.role_id)}`,
      selectedCellRef: accessPreview.role_template_matrix.role_matrix_workspace.selected_cell_ref,
    },
    dependencies,
  );
  expect(role.status).toBe(200);
  expect(role.headers["Cache-Control"]).toBe("no-store");
  expect(role.body.artifact_type).toBe("RoleTemplateMatrix");
  expect(role.body.role_matrix_workspace.selected_cell_ref).toBe(role.body.focus_anchor_ref);
  expect(role.body.selected_action_detail?.cell_ref).toBe(role.body.focus_anchor_ref);
});

test("governance reads are hidden from customer portal or wrong-tenant sessions", async () => {
  const {
    governancePolicySnapshotRepository,
    overviewRepository,
    principalAccessViewRepository,
    roleTemplateMatrixRepository,
  } = await governanceReadRepositoriesFixture();
  const dependencies = {
    governancePolicySnapshotRepository,
    principalAccessViewRepository,
    roleTemplateMatrixRepository,
    tenantGovernanceSnapshotRepository: overviewRepository,
  };

  const portal = await getGovernanceOverviewEndpoint(
    {
      actorContext: governanceReadActorContext,
      correlationId: "corr.integration.governance.portal",
      method: "GET",
      principalClass: "CUSTOMER_PORTAL",
      tenantId: governanceTenantId,
    },
    dependencies,
  );
  expect(portal.status).toBe(404);
  expect(portal.body.artifact_type).toBe("ProblemEnvelope");
  expect(portal.body.reason_codes).toContain("GOVERNANCE_READ_CUSTOMER_PORTAL_SESSION_BLOCKED");

  const wrongTenant = await getGovernancePolicySnapshotEndpoint(
    {
      actorContext: {
        ...governanceReadActorContext,
        tenant_id: "tenant.other",
      },
      correlationId: "corr.integration.governance.wrong-tenant",
      method: "GET",
      tenantId: governanceTenantId,
    },
    dependencies,
  );
  expect(wrongTenant.status).toBe(404);
  expect(wrongTenant.body.reason_codes).toContain("GOVERNANCE_READ_TENANT_MISMATCH");
});
