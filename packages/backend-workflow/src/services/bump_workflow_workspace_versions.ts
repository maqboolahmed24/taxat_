import {
  cloneWorkflowRecord,
  normalizeWorkflowItem,
  type WorkflowItem,
  WorkflowModelError,
} from "../models/workflow_item.ts";

export function bumpWorkflowWorkspaceVersions(input: {
  customer_visible_change?: boolean;
  expected_customer_workspace_version?: number | undefined;
  expected_staff_workspace_version?: number | undefined;
  item: WorkflowItem;
  staff_actionability_change?: boolean;
}) {
  const item = normalizeWorkflowItem(input.item);
  if (
    input.expected_staff_workspace_version !== undefined &&
    item.staff_workspace_version !== input.expected_staff_workspace_version
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_STALE_VERSION",
      "if_match staff workspace version does not match the durable item version",
    );
  }
  if (
    input.expected_customer_workspace_version !== undefined &&
    item.customer_workspace_version !== input.expected_customer_workspace_version
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_STALE_VERSION",
      "if_match customer workspace version does not match the durable item version",
    );
  }

  const customerVisibleChange =
    item.collaboration_visibility === "CUSTOMER_SHARED" && input.customer_visible_change === true;
  const staffChange = input.staff_actionability_change !== false || customerVisibleChange;
  const next = cloneWorkflowRecord(item);
  if (staffChange) {
    next.staff_workspace_version += 1;
  }
  if (customerVisibleChange) {
    next.customer_workspace_version += 1;
  }
  return normalizeWorkflowItem(next);
}
