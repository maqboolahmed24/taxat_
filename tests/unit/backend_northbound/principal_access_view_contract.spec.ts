import { expect, test } from "@playwright/test";

import {
  getPrincipalAccessView,
  getRoleTemplateMatrix,
  validatePrincipalAccessViewPublication,
  validateRoleTemplateMatrixPublication,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  governanceReadRepositoriesFixture,
  governanceTenantId,
} from "./governance_read_fixtures.ts";

const authorityLayerOrder = [
  "SESSION_AUTHN_POSTURE",
  "TENANT_OPERATIONAL_AUTHORITY",
  "CLIENT_DELEGATION_COVERAGE",
  "EXTERNAL_AUTHORITY_LINK_READINESS",
];

test("PrincipalAccessView preserves subject, capability, delegation, matrix, and AUTHORIZE vocabulary", async () => {
  const { accessPreview, principalAccessViewRepository } =
    await governanceReadRepositoriesFixture();
  const selectedCellRef = accessPreview.principal_view.access_workspace.selected_cell_ref;
  const current = await getPrincipalAccessView({
    principalAccessViewRepository,
    query: {
      principal_id: accessPreview.principal_view.principal_id,
      role_refs: accessPreview.principal_view.effective_role_set,
      selected_cell_ref: selectedCellRef,
    },
    tenantId: governanceTenantId,
  });

  expect(current).not.toBeNull();
  const view = validatePrincipalAccessViewPublication(current!.view);
  expect(view.principal_id).toBeTruthy();
  expect(view.effective_role_set.length).toBeGreaterThan(0);
  expect(view.approval_capabilities.every((token) => token.length > 0)).toBe(true);
  expect(view.run_kind_capabilities.every((token) => token.length > 0)).toBe(true);
  expect(view.delegation_summaries[0]).toMatchObject({
    client_id: "client.taxpayer.001",
    delegation_basis: "CLIENT_GRANTED",
  });
  expect(view.delegation_summaries[0]?.scope_refs.length).toBeGreaterThan(0);
  expect(view.access_workspace.selected_principal_ref).toBe(view.principal_id);
  expect(view.access_workspace.selected_cell_ref).toBe(view.focus_anchor_ref);
  expect(view.selected_action_detail?.cell_ref).toBe(view.focus_anchor_ref);
  expect(view.action_matrix.map((cell) => cell.decision)).toEqual(
    expect.arrayContaining([
      "ALLOW",
      "ALLOW_MASKED",
      "REQUIRE_STEP_UP",
      "REQUIRE_APPROVAL",
      "DENY",
    ]),
  );
  const maskedCell = view.action_matrix.find((cell) => cell.decision === "ALLOW_MASKED");
  expect(maskedCell?.masking_rules.length).toBeGreaterThan(0);
  expect(maskedCell?.reason_codes.length).toBeGreaterThan(0);
  expect(
    view.selected_action_detail?.authority_chain_layers
      .slice(0, 4)
      .map((layer) => layer.layer_code),
  ).toEqual(authorityLayerOrder);
});

test("RoleTemplateMatrix preserves policy hash, version hash, selected cell, and pending editor context", async () => {
  const { accessPreview, roleTemplateMatrixRepository } = await governanceReadRepositoriesFixture();
  const roleId = accessPreview.role_template_matrix.role_id;
  const selectedCellRef =
    accessPreview.role_template_matrix.role_matrix_workspace.selected_cell_ref;
  const current = await getRoleTemplateMatrix({
    query: {
      role_editor_pending_change_refs: "change.role-template.001",
      selected_cell_ref: selectedCellRef,
    },
    roleId,
    roleTemplateMatrixRepository,
    tenantId: governanceTenantId,
  });

  expect(current).not.toBeNull();
  const matrix = validateRoleTemplateMatrixPublication(current!.role_matrix);
  expect(matrix.policy_snapshot_hash).toBeTruthy();
  expect(matrix.version_hash).toBeTruthy();
  expect(matrix.role_matrix_workspace.selected_role_template_ref).toBe(roleId);
  expect(matrix.role_matrix_workspace.selected_cell_ref).toBe(matrix.focus_anchor_ref);
  expect(matrix.selected_action_detail?.cell_ref).toBe(matrix.focus_anchor_ref);
  expect(matrix.role_matrix_workspace.inspector_state).toBe("ROLE_EDITING");
  expect(matrix.role_matrix_workspace.role_editor_pending_change_refs).toEqual([
    "change.role-template.001",
  ]);
  const approvalCell = matrix.matrix_cells.find((cell) => cell.decision === "REQUIRE_APPROVAL");
  expect(approvalCell?.required_approvals.length).toBeGreaterThan(0);
});
