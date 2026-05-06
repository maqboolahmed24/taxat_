import type { AuthorityIngressProofContract } from "../models/authority_common.ts";
import type { AuthorityIngressReceipt } from "../models/authority_ingress_receipt.ts";

export type IngressMutationGateRequestedEffect =
  | "RESPONSE_NORMALIZATION"
  | "INVESTIGATION_SNAPSHOT"
  | "RECONCILIATION_OPENING"
  | "LEGAL_STATE_MUTATION";

export type IngressMutationGateDecision =
  | "ALLOW_RESPONSE_NORMALIZATION_ONLY"
  | "ALLOW_INVESTIGATION_ONLY"
  | "ALLOW_RECONCILIATION_OPENING_ONLY"
  | "ALLOW_LEGAL_STATE_MUTATION"
  | "BLOCK_DUPLICATE_SUPPRESSED"
  | "BLOCK_FAIL_CLOSED";

export type IngressMutationGateResult = {
  can_mutate_legal_state: boolean;
  can_normalize_response: boolean;
  decision: IngressMutationGateDecision;
  mutation_gate_state: AuthorityIngressProofContract["mutation_gate_state"];
  reason_codes: string[];
};

export function classifyIngressMutationGate(input: {
  receipt: AuthorityIngressReceipt;
  requested_effect: IngressMutationGateRequestedEffect;
}): IngressMutationGateResult {
  const { receipt } = input;
  if (receipt.receipt_state === "DUPLICATE_SUPPRESSED") {
    return {
      can_mutate_legal_state: false,
      can_normalize_response: false,
      decision: "BLOCK_DUPLICATE_SUPPRESSED",
      mutation_gate_state: "DUPLICATE_SUPPRESSED_NO_MUTATION",
      reason_codes: ["DUPLICATE_SUPPRESSED_POINTS_TO_CANONICAL_RECEIPT"],
    };
  }
  if (receipt.authenticated_channel_state !== "AUTHENTICATED") {
    return {
      can_mutate_legal_state: false,
      can_normalize_response: false,
      decision: "ALLOW_INVESTIGATION_ONLY",
      mutation_gate_state: "QUARANTINE_ONLY",
      reason_codes: ["PROVIDER_CHANNEL_AUTHENTICATION_FAILED"],
    };
  }
  if (receipt.correlation_status !== "BOUND") {
    return {
      can_mutate_legal_state: false,
      can_normalize_response: false,
      decision: input.requested_effect === "RECONCILIATION_OPENING"
        ? "ALLOW_RECONCILIATION_OPENING_ONLY"
        : "ALLOW_INVESTIGATION_ONLY",
      mutation_gate_state: "QUARANTINE_ONLY",
      reason_codes: [`${receipt.correlation_status}_INGRESS_REQUIRES_RECONCILIATION`],
    };
  }
  if (input.requested_effect === "LEGAL_STATE_MUTATION") {
    if (receipt.receipt_state !== "NORMALIZED" || receipt.normalized_response_ref === null) {
      return {
        can_mutate_legal_state: false,
        can_normalize_response: true,
        decision: "BLOCK_FAIL_CLOSED",
        mutation_gate_state: "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT",
        reason_codes: ["LEGAL_MUTATION_REQUIRES_NORMALIZED_RESPONSE_REF"],
      };
    }
    return {
      can_mutate_legal_state: true,
      can_normalize_response: false,
      decision: "ALLOW_LEGAL_STATE_MUTATION",
      mutation_gate_state: "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT",
      reason_codes: ["AUTHENTICATED_BOUND_NORMALIZED_INGRESS_CAN_ATTRIBUTE_MUTATION"],
    };
  }
  return {
    can_mutate_legal_state: false,
    can_normalize_response: receipt.receipt_state === "PERSISTED",
    decision: "ALLOW_RESPONSE_NORMALIZATION_ONLY",
    mutation_gate_state: "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT",
    reason_codes: ["AUTHENTICATED_BOUND_INGRESS_MAY_ONLY_NORMALIZE_RESPONSE_FIRST"],
  };
}

