import type { CollaborationAttachment } from "../models/collaboration_attachment.ts";
import type { CollaborationThread } from "../models/collaboration_thread.ts";
import type { RequestInfoRecord } from "../models/request_info_record.ts";
import type { WorkItemNotification } from "../models/work_item_notification.ts";
import type { WorkItemParticipant } from "../models/work_item_participant.ts";
import type { WorkflowItem } from "../models/workflow_item.ts";
import {
  buildWorkspaceSnapshot,
  type BuildWorkspaceSnapshotInput,
} from "../projectors/build_workspace_snapshot.ts";
import type { CollaborationAttachmentRepository } from "../repositories/collaboration_attachment_repository.ts";
import type { CollaborationThreadRepository } from "../repositories/collaboration_thread_repository.ts";
import type { RequestInfoRecordRepository } from "../repositories/request_info_record_repository.ts";
import type { WorkItemNotificationRepository } from "../repositories/work_item_notification_repository.ts";
import type { WorkItemParticipantRepository } from "../repositories/work_item_participant_repository.ts";
import type { WorkspaceSnapshotRepository } from "../repositories/workspace_snapshot_repository.ts";

export type ProjectWorkspaceSnapshotForViewerInput = Omit<
  BuildWorkspaceSnapshotInput,
  "attachments" | "customer_thread" | "internal_thread" | "notifications" | "participants" | "request_info_record"
> & {
  attachment_repository?: CollaborationAttachmentRepository | undefined;
  attachments?: readonly CollaborationAttachment[] | undefined;
  customer_thread?: CollaborationThread | null | undefined;
  notification_repository?: WorkItemNotificationRepository | undefined;
  notifications?: readonly WorkItemNotification[] | undefined;
  participant_repository?: WorkItemParticipantRepository | undefined;
  participants?: readonly WorkItemParticipant[] | undefined;
  repository: WorkspaceSnapshotRepository;
  request_info_record?: RequestInfoRecord | null | undefined;
  request_info_repository?: RequestInfoRecordRepository | undefined;
  thread_repository?: CollaborationThreadRepository | undefined;
  internal_thread?: CollaborationThread | null | undefined;
};

async function resolveThread(input: {
  item: WorkflowItem;
  thread: CollaborationThread | null | undefined;
  repository: CollaborationThreadRepository | undefined;
  visibility_class: "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
}) {
  if (input.thread !== undefined) {
    return input.thread;
  }
  const stored = await input.repository?.getCollaborationThreadForItem({
    item_id: input.item.item_id,
    visibility_class: input.visibility_class,
  });
  return stored?.record ?? null;
}

export async function projectWorkspaceSnapshotForViewer(input: ProjectWorkspaceSnapshotForViewerInput) {
  const internalThread = await resolveThread({
    item: input.item,
    repository: input.thread_repository,
    thread: input.internal_thread,
    visibility_class: "INTERNAL_ONLY",
  });
  const customerThread = await resolveThread({
    item: input.item,
    repository: input.thread_repository,
    thread: input.customer_thread,
    visibility_class: "CUSTOMER_VISIBLE",
  });
  const participants =
    input.participants ??
    (await input.participant_repository?.listWorkItemParticipantsByItem(input.item.item_id))?.map(
      (stored) => stored.record,
    ) ??
    [];
  const attachments =
    input.attachments ??
    (await input.attachment_repository?.listCollaborationAttachmentsByItem(input.item.item_id))?.map(
      (stored) => stored.record,
    ) ??
    [];
  const notifications =
    input.notifications ??
    (await input.notification_repository?.listWorkItemNotificationsByItem(input.item.item_id))?.map(
      (stored) => stored.record,
    ) ??
    [];
  const requestInfoRecord =
    input.request_info_record === undefined && input.item.active_request_info_ref !== null
      ? (await input.request_info_repository?.getRequestInfoRecordById(input.item.active_request_info_ref))?.record ?? null
      : input.request_info_record ?? null;
  const snapshot = buildWorkspaceSnapshot({
    ...input,
    attachments,
    customer_thread: customerThread,
    internal_thread: internalThread,
    notifications,
    participants,
    request_info_record: requestInfoRecord,
  });
  const stored = await input.repository.persistWorkspaceSnapshot({ snapshot });
  return {
    snapshot,
    stored,
  };
}
