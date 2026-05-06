import {
  normalizeWorkItemNotification,
  type WorkItemNotification,
} from "../models/work_item_notification.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type SuppressRedundantWorkItemNotificationsInput = {
  notification: WorkItemNotification;
  reason_codes: readonly string[];
};

export function suppressRedundantWorkItemNotifications(
  input: SuppressRedundantWorkItemNotificationsInput,
): WorkItemNotification {
  const notification = normalizeWorkItemNotification(input.notification);
  const reasonCodes = [...new Set([...notification.suppressed_reason_codes, ...input.reason_codes])].sort();
  if (reasonCodes.length === 0) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      "suppression requires at least one suppressed_reason_codes entry",
    );
  }
  if (notification.delivered_at !== null || notification.read_at !== null) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "delivered or read notifications cannot be retroactively suppressed",
    );
  }
  return normalizeWorkItemNotification({
    ...notification,
    delivered_at: null,
    read_at: null,
    suppressed_reason_codes: reasonCodes,
  });
}
