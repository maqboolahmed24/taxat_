import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import {
  buildCrossDeviceContinuityContract,
  buildCustomerSafeProjectionContract,
  buildFocusRestorationContract,
  buildVisibilityPartitionContract,
  type CrossDeviceContinuityContract,
  type CustomerSafeProjectionContract,
  type FocusRestorationContract,
  type VisibilityPartitionContract,
  type WorkItemNotificationShellFamily,
  type WorkItemNotificationTargetModuleCode,
  type WorkItemNotificationType,
} from "../models/work_item_notification.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type NotificationRouteAndFocusContract = {
  cross_device_continuity_contract: CrossDeviceContinuityContract;
  customer_safe_projection: CustomerSafeProjectionContract | null;
  fallback_focus_anchor_ref: string;
  fallback_reason_code_or_null: string;
  fallback_route_ref: string;
  focus_anchor_ref: string | null;
  focus_restoration: FocusRestorationContract;
  object_anchor_ref: string;
  return_focus_anchor_ref: string;
  return_route_ref: string;
  shell_family: WorkItemNotificationShellFamily;
  target_module_code: WorkItemNotificationTargetModuleCode | null;
  target_route_ref: string;
  visibility_partition: VisibilityPartitionContract;
};

export type BuildNotificationRouteAndFocusContractInput = {
  access_binding_hash: string;
  cache_partition_key: string;
  fallback_focus_anchor_ref?: string | undefined;
  fallback_reason_code_or_null?: string | undefined;
  fallback_route_ref?: string | undefined;
  focus_anchor_ref?: string | null | undefined;
  item_id: string;
  masking_posture_fingerprint: string;
  notification_type: WorkItemNotificationType;
  request_info_ref?: string | null | undefined;
  return_focus_anchor_ref?: string | undefined;
  return_route_ref?: string | undefined;
  target_module_code?: WorkItemNotificationTargetModuleCode | null | undefined;
  visibility_class: CollaborationVisibilityClass;
};

function defaultModuleForNotification(input: {
  notification_type: WorkItemNotificationType;
  visibility_class: CollaborationVisibilityClass;
}) {
  if (
    input.notification_type === "REQUEST_INFO_OPENED" ||
    input.notification_type === "CUSTOMER_VISIBLE_COMMENT"
  ) {
    return "CUSTOMER_ACTIVITY" as const;
  }
  if (
    input.visibility_class === "INTERNAL_ONLY" &&
    (input.notification_type === "NEW_ASSIGNMENT" ||
      input.notification_type === "REASSIGNMENT" ||
      input.notification_type === "ESCALATION" ||
      input.notification_type === "CUSTOMER_REPLY")
  ) {
    return input.notification_type === "CUSTOMER_REPLY" ? "CUSTOMER_ACTIVITY" : "INTERNAL_ACTIVITY";
  }
  return null;
}

function defaultFocusAnchor(input: {
  item_id: string;
  module_code: WorkItemNotificationTargetModuleCode | null;
  request_info_ref: string | null;
}) {
  if (input.module_code === null) {
    return null;
  }
  if (input.module_code === "CUSTOMER_ACTIVITY" && input.request_info_ref !== null) {
    return `request-info-focus://${input.request_info_ref}`;
  }
  return `work-item-focus://${input.item_id}/${input.module_code.toLowerCase().replaceAll("_", "-")}`;
}

export function buildNotificationRouteAndFocusContract(
  input: BuildNotificationRouteAndFocusContractInput,
): NotificationRouteAndFocusContract {
  if (input.visibility_class === "CUSTOMER_VISIBLE" && input.notification_type === "CUSTOMER_REPLY") {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "CUSTOMER_REPLY is a staff notification and cannot target the client portal",
    );
  }
  const shellFamily = input.visibility_class === "CUSTOMER_VISIBLE" ? "CLIENT_PORTAL_SHELL" : "CALM_SHELL";
  const targetRoute =
    input.visibility_class === "CUSTOMER_VISIBLE"
      ? `/portal/requests/${input.item_id}`
      : `/work/items/${input.item_id}`;
  const returnRoute =
    input.return_route_ref ?? (input.visibility_class === "CUSTOMER_VISIBLE" ? "/portal/requests" : "/work");
  const returnFocus =
    input.return_focus_anchor_ref ??
    (input.visibility_class === "CUSTOMER_VISIBLE"
      ? `portal-request-row://${input.item_id}`
      : `work-inbox-row://${input.item_id}`);
  const targetModuleCode =
    input.target_module_code === undefined
      ? defaultModuleForNotification(input)
      : input.target_module_code;
  const focusAnchor =
    input.focus_anchor_ref === undefined
      ? defaultFocusAnchor({
          item_id: input.item_id,
          module_code: targetModuleCode,
          request_info_ref: input.request_info_ref ?? null,
        })
      : input.focus_anchor_ref;
  if (targetModuleCode === null && focusAnchor !== null) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "focus_anchor_ref must clear when target_module_code is null",
    );
  }
  if (targetModuleCode !== null && focusAnchor === null) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "target_module_code requires a non-null focus_anchor_ref",
    );
  }

  const visibilityPartition = buildVisibilityPartitionContract({
    access_binding_hash: input.access_binding_hash,
    cache_partition_key: input.cache_partition_key,
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    visibility_class: input.visibility_class,
  });
  const customerSafeProjection =
    input.visibility_class === "CUSTOMER_VISIBLE"
      ? buildCustomerSafeProjectionContract({
          access_binding_hash: input.access_binding_hash,
          masking_posture_fingerprint: input.masking_posture_fingerprint,
          visibility_cache_partition_key: input.cache_partition_key,
        })
      : null;

  return {
    cross_device_continuity_contract: buildCrossDeviceContinuityContract({
      access_binding_hash: input.access_binding_hash,
      canonical_object_ref: input.item_id,
      focus_anchor_ref: focusAnchor,
      masking_posture_fingerprint: input.masking_posture_fingerprint,
      parent_context_ref: returnRoute,
      return_focus_anchor_ref: returnFocus,
      route_identity_ref: targetRoute,
      shell_family: shellFamily,
      visibility_cache_partition_key: input.cache_partition_key,
      visibility_class: input.visibility_class,
    }),
    customer_safe_projection: customerSafeProjection,
    fallback_focus_anchor_ref: input.fallback_focus_anchor_ref ?? returnFocus,
    fallback_reason_code_or_null:
      input.fallback_reason_code_or_null ?? "NOTIFICATION_RETURN_TARGET_UNAVAILABLE",
    fallback_route_ref: input.fallback_route_ref ?? returnRoute,
    focus_anchor_ref: focusAnchor,
    focus_restoration: buildFocusRestorationContract(focusAnchor),
    object_anchor_ref: input.item_id,
    return_focus_anchor_ref: returnFocus,
    return_route_ref: returnRoute,
    shell_family: shellFamily,
    target_module_code: targetModuleCode,
    target_route_ref: targetRoute,
    visibility_partition: visibilityPartition,
  };
}
