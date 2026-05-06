import { expect, test } from "@playwright/test";

import {
  buildWorkflowItem,
  buildWorkInboxDelta,
  buildWorkInboxSnapshot,
  coalesceWorkInboxDeltas,
} from "../../../packages/backend-workflow/src/index.ts";
import { workInboxItems, workInboxNotifications } from "./workspace_projection_fixtures.ts";

function snapshotFor(
  items = workInboxItems(),
  selected_item_ref: string | null = "workflow-item-0151-a",
) {
  return buildWorkInboxSnapshot({
    access_binding_hash: "access-0151",
    items,
    masking_posture_fingerprint: "mask-0151",
    notifications: workInboxNotifications(),
    selected_item_ref,
    tenant_id: "tenant-0151",
  });
}

test("emits focused-row reorder deltas with deferred focus posture", () => {
  const previous = snapshotFor();
  const first = workInboxItems()[0]!;
  const { routing_contract: _routingContract, ...firstInput } = first;
  const movedFirst = buildWorkflowItem({
    ...firstInput,
    collaboration_priority_score: 10,
    resolution_confidence_score: 80,
    staff_workspace_version: first.staff_workspace_version + 1,
  });
  const next = snapshotFor([movedFirst, ...workInboxItems().slice(1)]);

  const delta = buildWorkInboxDelta({
    causal_semantic_action_id: "semantic-action://pc0151/reorder",
    focused_item_ref_or_null: "workflow-item-0151-a",
    next_snapshot: next,
    occurred_at: "2026-04-30T11:00:00Z",
    previous_snapshot: previous,
  });

  const upsert = delta.row_upserts.find((row) => row.item_id === "workflow-item-0151-a");
  expect(upsert?.order_changed).toBe(true);
  expect(upsert?.defer_reorder_until_focus_exit).toBe(true);
  expect(upsert?.row.queue_projection.focus_continuity_state).toBe(
    "PENDING_REORDER_UNTIL_FOCUS_EXIT",
  );
  expect(upsert?.queue_projection_basis_hash).toBe(upsert?.row.queue_projection.basis_hash);
});

test("emits filter-exit placeholder when the focused row leaves the mounted filter set", () => {
  const previous = snapshotFor();
  const next = buildWorkInboxSnapshot({
    access_binding_hash: "access-0151",
    active_filters: {
      assignee_scope: "UNASSIGNED",
    },
    items: workInboxItems(),
    masking_posture_fingerprint: "mask-0151",
    notifications: workInboxNotifications(),
    tenant_id: "tenant-0151",
  });

  const delta = buildWorkInboxDelta({
    causal_semantic_action_id: "semantic-action://pc0151/filter-exit",
    focused_item_ref_or_null: "workflow-item-0151-a",
    next_snapshot: next,
    occurred_at: "2026-04-30T11:05:00Z",
    previous_snapshot: previous,
    removal_cause_by_item_id: {
      "workflow-item-0151-a": "FILTER_EXIT",
    },
  });

  const removal = delta.row_removals.find((row) => row.item_id === "workflow-item-0151-a");
  const placeholder = delta.row_upserts.find((row) => row.item_id === "workflow-item-0151-a");
  expect(removal?.removal_cause).toBe("FILTER_EXIT");
  expect(removal?.preserve_until_focus_exit).toBe(true);
  expect(placeholder?.row.queue_projection.focus_continuity_state).toBe(
    "PENDING_REMOVAL_UNTIL_FOCUS_EXIT",
  );
  expect(placeholder?.row.queue_projection.filter_membership_state).toBe(
    "FILTER_EXIT_PENDING_FOCUS_RELEASE",
  );
});

test("coalesces duplicate causal deliveries idempotently", () => {
  const previous = snapshotFor();
  const next = snapshotFor(workInboxItems(), null);
  const delta = buildWorkInboxDelta({
    causal_semantic_action_id: "semantic-action://pc0151/badge",
    next_snapshot: next,
    occurred_at: "2026-04-30T11:10:00Z",
    previous_snapshot: previous,
  });

  const coalesced = coalesceWorkInboxDeltas([delta, delta]);
  expect(coalesced?.causal_semantic_action_id).toBe(delta.causal_semantic_action_id);
  expect(coalesced?.row_upserts.length).toBe(delta.row_upserts.length);
});
