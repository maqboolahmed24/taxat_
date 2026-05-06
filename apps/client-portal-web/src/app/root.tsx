import {
  createRouteContractProviderSnapshot,
  getSharedRouteContractsForApp,
} from "@taxat/frontend-shell-core";
import { taxatThemeProviderContract } from "@taxat/shared-ui";

export const clientPortalWebRoot = {
  id: "client-portal-web-root",
  appBoundary: "client-portal-web",
  routeContractProvider: createRouteContractProviderSnapshot(
    getSharedRouteContractsForApp("client-portal-web").map((route) => route.route_id),
  ),
  themeProvider: taxatThemeProviderContract,
  shellFamilies: ["CLIENT_PORTAL_SHELL"],
} as const;
