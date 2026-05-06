import type {
  ClientOnboardingLifecycleState,
  ClientOnboardingResumeState,
  ClientOnboardingSaveReturnState,
  ClientOnboardingStepCode,
  ClientOnboardingStepWorkspaceState,
} from "../types.ts";

export type DerivedOnboardingStepWorkspaceState = {
  actionCode:
    | "CONTINUE_ONBOARDING"
    | "REQUEST_HELP"
    | "REVIEW_LATEST_ONBOARDING"
    | "REVIEW_ONBOARDING_CHANGES"
    | "VIEW_PORTAL_HOME";
  actionLabel: "Continue" | "Review changes" | "Review latest" | "Go to portal" | "Ask for help";
  actionRoute: "HELP" | "HOME" | "ONBOARDING";
  saveReturnState: ClientOnboardingSaveReturnState;
  stepWorkspaceState: ClientOnboardingStepWorkspaceState;
};

export function deriveOnboardingStepWorkspaceState(input: {
  currentStepCode: ClientOnboardingStepCode | null;
  lifecycleState: ClientOnboardingLifecycleState;
  resumeState: ClientOnboardingResumeState;
}): DerivedOnboardingStepWorkspaceState {
  if (input.lifecycleState === "COMPLETED") {
    return {
      actionCode: "VIEW_PORTAL_HOME",
      actionLabel: "Go to portal",
      actionRoute: "HOME",
      saveReturnState: "NOT_AVAILABLE_TERMINAL",
      stepWorkspaceState: "COMPLETION_SUMMARY",
    };
  }

  if (input.lifecycleState === "EXPIRED" || input.lifecycleState === "ABANDONED") {
    return {
      actionCode: "REQUEST_HELP",
      actionLabel: "Ask for help",
      actionRoute: "HELP",
      saveReturnState: "NOT_AVAILABLE_TERMINAL",
      stepWorkspaceState: "EXIT_SUPPORT",
    };
  }

  if (input.resumeState === "RECONFIRMATION_REQUIRED") {
    return {
      actionCode: "REVIEW_ONBOARDING_CHANGES",
      actionLabel: "Review changes",
      actionRoute: "ONBOARDING",
      saveReturnState: "AVAILABLE",
      stepWorkspaceState: "RECONFIRMATION_REVIEW",
    };
  }

  if (input.resumeState === "STALE_REVIEW_REQUIRED") {
    return {
      actionCode: "REVIEW_LATEST_ONBOARDING",
      actionLabel: "Review latest",
      actionRoute: "ONBOARDING",
      saveReturnState: "NOT_AVAILABLE_IRREVERSIBLE",
      stepWorkspaceState: "STALE_REVIEW",
    };
  }

  return {
    actionCode: "CONTINUE_ONBOARDING",
    actionLabel: "Continue",
    actionRoute: "ONBOARDING",
    saveReturnState:
      input.currentStepCode === "INVITE_ACCEPTANCE"
        ? "NOT_AVAILABLE_IRREVERSIBLE"
        : "AVAILABLE",
    stepWorkspaceState: "ACTIVE_STEP",
  };
}
