import { expect, test } from "@playwright/test";

import {
  buildWorkItemNotification,
  buildWorkflowItem,
  projectNotificationOpenTarget,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function item() {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0149",
    collaboration_visibility: "CUSTOMER_SHARED",
    current_assignee_ref: "user://staff-owner",
    dedupe_key: "client-0149:notification-contract",
    item_id: "workflow-item-0149-contract",
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0149",
    title: "Notification contract item",
    type: "NOTIFICATION_CONTRACT",
  });
}

const base = {
  access_binding_hash: "access-hash-0149",
  delivery_channel: "IN_APP" as const,
  item: item(),
  masking_posture_fingerprint: "masking-fingerprint-0149",
  queued_at: "2026-04-30T10:00:00Z",
  recipient_ref: "client://client-0149",
};

test("builds customer-visible request-info notifications with portal-safe route and continuity", () => {
  const notification = buildWorkItemNotification({
    ...base,
    notification_type: "REQUEST_INFO_OPENED",
    request_info_ref: "request-info://workflow-item-0149-contract/1",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  expect(notification.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(notification.target_route_ref).toBe(`/portal/requests/${notification.item_id}`);
  expect(notification.return_route_ref).toBe("/portal/requests");
  expect(notification.target_module_code).toBe("CUSTOMER_ACTIVITY");
  expect(notification.focus_anchor_ref).toBe(
    "request-info-focus://request-info://workflow-item-0149-contract/1",
  );
  expect(notification.customer_safe_projection).not.toBeNull();
  expect(notification.queue_projection.internal_unread_count_or_null).toBeNull();
  expect(notification.cross_device_continuity_contract.allowed_embodiments).toEqual([
    "BROWSER_WIDE",
    "BROWSER_NARROW_STACKED",
  ]);
});

test("builds customer-visible comment notifications with customer activity focus", () => {
  const notification = buildWorkItemNotification({
    ...base,
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-04-30T10:02:00Z",
    recipient_ref: "client://client-0149-comment",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  expect(notification.target_module_code).toBe("CUSTOMER_ACTIVITY");
  expect(notification.focus_anchor_ref).toBe(
    `work-item-focus://${notification.item_id}/customer-activity`,
  );
  expect(notification.request_info_ref).toBeNull();
});

test("builds internal reassignment notifications with internal activity focus and no portal projection", () => {
  const notification = buildWorkItemNotification({
    ...base,
    notification_type: "REASSIGNMENT",
    queued_at: "2026-04-30T10:04:00Z",
    recipient_ref: "user://staff-reviewer",
    visibility_class: "INTERNAL_ONLY",
  });

  expect(notification.shell_family).toBe("CALM_SHELL");
  expect(notification.target_route_ref).toBe(`/work/items/${notification.item_id}`);
  expect(notification.target_module_code).toBe("INTERNAL_ACTIVITY");
  expect(notification.customer_safe_projection).toBeNull();
  expect(notification.queue_projection.internal_unread_count_or_null).toBe(1);
  expect(notification.cross_device_continuity_contract.allowed_embodiments).toEqual([
    "BROWSER_WIDE",
    "BROWSER_NARROW_STACKED",
    "NATIVE_PRIMARY_SCENE",
    "NATIVE_SUPPORT_WINDOW",
  ]);
});

test("fails closed on illegal focus, request-info, read, and portal visibility combinations", () => {
  expect(() =>
    buildWorkItemNotification({
      ...base,
      focus_anchor_ref: null,
      notification_type: "REQUEST_INFO_OPENED",
      request_info_ref: "request-info://workflow-item-0149-contract/1",
      target_module_code: "CUSTOMER_ACTIVITY",
      visibility_class: "CUSTOMER_VISIBLE",
    }),
  ).toThrow(WorkflowModelError);

  expect(() =>
    buildWorkItemNotification({
      ...base,
      notification_type: "CUSTOMER_VISIBLE_COMMENT",
      read_at: "2026-04-30T10:03:00Z",
      visibility_class: "CUSTOMER_VISIBLE",
    }),
  ).toThrow(WorkflowModelError);

  expect(() =>
    buildWorkItemNotification({
      ...base,
      notification_type: "REASSIGNMENT",
      visibility_class: "CUSTOMER_VISIBLE",
    }),
  ).toThrow(WorkflowModelError);
});

test("invalidates stale open continuity without exposing an active target", () => {
  const notification = buildWorkItemNotification({
    ...base,
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  const projection = projectNotificationOpenTarget({
    current_access_binding_hash: "access-hash-new",
    notification,
  });
  expect(projection.open_state).toBe("INVALIDATED");
  expect(projection.target_route_ref).toBeNull();
  expect(projection.invalidation_reason_codes).toEqual(["ACCESS_BINDING_CHANGE"]);
});
