import type {
  AuthorityReconciliationControlContract,
  AuthorityTruthState,
} from "../models/authority_common.ts";
import type {
  AuthorityInteractionMeaningResolutionState,
} from "../models/authority_interaction_record.ts";
import type { AuthorityResponseEnvelope } from "../models/authority_response_envelope.ts";

export type ReconciliationOutcomeClass =
  AuthorityReconciliationControlContract["outcome_class_for_analytics"];

export function deriveReconciliationOutcomeClass(input: {
  authority_truth_state?: AuthorityTruthState;
  budget_state?: AuthorityReconciliationControlContract["reconciliation_budget_state"];
  meaning_resolution_state?: AuthorityInteractionMeaningResolutionState;
  response?: AuthorityResponseEnvelope;
}): ReconciliationOutcomeClass {
  if (input.budget_state === "ESCALATED") {
    return "ESCALATED";
  }
  if (input.response?.response_class === "ACK_AMBIGUOUS_CORRELATION") {
    return "AMBIGUOUS";
  }
  if (input.response?.response_class === "ACK_EXTERNAL_STATE_DISCOVERED") {
    return "OUT_OF_BAND";
  }
  if (input.response?.response_class === "ACK_ACCEPTED_PENDING") {
    return "PENDING_ACK";
  }
  if (input.response?.response_class === "ACK_TIMEOUT_OR_NO_RESOLUTION") {
    return "UNKNOWN";
  }
  if (
    input.response?.response_class === "ACK_REJECTED_AUTH" ||
    input.response?.response_class === "ACK_REJECTED_VALIDATION"
  ) {
    return "REJECTED";
  }
  if (input.response?.response_class === "ACK_SUCCESS") {
    return "CONFIRMED";
  }
  if (input.meaning_resolution_state === "NO_RESPONSE") {
    return "NO_RESPONSE_YET";
  }
  if (input.meaning_resolution_state === "PROVISIONAL_TIMEOUT") {
    return "UNKNOWN";
  }
  if (input.meaning_resolution_state === "RECONCILIATION_REQUIRED") {
    return "UNKNOWN";
  }
  if (input.authority_truth_state === "PENDING_ACK") {
    return "PENDING_ACK";
  }
  if (input.authority_truth_state === "UNKNOWN") {
    return "UNKNOWN";
  }
  if (input.authority_truth_state === "OUT_OF_BAND") {
    return "OUT_OF_BAND";
  }
  if (input.authority_truth_state === "CONFIRMED") {
    return "CONFIRMED";
  }
  if (input.authority_truth_state === "REJECTED") {
    return "REJECTED";
  }
  return "NO_RESPONSE_YET";
}
