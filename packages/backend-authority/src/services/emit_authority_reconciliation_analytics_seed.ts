import type { AuthorityReconciliationControlContract } from "../models/authority_common.ts";
import type { AuthorityInteractionRecord } from "../models/authority_interaction_record.ts";

export type AuthorityReconciliationAnalyticsSeed = {
  blocked_resend_count: number;
  budget_state_counts: Record<AuthorityReconciliationControlContract["reconciliation_budget_state"], number>;
  control_contract_hashes: string[];
  escalation_count: number;
  generated_from: "PERSISTED_RECONCILIATION_CONTROL_CONTRACTS_ONLY";
  interaction_refs: string[];
  outcome_class_counts: Record<AuthorityReconciliationControlContract["outcome_class_for_analytics"], number>;
};

function emptyBudgetCounts(): AuthorityReconciliationAnalyticsSeed["budget_state_counts"] {
  return {
    ACTIVE: 0,
    CLOSED: 0,
    ESCALATED: 0,
    EXHAUSTED: 0,
    NOT_OPENED: 0,
  };
}

function emptyOutcomeCounts(): AuthorityReconciliationAnalyticsSeed["outcome_class_counts"] {
  return {
    AMBIGUOUS: 0,
    CONFIRMED: 0,
    ESCALATED: 0,
    NO_RESPONSE_YET: 0,
    OUT_OF_BAND: 0,
    PENDING_ACK: 0,
    REJECTED: 0,
    UNKNOWN: 0,
  };
}

export function emitAuthorityReconciliationAnalyticsSeed(input: {
  interactions: readonly AuthorityInteractionRecord[];
}): AuthorityReconciliationAnalyticsSeed {
  const budgetStateCounts = emptyBudgetCounts();
  const outcomeClassCounts = emptyOutcomeCounts();
  const controlContractHashes: string[] = [];
  const interactionRefs: string[] = [];
  let blockedResendCount = 0;
  let escalationCount = 0;

  for (const interaction of input.interactions) {
    const control = interaction.reconciliation_control_contract;
    budgetStateCounts[control.reconciliation_budget_state] += 1;
    outcomeClassCounts[control.outcome_class_for_analytics] += 1;
    controlContractHashes.push(control.control_contract_hash);
    interactionRefs.push(`authority-interaction://${interaction.interaction_id}`);
    if (
      control.resend_legality_state === "BLOCKED_BY_RECONCILIATION" ||
      control.resend_legality_state === "BLOCKED_BY_ESCALATION"
    ) {
      blockedResendCount += 1;
    }
    if (control.reconciliation_budget_state === "ESCALATED") {
      escalationCount += 1;
    }
  }

  return {
    blocked_resend_count: blockedResendCount,
    budget_state_counts: budgetStateCounts,
    control_contract_hashes: [...new Set(controlContractHashes)].sort(),
    escalation_count: escalationCount,
    generated_from: "PERSISTED_RECONCILIATION_CONTROL_CONTRACTS_ONLY",
    interaction_refs: [...new Set(interactionRefs)].sort(),
    outcome_class_counts: outcomeClassCounts,
  };
}
