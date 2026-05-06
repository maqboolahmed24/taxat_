import {
  getSemanticAnchorCatalog,
  semanticAccessibilitySurfaceSpecs,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilitySurfaceType,
  type SemanticFocusRegionCode,
} from "./semantic_anchor_catalog";

export type FocusOrderProfile = {
  focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE";
  focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY";
  keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE";
  semantic_focus_order: readonly SemanticFocusRegionCode[];
  keyboard_path_anchor_refs: readonly string[];
};

export function buildFocusOrderProfile(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType: SemanticAccessibilitySurfaceType;
}) {
  const spec = semanticAccessibilitySurfaceSpecs[input.surfaceType];
  const anchors = getSemanticAnchorCatalog(input);
  const keyboardPathAnchorRefs = spec.semanticFocusOrder
    .map((focusRegion) =>
      anchors.find((anchor) => anchor.focus_region_code_or_null === focusRegion)?.semantic_anchor_ref,
    )
    .filter((anchorRef): anchorRef is string => anchorRef !== undefined);

  return {
    focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE",
    focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY",
    keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE",
    keyboard_path_anchor_refs: keyboardPathAnchorRefs,
    semantic_focus_order: [...spec.semanticFocusOrder],
  } satisfies FocusOrderProfile;
}

export function assertFocusOrderPreservesSemanticOrder(input: {
  actualAnchorRefs: readonly string[];
  expectedAnchorRefs: readonly string[];
}) {
  const expectedVisible = input.expectedAnchorRefs.filter((anchorRef) =>
    input.actualAnchorRefs.includes(anchorRef),
  );
  if (JSON.stringify(input.actualAnchorRefs) !== JSON.stringify(expectedVisible)) {
    throw new Error(
      `Focus order drifted from semantic order: expected ${expectedVisible.join(" -> ")} received ${input.actualAnchorRefs.join(" -> ")}`,
    );
  }
  return true;
}
