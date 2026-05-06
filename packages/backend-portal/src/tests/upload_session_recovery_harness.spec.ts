import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertUploadRecoveryInvariants,
  buildClientUploadSession,
  buildUploadSessionRecoveryHarness,
  deriveCrossDeviceResumePolicy,
  deriveUploadRecoveryPostRequestProjection,
  materializeUploadRecoveryCase,
  reconcileInflightRequestRebase,
  requiredUploadRecoveryScenarios,
  uploadSessionRecoveryHarnessDeterministicSeed,
} from "../index.ts";

const baseUploadInput = {
  byteCount: 12,
  checksum: "checksum.bank-statement.recovery",
  clientId: "client.taxat-upload",
  filename: "bank-statement.pdf",
  frozenRequestVersionRef: "request-version.bank-statement.v1",
  mediaType: "application/pdf",
  now: "2026-05-04T09:00:00Z",
  requestId: "request.upload.bank-statement",
  storageRef: "storage.upload-staging.upload-session.bank-statement.recovery",
  tenantId: "tenant.taxat-upload",
  uploadSessionId: "upload-session.bank-statement.recovery",
};

function uploading(bytesTransferred: number) {
  return buildClientUploadSession({
    ...baseUploadInput,
    bytesTransferred,
    lastActivityAt: "2026-05-04T09:01:00Z",
    stateChangedAt: "2026-05-04T09:01:00Z",
    transferStartedAt: "2026-05-04T09:00:30Z",
    transferState: "UPLOADING",
  });
}

function acceptedCurrent() {
  return buildClientUploadSession({
    ...baseUploadInput,
    bytesTransferred: 12,
    finalizedAt: "2026-05-04T09:04:00Z",
    lastActivityAt: "2026-05-04T09:04:00Z",
    scanCompletedAt: "2026-05-04T09:04:00Z",
    stateChangedAt: "2026-05-04T09:04:00Z",
    transferStartedAt: "2026-05-04T09:00:30Z",
    transferState: "ACCEPTED",
    validationCompletedAt: "2026-05-04T09:04:00Z",
  });
}

test("builds the deterministic schema-valid upload recovery harness", async () => {
  const harness = buildUploadSessionRecoveryHarness();

  expect(harness.harness_id).toBe("upload-session-recovery-harness.pc-0182.v1");
  expect(harness.deterministic_seed).toBe(uploadSessionRecoveryHarnessDeterministicSeed);
  expect(harness.cases.map((caseEntry) => caseEntry.scenario_code)).toEqual([
    "MOBILE_RECONNECT",
    "BROWSER_RELOAD",
    "STALE_REQUEST_REBASE",
    "DUPLICATE_ALLOCATION_RETRY",
    "CHECKSUM_OR_SCANNER_DELAY",
    "ATTACHMENT_CONFIRMATION",
    "CROSS_DEVICE_CONTINUATION",
  ]);
  assertUploadRecoveryInvariants(harness);
  await validateContractSchema("upload_session_recovery_harness", harness);
});

for (const scenarioCode of requiredUploadRecoveryScenarios) {
  test(`materializes ${scenarioCode} with governed pre/post identity`, () => {
    const harness = buildUploadSessionRecoveryHarness();
    const caseEntry = harness.cases.find((entry) => entry.scenario_code === scenarioCode);

    expect(caseEntry).toBeDefined();
    expect(caseEntry?.pre_session.upload_session_id).toBe(caseEntry?.post_session.upload_session_id);
    expect(caseEntry?.pre_session.storage_ref).toBe(caseEntry?.post_session.storage_ref);
    expect(caseEntry?.duplicate_session_created).toBe(false);
    expect(caseEntry?.duplicate_storage_ref_created).toBe(false);
    expect(caseEntry?.post_request_projection.request_version_ref).toBe(
      caseEntry?.post_session.live_request_version_ref,
    );
  });
}

test("stale request rebase preserves frozen identity and clears current request projection", () => {
  const accepted = acceptedCurrent();
  const stale = reconcileInflightRequestRebase({
    liveRequestVersionRef: "request-version.bank-statement.v2",
    now: "2026-05-04T09:05:00Z",
    session: accepted,
  });
  const projection = deriveUploadRecoveryPostRequestProjection(stale);

  expect(stale.request_version_ref).toBe("request-version.bank-statement.v1");
  expect(stale.upload_request_binding_contract.live_request_version_ref).toBe(
    "request-version.bank-statement.v2",
  );
  expect(stale.next_action_code).toBe("RECONFIRM_REQUEST");
  expect(projection.request_version_ref).toBe("request-version.bank-statement.v2");
  expect(projection.current_request_upload_ref_or_null).toBeNull();
});

test("attachment confirmation is the only current-request satisfied projection", () => {
  const pre = acceptedCurrent();
  const post = buildClientUploadSession({
    ...baseUploadInput,
    attachedDocumentRef: "artifact.document.bank-statement.current",
    attachmentConfirmedAt: "2026-05-04T09:06:00Z",
    attachmentState: "ATTACHED",
    bytesTransferred: 12,
    finalizedAt: "2026-05-04T09:04:00Z",
    lastActivityAt: "2026-05-04T09:06:00Z",
    scanCompletedAt: "2026-05-04T09:04:00Z",
    stateChangedAt: "2026-05-04T09:06:00Z",
    transferStartedAt: "2026-05-04T09:00:30Z",
    transferState: "ACCEPTED",
    validationCompletedAt: "2026-05-04T09:04:00Z",
  });
  const caseEntry = materializeUploadRecoveryCase({
    postSession: post,
    preSession: pre,
    scenarioCode: "ATTACHMENT_CONFIRMATION",
  });

  expect(pre.next_action_code).toBe("CONFIRM_ATTACHMENT");
  expect(caseEntry.expected_request_completion_state).toBe("READY_CURRENT_REQUEST_SATISFIED");
  expect(caseEntry.post_request_projection.current_request_upload_ref_or_null).toBe(
    post.upload_session_id,
  );
});

test("cross-device continuation policy requires same governed session and storage", () => {
  const pre = uploading(4);
  const post = uploading(8);
  const policy = deriveCrossDeviceResumePolicy({
    entrySurfaceClass: "MOBILE",
    postSession: post,
    preSession: pre,
    resumeSurfaceClass: "DESKTOP",
  });

  expect(policy.continuation_allowed).toBe(true);
  expect(policy.duplicate_session_created).toBe(false);
  expect(policy.duplicate_storage_ref_created).toBe(false);
  expect(policy.upload_session_id).toBe(pre.upload_session_id);
  expect(policy.storage_ref).toBe(pre.storage_ref);
});
