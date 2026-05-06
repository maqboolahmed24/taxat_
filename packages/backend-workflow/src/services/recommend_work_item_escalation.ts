import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AssignmentEfficiencyResult,
  type CollaborationRoutingBasis,
  type CollaborationRoutingProfile,
  type EscalationPressureResult,
  type ResolutionConfidenceResult,
} from "../models/collaboration_routing_contract.ts";
import type { WorkflowRoutingContract } from "../models/workflow_item.ts";
import type { WorkItemAssignmentRecommendation } from "./recommend_work_item_assignment.ts";

export type WorkItemEscalationRecommendation = {
  escalation_recommendation_state: WorkflowRoutingContract["escalation_recommendation_state"];
  reason_codes: string[];
  recommended_action_code_or_null: string | null;
  recommended_escalation_target_ref_or_null: string | null;
};

function defaultEscalationTargetRef(queueRef: string) {
  return `escalation-target://${stableJsonHash({ queue_ref: queueRef })}`;
}

export function recommendWorkItemEscalation(input: {
  assignment: AssignmentEfficiencyResult;
  assignment_recommendation: WorkItemAssignmentRecommendation;
  basis: CollaborationRoutingBasis;
  default_escalation_target_ref?: string | undefined;
  escalation: EscalationPressureResult;
  profile: CollaborationRoutingProfile;
  resolution: ResolutionConfidenceResult;
}): WorkItemEscalationRecommendation {
  if (input.basis.escalation_target_ref !== null) {
    return {
      escalation_recommendation_state: "ESCALATED_ACTIVE",
      reason_codes: ["ESCALATION_ACTIVE"],
      recommended_action_code_or_null: null,
      recommended_escalation_target_ref_or_null: input.basis.escalation_target_ref,
    };
  }

  const currentAssignmentIsWeak =
    input.basis.current_assignee_ref !== null &&
    input.assignment.best_candidate_ref_or_null !== null &&
    input.assignment.best_candidate_ref_or_null !== input.basis.current_assignee_ref &&
    input.assignment.current_assign_score * 100 < input.profile.ownership_confidence_floor &&
    input.assignment_recommendation.assignment_gain_score >= input.profile.reassignment_gain_threshold;

  if (input.escalation.escalation_pressure_score >= input.profile.escalation_pressure_threshold) {
    return {
      escalation_recommendation_state: "ESCALATE_RECOMMENDED",
      reason_codes: ["WORK_ESCALATION_PRESSURE_HIGH"],
      recommended_action_code_or_null: "ESCALATE_WORK_ITEM",
      recommended_escalation_target_ref_or_null:
        input.default_escalation_target_ref ?? defaultEscalationTargetRef(input.basis.routing_queue_ref),
    };
  }

  if (currentAssignmentIsWeak) {
    return {
      escalation_recommendation_state: "ESCALATE_RECOMMENDED",
      reason_codes: ["WORK_ASSIGNMENT_LOW_EFFICIENCY"],
      recommended_action_code_or_null: "ESCALATE_WORK_ITEM",
      recommended_escalation_target_ref_or_null:
        input.default_escalation_target_ref ?? defaultEscalationTargetRef(input.basis.routing_queue_ref),
    };
  }

  if (
    input.assignment_recommendation.assignment_recommendation_state === "NO_ELIGIBLE_OWNER" &&
    input.resolution.resolution_confidence_score < input.profile.resolution_confidence_floor
  ) {
    return {
      escalation_recommendation_state: "MANUAL_REVIEW_REQUIRED",
      reason_codes: ["WORK_ROUTING_MANUAL_REVIEW_REQUIRED"],
      recommended_action_code_or_null: "REVIEW_ROUTING",
      recommended_escalation_target_ref_or_null: null,
    };
  }

  return {
    escalation_recommendation_state: "NO_ESCALATION",
    reason_codes: [],
    recommended_action_code_or_null: null,
    recommended_escalation_target_ref_or_null: null,
  };
}
