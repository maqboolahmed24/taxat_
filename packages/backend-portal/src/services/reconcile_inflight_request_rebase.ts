import type { ClientPortalUploadSessionRecord } from "../types.ts";
import { deriveUploadConfidenceScore } from "./derive_upload_confidence_score.ts";
import { deriveUploadRecoveryPostureAndNextAction } from "./derive_upload_recovery_posture_and_next_action.ts";
import { reconcileUploadRequestBindingContractForPortal } from "./derive_upload_request_binding_contract.ts";
import { validateUploadSessionChronologyAndScope } from "./validate_upload_session_chronology_and_scope.ts";

export type ReconcileInflightRequestRebaseInput = {
  explicitReconfirmation?: boolean | undefined;
  liveRequestVersionRef: string;
  now: string;
  session: ClientPortalUploadSessionRecord;
  supersede?: boolean | undefined;
};

function normalizeInstant(value: string) {
  const parsed = new Date(value);
  const iso = parsed.toISOString();
  return iso.endsWith(".000Z") ? iso.replace(".000Z", "Z") : iso;
}

export function reconcileInflightRequestRebase(
  input: ReconcileInflightRequestRebaseInput,
): ClientPortalUploadSessionRecord {
  const now = normalizeInstant(input.now);
  const binding = reconcileUploadRequestBindingContractForPortal({
    contract: input.session.upload_request_binding_contract,
    explicitReconfirmation: input.explicitReconfirmation,
    liveRequestVersionRef: input.liveRequestVersionRef,
    now,
    supersede: input.supersede,
  });
  const rebased = {
    ...input.session,
    attached_document_ref:
      binding.request_binding_state === "RECONFIRMATION_REQUIRED" ||
      binding.request_binding_state === "SUPERSEDED"
        ? null
        : input.session.attached_document_ref,
    attachment_confirmed_at:
      binding.request_binding_state === "RECONFIRMATION_REQUIRED" ||
      binding.request_binding_state === "SUPERSEDED"
        ? null
        : input.session.attachment_confirmed_at,
    last_activity_at: now,
    reconfirmed_at: input.explicitReconfirmation ? now : null,
    request_binding_state: binding.request_binding_state,
    state_changed_at: now,
    upload_request_binding_contract: binding,
  } satisfies ClientPortalUploadSessionRecord;
  const posture = deriveUploadRecoveryPostureAndNextAction(rebased);
  const withPosture = {
    ...rebased,
    attachment_state: posture.attachmentState,
    dominant_hazard_code: posture.dominantHazardCode,
    next_action_code: posture.nextActionCode,
    recovery_posture: posture.recoveryPosture,
  } satisfies ClientPortalUploadSessionRecord;
  return validateUploadSessionChronologyAndScope({
    ...withPosture,
    upload_confidence_score: deriveUploadConfidenceScore(withPosture),
  });
}
