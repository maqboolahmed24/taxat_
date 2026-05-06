import { expect, test } from "@playwright/test";

import {
  buildClientUploadSession,
  ClientUploadSessionProjectionError,
  deriveFrozenBindingScopeHash,
  deriveUploadRequestBindingContract,
  reconcileInflightRequestRebase,
  validateUploadSessionChronologyAndScope,
} from "../index.ts";

const now = "2026-05-04T09:00:00Z";

function baseUpload(overrides: Partial<Parameters<typeof buildClientUploadSession>[0]> = {}) {
  return buildClientUploadSession({
    byteCount: 12,
    checksum: "checksum.bank-statement",
    clientId: "client.taxat-upload",
    filename: "bank-statement.pdf",
    frozenRequestVersionRef: "request-version.bank-statement.v1",
    mediaType: "application/pdf",
    now,
    requestId: "request.upload.bank-statement",
    storageRef: "storage.upload-staging.session-1",
    tenantId: "tenant.taxat-upload",
    uploadSessionId: "upload-session.bank-statement.1",
    ...overrides,
  });
}

test("upload request binding freezes the validator-backed identity tuple", () => {
  const contract = deriveUploadRequestBindingContract({
    clientId: "client.taxat-upload",
    frozenRequestVersionRef: "request-version.bank-statement.v1",
    liveRequestVersionRef: "request-version.bank-statement.v1",
    now,
    requestId: "request.upload.bank-statement",
    tenantId: "tenant.taxat-upload",
  });

  expect(contract.request_identity_ref).toBe("request.upload.bank-statement");
  expect(contract.frozen_binding_scope_hash).toBe(
    "tenant.taxat-upload|client.taxat-upload|request.upload.bank-statement|request-version.bank-statement.v1",
  );
  expect(contract.frozen_binding_scope_hash).toBe(
    deriveFrozenBindingScopeHash({
      clientId: "client.taxat-upload",
      frozenRequestVersionRef: "request-version.bank-statement.v1",
      requestId: "request.upload.bank-statement",
      tenantId: "tenant.taxat-upload",
    }),
  );
});

test("upload request binding rejects weak request identity drift", () => {
  expect(() =>
    deriveUploadRequestBindingContract({
      clientId: "client.taxat-upload",
      frozenRequestVersionRef: "request-version.bank-statement.v1",
      now,
      requestId: "request.upload.bank-statement",
      requestIdentityRef: "request.identity.bank-statement",
      tenantId: "tenant.taxat-upload",
    }),
  ).toThrow(ClientUploadSessionProjectionError);
});

test("client upload session projection derives resumability, next action, and confidence", () => {
  const session = baseUpload();

  expect(session.request_binding_state).toBe("ORIGINAL_CURRENT");
  expect(session.request_version_ref).toBe("request-version.bank-statement.v1");
  expect(session.upload_request_binding_contract.live_request_version_ref).toBe(
    "request-version.bank-statement.v1",
  );
  expect(session.next_action_code).toBe("RESUME_UPLOAD");
  expect(session.recovery_posture).toBe("INLINE_RESUME");
  expect(session.dominant_hazard_code).toBe("UPLOAD_BYTES_NOT_YET_TRANSFERRED");
  expect(session.upload_confidence_score).toBeGreaterThan(0);
  validateUploadSessionChronologyAndScope(session);
});

test("in-flight request rebase preserves session and storage lineage without reconfirming early", () => {
  const session = baseUpload({
    bytesTransferred: 4,
    stateChangedAt: "2026-05-04T09:01:00Z",
  });
  const rebased = reconcileInflightRequestRebase({
    liveRequestVersionRef: "request-version.bank-statement.v2",
    now: "2026-05-04T09:02:00Z",
    session,
  });

  expect(rebased.upload_session_id).toBe(session.upload_session_id);
  expect(rebased.storage_ref).toBe(session.storage_ref);
  expect(rebased.request_version_ref).toBe("request-version.bank-statement.v1");
  expect(rebased.upload_request_binding_contract.live_request_version_ref).toBe(
    "request-version.bank-statement.v2",
  );
  expect(rebased.request_binding_state).toBe("RECONFIRMATION_REQUIRED");
  expect(rebased.attachment_state).toBe("STAGED");
  expect(rebased.next_action_code).toBe("RESUME_UPLOAD");
});

test("accepted stale bytes require explicit rebind before satisfying the request", () => {
  const accepted = baseUpload({
    bytesTransferred: 12,
    finalizedAt: "2026-05-04T09:03:00Z",
    lastActivityAt: "2026-05-04T09:03:00Z",
    scanCompletedAt: "2026-05-04T09:03:00Z",
    stateChangedAt: "2026-05-04T09:03:00Z",
    transferState: "ACCEPTED",
    validationCompletedAt: "2026-05-04T09:03:00Z",
  });
  const rebased = reconcileInflightRequestRebase({
    liveRequestVersionRef: "request-version.bank-statement.v2",
    now: "2026-05-04T09:04:00Z",
    session: accepted,
  });

  expect(rebased.attachment_state).toBe("REBIND_REQUIRED");
  expect(rebased.next_action_code).toBe("RECONFIRM_REQUEST");
  expect(rebased.recovery_posture).toBe("RECONFIRM_INLINE");
  expect(rebased.attached_document_ref).toBeNull();

  const reconfirmed = reconcileInflightRequestRebase({
    explicitReconfirmation: true,
    liveRequestVersionRef: "request-version.bank-statement.v2",
    now: "2026-05-04T09:05:00Z",
    session: rebased,
  });
  expect(reconfirmed.request_binding_state).toBe("RECONFIRMED_CURRENT");
  expect(reconfirmed.attachment_state).toBe("CONFIRMATION_REQUIRED");
  expect(reconfirmed.next_action_code).toBe("CONFIRM_ATTACHMENT");
  expect(reconfirmed.reconfirmed_at).toBe("2026-05-04T09:05:00Z");
});

test("superseded accepted uploads cap confidence and cannot attach", () => {
  const accepted = baseUpload({
    bytesTransferred: 12,
    finalizedAt: "2026-05-04T09:03:00Z",
    lastActivityAt: "2026-05-04T09:03:00Z",
    scanCompletedAt: "2026-05-04T09:03:00Z",
    stateChangedAt: "2026-05-04T09:03:00Z",
    transferState: "ACCEPTED",
    validationCompletedAt: "2026-05-04T09:03:00Z",
  });
  const superseded = reconcileInflightRequestRebase({
    liveRequestVersionRef: "request-version.bank-statement.v2",
    now: "2026-05-04T09:04:00Z",
    session: accepted,
    supersede: true,
  });

  expect(superseded.request_binding_state).toBe("SUPERSEDED");
  expect(superseded.attachment_state).toBe("REBIND_REQUIRED");
  expect(superseded.next_action_code).toBe("RECONFIRM_REQUEST");
  expect(superseded.recovery_posture).toBe("STALE_REVIEW_REQUIRED");
  expect(superseded.upload_confidence_score).toBeLessThanOrEqual(25);
});

test("chronology validation fails closed on backward timestamps", () => {
  const session = baseUpload();
  expect(() =>
    validateUploadSessionChronologyAndScope({
      ...session,
      state_changed_at: "2026-05-04T08:59:00Z",
    }),
  ).toThrow(ClientUploadSessionProjectionError);
});
