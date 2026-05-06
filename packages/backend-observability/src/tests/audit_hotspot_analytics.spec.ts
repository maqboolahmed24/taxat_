import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildTenantGovernanceSnapshot,
  type TenantGovernanceFamilyProjectionSource,
} from "../../../backend-governance/src/index.ts";
import {
  auditHotspotSourcesFromFrames,
  buildAuditHotspotAnalytics,
  getAuditTrail,
  getNightlyBatchTimeline,
  listAuditHotspots,
} from "../index.ts";
import {
  nightlyBatchRunRef,
  observabilityEvents,
  targetObjectRef,
  tenantId,
} from "./query_fixtures.ts";

const worklistRef = "worklist.governance.audit-hotspots.pc0218";
const generatedAt = "2026-05-05T10:00:00.000Z";

function eventSource() {
  return {
    listMergedView: () => observabilityEvents(),
  };
}

function zeroFamily(
  family: TenantGovernanceFamilyProjectionSource["family"],
): TenantGovernanceFamilyProjectionSource {
  return {
    affectedScopeLabel: null,
    family,
    nextActionLabel: null,
    objectRefs: [],
    oldestOpenAgeHours: 0,
    openCount: 0,
    requiresOperatorAction: false,
    worklistRef: `worklist.governance.${family.toLowerCase()}.pc0218`,
  };
}

test("builds action-backed audit hotspot rows from persisted observability frames", async () => {
  const auditTrail = await getAuditTrail({
    activeFilters: {
      event_families: ["ManifestLifecycle"],
    },
    auditEventSource: eventSource(),
    includeStaffOnlySupportingRefs: true,
    rootRef: targetObjectRef,
    tenantId,
  });
  const nightlyTimeline = await getNightlyBatchTimeline({
    auditEventSource: eventSource(),
    batchRunId: nightlyBatchRunRef,
    includeStaffOnlySupportingRefs: true,
    tenantId,
  });
  const sources = [
    ...auditHotspotSourcesFromFrames({
      frames: [auditTrail, nightlyTimeline],
      generated_at: generatedAt,
      tenant_id: tenantId,
      worklist_ref: worklistRef,
    }),
    {
      affected_object_refs: ["object://pc0218/non-material"],
      audit_event_refs: [],
      critical_open_count: 0,
      first_observed_at: "2026-05-05T09:30:00.000Z",
      hotspot_ref: "audit-hotspot://pc0218/non-material",
      last_observed_at: "2026-05-05T09:31:00.000Z",
      non_material_churn_suppressed: true,
      open_count: 0,
      reason_codes: ["NON_MATERIAL_CHURN_SUPPRESSED"],
      requires_operator_action: false,
      source_artifact_type: "TENANT_GOVERNANCE_SNAPSHOT" as const,
      source_ref: "tenant-governance-snapshot://pc0218/non-material",
      tenant_id: tenantId,
      worklist_ref: worklistRef,
    },
  ];

  const analytics = buildAuditHotspotAnalytics({
    generated_at: generatedAt,
    sources,
    tenant_id: tenantId,
    worklist_ref: worklistRef,
  });

  expect(analytics.ranking_basis).toBe("GOVERNANCE_AUDIT_HOTSPOT_SCORE_V1");
  expect(analytics.hotspots).toHaveLength(3);
  expect(analytics.hotspots.every((row) => row.worklist_ref === worklistRef)).toBe(true);
  expect(
    analytics.hotspots.every((row) => row.affected_object_refs.length > 0),
  ).toBe(true);
  expect(analytics.hotspots.find((row) => row.open_count === 0)).toMatchObject({
    affected_object_refs: ["object://pc0218/non-material"],
    non_material_churn_suppressed: true,
    worklist_ref: worklistRef,
  });
  expect(analytics.governance_family_source).toMatchObject({
    family: "AUDIT_HOTSPOT",
    objectRefs: analytics.hotspot_refs_in_rank_order,
    openCount: analytics.hotspots.length,
    worklistRef,
  });

  const page = listAuditHotspots({
    affected_object_ref: nightlyBatchRunRef,
    generated_at: generatedAt,
    sources,
    tenant_id: tenantId,
    worklist_ref: worklistRef,
  });
  expect(page.hotspots).toHaveLength(1);
  expect(page.hotspots[0]?.source_artifact_type).toBe("AUDIT_INVESTIGATION_FRAME");
});

test("feeds governance overview with concrete audit hotspot worklist and object refs", async () => {
  const nightlyTimeline = await getNightlyBatchTimeline({
    auditEventSource: eventSource(),
    batchRunId: nightlyBatchRunRef,
    includeStaffOnlySupportingRefs: true,
    tenantId,
  });
  const sources = auditHotspotSourcesFromFrames({
    frames: [nightlyTimeline],
    generated_at: generatedAt,
    tenant_id: tenantId,
    worklist_ref: worklistRef,
  });
  const analytics = buildAuditHotspotAnalytics({
    generated_at: generatedAt,
    sources,
    tenant_id: tenantId,
    worklist_ref: worklistRef,
  });
  const snapshot = await buildTenantGovernanceSnapshot({
    environmentRef: "environment.hmrc.production",
    familySources: [
      zeroFamily("PENDING_APPROVALS"),
      zeroFamily("CONFIGURATION_DRIFT"),
      zeroFamily("AUTHORITY_LINK_RISK"),
      zeroFamily("RETENTION_EXCEPTION"),
      {
        ...analytics.governance_family_source,
        affectedScopeLabel: "1 audit hotspot",
        nextActionLabel: "Open audit hotspot tape",
      },
    ],
    pendingChangeWorklistRef: "worklist.governance.pending-changes.pc0218",
    policySnapshotHash: "policy-snapshot.hash.pc0218.hotspots",
    sessionBindingHash: "session-binding.pc0218.hotspots",
    tenantId,
    updatedAt: generatedAt,
  });

  expect(snapshot.primary_queue_code).toBe("AUDIT_HOTSPOTS");
  expect(snapshot.primary_worklist_ref).toBe(worklistRef);
  expect(snapshot.audit_hotspot_refs).toEqual(analytics.hotspot_refs_in_rank_order);
  expect(snapshot.risk_ledger_entries[0]).toMatchObject({
    open_count: analytics.hotspots.length,
    queue_code: "AUDIT_HOTSPOTS",
    worklist_ref: worklistRef,
  });
  await validateContractSchema("tenant_governance_snapshot", snapshot);
});
