import {
  earliestNullableInstant,
  halfLifeScore,
  hoursBetween,
  normalizeCollaborationRoutingProfile,
  normalizeNullableRoutingTimestamp,
  normalizeRoutingTimestamp,
  PRIORITY_BASE_BY_WORKFLOW_PRIORITY,
  requireFiniteNumber,
  requirePositive,
  requireRoutingString,
  requireUnit,
  type CollaborationRoutingAssigneeSignal,
  type CollaborationRoutingBasis,
  type CollaborationRoutingProfile,
  type CollaborationRoutingQueueMetrics,
  type CollaborationRoutingResolutionInputs,
} from "../models/collaboration_routing_contract.ts";
import { normalizeWorkflowItem, WorkflowModelError, type WorkflowItem } from "../models/workflow_item.ts";

function normalizeAssigneeSignal(signal: CollaborationRoutingAssigneeSignal) {
  return {
    assignee_ref: requireRoutingString("assignee_signal.assignee_ref", signal.assignee_ref),
    availability_fit: requireUnit("assignee_signal.availability_fit", signal.availability_fit),
    context_reuse: requireUnit("assignee_signal.context_reuse", signal.context_reuse),
    queue_affinity: requireUnit("assignee_signal.queue_affinity", signal.queue_affinity),
    skill_fit: requireUnit("assignee_signal.skill_fit", signal.skill_fit),
    staffed_capacity: requirePositive("assignee_signal.staffed_capacity", signal.staffed_capacity),
    weighted_open_item_load: requirePositive(
      "assignee_signal.weighted_open_item_load",
      signal.weighted_open_item_load,
    ),
  } satisfies CollaborationRoutingAssigneeSignal;
}

function normalizeQueueMetrics(metrics: CollaborationRoutingQueueMetrics) {
  return {
    arrival_rate_per_hour: requirePositive("queue_metrics.arrival_rate_per_hour", metrics.arrival_rate_per_hour),
    backlog_age_p90_hours: requirePositive("queue_metrics.backlog_age_p90_hours", metrics.backlog_age_p90_hours),
    mutating_command_attempts: requirePositive(
      "queue_metrics.mutating_command_attempts",
      metrics.mutating_command_attempts,
    ),
    queue_health_floor: Math.round(
      requireFiniteNumber("queue_metrics.queue_health_floor", metrics.queue_health_floor, { max: 100, min: 0 }),
    ),
    reassignments_30d: requirePositive("queue_metrics.reassignments_30d", metrics.reassignments_30d),
    rejected_stale_commands: requirePositive(
      "queue_metrics.rejected_stale_commands",
      metrics.rejected_stale_commands,
    ),
    resolution_target_hours: requirePositive("queue_metrics.resolution_target_hours", metrics.resolution_target_hours),
    resolved_30d: requirePositive("queue_metrics.resolved_30d", metrics.resolved_30d),
    service_rate_per_staff_hour: requirePositive(
      "queue_metrics.service_rate_per_staff_hour",
      metrics.service_rate_per_staff_hour,
    ),
    staffed_parallelism: requirePositive("queue_metrics.staffed_parallelism", metrics.staffed_parallelism),
  } satisfies CollaborationRoutingQueueMetrics;
}

function normalizeResolutionInputs(
  inputs: Partial<CollaborationRoutingResolutionInputs> = {},
): CollaborationRoutingResolutionInputs {
  const freshnessIntegrity = inputs.freshness_integrity ?? 1;
  if (![1, 0.6, 0.25].includes(freshnessIntegrity)) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      "resolution_inputs.freshness_integrity must be one of 1, 0.6, or 0.25",
    );
  }
  const laneIntegrity = inputs.lane_integrity ?? 1;
  if (![0, 1].includes(laneIntegrity)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "resolution_inputs.lane_integrity must be 0 or 1");
  }
  const nextActionClarity = inputs.next_action_clarity ?? 1;
  if (![0, 0.5, 1].includes(nextActionClarity)) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      "resolution_inputs.next_action_clarity must be 0, 0.5, or 1",
    );
  }
  const responseIntegrity = inputs.response_integrity ?? 1;
  if (![0, 1].includes(responseIntegrity)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "resolution_inputs.response_integrity must be 0 or 1");
  }
  return {
    evidence_readiness: requireUnit("resolution_inputs.evidence_readiness", inputs.evidence_readiness ?? 0.8),
    freshness_integrity: freshnessIntegrity,
    lane_integrity: laneIntegrity,
    next_action_clarity: nextActionClarity,
    response_integrity: responseIntegrity,
  };
}

export function buildCollaborationRoutingBasis(input: {
  active_command_pending?: boolean | undefined;
  active_draft_lock?: boolean | undefined;
  assignee_signals?: readonly CollaborationRoutingAssigneeSignal[] | undefined;
  evaluated_at: string;
  item: WorkflowItem;
  profile?: Partial<CollaborationRoutingProfile> | undefined;
  queue_metrics: CollaborationRoutingQueueMetrics;
  resolution_inputs?: Partial<CollaborationRoutingResolutionInputs> | undefined;
}) {
  const item = normalizeWorkflowItem(input.item);
  const profile = normalizeCollaborationRoutingProfile(input.profile);
  const evaluatedAt = normalizeRoutingTimestamp("evaluated_at", input.evaluated_at);
  const effectiveDueAt = earliestNullableInstant([item.sla_due_at, item.customer_due_at, item.due_at]);
  const waitingAgeHours = Math.max(0, hoursBetween(item.waiting_since_at, evaluatedAt));
  const itemAgeHours = Math.max(0, hoursBetween(item.queue_entered_at, evaluatedAt));
  const queueMetrics = normalizeQueueMetrics(input.queue_metrics);
  const assigneeSignals = [...(input.assignee_signals ?? [])]
    .map(normalizeAssigneeSignal)
    .sort((left, right) => left.assignee_ref.localeCompare(right.assignee_ref));

  return {
    active_command_pending: input.active_command_pending === true,
    active_draft_lock: input.active_draft_lock === true,
    assignee_signals: assigneeSignals,
    authority_wait_pressure:
      item.waiting_on_actor === "AUTHORITY"
        ? halfLifeScore(waitingAgeHours, profile.authority_wait_half_life_hours)
        : 0,
    current_assignee_ref: item.current_assignee_ref,
    customer_wait_pressure:
      item.waiting_on_actor === "CUSTOMER"
        ? halfLifeScore(waitingAgeHours, profile.customer_wait_half_life_hours)
        : 0,
    due_at: normalizeNullableRoutingTimestamp("due_at", item.due_at),
    effective_due_at_or_null: effectiveDueAt,
    escalation_target_ref: item.escalation_target_ref,
    item_age_hours: itemAgeHours,
    item_id: item.item_id,
    priority: item.priority,
    priority_base: PRIORITY_BASE_BY_WORKFLOW_PRIORITY[item.priority],
    queue_entered_at: item.queue_entered_at,
    queue_metrics: queueMetrics,
    reassignment_count_30d: item.reassignment_count_30d,
    resolution_inputs: normalizeResolutionInputs(input.resolution_inputs),
    routing_queue_ref: item.routing_queue_ref,
    staff_wait_pressure:
      item.waiting_on_actor === "STAFF"
        ? halfLifeScore(waitingAgeHours, profile.staff_wait_half_life_hours)
        : 0,
    type: item.type,
    waiting_age_hours: waitingAgeHours,
    waiting_on_actor: item.waiting_on_actor,
  } satisfies CollaborationRoutingBasis;
}
