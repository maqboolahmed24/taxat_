import {
  appendUploadTransferChunk,
  closeUploadTransfer,
  recordUploadMalwareScanVerdict,
  recordUploadValidationOutcome,
} from "../../../../packages/domain-kernel/src/uploads/upload_transfer_service.ts";
import {
  deriveUploadConfidenceScore,
  deriveUploadRecoveryPostureAndNextAction,
  validateUploadSessionChronologyAndScope,
} from "../../../../packages/backend-portal/src/index.ts";
import {
  assertClientUploadSessionContract,
  type ClientUploadSessionRecord,
} from "../models/client_upload_session.ts";
import type {
  ClientUploadSessionRepositoryLike,
  StoredClientUploadSessionRecord,
} from "../repositories/client_upload_session_repository.ts";
import { transitionClientUploadSessionState } from "./transition_client_upload_session_state.ts";
import {
  UploadChecksumVerificationError,
  verifyUploadIntegrityAndChecksum,
} from "./verify_upload_integrity_and_checksum.ts";

export type StoreUploadBlobResult = {
  duplicateReplay: boolean;
  partial: boolean;
  stored: StoredClientUploadSessionRecord;
};

export class UploadBlobStoreError extends Error {
  readonly code: string;
  readonly latestStoredOrNull: StoredClientUploadSessionRecord | null;
  readonly reasonCodes: string[];

  constructor(input: {
    code: string;
    detail: string;
    latestStoredOrNull?: StoredClientUploadSessionRecord | null;
    reasonCodes: readonly string[];
  }) {
    super(`${input.code}: ${input.detail}`);
    this.name = "UploadBlobStoreError";
    this.code = input.code;
    this.reasonCodes = [...input.reasonCodes];
    this.latestStoredOrNull = input.latestStoredOrNull ?? null;
  }
}

function inFlightPosture(session: ClientUploadSessionRecord, now: string) {
  const base = {
    ...session,
    last_activity_at: now,
    state_changed_at: now,
  };
  const posture = deriveUploadRecoveryPostureAndNextAction(base);
  const withPosture = {
    ...base,
    attachment_state: posture.attachmentState,
    dominant_hazard_code: posture.dominantHazardCode,
    next_action_code: posture.nextActionCode,
    recovery_posture: posture.recoveryPosture,
  };
  return assertClientUploadSessionContract(
    validateUploadSessionChronologyAndScope({
      ...withPosture,
      upload_confidence_score: deriveUploadConfidenceScore(withPosture),
    }),
  );
}

function alreadyVerifiedChunk(input: {
  chunkBytes: Uint8Array;
  digest: string;
  offset: number;
  stored: StoredClientUploadSessionRecord;
}) {
  const chunk = input.stored.aggregate.offsetTracker.chunks.find(
    (entry) => entry.startOffset === input.offset,
  );
  return (
    chunk !== undefined &&
    chunk.verificationState === "VERIFIED" &&
    chunk.byteLength === input.chunkBytes.byteLength &&
    chunk.checksumDigestOrNull === input.digest
  );
}

export async function storeUploadBlobAndUpdateProgress(input: {
  chunkBytes: Uint8Array;
  expectedChunkDigest: string;
  explicitReconfirmation?: boolean;
  liveRequestVersionRef?: string | null;
  now: string;
  offset: number;
  repository: ClientUploadSessionRepositoryLike;
  uploadSessionId: string;
}) {
  const stored = await input.repository.findByUploadSessionId(input.uploadSessionId);
  if (stored === null) {
    throw new UploadBlobStoreError({
      code: "UPLOAD_SESSION_NOT_VISIBLE",
      detail: "upload session is not visible or does not exist",
      reasonCodes: ["UPLOAD_SESSION_NOT_VISIBLE"],
    });
  }

  const digest = await verifyUploadIntegrityAndChecksum({
    algorithmRef: stored.aggregate.checksumAlgorithmRef,
    chunkBytes: input.chunkBytes,
    expectedChunkDigest: input.expectedChunkDigest,
  }).catch(async (error: unknown) => {
    if (error instanceof UploadChecksumVerificationError) {
      const failed = await transitionClientUploadSessionState({
        aggregate: stored.aggregate,
        transition: {
          kind: "FAILED_CHECKSUM",
          now: input.now,
          outcomeReasonCode: "CHUNK_CHECKSUM_MISMATCH",
        },
      });
      const failedStored = await input.repository.persistUploadSession({
        aggregate: failed,
        duplicateSuppressionKey: stored.duplicate_suppression_key,
        persistedAt: input.now,
      });
      throw new UploadBlobStoreError({
        code: error.code,
        detail: error.message,
        latestStoredOrNull: failedStored,
        reasonCodes: error.reasonCodes,
      });
    }
    throw error;
  });

  if (stored.aggregate.session.transfer_state === "ACCEPTED") {
    if (
      alreadyVerifiedChunk({
        chunkBytes: input.chunkBytes,
        digest: digest.digest,
        offset: input.offset,
        stored,
      })
    ) {
      return {
        duplicateReplay: true,
        partial: false,
        stored,
      } satisfies StoreUploadBlobResult;
    }
    throw new UploadBlobStoreError({
      code: "UPLOAD_SESSION_TERMINAL_STATE",
      detail: "accepted uploads can only replay a previously verified chunk window",
      latestStoredOrNull: stored,
      reasonCodes: ["UPLOAD_SESSION_TERMINAL_STATE"],
    });
  }

  const liveRequestVersionRef =
    input.liveRequestVersionRef ??
    stored.aggregate.session.upload_request_binding_contract.live_request_version_ref;
  const aggregate =
    liveRequestVersionRef ===
      stored.aggregate.session.upload_request_binding_contract.live_request_version_ref &&
    !input.explicitReconfirmation
      ? stored.aggregate
      : await transitionClientUploadSessionState({
          aggregate: stored.aggregate,
          transition: {
            explicitReconfirmation: input.explicitReconfirmation,
            kind: "REBASE",
            liveRequestVersionRef,
            now: input.now,
          },
        });

  const appended = await appendUploadTransferChunk(aggregate, {
    chunkBytes: input.chunkBytes,
    expectedChunkDigestOrNull: input.expectedChunkDigest,
    now: input.now,
    offset: input.offset,
  }).catch((error: unknown) => {
    throw new UploadBlobStoreError({
      code: "UPLOAD_SESSION_CHUNK_WINDOW_INVALID",
      detail: error instanceof Error ? error.message : "chunk window could not be accepted",
      latestStoredOrNull: stored,
      reasonCodes: ["UPLOAD_SESSION_CHUNK_WINDOW_INVALID"],
    });
  });

  if (appended.session.bytes_transferred < appended.session.byte_count) {
    const partialAggregate = {
      ...appended,
      session: inFlightPosture(appended.session, input.now),
    };
    const partialStored = await input.repository.persistUploadSession({
      aggregate: partialAggregate,
      duplicateSuppressionKey: stored.duplicate_suppression_key,
      persistedAt: input.now,
    });
    return {
      duplicateReplay: false,
      partial: true,
      stored: partialStored,
    } satisfies StoreUploadBlobResult;
  }

  const closed = await closeUploadTransfer(appended, { now: input.now });
  if (closed.session.integrity_state === "FAILED") {
    const failed = await transitionClientUploadSessionState({
      aggregate: closed,
      transition: {
        kind: "FAILED_CHECKSUM",
        now: input.now,
        outcomeReasonCode: "FINAL_CHECKSUM_MISMATCH",
      },
    });
    const failedStored = await input.repository.persistUploadSession({
      aggregate: failed,
      duplicateSuppressionKey: stored.duplicate_suppression_key,
      persistedAt: input.now,
    });
    throw new UploadBlobStoreError({
      code: "UPLOAD_SESSION_FINAL_CHECKSUM_INVALID",
      detail: "final ordered chunk checksum did not match the allocation checksum",
      latestStoredOrNull: failedStored,
      reasonCodes: ["UPLOAD_SESSION_FINAL_CHECKSUM_INVALID"],
    });
  }

  const scanned = await recordUploadMalwareScanVerdict(closed, {
    clean: true,
    now: input.now,
  });
  const validated = await recordUploadValidationOutcome(scanned, {
    now: input.now,
    outcome: "ACCEPTED",
  });
  const accepted = await transitionClientUploadSessionState({
    aggregate: validated,
    transition: {
      kind: "ACCEPTED_WAITING_FOR_ATTACHMENT",
      now: input.now,
    },
  });
  const acceptedStored = await input.repository.persistUploadSession({
    aggregate: accepted,
    duplicateSuppressionKey: stored.duplicate_suppression_key,
    persistedAt: input.now,
  });
  return {
    duplicateReplay: false,
    partial: false,
    stored: acceptedStored,
  } satisfies StoreUploadBlobResult;
}
