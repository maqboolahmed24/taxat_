import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { WorkspaceViewerScope } from "../../../backend-workflow/src/projectors/projection_contract_helpers.ts";
import {
  WorkspaceSnapshotRepository,
  type StoredWorkspaceSnapshot,
} from "../../../backend-workflow/src/repositories/workspace_snapshot_repository.ts";
import {
  applyWorkspaceSnapshotConditionalRequest,
} from "../services/build_workspace_stability_contract.ts";
import {
  buildWorkspaceProblemEnvelope,
  workspaceReadNoStoreHeaders,
  type WorkspaceReadProblemResponse,
} from "../services/build_workspace_problem_envelope.ts";
import {
  defaultViewerScopeForActor,
  getWorkspaceSnapshot,
  viewerScopeFromAudience,
  WorkspaceReadError,
  type WorkspaceSnapshotRepositoryLike,
} from "../query/get_workspace_snapshot.ts";

export type CollaborationReadRouteSurface =
  | "COLLABORATION_ACTIVITY"
  | "COLLABORATION_ATTACHMENTS"
  | "WORKSPACE_SNAPSHOT"
  | "WORKSPACE_STREAM";

export type CollaborationReadAuthorization =
  | {
      authorized: true;
      reasonCodes?: string[];
    }
  | {
      authorized: false;
      hidden?: true;
      reasonCodes?: string[];
    };

export type CollaborationReadAuthorizer = (input: {
  actorContext: NorthboundActorContext;
  itemId: string;
  principalClass?: string | null;
  routeSurface: CollaborationReadRouteSurface;
  storedSnapshot: StoredWorkspaceSnapshot | null;
  viewerScope: WorkspaceViewerScope;
}) =>
  | CollaborationReadAuthorization
  | Promise<CollaborationReadAuthorization>;

export type GetWorkItemWorkspaceSnapshotEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  ifNoneMatch?: string | null;
  itemId?: string;
  method?: string;
  path?: string;
  principalClass?: string | null;
  viewerScope?: WorkspaceViewerScope;
};

export type GetWorkItemWorkspaceSnapshotEndpointResponse =
  | {
      body: StoredWorkspaceSnapshot["record"];
      headers: typeof workspaceReadNoStoreHeaders & {
        ETag: string;
      };
      snapshotRef: string;
      status: 200;
    }
  | {
      body: null;
      headers: typeof workspaceReadNoStoreHeaders & {
        ETag: string;
      };
      snapshotRef: string;
      status: 304;
    }
  | {
      body: ProblemEnvelope;
      headers: WorkspaceReadProblemResponse["headers"];
      status: number;
    };

export type GetWorkItemWorkspaceSnapshotEndpointDependencies = {
  authorizeRead?: CollaborationReadAuthorizer;
  workspaceSnapshotRepository: WorkspaceSnapshotRepositoryLike;
};

const snapshotPathPattern = /^\/v1\/work-items\/([^/]+)\/workspace\/snapshot$/;

function correlationId(request: { correlationId?: string }) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function requestUrl(path: string | undefined, fallbackPath: string) {
  try {
    return new URL(path ?? fallbackPath, "http://taxat.local");
  } catch {
    return null;
  }
}

export function parseWorkItemWorkspaceSnapshotPath(input: {
  itemId?: string;
  path?: string;
}) {
  if (input.itemId !== undefined && input.itemId.length > 0) {
    return {
      itemId: input.itemId,
      viewerScope: null,
    };
  }
  const url = requestUrl(input.path, "/v1/work-items//workspace/snapshot");
  if (url === null) {
    return null;
  }
  const match = snapshotPathPattern.exec(url.pathname);
  if (match === null) {
    return null;
  }
  try {
    return {
      itemId: decodeURIComponent(match[1]),
      viewerScope: viewerScopeFromAudience(url.searchParams.get("viewer")),
    };
  } catch {
    return null;
  }
}

export function resolveWorkspaceViewerScope(input: {
  actorContext: NorthboundActorContext;
  path?: string;
  viewerScope?: WorkspaceViewerScope;
}) {
  if (input.viewerScope !== undefined) {
    return input.viewerScope;
  }
  const url = requestUrl(input.path, "/");
  const routeViewer = viewerScopeFromAudience(url?.searchParams.get("viewer"));
  return routeViewer ?? defaultViewerScopeForActor(input.actorContext);
}

export async function authorizeCollaborationReadScope(input: {
  actorContext: NorthboundActorContext;
  itemId: string;
  principalClass?: string | null;
  routeSurface: CollaborationReadRouteSurface;
  storedSnapshot: StoredWorkspaceSnapshot | null;
  viewerScope: WorkspaceViewerScope;
}): Promise<CollaborationReadAuthorization> {
  if (input.storedSnapshot !== null && input.storedSnapshot.tenant_id !== input.actorContext.tenant_id) {
    return {
      authorized: false,
      hidden: true,
      reasonCodes: ["WORKSPACE_TENANT_NOT_VISIBLE"],
    };
  }
  const principalClass = input.principalClass ?? "";
  const isClientPrincipal =
    input.actorContext.client_id_or_null !== null ||
    /^CLIENT|^CUSTOMER|^SUBJECT/.test(principalClass);
  if (input.viewerScope === "CUSTOMER_VISIBLE") {
    return isClientPrincipal
      ? {
          authorized: true,
          reasonCodes: ["WORKSPACE_CUSTOMER_READ_AUTHORIZED"],
        }
      : {
          authorized: false,
          hidden: true,
          reasonCodes: ["WORKSPACE_CUSTOMER_SCOPE_REQUIRED"],
        };
  }
  return isClientPrincipal
    ? {
        authorized: false,
        hidden: true,
        reasonCodes: ["WORKSPACE_STAFF_SCOPE_REQUIRED"],
      }
    : {
        authorized: true,
        reasonCodes: ["WORKSPACE_STAFF_READ_AUTHORIZED"],
      };
}

async function latestForAuthorization(input: {
  itemId: string;
  repository: WorkspaceSnapshotRepositoryLike;
  viewerScope: WorkspaceViewerScope;
}) {
  return input.repository.getLatestWorkspaceSnapshotForItem({
    item_id: input.itemId,
    viewer_scope: input.viewerScope,
  });
}

function etagHeaders(etag: string) {
  return {
    ...workspaceReadNoStoreHeaders,
    ETag: etag,
  };
}

function problem(input: {
  correlationId: string;
  detailOverride?: string | null;
  error?: unknown;
  itemId: string | null;
  kind: Parameters<typeof buildWorkspaceProblemEnvelope>[0]["kind"];
  latestWorkspaceSnapshotRef?: string | null;
  reasonCodes?: readonly string[];
  tenantId?: string | null;
}) {
  return buildWorkspaceProblemEnvelope({
    correlationId: input.correlationId,
    detailOverride:
      input.detailOverride ??
      (input.error instanceof Error
        ? input.error.message
        : input.error === undefined
          ? null
          : String(input.error)),
    itemId: input.itemId,
    kind: input.kind,
    latestWorkspaceSnapshotRef: input.latestWorkspaceSnapshotRef,
    reasonCodes: input.reasonCodes,
    tenantId: input.tenantId,
  });
}

export async function getWorkItemWorkspaceSnapshotEndpoint(
  request: GetWorkItemWorkspaceSnapshotEndpointRequest,
  dependencies: GetWorkItemWorkspaceSnapshotEndpointDependencies,
): Promise<GetWorkItemWorkspaceSnapshotEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "METHOD_INVALID",
    });
  }
  const parsed = parseWorkItemWorkspaceSnapshotPath(request);
  if (parsed === null || parsed.itemId.length === 0) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "ROUTE_INVALID",
    });
  }
  const viewerScope =
    request.viewerScope ??
    parsed.viewerScope ??
    resolveWorkspaceViewerScope({
      actorContext: request.actorContext,
      path: request.path,
    });
  const storedForAuth = await latestForAuthorization({
    itemId: parsed.itemId,
    repository: dependencies.workspaceSnapshotRepository,
    viewerScope,
  });
  const authorizeRead =
    dependencies.authorizeRead ?? authorizeCollaborationReadScope;
  const authorization = await authorizeRead({
    actorContext: request.actorContext,
    itemId: parsed.itemId,
    principalClass: request.principalClass,
    routeSurface: "WORKSPACE_SNAPSHOT",
    storedSnapshot: storedForAuth,
    viewerScope,
  });
  if (!authorization.authorized) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: parsed.itemId,
      kind: "HIDDEN",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      reasonCodes: authorization.reasonCodes,
      tenantId: request.actorContext.tenant_id,
    });
  }

  try {
    const stored = await getWorkspaceSnapshot({
      actorContext: request.actorContext,
      itemId: parsed.itemId,
      repository: dependencies.workspaceSnapshotRepository,
      viewerScope,
    });
    const conditional = applyWorkspaceSnapshotConditionalRequest({
      ifNoneMatch: request.ifNoneMatch,
      workspaceVersion: stored.record.workspace_version,
    });
    if (conditional.status === "NOT_MODIFIED") {
      return {
        body: null,
        headers: etagHeaders(conditional.etag),
        snapshotRef: stored.snapshot_ref,
        status: 304,
      };
    }
    return {
      body: stored.record,
      headers: etagHeaders(conditional.etag),
      snapshotRef: stored.snapshot_ref,
      status: 200,
    };
  } catch (error) {
    if (error instanceof WorkspaceReadError) {
      return problem({
        correlationId: requestCorrelationId,
        error,
        itemId: parsed.itemId,
        kind: error.kind,
        latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
        reasonCodes: error.reasonCodes,
        tenantId: request.actorContext.tenant_id,
      });
    }
    return problem({
      correlationId: requestCorrelationId,
      error,
      itemId: parsed.itemId,
      kind: "CORRUPT",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      tenantId: request.actorContext.tenant_id,
    });
  }
}

export function createGetWorkItemWorkspaceSnapshotEndpointDependencies(input: {
  authorizeRead?: CollaborationReadAuthorizer;
  workspaceSnapshotRepository?: WorkspaceSnapshotRepositoryLike;
} = {}): GetWorkItemWorkspaceSnapshotEndpointDependencies {
  const dependencies = {
    workspaceSnapshotRepository:
      input.workspaceSnapshotRepository ?? new WorkspaceSnapshotRepository(),
  } as GetWorkItemWorkspaceSnapshotEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  return dependencies;
}
