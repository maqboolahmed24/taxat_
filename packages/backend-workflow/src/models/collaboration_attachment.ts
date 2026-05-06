import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { CollaborationVisibilityClass } from "./collaboration_thread.ts";
import { WorkflowModelError } from "./workflow_item.ts";

export type CollaborationAttachmentPublishCopyMode =
  | "DIRECT_UPLOAD"
  | "CUSTOMER_SAFE_COPY"
  | "CUSTOMER_SAFE_DERIVATIVE";
export type CollaborationAttachmentMalwareScanState = "PENDING" | "CLEAN" | "QUARANTINED";
export type CollaborationAttachmentPublicationState = "PENDING_SCAN" | "AVAILABLE" | "QUARANTINED";
export type CollaborationAttachmentDownloadState = "PENDING" | "DOWNLOADABLE" | "UNAVAILABLE";
export type CollaborationAttachmentUnavailableReason =
  | "SCAN_PENDING"
  | "QUARANTINED_BY_MALWARE_SCAN";

export type CollaborationAttachment = {
  artifact_type: "CollaborationAttachment";
  attachment_id: string;
  byte_size: number;
  checksum: string;
  current_state_entry_ref: string;
  download_ref: string | null;
  download_state: CollaborationAttachmentDownloadState;
  filename: string;
  item_id: string;
  malware_scan_state: CollaborationAttachmentMalwareScanState;
  media_type: string;
  publication_state: CollaborationAttachmentPublicationState;
  publish_copy_mode: CollaborationAttachmentPublishCopyMode;
  published_at: string;
  published_entry_ref: string;
  request_info_ref: string | null;
  retention_class: string;
  scan_completed_at: string | null;
  semantic_action_id: string;
  source_attachment_ref: string | null;
  state_audit_event_ref: string;
  state_changed_at: string;
  storage_ref: string;
  unavailable_reason_code: CollaborationAttachmentUnavailableReason | null;
  uploaded_at: string;
  uploaded_by_ref: string;
  upload_session_id: string;
  visibility_class: CollaborationVisibilityClass;
};

export type CollaborationAttachmentInput = Partial<CollaborationAttachment> & {
  byte_size: number;
  checksum: string;
  filename: string;
  item_id: string;
  media_type: string;
  published_at: string;
  published_entry_ref: string;
  retention_class: string;
  state_audit_event_ref: string;
  storage_ref: string;
  uploaded_at: string;
  uploaded_by_ref: string;
  upload_session_id: string;
  visibility_class: CollaborationVisibilityClass;
};

const VISIBILITY_CLASSES = ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"] as const;
const PUBLISH_COPY_MODES = ["DIRECT_UPLOAD", "CUSTOMER_SAFE_COPY", "CUSTOMER_SAFE_DERIVATIVE"] as const;
const MALWARE_SCAN_STATES = ["PENDING", "CLEAN", "QUARANTINED"] as const;
const PUBLICATION_STATES = ["PENDING_SCAN", "AVAILABLE", "QUARANTINED"] as const;
const DOWNLOAD_STATES = ["PENDING", "DOWNLOADABLE", "UNAVAILABLE"] as const;
const UNAVAILABLE_REASONS = ["SCAN_PENDING", "QUARANTINED_BY_MALWARE_SCAN"] as const;

function attachmentError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

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

function normalizeNullableString(label: string, value: unknown) {
  return value == null ? null : requireString(label, value);
}

function normalizeTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be an ISO-8601 UTC instant`,
    );
  }
}

function normalizeNullableTimestamp(label: string, value: unknown) {
  return value == null ? null : normalizeTimestamp(label, value);
}

function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function assertNullableEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  return value == null ? null : assertEnum(label, value, allowed);
}

function assertPositiveInteger(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a positive integer`);
  }
  return value;
}

function requireExact<T>(label: string, value: unknown, expected: T): T {
  if (value !== expected) {
    attachmentError(`${label} must stay ${String(expected)}`);
  }
  return expected;
}

function assertTimestampOrder(label: string, earlier: string | null, later: string | null) {
  if (earlier !== null && later !== null && later < earlier) {
    attachmentError(`${label} chronology must be monotonic`);
  }
}

export function collaborationAttachmentId(input: {
  item_id: string;
  published_entry_ref: string;
  upload_session_id: string;
}) {
  return `collaboration-attachment://${stableJsonHash({
    item_id: requireString("item_id", input.item_id),
    published_entry_ref: requireString("published_entry_ref", input.published_entry_ref),
    upload_session_id: requireString("upload_session_id", input.upload_session_id),
  })}`;
}

export function collaborationAttachmentContentFingerprint(attachment: CollaborationAttachment) {
  return stableJsonHash(normalizeCollaborationAttachment(attachment));
}

export function buildCollaborationAttachment(input: CollaborationAttachmentInput): CollaborationAttachment {
  const malwareScanState = input.malware_scan_state ?? "PENDING";
  const publicationState =
    input.publication_state ??
    (malwareScanState === "PENDING"
      ? "PENDING_SCAN"
      : malwareScanState === "CLEAN"
        ? "AVAILABLE"
        : "QUARANTINED");
  const downloadState =
    input.download_state ??
    (publicationState === "PENDING_SCAN"
      ? "PENDING"
      : publicationState === "AVAILABLE"
        ? "DOWNLOADABLE"
        : "UNAVAILABLE");
  const unavailableReason =
    input.unavailable_reason_code === undefined
      ? publicationState === "PENDING_SCAN"
        ? "SCAN_PENDING"
        : publicationState === "QUARANTINED"
          ? "QUARANTINED_BY_MALWARE_SCAN"
          : null
      : input.unavailable_reason_code;

  return normalizeCollaborationAttachment({
    artifact_type: "CollaborationAttachment",
    attachment_id:
      input.attachment_id ??
      collaborationAttachmentId({
        item_id: input.item_id,
        published_entry_ref: input.published_entry_ref,
        upload_session_id: input.upload_session_id,
      }),
    byte_size: input.byte_size,
    checksum: input.checksum,
    current_state_entry_ref: input.current_state_entry_ref ?? input.published_entry_ref,
    download_ref: input.download_ref ?? null,
    download_state: downloadState,
    filename: input.filename,
    item_id: input.item_id,
    malware_scan_state: malwareScanState,
    media_type: input.media_type,
    publication_state: publicationState,
    publish_copy_mode: input.publish_copy_mode ?? "DIRECT_UPLOAD",
    published_at: input.published_at,
    published_entry_ref: input.published_entry_ref,
    request_info_ref: input.request_info_ref ?? null,
    retention_class: input.retention_class,
    scan_completed_at: input.scan_completed_at ?? null,
    semantic_action_id:
      input.semantic_action_id ??
      `semantic-action://attachment-publish/${stableJsonHash({
        published_entry_ref: input.published_entry_ref,
        upload_session_id: input.upload_session_id,
      })}`,
    source_attachment_ref: input.source_attachment_ref ?? null,
    state_audit_event_ref: input.state_audit_event_ref,
    state_changed_at: input.state_changed_at ?? input.published_at,
    storage_ref: input.storage_ref,
    unavailable_reason_code: unavailableReason,
    uploaded_at: input.uploaded_at,
    uploaded_by_ref: input.uploaded_by_ref,
    upload_session_id: input.upload_session_id,
    visibility_class: input.visibility_class,
  });
}

export function normalizeCollaborationAttachment(input: CollaborationAttachment): CollaborationAttachment {
  const attachment: CollaborationAttachment = {
    artifact_type: requireExact("artifact_type", input.artifact_type, "CollaborationAttachment"),
    attachment_id: requireString("attachment_id", input.attachment_id),
    byte_size: assertPositiveInteger("byte_size", input.byte_size),
    checksum: requireString("checksum", input.checksum),
    current_state_entry_ref: requireString("current_state_entry_ref", input.current_state_entry_ref),
    download_ref: normalizeNullableString("download_ref", input.download_ref),
    download_state: assertEnum("download_state", input.download_state, DOWNLOAD_STATES),
    filename: requireString("filename", input.filename),
    item_id: requireString("item_id", input.item_id),
    malware_scan_state: assertEnum("malware_scan_state", input.malware_scan_state, MALWARE_SCAN_STATES),
    media_type: requireString("media_type", input.media_type),
    publication_state: assertEnum("publication_state", input.publication_state, PUBLICATION_STATES),
    publish_copy_mode: assertEnum("publish_copy_mode", input.publish_copy_mode, PUBLISH_COPY_MODES),
    published_at: normalizeTimestamp("published_at", input.published_at),
    published_entry_ref: requireString("published_entry_ref", input.published_entry_ref),
    request_info_ref: normalizeNullableString("request_info_ref", input.request_info_ref),
    retention_class: requireString("retention_class", input.retention_class),
    scan_completed_at: normalizeNullableTimestamp("scan_completed_at", input.scan_completed_at),
    semantic_action_id: requireString("semantic_action_id", input.semantic_action_id),
    source_attachment_ref: normalizeNullableString("source_attachment_ref", input.source_attachment_ref),
    state_audit_event_ref: requireString("state_audit_event_ref", input.state_audit_event_ref),
    state_changed_at: normalizeTimestamp("state_changed_at", input.state_changed_at),
    storage_ref: requireString("storage_ref", input.storage_ref),
    unavailable_reason_code: assertNullableEnum(
      "unavailable_reason_code",
      input.unavailable_reason_code,
      UNAVAILABLE_REASONS,
    ),
    uploaded_at: normalizeTimestamp("uploaded_at", input.uploaded_at),
    uploaded_by_ref: requireString("uploaded_by_ref", input.uploaded_by_ref),
    upload_session_id: requireString("upload_session_id", input.upload_session_id),
    visibility_class: assertEnum("visibility_class", input.visibility_class, VISIBILITY_CLASSES),
  };

  if (attachment.publish_copy_mode === "DIRECT_UPLOAD" && attachment.source_attachment_ref !== null) {
    attachmentError("DIRECT_UPLOAD attachments must clear source_attachment_ref");
  }
  if (attachment.publish_copy_mode !== "DIRECT_UPLOAD") {
    if (attachment.visibility_class !== "CUSTOMER_VISIBLE" || attachment.source_attachment_ref === null) {
      attachmentError("customer-safe copy and derivative attachments require customer visibility and source lineage");
    }
  }
  if (attachment.source_attachment_ref !== null) {
    if (
      attachment.visibility_class !== "CUSTOMER_VISIBLE" ||
      attachment.publish_copy_mode === "DIRECT_UPLOAD"
    ) {
      attachmentError("source_attachment_ref is only legal for customer-safe copy or derivative publication");
    }
    if (attachment.source_attachment_ref === attachment.attachment_id) {
      attachmentError("source_attachment_ref must not self-reference attachment_id");
    }
  }
  if (attachment.visibility_class === "INTERNAL_ONLY" && attachment.publish_copy_mode !== "DIRECT_UPLOAD") {
    attachmentError("internal-only attachments must not acquire customer-safe copy posture");
  }

  if (
    attachment.publication_state === "PENDING_SCAN" &&
    (attachment.malware_scan_state !== "PENDING" ||
      attachment.download_state !== "PENDING" ||
      attachment.download_ref !== null ||
      attachment.unavailable_reason_code !== "SCAN_PENDING" ||
      attachment.scan_completed_at !== null)
  ) {
    attachmentError("PENDING_SCAN attachments must remain non-downloadable with scan pending");
  }
  if (
    attachment.publication_state === "AVAILABLE" &&
    (attachment.malware_scan_state !== "CLEAN" ||
      attachment.download_state !== "DOWNLOADABLE" ||
      attachment.download_ref === null ||
      attachment.unavailable_reason_code !== null ||
      attachment.scan_completed_at === null)
  ) {
    attachmentError("AVAILABLE attachments require a clean scan, download ref, and cleared unavailable reason");
  }
  if (
    attachment.publication_state === "QUARANTINED" &&
    (attachment.malware_scan_state !== "QUARANTINED" ||
      attachment.download_state !== "UNAVAILABLE" ||
      attachment.download_ref !== null ||
      attachment.unavailable_reason_code !== "QUARANTINED_BY_MALWARE_SCAN" ||
      attachment.scan_completed_at === null)
  ) {
    attachmentError("QUARANTINED attachments must suppress download and retain typed unavailable reason");
  }
  if (
    attachment.publication_state === "QUARANTINED" &&
    attachment.current_state_entry_ref === attachment.published_entry_ref
  ) {
    attachmentError("QUARANTINED attachments require an appended current-state entry");
  }
  if (attachment.malware_scan_state === "PENDING" && attachment.publication_state !== "PENDING_SCAN") {
    attachmentError("PENDING malware scan state forces PENDING_SCAN publication state");
  }
  if (attachment.malware_scan_state === "CLEAN" && attachment.publication_state !== "AVAILABLE") {
    attachmentError("CLEAN malware scan state forces AVAILABLE publication state");
  }
  if (attachment.malware_scan_state === "QUARANTINED" && attachment.publication_state !== "QUARANTINED") {
    attachmentError("QUARANTINED malware scan state forces QUARANTINED publication state");
  }
  if (attachment.download_state === "PENDING" && attachment.publication_state !== "PENDING_SCAN") {
    attachmentError("PENDING download state forces PENDING_SCAN publication state");
  }
  if (attachment.download_state === "DOWNLOADABLE" && attachment.publication_state !== "AVAILABLE") {
    attachmentError("DOWNLOADABLE state forces AVAILABLE publication state");
  }
  if (attachment.download_state === "UNAVAILABLE" && attachment.publication_state !== "QUARANTINED") {
    attachmentError("UNAVAILABLE state is reserved for quarantined publication state");
  }
  if (
    attachment.unavailable_reason_code === "SCAN_PENDING" &&
    attachment.publication_state !== "PENDING_SCAN"
  ) {
    attachmentError("SCAN_PENDING unavailable reason forces PENDING_SCAN publication state");
  }
  if (
    attachment.unavailable_reason_code === "QUARANTINED_BY_MALWARE_SCAN" &&
    attachment.publication_state !== "QUARANTINED"
  ) {
    attachmentError("quarantine unavailable reason forces QUARANTINED publication state");
  }
  if (attachment.unavailable_reason_code === null && attachment.publication_state !== "AVAILABLE") {
    attachmentError("null unavailable reason is legal only for AVAILABLE attachments");
  }

  assertTimestampOrder("attachment publish", attachment.uploaded_at, attachment.published_at);
  assertTimestampOrder("attachment state", attachment.published_at, attachment.state_changed_at);
  assertTimestampOrder("attachment scan", attachment.uploaded_at, attachment.scan_completed_at);
  if (attachment.publication_state !== "PENDING_SCAN") {
    assertTimestampOrder("attachment terminal state", attachment.scan_completed_at, attachment.state_changed_at);
  }
  return attachment;
}
