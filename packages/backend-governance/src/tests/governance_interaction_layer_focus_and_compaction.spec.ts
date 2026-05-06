import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildGovernanceInteractionLayer,
  deriveGovernanceFocusAndCompactionState,
  deriveGovernancePreservedContext,
} from "../index.ts";

test("derives lawful drawer, tray, and focus-stack compaction states", async () => {
  const drawer = buildGovernanceInteractionLayer({
    activeFilters: {
      principal_states: ["ACTIVE"],
      principal_types: ["USER"],
      role_refs: ["role.pc0195.reviewer"],
    },
    auxiliarySurfacePresentation: "INSPECTOR",
    compactionMode: "AUXILIARY_DRAWER",
    routeFamily: "principal_access_view",
  });
  expect(drawer).toMatchObject({
    auxiliary_surface_presentation: "INSPECTOR",
    compaction_mode: "AUXILIARY_DRAWER",
    focus_trap_mode: "NON_MODAL",
  });
  expect(drawer.preserved_context_codes).toEqual([
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
    "STAGED_DIFF",
  ]);

  const tray = deriveGovernanceFocusAndCompactionState({
    compactionMode: "AUXILIARY_TRAY",
  });
  expect(tray).toEqual({
    auxiliary_surface_presentation: "TRAY",
    compaction_mode: "AUXILIARY_TRAY",
    focus_trap_mode: "NON_MODAL",
  });

  const focusStack = deriveGovernanceFocusAndCompactionState({
    compactionMode: "FOCUS_STACK",
  });
  expect(focusStack).toEqual({
    auxiliary_surface_presentation: "DRAWER",
    compaction_mode: "FOCUS_STACK",
    focus_trap_mode: "NON_MODAL",
  });

  await validateContractSchema("governance_interaction_layer", drawer);
});

test("fails closed on illegal compaction pairs and ordinary modal focus traps", () => {
  expect(() =>
    deriveGovernanceFocusAndCompactionState({
      auxiliarySurfacePresentation: "TRAY",
      compactionMode: "WIDE",
    }),
  ).toThrow(/GOVERNANCE_COMPACTION_PRESENTATION_INVALID/);

  expect(() =>
    deriveGovernanceFocusAndCompactionState({
      auxiliarySurfacePresentation: "SIDECAR",
      compactionMode: "AUXILIARY_DRAWER",
    }),
  ).toThrow(/GOVERNANCE_COMPACTION_PRESENTATION_INVALID/);

  expect(() =>
    deriveGovernanceFocusAndCompactionState({
      focusTrapMode: "MODAL_EXPLICIT",
    }),
  ).toThrow(/GOVERNANCE_MODAL_FOCUS_FORBIDDEN/);

  expect(
    deriveGovernanceFocusAndCompactionState({
      focusTrapMode: "MODAL_EXPLICIT",
      modalStepUpRequired: true,
    }).focus_trap_mode,
  ).toBe("MODAL_EXPLICIT");
});

test("requires promoted support context to survive compact postures", () => {
  expect(() =>
    deriveGovernancePreservedContext({
      compactionMode: "AUXILIARY_DRAWER",
      overrideContextCodes: ["ACTIVE_FILTERS", "SELECTION"],
      routeFamily: "tenant_governance_snapshot",
    }),
  ).toThrow(/GOVERNANCE_CONTEXT_COMPACTION_UNBOUND/);
});

