import {
  clamp01,
  roundScore,
  type CollaborationRoutingBasis,
  type CollaborationRoutingProfile,
  type EscalationPressureResult,
  type OwnershipConfidenceResult,
  type SlaPressureResult,
} from "../models/collaboration_routing_contract.ts";

export function computeEscalationPressureScore(input: {
  basis: CollaborationRoutingBasis;
  ownership: OwnershipConfidenceResult;
  profile: CollaborationRoutingProfile;
  resolution_confidence_score: number;
  sla: SlaPressureResult;
}): EscalationPressureResult {
  const handoffChurn = clamp01(
    input.basis.reassignment_count_30d / Math.max(1, input.profile.reassignment_budget_30d),
  );
  const ownershipGap = 1 - clamp01(input.ownership.ownership_confidence_score / 100);
  const resolutionUncertainty = 1 - clamp01(input.resolution_confidence_score / 100);
  const raw = clamp01(
    0.35 * input.sla.sla_pressure_raw +
      0.2 * handoffChurn +
      0.2 * ownershipGap +
      0.15 * input.basis.authority_wait_pressure +
      0.1 * input.sla.age_pressure,
  );
  const escalationPressureScore = roundScore(100 * raw);
  const reasonCodes =
    escalationPressureScore >= input.profile.escalation_pressure_threshold
      ? ["WORK_ESCALATION_PRESSURE_HIGH"]
      : [];
  return {
    escalation_pressure_raw: raw,
    escalation_pressure_score: escalationPressureScore,
    escalation_rank: roundScore(
      100 * clamp01(0.6 * raw + 0.25 * input.sla.sla_pressure_raw + 0.15 * resolutionUncertainty),
    ),
    handoff_churn: handoffChurn,
    ownership_gap: ownershipGap,
    reason_codes: reasonCodes,
  };
}
