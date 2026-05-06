import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ClientUploadSessionRecord } from "../models/client_upload_session.ts";
import {
  exposedClientUploadSession,
  type ClientUploadSessionRepositoryLike,
} from "../repositories/client_upload_session_repository.ts";
import {
  buildUploadSessionProblemEnvelope,
  uploadSessionNoStoreHeaders,
  type UploadSessionProblemResponse,
} from "../services/build_upload_session_problem_envelope.ts";
import { assertUploadAllocationActorScope } from "../services/allocate_upload_session.ts";
import { transitionClientUploadSessionState } from "../services/transition_client_upload_session_state.ts";

export type GetUploadSessionStatusEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  liveRequestVersionRef?: string | null;
  method?: string;
  path?: string;
  principalClass?: string | null;
  uploadSessionId?: string;
};

export type GetUploadSessionStatusEndpointResponse =
  | {
      body: ClientUploadSessionRecord;
      headers: typeof uploadSessionNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: UploadSessionProblemResponse["headers"];
      status: number;
    };

export type GetUploadSessionStatusEndpointDependencies = {
  clock?: () => Date;
  repository: ClientUploadSessionRepositoryLike;
};

function correlationId(request: GetUploadSessionStatusEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function requestUrl(path: string | undefined, uploadSessionId?: string) {
  return new URL(
    path ?? `/v1/uploads/sessions/${encodeURIComponent(uploadSessionId ?? "")}`,
    "http://127.0.0.1",
  );
}

export function parseUploadSessionStatusPath(path: string | undefined, uploadSessionId?: string) {
  if (uploadSessionId !== undefined && uploadSessionId.length > 0) {
    return uploadSessionId;
  }
  const url = requestUrl(path);
  const match = /^\/v1\/uploads\/sessions\/([^/]+)$/.exec(url.pathname);
  return match === null ? null : decodeURIComponent(match[1]);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function problem(input: {
  clientId: string | null;
  correlationId: string;
  detailOverride?: string | null;
  error?: unknown;
  kind: Parameters<typeof buildUploadSessionProblemEnvelope>[0]["kind"];
  latestUploadSessionRef?: string | null;
  reasonCodes?: readonly string[];
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
    tenantId: input.tenantId,
  });
}

export async function getUploadSessionStatusEndpoint(
  request: GetUploadSessionStatusEndpointRequest,
  dependencies: GetUploadSessionStatusEndpointDependencies,
): Promise<GetUploadSessionStatusEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      tenantId: null,
    });
  }
  const uploadSessionId = parseUploadSessionStatusPath(request.path, request.uploadSessionId);
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
    const url = requestUrl(request.path, uploadSessionId);
    const liveRequestVersionRef =
      request.liveRequestVersionRef ??
      optionalString(url.searchParams.get("live_request_version_ref"));
    if (
      liveRequestVersionRef !== null &&
      liveRequestVersionRef !==
        stored.aggregate.session.upload_request_binding_contract.live_request_version_ref
    ) {
      const rebound = await transitionClientUploadSessionState({
        aggregate: stored.aggregate,
        transition: {
          kind: "REBASE",
          liveRequestVersionRef,
          now: (dependencies.clock ?? (() => new Date()))().toISOString(),
        },
      });
      const persisted = await dependencies.repository.persistUploadSession({
        aggregate: rebound,
        duplicateSuppressionKey: stored.duplicate_suppression_key,
        persistedAt: rebound.session.state_changed_at,
      });
      return {
        body: exposedClientUploadSession(persisted),
        headers: uploadSessionNoStoreHeaders,
        status: 200,
      };
    }
    return {
      body: exposedClientUploadSession(stored),
      headers: uploadSessionNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    return problem({
      clientId: stored.aggregate.session.client_id,
      correlationId: requestCorrelationId,
      error,
      kind: error instanceof Error && /NOT_VISIBLE/.test(error.message) ? "HIDDEN" : "CORRUPT",
      latestUploadSessionRef: uploadSessionId,
      tenantId: stored.aggregate.session.tenant_id,
    });
  }
}
