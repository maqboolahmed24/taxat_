import {
  getManifestExperienceStreamEndpoint,
  type GetManifestExperienceStreamEndpointDependencies,
  type GetManifestExperienceStreamEndpointRequest,
} from "./get_manifest_experience_stream_endpoint.ts";

export const getManifestExperienceStreamRoutePath =
  "/v1/manifests/{manifest_id}/experience/stream" as const;

export type GetManifestExperienceStreamRouteHandler = (
  request: GetManifestExperienceStreamEndpointRequest,
) => Promise<Awaited<ReturnType<typeof getManifestExperienceStreamEndpoint>>>;

export type GetManifestExperienceStreamRouteRegistry =
  | {
      get: (
        path: typeof getManifestExperienceStreamRoutePath,
        handler: GetManifestExperienceStreamRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: GetManifestExperienceStreamRouteHandler;
        method: "GET";
        path: typeof getManifestExperienceStreamRoutePath;
      }) => void;
    };

export function registerGetManifestExperienceStreamRoute(
  registry: GetManifestExperienceStreamRouteRegistry,
  dependencies: GetManifestExperienceStreamEndpointDependencies,
) {
  const handler: GetManifestExperienceStreamRouteHandler = (request) =>
    getManifestExperienceStreamEndpoint(request, dependencies);
  if ("get" in registry) {
    registry.get(getManifestExperienceStreamRoutePath, handler);
    return handler;
  }
  registry.register({
    handler,
    method: "GET",
    path: getManifestExperienceStreamRoutePath,
  });
  return handler;
}
