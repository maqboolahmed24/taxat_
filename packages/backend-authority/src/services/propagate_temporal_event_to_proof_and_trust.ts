import {
  temporalPropagationEventRef,
  type TemporalPropagationEventRecord,
} from "../models/temporal_propagation_event.ts";

export type PropagateTemporalEventToProofAndTrustInput = {
  evidence_graph_refs?: readonly string[];
  parity_result_refs?: readonly string[];
  proof_bundle_refs?: readonly string[];
  trust_summary_refs?: readonly string[];
  event: TemporalPropagationEventRecord;
};

export function propagateTemporalEventToProofAndTrust(
  input: PropagateTemporalEventToProofAndTrustInput,
) {
  const eventRef = temporalPropagationEventRef(input.event);
  return {
    evidence_graph_invalidations: (input.evidence_graph_refs ?? []).map((ref) => ({
      evidence_graph_ref: ref,
      stale_reason_codes: ["TEMPORAL_PROPAGATION_EVENT_REQUIRES_REVALIDATION"],
      temporal_propagation_event_ref: eventRef,
    })),
    parity_result_invalidations: (input.parity_result_refs ?? []).map((ref) => ({
      parity_result_ref: ref,
      parity_reuse_state: input.event.baseline_effect === "NONE" ? "UNCHANGED" : "STALE",
      temporal_propagation_event_ref: eventRef,
    })),
    proof_bundle_invalidations: (input.proof_bundle_refs ?? []).map((ref) => ({
      proof_bundle_ref: ref,
      proof_effect: input.event.proof_effect,
      support_state: input.event.proof_effect === "STALE_REVALIDATION_REQUIRED" ? "STALE" : "CURRENT",
      temporal_propagation_event_ref: eventRef,
    })),
    trust_summary_invalidations: (input.trust_summary_refs ?? []).map((ref) => ({
      temporal_propagation_event_ref: eventRef,
      trust_currency_state:
        input.event.trust_effect === "RECALC_REQUIRED" ? "RECALC_REQUIRED" : "CURRENT",
      trust_invalidation_reason_codes:
        input.event.trust_effect === "RECALC_REQUIRED"
          ? ["TEMPORAL_PROPAGATION_RECALC_REQUIRED", input.event.event_class]
          : [],
      trust_summary_ref: ref,
    })),
  };
}
