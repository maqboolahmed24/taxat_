import { expect, test } from "@playwright/test";
import type { ClientUploadSessionRecord } from "../../../packages/backend-northbound/src/index.ts";
import {
  allocateUploadSession,
  assertUploadSessionRecoveryHarnessContract,
  buildUploadBlobChecksumPlan,
  ClientUploadSessionRepository,
  storeUploadBlobAndUpdateProgress,
  transitionClientUploadSessionState,
} from "../../../packages/backend-northbound/src/index.ts";
import type {
  UploadSessionRecoveryHarness,
  UploadSessionRecoveryHarnessHarnessCase,
  UploadSessionRecoveryHarnessSessionSnapshot,
} from "../../../packages/generated-models/src/generated/typescript/index.ts";
import {
  uploadAllocationBody,
  uploadChunks,
  uploadFixedNow,
  uploadRequestVersionV2,
} from "../../unit/backend_northbound/upload_session_fixtures.ts";

function snapshot(session: ClientUploadSessionRecord): UploadSessionRecoveryHarnessSessionSnapshot {
  return {
    attached_document_ref_or_null: session.attached_document_ref,
    attachment_confirmed_at_or_null: session.attachment_confirmed_at,
    attachment_state: session.attachment_state,
    byte_count: session.byte_count,
    bytes_transferred: session.bytes_transferred,
    client_id: session.client_id,
    frozen_request_version_ref: session.request_version_ref,
    integrity_state: session.integrity_state,
    live_request_version_ref: session.upload_request_binding_contract.live_request_version_ref,
    malware_scan_state: session.malware_scan_state,
    next_action_code: session.next_action_code,
    request_binding_state: session.request_binding_state,
    request_id: session.request_id,
    resumability_state: session.resumability_state,
    resume_token_ref_or_null: session.resume_token_ref,
    storage_ref: session.storage_ref,
    tenant_id: session.tenant_id,
    transfer_state: session.transfer_state,
    upload_confidence_score: session.upload_confidence_score,
    upload_session_id: session.upload_session_id,
    validation_state: session.validation_state,
  };
}

function scannerDelaySnapshot(
  session: ClientUploadSessionRecord,
): UploadSessionRecoveryHarnessSessionSnapshot {
  return {
    ...snapshot(session),
    attachment_state: "STAGED",
    bytes_transferred: session.byte_count,
    integrity_state: "VERIFIED",
    malware_scan_state: "PENDING",
    next_action_code: "RESUME_UPLOAD",
    request_binding_state: "ORIGINAL_CURRENT",
    resumability_state: "RESUMABLE",
    resume_token_ref_or_null: session.resume_token_ref ?? "resume-token.scanner-delay",
    transfer_state: "SCANNING",
    upload_confidence_score: 72,
    validation_state: "PENDING",
  };
}

function harnessCase(input: {
  expected: UploadSessionRecoveryHarnessHarnessCase["expected_request_completion_state"];
  entry: UploadSessionRecoveryHarnessHarnessCase["entry_surface_class"];
  post: UploadSessionRecoveryHarnessSessionSnapshot;
  pre: UploadSessionRecoveryHarnessSessionSnapshot;
  resume: UploadSessionRecoveryHarnessHarnessCase["resume_surface_class"];
  scenario: UploadSessionRecoveryHarnessHarnessCase["scenario_code"];
}): UploadSessionRecoveryHarnessHarnessCase {
  return {
    case_id: `upload-recovery.${input.scenario.toLowerCase()}`,
    duplicate_session_created: false,
    duplicate_storage_ref_created: false,
    entry_surface_class: input.entry,
    expected_request_completion_state: input.expected,
    post_request_projection: {
      current_request_upload_ref_or_null:
        input.expected === "READY_CURRENT_REQUEST_SATISFIED" ? input.post.upload_session_id : null,
      latest_upload_ref_or_null: input.post.upload_session_id,
      request_id: input.post.request_id,
      request_version_ref: input.post.live_request_version_ref,
    },
    post_session: input.post,
    pre_session: input.pre,
    resume_surface_class: input.resume,
    scenario_code: input.scenario,
  };
}

test("deterministic upload recovery harness covers reconnect, reload, rebase, duplicate, scan delay, attachment, and cross-device continuation", async () => {
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

  const partial = await storeUploadBlobAndUpdateProgress({
    chunkBytes: chunks[0],
    expectedChunkDigest: checksumPlan.chunkDigests[0],
    now: "2026-05-04T09:01:00Z",
    offset: 0,
    repository,
    uploadSessionId: allocated.stored.aggregate.session.upload_session_id,
  });
  const duplicate = await allocateUploadSession({
    allocation: {
      byteCount: allocation.byte_count,
      checksum: allocation.checksum,
      chunkSizeBytes: allocation.chunk_size_bytes,
      clientId: allocation.client_id,
      filename: allocation.filename,
      mediaType: allocation.media_type,
      now: "2026-05-04T09:01:30Z",
      requestId: allocation.request_id,
      requestIdentityRef: allocation.request_identity_ref,
      requestVersionRef: allocation.request_version_ref,
      tenantId: allocation.tenant_id,
    },
    repository,
  });

  let acceptedStored = partial.stored;
  for (const [index, chunk] of chunks.slice(1).entries()) {
    acceptedStored = (
      await storeUploadBlobAndUpdateProgress({
        chunkBytes: chunk,
        expectedChunkDigest: checksumPlan.chunkDigests[index + 1],
        liveRequestVersionRef: index === chunks.length - 2 ? uploadRequestVersionV2 : undefined,
        now: `2026-05-04T09:0${index + 2}:00Z`,
        offset: (index + 1) * 4,
        repository,
        uploadSessionId: allocated.stored.aggregate.session.upload_session_id,
      })
    ).stored;
  }
  const reconfirmed = await transitionClientUploadSessionState({
    aggregate: acceptedStored.aggregate,
    transition: {
      explicitReconfirmation: true,
      kind: "REBASE",
      liveRequestVersionRef: uploadRequestVersionV2,
      now: "2026-05-04T09:05:00Z",
    },
  });
  const attached = await transitionClientUploadSessionState({
    aggregate: reconfirmed,
    transition: {
      attachedDocumentRef: "artifact.document.bank-statement.current",
      kind: "CONFIRM_ATTACHMENT",
      now: "2026-05-04T09:06:00Z",
    },
  });

  const pre = snapshot(allocated.stored.aggregate.session);
  const partialPost = snapshot(partial.stored.aggregate.session);
  const stalePost = snapshot(acceptedStored.aggregate.session);
  const attachedPost = snapshot(attached.session);
  const scannerPost = scannerDelaySnapshot(partial.stored.aggregate.session);
  const duplicatePost = snapshot(duplicate.stored.aggregate.session);

  const harness = {
    cases: [
      harnessCase({
        entry: "MOBILE",
        expected: "NOT_READY_BYTES_IN_FLIGHT",
        post: partialPost,
        pre,
        resume: "MOBILE",
        scenario: "MOBILE_RECONNECT",
      }),
      harnessCase({
        entry: "BROWSER",
        expected: "NOT_READY_SCAN_OR_VALIDATION_PENDING",
        post: scannerPost,
        pre: partialPost,
        resume: "BROWSER",
        scenario: "BROWSER_RELOAD",
      }),
      harnessCase({
        entry: "DESKTOP",
        expected: "NOT_READY_STALE_RECONFIRM_REQUIRED",
        post: stalePost,
        pre: partialPost,
        resume: "DESKTOP",
        scenario: "STALE_REQUEST_REBASE",
      }),
      harnessCase({
        entry: "DESKTOP",
        expected: "NOT_READY_BYTES_IN_FLIGHT",
        post: duplicatePost,
        pre: partialPost,
        resume: "DESKTOP",
        scenario: "DUPLICATE_ALLOCATION_RETRY",
      }),
      harnessCase({
        entry: "DESKTOP",
        expected: "NOT_READY_SCAN_OR_VALIDATION_PENDING",
        post: scannerPost,
        pre: partialPost,
        resume: "DESKTOP",
        scenario: "CHECKSUM_OR_SCANNER_DELAY",
      }),
      harnessCase({
        entry: "DESKTOP",
        expected: "READY_CURRENT_REQUEST_SATISFIED",
        post: attachedPost,
        pre: stalePost,
        resume: "DESKTOP",
        scenario: "ATTACHMENT_CONFIRMATION",
      }),
      harnessCase({
        entry: "MOBILE",
        expected: "NOT_READY_BYTES_IN_FLIGHT",
        post: partialPost,
        pre,
        resume: "DESKTOP",
        scenario: "CROSS_DEVICE_CONTINUATION",
      }),
    ],
    completion_policy: "TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION",
    contract_version: "UPLOAD_SESSION_RECOVERY_HARNESS_V1",
    deterministic_seed: 164,
    duplicate_policy: "NO_DUPLICATE_SESSION_OR_STORAGE_REF_ON_RETRY_OR_CROSS_DEVICE_RESUME",
    harness_id: "upload-session-recovery-harness.pc-0164",
    identity_policy: "FROZEN_TENANT_CLIENT_REQUEST_AND_VERSION_SCOPE",
    rebase_policy: "LIVE_REQUEST_VERSION_MAY_ADVANCE_FROZEN_VERSION_MAY_NOT",
    recovery_action_policy: "NEXT_ACTION_AND_RESUMABILITY_STATE_GOVERN_ALL_RECOVERY",
    resume_policy: "RESUME_EXISTING_SESSION_AND_STORAGE_REF_ONLY",
    run_mode: "DETERMINISTIC_SESSION_RECOVERY_ENUMERATION",
    suite_profile: "RESUMABLE_UPLOAD_RECONNECT_REBASE_AND_DUPLICATE_MATRIX",
  } satisfies UploadSessionRecoveryHarness;

  expect(assertUploadSessionRecoveryHarnessContract(harness).cases).toHaveLength(7);
  expect(harness.cases.map((entry) => entry.scenario_code).sort()).toEqual(
    [
      "ATTACHMENT_CONFIRMATION",
      "BROWSER_RELOAD",
      "CHECKSUM_OR_SCANNER_DELAY",
      "CROSS_DEVICE_CONTINUATION",
      "DUPLICATE_ALLOCATION_RETRY",
      "MOBILE_RECONNECT",
      "STALE_REQUEST_REBASE",
    ].sort(),
  );
});
