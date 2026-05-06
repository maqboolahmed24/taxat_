import {
  getCollaborationActivityEndpoint,
  type GetCollaborationActivityEndpointDependencies,
  type GetCollaborationActivityEndpointRequest,
  type GetCollaborationActivityEndpointResponse,
} from "./get_collaboration_activity_endpoint.ts";
import {
  getCollaborationAttachmentsEndpoint,
  type GetCollaborationAttachmentsEndpointDependencies,
  type GetCollaborationAttachmentsEndpointRequest,
  type GetCollaborationAttachmentsEndpointResponse,
} from "./get_collaboration_attachments_endpoint.ts";
import {
  getWorkItemWorkspaceSnapshotEndpoint,
  type GetWorkItemWorkspaceSnapshotEndpointDependencies,
  type GetWorkItemWorkspaceSnapshotEndpointRequest,
  type GetWorkItemWorkspaceSnapshotEndpointResponse,
} from "./get_work_item_workspace_snapshot_endpoint.ts";
import {
  getWorkItemWorkspaceStreamEndpoint,
  type GetWorkItemWorkspaceStreamEndpointDependencies,
  type GetWorkItemWorkspaceStreamEndpointRequest,
  type GetWorkItemWorkspaceStreamEndpointResponse,
} from "./get_work_item_workspace_stream_endpoint.ts";

export const getWorkItemWorkspaceSnapshotRoutePath =
  "/v1/work-items/{item_id}/workspace/snapshot" as const;
export const getWorkItemWorkspaceStreamRoutePath =
  "/v1/work-items/{item_id}/workspace/stream" as const;
export const getCollaborationActivityRoutePath =
  "/v1/work-items/{item_id}/activity" as const;
export const getCollaborationAttachmentsRoutePath =
  "/v1/work-items/{item_id}/attachments" as const;

export type CollaborationReadRoutePath =
  | typeof getCollaborationActivityRoutePath
  | typeof getCollaborationAttachmentsRoutePath
  | typeof getWorkItemWorkspaceSnapshotRoutePath
  | typeof getWorkItemWorkspaceStreamRoutePath;

export type CollaborationReadRouteDependencies =
  GetWorkItemWorkspaceSnapshotEndpointDependencies &
    GetWorkItemWorkspaceStreamEndpointDependencies &
    GetCollaborationActivityEndpointDependencies &
    GetCollaborationAttachmentsEndpointDependencies;

export type CollaborationReadRouteHandlers = {
  activity: (
    request: GetCollaborationActivityEndpointRequest,
  ) => Promise<GetCollaborationActivityEndpointResponse>;
  attachments: (
    request: GetCollaborationAttachmentsEndpointRequest,
  ) => Promise<GetCollaborationAttachmentsEndpointResponse>;
  snapshot: (
    request: GetWorkItemWorkspaceSnapshotEndpointRequest,
  ) => Promise<GetWorkItemWorkspaceSnapshotEndpointResponse>;
  stream: (
    request: GetWorkItemWorkspaceStreamEndpointRequest,
  ) => Promise<GetWorkItemWorkspaceStreamEndpointResponse>;
};

type AnyCollaborationReadRouteHandler = (request: never) => Promise<unknown>;

export type CollaborationReadRouteRegistry =
  | {
      get: (
        path: CollaborationReadRoutePath,
        handler: AnyCollaborationReadRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: AnyCollaborationReadRouteHandler;
        method: "GET";
        path: CollaborationReadRoutePath;
      }) => void;
    };

function registerGet(
  registry: CollaborationReadRouteRegistry,
  path: CollaborationReadRoutePath,
  handler: AnyCollaborationReadRouteHandler,
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

export function registerCollaborationReadRoutes(
  registry: CollaborationReadRouteRegistry,
  dependencies: CollaborationReadRouteDependencies,
) {
  const handlers = {
    activity: (request) => getCollaborationActivityEndpoint(request, dependencies),
    attachments: (request) => getCollaborationAttachmentsEndpoint(request, dependencies),
    snapshot: (request) => getWorkItemWorkspaceSnapshotEndpoint(request, dependencies),
    stream: (request) => getWorkItemWorkspaceStreamEndpoint(request, dependencies),
  } satisfies CollaborationReadRouteHandlers;

  registerGet(
    registry,
    getWorkItemWorkspaceSnapshotRoutePath,
    handlers.snapshot as AnyCollaborationReadRouteHandler,
  );
  registerGet(
    registry,
    getWorkItemWorkspaceStreamRoutePath,
    handlers.stream as AnyCollaborationReadRouteHandler,
  );
  registerGet(
    registry,
    getCollaborationActivityRoutePath,
    handlers.activity as AnyCollaborationReadRouteHandler,
  );
  registerGet(
    registry,
    getCollaborationAttachmentsRoutePath,
    handlers.attachments as AnyCollaborationReadRouteHandler,
  );
  return handlers;
}
