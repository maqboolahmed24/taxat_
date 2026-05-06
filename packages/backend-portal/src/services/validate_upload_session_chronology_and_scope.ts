import type { ClientPortalUploadSessionRecord } from "../types.ts";
import { ClientUploadSessionProjectionError } from "../types.ts";
import { deriveUploadConfidenceScore } from "./derive_upload_confidence_score.ts";
import { deriveUploadRecoveryPostureAndNextAction } from "./derive_upload_recovery_posture_and_next_action.ts";
import {
  validateUploadRequestBindingContract,
  validateUploadRequestBindingScope,
} from "./derive_upload_request_binding_contract.ts";

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new ClientUploadSessionProjectionError(message, reasonCodes);
}

function assertNonEmpty(label: string, value: string | null | undefined): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required`, ["CLIENT_UPLOAD_SESSION_IDENTITY_SCOPE_INVALID"]);
  }
  return value;
}

function assertNullableNonEmpty(label: string, value: string | null | undefined) {
  if (value !== null && value !== undefined) {
    assertNonEmpty(label, value);
  }
}

function instant(label: string, value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  assertNonEmpty(label, value);
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    fail(`${label} must be a valid ISO-8601 instant`, [
      "CLIENT_UPLOAD_SESSION_CHRONOLOGY_INVALID",
    ]);
  }
  return parsed;
}

function assertNotBefore(input: {
  laterLabel: string;
  laterValue: string | null | undefined;
  earlierLabel: string;
  earlierValue: string | null | undefined;
}) {
  const earlier = instant(input.earlierLabel, input.earlierValue);
  const later = instant(input.laterLabel, input.laterValue);
  if (earlier !== null && later !== null && later < earlier) {
    fail(`${input.laterLabel} must not be earlier than ${input.earlierLabel}`, [
      "CLIENT_UPLOAD_SESSION_CHRONOLOGY_INVALID",
    ]);
  }
}

function latestMaterialTimestamp(session: ClientPortalUploadSessionRecord) {
  return Math.max(
    ...[
      session.submitted_at,
      session.transfer_started_at,
      session.last_activity_at,
      session.scan_completed_at,
      session.validation_completed_at,
      session.finalized_at,
      session.attachment_confirmed_at,
      session.reconfirmed_at,
    ]
      .map((value) => instant("material_upload_timestamp", value))
      .filter((value): value is number => value !== null),
  );
}

export function validateUploadSessionChronologyAndScope(
  session: ClientPortalUploadSessionRecord,
) {
  if (session.artifact_type !== "ClientUploadSession") {
    fail("artifact_type must be ClientUploadSession", ["CLIENT_UPLOAD_SESSION_ARTIFACT_TYPE_INVALID"]);
  }
  assertNonEmpty("upload_session_id", session.upload_session_id);
  assertNonEmpty("tenant_id", session.tenant_id);
  assertNonEmpty("client_id", session.client_id);
  assertNullableNonEmpty("manifest_id", session.manifest_id);
  assertNonEmpty("request_id", session.request_id);
  assertNonEmpty("request_version_ref", session.request_version_ref);
  assertNonEmpty("initiated_by", session.initiated_by);
  assertNonEmpty("storage_ref", session.storage_ref);
  assertNonEmpty("filename", session.filename);
  if (session.filename.length > 120) {
    fail("filename must fit the ClientUploadSession schema limit", [
      "CLIENT_UPLOAD_SESSION_FILENAME_INVALID",
    ]);
  }
  assertNonEmpty("media_type", session.media_type);
  assertNonEmpty("checksum", session.checksum);
  assertNullableNonEmpty("resume_token_ref", session.resume_token_ref);
  assertNullableNonEmpty("attached_document_ref", session.attached_document_ref);
  assertNullableNonEmpty("outcome_reason_code", session.outcome_reason_code);
  assertNullableNonEmpty("dominant_hazard_code", session.dominant_hazard_code);

  validateUploadRequestBindingContract(session.upload_request_binding_contract);
  validateUploadRequestBindingScope({
    clientId: session.client_id,
    contract: session.upload_request_binding_contract,
    requestId: session.request_id,
    tenantId: session.tenant_id,
  });
  if (session.request_version_ref !== session.upload_request_binding_contract.frozen_request_version_ref) {
    fail("request_version_ref must remain the frozen upload request version", [
      "CLIENT_UPLOAD_SESSION_REQUEST_VERSION_DRIFT",
    ]);
  }
  if (session.request_binding_state !== session.upload_request_binding_contract.request_binding_state) {
    fail("request_binding_state must mirror upload_request_binding_contract", [
      "CLIENT_UPLOAD_SESSION_BINDING_STATE_DRIFT",
    ]);
  }

  if (!Number.isInteger(session.byte_count) || session.byte_count <= 0) {
    fail("byte_count must be a positive integer", ["CLIENT_UPLOAD_SESSION_BYTE_COUNT_INVALID"]);
  }
  if (!Number.isInteger(session.bytes_transferred) || session.bytes_transferred < 0) {
    fail("bytes_transferred must be a non-negative integer", [
      "CLIENT_UPLOAD_SESSION_BYTES_TRANSFERRED_INVALID",
    ]);
  }
  if (session.bytes_transferred > session.byte_count) {
    fail("bytes_transferred must not exceed byte_count", [
      "CLIENT_UPLOAD_SESSION_BYTES_TRANSFERRED_INVALID",
    ]);
  }
  if (session.resume_success_count > session.resume_attempt_count) {
    fail("resume_success_count must not exceed resume_attempt_count", [
      "CLIENT_UPLOAD_SESSION_RESUME_COUNTER_DRIFT",
    ]);
  }

  assertNotBefore({
    earlierLabel: "submitted_at",
    earlierValue: session.submitted_at,
    laterLabel: "transfer_started_at",
    laterValue: session.transfer_started_at,
  });
  assertNotBefore({
    earlierLabel: "transfer_started_at",
    earlierValue: session.transfer_started_at,
    laterLabel: "last_activity_at",
    laterValue: session.last_activity_at,
  });
  assertNotBefore({
    earlierLabel: "transfer_started_at",
    earlierValue: session.transfer_started_at,
    laterLabel: "scan_completed_at",
    laterValue: session.scan_completed_at,
  });
  assertNotBefore({
    earlierLabel: "scan_completed_at",
    earlierValue: session.scan_completed_at,
    laterLabel: "validation_completed_at",
    laterValue: session.validation_completed_at,
  });
  assertNotBefore({
    earlierLabel: "validation_completed_at",
    earlierValue: session.validation_completed_at,
    laterLabel: "finalized_at",
    laterValue: session.finalized_at,
  });
  assertNotBefore({
    earlierLabel: "finalized_at",
    earlierValue: session.finalized_at,
    laterLabel: "attachment_confirmed_at",
    laterValue: session.attachment_confirmed_at,
  });
  assertNotBefore({
    earlierLabel: "finalized_at",
    earlierValue: session.finalized_at,
    laterLabel: "reconfirmed_at",
    laterValue: session.reconfirmed_at,
  });
  const latestTimestamp = latestMaterialTimestamp(session);
  if (
    Number.isFinite(latestTimestamp) &&
    instant("state_changed_at", session.state_changed_at)! < latestTimestamp
  ) {
    fail("state_changed_at must not predate the latest material upload timestamp", [
      "CLIENT_UPLOAD_SESSION_CHRONOLOGY_INVALID",
    ]);
  }

  if (session.resumability_state === "RESUMABLE") {
    if (session.resume_token_ref === null || session.next_action_code !== "RESUME_UPLOAD") {
      fail("RESUMABLE sessions require resume_token_ref and RESUME_UPLOAD", [
        "CLIENT_UPLOAD_SESSION_RESUMABILITY_DRIFT",
      ]);
    }
  }
  if (session.resumability_state === "CLOSED" && session.resume_token_ref !== null) {
    fail("CLOSED sessions must clear resume_token_ref", [
      "CLIENT_UPLOAD_SESSION_RESUMABILITY_DRIFT",
    ]);
  }
  if (session.request_binding_state === "ORIGINAL_CURRENT" && session.reconfirmed_at !== null) {
    fail("ORIGINAL_CURRENT sessions must not publish reconfirmed_at", [
      "CLIENT_UPLOAD_SESSION_RECONFIRMATION_DRIFT",
    ]);
  }
  if (session.request_binding_state === "RECONFIRMED_CURRENT" && session.reconfirmed_at === null) {
    fail("RECONFIRMED_CURRENT sessions must publish reconfirmed_at", [
      "CLIENT_UPLOAD_SESSION_RECONFIRMATION_REQUIRED",
    ]);
  }

  const staleBinding =
    session.request_binding_state === "RECONFIRMATION_REQUIRED" ||
    session.request_binding_state === "SUPERSEDED";
  if (staleBinding) {
    if (
      session.attached_document_ref !== null ||
      session.attachment_confirmed_at !== null ||
      session.reconfirmed_at !== null
    ) {
      fail("stale upload bindings must clear attachment and reconfirmation refs", [
        "CLIENT_UPLOAD_SESSION_STALE_ATTACHMENT_DRIFT",
      ]);
    }
    if (session.transfer_state === "ACCEPTED") {
      if (
        session.attachment_state !== "REBIND_REQUIRED" ||
        session.next_action_code !== "RECONFIRM_REQUEST"
      ) {
        fail("accepted stale uploads require explicit rebind posture", [
          "CLIENT_UPLOAD_SESSION_STALE_REBIND_REQUIRED",
        ]);
      }
    } else if (session.attachment_state !== "STAGED") {
      fail("non-accepted stale uploads must remain staged until transfer settles", [
        "CLIENT_UPLOAD_SESSION_STALE_INFLIGHT_ATTACHMENT_DRIFT",
      ]);
    }
  }

  if (session.transfer_state === "ACCEPTED") {
    if (
      session.bytes_transferred !== session.byte_count ||
      session.integrity_state !== "VERIFIED" ||
      session.malware_scan_state !== "CLEAN" ||
      session.validation_state !== "ACCEPTED" ||
      session.resumability_state !== "CLOSED" ||
      session.scan_completed_at === null ||
      session.validation_completed_at === null ||
      session.finalized_at === null
    ) {
      fail("ACCEPTED sessions require verified bytes, clean scan, accepted validation, and closed resumability", [
        "CLIENT_UPLOAD_SESSION_ACCEPTED_POSTURE_INVALID",
      ]);
    }
  }

  if (session.attachment_state === "CONFIRMATION_REQUIRED") {
    if (
      session.transfer_state !== "ACCEPTED" ||
      staleBinding ||
      session.attached_document_ref !== null ||
      session.attachment_confirmed_at !== null ||
      session.next_action_code !== "CONFIRM_ATTACHMENT"
    ) {
      fail("confirmation-required uploads must be accepted current uploads awaiting explicit attachment", [
        "CLIENT_UPLOAD_SESSION_ATTACHMENT_CONFIRMATION_INVALID",
      ]);
    }
  }
  if (session.attachment_state === "ATTACHED") {
    if (
      session.transfer_state !== "ACCEPTED" ||
      staleBinding ||
      session.integrity_state !== "VERIFIED" ||
      session.malware_scan_state !== "CLEAN" ||
      session.validation_state !== "ACCEPTED" ||
      session.attached_document_ref === null ||
      session.attachment_confirmed_at === null ||
      session.upload_confidence_score < 85 ||
      session.next_action_code !== "NONE" ||
      session.recovery_posture !== "NONE"
    ) {
      fail("ATTACHED requires verified bytes, current binding, high confidence, and no recovery posture", [
        "CLIENT_UPLOAD_SESSION_ATTACHED_POSTURE_INVALID",
      ]);
    }
  }

  const expectedDecision = deriveUploadRecoveryPostureAndNextAction(session);
  if (
    session.attachment_state !== expectedDecision.attachmentState ||
    session.next_action_code !== expectedDecision.nextActionCode ||
    session.recovery_posture !== expectedDecision.recoveryPosture ||
    session.dominant_hazard_code !== expectedDecision.dominantHazardCode
  ) {
    fail("next_action_code, recovery_posture, attachment_state, and dominant_hazard_code must be derived from durable blocker state", [
      "CLIENT_UPLOAD_SESSION_RECOVERY_POSTURE_DRIFT",
    ]);
  }

  const expectedConfidence = deriveUploadConfidenceScore(session);
  if (session.upload_confidence_score !== expectedConfidence) {
    fail("upload_confidence_score must match the frozen backend formula", [
      "CLIENT_UPLOAD_SESSION_CONFIDENCE_FORMULA_DRIFT",
    ]);
  }
  if (session.next_action_code === "CONFIRM_ATTACHMENT" && session.upload_confidence_score < 70) {
    fail("CONFIRM_ATTACHMENT cannot be promoted below confidence threshold", [
      "CLIENT_UPLOAD_SESSION_CONFIDENCE_THRESHOLD_BLOCKED",
    ]);
  }
  return session;
}
