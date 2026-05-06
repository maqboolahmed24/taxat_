import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import {
  isWorkItemNotificationSuppressed,
  normalizeWorkItemNotification,
  workItemNotificationContentFingerprint,
  type WorkItemNotification,
  type WorkItemNotificationDeliveryChannel,
  type WorkItemNotificationType,
} from "../models/work_item_notification.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type WorkItemNotificationReadState =
  | "QUEUED"
  | "DELIVERED_UNREAD"
  | "READ"
  | "SUPPRESSED";

export type StoredWorkItemNotification = {
  content_fingerprint: string;
  dedupe_key: string;
  delivery_channel: WorkItemNotificationDeliveryChannel;
  item_id: string;
  notification_id: string;
  notification_type: WorkItemNotificationType;
  queued_at: string;
  read_state: WorkItemNotificationReadState;
  recipient_ref: string;
  record: WorkItemNotification;
  visibility_class: CollaborationVisibilityClass;
};

function cloneStored(stored: StoredWorkItemNotification) {
  return cloneWorkflowRecord(stored);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function readStateFor(notification: WorkItemNotification): WorkItemNotificationReadState {
  if (isWorkItemNotificationSuppressed(notification)) {
    return "SUPPRESSED";
  }
  if (notification.read_at !== null) {
    return "READ";
  }
  if (notification.delivered_at !== null) {
    return "DELIVERED_UNREAD";
  }
  return "QUEUED";
}

function sortStored(left: StoredWorkItemNotification, right: StoredWorkItemNotification) {
  return (
    left.queued_at.localeCompare(right.queued_at) ||
    left.item_id.localeCompare(right.item_id) ||
    left.notification_id.localeCompare(right.notification_id)
  );
}

function immutableNotificationProjection(notification: WorkItemNotification) {
  const { delivered_at, read_at, suppressed_reason_codes, ...immutableFields } = notification;
  return immutableFields;
}

function allowedNotificationTransition(existing: WorkItemNotification, next: WorkItemNotification) {
  if (workflowStableEqual(existing, next)) {
    return true;
  }
  if (!workflowStableEqual(immutableNotificationProjection(existing), immutableNotificationProjection(next))) {
    return false;
  }
  if (isWorkItemNotificationSuppressed(existing)) {
    return false;
  }
  if (isWorkItemNotificationSuppressed(next)) {
    return existing.delivered_at === null && existing.read_at === null;
  }
  if (existing.suppressed_reason_codes.length !== next.suppressed_reason_codes.length) {
    return false;
  }
  if (existing.delivered_at === null && existing.read_at === null) {
    if (next.delivered_at !== null && next.read_at === null) {
      return next.delivered_at >= existing.queued_at;
    }
    return false;
  }
  if (existing.delivered_at !== null && existing.read_at === null) {
    if (next.delivered_at !== existing.delivered_at) {
      return false;
    }
    return next.read_at !== null && next.read_at >= existing.delivered_at;
  }
  return false;
}

export class WorkItemNotificationRepository {
  private readonly idByDedupeKey = new Map<string, string>();
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByQueuedDate = new Map<string, string[]>();
  private readonly idsByReadState = new Map<string, string[]>();
  private readonly idsByRecipient = new Map<string, string[]>();
  private readonly idsByVisibility = new Map<string, string[]>();
  private readonly records = new Map<string, StoredWorkItemNotification>();

  private rebuildIndexes() {
    this.idByDedupeKey.clear();
    this.idsByItem.clear();
    this.idsByQueuedDate.clear();
    this.idsByReadState.clear();
    this.idsByRecipient.clear();
    this.idsByVisibility.clear();

    for (const stored of this.records.values()) {
      const dedupeOwner = this.idByDedupeKey.get(stored.dedupe_key);
      if (dedupeOwner !== undefined && dedupeOwner !== stored.notification_id) {
        throw new WorkflowModelError(
          "WORKFLOW_CONTRACT_INVALID",
          `dedupe key ${stored.dedupe_key} already belongs to notification ${dedupeOwner}`,
        );
      }
      this.idByDedupeKey.set(stored.dedupe_key, stored.notification_id);
      pushIndex(this.idsByItem, stored.item_id, stored.notification_id);
      pushIndex(this.idsByQueuedDate, stored.queued_at, stored.notification_id);
      pushIndex(this.idsByReadState, stored.read_state, stored.notification_id);
      pushIndex(this.idsByRecipient, stored.recipient_ref, stored.notification_id);
      pushIndex(this.idsByVisibility, stored.visibility_class, stored.notification_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredWorkItemNotification => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistWorkItemNotification(input: { notification: WorkItemNotification }) {
    const notification = normalizeWorkItemNotification(input.notification);
    const existing = this.records.get(notification.notification_id);
    const dedupeOwner = this.idByDedupeKey.get(notification.dedupe_key);
    if (dedupeOwner !== undefined && dedupeOwner !== notification.notification_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `dedupe key ${notification.dedupe_key} already belongs to notification ${dedupeOwner}`,
      );
    }
    if (existing !== undefined && !allowedNotificationTransition(existing.record, notification)) {
      throw new WorkflowModelError(
        "WORKFLOW_STATE_TRANSITION_INVALID",
        "illegal work item notification state transition",
      );
    }
    if (existing !== undefined && workflowStableEqual(existing.record, notification)) {
      return cloneStored(existing);
    }

    const stored: StoredWorkItemNotification = {
      content_fingerprint: workItemNotificationContentFingerprint(notification),
      dedupe_key: notification.dedupe_key,
      delivery_channel: notification.delivery_channel,
      item_id: notification.item_id,
      notification_id: notification.notification_id,
      notification_type: notification.notification_type,
      queued_at: notification.queued_at,
      read_state: readStateFor(notification),
      recipient_ref: notification.recipient_ref,
      record: cloneWorkflowRecord(notification),
      visibility_class: notification.visibility_class,
    };
    this.records.set(stored.notification_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getWorkItemNotificationById(notificationId: string) {
    const stored = this.records.get(notificationId);
    return stored ? cloneStored(stored) : null;
  }

  async findWorkItemNotificationByDedupeKey(dedupeKey: string) {
    const id = this.idByDedupeKey.get(dedupeKey);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listWorkItemNotificationsByRecipient(recipientRef: string) {
    return this.listByIds(this.idsByRecipient.get(recipientRef) ?? []);
  }

  async listWorkItemNotificationsByItem(itemId: string) {
    return this.listByIds(this.idsByItem.get(itemId) ?? []);
  }

  async listWorkItemNotificationsByVisibility(visibilityClass: CollaborationVisibilityClass) {
    return this.listByIds(this.idsByVisibility.get(visibilityClass) ?? []);
  }

  async listWorkItemNotificationsByReadState(readState: WorkItemNotificationReadState) {
    return this.listByIds(this.idsByReadState.get(readState) ?? []);
  }

  async listUnreadWorkItemNotificationsByRecipient(recipientRef: string) {
    return (await this.listWorkItemNotificationsByRecipient(recipientRef)).filter(
      (stored) => stored.read_state === "DELIVERED_UNREAD",
    );
  }

  async listWorkItemNotificationsQueuedBetween(input: { from_queued_at: string; to_queued_at: string }) {
    return [...this.records.values()]
      .filter(
        (stored) => stored.queued_at >= input.from_queued_at && stored.queued_at <= input.to_queued_at,
      )
      .sort(sortStored)
      .map(cloneStored);
  }
}
