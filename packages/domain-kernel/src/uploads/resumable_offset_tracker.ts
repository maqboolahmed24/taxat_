import { assertReferenceFamily } from "../references/reference_key.ts";

export type UploadChunkVerificationState = "FAILED" | "PENDING" | "VERIFIED";

export type UploadChunkWindow = {
  byteLength: number;
  checksumDigestOrNull: string | null;
  chunkIndex: number;
  endOffsetInclusive: number;
  lastFailureCodeOrNull: string | null;
  startOffset: number;
  verificationState: UploadChunkVerificationState;
};

export type ResumableOffsetTracker = {
  byteCount: number;
  chunkSizeBytes: number;
  chunks: UploadChunkWindow[];
  contiguousBytesTransferred: number;
  contract_version: "UPLOAD_RESUMABLE_OFFSET_TRACKER_V1";
  storageRef: string;
  transferClosed: boolean;
  uploadSessionId: string;
};

export type ResumeOffsetSnapshot = {
  contiguousBytesTransferred: number;
  isComplete: boolean;
  remainingBytes: number;
  resumeOffset: number;
  resumeWindowOrNull: UploadChunkWindow | null;
};

type ResumableOffsetTrackerErrorCode =
  | "UPLOAD_TRACKER_ALREADY_CLOSED"
  | "UPLOAD_TRACKER_ALREADY_WRITTEN_WITH_DIFFERENT_DIGEST"
  | "UPLOAD_TRACKER_BYTE_LENGTH_MISMATCH"
  | "UPLOAD_TRACKER_GAP_FORBIDDEN"
  | "UPLOAD_TRACKER_INVALID_CHUNK_SIZE"
  | "UPLOAD_TRACKER_INVALID_OFFSET"
  | "UPLOAD_TRACKER_TRANSFER_INCOMPLETE";

type ResumableOffsetTrackerErrorInit = {
  code: ResumableOffsetTrackerErrorCode;
  detail: string;
};

export class ResumableOffsetTrackerError extends Error {
  readonly code: ResumableOffsetTrackerErrorCode;

  constructor(init: ResumableOffsetTrackerErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "ResumableOffsetTrackerError";
    this.code = init.code;
  }
}

function assertCondition(
  condition: unknown,
  init: ResumableOffsetTrackerErrorInit,
): asserts condition {
  if (!condition) {
    throw new ResumableOffsetTrackerError(init);
  }
}

function buildChunkWindows(byteCount: number, chunkSizeBytes: number) {
  const chunks: UploadChunkWindow[] = [];
  let startOffset = 0;
  let chunkIndex = 0;

  while (startOffset < byteCount) {
    const remaining = byteCount - startOffset;
    const byteLength = Math.min(chunkSizeBytes, remaining);
    chunks.push({
      byteLength,
      checksumDigestOrNull: null,
      chunkIndex,
      endOffsetInclusive: startOffset + byteLength - 1,
      lastFailureCodeOrNull: null,
      startOffset,
      verificationState: "PENDING",
    });
    chunkIndex += 1;
    startOffset += byteLength;
  }

  return chunks;
}

function contiguousBytes(chunks: readonly UploadChunkWindow[]) {
  let contiguous = 0;
  for (const chunk of chunks) {
    if (chunk.verificationState !== "VERIFIED") {
      break;
    }
    contiguous = chunk.endOffsetInclusive + 1;
  }
  return contiguous;
}

export function createResumableOffsetTracker(input: {
  byteCount: number;
  chunkSizeBytes: number;
  storageRef: string;
  uploadSessionId: string;
}) {
  assertReferenceFamily("upload_session_id", "IDENTITY", input.uploadSessionId);
  assertReferenceFamily("storage_ref", "STORAGE_REF", input.storageRef);
  assertCondition(Number.isInteger(input.byteCount) && input.byteCount > 0, {
    code: "UPLOAD_TRACKER_INVALID_CHUNK_SIZE",
    detail: "byteCount must be a positive integer",
  });
  assertCondition(Number.isInteger(input.chunkSizeBytes) && input.chunkSizeBytes > 0, {
    code: "UPLOAD_TRACKER_INVALID_CHUNK_SIZE",
    detail: "chunkSizeBytes must be a positive integer",
  });

  return {
    byteCount: input.byteCount,
    chunkSizeBytes: input.chunkSizeBytes,
    chunks: buildChunkWindows(input.byteCount, input.chunkSizeBytes),
    contiguousBytesTransferred: 0,
    contract_version: "UPLOAD_RESUMABLE_OFFSET_TRACKER_V1",
    storageRef: input.storageRef,
    transferClosed: false,
    uploadSessionId: input.uploadSessionId,
  } satisfies ResumableOffsetTracker;
}

export function queryResumeOffset(tracker: ResumableOffsetTracker) {
  const resumeOffset = contiguousBytes(tracker.chunks);
  const resumeWindowOrNull =
    tracker.chunks.find((chunk) => chunk.startOffset === resumeOffset) ?? null;
  return {
    contiguousBytesTransferred: resumeOffset,
    isComplete: resumeOffset >= tracker.byteCount,
    remainingBytes: Math.max(0, tracker.byteCount - resumeOffset),
    resumeOffset,
    resumeWindowOrNull,
  } satisfies ResumeOffsetSnapshot;
}

export function appendVerifiedChunk(
  tracker: ResumableOffsetTracker,
  input: {
    checksumDigest: string;
    offset: number;
    suppliedByteLength: number;
  },
) {
  assertCondition(!tracker.transferClosed, {
    code: "UPLOAD_TRACKER_ALREADY_CLOSED",
    detail: "cannot append chunks after the tracker is closed",
  });

  const chunk = tracker.chunks.find((entry) => entry.startOffset === input.offset);
  assertCondition(chunk !== undefined, {
    code: "UPLOAD_TRACKER_INVALID_OFFSET",
    detail: `no upload chunk begins at offset ${input.offset}`,
  });
  assertCondition(chunk.byteLength === input.suppliedByteLength, {
    code: "UPLOAD_TRACKER_BYTE_LENGTH_MISMATCH",
    detail: `offset ${input.offset} expects ${chunk.byteLength} bytes not ${input.suppliedByteLength}`,
  });

  const expectedOffset = queryResumeOffset(tracker).resumeOffset;
  const duplicateReplay = chunk.verificationState === "VERIFIED" && input.offset < expectedOffset;
  assertCondition(duplicateReplay || input.offset === expectedOffset, {
    code: "UPLOAD_TRACKER_GAP_FORBIDDEN",
    detail: `offset ${input.offset} must match the contiguous resume offset ${expectedOffset}`,
  });

  if (chunk.verificationState === "VERIFIED") {
    assertCondition(chunk.checksumDigestOrNull === input.checksumDigest, {
      code: "UPLOAD_TRACKER_ALREADY_WRITTEN_WITH_DIFFERENT_DIGEST",
      detail: `offset ${input.offset} already carries a different verified digest`,
    });
    return {
      decision: "ACK_DUPLICATE" as const,
      nextTracker: tracker,
    };
  }

  const nextChunks = tracker.chunks.map((entry) =>
    entry.chunkIndex === chunk.chunkIndex
      ? {
          ...entry,
          checksumDigestOrNull: input.checksumDigest,
          lastFailureCodeOrNull: null,
          verificationState: "VERIFIED" as const,
        }
      : entry,
  );

  return {
    decision: "APPEND_ACCEPTED" as const,
    nextTracker: {
      ...tracker,
      chunks: nextChunks,
      contiguousBytesTransferred: contiguousBytes(nextChunks),
    } satisfies ResumableOffsetTracker,
  };
}

export function markChunkVerificationFailed(
  tracker: ResumableOffsetTracker,
  input: {
    failureCode: string;
    offset: number;
  },
) {
  const chunk = tracker.chunks.find((entry) => entry.startOffset === input.offset);
  assertCondition(chunk !== undefined, {
    code: "UPLOAD_TRACKER_INVALID_OFFSET",
    detail: `no upload chunk begins at offset ${input.offset}`,
  });

  return {
    ...tracker,
    chunks: tracker.chunks.map((entry) =>
      entry.chunkIndex === chunk.chunkIndex
        ? {
            ...entry,
            checksumDigestOrNull: null,
            lastFailureCodeOrNull: input.failureCode,
            verificationState: "FAILED" as const,
          }
        : entry,
    ),
  } satisfies ResumableOffsetTracker;
}

export function closeResumableOffsetTracker(tracker: ResumableOffsetTracker) {
  const snapshot = queryResumeOffset(tracker);
  assertCondition(snapshot.isComplete, {
    code: "UPLOAD_TRACKER_TRANSFER_INCOMPLETE",
    detail: "cannot close upload transfer before all chunk windows verify",
  });
  return {
    ...tracker,
    contiguousBytesTransferred: tracker.byteCount,
    transferClosed: true,
  } satisfies ResumableOffsetTracker;
}
