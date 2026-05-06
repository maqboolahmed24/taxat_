import { expect, test } from "@playwright/test";

import {
  allocateUploadSession,
  assertAllocationRequestVersionIsCurrent,
  assertUploadRequestBindingContract,
  buildUploadRequestBindingContract,
  ClientUploadSessionRepository,
  transitionClientUploadSessionState,
  UploadRequestBindingContractError,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  uploadAllocationBody,
  uploadFixedNow,
  uploadRequestVersionV2,
} from "./upload_session_fixtures.ts";

test("request binding contract freezes allocation scope and publishes rebase posture", () => {
  const contract = buildUploadRequestBindingContract({
    clientId: "client.taxat-upload",
    frozenRequestVersionRef: "request-version.bank-statement.v1",
    liveRequestVersionRef: "request-version.bank-statement.v2",
    now: uploadFixedNow.toISOString(),
    requestId: "request.upload.bank-statement",
    requestIdentityRef: "request.upload.bank-statement",
    tenantId: "tenant.taxat-upload",
  });

  expect(contract.frozen_request_version_ref).toBe("request-version.bank-statement.v1");
  expect(contract.live_request_version_ref).toBe("request-version.bank-statement.v2");
  expect(contract.request_identity_ref).toBe("request.upload.bank-statement");
  expect(contract.frozen_binding_scope_hash).toBe(
    "tenant.taxat-upload|client.taxat-upload|request.upload.bank-statement|request-version.bank-statement.v1",
  );
  expect(contract.request_binding_state).toBe("RECONFIRMATION_REQUIRED");
  expect(contract.binding_resolution_basis).toBe("ACTIVE_REQUEST_REBASE_PENDING_CONFIRMATION");
  assertUploadRequestBindingContract(contract);
});

test("new allocations fail closed when caller supplies a stale live request version", () => {
  expect(() =>
    assertAllocationRequestVersionIsCurrent({
      frozenRequestVersionRef: "request-version.bank-statement.v1",
      liveRequestVersionRef: "request-version.bank-statement.v2",
    }),
  ).toThrow(UploadRequestBindingContractError);
});

test("in-flight rebase preserves frozen request identity and storage lineage", async () => {
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
  const rebased = await transitionClientUploadSessionState({
    aggregate: allocated.stored.aggregate,
    transition: {
      kind: "REBASE",
      liveRequestVersionRef: uploadRequestVersionV2,
      now: "2026-05-04T09:01:00Z",
    },
  });

  expect(rebased.session.upload_session_id).toBe(
    allocated.stored.aggregate.session.upload_session_id,
  );
  expect(rebased.session.storage_ref).toBe(allocated.stored.aggregate.session.storage_ref);
  expect(rebased.session.request_version_ref).toBe(allocation.request_version_ref);
  expect(rebased.session.upload_request_binding_contract.live_request_version_ref).toBe(
    uploadRequestVersionV2,
  );
  expect(rebased.session.request_binding_state).toBe("RECONFIRMATION_REQUIRED");
});
