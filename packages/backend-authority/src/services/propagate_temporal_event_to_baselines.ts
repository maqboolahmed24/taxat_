import {
  temporalPropagationEventRef,
  type TemporalPropagationEventRecord,
} from "../models/temporal_propagation_event.ts";

export type TemporalBaselinePropagationProjection = {
  active_exact_scope_key: string;
  affected_scope_refs: string[];
  automation_ceiling: "UNCHANGED" | "BLOCKED" | "REVIEW_REQUIRED";
  baseline_effect: TemporalPropagationEventRecord["baseline_effect"];
  baseline_rebuild_required: boolean;
  selected_baseline_type: "AUTHORITY_CORRECTED" | "OUT_OF_BAND" | "REBUILD_REQUIRED" | "UNCHANGED";
  supersedes_baseline_envelope_ref_or_null: string | null;
  temporal_propagation_event_ref: string;
};

export function propagateTemporalEventToBaselines(
  event: TemporalPropagationEventRecord,
): TemporalBaselinePropagationProjection {
  const selectedBaselineType =
    event.event_class === "AUTHORITY_CORRECTION"
      ? "AUTHORITY_CORRECTED"
      : event.event_class === "OUT_OF_BAND_DISCOVERY"
        ? "OUT_OF_BAND"
        : event.baseline_effect === "SCOPE_SLICED_REBUILD_REQUIRED"
          ? "REBUILD_REQUIRED"
          : "UNCHANGED";
  return {
    active_exact_scope_key: event.active_exact_scope_key,
    affected_scope_refs: [...event.affected_scope_refs],
    automation_ceiling:
      event.event_class === "OUT_OF_BAND_DISCOVERY" ||
      event.event_class === "TEMPORAL_UNCERTAINTY_BLOCK"
        ? "BLOCKED"
        : event.baseline_effect === "SCOPE_SLICED_REBUILD_REQUIRED"
          ? "REVIEW_REQUIRED"
          : "UNCHANGED",
    baseline_effect: event.baseline_effect,
    baseline_rebuild_required: event.baseline_effect === "SCOPE_SLICED_REBUILD_REQUIRED",
    selected_baseline_type: selectedBaselineType,
    supersedes_baseline_envelope_ref_or_null: event.source_baseline_envelope_ref_or_null,
    temporal_propagation_event_ref: temporalPropagationEventRef(event),
  };
}
