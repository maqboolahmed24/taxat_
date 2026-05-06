import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { PrincipalAccessViewRecord } from "../query/get_principal_access_view.ts";
import {
  getPrincipalAccessView,
  PrincipalAccessViewPublicationError,
  PrincipalAccessViewReadRepository,
  type PrincipalAccessViewReadRepositoryLike,
} from "../query/get_principal_access_view.ts";
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

export type GetGovernancePrincipalsEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  focusAnchorRef?: string | null;
  method?: string;
  path?: string;
  principalClass?: string | null;
  principalId?: string | null;
  query?: GovernanceReadQueryInput;
  selectedCellRef?: string | null;
  selectedPrincipalRef?: string | null;
  selectedRoleTemplateRef?: string | null;
  tenantId?: string;
};

export type GetGovernancePrincipalsEndpointResponse =
  | {
      body: PrincipalAccessViewRecord;
      headers: typeof governanceReadNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: GovernanceReadProblemResponse["headers"];
      status: number;
    };

export type GetGovernancePrincipalsEndpointDependencies = {
  authorizeRead?: GovernanceReadAuthorizer;
  principalAccessViewRepository: PrincipalAccessViewReadRepositoryLike;
};

const principalsPathPrefix = "/v1/governance/tenants/";
const principalsPathSuffix = "/principals";

function correlationId(request: GetGovernancePrincipalsEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function tenantIdFromPath(path: string) {
  const pathname = path.split("?")[0] ?? path;
  if (
    !pathname.startsWith(principalsPathPrefix) ||
    !pathname.endsWith(principalsPathSuffix)
  ) {
    return null;
  }
  const encoded = pathname.slice(
    principalsPathPrefix.length,
    pathname.length - principalsPathSuffix.length,
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

function resolveTenantId(request: GetGovernancePrincipalsEndpointRequest) {
  const pathTenantId =
    request.path === undefined ? undefined : tenantIdFromPath(request.path);
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

function endpointQuery(request: GetGovernancePrincipalsEndpointRequest) {
  return mergeGovernanceQueryInputs(governanceQueryFromPath(request.path), request.query, {
    focus_anchor_ref: request.focusAnchorRef,
    principal_id: request.principalId,
    selected_cell_ref: request.selectedCellRef,
    selected_principal_ref: request.selectedPrincipalRef,
    selected_role_template_ref: request.selectedRoleTemplateRef,
  });
}

export async function getGovernancePrincipalsEndpoint(
  request: GetGovernancePrincipalsEndpointRequest,
  dependencies: GetGovernancePrincipalsEndpointDependencies,
): Promise<GetGovernancePrincipalsEndpointResponse> {
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
    routeSurface: "GOVERNANCE_PRINCIPALS",
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
    const storedView = await getPrincipalAccessView({
      principalAccessViewRepository: dependencies.principalAccessViewRepository,
      principalId: request.principalId ?? request.selectedPrincipalRef,
      query: endpointQuery(request),
      tenantId,
    });
    if (storedView === null) {
      return buildGovernanceReadProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        tenantId,
      });
    }
    return {
      body: storedView.view,
      headers: governanceReadNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof PrincipalAccessViewPublicationError) {
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

export function createGetGovernancePrincipalsEndpointDependencies(input: {
  authorizeRead?: GovernanceReadAuthorizer;
  principalAccessViewRepository?: PrincipalAccessViewReadRepositoryLike;
} = {}): GetGovernancePrincipalsEndpointDependencies {
  return {
    authorizeRead: input.authorizeRead,
    principalAccessViewRepository:
      input.principalAccessViewRepository ?? new PrincipalAccessViewReadRepository(),
  };
}
