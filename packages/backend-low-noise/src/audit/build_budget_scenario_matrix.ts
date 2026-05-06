import type {
  LowNoiseBudgetAuditPackAuditCase,
  LowNoiseBudgetAuditPackCoalescingOutcome,
  LowNoiseBudgetAuditPackScenarioClass,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseDetailFallbackState,
  LowNoiseExperienceFrameRecord,
  LowNoiseFrameRecoveryAuditScope,
} from "../models/low_noise_frame.ts";
import type { LowNoiseDetailEntryCandidate } from "../models/low_noise_frame.ts";
import {
  buildLowNoiseExperienceFrame,
  type BuildLowNoiseExperienceFrameInput,
} from "../projectors/build_low_noise_experience_frame.ts";
import { buildLowNoiseBudgetAudit } from "./build_low_noise_budget_audit.ts";

export const defaultLowNoiseBudgetAuditSeed = 172;

export type LowNoiseBudgetScenarioFixture = {
  auditScope?: LowNoiseFrameRecoveryAuditScope;
  caseId: string;
  coalescedChangeCountOrNull?: number | null;
  continuityCostOrNull?: number | null;
  detailFallbackState?: LowNoiseDetailFallbackState;
  dominantQuestionChanged?: boolean;
  expectedCoalescingOutcome?: LowNoiseBudgetAuditPackCoalescingOutcome;
  expectedFallbackState?: LowNoiseDetailFallbackState;
  frame: LowNoiseExperienceFrameRecord;
  primaryActionChanged?: boolean;
  rankSwapCountOrNull?: number | null;
  scenarioClass: LowNoiseBudgetAuditPackScenarioClass;
  visibleChangeCountInWindowOrNull?: number | null;
};

function baseFrameInput(
  seed: number,
  caseSlug: string,
  overrides: Partial<BuildLowNoiseExperienceFrameInput> = {},
): BuildLowNoiseExperienceFrameInput {
  const manifestId = `manifest.pc0172.${seed}.${caseSlug}`;
  return {
    accessBindingHash: `access.pc0172.${seed}`,
    decisionBundleHash: `decision.hash.pc0172.${seed}.${caseSlug}`,
    frameEpoch: 1,
    lastPublishedSequence: 172,
    manifestId,
    maskingContextHash: `mask.pc0172.${seed}`,
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 1,
    renderedAt: "2026-05-04T12:00:00.000Z",
    resumeToken: `resume.pc0172.${seed}.${caseSlug}`,
    sessionBindingHash: `session.hash.pc0172.${seed}`,
    sessionRef: `session.pc0172.${seed}`,
    shellStabilityToken: `shell.pc0172.${seed}.${caseSlug}`,
    tenantId: `tenant.pc0172.${seed}`,
    ...overrides,
  };
}

function detailCandidate(
  moduleCode: LowNoiseDetailEntryCandidate["moduleCode"],
  overrides: Omit<Partial<LowNoiseDetailEntryCandidate>, "moduleCode"> = {},
): LowNoiseDetailEntryCandidate {
  return {
    anchorableObjectRefs: [`manifest.pc0172.detail.${moduleCode.toLowerCase()}`],
    moduleCode,
    ...overrides,
  };
}

export function defaultLowNoiseBudgetScenarioFixtures(
  deterministicSeed = defaultLowNoiseBudgetAuditSeed,
): LowNoiseBudgetScenarioFixture[] {
  const firstView = buildLowNoiseExperienceFrame(baseFrameInput(deterministicSeed, "first-view"));
  const reasonPressure = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "reason-pressure", {
      primaryIssueRef: "issue.pc0172.reason-pressure",
      reasons: Array.from({ length: 5 }, (_, index) => ({
        label: `Reason ${index + 1} requires review before continuing`,
        reasonCode: `PC0172_REASON_${index + 1}`,
        severity: "REVIEW",
      })),
      visibleWarningCount: 1,
    }),
  );
  const noSafeAction = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "no-safe-action", {
      noSafeActionReasonCode: "NO_LAWFUL_ACTION_CANDIDATE",
      primaryAction: null,
    }),
  );
  const nonMaterialRefresh = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "non-material-refresh", {
      frameEpoch: 2,
      lastPublishedSequence: 173,
      renderedAt: "2026-05-04T12:00:01.000Z",
    }),
  );
  const reconnectCatchUp = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "reconnect-catch-up", {
      connectionState: "STALE",
      frameEpoch: 3,
      noSafeActionReasonCode: "FRAME_RECOVERY_REQUIRED",
      recoveryPosture: "INLINE_RECONNECT",
      renderedAt: "2026-05-04T12:00:02.000Z",
    }),
  );
  const fallbackActive = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "detail-fallback-active", {
      activeDetailSurfaceCode: "EVIDENCE_TIDE",
      detailEntries: [detailCandidate("EVIDENCE_TIDE"), detailCandidate("PACKET_FORGE")],
      renderedAt: "2026-05-04T12:00:03.000Z",
    }),
  );
  const fallbackFirstValid = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "detail-fallback-first-valid", {
      activeDetailSurfaceCode: "AUTHORITY_TUNNEL",
      detailEntries: [detailCandidate("EVIDENCE_TIDE"), detailCandidate("PACKET_FORGE")],
      renderedAt: "2026-05-04T12:00:04.000Z",
    }),
  );
  const fallbackSuggested = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "detail-fallback-suggested", {
      activeDetailSurfaceCode: "AUTHORITY_TUNNEL",
      detailEntries: [detailCandidate("EVIDENCE_TIDE"), detailCandidate("PACKET_FORGE")],
      renderedAt: "2026-05-04T12:00:05.000Z",
      suggestedDetailSurfaceCode: "PACKET_FORGE",
    }),
  );
  const fallbackCollapsedRoot = buildLowNoiseExperienceFrame(
    baseFrameInput(deterministicSeed, "detail-fallback-collapsed-root", {
      renderedAt: "2026-05-04T12:00:06.000Z",
    }),
  );

  return [
    {
      caseId: "01_first_view",
      frame: firstView,
      scenarioClass: "FIRST_VIEW",
    },
    {
      caseId: "02_reason_pressure",
      frame: reasonPressure,
      scenarioClass: "REASON_PRESSURE",
    },
    {
      caseId: "03_no_safe_action",
      expectedFallbackState: "ACTIVE_MODULE_PRESERVED",
      frame: noSafeAction,
      scenarioClass: "NO_SAFE_ACTION",
    },
    {
      auditScope: "NON_MATERIAL_REFRESH",
      caseId: "04_non_material_refresh_coalesced",
      coalescedChangeCountOrNull: 2,
      continuityCostOrNull: 5,
      expectedCoalescingOutcome: "COLLAPSE_TO_COUNTS",
      frame: nonMaterialRefresh,
      rankSwapCountOrNull: 1,
      scenarioClass: "NON_MATERIAL_REFRESH",
      visibleChangeCountInWindowOrNull: 2,
    },
    {
      auditScope: "RECOVERY_RECONNECT",
      caseId: "05_reconnect_catch_up",
      coalescedChangeCountOrNull: 0,
      continuityCostOrNull: 3,
      expectedCoalescingOutcome: "DETAIL_LOCAL_ONLY",
      expectedFallbackState: "ACTIVE_MODULE_PRESERVED",
      frame: reconnectCatchUp,
      rankSwapCountOrNull: 0,
      scenarioClass: "RECONNECT_CATCH_UP",
      visibleChangeCountInWindowOrNull: 1,
    },
    {
      auditScope: "RECOVERY_RECONNECT",
      caseId: "06_detail_fallback_active_preserved",
      coalescedChangeCountOrNull: 0,
      continuityCostOrNull: 1,
      expectedFallbackState: "ACTIVE_MODULE_PRESERVED",
      frame: fallbackActive,
      rankSwapCountOrNull: 0,
      scenarioClass: "DETAIL_FALLBACK",
      visibleChangeCountInWindowOrNull: 1,
    },
    {
      auditScope: "RECOVERY_RECONNECT",
      caseId: "07_detail_fallback_first_valid",
      coalescedChangeCountOrNull: 0,
      continuityCostOrNull: 2,
      expectedFallbackState: "FIRST_VALID_ENTRY_SELECTED",
      frame: fallbackFirstValid,
      rankSwapCountOrNull: 0,
      scenarioClass: "DETAIL_FALLBACK",
      visibleChangeCountInWindowOrNull: 1,
    },
    {
      auditScope: "RECOVERY_RECONNECT",
      caseId: "08_detail_fallback_suggested",
      coalescedChangeCountOrNull: 0,
      continuityCostOrNull: 2,
      expectedFallbackState: "SUGGESTED_MODULE_SELECTED",
      frame: fallbackSuggested,
      rankSwapCountOrNull: 0,
      scenarioClass: "DETAIL_FALLBACK",
      visibleChangeCountInWindowOrNull: 1,
    },
    {
      auditScope: "RECOVERY_RECONNECT",
      caseId: "09_detail_fallback_collapsed_root",
      coalescedChangeCountOrNull: 0,
      continuityCostOrNull: 3,
      detailFallbackState: "COLLAPSED_ROOT_SELECTED",
      expectedFallbackState: "COLLAPSED_ROOT_SELECTED",
      frame: fallbackCollapsedRoot,
      rankSwapCountOrNull: 0,
      scenarioClass: "DETAIL_FALLBACK",
      visibleChangeCountInWindowOrNull: 1,
    },
  ];
}

function scenarioCaseFromFixture(
  fixture: LowNoiseBudgetScenarioFixture,
): LowNoiseBudgetAuditPackAuditCase {
  const audit = buildLowNoiseBudgetAudit({
    action_strip: fixture.frame.action_strip,
    auditScope: fixture.auditScope ?? fixture.frame.low_noise_budget_audit.audit_scope,
    coalescedChangeCountOrNull:
      fixture.coalescedChangeCountOrNull ??
      fixture.frame.low_noise_budget_audit.coalesced_change_count_or_null,
    context_bar: fixture.frame.context_bar,
    continuityCostOrNull:
      fixture.continuityCostOrNull ??
      fixture.frame.low_noise_budget_audit.continuity_cost_or_null,
    decision_summary: fixture.frame.decision_summary,
    detail_drawer: fixture.frame.detail_drawer,
    detailFallbackState:
      fixture.detailFallbackState ?? fixture.frame.low_noise_budget_audit.detail_fallback_state,
    prominentMotionCount: fixture.frame.low_noise_budget_audit.prominent_motion_count,
    rankSwapCountOrNull:
      fixture.rankSwapCountOrNull ?? fixture.frame.low_noise_budget_audit.rank_swap_count_or_null,
    surface_order: fixture.frame.surface_order,
    visibleChangeCountInWindowOrNull:
      fixture.visibleChangeCountInWindowOrNull ??
      fixture.frame.low_noise_budget_audit.visible_change_count_in_window_or_null,
  });

  return {
    actionability_state: fixture.frame.action_strip.actionability_state,
    active_detail_surface_code_or_null: fixture.frame.active_detail_surface_code,
    audit,
    case_id: fixture.caseId,
    dominant_question_changed: fixture.dominantQuestionChanged ?? false,
    expected_coalescing_outcome: fixture.expectedCoalescingOutcome ?? "NONE",
    expected_fallback_state: fixture.expectedFallbackState ?? audit.detail_fallback_state,
    frame_ref: fixture.frame.frame_id,
    mode_posture: fixture.frame.context_bar.mode_posture,
    primary_action_changed: fixture.primaryActionChanged ?? false,
    scenario_class: fixture.scenarioClass,
  };
}

export function buildBudgetScenarioMatrix(input: {
  deterministicSeed?: number;
  fixtures?: readonly LowNoiseBudgetScenarioFixture[];
} = {}) {
  const fixtures =
    input.fixtures ?? defaultLowNoiseBudgetScenarioFixtures(input.deterministicSeed);
  return fixtures.map((fixture) => scenarioCaseFromFixture(fixture));
}
