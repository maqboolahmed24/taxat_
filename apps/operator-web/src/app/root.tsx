import {
  createRouteContractProviderSnapshot,
  getSharedRouteContractsForApp,
} from "@taxat/frontend-shell-core";
import { taxatThemeProviderContract } from "@taxat/shared-ui";

export const operatorWebRoot = {
  id: "operator-web-root",
  appBoundary: "operator-web",
  routeContractProvider: createRouteContractProviderSnapshot(
    getSharedRouteContractsForApp("operator-web").map((route) => route.route_id),
  ),
  themeProvider: taxatThemeProviderContract,
  shellFamilies: ["CALM_SHELL", "GOVERNANCE_DENSITY_SHELL"],
} as const;
