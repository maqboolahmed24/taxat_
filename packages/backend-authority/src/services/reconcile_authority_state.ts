import {
  type AuthorityTruthState,
  AuthorityModelError,
  normalizeTimestamp,
  requireString,
} from "../models/authority_common.ts";
import {
  type AuthorityInteractionRecord,
  normalizeAuthorityInteractionRecord,
} from "../models/authority_interaction_record.ts";
import type { AuthorityInteractionRecordRepository } from "../repositories/authority_interaction_record_repository.ts";
import { buildInteractionReconciliationControlContract } from "./build_reconciliation_control_contract.ts";
import { classifyAuthorityResolutionBasis } from "./classify_authority_resolution_basis.ts";
import { scheduleNextReconciliation } from "./schedule_next_reconciliation.ts";
import { validateAuthorityInteractionTransition } from "./validate_authority_interaction_transition.ts";

export type AuthorityReconciliationOutcome =
  | "FOLLOW_UP_PENDING"
  | "CONTRADICTORY_EVIDENCE"
  | "ESCALATE"
  | "RESOLVE";

function mergeUnique(left: readonly string[], right: readonly string[]) {
  return [...new Set([...left, ...right])].sort();
}

function activeDeadline(interaction: AuthorityInteractionRecord) {
  if (interaction.reconciliation_deadline_at === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "open reconciliation requires reconciliation_deadline_at",
    );
  }
  return interaction.reconciliation_deadline_at;
}

function activeCadence(interaction: AuthorityInteractionRecord) {
  if (interaction.reconciliation_cadence_seconds === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "open reconciliation requires reconciliation_cadence_seconds",
    );
  }
  return interaction.reconciliation_cadence_seconds;
}

function authorityTruthForResolution(input: {
  fallback?: AuthorityTruthState | undefined;
  interaction: AuthorityInteractionRecord;
}) {
  if (input.fallback !== undefined) {
    return input.fallback;
  }
  if (
    input.interaction.meaning_resolution_state === "ACTIVE_DIRECT" ||
    input.interaction.meaning_resolution_state === "ACTIVE_CORROBORATED" ||
    input.interaction.meaning_resolution_state === "RECONCILIATION_RESOLVED"
  ) {
    return "CONFIRMED";
  }
  return "UNKNOWN";
}

export async function reconcileAuthorityState(input: {
  authority_truth_state?: AuthorityTruthState;
  current: AuthorityInteractionRecord;
  escalation_due_at?: string;
  escalation_evidence_refs?: readonly string[];
  escalation_owner_ref?: string;
  escalation_reason_codes?: readonly string[];
  escalation_workflow_item_ref?: string;
  observed_at: string;
  outcome: AuthorityReconciliationOutcome;
  repository?: AuthorityInteractionRecordRepository;
  selected_active_response_id?: string;
}) {
  const observedAt = normalizeTimestamp("observed_at", input.observed_at);
  const current = input.current;

  if (input.outcome === "RESOLVE") {
    const selectedActiveResponseId =
      input.selected_active_response_id ?? requireString("active_response_id", current.active_response_id);
    if (!current.response_history_ids.includes(selectedActiveResponseId)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "reconciliation resolution must select a response already present in response_history_ids",
      );
    }
    const transition = validateAuthorityInteractionTransition({
      current,
      event:
        current.reconciliation_attempt_count > 0 || current.lifecycle_state === "RECONCILING"
          ? "resolution_reached"
          : "response_terminal_without_reconciliation",
      transition_at: observedAt,
    });
    const resolutionBasis = classifyAuthorityResolutionBasis({
      interaction: {
        ...current,
        active_response_id: selectedActiveResponseId,
        lifecycle_state: "RESOLVED",
        meaning_resolution_state:
          current.reconciliation_attempt_count > 0
            ? "RECONCILIATION_RESOLVED"
            : current.meaning_resolution_state,
      },
    });
    const control = buildInteractionReconciliationControlContract({
      authority_operation_profile_ref: current.authority_operation_profile_ref,
      authority_truth_state: authorityTruthForResolution({
        fallback: input.authority_truth_state,
        interaction: current,
      }),
      duplicate_meaning_key: current.duplicate_meaning_key,
      idempotency_key: current.idempotency_key,
      interaction_id: current.interaction_id,
      last_budget_event_at: observedAt,
      max_auto_reconciliation_attempts:
        current.reconciliation_attempt_count > 0 ? current.max_auto_reconciliation_attempts : 0,
      operation_family: current.request_identity_contract.operation_family,
      provider_environment: current.request_identity_contract.provider_environment,
      reconciliation_attempt_count: current.reconciliation_attempt_count,
      reconciliation_budget_state: "CLOSED",
      reconciliation_cadence_seconds_or_null:
        current.reconciliation_attempt_count > 0 ? current.reconciliation_cadence_seconds : null,
      reconciliation_deadline_at_or_null: null,
      reconciliation_method:
        current.reconciliation_attempt_count > 0 ? current.reconciliation_method : "NONE",
      resend_control_reason_codes: ["TERMINAL_AUTHORITY_STATE_RECORDED"],
      resend_legality_state: "CLOSED_NO_RESEND",
    });
    const interaction = normalizeAuthorityInteractionRecord({
      ...current,
      active_response_id: selectedActiveResponseId,
      audit_refs: mergeUnique(current.audit_refs, [transition.transition_audit_ref]),
      authority_ingress_proof_contract:
        current.authority_ingress_proof_contract?.normalized_response_ref_or_null ===
        selectedActiveResponseId
          ? current.authority_ingress_proof_contract
          : null,
      last_status_at: observedAt,
      lifecycle_state: transition.to_state,
      meaning_resolution_state:
        current.reconciliation_attempt_count > 0
          ? "RECONCILIATION_RESOLVED"
          : current.meaning_resolution_state,
      next_reconciliation_at: null,
      reconciliation_budget_state: "CLOSED",
      reconciliation_control_contract: control,
      reconciliation_deadline_at: null,
      reconciliation_method: control.reconciliation_method,
      resend_control_reason_codes: control.resend_control_reason_codes,
      resend_legality_state: "CLOSED_NO_RESEND",
      resolution_basis: resolutionBasis,
    });
    const stored = input.repository
      ? await input.repository.persistAuthorityInteractionRecord({ interaction })
      : null;
    return { control, interaction, stored, transition };
  }

  const transition =
    current.lifecycle_state === "RESPONSE_CAPTURED"
      ? validateAuthorityInteractionTransition({
          current,
          event: "reconciliation_begin",
          transition_at: observedAt,
        })
      : null;
  const attemptCount = Math.max(1, current.reconciliation_attempt_count + 1);
  const deadline = activeDeadline(current);
  const cadence = activeCadence(current);
  const schedule = scheduleNextReconciliation({
    as_of: observedAt,
    idempotency_key: current.idempotency_key,
    max_auto_reconciliation_attempts: current.max_auto_reconciliation_attempts,
    reconciliation_attempt_count: attemptCount,
    reconciliation_cadence_seconds: cadence,
    reconciliation_deadline_at: deadline,
  });
  const escalated = input.outcome === "ESCALATE";
  const contradictory = input.outcome === "CONTRADICTORY_EVIDENCE";
  const exhausted = schedule.schedule_state === "EXHAUSTED" || contradictory;
  const budgetState = escalated ? "ESCALATED" : exhausted ? "EXHAUSTED" : "ACTIVE";
  const needsEscalationEvidence = escalated || exhausted;
  const control = buildInteractionReconciliationControlContract({
    authority_operation_profile_ref: current.authority_operation_profile_ref,
    authority_truth_state: input.authority_truth_state ?? "UNKNOWN",
    contradictory_authority_evidence: contradictory,
    duplicate_meaning_key: current.duplicate_meaning_key,
    escalation_due_at_or_null: escalated
      ? requireString("escalation_due_at", input.escalation_due_at)
      : null,
    escalation_evidence_refs: needsEscalationEvidence
      ? input.escalation_evidence_refs ?? [
          `authority-interaction://${current.interaction_id}/reconciliation-attempt-${attemptCount}`,
        ]
      : undefined,
    escalation_owner_ref_or_null: escalated
      ? requireString("escalation_owner_ref", input.escalation_owner_ref)
      : null,
    escalation_reason_codes: needsEscalationEvidence
      ? input.escalation_reason_codes ?? [
          contradictory ? "CONTRADICTORY_AUTHORITY_EVIDENCE" : "AUTO_RECONCILIATION_BUDGET_EXHAUSTED",
        ]
      : undefined,
    escalation_state: escalated ? "ESCALATED" : undefined,
    escalation_workflow_item_ref_or_null: escalated
      ? requireString("escalation_workflow_item_ref", input.escalation_workflow_item_ref)
      : null,
    idempotency_key: current.idempotency_key,
    interaction_id: current.interaction_id,
    last_budget_event_at: observedAt,
    max_auto_reconciliation_attempts: current.max_auto_reconciliation_attempts,
    operation_family: current.request_identity_contract.operation_family,
    provider_environment: current.request_identity_contract.provider_environment,
    reconciliation_attempt_count: attemptCount,
    reconciliation_budget_state: budgetState,
    reconciliation_cadence_seconds_or_null: cadence,
    reconciliation_deadline_at_or_null: deadline,
    reconciliation_method: current.reconciliation_method,
    unresolved_authority_posture: contradictory ? "CONTRADICTORY_EVIDENCE" : undefined,
    unresolved_reason_codes: contradictory
      ? ["CONTRADICTORY_AUTHORITY_EVIDENCE"]
      : undefined,
  });
  const interaction = normalizeAuthorityInteractionRecord({
    ...current,
    audit_refs: mergeUnique(
      current.audit_refs,
      [
        transition?.transition_audit_ref ??
          `audit://authority-interaction/${current.interaction_id}/reconciliation-${attemptCount}`,
      ],
    ),
    last_status_at: observedAt,
    lifecycle_state: transition?.to_state ?? "RECONCILING",
    max_auto_reconciliation_attempts: control.max_auto_reconciliation_attempts,
    meaning_resolution_state: "RECONCILIATION_REQUIRED",
    next_reconciliation_at: control.next_reconciliation_at_or_null,
    provenance_refs: mergeUnique(current.provenance_refs, [control.control_contract_hash]),
    reconciliation_attempt_count: control.reconciliation_attempt_count,
    reconciliation_budget_state: control.reconciliation_budget_state,
    reconciliation_cadence_seconds: control.reconciliation_cadence_seconds_or_null,
    reconciliation_control_contract: control,
    reconciliation_deadline_at: control.reconciliation_deadline_at_or_null,
    reconciliation_escalated_at: escalated ? observedAt : current.reconciliation_escalated_at,
    reconciliation_method: control.reconciliation_method,
    reconciliation_workflow_item_ref:
      control.escalation_workflow_item_ref_or_null ?? current.reconciliation_workflow_item_ref,
    resend_control_reason_codes: control.resend_control_reason_codes,
    resend_legality_state: control.resend_legality_state,
  });
  const stored = input.repository
    ? await input.repository.persistAuthorityInteractionRecord({ interaction })
    : null;
  return { control, interaction, stored, transition };
}
