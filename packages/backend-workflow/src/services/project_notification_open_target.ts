import {
  normalizeWorkItemNotification,
  type WorkItemNotification,
  type WorkItemNotificationOpenInvalidationReason,
} from "../models/work_item_notification.ts";
import { assertCustomerSafeProjectionAlignment } from "./assert_customer_safe_projection_alignment.ts";
import { stampNotificationOpenContinuityMetadata } from "./stamp_notification_open_continuity_metadata.ts";

export type ProjectNotificationOpenTargetInput = {
  current_access_binding_hash?: string | undefined;
  current_masking_posture_fingerprint?: string | undefined;
  current_visibility_cache_partition_key?: string | undefined;
  object_exists?: boolean | undefined;
  notification: WorkItemNotification;
  session_revoked?: boolean | undefined;
};

export type NotificationOpenTargetProjection =
  | {
      focus_anchor_ref: string | null;
      focus_restoration: WorkItemNotification["focus_restoration"];
      invalidation_reason_codes: [];
      object_anchor_ref: string;
      open_state: "OPENABLE";
      return_focus_anchor_ref: string;
      return_route_ref: string;
      shell_family: WorkItemNotification["shell_family"];
      target_module_code: WorkItemNotification["target_module_code"];
      target_route_ref: string;
    }
  | {
      focus_anchor_ref: null;
      focus_restoration: WorkItemNotification["focus_restoration"];
      invalidation_reason_codes: WorkItemNotificationOpenInvalidationReason[];
      object_anchor_ref: string;
      open_state: "INVALIDATED" | "SUPPRESSED";
      return_focus_anchor_ref: string;
      return_route_ref: string;
      shell_family: WorkItemNotification["shell_family"];
      target_module_code: null;
      target_route_ref: null;
    };

export function projectNotificationOpenTarget(
  input: ProjectNotificationOpenTargetInput,
): NotificationOpenTargetProjection {
  const notification = normalizeWorkItemNotification(input.notification);
  assertCustomerSafeProjectionAlignment({
    artifact: notification as unknown as Record<string, unknown>,
    expected_allowed_visibility_classes: [notification.visibility_class],
    expected_boundary_scope:
      notification.visibility_class === "CUSTOMER_VISIBLE" ? "WORK_ITEM_NOTIFICATION" : undefined,
    expected_partition_scope: "WORK_ITEM_NOTIFICATION",
    expected_projection_audience:
      notification.visibility_class === "CUSTOMER_VISIBLE" ? "CLIENT_PORTAL" : undefined,
    expected_visibility_audience_class:
      notification.visibility_class === "CUSTOMER_VISIBLE" ? "CLIENT_PORTAL" : "STAFF",
    requirement: notification.visibility_class === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN",
  });
  if (notification.suppressed_reason_codes.length > 0) {
    const continuity = stampNotificationOpenContinuityMetadata({
      notification,
      object_exists: false,
    });
    return {
      focus_anchor_ref: null,
      focus_restoration: continuity.focus_restoration,
      invalidation_reason_codes: ["OBJECT_GONE"],
      object_anchor_ref: notification.object_anchor_ref,
      open_state: "SUPPRESSED",
      return_focus_anchor_ref: notification.return_focus_anchor_ref,
      return_route_ref: notification.return_route_ref,
      shell_family: notification.shell_family,
      target_module_code: null,
      target_route_ref: null,
    };
  }

  const continuity = stampNotificationOpenContinuityMetadata({
    current_access_binding_hash: input.current_access_binding_hash,
    current_masking_posture_fingerprint: input.current_masking_posture_fingerprint,
    current_visibility_cache_partition_key: input.current_visibility_cache_partition_key,
    notification,
    object_exists: input.object_exists,
    session_revoked: input.session_revoked,
  });
  if (continuity.invalidation_reason_codes.length > 0) {
    return {
      focus_anchor_ref: null,
      focus_restoration: continuity.focus_restoration,
      invalidation_reason_codes: continuity.invalidation_reason_codes,
      object_anchor_ref: notification.object_anchor_ref,
      open_state: "INVALIDATED",
      return_focus_anchor_ref: notification.return_focus_anchor_ref,
      return_route_ref: notification.return_route_ref,
      shell_family: notification.shell_family,
      target_module_code: null,
      target_route_ref: null,
    };
  }
  return {
    focus_anchor_ref: notification.focus_anchor_ref,
    focus_restoration: continuity.focus_restoration,
    invalidation_reason_codes: [],
    object_anchor_ref: notification.object_anchor_ref,
    open_state: "OPENABLE",
    return_focus_anchor_ref: notification.return_focus_anchor_ref,
    return_route_ref: notification.return_route_ref,
    shell_family: notification.shell_family,
    target_module_code: notification.target_module_code,
    target_route_ref: notification.target_route_ref,
  };
}
