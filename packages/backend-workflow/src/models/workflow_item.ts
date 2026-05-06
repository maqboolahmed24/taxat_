import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export type WorkflowModelErrorCode =
  | "WORKFLOW_CONTRACT_INVALID"
  | "WORKFLOW_FIELD_INVALID"
  | "WORKFLOW_ITEM_IMMUTABLE"
  | "WORKFLOW_STATE_TRANSITION_INVALID"
  | "WORKFLOW_STALE_VERSION";

export class WorkflowModelError extends Error {
  readonly code: WorkflowModelErrorCode;

  constructor(code: WorkflowModelErrorCode, message: string) {
    super(message);
    this.name = "WorkflowModelError";
    this.code = code;
  }
}

export type ExecutionModeBoundaryContract = {
  analysis_only: boolean;
  boundary_hash: string;
  contract_version: "EXECUTION_MODE_BOUNDARY_V1";
  counterfactual_basis: string | null;
  disclosure_reason_codes: string[];
  execution_mode: "COMPLIANCE" | "ANALYSIS";
  execution_posture:
    | "LIVE_COMPLIANCE"
    | "LIVE_ANALYSIS"
    | "REPLAY_COMPLIANCE"
    | "REPLAY_COUNTERFACTUAL";
  legal_effect_boundary:
    | "COMPLIANCE_CAPABLE"
    | "MODELED_READ_ONLY"
    | "HISTORICAL_REPLAY_READ_ONLY"
    | "COUNTERFACTUAL_REPLAY_READ_ONLY";
  non_compliance_config_refs: string[];
  replay_class_or_null: "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  run_kind: "INTERACTIVE" | "NIGHTLY" | "BACKFILL" | "REPLAY" | "REMEDIATION" | "AMENDMENT" | "MIGRATION";
};

export type WorkflowTruthBoundaryContract = {
  artifact_role: "COMMAND_SIDE_AUTHORITY";
  authoritative_record_families: ["RUN_MANIFEST", "WORKFLOW_ITEM", "AUDIT_EVENT"];
  authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY";
  contract_version: "COMMAND_TRUTH_BOUNDARY_V1";
  durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED";
  observable_projection_families: [];
  projection_input_policy: "FORBIDDEN_AS_AUTHORITY";
  recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY";
};

export type WorkflowAuthorityTruthContract = {
  authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM";
  boundary_scope: "WORKFLOW_ITEM";
  contract_version: "AUTHORITY_TRUTH_V1";
  correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE";
  mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY";
  non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING";
  normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION";
  override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM";
  surface_specific_binding_policy: "WORKFLOW_IS_COORDINATION_ONLY_WITH_EXPLICIT_AUTHORITY_STATE";
  truth_surface_role: "INTERNAL_WORKFLOW_COORDINATION";
  unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED";
};

export type WorkflowItemLifecycleState =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CLIENT"
  | "WAITING_ON_AUTHORITY"
  | "BLOCKED"
  | "DONE"
  | "CANCELLED"
  | "STALE";

export type WorkflowItemPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
export type WorkflowItemVisibility = "INTERNAL_ONLY" | "CUSTOMER_SHARED";
export type WorkflowCustomerStatusProjection =
  | "UNDER_REVIEW"
  | "ACTION_REQUIRED"
  | "WAITING_ON_CONFIRMATION"
  | "RESOLVED"
  | "CLOSED"
  | null;
export type WorkflowAuthorityTruthState =
  | "NOT_APPLICABLE"
  | "NOT_REQUESTED"
  | "UNKNOWN"
  | "PENDING_ACK"
  | "PARTIAL_ACK"
  | "CONFIRMED"
  | "REJECTED"
  | "OUT_OF_BAND";
export type WorkflowAssignmentState = "UNASSIGNED" | "ASSIGNED" | "ESCALATED";
export type WorkflowWaitingOnActor = "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM";
export type WorkflowDueState = "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "BREACHED" | null;

export type WorkflowTransitionEventCode =
  | "workflow_item_created"
  | "picked_up"
  | "needs_client_input"
  | "needs_authority_response"
  | "blocked_condition"
  | "client_response"
  | "authority_response"
  | "resolved"
  | "no_longer_relevant"
  | "superseded_by_new_context";

export type WorkflowStateTransitionContract = {
  audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF";
  concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE";
  contract_version: "STATE_TRANSITION_CONTRACT_V1";
  current_state: WorkflowItemLifecycleState;
  illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE";
  machine_code: "WORKFLOW_ITEM_LIFECYCLE_V1";
  object_family: "WORKFLOW_ITEM";
  previous_state_or_null: WorkflowItemLifecycleState | null;
  recovery_supersession_policy: "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE";
  state_field_name: "lifecycle_state";
  terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE";
  transition_application_policy: "NAMED_EVENT_ONLY";
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_event_code: WorkflowTransitionEventCode;
  typed_rejection_family: "ILLEGAL_STATE_TRANSITION";
};

export type WorkflowRoutingContract = {
  assignment_efficiency_score: number;
  assignment_recommendation_state:
    | "KEEP_CURRENT_OWNER"
    | "ASSIGN_RECOMMENDED"
    | "REASSIGN_RECOMMENDED"
    | "NO_ELIGIBLE_OWNER";
  basis_hash: string;
  canonical_sort_key: {
    collaboration_priority_score: number;
    effective_due_at_or_null: string | null;
    escalation_rank: number;
    item_id: string;
    queue_entered_at: string;
    resolution_confidence_score: number;
  };
  collaboration_priority_score: number;
  contract_version: "COLLABORATION_ROUTING_V1";
  draft_safety_state:
    | "NO_DRAFT_LOCK"
    | "DRAFT_LOCK_PREVENTS_TRANSFER"
    | "COMMAND_PENDING_PREVENTS_TRANSFER";
  escalation_pressure_score: number;
  escalation_pressure_threshold: number;
  escalation_rank: number;
  escalation_recommendation_state:
    | "NO_ESCALATION"
    | "ESCALATE_RECOMMENDED"
    | "ESCALATED_ACTIVE"
    | "MANUAL_REVIEW_REQUIRED";
  focused_row_reorder_state: "APPLY_IMMEDIATELY" | "DEFER_REORDER_UNTIL_FOCUS_EXIT";
  ordering_reason_codes: string[];
  ownership_confidence_score: number;
  queue_health_floor: number;
  queue_health_score: number;
  queue_health_state: "HEALTHY" | "DEGRADED" | "SATURATED";
  queue_pressure_score: number;
  reassignment_gain_threshold: number;
  recommendation_reason_codes: string[];
  recommended_action_code_or_null: string | null;
  recommended_assignee_ref_or_null: string | null;
  recommended_escalation_target_ref_or_null: string | null;
  resolution_confidence_floor: number;
  resolution_confidence_score: number;
  routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1";
  routing_profile_hash: string;
  routing_queue_ref: string;
  routing_scope: "WORKFLOW_ITEM";
  sla_pressure_score: number;
};

export type WorkflowItem = {
  active_request_info_ref: string | null;
  artifact_type: "WorkflowItem";
  assignment_efficiency_score: number;
  assignment_state: WorkflowAssignmentState;
  authority_truth_contract: WorkflowAuthorityTruthContract;
  authority_truth_state: WorkflowAuthorityTruthState;
  client_id: string;
  closed_at: string | null;
  collaboration_priority_score: number;
  collaboration_visibility: WorkflowItemVisibility;
  context_refs: string[];
  current_assignee_ref: string | null;
  customer_due_at: string | null;
  customer_status_projection: WorkflowCustomerStatusProjection;
  customer_thread_ref: string | null;
  customer_workspace_version: number;
  dedupe_key: string;
  due_at: string | null;
  due_state: WorkflowDueState;
  escalation_pressure_score: number;
  escalation_target_ref: string | null;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  internal_thread_ref: string;
  item_id: string;
  last_assignment_at: string | null;
  last_customer_activity_at: string | null;
  last_customer_visible_event_ref: string | null;
  last_internal_activity_at: string | null;
  last_internal_event_ref: string | null;
  lifecycle_state: WorkflowItemLifecycleState;
  next_request_info_ordinal: number;
  ownership_confidence_score: number;
  period: string;
  priority: WorkflowItemPriority;
  queue_entered_at: string;
  reassignment_count_30d: number;
  resolution_confidence_score: number;
  routing_contract: WorkflowRoutingContract;
  routing_queue_ref: string;
  sla_due_at: string | null;
  sla_policy_ref: string | null;
  sla_pressure_score: number;
  staff_workspace_version: number;
  state_transition_contract: WorkflowStateTransitionContract;
  tenant_id: string;
  title: string;
  truth_boundary_contract: WorkflowTruthBoundaryContract;
  type: string;
  waiting_on_actor: WorkflowWaitingOnActor;
  waiting_since_at: string;
};

export type WorkflowItemInput = Partial<Omit<WorkflowItem, "artifact_type">> & {
  client_id: string;
  dedupe_key: string;
  item_id: string;
  period: string;
  routing_queue_ref: string;
  tenant_id: string;
  title: string;
  type: string;
  opened_at?: string;
};

const LIFECYCLE_STATES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CLIENT",
  "WAITING_ON_AUTHORITY",
  "BLOCKED",
  "DONE",
  "CANCELLED",
  "STALE",
] as const;
const TERMINAL_LIFECYCLE_STATES = ["DONE", "CANCELLED", "STALE"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"] as const;
const VISIBILITIES = ["INTERNAL_ONLY", "CUSTOMER_SHARED"] as const;
const AUTHORITY_TRUTH_STATES = [
  "NOT_APPLICABLE",
  "NOT_REQUESTED",
  "UNKNOWN",
  "PENDING_ACK",
  "PARTIAL_ACK",
  "CONFIRMED",
  "REJECTED",
  "OUT_OF_BAND",
] as const;
const ASSIGNMENT_STATES = ["UNASSIGNED", "ASSIGNED", "ESCALATED"] as const;
const WAITING_ACTORS = ["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM"] as const;
const DUE_STATES = ["ON_TRACK", "DUE_SOON", "OVERDUE", "BREACHED"] as const;
const CUSTOMER_PROJECTIONS = [
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "WAITING_ON_CONFIRMATION",
  "RESOLVED",
  "CLOSED",
] as const;
const ROUTING_ASSIGNMENT_RECOMMENDATIONS = [
  "KEEP_CURRENT_OWNER",
  "ASSIGN_RECOMMENDED",
  "REASSIGN_RECOMMENDED",
  "NO_ELIGIBLE_OWNER",
] as const;
const ROUTING_ESCALATION_RECOMMENDATIONS = [
  "NO_ESCALATION",
  "ESCALATE_RECOMMENDED",
  "ESCALATED_ACTIVE",
  "MANUAL_REVIEW_REQUIRED",
] as const;
const ROUTING_QUEUE_HEALTH_STATES = ["HEALTHY", "DEGRADED", "SATURATED"] as const;
const ROUTING_FOCUS_STATES = ["APPLY_IMMEDIATELY", "DEFER_REORDER_UNTIL_FOCUS_EXIT"] as const;
const ROUTING_DRAFT_SAFETY_STATES = [
  "NO_DRAFT_LOCK",
  "DRAFT_LOCK_PREVENTS_TRANSFER",
  "COMMAND_PENDING_PREVENTS_TRANSFER",
] as const;

export const WORKFLOW_ITEM_UNRESOLVED_OR_EXTERNAL_AUTHORITY_TRUTH_STATES = [
  "UNKNOWN",
  "PENDING_ACK",
  "PARTIAL_ACK",
  "OUT_OF_BAND",
] as const satisfies readonly WorkflowAuthorityTruthState[];

export const WORKFLOW_ITEM_WAITING_AUTHORITY_TRUTH_STATES = [
  "UNKNOWN",
  "PENDING_ACK",
  "PARTIAL_ACK",
] as const satisfies readonly WorkflowAuthorityTruthState[];

export const WORKFLOW_ITEM_ACTIVE_LIFECYCLE_STATES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CLIENT",
  "WAITING_ON_AUTHORITY",
  "BLOCKED",
] as const satisfies readonly WorkflowItemLifecycleState[];

const DEFAULT_OPENED_AT = "2026-04-29T00:00:00Z";
const WORKFLOW_ITEM_TYPE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const WORKFLOW_TRANSITION_EVENT_PATTERN = /^[a-z][a-z0-9_]*$/;
const WORKFLOW_CUSTOMER_ACTION_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

function modelError(code: WorkflowModelErrorCode, message: string): never {
  throw new WorkflowModelError(code, message);
}

function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    modelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

function normalizeNullableString(label: string, value: unknown) {
  if (value == null) {
    return null;
  }
  return requireString(label, value);
}

function normalizeSortedStringSet(label: string, values: readonly string[] | null | undefined, minItems = 0) {
  try {
    return normalizeStringSet(label, values ?? [], { minItems });
  } catch (error) {
    modelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a valid string set`,
    );
  }
}

function normalizeTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    modelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be an ISO-8601 UTC instant`,
    );
  }
}

function normalizeNullableTimestamp(label: string, value: unknown) {
  if (value == null) {
    return null;
  }
  return normalizeTimestamp(label, value);
}

function earliestNullableTimestamp(label: string, values: readonly (string | null | undefined)[]) {
  const normalized = values
    .filter((value): value is string => value !== null && value !== undefined)
    .map((value) => normalizeTimestamp(label, value))
    .sort();
  return normalized[0] ?? null;
}

function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    modelError("WORKFLOW_FIELD_INVALID", `${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function assertNullableEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (value == null) {
    return null;
  }
  return assertEnum(label, value, allowed);
}

function assertIntegerInRange(label: string, value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    Number.isNaN(value) ||
    value < min ||
    value > max
  ) {
    modelError("WORKFLOW_FIELD_INVALID", `${label} must be an integer in [${min},${max}]`);
  }
  return value;
}

function assertBoolean(label: string, value: unknown) {
  if (typeof value !== "boolean") {
    modelError("WORKFLOW_FIELD_INVALID", `${label} must be boolean`);
  }
  return value;
}

function requireExact<T>(label: string, value: unknown, expected: T): T {
  if (value !== expected) {
    modelError("WORKFLOW_CONTRACT_INVALID", `${label} must stay ${String(expected)}`);
  }
  return expected;
}

function requireArrayExact<T extends readonly string[]>(label: string, value: unknown, expected: T): T {
  if (!Array.isArray(value) || value.length !== expected.length) {
    modelError("WORKFLOW_CONTRACT_INVALID", `${label} must match the frozen contract array`);
  }
  for (const [index, expectedValue] of expected.entries()) {
    if (value[index] !== expectedValue) {
      modelError("WORKFLOW_CONTRACT_INVALID", `${label} must match the frozen contract array`);
    }
  }
  return expected;
}

export function cloneWorkflowRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function workflowStableEqual(left: unknown, right: unknown) {
  return stableJsonHash(left) === stableJsonHash(right);
}

export function hashWorkflowObject(value: unknown) {
  return stableJsonHash(value);
}

export function isWorkflowItemTerminalState(state: WorkflowItemLifecycleState) {
  return TERMINAL_LIFECYCLE_STATES.includes(state as (typeof TERMINAL_LIFECYCLE_STATES)[number]);
}

export function isWorkflowItemActiveState(state: WorkflowItemLifecycleState) {
  return WORKFLOW_ITEM_ACTIVE_LIFECYCLE_STATES.includes(
    state as (typeof WORKFLOW_ITEM_ACTIVE_LIFECYCLE_STATES)[number],
  );
}

export function isWorkflowAuthorityTruthUnresolvedOrExternal(state: WorkflowAuthorityTruthState) {
  return WORKFLOW_ITEM_UNRESOLVED_OR_EXTERNAL_AUTHORITY_TRUTH_STATES.includes(
    state as (typeof WORKFLOW_ITEM_UNRESOLVED_OR_EXTERNAL_AUTHORITY_TRUTH_STATES)[number],
  );
}

export function isWorkflowAuthorityTruthWaiting(state: WorkflowAuthorityTruthState) {
  return WORKFLOW_ITEM_WAITING_AUTHORITY_TRUTH_STATES.includes(
    state as (typeof WORKFLOW_ITEM_WAITING_AUTHORITY_TRUTH_STATES)[number],
  );
}

export function workflowItemRef(item: Pick<WorkflowItem, "item_id">) {
  return `workflow-item://${item.item_id}`;
}

export function workflowItemActiveDedupeKey(
  item: Pick<WorkflowItem, "tenant_id" | "client_id" | "period" | "type" | "dedupe_key">,
) {
  return `${item.tenant_id}:${item.client_id}:${item.period}:${item.type}:${item.dedupe_key}`;
}

export function workflowItemContentFingerprint(item: WorkflowItem) {
  return hashWorkflowObject(item);
}

export function buildWorkflowTruthBoundaryContract(): WorkflowTruthBoundaryContract {
  return {
    artifact_role: "COMMAND_SIDE_AUTHORITY",
    authoritative_record_families: ["RUN_MANIFEST", "WORKFLOW_ITEM", "AUDIT_EVENT"],
    authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY",
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED",
    observable_projection_families: [],
    projection_input_policy: "FORBIDDEN_AS_AUTHORITY",
    recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY",
  };
}

export function buildWorkflowAuthorityTruthContract(): WorkflowAuthorityTruthContract {
  return {
    authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    boundary_scope: "WORKFLOW_ITEM",
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    surface_specific_binding_policy: "WORKFLOW_IS_COORDINATION_ONLY_WITH_EXPLICIT_AUTHORITY_STATE",
    truth_surface_role: "INTERNAL_WORKFLOW_COORDINATION",
    unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
  };
}

export function buildLiveWorkflowExecutionModeBoundaryContract(
  input: Partial<ExecutionModeBoundaryContract> = {},
): ExecutionModeBoundaryContract {
  return normalizeExecutionModeBoundaryContract({
    analysis_only: false,
    boundary_hash: input.boundary_hash ?? "hash.execution-boundary.live-compliance",
    contract_version: "EXECUTION_MODE_BOUNDARY_V1",
    counterfactual_basis: null,
    disclosure_reason_codes: [],
    execution_mode: "COMPLIANCE",
    execution_posture: "LIVE_COMPLIANCE",
    legal_effect_boundary: "COMPLIANCE_CAPABLE",
    non_compliance_config_refs: [],
    replay_class_or_null: null,
    run_kind: input.run_kind ?? "INTERACTIVE",
    ...input,
  });
}

export function normalizeExecutionModeBoundaryContract(
  input: ExecutionModeBoundaryContract,
): ExecutionModeBoundaryContract {
  const contract: ExecutionModeBoundaryContract = {
    analysis_only: assertBoolean("execution_mode_boundary_contract.analysis_only", input.analysis_only),
    boundary_hash: requireString("execution_mode_boundary_contract.boundary_hash", input.boundary_hash),
    contract_version: requireExact(
      "execution_mode_boundary_contract.contract_version",
      input.contract_version,
      "EXECUTION_MODE_BOUNDARY_V1",
    ),
    counterfactual_basis: normalizeNullableString(
      "execution_mode_boundary_contract.counterfactual_basis",
      input.counterfactual_basis,
    ),
    disclosure_reason_codes: normalizeSortedStringSet(
      "execution_mode_boundary_contract.disclosure_reason_codes",
      input.disclosure_reason_codes,
    ),
    execution_mode: assertEnum("execution_mode_boundary_contract.execution_mode", input.execution_mode, [
      "COMPLIANCE",
      "ANALYSIS",
    ] as const),
    execution_posture: assertEnum(
      "execution_mode_boundary_contract.execution_posture",
      input.execution_posture,
      ["LIVE_COMPLIANCE", "LIVE_ANALYSIS", "REPLAY_COMPLIANCE", "REPLAY_COUNTERFACTUAL"] as const,
    ),
    legal_effect_boundary: assertEnum(
      "execution_mode_boundary_contract.legal_effect_boundary",
      input.legal_effect_boundary,
      [
        "COMPLIANCE_CAPABLE",
        "MODELED_READ_ONLY",
        "HISTORICAL_REPLAY_READ_ONLY",
        "COUNTERFACTUAL_REPLAY_READ_ONLY",
      ] as const,
    ),
    non_compliance_config_refs: normalizeSortedStringSet(
      "execution_mode_boundary_contract.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    replay_class_or_null: assertNullableEnum(
      "execution_mode_boundary_contract.replay_class_or_null",
      input.replay_class_or_null,
      ["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS"] as const,
    ),
    run_kind: assertEnum("execution_mode_boundary_contract.run_kind", input.run_kind, [
      "INTERACTIVE",
      "NIGHTLY",
      "BACKFILL",
      "REPLAY",
      "REMEDIATION",
      "AMENDMENT",
      "MIGRATION",
    ] as const),
  };

  if (
    contract.execution_mode === "COMPLIANCE" &&
    (contract.analysis_only ||
      contract.counterfactual_basis !== null ||
      contract.non_compliance_config_refs.length > 0)
  ) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "COMPLIANCE execution boundary must clear analysis-only, counterfactual basis, and non-compliance refs",
    );
  }
  if (contract.execution_mode === "ANALYSIS" && (!contract.analysis_only || contract.counterfactual_basis === null)) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "ANALYSIS execution boundary must carry analysis_only=true and counterfactual_basis",
    );
  }
  if (contract.run_kind === "REPLAY" && contract.replay_class_or_null === null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "REPLAY execution boundary must carry replay_class_or_null");
  }
  if (contract.run_kind !== "REPLAY" && contract.replay_class_or_null !== null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "non-REPLAY execution boundary must clear replay_class_or_null");
  }
  if (
    contract.run_kind !== "REPLAY" &&
    contract.execution_mode === "COMPLIANCE" &&
    (contract.execution_posture !== "LIVE_COMPLIANCE" ||
      contract.legal_effect_boundary !== "COMPLIANCE_CAPABLE")
  ) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "live COMPLIANCE execution boundary must be COMPLIANCE_CAPABLE",
    );
  }
  return contract;
}

export function normalizeWorkflowTruthBoundaryContract(
  input: WorkflowTruthBoundaryContract,
): WorkflowTruthBoundaryContract {
  return {
    artifact_role: requireExact("truth_boundary_contract.artifact_role", input.artifact_role, "COMMAND_SIDE_AUTHORITY"),
    authoritative_record_families: requireArrayExact(
      "truth_boundary_contract.authoritative_record_families",
      input.authoritative_record_families,
      ["RUN_MANIFEST", "WORKFLOW_ITEM", "AUDIT_EVENT"] as const,
    ),
    authoritative_source_policy: requireExact(
      "truth_boundary_contract.authoritative_source_policy",
      input.authoritative_source_policy,
      "DURABLE_COMMAND_RECORDS_ONLY",
    ),
    contract_version: requireExact(
      "truth_boundary_contract.contract_version",
      input.contract_version,
      "COMMAND_TRUTH_BOUNDARY_V1",
    ),
    durable_writeback_policy: requireExact(
      "truth_boundary_contract.durable_writeback_policy",
      input.durable_writeback_policy,
      "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED",
    ),
    observable_projection_families: requireArrayExact(
      "truth_boundary_contract.observable_projection_families",
      input.observable_projection_families,
      [] as const,
    ),
    projection_input_policy: requireExact(
      "truth_boundary_contract.projection_input_policy",
      input.projection_input_policy,
      "FORBIDDEN_AS_AUTHORITY",
    ),
    recovery_basis_policy: requireExact(
      "truth_boundary_contract.recovery_basis_policy",
      input.recovery_basis_policy,
      "MANIFEST_AND_DURABLE_RECORDS_ONLY",
    ),
  };
}

export function normalizeWorkflowAuthorityTruthContract(
  input: WorkflowAuthorityTruthContract,
): WorkflowAuthorityTruthContract {
  return {
    authority_confirmation_policy: requireExact(
      "authority_truth_contract.authority_confirmation_policy",
      input.authority_confirmation_policy,
      "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    ),
    boundary_scope: requireExact("authority_truth_contract.boundary_scope", input.boundary_scope, "WORKFLOW_ITEM"),
    contract_version: requireExact(
      "authority_truth_contract.contract_version",
      input.contract_version,
      "AUTHORITY_TRUTH_V1",
    ),
    correction_propagation_policy: requireExact(
      "authority_truth_contract.correction_propagation_policy",
      input.correction_propagation_policy,
      "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    ),
    mirror_projection_policy: requireExact(
      "authority_truth_contract.mirror_projection_policy",
      input.mirror_projection_policy,
      "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    ),
    non_confirming_state_policy: requireExact(
      "authority_truth_contract.non_confirming_state_policy",
      input.non_confirming_state_policy,
      "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    ),
    normalization_gate_policy: requireExact(
      "authority_truth_contract.normalization_gate_policy",
      input.normalization_gate_policy,
      "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    ),
    override_confirmation_policy: requireExact(
      "authority_truth_contract.override_confirmation_policy",
      input.override_confirmation_policy,
      "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    ),
    surface_specific_binding_policy: requireExact(
      "authority_truth_contract.surface_specific_binding_policy",
      input.surface_specific_binding_policy,
      "WORKFLOW_IS_COORDINATION_ONLY_WITH_EXPLICIT_AUTHORITY_STATE",
    ),
    truth_surface_role: requireExact(
      "authority_truth_contract.truth_surface_role",
      input.truth_surface_role,
      "INTERNAL_WORKFLOW_COORDINATION",
    ),
    unresolved_projection_policy: requireExact(
      "authority_truth_contract.unresolved_projection_policy",
      input.unresolved_projection_policy,
      "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
    ),
  };
}

export function workflowInitialTransitionDefaults(
  lifecycleState: WorkflowItemLifecycleState,
): {
  previous_state_or_null: WorkflowItemLifecycleState | null;
  transition_event_code: WorkflowTransitionEventCode;
} {
  switch (lifecycleState) {
    case "OPEN":
      return { previous_state_or_null: null, transition_event_code: "workflow_item_created" };
    case "IN_PROGRESS":
      return { previous_state_or_null: "OPEN", transition_event_code: "picked_up" };
    case "WAITING_ON_CLIENT":
      return { previous_state_or_null: "IN_PROGRESS", transition_event_code: "needs_client_input" };
    case "WAITING_ON_AUTHORITY":
      return {
        previous_state_or_null: "IN_PROGRESS",
        transition_event_code: "needs_authority_response",
      };
    case "BLOCKED":
      return { previous_state_or_null: "IN_PROGRESS", transition_event_code: "blocked_condition" };
    case "DONE":
      return { previous_state_or_null: "IN_PROGRESS", transition_event_code: "resolved" };
    case "CANCELLED":
      return { previous_state_or_null: "OPEN", transition_event_code: "no_longer_relevant" };
    case "STALE":
      return { previous_state_or_null: "OPEN", transition_event_code: "superseded_by_new_context" };
  }
}

export const WORKFLOW_ITEM_ALLOWED_TRANSITION_TUPLES = [
  ["OPEN", "picked_up", "IN_PROGRESS"],
  ["IN_PROGRESS", "needs_client_input", "WAITING_ON_CLIENT"],
  ["IN_PROGRESS", "needs_authority_response", "WAITING_ON_AUTHORITY"],
  ["IN_PROGRESS", "blocked_condition", "BLOCKED"],
  ["WAITING_ON_CLIENT", "client_response", "IN_PROGRESS"],
  ["WAITING_ON_AUTHORITY", "authority_response", "IN_PROGRESS"],
  ["IN_PROGRESS", "resolved", "DONE"],
  ["OPEN", "no_longer_relevant", "CANCELLED"],
  ["OPEN", "superseded_by_new_context", "STALE"],
] as const satisfies readonly (readonly [
  WorkflowItemLifecycleState,
  WorkflowTransitionEventCode,
  WorkflowItemLifecycleState,
])[];

export function isLegalWorkflowTransitionTuple(input: {
  current_state: WorkflowItemLifecycleState;
  previous_state_or_null: WorkflowItemLifecycleState | null;
  transition_event_code: WorkflowTransitionEventCode;
}) {
  if (
    input.previous_state_or_null === null &&
    input.current_state === "OPEN" &&
    input.transition_event_code === "workflow_item_created"
  ) {
    return true;
  }
  return WORKFLOW_ITEM_ALLOWED_TRANSITION_TUPLES.some(
    ([previous, event, current]) =>
      previous === input.previous_state_or_null &&
      event === input.transition_event_code &&
      current === input.current_state,
  );
}

export function buildWorkflowItemStateTransitionContract(input: {
  current_state: WorkflowItemLifecycleState;
  previous_state_or_null: WorkflowItemLifecycleState | null;
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_event_code: WorkflowTransitionEventCode;
}): WorkflowStateTransitionContract {
  return normalizeWorkflowItemStateTransitionContract({
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    current_state: input.current_state,
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    machine_code: "WORKFLOW_ITEM_LIFECYCLE_V1",
    object_family: "WORKFLOW_ITEM",
    previous_state_or_null: input.previous_state_or_null,
    recovery_supersession_policy: "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    state_field_name: "lifecycle_state",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    transition_application_policy: "NAMED_EVENT_ONLY",
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    transition_event_code: input.transition_event_code,
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  });
}

export function normalizeWorkflowItemStateTransitionContract(
  input: WorkflowStateTransitionContract,
): WorkflowStateTransitionContract {
  const contract: WorkflowStateTransitionContract = {
    audit_evidence_policy: requireExact(
      "state_transition_contract.audit_evidence_policy",
      input.audit_evidence_policy,
      "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    ),
    concurrency_guard_policy: requireExact(
      "state_transition_contract.concurrency_guard_policy",
      input.concurrency_guard_policy,
      "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    ),
    contract_version: requireExact(
      "state_transition_contract.contract_version",
      input.contract_version,
      "STATE_TRANSITION_CONTRACT_V1",
    ),
    current_state: assertEnum("state_transition_contract.current_state", input.current_state, LIFECYCLE_STATES),
    illegal_transition_policy: requireExact(
      "state_transition_contract.illegal_transition_policy",
      input.illegal_transition_policy,
      "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    ),
    machine_code: requireExact(
      "state_transition_contract.machine_code",
      input.machine_code,
      "WORKFLOW_ITEM_LIFECYCLE_V1",
    ),
    object_family: requireExact("state_transition_contract.object_family", input.object_family, "WORKFLOW_ITEM"),
    previous_state_or_null: assertNullableEnum(
      "state_transition_contract.previous_state_or_null",
      input.previous_state_or_null,
      LIFECYCLE_STATES,
    ),
    recovery_supersession_policy: requireExact(
      "state_transition_contract.recovery_supersession_policy",
      input.recovery_supersession_policy,
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    ),
    state_field_name: requireExact(
      "state_transition_contract.state_field_name",
      input.state_field_name,
      "lifecycle_state",
    ),
    terminal_reentry_policy: requireExact(
      "state_transition_contract.terminal_reentry_policy",
      input.terminal_reentry_policy,
      "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    ),
    transition_application_policy: requireExact(
      "state_transition_contract.transition_application_policy",
      input.transition_application_policy,
      "NAMED_EVENT_ONLY",
    ),
    transition_applied_at: normalizeTimestamp(
      "state_transition_contract.transition_applied_at",
      input.transition_applied_at,
    ),
    transition_audit_ref: requireString("state_transition_contract.transition_audit_ref", input.transition_audit_ref),
    transition_event_code: assertEnum("state_transition_contract.transition_event_code", input.transition_event_code, [
      "workflow_item_created",
      "picked_up",
      "needs_client_input",
      "needs_authority_response",
      "blocked_condition",
      "client_response",
      "authority_response",
      "resolved",
      "no_longer_relevant",
      "superseded_by_new_context",
    ] as const),
    typed_rejection_family: requireExact(
      "state_transition_contract.typed_rejection_family",
      input.typed_rejection_family,
      "ILLEGAL_STATE_TRANSITION",
    ),
  };

  if (!WORKFLOW_TRANSITION_EVENT_PATTERN.test(contract.transition_event_code)) {
    modelError("WORKFLOW_STATE_TRANSITION_INVALID", "transition event code must be a lowercase token");
  }
  if (contract.previous_state_or_null === contract.current_state) {
    modelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "state transition previous_state_or_null must not equal current_state",
    );
  }
  if (!isLegalWorkflowTransitionTuple(contract)) {
    modelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "state transition contract must encode a legal WORKFLOW_ITEM tuple or the initial event",
    );
  }
  return contract;
}

export function deriveWorkflowRoutingContractHash(contract: WorkflowRoutingContract) {
  return hashWorkflowObject({
    assignment_efficiency_score: contract.assignment_efficiency_score,
    assignment_recommendation_state: contract.assignment_recommendation_state,
    canonical_sort_key: {
      collaboration_priority_score: contract.canonical_sort_key.collaboration_priority_score,
      effective_due_at_or_null: contract.canonical_sort_key.effective_due_at_or_null,
      escalation_rank: contract.canonical_sort_key.escalation_rank,
      item_id: contract.canonical_sort_key.item_id,
      queue_entered_at: contract.canonical_sort_key.queue_entered_at,
      resolution_confidence_score: contract.canonical_sort_key.resolution_confidence_score,
    },
    collaboration_priority_score: contract.collaboration_priority_score,
    contract_version: contract.contract_version,
    draft_safety_state: contract.draft_safety_state,
    escalation_pressure_score: contract.escalation_pressure_score,
    escalation_pressure_threshold: contract.escalation_pressure_threshold,
    escalation_rank: contract.escalation_rank,
    escalation_recommendation_state: contract.escalation_recommendation_state,
    focused_row_reorder_state: contract.focused_row_reorder_state,
    ordering_reason_codes: contract.ordering_reason_codes,
    ownership_confidence_score: contract.ownership_confidence_score,
    queue_health_floor: contract.queue_health_floor,
    queue_health_score: contract.queue_health_score,
    queue_health_state: contract.queue_health_state,
    queue_pressure_score: contract.queue_pressure_score,
    reassignment_gain_threshold: contract.reassignment_gain_threshold,
    recommendation_reason_codes: contract.recommendation_reason_codes,
    recommended_action_code_or_null: contract.recommended_action_code_or_null,
    recommended_assignee_ref_or_null: contract.recommended_assignee_ref_or_null,
    recommended_escalation_target_ref_or_null: contract.recommended_escalation_target_ref_or_null,
    resolution_confidence_floor: contract.resolution_confidence_floor,
    resolution_confidence_score: contract.resolution_confidence_score,
    routing_profile_code: contract.routing_profile_code,
    routing_profile_hash: contract.routing_profile_hash,
    routing_queue_ref: contract.routing_queue_ref,
    routing_scope: contract.routing_scope,
    sla_pressure_score: contract.sla_pressure_score,
  });
}

export function buildWorkflowRoutingContract(input: {
  assignment_efficiency_score: number;
  collaboration_priority_score: number;
  current_assignee_ref: string | null;
  customer_due_at?: string | null | undefined;
  due_at: string | null;
  effective_due_at_or_null?: string | null | undefined;
  escalation_pressure_score: number;
  escalation_target_ref: string | null;
  item_id: string;
  ownership_confidence_score: number;
  queue_entered_at: string;
  resolution_confidence_score: number;
  routing_queue_ref: string;
  sla_due_at?: string | null | undefined;
  sla_pressure_score: number;
}): WorkflowRoutingContract {
  const escalationRank = input.escalation_target_ref === null ? 0 : 100;
  const effectiveDueAt =
    input.effective_due_at_or_null === undefined
      ? earliestNullableTimestamp("routing_contract.effective_due_at_or_null", [
          input.sla_due_at,
          input.customer_due_at,
          input.due_at,
        ])
      : normalizeNullableTimestamp(
          "routing_contract.effective_due_at_or_null",
          input.effective_due_at_or_null,
        );
  const recommendationReasonCodes =
    input.current_assignee_ref === null
      ? ["NO_CURRENT_OWNER"]
      : input.escalation_target_ref === null
        ? []
        : ["ESCALATION_ACTIVE"];
  const draft: WorkflowRoutingContract = {
    assignment_efficiency_score: input.assignment_efficiency_score,
    assignment_recommendation_state:
      input.current_assignee_ref === null ? "NO_ELIGIBLE_OWNER" : "KEEP_CURRENT_OWNER",
    basis_hash: "",
    canonical_sort_key: {
      collaboration_priority_score: input.collaboration_priority_score,
      effective_due_at_or_null: effectiveDueAt,
      escalation_rank: escalationRank,
      item_id: input.item_id,
      queue_entered_at: input.queue_entered_at,
      resolution_confidence_score: input.resolution_confidence_score,
    },
    collaboration_priority_score: input.collaboration_priority_score,
    contract_version: "COLLABORATION_ROUTING_V1",
    draft_safety_state: "NO_DRAFT_LOCK",
    escalation_pressure_score: input.escalation_pressure_score,
    escalation_pressure_threshold: 75,
    escalation_rank: escalationRank,
    escalation_recommendation_state:
      input.escalation_target_ref === null ? "NO_ESCALATION" : "ESCALATED_ACTIVE",
    focused_row_reorder_state: "APPLY_IMMEDIATELY",
    ordering_reason_codes: ["CANONICAL_PRIORITY_TUPLE"],
    ownership_confidence_score: input.ownership_confidence_score,
    queue_health_floor: 50,
    queue_health_score: 100,
    queue_health_state: "HEALTHY",
    queue_pressure_score: 0,
    reassignment_gain_threshold: 25,
    recommendation_reason_codes: recommendationReasonCodes,
    recommended_action_code_or_null: null,
    recommended_assignee_ref_or_null: null,
    recommended_escalation_target_ref_or_null: input.escalation_target_ref,
    resolution_confidence_floor: 50,
    resolution_confidence_score: input.resolution_confidence_score,
    routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1",
    routing_profile_hash: "hash.collaboration-routing-formula-v1",
    routing_queue_ref: input.routing_queue_ref,
    routing_scope: "WORKFLOW_ITEM",
    sla_pressure_score: input.sla_pressure_score,
  };
  return normalizeWorkflowRoutingContract({
    ...draft,
    basis_hash: deriveWorkflowRoutingContractHash(draft),
  });
}

export function normalizeWorkflowRoutingContract(input: WorkflowRoutingContract): WorkflowRoutingContract {
  const contract: WorkflowRoutingContract = {
    assignment_efficiency_score: assertIntegerInRange(
      "routing_contract.assignment_efficiency_score",
      input.assignment_efficiency_score,
      0,
      100,
    ),
    assignment_recommendation_state: assertEnum(
      "routing_contract.assignment_recommendation_state",
      input.assignment_recommendation_state,
      ROUTING_ASSIGNMENT_RECOMMENDATIONS,
    ),
    basis_hash: requireString("routing_contract.basis_hash", input.basis_hash),
    canonical_sort_key: {
      collaboration_priority_score: assertIntegerInRange(
        "routing_contract.canonical_sort_key.collaboration_priority_score",
        input.canonical_sort_key?.collaboration_priority_score,
        0,
        100,
      ),
      effective_due_at_or_null: normalizeNullableTimestamp(
        "routing_contract.canonical_sort_key.effective_due_at_or_null",
        input.canonical_sort_key?.effective_due_at_or_null,
      ),
      escalation_rank: assertIntegerInRange(
        "routing_contract.canonical_sort_key.escalation_rank",
        input.canonical_sort_key?.escalation_rank,
        0,
        100,
      ),
      item_id: requireString("routing_contract.canonical_sort_key.item_id", input.canonical_sort_key?.item_id),
      queue_entered_at: normalizeTimestamp(
        "routing_contract.canonical_sort_key.queue_entered_at",
        input.canonical_sort_key?.queue_entered_at,
      ),
      resolution_confidence_score: assertIntegerInRange(
        "routing_contract.canonical_sort_key.resolution_confidence_score",
        input.canonical_sort_key?.resolution_confidence_score,
        0,
        100,
      ),
    },
    collaboration_priority_score: assertIntegerInRange(
      "routing_contract.collaboration_priority_score",
      input.collaboration_priority_score,
      0,
      100,
    ),
    contract_version: requireExact(
      "routing_contract.contract_version",
      input.contract_version,
      "COLLABORATION_ROUTING_V1",
    ),
    draft_safety_state: assertEnum(
      "routing_contract.draft_safety_state",
      input.draft_safety_state,
      ROUTING_DRAFT_SAFETY_STATES,
    ),
    escalation_pressure_score: assertIntegerInRange(
      "routing_contract.escalation_pressure_score",
      input.escalation_pressure_score,
      0,
      100,
    ),
    escalation_pressure_threshold: assertIntegerInRange(
      "routing_contract.escalation_pressure_threshold",
      input.escalation_pressure_threshold,
      0,
      100,
    ),
    escalation_rank: assertIntegerInRange("routing_contract.escalation_rank", input.escalation_rank, 0, 100),
    escalation_recommendation_state: assertEnum(
      "routing_contract.escalation_recommendation_state",
      input.escalation_recommendation_state,
      ROUTING_ESCALATION_RECOMMENDATIONS,
    ),
    focused_row_reorder_state: assertEnum(
      "routing_contract.focused_row_reorder_state",
      input.focused_row_reorder_state,
      ROUTING_FOCUS_STATES,
    ),
    ordering_reason_codes: normalizeSortedStringSet("routing_contract.ordering_reason_codes", input.ordering_reason_codes, 1),
    ownership_confidence_score: assertIntegerInRange(
      "routing_contract.ownership_confidence_score",
      input.ownership_confidence_score,
      0,
      100,
    ),
    queue_health_floor: assertIntegerInRange("routing_contract.queue_health_floor", input.queue_health_floor, 0, 100),
    queue_health_score: assertIntegerInRange("routing_contract.queue_health_score", input.queue_health_score, 0, 100),
    queue_health_state: assertEnum(
      "routing_contract.queue_health_state",
      input.queue_health_state,
      ROUTING_QUEUE_HEALTH_STATES,
    ),
    queue_pressure_score: assertIntegerInRange(
      "routing_contract.queue_pressure_score",
      input.queue_pressure_score,
      0,
      100,
    ),
    reassignment_gain_threshold: assertIntegerInRange(
      "routing_contract.reassignment_gain_threshold",
      input.reassignment_gain_threshold,
      0,
      100,
    ),
    recommendation_reason_codes: normalizeSortedStringSet(
      "routing_contract.recommendation_reason_codes",
      input.recommendation_reason_codes,
    ),
    recommended_action_code_or_null: normalizeNullableString(
      "routing_contract.recommended_action_code_or_null",
      input.recommended_action_code_or_null,
    ),
    recommended_assignee_ref_or_null: normalizeNullableString(
      "routing_contract.recommended_assignee_ref_or_null",
      input.recommended_assignee_ref_or_null,
    ),
    recommended_escalation_target_ref_or_null: normalizeNullableString(
      "routing_contract.recommended_escalation_target_ref_or_null",
      input.recommended_escalation_target_ref_or_null,
    ),
    resolution_confidence_floor: assertIntegerInRange(
      "routing_contract.resolution_confidence_floor",
      input.resolution_confidence_floor,
      0,
      100,
    ),
    resolution_confidence_score: assertIntegerInRange(
      "routing_contract.resolution_confidence_score",
      input.resolution_confidence_score,
      0,
      100,
    ),
    routing_profile_code: requireExact(
      "routing_contract.routing_profile_code",
      input.routing_profile_code,
      "COLLABORATION_ROUTING_FORMULA_V1",
    ),
    routing_profile_hash: requireString("routing_contract.routing_profile_hash", input.routing_profile_hash),
    routing_queue_ref: requireString("routing_contract.routing_queue_ref", input.routing_queue_ref),
    routing_scope: requireExact("routing_contract.routing_scope", input.routing_scope, "WORKFLOW_ITEM"),
    sla_pressure_score: assertIntegerInRange("routing_contract.sla_pressure_score", input.sla_pressure_score, 0, 100),
  };

  if (contract.ordering_reason_codes.length > 6 || contract.recommendation_reason_codes.length > 6) {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract reason code arrays must contain at most 6 entries");
  }

  const expectedHash = deriveWorkflowRoutingContractHash(contract);
  if (contract.basis_hash !== expectedHash) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "routing_contract.basis_hash must equal the canonical collaboration-routing contract hash",
    );
  }
  if (contract.queue_pressure_score !== Math.max(0, 100 - contract.queue_health_score)) {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract.queue_pressure_score must equal 100 - queue_health_score");
  }
  if (contract.queue_health_score >= contract.queue_health_floor && contract.queue_health_state !== "HEALTHY") {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract.queue_health_state must be HEALTHY above the floor");
  }
  if (contract.queue_health_score < contract.queue_health_floor && contract.queue_health_state === "HEALTHY") {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract.queue_health_state must leave HEALTHY below the floor");
  }
  if (contract.assignment_recommendation_state === "KEEP_CURRENT_OWNER" && contract.recommended_assignee_ref_or_null !== null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "KEEP_CURRENT_OWNER must clear recommended_assignee_ref_or_null");
  }
  if (
    ["ASSIGN_RECOMMENDED", "REASSIGN_RECOMMENDED"].includes(contract.assignment_recommendation_state) &&
    contract.recommended_assignee_ref_or_null === null
  ) {
    modelError("WORKFLOW_CONTRACT_INVALID", "ownership-change recommendations require recommended_assignee_ref_or_null");
  }
  if (
    ["ASSIGN_RECOMMENDED", "REASSIGN_RECOMMENDED"].includes(contract.assignment_recommendation_state) &&
    contract.recommended_action_code_or_null === null
  ) {
    modelError("WORKFLOW_CONTRACT_INVALID", "ownership-change recommendations require recommended_action_code_or_null");
  }
  if (contract.assignment_recommendation_state === "NO_ELIGIBLE_OWNER" && contract.recommendation_reason_codes.length === 0) {
    modelError("WORKFLOW_CONTRACT_INVALID", "NO_ELIGIBLE_OWNER requires recommendation_reason_codes");
  }
  if (contract.escalation_recommendation_state === "NO_ESCALATION" && contract.recommended_escalation_target_ref_or_null !== null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "NO_ESCALATION must clear recommended_escalation_target_ref_or_null");
  }
  if (
    ["ESCALATE_RECOMMENDED", "ESCALATED_ACTIVE"].includes(contract.escalation_recommendation_state) &&
    contract.recommended_escalation_target_ref_or_null === null
  ) {
    modelError("WORKFLOW_CONTRACT_INVALID", "active escalation posture requires recommended_escalation_target_ref_or_null");
  }
  if (
    contract.escalation_recommendation_state === "ESCALATED_ACTIVE" &&
    contract.recommendation_reason_codes.length === 0
  ) {
    modelError("WORKFLOW_CONTRACT_INVALID", "ESCALATED_ACTIVE requires recommendation_reason_codes");
  }
  if (
    (contract.escalation_recommendation_state === "MANUAL_REVIEW_REQUIRED" ||
      contract.draft_safety_state !== "NO_DRAFT_LOCK") &&
    contract.recommendation_reason_codes.length === 0
  ) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "manual review or non-neutral draft safety posture requires recommendation_reason_codes",
    );
  }
  if (
    contract.recommended_action_code_or_null !== null &&
    !WORKFLOW_CUSTOMER_ACTION_CODE_PATTERN.test(contract.recommended_action_code_or_null)
  ) {
    modelError("WORKFLOW_CONTRACT_INVALID", "recommended_action_code_or_null must be an uppercase action token");
  }
  return contract;
}

export function deriveWorkflowCustomerStatusProjection(input: {
  collaboration_visibility: WorkflowItemVisibility;
  lifecycle_state: WorkflowItemLifecycleState;
}) {
  if (input.collaboration_visibility === "INTERNAL_ONLY") {
    return null;
  }
  switch (input.lifecycle_state) {
    case "OPEN":
    case "IN_PROGRESS":
    case "BLOCKED":
      return "UNDER_REVIEW";
    case "WAITING_ON_CLIENT":
      return "ACTION_REQUIRED";
    case "WAITING_ON_AUTHORITY":
      return "WAITING_ON_CONFIRMATION";
    case "DONE":
      return "RESOLVED";
    case "CANCELLED":
    case "STALE":
      return "CLOSED";
  }
}

function defaultWaitingActorForLifecycle(state: WorkflowItemLifecycleState): WorkflowWaitingOnActor {
  switch (state) {
    case "OPEN":
    case "DONE":
    case "CANCELLED":
    case "STALE":
      return "NONE";
    case "WAITING_ON_CLIENT":
      return "CUSTOMER";
    case "WAITING_ON_AUTHORITY":
      return "AUTHORITY";
    case "BLOCKED":
      return "SYSTEM";
    case "IN_PROGRESS":
      return "STAFF";
  }
}

function defaultAuthorityTruthStateForLifecycle(state: WorkflowItemLifecycleState): WorkflowAuthorityTruthState {
  if (state === "WAITING_ON_AUTHORITY") {
    return "UNKNOWN";
  }
  return "NOT_REQUESTED";
}

function deriveAssignmentState(input: {
  current_assignee_ref: string | null;
  escalation_target_ref: string | null;
}) {
  if (input.escalation_target_ref !== null) {
    return "ESCALATED";
  }
  if (input.current_assignee_ref !== null) {
    return "ASSIGNED";
  }
  return "UNASSIGNED";
}

export function buildWorkflowItem(input: WorkflowItemInput): WorkflowItem {
  const openedAt = normalizeTimestamp("opened_at", input.opened_at ?? DEFAULT_OPENED_AT);
  const lifecycleState = assertEnum("lifecycle_state", input.lifecycle_state ?? "OPEN", LIFECYCLE_STATES);
  const transitionDefaults = workflowInitialTransitionDefaults(lifecycleState);
  const transitionAppliedAt = normalizeTimestamp(
    "state_transition_contract.transition_applied_at",
    input.state_transition_contract?.transition_applied_at ?? openedAt,
  );
  const visibility = assertEnum(
    "collaboration_visibility",
    input.collaboration_visibility ??
      (lifecycleState === "WAITING_ON_CLIENT" ? "CUSTOMER_SHARED" : "INTERNAL_ONLY"),
    VISIBILITIES,
  );
  const authorityTruthState = assertEnum(
    "authority_truth_state",
    input.authority_truth_state ?? defaultAuthorityTruthStateForLifecycle(lifecycleState),
    AUTHORITY_TRUTH_STATES,
  );
  const currentAssigneeRef = normalizeNullableString("current_assignee_ref", input.current_assignee_ref ?? null);
  const escalationTargetRef = normalizeNullableString("escalation_target_ref", input.escalation_target_ref ?? null);
  const assignmentState = assertEnum(
    "assignment_state",
    input.assignment_state ?? deriveAssignmentState({ current_assignee_ref: currentAssigneeRef, escalation_target_ref: escalationTargetRef }),
    ASSIGNMENT_STATES,
  );
  const queueEnteredAt = normalizeTimestamp("queue_entered_at", input.queue_entered_at ?? openedAt);
  const waitingOnActor = assertEnum(
    "waiting_on_actor",
    input.waiting_on_actor ?? defaultWaitingActorForLifecycle(lifecycleState),
    WAITING_ACTORS,
  );
  const customerStatusProjection =
    input.customer_status_projection === undefined
      ? deriveWorkflowCustomerStatusProjection({
          collaboration_visibility: visibility,
          lifecycle_state: lifecycleState,
        })
      : assertNullableEnum("customer_status_projection", input.customer_status_projection, CUSTOMER_PROJECTIONS);
  const activeRequestInfoRef =
    input.active_request_info_ref === undefined && lifecycleState === "WAITING_ON_CLIENT"
      ? `request-info://${input.item_id}/1`
      : normalizeNullableString("active_request_info_ref", input.active_request_info_ref ?? null);
  const closedAt =
    input.closed_at === undefined && isWorkflowItemTerminalState(lifecycleState)
      ? transitionAppliedAt
      : normalizeNullableTimestamp("closed_at", input.closed_at ?? null);
  const dueAt = normalizeNullableTimestamp("due_at", input.due_at ?? null);

  const draft: Omit<WorkflowItem, "routing_contract"> & {
    routing_contract?: WorkflowRoutingContract;
  } = {
    active_request_info_ref: activeRequestInfoRef,
    artifact_type: "WorkflowItem",
    assignment_efficiency_score: assertIntegerInRange(
      "assignment_efficiency_score",
      input.assignment_efficiency_score ?? 50,
      0,
      100,
    ),
    assignment_state: assignmentState,
    authority_truth_contract: normalizeWorkflowAuthorityTruthContract(
      input.authority_truth_contract ?? buildWorkflowAuthorityTruthContract(),
    ),
    authority_truth_state: authorityTruthState,
    client_id: requireString("client_id", input.client_id),
    closed_at: closedAt,
    collaboration_priority_score: assertIntegerInRange(
      "collaboration_priority_score",
      input.collaboration_priority_score ?? 50,
      0,
      100,
    ),
    collaboration_visibility: visibility,
    context_refs: normalizeSortedStringSet("context_refs", input.context_refs ?? []),
    current_assignee_ref: currentAssigneeRef,
    customer_due_at: normalizeNullableTimestamp("customer_due_at", input.customer_due_at ?? null),
    customer_status_projection: customerStatusProjection,
    customer_thread_ref:
      input.customer_thread_ref === undefined && visibility === "CUSTOMER_SHARED"
        ? `collaboration-thread://customer/${input.item_id}`
        : normalizeNullableString("customer_thread_ref", input.customer_thread_ref ?? null),
    customer_workspace_version: assertIntegerInRange(
      "customer_workspace_version",
      input.customer_workspace_version ?? (visibility === "CUSTOMER_SHARED" ? 1 : 0),
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    dedupe_key: requireString("dedupe_key", input.dedupe_key),
    due_at: dueAt,
    due_state: assertNullableEnum("due_state", input.due_state ?? (dueAt === null ? null : "ON_TRACK"), DUE_STATES),
    escalation_pressure_score: assertIntegerInRange("escalation_pressure_score", input.escalation_pressure_score ?? 0, 0, 100),
    escalation_target_ref: escalationTargetRef,
    execution_mode_boundary_contract: normalizeExecutionModeBoundaryContract(
      input.execution_mode_boundary_contract ?? buildLiveWorkflowExecutionModeBoundaryContract(),
    ),
    internal_thread_ref: requireString(
      "internal_thread_ref",
      input.internal_thread_ref ?? `collaboration-thread://internal/${input.item_id}`,
    ),
    item_id: requireString("item_id", input.item_id),
    last_assignment_at:
      input.last_assignment_at === undefined && currentAssigneeRef !== null
        ? queueEnteredAt
        : normalizeNullableTimestamp("last_assignment_at", input.last_assignment_at ?? null),
    last_customer_activity_at: normalizeNullableTimestamp("last_customer_activity_at", input.last_customer_activity_at ?? null),
    last_customer_visible_event_ref: normalizeNullableString(
      "last_customer_visible_event_ref",
      input.last_customer_visible_event_ref ?? null,
    ),
    last_internal_activity_at: normalizeNullableTimestamp("last_internal_activity_at", input.last_internal_activity_at ?? null),
    last_internal_event_ref: normalizeNullableString("last_internal_event_ref", input.last_internal_event_ref ?? null),
    lifecycle_state: lifecycleState,
    next_request_info_ordinal: assertIntegerInRange(
      "next_request_info_ordinal",
      input.next_request_info_ordinal ?? (activeRequestInfoRef === null ? 1 : 2),
      1,
      Number.MAX_SAFE_INTEGER,
    ),
    ownership_confidence_score: assertIntegerInRange("ownership_confidence_score", input.ownership_confidence_score ?? 50, 0, 100),
    period: requireString("period", input.period),
    priority: assertEnum("priority", input.priority ?? "NORMAL", PRIORITIES),
    queue_entered_at: queueEnteredAt,
    reassignment_count_30d: assertIntegerInRange(
      "reassignment_count_30d",
      input.reassignment_count_30d ?? 0,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    resolution_confidence_score: assertIntegerInRange(
      "resolution_confidence_score",
      input.resolution_confidence_score ?? 50,
      0,
      100,
    ),
    routing_queue_ref: requireString("routing_queue_ref", input.routing_queue_ref),
    sla_due_at: normalizeNullableTimestamp("sla_due_at", input.sla_due_at ?? null),
    sla_policy_ref: normalizeNullableString("sla_policy_ref", input.sla_policy_ref ?? null),
    sla_pressure_score: assertIntegerInRange("sla_pressure_score", input.sla_pressure_score ?? 0, 0, 100),
    staff_workspace_version: assertIntegerInRange(
      "staff_workspace_version",
      input.staff_workspace_version ?? 1,
      1,
      Number.MAX_SAFE_INTEGER,
    ),
    state_transition_contract: normalizeWorkflowItemStateTransitionContract(
      input.state_transition_contract ??
        buildWorkflowItemStateTransitionContract({
          current_state: lifecycleState,
          previous_state_or_null: transitionDefaults.previous_state_or_null,
          transition_applied_at: transitionAppliedAt,
          transition_audit_ref: `audit://workflow-item/${input.item_id}/${transitionDefaults.transition_event_code}`,
          transition_event_code: transitionDefaults.transition_event_code,
        }),
    ),
    tenant_id: requireString("tenant_id", input.tenant_id),
    title: requireString("title", input.title),
    truth_boundary_contract: normalizeWorkflowTruthBoundaryContract(
      input.truth_boundary_contract ?? buildWorkflowTruthBoundaryContract(),
    ),
    type: requireString("type", input.type),
    waiting_on_actor: waitingOnActor,
    waiting_since_at: normalizeTimestamp("waiting_since_at", input.waiting_since_at ?? openedAt),
  };

  return normalizeWorkflowItem(
    input.routing_contract === undefined
      ? draft
      : {
          ...draft,
          routing_contract: input.routing_contract,
        },
  );
}

export function normalizeWorkflowItem(
  input: Omit<WorkflowItem, "routing_contract"> & {
    routing_contract?: WorkflowRoutingContract;
  },
): WorkflowItem {
  const itemWithoutRouting: Omit<WorkflowItem, "routing_contract"> = {
    active_request_info_ref: normalizeNullableString("active_request_info_ref", input.active_request_info_ref),
    artifact_type: requireExact("artifact_type", input.artifact_type, "WorkflowItem"),
    assignment_efficiency_score: assertIntegerInRange("assignment_efficiency_score", input.assignment_efficiency_score, 0, 100),
    assignment_state: assertEnum("assignment_state", input.assignment_state, ASSIGNMENT_STATES),
    authority_truth_contract: normalizeWorkflowAuthorityTruthContract(input.authority_truth_contract),
    authority_truth_state: assertEnum("authority_truth_state", input.authority_truth_state, AUTHORITY_TRUTH_STATES),
    client_id: requireString("client_id", input.client_id),
    closed_at: normalizeNullableTimestamp("closed_at", input.closed_at),
    collaboration_priority_score: assertIntegerInRange("collaboration_priority_score", input.collaboration_priority_score, 0, 100),
    collaboration_visibility: assertEnum("collaboration_visibility", input.collaboration_visibility, VISIBILITIES),
    context_refs: normalizeSortedStringSet("context_refs", input.context_refs),
    current_assignee_ref: normalizeNullableString("current_assignee_ref", input.current_assignee_ref),
    customer_due_at: normalizeNullableTimestamp("customer_due_at", input.customer_due_at),
    customer_status_projection: assertNullableEnum("customer_status_projection", input.customer_status_projection, CUSTOMER_PROJECTIONS),
    customer_thread_ref: normalizeNullableString("customer_thread_ref", input.customer_thread_ref),
    customer_workspace_version: assertIntegerInRange(
      "customer_workspace_version",
      input.customer_workspace_version,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    dedupe_key: requireString("dedupe_key", input.dedupe_key),
    due_at: normalizeNullableTimestamp("due_at", input.due_at),
    due_state: assertNullableEnum("due_state", input.due_state, DUE_STATES),
    escalation_pressure_score: assertIntegerInRange("escalation_pressure_score", input.escalation_pressure_score, 0, 100),
    escalation_target_ref: normalizeNullableString("escalation_target_ref", input.escalation_target_ref),
    execution_mode_boundary_contract: normalizeExecutionModeBoundaryContract(input.execution_mode_boundary_contract),
    internal_thread_ref: requireString("internal_thread_ref", input.internal_thread_ref),
    item_id: requireString("item_id", input.item_id),
    last_assignment_at: normalizeNullableTimestamp("last_assignment_at", input.last_assignment_at),
    last_customer_activity_at: normalizeNullableTimestamp("last_customer_activity_at", input.last_customer_activity_at),
    last_customer_visible_event_ref: normalizeNullableString(
      "last_customer_visible_event_ref",
      input.last_customer_visible_event_ref,
    ),
    last_internal_activity_at: normalizeNullableTimestamp("last_internal_activity_at", input.last_internal_activity_at),
    last_internal_event_ref: normalizeNullableString("last_internal_event_ref", input.last_internal_event_ref),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, LIFECYCLE_STATES),
    next_request_info_ordinal: assertIntegerInRange(
      "next_request_info_ordinal",
      input.next_request_info_ordinal,
      1,
      Number.MAX_SAFE_INTEGER,
    ),
    ownership_confidence_score: assertIntegerInRange("ownership_confidence_score", input.ownership_confidence_score, 0, 100),
    period: requireString("period", input.period),
    priority: assertEnum("priority", input.priority, PRIORITIES),
    queue_entered_at: normalizeTimestamp("queue_entered_at", input.queue_entered_at),
    reassignment_count_30d: assertIntegerInRange(
      "reassignment_count_30d",
      input.reassignment_count_30d,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    resolution_confidence_score: assertIntegerInRange("resolution_confidence_score", input.resolution_confidence_score, 0, 100),
    routing_queue_ref: requireString("routing_queue_ref", input.routing_queue_ref),
    sla_due_at: normalizeNullableTimestamp("sla_due_at", input.sla_due_at),
    sla_policy_ref: normalizeNullableString("sla_policy_ref", input.sla_policy_ref),
    sla_pressure_score: assertIntegerInRange("sla_pressure_score", input.sla_pressure_score, 0, 100),
    staff_workspace_version: assertIntegerInRange("staff_workspace_version", input.staff_workspace_version, 1, Number.MAX_SAFE_INTEGER),
    state_transition_contract: normalizeWorkflowItemStateTransitionContract(input.state_transition_contract),
    tenant_id: requireString("tenant_id", input.tenant_id),
    title: requireString("title", input.title),
    truth_boundary_contract: normalizeWorkflowTruthBoundaryContract(input.truth_boundary_contract),
    type: requireString("type", input.type),
    waiting_on_actor: assertEnum("waiting_on_actor", input.waiting_on_actor, WAITING_ACTORS),
    waiting_since_at: normalizeTimestamp("waiting_since_at", input.waiting_since_at),
  };

  if (!WORKFLOW_ITEM_TYPE_PATTERN.test(itemWithoutRouting.type)) {
    modelError("WORKFLOW_FIELD_INVALID", "type must be an uppercase workflow item type token");
  }

  const routingContract = normalizeWorkflowRoutingContract(
    input.routing_contract ??
      buildWorkflowRoutingContract({
        assignment_efficiency_score: itemWithoutRouting.assignment_efficiency_score,
        collaboration_priority_score: itemWithoutRouting.collaboration_priority_score,
        current_assignee_ref: itemWithoutRouting.current_assignee_ref,
        customer_due_at: itemWithoutRouting.customer_due_at,
        due_at: itemWithoutRouting.due_at,
        escalation_pressure_score: itemWithoutRouting.escalation_pressure_score,
        escalation_target_ref: itemWithoutRouting.escalation_target_ref,
        item_id: itemWithoutRouting.item_id,
        ownership_confidence_score: itemWithoutRouting.ownership_confidence_score,
        queue_entered_at: itemWithoutRouting.queue_entered_at,
        resolution_confidence_score: itemWithoutRouting.resolution_confidence_score,
        routing_queue_ref: itemWithoutRouting.routing_queue_ref,
        sla_due_at: itemWithoutRouting.sla_due_at,
        sla_pressure_score: itemWithoutRouting.sla_pressure_score,
      }),
  );

  const item: WorkflowItem = {
    ...itemWithoutRouting,
    routing_contract: routingContract,
  };
  assertWorkflowItemInvariants(item);
  return item;
}

export function assertWorkflowItemInvariants(item: WorkflowItem) {
  if (item.state_transition_contract.current_state !== item.lifecycle_state) {
    modelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "state_transition_contract.current_state must mirror lifecycle_state",
    );
  }
  if (item.due_state === null && item.due_at !== null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "due_state=null must force due_at=null");
  }
  if (item.due_state !== null && item.due_at === null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "non-null due_state requires due_at");
  }
  if (item.collaboration_visibility === "INTERNAL_ONLY") {
    if (
      item.customer_status_projection !== null ||
      item.customer_due_at !== null ||
      item.customer_thread_ref !== null ||
      item.customer_workspace_version !== 0 ||
      item.last_customer_activity_at !== null ||
      item.last_customer_visible_event_ref !== null
    ) {
      modelError(
        "WORKFLOW_CONTRACT_INVALID",
        "INTERNAL_ONLY workflow items must clear customer projection, due date, thread, version, and activity fields",
      );
    }
  }
  if (item.customer_status_projection !== null && item.collaboration_visibility !== "CUSTOMER_SHARED") {
    modelError("WORKFLOW_CONTRACT_INVALID", "customer_status_projection requires CUSTOMER_SHARED visibility");
  }
  if (item.collaboration_visibility === "CUSTOMER_SHARED") {
    if (item.customer_status_projection === null || item.customer_thread_ref === null) {
      modelError("WORKFLOW_CONTRACT_INVALID", "CUSTOMER_SHARED workflow items require projection and customer_thread_ref");
    }
    if (item.customer_workspace_version > item.staff_workspace_version) {
      modelError("WORKFLOW_STALE_VERSION", "customer_workspace_version must not exceed staff_workspace_version");
    }
  }
  if ((item.last_customer_activity_at === null) !== (item.last_customer_visible_event_ref === null)) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "last_customer_activity_at and last_customer_visible_event_ref must appear together",
    );
  }
  if ((item.last_internal_activity_at === null) !== (item.last_internal_event_ref === null)) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "last_internal_activity_at and last_internal_event_ref must appear together",
    );
  }
  if (item.assignment_state === "UNASSIGNED") {
    if (item.current_assignee_ref !== null || item.escalation_target_ref !== null || item.last_assignment_at !== null) {
      modelError("WORKFLOW_CONTRACT_INVALID", "UNASSIGNED items must clear assignee, escalation target, and assignment time");
    }
  }
  if (item.assignment_state === "ASSIGNED") {
    if (item.current_assignee_ref === null || item.escalation_target_ref !== null || item.last_assignment_at === null) {
      modelError("WORKFLOW_CONTRACT_INVALID", "ASSIGNED items require assignee, no escalation target, and assignment time");
    }
  }
  if (item.assignment_state === "ESCALATED") {
    if (item.current_assignee_ref === null || item.escalation_target_ref === null || item.last_assignment_at === null) {
      modelError("WORKFLOW_CONTRACT_INVALID", "ESCALATED items require assignee, escalation target, and assignment time");
    }
  }
  if (item.lifecycle_state === "WAITING_ON_CLIENT") {
    if (
      item.collaboration_visibility !== "CUSTOMER_SHARED" ||
      item.waiting_on_actor !== "CUSTOMER" ||
      item.active_request_info_ref === null ||
      item.customer_status_projection !== "ACTION_REQUIRED"
    ) {
      modelError(
        "WORKFLOW_CONTRACT_INVALID",
        "WAITING_ON_CLIENT requires CUSTOMER_SHARED, waiting_on_actor=CUSTOMER, active_request_info_ref, and ACTION_REQUIRED projection",
      );
    }
  }
  if (item.active_request_info_ref !== null) {
    if (item.waiting_on_actor !== "CUSTOMER" || item.lifecycle_state !== "WAITING_ON_CLIENT") {
      modelError("WORKFLOW_CONTRACT_INVALID", "active_request_info_ref forces CUSTOMER/WAITING_ON_CLIENT posture");
    }
  }
  if (item.waiting_on_actor === "CUSTOMER") {
    if (item.lifecycle_state !== "WAITING_ON_CLIENT" || item.active_request_info_ref === null) {
      modelError("WORKFLOW_CONTRACT_INVALID", "waiting_on_actor=CUSTOMER requires WAITING_ON_CLIENT and active_request_info_ref");
    }
  } else if (item.active_request_info_ref !== null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "active_request_info_ref must clear when not waiting on CUSTOMER");
  }
  if (item.waiting_on_actor === "AUTHORITY" && item.lifecycle_state !== "WAITING_ON_AUTHORITY") {
    modelError("WORKFLOW_CONTRACT_INVALID", "waiting_on_actor=AUTHORITY requires WAITING_ON_AUTHORITY");
  }
  if (item.lifecycle_state === "WAITING_ON_AUTHORITY") {
    if (item.waiting_on_actor !== "AUTHORITY" || !isWorkflowAuthorityTruthWaiting(item.authority_truth_state)) {
      modelError(
        "WORKFLOW_CONTRACT_INVALID",
        "WAITING_ON_AUTHORITY requires waiting_on_actor=AUTHORITY and UNKNOWN/PENDING_ACK/PARTIAL_ACK authority truth",
      );
    }
  }
  if (item.authority_truth_state === "CONFIRMED" && item.waiting_on_actor === "AUTHORITY") {
    modelError("WORKFLOW_CONTRACT_INVALID", "CONFIRMED authority truth must clear waiting_on_actor=AUTHORITY");
  }
  if (isWorkflowItemTerminalState(item.lifecycle_state)) {
    if (item.closed_at === null || item.waiting_on_actor !== "NONE") {
      modelError("WORKFLOW_CONTRACT_INVALID", "terminal workflow items require closed_at and waiting_on_actor=NONE");
    }
  } else if (item.closed_at !== null) {
    modelError("WORKFLOW_CONTRACT_INVALID", "non-terminal workflow items must keep closed_at=null");
  }

  const expectedProjection = deriveWorkflowCustomerStatusProjection({
    collaboration_visibility: item.collaboration_visibility,
    lifecycle_state: item.lifecycle_state,
  });
  if (item.customer_status_projection !== expectedProjection) {
    modelError("WORKFLOW_CONTRACT_INVALID", "customer_status_projection must derive from lifecycle_state and visibility");
  }
  if (
    item.customer_status_projection === "WAITING_ON_CONFIRMATION" &&
    !isWorkflowAuthorityTruthWaiting(item.authority_truth_state)
  ) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "WAITING_ON_CONFIRMATION requires UNKNOWN/PENDING_ACK/PARTIAL_ACK authority truth",
    );
  }
  if (isWorkflowAuthorityTruthUnresolvedOrExternal(item.authority_truth_state)) {
    if (item.lifecycle_state === "DONE" || item.customer_status_projection === "RESOLVED") {
      modelError(
        "WORKFLOW_CONTRACT_INVALID",
        "unresolved or out-of-band authority truth cannot render internal DONE or customer RESOLVED semantics",
      );
    }
  }
  if (item.execution_mode_boundary_contract.legal_effect_boundary !== "COMPLIANCE_CAPABLE") {
    if (
      item.lifecycle_state === "WAITING_ON_AUTHORITY" ||
      item.waiting_on_actor === "AUTHORITY" ||
      item.customer_status_projection === "WAITING_ON_CONFIRMATION" ||
      !["NOT_APPLICABLE", "NOT_REQUESTED", "UNKNOWN"].includes(item.authority_truth_state)
    ) {
      modelError(
        "WORKFLOW_CONTRACT_INVALID",
        "modeled or replay-only workflow items cannot use live authority-waiting posture",
      );
    }
  }
  if (item.routing_contract.routing_queue_ref !== item.routing_queue_ref) {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract.routing_queue_ref must mirror routing_queue_ref");
  }
  if (item.routing_contract.canonical_sort_key.item_id !== item.item_id) {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract.canonical_sort_key.item_id must mirror item_id");
  }
  if (item.routing_contract.canonical_sort_key.queue_entered_at !== item.queue_entered_at) {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract.canonical_sort_key.queue_entered_at must mirror queue_entered_at");
  }
  const expectedEffectiveDueAt = earliestNullableTimestamp("routing_contract.effective_due_at_or_null", [
    item.sla_due_at,
    item.customer_due_at,
    item.due_at,
  ]);
  if (item.routing_contract.canonical_sort_key.effective_due_at_or_null !== expectedEffectiveDueAt) {
    modelError("WORKFLOW_CONTRACT_INVALID", "routing_contract effective due date must mirror the min non-null due instant");
  }
  for (const field of [
    "assignment_efficiency_score",
    "ownership_confidence_score",
    "sla_pressure_score",
    "escalation_pressure_score",
    "collaboration_priority_score",
    "resolution_confidence_score",
  ] as const) {
    if (item.routing_contract[field] !== item[field]) {
      modelError("WORKFLOW_CONTRACT_INVALID", `routing_contract.${field} must mirror ${field}`);
    }
  }
  if (
    item.current_assignee_ref === null &&
    !["ASSIGN_RECOMMENDED", "NO_ELIGIBLE_OWNER"].includes(item.routing_contract.assignment_recommendation_state)
  ) {
    modelError(
      "WORKFLOW_CONTRACT_INVALID",
      "unassigned workflow items require assign recommended or no eligible owner routing posture",
    );
  }
  if (
    item.current_assignee_ref !== null &&
    item.routing_contract.assignment_recommendation_state === "ASSIGN_RECOMMENDED"
  ) {
    modelError("WORKFLOW_CONTRACT_INVALID", "assigned workflow items must not publish ASSIGN_RECOMMENDED");
  }
  if (item.escalation_target_ref !== null) {
    if (
      item.routing_contract.escalation_recommendation_state !== "ESCALATED_ACTIVE" ||
      item.routing_contract.recommended_escalation_target_ref_or_null !== item.escalation_target_ref
    ) {
      modelError("WORKFLOW_CONTRACT_INVALID", "active escalation must mirror into routing_contract");
    }
  } else if (item.routing_contract.escalation_recommendation_state === "ESCALATED_ACTIVE") {
    modelError("WORKFLOW_CONTRACT_INVALID", "ESCALATED_ACTIVE requires escalation_target_ref");
  }
  return item;
}

export function assertWorkflowItemMutable(item: WorkflowItem) {
  if (isWorkflowItemTerminalState(item.lifecycle_state)) {
    modelError("WORKFLOW_ITEM_IMMUTABLE", "DONE, CANCELLED, and STALE workflow items are immutable");
  }
}
