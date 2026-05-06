import {
  createRouteContractProviderSnapshot,
  createSurfaceRegistrySnapshot,
  deriveShellThemeContract,
  resolveSurfaceMountPlan,
  sharedWebShellContractFixture,
  sharedWebShellSemanticRegressionPack,
  sharedWebShellRouteContracts,
  shellFamilyRegistry,
} from "@taxat/frontend-shell-core";
import { createSurfaceRegistryDiagramSnapshot } from "@taxat/shared-ui";

const themeContracts = sharedWebShellRouteContracts.map((route) =>
  deriveShellThemeContract({
    shellFamily: route.shell_family,
    foundationContract: route.interaction_layer_foundation_contract,
  }),
);

export const frontendShellFoundationAtlasRoute = {
  id: "frontend-shell-foundation-atlas",
  title: "Frontend Shell Foundation Atlas",
  routePath: "/internal/frontend-shell-foundation-atlas",
  publicPath: "/apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html",
  providerSnapshot: createRouteContractProviderSnapshot(),
  shellFamilyRegistry,
  surfaceRegistry: createSurfaceRegistrySnapshot(),
  surfaceRegistryDiagram: createSurfaceRegistryDiagramSnapshot(),
  surfaceMountPlans: sharedWebShellRouteContracts.map((route) =>
    resolveSurfaceMountPlan({
      foundationContract: route.interaction_layer_foundation_contract,
      shellFamily: route.shell_family,
    }),
  ),
  themeContracts,
  fixtureId: sharedWebShellContractFixture.fixture_id,
  semanticRegressionCaseCount: sharedWebShellSemanticRegressionPack.cases.length,
} as const;
