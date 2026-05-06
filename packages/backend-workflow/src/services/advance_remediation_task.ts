import {
  assertRemediationTaskTransition,
  isRemediationTaskTerminalState,
  normalizeRemediationTask,
  type RemediationErrorResolutionEffect,
  type RemediationTask,
  type RemediationTaskClosureOutcome,
  type RemediationTaskState,
  withRemediationTaskLineage,
} from "../models/remediation_task.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { RemediationTaskRepository } from "../repositories/remediation_task_repository.ts";

export type AdvanceRemediationTaskInput = {
  accepted_risk_approval_ref?: string | null | undefined;
  audit_refs: readonly string[];
  closure_evidence_refs?: readonly string[] | undefined;
  closure_outcome?: RemediationTaskClosureOutcome | null | undefined;
  error_resolution_effect?: RemediationErrorResolutionEffect | undefined;
  investigation_ref?: string | null | undefined;
  owner_ref?: string | null | undefined;
  provenance_refs?: readonly string[] | undefined;
  repository: RemediationTaskRepository;
  resolution_basis_ref?: string | null | undefined;
  superseded_by_task_id?: string | null | undefined;
  task_id: string;
  to_state: RemediationTaskState;
  transitioned_at: string;
};

function defaultClosureOutcomeForState(state: RemediationTaskState) {
  if (state === "CANCELLED") {
    return "CANCELLED" as const;
  }
  if (state === "SUPERSEDED") {
    return "SUPERSEDED" as const;
  }
  return null;
}

function defaultEffectForState(state: RemediationTaskState, fallback: RemediationErrorResolutionEffect) {
  if (state === "ASSIGNED") {
    return "ERROR_REMAINS_OPEN" as const;
  }
  if (state === "IN_PROGRESS" || state === "WAITING") {
    return "ERROR_MOVES_TO_IN_PROGRESS" as const;
  }
  if (state === "CANCELLED") {
    return "ERROR_REMAINS_OPEN" as const;
  }
  if (state === "SUPERSEDED") {
    return "ERROR_MOVES_TO_SUPERSEDED" as const;
  }
  return fallback;
}

export async function advanceRemediationTask(
  input: AdvanceRemediationTaskInput,
): Promise<RemediationTask> {
  const stored = await input.repository.getRemediationTaskById(input.task_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "remediation task was not found");
  }
  const current = normalizeRemediationTask(stored.record);
  assertRemediationTaskTransition({
    from_state: current.task_state,
    to_state: input.to_state,
  });

  const terminal = isRemediationTaskTerminalState(input.to_state);
  const startedAt =
    input.to_state === "IN_PROGRESS" || input.to_state === "WAITING" || input.to_state === "COMPLETED"
      ? current.started_at ?? input.transitioned_at
      : null;
  const base: RemediationTask = {
    ...current,
    accepted_risk_approval_ref: terminal
      ? input.accepted_risk_approval_ref ?? current.accepted_risk_approval_ref
      : null,
    closure_evidence_refs: terminal ? [...(input.closure_evidence_refs ?? [])] : [],
    closure_outcome: terminal
      ? input.closure_outcome ?? defaultClosureOutcomeForState(input.to_state)
      : null,
    completed_at: terminal ? input.transitioned_at : null,
    error_resolution_effect: terminal
      ? input.error_resolution_effect ?? defaultEffectForState(input.to_state, current.error_resolution_effect)
      : input.error_resolution_effect ?? defaultEffectForState(input.to_state, current.error_resolution_effect),
    investigation_ref: input.investigation_ref ?? current.investigation_ref,
    owner_ref: input.owner_ref ?? current.owner_ref,
    resolution_basis_ref: terminal ? input.resolution_basis_ref ?? null : null,
    started_at: startedAt,
    superseded_by_task_id: input.to_state === "SUPERSEDED" ? input.superseded_by_task_id ?? null : null,
    task_state: input.to_state,
  };

  const next = withRemediationTaskLineage({
    audit_refs: input.audit_refs,
    provenance_refs: input.provenance_refs,
    task: base,
  });
  const persisted = await input.repository.persistRemediationTask({ task: next });
  return persisted.record;
}
