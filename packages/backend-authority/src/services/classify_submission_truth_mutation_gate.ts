import { type AuthorityIngressProofContract } from "../models/authority_common.ts";
import { type SubmissionRecordLifecycleState } from "../models/submission_record.ts";

export type SubmissionTruthMutationGateDecision =
  | "ALLOW_SETTLEMENT_MUTATION"
  | "ALLOW_NON_CONFIRMING_RECONCILIATION_MUTATION"
  | "QUARANTINE_ONLY"
  | "BLOCKED_INTERNAL_ONLY";

export type SubmissionTruthMutationGateResult = {
  decision: SubmissionTruthMutationGateDecision;
  reason_codes: string[];
};

export function classifySubmissionTruthMutationGate(input: {
  authority_ingress_proof_contract?: AuthorityIngressProofContract | null;
  authority_evidence_ref?: string | null;
  lifecycle_state: SubmissionRecordLifecycleState;
  response_ref?: string | null;
}): SubmissionTruthMutationGateResult {
  if (["INTENT_RECORDED", "TRANSMIT_PENDING", "TRANSMITTED", "SUPERSEDED"].includes(input.lifecycle_state)) {
    return {
      decision: "BLOCKED_INTERNAL_ONLY",
      reason_codes: ["LIFECYCLE_STATE_DOES_NOT_PUBLISH_AUTHORITY_SETTLEMENT"],
    };
  }

  if (input.lifecycle_state === "OUT_OF_BAND") {
    return input.authority_evidence_ref
      ? {
          decision: "ALLOW_NON_CONFIRMING_RECONCILIATION_MUTATION",
          reason_codes: ["OUT_OF_BAND_REMAINS_NON_CONFIRMING_WITH_EVIDENCE"],
        }
      : {
          decision: "BLOCKED_INTERNAL_ONLY",
          reason_codes: ["OUT_OF_BAND_REQUIRES_AUTHORITY_EVIDENCE_REF"],
        };
  }

  if (input.lifecycle_state === "UNKNOWN") {
    return {
      decision: "ALLOW_NON_CONFIRMING_RECONCILIATION_MUTATION",
      reason_codes: ["UNKNOWN_REMAINS_EXPLICIT_RECONCILIATION_POSTURE"],
    };
  }

  const proof = input.authority_ingress_proof_contract;
  if (!proof) {
    return {
      decision: "BLOCKED_INTERNAL_ONLY",
      reason_codes: ["MISSING_AUTHORITY_INGRESS_PROOF_CONTRACT"],
    };
  }
  if (
    proof.binding_scope_class !== "SUBMISSION_RECORD" ||
    proof.authenticated_channel_state !== "AUTHENTICATED" ||
    proof.correlation_status_or_null !== "BOUND" ||
    proof.mutation_gate_state !== "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT"
  ) {
    return {
      decision:
        proof.mutation_gate_state === "QUARANTINE_ONLY" ||
        proof.mutation_gate_state === "DUPLICATE_SUPPRESSED_NO_MUTATION" ||
        proof.correlation_status_or_null !== "BOUND"
          ? "QUARANTINE_ONLY"
          : "BLOCKED_INTERNAL_ONLY",
      reason_codes: [
        "INGRESS_PROOF_NOT_AUTHENTICATED_BOUND_AND_MUTATION_ATTRIBUTED",
      ],
    };
  }
  if (proof.normalized_response_ref_or_null !== input.response_ref) {
    return {
      decision: "BLOCKED_INTERNAL_ONLY",
      reason_codes: ["NORMALIZED_RESPONSE_REF_DOES_NOT_MATCH_SETTLEMENT_RESPONSE_REF"],
    };
  }
  return {
    decision: "ALLOW_SETTLEMENT_MUTATION",
    reason_codes: ["AUTHENTICATED_BOUND_INGRESS_PROOF_ATTRIBUTED_TO_SETTLEMENT"],
  };
}
