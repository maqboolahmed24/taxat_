import type {
  AuthorityReconciliationCountEntry,
  AuthorityReconciliationTuningRecommendationCode,
} from "../models/authority_reconciliation_analytics_snapshot.ts";

export type ReconciliationTuningRecommendationInput = {
  average_attempts_consumed: number;
  blind_resend_blocked_count: number;
  budget_state_counts: readonly AuthorityReconciliationCountEntry[];
  deadline_expiry_count: number;
  max_attempts_consumed: number;
  outcome_class_counts: readonly AuthorityReconciliationCountEntry[];
  replay_resume_count: number;
  total_interaction_count: number;
  unresolved_ambiguity_count: number;
};

function countFor(entries: readonly AuthorityReconciliationCountEntry[], code: string) {
  return entries.find((entry) => entry.code === code)?.count ?? 0;
}

function ratio(count: number, total: number) {
  return total === 0 ? 0 : count / total;
}

function sortedRecommendations(
  codes: ReadonlySet<AuthorityReconciliationTuningRecommendationCode>,
) {
  return [...codes].sort();
}

export function deriveReconciliationTuningRecommendations(
  input: ReconciliationTuningRecommendationInput,
): AuthorityReconciliationTuningRecommendationCode[] {
  const total = input.total_interaction_count;
  if (total === 0) {
    return ["NO_CHANGE_RECOMMENDED"];
  }

  const recommendations = new Set<AuthorityReconciliationTuningRecommendationCode>();
  const escalatedCount = countFor(input.budget_state_counts, "ESCALATED");
  const exhaustedCount = countFor(input.budget_state_counts, "EXHAUSTED");
  const confirmedCount = countFor(input.outcome_class_counts, "CONFIRMED");
  const rejectedCount = countFor(input.outcome_class_counts, "REJECTED");
  const terminalCount = confirmedCount + rejectedCount;
  const successRate = ratio(terminalCount, total);
  const ambiguityRatio = ratio(input.unresolved_ambiguity_count, total);
  const blockedRatio = ratio(input.blind_resend_blocked_count, total);
  const deadlineRatio = ratio(input.deadline_expiry_count, total);
  const exhaustedRatio = ratio(exhaustedCount, total);
  const escalatedRatio = ratio(escalatedCount, total);
  const replayResumeRatio = ratio(input.replay_resume_count, total);

  if (input.unresolved_ambiguity_count >= 2 && ambiguityRatio >= 0.2) {
    recommendations.add("REVIEW_PROVIDER_AMBIGUITY");
  }

  if (input.deadline_expiry_count >= 2 && deadlineRatio >= 0.2) {
    recommendations.add("INCREASE_DEADLINE_WINDOW");
  }

  if (
    exhaustedCount >= 2 &&
    exhaustedRatio >= 0.2 &&
    input.average_attempts_consumed >= Math.max(1, input.max_attempts_consumed * 0.75)
  ) {
    recommendations.add("INCREASE_AUTO_ATTEMPT_BUDGET");
  }

  if (escalatedCount >= 2 && escalatedRatio >= 0.3) {
    recommendations.add("REQUIRE_MANUAL_ESCALATION_EARLIER");
  }

  if (input.blind_resend_blocked_count >= 2 && blockedRatio >= 0.25 && deadlineRatio === 0) {
    recommendations.add("INCREASE_CADENCE_INTERVAL");
  }

  if (
    replayResumeRatio >= 0.35 &&
    successRate >= 0.6 &&
    ambiguityRatio < 0.2 &&
    escalatedRatio < 0.2
  ) {
    return ["NO_CHANGE_RECOMMENDED"];
  }

  if (total >= 8 && successRate >= 0.9 && input.average_attempts_consumed <= 0.5) {
    recommendations.add("DECREASE_AUTO_ATTEMPT_BUDGET");
  }

  if (total >= 8 && successRate >= 0.9 && deadlineRatio === 0 && escalatedRatio === 0) {
    recommendations.add("DECREASE_DEADLINE_WINDOW");
  }

  return recommendations.size === 0 ? ["NO_CHANGE_RECOMMENDED"] : sortedRecommendations(recommendations);
}
