import {
  roundScore,
  type AssignmentEfficiencyResult,
  type CollaborationRoutingBasis,
  type CollaborationRoutingProfile,
  type OwnershipConfidenceResult,
} from "../models/collaboration_routing_contract.ts";
import type { WorkflowRoutingContract } from "../models/workflow_item.ts";

export type WorkItemAssignmentRecommendation = {
  assignment_gain_score: number;
  assignment_recommendation_state: WorkflowRoutingContract["assignment_recommendation_state"];
  draft_safety_state: WorkflowRoutingContract["draft_safety_state"];
  reason_codes: string[];
  recommended_action_code_or_null: string | null;
  recommended_assignee_ref_or_null: string | null;
};

function deriveDraftSafetyState(
  basis: Pick<CollaborationRoutingBasis, "active_command_pending" | "active_draft_lock">,
): WorkflowRoutingContract["draft_safety_state"] {
  if (basis.active_command_pending) {
    return "COMMAND_PENDING_PREVENTS_TRANSFER";
  }
  if (basis.active_draft_lock) {
    return "DRAFT_LOCK_PREVENTS_TRANSFER";
  }
  return "NO_DRAFT_LOCK";
}

export function recommendWorkItemAssignment(input: {
  assignment: AssignmentEfficiencyResult;
  basis: CollaborationRoutingBasis;
  ownership: OwnershipConfidenceResult;
  profile: CollaborationRoutingProfile;
}): WorkItemAssignmentRecommendation {
  const draftSafetyState = deriveDraftSafetyState(input.basis);
  const bestAssignee = input.assignment.best_candidate_ref_or_null;
  const gain = Math.max(0, input.assignment.best_assign_score - input.assignment.current_assign_score);
  const gainScore = roundScore(100 * gain);
  const reasonCodes = [...input.ownership.reason_codes];

  if (draftSafetyState !== "NO_DRAFT_LOCK") {
    reasonCodes.push(draftSafetyState);
  }

  if (bestAssignee === null) {
    reasonCodes.push("NO_ELIGIBLE_OWNER");
    return {
      assignment_gain_score: gainScore,
      assignment_recommendation_state: "NO_ELIGIBLE_OWNER",
      draft_safety_state: draftSafetyState,
      reason_codes: reasonCodes,
      recommended_action_code_or_null: "REVIEW_ROUTING",
      recommended_assignee_ref_or_null: null,
    };
  }

  if (input.basis.current_assignee_ref === null) {
    reasonCodes.push("NO_CURRENT_OWNER", "WORK_ASSIGNMENT_RECOMMENDED");
    return {
      assignment_gain_score: gainScore,
      assignment_recommendation_state: "ASSIGN_RECOMMENDED",
      draft_safety_state: draftSafetyState,
      reason_codes: reasonCodes,
      recommended_action_code_or_null: "ASSIGN_OWNER",
      recommended_assignee_ref_or_null: bestAssignee,
    };
  }

  if (
    bestAssignee !== input.basis.current_assignee_ref &&
    gain >= input.profile.reassignment_gain_threshold / 100
  ) {
    reasonCodes.push("WORK_ASSIGNMENT_LOW_EFFICIENCY");
    return {
      assignment_gain_score: gainScore,
      assignment_recommendation_state: "REASSIGN_RECOMMENDED",
      draft_safety_state: draftSafetyState,
      reason_codes: reasonCodes,
      recommended_action_code_or_null: "REASSIGN_OWNER",
      recommended_assignee_ref_or_null: bestAssignee,
    };
  }

  return {
    assignment_gain_score: gainScore,
    assignment_recommendation_state: "KEEP_CURRENT_OWNER",
    draft_safety_state: draftSafetyState,
    reason_codes: reasonCodes,
    recommended_action_code_or_null: null,
    recommended_assignee_ref_or_null: null,
  };
}
