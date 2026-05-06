import type { SemanticAccessibilityContract } from "../route_contracts/semantic_accessibility";
import { buildFocusOrderProfile } from "./focus_order_profiles";
import { buildLiveRegionPolicy } from "./live_region_policy";
import {
  assertSemanticAnchorCatalog,
  buildRequiredAnchorContractFragment,
  getSemanticAnchorCatalog,
  semanticAccessibilityRouteVariantSurface,
  semanticAccessibilitySurfaceSpecs,
  type AnnouncedChangeKind,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilitySurfaceType,
} from "./semantic_anchor_catalog";

export type SemanticAccessibilityRegressionCase = {
  case_id: string;
  surface_type: SemanticAccessibilitySurfaceType;
  shell_family: SemanticAccessibilityContract["shell_family"];
  selector_profile: SemanticAccessibilityContract["selector_profile"];
  automation_harness: "PLAYWRIGHT" | "XCUITEST";
  covered_modalities: readonly ("KEYBOARD_ONLY" | "SCREEN_READER" | "REDUCED_MOTION")[];
  transition_classes: readonly string[];
  required_anchor_codes: readonly string[];
  semantic_focus_order: readonly string[];
  announced_change_kinds: readonly string[];
  anchor_bindings: readonly {
    anchor_code: string;
    semantic_anchor_ref: string;
    browser_identifier_or_null: string | null;
    native_identifier_or_null: string | null;
    heading_level_or_null: number | null;
    landmark_role_or_null: string | null;
  }[];
  landmark_anchor_codes_in_order: readonly string[];
  heading_anchor_codes_in_order: readonly string[];
  focus_entry_anchor_ref: string;
  keyboard_path_anchor_refs: readonly string[];
  screen_reader_anchor_codes_in_order: readonly string[];
  live_update_change_kind_or_null: string | null;
  live_region_mode_or_null: "POLITE" | "ASSERTIVE" | null;
  live_update_focus_theft_detected: boolean;
  excessive_live_noise_detected: boolean;
  support_surface_kind_or_null: string | null;
  support_surface_keyboard_reachable: boolean;
  support_surface_keyboard_dismissible: boolean;
  support_surface_modal_trap_detected: boolean;
  return_path_anchor_code_or_null: string | null;
  reduced_motion_semantics_preserved: boolean;
  reduced_motion_recovery_story_matches_default: boolean;
};

export type SemanticAccessibilityRegressionPack = {
  contract_version: "SEMANTIC_ACCESSIBILITY_REGRESSION_PACK_V1";
  pack_id: string;
  deterministic_seed: number;
  suite_profile: "CROSS_SHELL_SEMANTIC_ACCESSIBILITY_AND_ASSISTIVE_TECH_MATRIX";
  run_mode: "DETERMINISTIC_SEEDED_ENUMERATION";
  modality_policy: "EVERY_CASE_COVERS_KEYBOARD_SCREEN_READER_AND_REDUCED_MOTION";
  identifier_binding_policy: "AUTOMATION_IDENTIFIERS_MUST_EQUAL_SEMANTIC_ANCHOR_REFS";
  landmark_heading_policy: "LANDMARKS_AND_HEADINGS_MIRROR_VISIBLE_SHELL_STRUCTURE";
  live_update_announcement_policy: "DECISIVE_CHANGE_ANNOUNCED_WITHOUT_NOISE_OR_FOCUS_THEFT";
  support_surface_policy: "PROMOTED_SUPPORT_AND_DETAIL_SURFACES_REMAIN_NON_MODAL_AND_ESCAPABLE";
  transition_stability_policy: "RESPONSIVE_REBASE_RECONNECT_AND_COLLAPSE_KEEP_SEMANTIC_ANCHORS_STABLE";
  return_path_policy: "RETURN_PATH_CONTROLS_REMAIN_ADDRESSABLE_ACROSS_CONTEXTUAL_AND_SECONDARY_FLOWS";
  cases: readonly SemanticAccessibilityRegressionCase[];
};

const portalRegressionRequiredAnchorCodes = [
  "SHELL_ROOT",
  "SHELL_FAMILY",
  "OBJECT_ANCHOR",
  "DOMINANT_QUESTION",
  "DOMINANT_ACTION",
  "SETTLEMENT_POSTURE",
  "RECOVERY_POSTURE",
  "WORKSPACE_POSTURE",
  "STATUS_HERO",
  "PRIMARY_ACTION",
  "PROMOTED_SUPPORT_REGION",
  "ROUTE_TABS",
  "LIMITATION_NOTICE",
  "RECOVERY_NOTICE",
  "RETURN_PATH_CONTROL",
  "REQUEST_FOCUS",
  "ARTIFACT_HANDOFF",
  "CURRENT_ARTIFACT",
  "HISTORY_LIST",
] as const;

function regressionRequiredAnchorCodes(input: {
  contractRequiredAnchorCodes: readonly string[];
  surfaceType: SemanticAccessibilitySurfaceType;
}) {
  if (input.surfaceType === "ClientPortalWorkspace") {
    return [...portalRegressionRequiredAnchorCodes];
  }
  return [...input.contractRequiredAnchorCodes];
}

function supportSurfaceAnchorCode(surfaceType: SemanticAccessibilitySurfaceType) {
  if (surfaceType === "ClientPortalWorkspace" || surfaceType === "TenantGovernanceSnapshot") {
    return "PROMOTED_SUPPORT_REGION";
  }
  if (surfaceType === "NativeOperatorSecondaryWindowScene") {
    return null;
  }
  return "DETAIL_DRAWER";
}

function liveUpdateChangeKindForCase(input: {
  announcedChangeKinds: readonly string[];
  transitionClasses: readonly string[];
}) {
  if (!input.transitionClasses.includes("LIVE_UPDATE")) {
    return null;
  }
  if (input.announcedChangeKinds.includes("ACTIVITY_DELTA")) {
    return "ACTIVITY_DELTA";
  }
  if (input.announcedChangeKinds.includes("RECOVERY_NOTICE")) {
    return "RECOVERY_NOTICE";
  }
  return input.announcedChangeKinds[0] ?? null;
}

function uniqueStrings(values: readonly (string | null | undefined)[]) {
  return values.filter((value, index): value is string => {
    return value !== null && value !== undefined && values.indexOf(value) === index;
  });
}

export function buildSemanticAccessibilityContract(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
}) {
  const surfaceType =
    input.surfaceType ?? semanticAccessibilityRouteVariantSurface[input.routeVariant ?? "LOW_NOISE_FRAME"];
  const fragment = buildRequiredAnchorContractFragment({
    routeVariant: input.routeVariant,
    surfaceType,
  });
  const liveRegionPolicy = buildLiveRegionPolicy({ routeVariant: input.routeVariant, surfaceType });
  assertSemanticAnchorCatalog(
    getSemanticAnchorCatalog({ routeVariant: input.routeVariant, surfaceType }),
    surfaceType,
  );

  return {
    announced_change_kinds: liveRegionPolicy.announced_change_kinds,
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
    required_anchor_codes: fragment.required_anchor_codes,
    selector_profile: fragment.selector_profile,
    semantic_focus_order: fragment.semantic_focus_order,
    shell_family: fragment.shell_family,
    support_region_access_policy: "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE",
  } satisfies SemanticAccessibilityContract;
}

function regressionCaseForSurface(input: {
  caseId: string;
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType: SemanticAccessibilitySurfaceType;
  transitionClasses: readonly string[];
}) {
  const contract = buildSemanticAccessibilityContract({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  const anchors = getSemanticAnchorCatalog({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  const focusProfile = buildFocusOrderProfile({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  const livePolicy = buildLiveRegionPolicy({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  const requiredAnchorCodes = regressionRequiredAnchorCodes({
    contractRequiredAnchorCodes: contract.required_anchor_codes,
    surfaceType: input.surfaceType,
  });
  const anchorByCode = new Map<string, (typeof anchors)[number]>(
    anchors.map((anchor) => [anchor.anchor_code, anchor]),
  );
  const isNativeSurface = input.surfaceType.startsWith("Native");
  const supportSurfaceKind = supportSurfaceAnchorCode(input.surfaceType);
  const returnAnchor = anchors.find((anchor) => anchor.anchor_code === "RETURN_PATH_CONTROL");
  const liveUpdateChangeKind = liveUpdateChangeKindForCase({
    announcedChangeKinds: contract.announced_change_kinds,
    transitionClasses: input.transitionClasses,
  });
  const liveRegionMode =
    liveUpdateChangeKind === null
      ? null
      : livePolicy.live_region_mode_by_kind[liveUpdateChangeKind as AnnouncedChangeKind] ?? null;
  const refForCode = (anchorCode: string) => {
    if (anchorCode === "STATUS_HERO") {
      return "portal-status-hero";
    }
    return anchorByCode.get(anchorCode)?.semantic_anchor_ref ?? null;
  };
  const bindingForCode = (anchorCode: string) => {
    if (anchorCode === "STATUS_HERO") {
      return {
        anchor_code: "STATUS_HERO",
        browser_identifier_or_null: isNativeSurface ? null : "portal-status-hero",
        heading_level_or_null: 2,
        landmark_role_or_null: "region",
        native_identifier_or_null: isNativeSurface ? "portal-status-hero" : null,
        semantic_anchor_ref: "portal-status-hero",
      };
    }
    const anchor = anchorByCode.get(anchorCode);
    if (anchor === undefined) {
      throw new Error(`${input.surfaceType} missing semantic regression binding for ${anchorCode}.`);
    }
    return {
      anchor_code: anchor.anchor_code,
      browser_identifier_or_null: isNativeSurface ? null : anchor.browser_identifier,
      heading_level_or_null:
        anchor.anchor_code === "SHELL_ROOT" ? null : anchor.heading_level_or_null,
      landmark_role_or_null: anchor.landmark_role_or_null,
      native_identifier_or_null: isNativeSurface ? anchor.native_identifier : null,
      semantic_anchor_ref: anchor.semantic_anchor_ref,
    };
  };
  const bindingByCode = new Map(requiredAnchorCodes.map((anchorCode) => [anchorCode, bindingForCode(anchorCode)]));
  const supportAnchorRef = supportSurfaceKind === null ? null : bindingByCode.get(supportSurfaceKind)?.semantic_anchor_ref;
  const keyboardPathAnchorRefs = uniqueStrings([
    ...focusProfile.keyboard_path_anchor_refs,
    bindingByCode.get("PRIMARY_ACTION")?.semantic_anchor_ref,
    supportAnchorRef,
    returnAnchor?.semantic_anchor_ref,
  ]);
  const headingAnchorCodesInOrder = uniqueStrings([
    "DOMINANT_QUESTION",
    supportSurfaceKind,
    requiredAnchorCodes.includes("RECOVERY_NOTICE") ? "RECOVERY_NOTICE" : null,
    requiredAnchorCodes.includes("ARTIFACT_HANDOFF") ? "ARTIFACT_HANDOFF" : null,
  ]).filter((anchorCode) => requiredAnchorCodes.includes(anchorCode));
  const screenReaderAnchorCodesInOrder = uniqueStrings([
    "DOMINANT_QUESTION",
    requiredAnchorCodes.includes("SETTLEMENT_POSTURE") ? "SETTLEMENT_POSTURE" : null,
    requiredAnchorCodes.includes("PRIMARY_ACTION") ? "PRIMARY_ACTION" : null,
    supportSurfaceKind,
    requiredAnchorCodes.includes("RECOVERY_NOTICE") ? "RECOVERY_NOTICE" : null,
    requiredAnchorCodes.includes("ARTIFACT_HANDOFF") ? "ARTIFACT_HANDOFF" : null,
    returnAnchor === undefined ? null : "RETURN_PATH_CONTROL",
  ]).filter((anchorCode) => requiredAnchorCodes.includes(anchorCode));
  const landmarkAnchorCodesInOrder = uniqueStrings(
    requiredAnchorCodes.map((anchorCode) => {
      const binding = bindingByCode.get(anchorCode);
      return binding?.landmark_role_or_null === null ? null : anchorCode;
    }),
  );

  return {
    anchor_bindings: requiredAnchorCodes.map((anchorCode) => bindingForCode(anchorCode)),
    announced_change_kinds: contract.announced_change_kinds,
    automation_harness: isNativeSurface ? "XCUITEST" : "PLAYWRIGHT",
    case_id: input.caseId,
    covered_modalities: ["KEYBOARD_ONLY", "SCREEN_READER", "REDUCED_MOTION"],
    excessive_live_noise_detected: false,
    focus_entry_anchor_ref: keyboardPathAnchorRefs[0] ?? refForCode("SHELL_ROOT") ?? "",
    heading_anchor_codes_in_order: headingAnchorCodesInOrder,
    keyboard_path_anchor_refs: keyboardPathAnchorRefs,
    landmark_anchor_codes_in_order: landmarkAnchorCodesInOrder,
    live_region_mode_or_null: liveRegionMode,
    live_update_change_kind_or_null: liveUpdateChangeKind,
    live_update_focus_theft_detected: false,
    reduced_motion_recovery_story_matches_default: true,
    reduced_motion_semantics_preserved: true,
    required_anchor_codes: requiredAnchorCodes,
    return_path_anchor_code_or_null: returnAnchor === undefined ? null : "RETURN_PATH_CONTROL",
    screen_reader_anchor_codes_in_order: screenReaderAnchorCodesInOrder,
    selector_profile: contract.selector_profile,
    semantic_focus_order: contract.semantic_focus_order,
    shell_family: contract.shell_family,
    support_surface_keyboard_dismissible: supportSurfaceKind !== null,
    support_surface_keyboard_reachable: supportSurfaceKind !== null,
    support_surface_kind_or_null: supportSurfaceKind,
    support_surface_modal_trap_detected: false,
    surface_type: input.surfaceType,
    transition_classes: input.transitionClasses,
  } satisfies SemanticAccessibilityRegressionCase;
}

export function buildSemanticAccessibilityRegressionPack() {
  const cases = [
    regressionCaseForSurface({
      caseId: "semantic.low-noise.rebase",
      routeVariant: "LOW_NOISE_FRAME",
      surfaceType: "LowNoiseExperienceFrame",
      transitionClasses: ["REBASE", "SUPPORT_REGION_COLLAPSE"],
    }),
    regressionCaseForSurface({
      caseId: "semantic.workspace.reconnect",
      routeVariant: "COLLABORATION_WORKSPACE",
      surfaceType: "WorkspaceSnapshot",
      transitionClasses: ["RECONNECT", "LIVE_UPDATE"],
    }),
    regressionCaseForSurface({
      caseId: "semantic.portal.responsive-restack",
      routeVariant: "PORTAL_WORKSPACE",
      surfaceType: "ClientPortalWorkspace",
      transitionClasses: ["RESPONSIVE_RESTACK", "LIVE_UPDATE"],
    }),
    regressionCaseForSurface({
      caseId: "semantic.governance.support-collapse",
      routeVariant: "GOVERNANCE_OVERVIEW",
      surfaceType: "TenantGovernanceSnapshot",
      transitionClasses: ["SUPPORT_REGION_COLLAPSE", "LIVE_UPDATE"],
    }),
    regressionCaseForSurface({
      caseId: "semantic.native.primary",
      routeVariant: "NATIVE_OPERATOR_PRIMARY",
      surfaceType: "NativeOperatorWorkspaceScene",
      transitionClasses: ["RESPONSIVE_RESTACK"],
    }),
    regressionCaseForSurface({
      caseId: "semantic.native.secondary-return",
      routeVariant: "NATIVE_OPERATOR_SECONDARY",
      surfaceType: "NativeOperatorSecondaryWindowScene",
      transitionClasses: ["SECONDARY_WINDOW_RETURN"],
    }),
  ];

  return {
    cases,
    contract_version: "SEMANTIC_ACCESSIBILITY_REGRESSION_PACK_V1",
    deterministic_seed: 232,
    identifier_binding_policy: "AUTOMATION_IDENTIFIERS_MUST_EQUAL_SEMANTIC_ANCHOR_REFS",
    landmark_heading_policy: "LANDMARKS_AND_HEADINGS_MIRROR_VISIBLE_SHELL_STRUCTURE",
    live_update_announcement_policy: "DECISIVE_CHANGE_ANNOUNCED_WITHOUT_NOISE_OR_FOCUS_THEFT",
    modality_policy: "EVERY_CASE_COVERS_KEYBOARD_SCREEN_READER_AND_REDUCED_MOTION",
    pack_id: "pc_0232.semantic-accessibility-regression-pack",
    return_path_policy: "RETURN_PATH_CONTROLS_REMAIN_ADDRESSABLE_ACROSS_CONTEXTUAL_AND_SECONDARY_FLOWS",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    suite_profile: "CROSS_SHELL_SEMANTIC_ACCESSIBILITY_AND_ASSISTIVE_TECH_MATRIX",
    support_surface_policy: "PROMOTED_SUPPORT_AND_DETAIL_SURFACES_REMAIN_NON_MODAL_AND_ESCAPABLE",
    transition_stability_policy: "RESPONSIVE_REBASE_RECONNECT_AND_COLLAPSE_KEEP_SEMANTIC_ANCHORS_STABLE",
  } satisfies SemanticAccessibilityRegressionPack;
}
