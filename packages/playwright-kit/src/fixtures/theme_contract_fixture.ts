import {
  deriveShellThemeContract,
  sharedWebShellRouteContracts,
  type ShellFamily,
} from "../../../frontend-shell-core/src/index";

export const themeContractFixture = {
  atlasPath: "/apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html",
  shellFamilies: ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
  expectedAccentByFamily: {
    CALM_SHELL: "#1D4ED8",
    CLIENT_PORTAL_SHELL: "#0F766E",
    GOVERNANCE_DENSITY_SHELL: "#6D28D9",
  },
} as const;

export function themeContractForShellFamily(shellFamily: ShellFamily, reducedMotion = false) {
  const route = sharedWebShellRouteContracts.find((candidate) => candidate.shell_family === shellFamily);
  if (!route) {
    throw new Error(`No route contract fixture found for ${shellFamily}`);
  }

  return deriveShellThemeContract({
    shellFamily,
    foundationContract: route.interaction_layer_foundation_contract,
    reducedMotion,
  });
}
