import { expect, test } from "@playwright/test";

import {
  assertCustomerSafeProjectionAlignment,
  CollaborationActivitySliceRepository,
  CollaborationAttachmentRepository,
  CollaborationEntryRepository,
  CollaborationThreadRepository,
  CustomerRequestListSnapshotRepository,
  projectCollaborationActivitySlice,
  projectCustomerRequestListSnapshot,
  projectWorkspaceSnapshotForViewer,
  publishWorkItemNotification,
  RequestInfoRecordRepository,
  WorkflowItemRepository,
  WorkItemNotificationRepository,
  WorkItemParticipantRepository,
  WorkspaceSnapshotRepository,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  customerActivityEntries,
  openRequestInfo,
  projectionAttachments,
  workflowProjectionItem,
  workspaceParticipants,
  workspaceThreads,
} from "../../unit/backend_workflow/workspace_projection_fixtures.ts";

test("enforces one customer-safe boundary from internal workflow truth to route-visible payloads", async () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0152-flow" });
  const threads = workspaceThreads(item.item_id);
  const participants = workspaceParticipants(item.item_id);
  const request = openRequestInfo(item.item_id);
  const attachments = projectionAttachments(item.item_id);
  const entries = customerActivityEntries(item.item_id);

  const workflowRepository = new WorkflowItemRepository();
  const threadRepository = new CollaborationThreadRepository();
  const participantRepository = new WorkItemParticipantRepository();
  const requestRepository = new RequestInfoRecordRepository();
  const attachmentRepository = new CollaborationAttachmentRepository();
  const entryRepository = new CollaborationEntryRepository();
  const workspaceRepository = new WorkspaceSnapshotRepository();
  const requestListRepository = new CustomerRequestListSnapshotRepository();
  const activityRepository = new CollaborationActivitySliceRepository();
  const notificationRepository = new WorkItemNotificationRepository();

  await workflowRepository.persistWorkflowItem({ item });
  await threadRepository.persistCollaborationThread({ thread: threads.internal });
  await threadRepository.persistCollaborationThread({ thread: threads.customer });
  for (const participant of participants) {
    await participantRepository.upsertWorkItemParticipant({ participant });
  }
  await requestRepository.persistRequestInfoRecord({ record: request });
  for (const attachment of attachments) {
    await attachmentRepository.persistCollaborationAttachment({ attachment });
  }
  for (const entry of entries) {
    await entryRepository.persistCollaborationEntry({ entry });
  }

  const detail = await projectWorkspaceSnapshotForViewer({
    access_binding_hash: "access-0152-flow",
    attachment_repository: attachmentRepository,
    item,
    masking_posture_fingerprint: "mask-0152-flow",
    participant_repository: participantRepository,
    repository: workspaceRepository,
    request_info_repository: requestRepository,
    thread_repository: threadRepository,
    viewer_scope: "CUSTOMER_VISIBLE",
  });
  const list = await projectCustomerRequestListSnapshot({
    access_binding_hash: "access-0152-flow",
    attachment_repository: attachmentRepository,
    client_id: item.client_id,
    item_repository: workflowRepository,
    list_version: item.customer_workspace_version,
    masking_posture_fingerprint: "mask-0152-flow",
    repository: requestListRepository,
    request_info_repository: requestRepository,
    selected_item_ref_or_null: item.item_id,
    tenant_id: item.tenant_id,
    updated_at: "2026-04-30T12:00:00Z",
  });
  const activity = await projectCollaborationActivitySlice({
    access_binding_hash: "access-0152-flow",
    entry_repository: entryRepository,
    item_id: item.item_id,
    limit: 2,
    masking_posture_fingerprint: "mask-0152-flow",
    repository: activityRepository,
    shell_stability_token: detail.snapshot.shell_stability_token,
    thread_repository: threadRepository,
    thread_visibility_class: "CUSTOMER_VISIBLE",
    viewer_scope: "CUSTOMER_VISIBLE",
    workspace_route_key: detail.snapshot.workspace_route_key,
    workspace_snapshot_repository: workspaceRepository,
    workspace_version: detail.snapshot.workspace_version,
  });
  const notification = await publishWorkItemNotification({
    access_binding_hash: "access-0152-flow",
    delivery_channel: "IN_APP",
    item,
    masking_posture_fingerprint: "mask-0152-flow",
    notification_type: "REQUEST_INFO_OPENED",
    queued_at: "2026-04-30T12:01:00Z",
    recipient_ref: "client://client-0150",
    repository: notificationRepository,
    request_info_ref: request.request_info_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });

  for (const artifact of [
    detail.snapshot,
    list.snapshot,
    activity.slice,
    notification.notification,
  ]) {
    const boundary = assertCustomerSafeProjectionAlignment({
      artifact: artifact as unknown as Record<string, unknown>,
      requirement: "REQUIRED",
    });
    expect(boundary.customer_safe_projection?.access_binding_hash).toBe(
      boundary.visibility_partition.access_binding_hash,
    );
    expect(boundary.customer_safe_projection?.visibility_cache_partition_key).toBe(
      boundary.visibility_partition.cache_partition_key,
    );
  }

  const row = list.snapshot.rows.find((candidate) => candidate.item_id === item.item_id)!;
  expect(row.current_artifact_ref_or_null).toBe(`download://${item.item_id}/shared-current`);
  expect(row.historical_artifact_refs).toEqual([`download://${item.item_id}/shared-history`]);
  expect(JSON.stringify(detail.snapshot)).not.toContain(`download://${item.item_id}/internal`);
  expect(notification.notification.customer_safe_projection?.notification_navigation_policy).toBe(
    "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
  );
  expect(notification.notification.target_route_ref).toBe(`/portal/requests/${item.item_id}`);
});
