import {
  postCommandsEndpoint,
  type PostCommandsEndpointDependencies,
  type PostCommandsEndpointRequest,
} from "./post_commands_endpoint.ts";

export type PostCommandsRouteHandler = (
  request: PostCommandsEndpointRequest,
) => Promise<Awaited<ReturnType<typeof postCommandsEndpoint>>>;

export type PostCommandsRouteRegistry =
  | {
      post: (path: "/v1/commands", handler: PostCommandsRouteHandler) => void;
    }
  | {
      register: (route: {
        handler: PostCommandsRouteHandler;
        method: "POST";
        path: "/v1/commands";
      }) => void;
    };

export function registerPostCommandsRoute(
  registry: PostCommandsRouteRegistry,
  dependencies: PostCommandsEndpointDependencies,
) {
  const handler: PostCommandsRouteHandler = (request) => postCommandsEndpoint(request, dependencies);
  if ("post" in registry) {
    registry.post("/v1/commands", handler);
    return handler;
  }
  registry.register({
    handler,
    method: "POST",
    path: "/v1/commands",
  });
  return handler;
}
