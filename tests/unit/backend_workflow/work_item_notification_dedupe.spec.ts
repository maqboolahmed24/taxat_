import { expect, test } from "@playwright/test";

import {
  buildWorkItemNotification,
  buildWorkflowItem,
  computeWorkItemNotificationDedupeKey,
  markWorkItemNotificationDelivered,
  markWorkItemNotificationRead,
  publishWorkItemNotification,
  suppressRedundantWorkItemNotifications,
  WorkItemNotificationRepository,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function item() {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0149-dedupe",
    collaboration_visibility: "CUSTOMER_SHARED",
    current_assignee_ref: "user://staff-owner",
    dedupe_key: "client-0149:notification-dedupe",
    item_id: "workflow-item-0149-dedupe",
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0149",
    title: "Notification dedupe item",
    type: "NOTIFICATION_DEDUPE",
  });
}

const base = {
  access_binding_hash: "access-hash-dedupe",
  item_id: "workflow-item-0149-dedupe",
  masking_posture_fingerprint: "masking-fingerprint-dedupe",
  notification_type: "CUSTOMER_VISIBLE_COMMENT" as const,
  queued_at: "2026-04-30T10:00:00Z",
  recipient_ref: "client://client-0149-dedupe",
  target_module_code: "CUSTOMER_ACTIVITY" as const,
  target_route_ref: "/portal/requests/workflow-item-0149-dedupe",
  visibility_class: "CUSTOMER_VISIBLE" as const,
};

test("dedupe key is stable across delivery channels and changes for distinct focus contexts", () => {
  const key = computeWorkItemNotificationDedupeKey({
    ...base,
    focus_anchor_ref: "focus://customer-activity/a",
  });
  const sameChannelNeutral = computeWorkItemNotificationDedupeKey({
    ...base,
    focus_anchor_ref: "focus://customer-activity/a",
  });
  const differentFocus = computeWorkItemNotificationDedupeKey({
    ...base,
    focus_anchor_ref: "focus://customer-activity/b",
  });

  expect(sameChannelNeutral).toBe(key);
  expect(differentFocus).not.toBe(key);
});

test("duplicate publishes reuse the persisted artifact and suppress the retry side effect", async () => {
  const repository = new WorkItemNotificationRepository();
  const first = await publishWorkItemNotification({
    access_binding_hash: "access-hash-dedupe",
    delivery_channel: "IN_APP",
    item: item(),
    masking_posture_fingerprint: "masking-fingerprint-dedupe",
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-04-30T10:00:00Z",
    recipient_ref: "client://client-0149-dedupe",
    repository,
    semantic_action_id: "semantic-action://comment/one",
    visibility_class: "CUSTOMER_VISIBLE",
  });
  const retry = await publishWorkItemNotification({
    access_binding_hash: "access-hash-dedupe",
    delivery_channel: "EMAIL",
    item: item(),
    masking_posture_fingerprint: "masking-fingerprint-dedupe",
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-04-30T10:01:30Z",
    recipient_ref: "client://client-0149-dedupe",
    repository,
    semantic_action_id: "semantic-action://comment/retry",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  expect(first.publish_state).toBe("PUBLISHED");
  expect(retry.publish_state).toBe("DUPLICATE_SUPPRESSED");
  expect(retry.duplicate_replay).toBe(true);
  expect(retry.notification.notification_id).toBe(first.notification.notification_id);
  expect(await repository.listWorkItemNotificationsByRecipient("client://client-0149-dedupe")).toHaveLength(1);
});

test("suppression clears delivery/read state and delivered notifications cannot be suppressed", () => {
  const notification = buildWorkItemNotification({
    access_binding_hash: "access-hash-dedupe",
    delivery_channel: "IN_APP",
    item: item(),
    masking_posture_fingerprint: "masking-fingerprint-dedupe",
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-04-30T10:00:00Z",
    recipient_ref: "client://client-0149-dedupe",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  const suppressed = suppressRedundantWorkItemNotifications({
    notification,
    reason_codes: ["POLICY_SUPPRESSED"],
  });
  expect(suppressed.delivered_at).toBeNull();
  expect(suppressed.read_at).toBeNull();
  expect(suppressed.suppressed_reason_codes).toEqual(["POLICY_SUPPRESSED"]);

  expect(() =>
    suppressRedundantWorkItemNotifications({
      notification: { ...notification, delivered_at: "2026-04-30T10:01:00Z" },
      reason_codes: ["POLICY_SUPPRESSED"],
    }),
  ).toThrow(WorkflowModelError);
});

test("delivery and read helpers preserve queued-delivered-read monotonicity", async () => {
  const repository = new WorkItemNotificationRepository();
  const published = await publishWorkItemNotification({
    access_binding_hash: "access-hash-dedupe",
    delivery_channel: "IN_APP",
    item: item(),
    masking_posture_fingerprint: "masking-fingerprint-dedupe",
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-04-30T10:00:00Z",
    recipient_ref: "client://client-0149-read",
    repository,
    visibility_class: "CUSTOMER_VISIBLE",
  });

  await expect(
    markWorkItemNotificationRead({
      notification_id: published.notification.notification_id,
      read_at: "2026-04-30T10:03:00Z",
      repository,
    }),
  ).rejects.toThrow(WorkflowModelError);

  const delivered = await markWorkItemNotificationDelivered({
    delivered_at: "2026-04-30T10:01:00Z",
    notification_id: published.notification.notification_id,
    repository,
  });
  expect(delivered.delivered_at).toBe("2026-04-30T10:01:00Z");

  const read = await markWorkItemNotificationRead({
    notification_id: published.notification.notification_id,
    read_at: "2026-04-30T10:03:00Z",
    repository,
  });
  expect(read.read_at).toBe("2026-04-30T10:03:00Z");
});
