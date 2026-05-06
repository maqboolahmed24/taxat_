import { expect, test } from "@playwright/test";

import {
  buildWorkInboxSnapshot,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";
import { workInboxItems, workInboxNotifications } from "./workspace_projection_fixtures.ts";

test("builds a canonical staff work inbox snapshot from persisted routing and unread lineage", () => {
  const items = workInboxItems();
  const snapshot = buildWorkInboxSnapshot({
    access_binding_hash: "access-0151",
    active_filters: {
      assignee_scope: "MINE",
      due_states: ["OVERDUE"],
      waiting_on_actors: ["CUSTOMER"],
    },
    items,
    masking_posture_fingerprint: "mask-0151",
    notifications: workInboxNotifications(),
    selected_item_ref: "workflow-item-0151-a",
    tenant_id: "tenant-0151",
    viewer_principal_ref: "user://staff-owner",
  });

  expect(snapshot.shell_family).toBe("CALM_SHELL");
  expect(snapshot.interaction_layer.recovery_notice_surface).toBe("CONTEXT_BAR");
  expect(snapshot.active_filters.selected_filter_chips).toEqual([
    "MINE",
    "WAITING_ON_CUSTOMER",
    "OVERDUE",
  ]);
  expect(snapshot.rows.map((row) => row.item_id)).toEqual(["workflow-item-0151-a"]);
  expect(snapshot.selected_focus_anchor_ref_or_null).toBe(snapshot.rows[0]!.focus_anchor_ref);
  expect(snapshot.queue_health_contract.queue_route_key).toBe("/work/inbox");

  const row = snapshot.rows[0]!;
  expect(row.queue_projection.projection_scope).toBe("WORK_INBOX_ROW");
  expect(row.queue_projection.routing_contract.routing_scope).toBe("WORK_INBOX_ROW");
  expect(row.customer_unread_count).toBe(1);
  expect(row.internal_unread_count).toBe(1);
  expect(row.queue_projection.customer_activity_module_badge_count).toBe(row.customer_unread_count);
  expect(row.queue_projection.internal_activity_module_badge_count_or_null).toBe(
    row.internal_unread_count,
  );
  expect(row.row_actions.primary_action_code).toBe("REQUEST_CUSTOMER_INFO");
  expect(row.row_actions.available_action_codes).toContain(row.row_actions.primary_action_code);
  expect(row.row_actions.blocked_action_codes).not.toContain(row.row_actions.primary_action_code);
  expect(
    row.row_actions.available_action_bindings[0]?.mutation_precondition_binding_or_null
      ?.profile_code,
  ).toBe("WORK_ITEM_CUSTOMER_APPEND");
  expect(row.row_actions.authoritative_action.primary_action_code_or_null).toBe(
    row.row_actions.primary_action_code,
  );
});

test("orders rows by the persisted canonical routing tuple", () => {
  const snapshot = buildWorkInboxSnapshot({
    access_binding_hash: "access-0151",
    items: workInboxItems().slice().reverse(),
    masking_posture_fingerprint: "mask-0151",
    notifications: workInboxNotifications(),
    tenant_id: "tenant-0151",
  });

  expect(snapshot.rows.map((row) => row.item_id)).toEqual([
    "workflow-item-0151-a",
    "workflow-item-0151-b",
    "workflow-item-0151-c",
  ]);
});

test("fails closed when selected item is not mounted", () => {
  expect(() =>
    buildWorkInboxSnapshot({
      access_binding_hash: "access-0151",
      active_filters: {
        assignee_scope: "UNASSIGNED",
      },
      items: workInboxItems(),
      masking_posture_fingerprint: "mask-0151",
      selected_item_ref: "workflow-item-0151-a",
      tenant_id: "tenant-0151",
    }),
  ).toThrow(WorkflowModelError);
});
