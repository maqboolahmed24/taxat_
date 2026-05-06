import {
  cloneWorkflowRecord,
  deriveWorkflowCustomerStatusProjection,
  isWorkflowAuthorityTruthUnresolvedOrExternal,
  isWorkflowAuthorityTruthWaiting,
  isWorkflowItemTerminalState,
  normalizeWorkflowItem,
  type WorkflowAuthorityTruthState,
  type WorkflowItem,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import { advanceWorkflowItem } from "./advance_workflow_item.ts";
import { bumpWorkflowWorkspaceVersions } from "./bump_workflow_workspace_versions.ts";

export function syncWorkflowItemAuthorityTruth(input: {
  authority_truth_state: WorkflowAuthorityTruthState;
  changed_at: string;
  item: WorkflowItem;
  transition_audit_ref: string;
}) {
  const item = normalizeWorkflowItem(input.item);
  if (item.authority_truth_state === input.authority_truth_state) {
    return item;
  }
  if (isWorkflowItemTerminalState(item.lifecycle_state)) {
    throw new WorkflowModelError(
      "WORKFLOW_ITEM_IMMUTABLE",
      "authority truth corrections against terminal workflow items require a successor workflow item",
    );
  }

  if (isWorkflowAuthorityTruthWaiting(input.authority_truth_state)) {
    if (item.lifecycle_state === "WAITING_ON_AUTHORITY") {
      const next = cloneWorkflowRecord(item);
      next.authority_truth_state = input.authority_truth_state;
      next.customer_status_projection = deriveWorkflowCustomerStatusProjection({
        collaboration_visibility: next.collaboration_visibility,
        lifecycle_state: next.lifecycle_state,
      });
      next.last_internal_activity_at = input.changed_at;
      next.last_internal_event_ref = input.transition_audit_ref;
      return bumpWorkflowWorkspaceVersions({
        customer_visible_change: next.customer_status_projection !== item.customer_status_projection,
        item: normalizeWorkflowItem(next),
        staff_actionability_change: true,
      });
    }
    if (item.lifecycle_state !== "IN_PROGRESS") {
      throw new WorkflowModelError(
        "WORKFLOW_STATE_TRANSITION_INVALID",
        "authority waiting truth can only move IN_PROGRESS workflow items into WAITING_ON_AUTHORITY",
      );
    }
    return advanceWorkflowItem({
      authority_truth_state: input.authority_truth_state,
      item,
      last_internal_event_ref: input.transition_audit_ref,
      to_state: "WAITING_ON_AUTHORITY",
      transition_applied_at: input.changed_at,
      transition_audit_ref: input.transition_audit_ref,
      transition_event_code: "needs_authority_response",
    });
  }

  if (item.lifecycle_state === "WAITING_ON_AUTHORITY") {
    return advanceWorkflowItem({
      authority_truth_state: input.authority_truth_state,
      item,
      last_internal_event_ref: input.transition_audit_ref,
      to_state: "IN_PROGRESS",
      transition_applied_at: input.changed_at,
      transition_audit_ref: input.transition_audit_ref,
      transition_event_code: "authority_response",
    });
  }

  const next = cloneWorkflowRecord(item);
  next.authority_truth_state = input.authority_truth_state;
  next.last_internal_activity_at = input.changed_at;
  next.last_internal_event_ref = input.transition_audit_ref;
  next.customer_status_projection = deriveWorkflowCustomerStatusProjection({
    collaboration_visibility: next.collaboration_visibility,
    lifecycle_state: next.lifecycle_state,
  });
  if (
    next.lifecycle_state === "DONE" &&
    isWorkflowAuthorityTruthUnresolvedOrExternal(next.authority_truth_state)
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "authority truth sync cannot leave DONE semantics on unresolved authority truth",
    );
  }
  return bumpWorkflowWorkspaceVersions({
    customer_visible_change: next.customer_status_projection !== item.customer_status_projection,
    item: normalizeWorkflowItem(next),
    staff_actionability_change: true,
  });
}
