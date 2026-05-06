import type { WorkItemNotification } from "../models/work_item_notification.ts";
import type { WorkItemNotificationRepository } from "../repositories/work_item_notification_repository.ts";
import {
  buildWorkItemNotification,
  type BuildWorkItemNotificationInput,
} from "./build_work_item_notification.ts";
import { suppressRedundantWorkItemNotifications } from "./suppress_redundant_work_item_notifications.ts";

export type PublishWorkItemNotificationState =
  | "PUBLISHED"
  | "SUPPRESSED"
  | "DUPLICATE_SUPPRESSED";

export type PublishWorkItemNotificationInput = BuildWorkItemNotificationInput & {
  current_access_binding_hash?: string | undefined;
  current_masking_posture_fingerprint?: string | undefined;
  repository: WorkItemNotificationRepository;
  suppress_reason_codes?: readonly string[] | undefined;
};

export type PublishWorkItemNotificationResult = {
  duplicate_replay: boolean;
  notification: WorkItemNotification;
  publish_state: PublishWorkItemNotificationState;
  suppressed_reason_codes: string[];
};

function staleSuppressionReasons(input: {
  current_access_binding_hash?: string | undefined;
  current_masking_posture_fingerprint?: string | undefined;
  notification: WorkItemNotification;
}) {
  const reasons: string[] = [];
  if (
    input.current_access_binding_hash !== undefined &&
    input.current_access_binding_hash !== input.notification.access_binding_hash
  ) {
    reasons.push("ACCESS_BINDING_CHANGED");
  }
  if (
    input.current_masking_posture_fingerprint !== undefined &&
    input.current_masking_posture_fingerprint !==
      input.notification.visibility_partition.masking_posture_fingerprint
  ) {
    reasons.push("MASKING_POSTURE_CHANGED");
  }
  return reasons;
}

export async function publishWorkItemNotification(
  input: PublishWorkItemNotificationInput,
): Promise<PublishWorkItemNotificationResult> {
  const built = buildWorkItemNotification(input);
  const existing = await input.repository.findWorkItemNotificationByDedupeKey(built.dedupe_key);
  const staleReasons = staleSuppressionReasons({
    current_access_binding_hash: input.current_access_binding_hash,
    current_masking_posture_fingerprint: input.current_masking_posture_fingerprint,
    notification: existing?.record ?? built,
  });

  if (existing !== null) {
    if (staleReasons.length > 0 && existing.record.delivered_at === null && existing.record.read_at === null) {
      const suppressedExisting = suppressRedundantWorkItemNotifications({
        notification: existing.record,
        reason_codes: staleReasons,
      });
      const stored = await input.repository.persistWorkItemNotification({ notification: suppressedExisting });
      return {
        duplicate_replay: true,
        notification: stored.record,
        publish_state: "SUPPRESSED",
        suppressed_reason_codes: suppressedExisting.suppressed_reason_codes,
      };
    }
    return {
      duplicate_replay: true,
      notification: existing.record,
      publish_state: "DUPLICATE_SUPPRESSED",
      suppressed_reason_codes: ["DUPLICATE_DEDUPE_KEY"],
    };
  }

  const explicitReasons = [...(input.suppress_reason_codes ?? []), ...staleReasons];
  const notification =
    explicitReasons.length > 0
      ? suppressRedundantWorkItemNotifications({
          notification: built,
          reason_codes: explicitReasons,
        })
      : built;
  const stored = await input.repository.persistWorkItemNotification({ notification });
  return {
    duplicate_replay: false,
    notification: stored.record,
    publish_state: explicitReasons.length > 0 ? "SUPPRESSED" : "PUBLISHED",
    suppressed_reason_codes: notification.suppressed_reason_codes,
  };
}
