import { getSharedRouteContract } from "@taxat/frontend-shell-core";
import { buildTaxatThemeAttributes } from "@taxat/shared-ui";

const routeContract = getSharedRouteContract("operator.calm.manifest-decision");

export const operatorCalmRoute = {
  id: "operator-calm-route",
  routePath: routeContract.route_path,
  publicPath: routeContract.public_path,
  title: routeContract.title,
  shellFamily: routeContract.shell_family,
  themeAttributes: buildTaxatThemeAttributes(routeContract.shell_family),
  routeContract,
} as const;
