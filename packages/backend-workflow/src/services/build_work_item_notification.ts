import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import {
  normalizeCollaborationQueueProjectionContract,
  normalizeWorkItemNotification,
  normalizeWorkItemNotificationRoutingContract,
  notificationRoutingContractFromWorkflow,
  workItemNotificationId,
  type CollaborationQueueProjectionContract,
  type WorkItemNotification,
  type WorkItemNotificationDeliveryChannel,
  type WorkItemNotificationRoutingContract,
  type WorkItemNotificationTargetModuleCode,
  type WorkItemNotificationType,
} from "../models/work_item_notification.ts";
import {
  normalizeWorkflowItem,
  type WorkflowItem,
  type WorkflowRoutingContract,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import { assertCustomerSafeProjectionAlignment } from "./assert_customer_safe_projection_alignment.ts";
import { computeWorkItemNotificationDedupeKey } from "./compute_work_item_notification_dedupe_key.ts";
import { buildNotificationRouteAndFocusContract } from "./build_notification_route_and_focus_contract.ts";

export type BuildWorkItemNotificationQueueProjectionInput = {
  routing_contract: WorkflowRoutingContract | WorkItemNotificationRoutingContract;
  target_module_code: WorkItemNotificationTargetModuleCode | null;
  visibility_class: CollaborationVisibilityClass;
};

export type BuildWorkItemNotificationInput = {
  access_binding_hash: string;
  cache_partition_key?: string | undefined;
  dedupe_key?: string | undefined;
  delivered_at?: string | null | undefined;
  delivery_channel: WorkItemNotificationDeliveryChannel;
  fallback_focus_anchor_ref?: string | undefined;
  fallback_reason_code_or_null?: string | undefined;
  fallback_route_ref?: string | undefined;
  focus_anchor_ref?: string | null | undefined;
  item?: WorkflowItem | undefined;
  item_id?: string | undefined;
  masking_posture_fingerprint: string;
  notification_id?: string | undefined;
  notification_type: WorkItemNotificationType;
  queue_projection?: CollaborationQueueProjectionContract | undefined;
  queued_at: string;
  read_at?: string | null | undefined;
  recipient_ref: string;
  request_info_ref?: string | null | undefined;
  return_focus_anchor_ref?: string | undefined;
  return_route_ref?: string | undefined;
  routing_contract?: WorkflowRoutingContract | WorkItemNotificationRoutingContract | undefined;
  semantic_action_id?: string | undefined;
  suppressed_reason_codes?: readonly string[] | undefined;
  target_module_code?: WorkItemNotificationTargetModuleCode | null | undefined;
  workspace_version_at_queue?: number | undefined;
  visibility_class: CollaborationVisibilityClass;
};

function notificationRoutingForProjection(
  input: WorkflowRoutingContract | WorkItemNotificationRoutingContract,
) {
  if (input.routing_scope === "WORK_ITEM_NOTIFICATION") {
    return normalizeWorkItemNotificationRoutingContract(input as WorkItemNotificationRoutingContract);
  }
  return notificationRoutingContractFromWorkflow(input as WorkflowRoutingContract);
}

export function buildWorkItemNotificationQueueProjection(
  input: BuildWorkItemNotificationQueueProjectionInput,
): CollaborationQueueProjectionContract {
  const routingContract = notificationRoutingForProjection(input.routing_contract);
  const latestChangeLane =
    input.target_module_code === "CUSTOMER_ACTIVITY"
      ? "CUSTOMER_VISIBLE"
      : input.target_module_code === "INTERNAL_ACTIVITY"
        ? "INTERNAL_ONLY"
        : null;
  const customerUnreadCount = latestChangeLane === "CUSTOMER_VISIBLE" ? 1 : 0;
  const internalUnreadCount =
    input.visibility_class === "CUSTOMER_VISIBLE" ? null : latestChangeLane === "INTERNAL_ONLY" ? 1 : 0;

  return normalizeCollaborationQueueProjectionContract({
    basis_hash: routingContract.basis_hash,
    canonical_sort_key: routingContract.canonical_sort_key,
    customer_activity_module_badge_count: customerUnreadCount,
    customer_unread_count: customerUnreadCount,
    filter_membership_state: "IN_ACTIVE_FILTER_SET",
    focus_continuity_state:
      routingContract.focused_row_reorder_state === "DEFER_REORDER_UNTIL_FOCUS_EXIT"
        ? "PENDING_REORDER_UNTIL_FOCUS_EXIT"
        : "STABLE",
    internal_activity_module_badge_count_or_null: internalUnreadCount,
    internal_unread_count_or_null: internalUnreadCount,
    latest_change_lane_or_null: latestChangeLane,
    notification_target_module_code_or_null:
      input.target_module_code === "CUSTOMER_ACTIVITY" || input.target_module_code === "INTERNAL_ACTIVITY"
        ? input.target_module_code
        : null,
    projection_scope: "WORK_ITEM_NOTIFICATION",
    routing_contract: routingContract,
  });
}

export function buildWorkItemNotification(input: BuildWorkItemNotificationInput): WorkItemNotification {
  const item = input.item === undefined ? null : normalizeWorkflowItem(input.item);
  const itemId = item?.item_id ?? input.item_id;
  if (itemId === undefined) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "item_id is required when item is not supplied");
  }
  if (item !== null && input.item_id !== undefined && input.item_id !== item.item_id) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "notification item_id must match workflow item");
  }
  if (item !== null && input.visibility_class === "CUSTOMER_VISIBLE" && item.collaboration_visibility !== "CUSTOMER_SHARED") {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "customer-visible notifications require a customer-shared workflow item",
    );
  }
  const cachePartitionKey =
    input.cache_partition_key ??
    `work-item-notification-cache://${input.visibility_class}/${input.access_binding_hash}/${input.masking_posture_fingerprint}`;
  const routeContract = buildNotificationRouteAndFocusContract({
    access_binding_hash: input.access_binding_hash,
    cache_partition_key: cachePartitionKey,
    fallback_focus_anchor_ref: input.fallback_focus_anchor_ref,
    fallback_reason_code_or_null: input.fallback_reason_code_or_null,
    fallback_route_ref: input.fallback_route_ref,
    focus_anchor_ref: input.focus_anchor_ref,
    item_id: itemId,
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    notification_type: input.notification_type,
    request_info_ref: input.request_info_ref ?? null,
    return_focus_anchor_ref: input.return_focus_anchor_ref,
    return_route_ref: input.return_route_ref,
    target_module_code: input.target_module_code,
    visibility_class: input.visibility_class,
  });
  const routingContract = input.routing_contract ?? item?.routing_contract;
  const queueProjection =
    input.queue_projection ??
    (routingContract === undefined
      ? null
      : buildWorkItemNotificationQueueProjection({
          routing_contract: routingContract,
          target_module_code: routeContract.target_module_code,
          visibility_class: input.visibility_class,
        }));
  if (queueProjection === null) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      "queue_projection or routing_contract is required when item is not supplied",
    );
  }
  const workspaceVersion =
    input.workspace_version_at_queue ??
    (item === null
      ? undefined
      : input.visibility_class === "CUSTOMER_VISIBLE"
        ? item.customer_workspace_version
        : item.staff_workspace_version);
  if (workspaceVersion === undefined) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      "workspace_version_at_queue is required when item is not supplied",
    );
  }
  const semanticActionId =
    input.semantic_action_id ??
    `semantic-action://work-item-notification/${input.visibility_class}/${input.notification_type}/${itemId}`;
  const dedupeKey =
    input.dedupe_key ??
    computeWorkItemNotificationDedupeKey({
      access_binding_hash: input.access_binding_hash,
      focus_anchor_ref: routeContract.focus_anchor_ref,
      item_id: itemId,
      masking_posture_fingerprint: input.masking_posture_fingerprint,
      notification_type: input.notification_type,
      queued_at: input.queued_at,
      recipient_ref: input.recipient_ref,
      request_info_ref: input.request_info_ref ?? null,
      target_module_code: routeContract.target_module_code,
      target_route_ref: routeContract.target_route_ref,
      visibility_class: input.visibility_class,
    });

  const notification = normalizeWorkItemNotification({
    access_binding_hash: input.access_binding_hash,
    cross_device_continuity_contract: routeContract.cross_device_continuity_contract,
    customer_safe_projection: routeContract.customer_safe_projection,
    dedupe_key: dedupeKey,
    delivered_at: input.delivered_at ?? null,
    delivery_channel: input.delivery_channel,
    fallback_focus_anchor_ref: routeContract.fallback_focus_anchor_ref,
    fallback_reason_code_or_null: routeContract.fallback_reason_code_or_null,
    fallback_route_ref: routeContract.fallback_route_ref,
    focus_anchor_ref: routeContract.focus_anchor_ref,
    focus_restoration: routeContract.focus_restoration,
    item_id: itemId,
    notification_id: input.notification_id ?? workItemNotificationId({ dedupe_key: dedupeKey }),
    notification_type: input.notification_type,
    object_anchor_ref: routeContract.object_anchor_ref,
    queue_projection: queueProjection,
    queued_at: input.queued_at,
    read_at: input.read_at ?? null,
    recipient_ref: input.recipient_ref,
    request_info_ref: input.request_info_ref ?? null,
    return_focus_anchor_ref: routeContract.return_focus_anchor_ref,
    return_route_ref: routeContract.return_route_ref,
    semantic_action_id: semanticActionId,
    shell_family: routeContract.shell_family,
    suppressed_reason_codes: [...(input.suppressed_reason_codes ?? [])],
    target_module_code: routeContract.target_module_code,
    target_route_ref: routeContract.target_route_ref,
    visibility_class: input.visibility_class,
    visibility_partition: routeContract.visibility_partition,
    workspace_version_at_queue: workspaceVersion,
  });
  assertCustomerSafeProjectionAlignment({
    artifact: notification as unknown as Record<string, unknown>,
    expected_allowed_visibility_classes: [input.visibility_class],
    expected_boundary_scope:
      input.visibility_class === "CUSTOMER_VISIBLE" ? "WORK_ITEM_NOTIFICATION" : undefined,
    expected_partition_scope: "WORK_ITEM_NOTIFICATION",
    expected_projection_audience:
      input.visibility_class === "CUSTOMER_VISIBLE" ? "CLIENT_PORTAL" : undefined,
    expected_visibility_audience_class:
      input.visibility_class === "CUSTOMER_VISIBLE" ? "CLIENT_PORTAL" : "STAFF",
    requirement: input.visibility_class === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN",
  });
  return notification;
}
