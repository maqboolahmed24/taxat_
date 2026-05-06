import {
  buildCollaborationAttachment,
  type CollaborationAttachment,
  type CollaborationAttachmentPublishCopyMode,
} from "../models/collaboration_attachment.ts";
import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import type { RequestInfoRecord } from "../models/request_info_record.ts";
import { normalizeWorkflowItem, type WorkflowItem, WorkflowModelError } from "../models/workflow_item.ts";
import type { CollaborationAttachmentRepository } from "../repositories/collaboration_attachment_repository.ts";
import { deriveAttachmentDownloadPosture } from "./derive_attachment_download_posture.ts";

export type PublishableUploadBindingState = "ORIGINAL_CURRENT" | "RECONFIRMED_CURRENT";

export type PublishableStagedUpload = {
  byte_size: number;
  checksum: string;
  filename: string;
  item_id: string;
  media_type: string;
  request_binding_state?: PublishableUploadBindingState | undefined;
  request_info_ref?: string | null | undefined;
  storage_ref: string;
  uploaded_at: string;
  uploaded_by_ref: string;
  upload_session_id: string;
  visibility_class: CollaborationVisibilityClass;
};

export type PublishCollaborationAttachmentInput = {
  attachment_id?: string | undefined;
  current_state_entry_ref?: string | undefined;
  item?: WorkflowItem | undefined;
  published_at: string;
  published_entry_ref: string;
  publish_copy_mode?: CollaborationAttachmentPublishCopyMode | undefined;
  repository: CollaborationAttachmentRepository;
  request_info_record?: RequestInfoRecord | null | undefined;
  request_info_ref?: string | null | undefined;
  retention_class: string;
  semantic_action_id?: string | undefined;
  source_attachment_ref?: string | null | undefined;
  staged_upload: PublishableStagedUpload;
  state_audit_event_ref: string;
};

export async function publishCollaborationAttachment(
  input: PublishCollaborationAttachmentInput,
): Promise<CollaborationAttachment> {
  const staged = input.staged_upload;
  const requestInfoRef = input.request_info_ref ?? staged.request_info_ref ?? null;
  if (
    staged.request_binding_state !== undefined &&
    !["ORIGINAL_CURRENT", "RECONFIRMED_CURRENT"].includes(staged.request_binding_state)
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "only current or explicitly reconfirmed upload sessions can publish attachments",
    );
  }
  if (input.item !== undefined) {
    const item = normalizeWorkflowItem(input.item);
    if (item.item_id !== staged.item_id) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "staged upload item must match workflow item");
    }
    if (staged.visibility_class === "CUSTOMER_VISIBLE" && item.collaboration_visibility !== "CUSTOMER_SHARED") {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "customer-visible attachment publication requires a customer-shared item",
      );
    }
  }
  if (input.request_info_record !== undefined && input.request_info_record !== null) {
    if (
      requestInfoRef !== input.request_info_record.request_info_id ||
      staged.item_id !== input.request_info_record.item_id ||
      staged.visibility_class !== input.request_info_record.visibility_class
    ) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "attachment request_info_ref must match the exact request record and visibility lane",
      );
    }
  }
  if (staged.request_info_ref !== undefined && staged.request_info_ref !== requestInfoRef) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "staged upload request binding must match attachment request_info_ref",
    );
  }

  const posture = deriveAttachmentDownloadPosture({ malware_scan_state: "PENDING" });
  const attachment = buildCollaborationAttachment({
    attachment_id: input.attachment_id,
    byte_size: staged.byte_size,
    checksum: staged.checksum,
    current_state_entry_ref: input.current_state_entry_ref ?? input.published_entry_ref,
    download_ref: posture.download_ref,
    download_state: posture.download_state,
    filename: staged.filename,
    item_id: staged.item_id,
    malware_scan_state: posture.malware_scan_state,
    media_type: staged.media_type,
    publication_state: posture.publication_state,
    publish_copy_mode: input.publish_copy_mode ?? "DIRECT_UPLOAD",
    published_at: input.published_at,
    published_entry_ref: input.published_entry_ref,
    request_info_ref: requestInfoRef,
    retention_class: input.retention_class,
    scan_completed_at: posture.scan_completed_at,
    semantic_action_id: input.semantic_action_id,
    source_attachment_ref: input.source_attachment_ref ?? null,
    state_audit_event_ref: input.state_audit_event_ref,
    state_changed_at: input.published_at,
    storage_ref: staged.storage_ref,
    unavailable_reason_code: posture.unavailable_reason_code,
    uploaded_at: staged.uploaded_at,
    uploaded_by_ref: staged.uploaded_by_ref,
    upload_session_id: staged.upload_session_id,
    visibility_class: staged.visibility_class,
  });
  await input.repository.persistCollaborationAttachment({ attachment });
  return attachment;
}
