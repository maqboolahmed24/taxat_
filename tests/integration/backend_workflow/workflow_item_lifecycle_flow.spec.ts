import { expect, test } from "@playwright/test";

import {
  advanceWorkflowItem,
  buildWorkflowItem,
  closeOrSupersedeWorkflowItem,
  openOrReuseWorkflowItem,
  syncWorkflowItemAuthorityTruth,
  WorkflowItemRepository,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function openInput(id: string, dedupeKey = "client-0145:2026-q1:lifecycle") {
  return {
    authority_truth_state: "CONFIRMED" as const,
    client_id: "client-0145",
    collaboration_visibility: "CUSTOMER_SHARED" as const,
    dedupe_key: dedupeKey,
    item_id: id,
    opened_at: "2026-04-29T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0145",
    title: "Lifecycle flow",
    type: "LIFECYCLE_FLOW",
  };
}

test("opens, reuses, advances, syncs authority truth, and closes a workflow item", async () => {
  const repository = new WorkflowItemRepository();
  const opened = await openOrReuseWorkflowItem({
    ...openInput("workflow-item-lifecycle-0145"),
    repository,
  });
  expect(opened.reused).toBe(false);
  expect(opened.item.customer_status_projection).toBe("UNDER_REVIEW");

  const reused = await openOrReuseWorkflowItem({
    ...openInput("workflow-item-lifecycle-0145-duplicate"),
    repository,
  });
  expect(reused.reused).toBe(true);
  expect(reused.item.item_id).toBe(opened.item.item_id);

  const inProgress = advanceWorkflowItem({
    item: opened.item,
    to_state: "IN_PROGRESS",
    transition_applied_at: "2026-04-29T09:05:00Z",
    transition_audit_ref: "audit://workflow-item-lifecycle-0145/picked-up",
    transition_event_code: "picked_up",
  });
  await repository.persistWorkflowItem({
    expected_staff_workspace_version: opened.item.staff_workspace_version,
    item: inProgress,
  });

  const waitingOnClient = advanceWorkflowItem({
    active_request_info_ref: "request-info://workflow-item-lifecycle-0145/1",
    item: inProgress,
    to_state: "WAITING_ON_CLIENT",
    transition_applied_at: "2026-04-29T09:10:00Z",
    transition_audit_ref: "audit://workflow-item-lifecycle-0145/request-info",
    transition_event_code: "request_info_sent",
  });
  expect(waitingOnClient.customer_status_projection).toBe("ACTION_REQUIRED");
  await repository.persistWorkflowItem({
    expected_staff_workspace_version: inProgress.staff_workspace_version,
    item: waitingOnClient,
  });

  const responded = advanceWorkflowItem({
    item: waitingOnClient,
    target_request_info_ref: "request-info://workflow-item-lifecycle-0145/1",
    to_state: "IN_PROGRESS",
    transition_applied_at: "2026-04-29T09:30:00Z",
    transition_audit_ref: "audit://workflow-item-lifecycle-0145/customer-response",
    transition_event_code: "client_response",
  });
  expect(responded.active_request_info_ref).toBeNull();

  const authorityWaiting = syncWorkflowItemAuthorityTruth({
    authority_truth_state: "PENDING_ACK",
    changed_at: "2026-04-29T09:35:00Z",
    item: responded,
    transition_audit_ref: "audit://workflow-item-lifecycle-0145/authority-wait",
  });
  expect(authorityWaiting.lifecycle_state).toBe("WAITING_ON_AUTHORITY");
  expect(authorityWaiting.customer_status_projection).toBe("WAITING_ON_CONFIRMATION");

  const authorityConfirmed = syncWorkflowItemAuthorityTruth({
    authority_truth_state: "CONFIRMED",
    changed_at: "2026-04-29T09:50:00Z",
    item: authorityWaiting,
    transition_audit_ref: "audit://workflow-item-lifecycle-0145/authority-confirmed",
  });
  expect(authorityConfirmed.lifecycle_state).toBe("IN_PROGRESS");
  expect(authorityConfirmed.customer_status_projection).toBe("UNDER_REVIEW");

  const done = advanceWorkflowItem({
    item: authorityConfirmed,
    to_state: "DONE",
    transition_applied_at: "2026-04-29T10:00:00Z",
    transition_audit_ref: "audit://workflow-item-lifecycle-0145/done",
    transition_event_code: "resolved",
  });
  const storedDone = await repository.persistWorkflowItem({ item: done });
  expect(storedDone.record.closed_at).toBe("2026-04-29T10:00:00Z");
  expect(storedDone.record.customer_status_projection).toBe("RESOLVED");

  expect(() =>
    syncWorkflowItemAuthorityTruth({
      authority_truth_state: "UNKNOWN",
      changed_at: "2026-04-29T10:30:00Z",
      item: storedDone.record,
      transition_audit_ref: "audit://workflow-item-lifecycle-0145/late-correction",
    }),
  ).toThrow(WorkflowModelError);
});

test("enforces duplicate active dedupe keys and permits superseding replacements", async () => {
  const repository = new WorkflowItemRepository();
  const first = await openOrReuseWorkflowItem({
    ...openInput("workflow-item-supersede-0145"),
    repository,
  });
  await expect(
    repository.persistWorkflowItem({
      item: buildWorkflowItem({
        ...openInput("workflow-item-supersede-0145-conflict"),
      }),
    }),
  ).rejects.toThrow(WorkflowModelError);

  const result = await closeOrSupersedeWorkflowItem({
    item_id: first.item.item_id,
    repository,
    successor: {
      ...openInput("workflow-item-supersede-0145-successor"),
      title: "Lifecycle flow superseded by new context",
    },
    terminal_state: "STALE",
    transition_applied_at: "2026-04-29T09:20:00Z",
    transition_audit_ref: "audit://workflow-item-supersede-0145/stale",
  });

  expect(result.closed_item.lifecycle_state).toBe("STALE");
  expect(result.successor_item?.item_id).toBe("workflow-item-supersede-0145-successor");
  expect(result.successor_reused).toBe(false);
  const active = await repository.findActiveWorkflowItemByDedupeKey(openInput("ignored"));
  expect(active?.record.item_id).toBe("workflow-item-supersede-0145-successor");
});
