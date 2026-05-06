import { normalizeWorkItemNotification, type WorkItemNotification } from "../models/work_item_notification.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { WorkItemNotificationRepository } from "../repositories/work_item_notification_repository.ts";

export type MarkWorkItemNotificationReadInput = {
  notification_id: string;
  read_at: string;
  repository: WorkItemNotificationRepository;
};

export async function markWorkItemNotificationRead(
  input: MarkWorkItemNotificationReadInput,
): Promise<WorkItemNotification> {
  const stored = await input.repository.getWorkItemNotificationById(input.notification_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "work item notification was not found");
  }
  const notification = normalizeWorkItemNotification(stored.record);
  if (notification.suppressed_reason_codes.length > 0) {
    throw new WorkflowModelError("WORKFLOW_STATE_TRANSITION_INVALID", "suppressed notifications cannot be read");
  }
  if (notification.delivered_at === null) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "read state cannot exist before delivered state",
    );
  }
  if (notification.read_at !== null) {
    return notification;
  }
  const read = normalizeWorkItemNotification({
    ...notification,
    read_at: input.read_at,
  });
  const next = await input.repository.persistWorkItemNotification({ notification: read });
  return next.record;
}
