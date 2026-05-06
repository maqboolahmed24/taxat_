import {
  sharedWebShellContractFixture,
  sharedWebShellRouteContracts,
  sharedWebShellSemanticRegressionPack,
  shellFamilyRegistry,
  type SharedWebRouteContract,
} from "../shell_family_registry";

export type RouteContractProviderSnapshot = {
  provider_id: "taxat.shared-web-route-contract-provider";
  fixture_id: string;
  selected_route_ids: readonly string[];
  shell_family_registry_count: number;
  route_contracts: readonly SharedWebRouteContract[];
  semantic_regression_case_count: number;
};

export function createRouteContractProviderSnapshot(routeIds?: readonly string[]) {
  const selectedRoutes =
    routeIds === undefined
      ? sharedWebShellRouteContracts
      : sharedWebShellRouteContracts.filter((route) => routeIds.includes(route.route_id));

  return {
    provider_id: "taxat.shared-web-route-contract-provider",
    fixture_id: sharedWebShellContractFixture.fixture_id,
    selected_route_ids: selectedRoutes.map((route) => route.route_id),
    shell_family_registry_count: shellFamilyRegistry.length,
    route_contracts: selectedRoutes,
    semantic_regression_case_count: sharedWebShellSemanticRegressionPack.cases.length,
  } as const satisfies RouteContractProviderSnapshot;
}

export function serializeRouteContractProviderSnapshot(snapshot: RouteContractProviderSnapshot) {
  return JSON.stringify(snapshot, null, 2);
}
