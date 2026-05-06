import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildTenantGovernanceSnapshot,
  deriveGovernanceFamilyScores,
  type TenantGovernanceFamilyProjectionSource,
} from "../index.ts";
import { governanceOverviewFamilyFixture } from "./tenant_governance_snapshot_projection.spec.ts";

function hysteresisFamilies(): TenantGovernanceFamilyProjectionSource[] {
  return governanceOverviewFamilyFixture({
    AUDIT_HOTSPOT: {
      affectedScopeLabel: null,
      nextActionLabel: null,
      objectRefs: [],
      oldestOpenAgeHours: 0,
      openCount: 0,
    },
    AUTHORITY_LINK_RISK: {
      affectedScopeLabel: "2 authority links",
      criticalOpenCount: 2,
      nextActionLabel: "Inspect links",
      objectRefs: ["authority-link.hmrc.client-2001", "authority-link.hmrc.client-2002"],
      oldestOpenAgeHours: 0,
      openCount: 2,
      requiresOperatorAction: false,
    },
    CONFIGURATION_DRIFT: {
      affectedScopeLabel: "1 connector policy",
      nextActionLabel: "Compare drift",
      objectRefs: ["config.drift.001"],
      oldestOpenAgeHours: 0,
      openCount: 1,
      requiresOperatorAction: false,
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
}

test("computes the frozen family-score formula and retains prior live family inside the hysteresis band", () => {
  const scores = deriveGovernanceFamilyScores({
    familySources: hysteresisFamilies(),
    previousPrimaryFamily: "CONFIGURATION_DRIFT",
  });

  const config = scores.family_scores.find((score) => score.family === "CONFIGURATION_DRIFT")!;
  const authority = scores.family_scores.find((score) => score.family === "AUTHORITY_LINK_RISK")!;
  expect(config).toMatchObject({
    family_base: 420,
    open_count: 1,
    previous_primary_bonus: 8,
    score: 434,
  });
  expect(authority).toMatchObject({
    critical_open_count: 2,
    family_base: 380,
    open_count: 2,
    score: 442,
  });
  expect(scores).toMatchObject({
    calm: false,
    dominance_margin: 8,
    hysteresis_retained: true,
    leading_family: "AUTHORITY_LINK_RISK",
    previous_primary_family_still_live: true,
    primary_family: "CONFIGURATION_DRIFT",
  });
});

test("builds the snapshot with hysteresis-retained attention and promoted ledger ordering", async () => {
  const previousSnapshot = await buildTenantGovernanceSnapshot({
    environmentRef: "environment.hmrc.production",
    familySources: governanceOverviewFamilyFixture({
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
        affectedScopeLabel: "1 connector policy",
        nextActionLabel: "Compare drift",
        objectRefs: ["config.drift.001"],
        openCount: 1,
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
    }),
    pendingChangeWorklistRef: "worklist.governance.pending-changes",
    policySnapshotHash: "policy-snapshot.hash.previous-config",
    sessionBindingHash: "session-binding.governance.previous-config",
    tenantId: "tenant.taxat-sandbox",
    updatedAt: "2026-05-04T08:55:00.000Z",
  });

  const snapshot = await buildTenantGovernanceSnapshot({
    activeFilters: {
      risk_families: ["AUTHORITY_LINK_RISKS"],
    },
    environmentRef: "environment.hmrc.production",
    familySources: hysteresisFamilies(),
    pendingChangeWorklistRef: "worklist.governance.pending-changes",
    policySnapshotHash: "policy-snapshot.hash.hysteresis",
    previousSnapshot,
    sessionBindingHash: "session-binding.governance.hysteresis",
    tenantId: "tenant.taxat-sandbox",
    updatedAt: "2026-05-04T09:20:00.000Z",
  });

  expect(snapshot.primary_queue_code).toBe("CONFIGURATION_DRIFT");
  expect(snapshot.attention_summary).toMatchObject({
    attention_family: "CONFIGURATION_DRIFT",
    primary_worklist_ref: "worklist.governance.configuration-drift",
  });
  expect(snapshot.risk_ledger_entries.map((entry) => entry.queue_code)).toEqual([
    "CONFIGURATION_DRIFT",
    "PENDING_APPROVALS",
    "AUTHORITY_LINK_RISKS",
    "RETENTION_EXCEPTIONS",
    "AUDIT_HOTSPOTS",
  ]);
  expect(snapshot.active_filters.risk_families).toEqual([
    "AUTHORITY_LINK_RISKS",
    "CONFIGURATION_DRIFT",
  ]);
  expect(snapshot.selected_canvas_object_ref).toBe("config.drift.001");
  await validateContractSchema("tenant_governance_snapshot", snapshot);
});
