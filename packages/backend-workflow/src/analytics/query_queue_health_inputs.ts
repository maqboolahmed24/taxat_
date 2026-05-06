import {
  deriveCollaborationRoutingProfileHash,
  DEFAULT_COLLABORATION_ROUTING_PROFILE,
} from "../models/collaboration_routing_contract.ts";
import {
  normalizeWorkflowItem,
  WORKFLOW_ITEM_ACTIVE_LIFECYCLE_STATES,
  type WorkflowItem,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import type { WorkQueueHealthFormulaInput } from "./compute_work_queue_health.ts";

export type QueueHealthInputCollectionRules = {
  accepted_window_rule: "COUNT_QUEUE_ENTERED_WITHIN_FROZEN_WINDOW";
  backlog_age_rule: "P90_ACTIVE_QUEUE_AGE_AT_EVALUATION_TIME";
  reassignment_churn_rule: "SUM_REASSIGNMENTS_30D_OVER_MAX_1_RESOLVED_30D";
  rolling_window_hours: number;
  service_rate_rule: "RESOLVED_WITHIN_WINDOW_PER_STAFFED_HOUR";
  stale_view_rule: "REJECTED_STALE_COMMANDS_OVER_MAX_1_MUTATING_ATTEMPTS";
  staffed_parallelism_rule: "EXPLICIT_OVERRIDE_OR_DISTINCT_ACTIVE_ASSIGNEES";
};

export type QueryQueueHealthInputsResult = WorkQueueHealthFormulaInput & {
  accepted_inbound_items_q: number;
  evaluated_at: string;
  input_collection_rules: QueueHealthInputCollectionRules;
  mutating_command_attempts_q: number;
  queue_route_key: string;
  rejected_stale_commands_q: number;
  reassignments_30d_q: number;
  resolved_30d_q: number;
  resolved_items_q: number;
  rolling_window_ended_at: string;
  rolling_window_started_at: string;
  routing_profile_hash: string;
  staffed_hours_q: number;
};

export type QueryQueueHealthInputsInput = {
  evaluated_at: string;
  items: readonly WorkflowItem[];
  mutating_command_attempts?: number | undefined;
  queue_health_floor?: number | undefined;
  queue_route_key: string;
  reassignment_count_30d?: number | undefined;
  rejected_stale_commands?: number | undefined;
  resolution_target_hours?: number | undefined;
  resolved_30d?: number | undefined;
  rolling_window_hours?: number | undefined;
  routing_profile_hash?: string | undefined;
  routing_queue_ref?: string | undefined;
  service_rate_per_staff_hour?: number | undefined;
  staffed_hours?: number | undefined;
  staffed_parallelism?: number | undefined;
};

function requireNonEmptyString(label: string, value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a non-empty string`);
  }
  return trimmed;
}

function requireNonNegative(label: string, value: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a finite non-negative number`);
  }
  return value;
}

function requirePositive(label: string, value: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a finite positive number`);
  }
  return value;
}

function inWindow(instant: string | null, startMs: number, endMs: number) {
  if (instant === null) {
    return false;
  }
  const value = Date.parse(instant);
  return Number.isFinite(value) && value >= startMs && value <= endMs;
}

function percentile90(values: readonly number[]) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(0.9 * sorted.length) - 1);
  return sorted[index]!;
}

function distinctActiveAssignees(items: readonly WorkflowItem[]) {
  return new Set(
    items
      .map((item) => item.current_assignee_ref)
      .filter((assigneeRef): assigneeRef is string => assigneeRef !== null),
  ).size;
}

export function queryQueueHealthInputs(input: QueryQueueHealthInputsInput): QueryQueueHealthInputsResult {
  const evaluatedAtMs = Date.parse(input.evaluated_at);
  if (!Number.isFinite(evaluatedAtMs)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "evaluated_at must be an ISO-8601 instant");
  }
  const rollingWindowHours = requirePositive("rolling_window_hours", input.rolling_window_hours ?? 24);
  const windowStartedMs = evaluatedAtMs - rollingWindowHours * 3_600_000;
  const queueRouteKey = requireNonEmptyString("queue_route_key", input.queue_route_key);
  const normalizedItems = input.items.map((item) => normalizeWorkflowItem(item));
  const routingQueueRef =
    input.routing_queue_ref ??
    normalizedItems.find((item) => item.routing_queue_ref.trim().length > 0)?.routing_queue_ref ??
    "queue://workflow/default";
  const queueItems = normalizedItems.filter((item) => item.routing_queue_ref === routingQueueRef);
  const activeLifecycleStates = new Set<string>(WORKFLOW_ITEM_ACTIVE_LIFECYCLE_STATES);
  const activeItems = queueItems.filter((item) => activeLifecycleStates.has(item.lifecycle_state));
  const acceptedInboundItems = queueItems.filter((item) =>
    inWindow(item.queue_entered_at, windowStartedMs, evaluatedAtMs),
  ).length;
  const resolvedItems = queueItems.filter(
    (item) =>
      (item.lifecycle_state === "DONE" || item.lifecycle_state === "CANCELLED") &&
      inWindow(item.closed_at, windowStartedMs, evaluatedAtMs),
  ).length;
  const resolved30dWindowStartMs = evaluatedAtMs - 30 * 24 * 3_600_000;
  const resolved30d =
    input.resolved_30d ??
    queueItems.filter(
      (item) =>
        (item.lifecycle_state === "DONE" || item.lifecycle_state === "CANCELLED") &&
        inWindow(item.closed_at, resolved30dWindowStartMs, evaluatedAtMs),
    ).length;
  const staffedParallelism = Math.floor(
    requireNonNegative(
      "staffed_parallelism",
      input.staffed_parallelism ?? distinctActiveAssignees(activeItems),
    ),
  );
  const staffedHours = requireNonNegative(
    "staffed_hours",
    input.staffed_hours ?? staffedParallelism * rollingWindowHours,
  );
  const serviceRate =
    input.service_rate_per_staff_hour ??
    (staffedHours === 0 ? 0 : resolvedItems / Math.max(1e-6, staffedHours));
  const reassignments30d =
    input.reassignment_count_30d ??
    activeItems.reduce((total, item) => total + item.reassignment_count_30d, 0);
  const mutatingCommandAttempts = Math.floor(
    requireNonNegative("mutating_command_attempts", input.mutating_command_attempts ?? 0),
  );
  const rejectedStaleCommands = Math.floor(
    requireNonNegative("rejected_stale_commands", input.rejected_stale_commands ?? 0),
  );
  const backlogAges = activeItems.map((item) =>
    Math.max(0, (evaluatedAtMs - Date.parse(item.queue_entered_at)) / 3_600_000),
  );

  return {
    accepted_inbound_items_q: acceptedInboundItems,
    arrival_rate_q: acceptedInboundItems / rollingWindowHours,
    backlog_age_p90_hours_q: percentile90(backlogAges),
    evaluated_at: new Date(evaluatedAtMs).toISOString(),
    input_collection_rules: {
      accepted_window_rule: "COUNT_QUEUE_ENTERED_WITHIN_FROZEN_WINDOW",
      backlog_age_rule: "P90_ACTIVE_QUEUE_AGE_AT_EVALUATION_TIME",
      reassignment_churn_rule: "SUM_REASSIGNMENTS_30D_OVER_MAX_1_RESOLVED_30D",
      rolling_window_hours: rollingWindowHours,
      service_rate_rule: "RESOLVED_WITHIN_WINDOW_PER_STAFFED_HOUR",
      staffed_parallelism_rule: "EXPLICIT_OVERRIDE_OR_DISTINCT_ACTIVE_ASSIGNEES",
      stale_view_rule: "REJECTED_STALE_COMMANDS_OVER_MAX_1_MUTATING_ATTEMPTS",
    },
    mutating_command_attempts_q: mutatingCommandAttempts,
    queue_health_floor: Math.round(requireNonNegative("queue_health_floor", input.queue_health_floor ?? 60)),
    queue_route_key: queueRouteKey,
    reassignment_churn_q: reassignments30d / Math.max(1, resolved30d),
    reassignments_30d_q: reassignments30d,
    rejected_stale_commands_q: rejectedStaleCommands,
    resolved_30d_q: resolved30d,
    resolved_items_q: resolvedItems,
    resolution_target_hours_q: requirePositive("resolution_target_hours", input.resolution_target_hours ?? 24),
    rolling_window_ended_at: new Date(evaluatedAtMs).toISOString(),
    rolling_window_started_at: new Date(windowStartedMs).toISOString(),
    routing_profile_hash:
      input.routing_profile_hash ?? deriveCollaborationRoutingProfileHash(DEFAULT_COLLABORATION_ROUTING_PROFILE),
    routing_queue_ref: requireNonEmptyString("routing_queue_ref", routingQueueRef),
    service_rate_q: requireNonNegative("service_rate_per_staff_hour", serviceRate),
    staffed_hours_q: staffedHours,
    staffed_parallelism_q: staffedParallelism,
    stale_view_rejection_rate_q: rejectedStaleCommands / Math.max(1, mutatingCommandAttempts),
  };
}
