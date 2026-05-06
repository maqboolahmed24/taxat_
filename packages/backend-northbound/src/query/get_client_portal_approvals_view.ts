import {
  getClientPortalRouteWorkspace,
  type ClientPortalRouteQueryInput,
  type ClientPortalWorkspaceRepositoryLike,
} from "./get_client_portal_workspace.ts";

export async function getClientPortalApprovalsView(input: {
  clientId: string;
  clientPortalWorkspaceRepository: ClientPortalWorkspaceRepositoryLike;
  query?: ClientPortalRouteQueryInput;
  tenantId: string;
}) {
  return getClientPortalRouteWorkspace({
    ...input,
    requestedRoute: "APPROVALS",
  });
}
