import {
  AuthorityModelError,
  assertEnum,
  assertNonNegativeInteger,
  cloneRecord,
  hashObject,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";
import type { AuthorityReconciliationControlContract } from "./authority_common.ts";

export const AUTHORITY_RECONCILIATION_ANALYTICS_SOURCE_POLICY =
  "DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY" as const;

export const AUTHORITY_RECONCILIATION_BUDGET_STATE_CODES = [
  "ACTIVE",
  "CLOSED",
  "ESCALATED",
  "EXHAUSTED",
  "NOT_OPENED",
] as const satisfies readonly AuthorityReconciliationControlContract["reconciliation_budget_state"][];

export const AUTHORITY_RECONCILIATION_OUTCOME_CLASS_CODES = [
  "AMBIGUOUS",
  "CONFIRMED",
  "ESCALATED",
  "NO_RESPONSE_YET",
  "OUT_OF_BAND",
  "PENDING_ACK",
  "REJECTED",
  "UNKNOWN",
] as const satisfies readonly AuthorityReconciliationControlContract["outcome_class_for_analytics"][];

export const AUTHORITY_RECONCILIATION_RESEND_REFUSAL_REASON_CODES = [
  "AUTO_RECONCILIATION_BUDGET_EXHAUSTED",
  "CONTRADICTORY_AUTHORITY_EVIDENCE",
  "DUPLICATE_BUCKET_OCCUPIED",
  "INTERACTION_FINALIZED_NO_RESEND",
  "OUT_OF_BAND_AUTHORITY_STATE_PRESENT",
  "RECONCILIATION_DEADLINE_EXPIRED",
  "STRONGER_EXTERNAL_TRUTH_PRESENT",
  "TERMINAL_AUTHORITY_STATE_RECORDED",
] as const;

export const AUTHORITY_RECONCILIATION_TUNING_RECOMMENDATION_CODES = [
  "DECREASE_AUTO_ATTEMPT_BUDGET",
  "DECREASE_CADENCE_INTERVAL",
  "DECREASE_DEADLINE_WINDOW",
  "INCREASE_AUTO_ATTEMPT_BUDGET",
  "INCREASE_CADENCE_INTERVAL",
  "INCREASE_DEADLINE_WINDOW",
  "NO_CHANGE_RECOMMENDED",
  "REQUIRE_MANUAL_ESCALATION_EARLIER",
  "REVIEW_PROVIDER_AMBIGUITY",
] as const;

export type AuthorityReconciliationBudgetStateCode =
  (typeof AUTHORITY_RECONCILIATION_BUDGET_STATE_CODES)[number];
export type AuthorityReconciliationOutcomeClassCode =
  (typeof AUTHORITY_RECONCILIATION_OUTCOME_CLASS_CODES)[number];
export type AuthorityReconciliationResendRefusalReasonCode =
  (typeof AUTHORITY_RECONCILIATION_RESEND_REFUSAL_REASON_CODES)[number];
export type AuthorityReconciliationTuningRecommendationCode =
  (typeof AUTHORITY_RECONCILIATION_TUNING_RECOMMENDATION_CODES)[number];

export type AuthorityReconciliationCountEntry<Code extends string = string> = {
  code: Code;
  count: number;
};

export type AuthorityReconciliationAnalyticsSnapshot = {
  artifact_type: "AuthorityReconciliationAnalyticsSnapshot";
  authority_operation_profile_ref: string;
  average_attempts_consumed: number;
  blind_resend_blocked_count: number;
  budget_state_counts: AuthorityReconciliationCountEntry<AuthorityReconciliationBudgetStateCode>[];
  deadline_expiry_count: number;
  escalation_latency_seconds_p95_or_null: number | null;
  escalation_reason_counts: AuthorityReconciliationCountEntry[];
  escalated_count: number;
  generated_at: string;
  interaction_refs: string[];
  max_attempts_consumed: number;
  operation_family: string;
  outcome_class_counts: AuthorityReconciliationCountEntry<AuthorityReconciliationOutcomeClassCode>[];
  provider_environment: string;
  replay_resume_count: number;
  resend_refusal_reason_counts: AuthorityReconciliationCountEntry<AuthorityReconciliationResendRefusalReasonCode>[];
  snapshot_id: string;
  source_policy: typeof AUTHORITY_RECONCILIATION_ANALYTICS_SOURCE_POLICY;
  total_interaction_count: number;
  tuning_recommendation_codes: AuthorityReconciliationTuningRecommendationCode[];
  unresolved_ambiguity_count: number;
  window_ended_at: string;
  window_started_at: string;
};

export type AuthorityReconciliationAnalyticsSnapshotInput = Partial<
  Omit<
    AuthorityReconciliationAnalyticsSnapshot,
    | "artifact_type"
    | "budget_state_counts"
    | "interaction_refs"
    | "outcome_class_counts"
    | "resend_refusal_reason_counts"
    | "source_policy"
    | "tuning_recommendation_codes"
  >
> & {
  authority_operation_profile_ref: string;
  budget_state_counts: readonly AuthorityReconciliationCountEntry<AuthorityReconciliationBudgetStateCode>[];
  generated_at: string;
  interaction_refs?: readonly string[];
  operation_family: string;
  outcome_class_counts: readonly AuthorityReconciliationCountEntry<AuthorityReconciliationOutcomeClassCode>[];
  provider_environment: string;
  resend_refusal_reason_counts?: readonly AuthorityReconciliationCountEntry<AuthorityReconciliationResendRefusalReasonCode>[];
  source_policy?: typeof AUTHORITY_RECONCILIATION_ANALYTICS_SOURCE_POLICY;
  tuning_recommendation_codes: readonly AuthorityReconciliationTuningRecommendationCode[];
  window_ended_at: string;
  window_started_at: string;
};

function slug(value: string) {
  return requireString("snapshot_id_material", value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
}

function assertFiniteNonNegative(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must be a finite non-negative number`,
    );
  }
  return value;
}

function assertNonNegativeIntegerOrDefault(label: string, value: unknown, fallback: number) {
  return value === undefined ? fallback : assertNonNegativeInteger(label, value);
}

function sortedCountMap<Code extends string>(
  label: string,
  entries: readonly AuthorityReconciliationCountEntry<Code>[] | undefined,
  allowedCodes: readonly Code[] | null,
) {
  const counts = new Map<string, number>();
  for (const entry of entries ?? []) {
    const code = requireString(`${label}.code`, entry.code);
    if (allowedCodes !== null && !allowedCodes.includes(code as Code)) {
      throw new AuthorityModelError(
        "AUTHORITY_FIELD_INVALID",
        `${label} includes unsupported code ${code}`,
      );
    }
    if (counts.has(code)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `${label} must not repeat code ${code}`,
      );
    }
    counts.set(code, assertNonNegativeInteger(`${label}.${code}.count`, entry.count));
  }
  return counts;
}

function completeTypedCountEntries<Code extends string>(
  label: string,
  entries: readonly AuthorityReconciliationCountEntry<Code>[],
  allowedCodes: readonly Code[],
) {
  const counts = sortedCountMap(label, entries, allowedCodes);
  return allowedCodes.map((code) => ({
    code,
    count: counts.get(code) ?? 0,
  }));
}

function sparseStringCountEntries(
  label: string,
  entries: readonly AuthorityReconciliationCountEntry[] | undefined,
) {
  const counts = sortedCountMap(label, entries, null);
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

function sparseTypedCountEntries<Code extends string>(
  label: string,
  entries: readonly AuthorityReconciliationCountEntry<Code>[] | undefined,
  allowedCodes: readonly Code[],
) {
  const counts = sortedCountMap(label, entries, allowedCodes);
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code: code as Code, count }));
}

function countSum(entries: readonly AuthorityReconciliationCountEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function countFor(entries: readonly AuthorityReconciliationCountEntry[], code: string) {
  return entries.find((entry) => entry.code === code)?.count ?? 0;
}

function defaultSnapshotId(input: {
  authority_operation_profile_ref: string;
  interaction_refs: readonly string[];
  operation_family: string;
  provider_environment: string;
  window_ended_at: string;
  window_started_at: string;
}) {
  const fingerprint = hashObject("AUTHORITY_RECONCILIATION_ANALYTICS_SNAPSHOT_ID_V1", input);
  return [
    "authority-reconciliation-analytics",
    slug(input.provider_environment),
    slug(input.operation_family),
    slug(input.authority_operation_profile_ref),
    fingerprint.slice(0, 16),
  ].join(".");
}

export function authorityReconciliationAnalyticsSnapshotRef(
  snapshot: Pick<AuthorityReconciliationAnalyticsSnapshot, "snapshot_id"> | string,
) {
  return refFromId(
    "authority-reconciliation-analytics-snapshot",
    typeof snapshot === "string" ? snapshot : snapshot.snapshot_id,
  );
}

export function buildAuthorityReconciliationAnalyticsSnapshotRecord(
  input: AuthorityReconciliationAnalyticsSnapshotInput,
): AuthorityReconciliationAnalyticsSnapshot {
  const windowStartedAt = normalizeTimestamp("window_started_at", input.window_started_at);
  const windowEndedAt = normalizeTimestamp("window_ended_at", input.window_ended_at);
  const generatedAt = normalizeTimestamp("generated_at", input.generated_at);
  if (Date.parse(windowEndedAt) < Date.parse(windowStartedAt)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityReconciliationAnalyticsSnapshot window_ended_at must not predate window_started_at",
    );
  }
  if (Date.parse(generatedAt) < Date.parse(windowEndedAt)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityReconciliationAnalyticsSnapshot generated_at must not predate window_ended_at",
    );
  }

  const interactionRefs = normalizeSortedStringSet(
    "interaction_refs",
    input.interaction_refs ?? [],
  );
  const totalInteractionCount = assertNonNegativeIntegerOrDefault(
    "total_interaction_count",
    input.total_interaction_count,
    interactionRefs.length,
  );
  if (totalInteractionCount !== interactionRefs.length) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "total_interaction_count must equal interaction_refs.length",
    );
  }

  const budgetStateCounts = completeTypedCountEntries(
    "budget_state_counts",
    input.budget_state_counts,
    AUTHORITY_RECONCILIATION_BUDGET_STATE_CODES,
  );
  const outcomeClassCounts = completeTypedCountEntries(
    "outcome_class_counts",
    input.outcome_class_counts,
    AUTHORITY_RECONCILIATION_OUTCOME_CLASS_CODES,
  );
  if (countSum(budgetStateCounts) !== totalInteractionCount) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "budget_state_counts must sum to total_interaction_count",
    );
  }
  if (countSum(outcomeClassCounts) !== totalInteractionCount) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "outcome_class_counts must sum to total_interaction_count",
    );
  }

  const escalatedCount = assertNonNegativeIntegerOrDefault(
    "escalated_count",
    input.escalated_count,
    countFor(budgetStateCounts, "ESCALATED"),
  );
  if (
    escalatedCount !== countFor(budgetStateCounts, "ESCALATED") ||
    escalatedCount !== countFor(outcomeClassCounts, "ESCALATED")
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "escalated_count must mirror ESCALATED budget and outcome counts",
    );
  }

  const tuningCodes = normalizeSortedStringSet(
    "tuning_recommendation_codes",
    input.tuning_recommendation_codes,
    { minItems: 1 },
  ).map((code) =>
    assertEnum(
      "tuning_recommendation_codes",
      code,
      AUTHORITY_RECONCILIATION_TUNING_RECOMMENDATION_CODES,
    ),
  );
  if (tuningCodes.includes("NO_CHANGE_RECOMMENDED") && tuningCodes.length > 1) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "NO_CHANGE_RECOMMENDED must not be mixed with active tuning recommendation codes",
    );
  }

  const escalationLatency = input.escalation_latency_seconds_p95_or_null ?? null;
  if (escalatedCount === 0 && escalationLatency !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "escalation_latency_seconds_p95_or_null must be null when escalated_count is zero",
    );
  }
  if (escalationLatency !== null) {
    assertFiniteNonNegative(
      "escalation_latency_seconds_p95_or_null",
      escalationLatency,
    );
  }

  const sourcePolicy =
    input.source_policy ?? AUTHORITY_RECONCILIATION_ANALYTICS_SOURCE_POLICY;
  if (sourcePolicy !== AUTHORITY_RECONCILIATION_ANALYTICS_SOURCE_POLICY) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityReconciliationAnalyticsSnapshot can only derive from durable reconciliation-control contracts",
    );
  }

  const record: AuthorityReconciliationAnalyticsSnapshot = {
    artifact_type: "AuthorityReconciliationAnalyticsSnapshot",
    authority_operation_profile_ref: requireString(
      "authority_operation_profile_ref",
      input.authority_operation_profile_ref,
    ),
    average_attempts_consumed: assertFiniteNonNegative(
      "average_attempts_consumed",
      input.average_attempts_consumed ?? 0,
    ),
    blind_resend_blocked_count: assertNonNegativeIntegerOrDefault(
      "blind_resend_blocked_count",
      input.blind_resend_blocked_count,
      0,
    ),
    budget_state_counts: budgetStateCounts,
    deadline_expiry_count: assertNonNegativeIntegerOrDefault(
      "deadline_expiry_count",
      input.deadline_expiry_count,
      0,
    ),
    escalation_latency_seconds_p95_or_null: escalationLatency,
    escalation_reason_counts: sparseStringCountEntries(
      "escalation_reason_counts",
      input.escalation_reason_counts,
    ),
    escalated_count: escalatedCount,
    generated_at: generatedAt,
    interaction_refs: interactionRefs,
    max_attempts_consumed: assertNonNegativeIntegerOrDefault(
      "max_attempts_consumed",
      input.max_attempts_consumed,
      0,
    ),
    operation_family: requireString("operation_family", input.operation_family),
    outcome_class_counts: outcomeClassCounts,
    provider_environment: requireString("provider_environment", input.provider_environment),
    replay_resume_count: assertNonNegativeIntegerOrDefault(
      "replay_resume_count",
      input.replay_resume_count,
      0,
    ),
    resend_refusal_reason_counts: sparseTypedCountEntries(
      "resend_refusal_reason_counts",
      input.resend_refusal_reason_counts,
      AUTHORITY_RECONCILIATION_RESEND_REFUSAL_REASON_CODES,
    ),
    snapshot_id:
      input.snapshot_id ??
      defaultSnapshotId({
        authority_operation_profile_ref: input.authority_operation_profile_ref,
        interaction_refs: interactionRefs,
        operation_family: input.operation_family,
        provider_environment: input.provider_environment,
        window_ended_at: windowEndedAt,
        window_started_at: windowStartedAt,
      }),
    source_policy: AUTHORITY_RECONCILIATION_ANALYTICS_SOURCE_POLICY,
    total_interaction_count: totalInteractionCount,
    tuning_recommendation_codes: tuningCodes,
    unresolved_ambiguity_count: assertNonNegativeIntegerOrDefault(
      "unresolved_ambiguity_count",
      input.unresolved_ambiguity_count,
      0,
    ),
    window_ended_at: windowEndedAt,
    window_started_at: windowStartedAt,
  };

  if (record.unresolved_ambiguity_count > record.total_interaction_count) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "unresolved_ambiguity_count must not exceed total_interaction_count",
    );
  }
  if (record.deadline_expiry_count > record.blind_resend_blocked_count) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "deadline_expiry_count must not exceed blind_resend_blocked_count",
    );
  }
  if (record.replay_resume_count > record.total_interaction_count) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "replay_resume_count must not exceed total_interaction_count",
    );
  }
  if (record.average_attempts_consumed > record.max_attempts_consumed) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "average_attempts_consumed must not exceed max_attempts_consumed",
    );
  }
  return record;
}

export function normalizeAuthorityReconciliationAnalyticsSnapshot(
  input: AuthorityReconciliationAnalyticsSnapshot,
) {
  return buildAuthorityReconciliationAnalyticsSnapshotRecord(input);
}

export function cloneAuthorityReconciliationAnalyticsSnapshot(
  snapshot: AuthorityReconciliationAnalyticsSnapshot,
) {
  return cloneRecord(snapshot);
}

export function authorityReconciliationAnalyticsSnapshotContentFingerprint(
  snapshot: AuthorityReconciliationAnalyticsSnapshot,
) {
  return hashObject(
    "AUTHORITY_RECONCILIATION_ANALYTICS_SNAPSHOT_CONTENT_V1",
    normalizeAuthorityReconciliationAnalyticsSnapshot(snapshot),
  );
}
