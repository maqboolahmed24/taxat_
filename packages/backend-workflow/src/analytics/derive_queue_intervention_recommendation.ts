import type { QueueHealthState } from "./compute_work_queue_health.ts";

export type QueueInterventionRecommendationState =
  | "NONE"
  | "REBALANCE"
  | "STAFFING_REVIEW"
  | "MANUAL_TRIAGE";

export type QueueInterventionRecommendation = {
  intervention_recommendation_state: QueueInterventionRecommendationState;
  reason_codes: string[];
};

function uniqueReasonCodes(codes: readonly string[], maxItems = 6) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const code of codes) {
    const trimmed = code.trim();
    if (trimmed === "" || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result;
}

export function deriveQueueInterventionRecommendation(input: {
  queue_health_floor: number;
  queue_health_score: number;
  queue_health_state: QueueHealthState;
  reassignment_churn_q: number;
  saturated_reason_codes?: readonly string[] | undefined;
  stale_view_rejection_rate_q: number;
}): QueueInterventionRecommendation {
  if (input.queue_health_score >= input.queue_health_floor && input.queue_health_state === "HEALTHY") {
    return {
      intervention_recommendation_state: "NONE",
      reason_codes: ["QUEUE_HEALTH_WITHIN_TARGET"],
    };
  }

  if (input.queue_health_state === "SATURATED") {
    const staffingReasons = new Set([
      "WORK_QUEUE_STAFFING_ZERO",
      "WORK_QUEUE_SERVICE_RATE_ZERO",
      "WORK_QUEUE_UTILIZATION_SATURATED",
    ]);
    const needsStaffingReview = (input.saturated_reason_codes ?? []).some((code) =>
      staffingReasons.has(code),
    );
    return {
      intervention_recommendation_state: needsStaffingReview ? "STAFFING_REVIEW" : "MANUAL_TRIAGE",
      reason_codes: uniqueReasonCodes([
        "WORK_QUEUE_HEALTH_DEGRADED",
        ...(input.saturated_reason_codes ?? []),
        needsStaffingReview ? "QUEUE_STAFFING_REVIEW_REQUIRED" : "QUEUE_MANUAL_TRIAGE_REQUIRED",
      ]),
    };
  }

  if (input.reassignment_churn_q >= 0.25) {
    return {
      intervention_recommendation_state: "REBALANCE",
      reason_codes: uniqueReasonCodes([
        "WORK_QUEUE_HEALTH_DEGRADED",
        "WORK_QUEUE_REASSIGNMENT_CHURN_HIGH",
        "QUEUE_REBALANCE_RECOMMENDED",
      ]),
    };
  }

  if (input.stale_view_rejection_rate_q >= 0.1) {
    return {
      intervention_recommendation_state: "MANUAL_TRIAGE",
      reason_codes: uniqueReasonCodes([
        "WORK_QUEUE_HEALTH_DEGRADED",
        "WORK_QUEUE_STALE_VIEW_REJECTIONS_HIGH",
        "QUEUE_MANUAL_TRIAGE_REQUIRED",
      ]),
    };
  }

  return {
    intervention_recommendation_state: "REBALANCE",
    reason_codes: uniqueReasonCodes([
      "WORK_QUEUE_HEALTH_DEGRADED",
      "QUEUE_REBALANCE_RECOMMENDED",
    ]),
  };
}
