import {
  getGovernanceOverviewEndpoint,
  type GetGovernanceOverviewEndpointDependencies,
  type GetGovernanceOverviewEndpointRequest,
  type GetGovernanceOverviewEndpointResponse,
} from "./get_governance_overview_endpoint.ts";
import {
  getGovernancePolicySnapshotEndpoint,
  type GetGovernancePolicySnapshotEndpointDependencies,
  type GetGovernancePolicySnapshotEndpointRequest,
  type GetGovernancePolicySnapshotEndpointResponse,
} from "./get_governance_policy_snapshot_endpoint.ts";
import {
  getGovernancePrincipalsEndpoint,
  type GetGovernancePrincipalsEndpointDependencies,
  type GetGovernancePrincipalsEndpointRequest,
  type GetGovernancePrincipalsEndpointResponse,
} from "./get_governance_principals_endpoint.ts";
import {
  getGovernanceRoleMatrixEndpoint,
  type GetGovernanceRoleMatrixEndpointDependencies,
  type GetGovernanceRoleMatrixEndpointRequest,
  type GetGovernanceRoleMatrixEndpointResponse,
} from "./get_governance_role_matrix_endpoint.ts";

export const getGovernanceOverviewRoutePath =
  "/v1/governance/tenants/{tenant_id}/overview" as const;
export const getGovernancePolicySnapshotRoutePath =
  "/v1/governance/tenants/{tenant_id}/policy-snapshot" as const;
export const getGovernancePrincipalsRoutePath =
  "/v1/governance/tenants/{tenant_id}/principals" as const;
export const getGovernanceRoleMatrixRoutePath =
  "/v1/governance/tenants/{tenant_id}/roles/{role_id}" as const;

export type GovernanceReadRoutePath =
  | typeof getGovernanceOverviewRoutePath
  | typeof getGovernancePolicySnapshotRoutePath
  | typeof getGovernancePrincipalsRoutePath
  | typeof getGovernanceRoleMatrixRoutePath;

export type GovernanceReadRouteDependencies =
  GetGovernanceOverviewEndpointDependencies &
    GetGovernancePolicySnapshotEndpointDependencies &
    GetGovernancePrincipalsEndpointDependencies &
    GetGovernanceRoleMatrixEndpointDependencies;

export type GovernanceReadRouteHandlers = {
  overview: (
    request: GetGovernanceOverviewEndpointRequest,
  ) => Promise<GetGovernanceOverviewEndpointResponse>;
  policySnapshot: (
    request: GetGovernancePolicySnapshotEndpointRequest,
  ) => Promise<GetGovernancePolicySnapshotEndpointResponse>;
  principals: (
    request: GetGovernancePrincipalsEndpointRequest,
  ) => Promise<GetGovernancePrincipalsEndpointResponse>;
  roleMatrix: (
    request: GetGovernanceRoleMatrixEndpointRequest,
  ) => Promise<GetGovernanceRoleMatrixEndpointResponse>;
};

type AnyGovernanceReadRouteHandler = (request: never) => Promise<unknown>;

export type GovernanceReadRouteRegistry =
  | {
      get: (path: GovernanceReadRoutePath, handler: AnyGovernanceReadRouteHandler) => void;
    }
  | {
      register: (route: {
        handler: AnyGovernanceReadRouteHandler;
        method: "GET";
        path: GovernanceReadRoutePath;
      }) => void;
    };

function registerGet(
  registry: GovernanceReadRouteRegistry,
  path: GovernanceReadRoutePath,
  handler: AnyGovernanceReadRouteHandler,
) {
  if ("get" in registry) {
    registry.get(path, handler);
    return;
  }
  registry.register({
    handler,
    method: "GET",
    path,
  });
}

export function registerGovernanceReadRoutes(
  registry: GovernanceReadRouteRegistry,
  dependencies: GovernanceReadRouteDependencies,
) {
  const handlers = {
    overview: (request) => getGovernanceOverviewEndpoint(request, dependencies),
    policySnapshot: (request) =>
      getGovernancePolicySnapshotEndpoint(request, dependencies),
    principals: (request) => getGovernancePrincipalsEndpoint(request, dependencies),
    roleMatrix: (request) => getGovernanceRoleMatrixEndpoint(request, dependencies),
  } satisfies GovernanceReadRouteHandlers;

  registerGet(
    registry,
    getGovernanceOverviewRoutePath,
    handlers.overview as AnyGovernanceReadRouteHandler,
  );
  registerGet(
    registry,
    getGovernancePolicySnapshotRoutePath,
    handlers.policySnapshot as AnyGovernanceReadRouteHandler,
  );
  registerGet(
    registry,
    getGovernancePrincipalsRoutePath,
    handlers.principals as AnyGovernanceReadRouteHandler,
  );
  registerGet(
    registry,
    getGovernanceRoleMatrixRoutePath,
    handlers.roleMatrix as AnyGovernanceReadRouteHandler,
  );
  return handlers;
}
