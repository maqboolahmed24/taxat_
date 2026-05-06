import { getClientPortalApprovalsView } from "../query/get_client_portal_approvals_view.ts";
import {
  runClientPortalReadEndpoint,
  type GetClientPortalEndpointDependencies,
  type GetClientPortalEndpointRequest,
  type GetClientPortalEndpointResponse,
} from "./get_client_portal_workspace_endpoint.ts";

export type GetClientPortalApprovalsEndpointRequest = GetClientPortalEndpointRequest;
export type GetClientPortalApprovalsEndpointResponse = GetClientPortalEndpointResponse;
export type GetClientPortalApprovalsEndpointDependencies =
  GetClientPortalEndpointDependencies;

export async function getClientPortalApprovalsEndpoint(
  request: GetClientPortalApprovalsEndpointRequest,
  dependencies: GetClientPortalApprovalsEndpointDependencies,
): Promise<GetClientPortalApprovalsEndpointResponse> {
  return runClientPortalReadEndpoint({
    dependencies,
    endpointKind: "approvals",
    loadWorkspace: getClientPortalApprovalsView,
    request,
    routeSurface: "CLIENT_PORTAL_APPROVALS",
  });
}
