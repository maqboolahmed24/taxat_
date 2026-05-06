export type ShellFamilyCode =
  | "CALM_SHELL"
  | "CLIENT_PORTAL_SHELL"
  | "GOVERNANCE_DENSITY_SHELL";

export type SelectorProfile =
  | "OPERATOR_SEMANTIC_SELECTORS_V1"
  | "PORTAL_SEMANTIC_SELECTORS_V1"
  | "GOVERNANCE_SEMANTIC_SELECTORS_V1";

export type SemanticAnchor = {
  anchor_code: string;
  semantic_anchor_ref: string;
  browser_identifier: string;
  native_identifier: string;
  role: string;
  label: string;
};

export type SemanticAccessibilityContract = {
  contract_version: "SEMANTIC_ACCESSIBILITY_V1";
  shell_family: ShellFamilyCode;
  selector_profile: SelectorProfile;
  identifier_semantics_policy: "DOMAIN_MEANING_OVER_VISUAL_STYLING";
  browser_identifier_policy: "DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR";
  native_identifier_policy: "ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR";
  landmark_structure_policy: "STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS";
  heading_navigation_policy: "PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS";
  focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY";
  focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE";
  focus_restore_policy: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR";
  keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE";
  live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS";
  live_region_policy: "POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY";
  conditional_notice_anchor_policy: "LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS";
  support_region_access_policy: "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE";
  detail_module_access_policy: "SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE";
  artifact_handoff_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE";
  reduced_motion_policy: "MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION";
  required_anchor_codes: readonly string[];
  semantic_focus_order: readonly string[];
  announced_change_kinds: readonly string[];
};

export const selectorProfileByShellFamily: Record<ShellFamilyCode, SelectorProfile> = {
  CALM_SHELL: "OPERATOR_SEMANTIC_SELECTORS_V1",
  CLIENT_PORTAL_SHELL: "PORTAL_SEMANTIC_SELECTORS_V1",
  GOVERNANCE_DENSITY_SHELL: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
} as const;

export function semanticAnchorRefs(anchors: readonly SemanticAnchor[]) {
  return anchors.map((anchor) => anchor.semantic_anchor_ref);
}

export function semanticIdentifiersMirrorAnchorRefs(anchors: readonly SemanticAnchor[]) {
  return anchors.every(
    (anchor) =>
      anchor.semantic_anchor_ref === anchor.browser_identifier &&
      anchor.semantic_anchor_ref === anchor.native_identifier,
  );
}
