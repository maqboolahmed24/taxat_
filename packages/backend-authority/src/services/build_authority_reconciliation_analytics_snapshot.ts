import {
  AuthorityModelError,
  normalizeTimestamp,
} from "../models/authority_common.ts";
import type { AuthorityReconciliationControlContract } from "../models/authority_common.ts";
import {
  type AuthorityInteractionRecord,
  authorityInteractionRecordRef,
  normalizeAuthorityInteractionRecord,
} from "../models/authority_interaction_record.ts";
import {
  AUTHORITY_RECONCILIATION_BUDGET_STATE_CODES,
  AUTHORITY_RECONCILIATION_OUTCOME_CLASS_CODES,
  AUTHORITY_RECONCILIATION_RESEND_REFUSAL_REASON_CODES,
  type AuthorityReconciliationAnalyticsSnapshot,
  type AuthorityReconciliationBudgetStateCode,
  type AuthorityReconciliationCountEntry,
  type AuthorityReconciliationOutcomeClassCode,
  type AuthorityReconciliationResendRefusalReasonCode,
  buildAuthorityReconciliationAnalyticsSnapshotRecord,
} from "../models/authority_reconciliation_analytics_snapshot.ts";
import { deriveReconciliationTuningRecommendations } from "./derive_reconciliation_tuning_recommendations.ts";

export type BuildAuthorityReconciliationAnalyticsSnapshotInput = {
  authority_operation_profile_ref: string;
  generated_at: string;
  interactions: readonly AuthorityInteractionRecord[];
  operation_family: string;
  provider_environment: string;
  snapshot_id?: string | undefined;
  window_ended_at: string;
  window_started_at: string;
};

export type BuildAuthorityReconciliationAnalyticsSnapshotResult = {
  deduped_interaction_refs: string[];
  excluded_superseded_or_replayed_interaction_refs: string[];
  snapshot: AuthorityReconciliationAnalyticsSnapshot;
  source_control_contract_hashes: string[];
  windowing_policy: "START_INCLUSIVE_END_EXCLUSIVE_BY_CONTROL_LAST_BUDGET_EVENT";
};

const RESEND_REFUSAL_REASONS = new Set<string>(
  AUTHORITY_RECONCILIATION_RESEND_REFUSAL_REASON_CODES,
);

function emptyTypedCounts<Code extends string>(codes: readonly Code[]) {
  return new Map<Code, number>(codes.map((code) => [code, 0]));
}

function increment<Code extends string>(counts: Map<Code, number>, code: Code) {
  counts.set(code, (counts.get(code) ?? 0) + 1);
}

function incrementString(counts: Map<string, number>, code: string) {
  counts.set(code, (counts.get(code) ?? 0) + 1);
}

function typedEntries<Code extends string>(counts: Map<Code, number>, codes: readonly Code[]) {
  return codes.map((code) => ({ code, count: counts.get(code) ?? 0 }));
}

function sparseEntries<Code extends string>(counts: Map<Code, number>) {
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

function inWindow(input: {
  control: AuthorityReconciliationControlContract;
  window_ended_at: string;
  window_started_at: string;
}) {
  return (
    input.control.last_budget_event_at >= input.window_started_at &&
    input.control.last_budget_event_at < input.window_ended_at
  );
}

function durableLineageKey(interaction: AuthorityInteractionRecord) {
  return (
    interaction.reconciliation_control_contract.duplicate_meaning_key_or_null ??
    interaction.duplicate_meaning_key ??
    authorityInteractionRecordRef(interaction)
  );
}

function latestControlFirst(left: AuthorityInteractionRecord, right: AuthorityInteractionRecord) {
  return (
    right.reconciliation_control_contract.last_budget_event_at.localeCompare(
      left.reconciliation_control_contract.last_budget_event_at,
    ) ||
    right.last_status_at.localeCompare(left.last_status_at) ||
    right.interaction_id.localeCompare(left.interaction_id)
  );
}

function assertDurableControlForSnapshot(input: {
  authority_operation_profile_ref: string;
  control: AuthorityReconciliationControlContract;
  interaction: AuthorityInteractionRecord;
  operation_family: string;
  provider_environment: string;
}) {
  const { control, interaction } = input;
  if (
    control.binding_scope_class !== "AUTHORITY_INTERACTION_RECORD" ||
    control.contract_version !== "AUTHORITY_RECONCILIATION_CONTROL_V1" ||
    control.control_contract_hash.length === 0
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation analytics snapshots require persisted AUTHORITY_INTERACTION_RECORD control contracts",
    );
  }
  if (control.authority_operation_profile_ref_or_null !== input.authority_operation_profile_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "included reconciliation control profile must match the requested snapshot profile",
    );
  }
  if (interaction.authority_operation_profile_ref !== input.authority_operation_profile_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "included interaction profile must mirror the reconciliation control profile",
    );
  }
  if (control.operation_family_or_null !== input.operation_family) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "included reconciliation control operation family must match the requested snapshot operation family",
    );
  }
  if (control.provider_environment_or_null !== input.provider_environment) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "included reconciliation control provider environment must match the requested snapshot provider environment",
    );
  }
}

function matchesSnapshotIdentity(input: {
  authority_operation_profile_ref: string;
  control: AuthorityReconciliationControlContract;
  operation_family: string;
  provider_environment: string;
}) {
  return (
    input.control.authority_operation_profile_ref_or_null ===
      input.authority_operation_profile_ref &&
    input.control.operation_family_or_null === input.operation_family &&
    input.control.provider_environment_or_null === input.provider_environment
  );
}

function isBlindResendBlocked(control: AuthorityReconciliationControlContract) {
  return (
    control.resend_legality_state === "BLOCKED_BY_RECONCILIATION" ||
    control.resend_legality_state === "BLOCKED_BY_ESCALATION"
  );
}

function isDeadlineExpired(control: AuthorityReconciliationControlContract) {
  return (
    control.resend_control_reason_codes.includes("RECONCILIATION_DEADLINE_EXPIRED") ||
    (control.reconciliation_deadline_at_or_null !== null &&
      control.reconciliation_deadline_at_or_null <= control.last_budget_event_at &&
      control.reconciliation_budget_state !== "ACTIVE")
  );
}

function hasUnresolvedAmbiguity(control: AuthorityReconciliationControlContract) {
  if (control.outcome_class_for_analytics === "AMBIGUOUS") {
    return true;
  }
  if (
    control.unresolved_authority_posture === "CONTRADICTORY_EVIDENCE" ||
    control.unresolved_authority_posture === "MANUAL_REVIEW_REQUIRED" ||
    control.unresolved_authority_posture === "OUT_OF_BAND_CONFLICT"
  ) {
    return true;
  }
  return control.unresolved_reason_codes.some(
    (code) =>
      code.includes("AMBIG") ||
      code.includes("CONTRADICTORY") ||
      code.includes("OUT_OF_BAND"),
  );
}

function hasDurableReplayResumeLineage(interaction: AuthorityInteractionRecord) {
  const refs = [
    ...interaction.audit_refs,
    ...interaction.provenance_refs,
    ...interaction.reconciliation_control_contract.escalation_evidence_refs,
  ];
  return refs.some((ref) => {
    const lower = ref.toLowerCase();
    return lower.includes("replay") || lower.includes("resume") || lower.includes("restore");
  });
}

function escalationLatencySeconds(interaction: AuthorityInteractionRecord) {
  if (interaction.reconciliation_control_contract.reconciliation_budget_state !== "ESCALATED") {
    return null;
  }
  const end =
    interaction.reconciliation_escalated_at ??
    interaction.reconciliation_control_contract.last_budget_event_at;
  const seconds = Math.max(0, (Date.parse(end) - Date.parse(interaction.created_at)) / 1000);
  return Number.isFinite(seconds) ? seconds : null;
}

function percentile95(values: readonly number[]) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? null;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function dedupeByExactMeaning(interactions: readonly AuthorityInteractionRecord[]) {
  const byLineage = new Map<string, AuthorityInteractionRecord[]>();
  for (const interaction of interactions) {
    const key = durableLineageKey(interaction);
    const current = byLineage.get(key) ?? [];
    current.push(interaction);
    byLineage.set(key, current);
  }

  const included: AuthorityInteractionRecord[] = [];
  const excludedRefs: string[] = [];
  for (const lineage of byLineage.values()) {
    const sorted = [...lineage].sort(latestControlFirst);
    const selected = sorted[0];
    if (selected !== undefined) {
      included.push(selected);
    }
    for (const excluded of sorted.slice(1)) {
      excludedRefs.push(authorityInteractionRecordRef(excluded));
    }
  }
  return {
    excludedRefs: [...new Set(excludedRefs)].sort(),
    included: included.sort((left, right) =>
      authorityInteractionRecordRef(left).localeCompare(authorityInteractionRecordRef(right)),
    ),
  };
}

export function buildAuthorityReconciliationAnalyticsSnapshot(
  input: BuildAuthorityReconciliationAnalyticsSnapshotInput,
): BuildAuthorityReconciliationAnalyticsSnapshotResult {
  const windowStartedAt = normalizeTimestamp("window_started_at", input.window_started_at);
  const windowEndedAt = normalizeTimestamp("window_ended_at", input.window_ended_at);
  const generatedAt = normalizeTimestamp("generated_at", input.generated_at);
  if (Date.parse(windowEndedAt) < Date.parse(windowStartedAt)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "snapshot window_ended_at must not predate window_started_at",
    );
  }

  const candidateInteractions = input.interactions
    .map((interaction) => normalizeAuthorityInteractionRecord(interaction))
    .filter(({ reconciliation_control_contract: control }) =>
      matchesSnapshotIdentity({
        authority_operation_profile_ref: input.authority_operation_profile_ref,
        control,
        operation_family: input.operation_family,
        provider_environment: input.provider_environment,
      }),
    )
    .filter(({ reconciliation_control_contract: control }) =>
      inWindow({
        control,
        window_ended_at: windowEndedAt,
        window_started_at: windowStartedAt,
      }),
    );

  for (const interaction of candidateInteractions) {
    assertDurableControlForSnapshot({
      authority_operation_profile_ref: input.authority_operation_profile_ref,
      control: interaction.reconciliation_control_contract,
      interaction,
      operation_family: input.operation_family,
      provider_environment: input.provider_environment,
    });
  }

  const { excludedRefs, included } = dedupeByExactMeaning(candidateInteractions);
  const budgetCounts = emptyTypedCounts<AuthorityReconciliationBudgetStateCode>(
    AUTHORITY_RECONCILIATION_BUDGET_STATE_CODES,
  );
  const outcomeCounts = emptyTypedCounts<AuthorityReconciliationOutcomeClassCode>(
    AUTHORITY_RECONCILIATION_OUTCOME_CLASS_CODES,
  );
  const resendRefusalCounts = new Map<AuthorityReconciliationResendRefusalReasonCode, number>();
  const escalationReasonCounts = new Map<string, number>();
  const attemptsConsumed: number[] = [];
  const escalationLatencies: number[] = [];
  const sourceHashes = new Set<string>();
  let blindResendBlockedCount = 0;
  let deadlineExpiryCount = 0;
  let replayResumeCount = 0;
  let unresolvedAmbiguityCount = 0;

  for (const interaction of included) {
    const control = interaction.reconciliation_control_contract;
    increment(budgetCounts, control.reconciliation_budget_state);
    increment(outcomeCounts, control.outcome_class_for_analytics);
    sourceHashes.add(control.control_contract_hash);
    attemptsConsumed.push(control.reconciliation_attempt_count);

    if (isBlindResendBlocked(control)) {
      blindResendBlockedCount += 1;
    }
    if (isDeadlineExpired(control)) {
      deadlineExpiryCount += 1;
    }
    if (hasUnresolvedAmbiguity(control)) {
      unresolvedAmbiguityCount += 1;
    }
    if (hasDurableReplayResumeLineage(interaction)) {
      replayResumeCount += 1;
    }

    if (
      control.resend_legality_state === "BLOCKED_BY_RECONCILIATION" ||
      control.resend_legality_state === "BLOCKED_BY_ESCALATION" ||
      control.resend_legality_state === "CLOSED_NO_RESEND"
    ) {
      for (const reason of control.resend_control_reason_codes) {
        if (RESEND_REFUSAL_REASONS.has(reason)) {
          incrementString(resendRefusalCounts, reason);
        }
      }
    }
    for (const reason of control.escalation_reason_codes) {
      incrementString(escalationReasonCounts, reason);
    }

    const latency = escalationLatencySeconds(interaction);
    if (latency !== null) {
      escalationLatencies.push(latency);
    }
  }

  const budgetStateCounts = typedEntries(
    budgetCounts,
    AUTHORITY_RECONCILIATION_BUDGET_STATE_CODES,
  ) satisfies AuthorityReconciliationCountEntry<AuthorityReconciliationBudgetStateCode>[];
  const outcomeClassCounts = typedEntries(
    outcomeCounts,
    AUTHORITY_RECONCILIATION_OUTCOME_CLASS_CODES,
  ) satisfies AuthorityReconciliationCountEntry<AuthorityReconciliationOutcomeClassCode>[];
  const averageAttempts =
    attemptsConsumed.length === 0
      ? 0
      : round(attemptsConsumed.reduce((sum, value) => sum + value, 0) / attemptsConsumed.length);
  const maxAttempts = attemptsConsumed.length === 0 ? 0 : Math.max(...attemptsConsumed);

  const tuningCodes = deriveReconciliationTuningRecommendations({
    average_attempts_consumed: averageAttempts,
    blind_resend_blocked_count: blindResendBlockedCount,
    budget_state_counts: budgetStateCounts,
    deadline_expiry_count: deadlineExpiryCount,
    max_attempts_consumed: maxAttempts,
    outcome_class_counts: outcomeClassCounts,
    replay_resume_count: replayResumeCount,
    total_interaction_count: included.length,
    unresolved_ambiguity_count: unresolvedAmbiguityCount,
  });

  const snapshot = buildAuthorityReconciliationAnalyticsSnapshotRecord({
    authority_operation_profile_ref: input.authority_operation_profile_ref,
    average_attempts_consumed: averageAttempts,
    blind_resend_blocked_count: blindResendBlockedCount,
    budget_state_counts: budgetStateCounts,
    deadline_expiry_count: deadlineExpiryCount,
    escalation_latency_seconds_p95_or_null: percentile95(escalationLatencies),
    escalation_reason_counts: sparseEntries(escalationReasonCounts),
    generated_at: generatedAt,
    interaction_refs: included.map((interaction) => authorityInteractionRecordRef(interaction)),
    max_attempts_consumed: maxAttempts,
    operation_family: input.operation_family,
    outcome_class_counts: outcomeClassCounts,
    provider_environment: input.provider_environment,
    replay_resume_count: replayResumeCount,
    resend_refusal_reason_counts: sparseEntries(resendRefusalCounts),
    snapshot_id: input.snapshot_id,
    total_interaction_count: included.length,
    tuning_recommendation_codes: tuningCodes,
    unresolved_ambiguity_count: unresolvedAmbiguityCount,
    window_ended_at: windowEndedAt,
    window_started_at: windowStartedAt,
  });

  return {
    deduped_interaction_refs: snapshot.interaction_refs,
    excluded_superseded_or_replayed_interaction_refs: excludedRefs,
    snapshot,
    source_control_contract_hashes: [...sourceHashes].sort(),
    windowing_policy: "START_INCLUSIVE_END_EXCLUSIVE_BY_CONTROL_LAST_BUDGET_EVENT",
  };
}
