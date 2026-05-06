import { AuthorityModelError, buildStateTransitionContract, normalizeTimestamp, requireString } from "../models/authority_common.ts";
import {
  buildFilingCaseRecord,
  type FilingCaseLifecycleState,
  type FilingCaseRecord,
} from "../models/filing_case.ts";
import { FilingCaseRepository } from "../repositories/filing_case_repository.ts";

export type FilingCaseTransitionEvent =
  | "first_manifest_created"
  | "trust_ready_for_review"
  | "approval_complete"
  | "trust_invalidated"
  | "submission_started"
  | "submission_confirmed"
  | "submission_unknown"
  | "submission_rejected"
  | "late_authority_confirmation"
  | "late_authority_rejection"
  | "drift_or_authority_context_opens_amendment"
  | "amendment_begin"
  | "amendment_confirmed"
  | "closure_policy_met";

export type TransitionFilingCaseInput = {
  amendment_case_ref?: string | null;
  current: FilingCaseRecord;
  current_manifest_ref?: string | null;
  current_packet_ref?: string | null;
  current_parity_ref?: string | null;
  current_submission_ref?: string | null;
  current_trust_ref?: string | null;
  event: FilingCaseTransitionEvent;
  repository?: FilingCaseRepository;
  transitioned_at: string;
  trust_invalidation_dependency_refs?: readonly string[];
  trust_invalidation_reason_codes?: readonly string[];
};

const TARGET: Record<FilingCaseTransitionEvent, FilingCaseLifecycleState> = {
  amendment_begin: "AMENDMENT_IN_PROGRESS",
  amendment_confirmed: "AMENDED_CONFIRMED",
  approval_complete: "READY_TO_SUBMIT",
  closure_policy_met: "CLOSED",
  drift_or_authority_context_opens_amendment: "AMENDMENT_ELIGIBLE",
  first_manifest_created: "PREPARING",
  late_authority_confirmation: "FILED_CONFIRMED",
  late_authority_rejection: "REJECTED",
  submission_confirmed: "FILED_CONFIRMED",
  submission_rejected: "REJECTED",
  submission_started: "SUBMITTED_PENDING",
  submission_unknown: "FILED_UNKNOWN",
  trust_invalidated: "READY_REVIEW",
  trust_ready_for_review: "READY_REVIEW",
};

const ALLOWED: Record<FilingCaseLifecycleState, FilingCaseTransitionEvent[]> = {
  AMENDED_CONFIRMED: ["closure_policy_met"],
  AMENDMENT_ELIGIBLE: ["amendment_begin"],
  AMENDMENT_IN_PROGRESS: ["amendment_confirmed"],
  CLOSED: [],
  FILED_CONFIRMED: ["drift_or_authority_context_opens_amendment"],
  FILED_UNKNOWN: ["late_authority_confirmation", "late_authority_rejection"],
  NOT_STARTED: ["first_manifest_created"],
  PREPARING: ["trust_ready_for_review"],
  READY_REVIEW: ["approval_complete"],
  READY_TO_SUBMIT: ["submission_started", "trust_invalidated"],
  REJECTED: [],
  SUBMITTED_PENDING: ["submission_confirmed", "submission_rejected", "submission_unknown"],
};

function ensureAllowed(current: FilingCaseRecord, event: FilingCaseTransitionEvent) {
  if (!ALLOWED[current.lifecycle_state].includes(event)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${current.lifecycle_state} filing case cannot transition with ${event}`,
    );
  }
}

export async function transitionFilingCase(input: TransitionFilingCaseInput) {
  ensureAllowed(input.current, input.event);
  const repository = input.repository ?? new FilingCaseRepository();
  const transitionedAt = normalizeTimestamp("transitioned_at", input.transitioned_at);
  const target = TARGET[input.event];
  const clearsSubmission = target === "AMENDMENT_ELIGIBLE" || target === "AMENDMENT_IN_PROGRESS";
  const requiresSubmission =
    target === "SUBMITTED_PENDING" ||
    target === "AMENDED_CONFIRMED" ||
    target === "CLOSED";
  const submissionState =
    clearsSubmission
      ? null
      : target === "AMENDED_CONFIRMED" || target === "CLOSED"
        ? "CONFIRMED"
        : target === "SUBMITTED_PENDING"
          ? "INTENT_RECORDED"
          : target === "FILED_CONFIRMED"
            ? "CONFIRMED"
            : target === "FILED_UNKNOWN"
              ? "UNKNOWN"
              : target === "REJECTED"
                ? "REJECTED"
                : input.current.current_submission_state;
  const currentSubmissionRef = clearsSubmission
    ? null
    : requiresSubmission
      ? requireString("current_submission_ref", input.current_submission_ref ?? input.current.current_submission_ref)
      : input.current.current_submission_ref;
  const nextTrustCurrency =
    input.event === "trust_invalidated"
      ? "RECALC_REQUIRED"
      : input.event === "trust_ready_for_review"
        ? "CURRENT"
        : target === "PREPARING"
          ? "NOT_APPLICABLE_PRETRUST"
          : input.current.trust_currency_state;
  const packetSubmittedStates: FilingCaseLifecycleState[] = [
    "SUBMITTED_PENDING",
    "FILED_CONFIRMED",
    "FILED_UNKNOWN",
    "REJECTED",
    "AMENDMENT_ELIGIBLE",
    "AMENDMENT_IN_PROGRESS",
    "AMENDED_CONFIRMED",
    "CLOSED",
  ];
  const packetState =
    target === "READY_TO_SUBMIT"
      ? "APPROVED_TO_SUBMIT"
      : packetSubmittedStates.includes(target)
        ? "SUBMITTED"
        : input.current.packet_state;
  const currentPacketRef =
    target === "READY_TO_SUBMIT" || packetSubmittedStates.includes(target)
      ? requireString("current_packet_ref", input.current_packet_ref ?? input.current.current_packet_ref)
      : input.current.current_packet_ref;
  const filingCase = buildFilingCaseRecord({
    ...input.current,
    amendment_case_ref:
      input.amendment_case_ref ?? (["AMENDMENT_IN_PROGRESS", "AMENDED_CONFIRMED", "CLOSED"].includes(target) ? input.current.amendment_case_ref : input.current.amendment_case_ref),
    current_manifest_ref:
      input.current_manifest_ref ?? input.current.current_manifest_ref ?? (target === "PREPARING" ? requireString("current_manifest_ref", input.current_manifest_ref) : null),
    current_packet_ref:
      currentPacketRef,
    current_parity_ref: input.current_parity_ref ?? input.current.current_parity_ref,
    current_submission_ref: currentSubmissionRef,
    current_submission_state: submissionState,
    current_trust_ref: input.current_trust_ref ?? input.current.current_trust_ref,
    last_transition_at: transitionedAt,
    lifecycle_state: target,
    packet_state: packetState,
    proof_closure_state:
      target === "READY_TO_SUBMIT" || packetSubmittedStates.includes(target)
        ? "CLOSED"
        : input.current.proof_closure_state,
    state_transition_contract: buildStateTransitionContract({
      current_state: target,
      object_family: "FILING_CASE",
      previous_state_or_null: input.current.lifecycle_state,
      transition_applied_at: transitionedAt,
      transition_event_code: input.event,
    }),
    trust_currency_state: nextTrustCurrency,
    trust_invalidated_at: input.event === "trust_invalidated" ? transitionedAt : input.current.trust_invalidated_at,
    trust_invalidation_dependency_refs:
      input.event === "trust_invalidated"
        ? input.trust_invalidation_dependency_refs
        : input.current.trust_invalidation_dependency_refs,
    trust_invalidation_reason_codes:
      input.event === "trust_invalidated"
        ? input.trust_invalidation_reason_codes ?? ["TRUST_INVALIDATED"]
        : input.current.trust_invalidation_reason_codes,
  });
  const stored = await repository.persistFilingCase({ filing_case: filingCase });
  return { filing_case: filingCase, repository, stored };
}
