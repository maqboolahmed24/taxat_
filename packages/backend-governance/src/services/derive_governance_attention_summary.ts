import type {
  TenantGovernanceSnapshotAttentionSummary,
  TenantGovernanceSnapshotRiskLedgerEntry,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  governanceFamilyToQueueCode,
  type GovernanceFamilyCode,
  type GovernanceFamilyScore,
} from "./derive_governance_family_scores.ts";

export class GovernanceAttentionSummaryError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_ATTENTION_SUMMARY_INVALID: ${detail}`);
    this.name = "GovernanceAttentionSummaryError";
  }
}

const calmSummary = {
  affected_scope_label: null,
  attention_family: "CALM",
  headline: "Governance overview is calm",
  next_legal_action_label: null,
  primary_action_label: null,
  primary_worklist_ref: null,
  secondary_issue_count: 0,
  supporting_text: "No open governance family is asking for operator attention.",
  why_now_label: null,
} as const satisfies TenantGovernanceSnapshotAttentionSummary;

function requireNonEmptyString(label: string, value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (normalized.length === 0) {
    throw new GovernanceAttentionSummaryError(`${label} must be a non-empty string`);
  }
  return normalized;
}

function whyNowFor(score: GovernanceFamilyScore) {
  if (score.critical_open_count > 0) {
    return `${score.critical_open_count} critical open item${score.critical_open_count === 1 ? "" : "s"}`;
  }
  if (score.requires_operator_action === 1) {
    return "Operator action is required";
  }
  if (score.oldest_open_age_hours > 0) {
    return `Oldest open item is ${Math.floor(score.oldest_open_age_hours)} hours old`;
  }
  return "Open work remains in this queue";
}

export function deriveGovernanceAttentionSummary(input: {
  familyScores: readonly GovernanceFamilyScore[];
  primaryFamily: GovernanceFamilyCode | null;
  riskLedgerEntries: readonly TenantGovernanceSnapshotRiskLedgerEntry[];
}): TenantGovernanceSnapshotAttentionSummary {
  if (input.primaryFamily === null) {
    return { ...calmSummary };
  }

  const primaryQueueCode = governanceFamilyToQueueCode[input.primaryFamily];
  const promotedLedgerRow = input.riskLedgerEntries.find(
    (entry) => entry.queue_code === primaryQueueCode,
  );
  if (!promotedLedgerRow || promotedLedgerRow.open_count === 0) {
    return { ...calmSummary };
  }
  const primaryScore = input.familyScores.find((score) => score.family === input.primaryFamily);
  if (!primaryScore) {
    throw new GovernanceAttentionSummaryError(
      `missing score source for primary family ${input.primaryFamily}`,
    );
  }

  const nextActionLabel = requireNonEmptyString(
    "promotedLedgerRow.next_action_label",
    promotedLedgerRow.next_action_label,
  );
  return {
    affected_scope_label: requireNonEmptyString(
      "promotedLedgerRow.affected_scope_label",
      promotedLedgerRow.affected_scope_label,
    ),
    attention_family: input.primaryFamily,
    headline: requireNonEmptyString("promotedLedgerRow.headline", promotedLedgerRow.headline),
    next_legal_action_label: nextActionLabel,
    primary_action_label: nextActionLabel,
    primary_worklist_ref: requireNonEmptyString(
      "promotedLedgerRow.worklist_ref",
      promotedLedgerRow.worklist_ref,
    ),
    secondary_issue_count: input.riskLedgerEntries
      .filter((entry) => entry.queue_code !== primaryQueueCode)
      .reduce((total, entry) => total + entry.open_count, 0),
    supporting_text:
      "The promoted queue is the only dominant action; the other governance families stay supporting.",
    why_now_label: whyNowFor(primaryScore),
  };
}
