import { buildStateTransitionContract, normalizeTimestamp } from "../models/authority_common.ts";
import {
  buildSubmissionRecord,
  type AuthorityRequestIdentityContract,
  type SubmissionRecordBuildInput,
} from "../models/submission_record.ts";
import { SubmissionRecordRepository } from "../repositories/submission_record_repository.ts";

export type BeginSubmissionRecordInput = Omit<
  SubmissionRecordBuildInput,
  | "authority_evidence_ref"
  | "authority_ingress_proof_contract"
  | "authority_reference"
  | "baseline_type"
  | "lifecycle_state"
  | "reconciliation_control_contract_or_null"
  | "reconciliation_deadline_at"
  | "rejection_reason_codes"
  | "response_ref"
  | "state_transition_contract"
  | "superseded_by_submission_id"
> & {
  request_identity_contract: AuthorityRequestIdentityContract;
  repository?: SubmissionRecordRepository;
};

export async function beginSubmissionRecord(input: BeginSubmissionRecordInput) {
  const repository = input.repository ?? new SubmissionRecordRepository();
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  const submission = buildSubmissionRecord({
    ...input,
    authority_evidence_ref: null,
    authority_ingress_proof_contract: null,
    authority_reference: null,
    baseline_type: null,
    lifecycle_state: "INTENT_RECORDED",
    reconciliation_control_contract_or_null: null,
    reconciliation_deadline_at: null,
    rejection_reason_codes: [],
    response_ref: null,
    state_changed_at: stateChangedAt,
    state_transition_contract: buildStateTransitionContract({
      current_state: "INTENT_RECORDED",
      object_family: "SUBMISSION_RECORD",
      previous_state_or_null: null,
      transition_applied_at: stateChangedAt,
      transition_event_code: "intent_recorded",
    }),
    superseded_by_submission_id: null,
  });
  const stored = await repository.persistSubmissionRecord({ submission });
  return { repository, stored, submission };
}
