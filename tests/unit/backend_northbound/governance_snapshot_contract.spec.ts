import { expect, test } from "@playwright/test";

import {
  getTenantGovernanceSnapshot,
  TenantGovernanceSnapshotRepository,
  validateTenantGovernanceSnapshotPublication,
} from "../../../packages/backend-northbound/src/index.ts";
import { governanceTenantId, tenantGovernanceSnapshotFixture } from "./governance_read_fixtures.ts";

test("TenantGovernanceSnapshot keeps dominant attention family, queue, and worklist aligned", async () => {
  const snapshot = await tenantGovernanceSnapshotFixture({
    policySnapshotHash: "policy-snapshot.hash.unit",
  });

  expect(validateTenantGovernanceSnapshotPublication(snapshot)).toMatchObject({
    attention_summary: {
      attention_family: "PENDING_APPROVALS",
      primary_worklist_ref: "worklist.governance.pending-approvals",
    },
    primary_queue_code: "PENDING_APPROVALS",
    primary_worklist_ref: "worklist.governance.pending-approvals",
  });
  expect(snapshot.cross_device_continuity_contract).toMatchObject({
    compatibility_basis_class: "ROUTE_GUARD_ONLY",
    continuity_scope: "GOVERNANCE_ROUTE",
    stability_guard_hash_or_null: "policy-snapshot.hash.unit",
  });
  expect(snapshot.semantic_accessibility_contract.semantic_focus_order).toEqual([
    "SECTION_NAV",
    "PRIMARY_WORKLIST",
    "WORKSPACE_HEADER",
    "ATTENTION_SUMMARY",
    "PROMOTED_AUXILIARY_SURFACE",
  ]);

  expect(() =>
    validateTenantGovernanceSnapshotPublication({
      ...snapshot,
      primary_worklist_ref: "worklist.governance.audit-hotspots",
    }),
  ).toThrow(/attention_summary.primary_worklist_ref must match primary_worklist_ref/);
});

test("overview query normalization preserves active filters, selected object, and focus anchor", async () => {
  const repository = new TenantGovernanceSnapshotRepository();
  await repository.persistSnapshot({
    snapshot: await tenantGovernanceSnapshotFixture({
      policySnapshotHash: "policy-snapshot.hash.filter",
    }),
  });

  const current = await getTenantGovernanceSnapshot({
    query: {
      client_refs: "client.alpha,client.beta",
      focus_anchor_ref: "audit.hotspot.authority-link-drift",
      principal_classes: "HUMAN,EXTERNAL",
      risk_families: "AUDIT_HOTSPOTS",
      selected_canvas_object_ref: "audit.hotspot.authority-link-drift",
    },
    tenantGovernanceSnapshotRepository: repository,
    tenantId: governanceTenantId,
  });

  expect(current?.snapshot.active_filters).toMatchObject({
    client_refs: ["client.alpha", "client.beta"],
    principal_classes: ["HUMAN", "EXTERNAL"],
    risk_families: ["AUDIT_HOTSPOTS"],
  });
  expect(current?.snapshot.selected_canvas_object_ref).toBe("audit.hotspot.authority-link-drift");
  expect(current?.snapshot.focus_anchor_ref).toBe("audit.hotspot.authority-link-drift");
  expect(current?.snapshot.interaction_layer.selected_filter_chip_refs).toContain(
    "risk_family:AUDIT_HOTSPOTS",
  );
});
