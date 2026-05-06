import {
  clamp01,
  deriveCollaborationRoutingBasisSnapshotHash,
  deriveCollaborationRoutingProfileHash,
  normalizeCollaborationRoutingProfile,
  normalizeRoutingTimestamp,
  roundScore,
  safeUnit,
  type CollaborationRoutingAssigneeSignal,
  type CollaborationRoutingBasis,
  type CollaborationRoutingBuildResult,
  type CollaborationRoutingProfile,
  type CollaborationRoutingQueueMetrics,
  type CollaborationRoutingResolutionInputs,
  type ResolutionConfidenceResult,
} from "../models/collaboration_routing_contract.ts";
import {
  deriveWorkflowRoutingContractHash,
  normalizeWorkflowRoutingContract,
  type WorkflowItem,
  type WorkflowRoutingContract,
} from "../models/workflow_item.ts";
import { buildCollaborationRoutingBasis } from "./build_collaboration_routing_basis.ts";
import { computeAssignmentEfficiencyScore } from "./compute_assignment_efficiency_score.ts";
import { computeCollaborationPriorityScore } from "./compute_collaboration_priority_score.ts";
import { computeEscalationPressureScore } from "./compute_escalation_pressure_score.ts";
import { computeOwnershipConfidenceScore } from "./compute_ownership_confidence_score.ts";
import { computeQueueHealthSignal } from "./compute_queue_health_signal.ts";
import { computeSlaPressureScore } from "./compute_sla_pressure_score.ts";
import { recommendWorkItemAssignment } from "./recommend_work_item_assignment.ts";
import { recommendWorkItemEscalation } from "./recommend_work_item_escalation.ts";

export type BuildCollaborationRoutingContractInput = {
  active_command_pending?: boolean | undefined;
  active_draft_lock?: boolean | undefined;
  assignee_signals?: readonly CollaborationRoutingAssigneeSignal[] | undefined;
  basis?: CollaborationRoutingBasis | undefined;
  default_escalation_target_ref?: string | undefined;
  evaluated_at: string;
  item?: WorkflowItem | undefined;
  profile?: Partial<CollaborationRoutingProfile> | undefined;
  queue_metrics?: CollaborationRoutingQueueMetrics | undefined;
  resolution_inputs?: Partial<CollaborationRoutingResolutionInputs> | undefined;
};

function uniqueReasonCodes(codes: readonly (string | null | undefined)[], maxItems = 6) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const code of codes) {
    if (code === null || code === undefined || code.trim() === "" || seen.has(code)) {
      continue;
    }
    seen.add(code);
    result.push(code);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result.sort();
}

function computeResolutionConfidenceScore(input: {
  basis: CollaborationRoutingBasis;
  ownership_confidence_score: number;
  profile: CollaborationRoutingProfile;
}): ResolutionConfidenceResult {
  const resolutionInputs = input.basis.resolution_inputs;
  const ownershipIntegrity = clamp01(input.ownership_confidence_score / 100);
  const raw =
    100 *
    Math.exp(
      0.25 * Math.log(safeUnit(ownershipIntegrity)) +
        0.2 * Math.log(safeUnit(resolutionInputs.evidence_readiness)) +
        0.15 * Math.log(safeUnit(resolutionInputs.next_action_clarity)) +
        0.15 * Math.log(safeUnit(resolutionInputs.response_integrity)) +
        0.15 * Math.log(safeUnit(resolutionInputs.lane_integrity)) +
        0.1 * Math.log(safeUnit(resolutionInputs.freshness_integrity)),
    );
  const caps: number[] = [];
  const reasonCodes: string[] = [];
  if (resolutionInputs.response_integrity === 0 || resolutionInputs.lane_integrity === 0) {
    caps.push(39);
    reasonCodes.push("WORK_RESPONSE_GUARD_STALE");
  } else if (resolutionInputs.next_action_clarity === 0) {
    caps.push(49);
    reasonCodes.push("WORK_NEXT_ACTION_UNCLEAR");
  } else if (input.basis.current_assignee_ref === null) {
    caps.push(69);
    reasonCodes.push("NO_CURRENT_OWNER");
  }

  const uncappedScore = roundScore(raw);
  const resolutionConfidenceScore = Math.min(uncappedScore, ...caps, 100);
  if (resolutionConfidenceScore < input.profile.resolution_confidence_floor) {
    reasonCodes.push("WORK_RESOLUTION_CONFIDENCE_LOW");
  }

  return {
    reason_codes: reasonCodes,
    resolution_confidence_raw: raw,
    resolution_confidence_score: resolutionConfidenceScore,
    resolution_uncertainty: 1 - clamp01(resolutionConfidenceScore / 100),
  };
}

function resolveBasis(input: BuildCollaborationRoutingContractInput, profile: CollaborationRoutingProfile) {
  if (input.basis !== undefined) {
    return input.basis;
  }
  if (input.item === undefined || input.queue_metrics === undefined) {
    throw new Error("buildCollaborationRoutingContract requires either basis or item plus queue_metrics");
  }
  return buildCollaborationRoutingBasis({
    active_command_pending: input.active_command_pending,
    active_draft_lock: input.active_draft_lock,
    assignee_signals: input.assignee_signals,
    evaluated_at: input.evaluated_at,
    item: input.item,
    profile,
    queue_metrics: input.queue_metrics,
    resolution_inputs: input.resolution_inputs,
  });
}

export function buildCollaborationRoutingContract(
  input: BuildCollaborationRoutingContractInput,
): CollaborationRoutingBuildResult {
  const profile = normalizeCollaborationRoutingProfile(input.profile);
  const evaluatedAt = normalizeRoutingTimestamp("evaluated_at", input.evaluated_at);
  const routingProfileHash = deriveCollaborationRoutingProfileHash(profile);
  const basis = resolveBasis(input, profile);
  const assignmentEfficiency = computeAssignmentEfficiencyScore({ basis });
  const ownership = computeOwnershipConfidenceScore({
    assignment: assignmentEfficiency,
    basis,
    profile,
  });
  const sla = computeSlaPressureScore({ basis, evaluated_at: evaluatedAt, profile });
  const resolution = computeResolutionConfidenceScore({
    basis,
    ownership_confidence_score: ownership.ownership_confidence_score,
    profile,
  });
  const escalation = computeEscalationPressureScore({
    basis,
    ownership,
    profile,
    resolution_confidence_score: resolution.resolution_confidence_score,
    sla,
  });
  const queueHealth = computeQueueHealthSignal({ basis });
  const priority = computeCollaborationPriorityScore({
    basis,
    escalation,
    queue_health: queueHealth,
    resolution_confidence_score: resolution.resolution_confidence_score,
    sla,
  });
  const assignmentRecommendation = recommendWorkItemAssignment({
    assignment: assignmentEfficiency,
    basis,
    ownership,
    profile,
  });
  const escalationRecommendation = recommendWorkItemEscalation({
    assignment: assignmentEfficiency,
    assignment_recommendation: assignmentRecommendation,
    basis,
    default_escalation_target_ref: input.default_escalation_target_ref,
    escalation,
    profile,
    resolution,
  });
  const recommendedAction =
    assignmentRecommendation.recommended_action_code_or_null ??
    escalationRecommendation.recommended_action_code_or_null;
  const recommendationReasonCodes = uniqueReasonCodes([
    ...assignmentRecommendation.reason_codes,
    ...escalationRecommendation.reason_codes,
    ...resolution.reason_codes,
  ]);
  const orderingReasonCodes = uniqueReasonCodes([
    ...priority.reason_codes,
    ...sla.reason_codes,
    ...queueHealth.reason_codes,
  ]);

  const draft: WorkflowRoutingContract = {
    assignment_efficiency_score: ownership.assignment_efficiency_score,
    assignment_recommendation_state: assignmentRecommendation.assignment_recommendation_state,
    basis_hash: "",
    canonical_sort_key: {
      collaboration_priority_score: priority.collaboration_priority_score,
      effective_due_at_or_null: basis.effective_due_at_or_null,
      escalation_rank: escalation.escalation_rank,
      item_id: basis.item_id,
      queue_entered_at: basis.queue_entered_at,
      resolution_confidence_score: resolution.resolution_confidence_score,
    },
    collaboration_priority_score: priority.collaboration_priority_score,
    contract_version: "COLLABORATION_ROUTING_V1",
    draft_safety_state: assignmentRecommendation.draft_safety_state,
    escalation_pressure_score: escalation.escalation_pressure_score,
    escalation_pressure_threshold: profile.escalation_pressure_threshold,
    escalation_rank: escalation.escalation_rank,
    escalation_recommendation_state: escalationRecommendation.escalation_recommendation_state,
    focused_row_reorder_state: "APPLY_IMMEDIATELY",
    ordering_reason_codes: orderingReasonCodes,
    ownership_confidence_score: ownership.ownership_confidence_score,
    queue_health_floor: basis.queue_metrics.queue_health_floor,
    queue_health_score: queueHealth.queue_health_score,
    queue_health_state: queueHealth.queue_health_state,
    queue_pressure_score: queueHealth.queue_pressure_score,
    reassignment_gain_threshold: profile.reassignment_gain_threshold,
    recommendation_reason_codes: recommendationReasonCodes,
    recommended_action_code_or_null: recommendedAction,
    recommended_assignee_ref_or_null: assignmentRecommendation.recommended_assignee_ref_or_null,
    recommended_escalation_target_ref_or_null:
      escalationRecommendation.recommended_escalation_target_ref_or_null,
    resolution_confidence_floor: profile.resolution_confidence_floor,
    resolution_confidence_score: resolution.resolution_confidence_score,
    routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1",
    routing_profile_hash: routingProfileHash,
    routing_queue_ref: basis.routing_queue_ref,
    routing_scope: "WORKFLOW_ITEM",
    sla_pressure_score: sla.sla_pressure_score,
  };
  const contract = normalizeWorkflowRoutingContract({
    ...draft,
    basis_hash: deriveWorkflowRoutingContractHash(draft),
  });

  return {
    assignment: ownership,
    basis,
    basis_snapshot_hash: deriveCollaborationRoutingBasisSnapshotHash({
      basis,
      profile,
      routing_profile_hash: routingProfileHash,
    }),
    contract,
    escalation,
    priority,
    queue_health: queueHealth,
    resolution,
    routing_profile_hash: routingProfileHash,
    sla,
  };
}
