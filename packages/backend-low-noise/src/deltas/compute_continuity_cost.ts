import { isDeepStrictEqual } from "node:util";

import { lowNoiseSurfaceOrder, type LowNoiseExperienceFrameRecord } from "../models/low_noise_frame.ts";

export type LowNoiseChangedSurfaceCode = (typeof lowNoiseSurfaceOrder)[number];

export type LowNoiseContinuityCost = {
  continuityCost: number;
  dominantQuestionChanged: boolean;
  focusAnchorLost: boolean;
  primaryActionChanged: boolean;
  prominentMotionCount: number;
  rankSwapCount: number;
  visibleChangeCount: number;
};

function primaryActionCode(frame: LowNoiseExperienceFrameRecord) {
  return frame.attention_policy.primary_action_code;
}

export function rankSwapCountBetweenFrames(input: {
  previousFrame: LowNoiseExperienceFrameRecord;
  nextFrame: LowNoiseExperienceFrameRecord;
}) {
  const previousOrder = input.previousFrame.attention_policy.detail_entry_points;
  const nextOrder = input.nextFrame.attention_policy.detail_entry_points;
  let rankSwaps = 0;
  for (const moduleCode of previousOrder) {
    const previousIndex = previousOrder.indexOf(moduleCode);
    const nextIndex = nextOrder.indexOf(moduleCode);
    if (nextIndex >= 0 && nextIndex !== previousIndex) {
      rankSwaps += 1;
    }
  }
  return rankSwaps;
}

export function changedLowNoiseSurfaceCodes(input: {
  previousFrame?: LowNoiseExperienceFrameRecord | null | undefined;
  nextFrame: LowNoiseExperienceFrameRecord;
}) {
  if (!input.previousFrame) {
    return [...lowNoiseSurfaceOrder];
  }
  const previousSurfaces = {
    ACTION_STRIP: input.previousFrame.action_strip,
    CONTEXT_BAR: input.previousFrame.context_bar,
    DECISION_SUMMARY: input.previousFrame.decision_summary,
    DETAIL_DRAWER: input.previousFrame.detail_drawer,
  };
  const nextSurfaces = {
    ACTION_STRIP: input.nextFrame.action_strip,
    CONTEXT_BAR: input.nextFrame.context_bar,
    DECISION_SUMMARY: input.nextFrame.decision_summary,
    DETAIL_DRAWER: input.nextFrame.detail_drawer,
  };
  return lowNoiseSurfaceOrder.filter(
    (surfaceCode) => !isDeepStrictEqual(previousSurfaces[surfaceCode], nextSurfaces[surfaceCode]),
  );
}

export function computeContinuityCost(input: {
  nextFrame: LowNoiseExperienceFrameRecord;
  previousFrame: LowNoiseExperienceFrameRecord;
  prominentMotionCount?: number | undefined;
  visibleChangeCount?: number | undefined;
}): LowNoiseContinuityCost {
  const dominantQuestionChanged =
    input.previousFrame.dominant_question !== input.nextFrame.dominant_question;
  const primaryActionChanged =
    primaryActionCode(input.previousFrame) !== primaryActionCode(input.nextFrame);
  const focusAnchorLost =
    input.previousFrame.focus_anchor_ref !== null && input.nextFrame.focus_anchor_ref === null;
  const rankSwapCount = rankSwapCountBetweenFrames(input);
  const prominentMotionCount = input.prominentMotionCount ?? 0;
  const visibleChangeCount =
    input.visibleChangeCount ??
    changedLowNoiseSurfaceCodes({
      nextFrame: input.nextFrame,
      previousFrame: input.previousFrame,
    }).length;
  const continuityCost =
    (dominantQuestionChanged ? 5 : 0) +
    (primaryActionChanged ? 4 : 0) +
    (focusAnchorLost ? 3 : 0) +
    2 * rankSwapCount +
    2 * prominentMotionCount;

  return {
    continuityCost,
    dominantQuestionChanged,
    focusAnchorLost,
    primaryActionChanged,
    prominentMotionCount,
    rankSwapCount,
    visibleChangeCount,
  };
}
