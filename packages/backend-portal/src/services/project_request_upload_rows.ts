import {
  deriveUploadHistoryState,
  deriveUploadPreviewPosture,
  deriveUploadStatusPhase,
} from "./derive_request_history_and_preview_posture.ts";
import { deriveUploadRequestBindingContract } from "./derive_upload_request_binding_contract.ts";
import type {
  ClientDocumentProjectedUploadRow,
  ClientDocumentRequestLifecycleState,
  ClientDocumentUploadAttachmentState,
  ClientDocumentUploadNextActionCode,
  ClientDocumentUploadRecoveryPosture,
  ClientDocumentUploadRequestBindingState,
  ClientDocumentUploadResumabilityState,
  ClientDocumentUploadTransferState,
} from "../types.ts";
import { ClientDocumentRequestProjectionError } from "../types.ts";

export type RequestUploadRowInput = {
  attachment_state: ClientDocumentUploadAttachmentState;
  dominant_hazard_code?: string | null | undefined;
  download_ref?: string | null | undefined;
  filename: string;
  media_type?: string | null | undefined;
  next_action_code: ClientDocumentUploadNextActionCode;
  preview_reason_code?: string | null | undefined;
  preview_posture?: string | null | undefined;
  recovery_posture: ClientDocumentUploadRecoveryPosture;
  request_binding_state: ClientDocumentUploadRequestBindingState;
  request_id?: string | undefined;
  request_version_ref: string;
  resumability_state: ClientDocumentUploadResumabilityState;
  transfer_state: ClientDocumentUploadTransferState;
  upload_confidence_score: number;
  upload_request_binding_contract?: Record<string, unknown> | undefined;
  upload_session_id: string;
  uploaded_at?: string | null | undefined;
};

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new ClientDocumentRequestProjectionError(message, reasonCodes);
}

function assertNonEmpty(label: string, value: string | null | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required`, ["CLIENT_DOCUMENT_REQUEST_UPLOAD_IDENTITY_INVALID"]);
  }
}

export function projectRequestUploadRows(input: {
  clientId: string;
  currentArtifactUploadRefOrNull?: string | null | undefined;
  currentRequestUploadRefOrNull?: string | null | undefined;
  liveRequestVersionRef?: string | undefined;
  requestId: string;
  requestLifecycleState: ClientDocumentRequestLifecycleState;
  requestVersionRef: string;
  tenantId: string;
  uploads?: readonly RequestUploadRowInput[] | undefined;
}): ClientDocumentProjectedUploadRow[] {
  const uploads = input.uploads ?? [];
  const seen = new Set<string>();
  return uploads.map((upload) => {
    assertNonEmpty("upload_session_id", upload.upload_session_id);
    assertNonEmpty("request_version_ref", upload.request_version_ref);
    assertNonEmpty("filename", upload.filename);
    if (seen.has(upload.upload_session_id)) {
      fail("duplicate upload_session_id inside one request card", [
        "CLIENT_DOCUMENT_REQUEST_DUPLICATE_UPLOAD_SESSION_ID",
      ]);
    }
    seen.add(upload.upload_session_id);
    if (upload.request_id !== undefined && upload.request_id !== input.requestId) {
      fail("upload row belongs to a different request", [
        "CLIENT_DOCUMENT_REQUEST_UPLOAD_MEMBERSHIP_DRIFT",
      ]);
    }
    if (
      (upload.request_binding_state === "ORIGINAL_CURRENT" ||
        upload.request_binding_state === "RECONFIRMED_CURRENT") &&
      upload.request_version_ref !== input.requestVersionRef
    ) {
      fail("current upload row must mirror the request card version", [
        "CLIENT_DOCUMENT_REQUEST_UPLOAD_VERSION_DRIFT",
      ]);
    }
    const preview = deriveUploadPreviewPosture({
      mediaType: upload.media_type ?? null,
      nextActionCode: upload.next_action_code,
      transferState: upload.transfer_state,
    });
    const isCurrentUpload =
      upload.upload_session_id === input.currentRequestUploadRefOrNull ||
      upload.upload_session_id === input.currentArtifactUploadRefOrNull;
    const statusPhase = deriveUploadStatusPhase({
      isCurrentUpload,
      nextActionCode: upload.next_action_code,
      requestLifecycleState: input.requestLifecycleState,
      transferState: upload.transfer_state,
    });
    const projectedPreviewPosture =
      upload.preview_posture === undefined || upload.preview_posture === null
        ? preview.preview_posture
        : upload.preview_posture;
    const projectedPreviewReason =
      "preview_reason_code" in upload ? upload.preview_reason_code : preview.preview_reason_code;

    return {
      attachment_state: upload.attachment_state,
      dominant_hazard_code: upload.dominant_hazard_code ?? null,
      download_ref:
        upload.download_ref ??
        (upload.transfer_state === "ACCEPTED"
          ? `artifact.${upload.upload_session_id}.download`
          : null),
      filename: upload.filename,
      history_state: deriveUploadHistoryState({
        currentArtifactUploadRefOrNull: input.currentArtifactUploadRefOrNull,
        currentRequestUploadRefOrNull: input.currentRequestUploadRefOrNull,
        requestBindingState: upload.request_binding_state,
        transferState: upload.transfer_state,
        uploadSessionId: upload.upload_session_id,
      }),
      next_action_code: upload.next_action_code,
      preview_posture: projectedPreviewPosture as ClientDocumentProjectedUploadRow["preview_posture"],
      preview_reason_code:
        projectedPreviewReason as ClientDocumentProjectedUploadRow["preview_reason_code"],
      recovery_posture: upload.recovery_posture,
      request_binding_state: upload.request_binding_state,
      request_version_ref: upload.request_version_ref,
      resumability_state: upload.resumability_state,
      status_phase: statusPhase,
      transfer_state: upload.transfer_state,
      upload_confidence_score: upload.upload_confidence_score,
      upload_request_binding_contract:
        upload.upload_request_binding_contract ??
        deriveUploadRequestBindingContract({
          clientId: input.clientId,
          explicitReconfirmation: upload.request_binding_state === "RECONFIRMED_CURRENT",
          frozenRequestVersionRef: upload.request_version_ref,
          liveRequestVersionRef: input.liveRequestVersionRef ?? input.requestVersionRef,
          now: upload.uploaded_at ?? "2026-05-03T10:00:00Z",
          requestId: input.requestId,
          supersede: upload.request_binding_state === "SUPERSEDED",
          tenantId: input.tenantId,
        }),
      upload_session_id: upload.upload_session_id,
      uploaded_at: upload.uploaded_at ?? null,
    };
  });
}
