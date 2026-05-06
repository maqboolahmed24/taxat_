import {
  assertFailureEnum,
  assertNoSelfReference,
  assertNotBefore,
  assertNullableFailureEnum,
  assertOwnerReference,
  assertRetentionLinkage,
  appendFailureRefs,
  cloneFailureCompanionRecord,
  failureCompanionContentFingerprint,
  failureCompanionError,
  normalizeFailureResolutionContract,
  normalizeFailureStringSet,
  normalizeFailureTimestamp,
  normalizeNullableFailureString,
  normalizeNullableFailureTimestamp,
  requireFailureString,
  type FailureCompanionOwnerType,
  type FailureResolutionContract,
  type FailureRetentionClass,
} from "./failure_companion_common.ts";

export type RemediationTaskType =
  | "FIX_DATA"
  | "RESOLVE_CONFLICT"
  | "REVIEW_PARITY"
  | "APPROVE_OVERRIDE"
  | "RELINK_AUTHORITY"
  | "RETRY_AUTHORITY_OPERATION"
  | "RECONCILE_SUBMISSION_STATE"
  | "REQUEST_SUPPORTING_EVIDENCE"
  | "CHECK_RETENTION_HOLD"
  | "REPLAY_RUN"
  | "ESCALATE_SECURITY_ISSUE"
  | "OPEN_FAILURE_INVESTIGATION";

export type RemediationTaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
export type RemediationTaskState =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING"
  | "COMPLETED"
  | "CANCELLED"
  | "SUPERSEDED";
export type RemediationTaskBlockingClass =
  | "NON_BLOCKING"
  | "BLOCKS_AUTOMATION"
  | "BLOCKS_REVIEW_PROGRESS"
  | "BLOCKS_FILING"
  | "BLOCKS_AMENDMENT"
  | "BLOCKS_ERASURE"
  | "BLOCKS_RUN"
  | "BLOCKS_AUTHORITY_CALL";
export type RemediationTaskClosureOutcome =
  | "FIX_APPLIED"
  | "CONFLICT_RESOLVED"
  | "PARITY_REVIEW_COMPLETED"
  | "OVERRIDE_APPROVED"
  | "AUTHORITY_RELINKED"
  | "AUTHORITY_RETRIED"
  | "SUBMISSION_RECONCILED"
  | "EVIDENCE_REQUESTED"
  | "HOLD_CONFIRMED"
  | "RUN_REPLAYED"
  | "SECURITY_ESCALATED"
  | "INVESTIGATION_OPENED"
  | "ACCEPTED_RISK"
  | "CANCELLED"
  | "SUPERSEDED";
export type RemediationErrorResolutionEffect =
  | "ERROR_REMAINS_OPEN"
  | "ERROR_MOVES_TO_IN_PROGRESS"
  | "ERROR_MOVES_TO_MONITORING"
  | "ERROR_MOVES_TO_RESOLVED"
  | "ERROR_MOVES_TO_ACCEPTED_RISK"
  | "ERROR_MOVES_TO_SUPERSEDED"
  | "ERROR_MOVES_TO_CANCELLED";

export type RemediationTask = {
  accepted_risk_approval_ref: string | null;
  artifact_retention_ref: string | null;
  audit_refs: string[];
  blocking_class: RemediationTaskBlockingClass;
  closure_evidence_refs: string[];
  closure_outcome: RemediationTaskClosureOutcome | null;
  completed_at: string | null;
  created_at: string;
  due_at: string | null;
  error_id: string;
  error_resolution_effect: RemediationErrorResolutionEffect;
  failure_resolution_contract: FailureResolutionContract;
  investigation_ref: string | null;
  manifest_id: string;
  owner_ref: string | null;
  owner_type: FailureCompanionOwnerType;
  priority: RemediationTaskPriority;
  provenance_refs: string[];
  remediation_steps_ref: string;
  resolution_basis_ref: string | null;
  retention_class: FailureRetentionClass | null;
  root_manifest_id: string;
  started_at: string | null;
  superseded_by_task_id: string | null;
  task_id: string;
  task_state: RemediationTaskState;
  task_type: RemediationTaskType;
  workflow_item_id: string | null;
};

export type RemediationTaskInput = Partial<RemediationTask> & {
  audit_refs: readonly string[];
  created_at: string;
  error_id: string;
  failure_resolution_contract: FailureResolutionContract;
  manifest_id: string;
  owner_type: FailureCompanionOwnerType;
  provenance_refs: readonly string[];
  remediation_steps_ref: string;
  root_manifest_id: string;
  task_id: string;
  task_type: RemediationTaskType;
};

export const REMEDIATION_TASK_TYPES = [
  "FIX_DATA",
  "RESOLVE_CONFLICT",
  "REVIEW_PARITY",
  "APPROVE_OVERRIDE",
  "RELINK_AUTHORITY",
  "RETRY_AUTHORITY_OPERATION",
  "RECONCILE_SUBMISSION_STATE",
  "REQUEST_SUPPORTING_EVIDENCE",
  "CHECK_RETENTION_HOLD",
  "REPLAY_RUN",
  "ESCALATE_SECURITY_ISSUE",
  "OPEN_FAILURE_INVESTIGATION",
] as const satisfies readonly RemediationTaskType[];
export const REMEDIATION_TASK_STATES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly RemediationTaskState[];
export const REMEDIATION_TASK_TERMINAL_STATES = [
  "COMPLETED",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly RemediationTaskState[];

const OWNER_TYPES = [
  "SYSTEM",
  "SERVICE_OPERATOR",
  "REVIEWER",
  "APPROVER",
  "CLIENT",
  "TENANT_ADMIN",
  "SECURITY_OPERATOR",
] as const satisfies readonly FailureCompanionOwnerType[];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"] as const;
const BLOCKING_CLASSES = [
  "NON_BLOCKING",
  "BLOCKS_AUTOMATION",
  "BLOCKS_REVIEW_PROGRESS",
  "BLOCKS_FILING",
  "BLOCKS_AMENDMENT",
  "BLOCKS_ERASURE",
  "BLOCKS_RUN",
  "BLOCKS_AUTHORITY_CALL",
] as const satisfies readonly RemediationTaskBlockingClass[];
const CLOSURE_OUTCOMES = [
  "FIX_APPLIED",
  "CONFLICT_RESOLVED",
  "PARITY_REVIEW_COMPLETED",
  "OVERRIDE_APPROVED",
  "AUTHORITY_RELINKED",
  "AUTHORITY_RETRIED",
  "SUBMISSION_RECONCILED",
  "EVIDENCE_REQUESTED",
  "HOLD_CONFIRMED",
  "RUN_REPLAYED",
  "SECURITY_ESCALATED",
  "INVESTIGATION_OPENED",
  "ACCEPTED_RISK",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly RemediationTaskClosureOutcome[];
const ERROR_RESOLUTION_EFFECTS = [
  "ERROR_REMAINS_OPEN",
  "ERROR_MOVES_TO_IN_PROGRESS",
  "ERROR_MOVES_TO_MONITORING",
  "ERROR_MOVES_TO_RESOLVED",
  "ERROR_MOVES_TO_ACCEPTED_RISK",
  "ERROR_MOVES_TO_SUPERSEDED",
  "ERROR_MOVES_TO_CANCELLED",
] as const satisfies readonly RemediationErrorResolutionEffect[];
const COMPLETED_EFFECTS = [
  "ERROR_REMAINS_OPEN",
  "ERROR_MOVES_TO_IN_PROGRESS",
  "ERROR_MOVES_TO_MONITORING",
  "ERROR_MOVES_TO_RESOLVED",
  "ERROR_MOVES_TO_ACCEPTED_RISK",
] as const satisfies readonly RemediationErrorResolutionEffect[];
const CANCELLED_EFFECTS = [
  "ERROR_REMAINS_OPEN",
  "ERROR_MOVES_TO_CANCELLED",
] as const satisfies readonly RemediationErrorResolutionEffect[];
const SUPERSEDED_EFFECTS = [
  "ERROR_REMAINS_OPEN",
  "ERROR_MOVES_TO_SUPERSEDED",
] as const satisfies readonly RemediationErrorResolutionEffect[];

export const REMEDIATION_TASK_TRANSITIONS = {
  ASSIGNED: ["IN_PROGRESS", "WAITING", "CANCELLED", "SUPERSEDED"],
  CANCELLED: [],
  COMPLETED: [],
  IN_PROGRESS: ["WAITING", "COMPLETED", "CANCELLED", "SUPERSEDED"],
  OPEN: ["ASSIGNED", "IN_PROGRESS", "CANCELLED", "SUPERSEDED"],
  SUPERSEDED: [],
  WAITING: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "SUPERSEDED"],
} as const satisfies Record<RemediationTaskState, readonly RemediationTaskState[]>;

export function remediationTaskRef(task: Pick<RemediationTask, "task_id">) {
  return `remediation-task://${task.task_id}`;
}

export function isRemediationTaskTerminalState(state: RemediationTaskState) {
  return REMEDIATION_TASK_TERMINAL_STATES.includes(
    state as (typeof REMEDIATION_TASK_TERMINAL_STATES)[number],
  );
}

export function assertRemediationTaskTransition(input: {
  from_state: RemediationTaskState;
  to_state: RemediationTaskState;
}) {
  if (input.from_state === input.to_state) {
    return input.to_state;
  }
  if (
    !(REMEDIATION_TASK_TRANSITIONS[input.from_state] as readonly RemediationTaskState[]).includes(
      input.to_state,
    )
  ) {
    failureCompanionError(
      `illegal RemediationTask transition ${input.from_state} -> ${input.to_state}`,
    );
  }
  return input.to_state;
}

function assertEmptyClosureFields(task: RemediationTask, stateLabel: string) {
  if (task.completed_at !== null) {
    failureCompanionError(`${stateLabel} remediation tasks must keep completed_at null`);
  }
  if (task.closure_outcome !== null) {
    failureCompanionError(`${stateLabel} remediation tasks must keep closure_outcome null`);
  }
  if (task.resolution_basis_ref !== null) {
    failureCompanionError(`${stateLabel} remediation tasks must keep resolution_basis_ref null`);
  }
  if (task.closure_evidence_refs.length > 0) {
    failureCompanionError(`${stateLabel} remediation tasks must keep closure_evidence_refs empty`);
  }
  if (task.accepted_risk_approval_ref !== null) {
    failureCompanionError(`${stateLabel} remediation tasks must keep accepted_risk_approval_ref null`);
  }
}

function assertClosedRemediationTask(task: RemediationTask) {
  if (task.completed_at === null) {
    failureCompanionError("closed remediation tasks require completed_at");
  }
  if (task.resolution_basis_ref === null) {
    failureCompanionError("closed remediation tasks require resolution_basis_ref");
  }
  if (task.closure_evidence_refs.length === 0) {
    failureCompanionError("closed remediation tasks require closure_evidence_refs");
  }
  if (task.audit_refs.length === 0) {
    failureCompanionError("closed remediation tasks require audit_refs");
  }
}

function assertRemediationTaskStateContract(task: RemediationTask) {
  switch (task.task_state) {
    case "OPEN":
    case "ASSIGNED":
      if (task.started_at !== null) {
        failureCompanionError("open or assigned remediation tasks must keep started_at null");
      }
      assertEmptyClosureFields(task, "open or assigned");
      if (task.error_resolution_effect !== "ERROR_REMAINS_OPEN") {
        failureCompanionError(
          "open or assigned remediation tasks must keep error_resolution_effect=ERROR_REMAINS_OPEN",
        );
      }
      break;
    case "IN_PROGRESS":
    case "WAITING":
      if (task.started_at === null) {
        failureCompanionError("in-progress or waiting remediation tasks require started_at");
      }
      assertEmptyClosureFields(task, "in-progress or waiting");
      if (!["ERROR_REMAINS_OPEN", "ERROR_MOVES_TO_IN_PROGRESS"].includes(task.error_resolution_effect)) {
        failureCompanionError(
          "in-progress or waiting remediation tasks must keep an open or in-progress error effect",
        );
      }
      break;
    case "COMPLETED":
      if (task.started_at === null) {
        failureCompanionError("completed remediation tasks require started_at");
      }
      assertClosedRemediationTask(task);
      if (task.closure_outcome === null || ["CANCELLED", "SUPERSEDED"].includes(task.closure_outcome)) {
        failureCompanionError("completed remediation tasks require a non-cancelled closure_outcome");
      }
      if (
        !(COMPLETED_EFFECTS as readonly RemediationErrorResolutionEffect[]).includes(
          task.error_resolution_effect,
        )
      ) {
        failureCompanionError("completed remediation tasks carry an unlawful error_resolution_effect");
      }
      if (task.superseded_by_task_id !== null) {
        failureCompanionError("completed remediation tasks must not carry superseded_by_task_id");
      }
      break;
    case "CANCELLED":
      assertClosedRemediationTask(task);
      if (task.closure_outcome !== "CANCELLED") {
        failureCompanionError("cancelled remediation tasks require closure_outcome=CANCELLED");
      }
      if (
        !(CANCELLED_EFFECTS as readonly RemediationErrorResolutionEffect[]).includes(
          task.error_resolution_effect,
        )
      ) {
        failureCompanionError("cancelled remediation tasks carry an unlawful error_resolution_effect");
      }
      if (task.accepted_risk_approval_ref !== null || task.superseded_by_task_id !== null) {
        failureCompanionError("cancelled remediation tasks must clear accepted-risk and supersession refs");
      }
      break;
    case "SUPERSEDED":
      assertClosedRemediationTask(task);
      if (task.closure_outcome !== "SUPERSEDED") {
        failureCompanionError("superseded remediation tasks require closure_outcome=SUPERSEDED");
      }
      if (
        !(SUPERSEDED_EFFECTS as readonly RemediationErrorResolutionEffect[]).includes(
          task.error_resolution_effect,
        )
      ) {
        failureCompanionError("superseded remediation tasks carry an unlawful error_resolution_effect");
      }
      if (task.superseded_by_task_id === null) {
        failureCompanionError("superseded remediation tasks require superseded_by_task_id");
      }
      if (task.accepted_risk_approval_ref !== null) {
        failureCompanionError("superseded remediation tasks must clear accepted_risk_approval_ref");
      }
      break;
  }

  if (task.accepted_risk_approval_ref !== null) {
    if (
      task.task_state !== "COMPLETED" ||
      task.closure_outcome !== "ACCEPTED_RISK" ||
      task.error_resolution_effect !== "ERROR_MOVES_TO_ACCEPTED_RISK"
    ) {
      failureCompanionError(
        "accepted-risk remediation closure requires completed state, accepted-risk outcome, and accepted-risk error effect",
      );
    }
  }
  if (task.closure_outcome === "ACCEPTED_RISK" && task.accepted_risk_approval_ref === null) {
    failureCompanionError("accepted-risk remediation closure requires accepted_risk_approval_ref");
  }
  if (task.closure_outcome === "INVESTIGATION_OPENED" && task.investigation_ref === null) {
    failureCompanionError("investigation-opened remediation closure requires investigation_ref");
  }
  if (task.superseded_by_task_id !== null && task.task_state !== "SUPERSEDED") {
    failureCompanionError("superseded_by_task_id is lawful only on superseded remediation tasks");
  }
}

function assertRetentionHoldTaskContract(task: RemediationTask) {
  if (task.task_type !== "CHECK_RETENTION_HOLD") {
    return;
  }
  if (task.blocking_class !== "BLOCKS_ERASURE") {
    failureCompanionError("CHECK_RETENTION_HOLD remediation tasks must force BLOCKS_ERASURE");
  }
  if (task.retention_class === null || task.artifact_retention_ref === null) {
    failureCompanionError("CHECK_RETENTION_HOLD remediation tasks require retention linkage");
  }
  if (task.workflow_item_id === null) {
    failureCompanionError("CHECK_RETENTION_HOLD remediation tasks require workflow_item_id");
  }
}

export function buildRemediationTask(input: RemediationTaskInput): RemediationTask {
  return normalizeRemediationTask({
    accepted_risk_approval_ref: input.accepted_risk_approval_ref ?? null,
    artifact_retention_ref: input.artifact_retention_ref ?? null,
    audit_refs: [...input.audit_refs],
    blocking_class: input.blocking_class ?? "NON_BLOCKING",
    closure_evidence_refs: [...(input.closure_evidence_refs ?? [])],
    closure_outcome: input.closure_outcome ?? null,
    completed_at: input.completed_at ?? null,
    created_at: input.created_at,
    due_at: input.due_at ?? null,
    error_id: input.error_id,
    error_resolution_effect: input.error_resolution_effect ?? "ERROR_REMAINS_OPEN",
    failure_resolution_contract: input.failure_resolution_contract,
    investigation_ref: input.investigation_ref ?? null,
    manifest_id: input.manifest_id,
    owner_ref: input.owner_ref ?? null,
    owner_type: input.owner_type,
    priority: input.priority ?? "NORMAL",
    provenance_refs: [...input.provenance_refs],
    remediation_steps_ref: input.remediation_steps_ref,
    resolution_basis_ref: input.resolution_basis_ref ?? null,
    retention_class: input.retention_class ?? null,
    root_manifest_id: input.root_manifest_id,
    started_at: input.started_at ?? null,
    superseded_by_task_id: input.superseded_by_task_id ?? null,
    task_id: input.task_id,
    task_state: input.task_state ?? "OPEN",
    task_type: input.task_type,
    workflow_item_id: input.workflow_item_id ?? null,
  });
}

export function normalizeRemediationTask(input: RemediationTask): RemediationTask {
  const task: RemediationTask = {
    accepted_risk_approval_ref: normalizeNullableFailureString(
      "accepted_risk_approval_ref",
      input.accepted_risk_approval_ref,
    ),
    artifact_retention_ref: normalizeNullableFailureString(
      "artifact_retention_ref",
      input.artifact_retention_ref,
    ),
    audit_refs: normalizeFailureStringSet("audit_refs", input.audit_refs, { minItems: 1 }),
    blocking_class: assertFailureEnum("blocking_class", input.blocking_class, BLOCKING_CLASSES),
    closure_evidence_refs: normalizeFailureStringSet(
      "closure_evidence_refs",
      input.closure_evidence_refs,
    ),
    closure_outcome: assertNullableFailureEnum(
      "closure_outcome",
      input.closure_outcome,
      CLOSURE_OUTCOMES,
    ),
    completed_at: normalizeNullableFailureTimestamp("completed_at", input.completed_at),
    created_at: normalizeFailureTimestamp("created_at", input.created_at),
    due_at: normalizeNullableFailureTimestamp("due_at", input.due_at),
    error_id: requireFailureString("error_id", input.error_id),
    error_resolution_effect: assertFailureEnum(
      "error_resolution_effect",
      input.error_resolution_effect,
      ERROR_RESOLUTION_EFFECTS,
    ),
    failure_resolution_contract: normalizeFailureResolutionContract(
      input.failure_resolution_contract,
      "REMEDIATION_TASK",
    ),
    investigation_ref: normalizeNullableFailureString("investigation_ref", input.investigation_ref),
    manifest_id: requireFailureString("manifest_id", input.manifest_id),
    owner_ref: normalizeNullableFailureString("owner_ref", input.owner_ref),
    owner_type: assertFailureEnum("owner_type", input.owner_type, OWNER_TYPES),
    priority: assertFailureEnum("priority", input.priority, PRIORITIES),
    provenance_refs: normalizeFailureStringSet("provenance_refs", input.provenance_refs, {
      minItems: 1,
    }),
    remediation_steps_ref: requireFailureString(
      "remediation_steps_ref",
      input.remediation_steps_ref,
    ),
    resolution_basis_ref: normalizeNullableFailureString(
      "resolution_basis_ref",
      input.resolution_basis_ref,
    ),
    retention_class: assertNullableFailureEnum(
      "retention_class",
      input.retention_class,
      [
        "regulated_record",
        "derived_artifact",
        "operational_log",
        "analytics_projection",
        "policy_governed_other",
      ] as const,
    ),
    root_manifest_id: requireFailureString("root_manifest_id", input.root_manifest_id),
    started_at: normalizeNullableFailureTimestamp("started_at", input.started_at),
    superseded_by_task_id: normalizeNullableFailureString(
      "superseded_by_task_id",
      input.superseded_by_task_id,
    ),
    task_id: requireFailureString("task_id", input.task_id),
    task_state: assertFailureEnum("task_state", input.task_state, REMEDIATION_TASK_STATES),
    task_type: assertFailureEnum("task_type", input.task_type, REMEDIATION_TASK_TYPES),
    workflow_item_id: normalizeNullableFailureString("workflow_item_id", input.workflow_item_id),
  };

  assertOwnerReference({
    label: "RemediationTask",
    owner_ref: task.owner_ref,
    owner_type: task.owner_type,
  });
  assertRetentionLinkage({
    artifact_retention_ref: task.artifact_retention_ref,
    label: "RemediationTask",
    retention_class: task.retention_class,
  });
  assertNoSelfReference({
    id: task.task_id,
    id_label: "task_id",
    reference: task.superseded_by_task_id,
    reference_label: "superseded_by_task_id",
  });
  assertNotBefore({
    earlier_label: "created_at",
    earlier_value: task.created_at,
    later_label: "due_at",
    later_value: task.due_at,
  });
  assertNotBefore({
    earlier_label: "created_at",
    earlier_value: task.created_at,
    later_label: "started_at",
    later_value: task.started_at,
  });
  assertNotBefore({
    earlier_label: "created_at",
    earlier_value: task.created_at,
    later_label: "completed_at",
    later_value: task.completed_at,
  });
  assertNotBefore({
    earlier_label: "started_at",
    earlier_value: task.started_at,
    later_label: "completed_at",
    later_value: task.completed_at,
  });
  assertRemediationTaskStateContract(task);
  assertRetentionHoldTaskContract(task);
  return task;
}

export function cloneRemediationTask(task: RemediationTask) {
  return cloneFailureCompanionRecord(task);
}

export function remediationTaskContentFingerprint(task: RemediationTask) {
  return failureCompanionContentFingerprint(normalizeRemediationTask(task));
}

export function withRemediationTaskLineage(input: {
  audit_refs?: readonly string[];
  provenance_refs?: readonly string[];
  task: RemediationTask;
}) {
  return normalizeRemediationTask({
    ...input.task,
    audit_refs: appendFailureRefs(input.task.audit_refs, input.audit_refs, "audit_refs", {
      minItems: 1,
    }),
    provenance_refs: appendFailureRefs(
      input.task.provenance_refs,
      input.provenance_refs,
      "provenance_refs",
      { minItems: 1 },
    ),
  });
}
