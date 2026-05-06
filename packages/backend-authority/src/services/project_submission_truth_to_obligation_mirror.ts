import {
  type AuthorityIngressProofContract,
  type AuthorityReconciliationControlContract,
  buildAuthorityReconciliationControlContract,
  normalizeAuthorityIngressProofContract,
} from "../models/authority_common.ts";
import {
  buildObligationMirrorRecord,
  type ObligationMirrorBuildInput,
  type ObligationMirrorRecord,
} from "../models/obligation_mirror.ts";
import {
  type SubmissionRecord,
  submissionRecordRef,
} from "../models/submission_record.ts";

export type ProjectSubmissionTruthToObligationMirrorInput = Omit<
  ObligationMirrorBuildInput,
  | "authority_ingress_proof_contract"
  | "authority_status_ref"
  | "authority_truth_state"
  | "blocked_reason_codes"
  | "current_submission_ref"
  | "last_authority_sync_at"
  | "last_confirmed_submission_ref"
  | "lifecycle_state"
  | "ready_manifest_ref"
  | "reconciliation_control_contract_or_null"
> & {
  existing_mirror?: ObligationMirrorRecord | null;
  submission: SubmissionRecord;
};

function toMirrorProof(proof: AuthorityIngressProofContract | null) {
  return proof
    ? normalizeAuthorityIngressProofContract({
        ...proof,
        binding_scope_class: "OBLIGATION_MIRROR",
      })
    : null;
}

function toMirrorControl(input: {
  control: AuthorityReconciliationControlContract | null;
  proof: AuthorityIngressProofContract | null;
  submission: SubmissionRecord;
}) {
  const truth = input.submission.lifecycle_state === "TRANSMIT_PENDING" ||
    input.submission.lifecycle_state === "TRANSMITTED" ||
    input.submission.lifecycle_state === "INTENT_RECORDED"
    ? "PENDING_ACK"
    : input.submission.lifecycle_state === "SUPERSEDED"
      ? "UNKNOWN"
      : input.submission.lifecycle_state;
  if (!["PENDING_ACK", "UNKNOWN", "OUT_OF_BAND", "CONFIRMED"].includes(truth)) {
    return null;
  }
  return buildAuthorityReconciliationControlContract({
    authority_truth_state: truth,
    binding_scope_class: "OBLIGATION_MIRROR",
    duplicate_meaning_key_or_null: input.submission.duplicate_meaning_key,
    interaction_ref_or_null: input.proof?.bound_interaction_ref_or_null ?? input.control?.interaction_ref_or_null ?? null,
    last_budget_event_at: input.submission.state_changed_at,
    operation_family_or_null: input.submission.operation_family,
    provider_environment_or_null: input.submission.provider_environment,
    reconciliation_budget_state: truth === "CONFIRMED" ? "CLOSED" : undefined,
    reconciliation_deadline_at_or_null: truth === "CONFIRMED" ? null : input.submission.reconciliation_deadline_at,
    submission_lifecycle_state_or_null:
      input.submission.lifecycle_state === "INTENT_RECORDED" ||
      input.submission.lifecycle_state === "TRANSMIT_PENDING" ||
      input.submission.lifecycle_state === "TRANSMITTED"
        ? "PENDING_ACK"
        : input.submission.lifecycle_state,
  });
}

export function projectSubmissionTruthToObligationMirror(
  input: ProjectSubmissionTruthToObligationMirrorInput,
) {
  const submission = input.submission;
  const mirrorProof = toMirrorProof(submission.authority_ingress_proof_contract);
  const mirrorControl = toMirrorControl({
    control: submission.reconciliation_control_contract_or_null,
    proof: mirrorProof,
    submission,
  });
  const submissionRef = submissionRecordRef(submission);
  const existing = input.existing_mirror ?? null;
  const base = {
    ...existing,
    ...input,
    authority_refs: input.authority_refs ?? existing?.authority_refs ?? [],
    blocked_reason_codes: [],
    due_at: input.due_at ?? existing?.due_at ?? null,
    last_authority_sync_at: submission.state_changed_at,
    ready_manifest_ref: null,
    reconciliation_control_contract_or_null: mirrorControl,
  };

  switch (submission.lifecycle_state) {
    case "CONFIRMED":
      return buildObligationMirrorRecord({
        ...base,
        authority_ingress_proof_contract: mirrorProof,
        authority_status_ref: submission.response_ref,
        authority_truth_state: "CONFIRMED",
        current_submission_ref: null,
        last_confirmed_submission_ref: submissionRef,
        lifecycle_state: "MET_CONFIRMED",
      });
    case "PENDING_ACK":
    case "INTENT_RECORDED":
    case "TRANSMIT_PENDING":
    case "TRANSMITTED":
      return buildObligationMirrorRecord({
        ...base,
        authority_ingress_proof_contract: mirrorProof,
        authority_status_ref: submission.response_ref,
        authority_truth_state: "PENDING_ACK",
        current_submission_ref: submissionRef,
        last_confirmed_submission_ref: null,
        lifecycle_state: "SUBMITTED_PENDING",
      });
    case "REJECTED":
      return buildObligationMirrorRecord({
        ...base,
        authority_ingress_proof_contract: mirrorProof,
        authority_status_ref: submission.response_ref,
        authority_truth_state: "REJECTED",
        blocked_reason_codes: ["AUTHORITY_REJECTED_SUBMISSION"],
        current_submission_ref: null,
        last_confirmed_submission_ref: null,
        lifecycle_state: "OPEN",
        reconciliation_control_contract_or_null: null,
      });
    case "OUT_OF_BAND":
      return buildObligationMirrorRecord({
        ...base,
        authority_ingress_proof_contract: mirrorProof,
        authority_status_ref: null,
        authority_truth_state: "OUT_OF_BAND",
        blocked_reason_codes: ["OUT_OF_BAND_AUTHORITY_STATE_PRESENT"],
        current_submission_ref: null,
        last_confirmed_submission_ref: null,
        lifecycle_state: "OPEN",
      });
    case "UNKNOWN":
    case "SUPERSEDED":
      return buildObligationMirrorRecord({
        ...base,
        authority_ingress_proof_contract: mirrorProof,
        authority_status_ref: mirrorProof ? submission.response_ref : null,
        authority_truth_state: "UNKNOWN",
        blocked_reason_codes:
          submission.lifecycle_state === "SUPERSEDED" ? ["SUBMISSION_SUPERSEDED"] : ["AUTHORITY_TRUTH_UNKNOWN"],
        current_submission_ref: null,
        last_confirmed_submission_ref: null,
        lifecycle_state: "OPEN",
      });
  }
}
