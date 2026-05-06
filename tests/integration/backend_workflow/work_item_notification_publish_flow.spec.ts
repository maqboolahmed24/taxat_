import { expect, test } from "@playwright/test";

import {
  appendCollaborationEntry,
  buildWorkflowItem,
  CollaborationEntryRepository,
  CollaborationThreadRepository,
  createRequestInfoRecord,
  ensureWorkItemThreadsExist,
  markWorkItemNotificationDelivered,
  markWorkItemNotificationRead,
  projectNotificationOpenTarget,
  publishWorkItemNotification,
  RequestInfoRecordRepository,
  WorkItemNotificationRepository,
} from "../../../packages/backend-workflow/src/index.ts";

function item() {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0149-flow",
    collaboration_visibility: "CUSTOMER_SHARED",
    current_assignee_ref: "user://staff-owner",
    dedupe_key: "client-0149:notification-flow",
    item_id: "workflow-item-0149-flow",
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0149",
    title: "Notification publish flow",
    type: "NOTIFICATION_FLOW",
  });
}

test("publishes, dedupes retry, suppresses stale delivery, and marks delivery/read", async () => {
  const threadRepository = new CollaborationThreadRepository();
  const entryRepository = new CollaborationEntryRepository();
  const requestRepository = new RequestInfoRecordRepository();
  const notificationRepository = new WorkItemNotificationRepository();
  const workflowItem = item();
  const threads = await ensureWorkItemThreadsExist({
    customer_participant_refs: ["client://client-0149-flow"],
    item: workflowItem,
    staff_participant_refs: ["user://staff-owner"],
    thread_repository: threadRepository,
  });
  const customerThread = threads.find((thread) => thread.visibility_class === "CUSTOMER_VISIBLE")!;

  const seed = await appendCollaborationEntry({
    actor_ref: "client://client-0149-flow",
    body_ref: "body://0149/customer-seed",
    command_id: "command-0149-customer-seed",
    created_at: "2026-04-30T09:05:00Z",
    entry_repository: entryRepository,
    entry_type: "COMMENT",
    expected_thread_head_sequence: 0,
    thread_id: customerThread.thread_id,
    thread_repository: threadRepository,
  });
  const prompt = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://0149/request-prompt",
    causal_parent_entry_ref: seed.entry.entry_id,
    command_id: "command-0149-request-info",
    created_at: "2026-04-30T09:10:00Z",
    entry_repository: entryRepository,
    entry_type: "REQUEST_INFO",
    expected_thread_head_sequence: 1,
    request_info_ref: `request-info://${workflowItem.item_id}/1`,
    thread_id: customerThread.thread_id,
    thread_repository: threadRepository,
  });
  const opened = await createRequestInfoRecord({
    audit_event_ref: prompt.entry.audit_event_ref,
    customer_due_at: "2026-05-03T17:00:00Z",
    item: workflowItem,
    opened_at: prompt.entry.created_at,
    prompt_body_ref: prompt.entry.body_ref!,
    prompt_entry_ref: prompt.entry.entry_id,
    repository: requestRepository,
    requested_by_ref: prompt.entry.actor_ref,
  });

  const requestNotification = await publishWorkItemNotification({
    access_binding_hash: "access-hash-flow",
    delivery_channel: "IN_APP",
    item: opened.updated_item,
    masking_posture_fingerprint: "masking-fingerprint-flow",
    notification_type: "REQUEST_INFO_OPENED",
    queued_at: "2026-04-30T09:11:00Z",
    recipient_ref: "client://client-0149-flow",
    repository: notificationRepository,
    request_info_ref: opened.request.request_info_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });
  expect(requestNotification.notification.request_info_ref).toBe(opened.request.request_info_id);
  expect(requestNotification.notification.target_route_ref).toBe(`/portal/requests/${workflowItem.item_id}`);

  const duplicate = await publishWorkItemNotification({
    access_binding_hash: "access-hash-flow",
    delivery_channel: "PUSH",
    item: opened.updated_item,
    masking_posture_fingerprint: "masking-fingerprint-flow",
    notification_type: "REQUEST_INFO_OPENED",
    queued_at: "2026-04-30T09:12:00Z",
    recipient_ref: "client://client-0149-flow",
    repository: notificationRepository,
    request_info_ref: opened.request.request_info_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });
  expect(duplicate.publish_state).toBe("DUPLICATE_SUPPRESSED");
  expect(duplicate.notification.notification_id).toBe(requestNotification.notification.notification_id);

  const delivered = await markWorkItemNotificationDelivered({
    delivered_at: "2026-04-30T09:13:00Z",
    notification_id: requestNotification.notification.notification_id,
    repository: notificationRepository,
  });
  expect(delivered.delivered_at).toBe("2026-04-30T09:13:00Z");

  const read = await markWorkItemNotificationRead({
    notification_id: requestNotification.notification.notification_id,
    read_at: "2026-04-30T09:20:00Z",
    repository: notificationRepository,
  });
  expect(read.read_at).toBe("2026-04-30T09:20:00Z");

  const stale = await publishWorkItemNotification({
    access_binding_hash: "access-hash-flow",
    current_access_binding_hash: "access-hash-revoked",
    delivery_channel: "EMAIL",
    item: opened.updated_item,
    masking_posture_fingerprint: "masking-fingerprint-flow",
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-04-30T09:30:00Z",
    recipient_ref: "client://client-0149-stale",
    repository: notificationRepository,
    visibility_class: "CUSTOMER_VISIBLE",
  });
  expect(stale.publish_state).toBe("SUPPRESSED");
  expect(stale.notification.suppressed_reason_codes).toEqual(["ACCESS_BINDING_CHANGED"]);

  const staleProjection = projectNotificationOpenTarget({
    notification: stale.notification,
  });
  expect(staleProjection.open_state).toBe("SUPPRESSED");
  expect(staleProjection.target_route_ref).toBeNull();

  expect(await notificationRepository.listWorkItemNotificationsByReadState("READ")).toHaveLength(1);
  expect(await notificationRepository.listWorkItemNotificationsByReadState("SUPPRESSED")).toHaveLength(1);
});
