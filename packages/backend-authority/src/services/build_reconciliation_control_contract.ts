import {
  type AuthorityReconciliationControlContract,
  type AuthorityTruthState,
  AuthorityModelError,
  hashObject,
  normalizeAuthorityReconciliationControlContract,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
} from "../models/authority_common.ts";
import { authorityInteractionRecordRef } from "../models/authority_interaction_record.ts";
import { classifyResendLegalityState } from "./classify_resend_legality_state.ts";
import { deriveReconciliationOutcomeClass } from "./derive_reconciliation_outcome_class.ts";
import { scheduleNextReconciliation } from "./schedule_next_reconciliation.ts";

export type BuildInteractionReconciliationControlContractInput = {
  authority_operation_profile_ref: string;
  authority_truth_state: AuthorityTruthState;
  contradictory_authority_evidence?: boolean | undefined;
  duplicate_meaning_key: string;
  escalation_due_at_or_null?: string | null | undefined;
  escalation_evidence_refs?: readonly string[] | undefined;
  escalation_owner_ref_or_null?: string | null | undefined;
  escalation_reason_codes?: readonly string[] | undefined;
  escalation_state?: AuthorityReconciliationControlContract["escalation_state"] | undefined;
  escalation_workflow_item_ref_or_null?: string | null | undefined;
  idempotency_key: string;
  interaction_id: string;
  last_budget_event_at: string;
  max_auto_reconciliation_attempts: number;
  next_reconciliation_at_or_null?: string | null | undefined;
  operation_family: string;
  provider_environment: string;
  reconciliation_attempt_count: number;
  reconciliation_budget_state: AuthorityReconciliationControlContract["reconciliation_budget_state"];
  reconciliation_cadence_seconds_or_null: number | null;
  reconciliation_deadline_at_or_null?: string | null | undefined;
  reconciliation_method: AuthorityReconciliationControlContract["reconciliation_method"];
  resend_control_reason_codes?: AuthorityReconciliationControlContract["resend_control_reason_codes"] | undefined;
  resend_legality_state?: AuthorityReconciliationControlContract["resend_legality_state"] | undefined;
  submission_lifecycle_state_or_null?: AuthorityReconciliationControlContract["submission_lifecycle_state_or_null"] | undefined;
  unresolved_authority_posture?: AuthorityReconciliationControlContract["unresolved_authority_posture"] | undefined;
  unresolved_reason_codes?: readonly string[] | undefined;
};

function unresolvedPosture(
  truth: AuthorityTruthState,
): AuthorityReconciliationControlContract["unresolved_authority_posture"] {
  if (truth === "PENDING_ACK") {
    return "PENDING_ACK_UNRESOLVED";
  }
  if (truth === "OUT_OF_BAND") {
    return "OUT_OF_BAND_CONFLICT";
  }
  return truth === "NOT_REQUESTED" || truth === "NOT_APPLICABLE"
    ? "NO_UNRESOLVED_AUTHORITY"
    : "UNKNOWN_UNRESOLVED";
}

function defaultUnresolvedReasons(input: BuildInteractionReconciliationControlContractInput) {
  if (input.reconciliation_budget_state === "NOT_OPENED" || input.reconciliation_budget_state === "CLOSED") {
    return [];
  }
  if (input.contradictory_authority_evidence === true) {
    return ["CONTRADICTORY_AUTHORITY_EVIDENCE"];
  }
  if (input.authority_truth_state === "OUT_OF_BAND") {
    return ["OUT_OF_BAND_AUTHORITY_STATE_PRESENT"];
  }
  if (input.authority_truth_state === "PENDING_ACK") {
    return ["PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION"];
  }
  return ["UNKNOWN_REQUIRES_RECONCILIATION"];
}

function assertControlStateRules(control: AuthorityReconciliationControlContract) {
  if (["NONE", "MANUAL_ONLY"].includes(control.reconciliation_method)) {
    if (
      control.max_auto_reconciliation_attempts !== 0 ||
      control.reconciliation_cadence_seconds_or_null !== null ||
      control.attempts_remaining_count !== 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "NONE and MANUAL_ONLY reconciliation controls cannot carry automatic budget economics",
      );
    }
  }
  if (control.reconciliation_budget_state === "EXHAUSTED") {
    if (
      control.attempts_remaining_count !== 0 ||
      control.next_reconciliation_at_or_null !== null ||
      control.reconciliation_deadline_at_or_null === null ||
      control.resend_legality_state !== "BLOCKED_BY_RECONCILIATION" ||
      control.escalation_state !== "READY_FOR_ESCALATION" ||
      control.escalation_reason_codes.length === 0 ||
      control.escalation_evidence_refs.length === 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "exhausted reconciliation controls must block resend and retain escalation evidence",
      );
    }
  }
  if (control.reconciliation_budget_state === "ESCALATED") {
    if (
      control.attempts_remaining_count !== 0 ||
      control.next_reconciliation_at_or_null !== null ||
      control.reconciliation_deadline_at_or_null === null ||
      control.resend_legality_state !== "BLOCKED_BY_ESCALATION" ||
      control.escalation_state !== "ESCALATED" ||
      control.escalation_owner_ref_or_null === null ||
      control.escalation_workflow_item_ref_or_null === null ||
      control.escalation_due_at_or_null === null ||
      control.escalation_reason_codes.length === 0 ||
      control.escalation_evidence_refs.length === 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "escalated reconciliation controls must preserve owner, workflow, evidence, due time, and blocked resend posture",
      );
    }
  }
  if (control.reconciliation_budget_state === "CLOSED") {
    if (
      control.next_reconciliation_at_or_null !== null ||
      control.resend_legality_state !== "CLOSED_NO_RESEND" ||
      control.resend_control_reason_codes.length === 0 ||
      control.unresolved_authority_posture !== "NO_UNRESOLVED_AUTHORITY" ||
      control.unresolved_reason_codes.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "closed reconciliation controls must clear unresolved budget and retain closed no-resend posture",
      );
    }
  }
}

function withHash(
  input: Omit<AuthorityReconciliationControlContract, "control_contract_hash">,
): AuthorityReconciliationControlContract {
  const withoutHash = normalizeAuthorityReconciliationControlContract({
    ...input,
    control_contract_hash: "pending",
  });
  const hash = hashObject("AUTHORITY_RECONCILIATION_CONTROL_V1", {
    ...withoutHash,
    control_contract_hash: null,
  });
  return normalizeAuthorityReconciliationControlContract({
    ...withoutHash,
    control_contract_hash: hash,
  });
}

export function buildInteractionReconciliationControlContract(
  input: BuildInteractionReconciliationControlContractInput,
): AuthorityReconciliationControlContract {
  const lastBudgetEventAt = normalizeTimestamp("last_budget_event_at", input.last_budget_event_at);
  const deadline = normalizeNullableTimestamp(
    "reconciliation_deadline_at_or_null",
    input.reconciliation_deadline_at_or_null ?? null,
  );
  const cadence = input.reconciliation_cadence_seconds_or_null;
  const budgetState = input.reconciliation_budget_state;
  const computedSchedule =
    budgetState === "ACTIVE" && deadline !== null && cadence !== null
      ? scheduleNextReconciliation({
          as_of: lastBudgetEventAt,
          idempotency_key: input.idempotency_key,
          max_auto_reconciliation_attempts: input.max_auto_reconciliation_attempts,
          reconciliation_attempt_count: input.reconciliation_attempt_count,
          reconciliation_cadence_seconds: cadence,
          reconciliation_deadline_at: deadline,
        })
      : null;
  const effectiveBudgetState =
    budgetState === "ACTIVE" && computedSchedule?.schedule_state === "EXHAUSTED"
      ? "EXHAUSTED"
      : budgetState;
  const resendDecision = classifyResendLegalityState({
    budget_state: effectiveBudgetState,
    contradictory_authority_evidence: input.contradictory_authority_evidence === true,
    deadline_expired:
      computedSchedule?.schedule_state === "EXHAUSTED" &&
      deadline !== null &&
      Date.parse(deadline) <= Date.parse(lastBudgetEventAt),
    lifecycle_state:
      effectiveBudgetState === "NOT_OPENED"
        ? "REQUEST_REGISTERED"
        : effectiveBudgetState === "CLOSED"
          ? "RESOLVED"
          : "RECONCILING",
    meaning_resolution_state:
      effectiveBudgetState === "NOT_OPENED"
        ? "NO_RESPONSE"
        : effectiveBudgetState === "CLOSED"
          ? "RECONCILIATION_RESOLVED"
          : "RECONCILIATION_REQUIRED",
    out_of_band_authority_state: input.authority_truth_state === "OUT_OF_BAND",
  });
  const unresolvedReasons = normalizeSortedStringSet(
    "unresolved_reason_codes",
    input.unresolved_reason_codes ?? defaultUnresolvedReasons({
      ...input,
      reconciliation_budget_state: effectiveBudgetState,
    }),
  );
  const escalationState =
    input.escalation_state ??
    (effectiveBudgetState === "ESCALATED"
      ? "ESCALATED"
      : effectiveBudgetState === "EXHAUSTED"
        ? "READY_FOR_ESCALATION"
        : "NOT_REQUIRED");
  const control = withHash({
    attempts_remaining_count:
      effectiveBudgetState === "ACTIVE"
        ? (computedSchedule?.attempts_remaining_count ?? Math.max(
            0,
            input.max_auto_reconciliation_attempts - input.reconciliation_attempt_count,
          ))
        : 0,
    authority_operation_profile_ref_or_null: requireString(
      "authority_operation_profile_ref",
      input.authority_operation_profile_ref,
    ),
    authority_truth_state: input.authority_truth_state,
    binding_scope_class: "AUTHORITY_INTERACTION_RECORD",
    blind_resend_policy: "BLOCK_ON_AMBIGUITY_OR_EXHAUSTION",
    contract_version: "AUTHORITY_RECONCILIATION_CONTROL_V1",
    duplicate_meaning_key_or_null: requireString("duplicate_meaning_key", input.duplicate_meaning_key),
    escalation_due_at_or_null: input.escalation_due_at_or_null ?? null,
    escalation_evidence_refs: normalizeSortedStringSet(
      "escalation_evidence_refs",
      input.escalation_evidence_refs ?? (
        effectiveBudgetState === "EXHAUSTED" || effectiveBudgetState === "ESCALATED"
          ? [`authority-interaction://${input.interaction_id}/reconciliation-evidence`]
          : []
      ),
    ),
    escalation_owner_ref_or_null: input.escalation_owner_ref_or_null ?? null,
    escalation_reason_codes: normalizeSortedStringSet(
      "escalation_reason_codes",
      input.escalation_reason_codes ?? (
        effectiveBudgetState === "EXHAUSTED" || effectiveBudgetState === "ESCALATED"
          ? ["AUTO_RECONCILIATION_BUDGET_EXHAUSTED"]
          : []
      ),
    ),
    escalation_state: escalationState,
    escalation_workflow_item_ref_or_null: input.escalation_workflow_item_ref_or_null ?? null,
    interaction_ref_or_null: authorityInteractionRecordRef(input.interaction_id),
    last_budget_event_at: lastBudgetEventAt,
    max_auto_reconciliation_attempts: input.max_auto_reconciliation_attempts,
    next_reconciliation_at_or_null:
      effectiveBudgetState === "ACTIVE"
        ? (input.next_reconciliation_at_or_null ?? computedSchedule?.next_reconciliation_at ?? null)
        : null,
    operation_family_or_null: requireString("operation_family", input.operation_family),
    outcome_class_for_analytics: deriveReconciliationOutcomeClass({
      authority_truth_state: input.authority_truth_state,
      budget_state: effectiveBudgetState,
    }),
    provider_environment_or_null: requireString("provider_environment", input.provider_environment),
    reconciliation_attempt_count: input.reconciliation_attempt_count,
    reconciliation_budget_state: effectiveBudgetState,
    reconciliation_cadence_seconds_or_null: cadence,
    reconciliation_deadline_at_or_null:
      effectiveBudgetState === "NOT_OPENED" || effectiveBudgetState === "CLOSED" ? null : deadline,
    reconciliation_method: input.reconciliation_method,
    replay_resume_policy: "RESUME_PERSISTED_BUDGET_ONLY",
    resend_control_reason_codes: normalizeSortedStringSet(
      "resend_control_reason_codes",
      input.resend_control_reason_codes ?? resendDecision.resend_control_reason_codes,
    ) as AuthorityReconciliationControlContract["resend_control_reason_codes"],
    resend_legality_state: input.resend_legality_state ?? resendDecision.resend_legality_state,
    submission_lifecycle_state_or_null: input.submission_lifecycle_state_or_null ?? null,
    unresolved_authority_posture:
      effectiveBudgetState === "NOT_OPENED" || effectiveBudgetState === "CLOSED"
        ? "NO_UNRESOLVED_AUTHORITY"
        : input.unresolved_authority_posture ?? unresolvedPosture(input.authority_truth_state),
    unresolved_reason_codes: unresolvedReasons,
  });
  assertControlStateRules(control);
  return control;
}
