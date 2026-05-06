import type {
  ClientDocumentProjectedUploadRow,
  ClientDocumentRequestCardRecord,
  ClientDocumentRequestRecord,
  ClientDocumentUploadTransferState,
} from "../types.ts";
import { ClientDocumentRequestProjectionError } from "../types.ts";

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new ClientDocumentRequestProjectionError(message, reasonCodes);
}

function uploadByRef(
  uploads: readonly ClientDocumentProjectedUploadRow[],
  uploadRef: string | null,
) {
  if (uploadRef === null) {
    return null;
  }
  return uploads.find((upload) => upload.upload_session_id === uploadRef) ?? null;
}

function validateUploadMembership(uploads: readonly ClientDocumentProjectedUploadRow[]) {
  const seen = new Set<string>();
  for (const upload of uploads) {
    if (seen.has(upload.upload_session_id)) {
      fail("duplicate upload_session_id inside request-local upload lineage", [
        "CLIENT_DOCUMENT_REQUEST_DUPLICATE_UPLOAD_SESSION_ID",
      ]);
    }
    seen.add(upload.upload_session_id);
    if (typeof upload.history_state !== "string") {
      fail("visible upload row must publish explicit history_state", [
        "CLIENT_DOCUMENT_REQUEST_UPLOAD_HISTORY_STATE_MISSING",
      ]);
    }
    if (
      upload.preview_posture === "NOT_AVAILABLE" &&
      typeof upload.preview_reason_code !== "string"
    ) {
      fail("blocked preview rows must publish typed preview_reason_code", [
        "CLIENT_DOCUMENT_REQUEST_UPLOAD_PREVIEW_REASON_MISSING",
      ]);
    }
    if (
      upload.preview_posture === "SAME_SHELL_PREVIEW" &&
      upload.preview_reason_code !== null
    ) {
      fail("same-shell preview rows must clear preview_reason_code", [
        "CLIENT_DOCUMENT_REQUEST_UPLOAD_PREVIEW_REASON_DRIFT",
      ]);
    }
  }
}

export function validateClientDocumentRequestLineage(input: {
  request: ClientDocumentRequestRecord;
}) {
  const request = input.request;
  const uploadRefs = new Set(request.upload_refs);
  if (request.latest_upload_ref !== null && !uploadRefs.has(request.latest_upload_ref)) {
    fail("latest_upload_ref must resolve to upload_refs[]", [
      "CLIENT_DOCUMENT_REQUEST_LATEST_UPLOAD_DANGLING",
    ]);
  }
  if (
    request.current_request_upload_ref_or_null !== null &&
    !uploadRefs.has(request.current_request_upload_ref_or_null)
  ) {
    fail("current_request_upload_ref_or_null must resolve to upload_refs[]", [
      "CLIENT_DOCUMENT_REQUEST_CURRENT_UPLOAD_DANGLING",
    ]);
  }
  if (
    ["UPLOAD_IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"].includes(
      request.lifecycle_state,
    ) &&
    (request.upload_refs.length === 0 || request.latest_upload_ref === null)
  ) {
    fail("upload-bearing request states need upload_refs[] and latest_upload_ref", [
      "CLIENT_DOCUMENT_REQUEST_UPLOAD_BEARING_LINEAGE_MISSING",
    ]);
  }
  if (request.lifecycle_state === "WITHDRAWN") {
    if (
      request.upload_refs.length > 0 ||
      request.latest_upload_ref !== null ||
      request.current_request_upload_ref_or_null !== null
    ) {
      fail("withdrawn requests must clear upload lineage", [
        "CLIENT_DOCUMENT_REQUEST_WITHDRAWN_LINEAGE_NOT_CLEARED",
      ]);
    }
  }
  if (request.lifecycle_state === "EXPIRED" && request.due_at === null) {
    fail("expired requests must keep a due_at anchor", [
      "CLIENT_DOCUMENT_REQUEST_EXPIRED_DUE_AT_MISSING",
    ]);
  }
}

function expectCurrentTransfer(
  cardStatus: ClientDocumentRequestCardRecord["status"],
): Set<ClientDocumentUploadTransferState> | null {
  if (cardStatus === "UPLOADING") {
    return new Set(["QUEUED", "SCANNING", "UPLOADING"]);
  }
  if (cardStatus === "UNDER_REVIEW" || cardStatus === "ACCEPTED") {
    return new Set(["ACCEPTED"]);
  }
  if (cardStatus === "REJECTED") {
    return new Set(["FAILED", "REJECTED"]);
  }
  return null;
}

export function validateDocumentRequestCardLineage(input: {
  card: ClientDocumentRequestCardRecord;
}) {
  const card = input.card;
  validateUploadMembership(card.uploads);
  const currentUpload = uploadByRef(card.uploads, card.current_upload_ref);
  const currentArtifact = uploadByRef(card.uploads, card.current_artifact_upload_ref);
  if (card.current_upload_ref !== null && currentUpload === null) {
    fail("current_upload_ref must point to an upload in the same request card", [
      "CLIENT_DOCUMENT_REQUEST_CARD_CURRENT_UPLOAD_DANGLING",
    ]);
  }
  if (card.current_artifact_upload_ref !== null && currentArtifact === null) {
    fail("current_artifact_upload_ref must point to an upload in the same request card", [
      "CLIENT_DOCUMENT_REQUEST_CARD_CURRENT_ARTIFACT_DANGLING",
    ]);
  }
  if ((card.status === "OPEN" || card.status === "EXPIRED") && card.current_upload_ref !== null) {
    fail("open or expired request cards must clear current_upload_ref", [
      "CLIENT_DOCUMENT_REQUEST_CARD_OPEN_CURRENT_UPLOAD_DRIFT",
    ]);
  }
  if (
    (card.status === "OPEN" || card.status === "EXPIRED" || card.status === "REJECTED") &&
    card.current_artifact_upload_ref !== null
  ) {
    fail("non-current request cards must clear current_artifact_upload_ref", [
      "CLIENT_DOCUMENT_REQUEST_CARD_CURRENT_ARTIFACT_STATUS_DRIFT",
    ]);
  }
  const allowedTransfers = expectCurrentTransfer(card.status);
  if (
    allowedTransfers !== null &&
    (currentUpload === null || !allowedTransfers.has(currentUpload.transfer_state))
  ) {
    fail("request-card status disagrees with current_upload_ref transfer posture", [
      "CLIENT_DOCUMENT_REQUEST_CARD_STATUS_UPLOAD_TRANSFER_DRIFT",
    ]);
  }
  if (
    currentArtifact !== null &&
    (currentArtifact.transfer_state !== "ACCEPTED" ||
      currentArtifact.history_state !== "CURRENT" ||
      currentArtifact.request_binding_state === "SUPERSEDED" ||
      currentArtifact.request_binding_state === "RECONFIRMATION_REQUIRED")
  ) {
    fail("current_artifact_upload_ref must stay bound to an accepted current artifact", [
      "CLIENT_DOCUMENT_REQUEST_CARD_CURRENT_ARTIFACT_NOT_CURRENT",
    ]);
  }
}
