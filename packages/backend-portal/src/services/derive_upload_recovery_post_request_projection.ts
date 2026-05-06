import type { UploadSessionRecoveryHarnessRequestProjectionSnapshot } from "../../../generated-models/src/generated/typescript/index.ts";
import type { ClientPortalUploadSessionRecord } from "../types.ts";
import { validateUploadSessionChronologyAndScope } from "./validate_upload_session_chronology_and_scope.ts";

function isReadyCurrentRequestSession(session: ClientPortalUploadSessionRecord) {
  return (
    (session.request_binding_state === "ORIGINAL_CURRENT" ||
      session.request_binding_state === "RECONFIRMED_CURRENT") &&
    session.transfer_state === "ACCEPTED" &&
    session.integrity_state === "VERIFIED" &&
    session.malware_scan_state === "CLEAN" &&
    session.validation_state === "ACCEPTED" &&
    session.attachment_state === "ATTACHED" &&
    session.attached_document_ref !== null &&
    session.attachment_confirmed_at !== null &&
    session.next_action_code === "NONE" &&
    session.recovery_posture === "NONE" &&
    session.upload_confidence_score >= 85
  );
}

export function deriveUploadRecoveryPostRequestProjection(
  session: ClientPortalUploadSessionRecord,
): UploadSessionRecoveryHarnessRequestProjectionSnapshot {
  const validated = validateUploadSessionChronologyAndScope(session);
  return {
    current_request_upload_ref_or_null: isReadyCurrentRequestSession(validated)
      ? validated.upload_session_id
      : null,
    latest_upload_ref_or_null: validated.upload_session_id,
    request_id: validated.request_id,
    request_version_ref:
      validated.upload_request_binding_contract.live_request_version_ref,
  };
}
