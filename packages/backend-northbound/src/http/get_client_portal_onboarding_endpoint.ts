import { getClientPortalOnboardingView } from "../query/get_client_portal_onboarding_view.ts";
import {
  runClientPortalReadEndpoint,
  type GetClientPortalEndpointDependencies,
  type GetClientPortalEndpointRequest,
  type GetClientPortalEndpointResponse,
} from "./get_client_portal_workspace_endpoint.ts";

export type GetClientPortalOnboardingEndpointRequest = GetClientPortalEndpointRequest;
export type GetClientPortalOnboardingEndpointResponse = GetClientPortalEndpointResponse;
export type GetClientPortalOnboardingEndpointDependencies =
  GetClientPortalEndpointDependencies;

export async function getClientPortalOnboardingEndpoint(
  request: GetClientPortalOnboardingEndpointRequest,
  dependencies: GetClientPortalOnboardingEndpointDependencies,
): Promise<GetClientPortalOnboardingEndpointResponse> {
  return runClientPortalReadEndpoint({
    dependencies,
    endpointKind: "onboarding",
    loadWorkspace: getClientPortalOnboardingView,
    request,
    routeSurface: "CLIENT_PORTAL_ONBOARDING",
  });
}
