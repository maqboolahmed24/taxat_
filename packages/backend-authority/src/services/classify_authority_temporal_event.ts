import { AuthorityModelError } from "../models/authority_common.ts";
import type { SubmissionRecord } from "../models/submission_record.ts";
import type { TemporalPropagationEventClass } from "../models/temporal_propagation_event.ts";

export type AuthorityTemporalObservationState =
  | "CONFIRMED"
  | "REJECTED"
  | "PENDING_ACK"
  | "UNKNOWN"
  | "OUT_OF_BAND";

export type AuthorityTemporalCorrelationStatus =
  | "BOUND"
  | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY"
  | "AMBIGUOUS"
  | "UNBOUND";

export type AuthorityTemporalEventClassificationInput = {
  affected_scope_refs: readonly string[];
  current_submission?: Pick<
    SubmissionRecord,
    | "baseline_type"
    | "lifecycle_state"
    | "response_ref"
    | "submission_id"
    | "temporal_propagation_event_refs"
  > | null;
  live_authority_lineage_matches_packet?: boolean;
  observed_authority_basis_refs?: readonly string[];
  observed_authority_state?: AuthorityTemporalObservationState | null;
  observed_response_ref?: string | null;
  source_late_data_finding_refs?: readonly string[];
  source_late_data_monitor_ref_or_null?: string | null;
  trigger_hint?:
    | "late_data"
    | "authority_correction"
    | "out_of_band"
    | "temporal_uncertainty"
    | null;
  correlation_status?: AuthorityTemporalCorrelationStatus | null;
};

export type AuthorityTemporalEventClassification =
  | {
      active: false;
      event_class: null;
      reason_codes: string[];
    }
  | {
      active: true;
      event_class: TemporalPropagationEventClass;
      reason_codes: string[];
      target_baseline_type: "AUTHORITY_CORRECTED" | "OUT_OF_BAND" | null;
      target_submission_lifecycle_state: "CONFIRMED" | "OUT_OF_BAND" | null;
    };

function hasLateData(input: AuthorityTemporalEventClassificationInput) {
  return Boolean(
    input.source_late_data_monitor_ref_or_null ||
      (input.source_late_data_finding_refs?.length ?? 0) > 0,
  );
}

function hasAuthorityBasis(input: AuthorityTemporalEventClassificationInput) {
  return (input.observed_authority_basis_refs?.length ?? 0) > 0;
}

function isWeaklyCorrelated(status: AuthorityTemporalCorrelationStatus | null | undefined) {
  return status === "AMBIGUOUS" || status === "UNBOUND" || status === "BOUND_WITH_AUTHORITY_REFERENCE_ONLY";
}

export function classifyAuthorityTemporalEvent(
  input: AuthorityTemporalEventClassificationInput,
): AuthorityTemporalEventClassification {
  if (input.affected_scope_refs.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority temporal event classification requires affected_scope_refs",
    );
  }

  if (input.trigger_hint === "late_data" || hasLateData(input)) {
    return {
      active: true,
      event_class: "LATE_DATA_INVALIDATION",
      reason_codes: ["LATE_DATA_INVALIDATES_POST_SEAL_TRUST"],
      target_baseline_type: null,
      target_submission_lifecycle_state: null,
    };
  }

  if (input.trigger_hint === "temporal_uncertainty" || isWeaklyCorrelated(input.correlation_status)) {
    return {
      active: true,
      event_class: "TEMPORAL_UNCERTAINTY_BLOCK",
      reason_codes: ["AUTHORITY_EVIDENCE_PARTIALLY_CORRELATED_REUSE_BLOCKED"],
      target_baseline_type: null,
      target_submission_lifecycle_state: null,
    };
  }

  if (
    input.trigger_hint === "out_of_band" ||
    input.observed_authority_state === "OUT_OF_BAND" ||
    (input.live_authority_lineage_matches_packet === false && hasAuthorityBasis(input))
  ) {
    return {
      active: true,
      event_class: "OUT_OF_BAND_DISCOVERY",
      reason_codes: ["OUT_OF_BAND_AUTHORITY_TRUTH_REQUIRES_RECONCILIATION"],
      target_baseline_type: "OUT_OF_BAND",
      target_submission_lifecycle_state: "OUT_OF_BAND",
    };
  }

  const current = input.current_submission;
  const responseChanged =
    current?.response_ref !== undefined &&
    current.response_ref !== null &&
    input.observed_response_ref !== undefined &&
    input.observed_response_ref !== null &&
    current.response_ref !== input.observed_response_ref;
  if (
    input.trigger_hint === "authority_correction" ||
    (current?.lifecycle_state === "CONFIRMED" &&
      hasAuthorityBasis(input) &&
      (responseChanged || input.observed_authority_state === "CONFIRMED"))
  ) {
    return {
      active: true,
      event_class: "AUTHORITY_CORRECTION",
      reason_codes: ["AUTHORITY_CORRECTION_REOPENS_TRUST"],
      target_baseline_type: "AUTHORITY_CORRECTED",
      target_submission_lifecycle_state: "CONFIRMED",
    };
  }

  return {
    active: false,
    event_class: null,
    reason_codes: ["NO_NEW_TEMPORAL_EVENT"],
  };
}
