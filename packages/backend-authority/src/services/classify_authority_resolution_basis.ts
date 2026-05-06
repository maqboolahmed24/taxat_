import type {
  AuthorityInteractionRecord,
  AuthorityInteractionResolutionBasis,
} from "../models/authority_interaction_record.ts";
import type { AuthorityResponseEnvelope } from "../models/authority_response_envelope.ts";

export function classifyAuthorityResolutionBasis(input: {
  interaction: AuthorityInteractionRecord;
  selected_response?: AuthorityResponseEnvelope | null;
}): AuthorityInteractionResolutionBasis | null {
  if (input.interaction.lifecycle_state === "RESOLVED" && input.interaction.resolution_basis !== null) {
    return input.interaction.resolution_basis;
  }
  if (
    input.interaction.meaning_resolution_state === "RECONCILIATION_RESOLVED" ||
    input.interaction.reconciliation_attempt_count > 0
  ) {
    return "RECONCILIATION_RESULT";
  }
  if (
    input.interaction.meaning_resolution_state === "ACTIVE_DIRECT" ||
    input.interaction.meaning_resolution_state === "ACTIVE_CORROBORATED"
  ) {
    return "TERMINAL_RESPONSE";
  }
  if (
    input.selected_response !== undefined &&
    input.selected_response !== null &&
    [
      "ACK_SUCCESS",
      "ACK_REJECTED_AUTH",
      "ACK_REJECTED_VALIDATION",
      "ACK_EXTERNAL_STATE_DISCOVERED",
    ].includes(input.selected_response.response_class)
  ) {
    return input.interaction.reconciliation_attempt_count > 0
      ? "RECONCILIATION_RESULT"
      : "TERMINAL_RESPONSE";
  }
  return null;
}
