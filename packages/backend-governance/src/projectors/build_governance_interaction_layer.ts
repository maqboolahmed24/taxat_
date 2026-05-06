import { projectFoundationContractForShell } from "../../../backend-low-noise/src/services/project_foundation_contract_for_shell.ts";
import type { GovernanceInteractionLayer } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  deriveGovernanceFilterChipEcho,
  type GovernanceFilterRecord,
  type GovernanceInteractionRouteFamily,
} from "../services/derive_governance_filter_chip_echo.ts";
import {
  deriveGovernanceFocusAndCompactionState,
} from "../services/derive_governance_focus_and_compaction_state.ts";
import {
  deriveGovernancePreservedContext,
  type GovernancePreservedContextCode,
} from "../services/derive_governance_preserved_context.ts";

export type BuildGovernanceInteractionLayerInput = {
  activeFilters?: GovernanceFilterRecord | null | undefined;
  auxiliarySurfacePresentation?: GovernanceInteractionLayer["auxiliary_surface_presentation"] | undefined;
  compactionMode?: GovernanceInteractionLayer["compaction_mode"] | undefined;
  focusTrapMode?: GovernanceInteractionLayer["focus_trap_mode"] | undefined;
  modalStepUpRequired?: boolean | undefined;
  preservedContextCodes?: readonly GovernancePreservedContextCode[] | undefined;
  routeFamily: GovernanceInteractionRouteFamily;
  selectedFilterChipRefs?: readonly string[] | undefined;
};

export class GovernanceInteractionLayerProjectionError extends Error {
  readonly code:
    | "GOVERNANCE_INTERACTION_CHIP_DUPLICATE"
    | "GOVERNANCE_INTERACTION_FOUNDATION_DRIFT"
    | "GOVERNANCE_INTERACTION_SELECTOR_DRIFT";

  constructor(code: GovernanceInteractionLayerProjectionError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceInteractionLayerProjectionError";
    this.code = code;
  }
}

function assertUniqueChipRefs(values: readonly string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new GovernanceInteractionLayerProjectionError(
        "GOVERNANCE_INTERACTION_CHIP_DUPLICATE",
        `selected_filter_chip_refs cannot repeat ${value}`,
      );
    }
    seen.add(value);
  }
}

export function buildGovernanceInteractionLayer(
  input: BuildGovernanceInteractionLayerInput,
): GovernanceInteractionLayer {
  const compaction = deriveGovernanceFocusAndCompactionState({
    auxiliarySurfacePresentation: input.auxiliarySurfacePresentation,
    compactionMode: input.compactionMode,
    focusTrapMode: input.focusTrapMode,
    modalStepUpRequired: input.modalStepUpRequired,
  });
  const foundation_contract = projectFoundationContractForShell({
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
  });
  if (foundation_contract.shell_family !== "GOVERNANCE_DENSITY_SHELL") {
    throw new GovernanceInteractionLayerProjectionError(
      "GOVERNANCE_INTERACTION_FOUNDATION_DRIFT",
      "GovernanceInteractionLayer requires a GOVERNANCE_DENSITY_SHELL foundation contract",
    );
  }
  if (foundation_contract.selector_profile !== "GOVERNANCE_SEMANTIC_SELECTORS_V1") {
    throw new GovernanceInteractionLayerProjectionError(
      "GOVERNANCE_INTERACTION_SELECTOR_DRIFT",
      "GovernanceInteractionLayer selector profile must remain GOVERNANCE_SEMANTIC_SELECTORS_V1",
    );
  }

  const selected_filter_chip_refs =
    input.selectedFilterChipRefs === undefined
      ? deriveGovernanceFilterChipEcho({
          activeFilters: input.activeFilters,
          routeFamily: input.routeFamily,
        })
      : [...input.selectedFilterChipRefs];
  assertUniqueChipRefs(selected_filter_chip_refs);

  return {
    auxiliary_surface_presentation: compaction.auxiliary_surface_presentation,
    compaction_mode: compaction.compaction_mode,
    density_profile: "GOVERNANCE_DENSITY_PROFILE_V1",
    diff_basket_policy: "STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT",
    export_binding_policy: "ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
    focus_trap_mode: compaction.focus_trap_mode,
    foundation_contract,
    inventory_filter_grammar: "CANONICAL_ROUTE_FILTER_GRAMMAR",
    keyboard_focus_policy: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    preserved_context_codes: deriveGovernancePreservedContext({
      compactionMode: compaction.compaction_mode,
      overrideContextCodes: input.preservedContextCodes,
      routeFamily: input.routeFamily,
    }),
    selected_filter_chip_refs,
    selection_persistence_mode: "PRESERVE_WHILE_OBJECT_RESOLVES",
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
  };
}

