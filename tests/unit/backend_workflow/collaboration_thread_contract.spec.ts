import { expect, test } from "@playwright/test";

import {
  buildCollaborationThread,
  buildWorkflowItem,
  CollaborationThreadRepository,
  ensureWorkItemThreadsExist,
  validateCollaborationThreadSequence,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function item(overrides: Partial<Parameters<typeof buildWorkflowItem>[0]> = {}) {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0147",
    dedupe_key: `client-0147:thread:${overrides.item_id ?? "default"}`,
    item_id: "workflow-item-thread-0147",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0147",
    title: "Thread contract",
    type: "THREAD_CONTRACT",
    ...overrides,
  });
}

test("bootstraps both customer and internal threads for customer-shared items", async () => {
  const repository = new CollaborationThreadRepository();
  const threads = await ensureWorkItemThreadsExist({
    customer_participant_refs: ["client://client-0147"],
    item: item({
      collaboration_visibility: "CUSTOMER_SHARED",
      item_id: "workflow-item-thread-customer",
    }),
    staff_participant_refs: ["user://staff-owner"],
    thread_repository: repository,
  });

  expect(threads.map((thread) => thread.visibility_class).sort()).toEqual([
    "CUSTOMER_VISIBLE",
    "INTERNAL_ONLY",
  ]);
  expect(threads.every((thread) => thread.head_sequence === 0)).toBe(true);
});

test("bootstraps only the internal thread for internal-only items", async () => {
  const repository = new CollaborationThreadRepository();
  const threads = await ensureWorkItemThreadsExist({
    item: item({ item_id: "workflow-item-thread-internal" }),
    staff_participant_refs: ["user://staff-owner"],
    thread_repository: repository,
  });

  expect(threads).toHaveLength(1);
  expect(threads[0]?.visibility_class).toBe("INTERNAL_ONLY");
});

test("enforces empty and non-empty thread head invariants", () => {
  expect(() =>
    buildCollaborationThread({
      head_sequence: 0,
      item_id: "workflow-item-thread-invalid",
      last_entry_ref: "collaboration-entry://1",
      participant_refs: ["user://staff-owner"],
      visibility_class: "INTERNAL_ONLY",
    }),
  ).toThrow(WorkflowModelError);

  expect(() =>
    validateCollaborationThreadSequence({
      entries: [],
      thread: buildCollaborationThread({
        head_sequence: 1,
        item_id: "workflow-item-thread-gap",
        last_entry_ref: "collaboration-entry://missing",
        participant_refs: ["user://staff-owner"],
        visibility_class: "INTERNAL_ONLY",
      }),
    }),
  ).toThrow(WorkflowModelError);
});
