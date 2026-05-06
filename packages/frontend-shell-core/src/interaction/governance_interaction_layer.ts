import type { InteractionLayerFoundationContract } from "../route_contracts/interaction_layer_foundation";
import {
  foundationContractForInteractionLayer,
} from "./foundation_contract";
import { failInteractionContract } from "./interaction_contract_errors";

export type GovernanceCompactionMode = "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
export type GovernanceAuxiliarySurfacePresentation = "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
export type GovernanceFocusTrapMode = "NON_MODAL" | "MODAL_EXPLICIT";
export type GovernancePreservedContextCode =
  | "ACTIVE_FILTERS"
  | "ACTIVE_SECTION"
  | "SELECTION"
  | "FOCUS_ANCHOR"
  | "PROMOTED_SUPPORT_SURFACE"
  | "STAGED_DIFF"
  | "CHANGE_BASKET"
  | "GUIDED_HANDSHAKE_STEP"
  | "QUERY_SLICE";

export type GovernanceInteractionLayer = {
  foundation_contract: InteractionLayerFoundationContract & {
    shell_family: "GOVERNANCE_DENSITY_SHELL";
  };
  density_profile: "GOVERNANCE_DENSITY_PROFILE_V1";
  inventory_filter_grammar: "CANONICAL_ROUTE_FILTER_GRAMMAR";
  support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX";
  diff_basket_policy: "STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT";
  export_binding_policy: "ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT";
  keyboard_focus_policy: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION";
  selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1";
  selected_filter_chip_refs: readonly string[];
  compaction_mode: GovernanceCompactionMode;
  auxiliary_surface_presentation: GovernanceAuxiliarySurfacePresentation;
  focus_trap_mode: GovernanceFocusTrapMode;
  selection_persistence_mode: "PRESERVE_WHILE_OBJECT_RESOLVES";
  preserved_context_codes: readonly GovernancePreservedContextCode[];
  motion_profile: "SUBTLE_CAUSAL_ONLY";
  feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
};

export const governanceDefaultPreservedContextCodes = [
  "ACTIVE_FILTERS",
  "SELECTION",
  "FOCUS_ANCHOR",
  "PROMOTED_SUPPORT_SURFACE",
] as const satisfies readonly GovernancePreservedContextCode[];

function defaultAuxiliarySurfacePresentation(
  compactionMode: GovernanceCompactionMode,
): GovernanceAuxiliarySurfacePresentation {
  if (compactionMode === "AUXILIARY_TRAY") {
    return "TRAY";
  }
  if (compactionMode === "AUXILIARY_DRAWER" || compactionMode === "FOCUS_STACK") {
    return "DRAWER";
  }
  return "SIDECAR";
}

function assertCompactionPresentationPair(input: {
  auxiliarySurfacePresentation: GovernanceAuxiliarySurfacePresentation;
  compactionMode: GovernanceCompactionMode;
}) {
  if (input.compactionMode === "WIDE" && input.auxiliarySurfacePresentation === "TRAY") {
    failInteractionContract(
      "INTERACTION_FOUNDATION_TOKEN_MISMATCH",
      "Governance wide posture cannot serialize the promoted auxiliary region as TRAY.",
      input,
    );
  }
  if (
    input.compactionMode === "AUXILIARY_TRAY" &&
    input.auxiliarySurfacePresentation !== "TRAY"
  ) {
    failInteractionContract(
      "INTERACTION_FOUNDATION_TOKEN_MISMATCH",
      "Governance tray compaction requires auxiliary surface presentation TRAY.",
      input,
    );
  }
  if (
    input.compactionMode === "AUXILIARY_DRAWER" &&
    !["DRAWER", "INSPECTOR"].includes(input.auxiliarySurfacePresentation)
  ) {
    failInteractionContract(
      "INTERACTION_FOUNDATION_TOKEN_MISMATCH",
      "Governance drawer compaction requires DRAWER or INSPECTOR presentation.",
      input,
    );
  }
  if (
    ["AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"].includes(input.compactionMode) &&
    input.auxiliarySurfacePresentation === "SIDECAR"
  ) {
    failInteractionContract(
      "INTERACTION_FOUNDATION_TOKEN_MISMATCH",
      "Governance compact posture cannot keep SIDECAR presentation.",
      input,
    );
  }
}

export function buildGovernanceInteractionLayer(input: {
  auxiliarySurfacePresentation?: GovernanceAuxiliarySurfacePresentation | undefined;
  compactionMode?: GovernanceCompactionMode | undefined;
  focusTrapMode?: GovernanceFocusTrapMode | undefined;
  foundationContract?: InteractionLayerFoundationContract | undefined;
  modalCheckpointRef?: string | undefined;
  preservedContextCodes?: readonly GovernancePreservedContextCode[] | undefined;
  selectedFilterChipRefs?: readonly string[] | undefined;
} = {}) {
  const foundation = foundationContractForInteractionLayer(
    "GOVERNANCE_DENSITY_SHELL",
    input.foundationContract,
  ) as GovernanceInteractionLayer["foundation_contract"];
  const compactionMode = input.compactionMode ?? "WIDE";
  const auxiliarySurfacePresentation =
    input.auxiliarySurfacePresentation ?? defaultAuxiliarySurfacePresentation(compactionMode);
  const focusTrapMode = input.focusTrapMode ?? "NON_MODAL";

  assertCompactionPresentationPair({ auxiliarySurfacePresentation, compactionMode });
  if (focusTrapMode === "MODAL_EXPLICIT" && !input.modalCheckpointRef) {
    failInteractionContract(
      "GOVERNANCE_MODAL_CHECKPOINT_REQUIRED",
      "Governance modal focus traps require an explicit high-risk checkpoint reference.",
      { focus_trap_mode: focusTrapMode },
    );
  }

  return {
    auxiliary_surface_presentation: auxiliarySurfacePresentation,
    compaction_mode: compactionMode,
    density_profile: "GOVERNANCE_DENSITY_PROFILE_V1",
    diff_basket_policy: "STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT",
    export_binding_policy: "ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT",
    feedback_truth_policy: foundation.feedback_truth_policy,
    focus_trap_mode: focusTrapMode,
    foundation_contract: foundation,
    inventory_filter_grammar: "CANONICAL_ROUTE_FILTER_GRAMMAR",
    keyboard_focus_policy: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    motion_profile: foundation.motion_profile,
    preserved_context_codes: [...(input.preservedContextCodes ?? governanceDefaultPreservedContextCodes)],
    selected_filter_chip_refs: [...(input.selectedFilterChipRefs ?? [])],
    selection_persistence_mode: "PRESERVE_WHILE_OBJECT_RESOLVES",
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    support_surface_policy: foundation.support_surface_policy,
  } satisfies GovernanceInteractionLayer;
}
