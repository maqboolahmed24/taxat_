import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import { stableJsonHash } from "../../../../packages/domain-kernel/src/primitives/hash.ts";
import type { ChecksumAlgorithmRef } from "../../../../packages/domain-kernel/src/uploads/chunk_checksum.ts";
import { allocateUploadTransferSession } from "../../../../packages/domain-kernel/src/uploads/upload_transfer_service.ts";
import type {
  ClientUploadSessionRepositoryLike,
  StoredClientUploadSessionRecord,
} from "../repositories/client_upload_session_repository.ts";
import { assertAllocationRequestVersionIsCurrent } from "./build_upload_request_binding_contract.ts";
import { reuseDuplicateUploadSession } from "./reuse_duplicate_upload_session.ts";
import { transitionClientUploadSessionState } from "./transition_client_upload_session_state.ts";

export type AllocateUploadSessionInput = {
  byteCount: number;
  captureMode?: "BROWSE" | "CAMERA" | "DRAG_DROP" | "SYSTEM_SHARE";
  checksum: string;
  checksumAlgorithmRef?: ChecksumAlgorithmRef;
  chunkSizeBytes?: number;
  clientId: string;
  expiresAtOrNull?: string | null;
  filename: string;
  initiatedBy?: string;
  liveRequestVersionRef?: string | null;
  manifestIdOrNull?: string | null;
  mediaType: string;
  now: string;
  requestId: string;
  requestIdentityRef: string;
  requestVersionRef: string;
  storageRef?: string;
  surfaceClass?: "DESKTOP" | "MOBILE" | "TABLET";
  tenantId: string;
  uploadSessionId?: string;
};

export type AllocateUploadSessionResult = {
  created: boolean;
  duplicateSuppressionKey: string;
  stored: StoredClientUploadSessionRecord;
};

export class UploadSessionAllocationError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(code: string, detail: string, reasonCodes: readonly string[]) {
    super(`${code}: ${detail}`);
    this.name = "UploadSessionAllocationError";
    this.code = code;
    this.reasonCodes = [...reasonCodes];
  }
}

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new UploadSessionAllocationError("UPLOAD_SESSION_REQUEST_INVALID", `${label} is required`, [
      "UPLOAD_SESSION_FIELD_REQUIRED",
    ]);
  }
}

function assertPositiveInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new UploadSessionAllocationError(
      "UPLOAD_SESSION_REQUEST_INVALID",
      `${label} must be a positive integer`,
      ["UPLOAD_SESSION_FIELD_INVALID"],
    );
  }
}

export function buildUploadSessionDuplicateSuppressionKey(input: AllocateUploadSessionInput) {
  return stableJsonHash({
    byte_count: input.byteCount,
    checksum: input.checksum,
    checksum_algorithm_ref: input.checksumAlgorithmRef ?? "SHA256_CHUNK_HEX_V1",
    chunk_size_bytes: input.chunkSizeBytes ?? input.byteCount,
    client_id: input.clientId,
    contract_version: "UPLOAD_SESSION_DUPLICATE_SUPPRESSION_KEY_V1",
    filename: input.filename,
    media_type: input.mediaType,
    request_id: input.requestId,
    request_identity_ref: input.requestId,
    request_version_ref: input.requestVersionRef,
    tenant_id: input.tenantId,
  });
}

function buildUploadSessionId(input: AllocateUploadSessionInput) {
  return `upload-session.${buildUploadSessionDuplicateSuppressionKey(input).slice(0, 32)}`;
}

function buildStorageRef(uploadSessionId: string) {
  return `storage.upload-staging.${uploadSessionId}`;
}

function validateAllocationInput(input: AllocateUploadSessionInput) {
  assertNonEmptyString("tenant_id", input.tenantId);
  assertNonEmptyString("client_id", input.clientId);
  assertNonEmptyString("request_id", input.requestId);
  assertNonEmptyString("request_identity_ref", input.requestIdentityRef);
  if (input.requestIdentityRef !== input.requestId) {
    throw new UploadSessionAllocationError(
      "UPLOAD_SESSION_REQUEST_INVALID",
      "request_identity_ref must mirror request_id for governed upload-session allocation",
      ["UPLOAD_SESSION_REQUEST_IDENTITY_DRIFT"],
    );
  }
  assertNonEmptyString("request_version_ref", input.requestVersionRef);
  assertNonEmptyString("filename", input.filename);
  if (input.filename.length > 120) {
    throw new UploadSessionAllocationError(
      "UPLOAD_SESSION_REQUEST_INVALID",
      "filename exceeds the ClientUploadSession schema limit",
      ["UPLOAD_SESSION_FILENAME_INVALID"],
    );
  }
  assertNonEmptyString("media_type", input.mediaType);
  assertNonEmptyString("checksum", input.checksum);
  assertPositiveInteger("byte_count", input.byteCount);
  assertPositiveInteger("chunk_size_bytes", input.chunkSizeBytes ?? input.byteCount);
  if ((input.chunkSizeBytes ?? input.byteCount) > input.byteCount) {
    throw new UploadSessionAllocationError(
      "UPLOAD_SESSION_REQUEST_INVALID",
      "chunk_size_bytes must not exceed byte_count for the contiguous chunk-window profile",
      ["UPLOAD_SESSION_CHUNK_WINDOW_INVALID"],
    );
  }
}

export function assertUploadAllocationActorScope(input: {
  actorContext: NorthboundActorContext;
  clientId: string;
  principalClass?: string | null;
  tenantId: string;
}) {
  if (input.actorContext.tenant_id !== input.tenantId) {
    throw new UploadSessionAllocationError(
      "UPLOAD_SESSION_NOT_VISIBLE",
      "upload session allocation is hidden across tenant boundaries",
      ["UPLOAD_SESSION_TENANT_MISMATCH"],
    );
  }
  if (input.actorContext.client_id_or_null !== input.clientId) {
    throw new UploadSessionAllocationError(
      "UPLOAD_SESSION_NOT_VISIBLE",
      "upload session allocation is hidden across client boundaries",
      ["UPLOAD_SESSION_CLIENT_MISMATCH"],
    );
  }
  const principalClass =
    input.principalClass ??
    (input.actorContext as NorthboundActorContext & { principal_class?: string }).principal_class ??
    "CLIENT_VIEWER";
  if (
    [
      "GOVERNANCE_ADMIN",
      "OPERATOR",
      "SERVICE",
      "STAFF",
      "STAFF_FULL",
      "STAFF_SUPPORT",
    ].includes(principalClass)
  ) {
    throw new UploadSessionAllocationError(
      "UPLOAD_SESSION_NOT_VISIBLE",
      "staff-only sessions cannot allocate customer upload sessions",
      ["UPLOAD_SESSION_CUSTOMER_SCOPE_REQUIRED", "UPLOAD_SESSION_STAFF_SESSION_BLOCKED"],
    );
  }
}

export async function allocateUploadSession(input: {
  allocation: AllocateUploadSessionInput;
  repository: ClientUploadSessionRepositoryLike;
}) {
  validateAllocationInput(input.allocation);
  const duplicateSuppressionKey = buildUploadSessionDuplicateSuppressionKey(input.allocation);
  const duplicate = await input.repository.findByDuplicateSuppressionKey(duplicateSuppressionKey);
  if (duplicate !== null) {
    const stored = await reuseDuplicateUploadSession({
      liveRequestVersionRef:
        input.allocation.liveRequestVersionRef ?? input.allocation.requestVersionRef,
      now: input.allocation.now,
      repository: input.repository,
      stored: duplicate,
    });
    return {
      created: false,
      duplicateSuppressionKey,
      stored,
    } satisfies AllocateUploadSessionResult;
  }

  assertAllocationRequestVersionIsCurrent({
    frozenRequestVersionRef: input.allocation.requestVersionRef,
    liveRequestVersionRef: input.allocation.liveRequestVersionRef,
  });
  const uploadSessionId = input.allocation.uploadSessionId ?? buildUploadSessionId(input.allocation);
  const aggregate = await allocateUploadTransferSession({
    byteCount: input.allocation.byteCount,
    captureMode: input.allocation.captureMode ?? "BROWSE",
    checksum: input.allocation.checksum,
    checksumAlgorithmRef: input.allocation.checksumAlgorithmRef ?? "SHA256_CHUNK_HEX_V1",
    chunkSizeBytes: input.allocation.chunkSizeBytes ?? input.allocation.byteCount,
    clientId: input.allocation.clientId,
    expiresAtOrNull: input.allocation.expiresAtOrNull ?? null,
    filename: input.allocation.filename,
    initiatedBy: input.allocation.initiatedBy ?? "client-portal",
    liveRequestVersionRef: input.allocation.requestVersionRef,
    manifestIdOrNull: input.allocation.manifestIdOrNull ?? null,
    mediaType: input.allocation.mediaType,
    now: input.allocation.now,
    requestId: input.allocation.requestId,
    requestIdentityRef: input.allocation.requestId,
    requestVersionRef: input.allocation.requestVersionRef,
    storageRef: input.allocation.storageRef ?? buildStorageRef(uploadSessionId),
    surfaceClass: input.allocation.surfaceClass ?? "DESKTOP",
    tenantId: input.allocation.tenantId,
    uploadSessionId,
  });
  const northboundAggregate = await transitionClientUploadSessionState({
    aggregate,
    transition: {
      kind: "ALLOCATED_READY_FOR_BYTES",
      now: input.allocation.now,
    },
  });
  const stored = await input.repository.persistUploadSession({
    aggregate: northboundAggregate,
    duplicateSuppressionKey,
    persistedAt: input.allocation.now,
  });
  return {
    created: true,
    duplicateSuppressionKey,
    stored,
  } satisfies AllocateUploadSessionResult;
}
