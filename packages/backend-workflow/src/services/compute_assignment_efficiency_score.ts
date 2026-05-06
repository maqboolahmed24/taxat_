import {
  clamp01,
  safeUnit,
  type AssignmentEfficiencyResult,
  type CollaborationRoutingBasis,
} from "../models/collaboration_routing_contract.ts";

function candidateEfficiency(input: {
  availability_fit: number;
  context_reuse: number;
  queue_affinity: number;
  skill_fit: number;
  staffed_capacity: number;
  weighted_open_item_load: number;
}) {
  const loadRatio = input.weighted_open_item_load / Math.max(1e-6, input.staffed_capacity);
  const capacityFit = Math.exp(-Math.max(0, loadRatio - 1));
  return clamp01(
    Math.exp(
      0.35 * Math.log(safeUnit(input.skill_fit)) +
        0.25 * Math.log(safeUnit(capacityFit)) +
        0.2 * Math.log(safeUnit(input.context_reuse)) +
        0.1 * Math.log(safeUnit(input.queue_affinity)) +
        0.1 * Math.log(safeUnit(input.availability_fit)),
    ),
  );
}

export function computeAssignmentEfficiencyScore(input: {
  basis: CollaborationRoutingBasis;
}): AssignmentEfficiencyResult {
  const candidates = input.basis.assignee_signals
    .map((signal) => ({
      ...signal,
      assignment_efficiency: candidateEfficiency(signal),
    }))
    .sort(
      (left, right) =>
        right.assignment_efficiency - left.assignment_efficiency ||
        left.assignee_ref.localeCompare(right.assignee_ref),
    );

  const best = candidates[0] ?? null;
  const second = candidates[1] ?? null;
  const current = candidates.find((candidate) => candidate.assignee_ref === input.basis.current_assignee_ref);
  return {
    best_assign_score: best?.assignment_efficiency ?? 0,
    best_candidate_ref_or_null: best?.assignee_ref ?? null,
    candidates,
    current_assign_score: input.basis.current_assignee_ref === null ? 0 : (current?.assignment_efficiency ?? 0),
    second_best_assign_score: second?.assignment_efficiency ?? 0,
  };
}
