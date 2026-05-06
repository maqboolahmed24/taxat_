import {
  acceptedRiskApprovalRef,
  normalizeAcceptedRiskApproval,
  type AcceptedRiskApproval,
} from "../models/accepted_risk_approval.ts";
import {
  compensationRecordRef,
  normalizeCompensationRecord,
  type CompensationRecord,
} from "../models/compensation_record.ts";
import {
  failureInvestigationRef,
  isFailureInvestigationTerminalState,
  normalizeFailureInvestigation,
  type FailureInvestigation,
} from "../models/failure_investigation.ts";
import {
  normalizeFailureStringSet,
  normalizeFailureTimestamp,
  normalizeNullableFailureString,
  requireFailureString,
  type FailureCompanionOwnerType,
} from "../models/failure_companion_common.ts";
import {
  buildFailureLifecycleDashboardRecord,
  type FailureBlockingClass,
  type FailureClosureResolutionState,
  type FailureCustomerStatusProjection,
  type FailureLifecycleDashboard,
  type FailureLifecycleDashboardAcceptedRiskPosture,
  type FailureLifecycleDashboardBlockingScope,
  type FailureLifecycleDashboardClosurePosture,
  type FailureLifecycleDashboardCompensationPosture,
  type FailureLifecycleDashboardCurrentOwner,
  type FailureLifecycleDashboardInvestigationPosture,
  type FailureLifecycleDashboardRemediationSummary,
  type FailureLifecycleDashboardStateSource,
  type FailureLifecycleDashboardWorkflowCoordination,
  type FailureLineageState,
  type FailureWaitingOnActor,
  type FailureWorkflowLifecycleState,
} from "../models/failure_lifecycle_dashboard.ts";
import {
  normalizeRemediationTask,
  remediationTaskRef,
  type RemediationTask,
} from "../models/remediation_task.ts";
import type { FailureLifecycleDashboardRepository } from "../repositories/failure_lifecycle_dashboard_repository.ts";
import {
  buildFailureCurrentOwnerProjection,
  type FailureCurrentOwnerCandidate,
} from "./build_failure_current_owner_projection.ts";
import { buildFailureNextLegalAction } from "./build_failure_next_legal_action.ts";

export type FailureLifecycleErrorSource = {
  affected_object_refs?: readonly string[] | undefined;
  blocking_class?: FailureBlockingClass | undefined;
  closure_evidence_refs?: readonly string[] | undefined;
  last_activity_at: string;
  next_retry_at?: string | null | undefined;
  opened_at: string;
  owner_ref?: string | null | undefined;
  owner_type?: FailureCompanionOwnerType | undefined;
  reason_codes?: readonly string[] | undefined;
  resolution_basis_ref?: string | null | undefined;
  resolution_state?: FailureClosureResolutionState | undefined;
  resolved_at?: string | null | undefined;
  resolved_by_task_id?: string | null | undefined;
};

export type FailureLifecycleWorkflowSource = {
  current_assignee_owner_type?: FailureCompanionOwnerType | null | undefined;
  current_assignee_ref_or_null: string | null;
  customer_status_projection_or_null: FailureCustomerStatusProjection | null;
  due_at_or_null?: string | null | undefined;
  last_activity_at?: string | null | undefined;
  lifecycle_state_or_null: FailureWorkflowLifecycleState;
  waiting_on_actor_or_null: FailureWaitingOnActor;
  workflow_item_ref: string;
};

export type FailureAcceptedRiskAccountableOwner = {
  approval_ref: string;
  owner_ref: string;
  owner_type: Exclude<FailureCompanionOwnerType, "SYSTEM">;
};

export type BuildFailureLifecycleDashboardInput = {
  accepted_risk_accountable_owners?: readonly FailureAcceptedRiskAccountableOwner[] | undefined;
  accepted_risk_approvals?: readonly AcceptedRiskApproval[] | undefined;
  audit_refs: readonly string[];
  compensation_records?: readonly CompensationRecord[] | undefined;
  current_error_ref: string;
  dashboard_id: string;
  investigations?: readonly FailureInvestigation[] | undefined;
  lineage_error_refs_in_order: readonly string[];
  manifest_id: string;
  provenance_refs: readonly string[];
  remediation_tasks?: readonly RemediationTask[] | undefined;
  repository?: FailureLifecycleDashboardRepository | undefined;
  root_error_ref: string;
  root_manifest_id: string;
  source_error: FailureLifecycleErrorSource;
  updated_at: string;
  workflow?: FailureLifecycleWorkflowSource | null | undefined;
};

function latestBy<T>(values: readonly T[], time: (value: T) => string | null) {
  return [...values]
    .sort((left, right) => {
      const leftTime = time(left) ?? "";
      const rightTime = time(right) ?? "";
      return rightTime.localeCompare(leftTime);
    })[0];
}

function maxTimestamp(values: readonly (string | null | undefined)[]) {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => normalizeFailureTimestamp("timestamp", value))
    .sort()
    .at(-1);
}

function normalizeWorkflow(
  workflow: FailureLifecycleWorkflowSource | null | undefined,
): FailureLifecycleWorkflowSource | null {
  if (workflow == null) {
    return null;
  }
  return {
    current_assignee_owner_type: workflow.current_assignee_owner_type ?? null,
    current_assignee_ref_or_null: normalizeNullableFailureString(
      "workflow.current_assignee_ref_or_null",
      workflow.current_assignee_ref_or_null,
    ),
    customer_status_projection_or_null: workflow.customer_status_projection_or_null,
    due_at_or_null: workflow.due_at_or_null ?? null,
    last_activity_at: workflow.last_activity_at ?? null,
    lifecycle_state_or_null: workflow.lifecycle_state_or_null,
    waiting_on_actor_or_null: workflow.waiting_on_actor_or_null,
    workflow_item_ref: requireFailureString("workflow.workflow_item_ref", workflow.workflow_item_ref),
  };
}

function normalizeSourceError(source: FailureLifecycleErrorSource) {
  return {
    affected_object_refs: normalizeFailureStringSet(
      "source_error.affected_object_refs",
      source.affected_object_refs ?? [],
    ),
    blocking_class: source.blocking_class ?? "NON_BLOCKING",
    closure_evidence_refs: normalizeFailureStringSet(
      "source_error.closure_evidence_refs",
      source.closure_evidence_refs ?? [],
    ),
    last_activity_at: normalizeFailureTimestamp(
      "source_error.last_activity_at",
      source.last_activity_at,
    ),
    next_retry_at:
      source.next_retry_at == null
        ? null
        : normalizeFailureTimestamp("source_error.next_retry_at", source.next_retry_at),
    opened_at: normalizeFailureTimestamp("source_error.opened_at", source.opened_at),
    owner_ref: normalizeNullableFailureString("source_error.owner_ref", source.owner_ref ?? null),
    owner_type: source.owner_type ?? "SYSTEM",
    reason_codes: normalizeFailureStringSet("source_error.reason_codes", source.reason_codes ?? []),
    resolution_basis_ref: normalizeNullableFailureString(
      "source_error.resolution_basis_ref",
      source.resolution_basis_ref ?? null,
    ),
    resolution_state: source.resolution_state ?? "OPEN",
    resolved_at:
      source.resolved_at == null
        ? null
        : normalizeFailureTimestamp("source_error.resolved_at", source.resolved_at),
    resolved_by_task_id: normalizeNullableFailureString(
      "source_error.resolved_by_task_id",
      source.resolved_by_task_id ?? null,
    ),
  };
}

function buildRemediationSummary(
  tasks: readonly RemediationTask[],
): FailureLifecycleDashboardRemediationSummary {
  const active = latestBy(
    tasks.filter((task) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING"].includes(task.task_state)),
    (task) => task.started_at ?? task.created_at,
  );
  const latest = latestBy(tasks, (task) => task.completed_at ?? task.started_at ?? task.created_at);
  const selected = active ?? latest;
  return {
    active_task_ref_or_null: active ? remediationTaskRef(active) : null,
    due_at_or_null: selected?.due_at ?? null,
    error_resolution_effect_or_null: selected?.error_resolution_effect ?? null,
    latest_task_ref_or_null: latest ? remediationTaskRef(latest) : null,
    task_owner_ref_or_null: selected?.owner_ref ?? null,
    task_owner_type_or_null: selected?.owner_type ?? null,
    task_state_or_null: selected?.task_state ?? null,
  };
}

function buildCompensationPosture(
  records: readonly CompensationRecord[],
): FailureLifecycleDashboardCompensationPosture {
  const active = latestBy(
    records.filter((record) =>
      ["PLANNED", "IN_PROGRESS", "APPLIED"].includes(record.compensation_status),
    ),
    (record) => record.compensated_at ?? record.created_at,
  );
  const latest = latestBy(records, (record) => record.compensated_at ?? record.created_at);
  const selected = active ?? latest;
  return {
    active_compensation_ref_or_null: active ? compensationRecordRef(active) : null,
    closure_evidence_refs: selected?.closure_evidence_refs ?? [],
    latest_compensation_ref_or_null: latest ? compensationRecordRef(latest) : null,
    resolution_basis_ref_or_null: selected?.resolution_basis_ref ?? null,
    state: selected?.compensation_status ?? "NONE",
    target_object_refs: selected?.target_object_refs ?? [],
    verification_ref_or_null: selected?.verification_ref ?? null,
  };
}

function buildInvestigationPosture(
  investigations: readonly FailureInvestigation[],
): FailureLifecycleDashboardInvestigationPosture {
  const active = latestBy(
    investigations.filter((investigation) =>
      ["OPEN", "EVIDENCE_GATHERING", "AWAITING_EXTERNAL_INPUT", "IN_REVIEW"].includes(
        investigation.investigation_state,
      ),
    ),
    (investigation) => investigation.last_activity_at,
  );
  const latest = latestBy(
    investigations,
    (investigation) => investigation.resolved_at ?? investigation.last_activity_at,
  );
  const selected = active ?? latest;
  let state: FailureLifecycleDashboardInvestigationPosture["state"] = "NONE";
  if (active !== undefined) {
    state = "ACTIVE";
  } else if (selected !== undefined) {
    state = isFailureInvestigationTerminalState(selected.investigation_state)
      ? (selected.investigation_state as FailureLifecycleDashboardInvestigationPosture["state"])
      : "ACTIVE";
  }
  return {
    accepted_risk_approval_ref_or_null: selected?.accepted_risk_approval_ref ?? null,
    active_investigation_ref_or_null: active ? failureInvestigationRef(active) : null,
    latest_investigation_ref_or_null: latest ? failureInvestigationRef(latest) : null,
    outcome_or_null: selected?.outcome ?? null,
    state,
  };
}

function accountableOwnerForApproval(input: {
  approval: AcceptedRiskApproval | undefined;
  owners: readonly FailureAcceptedRiskAccountableOwner[];
}) {
  if (input.approval === undefined) {
    return null;
  }
  const approvalRef = acceptedRiskApprovalRef(input.approval);
  const explicit = input.owners.find((owner) => owner.approval_ref === approvalRef);
  if (explicit !== undefined) {
    return explicit;
  }
  if (input.approval.approver_type !== "SYSTEM_POLICY" && input.approval.approver_ref !== null) {
    return {
      approval_ref: approvalRef,
      owner_ref: input.approval.approver_ref,
      owner_type: input.approval.approver_type,
    } satisfies FailureAcceptedRiskAccountableOwner;
  }
  return null;
}

function buildAcceptedRiskPosture(input: {
  approvals: readonly AcceptedRiskApproval[];
  owners: readonly FailureAcceptedRiskAccountableOwner[];
  updated_at: string;
}): FailureLifecycleDashboardAcceptedRiskPosture {
  const latest = latestBy(
    input.approvals,
    (approval) => approval.revoked_at ?? approval.approved_at,
  );
  if (latest === undefined) {
    return {
      accountable_owner_ref_or_null: null,
      accountable_owner_type_or_null: null,
      approval_ref_or_null: null,
      approver_ref_or_null: null,
      approver_type_or_null: null,
      bounded_scope_refs: [],
      decision_basis_or_null: null,
      expires_at_or_null: null,
      revoked_at_or_null: null,
      state: "NONE",
    };
  }

  const owner = accountableOwnerForApproval({ approval: latest, owners: input.owners });
  const state =
    latest.approval_state === "ACTIVE" && latest.expires_at <= input.updated_at
      ? "EXPIRED"
      : latest.approval_state;
  return {
    accountable_owner_ref_or_null: state === "ACTIVE" ? owner?.owner_ref ?? null : null,
    accountable_owner_type_or_null: state === "ACTIVE" ? owner?.owner_type ?? null : null,
    approval_ref_or_null: acceptedRiskApprovalRef(latest),
    approver_ref_or_null: latest.approver_ref,
    approver_type_or_null: latest.approver_type,
    bounded_scope_refs: latest.bounded_scope_refs,
    decision_basis_or_null: latest.decision_basis,
    expires_at_or_null: latest.expires_at,
    revoked_at_or_null: latest.revoked_at,
    state,
  };
}

function buildWorkflowCoordination(
  workflow: FailureLifecycleWorkflowSource | null,
): FailureLifecycleDashboardWorkflowCoordination {
  if (workflow === null) {
    return {
      current_assignee_ref_or_null: null,
      customer_status_projection_or_null: null,
      lifecycle_state_or_null: null,
      waiting_on_actor_or_null: null,
      workflow_item_ref_or_null: null,
    };
  }
  return {
    current_assignee_ref_or_null: workflow.current_assignee_ref_or_null,
    customer_status_projection_or_null: workflow.customer_status_projection_or_null,
    lifecycle_state_or_null: workflow.lifecycle_state_or_null,
    waiting_on_actor_or_null: workflow.waiting_on_actor_or_null,
    workflow_item_ref_or_null: workflow.workflow_item_ref,
  };
}

function deriveCurrentLineageState(input: {
  acceptedRisk: FailureLifecycleDashboardAcceptedRiskPosture;
  compensation: FailureLifecycleDashboardCompensationPosture;
  investigation: FailureLifecycleDashboardInvestigationPosture;
  remediation: FailureLifecycleDashboardRemediationSummary;
  sourceError: ReturnType<typeof normalizeSourceError>;
  updated_at: string;
}) {
  if (input.acceptedRisk.state === "ACTIVE") {
    return "ACCEPTED_RISK_ACTIVE" as const;
  }
  if (input.investigation.state === "ACTIVE") {
    return "INVESTIGATION_ACTIVE" as const;
  }
  if (["PLANNED", "IN_PROGRESS", "APPLIED"].includes(input.compensation.state)) {
    return "COMPENSATION_ACTIVE" as const;
  }
  if (
    input.remediation.active_task_ref_or_null !== null &&
    input.remediation.task_state_or_null !== null
  ) {
    return "REMEDIATION_ACTIVE" as const;
  }
  if (["RESOLVED", "SUPERSEDED", "CANCELLED"].includes(input.sourceError.resolution_state)) {
    return input.sourceError.resolution_state as Extract<
      FailureLineageState,
      "RESOLVED" | "SUPERSEDED" | "CANCELLED"
    >;
  }
  if (input.sourceError.next_retry_at !== null && input.sourceError.next_retry_at > input.updated_at) {
    return "RETRY_SCHEDULED" as const;
  }
  return "OPEN_FAILURE" as const;
}

function buildCurrentStateSource(input: {
  activeApproval?: AcceptedRiskApproval | undefined;
  activeCompensation?: CompensationRecord | undefined;
  activeInvestigation?: FailureInvestigation | undefined;
  activeRemediation?: RemediationTask | undefined;
  current_error_ref: string;
  state: FailureLineageState;
  sourceError: ReturnType<typeof normalizeSourceError>;
  workflow: FailureLifecycleWorkflowSource | null;
}): FailureLifecycleDashboardStateSource {
  if (input.state === "ACCEPTED_RISK_ACTIVE" && input.activeApproval !== undefined) {
    return {
      source_artifact_type: "ACCEPTED_RISK_APPROVAL",
      source_ref: acceptedRiskApprovalRef(input.activeApproval),
      state_changed_at: input.activeApproval.approved_at,
      state_code: input.activeApproval.approval_state,
    };
  }
  if (input.state === "INVESTIGATION_ACTIVE" && input.activeInvestigation !== undefined) {
    return {
      source_artifact_type: "FAILURE_INVESTIGATION",
      source_ref: failureInvestigationRef(input.activeInvestigation),
      state_changed_at: input.activeInvestigation.last_activity_at,
      state_code: input.activeInvestigation.investigation_state,
    };
  }
  if (input.state === "COMPENSATION_ACTIVE" && input.activeCompensation !== undefined) {
    return {
      source_artifact_type: "COMPENSATION_RECORD",
      source_ref: compensationRecordRef(input.activeCompensation),
      state_changed_at: input.activeCompensation.compensated_at ?? input.activeCompensation.created_at,
      state_code: input.activeCompensation.compensation_status,
    };
  }
  if (input.state === "REMEDIATION_ACTIVE" && input.activeRemediation !== undefined) {
    return {
      source_artifact_type: "REMEDIATION_TASK",
      source_ref: remediationTaskRef(input.activeRemediation),
      state_changed_at: input.activeRemediation.started_at ?? input.activeRemediation.created_at,
      state_code: input.activeRemediation.task_state,
    };
  }
  if (input.state === "OPEN_FAILURE" && input.workflow !== null) {
    return {
      source_artifact_type: "WORKFLOW_ITEM",
      source_ref: input.workflow.workflow_item_ref,
      state_changed_at: input.workflow.last_activity_at ?? input.sourceError.last_activity_at,
      state_code: input.workflow.lifecycle_state_or_null,
    };
  }
  return {
    source_artifact_type: "ERROR_RECORD",
    source_ref: input.current_error_ref,
    state_changed_at: input.sourceError.resolved_at ?? input.sourceError.last_activity_at,
    state_code: input.state === "RETRY_SCHEDULED" ? "RETRY_SCHEDULED" : input.sourceError.resolution_state,
  };
}

function buildClosurePosture(input: {
  acceptedRisk: FailureLifecycleDashboardAcceptedRiskPosture;
  currentState: FailureLineageState;
  latestInvestigation?: FailureInvestigation | undefined;
  remediationTasks: readonly RemediationTask[];
  sourceError: ReturnType<typeof normalizeSourceError>;
}): FailureLifecycleDashboardClosurePosture {
  if (input.currentState === "ACCEPTED_RISK_ACTIVE") {
    const investigation = input.latestInvestigation;
    return {
      closure_evidence_refs: normalizeFailureStringSet("closure_evidence_refs", [
        ...input.sourceError.closure_evidence_refs,
        ...(investigation?.closure_evidence_refs ?? []),
      ]),
      resolution_basis_ref_or_null:
        investigation?.resolution_basis_ref ?? input.sourceError.resolution_basis_ref,
      resolution_state: "ACCEPTED_RISK",
      resolved_at_or_null: investigation?.resolved_at ?? input.sourceError.resolved_at,
      resolved_by_task_id_or_null: input.sourceError.resolved_by_task_id,
    };
  }
  if (["RESOLVED", "SUPERSEDED", "CANCELLED"].includes(input.currentState)) {
    return {
      closure_evidence_refs: input.sourceError.closure_evidence_refs,
      resolution_basis_ref_or_null: input.sourceError.resolution_basis_ref,
      resolution_state: input.currentState as Extract<
        FailureClosureResolutionState,
        "RESOLVED" | "SUPERSEDED" | "CANCELLED"
      >,
      resolved_at_or_null: input.sourceError.resolved_at,
      resolved_by_task_id_or_null: input.sourceError.resolved_by_task_id,
    };
  }
  if (input.currentState === "COMPENSATION_ACTIVE") {
    return {
      closure_evidence_refs: [],
      resolution_basis_ref_or_null: null,
      resolution_state: "MONITORING",
      resolved_at_or_null: null,
      resolved_by_task_id_or_null: null,
    };
  }
  return {
    closure_evidence_refs: [],
    resolution_basis_ref_or_null: null,
    resolution_state:
      input.currentState === "OPEN_FAILURE" || input.currentState === "RETRY_SCHEDULED"
        ? "OPEN"
        : "IN_PROGRESS",
    resolved_at_or_null: null,
    resolved_by_task_id_or_null: null,
  };
}

function activeWorkflowCandidate(
  workflow: FailureLifecycleWorkflowSource | null,
): FailureCurrentOwnerCandidate | null {
  if (
    workflow === null ||
    workflow.current_assignee_ref_or_null === null ||
    workflow.current_assignee_owner_type == null
  ) {
    return null;
  }
  return {
    active: true,
    owner_ref_or_null: workflow.current_assignee_ref_or_null,
    owner_type: workflow.current_assignee_owner_type,
    precedence: 20,
    source_artifact_type: "WORKFLOW_ITEM",
    source_ref: workflow.workflow_item_ref,
  };
}

function buildCurrentOwner(input: {
  activeApproval?: AcceptedRiskApproval | undefined;
  activeCompensation?: CompensationRecord | undefined;
  activeInvestigation?: FailureInvestigation | undefined;
  activeRemediation?: RemediationTask | undefined;
  acceptedRisk: FailureLifecycleDashboardAcceptedRiskPosture;
  current_error_ref: string;
  sourceError: ReturnType<typeof normalizeSourceError>;
  workflow: FailureLifecycleWorkflowSource | null;
}) {
  const candidates: FailureCurrentOwnerCandidate[] = [];
  candidates.push({
    active: true,
    owner_ref_or_null: input.sourceError.owner_ref,
    owner_type: input.sourceError.owner_type,
    precedence: 10,
    source_artifact_type: "ERROR_RECORD",
    source_ref: input.current_error_ref,
  });
  const workflowCandidate = activeWorkflowCandidate(input.workflow);
  if (workflowCandidate !== null) {
    candidates.push(workflowCandidate);
  }
  if (input.activeRemediation !== undefined) {
    candidates.push({
      active: true,
      owner_ref_or_null: input.activeRemediation.owner_ref,
      owner_type: input.activeRemediation.owner_type,
      precedence: 30,
      source_artifact_type: "REMEDIATION_TASK",
      source_ref: remediationTaskRef(input.activeRemediation),
    });
  }
  if (input.activeCompensation !== undefined) {
    candidates.push({
      active: true,
      owner_ref_or_null: input.activeCompensation.owner_ref,
      owner_type: input.activeCompensation.owner_type,
      precedence: 40,
      source_artifact_type: "COMPENSATION_RECORD",
      source_ref: compensationRecordRef(input.activeCompensation),
    });
  }
  if (input.activeInvestigation !== undefined) {
    candidates.push({
      active: true,
      owner_ref_or_null: input.activeInvestigation.owner_ref,
      owner_type: input.activeInvestigation.owner_type,
      precedence: 50,
      source_artifact_type: "FAILURE_INVESTIGATION",
      source_ref: failureInvestigationRef(input.activeInvestigation),
    });
  }
  if (
    input.activeApproval !== undefined &&
    input.acceptedRisk.state === "ACTIVE" &&
    input.acceptedRisk.accountable_owner_type_or_null !== null
  ) {
    candidates.push({
      active: true,
      owner_ref_or_null: input.acceptedRisk.accountable_owner_ref_or_null,
      owner_type: input.acceptedRisk.accountable_owner_type_or_null,
      precedence: 60,
      source_artifact_type: "ACCEPTED_RISK_APPROVAL",
      source_ref: acceptedRiskApprovalRef(input.activeApproval),
    });
  }
  return buildFailureCurrentOwnerProjection({
    candidates,
    fallback_error_ref: input.current_error_ref,
  });
}

function currentOwnerMatchesStateSource(
  owner: FailureLifecycleDashboardCurrentOwner,
  source: FailureLifecycleDashboardStateSource,
) {
  return owner.source_artifact_type === source.source_artifact_type && owner.source_ref === source.source_ref;
}

export async function buildFailureLifecycleDashboard(
  input: BuildFailureLifecycleDashboardInput,
): Promise<FailureLifecycleDashboard> {
  const updatedAt = normalizeFailureTimestamp("updated_at", input.updated_at);
  const sourceError = normalizeSourceError(input.source_error);
  const workflow = normalizeWorkflow(input.workflow);
  const tasks = [...(input.remediation_tasks ?? [])].map(normalizeRemediationTask);
  const compensations = [...(input.compensation_records ?? [])].map(normalizeCompensationRecord);
  const investigations = [...(input.investigations ?? [])].map(normalizeFailureInvestigation);
  const approvals = [...(input.accepted_risk_approvals ?? [])].map(normalizeAcceptedRiskApproval);
  const accountableOwners = [...(input.accepted_risk_accountable_owners ?? [])].map((owner) => ({
    approval_ref: requireFailureString("accepted_risk_accountable_owner.approval_ref", owner.approval_ref),
    owner_ref: requireFailureString("accepted_risk_accountable_owner.owner_ref", owner.owner_ref),
    owner_type: owner.owner_type,
  }));

  const remediationSummary = buildRemediationSummary(tasks);
  const compensationPosture = buildCompensationPosture(compensations);
  const investigationPosture = buildInvestigationPosture(investigations);
  const acceptedRiskPosture = buildAcceptedRiskPosture({
    approvals,
    owners: accountableOwners,
    updated_at: updatedAt,
  });
  const workflowCoordination = buildWorkflowCoordination(workflow);
  const currentLineageState = deriveCurrentLineageState({
    acceptedRisk: acceptedRiskPosture,
    compensation: compensationPosture,
    investigation: investigationPosture,
    remediation: remediationSummary,
    sourceError,
    updated_at: updatedAt,
  });

  const activeRemediation = tasks.find(
    (task) => remediationTaskRef(task) === remediationSummary.active_task_ref_or_null,
  );
  const activeCompensation = compensations.find(
    (record) => compensationRecordRef(record) === compensationPosture.active_compensation_ref_or_null,
  );
  const activeInvestigation = investigations.find(
    (investigation) =>
      failureInvestigationRef(investigation) === investigationPosture.active_investigation_ref_or_null,
  );
  const latestInvestigation = latestBy(
    investigations,
    (investigation) => investigation.resolved_at ?? investigation.last_activity_at,
  );
  const activeApproval = approvals.find(
    (approval) => acceptedRiskApprovalRef(approval) === acceptedRiskPosture.approval_ref_or_null,
  );

  const currentStateSource = buildCurrentStateSource({
    activeApproval,
    activeCompensation,
    activeInvestigation,
    activeRemediation,
    current_error_ref: input.current_error_ref,
    sourceError,
    state: currentLineageState,
    workflow,
  });
  const currentOwner = buildCurrentOwner({
    acceptedRisk: acceptedRiskPosture,
    activeApproval,
    activeCompensation,
    activeInvestigation,
    activeRemediation,
    current_error_ref: input.current_error_ref,
    sourceError,
    workflow,
  });
  const owner =
    currentLineageState === "OPEN_FAILURE" && !currentOwnerMatchesStateSource(currentOwner, currentStateSource)
      ? {
          owner_ref_or_null: null,
          owner_type: "SYSTEM",
          source_artifact_type: currentStateSource.source_artifact_type,
          source_ref: currentStateSource.source_ref,
        } satisfies FailureLifecycleDashboardCurrentOwner
      : currentOwner;

  const closurePosture = buildClosurePosture({
    acceptedRisk: acceptedRiskPosture,
    currentState: currentLineageState,
    latestInvestigation,
    remediationTasks: tasks,
    sourceError,
  });
  const blockingScope: FailureLifecycleDashboardBlockingScope = {
    affected_object_refs: sourceError.affected_object_refs,
    blocking_class: activeRemediation?.blocking_class ?? sourceError.blocking_class,
    reason_codes: sourceError.reason_codes,
    workflow_item_ref_or_null: workflow?.workflow_item_ref ?? null,
  };
  const nextLegalAction = buildFailureNextLegalAction({
    accepted_risk: {
      approval_ref_or_null: acceptedRiskPosture.approval_ref_or_null,
      expires_at_or_null: acceptedRiskPosture.expires_at_or_null,
      state: acceptedRiskPosture.state,
    },
    compensation: {
      active_compensation_ref_or_null: compensationPosture.active_compensation_ref_or_null,
      state: compensationPosture.state,
    },
    current_error_ref: input.current_error_ref,
    current_lineage_state: currentLineageState,
    investigation: {
      active_investigation_ref_or_null: investigationPosture.active_investigation_ref_or_null,
      due_at_or_null: activeInvestigation?.due_at ?? null,
      state: investigationPosture.state,
      waiting_on_external: activeInvestigation?.investigation_state === "AWAITING_EXTERNAL_INPUT",
    },
    remediation: {
      active_task_ref_or_null: remediationSummary.active_task_ref_or_null,
      due_at_or_null: remediationSummary.due_at_or_null,
      owner_type_or_null: remediationSummary.task_owner_type_or_null,
      task_state_or_null: remediationSummary.task_state_or_null,
    },
    retry_due_at_or_null: sourceError.next_retry_at,
    workflow: {
      due_at_or_null: workflow?.due_at_or_null ?? null,
      waiting_on_actor_or_null: workflowCoordination.waiting_on_actor_or_null,
      workflow_item_ref_or_null: workflowCoordination.workflow_item_ref_or_null,
    },
  });

  const lastActivityAt =
    maxTimestamp([
      sourceError.last_activity_at,
      workflow?.last_activity_at,
      ...tasks.map((task) => task.completed_at ?? task.started_at ?? task.created_at),
      ...compensations.map((record) => record.compensated_at ?? record.created_at),
      ...investigations.map((investigation) => investigation.resolved_at ?? investigation.last_activity_at),
      ...approvals.map((approval) => approval.revoked_at ?? approval.approved_at),
    ]) ?? sourceError.last_activity_at;

  const dashboard = buildFailureLifecycleDashboardRecord({
    accepted_risk_posture: acceptedRiskPosture,
    audit_refs: input.audit_refs,
    blocking_scope: blockingScope,
    closure_posture: closurePosture,
    compensation_posture: compensationPosture,
    current_error_ref: input.current_error_ref,
    current_lineage_state: currentLineageState,
    current_owner: owner,
    current_state_source: currentStateSource,
    dashboard_id: input.dashboard_id,
    first_opened_at: sourceError.opened_at,
    investigation_posture: investigationPosture,
    last_activity_at: lastActivityAt,
    lineage_error_refs_in_order: [...input.lineage_error_refs_in_order],
    lineage_refs: {
      accepted_risk_approval_refs: approvals.map(acceptedRiskApprovalRef),
      audit_refs: [...input.audit_refs, ...tasks.flatMap((task) => task.audit_refs), ...compensations.flatMap((record) => record.audit_refs), ...investigations.flatMap((investigation) => investigation.audit_refs), ...approvals.flatMap((approval) => approval.audit_refs)],
      compensation_record_refs: compensations.map(compensationRecordRef),
      failure_investigation_refs: investigations.map(failureInvestigationRef),
      provenance_refs: [...input.provenance_refs, ...tasks.flatMap((task) => task.provenance_refs), ...compensations.flatMap((record) => record.provenance_refs), ...investigations.flatMap((investigation) => investigation.provenance_refs), ...approvals.flatMap((approval) => approval.provenance_refs)],
      remediation_task_refs: tasks.map(remediationTaskRef),
      workflow_item_refs: workflow === null ? [] : [workflow.workflow_item_ref],
    },
    manifest_id: input.manifest_id,
    next_legal_action: nextLegalAction,
    provenance_refs: input.provenance_refs,
    remediation_summary: remediationSummary,
    root_error_ref: input.root_error_ref,
    root_manifest_id: input.root_manifest_id,
    updated_at: updatedAt,
    workflow_coordination: workflowCoordination,
  });

  if (input.repository !== undefined) {
    const stored = await input.repository.persistFailureLifecycleDashboard({ dashboard });
    return stored.record;
  }
  return dashboard;
}
