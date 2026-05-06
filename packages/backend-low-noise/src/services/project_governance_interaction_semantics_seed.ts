import type {
  GovernanceInteractionLayer,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import type {
  InteractionLayerFoundationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { projectFoundationContractForShell } from "./project_foundation_contract_for_shell.ts";

export const governanceOverviewPreservedContextCodes = [
  "ACTIVE_FILTERS",
  "SELECTION",
  "FOCUS_ANCHOR",
  "PROMOTED_SUPPORT_SURFACE",
] as const satisfies readonly GovernanceInteractionLayer["preserved_context_codes"][number][];

function defaultAuxiliarySurfacePresentation(
  compactionMode: GovernanceInteractionLayer["compaction_mode"],
): GovernanceInteractionLayer["auxiliary_surface_presentation"] {
  if (compactionMode === "AUXILIARY_TRAY") {
    return "TRAY";
  }
  if (compactionMode === "AUXILIARY_DRAWER" || compactionMode === "FOCUS_STACK") {
    return "DRAWER";
  }
  return "SIDECAR";
}

function assertCompactionPresentationPair(input: {
  auxiliarySurfacePresentation: GovernanceInteractionLayer["auxiliary_surface_presentation"];
  compactionMode: GovernanceInteractionLayer["compaction_mode"];
}) {
  if (input.compactionMode === "WIDE" && input.auxiliarySurfacePresentation === "TRAY") {
    throw new Error("Governance wide posture cannot serialize the promoted auxiliary region as TRAY");
  }
  if (
    input.compactionMode === "AUXILIARY_TRAY" &&
    input.auxiliarySurfacePresentation !== "TRAY"
  ) {
    throw new Error("Governance tray compaction requires auxiliarySurfacePresentation TRAY");
  }
  if (
    input.compactionMode === "AUXILIARY_DRAWER" &&
    !["DRAWER", "INSPECTOR"].includes(input.auxiliarySurfacePresentation)
  ) {
    throw new Error("Governance drawer compaction requires DRAWER or INSPECTOR presentation");
  }
  if (
    ["AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"].includes(input.compactionMode) &&
    input.auxiliarySurfacePresentation === "SIDECAR"
  ) {
    throw new Error("Governance compact posture cannot keep SIDECAR presentation");
  }
}

export function projectGovernanceInteractionSemanticsSeed(input: {
  auxiliarySurfacePresentation?: GovernanceInteractionLayer["auxiliary_surface_presentation"] | undefined;
  compactionMode?: GovernanceInteractionLayer["compaction_mode"] | undefined;
  focusTrapMode?: GovernanceInteractionLayer["focus_trap_mode"] | undefined;
  foundationContract?: InteractionLayerFoundationContract | undefined;
  preservedContextCodes?: readonly GovernanceInteractionLayer["preserved_context_codes"][number][] | undefined;
  selectedFilterChipRefs?: readonly string[] | undefined;
} = {}): GovernanceInteractionLayer {
  const foundationContract =
    input.foundationContract ??
    projectFoundationContractForShell({ shellFamily: "GOVERNANCE_DENSITY_SHELL" });
  if (foundationContract.shell_family !== "GOVERNANCE_DENSITY_SHELL") {
    throw new Error("GovernanceInteractionLayer requires a GOVERNANCE_DENSITY_SHELL foundation contract");
  }
  const compactionMode = input.compactionMode ?? "WIDE";
  const auxiliarySurfacePresentation =
    input.auxiliarySurfacePresentation ?? defaultAuxiliarySurfacePresentation(compactionMode);
  assertCompactionPresentationPair({ auxiliarySurfacePresentation, compactionMode });

  return {
    auxiliary_surface_presentation: auxiliarySurfacePresentation,
    compaction_mode: compactionMode,
    density_profile: "GOVERNANCE_DENSITY_PROFILE_V1",
    diff_basket_policy: "STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT",
    export_binding_policy: "ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT",
    feedback_truth_policy: foundationContract.feedback_truth_policy,
    focus_trap_mode: input.focusTrapMode ?? "NON_MODAL",
    foundation_contract: foundationContract,
    inventory_filter_grammar: "CANONICAL_ROUTE_FILTER_GRAMMAR",
    keyboard_focus_policy: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    motion_profile: foundationContract.motion_profile,
    preserved_context_codes: [...(input.preservedContextCodes ?? governanceOverviewPreservedContextCodes)],
    selected_filter_chip_refs: [...(input.selectedFilterChipRefs ?? [])],
    selection_persistence_mode: "PRESERVE_WHILE_OBJECT_RESOLVES",
    selector_profile: foundationContract.selector_profile,
    support_surface_policy: foundationContract.support_surface_policy,
  };
}
