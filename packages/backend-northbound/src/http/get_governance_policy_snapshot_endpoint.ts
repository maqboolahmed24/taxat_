import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { GovernancePolicySnapshotRecord } from "../query/get_governance_policy_snapshot.ts";
import {
  getGovernancePolicySnapshot,
  GovernancePolicySnapshotPublicationError,
  GovernancePolicySnapshotRepository,
  type GovernancePolicySnapshotRepositoryLike,
} from "../query/get_governance_policy_snapshot.ts";
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

export type GetGovernancePolicySnapshotEndpointRequest = {
  activeSectionCode?: string | null;
  actorContext: NorthboundActorContext;
  correlationId?: string;
  method?: string;
  path?: string;
  principalClass?: string | null;
  query?: GovernanceReadQueryInput;
  tenantId?: string;
};

export type GetGovernancePolicySnapshotEndpointResponse =
  | {
      body: GovernancePolicySnapshotRecord;
      headers: typeof governanceReadNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: GovernanceReadProblemResponse["headers"];
      status: number;
    };

export type GetGovernancePolicySnapshotEndpointDependencies = {
  authorizeRead?: GovernanceReadAuthorizer;
  governancePolicySnapshotRepository: GovernancePolicySnapshotRepositoryLike;
};

const policyPathPrefix = "/v1/governance/tenants/";
const policyPathSuffix = "/policy-snapshot";

function correlationId(request: GetGovernancePolicySnapshotEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function tenantIdFromPath(path: string) {
  const pathname = path.split("?")[0] ?? path;
  if (!pathname.startsWith(policyPathPrefix) || !pathname.endsWith(policyPathSuffix)) {
    return null;
  }
  const encoded = pathname.slice(
    policyPathPrefix.length,
    pathname.length - policyPathSuffix.length,
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

function resolveTenantId(request: GetGovernancePolicySnapshotEndpointRequest) {
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

function endpointQuery(request: GetGovernancePolicySnapshotEndpointRequest) {
  return mergeGovernanceQueryInputs(governanceQueryFromPath(request.path), request.query, {
    active_section_code: request.activeSectionCode,
  });
}

export async function getGovernancePolicySnapshotEndpoint(
  request: GetGovernancePolicySnapshotEndpointRequest,
  dependencies: GetGovernancePolicySnapshotEndpointDependencies,
): Promise<GetGovernancePolicySnapshotEndpointResponse> {
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
    routeSurface: "GOVERNANCE_POLICY_SNAPSHOT",
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
    const storedSnapshot = await getGovernancePolicySnapshot({
      governancePolicySnapshotRepository:
        dependencies.governancePolicySnapshotRepository,
      query: endpointQuery(request),
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
    if (error instanceof GovernancePolicySnapshotPublicationError) {
      return buildGovernanceReadProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "CORRUPT",
        policySnapshotRef: null,
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

export function createGetGovernancePolicySnapshotEndpointDependencies(input: {
  authorizeRead?: GovernanceReadAuthorizer;
  governancePolicySnapshotRepository?: GovernancePolicySnapshotRepositoryLike;
} = {}): GetGovernancePolicySnapshotEndpointDependencies {
  return {
    authorizeRead: input.authorizeRead,
    governancePolicySnapshotRepository:
      input.governancePolicySnapshotRepository ??
      new GovernancePolicySnapshotRepository(),
  };
}
