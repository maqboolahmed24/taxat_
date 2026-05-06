import { expect, test } from "@playwright/test";

import {
  computeChunkChecksum,
  finalizeUploadChecksum,
} from "../../../packages/domain-kernel/src/uploads/chunk_checksum.ts";
import {
  allocateUploadTransferSession,
  appendUploadTransferChunk,
  closeUploadTransfer,
  confirmUploadAttachment,
  createUploadRecoveryHarnessCase,
  createUploadSessionRecoveryHarness,
  projectUploadRequestRecoverySnapshot,
  recordUploadMalwareScanVerdict,
  recordUploadValidationOutcome,
  rebaseUploadRequestBinding,
  refreshUploadCompletionBoundary,
} from "../../../packages/domain-kernel/src/uploads/upload_transfer_service.ts";
import type { UploadTransferAggregate } from "../../../packages/domain-kernel/src/uploads/upload_transfer_service.ts";

const encoder = new TextEncoder();
const scenarioCodes = [
  "MOBILE_RECONNECT",
  "BROWSER_RELOAD",
  "STALE_REQUEST_REBASE",
  "DUPLICATE_ALLOCATION_RETRY",
  "CHECKSUM_OR_SCANNER_DELAY",
  "ATTACHMENT_CONFIRMATION",
  "CROSS_DEVICE_CONTINUATION",
] as const;

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

async function allocateFixture(uploadSessionId: string, storageRef: string) {
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
    clientId: "client.taxat-upload-int",
    filename: "evidence.pdf",
    initiatedBy: "client-portal",
    manifestIdOrNull: null,
    mediaType: "application/pdf",
    now: "2026-04-23T10:00:00Z",
    requestId: "request-upload-int",
    requestIdentityRef: "request.identity.client-doc.int",
    requestVersionRef: "request-version.client-doc.int.v1",
    storageRef,
    surfaceClass: "DESKTOP",
    tenantId: "tenant.taxat-sandbox",
    uploadSessionId,
  });
  return { aggregate, chunks, digests };
}

async function appendAllBytes(
  aggregate: UploadTransferAggregate,
  chunks: Uint8Array[],
  digests: Array<{ algorithmRef: string; byteLength: number; digest: string }>,
) {
  let current = aggregate;
  for (const [index, chunk] of chunks.entries()) {
    current = await appendUploadTransferChunk(current, {
      chunkBytes: chunk,
      expectedChunkDigestOrNull: digests[index].digest,
      now: `2026-04-23T10:0${index + 1}:00Z`,
      offset: index * 4,
    });
  }
  return current;
}

test("deterministic upload recovery harness covers reconnect, stale rebase, duplicate retry, delay, attachment, and cross-device continuation", async () => {
  const { aggregate, chunks, digests } = await allocateFixture(
    "upload-session-2026-04-23-integration",
    "storage.upload-staging.upload-session-2026-04-23-integration",
  );

  const oneChunk = await appendUploadTransferChunk(aggregate, {
    chunkBytes: chunks[0],
    expectedChunkDigestOrNull: digests[0].digest,
    now: "2026-04-23T10:01:00Z",
    offset: 0,
  });

  const fullyTransferred = await appendAllBytes(aggregate, chunks, digests);
  const closed = await closeUploadTransfer(fullyTransferred, {
    now: "2026-04-23T10:04:00Z",
  });
  const scanned = await recordUploadMalwareScanVerdict(closed, {
    clean: true,
    now: "2026-04-23T10:05:00Z",
  });
  const accepted = await recordUploadValidationOutcome(scanned, {
    now: "2026-04-23T10:06:00Z",
    outcome: "ACCEPTED",
  });
  const acceptedPendingAttachment = await refreshUploadCompletionBoundary(accepted, {
    now: "2026-04-23T10:06:30Z",
  });
  const attached = await confirmUploadAttachment(acceptedPendingAttachment, {
    attachedDocumentRef: "artifact.document.client-doc.int.current",
    now: "2026-04-23T10:07:00Z",
  });
  const staleAccepted = await rebaseUploadRequestBinding(acceptedPendingAttachment, {
    liveRequestVersionRef: "request-version.client-doc.int.v2",
    now: "2026-04-23T10:07:30Z",
  });

  const cases = await Promise.all([
    createUploadRecoveryHarnessCase({
      entrySurfaceClass: "MOBILE",
      postSession: oneChunk.session,
      preSession: oneChunk.session,
      resumeSurfaceClass: "MOBILE",
      scenarioCode: "MOBILE_RECONNECT",
    }),
    createUploadRecoveryHarnessCase({
      entrySurfaceClass: "DESKTOP",
      postSession: oneChunk.session,
      preSession: oneChunk.session,
      resumeSurfaceClass: "DESKTOP",
      scenarioCode: "BROWSER_RELOAD",
    }),
    createUploadRecoveryHarnessCase({
      entrySurfaceClass: "DESKTOP",
      postSession: staleAccepted.session,
      preSession: acceptedPendingAttachment.session,
      resumeSurfaceClass: "DESKTOP",
      scenarioCode: "STALE_REQUEST_REBASE",
    }),
    createUploadRecoveryHarnessCase({
      entrySurfaceClass: "DESKTOP",
      postSession: oneChunk.session,
      preSession: oneChunk.session,
      resumeSurfaceClass: "DESKTOP",
      scenarioCode: "DUPLICATE_ALLOCATION_RETRY",
    }),
    createUploadRecoveryHarnessCase({
      entrySurfaceClass: "DESKTOP",
      postSession: closed.session,
      preSession: closed.session,
      resumeSurfaceClass: "DESKTOP",
      scenarioCode: "CHECKSUM_OR_SCANNER_DELAY",
    }),
    createUploadRecoveryHarnessCase({
      entrySurfaceClass: "DESKTOP",
      postSession: attached.session,
      preSession: acceptedPendingAttachment.session,
      resumeSurfaceClass: "DESKTOP",
      scenarioCode: "ATTACHMENT_CONFIRMATION",
    }),
    createUploadRecoveryHarnessCase({
      entrySurfaceClass: "MOBILE",
      postSession: oneChunk.session,
      preSession: oneChunk.session,
      resumeSurfaceClass: "DESKTOP",
      scenarioCode: "CROSS_DEVICE_CONTINUATION",
    }),
  ]);

  const harness = await createUploadSessionRecoveryHarness({ cases });

  expect(harness.cases.map((entry) => entry.scenario_code)).toEqual(scenarioCodes);
  expect(harness.cases.every((entry) => entry.duplicate_session_created === false)).toBe(true);
  expect(harness.cases.every((entry) => entry.duplicate_storage_ref_created === false)).toBe(true);
  expect(
    harness.cases.every(
      (entry) =>
        entry.pre_session.upload_session_id === entry.post_session.upload_session_id &&
        entry.pre_session.storage_ref === entry.post_session.storage_ref,
    ),
  ).toBe(true);
  expect(
    harness.cases.every(
      (entry) =>
        entry.post_request_projection.request_version_ref === entry.post_session.live_request_version_ref,
    ),
  ).toBe(true);

  const staleProjection = await projectUploadRequestRecoverySnapshot(staleAccepted.session);
  expect(staleProjection.current_request_upload_ref_or_null).toBeNull();

  const attachmentCase = harness.cases.find(
    (entry) => entry.scenario_code === "ATTACHMENT_CONFIRMATION",
  );
  expect(attachmentCase?.expected_request_completion_state).toBe("READY_CURRENT_REQUEST_SATISFIED");

  const scannerDelayCase = harness.cases.find(
    (entry) => entry.scenario_code === "CHECKSUM_OR_SCANNER_DELAY",
  );
  expect(scannerDelayCase?.expected_request_completion_state).toBe(
    "NOT_READY_SCAN_OR_VALIDATION_PENDING",
  );
});
