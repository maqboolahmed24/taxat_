import { expect, test } from "@playwright/test";

import {
  buildCustomerRequestListSnapshot,
  buildWorkItemNotification,
  buildWorkspaceSnapshot,
  projectNotificationOpenTarget,
  stampNotificationOpenContinuityMetadata,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  openRequestInfo,
  workflowProjectionItem,
  workspaceParticipants,
  workspaceThreads,
} from "../../unit/backend_workflow/workspace_projection_fixtures.ts";

test("queue to workspace close restores the serialized inbox row anchor", () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0155-queue-return" });
  const threads = workspaceThreads(item.item_id);

  const snapshot = buildWorkspaceSnapshot({
    access_binding_hash: "access-0155-flow",
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: "mask-0155-flow",
    participants: workspaceParticipants(item.item_id),
    return_focus_anchor_ref: `work-inbox-row://${item.item_id}`,
    return_route_ref: "/work",
    viewer_scope: "STAFF_FULL",
  });

  expect(snapshot.route_context.return_route_ref).toBe("/work");
  expect(snapshot.route_context.return_focus_anchor_ref).toBe(`work-inbox-row://${item.item_id}`);
  expect(snapshot.route_context.fallback_focus_anchor_ref).toBe(`work-inbox-row://${item.item_id}`);
  expect(snapshot.cross_device_continuity_contract.parent_context_ref_or_null).toBe("/work");
  expect(snapshot.route_context.focus_restoration.restoration_disposition).toBe("EXACT_FOCUS");
});

test("portal request detail preserves parent list tab, selected focus, and lawful fallback", () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0155-portal-return" });
  const requestList = buildCustomerRequestListSnapshot({
    access_binding_hash: "access-0155-flow",
    client_id: item.client_id,
    items: [item],
    masking_posture_fingerprint: "mask-0155-flow",
    selected_item_ref_or_null: item.item_id,
    tenant_id: item.tenant_id,
    updated_at: "2026-05-03T10:00:00Z",
  });
  const threads = workspaceThreads(item.item_id);
  const detail = buildWorkspaceSnapshot({
    access_binding_hash: "access-0155-flow",
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: "mask-0155-flow",
    participants: workspaceParticipants(item.item_id),
    return_focus_anchor_ref: requestList.selected_focus_anchor_ref_or_null ?? undefined,
    return_route_ref: requestList.request_list_route_key,
    viewer_scope: "CUSTOMER_VISIBLE",
  });

  expect(detail.cross_device_continuity_contract.continuity_scope).toBe("CLIENT_PORTAL_ROUTE");
  expect(detail.route_context.return_route_ref).toBe("/portal/requests");
  expect(detail.route_context.return_focus_anchor_ref).toBe(
    `customer-request-row://${item.item_id}`,
  );
  expect(requestList.continuity_fallback_order[2]?.target_kind).toBe("PARENT_RETURN");
  expect(requestList.continuity_fallback_order[3]?.route_ref).toBe("/portal/requests");
});

test("notification-open uses same-object summary fallback before parent and typed invalidation", () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0155-notification-flow" });
  const request = openRequestInfo(item.item_id);
  const notification = buildWorkItemNotification({
    access_binding_hash: "access-0155-flow",
    delivery_channel: "IN_APP",
    item,
    masking_posture_fingerprint: "mask-0155-flow",
    notification_type: "REQUEST_INFO_OPENED",
    queued_at: "2026-05-03T10:10:00Z",
    recipient_ref: "client://client-0150",
    request_info_ref: request.request_info_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });

  const staleFocus = stampNotificationOpenContinuityMetadata({
    focus_anchor_available: false,
    notification,
  });
  expect(staleFocus.open_state).toBe("FALLBACK_OBJECT_SUMMARY");
  expect(staleFocus.target_route_ref).toBe(notification.target_route_ref);
  expect(staleFocus.object_summary_anchor_ref_or_null).toBe(
    `object-summary://${notification.object_anchor_ref}`,
  );
  expect(staleFocus.continuity_fallback_order[1]?.target_kind).toBe("OBJECT_SUMMARY");

  const invalidated = projectNotificationOpenTarget({
    current_masking_posture_fingerprint: "mask-0155-new",
    notification,
    session_revoked: true,
  });
  expect(invalidated.open_state).toBe("INVALIDATED");
  expect(invalidated.target_route_ref).toBeNull();
  expect(invalidated.invalidation_reason_codes).toEqual(["MASKING_CHANGE", "SESSION_REVOKED"]);
});
