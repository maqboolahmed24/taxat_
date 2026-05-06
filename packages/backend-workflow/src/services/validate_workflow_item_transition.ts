import {
  isWorkflowItemTerminalState,
  type WorkflowItem,
  type WorkflowItemLifecycleState,
  type WorkflowTransitionEventCode,
  WorkflowModelError,
  WORKFLOW_ITEM_ALLOWED_TRANSITION_TUPLES,
} from "../models/workflow_item.ts";

export type WorkflowTransitionAlias =
  | WorkflowTransitionEventCode
  | "assign"
  | "pick_up"
  | "request_info_sent"
  | "customer_reply_recorded"
  | "waiting_on_authority"
  | "authority_response_recorded"
  | "cancelled_or_no_longer_relevant";

const TRANSITION_EVENT_ALIASES = new Map<WorkflowTransitionAlias, WorkflowTransitionEventCode>([
  ["workflow_item_created", "workflow_item_created"],
  ["picked_up", "picked_up"],
  ["pick_up", "picked_up"],
  ["assign", "picked_up"],
  ["needs_client_input", "needs_client_input"],
  ["request_info_sent", "needs_client_input"],
  ["needs_authority_response", "needs_authority_response"],
  ["waiting_on_authority", "needs_authority_response"],
  ["blocked_condition", "blocked_condition"],
  ["client_response", "client_response"],
  ["customer_reply_recorded", "client_response"],
  ["authority_response", "authority_response"],
  ["authority_response_recorded", "authority_response"],
  ["resolved", "resolved"],
  ["no_longer_relevant", "no_longer_relevant"],
  ["cancelled_or_no_longer_relevant", "no_longer_relevant"],
  ["superseded_by_new_context", "superseded_by_new_context"],
]);

export function canonicalizeWorkflowTransitionEvent(
  transitionEventCode: WorkflowTransitionAlias,
): WorkflowTransitionEventCode {
  const canonical = TRANSITION_EVENT_ALIASES.get(transitionEventCode);
  if (canonical === undefined) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      `unsupported workflow transition event ${transitionEventCode}`,
    );
  }
  return canonical;
}

export function validateWorkflowItemTransition(input: {
  from_state: WorkflowItemLifecycleState;
  to_state: WorkflowItemLifecycleState;
  transition_event_code: WorkflowTransitionAlias;
}): WorkflowTransitionEventCode {
  const transitionEventCode = canonicalizeWorkflowTransitionEvent(input.transition_event_code);
  if (isWorkflowItemTerminalState(input.from_state)) {
    throw new WorkflowModelError(
      "WORKFLOW_ITEM_IMMUTABLE",
      "terminal workflow items require a new lineage rather than ordinary lifecycle mutation",
    );
  }
  const allowed = WORKFLOW_ITEM_ALLOWED_TRANSITION_TUPLES.some(
    ([from, event, to]) =>
      from === input.from_state && event === transitionEventCode && to === input.to_state,
  );
  if (!allowed) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      `illegal WORKFLOW_ITEM transition ${input.from_state} --${transitionEventCode}--> ${input.to_state}`,
    );
  }
  return transitionEventCode;
}

export function assertWorkflowItemTransition(input: {
  item: WorkflowItem;
  to_state: WorkflowItemLifecycleState;
  transition_event_code: WorkflowTransitionAlias;
}): WorkflowTransitionEventCode {
  return validateWorkflowItemTransition({
    from_state: input.item.lifecycle_state,
    to_state: input.to_state,
    transition_event_code: input.transition_event_code,
  });
}
