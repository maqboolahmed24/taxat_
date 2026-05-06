import {
  type AuthorityIngressProofContract,
  type AuthorityReconciliationControlContract,
  AuthorityModelError,
  buildAuthorityReconciliationControlContract,
  buildStateTransitionContract,
  normalizeTimestamp,
  requireString,
} from "../models/authority_common.ts";
import {
  buildSubmissionRecord,
  submissionRecordRef,
  type SubmissionRecord,
} from "../models/submission_record.ts";
import {
  temporalPropagationEventRef,
  type TemporalPropagationEventRecord,
} from "../models/temporal_propagation_event.ts";
import { SubmissionRecordRepository } from "../repositories/submission_record_repository.ts";
import { transitionSubmissionRecord } from "./transition_submission_record.ts";

export type ApplyAuthorityCorrectionToSubmissionChainInput = {
  authority_evidence_ref: string;
  authority_ingress_proof_contract?: AuthorityIngressProofContract | null;
  authority_reference?: string | null;
  corrected_response_ref: string;
  current: SubmissionRecord;
  proof_bundle_hash?: string | null;
  proof_bundle_ref?: string | null;
  reconciliation_control_contract_or_null?: AuthorityReconciliationControlContract | null;
  repository?: SubmissionRecordRepository;
  state_changed_at: string;
  temporal_event: TemporalPropagationEventRecord;
};

function correctedControl(input: {
  current: SubmissionRecord;
  proof?: AuthorityIngressProofContract | null;
  state_changed_at: string;
}) {
  return buildAuthorityReconciliationControlContract({
    authority_truth_state: "CONFIRMED",
    binding_scope_class: "SUBMISSION_RECORD",
    duplicate_meaning_key_or_null: input.current.duplicate_meaning_key,
    interaction_ref_or_null: input.proof?.bound_interaction_ref_or_null ?? null,
    last_budget_event_at: input.state_changed_at,
    operation_family_or_null: input.current.operation_family,
    provider_environment_or_null: input.current.provider_environment,
    reconciliation_budget_state: "CLOSED",
    reconciliation_deadline_at_or_null: null,
    submission_lifecycle_state_or_null: "CONFIRMED",
  });
}

function successorId(input: { current: SubmissionRecord; temporal_event: TemporalPropagationEventRecord }) {
  return `${input.current.submission_id}.authority-corrected.${input.temporal_event.temporal_event_id}`;
}

export async function applyAuthorityCorrectionToSubmissionChain(
  input: ApplyAuthorityCorrectionToSubmissionChainInput,
) {
  if (input.temporal_event.event_class !== "AUTHORITY_CORRECTION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "applyAuthorityCorrectionToSubmissionChain requires AUTHORITY_CORRECTION",
    );
  }
  if (input.current.lifecycle_state !== "CONFIRMED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority correction must start from confirmed authority-grounded settlement",
    );
  }
  const repository = input.repository ?? new SubmissionRecordRepository();
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  const eventRef = temporalPropagationEventRef(input.temporal_event);
  const temporalRefs = Array.from(
    new Set([...input.current.temporal_propagation_event_refs, eventRef]),
  );
  const replacementId = successorId({
    current: input.current,
    temporal_event: input.temporal_event,
  });
  const superseded = await transitionSubmissionRecord({
    current: input.current,
    event: "new_submission_supersedes",
    repository,
    state_changed_at: stateChangedAt,
    superseded_by_submission_id: replacementId,
    temporal_propagation_event_refs: temporalRefs,
  });
  const proof = input.authority_ingress_proof_contract ?? input.current.authority_ingress_proof_contract;
  const control =
    input.reconciliation_control_contract_or_null ??
    correctedControl({ current: input.current, proof, state_changed_at: stateChangedAt });
  const submission = buildSubmissionRecord({
    ...input.current,
    authority_evidence_ref: requireString("authority_evidence_ref", input.authority_evidence_ref),
    authority_ingress_proof_contract: proof,
    authority_reference:
      input.authority_reference ??
      proof?.authority_reference_or_null ??
      requireString("authority_reference", input.current.authority_reference),
    baseline_type: "AUTHORITY_CORRECTED",
    lifecycle_state: "CONFIRMED",
    proof_bundle_hash: input.proof_bundle_hash ?? input.current.proof_bundle_hash,
    proof_bundle_ref: input.proof_bundle_ref ?? input.current.proof_bundle_ref,
    reconciliation_control_contract_or_null: control,
    reconciliation_deadline_at: null,
    rejection_reason_codes: [],
    response_ref: requireString("corrected_response_ref", input.corrected_response_ref),
    state_changed_at: stateChangedAt,
    state_transition_contract: buildStateTransitionContract({
      current_state: "CONFIRMED",
      object_family: "SUBMISSION_RECORD",
      previous_state_or_null: input.current.lifecycle_state,
      transition_applied_at: stateChangedAt,
      transition_event_code: "authority_correction_applied",
    }),
    submission_id: replacementId,
    superseded_by_submission_id: null,
    temporal_propagation_event_refs: temporalRefs,
  });
  const stored = await repository.persistSubmissionRecord({ submission });
  return {
    corrected_submission_ref: submissionRecordRef(submission),
    repository,
    stored,
    submission,
    superseded_submission: superseded.submission,
    superseded_submission_ref: submissionRecordRef(superseded.submission),
    temporal_event_ref: eventRef,
  };
}
