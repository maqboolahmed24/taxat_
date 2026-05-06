import { expect, test } from "@playwright/test";

import {
  assertFocusOrderPreservesSemanticOrder,
  assertLimitationNoticeAnchorPresent,
  assertLiveUpdatePreservesActiveFocus,
  assertNoVisualSelectorIdentifiers,
  assertRequiredSemanticAnchors,
  assertSemanticAnchorCatalog,
  assertSemanticIdentifierParity,
  assertUniqueSemanticAnchors,
  buildCalmDetailEntryAnchor,
  buildFocusOrderProfile,
  buildSemanticAccessibilityContract,
  buildSemanticAccessibilityRegressionPack,
  getSemanticAnchorCatalog,
  SemanticAnchorCatalogError,
  semanticAccessibilitySurfaceSpecs,
  type SemanticAccessibilitySurfaceType,
} from "../../../packages/frontend-shell-core/src/index";
import { LandmarkFrame } from "../../../packages/shared-ui/src/accessibility/LandmarkFrame";
import { SemanticAnchor } from "../../../packages/shared-ui/src/accessibility/SemanticAnchor";
import { validateContractSchema } from "../backend_northbound/audit_and_enquiry_fixtures";

const surfaceTypes = [
  "LowNoiseExperienceFrame",
  "WorkspaceSnapshot",
  "ClientPortalWorkspace",
  "TenantGovernanceSnapshot",
  "NativeOperatorWorkspaceScene",
  "NativeOperatorSecondaryWindowScene",
] as const satisfies readonly SemanticAccessibilitySurfaceType[];

test("builds schema-valid semantic contracts and regression pack cases for every surface", async () => {
  for (const surfaceType of surfaceTypes) {
    const contract = buildSemanticAccessibilityContract({ surfaceType });
    expect(contract.required_anchor_codes).toEqual(
      semanticAccessibilitySurfaceSpecs[surfaceType].requiredAnchorCodes,
    );
    await validateContractSchema("semantic_accessibility_contract", contract);

    const catalog = getSemanticAnchorCatalog({ surfaceType });
    expect(assertSemanticAnchorCatalog(catalog, surfaceType)).toBe(catalog);
    expect(catalog.every((entry) => entry.browser_identifier === entry.semantic_anchor_ref)).toBe(true);
    expect(catalog.every((entry) => entry.native_identifier === entry.semantic_anchor_ref)).toBe(true);
  }

  const regressionPack = buildSemanticAccessibilityRegressionPack();
  expect(regressionPack.cases).toHaveLength(6);
  for (const regressionCase of regressionPack.cases) {
    expect(regressionCase.covered_modalities).toEqual([
      "KEYBOARD_ONLY",
      "SCREEN_READER",
      "REDUCED_MOTION",
    ]);
    expect(regressionCase.live_update_focus_theft_detected).toBe(false);
    expect(regressionCase.support_surface_modal_trap_detected).toBe(false);
    expect(regressionCase.reduced_motion_semantics_preserved).toBe(true);
  }
  await validateContractSchema("semantic_accessibility_regression_pack", regressionPack);
});

test("calm shell exposes required semantic refs and dynamic detail entries", () => {
  const catalog = getSemanticAnchorCatalog({ surfaceType: "LowNoiseExperienceFrame" });
  const anchorRefs = catalog.map((entry) => entry.semantic_anchor_ref);

  expect(anchorRefs).toEqual(
    expect.arrayContaining([
      "low-noise-shell",
      "shell-family",
      "object-anchor",
      "dominant-question",
      "settlement-posture",
      "recovery-posture",
      "context-bar",
      "decision-summary",
      "action-strip",
      "primary-action",
      "no-safe-action",
      "detail-drawer",
    ]),
  );

  const detailEntry = buildCalmDetailEntryAnchor("Evidence Prism");
  expect(detailEntry.semantic_anchor_ref).toBe("detail-entry-evidence-prism");
  expect(detailEntry.browser_identifier).toBe(detailEntry.native_identifier);
});

test("catalog edge cases fail closed with typed semantic errors", () => {
  const catalog = getSemanticAnchorCatalog({ surfaceType: "LowNoiseExperienceFrame" });
  const first = catalog[0];
  const second = catalog[1];
  expect(first).toBeDefined();
  expect(second).toBeDefined();
  if (first === undefined || second === undefined) {
    throw new Error("Expected low noise catalog entries.");
  }

  expect(() =>
    assertUniqueSemanticAnchors([
      first,
      { ...second, anchor_code: first.anchor_code, semantic_anchor_ref: "duplicate-code-ref" },
    ]),
  ).toThrow(SemanticAnchorCatalogError);

  expect(() =>
    assertSemanticIdentifierParity([
      { ...first, browser_identifier: "visual-left-column", semantic_anchor_ref: first.semantic_anchor_ref },
    ]),
  ).toThrow(SemanticAnchorCatalogError);

  expect(() =>
    assertRequiredSemanticAnchors({
      entries: catalog.filter((entry) => entry.anchor_code !== "PRIMARY_ACTION"),
      surfaceType: "LowNoiseExperienceFrame",
    }),
  ).toThrow(SemanticAnchorCatalogError);

  expect(() =>
    assertLimitationNoticeAnchorPresent({
      entries: catalog.filter((entry) => entry.anchor_code !== "LIMITATION_NOTICE"),
      hiddenOrLimitedContentRequiresNotice: true,
    }),
  ).toThrow(SemanticAnchorCatalogError);

  expect(() =>
    assertNoVisualSelectorIdentifiers([
      { ...first, semantic_anchor_ref: "left-column", browser_identifier: "left-column" },
    ]),
  ).toThrow(SemanticAnchorCatalogError);
});

test("focus profiles and live updates preserve semantic order without stealing active input focus", () => {
  const profile = buildFocusOrderProfile({ surfaceType: "ClientPortalWorkspace" });
  expect(profile.keyboard_path_anchor_refs).toEqual([
    "portal-shell",
    "dominant-question",
    "portal-primary-action",
    "portal-support-panel",
    "portal-history-list",
  ]);
  expect(
    assertFocusOrderPreservesSemanticOrder({
      actualAnchorRefs: profile.keyboard_path_anchor_refs,
      expectedAnchorRefs: profile.keyboard_path_anchor_refs,
    }),
  ).toBe(true);
  expect(
    assertLiveUpdatePreservesActiveFocus({
      activeFocusKind: "COMPOSER",
      focusMoved: false,
    }),
  ).toBe(true);
  expect(() =>
    assertLiveUpdatePreservesActiveFocus({
      activeFocusKind: "EDITOR",
      focusMoved: true,
    }),
  ).toThrow(SemanticAnchorCatalogError);
});

test("shared UI anchor snapshots consume the same semantic catalog entries", () => {
  const anchor = SemanticAnchor({
    anchorCode: "DOMINANT_QUESTION",
    focusable: true,
    surfaceType: "LowNoiseExperienceFrame",
  });
  expect(anchor.attributes["data-testid"]).toBe("dominant-question");
  expect(anchor.attributes["data-native-identifier"]).toBe("dominant-question");
  expect(anchor.attributes.tabIndex).toBe(0);
  expect(anchor.heading?.level).toBe(1);

  const landmark = LandmarkFrame({
    anchorCode: "PROMOTED_SUPPORT_REGION",
    focusable: true,
    surfaceType: "LowNoiseExperienceFrame",
  });
  expect(landmark.attributes["data-testid"]).toBe("promoted-support-region");
  expect(landmark.attributes.role).toBe("complementary");
  expect(landmark.labelled_by).toBe("promoted-support-region-heading");
});
