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
import {
  queryQueueHealthSnapshot,
  type QueueHealthAnalyticsSnapshot,
} from "../analytics/query_queue_health_snapshot.ts";
import type { QueryQueueHealthInputsInput } from "../analytics/query_queue_health_inputs.ts";

export type PublishQueueHealthPostureInput = Omit<
  BuildWorkInboxSnapshotInput,
  "items" | "notifications" | "queue_health_contract"
> & {
  evaluated_at: string;
  item_repository?: WorkflowItemRepository | undefined;
  items?: readonly WorkflowItem[] | undefined;
  notification_repository?: WorkItemNotificationRepository | undefined;
  notifications?: readonly WorkItemNotification[] | undefined;
  queue_health_input_overrides?: Partial<
    Omit<QueryQueueHealthInputsInput, "evaluated_at" | "items" | "queue_route_key">
  > | undefined;
  repository: WorkInboxSnapshotRepository;
  routing_queue_ref?: string | undefined;
};

export type PublishQueueHealthPostureResult = {
  queue_health_snapshot: QueueHealthAnalyticsSnapshot;
  snapshot: ReturnType<typeof buildWorkInboxSnapshot>;
  stored: Awaited<ReturnType<WorkInboxSnapshotRepository["persistWorkInboxSnapshot"]>>;
};

export async function publishQueueHealthPosture(
  input: PublishQueueHealthPostureInput,
): Promise<PublishQueueHealthPostureResult> {
  const inboxRouteKey = input.inbox_route_key ?? "/work/inbox";
  const items =
    input.items ??
    (await input.item_repository?.queryWorkflowItems({
      routing_queue_ref: input.routing_queue_ref,
      tenant_id: input.tenant_id,
    }))?.map((stored) => stored.record) ??
    null;
  if (items === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue health publication requires items or item repository");
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
  const queueHealthSnapshot = queryQueueHealthSnapshot({
    ...input.queue_health_input_overrides,
    evaluated_at: input.evaluated_at,
    items,
    queue_route_key: inboxRouteKey,
    routing_queue_ref: input.routing_queue_ref ?? input.queue_health_input_overrides?.routing_queue_ref,
  });
  const snapshot = buildWorkInboxSnapshot({
    ...input,
    inbox_route_key: inboxRouteKey,
    items,
    notifications: notifications as readonly WorkItemNotification[],
    queue_health_contract: queueHealthSnapshot.contract,
  });
  const stored = await input.repository.persistWorkInboxSnapshot({ snapshot });
  return {
    queue_health_snapshot: queueHealthSnapshot,
    snapshot,
    stored,
  };
}
