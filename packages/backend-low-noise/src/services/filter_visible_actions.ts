import type { ActionStripState } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { type LowNoiseAction, lowNoiseCognitiveBudget } from "../models/low_noise_frame.ts";
import type { LowNoiseActionCandidate } from "../models/low_noise_surface_projector_input.ts";
import { uniqueLowNoiseStrings } from "./enforce_low_noise_copy_budgets.ts";
import {
  isLowNoiseMutationActionKind,
  lowNoiseActionCandidateFromPartialAction,
  materializeLowNoiseActionCandidate,
} from "./score_and_select_primary_action.ts";

export type LowNoiseVisibleActions = {
  availableActionCodes: string[];
  blockedActionCodes: string[];
  secondaryActions: LowNoiseAction[];
  suppressedSecondaryCount: number;
};

function partialSecondaryCandidates(
  secondaryActions: readonly Partial<LowNoiseAction>[] | undefined,
) {
  return (secondaryActions ?? []).map((action, index) =>
    lowNoiseActionCandidateFromPartialAction(action, {
      fallbackActionCode: `SECONDARY_${index + 1}`,
      fallbackActionKind: "REQUEST_REVIEW",
      fallbackLabel: "Review",
      rankScore: 50 - index * 5,
    }),
  );
}

export function filterVisibleActions(input: {
  blockedActionCodes?: readonly string[] | undefined;
  modeSafetyPosture: ActionStripState["mode_safety_posture"];
  objectAnchorRef: string;
  primaryAction: LowNoiseAction;
  secondaryActionCandidates?: readonly LowNoiseActionCandidate[] | undefined;
  secondaryActions?: readonly Partial<LowNoiseAction>[] | undefined;
  selectedPrimaryCandidateCode?: string | null | undefined;
  visibleSecondaryLimit?: number | undefined;
}): LowNoiseVisibleActions {
  const blockedActionCodes = new Set(input.blockedActionCodes ?? []);
  const secondaryLimit = Math.max(
    0,
    Math.min(input.visibleSecondaryLimit ?? lowNoiseCognitiveBudget.secondary_action_limit, 2),
  );
  const candidateInputs = [
    ...partialSecondaryCandidates(input.secondaryActions),
    ...(input.secondaryActionCandidates ?? []),
  ];
  const primaryIsMutation = isLowNoiseMutationActionKind(input.primaryAction.action_kind);
  const lawfulSecondaryActions: LowNoiseAction[] = [];

  for (const candidate of candidateInputs) {
    if (
      candidate.actionCode === input.primaryAction.action_code ||
      candidate.actionCode === input.selectedPrimaryCandidateCode ||
      blockedActionCodes.has(candidate.actionCode)
    ) {
      continue;
    }
    if (isLowNoiseMutationActionKind(candidate.actionKind)) {
      blockedActionCodes.add(candidate.actionCode);
      continue;
    }
    if (
      primaryIsMutation &&
      isLowNoiseMutationActionKind(candidate.actionKind)
    ) {
      blockedActionCodes.add(candidate.actionCode);
      continue;
    }
    if (input.modeSafetyPosture === "NON_LIVE_MUTATIONS_FORBIDDEN" && isLowNoiseMutationActionKind(candidate.actionKind)) {
      blockedActionCodes.add(candidate.actionCode);
      continue;
    }
    const action = materializeLowNoiseActionCandidate(candidate, {
      objectAnchorRef: input.objectAnchorRef,
    });
    if (action.action_code !== input.primaryAction.action_code) {
      lawfulSecondaryActions.push(action);
    }
  }

  const uniqueSecondaryActions = lawfulSecondaryActions.filter(
    (action, index, actions) =>
      actions.findIndex((candidate) => candidate.action_code === action.action_code) === index,
  );
  const secondaryActions = uniqueSecondaryActions.slice(0, secondaryLimit);
  const availableActionCodes = uniqueLowNoiseStrings([
    input.primaryAction.action_code,
    ...secondaryActions.map((action) => action.action_code),
    ...uniqueSecondaryActions.slice(secondaryLimit).map((action) => action.action_code),
  ]).slice(0, 1 + lowNoiseCognitiveBudget.secondary_action_limit);
  const visibleSecondaryCodes = new Set(secondaryActions.map((action) => action.action_code));
  const suppressedSecondaryCount = Math.max(
    0,
    availableActionCodes.filter(
      (actionCode) =>
        actionCode !== input.primaryAction.action_code && !visibleSecondaryCodes.has(actionCode),
    ).length,
  );

  return {
    availableActionCodes,
    blockedActionCodes: uniqueLowNoiseStrings([...blockedActionCodes]).slice(0, 8),
    secondaryActions,
    suppressedSecondaryCount,
  };
}
