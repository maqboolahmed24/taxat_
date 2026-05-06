import type { CollaborationAttachment } from "../models/collaboration_attachment.ts";
import type { RequestInfoRecord } from "../models/request_info_record.ts";
import type { WorkItemNotification } from "../models/work_item_notification.ts";
import type { WorkflowItem } from "../models/workflow_item.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  buildCustomerRequestListSnapshot,
  type BuildCustomerRequestListSnapshotInput,
} from "../projectors/build_customer_request_list_snapshot.ts";
import type { CollaborationAttachmentRepository } from "../repositories/collaboration_attachment_repository.ts";
import type { CustomerRequestListSnapshotRepository } from "../repositories/customer_request_list_snapshot_repository.ts";
import type { RequestInfoRecordRepository } from "../repositories/request_info_record_repository.ts";
import type { WorkItemNotificationRepository } from "../repositories/work_item_notification_repository.ts";
import type { WorkflowItemRepository } from "../repositories/workflow_item_repository.ts";

export type ProjectCustomerRequestListSnapshotInput = Omit<
  BuildCustomerRequestListSnapshotInput,
  "attachments" | "items" | "notifications" | "request_info_records"
> & {
  attachment_repository?: CollaborationAttachmentRepository | undefined;
  attachments?: readonly CollaborationAttachment[] | undefined;
  item_repository?: WorkflowItemRepository | undefined;
  items?: readonly WorkflowItem[] | undefined;
  notification_repository?: WorkItemNotificationRepository | undefined;
  notifications?: readonly WorkItemNotification[] | undefined;
  repository: CustomerRequestListSnapshotRepository;
  request_info_records?: readonly RequestInfoRecord[] | undefined;
  request_info_repository?: RequestInfoRecordRepository | undefined;
};

export async function projectCustomerRequestListSnapshot(input: ProjectCustomerRequestListSnapshotInput) {
  const items =
    input.items ??
    (await input.item_repository?.listWorkflowItemsByClient({
      client_id: input.client_id,
      tenant_id: input.tenant_id,
    }))?.map((stored) => stored.record) ??
    null;
  if (items === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list projection requires items or item repository");
  }
  const attachmentLists =
    input.attachments ??
    (
      await Promise.all(
        items.map(async (item) =>
          (await input.attachment_repository?.listCollaborationAttachmentsByItem(item.item_id))?.map(
            (stored) => stored.record,
          ) ?? [],
        ),
      )
    ).flat();
  const requestInfoRecords =
    input.request_info_records ??
    (
      await Promise.all(
        items.map(async (item) =>
          (await input.request_info_repository?.listRequestInfoRecordsByItem(item.item_id))?.map(
            (stored) => stored.record,
          ) ?? [],
        ),
      )
    ).flat();
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
  const snapshot = buildCustomerRequestListSnapshot({
    ...input,
    attachments: attachmentLists,
    items,
    notifications,
    request_info_records: requestInfoRecords,
  });
  const stored = await input.repository.persistCustomerRequestListSnapshot({ snapshot });
  return {
    snapshot,
    stored,
  };
}
