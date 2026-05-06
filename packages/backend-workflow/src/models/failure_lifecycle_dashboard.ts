import {
  assertFailureEnum,
  assertNotBefore,
  assertOwnerReference,
  cloneFailureCompanionRecord,
  failureCompanionContentFingerprint,
  failureCompanionError,
  normalizeFailureStringSet,
  normalizeFailureTimestamp,
  normalizeNullableFailureString,
  normalizeNullableFailureTimestamp,
  requireFailureString,
  type FailureCompanionOwnerType,
} from "./failure_companion_common.ts";

export type FailureLifecycleDashboardSourceArtifactType =
  | "ERROR_RECORD"
  | "REMEDIATION_TASK"
  | "COMPENSATION_RECORD"
  | "FAILURE_INVESTIGATION"
  | "ACCEPTED_RISK_APPROVAL"
  | "WORKFLOW_ITEM";
export type FailureLifecycleDashboardOwnerType = FailureCompanionOwnerType;
export type FailureLineageState =
  | "OPEN_FAILURE"
  | "RETRY_SCHEDULED"
  | "REMEDIATION_ACTIVE"
  | "INVESTIGATION_ACTIVE"
  | "COMPENSATION_ACTIVE"
  | "ACCEPTED_RISK_ACTIVE"
  | "RESOLVED"
  | "SUPERSEDED"
  | "CANCELLED";
export type FailureNextLegalActionState =
  | "ACTION_AVAILABLE"
  | "WAITING_ON_EXTERNAL"
  | "WAITING_ON_SCHEDULE"
  | "REVIEW_DUE"
  | "NO_FURTHER_ACTION";
export type FailureWaitingOnActor = "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM";
export type FailureBlockingClass =
  | "NON_BLOCKING"
  | "BLOCKS_AUTOMATION"
  | "BLOCKS_REVIEW_PROGRESS"
  | "BLOCKS_FILING"
  | "BLOCKS_AMENDMENT"
  | "BLOCKS_ERASURE"
  | "BLOCKS_RUN"
  | "BLOCKS_AUTHORITY_CALL";
export type FailureRemediationTaskState =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING"
  | "COMPLETED"
  | "CANCELLED"
  | "SUPERSEDED";
export type FailureErrorResolutionEffect =
  | "ERROR_REMAINS_OPEN"
  | "ERROR_MOVES_TO_IN_PROGRESS"
  | "ERROR_MOVES_TO_MONITORING"
  | "ERROR_MOVES_TO_RESOLVED"
  | "ERROR_MOVES_TO_ACCEPTED_RISK"
  | "ERROR_MOVES_TO_SUPERSEDED"
  | "ERROR_MOVES_TO_CANCELLED";
export type FailureCompensationPostureState =
  | "NONE"
  | "PLANNED"
  | "IN_PROGRESS"
  | "APPLIED"
  | "VERIFIED"
  | "FAILED"
  | "CANCELLED"
  | "SUPERSEDED";
export type FailureInvestigationPostureState =
  | "NONE"
  | "ACTIVE"
  | "RESOLVED"
  | "ACCEPTED_RISK"
  | "SUPERSEDED"
  | "CANCELLED";
export type FailureInvestigationPostureOutcome =
  | "ROOT_CAUSE_CONFIRMED"
  | "FALSE_POSITIVE"
  | "RETRY_AUTHORIZED"
  | "RECONCILIATION_REQUIRED"
  | "REMEDIATION_SPAWNED"
  | "ACCEPTED_RISK"
  | "SUPERSEDED"
  | "CANCELLED";
export type FailureAcceptedRiskPostureState =
  | "NONE"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "SUPERSEDED";
export type FailureAcceptedRiskDecisionBasis = "EXPLICIT_APPROVAL" | "POLICY_BASIS";
export type FailureAcceptedRiskApproverType =
  | "APPROVER"
  | "TENANT_ADMIN"
  | "SECURITY_OPERATOR"
  | "SYSTEM_POLICY";
export type FailureWorkflowLifecycleState =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CLIENT"
  | "WAITING_ON_AUTHORITY"
  | "BLOCKED"
  | "DONE"
  | "CANCELLED"
  | "STALE";
export type FailureCustomerStatusProjection =
  | "UNDER_REVIEW"
  | "ACTION_REQUIRED"
  | "WAITING_ON_CONFIRMATION"
  | "RESOLVED"
  | "CLOSED";
export type FailureClosureResolutionState =
  | "OPEN"
  | "IN_PROGRESS"
  | "MONITORING"
  | "RESOLVED"
  | "ACCEPTED_RISK"
  | "SUPERSEDED"
  | "CANCELLED";

export type FailureLifecycleDashboardStateSource = {
  source_artifact_type: FailureLifecycleDashboardSourceArtifactType;
  source_ref: string;
  state_changed_at: string;
  state_code: string;
};

export type FailureLifecycleDashboardCurrentOwner = {
  owner_ref_or_null: string | null;
  owner_type: FailureLifecycleDashboardOwnerType;
  source_artifact_type: FailureLifecycleDashboardSourceArtifactType;
  source_ref: string;
};

export type FailureLifecycleDashboardNextLegalAction = {
  action_code_or_null: string | null;
  action_ref_or_null: string | null;
  action_state: FailureNextLegalActionState;
  due_at_or_null: string | null;
  reason_codes: string[];
  source_artifact_type_or_null: FailureLifecycleDashboardSourceArtifactType | null;
  waiting_on_actor_or_null: FailureWaitingOnActor | null;
};

export type FailureLifecycleDashboardBlockingScope = {
  affected_object_refs: string[];
  blocking_class: FailureBlockingClass;
  reason_codes: string[];
  workflow_item_ref_or_null: string | null;
};

export type FailureLifecycleDashboardRemediationSummary = {
  active_task_ref_or_null: string | null;
  due_at_or_null: string | null;
  error_resolution_effect_or_null: FailureErrorResolutionEffect | null;
  latest_task_ref_or_null: string | null;
  task_owner_ref_or_null: string | null;
  task_owner_type_or_null: FailureLifecycleDashboardOwnerType | null;
  task_state_or_null: FailureRemediationTaskState | null;
};

export type FailureLifecycleDashboardCompensationPosture = {
  active_compensation_ref_or_null: string | null;
  closure_evidence_refs: string[];
  latest_compensation_ref_or_null: string | null;
  resolution_basis_ref_or_null: string | null;
  state: FailureCompensationPostureState;
  target_object_refs: string[];
  verification_ref_or_null: string | null;
};

export type FailureLifecycleDashboardInvestigationPosture = {
  accepted_risk_approval_ref_or_null: string | null;
  active_investigation_ref_or_null: string | null;
  latest_investigation_ref_or_null: string | null;
  outcome_or_null: FailureInvestigationPostureOutcome | null;
  state: FailureInvestigationPostureState;
};

export type FailureLifecycleDashboardAcceptedRiskPosture = {
  accountable_owner_ref_or_null: string | null;
  accountable_owner_type_or_null: FailureLifecycleDashboardOwnerType | null;
  approval_ref_or_null: string | null;
  approver_ref_or_null: string | null;
  approver_type_or_null: FailureAcceptedRiskApproverType | null;
  bounded_scope_refs: string[];
  decision_basis_or_null: FailureAcceptedRiskDecisionBasis | null;
  expires_at_or_null: string | null;
  revoked_at_or_null: string | null;
  state: FailureAcceptedRiskPostureState;
};

export type FailureLifecycleDashboardWorkflowCoordination = {
  current_assignee_ref_or_null: string | null;
  customer_status_projection_or_null: FailureCustomerStatusProjection | null;
  lifecycle_state_or_null: FailureWorkflowLifecycleState | null;
  waiting_on_actor_or_null: FailureWaitingOnActor | null;
  workflow_item_ref_or_null: string | null;
};

export type FailureLifecycleDashboardClosurePosture = {
  closure_evidence_refs: string[];
  resolution_basis_ref_or_null: string | null;
  resolution_state: FailureClosureResolutionState;
  resolved_at_or_null: string | null;
  resolved_by_task_id_or_null: string | null;
};

export type FailureLifecycleDashboardLineageRefs = {
  accepted_risk_approval_refs: string[];
  audit_refs: string[];
  compensation_record_refs: string[];
  failure_investigation_refs: string[];
  provenance_refs: string[];
  remediation_task_refs: string[];
  workflow_item_refs: string[];
};

export type FailureLifecycleDashboard = {
  accepted_risk_owner_policy: "ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY";
  accepted_risk_posture: FailureLifecycleDashboardAcceptedRiskPosture;
  artifact_type: "FailureLifecycleDashboard";
  blocking_scope: FailureLifecycleDashboardBlockingScope;
  closure_posture: FailureLifecycleDashboardClosurePosture;
  compensation_posture: FailureLifecycleDashboardCompensationPosture;
  current_error_ref: string;
  current_lineage_state: FailureLineageState;
  current_owner: FailureLifecycleDashboardCurrentOwner;
  current_state_source: FailureLifecycleDashboardStateSource;
  dashboard_id: string;
  data_source_policy: "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY";
  first_opened_at: string;
  investigation_posture: FailureLifecycleDashboardInvestigationPosture;
  last_activity_at: string;
  lineage_error_refs_in_order: string[];
  lineage_refs: FailureLifecycleDashboardLineageRefs;
  log_reconstruction_policy: "NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION";
  manifest_id: string;
  next_legal_action: FailureLifecycleDashboardNextLegalAction;
  remediation_summary: FailureLifecycleDashboardRemediationSummary;
  root_error_ref: string;
  root_manifest_id: string;
  underlying_error_visibility_policy: "UNDERLYING_ERROR_ALWAYS_VISIBLE";
  updated_at: string;
  workflow_coordination: FailureLifecycleDashboardWorkflowCoordination;
};

export type FailureLifecycleDashboardInput = Partial<FailureLifecycleDashboard> & {
  audit_refs: readonly string[];
  current_error_ref: string;
  dashboard_id: string;
  first_opened_at: string;
  last_activity_at: string;
  lineage_error_refs_in_order: readonly string[];
  manifest_id: string;
  provenance_refs: readonly string[];
  root_error_ref: string;
  root_manifest_id: string;
  updated_at: string;
};

const SOURCE_ARTIFACT_TYPES = [
  "ERROR_RECORD",
  "REMEDIATION_TASK",
  "COMPENSATION_RECORD",
  "FAILURE_INVESTIGATION",
  "ACCEPTED_RISK_APPROVAL",
  "WORKFLOW_ITEM",
] as const satisfies readonly FailureLifecycleDashboardSourceArtifactType[];
const OWNER_TYPES = [
  "SYSTEM",
  "SERVICE_OPERATOR",
  "REVIEWER",
  "APPROVER",
  "CLIENT",
  "TENANT_ADMIN",
  "SECURITY_OPERATOR",
] as const satisfies readonly FailureLifecycleDashboardOwnerType[];
const LINEAGE_STATES = [
  "OPEN_FAILURE",
  "RETRY_SCHEDULED",
  "REMEDIATION_ACTIVE",
  "INVESTIGATION_ACTIVE",
  "COMPENSATION_ACTIVE",
  "ACCEPTED_RISK_ACTIVE",
  "RESOLVED",
  "SUPERSEDED",
  "CANCELLED",
] as const satisfies readonly FailureLineageState[];
const ACTION_STATES = [
  "ACTION_AVAILABLE",
  "WAITING_ON_EXTERNAL",
  "WAITING_ON_SCHEDULE",
  "REVIEW_DUE",
  "NO_FURTHER_ACTION",
] as const satisfies readonly FailureNextLegalActionState[];
const WAITING_ACTORS = ["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM"] as const;
const BLOCKING_CLASSES = [
  "NON_BLOCKING",
  "BLOCKS_AUTOMATION",
  "BLOCKS_REVIEW_PROGRESS",
  "BLOCKS_FILING",
  "BLOCKS_AMENDMENT",
  "BLOCKS_ERASURE",
  "BLOCKS_RUN",
  "BLOCKS_AUTHORITY_CALL",
] as const satisfies readonly FailureBlockingClass[];
const REMEDIATION_TASK_STATES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly FailureRemediationTaskState[];
const ERROR_RESOLUTION_EFFECTS = [
  "ERROR_REMAINS_OPEN",
  "ERROR_MOVES_TO_IN_PROGRESS",
  "ERROR_MOVES_TO_MONITORING",
  "ERROR_MOVES_TO_RESOLVED",
  "ERROR_MOVES_TO_ACCEPTED_RISK",
  "ERROR_MOVES_TO_SUPERSEDED",
  "ERROR_MOVES_TO_CANCELLED",
] as const satisfies readonly FailureErrorResolutionEffect[];
const COMPENSATION_POSTURE_STATES = [
  "NONE",
  "PLANNED",
  "IN_PROGRESS",
  "APPLIED",
  "VERIFIED",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly FailureCompensationPostureState[];
const INVESTIGATION_POSTURE_STATES = [
  "NONE",
  "ACTIVE",
  "RESOLVED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
  "CANCELLED",
] as const satisfies readonly FailureInvestigationPostureState[];
const INVESTIGATION_OUTCOMES = [
  "ROOT_CAUSE_CONFIRMED",
  "FALSE_POSITIVE",
  "RETRY_AUTHORIZED",
  "RECONCILIATION_REQUIRED",
  "REMEDIATION_SPAWNED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
  "CANCELLED",
] as const satisfies readonly FailureInvestigationPostureOutcome[];
const ACCEPTED_RISK_POSTURE_STATES = [
  "NONE",
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "SUPERSEDED",
] as const satisfies readonly FailureAcceptedRiskPostureState[];
const DECISION_BASES = ["EXPLICIT_APPROVAL", "POLICY_BASIS"] as const;
const APPROVER_TYPES = [
  "APPROVER",
  "TENANT_ADMIN",
  "SECURITY_OPERATOR",
  "SYSTEM_POLICY",
] as const;
const WORKFLOW_STATES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CLIENT",
  "WAITING_ON_AUTHORITY",
  "BLOCKED",
  "DONE",
  "CANCELLED",
  "STALE",
] as const satisfies readonly FailureWorkflowLifecycleState[];
const CUSTOMER_STATUS_PROJECTIONS = [
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "WAITING_ON_CONFIRMATION",
  "RESOLVED",
  "CLOSED",
] as const satisfies readonly FailureCustomerStatusProjection[];
const CLOSURE_STATES = [
  "OPEN",
  "IN_PROGRESS",
  "MONITORING",
  "RESOLVED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
  "CANCELLED",
] as const satisfies readonly FailureClosureResolutionState[];

function assertNullableEnum<T extends string>(
  label: string,
  value: unknown,
  allowed: readonly T[],
) {
  if (value == null) {
    return null;
  }
  return assertFailureEnum(label, value, allowed);
}

function normalizeOrderedStringSequence(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number } = {},
) {
  const normalized = (values ?? []).map((value) => requireFailureString(label, value));
  const unique: string[] = [];
  for (const value of normalized) {
    if (!unique.includes(value)) {
      unique.push(value);
    }
  }
  if ((options.minItems ?? 0) > 0 && unique.length < (options.minItems ?? 0)) {
    failureCompanionError(`${label} must contain at least ${options.minItems} item(s)`);
  }
  if (unique.length !== normalized.length) {
    failureCompanionError(`${label} must stay unique`);
  }
  return unique;
}

function requireLineageMembership(input: {
  group: readonly string[];
  label: string;
  ref: string | null;
}) {
  if (input.ref !== null && !input.group.includes(input.ref)) {
    failureCompanionError(`${input.label} must appear in its grouped lineage refs`);
  }
}

function normalizeCurrentOwner(
  input: FailureLifecycleDashboardCurrentOwner,
): FailureLifecycleDashboardCurrentOwner {
  const owner = {
    owner_ref_or_null: normalizeNullableFailureString(
      "current_owner.owner_ref_or_null",
      input.owner_ref_or_null,
    ),
    owner_type: assertFailureEnum("current_owner.owner_type", input.owner_type, OWNER_TYPES),
    source_artifact_type: assertFailureEnum(
      "current_owner.source_artifact_type",
      input.source_artifact_type,
      SOURCE_ARTIFACT_TYPES,
    ),
    source_ref: requireFailureString("current_owner.source_ref", input.source_ref),
  };
  assertOwnerReference({
    label: "current_owner",
    owner_ref: owner.owner_ref_or_null,
    owner_type: owner.owner_type,
  });
  return owner;
}

function normalizeNextLegalAction(
  input: FailureLifecycleDashboardNextLegalAction,
): FailureLifecycleDashboardNextLegalAction {
  const action = {
    action_code_or_null: normalizeNullableFailureString(
      "next_legal_action.action_code_or_null",
      input.action_code_or_null,
    ),
    action_ref_or_null: normalizeNullableFailureString(
      "next_legal_action.action_ref_or_null",
      input.action_ref_or_null,
    ),
    action_state: assertFailureEnum(
      "next_legal_action.action_state",
      input.action_state,
      ACTION_STATES,
    ),
    due_at_or_null: normalizeNullableFailureTimestamp(
      "next_legal_action.due_at_or_null",
      input.due_at_or_null,
    ),
    reason_codes: normalizeFailureStringSet(
      "next_legal_action.reason_codes",
      input.reason_codes,
    ),
    source_artifact_type_or_null: assertNullableEnum(
      "next_legal_action.source_artifact_type_or_null",
      input.source_artifact_type_or_null,
      SOURCE_ARTIFACT_TYPES,
    ),
    waiting_on_actor_or_null: assertNullableEnum(
      "next_legal_action.waiting_on_actor_or_null",
      input.waiting_on_actor_or_null,
      WAITING_ACTORS,
    ),
  };

  if (action.action_state === "NO_FURTHER_ACTION") {
    if (
      action.action_code_or_null !== null ||
      action.action_ref_or_null !== null ||
      action.source_artifact_type_or_null !== null ||
      action.due_at_or_null !== null ||
      action.waiting_on_actor_or_null !== null
    ) {
      failureCompanionError("NO_FURTHER_ACTION must clear action code, ref, source, due, and wait actor");
    }
    return action;
  }
  if (action.action_code_or_null === null) {
    failureCompanionError("non-terminal next legal actions require action_code_or_null");
  }
  if (action.action_ref_or_null === null || action.source_artifact_type_or_null === null) {
    failureCompanionError("non-terminal next legal actions require typed action source ref");
  }
  if (
    (action.action_state === "WAITING_ON_SCHEDULE" || action.action_state === "REVIEW_DUE") &&
    action.due_at_or_null === null
  ) {
    failureCompanionError(`${action.action_state} requires due_at_or_null`);
  }
  return action;
}

function normalizeBlockingScope(
  input: FailureLifecycleDashboardBlockingScope,
): FailureLifecycleDashboardBlockingScope {
  return {
    affected_object_refs: normalizeFailureStringSet(
      "blocking_scope.affected_object_refs",
      input.affected_object_refs,
    ),
    blocking_class: assertFailureEnum(
      "blocking_scope.blocking_class",
      input.blocking_class,
      BLOCKING_CLASSES,
    ),
    reason_codes: normalizeFailureStringSet("blocking_scope.reason_codes", input.reason_codes),
    workflow_item_ref_or_null: normalizeNullableFailureString(
      "blocking_scope.workflow_item_ref_or_null",
      input.workflow_item_ref_or_null,
    ),
  };
}

function normalizeRemediationSummary(
  input: FailureLifecycleDashboardRemediationSummary,
): FailureLifecycleDashboardRemediationSummary {
  return {
    active_task_ref_or_null: normalizeNullableFailureString(
      "remediation_summary.active_task_ref_or_null",
      input.active_task_ref_or_null,
    ),
    due_at_or_null: normalizeNullableFailureTimestamp(
      "remediation_summary.due_at_or_null",
      input.due_at_or_null,
    ),
    error_resolution_effect_or_null: assertNullableEnum(
      "remediation_summary.error_resolution_effect_or_null",
      input.error_resolution_effect_or_null,
      ERROR_RESOLUTION_EFFECTS,
    ),
    latest_task_ref_or_null: normalizeNullableFailureString(
      "remediation_summary.latest_task_ref_or_null",
      input.latest_task_ref_or_null,
    ),
    task_owner_ref_or_null: normalizeNullableFailureString(
      "remediation_summary.task_owner_ref_or_null",
      input.task_owner_ref_or_null,
    ),
    task_owner_type_or_null: assertNullableEnum(
      "remediation_summary.task_owner_type_or_null",
      input.task_owner_type_or_null,
      OWNER_TYPES,
    ),
    task_state_or_null: assertNullableEnum(
      "remediation_summary.task_state_or_null",
      input.task_state_or_null,
      REMEDIATION_TASK_STATES,
    ),
  };
}

function normalizeCompensationPosture(
  input: FailureLifecycleDashboardCompensationPosture,
): FailureLifecycleDashboardCompensationPosture {
  const posture = {
    active_compensation_ref_or_null: normalizeNullableFailureString(
      "compensation_posture.active_compensation_ref_or_null",
      input.active_compensation_ref_or_null,
    ),
    closure_evidence_refs: normalizeFailureStringSet(
      "compensation_posture.closure_evidence_refs",
      input.closure_evidence_refs,
    ),
    latest_compensation_ref_or_null: normalizeNullableFailureString(
      "compensation_posture.latest_compensation_ref_or_null",
      input.latest_compensation_ref_or_null,
    ),
    resolution_basis_ref_or_null: normalizeNullableFailureString(
      "compensation_posture.resolution_basis_ref_or_null",
      input.resolution_basis_ref_or_null,
    ),
    state: assertFailureEnum("compensation_posture.state", input.state, COMPENSATION_POSTURE_STATES),
    target_object_refs: normalizeFailureStringSet(
      "compensation_posture.target_object_refs",
      input.target_object_refs,
    ),
    verification_ref_or_null: normalizeNullableFailureString(
      "compensation_posture.verification_ref_or_null",
      input.verification_ref_or_null,
    ),
  };
  if (posture.state === "NONE") {
    if (
      posture.active_compensation_ref_or_null !== null ||
      posture.latest_compensation_ref_or_null !== null ||
      posture.verification_ref_or_null !== null ||
      posture.resolution_basis_ref_or_null !== null ||
      posture.target_object_refs.length > 0 ||
      posture.closure_evidence_refs.length > 0
    ) {
      failureCompanionError("compensation_posture NONE must clear all compensation refs");
    }
  } else if (posture.latest_compensation_ref_or_null === null) {
    failureCompanionError("non-NONE compensation posture requires latest compensation ref");
  }
  if (posture.state === "VERIFIED" && posture.verification_ref_or_null === null) {
    failureCompanionError("VERIFIED compensation posture requires verification ref");
  }
  return posture;
}

function normalizeInvestigationPosture(
  input: FailureLifecycleDashboardInvestigationPosture,
): FailureLifecycleDashboardInvestigationPosture {
  const posture = {
    accepted_risk_approval_ref_or_null: normalizeNullableFailureString(
      "investigation_posture.accepted_risk_approval_ref_or_null",
      input.accepted_risk_approval_ref_or_null,
    ),
    active_investigation_ref_or_null: normalizeNullableFailureString(
      "investigation_posture.active_investigation_ref_or_null",
      input.active_investigation_ref_or_null,
    ),
    latest_investigation_ref_or_null: normalizeNullableFailureString(
      "investigation_posture.latest_investigation_ref_or_null",
      input.latest_investigation_ref_or_null,
    ),
    outcome_or_null: assertNullableEnum(
      "investigation_posture.outcome_or_null",
      input.outcome_or_null,
      INVESTIGATION_OUTCOMES,
    ),
    state: assertFailureEnum("investigation_posture.state", input.state, INVESTIGATION_POSTURE_STATES),
  };
  if (posture.state === "NONE") {
    if (
      posture.active_investigation_ref_or_null !== null ||
      posture.latest_investigation_ref_or_null !== null ||
      posture.accepted_risk_approval_ref_or_null !== null ||
      posture.outcome_or_null !== null
    ) {
      failureCompanionError("investigation_posture NONE must clear all investigation refs");
    }
  } else if (posture.latest_investigation_ref_or_null === null) {
    failureCompanionError("non-NONE investigation posture requires latest investigation ref");
  }
  if (
    posture.state === "ACTIVE" &&
    (posture.active_investigation_ref_or_null === null ||
      posture.latest_investigation_ref_or_null === null)
  ) {
    failureCompanionError("ACTIVE investigation posture requires active and latest refs");
  }
  return posture;
}

function normalizeAcceptedRiskPosture(
  input: FailureLifecycleDashboardAcceptedRiskPosture,
): FailureLifecycleDashboardAcceptedRiskPosture {
  const posture = {
    accountable_owner_ref_or_null: normalizeNullableFailureString(
      "accepted_risk_posture.accountable_owner_ref_or_null",
      input.accountable_owner_ref_or_null,
    ),
    accountable_owner_type_or_null: assertNullableEnum(
      "accepted_risk_posture.accountable_owner_type_or_null",
      input.accountable_owner_type_or_null,
      OWNER_TYPES,
    ),
    approval_ref_or_null: normalizeNullableFailureString(
      "accepted_risk_posture.approval_ref_or_null",
      input.approval_ref_or_null,
    ),
    approver_ref_or_null: normalizeNullableFailureString(
      "accepted_risk_posture.approver_ref_or_null",
      input.approver_ref_or_null,
    ),
    approver_type_or_null: assertNullableEnum(
      "accepted_risk_posture.approver_type_or_null",
      input.approver_type_or_null,
      APPROVER_TYPES,
    ),
    bounded_scope_refs: normalizeFailureStringSet(
      "accepted_risk_posture.bounded_scope_refs",
      input.bounded_scope_refs,
    ),
    decision_basis_or_null: assertNullableEnum(
      "accepted_risk_posture.decision_basis_or_null",
      input.decision_basis_or_null,
      DECISION_BASES,
    ),
    expires_at_or_null: normalizeNullableFailureTimestamp(
      "accepted_risk_posture.expires_at_or_null",
      input.expires_at_or_null,
    ),
    revoked_at_or_null: normalizeNullableFailureTimestamp(
      "accepted_risk_posture.revoked_at_or_null",
      input.revoked_at_or_null,
    ),
    state: assertFailureEnum(
      "accepted_risk_posture.state",
      input.state,
      ACCEPTED_RISK_POSTURE_STATES,
    ),
  };
  if (posture.state === "NONE") {
    if (
      posture.approval_ref_or_null !== null ||
      posture.decision_basis_or_null !== null ||
      posture.approver_type_or_null !== null ||
      posture.approver_ref_or_null !== null ||
      posture.bounded_scope_refs.length > 0 ||
      posture.expires_at_or_null !== null ||
      posture.revoked_at_or_null !== null ||
      posture.accountable_owner_type_or_null !== null ||
      posture.accountable_owner_ref_or_null !== null
    ) {
      failureCompanionError("accepted_risk_posture NONE must clear all accepted-risk refs");
    }
  }
  if (posture.state === "ACTIVE") {
    if (
      posture.approval_ref_or_null === null ||
      posture.decision_basis_or_null === null ||
      posture.expires_at_or_null === null ||
      posture.accountable_owner_type_or_null === null ||
      posture.accountable_owner_type_or_null === "SYSTEM" ||
      posture.accountable_owner_ref_or_null === null ||
      posture.bounded_scope_refs.length === 0 ||
      posture.revoked_at_or_null !== null
    ) {
      failureCompanionError(
        "ACTIVE accepted-risk posture requires approval, decision basis, future expiry, bounded scope, and accountable non-system owner",
      );
    }
  }
  if (posture.state === "REVOKED" && posture.revoked_at_or_null === null) {
    failureCompanionError("REVOKED accepted-risk posture requires revoked_at_or_null");
  }
  if (posture.revoked_at_or_null !== null && posture.state !== "REVOKED") {
    failureCompanionError("revoked_at_or_null is lawful only on REVOKED accepted-risk posture");
  }
  return posture;
}

function normalizeWorkflowCoordination(
  input: FailureLifecycleDashboardWorkflowCoordination,
): FailureLifecycleDashboardWorkflowCoordination {
  const workflow = {
    current_assignee_ref_or_null: normalizeNullableFailureString(
      "workflow_coordination.current_assignee_ref_or_null",
      input.current_assignee_ref_or_null,
    ),
    customer_status_projection_or_null: assertNullableEnum(
      "workflow_coordination.customer_status_projection_or_null",
      input.customer_status_projection_or_null,
      CUSTOMER_STATUS_PROJECTIONS,
    ),
    lifecycle_state_or_null: assertNullableEnum(
      "workflow_coordination.lifecycle_state_or_null",
      input.lifecycle_state_or_null,
      WORKFLOW_STATES,
    ),
    waiting_on_actor_or_null: assertNullableEnum(
      "workflow_coordination.waiting_on_actor_or_null",
      input.waiting_on_actor_or_null,
      WAITING_ACTORS,
    ),
    workflow_item_ref_or_null: normalizeNullableFailureString(
      "workflow_coordination.workflow_item_ref_or_null",
      input.workflow_item_ref_or_null,
    ),
  };
  if (workflow.workflow_item_ref_or_null === null) {
    if (
      workflow.lifecycle_state_or_null !== null ||
      workflow.current_assignee_ref_or_null !== null ||
      workflow.waiting_on_actor_or_null !== null ||
      workflow.customer_status_projection_or_null !== null
    ) {
      failureCompanionError("workflow_coordination without workflow ref must clear workflow fields");
    }
  }
  return workflow;
}

function normalizeClosurePosture(
  input: FailureLifecycleDashboardClosurePosture,
): FailureLifecycleDashboardClosurePosture {
  const closure = {
    closure_evidence_refs: normalizeFailureStringSet(
      "closure_posture.closure_evidence_refs",
      input.closure_evidence_refs,
    ),
    resolution_basis_ref_or_null: normalizeNullableFailureString(
      "closure_posture.resolution_basis_ref_or_null",
      input.resolution_basis_ref_or_null,
    ),
    resolution_state: assertFailureEnum(
      "closure_posture.resolution_state",
      input.resolution_state,
      CLOSURE_STATES,
    ),
    resolved_at_or_null: normalizeNullableFailureTimestamp(
      "closure_posture.resolved_at_or_null",
      input.resolved_at_or_null,
    ),
    resolved_by_task_id_or_null: normalizeNullableFailureString(
      "closure_posture.resolved_by_task_id_or_null",
      input.resolved_by_task_id_or_null,
    ),
  };
  if (["RESOLVED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED"].includes(closure.resolution_state)) {
    if (
      closure.resolution_basis_ref_or_null === null ||
      closure.closure_evidence_refs.length === 0 ||
      closure.resolved_at_or_null === null
    ) {
      failureCompanionError("terminal closure posture requires basis, evidence, and resolved_at");
    }
  }
  if (closure.resolution_state === "OPEN" || closure.resolution_state === "IN_PROGRESS") {
    if (
      closure.resolution_basis_ref_or_null !== null ||
      closure.resolved_at_or_null !== null ||
      closure.resolved_by_task_id_or_null !== null ||
      closure.closure_evidence_refs.length > 0
    ) {
      failureCompanionError("open or in-progress closure posture must clear terminal closure fields");
    }
  }
  return closure;
}

function normalizeLineageRefs(
  input: FailureLifecycleDashboardLineageRefs,
): FailureLifecycleDashboardLineageRefs {
  return {
    accepted_risk_approval_refs: normalizeFailureStringSet(
      "lineage_refs.accepted_risk_approval_refs",
      input.accepted_risk_approval_refs,
    ),
    audit_refs: normalizeFailureStringSet("lineage_refs.audit_refs", input.audit_refs, {
      minItems: 1,
    }),
    compensation_record_refs: normalizeFailureStringSet(
      "lineage_refs.compensation_record_refs",
      input.compensation_record_refs,
    ),
    failure_investigation_refs: normalizeFailureStringSet(
      "lineage_refs.failure_investigation_refs",
      input.failure_investigation_refs,
    ),
    provenance_refs: normalizeFailureStringSet(
      "lineage_refs.provenance_refs",
      input.provenance_refs,
      { minItems: 1 },
    ),
    remediation_task_refs: normalizeFailureStringSet(
      "lineage_refs.remediation_task_refs",
      input.remediation_task_refs,
    ),
    workflow_item_refs: normalizeFailureStringSet(
      "lineage_refs.workflow_item_refs",
      input.workflow_item_refs,
    ),
  };
}

function assertStateSourceAlignment(dashboard: FailureLifecycleDashboard) {
  const source = dashboard.current_state_source;
  const expectedBySource: Record<FailureLifecycleDashboardSourceArtifactType, string | null> = {
    ACCEPTED_RISK_APPROVAL: dashboard.accepted_risk_posture.approval_ref_or_null,
    COMPENSATION_RECORD: dashboard.compensation_posture.active_compensation_ref_or_null,
    ERROR_RECORD: dashboard.current_error_ref,
    FAILURE_INVESTIGATION: dashboard.investigation_posture.active_investigation_ref_or_null,
    REMEDIATION_TASK: dashboard.remediation_summary.active_task_ref_or_null,
    WORKFLOW_ITEM: dashboard.workflow_coordination.workflow_item_ref_or_null,
  };
  if (source.source_ref !== expectedBySource[source.source_artifact_type]) {
    failureCompanionError(
      "current_state_source.source_ref must mirror the governing typed source object",
    );
  }
}

function assertLineageBindings(dashboard: FailureLifecycleDashboard) {
  const refs = dashboard.lineage_refs;
  requireLineageMembership({
    group: refs.remediation_task_refs,
    label: "remediation_summary.active_task_ref_or_null",
    ref: dashboard.remediation_summary.active_task_ref_or_null,
  });
  requireLineageMembership({
    group: refs.remediation_task_refs,
    label: "remediation_summary.latest_task_ref_or_null",
    ref: dashboard.remediation_summary.latest_task_ref_or_null,
  });
  requireLineageMembership({
    group: refs.compensation_record_refs,
    label: "compensation_posture.active_compensation_ref_or_null",
    ref: dashboard.compensation_posture.active_compensation_ref_or_null,
  });
  requireLineageMembership({
    group: refs.compensation_record_refs,
    label: "compensation_posture.latest_compensation_ref_or_null",
    ref: dashboard.compensation_posture.latest_compensation_ref_or_null,
  });
  requireLineageMembership({
    group: refs.failure_investigation_refs,
    label: "investigation_posture.active_investigation_ref_or_null",
    ref: dashboard.investigation_posture.active_investigation_ref_or_null,
  });
  requireLineageMembership({
    group: refs.failure_investigation_refs,
    label: "investigation_posture.latest_investigation_ref_or_null",
    ref: dashboard.investigation_posture.latest_investigation_ref_or_null,
  });
  requireLineageMembership({
    group: refs.accepted_risk_approval_refs,
    label: "accepted_risk_posture.approval_ref_or_null",
    ref: dashboard.accepted_risk_posture.approval_ref_or_null,
  });
  requireLineageMembership({
    group: refs.workflow_item_refs,
    label: "workflow_coordination.workflow_item_ref_or_null",
    ref: dashboard.workflow_coordination.workflow_item_ref_or_null,
  });
  requireLineageMembership({
    group: refs.remediation_task_refs,
    label: "closure_posture.resolved_by_task_id_or_null",
    ref: dashboard.closure_posture.resolved_by_task_id_or_null,
  });
}

function assertNextActionBinding(dashboard: FailureLifecycleDashboard) {
  const action = dashboard.next_legal_action;
  const actionRef = action.action_ref_or_null;
  const sourceType = action.source_artifact_type_or_null;
  if (action.action_state === "NO_FURTHER_ACTION") {
    return;
  }
  if (sourceType === "ERROR_RECORD" && actionRef !== dashboard.current_error_ref) {
    failureCompanionError("error-backed next legal action must point at current_error_ref");
  }
  if (sourceType === "WORKFLOW_ITEM" && actionRef !== dashboard.workflow_coordination.workflow_item_ref_or_null) {
    failureCompanionError("workflow-backed next legal action must point at workflow coordination ref");
  }
  const refs = dashboard.lineage_refs;
  if (sourceType === "REMEDIATION_TASK") {
    requireLineageMembership({
      group: refs.remediation_task_refs,
      label: "next_legal_action.action_ref_or_null",
      ref: actionRef,
    });
  }
  if (sourceType === "COMPENSATION_RECORD") {
    requireLineageMembership({
      group: refs.compensation_record_refs,
      label: "next_legal_action.action_ref_or_null",
      ref: actionRef,
    });
  }
  if (sourceType === "FAILURE_INVESTIGATION") {
    requireLineageMembership({
      group: refs.failure_investigation_refs,
      label: "next_legal_action.action_ref_or_null",
      ref: actionRef,
    });
  }
  if (sourceType === "ACCEPTED_RISK_APPROVAL") {
    requireLineageMembership({
      group: refs.accepted_risk_approval_refs,
      label: "next_legal_action.action_ref_or_null",
      ref: actionRef,
    });
  }
}

function assertDashboardStateContract(dashboard: FailureLifecycleDashboard) {
  const first = dashboard.lineage_error_refs_in_order[0];
  const last = dashboard.lineage_error_refs_in_order[dashboard.lineage_error_refs_in_order.length - 1];
  if (first !== dashboard.root_error_ref) {
    failureCompanionError("root_error_ref must equal the first lineage_error_refs_in_order entry");
  }
  if (last !== dashboard.current_error_ref) {
    failureCompanionError("current_error_ref must equal the last lineage_error_refs_in_order entry");
  }

  assertNotBefore({
    earlier_label: "first_opened_at",
    earlier_value: dashboard.first_opened_at,
    later_label: "last_activity_at",
    later_value: dashboard.last_activity_at,
  });
  assertNotBefore({
    earlier_label: "last_activity_at",
    earlier_value: dashboard.last_activity_at,
    later_label: "updated_at",
    later_value: dashboard.updated_at,
  });
  assertNotBefore({
    earlier_label: "first_opened_at",
    earlier_value: dashboard.first_opened_at,
    later_label: "current_state_source.state_changed_at",
    later_value: dashboard.current_state_source.state_changed_at,
  });
  assertNotBefore({
    earlier_label: "first_opened_at",
    earlier_value: dashboard.first_opened_at,
    later_label: "closure_posture.resolved_at_or_null",
    later_value: dashboard.closure_posture.resolved_at_or_null,
  });

  const allowedClosureStatesByLineageState: Record<
    FailureLineageState,
    readonly FailureClosureResolutionState[]
  > = {
    ACCEPTED_RISK_ACTIVE: ["ACCEPTED_RISK"],
    CANCELLED: ["CANCELLED"],
    COMPENSATION_ACTIVE: ["OPEN", "IN_PROGRESS", "MONITORING"],
    INVESTIGATION_ACTIVE: ["OPEN", "IN_PROGRESS"],
    OPEN_FAILURE: ["OPEN", "IN_PROGRESS"],
    REMEDIATION_ACTIVE: ["OPEN", "IN_PROGRESS"],
    RESOLVED: ["RESOLVED"],
    RETRY_SCHEDULED: ["OPEN", "IN_PROGRESS"],
    SUPERSEDED: ["SUPERSEDED"],
  };
  if (
    !allowedClosureStatesByLineageState[dashboard.current_lineage_state].includes(
      dashboard.closure_posture.resolution_state,
    )
  ) {
    failureCompanionError(
      `closure_posture.resolution_state is not valid for ${dashboard.current_lineage_state}`,
    );
  }
  if (
    ["OPEN_FAILURE", "RETRY_SCHEDULED", "REMEDIATION_ACTIVE", "INVESTIGATION_ACTIVE", "COMPENSATION_ACTIVE", "ACCEPTED_RISK_ACTIVE"].includes(
      dashboard.current_lineage_state,
    ) &&
    dashboard.next_legal_action.action_state === "NO_FURTHER_ACTION"
  ) {
    failureCompanionError("non-terminal dashboards require a typed next legal action");
  }
  if (
    ["RESOLVED", "SUPERSEDED", "CANCELLED"].includes(dashboard.current_lineage_state) &&
    dashboard.next_legal_action.action_state !== "NO_FURTHER_ACTION"
  ) {
    failureCompanionError("terminal dashboards must force NO_FURTHER_ACTION");
  }
  if (
    dashboard.current_lineage_state === "REMEDIATION_ACTIVE" &&
    dashboard.remediation_summary.active_task_ref_or_null === null
  ) {
    failureCompanionError("REMEDIATION_ACTIVE dashboards require active remediation task ref");
  }
  if (
    dashboard.current_lineage_state === "INVESTIGATION_ACTIVE" &&
    dashboard.investigation_posture.active_investigation_ref_or_null === null
  ) {
    failureCompanionError("INVESTIGATION_ACTIVE dashboards require active investigation ref");
  }
  if (
    dashboard.current_lineage_state === "COMPENSATION_ACTIVE" &&
    dashboard.compensation_posture.active_compensation_ref_or_null === null
  ) {
    failureCompanionError("COMPENSATION_ACTIVE dashboards require active compensation ref");
  }
  if (dashboard.accepted_risk_posture.state === "ACTIVE") {
    if (
      dashboard.accepted_risk_posture.expires_at_or_null === null ||
      dashboard.accepted_risk_posture.expires_at_or_null <= dashboard.updated_at
    ) {
      failureCompanionError("ACTIVE accepted-risk posture must retain expiry later than updated_at");
    }
    if (
      dashboard.accepted_risk_posture.accountable_owner_type_or_null !==
        dashboard.current_owner.owner_type ||
      dashboard.accepted_risk_posture.accountable_owner_ref_or_null !==
        dashboard.current_owner.owner_ref_or_null
    ) {
      failureCompanionError(
        "active accepted-risk posture must align with current accountable owner",
      );
    }
  }
  if (
    dashboard.accepted_risk_posture.state === "EXPIRED" &&
    dashboard.accepted_risk_posture.expires_at_or_null !== null &&
    dashboard.accepted_risk_posture.expires_at_or_null > dashboard.updated_at
  ) {
    failureCompanionError("EXPIRED accepted-risk posture cannot keep a future expiry");
  }

  assertStateSourceAlignment(dashboard);
  assertLineageBindings(dashboard);
  assertNextActionBinding(dashboard);
}

export function buildFailureLifecycleDashboardRecord(
  input: FailureLifecycleDashboardInput,
): FailureLifecycleDashboard {
  return normalizeFailureLifecycleDashboard({
    accepted_risk_owner_policy: "ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY",
    accepted_risk_posture: input.accepted_risk_posture ?? {
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
    },
    artifact_type: "FailureLifecycleDashboard",
    blocking_scope: input.blocking_scope ?? {
      affected_object_refs: [],
      blocking_class: "NON_BLOCKING",
      reason_codes: [],
      workflow_item_ref_or_null: null,
    },
    closure_posture: input.closure_posture ?? {
      closure_evidence_refs: [],
      resolution_basis_ref_or_null: null,
      resolution_state: "OPEN",
      resolved_at_or_null: null,
      resolved_by_task_id_or_null: null,
    },
    compensation_posture: input.compensation_posture ?? {
      active_compensation_ref_or_null: null,
      closure_evidence_refs: [],
      latest_compensation_ref_or_null: null,
      resolution_basis_ref_or_null: null,
      state: "NONE",
      target_object_refs: [],
      verification_ref_or_null: null,
    },
    current_error_ref: input.current_error_ref,
    current_lineage_state: input.current_lineage_state ?? "OPEN_FAILURE",
    current_owner: input.current_owner ?? {
      owner_ref_or_null: null,
      owner_type: "SYSTEM",
      source_artifact_type: "ERROR_RECORD",
      source_ref: input.current_error_ref,
    },
    current_state_source: input.current_state_source ?? {
      source_artifact_type: "ERROR_RECORD",
      source_ref: input.current_error_ref,
      state_changed_at: input.last_activity_at,
      state_code: input.current_lineage_state ?? "OPEN_FAILURE",
    },
    dashboard_id: input.dashboard_id,
    data_source_policy: "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY",
    first_opened_at: input.first_opened_at,
    investigation_posture: input.investigation_posture ?? {
      accepted_risk_approval_ref_or_null: null,
      active_investigation_ref_or_null: null,
      latest_investigation_ref_or_null: null,
      outcome_or_null: null,
      state: "NONE",
    },
    last_activity_at: input.last_activity_at,
    lineage_error_refs_in_order: [...input.lineage_error_refs_in_order],
    lineage_refs: input.lineage_refs ?? {
      accepted_risk_approval_refs: [],
      audit_refs: [...input.audit_refs],
      compensation_record_refs: [],
      failure_investigation_refs: [],
      provenance_refs: [...input.provenance_refs],
      remediation_task_refs: [],
      workflow_item_refs: [],
    },
    log_reconstruction_policy: "NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION",
    manifest_id: input.manifest_id,
    next_legal_action: input.next_legal_action ?? {
      action_code_or_null: "REVIEW_FAILURE",
      action_ref_or_null: input.current_error_ref,
      action_state: "ACTION_AVAILABLE",
      due_at_or_null: null,
      reason_codes: ["FAILURE_REVIEW_REQUIRED"],
      source_artifact_type_or_null: "ERROR_RECORD",
      waiting_on_actor_or_null: "STAFF",
    },
    remediation_summary: input.remediation_summary ?? {
      active_task_ref_or_null: null,
      due_at_or_null: null,
      error_resolution_effect_or_null: null,
      latest_task_ref_or_null: null,
      task_owner_ref_or_null: null,
      task_owner_type_or_null: null,
      task_state_or_null: null,
    },
    root_error_ref: input.root_error_ref,
    root_manifest_id: input.root_manifest_id,
    underlying_error_visibility_policy: "UNDERLYING_ERROR_ALWAYS_VISIBLE",
    updated_at: input.updated_at,
    workflow_coordination: input.workflow_coordination ?? {
      current_assignee_ref_or_null: null,
      customer_status_projection_or_null: null,
      lifecycle_state_or_null: null,
      waiting_on_actor_or_null: null,
      workflow_item_ref_or_null: null,
    },
  });
}

export function normalizeFailureLifecycleDashboard(
  input: FailureLifecycleDashboard,
): FailureLifecycleDashboard {
  const dashboard: FailureLifecycleDashboard = {
    accepted_risk_owner_policy:
      input.accepted_risk_owner_policy ===
      "ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY"
        ? input.accepted_risk_owner_policy
        : failureCompanionError(
            "accepted_risk_owner_policy must be ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY",
          ),
    accepted_risk_posture: normalizeAcceptedRiskPosture(input.accepted_risk_posture),
    artifact_type:
      input.artifact_type === "FailureLifecycleDashboard"
        ? input.artifact_type
        : failureCompanionError("artifact_type must be FailureLifecycleDashboard"),
    blocking_scope: normalizeBlockingScope(input.blocking_scope),
    closure_posture: normalizeClosurePosture(input.closure_posture),
    compensation_posture: normalizeCompensationPosture(input.compensation_posture),
    current_error_ref: requireFailureString("current_error_ref", input.current_error_ref),
    current_lineage_state: assertFailureEnum(
      "current_lineage_state",
      input.current_lineage_state,
      LINEAGE_STATES,
    ),
    current_owner: normalizeCurrentOwner(input.current_owner),
    current_state_source: {
      source_artifact_type: assertFailureEnum(
        "current_state_source.source_artifact_type",
        input.current_state_source.source_artifact_type,
        SOURCE_ARTIFACT_TYPES,
      ),
      source_ref: requireFailureString(
        "current_state_source.source_ref",
        input.current_state_source.source_ref,
      ),
      state_changed_at: normalizeFailureTimestamp(
        "current_state_source.state_changed_at",
        input.current_state_source.state_changed_at,
      ),
      state_code: requireFailureString(
        "current_state_source.state_code",
        input.current_state_source.state_code,
      ),
    },
    dashboard_id: requireFailureString("dashboard_id", input.dashboard_id),
    data_source_policy:
      input.data_source_policy === "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY"
        ? input.data_source_policy
        : failureCompanionError(
            "data_source_policy must be PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY",
          ),
    first_opened_at: normalizeFailureTimestamp("first_opened_at", input.first_opened_at),
    investigation_posture: normalizeInvestigationPosture(input.investigation_posture),
    last_activity_at: normalizeFailureTimestamp("last_activity_at", input.last_activity_at),
    lineage_error_refs_in_order: normalizeOrderedStringSequence(
      "lineage_error_refs_in_order",
      input.lineage_error_refs_in_order,
      { minItems: 1 },
    ),
    lineage_refs: normalizeLineageRefs(input.lineage_refs),
    log_reconstruction_policy:
      input.log_reconstruction_policy === "NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION"
        ? input.log_reconstruction_policy
        : failureCompanionError(
            "log_reconstruction_policy must be NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION",
          ),
    manifest_id: requireFailureString("manifest_id", input.manifest_id),
    next_legal_action: normalizeNextLegalAction(input.next_legal_action),
    remediation_summary: normalizeRemediationSummary(input.remediation_summary),
    root_error_ref: requireFailureString("root_error_ref", input.root_error_ref),
    root_manifest_id: requireFailureString("root_manifest_id", input.root_manifest_id),
    underlying_error_visibility_policy:
      input.underlying_error_visibility_policy === "UNDERLYING_ERROR_ALWAYS_VISIBLE"
        ? input.underlying_error_visibility_policy
        : failureCompanionError(
            "underlying_error_visibility_policy must be UNDERLYING_ERROR_ALWAYS_VISIBLE",
          ),
    updated_at: normalizeFailureTimestamp("updated_at", input.updated_at),
    workflow_coordination: normalizeWorkflowCoordination(input.workflow_coordination),
  };

  assertDashboardStateContract(dashboard);
  return dashboard;
}

export function cloneFailureLifecycleDashboard(dashboard: FailureLifecycleDashboard) {
  return cloneFailureCompanionRecord(dashboard);
}

export function failureLifecycleDashboardContentFingerprint(
  dashboard: FailureLifecycleDashboard,
) {
  return failureCompanionContentFingerprint(normalizeFailureLifecycleDashboard(dashboard));
}
