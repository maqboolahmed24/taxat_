import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ISO8601DateTimeString,
  UploadSessionRecoveryHarness,
  UploadSessionRecoveryHarnessHarnessCase,
  UploadSessionRecoveryHarnessRequestProjectionSnapshot,
  UploadSessionRecoveryHarnessScenarioCode,
  UploadSessionRecoveryHarnessSessionSnapshot,
} from "../../../generated-models/src/generated/typescript/index.ts";
import type { ChecksumAlgorithmRef } from "./chunk_checksum.ts";
import { computeChunkChecksum, finalizeUploadChecksum, verifyChunkChecksum } from "./chunk_checksum.ts";
import { assessUploadCompletionBoundary } from "./upload_completion_boundary.ts";
import type { GovernedUploadSession } from "./upload_session_state.ts";
import type { ResumableOffsetTracker } from "./resumable_offset_tracker.ts";
import {
  appendVerifiedChunk,
  closeResumableOffsetTracker,
  createResumableOffsetTracker,
  markChunkVerificationFailed,
} from "./resumable_offset_tracker.ts";
import {
  assessUploadRequestBinding,
  assertUploadBindingScopeMatch,
  reconcileUploadRequestBindingContract,
  createUploadRequestBindingContract,
} from "./upload_request_binding_reader.ts";
import { assertUploadSessionStorageContinuity } from "../references/artifact_locator.ts";
import { stableJsonHash } from "../primitives/hash.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";
import { createGovernedObjectRecord, loadObjectLifecyclePolicyBundle } from "../storage/object_lifecycle.ts";

export type UploadExpiryAndGcPolicy = {
  active_resume_ttl_hours: number;
  attachment_confirmation_ttl_hours: number;
  basis_statement: string;
  contract_version: "UPLOAD_EXPIRY_AND_GC_POLICY_V1";
  gc_retention_hours_for_superseded_history: number;
  policy_id: string;
  post_transfer_validation_ttl_hours: number;
};

export type UploadTransferAggregate = {
  checksumAlgorithmRef: ChecksumAlgorithmRef;
  governedObjectRecord: Awaited<ReturnType<typeof createGovernedObjectRecord>>;
  offsetTracker: ResumableOffsetTracker;
  session: GovernedUploadSession;
};

type UploadTransferServiceErrorCode =
  | "UPLOAD_TRANSFER_SCOPE_MISMATCH"
  | "UPLOAD_TRANSFER_TERMINAL_STATE";

type UploadTransferServiceErrorInit = {
  code: UploadTransferServiceErrorCode;
  detail: string;
};

export class UploadTransferServiceError extends Error {
  readonly code: UploadTransferServiceErrorCode;

  constructor(init: UploadTransferServiceErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "UploadTransferServiceError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const expiryPolicyPath = path.join(
  repoRoot,
  "config",
  "uploads",
  "upload_expiry_and_gc_policy.json",
);

let cachedExpiryPolicy: Promise<UploadExpiryAndGcPolicy> | null = null;

function assertCondition(
  condition: unknown,
  init: UploadTransferServiceErrorInit,
): asserts condition {
  if (!condition) {
    throw new UploadTransferServiceError(init);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function plusHours(now: string, hours: number) {
  const base = new Date(normalizeUtcInstantString(now));
  return normalizeUtcInstantString(new Date(base.valueOf() + hours * 3_600_000).toISOString());
}

function uploadResumeTokenRef(input: {
  checksumAlgorithmRef: ChecksumAlgorithmRef;
  storageRef: string;
  uploadSessionId: string;
}) {
  return stableJsonHash({
    checksum_algorithm_ref: input.checksumAlgorithmRef,
    contract_version: "UPLOAD_RESUME_TOKEN_V1",
    storage_ref: input.storageRef,
    upload_session_id: input.uploadSessionId,
  });
}

function validateExpiryPolicy(policy: UploadExpiryAndGcPolicy) {
  assertCondition(policy.contract_version === "UPLOAD_EXPIRY_AND_GC_POLICY_V1", {
    code: "UPLOAD_TRANSFER_SCOPE_MISMATCH",
    detail: "upload expiry policy contract drifted",
  });
}

export async function loadUploadExpiryAndGcPolicy(options?: { reload?: boolean }) {
  if (!cachedExpiryPolicy || options?.reload) {
    cachedExpiryPolicy = (async () => {
      const policy = await readJson<UploadExpiryAndGcPolicy>(expiryPolicyPath);
      validateExpiryPolicy(policy);
      return policy;
    })();
  }
  return cachedExpiryPolicy;
}

function readyForCurrentRequest(session: GovernedUploadSession) {
  return (
    session.request_binding_state !== "RECONFIRMATION_REQUIRED" &&
    session.request_binding_state !== "SUPERSEDED" &&
    session.attachment_state === "ATTACHED"
  );
}

export async function allocateUploadTransferSession(input: {
  byteCount: number;
  captureMode: GovernedUploadSession["capture_mode"];
  checksum: string;
  checksumAlgorithmRef: ChecksumAlgorithmRef;
  chunkSizeBytes: number;
  clientId: string;
  expiresAtOrNull?: string | null;
  filename: string;
  initiatedBy: string;
  liveRequestVersionRef?: string;
  manifestIdOrNull?: string | null;
  mediaType: string;
  now: string;
  requestId: string;
  requestIdentityRef: string;
  requestVersionRef: string;
  storageRef: string;
  surfaceClass: GovernedUploadSession["surface_class"];
  tenantId: string;
  uploadSessionId: string;
}) {
  const now = normalizeUtcInstantString(input.now);
  const expiryPolicy = await loadUploadExpiryAndGcPolicy();
  const uploadRequestBindingContract = createUploadRequestBindingContract({
    frozenClientId: input.clientId,
    frozenRequestId: input.requestId,
    frozenRequestVersionRef: input.requestVersionRef,
    frozenTenantId: input.tenantId,
    liveRequestVersionRef: input.liveRequestVersionRef ?? input.requestVersionRef,
    now,
    requestIdentityRef: input.requestIdentityRef,
  });
  const expiresAt = input.expiresAtOrNull
    ? normalizeUtcInstantString(input.expiresAtOrNull)
    : plusHours(now, expiryPolicy.active_resume_ttl_hours);
  const offsetTracker = createResumableOffsetTracker({
    byteCount: input.byteCount,
    chunkSizeBytes: input.chunkSizeBytes,
    storageRef: input.storageRef,
    uploadSessionId: input.uploadSessionId,
  });
  const objectBundle = await loadObjectLifecyclePolicyBundle();
  const governedObjectRecord = createGovernedObjectRecord(objectBundle, {
    createdAt: now,
    objectClassRef: "UPLOAD_SESSION_SOURCE",
    objectRef: `artifact.${input.uploadSessionId}`,
    requestVersionRefOrNull: input.requestVersionRef,
    storageRef: input.storageRef,
    tenantId: input.tenantId,
    uploadSessionIdOrNull: input.uploadSessionId,
  });

  return {
    checksumAlgorithmRef: input.checksumAlgorithmRef,
    governedObjectRecord,
    offsetTracker,
    session: {
      artifact_type: "ClientUploadSession",
      attached_document_ref: null,
      attachment_confirmed_at: null,
      attachment_state: "STAGED",
      byte_count: input.byteCount,
      bytes_transferred: 0,
      capture_mode: input.captureMode,
      checksum: input.checksum,
      client_id: input.clientId,
      dominant_hazard_code: null,
      expires_at: expiresAt,
      filename: input.filename,
      finalized_at: null,
      initiated_by: input.initiatedBy,
      integrity_state: "PENDING",
      last_activity_at: now,
      malware_scan_state: "PENDING",
      manifest_id: input.manifestIdOrNull ?? null,
      media_type: input.mediaType,
      next_action_code: "RESUME_UPLOAD",
      outcome_reason_code: null,
      reconfirmed_at: null,
      request_binding_state: uploadRequestBindingContract.request_binding_state,
      request_id: input.requestId,
      request_version_ref: input.requestVersionRef,
      resume_attempt_count: 0,
      resume_success_count: 0,
      resume_token_ref: uploadResumeTokenRef({
        checksumAlgorithmRef: input.checksumAlgorithmRef,
        storageRef: input.storageRef,
        uploadSessionId: input.uploadSessionId,
      }),
      resumability_state: "RESUMABLE",
      retry_count: 0,
      scan_completed_at: null,
      state_changed_at: now,
      storage_ref: input.storageRef,
      submitted_at: now,
      surface_class: input.surfaceClass,
      tenant_id: input.tenantId,
      transfer_started_at: now,
      transfer_state: "QUEUED",
      upload_confidence_score: 72,
      upload_request_binding_contract: uploadRequestBindingContract,
      upload_session_id: input.uploadSessionId,
      validation_completed_at: null,
      validation_state: "PENDING",
      recovery_posture:
        uploadRequestBindingContract.request_binding_state === "RECONFIRMATION_REQUIRED"
          ? "RECONFIRM_INLINE"
          : "NONE",
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export async function appendUploadTransferChunk(
  aggregate: UploadTransferAggregate,
  input: {
    expectedChunkDigestOrNull?: string | null;
    now: string;
    offset: number;
    chunkBytes: Uint8Array;
  },
) {
  assertCondition(aggregate.session.transfer_state !== "ACCEPTED", {
    code: "UPLOAD_TRANSFER_TERMINAL_STATE",
    detail: "cannot append bytes after the upload is already accepted",
  });

  const computed = await computeChunkChecksum({
    algorithmRef: aggregate.checksumAlgorithmRef,
    chunkBytes: input.chunkBytes,
  });
  if (input.expectedChunkDigestOrNull) {
    try {
      verifyChunkChecksum({
        actual: computed,
        expectedDigest: input.expectedChunkDigestOrNull,
      });
    } catch {
      return {
        ...aggregate,
        offsetTracker: markChunkVerificationFailed(aggregate.offsetTracker, {
          failureCode: "CHECKSUM_MISMATCH",
          offset: input.offset,
        }),
        session: {
          ...aggregate.session,
          dominant_hazard_code: "CHECKSUM_MISMATCH",
          integrity_state: "FAILED",
          last_activity_at: normalizeUtcInstantString(input.now),
          next_action_code: "RETRY_UPLOAD",
          recovery_posture: "STEP_UP_RETRY",
          retry_count: aggregate.session.retry_count + 1,
          state_changed_at: normalizeUtcInstantString(input.now),
          transfer_state: "FAILED",
        } satisfies GovernedUploadSession,
      } satisfies UploadTransferAggregate;
    }
  }

  const appended = appendVerifiedChunk(aggregate.offsetTracker, {
    checksumDigest: computed.digest,
    offset: input.offset,
    suppliedByteLength: computed.byteLength,
  });
  const now = normalizeUtcInstantString(input.now);

  return {
    ...aggregate,
    offsetTracker: appended.nextTracker,
    session: {
      ...aggregate.session,
      bytes_transferred: appended.nextTracker.contiguousBytesTransferred,
      dominant_hazard_code: null,
      integrity_state: "PENDING",
      last_activity_at: now,
      next_action_code:
        appended.nextTracker.contiguousBytesTransferred >= appended.nextTracker.byteCount
          ? "NONE"
          : "RESUME_UPLOAD",
      recovery_posture: "NONE",
      state_changed_at: now,
      transfer_state:
        appended.nextTracker.contiguousBytesTransferred >= appended.nextTracker.byteCount
          ? "SCANNING"
          : "UPLOADING",
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export async function closeUploadTransfer(
  aggregate: UploadTransferAggregate,
  input: {
    now: string;
  },
) {
  const closedTracker = closeResumableOffsetTracker(aggregate.offsetTracker);
  const finalizedChecksum = await finalizeUploadChecksum({
    algorithmRef: aggregate.checksumAlgorithmRef,
    byteCount: aggregate.session.byte_count,
    orderedChunkDigests: closedTracker.chunks.map((entry) => entry.checksumDigestOrNull ?? ""),
  });
  const now = normalizeUtcInstantString(input.now);

  if (finalizedChecksum !== aggregate.session.checksum) {
    return {
      ...aggregate,
      offsetTracker: closedTracker,
      session: {
        ...aggregate.session,
        dominant_hazard_code: "FINAL_CHECKSUM_MISMATCH",
        integrity_state: "FAILED",
        last_activity_at: now,
        next_action_code: "RETRY_UPLOAD",
        recovery_posture: "STEP_UP_RETRY",
        resumability_state: "RESUMABLE",
        retry_count: aggregate.session.retry_count + 1,
        state_changed_at: now,
        transfer_state: "FAILED",
      } satisfies GovernedUploadSession,
    } satisfies UploadTransferAggregate;
  }

  return {
    ...aggregate,
    offsetTracker: closedTracker,
    session: {
      ...aggregate.session,
      bytes_transferred: aggregate.session.byte_count,
      dominant_hazard_code: null,
      finalized_at: now,
      integrity_state: "VERIFIED",
      last_activity_at: now,
      next_action_code: "NONE",
      recovery_posture: "NONE",
      resumability_state: "CLOSED",
      state_changed_at: now,
      transfer_state: "SCANNING",
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export async function recordUploadMalwareScanVerdict(
  aggregate: UploadTransferAggregate,
  input: {
    clean: boolean;
    now: string;
  },
) {
  const now = normalizeUtcInstantString(input.now);
  return {
    ...aggregate,
    session: {
      ...aggregate.session,
      last_activity_at: now,
      malware_scan_state: input.clean ? "CLEAN" : "QUARANTINED",
      next_action_code: input.clean ? "NONE" : "UPLOAD_REPLACEMENT",
      recovery_posture: input.clean ? aggregate.session.recovery_posture : "SUPPORT_REQUIRED",
      scan_completed_at: now,
      state_changed_at: now,
      transfer_state: input.clean ? "SCANNING" : "REJECTED",
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export async function recordUploadValidationOutcome(
  aggregate: UploadTransferAggregate,
  input: {
    now: string;
    outcome: GovernedUploadSession["validation_state"];
  },
) {
  const now = normalizeUtcInstantString(input.now);
  const accepted = input.outcome === "ACCEPTED";
  return {
    ...aggregate,
    session: {
      ...aggregate.session,
      last_activity_at: now,
      next_action_code: accepted ? "NONE" : "UPLOAD_REPLACEMENT",
      recovery_posture: accepted ? aggregate.session.recovery_posture : "SUPPORT_REQUIRED",
      state_changed_at: now,
      transfer_state: accepted ? "ACCEPTED" : "REJECTED",
      validation_completed_at: now,
      validation_state: input.outcome,
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export async function rebaseUploadRequestBinding(
  aggregate: UploadTransferAggregate,
  input: {
    explicitReconfirmation?: boolean;
    liveRequestVersionRef: string;
    now: string;
    supersede?: boolean;
  },
) {
  assertUploadBindingScopeMatch({
    clientId: aggregate.session.client_id,
    contract: aggregate.session.upload_request_binding_contract,
    requestId: aggregate.session.request_id,
    tenantId: aggregate.session.tenant_id,
  });

  assertUploadSessionStorageContinuity({
    nextRequestVersionRef: input.liveRequestVersionRef,
    nextStorageRef: aggregate.session.storage_ref,
    previousRequestVersionRef: aggregate.session.upload_request_binding_contract.live_request_version_ref,
    previousStorageRef: aggregate.session.storage_ref,
    uploadSessionId: aggregate.session.upload_session_id,
  });

  const nextContract = reconcileUploadRequestBindingContract({
    contract: aggregate.session.upload_request_binding_contract,
    explicitReconfirmation: input.explicitReconfirmation,
    liveRequestVersionRef: input.liveRequestVersionRef,
    now: input.now,
    supersede: input.supersede,
  });
  const binding = assessUploadRequestBinding(nextContract);
  const now = normalizeUtcInstantString(input.now);
  const staleAccepted =
    aggregate.session.transfer_state === "ACCEPTED" &&
    binding.requestBindingState === "RECONFIRMATION_REQUIRED";

  return {
    ...aggregate,
    session: {
      ...aggregate.session,
      attachment_state: staleAccepted ? "REBIND_REQUIRED" : aggregate.session.attachment_state,
      next_action_code:
        binding.requestBindingState === "SUPERSEDED"
          ? "UPLOAD_REPLACEMENT"
          : staleAccepted
            ? "RECONFIRM_REQUEST"
            : aggregate.session.bytes_transferred < aggregate.session.byte_count
              ? "RESUME_UPLOAD"
              : aggregate.session.next_action_code,
      recovery_posture:
        binding.requestBindingState === "RECONFIRMATION_REQUIRED"
          ? "RECONFIRM_INLINE"
          : binding.requestBindingState === "SUPERSEDED"
            ? "STALE_REVIEW_REQUIRED"
            : "NONE",
      reconfirmed_at: input.explicitReconfirmation ? now : aggregate.session.reconfirmed_at,
      request_binding_state: nextContract.request_binding_state,
      state_changed_at: now,
      upload_request_binding_contract: nextContract,
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export async function confirmUploadAttachment(
  aggregate: UploadTransferAggregate,
  input: {
    attachedDocumentRef: string;
    now: string;
  },
) {
  const now = normalizeUtcInstantString(input.now);
  const candidate = {
    ...aggregate.session,
    attached_document_ref: input.attachedDocumentRef,
    attachment_confirmed_at: now,
    attachment_state: "ATTACHED",
    state_changed_at: now,
  } satisfies GovernedUploadSession;
  const decision = await assessUploadCompletionBoundary(candidate);
  return {
    ...aggregate,
    session: {
      ...candidate,
      attachment_state: decision.attachmentState,
      next_action_code: decision.nextActionCode,
      recovery_posture: decision.recoveryPosture,
      state_changed_at: now,
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export async function refreshUploadCompletionBoundary(
  aggregate: UploadTransferAggregate,
  input: {
    now: string;
  },
) {
  const now = normalizeUtcInstantString(input.now);
  const decision = await assessUploadCompletionBoundary(aggregate.session);
  return {
    ...aggregate,
    session: {
      ...aggregate.session,
      attachment_state: decision.attachmentState,
      next_action_code: decision.nextActionCode,
      recovery_posture: decision.recoveryPosture,
      state_changed_at: now,
    } satisfies GovernedUploadSession,
  } satisfies UploadTransferAggregate;
}

export function captureUploadSessionSnapshot(
  session: GovernedUploadSession,
): UploadSessionRecoveryHarnessSessionSnapshot {
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

export async function projectUploadRequestRecoverySnapshot(
  session: GovernedUploadSession,
): Promise<UploadSessionRecoveryHarnessRequestProjectionSnapshot> {
  const decision = await assessUploadCompletionBoundary(session);
  return {
    current_request_upload_ref_or_null:
      decision.readyForCurrentRequest && readyForCurrentRequest(session)
        ? session.upload_session_id
        : null,
    latest_upload_ref_or_null: session.upload_session_id,
    request_id: session.request_id,
    request_version_ref: session.upload_request_binding_contract.live_request_version_ref,
  };
}

export async function createUploadRecoveryHarnessCase(input: {
  entrySurfaceClass: GovernedUploadSession["surface_class"];
  postSession: GovernedUploadSession;
  preSession: GovernedUploadSession;
  resumeSurfaceClass: GovernedUploadSession["surface_class"];
  scenarioCode: UploadSessionRecoveryHarnessScenarioCode;
}) {
  const postRequestProjection = await projectUploadRequestRecoverySnapshot(input.postSession);
  return {
    case_id: `upload-recovery.${input.scenarioCode.toLowerCase()}`,
    duplicate_session_created: false,
    duplicate_storage_ref_created: false,
    entry_surface_class: input.entrySurfaceClass,
    expected_request_completion_state: (
      await assessUploadCompletionBoundary(input.postSession)
    ).completionState,
    post_request_projection: postRequestProjection,
    post_session: captureUploadSessionSnapshot(input.postSession),
    pre_session: captureUploadSessionSnapshot(input.preSession),
    resume_surface_class: input.resumeSurfaceClass,
    scenario_code: input.scenarioCode,
  } satisfies UploadSessionRecoveryHarnessHarnessCase;
}

export async function createUploadSessionRecoveryHarness(input: {
  cases: UploadSessionRecoveryHarnessHarnessCase[];
}) {
  return {
    cases: input.cases,
    completion_policy: "TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION",
    contract_version: "UPLOAD_SESSION_RECOVERY_HARNESS_V1",
    deterministic_seed: 72,
    duplicate_policy: "NO_DUPLICATE_SESSION_OR_STORAGE_REF_ON_RETRY_OR_CROSS_DEVICE_RESUME",
    harness_id: "upload-session-recovery-harness.phase-02-seq-072",
    identity_policy: "FROZEN_TENANT_CLIENT_REQUEST_AND_VERSION_SCOPE",
    rebase_policy: "LIVE_REQUEST_VERSION_MAY_ADVANCE_FROZEN_VERSION_MAY_NOT",
    recovery_action_policy: "NEXT_ACTION_AND_RESUMABILITY_STATE_GOVERN_ALL_RECOVERY",
    resume_policy: "RESUME_EXISTING_SESSION_AND_STORAGE_REF_ONLY",
    run_mode: "DETERMINISTIC_SESSION_RECOVERY_ENUMERATION",
    suite_profile: "RESUMABLE_UPLOAD_RECONNECT_REBASE_AND_DUPLICATE_MATRIX",
  } satisfies UploadSessionRecoveryHarness;
}
