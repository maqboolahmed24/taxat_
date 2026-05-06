import { normalizeWorkItemNotification, type WorkItemNotification } from "../models/work_item_notification.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { WorkItemNotificationRepository } from "../repositories/work_item_notification_repository.ts";

export type MarkWorkItemNotificationDeliveredInput = {
  delivered_at: string;
  notification_id: string;
  repository: WorkItemNotificationRepository;
};

export async function markWorkItemNotificationDelivered(
  input: MarkWorkItemNotificationDeliveredInput,
): Promise<WorkItemNotification> {
  const stored = await input.repository.getWorkItemNotificationById(input.notification_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "work item notification was not found");
  }
  const notification = normalizeWorkItemNotification(stored.record);
  if (notification.suppressed_reason_codes.length > 0) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "suppressed notifications cannot be delivered",
    );
  }
  if (notification.delivered_at !== null) {
    return notification;
  }
  const delivered = normalizeWorkItemNotification({
    ...notification,
    delivered_at: input.delivered_at,
    read_at: null,
  });
  const next = await input.repository.persistWorkItemNotification({ notification: delivered });
  return next.record;
}
