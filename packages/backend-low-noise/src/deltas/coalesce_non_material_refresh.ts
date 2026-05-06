import { lowNoiseCognitiveBudget } from "../models/low_noise_frame.ts";
import type { LowNoiseContinuityCost } from "./compute_continuity_cost.ts";

export type LowNoiseCoalescingOutcome =
  | "PUBLISH"
  | "COLLAPSE_TO_COUNTS"
  | "DETAIL_LOCAL_ONLY"
  | "HOLD_UNTIL_MATERIAL";

export type LowNoiseCoalescingDecision = {
  outcome: LowNoiseCoalescingOutcome;
  reasonCodes: string[];
  shouldPublishDelta: boolean;
};

export function coalesceNonMaterialRefresh(input: {
  continuity: LowNoiseContinuityCost;
  scanLoad: number;
}) {
  const reasonCodes: string[] = [];
  if (input.continuity.dominantQuestionChanged) {
    reasonCodes.push("DOMINANT_QUESTION_CHANGED");
  }
  if (input.continuity.primaryActionChanged) {
    reasonCodes.push("PRIMARY_ACTION_CHANGED");
  }
  if (input.scanLoad > lowNoiseCognitiveBudget.visibility_budget_units) {
    reasonCodes.push("SCAN_LOAD_EXCEEDS_VISIBILITY_BUDGET");
  }
  if (
    input.continuity.rankSwapCount >
    lowNoiseCognitiveBudget.non_material_rank_swap_limit
  ) {
    reasonCodes.push("RANK_SWAP_EXCEEDS_NON_MATERIAL_LIMIT");
  }
  if (
    input.continuity.prominentMotionCount >
    lowNoiseCognitiveBudget.prominent_motion_limit
  ) {
    reasonCodes.push("PROMINENT_MOTION_EXCEEDS_LIMIT");
  }
  if (
    input.continuity.continuityCost >
    lowNoiseCognitiveBudget.non_material_continuity_cost_limit
  ) {
    reasonCodes.push("CONTINUITY_COST_EXCEEDS_LIMIT");
  }
  if (
    input.continuity.visibleChangeCount >
    lowNoiseCognitiveBudget.refresh_burst_visible_change_limit
  ) {
    reasonCodes.push("VISIBLE_CHANGE_BURST_EXCEEDS_LIMIT");
  }

  if (reasonCodes.length === 0) {
    return {
      outcome: "PUBLISH",
      reasonCodes,
      shouldPublishDelta: true,
    } satisfies LowNoiseCoalescingDecision;
  }

  if (
    input.continuity.dominantQuestionChanged ||
    input.continuity.primaryActionChanged ||
    reasonCodes.includes("CONTINUITY_COST_EXCEEDS_LIMIT")
  ) {
    return {
      outcome: "HOLD_UNTIL_MATERIAL",
      reasonCodes,
      shouldPublishDelta: false,
    } satisfies LowNoiseCoalescingDecision;
  }

  if (reasonCodes.includes("VISIBLE_CHANGE_BURST_EXCEEDS_LIMIT")) {
    return {
      outcome: "COLLAPSE_TO_COUNTS",
      reasonCodes,
      shouldPublishDelta: false,
    } satisfies LowNoiseCoalescingDecision;
  }

  return {
    outcome: "DETAIL_LOCAL_ONLY",
    reasonCodes,
    shouldPublishDelta: false,
  } satisfies LowNoiseCoalescingDecision;
}
