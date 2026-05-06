import {
  cloneWorkflowRecord,
  deriveWorkflowCustomerStatusProjection,
  normalizeWorkflowItem,
  type WorkflowItem,
} from "../models/workflow_item.ts";

export function syncWorkflowItemCustomerProjection(input: {
  customer_thread_ref?: string | null | undefined;
  item: WorkflowItem;
}) {
  const item = normalizeWorkflowItem(input.item);
  const next = cloneWorkflowRecord(item);
  next.customer_status_projection = deriveWorkflowCustomerStatusProjection({
    collaboration_visibility: next.collaboration_visibility,
    lifecycle_state: next.lifecycle_state,
  });
  if (next.collaboration_visibility === "CUSTOMER_SHARED" && input.customer_thread_ref !== undefined) {
    next.customer_thread_ref = input.customer_thread_ref;
  }
  if (next.collaboration_visibility === "INTERNAL_ONLY") {
    next.customer_due_at = null;
    next.customer_thread_ref = null;
    next.customer_workspace_version = 0;
    next.last_customer_activity_at = null;
    next.last_customer_visible_event_ref = null;
  }
  return normalizeWorkflowItem(next);
}
