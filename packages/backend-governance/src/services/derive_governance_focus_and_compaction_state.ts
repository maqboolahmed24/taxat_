import type { GovernanceInteractionLayer } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type GovernanceFocusAndCompactionState = Pick<
  GovernanceInteractionLayer,
  "auxiliary_surface_presentation" | "compaction_mode" | "focus_trap_mode"
>;

export class GovernanceFocusAndCompactionError extends Error {
  readonly code:
    | "GOVERNANCE_COMPACTION_PRESENTATION_INVALID"
    | "GOVERNANCE_MODAL_FOCUS_FORBIDDEN";

  constructor(code: GovernanceFocusAndCompactionError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceFocusAndCompactionError";
    this.code = code;
  }
}

function defaultPresentation(
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

function assertPresentationPair(input: GovernanceFocusAndCompactionState) {
  if (
    input.compaction_mode === "WIDE" &&
    input.auxiliary_surface_presentation === "TRAY"
  ) {
    throw new GovernanceFocusAndCompactionError(
      "GOVERNANCE_COMPACTION_PRESENTATION_INVALID",
      "wide governance posture cannot serialize the promoted auxiliary region as a tray",
    );
  }
  if (
    input.compaction_mode === "AUXILIARY_TRAY" &&
    input.auxiliary_surface_presentation !== "TRAY"
  ) {
    throw new GovernanceFocusAndCompactionError(
      "GOVERNANCE_COMPACTION_PRESENTATION_INVALID",
      "tray compaction requires auxiliary_surface_presentation = TRAY",
    );
  }
  if (
    input.compaction_mode === "AUXILIARY_DRAWER" &&
    !["DRAWER", "INSPECTOR"].includes(input.auxiliary_surface_presentation)
  ) {
    throw new GovernanceFocusAndCompactionError(
      "GOVERNANCE_COMPACTION_PRESENTATION_INVALID",
      "drawer compaction requires auxiliary surface presentation DRAWER or INSPECTOR",
    );
  }
  if (
    ["AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"].includes(input.compaction_mode) &&
    input.auxiliary_surface_presentation === "SIDECAR"
  ) {
    throw new GovernanceFocusAndCompactionError(
      "GOVERNANCE_COMPACTION_PRESENTATION_INVALID",
      "compact governance posture cannot keep SIDECAR presentation",
    );
  }
}

export function deriveGovernanceFocusAndCompactionState(input: {
  auxiliarySurfacePresentation?: GovernanceInteractionLayer["auxiliary_surface_presentation"] | undefined;
  compactionMode?: GovernanceInteractionLayer["compaction_mode"] | undefined;
  focusTrapMode?: GovernanceInteractionLayer["focus_trap_mode"] | undefined;
  modalStepUpRequired?: boolean | undefined;
} = {}): GovernanceFocusAndCompactionState {
  const compaction_mode = input.compactionMode ?? "WIDE";
  const auxiliary_surface_presentation =
    input.auxiliarySurfacePresentation ?? defaultPresentation(compaction_mode);
  const focus_trap_mode = input.focusTrapMode ?? "NON_MODAL";
  const state = {
    auxiliary_surface_presentation,
    compaction_mode,
    focus_trap_mode,
  } satisfies GovernanceFocusAndCompactionState;
  assertPresentationPair(state);
  if (focus_trap_mode === "MODAL_EXPLICIT" && input.modalStepUpRequired !== true) {
    throw new GovernanceFocusAndCompactionError(
      "GOVERNANCE_MODAL_FOCUS_FORBIDDEN",
      "ordinary governance drawers and inspectors must remain NON_MODAL",
    );
  }
  return state;
}

