import { expect, test } from "@playwright/test";

import {
  assertCustomerSafeProjectionAlignment,
  buildWorkflowCustomerSafeProjectionContract,
  buildWorkflowItem,
  buildWorkflowVisibilityPartitionContract,
  buildWorkItemNotification,
  enforceCustomerSafeProjectionAndVisibilityPartition,
  enforceVisibilityPartition,
} from "../../../packages/backend-workflow/src/index.ts";

function notificationItem() {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0152",
    collaboration_visibility: "CUSTOMER_SHARED",
    current_assignee_ref: "user://staff-owner",
    dedupe_key: "client-0152:notification",
    item_id: "workflow-item-0152-notification",
    lifecycle_state: "WAITING_ON_CLIENT",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0152",
    title: "Request information",
    type: "REQUEST_INFO",
    waiting_on_actor: "CUSTOMER",
  });
}

test("visibility partition builder freezes customer cache and masking basis", () => {
  const visibilityPartition = buildWorkflowVisibilityPartitionContract({
    access_binding_hash: "access-0152",
    allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    audience_class: "CLIENT_PORTAL",
    badge_counter_policy: "SURFACE_VISIBLE_ONLY",
    masking_posture_fingerprint: "mask-0152",
    ordering_side_channel_policy: "CANONICAL_LIST_ONLY",
    partition_scope: "CUSTOMER_REQUEST_LIST",
    subject_ref: "client://client-0152/requests",
  });

  expect(visibilityPartition.cache_partition_key).toContain(
    "projection-cache://CUSTOMER_REQUEST_LIST",
  );
  expect(
    enforceVisibilityPartition({
      artifact: {
        access_binding_hash: "access-0152",
        masking_posture_fingerprint: "mask-0152",
        visibility_partition: visibilityPartition,
      },
      expected_allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
      expected_audience_class: "CLIENT_PORTAL",
      expected_partition_scope: "CUSTOMER_REQUEST_LIST",
    }),
  ).toEqual(visibilityPartition);
});

test("visibility partition fails closed when top-level binding drifts", () => {
  const visibilityPartition = buildWorkflowVisibilityPartitionContract({
    access_binding_hash: "access-0152",
    allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    audience_class: "CUSTOMER_COLLABORATION",
    badge_counter_policy: "SURFACE_VISIBLE_ONLY",
    masking_posture_fingerprint: "mask-0152",
    ordering_side_channel_policy: "VISIBLE_EVENTS_ONLY",
    partition_scope: "COLLABORATION_ACTIVITY_SLICE",
    subject_ref: "workspace://workflow-item-0152/activity",
  });

  expect(() =>
    enforceVisibilityPartition({
      artifact: {
        access_binding_hash: "different-access",
        masking_posture_fingerprint: "mask-0152",
        visibility_partition: visibilityPartition,
      },
      expected_allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
      expected_audience_class: "CUSTOMER_COLLABORATION",
      expected_partition_scope: "COLLABORATION_ACTIVITY_SLICE",
    }),
  ).toThrow(/access_binding_hash/i);
});

test("customer-visible activity slices fail closed on internal-only visibility lanes", () => {
  const visibilityPartition = buildWorkflowVisibilityPartitionContract({
    access_binding_hash: "access-0152",
    allowed_visibility_classes: ["INTERNAL_ONLY"],
    audience_class: "STAFF",
    badge_counter_policy: "SURFACE_VISIBLE_ONLY",
    masking_posture_fingerprint: "mask-0152",
    ordering_side_channel_policy: "VISIBLE_EVENTS_ONLY",
    partition_scope: "COLLABORATION_ACTIVITY_SLICE",
    subject_ref: "workspace://workflow-item-0152/internal-activity",
  });
  const customerSafeProjection = buildWorkflowCustomerSafeProjectionContract({
    access_binding_hash: "access-0152",
    boundary_scope: "COLLABORATION_ACTIVITY_SLICE",
    masking_posture_fingerprint: "mask-0152",
    projection_audience: "CUSTOMER_COLLABORATION",
    visibility_cache_partition_key: visibilityPartition.cache_partition_key,
  });

  expect(() =>
    enforceCustomerSafeProjectionAndVisibilityPartition({
      artifact: {
        access_binding_hash: "access-0152",
        artifact_type: "CollaborationActivitySlice",
        customer_safe_projection: customerSafeProjection,
        masking_posture_fingerprint: "mask-0152",
        thread_visibility_class: "INTERNAL_ONLY",
        viewer_scope: "CUSTOMER_VISIBLE",
        visibility_partition: visibilityPartition,
      },
      expected_allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
      expected_boundary_scope: "COLLABORATION_ACTIVITY_SLICE",
      expected_partition_scope: "COLLABORATION_ACTIVITY_SLICE",
      expected_projection_audience: "CUSTOMER_COLLABORATION",
      expected_visibility_audience_class: "CUSTOMER_COLLABORATION",
      requirement: "REQUIRED",
    }),
  ).toThrow(/allowed_visibility_classes|audience_class|customer visibility/i);
});

test("customer notifications keep portal same-shell navigation policy", () => {
  const notification = buildWorkItemNotification({
    access_binding_hash: "access-0152",
    delivery_channel: "IN_APP",
    item: notificationItem(),
    masking_posture_fingerprint: "mask-0152",
    notification_type: "REQUEST_INFO_OPENED",
    queued_at: "2026-04-30T09:00:00Z",
    recipient_ref: "client://client-0152",
    request_info_ref: "request-info://workflow-item-0152-notification/1",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  expect(notification.customer_safe_projection?.notification_navigation_policy).toBe(
    "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
  );
  expect(notification.target_route_ref).toBe("/portal/requests/workflow-item-0152-notification");
  expect(notification.target_module_code).toBe("CUSTOMER_ACTIVITY");
});

test("internal-only notifications must not publish fake customer-safe contracts", () => {
  const internal = buildWorkItemNotification({
    access_binding_hash: "access-0152",
    delivery_channel: "IN_APP",
    item: notificationItem(),
    masking_posture_fingerprint: "mask-0152",
    notification_type: "NEW_ASSIGNMENT",
    queued_at: "2026-04-30T09:00:00Z",
    recipient_ref: "user://staff-owner",
    visibility_class: "INTERNAL_ONLY",
  });
  const customer = buildWorkItemNotification({
    access_binding_hash: "access-0152",
    delivery_channel: "IN_APP",
    item: notificationItem(),
    masking_posture_fingerprint: "mask-0152",
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-04-30T09:05:00Z",
    recipient_ref: "client://client-0152",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  expect(() =>
    assertCustomerSafeProjectionAlignment({
      artifact: {
        ...internal,
        customer_safe_projection: customer.customer_safe_projection,
      } as unknown as Record<string, unknown>,
      expected_allowed_visibility_classes: ["INTERNAL_ONLY"],
      expected_partition_scope: "WORK_ITEM_NOTIFICATION",
      expected_visibility_audience_class: "STAFF",
      requirement: "FORBIDDEN",
    }),
  ).toThrow(/must not publish customer_safe_projection/i);
});
