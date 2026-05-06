import {
  getDecisionBundleEndpoint,
  type GetDecisionBundleEndpointDependencies,
  type GetDecisionBundleEndpointRequest,
} from "./get_decision_bundle_endpoint.ts";

export const getDecisionBundleRoutePath =
  "/v1/manifests/{manifest_id}/decision-bundle" as const;

export type GetDecisionBundleRouteHandler = (
  request: GetDecisionBundleEndpointRequest,
) => Promise<Awaited<ReturnType<typeof getDecisionBundleEndpoint>>>;

export type GetDecisionBundleRouteRegistry =
  | {
      get: (
        path: typeof getDecisionBundleRoutePath,
        handler: GetDecisionBundleRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: GetDecisionBundleRouteHandler;
        method: "GET";
        path: typeof getDecisionBundleRoutePath;
      }) => void;
    };

export function registerGetDecisionBundleRoute(
  registry: GetDecisionBundleRouteRegistry,
  dependencies: GetDecisionBundleEndpointDependencies,
) {
  const handler: GetDecisionBundleRouteHandler = (request) =>
    getDecisionBundleEndpoint(request, dependencies);
  if ("get" in registry) {
    registry.get(getDecisionBundleRoutePath, handler);
    return handler;
  }
  registry.register({
    handler,
    method: "GET",
    path: getDecisionBundleRoutePath,
  });
  return handler;
}
