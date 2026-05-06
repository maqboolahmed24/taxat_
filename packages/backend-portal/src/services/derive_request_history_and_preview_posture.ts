import type {
  ClientDocumentProjectedUploadRow,
  ClientDocumentRequestLifecycleState,
  ClientDocumentUploadHistoryState,
  ClientDocumentUploadPreviewPosture,
  ClientDocumentUploadPreviewReasonCode,
  ClientDocumentUploadStatusPhase,
  ClientDocumentUploadTransferState,
} from "../types.ts";

const sameShellPreviewMediaTypes = new Set([
  "application/pdf",
  "image/heic",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function deriveLatestUploadRef(
  uploads: readonly Pick<ClientDocumentProjectedUploadRow, "upload_session_id" | "uploaded_at">[],
) {
  if (uploads.length === 0) {
    return null;
  }
  return [...uploads].sort((left, right) => {
    const rightEpoch = right.uploaded_at === null ? -1 : Date.parse(right.uploaded_at);
    const leftEpoch = left.uploaded_at === null ? -1 : Date.parse(left.uploaded_at);
    if (rightEpoch !== leftEpoch) {
      return rightEpoch - leftEpoch;
    }
    return right.upload_session_id.localeCompare(left.upload_session_id);
  })[0].upload_session_id;
}

export function deriveUploadHistoryState(input: {
  currentArtifactUploadRefOrNull?: string | null | undefined;
  currentRequestUploadRefOrNull?: string | null | undefined;
  requestBindingState: string;
  transferState: ClientDocumentUploadTransferState;
  uploadSessionId: string;
}): ClientDocumentUploadHistoryState {
  if (input.transferState === "QUEUED" || input.transferState === "UPLOADING" || input.transferState === "SCANNING") {
    return "IN_PROGRESS";
  }
  if (input.transferState === "REJECTED") {
    return "REJECTED";
  }
  if (input.transferState === "FAILED") {
    return "FAILED";
  }
  if (
    input.uploadSessionId === input.currentRequestUploadRefOrNull ||
    input.uploadSessionId === input.currentArtifactUploadRefOrNull
  ) {
    return "CURRENT";
  }
  if (input.requestBindingState === "SUPERSEDED" || input.requestBindingState === "RECONFIRMATION_REQUIRED") {
    return "SUPERSEDED";
  }
  return "SUPERSEDED";
}

export function deriveUploadStatusPhase(input: {
  isCurrentUpload: boolean;
  requestLifecycleState: ClientDocumentRequestLifecycleState;
  nextActionCode: string;
  transferState: ClientDocumentUploadTransferState;
}): ClientDocumentUploadStatusPhase {
  if (input.transferState === "QUEUED" || input.transferState === "UPLOADING") {
    return "TRANSFER";
  }
  if (input.transferState === "SCANNING") {
    return "SCAN";
  }
  if (input.transferState === "REJECTED") {
    return "REJECTION";
  }
  if (input.transferState === "FAILED") {
    return "RETRY";
  }
  if (
    input.nextActionCode === "CONFIRM_ATTACHMENT" ||
    input.nextActionCode === "RECONFIRM_REQUEST" ||
    input.nextActionCode === "CONTACT_SUPPORT"
  ) {
    return "VALIDATION";
  }
  if (input.isCurrentUpload && input.requestLifecycleState === "UNDER_REVIEW") {
    return "VALIDATION";
  }
  return "ACCEPTANCE";
}

export function deriveUploadPreviewPosture(input: {
  mediaType: string | null;
  nextActionCode: string;
  transferState: ClientDocumentUploadTransferState;
}): {
  preview_posture: ClientDocumentUploadPreviewPosture;
  preview_reason_code: ClientDocumentUploadPreviewReasonCode | null;
} {
  if (input.transferState === "QUEUED" || input.transferState === "UPLOADING") {
    return {
      preview_posture: "NOT_AVAILABLE",
      preview_reason_code: "TRANSFER_IN_PROGRESS",
    };
  }
  if (input.transferState === "SCANNING") {
    return {
      preview_posture: "NOT_AVAILABLE",
      preview_reason_code: "SCAN_PENDING",
    };
  }
  if (input.nextActionCode === "UPLOAD_REPLACEMENT") {
    return {
      preview_posture: "NOT_AVAILABLE",
      preview_reason_code: "REPLACEMENT_REQUIRED",
    };
  }
  if (input.nextActionCode === "RETRY_UPLOAD") {
    return {
      preview_posture: "NOT_AVAILABLE",
      preview_reason_code: "RETRY_REQUIRED",
    };
  }
  if (input.nextActionCode === "CONTACT_SUPPORT") {
    return {
      preview_posture: "NOT_AVAILABLE",
      preview_reason_code: "POLICY_LIMITED",
    };
  }
  if (input.transferState === "REJECTED") {
    return {
      preview_posture: "NOT_AVAILABLE",
      preview_reason_code: "REPLACEMENT_REQUIRED",
    };
  }
  if (input.transferState === "FAILED") {
    return {
      preview_posture: "NOT_AVAILABLE",
      preview_reason_code: "RETRY_REQUIRED",
    };
  }
  if (input.mediaType !== null && sameShellPreviewMediaTypes.has(input.mediaType)) {
    return {
      preview_posture: "SAME_SHELL_PREVIEW",
      preview_reason_code: null,
    };
  }
  return {
    preview_posture: "DOWNLOAD_ONLY",
    preview_reason_code: "FORMAT_UNSUPPORTED",
  };
}
