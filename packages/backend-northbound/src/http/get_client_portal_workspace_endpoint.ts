import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  ClientPortalWorkspaceRepository,
  getClientPortalWorkspace,
  type ClientPortalRouteQueryInput,
  type ClientPortalWorkspaceRepositoryLike,
} from "../query/get_client_portal_workspace.ts";
import {
  applyClientPortalWorkspaceConditionalRequest,
} from "../services/build_client_portal_stability_contract.ts";
import {
  buildClientPortalReadProblemEnvelope,
  clientPortalReadNoStoreHeaders,
  type ClientPortalReadProblemResponse,
} from "../services/build_client_portal_read_problem_envelope.ts";
import {
  authorizeClientPortalReadScope,
  ClientPortalWorkspacePublicationError,
  type ClientPortalReadAuthorizer,
  type ClientPortalReadRouteSurface,
  type ClientPortalWorkspaceRecord,
} from "../services/enforce_customer_safe_projection_for_portal.ts";
import {
  normalizeClientPortalReadRequest,
  type ClientPortalReadEndpointKind,
  type ClientPortalReadQueryInput,
} from "../services/normalize_client_portal_read_request.ts";

export type GetClientPortalEndpointRequest = {
  actorContext: NorthboundActorContext;
  clientId?: string;
  correlationId?: string;
  ifNoneMatch?: string | null;
  method?: string;
  path?: string;
  principalClass?: string | null;
  query?: ClientPortalReadQueryInput;
  tenantId?: string;
};

export type GetClientPortalEndpointResponse =
  | {
      body: ClientPortalWorkspaceRecord;
      headers: typeof clientPortalReadNoStoreHeaders & {
        ETag: string;
      };
      status: 200;
    }
  | {
      body: null;
      headers: typeof clientPortalReadNoStoreHeaders & {
        ETag: string;
      };
      status: 304;
    }
  | {
      body: ProblemEnvelope;
      headers: ClientPortalReadProblemResponse["headers"];
      status: number;
    };

export type GetClientPortalEndpointDependencies = {
  authorizeRead?: ClientPortalReadAuthorizer;
  clientPortalWorkspaceRepository: ClientPortalWorkspaceRepositoryLike;
};

export type GetClientPortalWorkspaceEndpointRequest = GetClientPortalEndpointRequest;
export type GetClientPortalWorkspaceEndpointResponse = GetClientPortalEndpointResponse;
export type GetClientPortalWorkspaceEndpointDependencies =
  GetClientPortalEndpointDependencies;

function correlationId(request: GetClientPortalEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function etagHeaders(etag: string) {
  return {
    ...clientPortalReadNoStoreHeaders,
    ETag: etag,
  };
}

export async function runClientPortalReadEndpoint(input: {
  dependencies: GetClientPortalEndpointDependencies;
  endpointKind: ClientPortalReadEndpointKind;
  loadWorkspace: (input: {
    clientId: string;
    clientPortalWorkspaceRepository: ClientPortalWorkspaceRepositoryLike;
    query?: ClientPortalRouteQueryInput;
    tenantId: string;
  }) => Promise<null | {
    source_refs: string[];
    workspace: ClientPortalWorkspaceRecord;
    workspace_ref: string;
  }>;
  request: GetClientPortalEndpointRequest;
  routeSurface: ClientPortalReadRouteSurface;
}): Promise<GetClientPortalEndpointResponse> {
  const requestCorrelationId = correlationId(input.request);
  if (input.request.method !== undefined && input.request.method !== "GET") {
    return buildClientPortalReadProblemEnvelope({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      tenantId: null,
    });
  }

  const normalized = normalizeClientPortalReadRequest({
    clientId: input.request.clientId,
    endpointKind: input.endpointKind,
    path: input.request.path,
    query: input.request.query,
    tenantId: input.request.tenantId,
  });
  if (normalized === null) {
    return buildClientPortalReadProblemEnvelope({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      tenantId: null,
    });
  }
  const tenantId = normalized.tenantId ?? input.request.actorContext.tenant_id;
  const clientId = normalized.clientId ?? input.request.actorContext.client_id_or_null;
  if (clientId === null) {
    return buildClientPortalReadProblemEnvelope({
      clientId: null,
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      reasonCodes: [
        "CLIENT_PORTAL_READ_CLIENT_SCOPE_REQUIRED",
        `${input.routeSurface}_CLIENT_SCOPE_REQUIRED`,
      ],
      tenantId,
    });
  }

  const authorizeRead = input.dependencies.authorizeRead ?? authorizeClientPortalReadScope;
  const authorization = await authorizeRead({
    actorContext: input.request.actorContext,
    clientId,
    principalClass: input.request.principalClass,
    routeSurface: input.routeSurface,
    tenantId,
  });
  if (!authorization.authorized) {
    return buildClientPortalReadProblemEnvelope({
      clientId,
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      reasonCodes: authorization.reasonCodes,
      tenantId,
    });
  }

  try {
    const publication = await input.loadWorkspace({
      clientId,
      clientPortalWorkspaceRepository: input.dependencies.clientPortalWorkspaceRepository,
      query: normalized.query,
      tenantId,
    });
    if (publication === null) {
      return buildClientPortalReadProblemEnvelope({
        clientId,
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        tenantId,
      });
    }

    const conditional = applyClientPortalWorkspaceConditionalRequest({
      ifNoneMatch: input.request.ifNoneMatch,
      workspaceVersion: publication.workspace.workspace_version,
    });
    if (conditional.status === "NOT_MODIFIED") {
      return {
        body: null,
        headers: etagHeaders(conditional.etag),
        status: 304,
      };
    }
    return {
      body: publication.workspace,
      headers: etagHeaders(conditional.etag),
      status: 200,
    };
  } catch (error) {
    if (error instanceof ClientPortalWorkspacePublicationError) {
      return buildClientPortalReadProblemEnvelope({
        clientId,
        correlationId: requestCorrelationId,
        detailOverride: error.message,
        kind:
          error.reasonCodes.includes("CLIENT_PORTAL_ROUTE_DERIVATION_INVALID") ||
          error.reasonCodes.includes("CLIENT_PORTAL_CONTEXT_OBJECT_ANCHOR_DRIFT")
            ? "QUERY_INVALID"
            : "CORRUPT",
        reasonCodes: error.reasonCodes,
        tenantId,
      });
    }
    return buildClientPortalReadProblemEnvelope({
      clientId,
      correlationId: requestCorrelationId,
      detailOverride: error instanceof Error ? error.message : String(error),
      kind: "QUERY_INVALID",
      tenantId,
    });
  }
}

export async function getClientPortalWorkspaceEndpoint(
  request: GetClientPortalWorkspaceEndpointRequest,
  dependencies: GetClientPortalWorkspaceEndpointDependencies,
) {
  return runClientPortalReadEndpoint({
    dependencies,
    endpointKind: "workspace",
    loadWorkspace: getClientPortalWorkspace,
    request,
    routeSurface: "CLIENT_PORTAL_WORKSPACE",
  });
}

export function createGetClientPortalWorkspaceEndpointDependencies(input: {
  authorizeRead?: ClientPortalReadAuthorizer;
  clientPortalWorkspaceRepository?: ClientPortalWorkspaceRepositoryLike;
} = {}): GetClientPortalWorkspaceEndpointDependencies {
  return {
    authorizeRead: input.authorizeRead,
    clientPortalWorkspaceRepository:
      input.clientPortalWorkspaceRepository ?? new ClientPortalWorkspaceRepository(),
  };
}
