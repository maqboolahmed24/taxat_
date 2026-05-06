import type { WorkItemNotification } from "../models/work_item_notification.ts";
import type { WorkflowItem } from "../models/workflow_item.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  buildWorkInboxSnapshot,
  type BuildWorkInboxSnapshotInput,
} from "../projectors/build_work_inbox_snapshot.ts";
import type { WorkInboxSnapshotRepository } from "../repositories/work_inbox_snapshot_repository.ts";
import type { WorkItemNotificationRepository } from "../repositories/work_item_notification_repository.ts";
import type { WorkflowItemRepository } from "../repositories/workflow_item_repository.ts";

export type ProjectWorkInboxForViewerInput = Omit<
  BuildWorkInboxSnapshotInput,
  "items" | "notifications"
> & {
  item_repository?: WorkflowItemRepository | undefined;
  items?: readonly WorkflowItem[] | undefined;
  notification_repository?: WorkItemNotificationRepository | undefined;
  notifications?: readonly WorkItemNotification[] | undefined;
  repository: WorkInboxSnapshotRepository;
  routing_queue_ref?: string | undefined;
};

export async function projectWorkInboxForViewer(input: ProjectWorkInboxForViewerInput) {
  const items =
    input.items ??
    (await input.item_repository?.queryWorkflowItems({
      routing_queue_ref: input.routing_queue_ref,
      tenant_id: input.tenant_id,
    }))?.map((stored) => stored.record) ??
    null;
  if (items === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox projection requires items or item repository");
  }
  const notifications =
    input.notifications ??
    (
      await Promise.all(
        items.map(async (item) =>
          (await input.notification_repository?.listWorkItemNotificationsByItem(item.item_id))?.map(
            (stored) => stored.record,
          ) ?? [],
        ),
      )
    ).flat();
  const snapshot = buildWorkInboxSnapshot({
    ...input,
    items,
    notifications,
  });
  const stored = await input.repository.persistWorkInboxSnapshot({ snapshot });
  return {
    snapshot,
    stored,
  };
}
