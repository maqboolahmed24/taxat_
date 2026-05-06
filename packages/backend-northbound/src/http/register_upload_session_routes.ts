import {
  getUploadSessionStatusEndpoint,
  type GetUploadSessionStatusEndpointDependencies,
  type GetUploadSessionStatusEndpointRequest,
  type GetUploadSessionStatusEndpointResponse,
} from "./get_upload_session_status_endpoint.ts";
import {
  postUploadSessionsEndpoint,
  type PostUploadSessionsEndpointDependencies,
  type PostUploadSessionsEndpointRequest,
  type PostUploadSessionsEndpointResponse,
} from "./post_upload_sessions_endpoint.ts";
import {
  putUploadBlobEndpoint,
  type PutUploadBlobEndpointDependencies,
  type PutUploadBlobEndpointRequest,
  type PutUploadBlobEndpointResponse,
} from "./put_upload_blob_endpoint.ts";

export const postUploadSessionsRoutePath = "/v1/uploads/sessions" as const;
export const getUploadSessionStatusRoutePath =
  "/v1/uploads/sessions/{upload_session_id}" as const;
export const putUploadBlobRoutePath =
  "/v1/uploads/sessions/{upload_session_id}/blob" as const;

export type UploadSessionRoutePath =
  | typeof getUploadSessionStatusRoutePath
  | typeof postUploadSessionsRoutePath
  | typeof putUploadBlobRoutePath;

export type UploadSessionRouteDependencies =
  GetUploadSessionStatusEndpointDependencies &
    PostUploadSessionsEndpointDependencies &
    PutUploadBlobEndpointDependencies;

export type UploadSessionRouteHandlers = {
  getStatus: (
    request: GetUploadSessionStatusEndpointRequest,
  ) => Promise<GetUploadSessionStatusEndpointResponse>;
  postSessions: (
    request: PostUploadSessionsEndpointRequest,
  ) => Promise<PostUploadSessionsEndpointResponse>;
  putBlob: (request: PutUploadBlobEndpointRequest) => Promise<PutUploadBlobEndpointResponse>;
};

type AnyUploadSessionRouteHandler = (request: never) => Promise<unknown>;

export type UploadSessionRouteRegistry =
  | {
      get: (
        path: typeof getUploadSessionStatusRoutePath,
        handler: AnyUploadSessionRouteHandler,
      ) => void;
      post: (
        path: typeof postUploadSessionsRoutePath,
        handler: AnyUploadSessionRouteHandler,
      ) => void;
      put: (
        path: typeof putUploadBlobRoutePath,
        handler: AnyUploadSessionRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: AnyUploadSessionRouteHandler;
        method: "GET" | "POST" | "PUT";
        path: UploadSessionRoutePath;
      }) => void;
    };

function registerRoute(
  registry: UploadSessionRouteRegistry,
  method: "GET" | "POST" | "PUT",
  path: UploadSessionRoutePath,
  handler: AnyUploadSessionRouteHandler,
) {
  if ("register" in registry) {
    registry.register({ handler, method, path });
    return;
  }
  if (method === "GET") {
    registry.get(path as typeof getUploadSessionStatusRoutePath, handler);
    return;
  }
  if (method === "POST") {
    registry.post(path as typeof postUploadSessionsRoutePath, handler);
    return;
  }
  registry.put(path as typeof putUploadBlobRoutePath, handler);
}

export function registerUploadSessionRoutes(
  registry: UploadSessionRouteRegistry,
  dependencies: UploadSessionRouteDependencies,
) {
  const handlers = {
    getStatus: (request) => getUploadSessionStatusEndpoint(request, dependencies),
    postSessions: (request) => postUploadSessionsEndpoint(request, dependencies),
    putBlob: (request) => putUploadBlobEndpoint(request, dependencies),
  } satisfies UploadSessionRouteHandlers;

  registerRoute(
    registry,
    "POST",
    postUploadSessionsRoutePath,
    handlers.postSessions as AnyUploadSessionRouteHandler,
  );
  registerRoute(
    registry,
    "PUT",
    putUploadBlobRoutePath,
    handlers.putBlob as AnyUploadSessionRouteHandler,
  );
  registerRoute(
    registry,
    "GET",
    getUploadSessionStatusRoutePath,
    handlers.getStatus as AnyUploadSessionRouteHandler,
  );
  return handlers;
}
