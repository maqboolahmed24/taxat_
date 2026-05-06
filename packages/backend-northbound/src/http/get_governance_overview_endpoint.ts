import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { TenantGovernanceSnapshotRecord } from "../query/get_tenant_governance_snapshot.ts";
import {
  getTenantGovernanceSnapshot,
  TenantGovernanceSnapshotPublicationError,
  TenantGovernanceSnapshotRepository,
  type TenantGovernanceSnapshotRepositoryLike,
} from "../query/get_tenant_governance_snapshot.ts";
import {
  authorizeGovernanceReadScope,
  type GovernanceReadAuthorizer,
} from "../services/authorize_governance_read_scope.ts";
import {
  buildGovernanceReadProblemEnvelope,
  governanceReadNoStoreHeaders,
  type GovernanceReadProblemResponse,
} from "../services/build_governance_read_problem_envelope.ts";
import {
  governanceQueryFromPath,
  mergeGovernanceQueryInputs,
  type GovernanceReadQueryInput,
} from "../services/normalize_governance_query_filters.ts";

export type GetGovernanceOverviewEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  method?: string;
  path?: string;
  principalClass?: string | null;
  query?: GovernanceReadQueryInput;
  selectedCanvasObjectRef?: string | null;
  focusAnchorRef?: string | null;
  tenantId?: string;
};

export type GetGovernanceOverviewEndpointResponse =
  | {
      body: TenantGovernanceSnapshotRecord;
      headers: typeof governanceReadNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: GovernanceReadProblemResponse["headers"];
      status: number;
    };

export type GetGovernanceOverviewEndpointDependencies = {
  authorizeRead?: GovernanceReadAuthorizer;
  tenantGovernanceSnapshotRepository: TenantGovernanceSnapshotRepositoryLike;
};

const overviewPathPrefix = "/v1/governance/tenants/";
const overviewPathSuffix = "/overview";

function correlationId(request: GetGovernanceOverviewEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function tenantIdFromPath(path: string) {
  const pathname = path.split("?")[0] ?? path;
  if (!pathname.startsWith(overviewPathPrefix) || !pathname.endsWith(overviewPathSuffix)) {
    return null;
  }
  const encoded = pathname.slice(
    overviewPathPrefix.length,
    pathname.length - overviewPathSuffix.length,
  );
  if (encoded.length === 0 || encoded.includes("/")) {
    return null;
  }
  try {
    const tenantId = decodeURIComponent(encoded);
    return tenantId.length > 0 ? tenantId : null;
  } catch {
    return null;
  }
}

function resolveTenantId(request: GetGovernanceOverviewEndpointRequest) {
  const pathTenantId = request.path === undefined ? undefined : tenantIdFromPath(request.path);
  if (request.path !== undefined && pathTenantId === null) {
    return null;
  }
  if (
    request.tenantId !== undefined &&
    pathTenantId !== undefined &&
    request.tenantId !== pathTenantId
  ) {
    return null;
  }
  return request.tenantId ?? pathTenantId ?? null;
}

function endpointQuery(request: GetGovernanceOverviewEndpointRequest) {
  return mergeGovernanceQueryInputs(governanceQueryFromPath(request.path), request.query, {
    focus_anchor_ref: request.focusAnchorRef,
    selected_canvas_object_ref: request.selectedCanvasObjectRef,
  });
}

export async function getGovernanceOverviewEndpoint(
  request: GetGovernanceOverviewEndpointRequest,
  dependencies: GetGovernanceOverviewEndpointDependencies,
): Promise<GetGovernanceOverviewEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return buildGovernanceReadProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      tenantId: null,
    });
  }

  const tenantId = resolveTenantId(request);
  if (tenantId === null) {
    return buildGovernanceReadProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      tenantId: null,
    });
  }

  const authorizeRead = dependencies.authorizeRead ?? authorizeGovernanceReadScope;
  const authorization = await authorizeRead({
    actorContext: request.actorContext,
    principalClass: request.principalClass,
    routeSurface: "GOVERNANCE_OVERVIEW",
    tenantId,
  });
  if (!authorization.authorized) {
    return buildGovernanceReadProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      reasonCodes: authorization.reasonCodes,
      tenantId,
    });
  }

  try {
    const storedSnapshot = await getTenantGovernanceSnapshot({
      query: endpointQuery(request),
      tenantGovernanceSnapshotRepository:
        dependencies.tenantGovernanceSnapshotRepository,
      tenantId,
    });
    if (storedSnapshot === null) {
      return buildGovernanceReadProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        tenantId,
      });
    }
    return {
      body: storedSnapshot.snapshot,
      headers: governanceReadNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof TenantGovernanceSnapshotPublicationError) {
      return buildGovernanceReadProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "CORRUPT",
        reasonCodes: error.reasonCodes,
        tenantId,
      });
    }
    return buildGovernanceReadProblemEnvelope({
      correlationId: requestCorrelationId,
      detailOverride: error instanceof Error ? error.message : String(error),
      kind: "QUERY_INVALID",
      tenantId,
    });
  }
}

export function createGetGovernanceOverviewEndpointDependencies(input: {
  authorizeRead?: GovernanceReadAuthorizer;
  tenantGovernanceSnapshotRepository?: TenantGovernanceSnapshotRepositoryLike;
} = {}): GetGovernanceOverviewEndpointDependencies {
  return {
    authorizeRead: input.authorizeRead,
    tenantGovernanceSnapshotRepository:
      input.tenantGovernanceSnapshotRepository ??
      new TenantGovernanceSnapshotRepository(),
  };
}
