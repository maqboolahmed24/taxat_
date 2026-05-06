import { isDeepStrictEqual } from "node:util";

import type {
  SemanticAccessibilityContract,
  SemanticAccessibilityContractAnnouncedChangeKind,
  SemanticAccessibilityContractAnchorCode,
  SemanticAccessibilityContractFocusRegionCode,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  getShellAnnouncementProfile,
  semanticAccessibilityLiveRegionModeByChangeKind,
} from "./get_shell_announcement_profile.ts";
import {
  getShellAnchorInventory,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilitySurfaceType,
} from "./get_shell_anchor_inventory.ts";
import { projectSemanticAccessibilityContract } from "./project_semantic_accessibility_contract.ts";

export class SemanticAccessibilityContractError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "SemanticAccessibilityContractError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new SemanticAccessibilityContractError(message, [...new Set(reasonCodes)]);
}

function addArrayDriftReason<T extends string>(
  input: {
    actual: readonly T[];
    expected: readonly T[];
    fieldName: string;
    reasonCode: string;
    reasonCodes: string[];
  },
) {
  if (!isDeepStrictEqual(input.actual, input.expected)) {
    input.reasonCodes.push(input.reasonCode, `SEMANTIC_ACCESSIBILITY_${input.fieldName}_DRIFT`);
  }
}

function requireAnchor(input: {
  anchors: ReadonlySet<SemanticAccessibilityContractAnchorCode>;
  reasonCode: string;
  reasonCodes: string[];
  requiredAnchor: SemanticAccessibilityContractAnchorCode;
}) {
  if (!input.anchors.has(input.requiredAnchor)) {
    input.reasonCodes.push(input.reasonCode);
  }
}

function indexOfAnchor(
  anchors: readonly SemanticAccessibilityContractAnchorCode[],
  anchor: SemanticAccessibilityContractAnchorCode,
) {
  return anchors.findIndex((candidate) => candidate === anchor);
}

function validateAnnouncementTaxonomy(input: {
  contract: SemanticAccessibilityContract;
  reasonCodes: string[];
  surfaceType: SemanticAccessibilitySurfaceType;
}) {
  const profile = getShellAnnouncementProfile({ surfaceType: input.surfaceType });
  const announced = new Set(input.contract.announced_change_kinds);
  for (const politeKind of ["ACTIVITY_DELTA", "BADGE_DELTA"] as const) {
    if (
      announced.has(politeKind) &&
      semanticAccessibilityLiveRegionModeByChangeKind[politeKind] !== "POLITE"
    ) {
      input.reasonCodes.push("SEMANTIC_ACCESSIBILITY_POLITE_ANNOUNCEMENT_DRIFT");
    }
  }
  for (const assertiveKind of [
    "COMMAND_FAILURE",
    "RECOVERY_NOTICE",
    "TERMINAL_SETTLEMENT",
  ] as const) {
    if (
      announced.has(assertiveKind) &&
      semanticAccessibilityLiveRegionModeByChangeKind[assertiveKind] !== "ASSERTIVE"
    ) {
      input.reasonCodes.push("SEMANTIC_ACCESSIBILITY_ASSERTIVE_ANNOUNCEMENT_DRIFT");
    }
  }
  const unknownLiveKinds = input.contract.announced_change_kinds.filter(
    (kind) =>
      !profile.contextual_notice_change_kinds.includes(kind) &&
      semanticAccessibilityLiveRegionModeByChangeKind[kind] === undefined,
  );
  if (unknownLiveKinds.length > 0) {
    input.reasonCodes.push("SEMANTIC_ACCESSIBILITY_UNKNOWN_ANNOUNCEMENT_KIND");
  }
}

export function validateSemanticAccessibilityContract(input: {
  contract: SemanticAccessibilityContract;
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType: SemanticAccessibilitySurfaceType;
}): SemanticAccessibilityContract {
  const expected = projectSemanticAccessibilityContract({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  const inventory = getShellAnchorInventory({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  const reasonCodes: string[] = [];

  for (const field of [
    "contract_version",
    "shell_family",
    "selector_profile",
    "identifier_semantics_policy",
    "browser_identifier_policy",
    "native_identifier_policy",
    "landmark_structure_policy",
    "heading_navigation_policy",
    "focus_order_policy",
    "focus_entry_policy",
    "focus_restore_policy",
    "keyboard_completion_policy",
    "live_update_focus_policy",
    "live_region_policy",
    "conditional_notice_anchor_policy",
    "support_region_access_policy",
    "detail_module_access_policy",
    "artifact_handoff_policy",
    "reduced_motion_policy",
  ] as const satisfies readonly (keyof SemanticAccessibilityContract)[]) {
    if (input.contract[field] !== expected[field]) {
      reasonCodes.push(`SEMANTIC_ACCESSIBILITY_${field.toUpperCase()}_DRIFT`);
    }
  }

  addArrayDriftReason<SemanticAccessibilityContractAnchorCode>({
    actual: input.contract.required_anchor_codes,
    expected: expected.required_anchor_codes,
    fieldName: "required_anchor_codes",
    reasonCode: "SEMANTIC_ACCESSIBILITY_ANCHOR_INVENTORY_DRIFT",
    reasonCodes,
  });
  addArrayDriftReason<SemanticAccessibilityContractFocusRegionCode>({
    actual: input.contract.semantic_focus_order,
    expected: expected.semantic_focus_order,
    fieldName: "semantic_focus_order",
    reasonCode: "SEMANTIC_ACCESSIBILITY_FOCUS_ORDER_DRIFT",
    reasonCodes,
  });
  addArrayDriftReason<SemanticAccessibilityContractAnnouncedChangeKind>({
    actual: input.contract.announced_change_kinds,
    expected: expected.announced_change_kinds,
    fieldName: "announced_change_kinds",
    reasonCode: "SEMANTIC_ACCESSIBILITY_ANNOUNCEMENT_INVENTORY_DRIFT",
    reasonCodes,
  });

  const anchors = new Set(input.contract.required_anchor_codes);
  for (const requiredAnchor of [
    "SHELL_ROOT",
    "SHELL_FAMILY",
    "OBJECT_ANCHOR",
    "DOMINANT_QUESTION",
    "SETTLEMENT_POSTURE",
    "RECOVERY_POSTURE",
  ] as const) {
    requireAnchor({
      anchors,
      reasonCode: `SEMANTIC_ACCESSIBILITY_MISSING_${requiredAnchor}`,
      reasonCodes,
      requiredAnchor,
    });
  }
  if (expected.required_anchor_codes.includes("DOMINANT_ACTION")) {
    requireAnchor({
      anchors,
      reasonCode: "SEMANTIC_ACCESSIBILITY_MISSING_DOMINANT_ACTION",
      reasonCodes,
      requiredAnchor: "DOMINANT_ACTION",
    });
  }
  if (anchors.has("PRIMARY_ACTION") && !anchors.has("DOMINANT_ACTION")) {
    reasonCodes.push("SEMANTIC_ACCESSIBILITY_PRIMARY_ACTION_WITHOUT_DOMINANT_ACTION");
  }
  if (inventory.return_path_control_required && !anchors.has("RETURN_PATH_CONTROL")) {
    reasonCodes.push("SEMANTIC_ACCESSIBILITY_MISSING_RETURN_PATH_CONTROL");
  }
  if (anchors.has("ARTIFACT_HANDOFF")) {
    const hasCurrentAndHistory = anchors.has("CURRENT_ARTIFACT") && anchors.has("HISTORY_LIST");
    const hasStateLabel = anchors.has("ARTIFACT_STATE_LABEL");
    if (!hasCurrentAndHistory && !hasStateLabel) {
      reasonCodes.push("SEMANTIC_ACCESSIBILITY_ARTIFACT_CURRENT_HISTORY_DRIFT");
    }
  }

  const dominantQuestionIndex = indexOfAnchor(
    input.contract.required_anchor_codes,
    "DOMINANT_QUESTION",
  );
  const dominantActionIndex = indexOfAnchor(input.contract.required_anchor_codes, "DOMINANT_ACTION");
  const primaryActionIndex = indexOfAnchor(input.contract.required_anchor_codes, "PRIMARY_ACTION");
  if (dominantQuestionIndex === -1) {
    reasonCodes.push("SEMANTIC_ACCESSIBILITY_DOMINANT_QUESTION_NOT_ADDRESSABLE");
  }
  if (dominantActionIndex !== -1 && dominantQuestionIndex > dominantActionIndex) {
    reasonCodes.push("SEMANTIC_ACCESSIBILITY_DOMINANT_QUESTION_READ_ORDER_DRIFT");
  }
  if (primaryActionIndex !== -1 && dominantActionIndex > primaryActionIndex) {
    reasonCodes.push("SEMANTIC_ACCESSIBILITY_DOMINANT_ACTION_READ_ORDER_DRIFT");
  }

  const firstFocusRegion = input.contract.semantic_focus_order[0];
  if (
    firstFocusRegion === undefined ||
    !new Set([
      "CONTEXT_BAR",
      "PORTAL_HEADER",
      "SECTION_NAV",
      "LEADING_SIDEBAR",
      "IDENTITY_HEADER",
    ]).has(firstFocusRegion)
  ) {
    reasonCodes.push("SEMANTIC_ACCESSIBILITY_ORIENTATION_REGION_DRIFT");
  }

  validateAnnouncementTaxonomy({
    contract: input.contract,
    reasonCodes,
    surfaceType: input.surfaceType,
  });

  if (reasonCodes.length > 0) {
    fail("semantic_accessibility_contract drifted from governed surface semantics", reasonCodes);
  }
  return input.contract;
}
