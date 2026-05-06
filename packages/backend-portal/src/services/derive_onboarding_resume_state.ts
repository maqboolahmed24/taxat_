import type {
  ClientOnboardingLifecycleState,
  ClientOnboardingResumeState,
  ClientOnboardingStepCode,
} from "../types.ts";
import { ClientOnboardingJourneyProjectionError } from "../types.ts";

export type DerivedOnboardingResumeState = {
  reconfirmationStepCodes: ClientOnboardingStepCode[];
  resumeState: ClientOnboardingResumeState;
  resumeStepCode: ClientOnboardingStepCode | null;
};

const terminalStates = new Set<ClientOnboardingLifecycleState>([
  "ABANDONED",
  "COMPLETED",
  "EXPIRED",
]);

function orderedSubset(
  order: readonly ClientOnboardingStepCode[],
  values: readonly ClientOnboardingStepCode[],
) {
  const valueSet = new Set(values);
  return order.filter((step) => valueSet.has(step));
}

function firstIncompleteStep(input: {
  completedSteps: readonly ClientOnboardingStepCode[];
  requiredSteps: readonly ClientOnboardingStepCode[];
}) {
  const completed = new Set(input.completedSteps);
  return input.requiredSteps.find((step) => !completed.has(step)) ?? null;
}

export function deriveOnboardingResumeState(input: {
  completedSteps: readonly ClientOnboardingStepCode[];
  currentStepCode: ClientOnboardingStepCode | null;
  draftUploadSessionRefs?: readonly string[] | undefined;
  lifecycleState: ClientOnboardingLifecycleState;
  reconfirmationStepCodes?: readonly ClientOnboardingStepCode[] | undefined;
  requiredSteps: readonly ClientOnboardingStepCode[];
  staleReviewRequired?: boolean | undefined;
}): DerivedOnboardingResumeState {
  const reconfirmationStepCodes = orderedSubset(
    input.requiredSteps,
    input.reconfirmationStepCodes ?? [],
  );

  if (terminalStates.has(input.lifecycleState)) {
    return {
      reconfirmationStepCodes: [],
      resumeState: "NONE",
      resumeStepCode: null,
    };
  }

  if (input.currentStepCode === null) {
    throw new ClientOnboardingJourneyProjectionError(
      "active onboarding journeys require one current step",
      ["CLIENT_ONBOARDING_CURRENT_STEP_MISSING"],
    );
  }

  if (input.staleReviewRequired === true) {
    return {
      reconfirmationStepCodes:
        reconfirmationStepCodes.length === 0
          ? [input.currentStepCode]
          : reconfirmationStepCodes,
      resumeState: "STALE_REVIEW_REQUIRED",
      resumeStepCode: null,
    };
  }

  if (reconfirmationStepCodes.length > 0) {
    return {
      reconfirmationStepCodes,
      resumeState: "RECONFIRMATION_REQUIRED",
      resumeStepCode: reconfirmationStepCodes.includes(input.currentStepCode)
        ? input.currentStepCode
        : reconfirmationStepCodes[0],
    };
  }

  const currentStepIsCompleted = input.completedSteps.includes(input.currentStepCode);
  const resumeStepCode = currentStepIsCompleted
    ? firstIncompleteStep(input)
    : input.currentStepCode;
  if (resumeStepCode === null) {
    return {
      reconfirmationStepCodes: [],
      resumeState: "NONE",
      resumeStepCode: null,
    };
  }

  return {
    reconfirmationStepCodes: [],
    resumeState: "LIVE",
    resumeStepCode,
  };
}
