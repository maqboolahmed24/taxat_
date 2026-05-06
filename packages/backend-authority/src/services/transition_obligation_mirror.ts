import {
  type AuthorityIngressProofContract,
  buildAuthorityReconciliationControlContract,
} from "../models/authority_common.ts";
import {
  buildObligationMirrorRecord,
  type ObligationMirrorLifecycleState,
  type ObligationMirrorRecord,
} from "../models/obligation_mirror.ts";
import { ObligationMirrorRepository } from "../repositories/obligation_mirror_repository.ts";
import { AuthorityModelError, normalizeTimestamp, requireString } from "../models/authority_common.ts";

export type ObligationMirrorTransitionEvent =
  | "window_open"
  | "deadline_approaching"
  | "all_internal_gates_pass"
  | "submission_started"
  | "authority_confirms"
  | "deadline_passed_without_met"
  | "obligation_removed_or_rescoped";

export type TransitionObligationMirrorInput = {
  authority_status_ref?: string | null;
  authority_ingress_proof_contract?: AuthorityIngressProofContract | null;
  blocked_reason_codes?: readonly string[];
  current: ObligationMirrorRecord;
  current_submission_ref?: string | null;
  event: ObligationMirrorTransitionEvent;
  last_confirmed_submission_ref?: string | null;
  ready_manifest_ref?: string | null;
  repository?: ObligationMirrorRepository;
  transitioned_at: string;
};

const TARGET_BY_EVENT: Record<ObligationMirrorTransitionEvent, ObligationMirrorLifecycleState> = {
  all_internal_gates_pass: "READY_TO_FILE",
  authority_confirms: "MET_CONFIRMED",
  deadline_approaching: "DUE_SOON",
  deadline_passed_without_met: "LATE_UNMET",
  obligation_removed_or_rescoped: "NO_LONGER_RELEVANT",
  submission_started: "SUBMITTED_PENDING",
  window_open: "OPEN",
};

const ALLOWED: Record<ObligationMirrorLifecycleState, ObligationMirrorTransitionEvent[]> = {
  DUE_SOON: ["deadline_passed_without_met"],
  LATE_UNMET: [],
  MET_CONFIRMED: [],
  NOT_YET_OPEN: ["window_open"],
  NO_LONGER_RELEVANT: [],
  OPEN: [
    "all_internal_gates_pass",
    "deadline_approaching",
    "deadline_passed_without_met",
    "obligation_removed_or_rescoped",
  ],
  READY_TO_FILE: ["submission_started"],
  SUBMITTED_PENDING: ["authority_confirms"],
};

function ensureAllowed(current: ObligationMirrorRecord, event: ObligationMirrorTransitionEvent) {
  if (!ALLOWED[current.lifecycle_state].includes(event)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${current.lifecycle_state} cannot transition with ${event}`,
    );
  }
}

export async function transitionObligationMirror(input: TransitionObligationMirrorInput) {
  ensureAllowed(input.current, input.event);
  const transitionedAt = normalizeTimestamp("transitioned_at", input.transitioned_at);
  const repository = input.repository ?? new ObligationMirrorRepository();
  const target = TARGET_BY_EVENT[input.event];
  const base = {
    ...input.current,
    lifecycle_state: target,
  };

  const mirror = buildObligationMirrorRecord({
    ...base,
    authority_ingress_proof_contract:
      input.authority_ingress_proof_contract ?? input.current.authority_ingress_proof_contract,
    authority_status_ref: input.authority_status_ref ?? null,
    authority_truth_state:
      target === "READY_TO_FILE" ? "NOT_REQUESTED" : target === "SUBMITTED_PENDING" ? "PENDING_ACK" : target === "MET_CONFIRMED" ? "CONFIRMED" : "UNKNOWN",
    blocked_reason_codes:
      target === "LATE_UNMET" ? input.blocked_reason_codes ?? ["OBLIGATION_DEADLINE_PASSED_UNMET"] : [],
    current_submission_ref:
      target === "SUBMITTED_PENDING"
        ? requireString("current_submission_ref", input.current_submission_ref)
        : null,
    last_authority_sync_at: target === "MET_CONFIRMED" ? transitionedAt : input.current.last_authority_sync_at,
    last_confirmed_submission_ref:
      target === "MET_CONFIRMED"
        ? requireString("last_confirmed_submission_ref", input.last_confirmed_submission_ref)
        : null,
    ready_manifest_ref:
      target === "READY_TO_FILE" ? requireString("ready_manifest_ref", input.ready_manifest_ref) : null,
    reconciliation_control_contract_or_null:
      target === "SUBMITTED_PENDING"
        ? buildAuthorityReconciliationControlContract({
            authority_truth_state: "PENDING_ACK",
            last_budget_event_at: transitionedAt,
            submission_lifecycle_state_or_null: "PENDING_ACK",
          })
        : target === "MET_CONFIRMED"
          ? buildAuthorityReconciliationControlContract({
              authority_truth_state: "CONFIRMED",
              last_budget_event_at: transitionedAt,
              submission_lifecycle_state_or_null: "CONFIRMED",
            })
          : input.current.reconciliation_control_contract_or_null,
  });
  const stored = await repository.persistObligationMirror({ mirror });
  return { mirror, repository, stored };
}
