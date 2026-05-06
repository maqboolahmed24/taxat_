import {
  clamp01,
  roundScore,
  type AssignmentEfficiencyResult,
  type CollaborationRoutingBasis,
  type CollaborationRoutingProfile,
  type OwnershipConfidenceResult,
} from "../models/collaboration_routing_contract.ts";

export function computeOwnershipConfidenceScore(input: {
  assignment: AssignmentEfficiencyResult;
  basis: CollaborationRoutingBasis;
  profile: CollaborationRoutingProfile;
}): OwnershipConfidenceResult {
  const assignmentMargin = Math.max(
    0,
    input.assignment.best_assign_score - input.assignment.second_best_assign_score,
  );
  const selectedScore =
    input.basis.current_assignee_ref === null
      ? input.assignment.best_assign_score
      : input.assignment.current_assign_score;
  const assignmentEfficiencyScore = roundScore(100 * selectedScore);
  const raw = clamp01(0.7 * input.assignment.best_assign_score + 0.3 * assignmentMargin);
  const ownershipConfidenceScore = roundScore(100 * raw);
  const reasonCodes: string[] = [];
  if (input.basis.assignee_signals.length === 0) {
    reasonCodes.push("WORK_OWNERSHIP_AMBIGUOUS", "NO_ELIGIBLE_OWNER");
  } else if (ownershipConfidenceScore < input.profile.ownership_confidence_floor) {
    reasonCodes.push("WORK_OWNERSHIP_AMBIGUOUS");
  }
  return {
    assignment_efficiency_score: assignmentEfficiencyScore,
    assignment_margin: assignmentMargin,
    ownership_confidence_raw: raw,
    ownership_confidence_score: ownershipConfidenceScore,
    reason_codes: reasonCodes,
  };
}
