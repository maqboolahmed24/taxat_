import {
  type CollaborationAttachmentDownloadState,
  type CollaborationAttachmentMalwareScanState,
  type CollaborationAttachmentPublicationState,
  type CollaborationAttachmentUnavailableReason,
} from "../models/collaboration_attachment.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type AttachmentDownloadPosture = {
  download_ref: string | null;
  download_state: CollaborationAttachmentDownloadState;
  malware_scan_state: CollaborationAttachmentMalwareScanState;
  publication_state: CollaborationAttachmentPublicationState;
  scan_completed_at: string | null;
  unavailable_reason_code: CollaborationAttachmentUnavailableReason | null;
};

export function deriveAttachmentDownloadPosture(input: {
  download_ref?: string | null | undefined;
  malware_scan_state: CollaborationAttachmentMalwareScanState;
  scan_completed_at?: string | null | undefined;
}): AttachmentDownloadPosture {
  if (input.malware_scan_state === "PENDING") {
    if (input.download_ref != null || input.scan_completed_at != null) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "pending attachment scans must not expose download or scan completion refs",
      );
    }
    return {
      download_ref: null,
      download_state: "PENDING",
      malware_scan_state: "PENDING",
      publication_state: "PENDING_SCAN",
      scan_completed_at: null,
      unavailable_reason_code: "SCAN_PENDING",
    };
  }

  if (input.malware_scan_state === "CLEAN") {
    if (input.download_ref == null || input.scan_completed_at == null) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "clean attachment scans require scan completion and governed download refs",
      );
    }
    return {
      download_ref: input.download_ref,
      download_state: "DOWNLOADABLE",
      malware_scan_state: "CLEAN",
      publication_state: "AVAILABLE",
      scan_completed_at: input.scan_completed_at,
      unavailable_reason_code: null,
    };
  }

  if (input.download_ref != null || input.scan_completed_at == null) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "quarantined attachment scans require scan completion and must suppress download refs",
    );
  }
  return {
    download_ref: null,
    download_state: "UNAVAILABLE",
    malware_scan_state: "QUARANTINED",
    publication_state: "QUARANTINED",
    scan_completed_at: input.scan_completed_at,
    unavailable_reason_code: "QUARANTINED_BY_MALWARE_SCAN",
  };
}
