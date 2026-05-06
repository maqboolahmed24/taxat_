import {
  temporalPropagationEventRef,
  type TemporalPropagationEventRecord,
} from "../models/temporal_propagation_event.ts";

export type TemporalWorkflowClientProjectionInput = {
  customer_status_projection?: string | null;
  event: TemporalPropagationEventRecord;
  workflow_item_ref?: string | null;
};

export function propagateTemporalEventToWorkflowAndClientProjection(
  input: TemporalWorkflowClientProjectionInput,
) {
  const eventRef = temporalPropagationEventRef(input.event);
  const authorityTruthState =
    input.event.event_class === "OUT_OF_BAND_DISCOVERY"
      ? "OUT_OF_BAND"
      : input.event.event_class === "TEMPORAL_UNCERTAINTY_BLOCK"
        ? "UNKNOWN"
        : "CONFIRMED";
  return {
    authority_truth_state: authorityTruthState,
    client_projection: {
      customer_status_projection:
        input.event.event_class === "OUT_OF_BAND_DISCOVERY"
          ? "OUT_OF_BAND_RECONCILIATION"
          : "REVIEW_REOPENED",
      reason_codes: [
        "POST_SEAL_AUTHORITY_TRUTH_REOPENED_CASE",
        input.event.event_class,
      ],
      temporal_propagation_event_ref: eventRef,
    },
    workflow_projection: {
      lifecycle_state: "REOPENED",
      reason_codes: [
        "TEMPORAL_PROPAGATION_EVENT_REQUIRES_REVIEW",
        input.event.event_class,
      ],
      temporal_propagation_event_ref: eventRef,
      workflow_item_ref: input.workflow_item_ref ?? null,
    },
  };
}
