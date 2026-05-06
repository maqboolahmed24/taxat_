import { expect, test } from "@playwright/test";

import {
  buildCollaborationEntry,
  buildCollaborationThread,
  validateCollaborationEntryVisibility,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

const createdAt = "2026-04-30T10:00:00Z";

function baseEntry(overrides: Partial<Parameters<typeof buildCollaborationEntry>[0]> = {}) {
  return buildCollaborationEntry({
    actor_ref: "user://staff-owner",
    body_ref: "body://entry",
    command_id: `command-${overrides.thread_sequence ?? 1}`,
    created_at: createdAt,
    entry_type: "COMMENT",
    item_id: "workflow-item-entry-0147",
    thread_id: "collaboration-thread://internal/workflow-item-entry-0147",
    thread_sequence: 1,
    visibility_class: "INTERNAL_ONLY",
    ...overrides,
  });
}

test("keeps internal-only entry families off the customer lane", () => {
  expect(() =>
    baseEntry({
      entry_type: "NOTE",
      visibility_class: "CUSTOMER_VISIBLE",
    }),
  ).toThrow(WorkflowModelError);

  expect(() =>
    baseEntry({
      entry_type: "ASSIGNMENT_CHANGE",
      visibility_class: "CUSTOMER_VISIBLE",
    }),
  ).toThrow(WorkflowModelError);
});

test("requires exact request lineage for request-info entries", () => {
  expect(() =>
    baseEntry({
      entry_type: "REQUEST_INFO_RESPONSE",
      request_info_ref: "request-info://workflow-item-entry-0147/1",
      thread_id: "collaboration-thread://customer/workflow-item-entry-0147",
      visibility_class: "CUSTOMER_VISIBLE",
    }),
  ).toThrow(WorkflowModelError);

  const response = baseEntry({
    causal_parent_entry_ref: "collaboration-entry://prompt",
    entry_type: "REQUEST_INFO_RESPONSE",
    request_info_ref: "request-info://workflow-item-entry-0147/1",
    thread_id: "collaboration-thread://customer/workflow-item-entry-0147",
    visibility_class: "CUSTOMER_VISIBLE",
  });
  expect(response.request_info_ref).toBe("request-info://workflow-item-entry-0147/1");
});

test("supports attachment-only entries without a body", () => {
  const entry = baseEntry({
    attachment_refs: ["collaboration-attachment://a"],
    body_ref: null,
    entry_type: "ATTACHMENT_ONLY",
  });

  expect(entry.body_ref).toBeNull();
  expect(entry.attachment_refs).toEqual(["collaboration-attachment://a"]);
});

test("fails closed on customer-visible parent or attachment visibility mismatch", () => {
  const thread = buildCollaborationThread({
    head_sequence: 1,
    item_id: "workflow-item-entry-0147",
    last_entry_ref: "collaboration-entry://customer",
    participant_refs: ["client://client-0147"],
    thread_id: "collaboration-thread://customer/workflow-item-entry-0147",
    visibility_class: "CUSTOMER_VISIBLE",
  });
  const parent = baseEntry({
    entry_id: "collaboration-entry://internal-parent",
    thread_id: "collaboration-thread://internal/workflow-item-entry-0147",
    visibility_class: "INTERNAL_ONLY",
  });
  const child = baseEntry({
    attachment_refs: ["collaboration-attachment://internal"],
    causal_parent_entry_ref: parent.entry_id,
    entry_id: "collaboration-entry://customer-child",
    thread_id: thread.thread_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });

  expect(() =>
    validateCollaborationEntryVisibility({
      attachment_visibility_by_ref: {
        "collaboration-attachment://internal": "INTERNAL_ONLY",
      },
      entry: child,
      parent_entry: parent,
      thread,
    }),
  ).toThrow(WorkflowModelError);
});

test("rejects request-info responses whose request identity differs from the prompt", () => {
  const thread = buildCollaborationThread({
    head_sequence: 1,
    item_id: "workflow-item-entry-0147",
    last_entry_ref: "collaboration-entry://prompt",
    participant_refs: ["client://client-0147"],
    thread_id: "collaboration-thread://customer/workflow-item-entry-0147",
    visibility_class: "CUSTOMER_VISIBLE",
  });
  const prompt = baseEntry({
    causal_parent_entry_ref: "collaboration-entry://seed",
    entry_id: "collaboration-entry://prompt",
    entry_type: "REQUEST_INFO",
    request_info_ref: "request-info://workflow-item-entry-0147/1",
    thread_id: thread.thread_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });
  const response = baseEntry({
    causal_parent_entry_ref: prompt.entry_id,
    entry_type: "REQUEST_INFO_RESPONSE",
    request_info_ref: "request-info://workflow-item-entry-0147/2",
    thread_id: thread.thread_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });

  expect(() =>
    validateCollaborationEntryVisibility({
      entry: response,
      parent_entry: prompt,
      request_prompt_entry_ref: prompt.entry_id,
      thread,
    }),
  ).toThrow(WorkflowModelError);
});
