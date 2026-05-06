import { normalizeTimestamp, TwinModelError } from "../models/twin_common.ts";
import {
  buildTwinReconciliationStateRecord,
  type TwinReconciliationResolutionState,
  type TwinReconciliationStateRecord,
} from "../models/twin_reconciliation_state.ts";
import { TwinReconciliationStateRepository } from "../repositories/twin_reconciliation_state_repository.ts";

export type TwinReconciliationTransitionEvent =
  | "worker_started"
  | "awaiting_authority_window"
  | "manual_escalation_required"
  | "authority_response_received"
  | "operator_action_recorded"
  | "resolution_proved"
  | "newer_twin_supersedes";

export type TransitionTwinReconciliationStateInput = {
  current: TwinReconciliationStateRecord;
  event: TwinReconciliationTransitionEvent;
  next_action_due_at?: string | null;
  primary_workflow_item_ref_or_null?: string | null;
  repository?: TwinReconciliationStateRepository;
  resolution_state?: Exclude<TwinReconciliationResolutionState, "NONE" | "UNRESOLVED" | "PARTIALLY_RESOLVED">;
  transitioned_at: string;
  workflow_item_refs?: readonly string[];
};

export type TransitionTwinReconciliationStateResult = {
  reconciliation_state: TwinReconciliationStateRecord;
  repository: TwinReconciliationStateRepository;
  stored: Awaited<ReturnType<TwinReconciliationStateRepository["persistTwinReconciliationState"]>>;
};

const ALLOWED_TRANSITIONS: Record<TwinReconciliationStateRecord["lifecycle_state"], TwinReconciliationTransitionEvent[]> = {
  IN_PROGRESS: [
    "awaiting_authority_window",
    "manual_escalation_required",
    "newer_twin_supersedes",
    "resolution_proved",
  ],
  NOT_REQUIRED: ["worker_started"],
  QUEUED: ["newer_twin_supersedes", "worker_started"],
  RESOLVED: [],
  SUPERSEDED: [],
  WAITING_ON_AUTHORITY: [
    "authority_response_received",
    "manual_escalation_required",
    "newer_twin_supersedes",
  ],
  WAITING_ON_OPERATOR: ["newer_twin_supersedes", "operator_action_recorded"],
};

function ensureAllowed(current: TwinReconciliationStateRecord, event: TwinReconciliationTransitionEvent) {
  if (!ALLOWED_TRANSITIONS[current.lifecycle_state].includes(event)) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      `${current.lifecycle_state} cannot transition with ${event}`,
    );
  }
}

function mergedWorkflowRefs(current: TwinReconciliationStateRecord, extra: readonly string[] | undefined) {
  return [...new Set([...current.workflow_item_refs, ...(extra ?? [])])].sort();
}

export async function transitionTwinReconciliationState(
  input: TransitionTwinReconciliationStateInput,
): Promise<TransitionTwinReconciliationStateResult> {
  ensureAllowed(input.current, input.event);
  const repository = input.repository ?? new TwinReconciliationStateRepository();
  const transitionedAt = normalizeTimestamp("transitioned_at", input.transitioned_at);
  const common = {
    blocking_mismatch_refs: input.current.blocking_mismatch_refs,
    max_auto_attempts: input.current.max_auto_attempts,
    reconciliation_deadline_at: input.current.reconciliation_deadline_at,
    target_mismatch_refs: input.current.target_mismatch_refs,
    twin_id: input.current.twin_id,
    twin_reconciliation_state_id: input.current.twin_reconciliation_state_id,
  };
  const exhausted =
    input.current.reconciliation_budget_state === "EXHAUSTED" ||
    (input.current.max_auto_attempts > 0 &&
      input.current.auto_attempt_count >= input.current.max_auto_attempts);
  let reconciliationState: TwinReconciliationStateRecord;

  switch (input.event) {
    case "worker_started":
      reconciliationState = buildTwinReconciliationStateRecord({
        ...common,
        auto_attempt_count: input.current.auto_attempt_count,
        generated_at: transitionedAt,
        last_attempted_at: input.current.last_attempted_at,
        lifecycle_state: "IN_PROGRESS",
        next_action_due_at: input.next_action_due_at ?? transitionedAt,
        next_action_owner: "SYSTEM",
        reason_codes: input.current.reason_codes,
        recommended_action_code: "RUN_MANUAL_RECONCILIATION",
        reconciliation_budget_state: exhausted ? "EXHAUSTED" : input.current.reconciliation_budget_state,
        resolution_state: input.current.resolution_state,
        workflow_item_refs: input.current.workflow_item_refs,
      });
      break;
    case "awaiting_authority_window": {
      if (exhausted) {
        throw new TwinModelError(
          "TWIN_CONTRACT_INVALID",
          "exhausted automatic budget cannot transition back to WAITING_ON_AUTHORITY",
        );
      }
      const nextAttemptCount = input.current.auto_attempt_count + 1;
      if (nextAttemptCount > input.current.max_auto_attempts) {
        throw new TwinModelError("TWIN_CONTRACT_INVALID", "authority wait would exceed automatic budget");
      }
      reconciliationState = buildTwinReconciliationStateRecord({
        ...common,
        auto_attempt_count: nextAttemptCount,
        generated_at: transitionedAt,
        last_attempted_at: transitionedAt,
        lifecycle_state: "WAITING_ON_AUTHORITY",
        next_action_due_at: input.next_action_due_at ?? input.current.reconciliation_deadline_at,
        next_action_owner: "AUTHORITY",
        reason_codes: input.current.reason_codes,
        recommended_action_code: "AWAIT_AUTHORITY",
        reconciliation_budget_state:
          nextAttemptCount >= input.current.max_auto_attempts && input.current.max_auto_attempts > 0
            ? "EXHAUSTED"
            : "WITHIN_BUDGET",
        resolution_state: "UNRESOLVED",
        workflow_item_refs: input.current.workflow_item_refs,
      });
      break;
    }
    case "manual_escalation_required": {
      const workflowItemRefs = mergedWorkflowRefs(input.current, input.workflow_item_refs);
      const primaryWorkflowRef = input.primary_workflow_item_ref_or_null ?? workflowItemRefs[0] ?? null;
      reconciliationState = buildTwinReconciliationStateRecord({
        ...common,
        auto_attempt_count: input.current.auto_attempt_count,
        generated_at: transitionedAt,
        last_attempted_at: input.current.last_attempted_at,
        lifecycle_state: "WAITING_ON_OPERATOR",
        next_action_due_at: input.next_action_due_at ?? transitionedAt,
        next_action_owner: "OPERATOR",
        primary_workflow_item_ref_or_null: primaryWorkflowRef,
        reason_codes: input.current.reason_codes,
        recommended_action_code: "OPEN_OPERATOR_WORKFLOW",
        reconciliation_budget_state: exhausted ? "EXHAUSTED" : "MANUAL_ESCALATION",
        resolution_state: input.current.resolution_state,
        workflow_item_refs: workflowItemRefs,
      });
      break;
    }
    case "authority_response_received":
    case "operator_action_recorded":
      reconciliationState = buildTwinReconciliationStateRecord({
        ...common,
        auto_attempt_count: input.current.auto_attempt_count,
        generated_at: transitionedAt,
        last_attempted_at: input.current.last_attempted_at,
        lifecycle_state: "IN_PROGRESS",
        next_action_due_at: input.next_action_due_at ?? transitionedAt,
        next_action_owner: "SYSTEM",
        primary_workflow_item_ref_or_null: input.current.primary_workflow_item_ref_or_null,
        reason_codes: input.current.reason_codes,
        recommended_action_code: "RUN_MANUAL_RECONCILIATION",
        reconciliation_budget_state: input.current.reconciliation_budget_state,
        resolution_state: input.current.resolution_state,
        workflow_item_refs: input.current.workflow_item_refs,
      });
      break;
    case "resolution_proved":
      reconciliationState = buildTwinReconciliationStateRecord({
        ...common,
        auto_attempt_count: input.current.auto_attempt_count,
        generated_at: transitionedAt,
        last_attempted_at: input.current.last_attempted_at,
        lifecycle_state: "RESOLVED",
        next_action_owner: "NONE",
        reason_codes: input.current.reason_codes,
        recommended_action_code: "RESOLVED",
        reconciliation_budget_state: input.current.reconciliation_budget_state,
        resolution_state: input.resolution_state ?? "RESOLVED_MATCH",
        resolved_at: transitionedAt,
        workflow_item_refs: input.current.workflow_item_refs,
      });
      break;
    case "newer_twin_supersedes":
      reconciliationState = buildTwinReconciliationStateRecord({
        ...common,
        auto_attempt_count: input.current.auto_attempt_count,
        generated_at: transitionedAt,
        last_attempted_at: input.current.last_attempted_at,
        lifecycle_state: "SUPERSEDED",
        next_action_owner: "NONE",
        reason_codes: input.current.reason_codes,
        recommended_action_code: "SUPERSEDED",
        reconciliation_budget_state: input.current.reconciliation_budget_state,
        resolution_state: input.current.resolution_state,
        resolved_at: input.current.resolved_at,
        workflow_item_refs: input.current.workflow_item_refs,
      });
      break;
  }

  const stored = await repository.persistTwinReconciliationState({
    reconciliation_state: reconciliationState,
  });
  return {
    reconciliation_state: reconciliationState,
    repository,
    stored,
  };
}
