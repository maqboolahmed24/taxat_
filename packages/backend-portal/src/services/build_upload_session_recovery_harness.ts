import type {
  UploadSessionRecoveryHarness,
  UploadSessionRecoveryHarnessHarnessCase,
} from "../../../generated-models/src/generated/typescript/index.ts";
import { buildClientUploadSession } from "../projectors/build_client_upload_session.ts";
import { assertUploadRecoveryInvariants } from "./assert_upload_recovery_invariants.ts";
import { materializeUploadRecoveryCase } from "./materialize_upload_recovery_case.ts";
import { reconcileInflightRequestRebase } from "./reconcile_inflight_request_rebase.ts";

export const uploadSessionRecoveryHarnessDeterministicSeed = 182_007;

const baseNow = "2026-05-04T09:00:00Z";
const tenantId = "tenant.taxat-upload";
const clientId = "client.taxat-upload";
const requestId = "request.upload.bank-statement";
const frozenRequestVersionRef = "request-version.bank-statement.v1";
const liveRequestVersionRef = "request-version.bank-statement.v2";
const uploadSessionId = "upload-session.bank-statement.recovery";
const storageRef = "storage.upload-staging.upload-session.bank-statement.recovery";
const byteCount = 12;

function baseSessionInput(overrides: Partial<Parameters<typeof buildClientUploadSession>[0]> = {}) {
  return buildClientUploadSession({
    byteCount,
    checksum: "checksum.bank-statement.recovery",
    clientId,
    filename: "bank-statement.pdf",
    frozenRequestVersionRef,
    mediaType: "application/pdf",
    now: baseNow,
    requestId,
    storageRef,
    tenantId,
    uploadSessionId,
    ...overrides,
  });
}

function uploadingSession(input: {
  bytesTransferred: number;
  lastActivityAt: string;
  resumeAttemptCount?: number;
  resumeSuccessCount?: number;
  retryCount?: number;
  surfaceClass?: "DESKTOP" | "MOBILE";
}) {
  return baseSessionInput({
    bytesTransferred: input.bytesTransferred,
    lastActivityAt: input.lastActivityAt,
    resumeAttemptCount: input.resumeAttemptCount,
    resumeSuccessCount: input.resumeSuccessCount,
    retryCount: input.retryCount,
    stateChangedAt: input.lastActivityAt,
    surfaceClass: input.surfaceClass,
    transferStartedAt: "2026-05-04T09:00:30Z",
    transferState: "UPLOADING",
  });
}

function scanningSession(lastActivityAt: string) {
  return baseSessionInput({
    bytesTransferred: byteCount,
    integrityState: "VERIFIED",
    lastActivityAt,
    resumeAttemptCount: 1,
    resumeSuccessCount: 1,
    stateChangedAt: lastActivityAt,
    transferStartedAt: "2026-05-04T09:00:30Z",
    transferState: "SCANNING",
  });
}

function acceptedAwaitingAttachment(finalizedAt: string) {
  return baseSessionInput({
    bytesTransferred: byteCount,
    finalizedAt,
    lastActivityAt: finalizedAt,
    scanCompletedAt: finalizedAt,
    stateChangedAt: finalizedAt,
    transferStartedAt: "2026-05-04T09:00:30Z",
    transferState: "ACCEPTED",
    validationCompletedAt: finalizedAt,
  });
}

function attachedSession(input: {
  attachmentConfirmedAt: string;
  finalizedAt: string;
}) {
  return baseSessionInput({
    attachedDocumentRef: "artifact.document.bank-statement.current",
    attachmentConfirmedAt: input.attachmentConfirmedAt,
    attachmentState: "ATTACHED",
    bytesTransferred: byteCount,
    finalizedAt: input.finalizedAt,
    lastActivityAt: input.attachmentConfirmedAt,
    scanCompletedAt: input.finalizedAt,
    stateChangedAt: input.attachmentConfirmedAt,
    transferStartedAt: "2026-05-04T09:00:30Z",
    transferState: "ACCEPTED",
    validationCompletedAt: input.finalizedAt,
  });
}

function buildCases(): UploadSessionRecoveryHarnessHarnessCase[] {
  const mobilePre = uploadingSession({
    bytesTransferred: 4,
    lastActivityAt: "2026-05-04T09:01:00Z",
    resumeAttemptCount: 1,
    resumeSuccessCount: 1,
    surfaceClass: "MOBILE",
  });
  const mobilePost = uploadingSession({
    bytesTransferred: 8,
    lastActivityAt: "2026-05-04T09:02:00Z",
    resumeAttemptCount: 2,
    resumeSuccessCount: 2,
    surfaceClass: "MOBILE",
  });
  const browserPre = uploadingSession({
    bytesTransferred: 8,
    lastActivityAt: "2026-05-04T09:02:00Z",
    resumeAttemptCount: 1,
    resumeSuccessCount: 1,
  });
  const browserPost = scanningSession("2026-05-04T09:03:00Z");
  const acceptedCurrent = acceptedAwaitingAttachment("2026-05-04T09:04:00Z");
  const staleAccepted = reconcileInflightRequestRebase({
    liveRequestVersionRef,
    now: "2026-05-04T09:05:00Z",
    session: acceptedCurrent,
  });
  const duplicatePost = uploadingSession({
    bytesTransferred: 4,
    lastActivityAt: "2026-05-04T09:01:30Z",
    resumeAttemptCount: 2,
    resumeSuccessCount: 1,
    retryCount: 1,
  });
  const scannerDelayPost = scanningSession("2026-05-04T09:03:30Z");
  const attachedPost = attachedSession({
    attachmentConfirmedAt: "2026-05-04T09:06:00Z",
    finalizedAt: "2026-05-04T09:04:00Z",
  });
  const crossDevicePost = uploadingSession({
    bytesTransferred: 8,
    lastActivityAt: "2026-05-04T09:02:30Z",
    resumeAttemptCount: 2,
    resumeSuccessCount: 2,
    surfaceClass: "MOBILE",
  });

  return [
    materializeUploadRecoveryCase({
      postSession: mobilePost,
      preSession: mobilePre,
      scenarioCode: "MOBILE_RECONNECT",
    }),
    materializeUploadRecoveryCase({
      postSession: browserPost,
      preSession: browserPre,
      scenarioCode: "BROWSER_RELOAD",
    }),
    materializeUploadRecoveryCase({
      postSession: staleAccepted,
      preSession: acceptedCurrent,
      scenarioCode: "STALE_REQUEST_REBASE",
    }),
    materializeUploadRecoveryCase({
      postSession: duplicatePost,
      preSession: mobilePre,
      scenarioCode: "DUPLICATE_ALLOCATION_RETRY",
    }),
    materializeUploadRecoveryCase({
      postSession: scannerDelayPost,
      preSession: browserPre,
      scenarioCode: "CHECKSUM_OR_SCANNER_DELAY",
    }),
    materializeUploadRecoveryCase({
      postSession: attachedPost,
      preSession: acceptedCurrent,
      scenarioCode: "ATTACHMENT_CONFIRMATION",
    }),
    materializeUploadRecoveryCase({
      postSession: crossDevicePost,
      preSession: mobilePre,
      scenarioCode: "CROSS_DEVICE_CONTINUATION",
    }),
  ];
}

export function buildUploadSessionRecoveryHarness(): UploadSessionRecoveryHarness {
  return assertUploadRecoveryInvariants({
    cases: buildCases(),
    completion_policy: "TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION",
    contract_version: "UPLOAD_SESSION_RECOVERY_HARNESS_V1",
    deterministic_seed: uploadSessionRecoveryHarnessDeterministicSeed,
    duplicate_policy: "NO_DUPLICATE_SESSION_OR_STORAGE_REF_ON_RETRY_OR_CROSS_DEVICE_RESUME",
    harness_id: "upload-session-recovery-harness.pc-0182.v1",
    identity_policy: "FROZEN_TENANT_CLIENT_REQUEST_AND_VERSION_SCOPE",
    rebase_policy: "LIVE_REQUEST_VERSION_MAY_ADVANCE_FROZEN_VERSION_MAY_NOT",
    recovery_action_policy: "NEXT_ACTION_AND_RESUMABILITY_STATE_GOVERN_ALL_RECOVERY",
    resume_policy: "RESUME_EXISTING_SESSION_AND_STORAGE_REF_ONLY",
    run_mode: "DETERMINISTIC_SESSION_RECOVERY_ENUMERATION",
    suite_profile: "RESUMABLE_UPLOAD_RECONNECT_REBASE_AND_DUPLICATE_MATRIX",
  });
}
