import { expect, test } from "@playwright/test";

import {
  computeChunkChecksum,
  finalizeUploadChecksum,
} from "../../../packages/domain-kernel/src/uploads/chunk_checksum.ts";
import {
  assessUploadCompletionBoundary,
} from "../../../packages/domain-kernel/src/uploads/upload_completion_boundary.ts";
import {
  appendVerifiedChunk,
  createResumableOffsetTracker,
  markChunkVerificationFailed,
  queryResumeOffset,
} from "../../../packages/domain-kernel/src/uploads/resumable_offset_tracker.ts";
import { assessUploadResume } from "../../../packages/domain-kernel/src/uploads/upload_transfer_resume.ts";
import {
  allocateUploadTransferSession,
  appendUploadTransferChunk,
  closeUploadTransfer,
  confirmUploadAttachment,
  recordUploadMalwareScanVerdict,
  recordUploadValidationOutcome,
  rebaseUploadRequestBinding,
  refreshUploadCompletionBoundary,
} from "../../../packages/domain-kernel/src/uploads/upload_transfer_service.ts";

const encoder = new TextEncoder();

async function checksumForChunks(chunks: Uint8Array[]) {
  const digests = await Promise.all(
    chunks.map((chunkBytes) =>
      computeChunkChecksum({
        algorithmRef: "SHA256_CHUNK_HEX_V1",
        chunkBytes,
      }),
    ),
  );
  return {
    digests,
    checksum: await finalizeUploadChecksum({
      algorithmRef: "SHA256_CHUNK_HEX_V1",
      byteCount: chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0),
      orderedChunkDigests: digests.map((entry) => entry.digest),
    }),
  };
}

async function allocateFixture() {
  const chunks = [
    encoder.encode("ABCD"),
    encoder.encode("EFGH"),
    encoder.encode("IJKL"),
  ];
  const { checksum, digests } = await checksumForChunks(chunks);
  const aggregate = await allocateUploadTransferSession({
    byteCount: 12,
    captureMode: "BROWSE",
    checksum,
    checksumAlgorithmRef: "SHA256_CHUNK_HEX_V1",
    chunkSizeBytes: 4,
    clientId: "client.taxat-upload-072",
    filename: "evidence.pdf",
    initiatedBy: "client-portal",
    manifestIdOrNull: null,
    mediaType: "application/pdf",
    now: "2026-04-23T09:00:00Z",
    requestId: "request-upload-072",
    requestIdentityRef: "request.identity.client-doc.072",
    requestVersionRef: "request-version.client-doc.072.v1",
    storageRef: "storage.upload-staging.upload-session-2026-04-23-072",
    surfaceClass: "DESKTOP",
    tenantId: "tenant.taxat-sandbox",
    uploadSessionId: "upload-session-2026-04-23-072",
  });

  return { aggregate, chunks, digests };
}

test("chunk checksum verification and transfer close preserve duplicate-safe resumable semantics", async () => {
  const { aggregate, chunks, digests } = await allocateFixture();

  const first = await appendUploadTransferChunk(aggregate, {
    chunkBytes: chunks[0],
    expectedChunkDigestOrNull: digests[0].digest,
    now: "2026-04-23T09:01:00Z",
    offset: 0,
  });
  expect(first.session.bytes_transferred).toBe(4);
  expect(first.session.transfer_state).toBe("UPLOADING");

  const duplicate = await appendUploadTransferChunk(first, {
    chunkBytes: chunks[0],
    expectedChunkDigestOrNull: digests[0].digest,
    now: "2026-04-23T09:01:30Z",
    offset: 0,
  });
  expect(duplicate.session.bytes_transferred).toBe(4);

  let complete = duplicate;
  for (const [index, chunk] of chunks.slice(1).entries()) {
    complete = await appendUploadTransferChunk(complete, {
      chunkBytes: chunk,
      expectedChunkDigestOrNull: digests[index + 1].digest,
      now: "2026-04-23T09:02:00Z",
      offset: (index + 1) * 4,
    });
  }

  const closed = await closeUploadTransfer(complete, {
    now: "2026-04-23T09:03:00Z",
  });
  expect(closed.session.integrity_state).toBe("VERIFIED");
  expect(closed.session.transfer_state).toBe("SCANNING");
  expect(closed.session.resumability_state).toBe("CLOSED");
});

test("offset tracking forbids gaps and preserves failed chunk retry posture", () => {
  const tracker = createResumableOffsetTracker({
    byteCount: 12,
    chunkSizeBytes: 4,
    storageRef: "storage.upload-staging.upload-session-2026-04-23-gap",
    uploadSessionId: "upload-session-2026-04-23-gap",
  });
  const first = appendVerifiedChunk(tracker, {
    checksumDigest: "digest-0",
    offset: 0,
    suppliedByteLength: 4,
  }).nextTracker;

  expect(() =>
    appendVerifiedChunk(first, {
      checksumDigest: "digest-2",
      offset: 8,
      suppliedByteLength: 4,
    }),
  ).toThrow(/UPLOAD_TRACKER_GAP_FORBIDDEN/);

  const failed = markChunkVerificationFailed(first, {
    failureCode: "CHECKSUM_MISMATCH",
    offset: 4,
  });
  const resume = queryResumeOffset(failed);
  expect(resume.resumeOffset).toBe(4);
  expect(resume.remainingBytes).toBe(8);
});

test("resume assessment keeps the same session and storage ref through in-flight request rebase", async () => {
  const { aggregate, chunks, digests } = await allocateFixture();
  const midTransfer = await appendUploadTransferChunk(aggregate, {
    chunkBytes: chunks[0],
    expectedChunkDigestOrNull: digests[0].digest,
    now: "2026-04-23T09:01:00Z",
    offset: 0,
  });
  const rebased = await rebaseUploadRequestBinding(midTransfer, {
    liveRequestVersionRef: "request-version.client-doc.072.v2",
    now: "2026-04-23T09:01:30Z",
  });

  const assessment = await assessUploadResume({
    liveRequestVersionRef: "request-version.client-doc.072.v2",
    now: "2026-04-23T09:02:00Z",
    session: rebased.session,
    surfaceClass: "DESKTOP",
    tracker: rebased.offsetTracker,
  });

  expect(assessment.allowed).toBe(true);
  expect(assessment.requestBindingState).toBe("RECONFIRMATION_REQUIRED");
  expect(assessment.recoveryPosture).toBe("RECONFIRM_INLINE");
  expect(assessment.stableStorageRef).toBe(rebased.session.storage_ref);
  expect(assessment.uploadSessionId).toBe(rebased.session.upload_session_id);
});

test("completion boundary keeps attachment confirmation and stale reconfirmation distinct from transfer success", async () => {
  const { aggregate, chunks, digests } = await allocateFixture();

  let settled = aggregate;
  for (const [index, chunk] of chunks.entries()) {
    settled = await appendUploadTransferChunk(settled, {
      chunkBytes: chunk,
      expectedChunkDigestOrNull: digests[index].digest,
      now: `2026-04-23T09:0${index + 1}:00Z`,
      offset: index * 4,
    });
  }
  settled = await closeUploadTransfer(settled, { now: "2026-04-23T09:04:00Z" });
  settled = await recordUploadMalwareScanVerdict(settled, {
    clean: true,
    now: "2026-04-23T09:05:00Z",
  });
  settled = await recordUploadValidationOutcome(settled, {
    now: "2026-04-23T09:06:00Z",
    outcome: "ACCEPTED",
  });
  settled = await refreshUploadCompletionBoundary(settled, {
    now: "2026-04-23T09:06:30Z",
  });

  const pendingAttachment = await assessUploadCompletionBoundary(settled.session);
  expect(pendingAttachment.completionState).toBe("NOT_READY_ATTACHMENT_CONFIRMATION_PENDING");
  expect(pendingAttachment.nextActionCode).toBe("CONFIRM_ATTACHMENT");

  const attached = await confirmUploadAttachment(settled, {
    attachedDocumentRef: "artifact.document.client-doc.072.current",
    now: "2026-04-23T09:07:00Z",
  });
  const attachedBoundary = await assessUploadCompletionBoundary(attached.session);
  expect(attachedBoundary.completionState).toBe("READY_CURRENT_REQUEST_SATISFIED");
  expect(attachedBoundary.nextActionCode).toBe("NONE");

  const staleAccepted = await rebaseUploadRequestBinding(settled, {
    liveRequestVersionRef: "request-version.client-doc.072.v2",
    now: "2026-04-23T09:07:30Z",
  });
  const staleBoundary = await assessUploadCompletionBoundary(staleAccepted.session);
  expect(staleBoundary.completionState).toBe("NOT_READY_STALE_RECONFIRM_REQUIRED");
  expect(staleBoundary.nextActionCode).toBe("RECONFIRM_REQUEST");
  expect(staleBoundary.attachmentState).toBe("REBIND_REQUIRED");
});
