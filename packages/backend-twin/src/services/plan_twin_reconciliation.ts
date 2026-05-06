import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { twinDeltaArcRef, type TwinDeltaArcRecord } from "../models/twin_delta_arc.ts";
import { normalizeTimestamp, TwinModelError } from "../models/twin_common.ts";
import {
  buildTwinReconciliationStateRecord,
  deriveTwinReconciliationDedupeKey,
  type TwinReconciliationRecommendedActionCode,
  type TwinReconciliationStateRecord,
} from "../models/twin_reconciliation_state.ts";
import { TwinReconciliationStateRepository } from "../repositories/twin_reconciliation_state_repository.ts";

export type TwinReconciliationProfile = {
  authority_wait_seconds?: number;
  max_auto_attempts?: number;
  operator_due_seconds?: number;
  reconciliation_window_seconds?: number;
};

export type PlanTwinReconciliationInput = {
  auto_attempt_count?: number;
  deltas: readonly TwinDeltaArcRecord[];
  existing_reconciliation_state?: TwinReconciliationStateRecord | null;
  generated_at: string;
  last_attempted_at?: string | null;
  profile?: TwinReconciliationProfile;
  repository?: TwinReconciliationStateRepository;
  twin_id: string;
  workflow_item_refs?: readonly string[];
};

export type PlanTwinReconciliationResult = {
  reconciliation_dedupe_key: string | null;
  reconciliation_state: TwinReconciliationStateRecord;
  repository: TwinReconciliationStateRepository;
  stored: Awaited<ReturnType<TwinReconciliationStateRepository["persistTwinReconciliationState"]>>;
  target_deltas: TwinDeltaArcRecord[];
};

const DEFAULT_RECONCILIATION_PROFILE = {
  authority_wait_seconds: 86_400,
  max_auto_attempts: 3,
  operator_due_seconds: 86_400,
  reconciliation_window_seconds: 259_200,
} as const satisfies Required<TwinReconciliationProfile>;

const IMMEDIATE_RECONCILIATION_CLASSES = new Set<TwinDeltaArcRecord["delta_class"]>([
  "ACK_PARTIAL",
  "ACK_CONTRADICTORY",
  "AUTHORITY_ONLY",
  "BASIS_MISMATCH",
  "OUT_OF_BAND",
  "REJECTED_OR_REVERSED",
  "STATUS_MISMATCH",
]);

const OPERATOR_OWNED_CLASSES = new Set<TwinDeltaArcRecord["delta_class"]>([
  "ACK_CONTRADICTORY",
  "BASELINE_MISSING",
  "OUT_OF_BAND",
  "REJECTED_OR_REVERSED",
]);

function addSeconds(instant: string, seconds: number) {
  const date = new Date(normalizeTimestamp("instant", instant));
  date.setUTCSeconds(date.getUTCSeconds() + seconds);
  return date.toISOString().replace(".000Z", "Z");
}

function earliestInstant(values: readonly (string | null)[], fallback: string) {
  return values.filter((value): value is string => value !== null).sort()[0] ?? fallback;
}

function requiresReconciliation(delta: TwinDeltaArcRecord) {
  if (delta.delta_class === "ACK_PENDING") {
    return true;
  }
  if (delta.delta_class === "BASELINE_MISSING") {
    return true;
  }
  if (IMMEDIATE_RECONCILIATION_CLASSES.has(delta.delta_class)) {
    return true;
  }
  return ["RUN_RECONCILIATION", "PREPARE_AMENDMENT"].includes(delta.resolution_class);
}

function reasonCodes(deltas: readonly TwinDeltaArcRecord[]) {
  const reasons = new Set<string>();
  for (const delta of deltas) {
    reasons.add(delta.delta_class);
    if (delta.comparability_reason_code !== "NONE") {
      reasons.add(delta.comparability_reason_code);
    }
    if (delta.resolution_class !== "NONE") {
      reasons.add(delta.resolution_class);
    }
  }
  return [...reasons].sort();
}

function workflowRef(input: { dedupe_key: string; twin_id: string }) {
  return `workflow-item://twin-reconciliation/${encodeURIComponent(input.twin_id)}/${stableJsonHash([
    "TwinReconciliationWorkflow",
    input.dedupe_key,
  ])}`;
}

function recommendedOperatorAction(
  deltas: readonly TwinDeltaArcRecord[],
): TwinReconciliationRecommendedActionCode {
  if (deltas.some((delta) => delta.delta_class === "OUT_OF_BAND")) {
    return "RECORD_OUT_OF_BAND_RESOLUTION";
  }
  if (
    deltas.some(
      (delta) =>
        delta.delta_class === "BASELINE_MISSING" || delta.resolution_class === "PREPARE_AMENDMENT",
    )
  ) {
    return "PREPARE_AMENDMENT_REVIEW";
  }
  return "RUN_MANUAL_RECONCILIATION";
}

export async function planTwinReconciliation(
  input: PlanTwinReconciliationInput,
): Promise<PlanTwinReconciliationResult> {
  const repository = input.repository ?? new TwinReconciliationStateRepository();
  const generatedAt = normalizeTimestamp("generated_at", input.generated_at);
  const profile = { ...DEFAULT_RECONCILIATION_PROFILE, ...input.profile };
  const targetDeltas = input.deltas.filter(requiresReconciliation);
  if (targetDeltas.length === 0) {
    const reconciliationState = buildTwinReconciliationStateRecord({
      generated_at: generatedAt,
      lifecycle_state: "NOT_REQUIRED",
      max_auto_attempts: 0,
      twin_id: input.twin_id,
    });
    const stored = await repository.persistTwinReconciliationState({
      reconciliation_state: reconciliationState,
    });
    return {
      reconciliation_dedupe_key: null,
      reconciliation_state: reconciliationState,
      repository,
      stored,
      target_deltas: [],
    };
  }

  const targetMismatchRefs = targetDeltas.map((delta) => twinDeltaArcRef(delta));
  const dedupeKey = deriveTwinReconciliationDedupeKey({
    target_mismatch_refs: targetMismatchRefs,
    twin_id: input.twin_id,
  });
  const existing =
    input.existing_reconciliation_state ??
    (await repository.findActiveTwinReconciliationStateByDedupeKey({
      target_mismatch_refs: targetMismatchRefs,
      twin_id: input.twin_id,
    }))?.record ??
    null;
  const autoAttemptCount = existing?.auto_attempt_count ?? input.auto_attempt_count ?? 0;
  const maxAutoAttempts = existing?.max_auto_attempts ?? profile.max_auto_attempts;
  const computedDeadline = earliestInstant(
    targetDeltas.map((delta) => delta.resolution_deadline_at),
    addSeconds(generatedAt, profile.reconciliation_window_seconds),
  );
  const reconciliationDeadlineAt = existing?.reconciliation_deadline_at ?? computedDeadline;
  const budgetExhausted = maxAutoAttempts > 0 && autoAttemptCount >= maxAutoAttempts;
  const deadlineExpired = reconciliationDeadlineAt <= generatedAt;
  const waitingOnly = targetDeltas.every((delta) => delta.delta_class === "ACK_PENDING");
  const blockingMismatchRefs = targetDeltas
    .filter(
      (delta) =>
        delta.materiality_class === "BLOCKING" ||
        delta.comparability_state === "CONTRADICTORY" ||
        delta.comparability_state === "OUT_OF_BAND" ||
        OPERATOR_OWNED_CLASSES.has(delta.delta_class),
    )
    .map((delta) => twinDeltaArcRef(delta));
  const workflowRefs = [...(existing?.workflow_item_refs ?? []), ...(input.workflow_item_refs ?? [])];
  const generatedWorkflowRef = workflowRef({ dedupe_key: dedupeKey, twin_id: input.twin_id });
  const needsOperator =
    (waitingOnly && (budgetExhausted || deadlineExpired)) ||
    targetDeltas.some((delta) => OPERATOR_OWNED_CLASSES.has(delta.delta_class));
  const effectiveWorkflowRefs = needsOperator
    ? [...new Set([...workflowRefs, generatedWorkflowRef])].sort()
    : workflowRefs;
  const primaryWorkflowRef = needsOperator
    ? existing?.primary_workflow_item_ref_or_null ?? effectiveWorkflowRefs[0] ?? generatedWorkflowRef
    : (existing?.primary_workflow_item_ref_or_null ?? null);

  let reconciliationState: TwinReconciliationStateRecord;
  if (needsOperator) {
    reconciliationState = buildTwinReconciliationStateRecord({
      auto_attempt_count: autoAttemptCount,
      blocking_mismatch_refs: blockingMismatchRefs,
      generated_at: generatedAt,
      last_attempted_at: existing?.last_attempted_at ?? input.last_attempted_at ?? null,
      lifecycle_state: "WAITING_ON_OPERATOR",
      max_auto_attempts: maxAutoAttempts,
      next_action_due_at: addSeconds(generatedAt, profile.operator_due_seconds),
      next_action_owner: "OPERATOR",
      primary_workflow_item_ref_or_null: primaryWorkflowRef,
      reason_codes: reasonCodes(targetDeltas),
      recommended_action_code: waitingOnly ? "OPEN_OPERATOR_WORKFLOW" : recommendedOperatorAction(targetDeltas),
      reconciliation_budget_state: budgetExhausted ? "EXHAUSTED" : "MANUAL_ESCALATION",
      reconciliation_deadline_at: reconciliationDeadlineAt,
      resolution_state: "UNRESOLVED",
      target_mismatch_refs: targetMismatchRefs,
      twin_id: input.twin_id,
      twin_reconciliation_state_id: existing?.twin_reconciliation_state_id,
      workflow_item_refs: effectiveWorkflowRefs,
    });
  } else if (waitingOnly) {
    reconciliationState = buildTwinReconciliationStateRecord({
      auto_attempt_count: autoAttemptCount,
      blocking_mismatch_refs: [],
      generated_at: generatedAt,
      last_attempted_at: existing?.last_attempted_at ?? input.last_attempted_at ?? null,
      lifecycle_state: "WAITING_ON_AUTHORITY",
      max_auto_attempts: maxAutoAttempts,
      next_action_due_at: earliestInstant(
        [addSeconds(generatedAt, profile.authority_wait_seconds), reconciliationDeadlineAt],
        reconciliationDeadlineAt,
      ),
      next_action_owner: "AUTHORITY",
      reason_codes: reasonCodes(targetDeltas),
      recommended_action_code: "AWAIT_AUTHORITY",
      reconciliation_budget_state: "WITHIN_BUDGET",
      reconciliation_deadline_at: reconciliationDeadlineAt,
      resolution_state: "UNRESOLVED",
      target_mismatch_refs: targetMismatchRefs,
      twin_id: input.twin_id,
      twin_reconciliation_state_id: existing?.twin_reconciliation_state_id,
      workflow_item_refs: workflowRefs,
    });
  } else {
    if (budgetExhausted) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "automatic budget is exhausted; reconciliation must be operator-owned before continuation",
      );
    }
    reconciliationState = buildTwinReconciliationStateRecord({
      auto_attempt_count: autoAttemptCount,
      blocking_mismatch_refs: blockingMismatchRefs,
      generated_at: generatedAt,
      last_attempted_at: existing?.last_attempted_at ?? input.last_attempted_at ?? null,
      lifecycle_state: "QUEUED",
      max_auto_attempts: maxAutoAttempts,
      next_action_due_at: generatedAt,
      next_action_owner: "SYSTEM",
      reason_codes: reasonCodes(targetDeltas),
      recommended_action_code: "RUN_MANUAL_RECONCILIATION",
      reconciliation_budget_state: "WITHIN_BUDGET",
      reconciliation_deadline_at: reconciliationDeadlineAt,
      resolution_state: "UNRESOLVED",
      target_mismatch_refs: targetMismatchRefs,
      twin_id: input.twin_id,
      twin_reconciliation_state_id: existing?.twin_reconciliation_state_id,
      workflow_item_refs: workflowRefs,
    });
  }

  const stored = await repository.persistTwinReconciliationState({
    reconciliation_state: reconciliationState,
  });
  return {
    reconciliation_dedupe_key: dedupeKey,
    reconciliation_state: reconciliationState,
    repository,
    stored,
    target_deltas: targetDeltas,
  };
}
