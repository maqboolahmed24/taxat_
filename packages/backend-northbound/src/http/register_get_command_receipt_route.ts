import {
  getCommandReceiptEndpoint,
  type GetCommandReceiptEndpointDependencies,
  type GetCommandReceiptEndpointRequest,
} from "./get_command_receipt_endpoint.ts";

export const getCommandReceiptRoutePath = "/v1/commands/{command_id}" as const;

export type GetCommandReceiptRouteHandler = (
  request: GetCommandReceiptEndpointRequest,
) => Promise<Awaited<ReturnType<typeof getCommandReceiptEndpoint>>>;

export type GetCommandReceiptRouteRegistry =
  | {
      get: (
        path: typeof getCommandReceiptRoutePath,
        handler: GetCommandReceiptRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: GetCommandReceiptRouteHandler;
        method: "GET";
        path: typeof getCommandReceiptRoutePath;
      }) => void;
    };

export function registerGetCommandReceiptRoute(
  registry: GetCommandReceiptRouteRegistry,
  dependencies: GetCommandReceiptEndpointDependencies,
) {
  const handler: GetCommandReceiptRouteHandler = (request) =>
    getCommandReceiptEndpoint(request, dependencies);
  if ("get" in registry) {
    registry.get(getCommandReceiptRoutePath, handler);
    return handler;
  }
  registry.register({
    handler,
    method: "GET",
    path: getCommandReceiptRoutePath,
  });
  return handler;
}
