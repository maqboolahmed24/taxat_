import {
  assessUploadResume,
} from "../../../../packages/domain-kernel/src/uploads/upload_transfer_resume.ts";
import {
  deriveUploadConfidenceScore,
  deriveUploadRecoveryPostureAndNextAction,
  validateUploadSessionChronologyAndScope,
} from "../../../../packages/backend-portal/src/index.ts";
import { assertClientUploadSessionContract } from "../models/client_upload_session.ts";
import type {
  ClientUploadSessionRepositoryLike,
  StoredClientUploadSessionRecord,
} from "../repositories/client_upload_session_repository.ts";
import { transitionClientUploadSessionState } from "./transition_client_upload_session_state.ts";

export async function reuseDuplicateUploadSession(input: {
  liveRequestVersionRef: string;
  now: string;
  repository: ClientUploadSessionRepositoryLike;
  stored: StoredClientUploadSessionRecord;
}) {
  const assessment = await assessUploadResume({
    duplicateAllocationIntent: true,
    liveRequestVersionRef: input.liveRequestVersionRef,
    now: input.now,
    session: input.stored.aggregate.session,
    surfaceClass: input.stored.aggregate.session.surface_class,
    tracker: input.stored.aggregate.offsetTracker,
  });
  const rebound =
    input.liveRequestVersionRef ===
    input.stored.aggregate.session.upload_request_binding_contract.live_request_version_ref
      ? input.stored.aggregate
      : await transitionClientUploadSessionState({
          aggregate: input.stored.aggregate,
          transition: {
            kind: "REBASE",
            liveRequestVersionRef: input.liveRequestVersionRef,
            now: input.now,
          },
        });
  const resumable = rebound.session.resumability_state === "RESUMABLE" && assessment.allowed;
  const baseSession = {
    ...rebound.session,
    last_activity_at: input.now,
    resume_attempt_count: rebound.session.resume_attempt_count + 1,
    resume_success_count: resumable
      ? rebound.session.resume_success_count + 1
      : rebound.session.resume_success_count,
    state_changed_at: input.now,
  };
  const posture = deriveUploadRecoveryPostureAndNextAction(baseSession);
  const governedSession = assertClientUploadSessionContract(
    validateUploadSessionChronologyAndScope({
      ...baseSession,
      attachment_state: posture.attachmentState,
      dominant_hazard_code: posture.dominantHazardCode,
      next_action_code: posture.nextActionCode,
      recovery_posture: posture.recoveryPosture,
      upload_confidence_score: deriveUploadConfidenceScore({
        ...baseSession,
        attachment_state: posture.attachmentState,
      }),
    }),
  );
  const aggregate = {
    ...rebound,
    session: governedSession,
  };
  return input.repository.persistUploadSession({
    aggregate,
    duplicateSuppressionKey: input.stored.duplicate_suppression_key,
    persistedAt: input.now,
  });
}
