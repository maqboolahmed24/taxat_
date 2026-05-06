import {
  temporalPropagationEventRef,
  type TemporalPropagationEventRecord,
} from "../models/temporal_propagation_event.ts";

export function projectTemporalEventSummary(event: TemporalPropagationEventRecord) {
  return {
    active_exact_scope_key: event.active_exact_scope_key,
    affected_scope_count: event.affected_scope_refs.length,
    affected_submission_count: event.affected_submission_refs.length,
    baseline_rebuild_required: event.baseline_effect === "SCOPE_SLICED_REBUILD_REQUIRED",
    event_class: event.event_class,
    emitted_at: event.emitted_at,
    historical_reuse_policy: event.historical_reuse_policy,
    mirror_reopen_required: event.mirror_reopen_effect === "REOPEN_REQUIRED",
    reason_codes: [...event.reason_codes],
    replay_posture: event.replay_effect,
    temporal_event_ref: temporalPropagationEventRef(event),
    trust_recalc_required: event.trust_effect === "RECALC_REQUIRED",
  };
}
