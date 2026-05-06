import type { LowNoiseBudgetAudit } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  lowNoiseCognitiveBudget,
  lowNoiseSurfaceOrder,
  type LowNoiseDetailFallbackState,
  type LowNoiseExperienceFrameRecord,
  type LowNoiseFrameRecoveryAuditScope,
  type LowNoiseFrameSurfaces,
} from "../models/low_noise_frame.ts";
import {
  computeLowNoiseScanLoadQuarterUnits,
  computeScanLoad,
} from "./compute_scan_load.ts";
import { countLowNoiseActionInventory } from "./count_secondary_mutation_actions.ts";
import { detectDuplicatePostureCodes } from "./detect_duplicate_posture_codes.ts";

export type BuildLowNoiseBudgetAuditInput = LowNoiseFrameSurfaces & {
  auditScope?: LowNoiseFrameRecoveryAuditScope;
  coalescedChangeCountOrNull?: number | null;
  continuityCostOrNull?: number | null;
  detailFallbackState?: LowNoiseDetailFallbackState;
  prominentMotionCount?: number;
  rankSwapCountOrNull?: number | null;
  surface_order?: readonly string[];
  visibleChangeCountInWindowOrNull?: number | null;
};

function visibleTextChars(value: unknown) {
  return typeof value === "string" ? value.trim().length : 0;
}

export function computeVisibleShellCharCount(input: LowNoiseFrameSurfaces) {
  let total = 0;
  total += visibleTextChars(input.context_bar.manifest_label);
  total += visibleTextChars(input.context_bar.period_label);
  total += visibleTextChars(input.context_bar.scope_label);
  total += visibleTextChars(input.context_bar.phase_label);
  total += visibleTextChars(input.context_bar.owner_label);
  total += visibleTextChars(input.context_bar.limitation_statement);
  total += visibleTextChars(input.decision_summary.headline);
  total += input.decision_summary.visible_reasons.reduce(
    (sum, reason) => sum + visibleTextChars(reason.label),
    0,
  );
  total += visibleTextChars(input.decision_summary.plain_explanation);
  total += visibleTextChars(input.decision_summary.uncertainty_statement);
  total += visibleTextChars(input.decision_summary.limitation_statement);
  total += visibleTextChars(input.decision_summary.blocking_reason);
  if (input.action_strip.primary_action) {
    total += visibleTextChars(input.action_strip.primary_action.label);
  }
  total += input.action_strip.secondary_actions.reduce(
    (sum, action) => sum + visibleTextChars(action.label),
    0,
  );
  total += visibleTextChars(input.action_strip.ownership_label);
  total += visibleTextChars(input.action_strip.waiting_on_label);
  total += visibleTextChars(input.action_strip.blocking_reason);
  total += input.detail_drawer.entry_points.reduce(
    (sum, entry) =>
      sum +
      visibleTextChars(entry.entry_label) +
      visibleTextChars(entry.plain_language_summary) +
      visibleTextChars(entry.entry_reason),
    0,
  );
  return total;
}

function refreshBudgetStateForScope(
  auditScope: LowNoiseFrameRecoveryAuditScope,
  coalescedChangeCountOrNull: number | null,
) {
  if (auditScope === "FIRST_VIEW") {
    return "NOT_APPLICABLE" as const;
  }
  return coalescedChangeCountOrNull !== null && coalescedChangeCountOrNull > 0
    ? "COALESCED_TO_PRESERVE_BUDGET"
    : "WITHIN_NON_MATERIAL_REFRESH_BUDGET";
}

export function buildLowNoiseBudgetAudit(
  input: BuildLowNoiseBudgetAuditInput,
): LowNoiseBudgetAudit {
  const auditScope = input.auditScope ?? "FIRST_VIEW";
  const visibleShellChars = computeVisibleShellCharCount(input);
  const actionInventory = countLowNoiseActionInventory(input);
  const duplicatePostureCodes = detectDuplicatePostureCodes(input);
  const prominentMotionCount = input.prominentMotionCount ?? 0;
  const visibleReasonCount = input.decision_summary.visible_reasons.length;
  const visibleWarningCount = input.decision_summary.visible_warning_count;
  const visibleDetailEntryCount = input.detail_drawer.entry_points.length;
  const isFirstView = auditScope === "FIRST_VIEW";
  const coalescedChangeCountOrNull = isFirstView
    ? null
    : (input.coalescedChangeCountOrNull ?? 0);
  const scanLoadInput = {
    concurrentPrimaryCount: lowNoiseCognitiveBudget.concurrent_primary_limit,
    persistentSurfaceCount: lowNoiseCognitiveBudget.persistent_surface_limit,
    prominentMotionCount,
    visibleActionCount: actionInventory.visibleActionCount,
    visibleDetailEntryCount,
    visibleReasonCount,
    visibleShellCharCount: visibleShellChars,
    visibleWarningCount,
  };

  return {
    attention_budget_state: "WITHIN_FROZEN_ATTENTION_BUDGET",
    audit_scope: auditScope,
    coalesced_change_count_or_null: coalescedChangeCountOrNull,
    collapsed_reason_count: input.decision_summary.additional_reason_count,
    concurrent_primary_count: lowNoiseCognitiveBudget.concurrent_primary_limit,
    continuity_cost_or_null: isFirstView ? null : (input.continuityCostOrNull ?? 0),
    contract_version: "LOW_NOISE_BUDGET_AUDIT_V1",
    copy_budget_state: "WITHIN_FROZEN_COPY_BUDGET",
    detail_fallback_state: input.detailFallbackState ?? "NOT_APPLICABLE",
    dominant_issue_count: input.decision_summary.primary_issue_ref === null ? 0 : 1,
    duplicate_posture_cluster_count: duplicatePostureCodes.length,
    duplicate_posture_codes: duplicatePostureCodes,
    persistent_surface_count: lowNoiseCognitiveBudget.persistent_surface_limit,
    primary_mutation_action_count: actionInventory.primaryMutationActionCount,
    prominent_motion_count: prominentMotionCount,
    rank_swap_count_or_null: isFirstView ? null : (input.rankSwapCountOrNull ?? 0),
    refresh_budget_state: refreshBudgetStateForScope(auditScope, coalescedChangeCountOrNull),
    rendered_surface_order: [...(input.surface_order ?? lowNoiseSurfaceOrder)],
    scan_load: computeScanLoad(scanLoadInput),
    secondary_mutation_action_count: actionInventory.secondaryMutationActionCount,
    semantic_coverage_state: "LOSSLESS_DECISIVE_ATOMS_VISIBLE_OR_ROUTE_STABLE",
    shell_family: "CALM_SHELL",
    surface_budget_state: "WITHIN_FROZEN_SURFACE_BUDGET",
    visible_action_count: actionInventory.visibleActionCount,
    visible_change_count_in_window_or_null: isFirstView
      ? null
      : (input.visibleChangeCountInWindowOrNull ?? 0),
    visible_detail_entry_count: visibleDetailEntryCount,
    visible_reason_count: visibleReasonCount,
    visible_shell_char_count: visibleShellChars,
    visible_warning_count: visibleWarningCount,
  };
}

export function assertLowNoiseBudgetWithinFrozenRules(
  budgetAudit: LowNoiseBudgetAudit,
): LowNoiseBudgetAudit {
  if (budgetAudit.rendered_surface_order.join(">") !== lowNoiseSurfaceOrder.join(">")) {
    throw new Error("low-noise budget audit rendered surface order drifted");
  }
  if (budgetAudit.persistent_surface_count !== lowNoiseCognitiveBudget.persistent_surface_limit) {
    throw new Error("low-noise persistent surface count drifted from the frozen budget");
  }
  if (budgetAudit.concurrent_primary_count !== lowNoiseCognitiveBudget.concurrent_primary_limit) {
    throw new Error("low-noise concurrent primary count drifted from the frozen budget");
  }
  if (budgetAudit.visible_reason_count > lowNoiseCognitiveBudget.primary_reason_limit) {
    throw new Error("low-noise visible reason count exceeded the frozen budget");
  }
  if (budgetAudit.visible_warning_count > lowNoiseCognitiveBudget.visible_warning_limit) {
    throw new Error("low-noise visible warning count exceeded the frozen budget");
  }
  if (
    budgetAudit.visible_action_count >
    lowNoiseCognitiveBudget.secondary_action_limit + lowNoiseCognitiveBudget.concurrent_primary_limit
  ) {
    throw new Error("low-noise visible action count exceeded the frozen budget");
  }
  if (budgetAudit.visible_detail_entry_count > lowNoiseCognitiveBudget.detail_entry_point_limit) {
    throw new Error("low-noise visible detail entry count exceeded the frozen budget");
  }
  if (budgetAudit.secondary_mutation_action_count !== 0) {
    throw new Error("low-noise secondary actions cannot be mutation-capable");
  }
  if (budgetAudit.duplicate_posture_codes.length > 0) {
    throw new Error("low-noise publication must compress duplicate posture copy before release");
  }
  if (budgetAudit.scan_load > lowNoiseCognitiveBudget.visibility_budget_units) {
    throw new Error("low-noise scan load exceeded the frozen visibility budget");
  }
  const expectedQuarterUnits = computeLowNoiseScanLoadQuarterUnits({
    concurrentPrimaryCount: budgetAudit.concurrent_primary_count,
    persistentSurfaceCount: budgetAudit.persistent_surface_count,
    prominentMotionCount: budgetAudit.prominent_motion_count,
    visibleActionCount: budgetAudit.visible_action_count,
    visibleDetailEntryCount: budgetAudit.visible_detail_entry_count,
    visibleReasonCount: budgetAudit.visible_reason_count,
    visibleShellCharCount: budgetAudit.visible_shell_char_count,
    visibleWarningCount: budgetAudit.visible_warning_count,
  });
  if (budgetAudit.scan_load !== expectedQuarterUnits / 4) {
    throw new Error("low-noise scan load drifted from the frozen formula");
  }
  return budgetAudit;
}

export function buildFrameLowNoiseBudgetAudit(frame: LowNoiseExperienceFrameRecord) {
  return buildLowNoiseBudgetAudit({
    action_strip: frame.action_strip,
    auditScope: frame.low_noise_budget_audit.audit_scope,
    coalescedChangeCountOrNull: frame.low_noise_budget_audit.coalesced_change_count_or_null,
    context_bar: frame.context_bar,
    continuityCostOrNull: frame.low_noise_budget_audit.continuity_cost_or_null,
    decision_summary: frame.decision_summary,
    detail_drawer: frame.detail_drawer,
    detailFallbackState: frame.low_noise_budget_audit.detail_fallback_state,
    prominentMotionCount: frame.low_noise_budget_audit.prominent_motion_count,
    rankSwapCountOrNull: frame.low_noise_budget_audit.rank_swap_count_or_null,
    surface_order: frame.surface_order,
    visibleChangeCountInWindowOrNull:
      frame.low_noise_budget_audit.visible_change_count_in_window_or_null,
  });
}
