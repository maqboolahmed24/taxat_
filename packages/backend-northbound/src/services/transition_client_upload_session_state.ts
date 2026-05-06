import type { UploadTransferAggregate } from "../../../../packages/domain-kernel/src/uploads/upload_transfer_service.ts";
import {
  deriveUploadConfidenceScore,
  deriveUploadRecoveryPostureAndNextAction,
  reconcileInflightRequestRebase,
  validateUploadSessionChronologyAndScope,
} from "../../../../packages/backend-portal/src/index.ts";
import {
  assertClientUploadSessionContract,
  type ClientUploadSessionRecord,
} from "../models/client_upload_session.ts";

export type UploadSessionStateTransition =
  | {
      kind: "ALLOCATED_READY_FOR_BYTES";
      now: string;
    }
  | {
      kind: "ACCEPTED_WAITING_FOR_ATTACHMENT";
      now: string;
    }
  | {
      kind: "FAILED_CHECKSUM";
      now: string;
      outcomeReasonCode: string;
    }
  | {
      kind: "REBASE";
      explicitReconfirmation?: boolean;
      liveRequestVersionRef: string;
      now: string;
      supersede?: boolean;
    }
  | {
      attachedDocumentRef: string;
      kind: "CONFIRM_ATTACHMENT";
      now: string;
    };

function applyGovernedUploadPosture(session: ClientUploadSessionRecord): ClientUploadSessionRecord {
  const posture = deriveUploadRecoveryPostureAndNextAction(session);
  const withPosture = {
    ...session,
    attached_document_ref:
      posture.attachmentState === "ATTACHED" ? session.attached_document_ref : null,
    attachment_confirmed_at:
      posture.attachmentState === "ATTACHED" ? session.attachment_confirmed_at : null,
    attachment_state: posture.attachmentState,
    dominant_hazard_code: posture.dominantHazardCode,
    next_action_code: posture.nextActionCode,
    recovery_posture: posture.recoveryPosture,
  } satisfies ClientUploadSessionRecord;
  return assertClientUploadSessionContract(
    validateUploadSessionChronologyAndScope({
      ...withPosture,
      upload_confidence_score: deriveUploadConfidenceScore(withPosture),
    }),
  );
}

function normalizeAllocatedSessionForNorthbound(
  session: ClientUploadSessionRecord,
  now: string,
): ClientUploadSessionRecord {
  return applyGovernedUploadPosture({
    ...session,
    bytes_transferred: 0,
    integrity_state: "PENDING",
    last_activity_at: now,
    state_changed_at: now,
    submitted_at: now,
    transfer_started_at: now,
    transfer_state: "UPLOADING",
  });
}

function transitionAcceptedSession(
  session: ClientUploadSessionRecord,
  now: string,
): ClientUploadSessionRecord {
  return applyGovernedUploadPosture({
    ...session,
    attached_document_ref: null,
    attachment_confirmed_at: null,
    bytes_transferred: session.byte_count,
    finalized_at: now,
    integrity_state: "VERIFIED",
    last_activity_at: now,
    malware_scan_state: "CLEAN",
    outcome_reason_code: null,
    resume_token_ref: null,
    resumability_state: "CLOSED",
    scan_completed_at: now,
    state_changed_at: now,
    transfer_state: "ACCEPTED",
    validation_completed_at: now,
    validation_state: "ACCEPTED",
  });
}

function transitionFailedChecksumSession(
  session: ClientUploadSessionRecord,
  input: Extract<UploadSessionStateTransition, { kind: "FAILED_CHECKSUM" }>,
): ClientUploadSessionRecord {
  return applyGovernedUploadPosture({
    ...session,
    attachment_confirmed_at: null,
    attachment_state: "STAGED",
    attached_document_ref: null,
    finalized_at: input.now,
    integrity_state: "FAILED",
    last_activity_at: input.now,
    malware_scan_state: "PENDING",
    outcome_reason_code: input.outcomeReasonCode,
    resume_token_ref: null,
    resumability_state: "CLOSED",
    retry_count: session.retry_count + 1,
    state_changed_at: input.now,
    transfer_state: "FAILED",
    validation_state: "PENDING",
  });
}

async function transitionRebase(
  aggregate: UploadTransferAggregate,
  transition: Extract<UploadSessionStateTransition, { kind: "REBASE" }>,
) {
  return {
    ...aggregate,
    session: assertClientUploadSessionContract(
      reconcileInflightRequestRebase({
        explicitReconfirmation: transition.explicitReconfirmation,
        liveRequestVersionRef: transition.liveRequestVersionRef,
        now: transition.now,
        session: aggregate.session,
        supersede: transition.supersede,
      }),
    ),
  } satisfies UploadTransferAggregate;
}

export async function transitionClientUploadSessionState(input: {
  aggregate: UploadTransferAggregate;
  transition: UploadSessionStateTransition;
}) {
  if (input.transition.kind === "CONFIRM_ATTACHMENT") {
    return {
      ...input.aggregate,
      session: applyGovernedUploadPosture({
        ...input.aggregate.session,
        attached_document_ref: input.transition.attachedDocumentRef,
        attachment_confirmed_at: input.transition.now,
        attachment_state: "ATTACHED",
        last_activity_at: input.transition.now,
        state_changed_at: input.transition.now,
      }),
    } satisfies UploadTransferAggregate;
  }

  if (input.transition.kind === "REBASE") {
    return transitionRebase(input.aggregate, input.transition);
  }

  const session =
    input.transition.kind === "ALLOCATED_READY_FOR_BYTES"
      ? normalizeAllocatedSessionForNorthbound(
          input.aggregate.session,
          input.transition.now,
        )
      : input.transition.kind === "ACCEPTED_WAITING_FOR_ATTACHMENT"
        ? transitionAcceptedSession(input.aggregate.session, input.transition.now)
        : transitionFailedChecksumSession(input.aggregate.session, input.transition);

  return {
    ...input.aggregate,
    session: assertClientUploadSessionContract(session),
  } satisfies UploadTransferAggregate;
}
