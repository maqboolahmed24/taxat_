import { expect, test } from "@playwright/test";

import {
  buildLowNoiseExperienceFrame,
  getShellAnchorInventory,
  getShellAnnouncementProfile,
  projectSemanticAccessibilityContract,
  publishSemanticAccessibilityContractIntoReadModels,
  SemanticAccessibilityContractError,
  type SemanticAccessibilitySurfaceType,
  validateSemanticAccessibilityContract,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

const governedSurfaceTypes = [
  "LowNoiseExperienceFrame",
  "WorkspaceSnapshot",
  "ClientPortalWorkspace",
  "TenantGovernanceSnapshot",
  "NativeOperatorWorkspaceScene",
  "NativeOperatorSecondaryWindowScene",
] as const satisfies readonly SemanticAccessibilitySurfaceType[];

function baseFrameInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0178",
    decisionBundleHash: "decision.hash.pc0178",
    frameEpoch: 1,
    lastPublishedSequence: 11,
    manifestId: "manifest.pc0178",
    maskingContextHash: "mask.pc0178",
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 4,
    renderedAt: "2026-05-04T10:00:00.000Z",
    resumeToken: "resume.pc0178",
    sessionBindingHash: "session.hash.pc0178",
    sessionRef: "session.pc0178",
    shellStabilityToken: "shell.pc0178",
    tenantId: "tenant.pc0178",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

test("projects schema-valid semantic accessibility contracts for every governed surface", async () => {
  for (const surfaceType of governedSurfaceTypes) {
    const contract = projectSemanticAccessibilityContract({ surfaceType });
    const inventory = getShellAnchorInventory({ surfaceType });

    expect(contract.shell_family).toBe(inventory.shell_family);
    expect(contract.selector_profile).toBe(inventory.selector_profile);
    expect(contract.required_anchor_codes).toEqual(inventory.required_anchor_codes);
    expect(contract.semantic_focus_order).toEqual(inventory.semantic_focus_order);
    expect(contract.browser_identifier_policy).toBe("DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR");
    expect(contract.native_identifier_policy).toBe("ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR");

    validateSemanticAccessibilityContract({ contract, surfaceType });
    await validateContractSchema("semantic_accessibility_contract", contract);
  }
});

test("publishes the canonical contract on low-noise frames", async () => {
  const frame = buildLowNoiseExperienceFrame(baseFrameInput());
  const expectedContract = projectSemanticAccessibilityContract({
    surfaceType: "LowNoiseExperienceFrame",
  });

  expect(frame.semantic_accessibility_contract).toEqual(expectedContract);
  expect(frame.semantic_accessibility_contract.required_anchor_codes).toContain("ARTIFACT_HANDOFF");
  expect(frame.semantic_accessibility_contract.required_anchor_codes).toContain(
    "ARTIFACT_STATE_LABEL",
  );

  await validateContractSchema("low_noise_experience_frame", frame);
});

test("keeps portal contextual routes on the base portal selector profile and return path", () => {
  const basePortal = projectSemanticAccessibilityContract({
    routeVariant: "PORTAL_WORKSPACE",
  });
  const contextualPortal = projectSemanticAccessibilityContract({
    routeVariant: "PORTAL_CONTEXTUAL_ROUTE",
  });
  const contextualInventory = getShellAnchorInventory({
    routeVariant: "PORTAL_CONTEXTUAL_ROUTE",
  });

  expect(contextualPortal.selector_profile).toBe("PORTAL_SEMANTIC_SELECTORS_V1");
  expect(contextualPortal.required_anchor_codes).toEqual(basePortal.required_anchor_codes);
  expect(contextualPortal.semantic_focus_order).toEqual(basePortal.semantic_focus_order);
  expect(contextualPortal.required_anchor_codes).toContain("RETURN_PATH_CONTROL");
  expect(contextualInventory.return_path_control_required).toBe(true);
});

test("publishes shared identifier parity and live announcement taxonomy", () => {
  const lowNoiseInventory = getShellAnchorInventory({
    surfaceType: "LowNoiseExperienceFrame",
  });
  expect(lowNoiseInventory.semantic_anchor_refs_by_code.DOMINANT_QUESTION).toBe(
    "dominant-question",
  );
  expect(lowNoiseInventory.browser_identifier_by_anchor_code.DOMINANT_QUESTION).toBe(
    lowNoiseInventory.semantic_anchor_refs_by_code.DOMINANT_QUESTION,
  );
  expect(lowNoiseInventory.native_identifier_by_anchor_code.DOMINANT_QUESTION).toBe(
    lowNoiseInventory.semantic_anchor_refs_by_code.DOMINANT_QUESTION,
  );

  const workspaceAnnouncements = getShellAnnouncementProfile({ surfaceType: "WorkspaceSnapshot" });
  expect(workspaceAnnouncements.polite_change_kinds).toEqual(["ACTIVITY_DELTA", "BADGE_DELTA"]);
  expect(workspaceAnnouncements.assertive_change_kinds).toEqual([
    "RECOVERY_NOTICE",
    "COMMAND_FAILURE",
    "TERMINAL_SETTLEMENT",
  ]);
  expect(workspaceAnnouncements.live_region_mode_by_kind.ACTIVITY_DELTA).toBe("POLITE");
  expect(workspaceAnnouncements.live_region_mode_by_kind.BADGE_DELTA).toBe("POLITE");
  expect(workspaceAnnouncements.live_region_mode_by_kind.COMMAND_FAILURE).toBe("ASSERTIVE");
  expect(workspaceAnnouncements.live_region_mode_by_kind.RECOVERY_NOTICE).toBe("ASSERTIVE");
  expect(workspaceAnnouncements.live_region_mode_by_kind.TERMINAL_SETTLEMENT).toBe("ASSERTIVE");
});

test("publishes contracts into read models and rejects shell-family drift", () => {
  const portalReadModel = publishSemanticAccessibilityContractIntoReadModels({
    readModel: {
      artifact_type: "ClientPortalWorkspace",
      object_anchor_ref: "portal-workspace://client-1",
      shell_family: "CLIENT_PORTAL_SHELL",
    },
    routeVariant: "PORTAL_CONTEXTUAL_ROUTE",
    surfaceType: "ClientPortalWorkspace",
  });
  expect(portalReadModel.semantic_accessibility_contract.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(portalReadModel.semantic_accessibility_contract.required_anchor_codes).toContain(
    "RETURN_PATH_CONTROL",
  );

  expect(() =>
    publishSemanticAccessibilityContractIntoReadModels({
      readModel: {
        artifact_type: "ClientPortalWorkspace",
        shell_family: "CALM_SHELL",
      },
      surfaceType: "ClientPortalWorkspace",
    }),
  ).toThrow(SemanticAccessibilityContractError);
});

test("rejects selector, anchor, and return-path drift", () => {
  const portalContract = projectSemanticAccessibilityContract({
    surfaceType: "ClientPortalWorkspace",
  });
  const selectorDrift = structuredClone(portalContract);
  selectorDrift.selector_profile = "OPERATOR_SEMANTIC_SELECTORS_V1";
  expect(() =>
    validateSemanticAccessibilityContract({
      contract: selectorDrift,
      surfaceType: "ClientPortalWorkspace",
    }),
  ).toThrow(SemanticAccessibilityContractError);

  const secondaryContract = projectSemanticAccessibilityContract({
    surfaceType: "NativeOperatorSecondaryWindowScene",
  });
  const returnPathDrift = structuredClone(secondaryContract);
  returnPathDrift.required_anchor_codes = returnPathDrift.required_anchor_codes.filter(
    (anchor) => anchor !== "RETURN_PATH_CONTROL",
  );
  try {
    validateSemanticAccessibilityContract({
      contract: returnPathDrift,
      surfaceType: "NativeOperatorSecondaryWindowScene",
    });
    throw new Error("expected semantic contract validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(SemanticAccessibilityContractError);
    expect((error as SemanticAccessibilityContractError).reasonCodes).toContain(
      "SEMANTIC_ACCESSIBILITY_MISSING_RETURN_PATH_CONTROL",
    );
  }
});
