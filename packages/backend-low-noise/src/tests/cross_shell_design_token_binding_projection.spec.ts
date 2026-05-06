import { expect, test } from "@playwright/test";

import {
  CrossShellTokenBindingError,
  exportShellSemanticBindingManifest,
  orderedInteractionLayerShellFamilies,
  projectFoundationContractForShell,
  projectGovernanceInteractionSemanticsSeed,
  projectInteractionLayerFoundationContract,
  projectPortalInteractionLayer,
  shellFamilyTokenRegistry,
  validateCrossShellTokenBinding,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

test("projects every shell foundation from the immutable registry", async () => {
  expect(orderedInteractionLayerShellFamilies).toEqual([
    "CALM_SHELL",
    "CLIENT_PORTAL_SHELL",
    "GOVERNANCE_DENSITY_SHELL",
  ]);

  for (const shellFamily of orderedInteractionLayerShellFamilies) {
    const registryEntry = shellFamilyTokenRegistry[shellFamily];
    const foundation = projectFoundationContractForShell({ shellFamily });

    expect(foundation).toEqual(registryEntry.foundation_contract);
    expect(projectInteractionLayerFoundationContract({ shellFamily })).toEqual(foundation);
    expect(registryEntry.renderer_binding_policy).toBe(
      "ENUM_PAYLOAD_PLUS_STABLE_SEMANTIC_TOKEN_ALIASES",
    );
    expect(Object.values(registryEntry.semantic_token_aliases)).toEqual(
      Object.values(registryEntry.semantic_token_aliases).filter((alias) =>
        alias.startsWith("semantic."),
      ),
    );
    expect(Object.values(registryEntry.semantic_token_aliases).some((alias) => alias.includes("--"))).toBe(
      false,
    );

    validateCrossShellTokenBinding({ foundationContract: foundation });
    await validateContractSchema("interaction_layer_foundation_contract", foundation);
  }
});

test("emits the shared portal interaction layer without full portal workspace composition", async () => {
  const portal = projectPortalInteractionLayer();

  expect(portal.foundation_contract.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(portal.foundation_contract.selector_profile).toBe("PORTAL_SEMANTIC_SELECTORS_V1");
  expect(portal.foundation_contract.continuity_policy).toBe("SAME_SHELL_CONTEXTUAL_RETURN");
  expect(portal.foundation_contract.secondary_window_policy).toBe("NOT_APPLICABLE");
  expect(portal.navigation_model).toBe("TOP_LEVEL_TABS_CONTEXTUAL_DETAIL");
  expect(portal.spacing_profile).toBe("COMFORTABLE_TASK_FIRST");
  expect(portal.status_language_profile).toBe("PLAIN_LITERAL_CLIENT_SAFE");
  expect(portal.responsive_detail_policy).toBe("STACK_SUPPORT_BELOW_PRIMARY");
  expect(portal.artifact_hierarchy_policy).toBe("CURRENT_PRIMARY_HISTORY_SECONDARY");

  validateCrossShellTokenBinding({ portalInteractionLayer: portal });
  await validateContractSchema("portal_interaction_layer", portal);

  const calmFoundation = projectFoundationContractForShell({ shellFamily: "CALM_SHELL" });
  expect(() => projectPortalInteractionLayer({ foundationContract: calmFoundation })).toThrow(
    /CLIENT_PORTAL_SHELL/u,
  );
});

test("publishes a minimal governance interaction seed without collapsing family semantics", async () => {
  const governance = projectGovernanceInteractionSemanticsSeed({
    compactionMode: "AUXILIARY_DRAWER",
    preservedContextCodes: ["ACTIVE_FILTERS", "SELECTION", "FOCUS_ANCHOR"],
    selectedFilterChipRefs: ["tenant:active", "policy:hmrc"],
  });

  expect(governance.foundation_contract.shell_family).toBe("GOVERNANCE_DENSITY_SHELL");
  expect(governance.foundation_contract.selector_profile).toBe("GOVERNANCE_SEMANTIC_SELECTORS_V1");
  expect(governance.foundation_contract.history_presentation_policy).toBe(
    "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY",
  );
  expect(governance.foundation_contract.continuity_policy).toBe(
    "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION",
  );
  expect(governance.density_profile).toBe("GOVERNANCE_DENSITY_PROFILE_V1");
  expect(governance.inventory_filter_grammar).toBe("CANONICAL_ROUTE_FILTER_GRAMMAR");
  expect(governance.auxiliary_surface_presentation).toBe("DRAWER");
  expect(governance.selector_profile).not.toBe("PORTAL_SEMANTIC_SELECTORS_V1");

  validateCrossShellTokenBinding({ governanceInteractionLayer: governance });
  await validateContractSchema("governance_interaction_layer", governance);

  expect(() =>
    projectGovernanceInteractionSemanticsSeed({
      auxiliarySurfacePresentation: "SIDECAR",
      compactionMode: "AUXILIARY_TRAY",
    }),
  ).toThrow(/TRAY/u);
});

test("exports a deterministic semantic binding manifest for renderers", () => {
  const manifest = exportShellSemanticBindingManifest();
  const rerun = exportShellSemanticBindingManifest();

  expect(manifest).toEqual(rerun);
  expect(JSON.stringify(manifest)).toBe(JSON.stringify(rerun));
  expect(manifest.sensitive_data_policy).toBe("NO_TENANT_CLIENT_PRINCIPAL_OR_ROUTE_OBJECT_DATA");
  expect(manifest.shell_families.map((entry) => entry.shell_family)).toEqual([
    "CALM_SHELL",
    "CLIENT_PORTAL_SHELL",
    "GOVERNANCE_DENSITY_SHELL",
  ]);
  expect(
    manifest.shell_families.every(
      (entry) =>
        entry.renderer_binding_policy === "ENUM_PAYLOAD_PLUS_STABLE_SEMANTIC_TOKEN_ALIASES",
    ),
  ).toBe(true);
  expect(
    manifest.shell_families.some((entry) =>
      Object.values(entry.semantic_token_aliases).some((alias) => alias.includes("css")),
    ),
  ).toBe(false);

  validateCrossShellTokenBinding({ manifest });
});

test("rejects portal and manifest drift from the registry", () => {
  const portal = projectPortalInteractionLayer();
  const driftedPortal = structuredClone(portal);
  driftedPortal.foundation_contract.secondary_window_policy = "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS";

  expect(() => validateCrossShellTokenBinding({ portalInteractionLayer: driftedPortal })).toThrow(
    CrossShellTokenBindingError,
  );

  const manifest = exportShellSemanticBindingManifest();
  const driftedManifest = structuredClone(manifest);
  driftedManifest.shell_families.reverse();

  expect(() => validateCrossShellTokenBinding({ manifest: driftedManifest })).toThrow(
    CrossShellTokenBindingError,
  );
});
