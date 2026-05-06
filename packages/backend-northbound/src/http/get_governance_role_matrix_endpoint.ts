import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RoleTemplateMatrixRecord } from "../query/get_role_template_matrix.ts";
import {
  getRoleTemplateMatrix,
  RoleTemplateMatrixPublicationError,
  RoleTemplateMatrixRepository,
  type RoleTemplateMatrixRepositoryLike,
} from "../query/get_role_template_matrix.ts";
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

export type GetGovernanceRoleMatrixEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  latestSimulationRef?: string | null;
  method?: string;
  path?: string;
  principalClass?: string | null;
  query?: GovernanceReadQueryInput;
  roleEditorPendingChangeRefs?: readonly string[] | string | null;
  roleId?: string;
  selectedCellRef?: string | null;
  tenantId?: string;
};

export type GetGovernanceRoleMatrixEndpointResponse =
  | {
      body: RoleTemplateMatrixRecord;
      headers: typeof governanceReadNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: GovernanceReadProblemResponse["headers"];
      status: number;
    };

export type GetGovernanceRoleMatrixEndpointDependencies = {
  authorizeRead?: GovernanceReadAuthorizer;
  roleTemplateMatrixRepository: RoleTemplateMatrixRepositoryLike;
};

const rolePathPrefix = "/v1/governance/tenants/";
const rolePathMiddle = "/roles/";

function correlationId(request: GetGovernanceRoleMatrixEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function tenantRoleFromPath(path: string) {
  const pathname = path.split("?")[0] ?? path;
  if (!pathname.startsWith(rolePathPrefix)) {
    return null;
  }
  const remainder = pathname.slice(rolePathPrefix.length);
  const middleIndex = remainder.indexOf(rolePathMiddle);
  if (middleIndex < 0) {
    return null;
  }
  const encodedTenant = remainder.slice(0, middleIndex);
  const encodedRole = remainder.slice(middleIndex + rolePathMiddle.length);
  if (
    encodedTenant.length === 0 ||
    encodedRole.length === 0 ||
    encodedTenant.includes("/") ||
    encodedRole.includes("/")
  ) {
    return null;
  }
  try {
    const tenantId = decodeURIComponent(encodedTenant);
    const roleId = decodeURIComponent(encodedRole);
    return tenantId.length > 0 && roleId.length > 0 ? { roleId, tenantId } : null;
  } catch {
    return null;
  }
}

function resolveTenantRole(request: GetGovernanceRoleMatrixEndpointRequest) {
  const pathTenantRole =
    request.path === undefined ? undefined : tenantRoleFromPath(request.path);
  if (request.path !== undefined && pathTenantRole === null) {
    return null;
  }
  if (
    request.tenantId !== undefined &&
    pathTenantRole !== undefined &&
    request.tenantId !== pathTenantRole.tenantId
  ) {
    return null;
  }
  if (
    request.roleId !== undefined &&
    pathTenantRole !== undefined &&
    request.roleId !== pathTenantRole.roleId
  ) {
    return null;
  }
  const tenantId = request.tenantId ?? pathTenantRole?.tenantId ?? null;
  const roleId = request.roleId ?? pathTenantRole?.roleId ?? null;
  return tenantId && roleId ? { roleId, tenantId } : null;
}

function endpointQuery(request: GetGovernanceRoleMatrixEndpointRequest) {
  return mergeGovernanceQueryInputs(governanceQueryFromPath(request.path), request.query, {
    latest_simulation_ref: request.latestSimulationRef,
    role_editor_pending_change_refs: request.roleEditorPendingChangeRefs,
    selected_cell_ref: request.selectedCellRef,
  });
}

export async function getGovernanceRoleMatrixEndpoint(
  request: GetGovernanceRoleMatrixEndpointRequest,
  dependencies: GetGovernanceRoleMatrixEndpointDependencies,
): Promise<GetGovernanceRoleMatrixEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return buildGovernanceReadProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      tenantId: null,
    });
  }

  const tenantRole = resolveTenantRole(request);
  if (tenantRole === null) {
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
    routeSurface: "GOVERNANCE_ROLE_MATRIX",
    tenantId: tenantRole.tenantId,
  });
  if (!authorization.authorized) {
    return buildGovernanceReadProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      reasonCodes: authorization.reasonCodes,
      tenantId: tenantRole.tenantId,
    });
  }

  try {
    const storedMatrix = await getRoleTemplateMatrix({
      query: endpointQuery(request),
      roleId: tenantRole.roleId,
      roleTemplateMatrixRepository: dependencies.roleTemplateMatrixRepository,
      tenantId: tenantRole.tenantId,
    });
    if (storedMatrix === null) {
      return buildGovernanceReadProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        tenantId: tenantRole.tenantId,
      });
    }
    return {
      body: storedMatrix.role_matrix,
      headers: governanceReadNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof RoleTemplateMatrixPublicationError) {
      return buildGovernanceReadProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "CORRUPT",
        reasonCodes: error.reasonCodes,
        tenantId: tenantRole.tenantId,
      });
    }
    return buildGovernanceReadProblemEnvelope({
      correlationId: requestCorrelationId,
      detailOverride: error instanceof Error ? error.message : String(error),
      kind: "QUERY_INVALID",
      tenantId: tenantRole.tenantId,
    });
  }
}

export function createGetGovernanceRoleMatrixEndpointDependencies(input: {
  authorizeRead?: GovernanceReadAuthorizer;
  roleTemplateMatrixRepository?: RoleTemplateMatrixRepositoryLike;
} = {}): GetGovernanceRoleMatrixEndpointDependencies {
  return {
    authorizeRead: input.authorizeRead,
    roleTemplateMatrixRepository:
      input.roleTemplateMatrixRepository ?? new RoleTemplateMatrixRepository(),
  };
}
