import type { ClientPortalUploadSessionRecord } from "../types.ts";
import type { UploadSessionRecoveryHarnessSessionSnapshot } from "../../../generated-models/src/generated/typescript/index.ts";
import { deriveUploadConfidenceScore } from "../services/derive_upload_confidence_score.ts";
import { deriveUploadRecoveryPostureAndNextAction } from "../services/derive_upload_recovery_posture_and_next_action.ts";
import { deriveUploadRequestBindingContract } from "../services/derive_upload_request_binding_contract.ts";
import { validateUploadSessionChronologyAndScope } from "../services/validate_upload_session_chronology_and_scope.ts";

export type BuildClientUploadSessionInput = {
  attachedDocumentRef?: string | null | undefined;
  attachmentConfirmedAt?: string | null | undefined;
  attachmentState?: ClientPortalUploadSessionRecord["attachment_state"] | undefined;
  byteCount: number;
  bytesTransferred?: number | undefined;
  captureMode?: ClientPortalUploadSessionRecord["capture_mode"] | undefined;
  checksum: string;
  clientId: string;
  explicitReconfirmation?: boolean | undefined;
  expiresAt?: string | undefined;
  filename: string;
  finalizedAt?: string | null | undefined;
  frozenRequestVersionRef: string;
  initiatedBy?: string | undefined;
  integrityState?: ClientPortalUploadSessionRecord["integrity_state"] | undefined;
  lastActivityAt?: string | null | undefined;
  liveRequestVersionRef?: string | null | undefined;
  malwareScanState?: ClientPortalUploadSessionRecord["malware_scan_state"] | undefined;
  manifestId?: string | null | undefined;
  mediaType: string;
  now: string;
  outcomeReasonCode?: string | null | undefined;
  reconfirmedAt?: string | null | undefined;
  requestId: string;
  requestIdentityRef?: string | null | undefined;
  resetForAttachmentConfirmation?: boolean | undefined;
  resumeAttemptCount?: number | undefined;
  resumeSuccessCount?: number | undefined;
  resumeTokenRef?: string | null | undefined;
  resumabilityState?: ClientPortalUploadSessionRecord["resumability_state"] | undefined;
  retryCount?: number | undefined;
  scanCompletedAt?: string | null | undefined;
  stateChangedAt?: string | undefined;
  storageRef: string;
  submittedAt?: string | undefined;
  supersede?: boolean | undefined;
  surfaceClass?: ClientPortalUploadSessionRecord["surface_class"] | undefined;
  tenantId: string;
  transferStartedAt?: string | null | undefined;
  transferState?: ClientPortalUploadSessionRecord["transfer_state"] | undefined;
  uploadSessionId: string;
  validationCompletedAt?: string | null | undefined;
  validationState?: ClientPortalUploadSessionRecord["validation_state"] | undefined;
};

function normalizeInstant(value: string) {
  const parsed = new Date(value);
  const iso = parsed.toISOString();
  return iso.endsWith(".000Z") ? iso.replace(".000Z", "Z") : iso;
}

function plusHours(now: string, hours: number) {
  const base = new Date(now);
  return normalizeInstant(new Date(base.valueOf() + hours * 3_600_000).toISOString());
}

function resumeTokenRef(input: { storageRef: string; uploadSessionId: string }) {
  return `resume.${input.uploadSessionId}.${input.storageRef}`;
}

export function buildClientUploadSession(
  input: BuildClientUploadSessionInput,
): ClientPortalUploadSessionRecord {
  const now = normalizeInstant(input.now);
  const transferState = input.transferState ?? "UPLOADING";
  const submittedAt = normalizeInstant(input.submittedAt ?? now);
  const transferStartedAt = input.transferStartedAt ?? now;
  const lastActivityAt = input.lastActivityAt ?? now;
  const bytesTransferred = input.bytesTransferred ?? 0;
  const accepted = transferState === "ACCEPTED";
  const binding = deriveUploadRequestBindingContract({
    clientId: input.clientId,
    explicitReconfirmation: input.explicitReconfirmation,
    frozenRequestVersionRef: input.frozenRequestVersionRef,
    liveRequestVersionRef: input.liveRequestVersionRef ?? input.frozenRequestVersionRef,
    now,
    requestId: input.requestId,
    requestIdentityRef: input.requestIdentityRef ?? input.requestId,
    supersede: input.supersede,
    tenantId: input.tenantId,
  });
  const base = {
    artifact_type: "ClientUploadSession",
    attached_document_ref: input.attachedDocumentRef ?? null,
    attachment_confirmed_at: input.attachmentConfirmedAt ?? null,
    attachment_state: input.attachmentState ?? "STAGED",
    byte_count: input.byteCount,
    bytes_transferred: accepted ? input.byteCount : bytesTransferred,
    capture_mode: input.captureMode ?? "BROWSE",
    checksum: input.checksum,
    client_id: input.clientId,
    dominant_hazard_code: null,
    expires_at: normalizeInstant(input.expiresAt ?? plusHours(now, 24)),
    filename: input.filename,
    finalized_at: input.finalizedAt ?? (accepted ? now : null),
    initiated_by: input.initiatedBy ?? "client-portal",
    integrity_state: input.integrityState ?? (accepted ? "VERIFIED" : "PENDING"),
    last_activity_at: lastActivityAt,
    malware_scan_state: input.malwareScanState ?? (accepted ? "CLEAN" : "PENDING"),
    manifest_id: input.manifestId ?? null,
    media_type: input.mediaType,
    next_action_code: "RESUME_UPLOAD",
    outcome_reason_code: input.outcomeReasonCode ?? null,
    reconfirmed_at:
      binding.request_binding_state === "RECONFIRMED_CURRENT"
        ? (input.reconfirmedAt ?? now)
        : null,
    request_binding_state: binding.request_binding_state,
    request_id: input.requestId,
    request_version_ref: input.frozenRequestVersionRef,
    resume_attempt_count: input.resumeAttemptCount ?? 0,
    resume_success_count: input.resumeSuccessCount ?? 0,
    resume_token_ref:
      input.resumabilityState === "CLOSED"
        ? null
        : (input.resumeTokenRef ?? resumeTokenRef({
            storageRef: input.storageRef,
            uploadSessionId: input.uploadSessionId,
          })),
    resumability_state: input.resumabilityState ?? (accepted ? "CLOSED" : "RESUMABLE"),
    retry_count: input.retryCount ?? 0,
    scan_completed_at: input.scanCompletedAt ?? (accepted ? now : null),
    state_changed_at: normalizeInstant(input.stateChangedAt ?? now),
    storage_ref: input.storageRef,
    submitted_at: submittedAt,
    surface_class: input.surfaceClass ?? "DESKTOP",
    tenant_id: input.tenantId,
    transfer_started_at: transferStartedAt,
    transfer_state: transferState,
    upload_confidence_score: 0,
    upload_request_binding_contract: binding,
    upload_session_id: input.uploadSessionId,
    validation_completed_at: input.validationCompletedAt ?? (accepted ? now : null),
    validation_state: input.validationState ?? (accepted ? "ACCEPTED" : "PENDING"),
    recovery_posture: "INLINE_RESUME",
  } satisfies ClientPortalUploadSessionRecord;
  const posture = deriveUploadRecoveryPostureAndNextAction({
    ...base,
    attachment_state: input.resetForAttachmentConfirmation ? "CONFIRMATION_REQUIRED" : base.attachment_state,
  });
  const withPosture = {
    ...base,
    attached_document_ref:
      posture.attachmentState === "ATTACHED" ? base.attached_document_ref : null,
    attachment_confirmed_at:
      posture.attachmentState === "ATTACHED" ? base.attachment_confirmed_at : null,
    attachment_state: posture.attachmentState,
    dominant_hazard_code: posture.dominantHazardCode,
    next_action_code: posture.nextActionCode,
    recovery_posture: posture.recoveryPosture,
    resume_token_ref:
      base.resumability_state === "CLOSED" ? null : base.resume_token_ref,
  } satisfies ClientPortalUploadSessionRecord;
  return validateUploadSessionChronologyAndScope({
    ...withPosture,
    upload_confidence_score: deriveUploadConfidenceScore(withPosture),
  });
}

export type ClientUploadSessionRecoverySnapshot =
  Omit<UploadSessionRecoveryHarnessSessionSnapshot, "attachment_confirmed_at_or_null"> & {
    attachment_confirmed_at_or_null: string | null;
  };

export function toClientUploadSessionRecoverySnapshot(
  session: ClientPortalUploadSessionRecord,
): ClientUploadSessionRecoverySnapshot {
  const validated = validateUploadSessionChronologyAndScope(session);
  return {
    attached_document_ref_or_null: validated.attached_document_ref,
    attachment_confirmed_at_or_null: validated.attachment_confirmed_at,
    attachment_state: validated.attachment_state,
    byte_count: validated.byte_count,
    bytes_transferred: validated.bytes_transferred,
    client_id: validated.client_id,
    frozen_request_version_ref: validated.request_version_ref,
    integrity_state: validated.integrity_state,
    live_request_version_ref:
      validated.upload_request_binding_contract.live_request_version_ref,
    malware_scan_state: validated.malware_scan_state,
    next_action_code: validated.next_action_code,
    request_binding_state: validated.request_binding_state,
    request_id: validated.request_id,
    resumability_state: validated.resumability_state,
    resume_token_ref_or_null: validated.resume_token_ref,
    storage_ref: validated.storage_ref,
    tenant_id: validated.tenant_id,
    transfer_state: validated.transfer_state,
    upload_confidence_score: validated.upload_confidence_score,
    upload_session_id: validated.upload_session_id,
    validation_state: validated.validation_state,
  };
}
