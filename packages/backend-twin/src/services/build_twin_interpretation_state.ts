import { twinDeltaArcRef, type TwinDeltaArcRecord } from "../models/twin_delta_arc.ts";
import {
  buildTwinInterpretationStateRecord,
  twinInterpretationStateRef,
  type TwinDominantAttentionState,
  type TwinInterpretationStateRecord,
} from "../models/twin_interpretation_state.ts";
import type { TwinMismatchSummaryRecord } from "../models/twin_mismatch_summary.ts";
import type { TwinReadinessStateRecord } from "../models/twin_readiness_state.ts";
import {
  twinReconciliationStateRef,
  type TwinReconciliationStateRecord,
} from "../models/twin_reconciliation_state.ts";
import { TwinInterpretationStateRepository } from "../repositories/twin_interpretation_state_repository.ts";

export type BuildTwinInterpretationStateInput = {
  deltas?: readonly TwinDeltaArcRecord[];
  interpretation_repository?: TwinInterpretationStateRepository;
  mismatch_summary: TwinMismatchSummaryRecord;
  readiness: TwinReadinessStateRecord;
  reconciliation_state: TwinReconciliationStateRecord;
};

export type BuildTwinInterpretationStateResult = {
  interpretation_state: TwinInterpretationStateRecord;
  repository: TwinInterpretationStateRepository;
  stored: Awaited<ReturnType<TwinInterpretationStateRepository["persistTwinInterpretationState"]>>;
};

function firstPresent(...values: readonly (string | null | undefined)[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

function dominantAttentionState(input: BuildTwinInterpretationStateInput): TwinDominantAttentionState {
  if (
    input.reconciliation_state.reason_codes.includes("ACK_CONTRADICTORY") ||
    input.readiness.contradictory_mismatch_refs.length > 0
  ) {
    return "CONTRADICTORY";
  }
  if (
    input.reconciliation_state.reason_codes.includes("OUT_OF_BAND") ||
    input.readiness.out_of_band_mismatch_refs.length > 0
  ) {
    return "OUT_OF_BAND";
  }
  if (input.reconciliation_state.lifecycle_state === "WAITING_ON_AUTHORITY") {
    return "WAITING_ON_AUTHORITY";
  }
  if (!["NOT_REQUIRED", "RESOLVED", "SUPERSEDED"].includes(input.reconciliation_state.lifecycle_state)) {
    return "RECONCILIATION_REQUIRED";
  }
  if (input.readiness.non_comparable_mismatch_refs.length > 0) {
    return "NON_COMPARABLE";
  }
  if (input.readiness.twin_readiness_class === "REVIEW_REQUIRED") {
    return "REVIEW_REQUIRED";
  }
  if (input.readiness.twin_readiness_class === "WAITING_ON_AUTHORITY") {
    return "WAITING_ON_AUTHORITY";
  }
  if (input.readiness.twin_readiness_class === "RECONCILIATION_REQUIRED") {
    return "RECONCILIATION_REQUIRED";
  }
  if (input.readiness.twin_readiness_class === "BLOCKED") {
    return "REVIEW_REQUIRED";
  }
  return "READY";
}

function dominantDeltaRef(input: BuildTwinInterpretationStateInput) {
  const readinessDominantRef = firstPresent(
    input.readiness.contradictory_mismatch_refs[0],
    input.readiness.out_of_band_mismatch_refs[0],
    input.readiness.reconciliation_mismatch_refs[0],
    input.readiness.waiting_mismatch_refs[0],
    input.readiness.blocking_mismatch_refs[0],
    input.readiness.non_comparable_mismatch_refs[0],
    input.readiness.review_mismatch_refs[0],
  );
  if (readinessDominantRef !== null) {
    return readinessDominantRef;
  }
  return input.mismatch_summary.top_mismatch_refs[0] ?? null;
}

export async function buildTwinInterpretationState(
  input: BuildTwinInterpretationStateInput,
): Promise<BuildTwinInterpretationStateResult> {
  const repository = input.interpretation_repository ?? new TwinInterpretationStateRepository();
  const dominantAttention = dominantAttentionState(input);
  const dominantDelta = dominantAttention === "READY" ? null : dominantDeltaRef(input);
  const reconciliationRef = twinReconciliationStateRef(input.reconciliation_state);
  const reconciliationDominantRef = [
    "WAITING_ON_AUTHORITY",
    "RECONCILIATION_REQUIRED",
    "OUT_OF_BAND",
    "CONTRADICTORY",
  ].includes(dominantAttention)
    ? reconciliationRef
    : null;
  const activeDeltaRef =
    dominantDelta ??
    (input.deltas ?? [])
      .map((delta) => twinDeltaArcRef(delta))
      .find((deltaRef) => input.mismatch_summary.top_mismatch_refs.includes(deltaRef)) ??
    null;
  const interpretationState = buildTwinInterpretationStateRecord({
    active_delta_arc_ref: dominantAttention === "READY" ? null : activeDeltaRef,
    authority_first_summary: true,
    collapse_matches_by_default: true,
    compare_mode: dominantAttention === "READY" || activeDeltaRef === null ? "LOCKED" : "DELTA_COMPARE",
    default_noise_filter: "ACTIONABLE_ONLY",
    default_sort_mode: "PRIORITY_RANK",
    default_view_space: "AUTHORITY_SPACE",
    dominant_attention_state: dominantAttention,
    dominant_delta_arc_ref_or_null: dominantDelta,
    dominant_reconciliation_state_ref_or_null: reconciliationDominantRef,
    execution_mode_boundary_contract: input.readiness.execution_mode_boundary_contract,
    focus_anchor_ref: reconciliationDominantRef ?? dominantDelta,
    preserve_focus_across_refresh: true,
    show_confidence_overlay: input.readiness.decision_usefulness !== "HIGH",
    show_freshness_overlay:
      input.readiness.authority_posture === "STALE" ||
      input.mismatch_summary.stale_count > 0 ||
      input.readiness.safe_action_state === "REFRESH_REQUIRED",
    summary_priority_mode: reconciliationDominantRef !== null ? "AUTHORITY_FIRST" : "ACTIONABILITY_FIRST",
    suppress_informational_when_higher_severity_present: input.mismatch_summary.mismatch_count > 0,
    twin_id: input.readiness.twin_id,
  });
  const stored = await repository.persistTwinInterpretationState({
    interpretation_state: interpretationState,
  });
  return {
    interpretation_state: interpretationState,
    repository,
    stored,
  };
}
