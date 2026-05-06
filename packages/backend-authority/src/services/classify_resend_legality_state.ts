import type { AuthorityReconciliationControlContract } from "../models/authority_common.ts";
import type {
  AuthorityInteractionLifecycleState,
  AuthorityInteractionMeaningResolutionState,
} from "../models/authority_interaction_record.ts";

export type ResendLegalityDecision = {
  resend_control_reason_codes: AuthorityReconciliationControlContract["resend_control_reason_codes"];
  resend_legality_state: AuthorityReconciliationControlContract["resend_legality_state"];
};

function sortedReasons(
  reasons: readonly AuthorityReconciliationControlContract["resend_control_reason_codes"][number][],
) {
  return [...new Set(reasons)].sort() as AuthorityReconciliationControlContract["resend_control_reason_codes"];
}

export function classifyResendLegalityState(input: {
  budget_state: AuthorityReconciliationControlContract["reconciliation_budget_state"];
  contradictory_authority_evidence?: boolean;
  deadline_expired?: boolean;
  lifecycle_state: AuthorityInteractionLifecycleState;
  meaning_resolution_state: AuthorityInteractionMeaningResolutionState;
  out_of_band_authority_state?: boolean;
  stronger_external_truth?: boolean;
}): ResendLegalityDecision {
  if (["REQUEST_REGISTERED", "DISPATCH_READY"].includes(input.lifecycle_state)) {
    return {
      resend_control_reason_codes: [],
      resend_legality_state: "UNASSESSED",
    };
  }
  if (input.lifecycle_state === "TRANSMIT_IN_FLIGHT") {
    return {
      resend_control_reason_codes: sortedReasons([
        "IN_FLIGHT_REQUEST_LINEAGE_EXISTS",
        "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY",
      ]),
      resend_legality_state: "IDEMPOTENT_RECOVERY_ONLY",
    };
  }
  if (input.budget_state === "ESCALATED") {
    return {
      resend_control_reason_codes: sortedReasons([
        "AUTO_RECONCILIATION_BUDGET_EXHAUSTED",
        "RECONCILIATION_DEADLINE_EXPIRED",
      ]),
      resend_legality_state: "BLOCKED_BY_ESCALATION",
    };
  }
  if (
    input.budget_state === "EXHAUSTED" ||
    input.contradictory_authority_evidence === true ||
    input.deadline_expired === true ||
    input.out_of_band_authority_state === true ||
    input.stronger_external_truth === true
  ) {
    const reasons: AuthorityReconciliationControlContract["resend_control_reason_codes"] = [];
    if (input.budget_state === "EXHAUSTED") {
      reasons.push("AUTO_RECONCILIATION_BUDGET_EXHAUSTED");
    }
    if (input.deadline_expired === true) {
      reasons.push("RECONCILIATION_DEADLINE_EXPIRED");
    }
    if (input.contradictory_authority_evidence === true) {
      reasons.push("CONTRADICTORY_AUTHORITY_EVIDENCE");
    }
    if (input.out_of_band_authority_state === true) {
      reasons.push("OUT_OF_BAND_AUTHORITY_STATE_PRESENT");
    }
    if (input.stronger_external_truth === true) {
      reasons.push("STRONGER_EXTERNAL_TRUTH_PRESENT");
    }
    return {
      resend_control_reason_codes: sortedReasons(
        reasons.length > 0 ? reasons : ["AUTO_RECONCILIATION_BUDGET_EXHAUSTED"],
      ),
      resend_legality_state: "BLOCKED_BY_RECONCILIATION",
    };
  }
  if (input.budget_state === "ACTIVE") {
    return {
      resend_control_reason_codes: sortedReasons([
        input.meaning_resolution_state === "PROVISIONAL_TIMEOUT"
          ? "TIMEOUT_PLACEHOLDER_REQUIRES_RECONCILIATION"
          : "PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION",
      ]),
      resend_legality_state: "FOLLOW_UP_READ_ONLY",
    };
  }
  return {
    resend_control_reason_codes: sortedReasons([
      input.lifecycle_state === "RESOLVED"
        ? "TERMINAL_AUTHORITY_STATE_RECORDED"
        : "INTERACTION_FINALIZED_NO_RESEND",
    ]),
    resend_legality_state: "CLOSED_NO_RESEND",
  };
}
