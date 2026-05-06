import {
  getGovernanceAuditInvestigationsEndpoint,
  type GetGovernanceAuditInvestigationsEndpointDependencies,
  type GetGovernanceAuditInvestigationsEndpointRequest,
  type GetGovernanceAuditInvestigationsEndpointResponse,
} from "./get_governance_audit_investigations_endpoint.ts";
import {
  getManifestAuditTrailEndpoint,
  type GetManifestAuditTrailEndpointDependencies,
  type GetManifestAuditTrailEndpointRequest,
  type GetManifestAuditTrailEndpointResponse,
} from "./get_manifest_audit_trail_endpoint.ts";
import {
  getManifestEnquiryPackEndpoint,
  type GetManifestEnquiryPackEndpointDependencies,
  type GetManifestEnquiryPackEndpointRequest,
  type GetManifestEnquiryPackEndpointResponse,
} from "./get_manifest_enquiry_pack_endpoint.ts";

export const getManifestAuditTrailRoutePath =
  "/v1/manifests/{manifest_id}/audit-trail" as const;
export const getManifestEnquiryPackRoutePath =
  "/v1/manifests/{manifest_id}/enquiry-pack" as const;
export const getGovernanceAuditInvestigationsRoutePath =
  "/v1/governance/tenants/{tenant_id}/audit-investigations" as const;

export type AuditAndEnquiryRoutePath =
  | typeof getGovernanceAuditInvestigationsRoutePath
  | typeof getManifestAuditTrailRoutePath
  | typeof getManifestEnquiryPackRoutePath;

export type AuditAndEnquiryRouteDependencies =
  GetGovernanceAuditInvestigationsEndpointDependencies &
    GetManifestAuditTrailEndpointDependencies &
    GetManifestEnquiryPackEndpointDependencies;

export type AuditAndEnquiryRouteHandlers = {
  governanceAuditInvestigations: (
    request: GetGovernanceAuditInvestigationsEndpointRequest,
  ) => Promise<GetGovernanceAuditInvestigationsEndpointResponse>;
  manifestAuditTrail: (
    request: GetManifestAuditTrailEndpointRequest,
  ) => Promise<GetManifestAuditTrailEndpointResponse>;
  manifestEnquiryPack: (
    request: GetManifestEnquiryPackEndpointRequest,
  ) => Promise<GetManifestEnquiryPackEndpointResponse>;
};

type AnyAuditAndEnquiryRouteHandler = (request: never) => Promise<unknown>;

export type AuditAndEnquiryRouteRegistry =
  | {
      get: (path: AuditAndEnquiryRoutePath, handler: AnyAuditAndEnquiryRouteHandler) => void;
    }
  | {
      register: (route: {
        handler: AnyAuditAndEnquiryRouteHandler;
        method: "GET";
        path: AuditAndEnquiryRoutePath;
      }) => void;
    };

function registerGet(
  registry: AuditAndEnquiryRouteRegistry,
  path: AuditAndEnquiryRoutePath,
  handler: AnyAuditAndEnquiryRouteHandler,
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

export function registerAuditAndEnquiryRoutes(
  registry: AuditAndEnquiryRouteRegistry,
  dependencies: AuditAndEnquiryRouteDependencies,
) {
  const handlers = {
    governanceAuditInvestigations: (request) =>
      getGovernanceAuditInvestigationsEndpoint(request, dependencies),
    manifestAuditTrail: (request) =>
      getManifestAuditTrailEndpoint(request, dependencies),
    manifestEnquiryPack: (request) =>
      getManifestEnquiryPackEndpoint(request, dependencies),
  } satisfies AuditAndEnquiryRouteHandlers;

  registerGet(
    registry,
    getManifestAuditTrailRoutePath,
    handlers.manifestAuditTrail as AnyAuditAndEnquiryRouteHandler,
  );
  registerGet(
    registry,
    getManifestEnquiryPackRoutePath,
    handlers.manifestEnquiryPack as AnyAuditAndEnquiryRouteHandler,
  );
  registerGet(
    registry,
    getGovernanceAuditInvestigationsRoutePath,
    handlers.governanceAuditInvestigations as AnyAuditAndEnquiryRouteHandler,
  );
  return handlers;
}
