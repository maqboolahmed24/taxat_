import {
  buildCollaborationAttachment,
  type CollaborationAttachment,
  type CollaborationAttachmentMalwareScanState,
} from "../models/collaboration_attachment.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { CollaborationAttachmentRepository } from "../repositories/collaboration_attachment_repository.ts";
import { deriveAttachmentDownloadPosture } from "./derive_attachment_download_posture.ts";

export type TransitionCollaborationAttachmentStateInput = {
  attachment_id: string;
  current_state_entry_ref: string;
  download_ref?: string | null | undefined;
  malware_scan_state: Exclude<CollaborationAttachmentMalwareScanState, "PENDING">;
  repository: CollaborationAttachmentRepository;
  scan_completed_at: string;
  state_audit_event_ref: string;
  state_changed_at: string;
};

export async function transitionCollaborationAttachmentState(
  input: TransitionCollaborationAttachmentStateInput,
): Promise<CollaborationAttachment> {
  const stored = await input.repository.getCollaborationAttachmentById(input.attachment_id);
  if (stored === null) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "collaboration attachment must exist before state transition",
    );
  }
  const current = stored.record;
  const posture = deriveAttachmentDownloadPosture({
    download_ref: input.download_ref ?? null,
    malware_scan_state: input.malware_scan_state,
    scan_completed_at: input.scan_completed_at,
  });
  if (
    posture.publication_state === "QUARANTINED" &&
    input.current_state_entry_ref === current.published_entry_ref
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "quarantine transitions require an appended current-state entry",
    );
  }

  const attachment = buildCollaborationAttachment({
    ...current,
    current_state_entry_ref: input.current_state_entry_ref,
    download_ref: posture.download_ref,
    download_state: posture.download_state,
    malware_scan_state: posture.malware_scan_state,
    publication_state: posture.publication_state,
    scan_completed_at: posture.scan_completed_at,
    state_audit_event_ref: input.state_audit_event_ref,
    state_changed_at: input.state_changed_at,
    unavailable_reason_code: posture.unavailable_reason_code,
  });
  await input.repository.persistCollaborationAttachment({ attachment });
  return attachment;
}
