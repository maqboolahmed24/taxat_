import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ChecksumAlgorithmRef } from "../../../../packages/domain-kernel/src/uploads/chunk_checksum.ts";
import {
  allocateUploadSession,
  assertUploadAllocationActorScope,
  UploadSessionAllocationError,
  type AllocateUploadSessionInput,
} from "../services/allocate_upload_session.ts";
import { UploadRequestBindingContractError } from "../services/build_upload_request_binding_contract.ts";
import {
  buildUploadSessionProblemEnvelope,
  uploadSessionNoStoreHeaders,
  type UploadSessionProblemResponse,
} from "../services/build_upload_session_problem_envelope.ts";
import type {
  ClientUploadSessionRepositoryLike,
} from "../repositories/client_upload_session_repository.ts";
import {
  exposedClientUploadSession,
} from "../repositories/client_upload_session_repository.ts";
import type { ClientUploadSessionRecord } from "../models/client_upload_session.ts";

export type PostUploadSessionsEndpointRequest = {
  actorContext: NorthboundActorContext;
  body: unknown;
  clientId?: string;
  correlationId?: string;
  method?: string;
  path?: string;
  principalClass?: string | null;
  tenantId?: string;
};

export type PostUploadSessionsEndpointResponse =
  | {
      body: ClientUploadSessionRecord;
      headers: typeof uploadSessionNoStoreHeaders & {
        "X-Upload-Session-Reused": "false" | "true";
      };
      status: 200 | 201;
    }
  | {
      body: ProblemEnvelope;
      headers: UploadSessionProblemResponse["headers"];
      status: number;
    };

export type PostUploadSessionsEndpointDependencies = {
  clock?: () => Date;
  repository: ClientUploadSessionRepositoryLike;
};

function correlationId(request: PostUploadSessionsEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function optionalNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function requestUrl(path: string | undefined) {
  return new URL(path ?? "/v1/uploads/sessions", "http://127.0.0.1");
}

function normalizeAllocationRequest(
  request: PostUploadSessionsEndpointRequest,
  now: string,
): AllocateUploadSessionInput | null {
  const url = requestUrl(request.path);
  const body = asRecord(request.body);
  const tenantId =
    optionalString(body.tenant_id) ??
    optionalString(request.tenantId) ??
    optionalString(url.searchParams.get("tenant_id")) ??
    request.actorContext.tenant_id;
  const clientId =
    optionalString(body.client_id) ??
    optionalString(request.clientId) ??
    optionalString(url.searchParams.get("client_id")) ??
    request.actorContext.client_id_or_null;
  if (clientId === null) {
    return null;
  }
  const requestId = optionalString(body.request_id);
  const requestIdentityRef = optionalString(body.request_identity_ref);
  const requestVersionRef = optionalString(body.request_version_ref);
  const filename = optionalString(body.filename);
  const mediaType = optionalString(body.media_type);
  const checksum = optionalString(body.checksum);
  const byteCount = optionalNumber(body.byte_count);
  if (
    requestId === null ||
    requestIdentityRef === null ||
    requestVersionRef === null ||
    filename === null ||
    mediaType === null ||
    checksum === null ||
    byteCount === null
  ) {
    return null;
  }
  return {
    byteCount,
    captureMode:
      optionalString(body.capture_mode) as AllocateUploadSessionInput["captureMode"],
    checksum,
    checksumAlgorithmRef:
      (optionalString(body.checksum_algorithm_ref) as ChecksumAlgorithmRef | null) ??
      "SHA256_CHUNK_HEX_V1",
    chunkSizeBytes: optionalNumber(body.chunk_size_bytes) ?? byteCount,
    clientId,
    expiresAtOrNull: optionalString(body.expires_at) ?? null,
    filename,
    initiatedBy: optionalString(body.initiated_by) ?? request.actorContext.principal_ref,
    liveRequestVersionRef:
      optionalString(body.live_request_version_ref) ??
      optionalString(url.searchParams.get("live_request_version_ref")),
    manifestIdOrNull: optionalString(body.manifest_id),
    mediaType,
    now,
    requestId,
    requestIdentityRef,
    requestVersionRef,
    storageRef: optionalString(body.storage_ref) ?? undefined,
    surfaceClass:
      (optionalString(body.surface_class) as AllocateUploadSessionInput["surfaceClass"]) ??
      "DESKTOP",
    tenantId,
    uploadSessionId: optionalString(body.upload_session_id) ?? undefined,
  };
}

function problem(input: {
  clientId: string | null;
  correlationId: string;
  detailOverride?: string | null;
  error?: unknown;
  kind: Parameters<typeof buildUploadSessionProblemEnvelope>[0]["kind"];
  latestUploadSessionRef?: string | null;
  reasonCodes?: readonly string[];
  rebaseRequired?: boolean;
  tenantId: string | null;
}) {
  return buildUploadSessionProblemEnvelope({
    clientId: input.clientId,
    correlationId: input.correlationId,
    detailOverride:
      input.detailOverride ??
      (input.error instanceof Error ? input.error.message : input.error === undefined ? null : String(input.error)),
    kind: input.kind,
    latestUploadSessionRef: input.latestUploadSessionRef,
    reasonCodes: input.reasonCodes,
    rebaseRequired: input.rebaseRequired,
    tenantId: input.tenantId,
  });
}

export async function postUploadSessionsEndpoint(
  request: PostUploadSessionsEndpointRequest,
  dependencies: PostUploadSessionsEndpointDependencies,
): Promise<PostUploadSessionsEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "POST") {
    return problem({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      tenantId: null,
    });
  }
  const url = requestUrl(request.path);
  if (url.pathname !== "/v1/uploads/sessions") {
    return problem({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      tenantId: null,
    });
  }

  const now = (dependencies.clock ?? (() => new Date()))().toISOString();
  const allocation = normalizeAllocationRequest(request, now);
  if (allocation === null) {
    return problem({
      clientId: request.actorContext.client_id_or_null,
      correlationId: requestCorrelationId,
      kind: "REQUEST_INVALID",
      reasonCodes: ["UPLOAD_SESSION_ALLOCATION_BODY_INVALID"],
      tenantId: request.actorContext.tenant_id,
    });
  }

  try {
    assertUploadAllocationActorScope({
      actorContext: request.actorContext,
      clientId: allocation.clientId,
      principalClass: request.principalClass,
      tenantId: allocation.tenantId,
    });
    const allocated = await allocateUploadSession({
      allocation,
      repository: dependencies.repository,
    });
    return {
      body: exposedClientUploadSession(allocated.stored),
      headers: {
        ...uploadSessionNoStoreHeaders,
        "X-Upload-Session-Reused": allocated.created ? "false" : "true",
      },
      status: allocated.created ? 201 : 200,
    };
  } catch (error) {
    if (error instanceof UploadSessionAllocationError) {
      return problem({
        clientId: allocation.clientId,
        correlationId: requestCorrelationId,
        error,
        kind: error.code === "UPLOAD_SESSION_NOT_VISIBLE" ? "HIDDEN" : "REQUEST_INVALID",
        reasonCodes: error.reasonCodes,
        tenantId: allocation.tenantId,
      });
    }
    if (error instanceof UploadRequestBindingContractError) {
      return problem({
        clientId: allocation.clientId,
        correlationId: requestCorrelationId,
        error,
        kind: "STATE_INVALID",
        reasonCodes: error.reasonCodes,
        rebaseRequired: true,
        tenantId: allocation.tenantId,
      });
    }
    return problem({
      clientId: allocation.clientId,
      correlationId: requestCorrelationId,
      error,
      kind: error instanceof Error && /duplicate upload session/.test(error.message)
        ? "DUPLICATE_CONFLICT"
        : "CORRUPT",
      tenantId: allocation.tenantId,
    });
  }
}
