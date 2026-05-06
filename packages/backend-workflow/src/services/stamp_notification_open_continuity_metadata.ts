import {
  buildNotificationOpenContinuityContract,
  type CanonicalCrossDeviceContinuityContract,
} from "../contracts/build_cross_device_continuity_contract.ts";
import {
  buildExactFocusRestorationContract,
  buildInvalidatedFocusRestorationContract,
  buildObjectSummaryFocusRestorationContract,
  buildParentReturnFocusRestorationContract,
  type CanonicalFocusRestorationContract,
} from "../contracts/build_focus_restoration_contract.ts";
import {
  normalizeWorkItemNotification,
  type WorkItemNotification,
  type WorkItemNotificationOpenInvalidationReason,
} from "../models/work_item_notification.ts";
import type { ContinuityFallbackTarget } from "./stamp_request_list_continuity_metadata.ts";

export type NotificationOpenContinuityState =
  | "OPENABLE"
  | "FALLBACK_OBJECT_SUMMARY"
  | "FALLBACK_PARENT_RETURN"
  | "INVALIDATED"
  | "SUPPRESSED";

export type NotificationOpenContinuityMetadata = {
  continuity_fallback_order: ContinuityFallbackTarget[];
  cross_device_continuity_contract: CanonicalCrossDeviceContinuityContract;
  focus_anchor_ref: string | null;
  focus_restoration: CanonicalFocusRestorationContract;
  invalidation_reason_codes: WorkItemNotificationOpenInvalidationReason[];
  object_anchor_ref: string;
  object_summary_anchor_ref_or_null: string | null;
  open_state: NotificationOpenContinuityState;
  return_focus_anchor_ref: string;
  return_route_ref: string;
  shell_family: WorkItemNotification["shell_family"];
  target_module_code: WorkItemNotification["target_module_code"] | null;
  target_route_ref: string | null;
};

export type StampNotificationOpenContinuityMetadataInput = {
  current_access_binding_hash?: string | undefined;
  current_masking_posture_fingerprint?: string | undefined;
  current_visibility_cache_partition_key?: string | undefined;
  focus_anchor_available?: boolean | undefined;
  module_available?: boolean | undefined;
  notification: WorkItemNotification;
  object_exists?: boolean | undefined;
  same_object_lawful?: boolean | undefined;
  session_revoked?: boolean | undefined;
};

function objectSummaryAnchor(notification: WorkItemNotification) {
  return `object-summary://${notification.object_anchor_ref}`;
}

function notificationFallbackOrder(notification: WorkItemNotification): ContinuityFallbackTarget[] {
  return [
    {
      fallback_rank: 1,
      target_kind: "EXACT_FOCUS",
      route_ref: notification.target_route_ref,
      focus_anchor_ref_or_null: notification.focus_anchor_ref,
      reason_code: "EXACT_TARGET_VISIBLE",
    },
    {
      fallback_rank: 2,
      target_kind: "OBJECT_SUMMARY",
      route_ref: notification.target_route_ref,
      focus_anchor_ref_or_null: objectSummaryAnchor(notification),
      reason_code: "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL",
    },
    {
      fallback_rank: 3,
      target_kind: "PARENT_RETURN",
      route_ref: notification.return_route_ref,
      focus_anchor_ref_or_null: notification.return_focus_anchor_ref,
      reason_code: "SERIALIZED_PARENT_RETURN",
    },
    {
      fallback_rank: 4,
      target_kind: "NARROWEST_SURVIVING_LIST",
      route_ref: notification.fallback_route_ref,
      focus_anchor_ref_or_null: notification.fallback_focus_anchor_ref,
      reason_code: "NARROWEST_LIST_RETURN",
    },
  ];
}

function invalidationReasons(input: {
  notification: WorkItemNotification;
} & Omit<StampNotificationOpenContinuityMetadataInput, "notification">) {
  const reasons: WorkItemNotificationOpenInvalidationReason[] = [];
  if (
    input.current_access_binding_hash !== undefined &&
    input.current_access_binding_hash !== input.notification.access_binding_hash
  ) {
    reasons.push("ACCESS_BINDING_CHANGE");
  }
  if (
    input.current_masking_posture_fingerprint !== undefined &&
    input.current_masking_posture_fingerprint !==
      input.notification.visibility_partition.masking_posture_fingerprint
  ) {
    reasons.push("MASKING_CHANGE");
  }
  if (
    input.current_visibility_cache_partition_key !== undefined &&
    input.current_visibility_cache_partition_key !==
      input.notification.visibility_partition.cache_partition_key
  ) {
    reasons.push("VIEW_GUARD_CHANGE");
  }
  if (input.session_revoked === true) {
    reasons.push("SESSION_REVOKED");
  }
  if (
    input.object_exists === false ||
    input.notification.suppressed_reason_codes.length > 0
  ) {
    reasons.push("OBJECT_GONE");
  }
  return [...new Set(reasons)];
}

export function stampNotificationOpenContinuityMetadata(
  input: StampNotificationOpenContinuityMetadataInput,
): NotificationOpenContinuityMetadata {
  const notification = normalizeWorkItemNotification(input.notification);
  const continuity = buildNotificationOpenContinuityContract({
    access_scope_hash_or_null: notification.access_binding_hash,
    canonical_object_ref: notification.object_anchor_ref,
    focus_anchor_ref_or_null: notification.focus_anchor_ref,
    masking_scope_fingerprint_or_null:
      notification.visibility_partition.masking_posture_fingerprint,
    parent_context_ref_or_null: notification.return_route_ref,
    return_focus_anchor_ref_or_null: notification.return_focus_anchor_ref,
    route_identity_ref: notification.target_route_ref,
    shell_family: notification.shell_family,
    visibility_cache_partition_key_or_null: notification.visibility_partition.cache_partition_key,
    visibility_class: notification.visibility_class,
  });
  const fallbackOrder = notificationFallbackOrder(notification);
  const reasons = invalidationReasons({
    ...input,
    notification,
  });

  if (reasons.length > 0) {
    const firstReason = reasons[0] ?? "OBJECT_GONE";
    return {
      continuity_fallback_order: fallbackOrder,
      cross_device_continuity_contract: continuity,
      focus_anchor_ref: null,
      focus_restoration: buildInvalidatedFocusRestorationContract({
        requested_focus_anchor_ref_or_null: notification.focus_anchor_ref,
        reason_code: firstReason,
      }),
      invalidation_reason_codes: reasons,
      object_anchor_ref: notification.object_anchor_ref,
      object_summary_anchor_ref_or_null: null,
      open_state:
        notification.suppressed_reason_codes.length > 0 || input.object_exists === false
          ? "SUPPRESSED"
          : "INVALIDATED",
      return_focus_anchor_ref: notification.return_focus_anchor_ref,
      return_route_ref: notification.return_route_ref,
      shell_family: notification.shell_family,
      target_module_code: null,
      target_route_ref: null,
    };
  }

  if (input.focus_anchor_available === false || input.module_available === false) {
    if (input.same_object_lawful !== false) {
      return {
        continuity_fallback_order: fallbackOrder,
        cross_device_continuity_contract: continuity,
        focus_anchor_ref: null,
        focus_restoration: buildObjectSummaryFocusRestorationContract({
          requested_focus_anchor_ref_or_null: notification.focus_anchor_ref,
          reason_code: "FOCUS_ANCHOR_UNAVAILABLE",
        }),
        invalidation_reason_codes: [],
        object_anchor_ref: notification.object_anchor_ref,
        object_summary_anchor_ref_or_null: objectSummaryAnchor(notification),
        open_state: "FALLBACK_OBJECT_SUMMARY",
        return_focus_anchor_ref: notification.return_focus_anchor_ref,
        return_route_ref: notification.return_route_ref,
        shell_family: notification.shell_family,
        target_module_code: null,
        target_route_ref: notification.target_route_ref,
      };
    }
    return {
      continuity_fallback_order: fallbackOrder,
      cross_device_continuity_contract: continuity,
      focus_anchor_ref: notification.return_focus_anchor_ref,
      focus_restoration: buildParentReturnFocusRestorationContract({
        requested_focus_anchor_ref_or_null: notification.focus_anchor_ref,
        reason_code: "SAME_OBJECT_REOPEN_FORBIDDEN",
      }),
      invalidation_reason_codes: [],
      object_anchor_ref: notification.object_anchor_ref,
      object_summary_anchor_ref_or_null: null,
      open_state: "FALLBACK_PARENT_RETURN",
      return_focus_anchor_ref: notification.return_focus_anchor_ref,
      return_route_ref: notification.return_route_ref,
      shell_family: notification.shell_family,
      target_module_code: null,
      target_route_ref: notification.return_route_ref,
    };
  }

  return {
    continuity_fallback_order: fallbackOrder,
    cross_device_continuity_contract: continuity,
    focus_anchor_ref: notification.focus_anchor_ref,
    focus_restoration: buildExactFocusRestorationContract(notification.focus_anchor_ref),
    invalidation_reason_codes: [],
    object_anchor_ref: notification.object_anchor_ref,
    object_summary_anchor_ref_or_null: null,
    open_state: "OPENABLE",
    return_focus_anchor_ref: notification.return_focus_anchor_ref,
    return_route_ref: notification.return_route_ref,
    shell_family: notification.shell_family,
    target_module_code: notification.target_module_code,
    target_route_ref: notification.target_route_ref,
  };
}
