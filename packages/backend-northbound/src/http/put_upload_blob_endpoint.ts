import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ClientUploadSessionRecord } from "../models/client_upload_session.ts";
import {
  exposedClientUploadSession,
  type ClientUploadSessionRepositoryLike,
} from "../repositories/client_upload_session_repository.ts";
import { assertUploadAllocationActorScope } from "../services/allocate_upload_session.ts";
import {
  buildUploadSessionProblemEnvelope,
  uploadSessionNoStoreHeaders,
  type UploadSessionProblemResponse,
} from "../services/build_upload_session_problem_envelope.ts";
import {
  storeUploadBlobAndUpdateProgress,
  UploadBlobStoreError,
} from "../services/store_upload_blob_and_update_progress.ts";

export type PutUploadBlobEndpointRequest = {
  actorContext: NorthboundActorContext;
  body: unknown;
  chunkDigest?: string | null;
  correlationId?: string;
  explicitReconfirmation?: boolean;
  headers?: Record<string, string | string[] | undefined>;
  liveRequestVersionRef?: string | null;
  method?: string;
  offset?: number;
  path?: string;
  principalClass?: string | null;
  uploadSessionId?: string;
};

export type PutUploadBlobEndpointResponse =
  | {
      body: ClientUploadSessionRecord;
      headers: typeof uploadSessionNoStoreHeaders & {
        "X-Upload-Bytes-Transferred": string;
        "X-Upload-Duplicate-Replay": "false" | "true";
        "X-Upload-Resume-Offset": string;
      };
      status: 200 | 202;
    }
  | {
      body: ProblemEnvelope;
      headers: UploadSessionProblemResponse["headers"];
      status: number;
    };

export type PutUploadBlobEndpointDependencies = {
  clock?: () => Date;
  repository: ClientUploadSessionRepositoryLike;
};

function correlationId(request: PutUploadBlobEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function requestUrl(path: string | undefined, uploadSessionId?: string) {
  return new URL(
    path ?? `/v1/uploads/sessions/${encodeURIComponent(uploadSessionId ?? "")}/blob`,
    "http://127.0.0.1",
  );
}

function parseUploadBlobPath(path: string | undefined, uploadSessionId?: string) {
  if (uploadSessionId !== undefined && uploadSessionId.length > 0) {
    return uploadSessionId;
  }
  const url = requestUrl(path);
  const match = /^\/v1\/uploads\/sessions\/([^/]+)\/blob$/.exec(url.pathname);
  return match === null ? null : decodeURIComponent(match[1]);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Uint8Array)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
) {
  if (headers === undefined) {
    return null;
  }
  const entry = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  if (Array.isArray(entry)) {
    return entry[0] ?? null;
  }
  return optionalString(entry);
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value === "true" || value === "1";
  }
  return false;
}

function bytesFromBody(body: unknown) {
  if (body instanceof Uint8Array) {
    return body;
  }
  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return new Uint8Array(body);
  }
  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }
  if (Array.isArray(body) && body.every((entry) => Number.isInteger(entry))) {
    return new Uint8Array(body as number[]);
  }
  const record = asRecord(body);
  const raw =
    record.chunk_bytes ??
    record.bytes ??
    record.body ??
    record.content ??
    record.chunkBytes ??
    null;
  if (raw !== null) {
    return bytesFromBody(raw);
  }
  const base64 = optionalString(record.chunk_bytes_base64 ?? record.bytes_base64);
  if (base64 !== null) {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  return null;
}

function problem(input: {
  clientId: string | null;
  correlationId: string;
  detailOverride?: string | null;
  error?: unknown;
  kind: Parameters<typeof buildUploadSessionProblemEnvelope>[0]["kind"];
  latestStaleGuardValue?: number | null;
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
    latestStaleGuardValue: input.latestStaleGuardValue,
    latestUploadSessionRef: input.latestUploadSessionRef,
    reasonCodes: input.reasonCodes,
    rebaseRequired: input.rebaseRequired,
    tenantId: input.tenantId,
  });
}

function uploadSessionStaleGuardValue(
  session: ClientUploadSessionRecord,
) {
  const parsed = Date.parse(session.state_changed_at);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : session.bytes_transferred;
}

export async function putUploadBlobEndpoint(
  request: PutUploadBlobEndpointRequest,
  dependencies: PutUploadBlobEndpointDependencies,
): Promise<PutUploadBlobEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "PUT") {
    return problem({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      tenantId: null,
    });
  }
  const uploadSessionId = parseUploadBlobPath(request.path, request.uploadSessionId);
  if (uploadSessionId === null) {
    return problem({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      tenantId: null,
    });
  }
  const stored = await dependencies.repository.findByUploadSessionId(uploadSessionId);
  if (stored === null) {
    return problem({
      clientId: request.actorContext.client_id_or_null,
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      latestUploadSessionRef: uploadSessionId,
      tenantId: request.actorContext.tenant_id,
    });
  }

  try {
    assertUploadAllocationActorScope({
      actorContext: request.actorContext,
      clientId: stored.aggregate.session.client_id,
      principalClass: request.principalClass,
      tenantId: stored.aggregate.session.tenant_id,
    });
  } catch (error) {
    return problem({
      clientId: stored.aggregate.session.client_id,
      correlationId: requestCorrelationId,
      error,
      kind: "HIDDEN",
      latestUploadSessionRef: uploadSessionId,
      tenantId: stored.aggregate.session.tenant_id,
    });
  }

  const url = requestUrl(request.path, uploadSessionId);
  const bodyRecord = asRecord(request.body);
  const chunkBytes = bytesFromBody(request.body);
  const requestedLiveRequestVersionRef =
    request.liveRequestVersionRef ??
    optionalString(bodyRecord.live_request_version_ref) ??
    optionalString(url.searchParams.get("live_request_version_ref")) ??
    headerValue(request.headers, "x-live-request-version-ref");
  const staleGuardRequested =
    requestedLiveRequestVersionRef !== null &&
    requestedLiveRequestVersionRef !==
      stored.aggregate.session.upload_request_binding_contract.live_request_version_ref;
  const expectedChunkDigest =
    request.chunkDigest ??
    optionalString(bodyRecord.chunk_digest) ??
    optionalString(bodyRecord.checksum_digest) ??
    optionalString(bodyRecord.expected_chunk_digest) ??
    headerValue(request.headers, "x-upload-chunk-digest");
  const offset =
    request.offset ??
    numberValue(bodyRecord.offset) ??
    numberValue(url.searchParams.get("offset")) ??
    numberValue(headerValue(request.headers, "x-upload-offset"));
  if (chunkBytes === null || expectedChunkDigest === null || offset === null) {
    return problem({
      clientId: stored.aggregate.session.client_id,
      correlationId: requestCorrelationId,
      kind: "REQUEST_INVALID",
      latestUploadSessionRef: uploadSessionId,
      reasonCodes: ["UPLOAD_SESSION_BLOB_REQUEST_INVALID"],
      tenantId: stored.aggregate.session.tenant_id,
    });
  }

  try {
    const result = await storeUploadBlobAndUpdateProgress({
      chunkBytes,
      expectedChunkDigest,
      explicitReconfirmation:
        request.explicitReconfirmation ??
        booleanValue(bodyRecord.explicit_reconfirmation) ??
        booleanValue(headerValue(request.headers, "x-upload-explicit-reconfirmation")),
      liveRequestVersionRef: requestedLiveRequestVersionRef,
      now: (dependencies.clock ?? (() => new Date()))().toISOString(),
      offset,
      repository: dependencies.repository,
      uploadSessionId,
    });
    const session = exposedClientUploadSession(result.stored);
    return {
      body: session,
      headers: {
        ...uploadSessionNoStoreHeaders,
        "X-Upload-Bytes-Transferred": String(session.bytes_transferred),
        "X-Upload-Duplicate-Replay": result.duplicateReplay ? "true" : "false",
        "X-Upload-Resume-Offset": String(session.bytes_transferred),
      },
      status: result.partial ? 202 : 200,
    };
  } catch (error) {
    if (error instanceof UploadBlobStoreError) {
      return problem({
        clientId: stored.aggregate.session.client_id,
        correlationId: requestCorrelationId,
        error,
        kind:
          error.code === "UPLOAD_SESSION_CHUNK_CHECKSUM_INVALID" ||
          error.code === "UPLOAD_SESSION_FINAL_CHECKSUM_INVALID"
            ? "CHECKSUM_INVALID"
            : error.code === "UPLOAD_SESSION_TERMINAL_STATE"
              ? "STATE_INVALID"
              : "REQUEST_INVALID",
        latestStaleGuardValue: staleGuardRequested
          ? uploadSessionStaleGuardValue(
              error.latestStoredOrNull?.aggregate.session ?? stored.aggregate.session,
            )
          : undefined,
        latestUploadSessionRef:
          error.latestStoredOrNull?.aggregate.session.upload_session_id ?? uploadSessionId,
        reasonCodes: error.reasonCodes,
        rebaseRequired: staleGuardRequested,
        tenantId: stored.aggregate.session.tenant_id,
      });
    }
    return problem({
      clientId: stored.aggregate.session.client_id,
      correlationId: requestCorrelationId,
      error,
      kind: "CORRUPT",
      latestUploadSessionRef: uploadSessionId,
      tenantId: stored.aggregate.session.tenant_id,
    });
  }
}
