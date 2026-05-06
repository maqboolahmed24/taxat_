import {
  buildCollaborationAttachment,
  buildCollaborationEntry,
  buildCollaborationThread,
  buildRequestInfoRecord,
  buildWorkflowItem,
  buildWorkItemNotification,
  buildWorkItemParticipant,
} from "../../../packages/backend-workflow/src/index.ts";

export function workflowProjectionItem(
  input: {
    item_id?: string | undefined;
    lifecycle_state?: "IN_PROGRESS" | "WAITING_ON_CLIENT" | "DONE" | undefined;
    title?: string | undefined;
    waiting_on_actor?: "CUSTOMER" | "STAFF" | "AUTHORITY" | "NONE" | undefined;
  } = {},
) {
  const itemId = input.item_id ?? "workflow-item-0150";
  const lifecycleState = input.lifecycle_state ?? "WAITING_ON_CLIENT";
  const waitingOnActor =
    input.waiting_on_actor ?? (lifecycleState === "WAITING_ON_CLIENT" ? "CUSTOMER" : "STAFF");
  const customerActionRequired =
    lifecycleState === "WAITING_ON_CLIENT" && waitingOnActor === "CUSTOMER";
  return buildWorkflowItem({
    active_request_info_ref: customerActionRequired ? `request-info://${itemId}/1` : null,
    authority_truth_state: "CONFIRMED",
    client_id: "client-0150",
    collaboration_visibility: "CUSTOMER_SHARED",
    current_assignee_ref: "user://staff-owner",
    customer_due_at: "2026-05-04T17:00:00Z",
    customer_status_projection: customerActionRequired ? "ACTION_REQUIRED" : "UNDER_REVIEW",
    dedupe_key: `client-0150:${itemId}`,
    due_at: "2026-05-04T17:00:00Z",
    due_state: "DUE_SOON",
    item_id: itemId,
    last_customer_activity_at: "2026-04-30T10:10:00Z",
    last_customer_visible_event_ref: `entry://${itemId}/customer/4`,
    lifecycle_state: lifecycleState,
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0150",
    title: input.title ?? "Upload payroll records",
    type: "REQUEST_INFO",
    waiting_on_actor: waitingOnActor,
  });
}

export function workspaceThreads(itemId = "workflow-item-0150") {
  return {
    customer: buildCollaborationThread({
      head_sequence: 4,
      item_id: itemId,
      last_entry_ref: `entry://${itemId}/customer/4`,
      participant_refs: ["client://client-0150"],
      visibility_class: "CUSTOMER_VISIBLE",
    }),
    internal: buildCollaborationThread({
      head_sequence: 2,
      item_id: itemId,
      last_entry_ref: `entry://${itemId}/internal/2`,
      participant_refs: ["user://staff-owner"],
      visibility_class: "INTERNAL_ONLY",
    }),
  };
}

export function workspaceParticipants(itemId = "workflow-item-0150") {
  return [
    buildWorkItemParticipant({
      item_id: itemId,
      last_read_customer_sequence: 1,
      last_read_internal_sequence: 0,
      notification_preferences_ref: "notification-preferences://staff-owner",
      participant_ref: "user://staff-owner",
      participant_role: "PREPARER",
      watch_state: "PRIMARY_OWNER",
    }),
    buildWorkItemParticipant({
      item_id: itemId,
      last_read_customer_sequence: 2,
      notification_preferences_ref: "notification-preferences://client-0150",
      participant_ref: "client://client-0150",
      participant_role: "CLIENT_CONTRIBUTOR",
    }),
  ];
}

export function openRequestInfo(itemId = "workflow-item-0150") {
  return buildRequestInfoRecord({
    audit_event_refs: [`audit://request-info/${itemId}/1`],
    customer_due_at: "2026-05-04T17:00:00Z",
    item_id: itemId,
    opened_at: "2026-04-30T10:00:00Z",
    prompt_body_ref: `body://${itemId}/request-info/prompt`,
    prompt_entry_ref: `entry://${itemId}/customer/2`,
    request_info_ordinal: 1,
    requested_by_ref: "user://staff-owner",
  });
}

export function projectionAttachments(itemId = "workflow-item-0150") {
  return [
    buildCollaborationAttachment({
      byte_size: 1200,
      checksum: "sha256:current",
      download_ref: `download://${itemId}/shared-current`,
      download_state: "DOWNLOADABLE",
      filename: "payroll-current.pdf",
      item_id: itemId,
      malware_scan_state: "CLEAN",
      media_type: "application/pdf",
      publication_state: "AVAILABLE",
      published_at: "2026-04-30T10:30:00Z",
      published_entry_ref: `entry://${itemId}/customer/4`,
      retention_class: "CLIENT_SHARED",
      scan_completed_at: "2026-04-30T10:31:00Z",
      state_audit_event_ref: `audit://attachment/${itemId}/current`,
      state_changed_at: "2026-04-30T10:31:00Z",
      storage_ref: `object://attachments/${itemId}/current`,
      uploaded_at: "2026-04-30T10:28:00Z",
      uploaded_by_ref: "client://client-0150",
      upload_session_id: `upload://${itemId}/current`,
      visibility_class: "CUSTOMER_VISIBLE",
    }),
    buildCollaborationAttachment({
      byte_size: 900,
      checksum: "sha256:history",
      download_ref: `download://${itemId}/shared-history`,
      download_state: "DOWNLOADABLE",
      filename: "payroll-history.pdf",
      item_id: itemId,
      malware_scan_state: "CLEAN",
      media_type: "application/pdf",
      publication_state: "AVAILABLE",
      published_at: "2026-04-29T10:30:00Z",
      published_entry_ref: `entry://${itemId}/customer/3`,
      retention_class: "CLIENT_SHARED",
      scan_completed_at: "2026-04-29T10:31:00Z",
      state_audit_event_ref: `audit://attachment/${itemId}/history`,
      state_changed_at: "2026-04-29T10:31:00Z",
      storage_ref: `object://attachments/${itemId}/history`,
      uploaded_at: "2026-04-29T10:28:00Z",
      uploaded_by_ref: "client://client-0150",
      upload_session_id: `upload://${itemId}/history`,
      visibility_class: "CUSTOMER_VISIBLE",
    }),
    buildCollaborationAttachment({
      byte_size: 800,
      checksum: "sha256:internal",
      download_ref: `download://${itemId}/internal`,
      download_state: "DOWNLOADABLE",
      filename: "internal-note.pdf",
      item_id: itemId,
      malware_scan_state: "CLEAN",
      media_type: "application/pdf",
      publication_state: "AVAILABLE",
      published_at: "2026-04-30T10:35:00Z",
      published_entry_ref: `entry://${itemId}/internal/2`,
      retention_class: "INTERNAL",
      scan_completed_at: "2026-04-30T10:36:00Z",
      state_audit_event_ref: `audit://attachment/${itemId}/internal`,
      state_changed_at: "2026-04-30T10:36:00Z",
      storage_ref: `object://attachments/${itemId}/internal`,
      uploaded_at: "2026-04-30T10:33:00Z",
      uploaded_by_ref: "user://staff-owner",
      upload_session_id: `upload://${itemId}/internal`,
      visibility_class: "INTERNAL_ONLY",
    }),
  ];
}

export function customerActivityEntries(itemId = "workflow-item-0150") {
  const threadId = `collaboration-thread://customer/${itemId}`;
  return [1, 2, 3, 4].map((sequence) =>
    buildCollaborationEntry({
      actor_ref: sequence % 2 === 0 ? "user://staff-owner" : "client://client-0150",
      body_ref: `body://${itemId}/customer/${sequence}`,
      command_id: `command-${itemId}-customer-${sequence}`,
      created_at: `2026-04-30T10:0${sequence}:00Z`,
      entry_id: `entry://${itemId}/customer/${sequence}`,
      entry_type: "COMMENT",
      item_id: itemId,
      thread_id: threadId,
      thread_sequence: sequence,
      visibility_class: "CUSTOMER_VISIBLE",
    }),
  );
}

export function workInboxItems() {
  return [
    buildWorkflowItem({
      authority_truth_state: "CONFIRMED",
      client_id: "client-0151-a",
      collaboration_priority_score: 92,
      collaboration_visibility: "CUSTOMER_SHARED",
      current_assignee_ref: "user://staff-owner",
      customer_due_at: "2026-05-01T09:00:00Z",
      customer_status_projection: "ACTION_REQUIRED",
      dedupe_key: "client-0151-a:inbox",
      due_at: "2026-05-01T09:00:00Z",
      due_state: "OVERDUE",
      item_id: "workflow-item-0151-a",
      last_customer_activity_at: "2026-04-30T10:00:00Z",
      last_customer_visible_event_ref: "entry://workflow-item-0151-a/customer/1",
      lifecycle_state: "WAITING_ON_CLIENT",
      opened_at: "2026-04-29T08:00:00Z",
      period: "2026-Q1",
      queue_entered_at: "2026-04-29T08:00:00Z",
      resolution_confidence_score: 42,
      routing_queue_ref: "queue://tax-ops/filings",
      sla_pressure_score: 96,
      tenant_id: "tenant-0151",
      title: "Payroll records needed",
      type: "REQUEST_INFO",
      waiting_on_actor: "CUSTOMER",
      waiting_since_at: "2026-04-29T08:00:00Z",
    }),
    buildWorkflowItem({
      authority_truth_state: "CONFIRMED",
      client_id: "client-0151-b",
      collaboration_priority_score: 75,
      collaboration_visibility: "CUSTOMER_SHARED",
      current_assignee_ref: "user://staff-reviewer",
      customer_status_projection: "UNDER_REVIEW",
      dedupe_key: "client-0151-b:inbox",
      item_id: "workflow-item-0151-b",
      last_internal_activity_at: "2026-04-30T09:40:00Z",
      last_internal_event_ref: "entry://workflow-item-0151-b/internal/1",
      lifecycle_state: "IN_PROGRESS",
      opened_at: "2026-04-29T09:00:00Z",
      period: "2026-Q1",
      queue_entered_at: "2026-04-29T09:00:00Z",
      resolution_confidence_score: 55,
      routing_queue_ref: "queue://tax-ops/filings",
      tenant_id: "tenant-0151",
      title: "Review bank evidence",
      type: "EVIDENCE_REVIEW",
      waiting_on_actor: "STAFF",
      waiting_since_at: "2026-04-29T09:00:00Z",
    }),
    buildWorkflowItem({
      authority_truth_state: "CONFIRMED",
      client_id: "client-0151-c",
      collaboration_priority_score: 61,
      collaboration_visibility: "CUSTOMER_SHARED",
      current_assignee_ref: null,
      customer_status_projection: "UNDER_REVIEW",
      dedupe_key: "client-0151-c:inbox",
      item_id: "workflow-item-0151-c",
      lifecycle_state: "OPEN",
      opened_at: "2026-04-29T10:00:00Z",
      period: "2026-Q1",
      queue_entered_at: "2026-04-29T10:00:00Z",
      resolution_confidence_score: 60,
      routing_queue_ref: "queue://tax-ops/filings",
      tenant_id: "tenant-0151",
      title: "Assign onboarding check",
      type: "ONBOARDING_CHECK",
      waiting_on_actor: "NONE",
      waiting_since_at: "2026-04-29T10:00:00Z",
    }),
  ];
}

export function workInboxNotifications() {
  const items = workInboxItems();
  const first = items[0]!;
  const second = items[1]!;
  return [
    buildWorkItemNotification({
      access_binding_hash: "access-0151",
      delivered_at: "2026-04-30T10:01:00Z",
      delivery_channel: "IN_APP",
      item: first,
      masking_posture_fingerprint: "mask-0151",
      notification_type: "CUSTOMER_VISIBLE_COMMENT",
      queued_at: "2026-04-30T10:00:00Z",
      recipient_ref: "user://staff-owner",
      visibility_class: "CUSTOMER_VISIBLE",
    }),
    buildWorkItemNotification({
      access_binding_hash: "access-0151",
      delivered_at: "2026-04-30T10:03:00Z",
      delivery_channel: "IN_APP",
      item: first,
      masking_posture_fingerprint: "mask-0151",
      notification_type: "REASSIGNMENT",
      queued_at: "2026-04-30T10:02:00Z",
      recipient_ref: "user://staff-owner",
      visibility_class: "INTERNAL_ONLY",
    }),
    buildWorkItemNotification({
      access_binding_hash: "access-0151",
      delivered_at: "2026-04-30T09:41:00Z",
      delivery_channel: "IN_APP",
      item: second,
      masking_posture_fingerprint: "mask-0151",
      notification_type: "NEW_ASSIGNMENT",
      queued_at: "2026-04-30T09:40:00Z",
      recipient_ref: "user://staff-reviewer",
      visibility_class: "INTERNAL_ONLY",
    }),
  ];
}
