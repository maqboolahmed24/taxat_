import {
  assertFailureInvestigationTransition,
  normalizeFailureInvestigation,
  type FailureInvestigation,
  type FailureInvestigationOutcome,
  type FailureInvestigationState,
  type ResolvedFailureInvestigationOutcome,
  RESOLVED_FAILURE_INVESTIGATION_OUTCOMES,
  withFailureInvestigationLineage,
} from "../models/failure_investigation.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { FailureInvestigationRepository } from "../repositories/failure_investigation_repository.ts";

export type ResolveFailureInvestigationTerminalState = Extract<
  FailureInvestigationState,
  "RESOLVED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED"
>;

export type ResolveFailureInvestigationInput = {
  accepted_risk_approval_ref?: string | null | undefined;
  audit_refs: readonly string[];
  closure_evidence_refs: readonly string[];
  investigation_id: string;
  outcome?: FailureInvestigationOutcome | undefined;
  provenance_refs?: readonly string[] | undefined;
  remediation_task_refs?: readonly string[] | undefined;
  repository: FailureInvestigationRepository;
  resolution_basis_ref: string;
  resolved_at: string;
  superseded_by_investigation_id?: string | null | undefined;
  to_state: ResolveFailureInvestigationTerminalState;
};

function defaultOutcomeForState(
  state: ResolveFailureInvestigationTerminalState,
  provided: FailureInvestigationOutcome | undefined,
) {
  if (state === "ACCEPTED_RISK") {
    return "ACCEPTED_RISK" as const;
  }
  if (state === "SUPERSEDED") {
    return "SUPERSEDED" as const;
  }
  if (state === "CANCELLED") {
    return "CANCELLED" as const;
  }
  if (
    provided === undefined ||
    !(RESOLVED_FAILURE_INVESTIGATION_OUTCOMES as readonly FailureInvestigationOutcome[]).includes(
      provided,
    )
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "resolved investigations require a resolved investigation outcome",
    );
  }
  return provided as ResolvedFailureInvestigationOutcome;
}

export async function resolveFailureInvestigation(
  input: ResolveFailureInvestigationInput,
): Promise<FailureInvestigation> {
  const stored = await input.repository.getFailureInvestigationById(input.investigation_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "failure investigation was not found");
  }
  const current = normalizeFailureInvestigation(stored.record);
  assertFailureInvestigationTransition({
    from_state: current.investigation_state,
    to_state: input.to_state,
  });

  const next = withFailureInvestigationLineage({
    audit_refs: input.audit_refs,
    investigation: {
      ...current,
      accepted_risk_approval_ref:
        input.to_state === "ACCEPTED_RISK" ? input.accepted_risk_approval_ref ?? null : null,
      closure_evidence_refs: [...input.closure_evidence_refs],
      investigation_state: input.to_state,
      last_activity_at: input.resolved_at,
      outcome: defaultOutcomeForState(input.to_state, input.outcome),
      resolution_basis_ref: input.resolution_basis_ref,
      resolved_at: input.resolved_at,
      superseded_by_investigation_id:
        input.to_state === "SUPERSEDED" ? input.superseded_by_investigation_id ?? null : null,
    },
    provenance_refs: input.provenance_refs,
    remediation_task_refs: input.remediation_task_refs,
  });
  const persisted = await input.repository.persistFailureInvestigation({ investigation: next });
  return persisted.record;
}
