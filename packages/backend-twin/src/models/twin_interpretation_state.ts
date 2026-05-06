import {
  assertEnum,
  cloneRecord,
  normalizeExecutionModeBoundaryContract,
  normalizeNullableString,
  normalizeOrderedStringSet,
  requireString,
  type ExecutionModeBoundaryContract,
  TwinModelError,
} from "./twin_common.ts";

export type TwinViewSpace = "SOURCE_SPACE" | "COMPUTATION_SPACE" | "AUTHORITY_SPACE";
export type TwinCompareMode = "LOCKED" | "DELTA_COMPARE" | "PINNED_COMPARE";
export type TwinDefaultSortMode = "PRIORITY_RANK" | "TIMELINE" | "SUBJECT_CLASS";
export type TwinDefaultNoiseFilter = "ACTIONABLE_ONLY" | "REVIEW_AND_ABOVE" | "ALL_MISMATCHES";
export type TwinSummaryPriorityMode = "ACTIONABILITY_FIRST" | "AUTHORITY_FIRST" | "AUDIT_FIRST";
export type TwinDominantAttentionState =
  | "READY"
  | "REVIEW_REQUIRED"
  | "WAITING_ON_AUTHORITY"
  | "RECONCILIATION_REQUIRED"
  | "NON_COMPARABLE"
  | "OUT_OF_BAND"
  | "CONTRADICTORY";

export type TwinInterpretationStateRecord = {
  active_delta_arc_ref: string | null;
  artifact_type: "TwinInterpretationState";
  authority_first_summary: boolean;
  collapse_matches_by_default: boolean;
  compare_mode: TwinCompareMode;
  default_noise_filter: TwinDefaultNoiseFilter;
  default_sort_mode: TwinDefaultSortMode;
  default_view_space: TwinViewSpace;
  dominant_attention_state: TwinDominantAttentionState;
  dominant_delta_arc_ref_or_null: string | null;
  dominant_reconciliation_state_ref_or_null: string | null;
  enabled_view_spaces: TwinViewSpace[];
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  focus_anchor_ref: string | null;
  generated_from_surface: "TWIN_PANEL";
  pinned_object_ref: string | null;
  preserve_focus_across_refresh: boolean;
  show_confidence_overlay: boolean;
  show_freshness_overlay: boolean;
  summary_priority_mode: TwinSummaryPriorityMode;
  suppress_informational_when_higher_severity_present: boolean;
  twin_id: string;
  twin_interpretation_state_id: string;
};

export type TwinInterpretationStateBuildInput = Partial<
  Omit<
    TwinInterpretationStateRecord,
    | "artifact_type"
    | "enabled_view_spaces"
    | "execution_mode_boundary_contract"
    | "generated_from_surface"
    | "twin_id"
  >
> & {
  enabled_view_spaces?: readonly TwinViewSpace[];
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  twin_id: string;
};

const VIEW_SPACES = [
  "SOURCE_SPACE",
  "COMPUTATION_SPACE",
  "AUTHORITY_SPACE",
] as const satisfies readonly TwinViewSpace[];
const COMPARE_MODES = ["LOCKED", "DELTA_COMPARE", "PINNED_COMPARE"] as const satisfies readonly TwinCompareMode[];
const SORT_MODES = ["PRIORITY_RANK", "TIMELINE", "SUBJECT_CLASS"] as const satisfies readonly TwinDefaultSortMode[];
const NOISE_FILTERS = [
  "ACTIONABLE_ONLY",
  "REVIEW_AND_ABOVE",
  "ALL_MISMATCHES",
] as const satisfies readonly TwinDefaultNoiseFilter[];
const SUMMARY_MODES = [
  "ACTIONABILITY_FIRST",
  "AUTHORITY_FIRST",
  "AUDIT_FIRST",
] as const satisfies readonly TwinSummaryPriorityMode[];
const DOMINANT_ATTENTION_STATES = [
  "READY",
  "REVIEW_REQUIRED",
  "WAITING_ON_AUTHORITY",
  "RECONCILIATION_REQUIRED",
  "NON_COMPARABLE",
  "OUT_OF_BAND",
  "CONTRADICTORY",
] as const satisfies readonly TwinDominantAttentionState[];

const RECONCILIATION_DOMINANT_STATES = new Set<TwinDominantAttentionState>([
  "WAITING_ON_AUTHORITY",
  "RECONCILIATION_REQUIRED",
  "OUT_OF_BAND",
  "CONTRADICTORY",
]);

export function twinInterpretationStateRef(
  interpretation: Pick<TwinInterpretationStateRecord, "twin_interpretation_state_id"> | string,
) {
  return `twin-interpretation-state://${
    typeof interpretation === "string"
      ? requireString("twin_interpretation_state_id", interpretation)
      : interpretation.twin_interpretation_state_id
  }`;
}

export function buildTwinInterpretationStateRecord(
  input: TwinInterpretationStateBuildInput,
): TwinInterpretationStateRecord {
  const dominantAttentionState = assertEnum(
    "dominant_attention_state",
    input.dominant_attention_state ?? "READY",
    DOMINANT_ATTENTION_STATES,
  );
  const dominantDeltaArcRef = normalizeNullableString(
    "dominant_delta_arc_ref_or_null",
    input.dominant_delta_arc_ref_or_null,
  );
  const dominantReconciliationRef = normalizeNullableString(
    "dominant_reconciliation_state_ref_or_null",
    input.dominant_reconciliation_state_ref_or_null,
  );
  const compareMode = assertEnum(
    "compare_mode",
    input.compare_mode ?? (dominantDeltaArcRef === null ? "LOCKED" : "DELTA_COMPARE"),
    COMPARE_MODES,
  );
  const record: TwinInterpretationStateRecord = {
    active_delta_arc_ref: normalizeNullableString(
      "active_delta_arc_ref",
      input.active_delta_arc_ref ?? (compareMode === "DELTA_COMPARE" ? dominantDeltaArcRef : null),
    ),
    artifact_type: "TwinInterpretationState",
    authority_first_summary: input.authority_first_summary ?? true,
    collapse_matches_by_default: input.collapse_matches_by_default ?? true,
    compare_mode: compareMode,
    default_noise_filter: assertEnum(
      "default_noise_filter",
      input.default_noise_filter ?? "ACTIONABLE_ONLY",
      NOISE_FILTERS,
    ),
    default_sort_mode: assertEnum("default_sort_mode", input.default_sort_mode ?? "PRIORITY_RANK", SORT_MODES),
    default_view_space: assertEnum("default_view_space", input.default_view_space ?? "AUTHORITY_SPACE", VIEW_SPACES),
    dominant_attention_state: dominantAttentionState,
    dominant_delta_arc_ref_or_null: dominantDeltaArcRef,
    dominant_reconciliation_state_ref_or_null: dominantReconciliationRef,
    enabled_view_spaces: normalizeOrderedStringSet(
      "enabled_view_spaces",
      input.enabled_view_spaces ?? ["SOURCE_SPACE", "COMPUTATION_SPACE", "AUTHORITY_SPACE"],
      { minItems: 1 },
    ).map((viewSpace) => assertEnum("enabled_view_spaces", viewSpace, VIEW_SPACES)),
    execution_mode_boundary_contract: normalizeExecutionModeBoundaryContract(input.execution_mode_boundary_contract),
    focus_anchor_ref: normalizeNullableString(
      "focus_anchor_ref",
      input.focus_anchor_ref ?? dominantReconciliationRef ?? dominantDeltaArcRef,
    ),
    generated_from_surface: "TWIN_PANEL",
    pinned_object_ref: normalizeNullableString("pinned_object_ref", input.pinned_object_ref),
    preserve_focus_across_refresh: input.preserve_focus_across_refresh ?? true,
    show_confidence_overlay: input.show_confidence_overlay ?? false,
    show_freshness_overlay: input.show_freshness_overlay ?? false,
    summary_priority_mode: assertEnum(
      "summary_priority_mode",
      input.summary_priority_mode ?? "AUTHORITY_FIRST",
      SUMMARY_MODES,
    ),
    suppress_informational_when_higher_severity_present:
      input.suppress_informational_when_higher_severity_present ?? dominantAttentionState !== "READY",
    twin_id: requireString("twin_id", input.twin_id),
    twin_interpretation_state_id:
      input.twin_interpretation_state_id ?? `twin-interpretation-state.${input.twin_id}`,
  };
  return normalizeTwinInterpretationStateRecord(record);
}

export function normalizeTwinInterpretationStateRecord(
  input: TwinInterpretationStateRecord,
): TwinInterpretationStateRecord {
  const record: TwinInterpretationStateRecord = {
    ...input,
    active_delta_arc_ref: normalizeNullableString("active_delta_arc_ref", input.active_delta_arc_ref),
    artifact_type: "TwinInterpretationState",
    compare_mode: assertEnum("compare_mode", input.compare_mode, COMPARE_MODES),
    default_noise_filter: assertEnum("default_noise_filter", input.default_noise_filter, NOISE_FILTERS),
    default_sort_mode: assertEnum("default_sort_mode", input.default_sort_mode, SORT_MODES),
    default_view_space: assertEnum("default_view_space", input.default_view_space, VIEW_SPACES),
    dominant_attention_state: assertEnum(
      "dominant_attention_state",
      input.dominant_attention_state,
      DOMINANT_ATTENTION_STATES,
    ),
    dominant_delta_arc_ref_or_null: normalizeNullableString(
      "dominant_delta_arc_ref_or_null",
      input.dominant_delta_arc_ref_or_null,
    ),
    dominant_reconciliation_state_ref_or_null: normalizeNullableString(
      "dominant_reconciliation_state_ref_or_null",
      input.dominant_reconciliation_state_ref_or_null,
    ),
    enabled_view_spaces: normalizeOrderedStringSet("enabled_view_spaces", input.enabled_view_spaces, {
      minItems: 1,
    }).map((viewSpace) => assertEnum("enabled_view_spaces", viewSpace, VIEW_SPACES)),
    execution_mode_boundary_contract: normalizeExecutionModeBoundaryContract(input.execution_mode_boundary_contract),
    focus_anchor_ref: normalizeNullableString("focus_anchor_ref", input.focus_anchor_ref),
    generated_from_surface: "TWIN_PANEL",
    pinned_object_ref: normalizeNullableString("pinned_object_ref", input.pinned_object_ref),
    twin_id: requireString("twin_id", input.twin_id),
    twin_interpretation_state_id: requireString(
      "twin_interpretation_state_id",
      input.twin_interpretation_state_id,
    ),
  };
  if (!record.enabled_view_spaces.includes(record.default_view_space)) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "enabled_view_spaces must contain default_view_space");
  }
  if (record.compare_mode === "LOCKED") {
    if (record.pinned_object_ref !== null || record.active_delta_arc_ref !== null) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "LOCKED interpretation must clear pinned and active delta refs");
    }
  }
  if (record.compare_mode === "DELTA_COMPARE" && record.active_delta_arc_ref === null) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "DELTA_COMPARE interpretation requires active_delta_arc_ref");
  }
  if (
    record.compare_mode === "PINNED_COMPARE" &&
    (record.pinned_object_ref === null || record.focus_anchor_ref === null)
  ) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "PINNED_COMPARE interpretation requires pinned object and focus anchor");
  }
  if (
    record.dominant_attention_state === "READY" &&
    (record.dominant_delta_arc_ref_or_null !== null ||
      record.dominant_reconciliation_state_ref_or_null !== null)
  ) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "READY interpretation must clear dominant refs");
  }
  if (RECONCILIATION_DOMINANT_STATES.has(record.dominant_attention_state)) {
    if (
      record.dominant_reconciliation_state_ref_or_null === null ||
      !record.authority_first_summary ||
      record.default_noise_filter === "ALL_MISMATCHES" ||
      record.summary_priority_mode === "AUDIT_FIRST"
    ) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "reconciliation-dominant interpretation must retain reconciliation ref and low-noise authority-first defaults",
      );
    }
  }
  if (
    ["REVIEW_REQUIRED", "NON_COMPARABLE"].includes(record.dominant_attention_state) &&
    record.dominant_delta_arc_ref_or_null === null &&
    record.dominant_reconciliation_state_ref_or_null === null
  ) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "review and non-comparable interpretation states require a dominant delta or reconciliation ref",
    );
  }
  if (record.dominant_attention_state !== "READY" && record.default_noise_filter === "ALL_MISMATCHES") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "non-ready interpretation must not default to ALL_MISMATCHES");
  }
  if (record.summary_priority_mode === "AUDIT_FIRST" && record.dominant_attention_state !== "READY") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "AUDIT_FIRST is valid only for READY interpretation");
  }
  return record;
}

export function cloneTwinInterpretationStateRecord(record: TwinInterpretationStateRecord) {
  return cloneRecord(record);
}
