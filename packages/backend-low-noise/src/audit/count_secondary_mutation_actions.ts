import type { LowNoiseFrameSurfaces } from "../models/low_noise_frame.ts";

export const lowNoiseMutationActionKinds = new Set([
  "AUTHORITY_MUTATION",
  "FILING_MUTATION",
  "APPROVAL_MUTATION",
  "OVERRIDE_MUTATION",
]);

export function countSecondaryMutationActions(
  actionStrip: LowNoiseFrameSurfaces["action_strip"],
) {
  return actionStrip.secondary_actions.filter((action) =>
    lowNoiseMutationActionKinds.has(action.action_kind),
  ).length;
}

export function countLowNoiseActionInventory(input: LowNoiseFrameSurfaces) {
  const visibleActionCount =
    (input.action_strip.primary_action === null ? 0 : 1) +
    input.action_strip.secondary_actions.length;
  const primaryMutationActionCount =
    input.action_strip.primary_action !== null &&
    lowNoiseMutationActionKinds.has(input.action_strip.primary_action.action_kind)
      ? 1
      : 0;

  return {
    primaryMutationActionCount,
    secondaryMutationActionCount: countSecondaryMutationActions(input.action_strip),
    visibleActionCount,
  };
}
