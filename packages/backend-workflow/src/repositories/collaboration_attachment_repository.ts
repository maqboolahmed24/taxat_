import {
  collaborationAttachmentContentFingerprint,
  normalizeCollaborationAttachment,
  type CollaborationAttachment,
  type CollaborationAttachmentPublicationState,
} from "../models/collaboration_attachment.ts";
import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredCollaborationAttachment = {
  attachment_id: string;
  content_fingerprint: string;
  item_id: string;
  publication_state: CollaborationAttachmentPublicationState;
  record: CollaborationAttachment;
  request_info_ref: string | null;
  upload_session_id: string;
  visibility_class: CollaborationVisibilityClass;
};

function cloneStored(stored: StoredCollaborationAttachment) {
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

function sortStored(left: StoredCollaborationAttachment, right: StoredCollaborationAttachment) {
  return (
    left.item_id.localeCompare(right.item_id) ||
    left.record.published_at.localeCompare(right.record.published_at) ||
    left.attachment_id.localeCompare(right.attachment_id)
  );
}

function allowedAttachmentTransition(existing: CollaborationAttachment, next: CollaborationAttachment) {
  if (workflowStableEqual(existing, next)) {
    return true;
  }
  if (
    existing.item_id !== next.item_id ||
    existing.upload_session_id !== next.upload_session_id ||
    existing.visibility_class !== next.visibility_class ||
    existing.request_info_ref !== next.request_info_ref ||
    existing.published_entry_ref !== next.published_entry_ref ||
    existing.published_at !== next.published_at
  ) {
    return false;
  }
  if (next.state_changed_at < existing.state_changed_at) {
    return false;
  }
  if (existing.publication_state === "PENDING_SCAN") {
    return next.publication_state === "AVAILABLE" || next.publication_state === "QUARANTINED";
  }
  if (existing.publication_state === "AVAILABLE") {
    return next.publication_state === "QUARANTINED";
  }
  return false;
}

export class CollaborationAttachmentRepository {
  private readonly idByUploadSession = new Map<string, string>();
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByRequestInfo = new Map<string, string[]>();
  private readonly idsByVisibility = new Map<string, string[]>();
  private readonly records = new Map<string, StoredCollaborationAttachment>();

  private rebuildIndexes() {
    this.idByUploadSession.clear();
    this.idsByItem.clear();
    this.idsByRequestInfo.clear();
    this.idsByVisibility.clear();

    for (const stored of this.records.values()) {
      const uploadOwner = this.idByUploadSession.get(stored.upload_session_id);
      if (uploadOwner !== undefined && uploadOwner !== stored.attachment_id) {
        throw new WorkflowModelError(
          "WORKFLOW_CONTRACT_INVALID",
          `upload session ${stored.upload_session_id} already published attachment ${uploadOwner}`,
        );
      }
      this.idByUploadSession.set(stored.upload_session_id, stored.attachment_id);
      pushIndex(this.idsByItem, stored.item_id, stored.attachment_id);
      pushIndex(this.idsByVisibility, stored.visibility_class, stored.attachment_id);
      if (stored.request_info_ref !== null) {
        pushIndex(this.idsByRequestInfo, stored.request_info_ref, stored.attachment_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredCollaborationAttachment => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistCollaborationAttachment(input: { attachment: CollaborationAttachment }) {
    const attachment = normalizeCollaborationAttachment(input.attachment);
    const existing = this.records.get(attachment.attachment_id);
    const uploadOwner = this.idByUploadSession.get(attachment.upload_session_id);
    if (uploadOwner !== undefined && uploadOwner !== attachment.attachment_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `upload session ${attachment.upload_session_id} already published attachment ${uploadOwner}`,
      );
    }
    if (existing !== undefined && !allowedAttachmentTransition(existing.record, attachment)) {
      throw new WorkflowModelError(
        "WORKFLOW_STATE_TRANSITION_INVALID",
        "illegal collaboration attachment publication transition",
      );
    }
    if (existing !== undefined && workflowStableEqual(existing.record, attachment)) {
      return cloneStored(existing);
    }

    const stored: StoredCollaborationAttachment = {
      attachment_id: attachment.attachment_id,
      content_fingerprint: collaborationAttachmentContentFingerprint(attachment),
      item_id: attachment.item_id,
      publication_state: attachment.publication_state,
      record: cloneWorkflowRecord(attachment),
      request_info_ref: attachment.request_info_ref,
      upload_session_id: attachment.upload_session_id,
      visibility_class: attachment.visibility_class,
    };
    this.records.set(stored.attachment_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCollaborationAttachmentById(attachmentId: string) {
    const stored = this.records.get(attachmentId);
    return stored ? cloneStored(stored) : null;
  }

  async findCollaborationAttachmentByUploadSession(uploadSessionId: string) {
    const id = this.idByUploadSession.get(uploadSessionId);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listCollaborationAttachmentsByItem(itemId: string) {
    return this.listByIds(this.idsByItem.get(itemId) ?? []);
  }

  async listCollaborationAttachmentsByRequestInfo(requestInfoRef: string) {
    return this.listByIds(this.idsByRequestInfo.get(requestInfoRef) ?? []);
  }

  async listCollaborationAttachmentsByVisibility(visibilityClass: CollaborationVisibilityClass) {
    return this.listByIds(this.idsByVisibility.get(visibilityClass) ?? []);
  }
}
