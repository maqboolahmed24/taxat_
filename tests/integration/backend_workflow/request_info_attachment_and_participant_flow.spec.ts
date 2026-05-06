import { expect, test } from "@playwright/test";

import {
  appendCollaborationEntry,
  buildWorkflowItem,
  closeRequestInfoRecord,
  CollaborationAttachmentRepository,
  CollaborationEntryRepository,
  CollaborationThreadRepository,
  createRequestInfoRecord,
  ensureWorkItemThreadsExist,
  publishCollaborationAttachment,
  recordRequestInfoResponse,
  RequestInfoRecordRepository,
  transitionCollaborationAttachmentState,
  upsertWorkItemParticipants,
  WorkItemParticipantRepository,
} from "../../../packages/backend-workflow/src/index.ts";

function workflowItem() {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0148-flow",
    collaboration_visibility: "CUSTOMER_SHARED",
    current_assignee_ref: "user://staff-owner",
    dedupe_key: "client-0148-flow:request-attachment-participant",
    item_id: "workflow-item-0148-flow",
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0148-flow",
    title: "Request info attachment participant flow",
    type: "REQUEST_ATTACHMENT_PARTICIPANT_FLOW",
  });
}

test("opens exact request, records exact response, closes it, publishes attachment posture, and syncs participants", async () => {
  const threadRepository = new CollaborationThreadRepository();
  const entryRepository = new CollaborationEntryRepository();
  const requestRepository = new RequestInfoRecordRepository();
  const attachmentRepository = new CollaborationAttachmentRepository();
  const participantRepository = new WorkItemParticipantRepository();
  const item = workflowItem();
  const threads = await ensureWorkItemThreadsExist({
    customer_participant_refs: ["client://client-0148-flow"],
    item,
    staff_participant_refs: ["user://staff-owner"],
    thread_repository: threadRepository,
  });
  const customerThread = threads.find((thread) => thread.visibility_class === "CUSTOMER_VISIBLE")!;

  const seed = await appendCollaborationEntry({
    actor_ref: "client://client-0148-flow",
    body_ref: "body://customer-seed",
    command_id: "command-0148-customer-seed",
    created_at: "2026-04-30T09:02:00Z",
    entry_repository: entryRepository,
    entry_type: "COMMENT",
    expected_thread_head_sequence: 0,
    thread_id: customerThread.thread_id,
    thread_repository: threadRepository,
  });
  const requestInfoRef = `request-info://${item.item_id}/${item.next_request_info_ordinal}`;
  const prompt = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://request-prompt",
    causal_parent_entry_ref: seed.entry.entry_id,
    command_id: "command-0148-request-info",
    created_at: "2026-04-30T09:05:00Z",
    entry_repository: entryRepository,
    entry_type: "REQUEST_INFO",
    expected_thread_head_sequence: 1,
    request_info_ref: requestInfoRef,
    thread_id: customerThread.thread_id,
    thread_repository: threadRepository,
  });
  const opened = await createRequestInfoRecord({
    audit_event_ref: "audit://0148/request-open",
    customer_due_at: "2026-05-02T17:00:00Z",
    item,
    opened_at: "2026-04-30T09:05:00Z",
    opened_notification_refs: ["notification://0148/request-open"],
    prompt_body_ref: prompt.entry.body_ref!,
    prompt_entry_ref: prompt.entry.entry_id,
    repository: requestRepository,
    requested_by_ref: "user://staff-owner",
  });
  expect(opened.request.request_info_id).toBe(requestInfoRef);
  expect(opened.updated_item.active_request_info_ref).toBe(requestInfoRef);
  expect(opened.updated_item.next_request_info_ordinal).toBe(2);

  const response = await appendCollaborationEntry({
    actor_ref: "client://client-0148-flow",
    body_ref: "body://request-response",
    causal_parent_entry_ref: prompt.entry.entry_id,
    command_id: "command-0148-request-response",
    created_at: "2026-04-30T09:20:00Z",
    entry_repository: entryRepository,
    entry_type: "REQUEST_INFO_RESPONSE",
    expected_thread_head_sequence: 2,
    request_info_ref: opened.request.request_info_id,
    request_prompt_entry_ref: prompt.entry.entry_id,
    thread_id: customerThread.thread_id,
    thread_repository: threadRepository,
  });
  const responded = await recordRequestInfoResponse({
    audit_event_ref: response.entry.audit_event_ref,
    item: opened.updated_item,
    repository: requestRepository,
    request_info_id: opened.request.request_info_id,
    responded_at: response.entry.created_at,
    responded_by_ref: response.entry.actor_ref,
    response_body_ref: response.entry.body_ref!,
    response_causal_parent_entry_ref: response.entry.causal_parent_entry_ref,
    response_entry_ref: response.entry.entry_id,
    response_request_info_ref: response.entry.request_info_ref,
  });
  expect(responded.request.request_state_version).toBe(2);
  expect(responded.updated_item?.active_request_info_ref).toBeNull();

  const closure = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://request-accepted",
    causal_parent_entry_ref: response.entry.entry_id,
    command_id: "command-0148-request-close",
    created_at: "2026-04-30T09:25:00Z",
    entry_repository: entryRepository,
    entry_type: "STATUS_CHANGE",
    expected_thread_head_sequence: 3,
    thread_id: customerThread.thread_id,
    thread_repository: threadRepository,
  });
  const closed = await closeRequestInfoRecord({
    audit_event_ref: closure.entry.audit_event_ref,
    closed_at: closure.entry.created_at,
    closed_by_ref: closure.entry.actor_ref,
    closure_entry_ref: closure.entry.entry_id,
    closure_reason_code: "CUSTOMER_REPLY_ACCEPTED",
    repository: requestRepository,
    request_info_id: opened.request.request_info_id,
  });
  expect(closed.request_state_version).toBe(3);
  expect(closed.response_entry_ref).toBe(response.entry.entry_id);

  const attachment = await publishCollaborationAttachment({
    published_at: "2026-04-30T09:30:00Z",
    published_entry_ref: closure.entry.entry_id,
    repository: attachmentRepository,
    request_info_record: closed,
    retention_class: "CUSTOMER_DOCUMENT",
    staged_upload: {
      byte_size: 4096,
      checksum: "sha256:flow0148",
      filename: "vat-evidence.pdf",
      item_id: item.item_id,
      media_type: "application/pdf",
      request_binding_state: "ORIGINAL_CURRENT",
      request_info_ref: closed.request_info_id,
      storage_ref: "storage://0148/vat-evidence",
      uploaded_at: "2026-04-30T09:18:00Z",
      uploaded_by_ref: "client://client-0148-flow",
      upload_session_id: "upload-session-0148-flow",
      visibility_class: "CUSTOMER_VISIBLE",
    },
    state_audit_event_ref: "audit://0148/attachment-publish",
  });
  expect(attachment.download_state).toBe("PENDING");

  const quarantined = await transitionCollaborationAttachmentState({
    attachment_id: attachment.attachment_id,
    current_state_entry_ref: "collaboration-entry://0148/attachment-quarantine",
    malware_scan_state: "QUARANTINED",
    repository: attachmentRepository,
    scan_completed_at: "2026-04-30T09:35:00Z",
    state_audit_event_ref: "audit://0148/attachment-quarantine",
    state_changed_at: "2026-04-30T09:36:00Z",
  });
  expect(quarantined.download_state).toBe("UNAVAILABLE");
  expect(quarantined.unavailable_reason_code).toBe("QUARANTINED_BY_MALWARE_SCAN");

  const participants = await upsertWorkItemParticipants({
    item,
    participants: [
      {
        item_id: item.item_id,
        notification_preferences_ref: "notification-pref://staff-owner",
        participant_ref: "user://staff-owner",
        participant_role: "PREPARER",
        watch_state: "PRIMARY_OWNER",
      },
      {
        item_id: item.item_id,
        last_read_customer_sequence: 4,
        notification_preferences_ref: "notification-pref://client",
        participant_ref: "client://client-0148-flow",
        participant_role: "CLIENT_CONTRIBUTOR",
      },
    ],
    repository: participantRepository,
  });
  expect(participants.participants).toHaveLength(2);
  expect(
    participants.participants.find((participant) => participant.participant_ref === "client://client-0148-flow")
      ?.last_read_internal_sequence,
  ).toBeNull();
});
