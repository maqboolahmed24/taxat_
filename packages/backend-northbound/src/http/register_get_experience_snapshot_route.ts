import {
  getExperienceSnapshotEndpoint,
  type GetExperienceSnapshotEndpointDependencies,
  type GetExperienceSnapshotEndpointRequest,
} from "./get_experience_snapshot_endpoint.ts";

export const getExperienceSnapshotRoutePath =
  "/v1/manifests/{manifest_id}/experience/snapshot" as const;

export type GetExperienceSnapshotRouteHandler = (
  request: GetExperienceSnapshotEndpointRequest,
) => Promise<Awaited<ReturnType<typeof getExperienceSnapshotEndpoint>>>;

export type GetExperienceSnapshotRouteRegistry =
  | {
      get: (
        path: typeof getExperienceSnapshotRoutePath,
        handler: GetExperienceSnapshotRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: GetExperienceSnapshotRouteHandler;
        method: "GET";
        path: typeof getExperienceSnapshotRoutePath;
      }) => void;
    };

export function registerGetExperienceSnapshotRoute(
  registry: GetExperienceSnapshotRouteRegistry,
  dependencies: GetExperienceSnapshotEndpointDependencies,
) {
  const handler: GetExperienceSnapshotRouteHandler = (request) =>
    getExperienceSnapshotEndpoint(request, dependencies);
  if ("get" in registry) {
    registry.get(getExperienceSnapshotRoutePath, handler);
    return handler;
  }
  registry.register({
    handler,
    method: "GET",
    path: getExperienceSnapshotRoutePath,
  });
  return handler;
}
