import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  deriveWorkflowRoutingContractHash,
  normalizeWorkflowRoutingContract,
  type WorkflowItem,
  type WorkflowItemPriority,
  type WorkflowRoutingContract,
  type WorkflowWaitingOnActor,
  WorkflowModelError,
} from "./workflow_item.ts";

export type CollaborationRoutingContract = WorkflowRoutingContract;
export type CollaborationRoutingQueueHealthState = WorkflowRoutingContract["queue_health_state"];
export type CollaborationAssignmentRecommendationState =
  WorkflowRoutingContract["assignment_recommendation_state"];
export type CollaborationEscalationRecommendationState =
  WorkflowRoutingContract["escalation_recommendation_state"];
export type CollaborationRoutingDraftSafetyState = WorkflowRoutingContract["draft_safety_state"];

export type CollaborationRoutingProfile = {
  authority_wait_half_life_hours: number;
  breach_half_life_hours: number;
  customer_wait_half_life_hours: number;
  due_soon_smoothing_hours: number;
  due_soon_window_hours: number;
  escalation_pressure_threshold: number;
  item_age_half_life_hours: number;
  ownership_confidence_floor: number;
  profile_version: string;
  reassignment_budget_30d: number;
  reassignment_gain_threshold: number;
  resolution_confidence_floor: number;
  routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1";
  staff_wait_half_life_hours: number;
};

export type CollaborationRoutingAssigneeSignal = {
  assignee_ref: string;
  availability_fit: number;
  context_reuse: number;
  queue_affinity: number;
  skill_fit: number;
  staffed_capacity: number;
  weighted_open_item_load: number;
};

export type CollaborationRoutingQueueMetrics = {
  arrival_rate_per_hour: number;
  backlog_age_p90_hours: number;
  mutating_command_attempts: number;
  queue_health_floor: number;
  reassignments_30d: number;
  rejected_stale_commands: number;
  resolution_target_hours: number;
  resolved_30d: number;
  service_rate_per_staff_hour: number;
  staffed_parallelism: number;
};

export type CollaborationRoutingResolutionInputs = {
  evidence_readiness: number;
  freshness_integrity: 1 | 0.6 | 0.25;
  lane_integrity: 0 | 1;
  next_action_clarity: 0 | 0.5 | 1;
  response_integrity: 0 | 1;
};

export type CollaborationRoutingBasis = {
  active_command_pending: boolean;
  active_draft_lock: boolean;
  assignee_signals: CollaborationRoutingAssigneeSignal[];
  authority_wait_pressure: number;
  current_assignee_ref: string | null;
  customer_wait_pressure: number;
  due_at: string | null;
  effective_due_at_or_null: string | null;
  escalation_target_ref: string | null;
  item_age_hours: number;
  item_id: string;
  priority: WorkflowItemPriority;
  priority_base: number;
  queue_entered_at: string;
  queue_metrics: CollaborationRoutingQueueMetrics;
  reassignment_count_30d: number;
  resolution_inputs: CollaborationRoutingResolutionInputs;
  routing_queue_ref: string;
  staff_wait_pressure: number;
  type: string;
  waiting_age_hours: number;
  waiting_on_actor: WorkflowWaitingOnActor;
};

export type AssignmentEfficiencyCandidate = CollaborationRoutingAssigneeSignal & {
  assignment_efficiency: number;
};

export type AssignmentEfficiencyResult = {
  best_assign_score: number;
  best_candidate_ref_or_null: string | null;
  candidates: AssignmentEfficiencyCandidate[];
  current_assign_score: number;
  second_best_assign_score: number;
};

export type OwnershipConfidenceResult = {
  assignment_efficiency_score: number;
  assignment_margin: number;
  ownership_confidence_raw: number;
  ownership_confidence_score: number;
  reason_codes: string[];
};

export type SlaPressureResult = {
  age_pressure: number;
  breach_signal: number;
  due_soon_signal: number;
  remaining_hours: number | null;
  sla_pressure_raw: number;
  sla_pressure_score: number;
  reason_codes: string[];
};

export type EscalationPressureResult = {
  escalation_pressure_raw: number;
  escalation_pressure_score: number;
  escalation_rank: number;
  handoff_churn: number;
  ownership_gap: number;
  reason_codes: string[];
};

export type QueueHealthSignal = {
  basis_hash: string;
  expected_wait_hours: number | null;
  queue_health_score: number;
  queue_health_state: CollaborationRoutingQueueHealthState;
  queue_pressure_score: number;
  reason_codes: string[];
  wait_probability: number;
};

export type CollaborationPriorityResult = {
  collaboration_priority_score: number;
  collaboration_priority_signal: number;
  queue_pressure: number;
  reason_codes: string[];
};

export type ResolutionConfidenceResult = {
  reason_codes: string[];
  resolution_confidence_raw: number;
  resolution_confidence_score: number;
  resolution_uncertainty: number;
};

export type CollaborationRoutingBuildResult = {
  assignment: OwnershipConfidenceResult;
  basis: CollaborationRoutingBasis;
  basis_snapshot_hash: string;
  contract: CollaborationRoutingContract;
  escalation: EscalationPressureResult;
  priority: CollaborationPriorityResult;
  queue_health: QueueHealthSignal;
  resolution: ResolutionConfidenceResult;
  routing_profile_hash: string;
  sla: SlaPressureResult;
};

export const DEFAULT_COLLABORATION_ROUTING_PROFILE: CollaborationRoutingProfile = {
  authority_wait_half_life_hours: 12,
  breach_half_life_hours: 4,
  customer_wait_half_life_hours: 8,
  due_soon_smoothing_hours: 6,
  due_soon_window_hours: 24,
  escalation_pressure_threshold: 70,
  item_age_half_life_hours: 72,
  ownership_confidence_floor: 45,
  profile_version: "COLLABORATION_ROUTING_FORMULA_V1_DEFAULT_2026_04_29",
  reassignment_budget_30d: 3,
  reassignment_gain_threshold: 25,
  resolution_confidence_floor: 50,
  routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1",
  staff_wait_half_life_hours: 24,
};

export const PRIORITY_BASE_BY_WORKFLOW_PRIORITY: Record<WorkflowItemPriority, number> = {
  CRITICAL: 1,
  HIGH: 0.6,
  LOW: 0.15,
  NORMAL: 0.35,
  URGENT: 0.8,
};

export function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return value > 0 ? 1 : 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function roundScore(value: number) {
  if (!Number.isFinite(value)) {
    return value > 0 ? 100 : 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function safeUnit(value: number) {
  return Math.max(1e-6, clamp01(value));
}

export function halfLifeScore(hours: number, halfLifeHours: number) {
  return clamp01(1 - Math.exp(-Math.max(0, hours) / Math.max(1, halfLifeHours)));
}

export function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

export function requireFiniteNumber(label: string, value: unknown, options: {
  max?: number;
  min?: number;
} = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a finite number`);
  }
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  if (value < min || value > max) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be between ${min} and ${max}`);
  }
  return value;
}

export function requireUnit(label: string, value: unknown) {
  return requireFiniteNumber(label, value, { max: 1, min: 0 });
}

export function requirePositive(label: string, value: unknown) {
  return requireFiniteNumber(label, value, { min: 0 });
}

export function requireRoutingString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

export function normalizeRoutingTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be an ISO-8601 instant`,
    );
  }
}

export function normalizeNullableRoutingTimestamp(label: string, value: unknown) {
  return value == null ? null : normalizeRoutingTimestamp(label, value);
}

export function hoursBetween(start: string, end: string) {
  return (Date.parse(end) - Date.parse(start)) / 3_600_000;
}

export function earliestNullableInstant(values: readonly (string | null)[]) {
  const normalized = values
    .filter((value): value is string => value !== null)
    .map((value) => normalizeRoutingTimestamp("effective_due_at", value))
    .sort();
  return normalized[0] ?? null;
}

export function deriveCollaborationRoutingProfileHash(
  profile: CollaborationRoutingProfile = DEFAULT_COLLABORATION_ROUTING_PROFILE,
) {
  return stableJsonHash({
    authority_wait_half_life_hours: profile.authority_wait_half_life_hours,
    breach_half_life_hours: profile.breach_half_life_hours,
    customer_wait_half_life_hours: profile.customer_wait_half_life_hours,
    due_soon_smoothing_hours: profile.due_soon_smoothing_hours,
    due_soon_window_hours: profile.due_soon_window_hours,
    escalation_pressure_threshold: profile.escalation_pressure_threshold,
    item_age_half_life_hours: profile.item_age_half_life_hours,
    ownership_confidence_floor: profile.ownership_confidence_floor,
    profile_version: profile.profile_version,
    reassignment_budget_30d: profile.reassignment_budget_30d,
    reassignment_gain_threshold: profile.reassignment_gain_threshold,
    resolution_confidence_floor: profile.resolution_confidence_floor,
    routing_profile_code: profile.routing_profile_code,
    staff_wait_half_life_hours: profile.staff_wait_half_life_hours,
  });
}

export function deriveCollaborationRoutingBasisSnapshotHash(input: {
  basis: CollaborationRoutingBasis;
  profile: CollaborationRoutingProfile;
  routing_profile_hash: string;
}) {
  return stableJsonHash({
    basis: input.basis,
    profile: input.profile,
    routing_profile_hash: input.routing_profile_hash,
  });
}

export function normalizeCollaborationRoutingProfile(
  profile: Partial<CollaborationRoutingProfile> = {},
) {
  const merged = {
    ...DEFAULT_COLLABORATION_ROUTING_PROFILE,
    ...profile,
    routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1" as const,
  };
  return {
    authority_wait_half_life_hours: requirePositive(
      "routing_profile.authority_wait_half_life_hours",
      merged.authority_wait_half_life_hours,
    ),
    breach_half_life_hours: requirePositive("routing_profile.breach_half_life_hours", merged.breach_half_life_hours),
    customer_wait_half_life_hours: requirePositive(
      "routing_profile.customer_wait_half_life_hours",
      merged.customer_wait_half_life_hours,
    ),
    due_soon_smoothing_hours: requirePositive(
      "routing_profile.due_soon_smoothing_hours",
      merged.due_soon_smoothing_hours,
    ),
    due_soon_window_hours: requirePositive("routing_profile.due_soon_window_hours", merged.due_soon_window_hours),
    escalation_pressure_threshold: roundScore(merged.escalation_pressure_threshold),
    item_age_half_life_hours: requirePositive("routing_profile.item_age_half_life_hours", merged.item_age_half_life_hours),
    ownership_confidence_floor: roundScore(merged.ownership_confidence_floor),
    profile_version: requireRoutingString("routing_profile.profile_version", merged.profile_version),
    reassignment_budget_30d: requirePositive("routing_profile.reassignment_budget_30d", merged.reassignment_budget_30d),
    reassignment_gain_threshold: roundScore(merged.reassignment_gain_threshold),
    resolution_confidence_floor: roundScore(merged.resolution_confidence_floor),
    routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1" as const,
    staff_wait_half_life_hours: requirePositive("routing_profile.staff_wait_half_life_hours", merged.staff_wait_half_life_hours),
  } satisfies CollaborationRoutingProfile;
}

export function assertValidCollaborationRoutingContract(contract: CollaborationRoutingContract) {
  const normalized = normalizeWorkflowRoutingContract(contract);
  const expectedHash = deriveWorkflowRoutingContractHash(normalized);
  if (normalized.basis_hash !== expectedHash) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "collaboration routing contract basis_hash must equal the canonical contract hash",
    );
  }
  return normalized;
}

export function projectRoutingFieldsToWorkflowItem(
  item: WorkflowItem,
  contract: CollaborationRoutingContract,
) {
  const normalized = assertValidCollaborationRoutingContract(contract);
  return {
    ...item,
    assignment_efficiency_score: normalized.assignment_efficiency_score,
    collaboration_priority_score: normalized.collaboration_priority_score,
    escalation_pressure_score: normalized.escalation_pressure_score,
    ownership_confidence_score: normalized.ownership_confidence_score,
    resolution_confidence_score: normalized.resolution_confidence_score,
    routing_contract: normalized,
    sla_pressure_score: normalized.sla_pressure_score,
  };
}
