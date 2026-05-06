import { getClientPortalDocumentsView } from "../query/get_client_portal_documents_view.ts";
import {
  runClientPortalReadEndpoint,
  type GetClientPortalEndpointDependencies,
  type GetClientPortalEndpointRequest,
  type GetClientPortalEndpointResponse,
} from "./get_client_portal_workspace_endpoint.ts";

export type GetClientPortalDocumentsEndpointRequest = GetClientPortalEndpointRequest;
export type GetClientPortalDocumentsEndpointResponse = GetClientPortalEndpointResponse;
export type GetClientPortalDocumentsEndpointDependencies =
  GetClientPortalEndpointDependencies;

export async function getClientPortalDocumentsEndpoint(
  request: GetClientPortalDocumentsEndpointRequest,
  dependencies: GetClientPortalDocumentsEndpointDependencies,
): Promise<GetClientPortalDocumentsEndpointResponse> {
  return runClientPortalReadEndpoint({
    dependencies,
    endpointKind: "documents",
    loadWorkspace: getClientPortalDocumentsView,
    request,
    routeSurface: "CLIENT_PORTAL_DOCUMENTS",
  });
}
