import { expect, test } from "@playwright/test";

import {
  GovernancePolicySnapshotProjector,
  GovernancePolicySnapshotRepository,
  RoleTemplateMatrixProjector,
  RoleTemplateMatrixRepository,
  loadGovernancePolicyProjectionInputs,
} from "../../../packages/backend-access/src/index.ts";

test("publishes and reloads policy snapshots and role matrices with stable stale-view comparison semantics", async () => {
  const snapshotProjector = new GovernancePolicySnapshotProjector();
  const roleProjector = new RoleTemplateMatrixProjector();
  const snapshotRepository = new GovernancePolicySnapshotRepository();
  const roleRepository = new RoleTemplateMatrixRepository();
  const projectionInputs = await loadGovernancePolicyProjectionInputs({
    reload: true,
  });
  const source_config_refs = Object.keys(projectionInputs.material_config_hashes).map(
    (configRef) => `config://access/${configRef}`,
  );

  const snapshot = await snapshotProjector.project({
    tenant_id: "tenant.taxat-sandbox",
  });
  await snapshotRepository.storeSnapshot({
    snapshot,
    persisted_at: "2026-04-23T12:45:00Z",
    source_config_refs,
    material_config_hashes: projectionInputs.material_config_hashes,
  });

  const baselineMatrix = await roleProjector.project({
    role_id: "TENANT_ADMIN",
    tenant_id: "tenant.taxat-sandbox",
    selected_cell_ref: "cell.RetentionAction.EXECUTE_ERASURE",
  });
  const simulationBoundMatrix = await roleProjector.project({
    role_id: "TENANT_ADMIN",
    tenant_id: "tenant.taxat-sandbox",
    latest_simulation_ref: "governance-simulation.preview.001",
    selected_cell_ref: "cell.RetentionAction.EXECUTE_ERASURE",
  });
  await roleRepository.storeRoleMatrix({
    role_matrix: simulationBoundMatrix,
    persisted_at: "2026-04-23T12:46:00Z",
    source_config_refs,
    material_config_hashes: projectionInputs.material_config_hashes,
  });

  expect(simulationBoundMatrix.version_hash).toBe(baselineMatrix.version_hash);
  expect(
    simulationBoundMatrix.role_matrix_workspace.latest_simulation_ref,
  ).toBe("governance-simulation.preview.001");
  expect(
    simulationBoundMatrix.role_matrix_workspace.promoted_support_surface,
  ).toBe("POLICY_SIMULATOR");

  const staleMatrix = await roleProjector.project({
    role_id: "TENANT_ADMIN",
    reviewed_policy_snapshot_hash: "policy.snapshot.outdated.001",
    selected_cell_ref: "cell.RetentionAction.EXECUTE_ERASURE",
  });
  expect(staleMatrix.settlement_state).toBe("STALE_REVIEW_REQUIRED");
  expect(staleMatrix.recovery_posture).toBe("INLINE_REBASE");

  const filteredOutMatrix = await roleProjector.project({
    role_id: "TENANT_ADMIN",
    selected_cell_ref: "cell.RetentionAction.EXECUTE_ERASURE",
    active_filters: {
      resource_classes: ["Client"],
      action_families: ["VIEW_FULL"],
      decision_outcomes: ["ALLOW"],
    },
  });
  expect(filteredOutMatrix.settlement_state).toBe("RECOVERY_REQUIRED");
  expect(filteredOutMatrix.recovery_posture).toBe("ACCESS_REBIND_REQUIRED");
  expect(filteredOutMatrix.role_matrix_workspace.selected_cell_ref).toBeNull();
  expect(filteredOutMatrix.focus_anchor_ref).toBeNull();
  expect(filteredOutMatrix.selected_action_detail).toBeNull();

  const restoredSnapshot =
    await snapshotRepository.requireSnapshotByPolicySnapshotHash(
      "tenant.taxat-sandbox",
      snapshot.policy_snapshot_hash,
    );
  const restoredMatrix = await roleRepository.getLatestRoleMatrixByTenantAndRole(
    "tenant.taxat-sandbox",
    "TENANT_ADMIN",
  );

  expect(restoredSnapshot.snapshot.snapshot_id).toBe(snapshot.snapshot_id);
  expect(restoredMatrix?.role_matrix.version_hash).toBe(
    simulationBoundMatrix.version_hash,
  );
  expect(restoredMatrix?.material_config_hashes).toEqual(
    projectionInputs.material_config_hashes,
  );
});
