import { expect, test } from "@playwright/test";

import {
  appendCollaborationEntry,
  buildWorkflowItem,
  CollaborationEntryRepository,
  CollaborationThreadRepository,
  ensureWorkItemThreadsExist,
  redactCollaborationEntry,
  validateCollaborationThreadSequence,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function customerSharedItem() {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0147-flow",
    collaboration_visibility: "CUSTOMER_SHARED",
    current_assignee_ref: "user://staff-owner",
    dedupe_key: "client-0147-flow:append-only",
    item_id: "workflow-item-0147-flow",
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0147-flow",
    title: "Append-only collaboration flow",
    type: "APPEND_ONLY_COLLABORATION_FLOW",
  });
}

test("appends customer and internal lanes independently with idempotency, request lineage, attachments, and redaction", async () => {
  const threadRepository = new CollaborationThreadRepository();
  const entryRepository = new CollaborationEntryRepository();
  const item = customerSharedItem();
  const threads = await ensureWorkItemThreadsExist({
    customer_participant_refs: ["client://client-0147-flow"],
    item,
    staff_participant_refs: ["user://staff-owner"],
    thread_repository: threadRepository,
  });
  const customerThread = threads.find((thread) => thread.visibility_class === "CUSTOMER_VISIBLE");
  const internalThread = threads.find((thread) => thread.visibility_class === "INTERNAL_ONLY");
  expect(customerThread).toBeDefined();
  expect(internalThread).toBeDefined();

  const customerComment = await appendCollaborationEntry({
    actor_ref: "client://client-0147-flow",
    body_ref: "body://customer-comment",
    command_id: "command-customer-comment",
    created_at: "2026-04-30T09:05:00Z",
    entry_repository: entryRepository,
    entry_type: "COMMENT",
    expected_thread_head_sequence: 0,
    thread_id: customerThread!.thread_id,
    thread_repository: threadRepository,
  });
  const internalNote = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://internal-note",
    command_id: "command-internal-note",
    created_at: "2026-04-30T09:06:00Z",
    entry_repository: entryRepository,
    entry_type: "NOTE",
    expected_thread_head_sequence: 0,
    thread_id: internalThread!.thread_id,
    thread_repository: threadRepository,
  });
  const duplicateInternalNote = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://internal-note",
    command_id: "command-internal-note",
    created_at: "2026-04-30T09:06:00Z",
    entry_repository: entryRepository,
    entry_type: "NOTE",
    expected_thread_head_sequence: 0,
    thread_id: internalThread!.thread_id,
    thread_repository: threadRepository,
  });

  expect(customerComment.entry.thread_sequence).toBe(1);
  expect(internalNote.entry.thread_sequence).toBe(1);
  expect(duplicateInternalNote.duplicate_replay).toBe(true);
  expect(duplicateInternalNote.entry.entry_id).toBe(internalNote.entry.entry_id);

  const requestInfoRef = "request-info://workflow-item-0147-flow/1";
  const prompt = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://request-prompt",
    causal_parent_entry_ref: customerComment.entry.entry_id,
    command_id: "command-request-info",
    created_at: "2026-04-30T09:10:00Z",
    entry_repository: entryRepository,
    entry_type: "REQUEST_INFO",
    expected_thread_head_sequence: 1,
    request_info_ref: requestInfoRef,
    thread_id: customerThread!.thread_id,
    thread_repository: threadRepository,
  });
  const response = await appendCollaborationEntry({
    actor_ref: "client://client-0147-flow",
    body_ref: "body://request-response",
    causal_parent_entry_ref: prompt.entry.entry_id,
    command_id: "command-request-response",
    created_at: "2026-04-30T09:20:00Z",
    entry_repository: entryRepository,
    entry_type: "REQUEST_INFO_RESPONSE",
    expected_thread_head_sequence: 2,
    request_info_ref: requestInfoRef,
    request_prompt_entry_ref: prompt.entry.entry_id,
    thread_id: customerThread!.thread_id,
    thread_repository: threadRepository,
  });
  expect(response.entry.causal_parent_entry_ref).toBe(prompt.entry.entry_id);

  const attachmentEntry = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    attachment_refs: ["collaboration-attachment://safe-upload"],
    attachment_visibility_by_ref: {
      "collaboration-attachment://safe-upload": "CUSTOMER_VISIBLE",
    },
    body_ref: null,
    command_id: "command-attachment-only",
    created_at: "2026-04-30T09:25:00Z",
    entry_repository: entryRepository,
    entry_type: "ATTACHMENT_ONLY",
    expected_thread_head_sequence: 3,
    thread_id: customerThread!.thread_id,
    thread_repository: threadRepository,
  });
  expect(attachmentEntry.entry.body_ref).toBeNull();
  expect(attachmentEntry.entry.attachment_refs).toEqual(["collaboration-attachment://safe-upload"]);

  const redaction = await redactCollaborationEntry({
    actor_ref: "user://staff-owner",
    command_id: "command-redact-customer-comment",
    created_at: "2026-04-30T09:30:00Z",
    entry_repository: entryRepository,
    expected_thread_head_sequence: 4,
    original_entry_id: customerComment.entry.entry_id,
    redaction_body_ref: "body://redaction-reason",
    thread_repository: threadRepository,
  });
  const originalAfterRedaction = await entryRepository.getCollaborationEntryById(customerComment.entry.entry_id);
  expect(originalAfterRedaction?.record.body_ref).toBe("body://customer-comment");
  expect(redaction.entry.redaction_state).toBe("REDACTED");
  expect(redaction.entry.causal_parent_entry_ref).toBe(customerComment.entry.entry_id);

  const finalCustomerThread = await threadRepository.getCollaborationThreadById(customerThread!.thread_id);
  const customerEntries = await entryRepository.listCollaborationEntriesByThread(customerThread!.thread_id);
  expect(finalCustomerThread?.record.head_sequence).toBe(5);
  validateCollaborationThreadSequence({
    entries: customerEntries.map((entry) => entry.record),
    thread: finalCustomerThread!.record,
  });
});

test("rejects customer-visible entries that point at internal-only parents", async () => {
  const threadRepository = new CollaborationThreadRepository();
  const entryRepository = new CollaborationEntryRepository();
  const item = customerSharedItem();
  const threads = await ensureWorkItemThreadsExist({
    customer_participant_refs: ["client://client-0147-flow"],
    item,
    staff_participant_refs: ["user://staff-owner"],
    thread_repository: threadRepository,
  });
  const customerThread = threads.find((thread) => thread.visibility_class === "CUSTOMER_VISIBLE")!;
  const internalThread = threads.find((thread) => thread.visibility_class === "INTERNAL_ONLY")!;
  const internalEntry = await appendCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://internal-note",
    command_id: "command-internal-parent",
    created_at: "2026-04-30T10:00:00Z",
    entry_repository: entryRepository,
    entry_type: "NOTE",
    expected_thread_head_sequence: 0,
    thread_id: internalThread.thread_id,
    thread_repository: threadRepository,
  });

  await expect(
    appendCollaborationEntry({
      actor_ref: "client://client-0147-flow",
      body_ref: "body://leaky-reply",
      causal_parent_entry_ref: internalEntry.entry.entry_id,
      command_id: "command-leaky-reply",
      created_at: "2026-04-30T10:05:00Z",
      entry_repository: entryRepository,
      entry_type: "COMMENT",
      expected_thread_head_sequence: 0,
      thread_id: customerThread.thread_id,
      thread_repository: threadRepository,
    }),
  ).rejects.toThrow(WorkflowModelError);
});
