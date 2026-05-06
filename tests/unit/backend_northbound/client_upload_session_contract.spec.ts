import { expect, test } from "@playwright/test";

import {
  allocateUploadSession,
  assertClientUploadSessionContract,
  buildUploadBlobChecksumPlan,
  ClientUploadSessionContractError,
  ClientUploadSessionRepository,
  storeUploadBlobAndUpdateProgress,
  transitionClientUploadSessionState,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  uploadAllocationBody,
  uploadChunks,
  uploadFixedNow,
  uploadRequestVersionV2,
} from "./upload_session_fixtures.ts";

test("ClientUploadSession allocation exposes distinct resumability, binding, and attachment posture", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const allocated = await allocateUploadSession({
    allocation: {
      byteCount: allocation.byte_count,
      checksum: allocation.checksum,
      chunkSizeBytes: allocation.chunk_size_bytes,
      clientId: allocation.client_id,
      filename: allocation.filename,
      mediaType: allocation.media_type,
      now: uploadFixedNow.toISOString(),
      requestId: allocation.request_id,
      requestIdentityRef: allocation.request_identity_ref,
      requestVersionRef: allocation.request_version_ref,
      tenantId: allocation.tenant_id,
    },
    repository,
  });

  expect(allocated.created).toBe(true);
  const session = assertClientUploadSessionContract(allocated.stored.aggregate.session);
  expect(session.transfer_state).toBe("UPLOADING");
  expect(session.integrity_state).toBe("PENDING");
  expect(session.resumability_state).toBe("RESUMABLE");
  expect(session.attachment_state).toBe("STAGED");
  expect(session.request_binding_state).toBe("ORIGINAL_CURRENT");
  expect(session.upload_request_binding_contract.frozen_request_version_ref).toBe(
    allocation.request_version_ref,
  );
});

test("duplicate allocation reuses the same governed session and storage lineage", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const input = {
    byteCount: allocation.byte_count,
    checksum: allocation.checksum,
    chunkSizeBytes: allocation.chunk_size_bytes,
    clientId: allocation.client_id,
    filename: allocation.filename,
    mediaType: allocation.media_type,
    now: uploadFixedNow.toISOString(),
    requestId: allocation.request_id,
    requestIdentityRef: allocation.request_identity_ref,
    requestVersionRef: allocation.request_version_ref,
    tenantId: allocation.tenant_id,
  };

  const first = await allocateUploadSession({ allocation: input, repository });
  const second = await allocateUploadSession({ allocation: input, repository });

  expect(first.created).toBe(true);
  expect(second.created).toBe(false);
  expect(second.stored.aggregate.session.upload_session_id).toBe(
    first.stored.aggregate.session.upload_session_id,
  );
  expect(second.stored.aggregate.session.storage_ref).toBe(
    first.stored.aggregate.session.storage_ref,
  );
  expect(await repository.listUploadSessions()).toHaveLength(1);
});

test("accepted upload remains confirmation-required until explicit attachment confirmation", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const chunks = uploadChunks();
  const allocated = await allocateUploadSession({
    allocation: {
      byteCount: allocation.byte_count,
      checksum: allocation.checksum,
      chunkSizeBytes: allocation.chunk_size_bytes,
      clientId: allocation.client_id,
      filename: allocation.filename,
      mediaType: allocation.media_type,
      now: uploadFixedNow.toISOString(),
      requestId: allocation.request_id,
      requestIdentityRef: allocation.request_identity_ref,
      requestVersionRef: allocation.request_version_ref,
      tenantId: allocation.tenant_id,
    },
    repository,
  });
  let stored = allocated.stored;
  const checksumPlan = await buildUploadBlobChecksumPlan({ chunks });
  for (const [index, chunk] of chunks.entries()) {
    const result = await storeUploadBlobAndUpdateProgress({
      chunkBytes: chunk,
      expectedChunkDigest: checksumPlan.chunkDigests[index],
      now: `2026-05-04T09:0${index + 1}:00Z`,
      offset: index * 4,
      repository,
      uploadSessionId: stored.aggregate.session.upload_session_id,
    });
    stored = result.stored;
  }

  expect(stored.aggregate.session.transfer_state).toBe("ACCEPTED");
  expect(stored.aggregate.session.attachment_state).toBe("CONFIRMATION_REQUIRED");
  expect(stored.aggregate.session.next_action_code).toBe("CONFIRM_ATTACHMENT");

  const attached = await transitionClientUploadSessionState({
    aggregate: stored.aggregate,
    transition: {
      attachedDocumentRef: "artifact.document.bank-statement.current",
      kind: "CONFIRM_ATTACHMENT",
      now: "2026-05-04T09:05:00Z",
    },
  });
  expect(attached.session.attachment_state).toBe("ATTACHED");
  expect(attached.session.next_action_code).toBe("NONE");
  assertClientUploadSessionContract(attached.session);
});

test("contract validation rejects unsafe attached and backward chronology states", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const allocated = await allocateUploadSession({
    allocation: {
      byteCount: allocation.byte_count,
      checksum: allocation.checksum,
      chunkSizeBytes: allocation.chunk_size_bytes,
      clientId: allocation.client_id,
      filename: allocation.filename,
      mediaType: allocation.media_type,
      now: uploadFixedNow.toISOString(),
      requestId: allocation.request_id,
      requestIdentityRef: allocation.request_identity_ref,
      requestVersionRef: allocation.request_version_ref,
      tenantId: allocation.tenant_id,
    },
    repository,
  });

  expect(() =>
    assertClientUploadSessionContract({
      ...allocated.stored.aggregate.session,
      attachment_state: "ATTACHED",
      next_action_code: "NONE",
      recovery_posture: "NONE",
    }),
  ).toThrow(ClientUploadSessionContractError);

  expect(() =>
    assertClientUploadSessionContract({
      ...allocated.stored.aggregate.session,
      state_changed_at: "2026-05-04T08:00:00Z",
    }),
  ).toThrow(/state_changed_at/);
});

test("accepted stale bytes surface rebind-required instead of current-request satisfaction", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const chunks = uploadChunks();
  const checksumPlan = await buildUploadBlobChecksumPlan({ chunks });
  const allocated = await allocateUploadSession({
    allocation: {
      byteCount: allocation.byte_count,
      checksum: allocation.checksum,
      chunkSizeBytes: allocation.chunk_size_bytes,
      clientId: allocation.client_id,
      filename: allocation.filename,
      mediaType: allocation.media_type,
      now: uploadFixedNow.toISOString(),
      requestId: allocation.request_id,
      requestIdentityRef: allocation.request_identity_ref,
      requestVersionRef: allocation.request_version_ref,
      tenantId: allocation.tenant_id,
    },
    repository,
  });
  let stored = allocated.stored;
  for (const [index, chunk] of chunks.entries()) {
    const result = await storeUploadBlobAndUpdateProgress({
      chunkBytes: chunk,
      expectedChunkDigest: checksumPlan.chunkDigests[index],
      liveRequestVersionRef: index === chunks.length - 1 ? uploadRequestVersionV2 : undefined,
      now: `2026-05-04T09:0${index + 1}:00Z`,
      offset: index * 4,
      repository,
      uploadSessionId: stored.aggregate.session.upload_session_id,
    });
    stored = result.stored;
  }

  expect(stored.aggregate.session.request_binding_state).toBe("RECONFIRMATION_REQUIRED");
  expect(stored.aggregate.session.attachment_state).toBe("REBIND_REQUIRED");
  expect(stored.aggregate.session.next_action_code).toBe("RECONFIRM_REQUEST");
  expect(stored.aggregate.session.attached_document_ref).toBeNull();
  assertClientUploadSessionContract(stored.aggregate.session);
});
