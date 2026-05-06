import {
  deriveClientPortalRouteWorkspace,
  type ClientPortalRouteCode,
  type ClientPortalRouteQueryInput,
  type ClientPortalWorkspaceRecord,
} from "../../../backend-portal/src/index.ts";
import {
  enforceCustomerSafeProjectionForPortal,
  ClientPortalWorkspacePublicationError,
} from "../services/enforce_customer_safe_projection_for_portal.ts";
export type {
  ClientPortalRouteCode,
  ClientPortalRouteQueryInput,
  ClientPortalWorkspaceRecord,
} from "../../../backend-portal/src/index.ts";

export type StoredClientPortalWorkspaceRecord = {
  client_id: string;
  persisted_at: string;
  source_refs: string[];
  tenant_id: string;
  workspace: ClientPortalWorkspaceRecord;
  workspace_ref: string;
  workspace_version: number;
};

export type PersistClientPortalWorkspaceInput = {
  persistedAt?: string;
  sourceRefs?: readonly string[];
  workspace: ClientPortalWorkspaceRecord;
  workspaceRef?: string;
};

export type ClientPortalWorkspaceRepositoryLike = {
  listWorkspacesByClient: (
    tenantId: string,
    clientId: string,
  ) =>
    | Promise<StoredClientPortalWorkspaceRecord[]>
    | StoredClientPortalWorkspaceRecord[];
};

export class ClientPortalWorkspaceRepository
  implements ClientPortalWorkspaceRepositoryLike
{
  readonly #workspacesByTenantClient = new Map<string, StoredClientPortalWorkspaceRecord[]>();

  async persistWorkspace(input: PersistClientPortalWorkspaceInput) {
    const workspace = enforceCustomerSafeProjectionForPortal(input.workspace);
    const stored = {
      client_id: workspace.client_id,
      persisted_at: input.persistedAt ?? workspace.updated_at,
      source_refs: [...(input.sourceRefs ?? [])],
      tenant_id: workspace.tenant_id,
      workspace,
      workspace_ref: input.workspaceRef ?? `client-portal-workspace://${workspace.workspace_id}`,
      workspace_version: workspace.workspace_version,
    } satisfies StoredClientPortalWorkspaceRecord;
    const key = tenantClientKey(workspace.tenant_id, workspace.client_id);
    const existing = this.#workspacesByTenantClient.get(key) ?? [];
    this.#workspacesByTenantClient.set(key, [...existing, stored]);
    return stored;
  }

  async listWorkspacesByClient(tenantId: string, clientId: string) {
    return [...(this.#workspacesByTenantClient.get(tenantClientKey(tenantId, clientId)) ?? [])];
  }
}

function tenantClientKey(tenantId: string, clientId: string) {
  return `${tenantId}\u0000${clientId}`;
}

function persistedAtEpoch(record: StoredClientPortalWorkspaceRecord) {
  const value = Date.parse(record.persisted_at);
  return Number.isFinite(value) ? value : 0;
}

function sortByCurrentWorkspaceOrder(
  left: StoredClientPortalWorkspaceRecord,
  right: StoredClientPortalWorkspaceRecord,
) {
  if (left.workspace_version !== right.workspace_version) {
    return left.workspace_version - right.workspace_version;
  }
  return persistedAtEpoch(left) - persistedAtEpoch(right);
}

function projectClientPortalRouteWorkspace(input: {
  query?: ClientPortalRouteQueryInput;
  requestedRoute: ClientPortalRouteCode;
  stored: StoredClientPortalWorkspaceRecord;
}) {
  return enforceCustomerSafeProjectionForPortal(
    deriveClientPortalRouteWorkspace({
      query: input.query,
      requestedRoute: input.requestedRoute,
      workspace: input.stored.workspace,
    }),
  );
}

export async function getClientPortalRouteWorkspace(input: {
  clientId: string;
  clientPortalWorkspaceRepository: ClientPortalWorkspaceRepositoryLike;
  query?: ClientPortalRouteQueryInput;
  requestedRoute: ClientPortalRouteCode;
  tenantId: string;
}) {
  const workspaces =
    await input.clientPortalWorkspaceRepository.listWorkspacesByClient(
      input.tenantId,
      input.clientId,
    );
  const latest = workspaces.sort(sortByCurrentWorkspaceOrder).at(-1) ?? null;
  if (latest === null) {
    return null;
  }
  try {
    return {
      source_refs: latest.source_refs,
      workspace: projectClientPortalRouteWorkspace({
        query: input.query,
        requestedRoute: input.requestedRoute,
        stored: latest,
      }),
      workspace_ref: latest.workspace_ref,
    };
  } catch (error) {
    if (error instanceof ClientPortalWorkspacePublicationError) {
      throw error;
    }
    throw new ClientPortalWorkspacePublicationError(
      "CLIENT_PORTAL_WORKSPACE_INVALID",
      error instanceof Error ? error.message : String(error),
      ["CLIENT_PORTAL_ROUTE_DERIVATION_INVALID"],
    );
  }
}

export async function getClientPortalWorkspace(input: {
  clientId: string;
  clientPortalWorkspaceRepository: ClientPortalWorkspaceRepositoryLike;
  query?: ClientPortalRouteQueryInput;
  tenantId: string;
}) {
  return getClientPortalRouteWorkspace({
    ...input,
    requestedRoute: "HOME",
  });
}
