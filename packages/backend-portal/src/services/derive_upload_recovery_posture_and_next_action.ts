import type {
  ClientDocumentUploadAttachmentState,
  ClientDocumentUploadNextActionCode,
  ClientDocumentUploadRecoveryPosture,
  ClientPortalUploadSessionRecord,
} from "../types.ts";

export type UploadRecoveryPostureDecision = {
  attachmentState: ClientDocumentUploadAttachmentState;
  dominantHazardCode: string | null;
  nextActionCode: ClientDocumentUploadNextActionCode;
  recoveryPosture: ClientDocumentUploadRecoveryPosture;
};

export type UploadRecoveryPostureInput = Pick<
  ClientPortalUploadSessionRecord,
  | "attachment_state"
  | "byte_count"
  | "bytes_transferred"
  | "integrity_state"
  | "malware_scan_state"
  | "outcome_reason_code"
  | "request_binding_state"
  | "resumability_state"
  | "transfer_state"
  | "validation_state"
>;

function hazardForReset(input: UploadRecoveryPostureInput) {
  if (input.outcome_reason_code !== null) {
    return input.outcome_reason_code;
  }
  if (input.integrity_state === "FAILED") {
    return "CHECKSUM_OR_INTEGRITY_FAILED";
  }
  if (input.malware_scan_state === "QUARANTINED") {
    return "MALWARE_SCAN_QUARANTINED";
  }
  if (input.validation_state === "REQUIRES_REPLACEMENT") {
    return "UPLOAD_REPLACEMENT_REQUIRED";
  }
  if (input.validation_state === "REJECTED") {
    return "UPLOAD_VALIDATION_REJECTED";
  }
  return "UPLOAD_RETRY_REQUIRED";
}

function isCurrentBinding(input: UploadRecoveryPostureInput) {
  return (
    input.request_binding_state === "ORIGINAL_CURRENT" ||
    input.request_binding_state === "RECONFIRMED_CURRENT"
  );
}

function staleHazard(input: UploadRecoveryPostureInput) {
  return input.request_binding_state === "SUPERSEDED"
    ? "REQUEST_SUPERSEDED"
    : "REQUEST_REBASE_REQUIRED";
}

function inFlightHazard(input: UploadRecoveryPostureInput) {
  if (input.request_binding_state === "SUPERSEDED") {
    return "REQUEST_SUPERSEDED_IN_FLIGHT";
  }
  if (input.request_binding_state === "RECONFIRMATION_REQUIRED") {
    return "REQUEST_REBASE_IN_FLIGHT";
  }
  if (input.transfer_state === "SCANNING" || input.bytes_transferred >= input.byte_count) {
    return "SCAN_OR_VALIDATION_PENDING";
  }
  return input.bytes_transferred === 0
    ? "UPLOAD_BYTES_NOT_YET_TRANSFERRED"
    : "UPLOAD_BYTES_IN_FLIGHT";
}

export function deriveUploadRecoveryPostureAndNextAction(
  input: UploadRecoveryPostureInput,
): UploadRecoveryPostureDecision {
  if (input.transfer_state === "FAILED" || input.integrity_state === "FAILED") {
    return {
      attachmentState: "STAGED",
      dominantHazardCode: hazardForReset(input),
      nextActionCode: "RETRY_UPLOAD",
      recoveryPosture: "HARD_RESET_REQUIRED",
    };
  }

  if (
    input.transfer_state === "REJECTED" ||
    input.malware_scan_state === "QUARANTINED" ||
    input.validation_state === "REJECTED" ||
    input.validation_state === "REQUIRES_REPLACEMENT"
  ) {
    return {
      attachmentState: "STAGED",
      dominantHazardCode: hazardForReset(input),
      nextActionCode: "UPLOAD_REPLACEMENT",
      recoveryPosture: "HARD_RESET_REQUIRED",
    };
  }

  if (input.transfer_state === "ACCEPTED") {
    if (!isCurrentBinding(input)) {
      return {
        attachmentState: "REBIND_REQUIRED",
        dominantHazardCode: staleHazard(input),
        nextActionCode: "RECONFIRM_REQUEST",
        recoveryPosture:
          input.request_binding_state === "SUPERSEDED"
            ? "STALE_REVIEW_REQUIRED"
            : "RECONFIRM_INLINE",
      };
    }
    if (input.attachment_state === "ATTACHED") {
      return {
        attachmentState: "ATTACHED",
        dominantHazardCode: null,
        nextActionCode: "NONE",
        recoveryPosture: "NONE",
      };
    }
    return {
      attachmentState: "CONFIRMATION_REQUIRED",
      dominantHazardCode: null,
      nextActionCode: "CONFIRM_ATTACHMENT",
      recoveryPosture: "NONE",
    };
  }

  if (input.resumability_state === "RESTART_REQUIRED") {
    return {
      attachmentState: "STAGED",
      dominantHazardCode: "UPLOAD_RESUME_WINDOW_BROKEN",
      nextActionCode: "RETRY_UPLOAD",
      recoveryPosture: "HARD_RESET_REQUIRED",
    };
  }

  return {
    attachmentState: "STAGED",
    dominantHazardCode: inFlightHazard(input),
    nextActionCode: "RESUME_UPLOAD",
    recoveryPosture: "INLINE_RESUME",
  };
}
