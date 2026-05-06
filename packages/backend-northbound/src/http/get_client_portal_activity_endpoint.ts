import { getClientPortalActivityView } from "../query/get_client_portal_activity_view.ts";
import {
  runClientPortalReadEndpoint,
  type GetClientPortalEndpointDependencies,
  type GetClientPortalEndpointRequest,
  type GetClientPortalEndpointResponse,
} from "./get_client_portal_workspace_endpoint.ts";

export type GetClientPortalActivityEndpointRequest = GetClientPortalEndpointRequest;
export type GetClientPortalActivityEndpointResponse = GetClientPortalEndpointResponse;
export type GetClientPortalActivityEndpointDependencies =
  GetClientPortalEndpointDependencies;

export async function getClientPortalActivityEndpoint(
  request: GetClientPortalActivityEndpointRequest,
  dependencies: GetClientPortalActivityEndpointDependencies,
): Promise<GetClientPortalActivityEndpointResponse> {
  return runClientPortalReadEndpoint({
    dependencies,
    endpointKind: "activity",
    loadWorkspace: getClientPortalActivityView,
    request,
    routeSurface: "CLIENT_PORTAL_ACTIVITY",
  });
}
