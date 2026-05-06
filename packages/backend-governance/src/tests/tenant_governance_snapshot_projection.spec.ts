import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildTenantGovernanceSnapshot,
  TenantGovernanceSnapshotProjectionError,
  type TenantGovernanceFamilyProjectionSource,
} from "../index.ts";

export function governanceOverviewFamilyFixture(
  overrides: Partial<Record<TenantGovernanceFamilyProjectionSource["family"], Partial<TenantGovernanceFamilyProjectionSource>>> = {},
): TenantGovernanceFamilyProjectionSource[] {
  return [
    {
      affectedScopeLabel: "2 tenant policy changes",
      criticalOpenCount: 1,
      family: "PENDING_APPROVALS",
      nextActionLabel: "Review approvals",
      objectRefs: ["approval.change.001", "approval.change.002"],
      oldestOpenAgeHours: 18,
      openCount: 2,
      requiresOperatorAction: true,
      worklistRef: "worklist.governance.pending-approvals",
      ...overrides.PENDING_APPROVALS,
    },
    {
      affectedScopeLabel: "1 connector policy",
      family: "CONFIGURATION_DRIFT",
      nextActionLabel: "Compare drift",
      objectRefs: ["config.drift.001"],
      oldestOpenAgeHours: 10,
      openCount: 1,
      worklistRef: "worklist.governance.configuration-drift",
      ...overrides.CONFIGURATION_DRIFT,
    },
    {
      affectedScopeLabel: "1 HMRC authority link",
      family: "AUTHORITY_LINK_RISK",
      nextActionLabel: "Inspect link",
      objectRefs: ["authority-link.hmrc.client-2001"],
      oldestOpenAgeHours: 9,
      openCount: 1,
      worklistRef: "worklist.governance.authority-link-risks",
      ...overrides.AUTHORITY_LINK_RISK,
    },
    {
      affectedScopeLabel: "1 retention override",
      family: "RETENTION_EXCEPTION",
      nextActionLabel: "Review exception",
      objectRefs: ["retention.exception.client-2001"],
      oldestOpenAgeHours: 4,
      openCount: 1,
      worklistRef: "worklist.governance.retention-exceptions",
      ...overrides.RETENTION_EXCEPTION,
    },
    {
      affectedScopeLabel: "1 audit hotspot",
      family: "AUDIT_HOTSPOT",
      nextActionLabel: "Open tape",
      objectRefs: ["audit.hotspot.authority-link-drift"],
      oldestOpenAgeHours: 12,
      openCount: 1,
      worklistRef: "worklist.governance.audit-hotspots",
      ...overrides.AUDIT_HOTSPOT,
    },
  ];
}

test("builds a schema-valid TenantGovernanceSnapshot with aligned attention, ledger, filters, and support sidecar", async () => {
  const snapshot = await buildTenantGovernanceSnapshot({
    activeFilters: {
      change_states: ["AWAITING_APPROVAL"],
      client_refs: ["client.taxpayer-2001"],
      principal_classes: ["SERVICE", "HUMAN"],
      risk_families: ["AUTHORITY_LINK_RISKS"],
    },
    environmentRef: "environment.hmrc.production",
    familySources: governanceOverviewFamilyFixture(),
    pendingChangeRefs: ["change.pending.hmrc-link"],
    pendingChangeWorklistRef: "worklist.governance.pending-changes",
    policySnapshotHash: "policy-snapshot.hash.pc0189",
    recentChangeRefs: ["audit.event.governance-policy-updated", "change.pending.hmrc-link"],
    sessionBindingHash: "session-binding.governance.pc0189",
    tenantId: "tenant.taxat-sandbox",
    updatedAt: "2026-05-04T09:00:00.000Z",
  });

  expect(snapshot.primary_queue_code).toBe("PENDING_APPROVALS");
  expect(snapshot.primary_worklist_ref).toBe(snapshot.pending_approval_worklist_ref);
  expect(snapshot.attention_summary).toMatchObject({
    affected_scope_label: snapshot.risk_ledger_entries[0]!.affected_scope_label,
    attention_family: "PENDING_APPROVALS",
    next_legal_action_label: snapshot.risk_ledger_entries[0]!.next_action_label,
    primary_worklist_ref: snapshot.primary_worklist_ref,
  });
  expect(snapshot.risk_ledger_entries.map((entry) => entry.queue_code)).toEqual([
    "PENDING_APPROVALS",
    "CONFIGURATION_DRIFT",
    "AUTHORITY_LINK_RISKS",
    "RETENTION_EXCEPTIONS",
    "AUDIT_HOTSPOTS",
  ]);
  expect(snapshot.risk_ledger_entries.map((entry) => [entry.queue_code, entry.open_count])).toEqual([
    ["PENDING_APPROVALS", snapshot.pending_approval_count],
    ["CONFIGURATION_DRIFT", snapshot.risky_configuration_drift_count],
    ["AUTHORITY_LINK_RISKS", snapshot.expiring_authority_link_count],
    ["RETENTION_EXCEPTIONS", snapshot.retention_exception_count],
    ["AUDIT_HOTSPOTS", snapshot.audit_hotspot_refs.length],
  ]);
  expect(snapshot.active_filters).toMatchObject({
    principal_classes: ["HUMAN", "SERVICE"],
    risk_families: ["AUTHORITY_LINK_RISKS", "PENDING_APPROVALS"],
  });
  expect(snapshot.interaction_layer.selected_filter_chip_refs).toEqual([
    "environment:environment.hmrc.production",
    "client:client.taxpayer-2001",
    "principal_class:HUMAN",
    "principal_class:SERVICE",
    "risk_family:AUTHORITY_LINK_RISKS",
    "risk_family:PENDING_APPROVALS",
    "change_state:AWAITING_APPROVAL",
  ]);
  expect(snapshot.support_region_state).toMatchObject({
    mode: "AUDIT",
    selected_object_ref: snapshot.selected_canvas_object_ref,
  });
  expect(snapshot.dominance_contract).toMatchObject({
    dominant_action_ref_or_null: snapshot.primary_worklist_ref,
    explicit_multifocus_mode: "AUDIT",
    promoted_support_surface_code_or_null: "AUDIT_SIDECAR",
    safe_action_state: "ACTION_AVAILABLE",
    support_surface_role: "INVESTIGATION",
  });
  expect(snapshot.cross_device_continuity_contract).toMatchObject({
    canonical_object_ref: "/governance",
    continuity_scope: "GOVERNANCE_ROUTE",
    route_identity_ref: "/governance",
    stability_guard_hash_or_null: "policy-snapshot.hash.pc0189",
  });
  expect(snapshot.semantic_accessibility_contract.semantic_focus_order).toEqual([
    "SECTION_NAV",
    "PRIMARY_WORKLIST",
    "WORKSPACE_HEADER",
    "ATTENTION_SUMMARY",
    "PROMOTED_AUXILIARY_SURFACE",
  ]);

  await validateContractSchema("tenant_governance_snapshot", snapshot);
});

test("emits calm no-safe-action posture without inventing a dominant action", async () => {
  const zeroFamilies = governanceOverviewFamilyFixture({
    AUDIT_HOTSPOT: {
      affectedScopeLabel: null,
      nextActionLabel: null,
      objectRefs: [],
      oldestOpenAgeHours: 0,
      openCount: 0,
    },
    AUTHORITY_LINK_RISK: {
      affectedScopeLabel: null,
      nextActionLabel: null,
      objectRefs: [],
      oldestOpenAgeHours: 0,
      openCount: 0,
    },
    CONFIGURATION_DRIFT: {
      affectedScopeLabel: null,
      nextActionLabel: null,
      objectRefs: [],
      oldestOpenAgeHours: 0,
      openCount: 0,
    },
    PENDING_APPROVALS: {
      affectedScopeLabel: null,
      criticalOpenCount: 0,
      nextActionLabel: null,
      objectRefs: [],
      oldestOpenAgeHours: 0,
      openCount: 0,
      requiresOperatorAction: false,
    },
    RETENTION_EXCEPTION: {
      affectedScopeLabel: null,
      nextActionLabel: null,
      objectRefs: [],
      oldestOpenAgeHours: 0,
      openCount: 0,
    },
  });

  const snapshot = await buildTenantGovernanceSnapshot({
    environmentRef: "environment.hmrc.production",
    familySources: zeroFamilies,
    pendingChangeWorklistRef: "worklist.governance.pending-changes",
    policySnapshotHash: "policy-snapshot.hash.calm",
    sessionBindingHash: "session-binding.governance.calm",
    tenantId: "tenant.taxat-sandbox",
    updatedAt: "2026-05-04T09:05:00.000Z",
  });

  expect(snapshot.attention_summary).toMatchObject({
    attention_family: "CALM",
    primary_worklist_ref: null,
  });
  expect(snapshot.primary_queue_code).toBe("PENDING_APPROVALS");
  expect(snapshot.dominance_contract).toMatchObject({
    dominant_action_ref_or_null: null,
    promoted_support_surface_code_or_null: null,
    safe_action_state: "NO_SAFE_ACTION",
    support_surface_role: "NONE",
  });
  expect(snapshot.support_region_state).toEqual({
    mode: "NONE",
    reason_code: null,
    selected_object_ref: null,
  });
  await validateContractSchema("tenant_governance_snapshot", snapshot);
});

test("rejects support sidecar selected-object drift and pending change lineage drift", async () => {
  await expect(
    buildTenantGovernanceSnapshot({
      environmentRef: "environment.hmrc.production",
      familySources: governanceOverviewFamilyFixture(),
      pendingChangeWorklistRef: "worklist.governance.pending-changes",
      policySnapshotHash: "policy-snapshot.hash.sidecar-drift",
      selectedCanvasObjectRef: "approval.change.001",
      sessionBindingHash: "session-binding.governance.sidecar-drift",
      supportRegion: {
        mode: "AUDIT",
        selectedObjectRef: "approval.change.other",
      },
      tenantId: "tenant.taxat-sandbox",
      updatedAt: "2026-05-04T09:10:00.000Z",
    }),
  ).rejects.toThrow(TenantGovernanceSnapshotProjectionError);

  await expect(
    buildTenantGovernanceSnapshot({
      environmentRef: "environment.hmrc.production",
      familySources: governanceOverviewFamilyFixture(),
      pendingChangeRefs: ["change.pending.not-recent"],
      pendingChangeWorklistRef: "worklist.governance.pending-changes",
      policySnapshotHash: "policy-snapshot.hash.pending-drift",
      recentChangeRefs: ["audit.event.governance-policy-updated"],
      sessionBindingHash: "session-binding.governance.pending-drift",
      tenantId: "tenant.taxat-sandbox",
      updatedAt: "2026-05-04T09:12:00.000Z",
    }),
  ).rejects.toThrow(TenantGovernanceSnapshotProjectionError);
});
