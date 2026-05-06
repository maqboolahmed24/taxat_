import { expect, test } from "@playwright/test";

import {
  buildWorkflowItem,
  projectIncrementalWorkInboxDelta,
  projectWorkInboxForViewer,
  WorkInboxDeltaRepository,
  WorkInboxSnapshotRepository,
  WorkItemNotificationRepository,
  WorkflowItemRepository,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  workInboxItems,
  workInboxNotifications,
} from "../../unit/backend_workflow/workspace_projection_fixtures.ts";

test("projects a persisted inbox snapshot and replay-safe live delta", async () => {
  const itemRepository = new WorkflowItemRepository();
  const notificationRepository = new WorkItemNotificationRepository();
  const snapshotRepository = new WorkInboxSnapshotRepository();
  const deltaRepository = new WorkInboxDeltaRepository();
  const items = workInboxItems();

  for (const item of items) {
    await itemRepository.persistWorkflowItem({ item });
  }
  for (const notification of workInboxNotifications()) {
    await notificationRepository.persistWorkItemNotification({ notification });
  }

  const previous = await projectWorkInboxForViewer({
    access_binding_hash: "access-0151",
    item_repository: itemRepository,
    masking_posture_fingerprint: "mask-0151",
    notification_repository: notificationRepository,
    repository: snapshotRepository,
    selected_item_ref: "workflow-item-0151-a",
    tenant_id: "tenant-0151",
  });

  const first = items[0]!;
  const { routing_contract: _routingContract, ...firstInput } = first;
  const movedFirst = buildWorkflowItem({
    ...firstInput,
    collaboration_priority_score: 10,
    resolution_confidence_score: 80,
    staff_workspace_version: first.staff_workspace_version + 1,
  });
  await itemRepository.persistWorkflowItem({ item: movedFirst });

  const next = await projectWorkInboxForViewer({
    access_binding_hash: "access-0151",
    item_repository: itemRepository,
    masking_posture_fingerprint: "mask-0151",
    notification_repository: notificationRepository,
    repository: snapshotRepository,
    selected_item_ref: "workflow-item-0151-a",
    tenant_id: "tenant-0151",
  });
  const projectedDelta = await projectIncrementalWorkInboxDelta({
    causal_semantic_action_id: "semantic-action://pc0151/integration-reorder",
    delta_repository: deltaRepository,
    focused_item_ref_or_null: "workflow-item-0151-a",
    next_snapshot: next.snapshot,
    occurred_at: "2026-04-30T12:00:00Z",
    previous_snapshot: previous.snapshot,
  });

  expect(previous.snapshot.rows[0]!.item_id).toBe("workflow-item-0151-a");
  expect(next.snapshot.rows.at(-1)?.item_id).toBe("workflow-item-0151-a");
  expect(
    projectedDelta.delta.row_upserts.find((upsert) => upsert.item_id === "workflow-item-0151-a")
      ?.defer_reorder_until_focus_exit,
  ).toBe(true);
  expect(
    await deltaRepository.findWorkInboxDeltaByCausalSemanticActionId(
      "semantic-action://pc0151/integration-reorder",
    ),
  ).not.toBeNull();
});
