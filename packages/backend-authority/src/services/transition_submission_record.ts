import {
  type AuthorityIngressProofContract,
  type AuthorityReconciliationControlContract,
  buildAuthorityReconciliationControlContract,
  buildStateTransitionContract,
  normalizeTimestamp,
  requireString,
} from "../models/authority_common.ts";
import {
  type ConfirmedSubmissionBaselineType,
  buildSubmissionRecord,
  type AuthorityRequestIdentityContract,
  type SubmissionRecord,
} from "../models/submission_record.ts";
import { SubmissionRecordRepository } from "../repositories/submission_record_repository.ts";
import {
  type SubmissionRecordTransitionEvent,
  targetSubmissionLifecycleStateForEvent,
  validateSubmissionRecordTransition,
} from "./validate_submission_record_transition.ts";

export type TransitionSubmissionRecordInput = {
  authority_evidence_ref?: string | null;
  authority_ingress_proof_contract?: AuthorityIngressProofContract | null;
  authority_reference?: string | null;
  baseline_type?: ConfirmedSubmissionBaselineType | "OUT_OF_BAND" | null;
  correlation_refs?: readonly string[];
  current: SubmissionRecord;
  event: SubmissionRecordTransitionEvent;
  idempotency_key?: string | null;
  packet_ref?: string | null;
  proof_bundle_hash?: string | null;
  proof_bundle_ref?: string | null;
  reconciliation_control_contract_or_null?: AuthorityReconciliationControlContract | null;
  rejection_reason_codes?: readonly string[];
  repository?: SubmissionRecordRepository;
  request_envelope_ref?: string | null;
  request_hash?: string | null;
  request_identity_contract?: AuthorityRequestIdentityContract | null;
  response_ref?: string | null;
  state_changed_at: string;
  superseded_by_submission_id?: string | null;
  temporal_propagation_event_refs?: readonly string[];
};

function authorityTruthForState(state: "CONFIRMED" | "OUT_OF_BAND" | "PENDING_ACK" | "REJECTED" | "UNKNOWN") {
  return state;
}

function buildSubmissionScopedControl(input: {
  current: SubmissionRecord;
  proof?: AuthorityIngressProofContract | null;
  reconciliation_budget_state?: AuthorityReconciliationControlContract["reconciliation_budget_state"];
  reconciliation_deadline_at_or_null?: string | null;
  state: "CONFIRMED" | "OUT_OF_BAND" | "PENDING_ACK" | "REJECTED" | "UNKNOWN";
  transitioned_at: string;
}) {
  return buildAuthorityReconciliationControlContract({
    authority_truth_state: authorityTruthForState(input.state),
    binding_scope_class: "SUBMISSION_RECORD",
    duplicate_meaning_key_or_null: input.current.duplicate_meaning_key,
    interaction_ref_or_null: input.proof?.bound_interaction_ref_or_null ?? null,
    last_budget_event_at: input.transitioned_at,
    operation_family_or_null: input.current.operation_family,
    provider_environment_or_null: input.current.provider_environment,
    reconciliation_budget_state: input.reconciliation_budget_state,
    reconciliation_deadline_at_or_null: input.reconciliation_deadline_at_or_null,
    submission_lifecycle_state_or_null: input.state,
  });
}

function responseRefFor(input: TransitionSubmissionRecordInput) {
  return requireString("response_ref", input.response_ref ?? input.current.response_ref);
}

function requestBackedLineage(input: TransitionSubmissionRecordInput) {
  return {
    idempotency_key: input.idempotency_key ?? input.current.idempotency_key,
    packet_ref: input.packet_ref ?? input.current.packet_ref,
    request_envelope_ref: input.request_envelope_ref ?? input.current.request_envelope_ref,
    request_hash: input.request_hash ?? input.current.request_hash,
    request_identity_contract: input.request_identity_contract ?? input.current.request_identity_contract,
  };
}

export async function transitionSubmissionRecord(input: TransitionSubmissionRecordInput) {
  validateSubmissionRecordTransition({ current: input.current, event: input.event });
  const repository = input.repository ?? new SubmissionRecordRepository();
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  const target = targetSubmissionLifecycleStateForEvent(input.event);
  const proof = input.authority_ingress_proof_contract ?? input.current.authority_ingress_proof_contract;
  const correlationRefs = input.correlation_refs ?? input.current.correlation_refs;
  const temporalRefs = input.temporal_propagation_event_refs ?? input.current.temporal_propagation_event_refs;
  const base = {
    ...input.current,
    ...requestBackedLineage(input),
    authority_ingress_proof_contract: proof,
    correlation_refs: correlationRefs,
    lifecycle_state: target,
    proof_bundle_hash: input.proof_bundle_hash ?? input.current.proof_bundle_hash,
    proof_bundle_ref: input.proof_bundle_ref ?? input.current.proof_bundle_ref,
    state_changed_at: stateChangedAt,
    state_transition_contract: buildStateTransitionContract({
      current_state: target,
      object_family: "SUBMISSION_RECORD",
      previous_state_or_null: input.current.lifecycle_state,
      transition_applied_at: stateChangedAt,
      transition_event_code: input.event,
    }),
    temporal_propagation_event_refs: temporalRefs,
  };

  let submission: SubmissionRecord;
  if (target === "TRANSMIT_PENDING" || target === "TRANSMITTED") {
    submission = buildSubmissionRecord({
      ...base,
      authority_evidence_ref: null,
      authority_ingress_proof_contract: null,
      authority_reference: null,
      baseline_type: null,
      reconciliation_control_contract_or_null: null,
      reconciliation_deadline_at: null,
      rejection_reason_codes: [],
      response_ref: null,
      superseded_by_submission_id: null,
    });
  } else if (target === "PENDING_ACK") {
    const responseRef = responseRefFor(input);
    const control = input.reconciliation_control_contract_or_null ?? buildSubmissionScopedControl({
      current: input.current,
      proof,
      state: "PENDING_ACK",
      transitioned_at: stateChangedAt,
    });
    submission = buildSubmissionRecord({
      ...base,
      authority_evidence_ref: null,
      authority_reference: input.authority_reference ?? proof?.authority_reference_or_null ?? null,
      baseline_type: null,
      reconciliation_control_contract_or_null: control,
      reconciliation_deadline_at: control.reconciliation_deadline_at_or_null,
      rejection_reason_codes: [],
      response_ref: responseRef,
      superseded_by_submission_id: null,
    });
  } else if (target === "UNKNOWN") {
    const control = input.reconciliation_control_contract_or_null ?? buildSubmissionScopedControl({
      current: input.current,
      proof,
      state: "UNKNOWN",
      transitioned_at: stateChangedAt,
    });
    submission = buildSubmissionRecord({
      ...base,
      authority_evidence_ref: input.authority_evidence_ref ?? input.current.authority_evidence_ref,
      authority_reference: input.authority_reference ?? input.current.authority_reference,
      baseline_type: null,
      reconciliation_control_contract_or_null: control,
      reconciliation_deadline_at: control.reconciliation_deadline_at_or_null,
      rejection_reason_codes: [],
      response_ref: responseRefFor(input),
      superseded_by_submission_id: null,
    });
  } else if (target === "CONFIRMED") {
    const control = input.reconciliation_control_contract_or_null ?? buildSubmissionScopedControl({
      current: input.current,
      proof,
      reconciliation_budget_state: "CLOSED",
      reconciliation_deadline_at_or_null: null,
      state: "CONFIRMED",
      transitioned_at: stateChangedAt,
    });
    submission = buildSubmissionRecord({
      ...base,
      authority_evidence_ref: requireString("authority_evidence_ref", input.authority_evidence_ref),
      authority_reference: requireString(
        "authority_reference",
        input.authority_reference ?? proof?.authority_reference_or_null,
      ),
      baseline_type: input.baseline_type ?? "FILED",
      reconciliation_control_contract_or_null: control,
      reconciliation_deadline_at: null,
      rejection_reason_codes: [],
      response_ref: responseRefFor(input),
      superseded_by_submission_id: null,
      temporal_propagation_event_refs: temporalRefs.length > 0 ? temporalRefs : [`temporal-propagation-event://${input.current.submission_id}/${target.toLowerCase()}`],
    });
  } else if (target === "REJECTED") {
    const control = input.reconciliation_control_contract_or_null ?? buildSubmissionScopedControl({
      current: input.current,
      proof,
      reconciliation_budget_state: "CLOSED",
      reconciliation_deadline_at_or_null: null,
      state: "REJECTED",
      transitioned_at: stateChangedAt,
    });
    submission = buildSubmissionRecord({
      ...base,
      authority_evidence_ref: requireString("authority_evidence_ref", input.authority_evidence_ref),
      authority_reference: input.authority_reference ?? proof?.authority_reference_or_null ?? input.current.authority_reference,
      baseline_type: null,
      reconciliation_control_contract_or_null: control,
      reconciliation_deadline_at: null,
      rejection_reason_codes: input.rejection_reason_codes ?? ["AUTHORITY_REJECTED_SUBMISSION"],
      response_ref: responseRefFor(input),
      superseded_by_submission_id: null,
    });
  } else if (target === "OUT_OF_BAND") {
    const control = input.reconciliation_control_contract_or_null ?? buildSubmissionScopedControl({
      current: input.current,
      proof,
      reconciliation_budget_state: "CLOSED",
      reconciliation_deadline_at_or_null: null,
      state: "OUT_OF_BAND",
      transitioned_at: stateChangedAt,
    });
    submission = buildSubmissionRecord({
      ...base,
      authority_evidence_ref: requireString("authority_evidence_ref", input.authority_evidence_ref),
      authority_reference: input.authority_reference ?? input.current.authority_reference,
      baseline_type: "OUT_OF_BAND",
      idempotency_key: null,
      packet_ref: null,
      reconciliation_control_contract_or_null: control,
      reconciliation_deadline_at: null,
      rejection_reason_codes: [],
      request_envelope_ref: null,
      request_hash: null,
      request_identity_contract: null,
      response_ref: null,
      superseded_by_submission_id: null,
      temporal_propagation_event_refs: temporalRefs.length > 0 ? temporalRefs : [`temporal-propagation-event://${input.current.submission_id}/out-of-band`],
    });
  } else {
    submission = buildSubmissionRecord({
      ...base,
      baseline_type: null,
      reconciliation_control_contract_or_null: null,
      reconciliation_deadline_at: null,
      rejection_reason_codes: [],
      superseded_by_submission_id: requireString(
        "superseded_by_submission_id",
        input.superseded_by_submission_id,
      ),
    });
  }

  const stored = await repository.persistSubmissionRecord({ submission });
  return { repository, stored, submission };
}
