import type {
  SemanticAccessibilityContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { getShellFamilyTokenRegistryEntry } from "../semantics/shell_family_token_registry.ts";
import { getShellAnnouncementProfile } from "./get_shell_announcement_profile.ts";
import {
  getShellAnchorInventory,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilitySurfaceType,
} from "./get_shell_anchor_inventory.ts";

export type ProjectSemanticAccessibilityContractInput = {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
};

export function projectSemanticAccessibilityContract(
  input: ProjectSemanticAccessibilityContractInput,
): SemanticAccessibilityContract {
  const inventory = getShellAnchorInventory(input);
  const announcementProfile = getShellAnnouncementProfile(input);
  const registryEntry = getShellFamilyTokenRegistryEntry({
    shellFamily: inventory.shell_family,
  });
  const selectorProfile = registryEntry.foundation_contract.selector_profile;
  if (selectorProfile !== inventory.selector_profile) {
    throw new Error(
      `${inventory.shell_family} selector profile drifted from the shell-family registry`,
    );
  }

  return {
    announced_change_kinds: announcementProfile.announced_change_kinds,
    artifact_handoff_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE",
    browser_identifier_policy: "DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR",
    conditional_notice_anchor_policy: "LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS",
    contract_version: "SEMANTIC_ACCESSIBILITY_V1",
    detail_module_access_policy: "SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE",
    focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE",
    focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY",
    focus_restore_policy: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
    heading_navigation_policy: "PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS",
    identifier_semantics_policy: "DOMAIN_MEANING_OVER_VISUAL_STYLING",
    keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE",
    landmark_structure_policy: "STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS",
    live_region_policy: "POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY",
    live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS",
    native_identifier_policy: "ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR",
    reduced_motion_policy: "MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION",
    required_anchor_codes: inventory.required_anchor_codes,
    selector_profile: selectorProfile,
    semantic_focus_order: inventory.semantic_focus_order,
    shell_family: inventory.shell_family,
    support_region_access_policy: "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE",
  };
}
