import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import type {
  WorkItemNotificationTargetModuleCode,
  WorkItemNotificationType,
} from "../models/work_item_notification.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type ComputeWorkItemNotificationDedupeKeyInput = {
  access_binding_hash: string;
  focus_anchor_ref?: string | null | undefined;
  item_id: string;
  masking_posture_fingerprint: string;
  notification_type: WorkItemNotificationType;
  queued_at: string;
  recipient_ref: string;
  request_info_ref?: string | null | undefined;
  target_module_code?: WorkItemNotificationTargetModuleCode | null | undefined;
  target_route_ref: string;
  time_window_ms?: number | undefined;
  visibility_class: CollaborationVisibilityClass;
};

function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

export function workItemNotificationDedupeTimeWindow(input: {
  queued_at: string;
  time_window_ms?: number | undefined;
}) {
  const queuedAt = normalizeUtcInstantString(input.queued_at);
  const windowMs = input.time_window_ms ?? 5 * 60 * 1000;
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "time_window_ms must be a positive integer");
  }
  const windowStart = Math.floor(new Date(queuedAt).getTime() / windowMs) * windowMs;
  return new Date(windowStart).toISOString();
}

export function computeWorkItemNotificationDedupeKey(input: ComputeWorkItemNotificationDedupeKeyInput) {
  const timeWindow = workItemNotificationDedupeTimeWindow({
    queued_at: input.queued_at,
    time_window_ms: input.time_window_ms,
  });
  return `work-item-notification-dedupe://${stableJsonHash({
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash),
    focus_anchor_ref_or_null: input.focus_anchor_ref ?? null,
    item_id: requireString("item_id", input.item_id),
    masking_posture_fingerprint: requireString(
      "masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    notification_type: requireString("notification_type", input.notification_type),
    recipient_ref: requireString("recipient_ref", input.recipient_ref),
    request_info_ref_or_null: input.request_info_ref ?? null,
    target_module_code_or_null: input.target_module_code ?? null,
    target_route_ref: requireString("target_route_ref", input.target_route_ref),
    time_window: timeWindow,
    visibility_class: requireString("visibility_class", input.visibility_class),
  })}`;
}
