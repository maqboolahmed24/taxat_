import {
  assertWorkflowItemMutable,
  buildWorkflowItemStateTransitionContract,
  buildWorkflowRoutingContract,
  cloneWorkflowRecord,
  deriveWorkflowCustomerStatusProjection,
  isWorkflowAuthorityTruthUnresolvedOrExternal,
  isWorkflowAuthorityTruthWaiting,
  normalizeWorkflowItem,
  type WorkflowAuthorityTruthState,
  type WorkflowDueState,
  type WorkflowItem,
  type WorkflowItemLifecycleState,
  type WorkflowWaitingOnActor,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import {
  assertWorkflowItemTransition,
  type WorkflowTransitionAlias,
} from "./validate_workflow_item_transition.ts";
import { bumpWorkflowWorkspaceVersions } from "./bump_workflow_workspace_versions.ts";

function waitingActorForTargetState(
  targetState: WorkflowItemLifecycleState,
  fallback: WorkflowWaitingOnActor,
): WorkflowWaitingOnActor {
  switch (targetState) {
    case "OPEN":
    case "DONE":
    case "CANCELLED":
    case "STALE":
      return "NONE";
    case "IN_PROGRESS":
      return "STAFF";
    case "WAITING_ON_CLIENT":
      return "CUSTOMER";
    case "WAITING_ON_AUTHORITY":
      return "AUTHORITY";
    case "BLOCKED":
      return fallback === "SYSTEM" ? "SYSTEM" : "STAFF";
  }
}

function rebuildRoutingContract(item: WorkflowItem) {
  return buildWorkflowRoutingContract({
    assignment_efficiency_score: item.assignment_efficiency_score,
    collaboration_priority_score: item.collaboration_priority_score,
    current_assignee_ref: item.current_assignee_ref,
    customer_due_at: item.customer_due_at,
    due_at: item.due_at,
    escalation_pressure_score: item.escalation_pressure_score,
    escalation_target_ref: item.escalation_target_ref,
    item_id: item.item_id,
    ownership_confidence_score: item.ownership_confidence_score,
    queue_entered_at: item.queue_entered_at,
    resolution_confidence_score: item.resolution_confidence_score,
    routing_queue_ref: item.routing_queue_ref,
    sla_due_at: item.sla_due_at,
    sla_pressure_score: item.sla_pressure_score,
  });
}

export function advanceWorkflowItem(input: {
  active_request_info_ref?: string | null | undefined;
  authority_truth_state?: WorkflowAuthorityTruthState | undefined;
  customer_due_at?: string | null | undefined;
  due_at?: string | null | undefined;
  due_state?: WorkflowDueState | undefined;
  expected_customer_workspace_version?: number | undefined;
  expected_staff_workspace_version?: number | undefined;
  item: WorkflowItem;
  last_internal_event_ref?: string | undefined;
  target_request_info_ref?: string | undefined;
  to_state: WorkflowItemLifecycleState;
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_event_code: WorkflowTransitionAlias;
}) {
  const item = normalizeWorkflowItem(input.item);
  assertWorkflowItemMutable(item);
  const transitionEventCode = assertWorkflowItemTransition({
    item,
    to_state: input.to_state,
    transition_event_code: input.transition_event_code,
  });

  if (
    item.lifecycle_state === "WAITING_ON_CLIENT" &&
    transitionEventCode === "client_response" &&
    input.target_request_info_ref !== item.active_request_info_ref
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "client_response must target the exact active_request_info_ref",
    );
  }

  const previousProjection = item.customer_status_projection;
  const previousWaitingActor = item.waiting_on_actor;
  const next = cloneWorkflowRecord(item);
  next.lifecycle_state = input.to_state;
  next.state_transition_contract = buildWorkflowItemStateTransitionContract({
    current_state: input.to_state,
    previous_state_or_null: item.lifecycle_state,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    transition_event_code: transitionEventCode,
  });
  next.waiting_on_actor = waitingActorForTargetState(input.to_state, item.waiting_on_actor);
  if (next.waiting_on_actor !== previousWaitingActor) {
    next.waiting_since_at = input.transition_applied_at;
  }
  next.last_internal_activity_at = input.transition_applied_at;
  next.last_internal_event_ref = input.last_internal_event_ref ?? input.transition_audit_ref;

  if (input.authority_truth_state !== undefined) {
    next.authority_truth_state = input.authority_truth_state;
  }
  if (input.to_state === "WAITING_ON_AUTHORITY") {
    next.authority_truth_state = input.authority_truth_state ?? next.authority_truth_state;
    if (!isWorkflowAuthorityTruthWaiting(next.authority_truth_state)) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "WAITING_ON_AUTHORITY requires UNKNOWN, PENDING_ACK, or PARTIAL_ACK authority truth",
      );
    }
  }
  if (input.to_state === "WAITING_ON_CLIENT") {
    if (input.active_request_info_ref === undefined || input.active_request_info_ref === null) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "WAITING_ON_CLIENT transition requires active_request_info_ref",
      );
    }
    next.collaboration_visibility = "CUSTOMER_SHARED";
    next.customer_thread_ref ??= `collaboration-thread://customer/${next.item_id}`;
    if (next.customer_workspace_version === 0) {
      next.customer_workspace_version = 1;
    }
    next.active_request_info_ref = input.active_request_info_ref;
    next.next_request_info_ordinal += 1;
  } else {
    next.active_request_info_ref = null;
  }
  if (input.due_at !== undefined) {
    next.due_at = input.due_at;
  }
  if (input.due_state !== undefined) {
    next.due_state = input.due_state;
  }
  if (input.customer_due_at !== undefined) {
    next.customer_due_at = input.customer_due_at;
  }

  if (["DONE", "CANCELLED", "STALE"].includes(input.to_state)) {
    next.closed_at = input.transition_applied_at;
    next.waiting_on_actor = "NONE";
    next.active_request_info_ref = null;
  } else {
    next.closed_at = null;
  }
  if (input.to_state === "DONE" && isWorkflowAuthorityTruthUnresolvedOrExternal(next.authority_truth_state)) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "resolved workflow items cannot outrun unresolved authority truth",
    );
  }
  next.customer_status_projection = deriveWorkflowCustomerStatusProjection({
    collaboration_visibility: next.collaboration_visibility,
    lifecycle_state: next.lifecycle_state,
  });
  next.routing_contract = rebuildRoutingContract(next);

  const normalized = normalizeWorkflowItem(next);
  return bumpWorkflowWorkspaceVersions({
    customer_visible_change:
      normalized.collaboration_visibility === "CUSTOMER_SHARED" &&
      (previousProjection !== normalized.customer_status_projection ||
        item.active_request_info_ref !== normalized.active_request_info_ref),
    expected_customer_workspace_version: input.expected_customer_workspace_version,
    expected_staff_workspace_version: input.expected_staff_workspace_version,
    item: normalized,
    staff_actionability_change: true,
  });
}
