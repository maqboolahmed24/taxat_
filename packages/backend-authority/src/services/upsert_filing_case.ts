import {
  buildFilingCaseRecord,
  type FilingCaseBuildInput,
  type FilingCaseLifecycleState,
  type FilingCaseRecord,
} from "../models/filing_case.ts";
import { buildStateTransitionContract } from "../models/authority_common.ts";
import { FilingCaseRepository } from "../repositories/filing_case_repository.ts";

export type UpsertFilingCaseInput = FilingCaseBuildInput & {
  existing?: FilingCaseRecord | null;
  repository?: FilingCaseRepository;
};

function inferLifecycle(input: UpsertFilingCaseInput, existing: FilingCaseRecord | null): FilingCaseLifecycleState {
  const submissionState = input.current_submission_state ?? existing?.current_submission_state ?? null;
  if (submissionState === "CONFIRMED") {
    return "FILED_CONFIRMED";
  }
  if (submissionState === "REJECTED") {
    return "REJECTED";
  }
  if (submissionState === "UNKNOWN") {
    return "FILED_UNKNOWN";
  }
  if (input.current_submission_ref ?? existing?.current_submission_ref) {
    return "SUBMITTED_PENDING";
  }
  const packetState = input.packet_state ?? existing?.packet_state ?? null;
  if (packetState === "APPROVED_TO_SUBMIT") {
    return "READY_TO_SUBMIT";
  }
  if (packetState === "PREPARED") {
    return "READY_REVIEW";
  }
  if (input.lifecycle_state) {
    return input.lifecycle_state;
  }
  if (input.current_manifest_ref ?? existing?.current_manifest_ref) {
    return input.current_trust_ref || existing?.current_trust_ref ? "READY_REVIEW" : "PREPARING";
  }
  return "NOT_STARTED";
}

export async function upsertFilingCase(input: UpsertFilingCaseInput) {
  const repository = input.repository ?? new FilingCaseRepository();
  const existing =
    input.existing ??
    (input.filing_case_id ? (await repository.getFilingCaseById(input.filing_case_id))?.record ?? null : null);
  const lifecycleState = inferLifecycle(input, existing);
  const filingCase = buildFilingCaseRecord({
    ...existing,
    ...input,
    lifecycle_state: lifecycleState,
    state_transition_contract: buildStateTransitionContract({
      current_state: lifecycleState,
      object_family: "FILING_CASE",
      previous_state_or_null: existing?.lifecycle_state ?? null,
      transition_applied_at: input.last_transition_at,
      transition_event_code: "case_upserted",
    }),
    temporal_propagation_event_refs:
      input.temporal_propagation_event_refs ?? existing?.temporal_propagation_event_refs ?? [],
    trust_invalidation_dependency_refs:
      input.trust_invalidation_dependency_refs ?? existing?.trust_invalidation_dependency_refs ?? [],
    trust_invalidation_reason_codes:
      input.trust_invalidation_reason_codes ?? existing?.trust_invalidation_reason_codes ?? [],
  });
  const stored = await repository.persistFilingCase({ filing_case: filingCase });
  return { filing_case: filingCase, repository, stored };
}
