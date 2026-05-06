import type {
  ClientOnboardingCompletionSummaryRecord,
  ClientOnboardingLifecycleState,
} from "../types.ts";

export function buildOnboardingCompletionSummary(input: {
  abandonmentReasonCode?: string | null | undefined;
  completionNextStepsRef?: string | null | undefined;
  completionSummaryRef?: string | null | undefined;
  completionTimelineEventRef?: string | null | undefined;
  journeyId: string;
  lifecycleState: ClientOnboardingLifecycleState;
}): ClientOnboardingCompletionSummaryRecord {
  if (input.lifecycleState === "COMPLETED") {
    return {
      completion_next_steps_ref:
        input.completionNextStepsRef ?? `copy.${input.journeyId}.completion-next-steps`,
      completion_summary_ref:
        input.completionSummaryRef ?? `copy.${input.journeyId}.completion-summary`,
      completion_timeline_event_ref:
        input.completionTimelineEventRef ?? `activity.${input.journeyId}.completed`,
      terminal_exit_reason_code: "COMPLETED",
    };
  }

  if (input.lifecycleState === "EXPIRED") {
    return {
      completion_next_steps_ref: null,
      completion_summary_ref: null,
      completion_timeline_event_ref: null,
      terminal_exit_reason_code: "EXPIRED",
    };
  }

  if (input.lifecycleState === "ABANDONED") {
    return {
      completion_next_steps_ref: null,
      completion_summary_ref: null,
      completion_timeline_event_ref: null,
      terminal_exit_reason_code: "ABANDONED",
    };
  }

  return {
    completion_next_steps_ref: null,
    completion_summary_ref: null,
    completion_timeline_event_ref: null,
    terminal_exit_reason_code: null,
  };
}
