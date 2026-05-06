import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  assertEnum,
  assertNonNegativeInteger,
  cloneRecord,
  ensureSubset,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
  TwinModelError,
} from "./twin_common.ts";

export const TWIN_RECONCILIATION_DEDUPE_PROFILE = "TWIN_RECONCILIATION_DEDUPE_V1" as const;

export type TwinReconciliationLifecycleState =
  | "NOT_REQUIRED"
  | "QUEUED"
  | "IN_PROGRESS"
  | "WAITING_ON_AUTHORITY"
  | "WAITING_ON_OPERATOR"
  | "RESOLVED"
  | "SUPERSEDED";
export type TwinReconciliationResolutionState =
  | "NONE"
  | "UNRESOLVED"
  | "PARTIALLY_RESOLVED"
  | "RESOLVED_MATCH"
  | "RESOLVED_OUT_OF_BAND"
  | "RESOLVED_REJECTED"
  | "RESOLVED_AMENDED_BASELINE";
export type TwinReconciliationRecommendedActionCode =
  | "NONE"
  | "RETRY_AUTHORITY_SYNC"
  | "AWAIT_AUTHORITY"
  | "OPEN_OPERATOR_WORKFLOW"
  | "RUN_MANUAL_RECONCILIATION"
  | "PREPARE_AMENDMENT_REVIEW"
  | "RECORD_OUT_OF_BAND_RESOLUTION"
  | "RESOLVED"
  | "SUPERSEDED";
export type TwinReconciliationBudgetState =
  | "NOT_APPLICABLE"
  | "WITHIN_BUDGET"
  | "EXHAUSTED"
  | "MANUAL_ESCALATION";
export type TwinReconciliationNextActionOwner = "NONE" | "SYSTEM" | "AUTHORITY" | "OPERATOR";

export type TwinReconciliationStateRecord = {
  artifact_type: "TwinReconciliationState";
  auto_attempt_count: number;
  blocking_mismatch_refs: string[];
  generated_at: string;
  last_attempted_at: string | null;
  lifecycle_state: TwinReconciliationLifecycleState;
  max_auto_attempts: number;
  next_action_due_at: string | null;
  next_action_owner: TwinReconciliationNextActionOwner;
  primary_workflow_item_ref_or_null: string | null;
  reason_codes: string[];
  recommended_action_code: TwinReconciliationRecommendedActionCode;
  reconciliation_budget_state: TwinReconciliationBudgetState;
  reconciliation_deadline_at: string | null;
  resolution_state: TwinReconciliationResolutionState;
  resolved_at: string | null;
  target_mismatch_refs: string[];
  twin_id: string;
  twin_reconciliation_state_id: string;
  workflow_item_refs: string[];
};

export type TwinReconciliationStateBuildInput = Partial<
  Omit<
    TwinReconciliationStateRecord,
    | "artifact_type"
    | "auto_attempt_count"
    | "blocking_mismatch_refs"
    | "generated_at"
    | "last_attempted_at"
    | "max_auto_attempts"
    | "next_action_due_at"
    | "primary_workflow_item_ref_or_null"
    | "reason_codes"
    | "reconciliation_deadline_at"
    | "resolved_at"
    | "target_mismatch_refs"
    | "twin_id"
    | "workflow_item_refs"
  >
> & {
  auto_attempt_count?: number;
  blocking_mismatch_refs?: readonly string[];
  generated_at: string;
  last_attempted_at?: string | null;
  max_auto_attempts?: number;
  next_action_due_at?: string | null;
  primary_workflow_item_ref_or_null?: string | null;
  reason_codes?: readonly string[];
  reconciliation_deadline_at?: string | null;
  resolved_at?: string | null;
  target_mismatch_refs?: readonly string[];
  twin_id: string;
  workflow_item_refs?: readonly string[];
};

const LIFECYCLE_STATES = [
  "NOT_REQUIRED",
  "QUEUED",
  "IN_PROGRESS",
  "WAITING_ON_AUTHORITY",
  "WAITING_ON_OPERATOR",
  "RESOLVED",
  "SUPERSEDED",
] as const satisfies readonly TwinReconciliationLifecycleState[];

const RESOLUTION_STATES = [
  "NONE",
  "UNRESOLVED",
  "PARTIALLY_RESOLVED",
  "RESOLVED_MATCH",
  "RESOLVED_OUT_OF_BAND",
  "RESOLVED_REJECTED",
  "RESOLVED_AMENDED_BASELINE",
] as const satisfies readonly TwinReconciliationResolutionState[];

const RECOMMENDED_ACTION_CODES = [
  "NONE",
  "RETRY_AUTHORITY_SYNC",
  "AWAIT_AUTHORITY",
  "OPEN_OPERATOR_WORKFLOW",
  "RUN_MANUAL_RECONCILIATION",
  "PREPARE_AMENDMENT_REVIEW",
  "RECORD_OUT_OF_BAND_RESOLUTION",
  "RESOLVED",
  "SUPERSEDED",
] as const satisfies readonly TwinReconciliationRecommendedActionCode[];

const BUDGET_STATES = [
  "NOT_APPLICABLE",
  "WITHIN_BUDGET",
  "EXHAUSTED",
  "MANUAL_ESCALATION",
] as const satisfies readonly TwinReconciliationBudgetState[];

const NEXT_ACTION_OWNERS = [
  "NONE",
  "SYSTEM",
  "AUTHORITY",
  "OPERATOR",
] as const satisfies readonly TwinReconciliationNextActionOwner[];

const TERMINAL_RESOLUTION_STATES = new Set<TwinReconciliationResolutionState>([
  "RESOLVED_MATCH",
  "RESOLVED_OUT_OF_BAND",
  "RESOLVED_REJECTED",
  "RESOLVED_AMENDED_BASELINE",
]);

export function twinReconciliationStateRef(
  reconciliation: Pick<TwinReconciliationStateRecord, "twin_reconciliation_state_id"> | string,
) {
  return `twin-reconciliation-state://${
    typeof reconciliation === "string"
      ? requireString("twin_reconciliation_state_id", reconciliation)
      : reconciliation.twin_reconciliation_state_id
  }`;
}

export function deriveTwinReconciliationDedupeKey(input: {
  target_mismatch_refs: readonly string[];
  twin_id: string;
}) {
  return `twin-reconciliation-dedupe.${stableJsonHash([
    TWIN_RECONCILIATION_DEDUPE_PROFILE,
    requireString("twin_id", input.twin_id),
    normalizeSortedStringSet("target_mismatch_refs", input.target_mismatch_refs, { minItems: 1 }),
  ])}`;
}

export function isActiveTwinReconciliationState(state: TwinReconciliationStateRecord) {
  return !["NOT_REQUIRED", "RESOLVED", "SUPERSEDED"].includes(state.lifecycle_state);
}

function defaultResolutionState(lifecycleState: TwinReconciliationLifecycleState) {
  if (lifecycleState === "NOT_REQUIRED") {
    return "NONE" as const;
  }
  if (lifecycleState === "RESOLVED") {
    return "RESOLVED_MATCH" as const;
  }
  return "UNRESOLVED" as const;
}

function defaultRecommendedActionCode(lifecycleState: TwinReconciliationLifecycleState) {
  switch (lifecycleState) {
    case "NOT_REQUIRED":
      return "NONE" as const;
    case "WAITING_ON_AUTHORITY":
      return "AWAIT_AUTHORITY" as const;
    case "WAITING_ON_OPERATOR":
      return "OPEN_OPERATOR_WORKFLOW" as const;
    case "RESOLVED":
      return "RESOLVED" as const;
    case "SUPERSEDED":
      return "SUPERSEDED" as const;
    case "QUEUED":
    case "IN_PROGRESS":
      return "RUN_MANUAL_RECONCILIATION" as const;
  }
}

function defaultBudgetState(input: {
  auto_attempt_count: number;
  lifecycle_state: TwinReconciliationLifecycleState;
  max_auto_attempts: number;
}) {
  if (input.lifecycle_state === "NOT_REQUIRED") {
    return "NOT_APPLICABLE" as const;
  }
  if (input.lifecycle_state === "WAITING_ON_OPERATOR") {
    return input.auto_attempt_count >= input.max_auto_attempts && input.max_auto_attempts > 0
      ? ("EXHAUSTED" as const)
      : ("MANUAL_ESCALATION" as const);
  }
  if (input.max_auto_attempts > 0 && input.auto_attempt_count >= input.max_auto_attempts) {
    return "EXHAUSTED" as const;
  }
  return "WITHIN_BUDGET" as const;
}

function defaultNextActionOwner(lifecycleState: TwinReconciliationLifecycleState) {
  switch (lifecycleState) {
    case "NOT_REQUIRED":
    case "RESOLVED":
    case "SUPERSEDED":
      return "NONE" as const;
    case "WAITING_ON_AUTHORITY":
      return "AUTHORITY" as const;
    case "WAITING_ON_OPERATOR":
      return "OPERATOR" as const;
    case "QUEUED":
    case "IN_PROGRESS":
      return "SYSTEM" as const;
  }
}

function assertNotBefore(input: {
  detail: string;
  earlier: string | null;
  later: string | null;
}) {
  if (input.earlier !== null && input.later !== null && input.later < input.earlier) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", input.detail);
  }
}

export function buildTwinReconciliationStateRecord(
  input: TwinReconciliationStateBuildInput,
): TwinReconciliationStateRecord {
  const targetMismatchRefs = normalizeSortedStringSet("target_mismatch_refs", input.target_mismatch_refs ?? []);
  const lifecycleState = assertEnum(
    "lifecycle_state",
    input.lifecycle_state ?? (targetMismatchRefs.length === 0 ? "NOT_REQUIRED" : "QUEUED"),
    LIFECYCLE_STATES,
  );
  const autoAttemptCount = assertNonNegativeInteger("auto_attempt_count", input.auto_attempt_count ?? 0);
  const maxAutoAttempts = assertNonNegativeInteger("max_auto_attempts", input.max_auto_attempts ?? 3);
  const record: TwinReconciliationStateRecord = {
    artifact_type: "TwinReconciliationState",
    auto_attempt_count: autoAttemptCount,
    blocking_mismatch_refs: normalizeSortedStringSet(
      "blocking_mismatch_refs",
      input.blocking_mismatch_refs ?? [],
    ),
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    last_attempted_at: normalizeNullableTimestamp("last_attempted_at", input.last_attempted_at),
    lifecycle_state: lifecycleState,
    max_auto_attempts: lifecycleState === "NOT_REQUIRED" ? 0 : maxAutoAttempts,
    next_action_due_at: normalizeNullableTimestamp("next_action_due_at", input.next_action_due_at),
    next_action_owner: assertEnum(
      "next_action_owner",
      input.next_action_owner ?? defaultNextActionOwner(lifecycleState),
      NEXT_ACTION_OWNERS,
    ),
    primary_workflow_item_ref_or_null: normalizeNullableString(
      "primary_workflow_item_ref_or_null",
      input.primary_workflow_item_ref_or_null,
    ),
    reason_codes: normalizeSortedStringSet("reason_codes", input.reason_codes ?? []),
    recommended_action_code: assertEnum(
      "recommended_action_code",
      input.recommended_action_code ?? defaultRecommendedActionCode(lifecycleState),
      RECOMMENDED_ACTION_CODES,
    ),
    reconciliation_budget_state: assertEnum(
      "reconciliation_budget_state",
      input.reconciliation_budget_state ??
        defaultBudgetState({
          auto_attempt_count: autoAttemptCount,
          lifecycle_state: lifecycleState,
          max_auto_attempts: maxAutoAttempts,
        }),
      BUDGET_STATES,
    ),
    reconciliation_deadline_at: normalizeNullableTimestamp(
      "reconciliation_deadline_at",
      input.reconciliation_deadline_at,
    ),
    resolution_state: assertEnum(
      "resolution_state",
      input.resolution_state ?? defaultResolutionState(lifecycleState),
      RESOLUTION_STATES,
    ),
    resolved_at: normalizeNullableTimestamp("resolved_at", input.resolved_at),
    target_mismatch_refs: targetMismatchRefs,
    twin_id: requireString("twin_id", input.twin_id),
    twin_reconciliation_state_id:
      input.twin_reconciliation_state_id ??
      (targetMismatchRefs.length > 0
        ? `twin-reconciliation-state.${stableJsonHash([
            "TwinReconciliationState",
            input.twin_id,
            targetMismatchRefs,
          ])}`
        : `twin-reconciliation-state.${input.twin_id}.not-required`),
    workflow_item_refs: normalizeSortedStringSet("workflow_item_refs", input.workflow_item_refs ?? []),
  };
  return normalizeTwinReconciliationStateRecord(record);
}

export function normalizeTwinReconciliationStateRecord(
  input: TwinReconciliationStateRecord,
): TwinReconciliationStateRecord {
  const record: TwinReconciliationStateRecord = {
    ...input,
    artifact_type: "TwinReconciliationState",
    auto_attempt_count: assertNonNegativeInteger("auto_attempt_count", input.auto_attempt_count),
    blocking_mismatch_refs: normalizeSortedStringSet(
      "blocking_mismatch_refs",
      input.blocking_mismatch_refs,
    ),
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    last_attempted_at: normalizeNullableTimestamp("last_attempted_at", input.last_attempted_at),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, LIFECYCLE_STATES),
    max_auto_attempts: assertNonNegativeInteger("max_auto_attempts", input.max_auto_attempts),
    next_action_due_at: normalizeNullableTimestamp("next_action_due_at", input.next_action_due_at),
    next_action_owner: assertEnum("next_action_owner", input.next_action_owner, NEXT_ACTION_OWNERS),
    primary_workflow_item_ref_or_null: normalizeNullableString(
      "primary_workflow_item_ref_or_null",
      input.primary_workflow_item_ref_or_null,
    ),
    reason_codes: normalizeSortedStringSet("reason_codes", input.reason_codes),
    recommended_action_code: assertEnum(
      "recommended_action_code",
      input.recommended_action_code,
      RECOMMENDED_ACTION_CODES,
    ),
    reconciliation_budget_state: assertEnum(
      "reconciliation_budget_state",
      input.reconciliation_budget_state,
      BUDGET_STATES,
    ),
    reconciliation_deadline_at: normalizeNullableTimestamp(
      "reconciliation_deadline_at",
      input.reconciliation_deadline_at,
    ),
    resolution_state: assertEnum("resolution_state", input.resolution_state, RESOLUTION_STATES),
    resolved_at: normalizeNullableTimestamp("resolved_at", input.resolved_at),
    target_mismatch_refs: normalizeSortedStringSet("target_mismatch_refs", input.target_mismatch_refs),
    twin_id: requireString("twin_id", input.twin_id),
    twin_reconciliation_state_id: requireString(
      "twin_reconciliation_state_id",
      input.twin_reconciliation_state_id,
    ),
    workflow_item_refs: normalizeOrderedStringSet("workflow_item_refs", input.workflow_item_refs),
  };

  if (record.auto_attempt_count > record.max_auto_attempts) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "auto_attempt_count must not exceed max_auto_attempts");
  }
  ensureSubset("blocking_mismatch_refs", record.blocking_mismatch_refs, record.target_mismatch_refs);
  if (
    record.primary_workflow_item_ref_or_null !== null &&
    !record.workflow_item_refs.includes(record.primary_workflow_item_ref_or_null)
  ) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "primary_workflow_item_ref_or_null must appear in workflow_item_refs",
    );
  }
  assertNotBefore({
    detail: "next_action_due_at must not predate last_attempted_at",
    earlier: record.last_attempted_at,
    later: record.next_action_due_at,
  });
  assertNotBefore({
    detail: "resolved_at must not predate last_attempted_at",
    earlier: record.last_attempted_at,
    later: record.resolved_at,
  });

  if (record.lifecycle_state === "NOT_REQUIRED") {
    if (
      record.resolution_state !== "NONE" ||
      record.target_mismatch_refs.length > 0 ||
      record.blocking_mismatch_refs.length > 0 ||
      record.recommended_action_code !== "NONE" ||
      record.reconciliation_budget_state !== "NOT_APPLICABLE" ||
      record.workflow_item_refs.length > 0 ||
      record.primary_workflow_item_ref_or_null !== null ||
      record.auto_attempt_count !== 0 ||
      record.max_auto_attempts !== 0 ||
      record.reconciliation_deadline_at !== null ||
      record.next_action_owner !== "NONE" ||
      record.next_action_due_at !== null ||
      record.last_attempted_at !== null ||
      record.resolved_at !== null ||
      record.reason_codes.length > 0
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "NOT_REQUIRED reconciliation must clear action posture");
    }
    return record;
  }

  if (record.target_mismatch_refs.length === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "active reconciliation states require target_mismatch_refs");
  }
  if (record.resolution_state === "NONE") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "active reconciliation states require explicit resolution posture");
  }
  if (record.reconciliation_budget_state === "NOT_APPLICABLE") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "only NOT_REQUIRED may use NOT_APPLICABLE budget");
  }
  if (
    record.reconciliation_budget_state === "WITHIN_BUDGET" &&
    record.max_auto_attempts > 0 &&
    record.auto_attempt_count >= record.max_auto_attempts
  ) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "WITHIN_BUDGET is invalid after automatic budget exhaustion");
  }
  if (
    record.reconciliation_budget_state === "EXHAUSTED" &&
    record.auto_attempt_count < record.max_auto_attempts
  ) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "EXHAUSTED requires auto_attempt_count >= max_auto_attempts");
  }
  if (record.reconciliation_budget_state === "MANUAL_ESCALATION" && record.workflow_item_refs.length === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "MANUAL_ESCALATION must retain workflow ownership");
  }

  if (record.lifecycle_state === "WAITING_ON_AUTHORITY") {
    if (
      record.next_action_owner !== "AUTHORITY" ||
      record.next_action_due_at === null ||
      record.reconciliation_deadline_at === null ||
      !["UNRESOLVED", "PARTIALLY_RESOLVED"].includes(record.resolution_state) ||
      !["RETRY_AUTHORITY_SYNC", "AWAIT_AUTHORITY"].includes(record.recommended_action_code)
    ) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "WAITING_ON_AUTHORITY must retain authority owner, due time, deadline, and pending resolution",
      );
    }
  }
  if (record.lifecycle_state === "WAITING_ON_OPERATOR") {
    if (
      record.next_action_owner !== "OPERATOR" ||
      record.next_action_due_at === null ||
      record.primary_workflow_item_ref_or_null === null ||
      record.workflow_item_refs.length === 0 ||
      !["UNRESOLVED", "PARTIALLY_RESOLVED"].includes(record.resolution_state) ||
      ![
        "OPEN_OPERATOR_WORKFLOW",
        "RUN_MANUAL_RECONCILIATION",
        "PREPARE_AMENDMENT_REVIEW",
        "RECORD_OUT_OF_BAND_RESOLUTION",
      ].includes(record.recommended_action_code) ||
      !["EXHAUSTED", "MANUAL_ESCALATION"].includes(record.reconciliation_budget_state)
    ) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "WAITING_ON_OPERATOR must retain operator owner, workflow, due time, and manual/exhausted budget",
      );
    }
  }
  if (record.next_action_owner === "NONE" && record.next_action_due_at !== null) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "NONE next-action owner must clear due timing");
  }
  if (record.lifecycle_state === "RESOLVED") {
    if (
      record.resolved_at === null ||
      record.recommended_action_code !== "RESOLVED" ||
      record.next_action_owner !== "NONE" ||
      record.next_action_due_at !== null ||
      !TERMINAL_RESOLUTION_STATES.has(record.resolution_state)
    ) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "RESOLVED reconciliation requires terminal resolution_state, resolved_at, and no next-action owner",
      );
    }
  }
  if (record.lifecycle_state === "SUPERSEDED") {
    if (
      record.recommended_action_code !== "SUPERSEDED" ||
      record.next_action_owner !== "NONE" ||
      record.next_action_due_at !== null
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "SUPERSEDED reconciliation must clear next-action posture");
    }
  }
  return record;
}

export function cloneTwinReconciliationStateRecord(record: TwinReconciliationStateRecord) {
  return cloneRecord(record);
}
