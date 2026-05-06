import {
  deriveShellThemeContract,
  getSharedRouteContractsForApp,
  serializeThemeCssVars,
  sharedWebShellRouteContracts,
  shellFamilyRegistry,
  type InteractionLayerFoundationContract,
  type ShellFamilyCode,
} from "@taxat/frontend-shell-core";

export const taxatThemeProviderContract = {
  provider_id: "taxat.shared-ui.theme-provider",
  design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
  shell_family_count: shellFamilyRegistry.length,
  exported_css_scope: "[data-taxat-shell-family]",
} as const;

export type TaxatThemeProviderProps = {
  shellFamily: ShellFamilyCode;
  foundationContract?: InteractionLayerFoundationContract | undefined;
  reducedMotion?: boolean;
};

function defaultFoundationContractForShell(shellFamily: ShellFamilyCode) {
  const route = sharedWebShellRouteContracts.find((candidate) => candidate.shell_family === shellFamily);
  return route?.interaction_layer_foundation_contract;
}

export function createTaxatThemeProviderSnapshot({
  shellFamily,
  foundationContract = defaultFoundationContractForShell(shellFamily),
  reducedMotion = false,
}: TaxatThemeProviderProps) {
  const theme = deriveShellThemeContract({
    shellFamily,
    foundationContract,
    reducedMotion,
  });

  return {
    provider_id: taxatThemeProviderContract.provider_id,
    shell_family: shellFamily,
    app_boundaries: getSharedRouteContractsForApp("operator-web")
      .concat(getSharedRouteContractsForApp("client-portal-web"))
      .filter((route) => route.shell_family === shellFamily)
      .map((route) => route.app_boundary),
    theme,
    css_text: serializeThemeCssVars(theme.css_vars),
  } as const;
}

export function buildTaxatThemeAttributes(
  shellFamily: ShellFamilyCode,
  foundationContract = defaultFoundationContractForShell(shellFamily),
) {
  return createTaxatThemeProviderSnapshot(
    foundationContract === undefined ? { shellFamily } : { shellFamily, foundationContract },
  ).theme.data_attributes;
}

export function buildTaxatThemeVars(
  shellFamily: ShellFamilyCode,
  foundationContract = defaultFoundationContractForShell(shellFamily),
  reducedMotion = false,
) {
  return createTaxatThemeProviderSnapshot(
    foundationContract === undefined
      ? { shellFamily, reducedMotion }
      : { shellFamily, foundationContract, reducedMotion },
  ).theme.css_vars;
}

export function buildTaxatThemeStyleAttribute(
  shellFamily: ShellFamilyCode,
  foundationContract = defaultFoundationContractForShell(shellFamily),
  reducedMotion = false,
) {
  return serializeThemeCssVars(
    buildTaxatThemeVars(shellFamily, foundationContract, reducedMotion),
  );
}

export function renderTaxatWordmark(label = "Taxat") {
  return {
    className: "taxat-wordmark",
    monogram: "T",
    label,
  } as const;
}
