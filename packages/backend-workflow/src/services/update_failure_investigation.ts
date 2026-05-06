import {
  assertFailureInvestigationTransition,
  isFailureInvestigationTerminalState,
  normalizeFailureInvestigation,
  type FailureInvestigation,
  type FailureInvestigationOwnerType,
  type FailureInvestigationPriority,
  type FailureInvestigationState,
  withFailureInvestigationLineage,
} from "../models/failure_investigation.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { FailureInvestigationRepository } from "../repositories/failure_investigation_repository.ts";

export type UpdateFailureInvestigationInput = {
  audit_refs: readonly string[];
  due_at?: string | null | undefined;
  investigation_id: string;
  investigation_steps_ref?: string | undefined;
  last_activity_at: string;
  owner_ref?: string | null | undefined;
  owner_type?: FailureInvestigationOwnerType | undefined;
  priority?: FailureInvestigationPriority | undefined;
  provenance_refs?: readonly string[] | undefined;
  remediation_task_refs?: readonly string[] | undefined;
  repository: FailureInvestigationRepository;
  to_state?: Exclude<
    FailureInvestigationState,
    "RESOLVED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED"
  >;
};

export async function updateFailureInvestigation(
  input: UpdateFailureInvestigationInput,
): Promise<FailureInvestigation> {
  const stored = await input.repository.getFailureInvestigationById(input.investigation_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "failure investigation was not found");
  }
  const current = normalizeFailureInvestigation(stored.record);
  const toState = input.to_state ?? current.investigation_state;

  if (isFailureInvestigationTerminalState(toState)) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "terminal investigation updates must use resolveFailureInvestigation",
    );
  }
  assertFailureInvestigationTransition({
    from_state: current.investigation_state,
    to_state: toState,
  });

  const next = withFailureInvestigationLineage({
    audit_refs: input.audit_refs,
    investigation: {
      ...current,
      due_at: input.due_at === undefined ? current.due_at : input.due_at,
      investigation_state: toState,
      investigation_steps_ref: input.investigation_steps_ref ?? current.investigation_steps_ref,
      last_activity_at: input.last_activity_at,
      owner_ref: input.owner_ref === undefined ? current.owner_ref : input.owner_ref,
      owner_type: input.owner_type ?? current.owner_type,
      priority: input.priority ?? current.priority,
    },
    provenance_refs: input.provenance_refs,
    remediation_task_refs: input.remediation_task_refs,
  });
  const persisted = await input.repository.persistFailureInvestigation({ investigation: next });
  return persisted.record;
}
