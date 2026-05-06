import { expect, test } from "@playwright/test";

import {
  buildGovernanceInteractionLayer,
  buildInteractionLayerFoundationContract,
  buildOperatorInteractionLayer,
  buildPortalInteractionLayer,
  InteractionContractError,
  orderedInteractionLayerShellFamilies,
  resolveSurfaceMountPlan,
  surfaceRegistryByShellFamily,
} from "../../../packages/frontend-shell-core/src/index";
import { validateContractSchema } from "../backend_northbound/audit_and_enquiry_fixtures";

test("builds schema-valid foundation and interaction layers for all shell families", async () => {
  expect(orderedInteractionLayerShellFamilies).toEqual([
    "CALM_SHELL",
    "CLIENT_PORTAL_SHELL",
    "GOVERNANCE_DENSITY_SHELL",
  ]);

  for (const shellFamily of orderedInteractionLayerShellFamilies) {
    const foundation = buildInteractionLayerFoundationContract(shellFamily);
    expect(foundation.shell_family).toBe(shellFamily);
    expect(foundation.support_surface_policy).toBe("ONE_PROMOTED_SUPPORT_SURFACE_MAX");
    await validateContractSchema("interaction_layer_foundation_contract", foundation);
  }

  await validateContractSchema("operator_interaction_layer", buildOperatorInteractionLayer());
  await validateContractSchema("portal_interaction_layer", buildPortalInteractionLayer());
  await validateContractSchema(
    "governance_interaction_layer",
    buildGovernanceInteractionLayer({
      compactionMode: "AUXILIARY_DRAWER",
      selectedFilterChipRefs: ["tenant:active"],
    }),
  );
});

test("resolves deterministic default surface plans with one promoted support region", () => {
  for (const shellFamily of orderedInteractionLayerShellFamilies) {
    const plan = resolveSurfaceMountPlan({ shellFamily });
    expect(plan.foundation_contract.shell_family).toBe(shellFamily);
    expect(plan.support_budget.policy).toBe("ONE_PROMOTED_SUPPORT_SURFACE_MAX");
    expect(plan.support_budget.promoted_surface_codes).toHaveLength(1);
    expect(plan.promoted_support_regions).toHaveLength(1);
    expect(plan.promoted_support_regions[0]?.promoted_support_eligible).toBe(true);
    expect(plan.default_reading_order).toEqual(
      surfaceRegistryByShellFamily[shellFamily]
        .filter((surface) => surface.default_reading_order_index !== null)
        .map((surface) => surface.surface_code),
    );
  }
});

test("illegal support combinations fail closed with typed reason codes", () => {
  expect(() =>
    resolveSurfaceMountPlan({
      promotedSupportSurfaceCodes: ["DETAIL_DRAWER", "CALM_COMPARE_SUPPORT"],
      shellFamily: "CALM_SHELL",
    }),
  ).toThrow(InteractionContractError);

  try {
    resolveSurfaceMountPlan({
      promotedSupportSurfaceCodes: ["DETAIL_DRAWER", "CALM_COMPARE_SUPPORT"],
      shellFamily: "CALM_SHELL",
    });
  } catch (error) {
    expect(error).toBeInstanceOf(InteractionContractError);
    expect((error as InteractionContractError).reason_code).toBe("SUPPORT_SURFACE_BUDGET_EXCEEDED");
  }

  expect(() =>
    resolveSurfaceMountPlan({
      promotedSupportSurfaceCodes: ["CALM_COMPARE_SUPPORT", "CALM_AUDIT_SUPPORT"],
      shellFamily: "CALM_SHELL",
      supportMode: "COMPARE",
    }),
  ).toThrow(InteractionContractError);
});

test("portal support stacks below primary and governance inspectors stay non-modal by default", () => {
  const portalPlan = resolveSurfaceMountPlan({ shellFamily: "CLIENT_PORTAL_SHELL" });
  expect(portalPlan.promoted_support_regions[0]?.support_placement).toBe("STACK_BELOW_PRIMARY");

  expect(() =>
    resolveSurfaceMountPlan({
      modalSurfaceCodes: ["TRAILING_INSPECTOR"],
      shellFamily: "GOVERNANCE_DENSITY_SHELL",
    }),
  ).toThrow(InteractionContractError);

  const governanceModalCheckpoint = resolveSurfaceMountPlan({
    highRiskCheckpointRef: "modal-checkpoint.governance.irreversible-erasure",
    modalSurfaceCodes: ["TRAILING_INSPECTOR"],
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    supportMode: "MODAL_CHECKPOINT",
  });
  expect(governanceModalCheckpoint.promoted_support_regions[0]?.surface_code).toBe(
    "TRAILING_INSPECTOR",
  );
});

test("cross-family foundation drift fails before registry decisions are returned", () => {
  const portalFoundation = buildInteractionLayerFoundationContract("CLIENT_PORTAL_SHELL");

  expect(() =>
    buildOperatorInteractionLayer({
      foundationContract: portalFoundation,
    }),
  ).toThrow(InteractionContractError);

  expect(() =>
    resolveSurfaceMountPlan({
      foundationContract: portalFoundation,
      shellFamily: "CALM_SHELL",
    }),
  ).toThrow(InteractionContractError);
});
