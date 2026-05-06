import {
  getClientPortalActivityEndpoint,
  type GetClientPortalActivityEndpointDependencies,
  type GetClientPortalActivityEndpointRequest,
  type GetClientPortalActivityEndpointResponse,
} from "./get_client_portal_activity_endpoint.ts";
import {
  getClientPortalApprovalsEndpoint,
  type GetClientPortalApprovalsEndpointDependencies,
  type GetClientPortalApprovalsEndpointRequest,
  type GetClientPortalApprovalsEndpointResponse,
} from "./get_client_portal_approvals_endpoint.ts";
import {
  getClientPortalDocumentsEndpoint,
  type GetClientPortalDocumentsEndpointDependencies,
  type GetClientPortalDocumentsEndpointRequest,
  type GetClientPortalDocumentsEndpointResponse,
} from "./get_client_portal_documents_endpoint.ts";
import {
  getClientPortalOnboardingEndpoint,
  type GetClientPortalOnboardingEndpointDependencies,
  type GetClientPortalOnboardingEndpointRequest,
  type GetClientPortalOnboardingEndpointResponse,
} from "./get_client_portal_onboarding_endpoint.ts";
import {
  getClientPortalWorkspaceEndpoint,
  type GetClientPortalWorkspaceEndpointDependencies,
  type GetClientPortalWorkspaceEndpointRequest,
  type GetClientPortalWorkspaceEndpointResponse,
} from "./get_client_portal_workspace_endpoint.ts";

export const getClientPortalWorkspaceRoutePath =
  "/v1/client-portal/workspace" as const;
export const getClientPortalDocumentsRoutePath =
  "/v1/client-portal/documents" as const;
export const getClientPortalApprovalsRoutePath =
  "/v1/client-portal/approvals" as const;
export const getClientPortalOnboardingRoutePath =
  "/v1/client-portal/onboarding" as const;
export const getClientPortalActivityRoutePath =
  "/v1/client-portal/activity" as const;

export type ClientPortalReadRoutePath =
  | typeof getClientPortalActivityRoutePath
  | typeof getClientPortalApprovalsRoutePath
  | typeof getClientPortalDocumentsRoutePath
  | typeof getClientPortalOnboardingRoutePath
  | typeof getClientPortalWorkspaceRoutePath;

export type ClientPortalReadRouteDependencies =
  GetClientPortalWorkspaceEndpointDependencies &
    GetClientPortalDocumentsEndpointDependencies &
    GetClientPortalApprovalsEndpointDependencies &
    GetClientPortalOnboardingEndpointDependencies &
    GetClientPortalActivityEndpointDependencies;

export type ClientPortalReadRouteHandlers = {
  activity: (
    request: GetClientPortalActivityEndpointRequest,
  ) => Promise<GetClientPortalActivityEndpointResponse>;
  approvals: (
    request: GetClientPortalApprovalsEndpointRequest,
  ) => Promise<GetClientPortalApprovalsEndpointResponse>;
  documents: (
    request: GetClientPortalDocumentsEndpointRequest,
  ) => Promise<GetClientPortalDocumentsEndpointResponse>;
  onboarding: (
    request: GetClientPortalOnboardingEndpointRequest,
  ) => Promise<GetClientPortalOnboardingEndpointResponse>;
  workspace: (
    request: GetClientPortalWorkspaceEndpointRequest,
  ) => Promise<GetClientPortalWorkspaceEndpointResponse>;
};

type AnyClientPortalReadRouteHandler = (request: never) => Promise<unknown>;

export type ClientPortalReadRouteRegistry =
  | {
      get: (
        path: ClientPortalReadRoutePath,
        handler: AnyClientPortalReadRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: AnyClientPortalReadRouteHandler;
        method: "GET";
        path: ClientPortalReadRoutePath;
      }) => void;
    };

function registerGet(
  registry: ClientPortalReadRouteRegistry,
  path: ClientPortalReadRoutePath,
  handler: AnyClientPortalReadRouteHandler,
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

export function registerClientPortalReadRoutes(
  registry: ClientPortalReadRouteRegistry,
  dependencies: ClientPortalReadRouteDependencies,
) {
  const handlers = {
    activity: (request) => getClientPortalActivityEndpoint(request, dependencies),
    approvals: (request) => getClientPortalApprovalsEndpoint(request, dependencies),
    documents: (request) => getClientPortalDocumentsEndpoint(request, dependencies),
    onboarding: (request) => getClientPortalOnboardingEndpoint(request, dependencies),
    workspace: (request) => getClientPortalWorkspaceEndpoint(request, dependencies),
  } satisfies ClientPortalReadRouteHandlers;

  registerGet(
    registry,
    getClientPortalWorkspaceRoutePath,
    handlers.workspace as AnyClientPortalReadRouteHandler,
  );
  registerGet(
    registry,
    getClientPortalDocumentsRoutePath,
    handlers.documents as AnyClientPortalReadRouteHandler,
  );
  registerGet(
    registry,
    getClientPortalApprovalsRoutePath,
    handlers.approvals as AnyClientPortalReadRouteHandler,
  );
  registerGet(
    registry,
    getClientPortalOnboardingRoutePath,
    handlers.onboarding as AnyClientPortalReadRouteHandler,
  );
  registerGet(
    registry,
    getClientPortalActivityRoutePath,
    handlers.activity as AnyClientPortalReadRouteHandler,
  );
  return handlers;
}
