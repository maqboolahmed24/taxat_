import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash, sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

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

export type StateTransitionContract = {
  audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF";
  concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE";
  contract_version: "STATE_TRANSITION_CONTRACT_V1";
  current_state: string;
  illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE";
  machine_code:
    | "FILING_CASE_LIFECYCLE_V1"
    | "FILING_PACKET_LIFECYCLE_V1"
    | "SUBMISSION_RECORD_LIFECYCLE_V1";
  object_family: "FILING_CASE" | "FILING_PACKET" | "SUBMISSION_RECORD";
  previous_state_or_null: string | null;
  recovery_supersession_policy: "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE";
  state_field_name: "lifecycle_state";
  terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE";
  transition_application_policy: "NAMED_EVENT_ONLY";
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_event_code: string;
  typed_rejection_family: "ILLEGAL_STATE_TRANSITION";
};

export type AuthorityTruthContract = {
  authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM";
  boundary_scope:
    | "AUTHORITY_INTERACTION_RECORD"
    | "AUTHORITY_INGRESS_RECEIPT"
    | "SUBMISSION_RECORD"
    | "OBLIGATION_MIRROR"
    | "WORKFLOW_ITEM"
    | "CLIENT_TIMELINE_EVENT";
  contract_version: "AUTHORITY_TRUTH_V1";
  correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE";
  mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY";
  non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING";
  normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION";
  override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM";
  surface_specific_binding_policy:
    | "INTERACTION_RESPONSE_MEANING_CONTROLS_SETTLEMENT"
    | "INGRESS_RECEIPT_MUST_NOT_DECIDE_TRUTH_UNTIL_BOUND"
    | "SUBMISSION_LEDGER_IS_AUTHORITY_RESULT_ONLY"
    | "MIRROR_IS_INTERNAL_VIEW_WITH_EXPLICIT_AUTHORITY_STATE"
    | "WORKFLOW_IS_COORDINATION_ONLY_WITH_EXPLICIT_AUTHORITY_STATE"
    | "TIMELINE_IS_CUSTOMER_SAFE_AND_EXPLICIT_ABOUT_AUTHORITY_STATE";
  truth_surface_role:
    | "AUTHORITY_RUNTIME_LEDGER"
    | "AUTHORITY_INGRESS_CHECKPOINT"
    | "AUTHORITY_SETTLEMENT_LEDGER"
    | "INTERNAL_OBLIGATION_MIRROR"
    | "INTERNAL_WORKFLOW_COORDINATION"
    | "CUSTOMER_SAFE_STATUS_PROJECTION";
  unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED";
};

export type AuthorityLayerBoundaryContract = {
  active_principal_class: "HUMAN" | "SERVICE" | "EXTERNAL";
  authority_link_state:
    | "NOT_REQUIRED"
    | "UNLINKED"
    | "LINK_INITIATED"
    | "AUTHORISED_ACTIVE"
    | "AUTHORISED_LIMITED"
    | "TOKEN_INVALID"
    | "REVOKED"
    | "EXPIRED"
    | "SUPERSEDED";
  authority_truth_precedence_policy: "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION";
  binding_scope_class:
    | "AUTHORIZATION_DECISION"
    | "GOVERNANCE_ACCESS_SIMULATION"
    | "AUTHORITY_BINDING"
    | "AUTHORITY_OPERATION"
    | "AUTHORITY_REQUEST_ENVELOPE";
  client_delegation_state: "NOT_REQUIRED" | "SATISFIED" | "LIMITED" | "MISSING" | "EXPIRED";
  contract_version: "AUTHORITY_LAYER_BOUNDARY_V1";
  delegation_basis:
    | "SELF_ACTING"
    | "CLIENT_GRANTED"
    | "SELF_ASSESSMENT_IMPORTED"
    | "DIGITAL_HANDSHAKE"
    | "TENANT_INTERNAL"
    | "SYSTEM_ASSIGNED";
  delegation_freshness_state: "NOT_APPLICABLE" | "CURRENT" | "REVALIDATION_REQUIRED";
  exceptional_authority_may_override_authority_truth: false;
  exceptional_authority_may_substitute_for_delegation: false;
  exceptional_authority_may_widen_client_scope: false;
  exceptional_authority_may_widen_partition_scope: false;
  exceptional_authority_state: "NOT_APPLICABLE" | "BOUNDED_INTERNAL_EXCEPTION";
  exceptional_scope_policy: "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS";
  human_gate_requirement:
    | "NOT_REQUIRED"
    | "REQUIRE_STEP_UP"
    | "REQUIRE_APPROVAL"
    | "REQUIRE_STEP_UP_AND_APPROVAL";
  human_gate_resolution_state: "NOT_REQUIRED" | "PENDING_EVIDENCE" | "EVIDENCE_FROZEN";
  integration_capability: "INTERNAL_ONLY" | "AUTHORITY_INTEGRATED";
  link_delegation_independence_policy: "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION";
  service_human_gate_satisfaction_permitted: false;
  tenant_permission_state: "SATISFIED" | "MASKED" | "DENIED";
  tenant_permission_substitution_policy: "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION";
};

export type AuthorityTruthState =
  | "NOT_APPLICABLE"
  | "NOT_REQUESTED"
  | "UNKNOWN"
  | "PENDING_ACK"
  | "PARTIAL_ACK"
  | "CONFIRMED"
  | "REJECTED"
  | "OUT_OF_BAND";

export type SubmissionLifecycleState =
  | "INTENT_RECORDED"
  | "TRANSMIT_PENDING"
  | "TRANSMITTED"
  | "PENDING_ACK"
  | "CONFIRMED"
  | "REJECTED"
  | "UNKNOWN"
  | "OUT_OF_BAND"
  | "SUPERSEDED";

export type AuthorityIngressProofContract = {
  authenticated_channel_state: "NOT_APPLICABLE" | "AUTHENTICATED" | "FAILED";
  authentication_evidence_modes: (
    | "CALLBACK_SIGNATURE_VERIFIED"
    | "CALLBACK_MTLS_VERIFIED"
    | "SOURCE_ALLOWLIST_VERIFIED"
    | "POLL_CREDENTIAL_VERIFIED"
    | "INBOX_DELIVERY_CREDENTIAL_VERIFIED"
    | "WORKER_ATTESTATION_VERIFIED"
    | "GATEWAY_RECOVERY_CREDENTIAL_VERIFIED"
  )[];
  authentication_evidence_refs: string[];
  authority_reference_or_null: string | null;
  binding_scope_class:
    | "AUTHORITY_INGRESS_RECEIPT"
    | "AUTHORITY_RESPONSE_ENVELOPE"
    | "AUTHORITY_INTERACTION_RECORD"
    | "SUBMISSION_RECORD"
    | "OBLIGATION_MIRROR";
  bound_interaction_ref_or_null: string | null;
  canonical_ingress_receipt_ref_or_null: string | null;
  contract_version: "AUTHORITY_INGRESS_PROOF_CONTRACT_V1";
  correlation_status_or_null: "BOUND" | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS" | "UNBOUND" | null;
  delivery_dedupe_key_or_null: string | null;
  delivery_identity_basis: "PROVIDER_DELIVERY_REF_RESPONSE_BODY_HASH_INGRESS_CHANNEL_METADATA_HASH";
  duplicate_meaning_key_or_null: string | null;
  heuristic_correlation_policy: "DETERMINISTIC_ONLY_NO_RECENT_REQUEST_HEURISTICS";
  idempotency_key_or_null: string | null;
  identity_namespace_hash_or_null: string | null;
  ingress_channel_class_or_null:
    | "CALLBACK"
    | "POLL_RESULT"
    | "INBOX_DELIVERY"
    | "WORKER_OBSERVED"
    | "GATEWAY_RECOVERED"
    | null;
  ingress_channel_metadata_hash_or_null: string | null;
  lineage_binding_basis:
    | "NOT_APPLICABLE"
    | "REQUEST_HASH_EXACT"
    | "IDEMPOTENCY_TUPLE_EXACT"
    | "REQUEST_HASH_AND_TUPLE_EXACT"
    | "AUTHORITY_REFERENCE_ONLY"
    | "AMBIGUOUS_MULTI_MATCH"
    | "UNBOUND_NO_MATCH";
  mutation_gate_state:
    | "NOT_APPLICABLE"
    | "CHECKPOINT_ONLY"
    | "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT"
    | "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT"
    | "QUARANTINE_ONLY"
    | "DUPLICATE_SUPPRESSED_NO_MUTATION";
  normalized_response_ref_or_null: string | null;
  provider_delivery_ref_or_null: string | null;
  request_hash_or_null: string | null;
  request_lineage_proof_hash_or_null: string | null;
  response_body_hash_or_null: string | null;
  transport_memory_mutation_policy: "FORBIDDEN_UNTIL_PERSISTED_PROOF";
};

export type AuthorityReconciliationControlContract = {
  attempts_remaining_count: number;
  authority_operation_profile_ref_or_null: string | null;
  authority_truth_state: AuthorityTruthState;
  binding_scope_class: "AUTHORITY_INTERACTION_RECORD" | "SUBMISSION_RECORD" | "OBLIGATION_MIRROR";
  blind_resend_policy: "BLOCK_ON_AMBIGUITY_OR_EXHAUSTION";
  contract_version: "AUTHORITY_RECONCILIATION_CONTROL_V1";
  control_contract_hash: string;
  duplicate_meaning_key_or_null: string | null;
  escalation_due_at_or_null: string | null;
  escalation_evidence_refs: string[];
  escalation_owner_ref_or_null: string | null;
  escalation_reason_codes: string[];
  escalation_state: "NOT_REQUIRED" | "READY_FOR_ESCALATION" | "ESCALATED";
  escalation_workflow_item_ref_or_null: string | null;
  interaction_ref_or_null: string | null;
  last_budget_event_at: string;
  max_auto_reconciliation_attempts: number;
  next_reconciliation_at_or_null: string | null;
  operation_family_or_null: string | null;
  outcome_class_for_analytics:
    | "NO_RESPONSE_YET"
    | "PENDING_ACK"
    | "UNKNOWN"
    | "AMBIGUOUS"
    | "OUT_OF_BAND"
    | "CONFIRMED"
    | "REJECTED"
    | "ESCALATED";
  provider_environment_or_null: string | null;
  reconciliation_attempt_count: number;
  reconciliation_budget_state: "NOT_OPENED" | "ACTIVE" | "EXHAUSTED" | "ESCALATED" | "CLOSED";
  reconciliation_cadence_seconds_or_null: number | null;
  reconciliation_deadline_at_or_null: string | null;
  reconciliation_method: "NONE" | "READ_AFTER_WRITE" | "POLL_STATUS" | "POLL_OBLIGATIONS" | "MANUAL_ONLY";
  replay_resume_policy: "RESUME_PERSISTED_BUDGET_ONLY";
  resend_control_reason_codes: (
    | "IN_FLIGHT_REQUEST_LINEAGE_EXISTS"
    | "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY"
    | "PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION"
    | "TIMEOUT_PLACEHOLDER_REQUIRES_RECONCILIATION"
    | "AUTO_RECONCILIATION_BUDGET_EXHAUSTED"
    | "RECONCILIATION_DEADLINE_EXPIRED"
    | "CONTRADICTORY_AUTHORITY_EVIDENCE"
    | "OUT_OF_BAND_AUTHORITY_STATE_PRESENT"
    | "DUPLICATE_BUCKET_OCCUPIED"
    | "STRONGER_EXTERNAL_TRUTH_PRESENT"
    | "TERMINAL_AUTHORITY_STATE_RECORDED"
    | "INTERACTION_FINALIZED_NO_RESEND"
  )[];
  resend_legality_state:
    | "UNASSESSED"
    | "IDEMPOTENT_RECOVERY_ONLY"
    | "FOLLOW_UP_READ_ONLY"
    | "BLOCKED_BY_RECONCILIATION"
    | "BLOCKED_BY_ESCALATION"
    | "CLOSED_NO_RESEND";
  submission_lifecycle_state_or_null: SubmissionLifecycleState | null;
  unresolved_authority_posture:
    | "NO_UNRESOLVED_AUTHORITY"
    | "PENDING_ACK_UNRESOLVED"
    | "UNKNOWN_UNRESOLVED"
    | "CONTRADICTORY_EVIDENCE"
    | "OUT_OF_BAND_CONFLICT"
    | "MANUAL_REVIEW_REQUIRED";
  unresolved_reason_codes: string[];
};

export class AuthorityModelError extends Error {
  readonly code:
    | "AUTHORITY_CONTRACT_INVALID"
    | "AUTHORITY_FIELD_INVALID"
    | "AUTHORITY_FIELD_REQUIRED"
    | "AUTHORITY_IDENTITY_INVALID"
    | "AUTHORITY_REPOSITORY_INVALID";

  constructor(code: AuthorityModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuthorityModelError";
    this.code = code;
  }
}

export function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

export function normalizeNullableString(label: string, value: unknown): string | null {
  return value == null ? null : requireString(label, value);
}

export function normalizeTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must be an ISO-8601 instant with timezone: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function normalizeNullableTimestamp(label: string, value: unknown) {
  return value == null ? null : normalizeTimestamp(label, value);
}

export function normalizeSortedStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number; maxItems?: number } = {},
) {
  let normalized: string[];
  try {
    normalized = normalizeStringSet(
      label,
      values ?? [],
      options.minItems === undefined ? undefined : { minItems: options.minItems },
    );
  } catch (error) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a sorted string set`,
    );
  }
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

export function normalizeOrderedStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number; maxItems?: number } = {},
) {
  const seen = new Set<string>();
  const normalized = (values ?? []).map((value) => requireString(label, value));
  for (const value of normalized) {
    if (seen.has(value)) {
      throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", `${label} must not contain duplicates`);
    }
    seen.add(value);
  }
  if (normalized.length < (options.minItems ?? 0)) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must contain at least ${options.minItems} item(s)`,
    );
  }
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

export function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must be one of ${allowed.join(", ")}`,
    );
  }
  return value as T;
}

export function assertNonNegativeInteger(label: string, value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", `${label} must be a non-negative integer`);
  }
  return Number(value);
}

export function assertPositiveInteger(label: string, value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", `${label} must be a positive integer`);
  }
  return Number(value);
}

export function cloneRecord<T>(record: T): T {
  return structuredClone(record);
}

export function stableEqual(left: unknown, right: unknown) {
  return stableJsonHash(left) === stableJsonHash(right);
}

export function refFromId(prefix: string, id: string) {
  return `${prefix}://${requireString(`${prefix}_id`, id)}`;
}

export function hashObject(profile: string, value: unknown) {
  return stableJsonHash([profile, value]);
}

export function sortedStableRefs(values: readonly string[]) {
  return sortSetLikeStrings([...new Set(values)]);
}

export function requireNull(label: string, value: unknown) {
  if (value !== null) {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", `${label} must be null`);
  }
}

export function requireNonNull<T>(label: string, value: T | null | undefined): T {
  if (value == null) {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", `${label} must be non-null`);
  }
  return value;
}

export function requireEmpty(label: string, values: readonly unknown[]) {
  if (values.length !== 0) {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", `${label} must be empty`);
  }
}

function addSeconds(instant: string, seconds: number) {
  return normalizeTimestamp("derived instant", new Date(Date.parse(instant) + seconds * 1000).toISOString());
}

export function normalizeExecutionModeBoundaryContract(
  input: ExecutionModeBoundaryContract,
): ExecutionModeBoundaryContract {
  const contract: ExecutionModeBoundaryContract = {
    analysis_only: Boolean(input.analysis_only),
    boundary_hash: requireString("execution_mode_boundary_contract.boundary_hash", input.boundary_hash),
    contract_version: "EXECUTION_MODE_BOUNDARY_V1",
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
    replay_class_or_null: input.replay_class_or_null == null
      ? null
      : assertEnum("execution_mode_boundary_contract.replay_class_or_null", input.replay_class_or_null, [
          "STANDARD_REPLAY",
          "AUDIT_REPLAY",
          "COUNTERFACTUAL_ANALYSIS",
        ] as const),
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
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "COMPLIANCE execution boundary must clear analysis-only, counterfactual basis, and non-compliance refs",
    );
  }
  if (contract.execution_mode === "ANALYSIS" && (!contract.analysis_only || contract.counterfactual_basis === null)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "ANALYSIS execution boundary must carry analysis_only=true and counterfactual_basis",
    );
  }
  return contract;
}

export function buildLiveExecutionModeBoundaryContract(input: {
  boundary_hash?: string;
  run_kind?: ExecutionModeBoundaryContract["run_kind"];
} = {}): ExecutionModeBoundaryContract {
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
  });
}

export function buildAuthorityLayerBoundaryContract(input: Partial<AuthorityLayerBoundaryContract> & {
  binding_scope_class: AuthorityLayerBoundaryContract["binding_scope_class"];
  client_delegation_state?: AuthorityLayerBoundaryContract["client_delegation_state"];
  authority_link_state?: AuthorityLayerBoundaryContract["authority_link_state"];
  human_gate_requirement?: AuthorityLayerBoundaryContract["human_gate_requirement"];
  human_gate_resolution_state?: AuthorityLayerBoundaryContract["human_gate_resolution_state"];
}): AuthorityLayerBoundaryContract {
  const clientDelegationState = input.client_delegation_state ?? "NOT_REQUIRED";
  const delegationBasis =
    input.delegation_basis ??
    (clientDelegationState === "NOT_REQUIRED" ? "SELF_ACTING" : "CLIENT_GRANTED");
  const humanGateRequirement = input.human_gate_requirement ?? "NOT_REQUIRED";
  return normalizeAuthorityLayerBoundaryContract(
    {
      active_principal_class: input.active_principal_class ?? "HUMAN",
      authority_link_state: input.authority_link_state ?? "AUTHORISED_ACTIVE",
      authority_truth_precedence_policy: "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION",
      binding_scope_class: input.binding_scope_class,
      client_delegation_state: clientDelegationState,
      contract_version: "AUTHORITY_LAYER_BOUNDARY_V1",
      delegation_basis: delegationBasis,
      delegation_freshness_state:
        input.delegation_freshness_state ??
        (["SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(delegationBasis)
          ? "CURRENT"
          : "NOT_APPLICABLE"),
      exceptional_authority_may_override_authority_truth: false,
      exceptional_authority_may_substitute_for_delegation: false,
      exceptional_authority_may_widen_client_scope: false,
      exceptional_authority_may_widen_partition_scope: false,
      exceptional_authority_state: input.exceptional_authority_state ?? "NOT_APPLICABLE",
      exceptional_scope_policy: "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS",
      human_gate_requirement: humanGateRequirement,
      human_gate_resolution_state:
        input.human_gate_resolution_state ??
        (humanGateRequirement === "NOT_REQUIRED" ? "NOT_REQUIRED" : "EVIDENCE_FROZEN"),
      integration_capability: input.integration_capability ?? "AUTHORITY_INTEGRATED",
      link_delegation_independence_policy: "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION",
      service_human_gate_satisfaction_permitted: false,
      tenant_permission_state: input.tenant_permission_state ?? "SATISFIED",
      tenant_permission_substitution_policy: "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION",
    },
    {
      expected_binding_scope_class: input.binding_scope_class,
      expected_integration_capability: input.integration_capability ?? "AUTHORITY_INTEGRATED",
    },
  );
}

export function normalizeAuthorityLayerBoundaryContract(
  input: AuthorityLayerBoundaryContract,
  expected: {
    expected_binding_scope_class?: AuthorityLayerBoundaryContract["binding_scope_class"];
    expected_integration_capability?: AuthorityLayerBoundaryContract["integration_capability"];
  } = {},
): AuthorityLayerBoundaryContract {
  const contract: AuthorityLayerBoundaryContract = {
    active_principal_class: assertEnum(
      "authority_layer_boundary.active_principal_class",
      input.active_principal_class,
      ["HUMAN", "SERVICE", "EXTERNAL"] as const,
    ),
    authority_link_state: assertEnum(
      "authority_layer_boundary.authority_link_state",
      input.authority_link_state,
      [
        "NOT_REQUIRED",
        "UNLINKED",
        "LINK_INITIATED",
        "AUTHORISED_ACTIVE",
        "AUTHORISED_LIMITED",
        "TOKEN_INVALID",
        "REVOKED",
        "EXPIRED",
        "SUPERSEDED",
      ] as const,
    ),
    authority_truth_precedence_policy: "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION",
    binding_scope_class: assertEnum(
      "authority_layer_boundary.binding_scope_class",
      input.binding_scope_class,
      [
        "AUTHORIZATION_DECISION",
        "GOVERNANCE_ACCESS_SIMULATION",
        "AUTHORITY_BINDING",
        "AUTHORITY_OPERATION",
        "AUTHORITY_REQUEST_ENVELOPE",
      ] as const,
    ),
    client_delegation_state: assertEnum(
      "authority_layer_boundary.client_delegation_state",
      input.client_delegation_state,
      ["NOT_REQUIRED", "SATISFIED", "LIMITED", "MISSING", "EXPIRED"] as const,
    ),
    contract_version: "AUTHORITY_LAYER_BOUNDARY_V1",
    delegation_basis: assertEnum("authority_layer_boundary.delegation_basis", input.delegation_basis, [
      "SELF_ACTING",
      "CLIENT_GRANTED",
      "SELF_ASSESSMENT_IMPORTED",
      "DIGITAL_HANDSHAKE",
      "TENANT_INTERNAL",
      "SYSTEM_ASSIGNED",
    ] as const),
    delegation_freshness_state: assertEnum(
      "authority_layer_boundary.delegation_freshness_state",
      input.delegation_freshness_state,
      ["NOT_APPLICABLE", "CURRENT", "REVALIDATION_REQUIRED"] as const,
    ),
    exceptional_authority_may_override_authority_truth: false,
    exceptional_authority_may_substitute_for_delegation: false,
    exceptional_authority_may_widen_client_scope: false,
    exceptional_authority_may_widen_partition_scope: false,
    exceptional_authority_state: assertEnum(
      "authority_layer_boundary.exceptional_authority_state",
      input.exceptional_authority_state,
      ["NOT_APPLICABLE", "BOUNDED_INTERNAL_EXCEPTION"] as const,
    ),
    exceptional_scope_policy: "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS",
    human_gate_requirement: assertEnum(
      "authority_layer_boundary.human_gate_requirement",
      input.human_gate_requirement,
      ["NOT_REQUIRED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "REQUIRE_STEP_UP_AND_APPROVAL"] as const,
    ),
    human_gate_resolution_state: assertEnum(
      "authority_layer_boundary.human_gate_resolution_state",
      input.human_gate_resolution_state,
      ["NOT_REQUIRED", "PENDING_EVIDENCE", "EVIDENCE_FROZEN"] as const,
    ),
    integration_capability: assertEnum(
      "authority_layer_boundary.integration_capability",
      input.integration_capability,
      ["INTERNAL_ONLY", "AUTHORITY_INTEGRATED"] as const,
    ),
    link_delegation_independence_policy: "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION",
    service_human_gate_satisfaction_permitted: false,
    tenant_permission_state: assertEnum(
      "authority_layer_boundary.tenant_permission_state",
      input.tenant_permission_state,
      ["SATISFIED", "MASKED", "DENIED"] as const,
    ),
    tenant_permission_substitution_policy: "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION",
  };

  if (
    expected.expected_binding_scope_class !== undefined &&
    contract.binding_scope_class !== expected.expected_binding_scope_class
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `authority_layer_boundary.binding_scope_class must stay ${expected.expected_binding_scope_class}`,
    );
  }
  if (
    expected.expected_integration_capability !== undefined &&
    contract.integration_capability !== expected.expected_integration_capability
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `authority_layer_boundary.integration_capability must stay ${expected.expected_integration_capability}`,
    );
  }
  if (contract.human_gate_requirement === "NOT_REQUIRED") {
    if (contract.human_gate_resolution_state !== "NOT_REQUIRED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_layer_boundary.human_gate_resolution_state must be NOT_REQUIRED when no human gate is required",
      );
    }
  } else if (contract.human_gate_resolution_state === "NOT_REQUIRED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.human_gate_resolution_state must be pending or frozen when a human gate is required",
    );
  }
  if (contract.active_principal_class === "SERVICE" && contract.human_gate_resolution_state === "EVIDENCE_FROZEN") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "service principals must not serialize frozen human-gate evidence",
    );
  }
  if (
    contract.client_delegation_state === "NOT_REQUIRED" &&
    !["SELF_ACTING", "TENANT_INTERNAL", "SYSTEM_ASSIGNED"].includes(contract.delegation_basis)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.delegation_basis must be self/internal/system when delegation is not required",
    );
  }
  if (
    contract.client_delegation_state !== "NOT_REQUIRED" &&
    !["CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(contract.delegation_basis)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.delegation_basis must be client-granted or imported for explicit delegation posture",
    );
  }
  if (["SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(contract.delegation_basis)) {
    if (!["CURRENT", "REVALIDATION_REQUIRED"].includes(contract.delegation_freshness_state)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_layer_boundary.delegation_freshness_state must be current or revalidation-required for imported delegation",
      );
    }
  } else if (contract.delegation_freshness_state !== "NOT_APPLICABLE") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.delegation_freshness_state must be NOT_APPLICABLE for non-imported delegation",
    );
  }
  if (contract.integration_capability === "INTERNAL_ONLY") {
    if (contract.client_delegation_state !== "NOT_REQUIRED" || contract.authority_link_state !== "NOT_REQUIRED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "internal-only authority boundaries must not carry client delegation or authority-link posture",
      );
    }
  } else if (contract.authority_link_state === "NOT_REQUIRED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority-integrated boundaries must carry explicit authority-link posture",
    );
  }
  if (
    contract.exceptional_authority_state === "BOUNDED_INTERNAL_EXCEPTION" &&
    contract.human_gate_resolution_state !== "EVIDENCE_FROZEN"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "exceptional authority requires frozen human-gate evidence",
    );
  }
  if (["AUTHORITY_BINDING", "AUTHORITY_OPERATION", "AUTHORITY_REQUEST_ENVELOPE"].includes(contract.binding_scope_class)) {
    if (contract.tenant_permission_state !== "SATISFIED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "sendable authority artifacts require SATISFIED tenant permission",
      );
    }
    if (
      contract.human_gate_requirement !== "NOT_REQUIRED" &&
      contract.human_gate_resolution_state !== "EVIDENCE_FROZEN"
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "sendable authority artifacts require frozen human-gate evidence",
      );
    }
    if (contract.active_principal_class === "SERVICE" && contract.human_gate_requirement !== "NOT_REQUIRED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "service principals cannot carry human-gate posture into sendable authority artifacts",
      );
    }
    if (!["NOT_REQUIRED", "SATISFIED", "LIMITED"].includes(contract.client_delegation_state)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "sendable authority artifacts require live-usable delegation posture",
      );
    }
    if (!["AUTHORISED_ACTIVE", "AUTHORISED_LIMITED"].includes(contract.authority_link_state)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "sendable authority artifacts require active or limited authority-link posture",
      );
    }
  }

  return contract;
}

export function assertLiveComplianceBoundary(contract: ExecutionModeBoundaryContract) {
  const normalized = normalizeExecutionModeBoundaryContract(contract);
  if (
    normalized.execution_mode !== "COMPLIANCE" ||
    normalized.execution_posture !== "LIVE_COMPLIANCE" ||
    normalized.legal_effect_boundary !== "COMPLIANCE_CAPABLE"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority filing artifacts require a live compliance execution boundary",
    );
  }
  return normalized;
}

export function buildObligationMirrorAuthorityTruthContract(): AuthorityTruthContract {
  return {
    authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    boundary_scope: "OBLIGATION_MIRROR",
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    surface_specific_binding_policy: "MIRROR_IS_INTERNAL_VIEW_WITH_EXPLICIT_AUTHORITY_STATE",
    truth_surface_role: "INTERNAL_OBLIGATION_MIRROR",
    unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
  };
}

export function normalizeObligationMirrorAuthorityTruthContract(
  input: AuthorityTruthContract,
): AuthorityTruthContract {
  const expected = buildObligationMirrorAuthorityTruthContract();
  const contract: AuthorityTruthContract = {
    authority_confirmation_policy: assertEnum(
      "authority_truth_contract.authority_confirmation_policy",
      input.authority_confirmation_policy,
      ["ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM"] as const,
    ),
    boundary_scope: assertEnum("authority_truth_contract.boundary_scope", input.boundary_scope, [
      "OBLIGATION_MIRROR",
    ] as const),
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: assertEnum(
      "authority_truth_contract.correction_propagation_policy",
      input.correction_propagation_policy,
      ["AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE"] as const,
    ),
    mirror_projection_policy: assertEnum(
      "authority_truth_contract.mirror_projection_policy",
      input.mirror_projection_policy,
      ["INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY"] as const,
    ),
    non_confirming_state_policy: assertEnum(
      "authority_truth_contract.non_confirming_state_policy",
      input.non_confirming_state_policy,
      ["PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING"] as const,
    ),
    normalization_gate_policy: assertEnum(
      "authority_truth_contract.normalization_gate_policy",
      input.normalization_gate_policy,
      ["CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION"] as const,
    ),
    override_confirmation_policy: assertEnum(
      "authority_truth_contract.override_confirmation_policy",
      input.override_confirmation_policy,
      ["OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM"] as const,
    ),
    surface_specific_binding_policy: assertEnum(
      "authority_truth_contract.surface_specific_binding_policy",
      input.surface_specific_binding_policy,
      ["MIRROR_IS_INTERNAL_VIEW_WITH_EXPLICIT_AUTHORITY_STATE"] as const,
    ),
    truth_surface_role: assertEnum("authority_truth_contract.truth_surface_role", input.truth_surface_role, [
      "INTERNAL_OBLIGATION_MIRROR",
    ] as const),
    unresolved_projection_policy: assertEnum(
      "authority_truth_contract.unresolved_projection_policy",
      input.unresolved_projection_policy,
      ["UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED"] as const,
    ),
  };
  if (!stableEqual(contract, expected)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "ObligationMirror authority truth contract must match AUTHORITY_TRUTH_V1 mirror policy",
    );
  }
  return contract;
}

export function buildSubmissionRecordAuthorityTruthContract(): AuthorityTruthContract {
  return {
    authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    boundary_scope: "SUBMISSION_RECORD",
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    surface_specific_binding_policy: "SUBMISSION_LEDGER_IS_AUTHORITY_RESULT_ONLY",
    truth_surface_role: "AUTHORITY_SETTLEMENT_LEDGER",
    unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
  };
}

export function normalizeSubmissionRecordAuthorityTruthContract(
  input: AuthorityTruthContract,
): AuthorityTruthContract {
  const expected = buildSubmissionRecordAuthorityTruthContract();
  const contract: AuthorityTruthContract = {
    authority_confirmation_policy: assertEnum(
      "authority_truth_contract.authority_confirmation_policy",
      input.authority_confirmation_policy,
      ["ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM"] as const,
    ),
    boundary_scope: assertEnum("authority_truth_contract.boundary_scope", input.boundary_scope, [
      "SUBMISSION_RECORD",
    ] as const),
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: assertEnum(
      "authority_truth_contract.correction_propagation_policy",
      input.correction_propagation_policy,
      ["AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE"] as const,
    ),
    mirror_projection_policy: assertEnum(
      "authority_truth_contract.mirror_projection_policy",
      input.mirror_projection_policy,
      ["INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY"] as const,
    ),
    non_confirming_state_policy: assertEnum(
      "authority_truth_contract.non_confirming_state_policy",
      input.non_confirming_state_policy,
      ["PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING"] as const,
    ),
    normalization_gate_policy: assertEnum(
      "authority_truth_contract.normalization_gate_policy",
      input.normalization_gate_policy,
      ["CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION"] as const,
    ),
    override_confirmation_policy: assertEnum(
      "authority_truth_contract.override_confirmation_policy",
      input.override_confirmation_policy,
      ["OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM"] as const,
    ),
    surface_specific_binding_policy: assertEnum(
      "authority_truth_contract.surface_specific_binding_policy",
      input.surface_specific_binding_policy,
      ["SUBMISSION_LEDGER_IS_AUTHORITY_RESULT_ONLY"] as const,
    ),
    truth_surface_role: assertEnum("authority_truth_contract.truth_surface_role", input.truth_surface_role, [
      "AUTHORITY_SETTLEMENT_LEDGER",
    ] as const),
    unresolved_projection_policy: assertEnum(
      "authority_truth_contract.unresolved_projection_policy",
      input.unresolved_projection_policy,
      ["UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED"] as const,
    ),
  };
  if (!stableEqual(contract, expected)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "SubmissionRecord authority truth contract must match AUTHORITY_TRUTH_V1 settlement-ledger policy",
    );
  }
  return contract;
}

export function buildStateTransitionContract(input: {
  current_state: string;
  object_family: StateTransitionContract["object_family"];
  previous_state_or_null?: string | null;
  transition_applied_at: string;
  transition_audit_ref?: string;
  transition_event_code: string;
}): StateTransitionContract {
  const currentState = requireString("state_transition_contract.current_state", input.current_state);
  const event = requireString("state_transition_contract.transition_event_code", input.transition_event_code);
  const appliedAt = normalizeTimestamp("state_transition_contract.transition_applied_at", input.transition_applied_at);
  const objectFamily = assertEnum("state_transition_contract.object_family", input.object_family, [
    "FILING_CASE",
    "FILING_PACKET",
    "SUBMISSION_RECORD",
  ] as const);
  const machineCode = objectFamily === "FILING_CASE"
    ? "FILING_CASE_LIFECYCLE_V1"
    : objectFamily === "FILING_PACKET"
      ? "FILING_PACKET_LIFECYCLE_V1"
      : "SUBMISSION_RECORD_LIFECYCLE_V1";
  return {
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    current_state: currentState,
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    machine_code: machineCode,
    object_family: objectFamily,
    previous_state_or_null: normalizeNullableString(
      "state_transition_contract.previous_state_or_null",
      input.previous_state_or_null,
    ),
    recovery_supersession_policy: "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    state_field_name: "lifecycle_state",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    transition_application_policy: "NAMED_EVENT_ONLY",
    transition_applied_at: appliedAt,
    transition_audit_ref:
      input.transition_audit_ref ??
      `audit-event://state-transition/${objectFamily.toLowerCase()}/${event}/${hashObject("STATE_TRANSITION_AUDIT_REF", [currentState, appliedAt])}`,
    transition_event_code: event,
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

export function normalizeStateTransitionContract(
  input: StateTransitionContract,
  expected: Pick<StateTransitionContract, "object_family" | "machine_code" | "state_field_name" | "current_state"> & {
    transition_applied_at: string;
  },
) {
  const contract = buildStateTransitionContract({
    current_state: input.current_state,
    object_family: input.object_family,
    previous_state_or_null: input.previous_state_or_null,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    transition_event_code: input.transition_event_code,
  });
  if (
    contract.object_family !== expected.object_family ||
    contract.machine_code !== expected.machine_code ||
    contract.state_field_name !== expected.state_field_name ||
    contract.current_state !== expected.current_state ||
    contract.transition_applied_at !== expected.transition_applied_at
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "state transition contract must mirror the artifact family, lifecycle state, and transition timestamp",
    );
  }
  if (!/^[a-z][a-z0-9_]*$/.test(contract.transition_event_code)) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      "state_transition_contract.transition_event_code must be snake_case",
    );
  }
  return contract;
}

export function buildAuthenticatedIngressProofContract(input: {
  authority_reference: string;
  binding_scope_class?: AuthorityIngressProofContract["binding_scope_class"];
  bound_interaction_ref: string;
  canonical_ingress_receipt_ref: string;
  delivery_dedupe_key: string;
  duplicate_meaning_key: string;
  idempotency_key: string;
  identity_namespace_hash: string;
  ingress_channel_class?: NonNullable<AuthorityIngressProofContract["ingress_channel_class_or_null"]>;
  ingress_channel_metadata_hash: string;
  normalized_response_ref: string;
  provider_delivery_ref: string;
  request_hash: string;
  request_lineage_proof_hash: string;
  response_body_hash: string;
}): AuthorityIngressProofContract {
  return normalizeAuthorityIngressProofContract({
    authenticated_channel_state: "AUTHENTICATED",
    authentication_evidence_modes: ["POLL_CREDENTIAL_VERIFIED"],
    authentication_evidence_refs: [`authority-ingress-evidence://${requireString("canonical_ingress_receipt_ref", input.canonical_ingress_receipt_ref)}`],
    authority_reference_or_null: input.authority_reference,
    binding_scope_class: input.binding_scope_class ?? "OBLIGATION_MIRROR",
    bound_interaction_ref_or_null: input.bound_interaction_ref,
    canonical_ingress_receipt_ref_or_null: input.canonical_ingress_receipt_ref,
    contract_version: "AUTHORITY_INGRESS_PROOF_CONTRACT_V1",
    correlation_status_or_null: "BOUND",
    delivery_dedupe_key_or_null: input.delivery_dedupe_key,
    delivery_identity_basis: "PROVIDER_DELIVERY_REF_RESPONSE_BODY_HASH_INGRESS_CHANNEL_METADATA_HASH",
    duplicate_meaning_key_or_null: input.duplicate_meaning_key,
    heuristic_correlation_policy: "DETERMINISTIC_ONLY_NO_RECENT_REQUEST_HEURISTICS",
    idempotency_key_or_null: input.idempotency_key,
    identity_namespace_hash_or_null: input.identity_namespace_hash,
    ingress_channel_class_or_null: input.ingress_channel_class ?? "POLL_RESULT",
    ingress_channel_metadata_hash_or_null: input.ingress_channel_metadata_hash,
    lineage_binding_basis: "REQUEST_HASH_AND_TUPLE_EXACT",
    mutation_gate_state: "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT",
    normalized_response_ref_or_null: input.normalized_response_ref,
    provider_delivery_ref_or_null: input.provider_delivery_ref,
    request_hash_or_null: input.request_hash,
    request_lineage_proof_hash_or_null: input.request_lineage_proof_hash,
    response_body_hash_or_null: input.response_body_hash,
    transport_memory_mutation_policy: "FORBIDDEN_UNTIL_PERSISTED_PROOF",
  });
}

export function normalizeAuthorityIngressProofContract(
  input: AuthorityIngressProofContract,
): AuthorityIngressProofContract {
  const proof: AuthorityIngressProofContract = {
    authenticated_channel_state: assertEnum(
      "authority_ingress_proof_contract.authenticated_channel_state",
      input.authenticated_channel_state,
      ["NOT_APPLICABLE", "AUTHENTICATED", "FAILED"] as const,
    ),
    authentication_evidence_modes: normalizeSortedStringSet(
      "authority_ingress_proof_contract.authentication_evidence_modes",
      input.authentication_evidence_modes,
    ) as AuthorityIngressProofContract["authentication_evidence_modes"],
    authentication_evidence_refs: normalizeSortedStringSet(
      "authority_ingress_proof_contract.authentication_evidence_refs",
      input.authentication_evidence_refs,
    ),
    authority_reference_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.authority_reference_or_null",
      input.authority_reference_or_null,
    ),
    binding_scope_class: assertEnum("authority_ingress_proof_contract.binding_scope_class", input.binding_scope_class, [
      "AUTHORITY_INGRESS_RECEIPT",
      "AUTHORITY_RESPONSE_ENVELOPE",
      "AUTHORITY_INTERACTION_RECORD",
      "SUBMISSION_RECORD",
      "OBLIGATION_MIRROR",
    ] as const),
    bound_interaction_ref_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.bound_interaction_ref_or_null",
      input.bound_interaction_ref_or_null,
    ),
    canonical_ingress_receipt_ref_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.canonical_ingress_receipt_ref_or_null",
      input.canonical_ingress_receipt_ref_or_null,
    ),
    contract_version: "AUTHORITY_INGRESS_PROOF_CONTRACT_V1",
    correlation_status_or_null: input.correlation_status_or_null == null
      ? null
      : assertEnum("authority_ingress_proof_contract.correlation_status_or_null", input.correlation_status_or_null, [
          "BOUND",
          "BOUND_WITH_AUTHORITY_REFERENCE_ONLY",
          "AMBIGUOUS",
          "UNBOUND",
        ] as const),
    delivery_dedupe_key_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.delivery_dedupe_key_or_null",
      input.delivery_dedupe_key_or_null,
    ),
    delivery_identity_basis: "PROVIDER_DELIVERY_REF_RESPONSE_BODY_HASH_INGRESS_CHANNEL_METADATA_HASH",
    duplicate_meaning_key_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.duplicate_meaning_key_or_null",
      input.duplicate_meaning_key_or_null,
    ),
    heuristic_correlation_policy: "DETERMINISTIC_ONLY_NO_RECENT_REQUEST_HEURISTICS",
    idempotency_key_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.idempotency_key_or_null",
      input.idempotency_key_or_null,
    ),
    identity_namespace_hash_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.identity_namespace_hash_or_null",
      input.identity_namespace_hash_or_null,
    ),
    ingress_channel_class_or_null: input.ingress_channel_class_or_null == null
      ? null
      : assertEnum("authority_ingress_proof_contract.ingress_channel_class_or_null", input.ingress_channel_class_or_null, [
          "CALLBACK",
          "POLL_RESULT",
          "INBOX_DELIVERY",
          "WORKER_OBSERVED",
          "GATEWAY_RECOVERED",
        ] as const),
    ingress_channel_metadata_hash_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.ingress_channel_metadata_hash_or_null",
      input.ingress_channel_metadata_hash_or_null,
    ),
    lineage_binding_basis: assertEnum(
      "authority_ingress_proof_contract.lineage_binding_basis",
      input.lineage_binding_basis,
      [
        "NOT_APPLICABLE",
        "REQUEST_HASH_EXACT",
        "IDEMPOTENCY_TUPLE_EXACT",
        "REQUEST_HASH_AND_TUPLE_EXACT",
        "AUTHORITY_REFERENCE_ONLY",
        "AMBIGUOUS_MULTI_MATCH",
        "UNBOUND_NO_MATCH",
      ] as const,
    ),
    mutation_gate_state: assertEnum(
      "authority_ingress_proof_contract.mutation_gate_state",
      input.mutation_gate_state,
      [
        "NOT_APPLICABLE",
        "CHECKPOINT_ONLY",
        "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT",
        "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT",
        "QUARANTINE_ONLY",
        "DUPLICATE_SUPPRESSED_NO_MUTATION",
      ] as const,
    ),
    normalized_response_ref_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.normalized_response_ref_or_null",
      input.normalized_response_ref_or_null,
    ),
    provider_delivery_ref_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.provider_delivery_ref_or_null",
      input.provider_delivery_ref_or_null,
    ),
    request_hash_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.request_hash_or_null",
      input.request_hash_or_null,
    ),
    request_lineage_proof_hash_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.request_lineage_proof_hash_or_null",
      input.request_lineage_proof_hash_or_null,
    ),
    response_body_hash_or_null: normalizeNullableString(
      "authority_ingress_proof_contract.response_body_hash_or_null",
      input.response_body_hash_or_null,
    ),
    transport_memory_mutation_policy: "FORBIDDEN_UNTIL_PERSISTED_PROOF",
  };

  if (proof.authenticated_channel_state === "NOT_APPLICABLE") {
    requireEmpty("authority_ingress_proof_contract.authentication_evidence_modes", proof.authentication_evidence_modes);
    requireEmpty("authority_ingress_proof_contract.authentication_evidence_refs", proof.authentication_evidence_refs);
    for (const field of [
      "authority_reference_or_null",
      "bound_interaction_ref_or_null",
      "canonical_ingress_receipt_ref_or_null",
      "correlation_status_or_null",
      "delivery_dedupe_key_or_null",
      "duplicate_meaning_key_or_null",
      "idempotency_key_or_null",
      "identity_namespace_hash_or_null",
      "ingress_channel_class_or_null",
      "ingress_channel_metadata_hash_or_null",
      "normalized_response_ref_or_null",
      "provider_delivery_ref_or_null",
      "request_hash_or_null",
      "request_lineage_proof_hash_or_null",
      "response_body_hash_or_null",
    ] as const) {
      requireNull(`authority_ingress_proof_contract.${field}`, proof[field]);
    }
    if (proof.lineage_binding_basis !== "NOT_APPLICABLE" || proof.mutation_gate_state !== "NOT_APPLICABLE") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "not-applicable ingress proof must clear lineage binding and mutation gate",
      );
    }
  }
  if (proof.mutation_gate_state === "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT") {
    if (
      proof.authenticated_channel_state !== "AUTHENTICATED" ||
      proof.correlation_status_or_null !== "BOUND" ||
      proof.normalized_response_ref_or_null === null
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority-backed mutation requires authenticated, bound ingress proof with a normalized response ref",
      );
    }
  }
  return proof;
}

function unresolvedPostureForTruth(
  truth: AuthorityTruthState,
): AuthorityReconciliationControlContract["unresolved_authority_posture"] {
  if (truth === "PENDING_ACK") {
    return "PENDING_ACK_UNRESOLVED";
  }
  if (truth === "OUT_OF_BAND") {
    return "OUT_OF_BAND_CONFLICT";
  }
  return "UNKNOWN_UNRESOLVED";
}

function outcomeForTruth(truth: AuthorityTruthState): AuthorityReconciliationControlContract["outcome_class_for_analytics"] {
  if (truth === "PENDING_ACK") {
    return "PENDING_ACK";
  }
  if (truth === "CONFIRMED") {
    return "CONFIRMED";
  }
  if (truth === "REJECTED") {
    return "REJECTED";
  }
  if (truth === "OUT_OF_BAND") {
    return "OUT_OF_BAND";
  }
  if (truth === "UNKNOWN") {
    return "UNKNOWN";
  }
  return "NO_RESPONSE_YET";
}

export function buildAuthorityReconciliationControlContract(input: {
  authority_truth_state: AuthorityTruthState;
  authority_operation_profile_ref_or_null?: string | null;
  binding_scope_class?: AuthorityReconciliationControlContract["binding_scope_class"];
  duplicate_meaning_key_or_null?: string | null;
  interaction_ref_or_null?: string | null;
  last_budget_event_at: string;
  next_reconciliation_at_or_null?: string | null;
  operation_family_or_null?: string | null;
  provider_environment_or_null?: string | null;
  reconciliation_budget_state?: AuthorityReconciliationControlContract["reconciliation_budget_state"];
  reconciliation_deadline_at_or_null?: string | null;
  reconciliation_method?: AuthorityReconciliationControlContract["reconciliation_method"];
  submission_lifecycle_state_or_null?: SubmissionLifecycleState | null;
}): AuthorityReconciliationControlContract {
  const lastBudgetEventAt = normalizeTimestamp(
    "reconciliation_control_contract_or_null.last_budget_event_at",
    input.last_budget_event_at,
  );
  const truth = assertEnum("authority_truth_state", input.authority_truth_state, [
    "NOT_APPLICABLE",
    "NOT_REQUESTED",
    "UNKNOWN",
    "PENDING_ACK",
    "PARTIAL_ACK",
    "CONFIRMED",
    "REJECTED",
    "OUT_OF_BAND",
  ] as const);
  const unresolved = ["PENDING_ACK", "UNKNOWN", "OUT_OF_BAND"].includes(truth);
  const budgetState = input.reconciliation_budget_state ?? (unresolved ? "ACTIVE" : truth === "CONFIRMED" || truth === "REJECTED" ? "CLOSED" : "NOT_OPENED");
  const unresolvedBudget = unresolved && budgetState !== "CLOSED" && budgetState !== "NOT_OPENED";
  const base: AuthorityReconciliationControlContract = {
    attempts_remaining_count: unresolved && budgetState === "ACTIVE" ? 3 : 0,
    authority_operation_profile_ref_or_null: input.authority_operation_profile_ref_or_null ?? null,
    authority_truth_state: truth,
    binding_scope_class: input.binding_scope_class ?? "OBLIGATION_MIRROR",
    blind_resend_policy: "BLOCK_ON_AMBIGUITY_OR_EXHAUSTION",
    contract_version: "AUTHORITY_RECONCILIATION_CONTROL_V1",
    control_contract_hash: "pending",
    duplicate_meaning_key_or_null: input.duplicate_meaning_key_or_null ?? null,
    escalation_due_at_or_null: null,
    escalation_evidence_refs: [],
    escalation_owner_ref_or_null: null,
    escalation_reason_codes: [],
    escalation_state: "NOT_REQUIRED",
    escalation_workflow_item_ref_or_null: null,
    interaction_ref_or_null: input.interaction_ref_or_null ?? null,
    last_budget_event_at: lastBudgetEventAt,
    max_auto_reconciliation_attempts: unresolved && budgetState === "ACTIVE" ? 3 : 0,
    next_reconciliation_at_or_null: input.next_reconciliation_at_or_null ?? (unresolved && budgetState === "ACTIVE" ? addSeconds(lastBudgetEventAt, 3600) : null),
    operation_family_or_null: input.operation_family_or_null ?? null,
    outcome_class_for_analytics: outcomeForTruth(truth),
    provider_environment_or_null: input.provider_environment_or_null ?? null,
    reconciliation_attempt_count: 0,
    reconciliation_budget_state: budgetState,
    reconciliation_cadence_seconds_or_null: unresolved && budgetState === "ACTIVE" ? 3600 : null,
    reconciliation_deadline_at_or_null: input.reconciliation_deadline_at_or_null ?? (unresolved && budgetState === "ACTIVE" ? addSeconds(lastBudgetEventAt, 86_400) : null),
    reconciliation_method: input.reconciliation_method ?? (unresolved && budgetState === "ACTIVE" ? "POLL_OBLIGATIONS" : "NONE"),
    replay_resume_policy: "RESUME_PERSISTED_BUDGET_ONLY",
    resend_control_reason_codes: unresolved && budgetState === "ACTIVE"
      ? ["PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION"]
      : truth === "CONFIRMED" || truth === "REJECTED"
        ? ["TERMINAL_AUTHORITY_STATE_RECORDED"]
        : truth === "OUT_OF_BAND" && budgetState === "CLOSED"
          ? ["OUT_OF_BAND_AUTHORITY_STATE_PRESENT"]
        : [],
    resend_legality_state: unresolved && budgetState === "ACTIVE" ? "FOLLOW_UP_READ_ONLY" : budgetState === "CLOSED" ? "CLOSED_NO_RESEND" : "UNASSESSED",
    submission_lifecycle_state_or_null: input.submission_lifecycle_state_or_null ?? null,
    unresolved_authority_posture: unresolvedBudget ? unresolvedPostureForTruth(truth) : "NO_UNRESOLVED_AUTHORITY",
    unresolved_reason_codes: unresolvedBudget ? [`${truth}_REQUIRES_RECONCILIATION`] : [],
  };
  base.control_contract_hash = hashObject("AUTHORITY_RECONCILIATION_CONTROL_V1", {
    ...base,
    control_contract_hash: null,
  });
  return normalizeAuthorityReconciliationControlContract(base);
}

export function normalizeAuthorityReconciliationControlContract(
  input: AuthorityReconciliationControlContract,
): AuthorityReconciliationControlContract {
  const contract: AuthorityReconciliationControlContract = {
    ...input,
    attempts_remaining_count: assertNonNegativeInteger(
      "reconciliation_control_contract_or_null.attempts_remaining_count",
      input.attempts_remaining_count,
    ),
    authority_operation_profile_ref_or_null: normalizeNullableString(
      "reconciliation_control_contract_or_null.authority_operation_profile_ref_or_null",
      input.authority_operation_profile_ref_or_null,
    ),
    authority_truth_state: assertEnum(
      "reconciliation_control_contract_or_null.authority_truth_state",
      input.authority_truth_state,
      [
        "NOT_APPLICABLE",
        "NOT_REQUESTED",
        "UNKNOWN",
        "PENDING_ACK",
        "PARTIAL_ACK",
        "CONFIRMED",
        "REJECTED",
        "OUT_OF_BAND",
      ] as const,
    ),
    binding_scope_class: assertEnum(
      "reconciliation_control_contract_or_null.binding_scope_class",
      input.binding_scope_class,
      ["AUTHORITY_INTERACTION_RECORD", "SUBMISSION_RECORD", "OBLIGATION_MIRROR"] as const,
    ),
    blind_resend_policy: "BLOCK_ON_AMBIGUITY_OR_EXHAUSTION",
    contract_version: "AUTHORITY_RECONCILIATION_CONTROL_V1",
    control_contract_hash: requireString(
      "reconciliation_control_contract_or_null.control_contract_hash",
      input.control_contract_hash,
    ),
    duplicate_meaning_key_or_null: normalizeNullableString(
      "reconciliation_control_contract_or_null.duplicate_meaning_key_or_null",
      input.duplicate_meaning_key_or_null,
    ),
    escalation_due_at_or_null: normalizeNullableTimestamp(
      "reconciliation_control_contract_or_null.escalation_due_at_or_null",
      input.escalation_due_at_or_null,
    ),
    escalation_evidence_refs: normalizeSortedStringSet(
      "reconciliation_control_contract_or_null.escalation_evidence_refs",
      input.escalation_evidence_refs,
    ),
    escalation_owner_ref_or_null: normalizeNullableString(
      "reconciliation_control_contract_or_null.escalation_owner_ref_or_null",
      input.escalation_owner_ref_or_null,
    ),
    escalation_reason_codes: normalizeSortedStringSet(
      "reconciliation_control_contract_or_null.escalation_reason_codes",
      input.escalation_reason_codes,
    ),
    escalation_state: assertEnum(
      "reconciliation_control_contract_or_null.escalation_state",
      input.escalation_state,
      ["NOT_REQUIRED", "READY_FOR_ESCALATION", "ESCALATED"] as const,
    ),
    escalation_workflow_item_ref_or_null: normalizeNullableString(
      "reconciliation_control_contract_or_null.escalation_workflow_item_ref_or_null",
      input.escalation_workflow_item_ref_or_null,
    ),
    interaction_ref_or_null: normalizeNullableString(
      "reconciliation_control_contract_or_null.interaction_ref_or_null",
      input.interaction_ref_or_null,
    ),
    last_budget_event_at: normalizeTimestamp(
      "reconciliation_control_contract_or_null.last_budget_event_at",
      input.last_budget_event_at,
    ),
    max_auto_reconciliation_attempts: assertNonNegativeInteger(
      "reconciliation_control_contract_or_null.max_auto_reconciliation_attempts",
      input.max_auto_reconciliation_attempts,
    ),
    next_reconciliation_at_or_null: normalizeNullableTimestamp(
      "reconciliation_control_contract_or_null.next_reconciliation_at_or_null",
      input.next_reconciliation_at_or_null,
    ),
    operation_family_or_null: normalizeNullableString(
      "reconciliation_control_contract_or_null.operation_family_or_null",
      input.operation_family_or_null,
    ),
    outcome_class_for_analytics: assertEnum(
      "reconciliation_control_contract_or_null.outcome_class_for_analytics",
      input.outcome_class_for_analytics,
      ["NO_RESPONSE_YET", "PENDING_ACK", "UNKNOWN", "AMBIGUOUS", "OUT_OF_BAND", "CONFIRMED", "REJECTED", "ESCALATED"] as const,
    ),
    provider_environment_or_null: normalizeNullableString(
      "reconciliation_control_contract_or_null.provider_environment_or_null",
      input.provider_environment_or_null,
    ),
    reconciliation_attempt_count: assertNonNegativeInteger(
      "reconciliation_control_contract_or_null.reconciliation_attempt_count",
      input.reconciliation_attempt_count,
    ),
    reconciliation_budget_state: assertEnum(
      "reconciliation_control_contract_or_null.reconciliation_budget_state",
      input.reconciliation_budget_state,
      ["NOT_OPENED", "ACTIVE", "EXHAUSTED", "ESCALATED", "CLOSED"] as const,
    ),
    reconciliation_cadence_seconds_or_null: input.reconciliation_cadence_seconds_or_null == null
      ? null
      : assertPositiveInteger(
          "reconciliation_control_contract_or_null.reconciliation_cadence_seconds_or_null",
          input.reconciliation_cadence_seconds_or_null,
        ),
    reconciliation_deadline_at_or_null: normalizeNullableTimestamp(
      "reconciliation_control_contract_or_null.reconciliation_deadline_at_or_null",
      input.reconciliation_deadline_at_or_null,
    ),
    reconciliation_method: assertEnum(
      "reconciliation_control_contract_or_null.reconciliation_method",
      input.reconciliation_method,
      ["NONE", "READ_AFTER_WRITE", "POLL_STATUS", "POLL_OBLIGATIONS", "MANUAL_ONLY"] as const,
    ),
    replay_resume_policy: "RESUME_PERSISTED_BUDGET_ONLY",
    resend_control_reason_codes: normalizeSortedStringSet(
      "reconciliation_control_contract_or_null.resend_control_reason_codes",
      input.resend_control_reason_codes,
    ) as AuthorityReconciliationControlContract["resend_control_reason_codes"],
    resend_legality_state: assertEnum(
      "reconciliation_control_contract_or_null.resend_legality_state",
      input.resend_legality_state,
      [
        "UNASSESSED",
        "IDEMPOTENT_RECOVERY_ONLY",
        "FOLLOW_UP_READ_ONLY",
        "BLOCKED_BY_RECONCILIATION",
        "BLOCKED_BY_ESCALATION",
        "CLOSED_NO_RESEND",
      ] as const,
    ),
    submission_lifecycle_state_or_null: input.submission_lifecycle_state_or_null == null
      ? null
      : assertEnum(
          "reconciliation_control_contract_or_null.submission_lifecycle_state_or_null",
          input.submission_lifecycle_state_or_null,
          [
            "INTENT_RECORDED",
            "TRANSMIT_PENDING",
            "TRANSMITTED",
            "PENDING_ACK",
            "CONFIRMED",
            "REJECTED",
            "UNKNOWN",
            "OUT_OF_BAND",
            "SUPERSEDED",
          ] as const,
        ),
    unresolved_authority_posture: assertEnum(
      "reconciliation_control_contract_or_null.unresolved_authority_posture",
      input.unresolved_authority_posture,
      [
        "NO_UNRESOLVED_AUTHORITY",
        "PENDING_ACK_UNRESOLVED",
        "UNKNOWN_UNRESOLVED",
        "CONTRADICTORY_EVIDENCE",
        "OUT_OF_BAND_CONFLICT",
        "MANUAL_REVIEW_REQUIRED",
      ] as const,
    ),
    unresolved_reason_codes: normalizeSortedStringSet(
      "reconciliation_control_contract_or_null.unresolved_reason_codes",
      input.unresolved_reason_codes,
    ),
  };

  if (contract.reconciliation_attempt_count > contract.max_auto_reconciliation_attempts) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation attempts cannot exceed max auto attempts",
    );
  }
  if (contract.reconciliation_budget_state === "ACTIVE") {
    if (
      contract.next_reconciliation_at_or_null === null ||
      contract.reconciliation_deadline_at_or_null === null ||
      contract.attempts_remaining_count < 1 ||
      contract.unresolved_reason_codes.length === 0 ||
      contract.resend_legality_state !== "FOLLOW_UP_READ_ONLY" ||
      contract.resend_control_reason_codes.length === 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "active reconciliation budgets require next/deadline timestamps, remaining attempts, unresolved reason, and read-only resend posture",
      );
    }
  }
  if (contract.reconciliation_budget_state === "NOT_OPENED") {
    requireNull("reconciliation_control_contract_or_null.next_reconciliation_at_or_null", contract.next_reconciliation_at_or_null);
    requireNull("reconciliation_control_contract_or_null.reconciliation_deadline_at_or_null", contract.reconciliation_deadline_at_or_null);
    requireEmpty("reconciliation_control_contract_or_null.unresolved_reason_codes", contract.unresolved_reason_codes);
  }
  if (contract.reconciliation_budget_state === "CLOSED") {
    requireNull("reconciliation_control_contract_or_null.next_reconciliation_at_or_null", contract.next_reconciliation_at_or_null);
    if (contract.unresolved_authority_posture !== "NO_UNRESOLVED_AUTHORITY") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "closed reconciliation budgets must clear unresolved authority posture",
      );
    }
  }
  if (contract.escalation_state === "NOT_REQUIRED") {
    requireNull("reconciliation_control_contract_or_null.escalation_owner_ref_or_null", contract.escalation_owner_ref_or_null);
    requireNull(
      "reconciliation_control_contract_or_null.escalation_workflow_item_ref_or_null",
      contract.escalation_workflow_item_ref_or_null,
    );
    requireEmpty("reconciliation_control_contract_or_null.escalation_reason_codes", contract.escalation_reason_codes);
    requireEmpty("reconciliation_control_contract_or_null.escalation_evidence_refs", contract.escalation_evidence_refs);
    requireNull("reconciliation_control_contract_or_null.escalation_due_at_or_null", contract.escalation_due_at_or_null);
  }
  return contract;
}
