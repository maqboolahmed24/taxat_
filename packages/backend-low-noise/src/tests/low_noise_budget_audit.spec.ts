import { expect, test } from "@playwright/test";

import {
  buildLowNoiseBudgetAudit,
  buildLowNoiseExperienceFrame,
  computeScanLoad,
  computeVisibleShellCharCount,
  countSecondaryMutationActions,
  detectDuplicatePostureCodes,
  runLowNoiseBudgetAuditPack,
  type LowNoiseExperienceFrameRecord,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

function baseFrameInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0172.test",
    decisionBundleHash: "decision.hash.pc0172.test",
    frameEpoch: 1,
    lastPublishedSequence: 172,
    manifestId: "manifest.pc0172.test",
    maskingContextHash: "mask.pc0172.test",
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 1,
    renderedAt: "2026-05-04T12:30:00.000Z",
    resumeToken: "resume.pc0172.test",
    sessionBindingHash: "session.hash.pc0172.test",
    sessionRef: "session.pc0172.test",
    shellStabilityToken: "shell.pc0172.test",
    tenantId: "tenant.pc0172.test",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

function frameSurfaces(frame: LowNoiseExperienceFrameRecord) {
  return {
    action_strip: frame.action_strip,
    context_bar: frame.context_bar,
    decision_summary: frame.decision_summary,
    detail_drawer: frame.detail_drawer,
  };
}

test("computes scan load from the frozen low-noise formula", () => {
  expect(
    computeScanLoad({
      concurrentPrimaryCount: 1,
      persistentSurfaceCount: 4,
      prominentMotionCount: 1,
      visibleActionCount: 2,
      visibleDetailEntryCount: 5,
      visibleReasonCount: 3,
      visibleShellCharCount: 161,
      visibleWarningCount: 1,
    }),
  ).toBe(14.75);
});

test("builds a schema-valid first-view audit from rendered frame copy only", async () => {
  const frame = buildLowNoiseExperienceFrame(baseFrameInput());
  const withLongHiddenRefs = structuredClone(frame);
  withLongHiddenRefs.context_bar.full_text_ref = "x".repeat(2000);
  withLongHiddenRefs.decision_summary.full_text_ref = "y".repeat(2000);
  withLongHiddenRefs.action_strip.full_text_ref = "z".repeat(2000);
  withLongHiddenRefs.detail_drawer.full_text_ref = "q".repeat(2000);

  const audit = buildLowNoiseBudgetAudit({
    ...frameSurfaces(withLongHiddenRefs),
    surface_order: withLongHiddenRefs.surface_order,
  });

  expect(audit.rendered_surface_order).toEqual([
    "CONTEXT_BAR",
    "DECISION_SUMMARY",
    "ACTION_STRIP",
    "DETAIL_DRAWER",
  ]);
  expect(audit.persistent_surface_count).toBe(4);
  expect(audit.concurrent_primary_count).toBe(1);
  expect(audit.visible_shell_char_count).toBe(computeVisibleShellCharCount(frame));
  expect(audit.duplicate_posture_codes).toEqual([]);
  expect(audit.secondary_mutation_action_count).toBe(0);
  expect(audit.refresh_budget_state).toBe("NOT_APPLICABLE");

  await validateContractSchema("low_noise_budget_audit", audit);
});

test("detects duplicate posture copy and secondary mutation actions before publication", () => {
  const frame = buildLowNoiseExperienceFrame(baseFrameInput());
  const duplicate = structuredClone(frame);
  duplicate.context_bar.limitation_statement = "Limited by current mask.";
  duplicate.decision_summary.limitation_statement = "Limited by current mask.";
  duplicate.decision_summary.blocking_reason = "Recovery must complete.";
  duplicate.action_strip.blocking_reason = "Recovery must complete.";
  duplicate.detail_drawer.entry_points[0] = {
    ...duplicate.detail_drawer.entry_points[0]!,
    content_state: "NOT_REQUESTED",
    entry_reason: "Recovery must complete.",
    state_reason_code_or_null: "REQUEST_NOT_TRIGGERED",
  };
  duplicate.action_strip.secondary_actions = [
    ...duplicate.action_strip.secondary_actions,
    {
      action_code: "FILE_SECONDARY",
      action_kind: "FILING_MUTATION",
      label: "File",
      mutation_precondition_binding_or_null: null,
      requires_live_freshness: true,
      target_detail_surface_code: null,
      target_object_ref: duplicate.manifest_id,
    },
  ];

  expect(detectDuplicatePostureCodes(duplicate)).toEqual([
    "LIMITATION_STATEMENT_DUPLICATED",
    "BLOCKING_REASON_DUPLICATED",
    "DETAIL_ENTRY_REASON_DUPLICATED",
  ]);
  expect(countSecondaryMutationActions(duplicate.action_strip)).toBe(1);
});

test("serializes refresh-only accounting for non-material refresh and reconnect scopes", async () => {
  const frame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      frameEpoch: 2,
      lastPublishedSequence: 173,
      renderedAt: "2026-05-04T12:30:01.000Z",
      shellStabilityToken: "shell.pc0172.refresh",
    }),
  );
  const refreshAudit = buildLowNoiseBudgetAudit({
    ...frameSurfaces(frame),
    auditScope: "NON_MATERIAL_REFRESH",
    coalescedChangeCountOrNull: 2,
    continuityCostOrNull: 5,
    rankSwapCountOrNull: 1,
    surface_order: frame.surface_order,
    visibleChangeCountInWindowOrNull: 2,
  });
  const reconnectAudit = buildLowNoiseBudgetAudit({
    ...frameSurfaces(frame),
    auditScope: "RECOVERY_RECONNECT",
    coalescedChangeCountOrNull: 0,
    continuityCostOrNull: 3,
    rankSwapCountOrNull: 0,
    surface_order: frame.surface_order,
    visibleChangeCountInWindowOrNull: 1,
  });

  expect(refreshAudit.refresh_budget_state).toBe("COALESCED_TO_PRESERVE_BUDGET");
  expect(refreshAudit.rank_swap_count_or_null).toBe(1);
  expect(refreshAudit.visible_change_count_in_window_or_null).toBe(2);
  expect(reconnectAudit.refresh_budget_state).toBe("WITHIN_NON_MATERIAL_REFRESH_BUDGET");
  expect(reconnectAudit.continuity_cost_or_null).toBe(3);

  await validateContractSchema("low_noise_budget_audit", refreshAudit);
  await validateContractSchema("low_noise_budget_audit", reconnectAudit);
});

test("generates a deterministic schema-valid budget audit pack with required coverage", async () => {
  const first = runLowNoiseBudgetAuditPack({ deterministicSeed: 172 });
  const second = runLowNoiseBudgetAuditPack({ deterministicSeed: 172 });

  expect(second).toEqual(first);
  expect(first.cases.map((auditCase) => auditCase.case_id)).toEqual([
    "01_first_view",
    "02_reason_pressure",
    "03_no_safe_action",
    "04_non_material_refresh_coalesced",
    "05_reconnect_catch_up",
    "06_detail_fallback_active_preserved",
    "07_detail_fallback_first_valid",
    "08_detail_fallback_suggested",
    "09_detail_fallback_collapsed_root",
  ]);
  expect(new Set(first.cases.map((auditCase) => auditCase.scenario_class))).toEqual(
    new Set([
      "FIRST_VIEW",
      "REASON_PRESSURE",
      "NO_SAFE_ACTION",
      "NON_MATERIAL_REFRESH",
      "RECONNECT_CATCH_UP",
      "DETAIL_FALLBACK",
    ]),
  );
  expect(
    first.cases.some(
      (auditCase) =>
        auditCase.scenario_class === "NON_MATERIAL_REFRESH" &&
        auditCase.expected_coalescing_outcome === "COLLAPSE_TO_COUNTS" &&
        auditCase.audit.refresh_budget_state === "COALESCED_TO_PRESERVE_BUDGET",
    ),
  ).toBe(true);
  expect(new Set(first.cases.map((auditCase) => auditCase.expected_fallback_state))).toEqual(
    new Set([
      "NOT_APPLICABLE",
      "ACTIVE_MODULE_PRESERVED",
      "FIRST_VALID_ENTRY_SELECTED",
      "SUGGESTED_MODULE_SELECTED",
      "COLLAPSED_ROOT_SELECTED",
    ]),
  );
  expect(first.cases.every((auditCase) => auditCase.audit.duplicate_posture_codes.length === 0)).toBe(
    true,
  );
  expect(first.cases.every((auditCase) => auditCase.audit.secondary_mutation_action_count === 0)).toBe(
    true,
  );

  await validateContractSchema("low_noise_budget_audit_pack", first);
});
