import {
  type AuthorityIngressProofContract,
  type AuthorityReconciliationControlContract,
  type AuthorityTruthContract,
  AuthorityModelError,
  assertEnum,
  assertNonNegativeInteger,
  assertPositiveInteger,
  cloneRecord,
  hashObject,
  normalizeAuthorityIngressProofContract,
  normalizeAuthorityReconciliationControlContract,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireEmpty,
  requireNonNull,
  requireNull,
  requireString,
} from "./authority_common.ts";
import {
  type AuthorityRequestIdentityContract,
  normalizeAuthorityRequestIdentityContract,
} from "./submission_record.ts";
import type { AuthorityBindingDriftSentinelContract } from "../services/build_binding_drift_sentinel_contract.ts";

export const AUTHORITY_INTERACTION_LIFECYCLE_STATES = [
  "REQUEST_REGISTERED",
  "DISPATCH_READY",
  "TRANSMIT_IN_FLIGHT",
  "RESPONSE_CAPTURED",
  "RECONCILING",
  "RESOLVED",
  "ABANDONED",
] as const;

export const AUTHORITY_INTERACTION_MEANING_RESOLUTION_STATES = [
  "NO_RESPONSE",
  "PROVISIONAL_TIMEOUT",
  "ACTIVE_DIRECT",
  "ACTIVE_CORROBORATED",
  "RECONCILIATION_REQUIRED",
  "RECONCILIATION_RESOLVED",
] as const;

export const AUTHORITY_INTERACTION_SEND_REVALIDATION_STATES = [
  "NOT_PERFORMED",
  "CLEAR_TO_SEND",
  "BLOCKED",
] as const;

export const AUTHORITY_INTERACTION_RESOLUTION_BASES = [
  "TERMINAL_RESPONSE",
  "RECONCILIATION_RESULT",
] as const;

export type AuthorityInteractionLifecycleState =
  (typeof AUTHORITY_INTERACTION_LIFECYCLE_STATES)[number];
export type AuthorityInteractionMeaningResolutionState =
  (typeof AUTHORITY_INTERACTION_MEANING_RESOLUTION_STATES)[number];
export type AuthorityInteractionSendRevalidationState =
  (typeof AUTHORITY_INTERACTION_SEND_REVALIDATION_STATES)[number];
export type AuthorityInteractionResolutionBasis =
  (typeof AUTHORITY_INTERACTION_RESOLUTION_BASES)[number];

export type CommandTruthBoundaryContract = {
  artifact_role: "COMMAND_SIDE_AUTHORITY";
  authoritative_record_families: ("RUN_MANIFEST" | "AUTHORITY_INTERACTION_RECORD" | "AUDIT_EVENT")[];
  authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY";
  contract_version: "COMMAND_TRUTH_BOUNDARY_V1";
  durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED";
  observable_projection_families: [];
  projection_input_policy: "FORBIDDEN_AS_AUTHORITY";
  recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY";
};

export type AuthorityInteractionRecord = {
  access_binding_hash: string;
  active_response_id: string | null;
  audit_refs: string[];
  authority_binding_ref: string;
  authority_ingress_proof_contract: AuthorityIngressProofContract | null;
  authority_link_ref: string;
  authority_operation_profile_ref: string;
  authority_truth_contract: AuthorityTruthContract;
  binding_drift_sentinel_contract: AuthorityBindingDriftSentinelContract;
  binding_lineage_ref: string;
  created_at: string;
  dispatch_ref: string;
  duplicate_meaning_key: string;
  idempotency_key: string;
  identity_namespace_hash: string;
  interaction_id: string;
  last_status_at: string;
  lifecycle_state: AuthorityInteractionLifecycleState;
  manifest_id: string;
  max_auto_reconciliation_attempts: number;
  meaning_resolution_state: AuthorityInteractionMeaningResolutionState;
  next_reconciliation_at: string | null;
  operation_id: string;
  policy_snapshot_hash: string;
  provenance_refs: string[];
  reconciliation_attempt_count: number;
  reconciliation_budget_state: AuthorityReconciliationControlContract["reconciliation_budget_state"];
  reconciliation_cadence_seconds: number | null;
  reconciliation_control_contract: AuthorityReconciliationControlContract;
  reconciliation_deadline_at: string | null;
  reconciliation_escalated_at: string | null;
  reconciliation_method: AuthorityReconciliationControlContract["reconciliation_method"];
  reconciliation_workflow_item_ref: string | null;
  request_hash: string;
  request_id: string;
  request_identity_contract: AuthorityRequestIdentityContract;
  resend_control_reason_codes: AuthorityReconciliationControlContract["resend_control_reason_codes"];
  resend_legality_state: AuthorityReconciliationControlContract["resend_legality_state"];
  resolution_basis: AuthorityInteractionResolutionBasis | null;
  response_history_ids: string[];
  send_authorized_token_version_ref: string | null;
  send_revalidated_at: string | null;
  send_revalidation_reason_codes: (
    | "SEALED_TOKEN_VERSION_REUSED"
    | "TOKEN_ROTATED_WITHIN_LINEAGE"
    | "SEND_CLAIM_CONFLICT"
    | "TOKEN_VERSION_NOT_USABLE"
    | "BINDING_LINEAGE_DRIFT"
    | "AUTHORITY_LINK_NOT_ACTIVE"
    | "CLIENT_SUBJECT_SCOPE_DRIFT"
    | "PROVIDER_CONTRACT_DRIFT"
    | "ACCESS_BINDING_HASH_DRIFT"
    | "POLICY_SNAPSHOT_HASH_DRIFT"
    | "STEP_UP_OR_APPROVAL_DRIFT"
    | "DUPLICATE_BUCKET_CHANGED"
    | "STRONGER_EXTERNAL_TRUTH_PRESENT"
    | "BODY_COLLISION_PRESENT"
  )[];
  send_revalidation_state: AuthorityInteractionSendRevalidationState;
  submission_record_ref: string | null;
  truth_boundary_contract: CommandTruthBoundaryContract;
  abandonment_reason_code: string | null;
};

export type AuthorityInteractionRecordInput = Partial<
  Omit<
    AuthorityInteractionRecord,
    | "audit_refs"
    | "authority_truth_contract"
    | "provenance_refs"
    | "response_history_ids"
    | "truth_boundary_contract"
  >
> & {
  audit_refs?: readonly string[];
  authority_truth_contract?: AuthorityTruthContract;
  provenance_refs?: readonly string[];
  response_history_ids?: readonly string[];
  truth_boundary_contract?: CommandTruthBoundaryContract;
  access_binding_hash: string;
  authority_binding_ref: string;
  authority_link_ref: string;
  authority_operation_profile_ref: string;
  binding_drift_sentinel_contract: AuthorityBindingDriftSentinelContract;
  binding_lineage_ref: string;
  created_at: string;
  dispatch_ref: string;
  duplicate_meaning_key: string;
  idempotency_key: string;
  identity_namespace_hash: string;
  interaction_id: string;
  manifest_id: string;
  operation_id: string;
  policy_snapshot_hash: string;
  reconciliation_control_contract: AuthorityReconciliationControlContract;
  request_hash: string;
  request_id: string;
  request_identity_contract: AuthorityRequestIdentityContract;
};

export function authorityInteractionRecordRef(
  record: Pick<AuthorityInteractionRecord, "interaction_id"> | string,
) {
  return refFromId("authority-interaction", typeof record === "string" ? record : record.interaction_id);
}

export function buildAuthorityInteractionTruthBoundaryContract(): CommandTruthBoundaryContract {
  return {
    artifact_role: "COMMAND_SIDE_AUTHORITY",
    authoritative_record_families: [
      "RUN_MANIFEST",
      "AUTHORITY_INTERACTION_RECORD",
      "AUDIT_EVENT",
    ],
    authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY",
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED",
    observable_projection_families: [],
    projection_input_policy: "FORBIDDEN_AS_AUTHORITY",
    recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY",
  };
}

export function normalizeAuthorityInteractionTruthBoundaryContract(
  input: CommandTruthBoundaryContract,
): CommandTruthBoundaryContract {
  const contract: CommandTruthBoundaryContract = {
    artifact_role: assertEnum("truth_boundary_contract.artifact_role", input.artifact_role, [
      "COMMAND_SIDE_AUTHORITY",
    ] as const),
    authoritative_record_families: normalizeSortedStringSet(
      "truth_boundary_contract.authoritative_record_families",
      input.authoritative_record_families,
    ) as CommandTruthBoundaryContract["authoritative_record_families"],
    authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY",
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED",
    observable_projection_families: [],
    projection_input_policy: "FORBIDDEN_AS_AUTHORITY",
    recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY",
  };
  if (
    contract.authoritative_record_families.join("|") !==
      "AUDIT_EVENT|AUTHORITY_INTERACTION_RECORD|RUN_MANIFEST"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityInteractionRecord truth boundary must name RUN_MANIFEST, AUTHORITY_INTERACTION_RECORD, and AUDIT_EVENT only",
    );
  }
  return {
    ...contract,
    authoritative_record_families: [
      "RUN_MANIFEST",
      "AUTHORITY_INTERACTION_RECORD",
      "AUDIT_EVENT",
    ],
  };
}

export function buildAuthorityInteractionAuthorityTruthContract(): AuthorityTruthContract {
  return {
    authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    boundary_scope: "AUTHORITY_INTERACTION_RECORD",
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    surface_specific_binding_policy: "INTERACTION_RESPONSE_MEANING_CONTROLS_SETTLEMENT",
    truth_surface_role: "AUTHORITY_RUNTIME_LEDGER",
    unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
  };
}

export function normalizeAuthorityInteractionAuthorityTruthContract(
  input: AuthorityTruthContract,
): AuthorityTruthContract {
  const expected = buildAuthorityInteractionAuthorityTruthContract();
  const contract: AuthorityTruthContract = {
    authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    boundary_scope: assertEnum("authority_truth_contract.boundary_scope", input.boundary_scope, [
      "AUTHORITY_INTERACTION_RECORD",
    ] as const),
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    surface_specific_binding_policy: assertEnum(
      "authority_truth_contract.surface_specific_binding_policy",
      input.surface_specific_binding_policy,
      ["INTERACTION_RESPONSE_MEANING_CONTROLS_SETTLEMENT"] as const,
    ),
    truth_surface_role: assertEnum(
      "authority_truth_contract.truth_surface_role",
      input.truth_surface_role,
      ["AUTHORITY_RUNTIME_LEDGER"] as const,
    ),
    unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
  };
  if (hashObject("AUTHORITY_TRUTH_V1", contract) !== hashObject("AUTHORITY_TRUTH_V1", expected)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityInteractionRecord authority truth contract must preserve runtime-ledger boundary policy",
    );
  }
  return contract;
}

function normalizeNullableResolutionBasis(value: unknown): AuthorityInteractionResolutionBasis | null {
  return value == null
    ? null
    : assertEnum("resolution_basis", value, AUTHORITY_INTERACTION_RESOLUTION_BASES);
}

function normalizeBindingDriftSentinel(
  input: AuthorityBindingDriftSentinelContract,
): AuthorityBindingDriftSentinelContract {
  const sentinel = cloneRecord(input);
  if (sentinel.binding_scope_class !== "AUTHORITY_INTERACTION_RECORD") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "binding_drift_sentinel_contract must be scoped to AUTHORITY_INTERACTION_RECORD",
    );
  }
  if (sentinel.contract_version !== "AUTHORITY_BINDING_DRIFT_SENTINEL_V1") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "binding_drift_sentinel_contract must use AUTHORITY_BINDING_DRIFT_SENTINEL_V1",
    );
  }
  return sentinel;
}

function assertRequestIdentityMirrorsInteraction(record: AuthorityInteractionRecord) {
  for (const field of [
    "access_binding_hash",
    "authority_binding_ref",
    "authority_link_ref",
    "binding_lineage_ref",
    "duplicate_meaning_key",
    "idempotency_key",
    "identity_namespace_hash",
    "manifest_id",
    "operation_id",
    "policy_snapshot_hash",
    "request_hash",
    "request_id",
  ] as const) {
    if (record.request_identity_contract[field] !== record[field]) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `request_identity_contract.${field} must mirror ${field}`,
      );
    }
  }
}

function assertSentinelMirrorsInteraction(record: AuthorityInteractionRecord) {
  const sentinel = record.binding_drift_sentinel_contract;
  for (const field of [
    "access_binding_hash",
    "authority_binding_ref",
    "authority_link_ref",
    "binding_lineage_ref",
    "duplicate_meaning_key",
    "policy_snapshot_hash",
  ] as const) {
    if (sentinel[field] !== record[field]) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `binding_drift_sentinel_contract.${field} must mirror ${field}`,
      );
    }
  }
}

function assertIngressProofMirrorsInteraction(record: AuthorityInteractionRecord) {
  const proof = record.authority_ingress_proof_contract;
  if (proof === null) {
    return;
  }
  if (proof.binding_scope_class !== "AUTHORITY_INTERACTION_RECORD") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_ingress_proof_contract must be scoped to AUTHORITY_INTERACTION_RECORD",
    );
  }
  if (
    proof.normalized_response_ref_or_null !== null &&
    proof.normalized_response_ref_or_null !== record.active_response_id
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "interaction ingress proof must mirror active_response_id when it names a normalized response",
    );
  }
  for (const [proofField, recordField] of [
    ["request_hash_or_null", "request_hash"],
    ["idempotency_key_or_null", "idempotency_key"],
    ["identity_namespace_hash_or_null", "identity_namespace_hash"],
    ["duplicate_meaning_key_or_null", "duplicate_meaning_key"],
  ] as const) {
    if (proof[proofField] !== null && proof[proofField] !== record[recordField]) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `authority_ingress_proof_contract.${proofField} must mirror ${recordField} when present`,
      );
    }
  }
}

function assertControlMirrorsInteraction(record: AuthorityInteractionRecord) {
  const control = record.reconciliation_control_contract;
  if (control.binding_scope_class !== "AUTHORITY_INTERACTION_RECORD") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract must be scoped to AUTHORITY_INTERACTION_RECORD",
    );
  }
  if (control.interaction_ref_or_null !== authorityInteractionRecordRef(record)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract.interaction_ref_or_null must mirror interaction ref",
    );
  }
  if (control.authority_operation_profile_ref_or_null !== record.authority_operation_profile_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract.authority_operation_profile_ref_or_null must mirror authority_operation_profile_ref",
    );
  }
  if (control.duplicate_meaning_key_or_null !== record.duplicate_meaning_key) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract.duplicate_meaning_key_or_null must mirror duplicate_meaning_key",
    );
  }
  for (const [controlField, recordField] of [
    ["reconciliation_method", "reconciliation_method"],
    ["max_auto_reconciliation_attempts", "max_auto_reconciliation_attempts"],
    ["reconciliation_attempt_count", "reconciliation_attempt_count"],
    ["reconciliation_cadence_seconds_or_null", "reconciliation_cadence_seconds"],
    ["reconciliation_budget_state", "reconciliation_budget_state"],
    ["next_reconciliation_at_or_null", "next_reconciliation_at"],
    ["reconciliation_deadline_at_or_null", "reconciliation_deadline_at"],
  ] as const) {
    if (control[controlField] !== record[recordField]) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `reconciliation_control_contract.${controlField} must mirror ${recordField}`,
      );
    }
  }
  if (
    control.escalation_workflow_item_ref_or_null !== null &&
    control.escalation_workflow_item_ref_or_null !== record.reconciliation_workflow_item_ref
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract escalation workflow must mirror reconciliation_workflow_item_ref",
    );
  }
  if (
    control.reconciliation_budget_state !== "NOT_OPENED" &&
    control.resend_legality_state !== record.resend_legality_state
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract.resend_legality_state must mirror resend_legality_state once a reconciliation budget is open or closed",
    );
  }
  if (
    control.reconciliation_budget_state !== "NOT_OPENED" &&
    control.resend_control_reason_codes.join("|") !== record.resend_control_reason_codes.join("|")
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract.resend_control_reason_codes must mirror resend_control_reason_codes",
    );
  }
}

function assertSendRevalidationRules(record: AuthorityInteractionRecord) {
  if (record.send_revalidation_state === "NOT_PERFORMED") {
    requireNull("send_revalidated_at", record.send_revalidated_at);
    requireNull("send_authorized_token_version_ref", record.send_authorized_token_version_ref);
    requireEmpty("send_revalidation_reason_codes", record.send_revalidation_reason_codes);
    if (record.binding_drift_sentinel_contract.decision_state !== "NOT_EVALUATED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "NOT_PERFORMED send revalidation requires an unevaluated binding drift sentinel",
      );
    }
    return;
  }
  requireNonNull("send_revalidated_at", record.send_revalidated_at);
  if (record.binding_drift_sentinel_contract.checked_action_class !== "TRANSMIT_MUTATION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "performed send revalidation must be backed by a TRANSMIT_MUTATION sentinel",
    );
  }
  if (record.send_revalidation_state === "CLEAR_TO_SEND") {
    requireNonNull("send_authorized_token_version_ref", record.send_authorized_token_version_ref);
    if (
      record.binding_drift_sentinel_contract.decision_state !== "CLEAR_TO_PROCEED" ||
      record.send_revalidation_reason_codes.length !== 1 ||
      !["SEALED_TOKEN_VERSION_REUSED", "TOKEN_ROTATED_WITHIN_LINEAGE"].includes(
        record.send_revalidation_reason_codes[0] ?? "",
      )
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CLEAR_TO_SEND requires one successful token-lineage send revalidation reason",
      );
    }
    return;
  }
  requireNull("send_authorized_token_version_ref", record.send_authorized_token_version_ref);
  if (
    record.binding_drift_sentinel_contract.decision_state !== "BLOCKED" ||
    record.send_revalidation_reason_codes.length === 0
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "BLOCKED send revalidation requires persisted fail-closed reasons",
    );
  }
}

function assertPreResponseState(record: AuthorityInteractionRecord) {
  requireNull("active_response_id", record.active_response_id);
  requireEmpty("response_history_ids", record.response_history_ids);
  if (
    record.reconciliation_budget_state !== "NOT_OPENED" ||
    record.next_reconciliation_at !== null ||
    record.reconciliation_escalated_at !== null ||
    record.reconciliation_workflow_item_ref !== null ||
    record.meaning_resolution_state !== "NO_RESPONSE" ||
    record.reconciliation_attempt_count !== 0 ||
    record.reconciliation_deadline_at !== null ||
    record.resolution_basis !== null
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "pre-response interactions must not carry response, resolution, or reconciliation budget state",
    );
  }
}

function assertLifecycleStateRules(record: AuthorityInteractionRecord) {
  if (Date.parse(record.last_status_at) < Date.parse(record.created_at)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "last_status_at must not predate created_at",
    );
  }
  if (record.active_response_id !== null && !record.response_history_ids.includes(record.active_response_id)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "active_response_id must be present in response_history_ids",
    );
  }
  if (record.next_reconciliation_at !== null && record.reconciliation_budget_state !== "ACTIVE") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "next_reconciliation_at may be populated only while reconciliation budget is ACTIVE",
    );
  }
  if (record.meaning_resolution_state === "NO_RESPONSE") {
    assertPreResponseState(record);
  }

  if (["REQUEST_REGISTERED", "DISPATCH_READY"].includes(record.lifecycle_state)) {
    assertPreResponseState(record);
    requireNull("abandonment_reason_code", record.abandonment_reason_code);
    if (
      record.resend_legality_state !== "UNASSESSED" ||
      record.send_revalidation_state !== "NOT_PERFORMED" ||
      record.resend_control_reason_codes.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "queued interactions must remain unassessed for resend and send revalidation",
      );
    }
    return;
  }

  if (record.lifecycle_state === "TRANSMIT_IN_FLIGHT") {
    assertPreResponseState(record);
    requireNull("abandonment_reason_code", record.abandonment_reason_code);
    if (
      record.send_revalidation_state !== "CLEAR_TO_SEND" ||
      record.resend_legality_state !== "IDEMPOTENT_RECOVERY_ONLY" ||
      record.resend_control_reason_codes.length === 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "in-flight interactions require clear send revalidation and idempotent recovery-only resend posture",
      );
    }
    return;
  }

  if (record.lifecycle_state === "ABANDONED") {
    assertPreResponseState(record);
    requireNonNull("abandonment_reason_code", record.abandonment_reason_code);
    if (
      !["CLEAR_TO_SEND", "BLOCKED"].includes(record.send_revalidation_state) ||
      record.resend_legality_state !== "CLOSED_NO_RESEND" ||
      record.resend_control_reason_codes.length === 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "abandoned interactions require fail-closed no-resend posture and explicit abandonment reason",
      );
    }
    return;
  }

  requireNonNull("active_response_id", record.active_response_id);
  if (
    record.response_history_ids.length === 0 ||
    record.send_revalidation_state !== "CLEAR_TO_SEND" ||
    record.meaning_resolution_state === "NO_RESPONSE" ||
    record.abandonment_reason_code !== null
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "post-response interactions require active response history, clear send, and no abandonment reason",
    );
  }

  if (record.lifecycle_state === "RESPONSE_CAPTURED") {
    requireNull("resolution_basis", record.resolution_basis);
    if (
      record.reconciliation_attempt_count !== 0 ||
      ![
        "PROVISIONAL_TIMEOUT",
        "ACTIVE_DIRECT",
        "ACTIVE_CORROBORATED",
        "RECONCILIATION_REQUIRED",
      ].includes(record.meaning_resolution_state)
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RESPONSE_CAPTURED interactions cannot carry attempts or terminal resolution basis",
      );
    }
  }

  if (record.lifecycle_state === "RECONCILING") {
    requireNull("resolution_basis", record.resolution_basis);
    requireNonNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
    if (
      record.meaning_resolution_state !== "RECONCILIATION_REQUIRED" ||
      record.reconciliation_attempt_count < 1 ||
      !["ACTIVE", "EXHAUSTED", "ESCALATED"].includes(record.reconciliation_budget_state) ||
      ![
        "FOLLOW_UP_READ_ONLY",
        "BLOCKED_BY_RECONCILIATION",
        "BLOCKED_BY_ESCALATION",
      ].includes(record.resend_legality_state)
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RECONCILING interactions require unresolved meaning, attempts, deadline, and reconciliation-owned resend posture",
      );
    }
  }

  if (record.lifecycle_state === "RESOLVED") {
    requireNonNull("resolution_basis", record.resolution_basis);
    requireNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
    requireNull("next_reconciliation_at", record.next_reconciliation_at);
    if (
      record.reconciliation_budget_state !== "CLOSED" ||
      record.resend_legality_state !== "CLOSED_NO_RESEND" ||
      record.resend_control_reason_codes.length === 0 ||
      !["ACTIVE_DIRECT", "ACTIVE_CORROBORATED", "RECONCILIATION_RESOLVED"].includes(
        record.meaning_resolution_state,
      )
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RESOLVED interactions require closed budget, closed resend, and resolved meaning",
      );
    }
    if (
      record.resolution_basis === "TERMINAL_RESPONSE" &&
      (record.reconciliation_attempt_count !== 0 ||
        !["ACTIVE_DIRECT", "ACTIVE_CORROBORATED"].includes(record.meaning_resolution_state))
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "TERMINAL_RESPONSE resolution cannot carry reconciliation attempts",
      );
    }
    if (
      record.resolution_basis === "RECONCILIATION_RESULT" &&
      (record.reconciliation_attempt_count < 1 ||
        record.meaning_resolution_state !== "RECONCILIATION_RESOLVED")
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RECONCILIATION_RESULT resolution requires reconciliation attempts and reconciled meaning",
      );
    }
  }
}

export function normalizeAuthorityInteractionRecord(
  input: AuthorityInteractionRecord,
): AuthorityInteractionRecord {
  const record: AuthorityInteractionRecord = {
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash),
    active_response_id: normalizeNullableString("active_response_id", input.active_response_id),
    audit_refs: normalizeSortedStringSet("audit_refs", input.audit_refs, { minItems: 1 }),
    authority_binding_ref: requireString("authority_binding_ref", input.authority_binding_ref),
    authority_ingress_proof_contract: input.authority_ingress_proof_contract === null
      ? null
      : normalizeAuthorityIngressProofContract(input.authority_ingress_proof_contract),
    authority_link_ref: requireString("authority_link_ref", input.authority_link_ref),
    authority_operation_profile_ref: requireString(
      "authority_operation_profile_ref",
      input.authority_operation_profile_ref,
    ),
    authority_truth_contract: normalizeAuthorityInteractionAuthorityTruthContract(
      input.authority_truth_contract,
    ),
    binding_drift_sentinel_contract: normalizeBindingDriftSentinel(
      input.binding_drift_sentinel_contract,
    ),
    binding_lineage_ref: requireString("binding_lineage_ref", input.binding_lineage_ref),
    created_at: normalizeTimestamp("created_at", input.created_at),
    dispatch_ref: requireString("dispatch_ref", input.dispatch_ref),
    duplicate_meaning_key: requireString("duplicate_meaning_key", input.duplicate_meaning_key),
    idempotency_key: requireString("idempotency_key", input.idempotency_key),
    identity_namespace_hash: requireString("identity_namespace_hash", input.identity_namespace_hash),
    interaction_id: requireString("interaction_id", input.interaction_id),
    last_status_at: normalizeTimestamp("last_status_at", input.last_status_at),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, AUTHORITY_INTERACTION_LIFECYCLE_STATES),
    manifest_id: requireString("manifest_id", input.manifest_id),
    max_auto_reconciliation_attempts: assertNonNegativeInteger(
      "max_auto_reconciliation_attempts",
      input.max_auto_reconciliation_attempts,
    ),
    meaning_resolution_state: assertEnum(
      "meaning_resolution_state",
      input.meaning_resolution_state,
      AUTHORITY_INTERACTION_MEANING_RESOLUTION_STATES,
    ),
    next_reconciliation_at: normalizeNullableTimestamp(
      "next_reconciliation_at",
      input.next_reconciliation_at,
    ),
    operation_id: requireString("operation_id", input.operation_id),
    policy_snapshot_hash: requireString("policy_snapshot_hash", input.policy_snapshot_hash),
    provenance_refs: normalizeSortedStringSet("provenance_refs", input.provenance_refs, {
      minItems: 1,
    }),
    reconciliation_attempt_count: assertNonNegativeInteger(
      "reconciliation_attempt_count",
      input.reconciliation_attempt_count,
    ),
    reconciliation_budget_state: assertEnum(
      "reconciliation_budget_state",
      input.reconciliation_budget_state,
      ["NOT_OPENED", "ACTIVE", "EXHAUSTED", "ESCALATED", "CLOSED"] as const,
    ),
    reconciliation_cadence_seconds: input.reconciliation_cadence_seconds == null
      ? null
      : assertPositiveInteger("reconciliation_cadence_seconds", input.reconciliation_cadence_seconds),
    reconciliation_control_contract: normalizeAuthorityReconciliationControlContract(
      input.reconciliation_control_contract,
    ),
    reconciliation_deadline_at: normalizeNullableTimestamp(
      "reconciliation_deadline_at",
      input.reconciliation_deadline_at,
    ),
    reconciliation_escalated_at: normalizeNullableTimestamp(
      "reconciliation_escalated_at",
      input.reconciliation_escalated_at,
    ),
    reconciliation_method: assertEnum("reconciliation_method", input.reconciliation_method, [
      "NONE",
      "READ_AFTER_WRITE",
      "POLL_STATUS",
      "POLL_OBLIGATIONS",
      "MANUAL_ONLY",
    ] as const),
    reconciliation_workflow_item_ref: normalizeNullableString(
      "reconciliation_workflow_item_ref",
      input.reconciliation_workflow_item_ref,
    ),
    request_hash: requireString("request_hash", input.request_hash),
    request_id: requireString("request_id", input.request_id),
    request_identity_contract: normalizeAuthorityRequestIdentityContract(
      input.request_identity_contract,
      "AUTHORITY_INTERACTION_RECORD",
    ),
    resend_control_reason_codes: normalizeSortedStringSet(
      "resend_control_reason_codes",
      input.resend_control_reason_codes,
    ) as AuthorityReconciliationControlContract["resend_control_reason_codes"],
    resend_legality_state: assertEnum("resend_legality_state", input.resend_legality_state, [
      "UNASSESSED",
      "IDEMPOTENT_RECOVERY_ONLY",
      "FOLLOW_UP_READ_ONLY",
      "BLOCKED_BY_RECONCILIATION",
      "BLOCKED_BY_ESCALATION",
      "CLOSED_NO_RESEND",
    ] as const),
    resolution_basis: normalizeNullableResolutionBasis(input.resolution_basis),
    response_history_ids: normalizeOrderedStringSet(
      "response_history_ids",
      input.response_history_ids,
    ),
    send_authorized_token_version_ref: normalizeNullableString(
      "send_authorized_token_version_ref",
      input.send_authorized_token_version_ref,
    ),
    send_revalidated_at: normalizeNullableTimestamp("send_revalidated_at", input.send_revalidated_at),
    send_revalidation_reason_codes: normalizeSortedStringSet(
      "send_revalidation_reason_codes",
      input.send_revalidation_reason_codes,
    ) as AuthorityInteractionRecord["send_revalidation_reason_codes"],
    send_revalidation_state: assertEnum(
      "send_revalidation_state",
      input.send_revalidation_state,
      AUTHORITY_INTERACTION_SEND_REVALIDATION_STATES,
    ),
    submission_record_ref: normalizeNullableString("submission_record_ref", input.submission_record_ref),
    truth_boundary_contract: normalizeAuthorityInteractionTruthBoundaryContract(
      input.truth_boundary_contract,
    ),
    abandonment_reason_code: normalizeNullableString(
      "abandonment_reason_code",
      input.abandonment_reason_code,
    ),
  };

  assertRequestIdentityMirrorsInteraction(record);
  assertSentinelMirrorsInteraction(record);
  assertIngressProofMirrorsInteraction(record);
  assertControlMirrorsInteraction(record);
  assertSendRevalidationRules(record);
  assertLifecycleStateRules(record);
  return record;
}

export function buildAuthorityInteractionRecord(
  input: AuthorityInteractionRecordInput,
): AuthorityInteractionRecord {
  const createdAt = normalizeTimestamp("created_at", input.created_at);
  return normalizeAuthorityInteractionRecord({
    access_binding_hash: input.access_binding_hash,
    active_response_id: input.active_response_id ?? null,
    audit_refs: [...(input.audit_refs ?? [`audit://authority-interaction/${input.interaction_id}/registered`])],
    authority_binding_ref: input.authority_binding_ref,
    authority_ingress_proof_contract: input.authority_ingress_proof_contract ?? null,
    authority_link_ref: input.authority_link_ref,
    authority_operation_profile_ref: input.authority_operation_profile_ref,
    authority_truth_contract:
      input.authority_truth_contract ?? buildAuthorityInteractionAuthorityTruthContract(),
    binding_drift_sentinel_contract: input.binding_drift_sentinel_contract,
    binding_lineage_ref: input.binding_lineage_ref,
    created_at: createdAt,
    dispatch_ref: input.dispatch_ref,
    duplicate_meaning_key: input.duplicate_meaning_key,
    idempotency_key: input.idempotency_key,
    identity_namespace_hash: input.identity_namespace_hash,
    interaction_id: input.interaction_id,
    last_status_at: input.last_status_at ?? createdAt,
    lifecycle_state: input.lifecycle_state ?? "REQUEST_REGISTERED",
    manifest_id: input.manifest_id,
    max_auto_reconciliation_attempts: input.max_auto_reconciliation_attempts ?? 0,
    meaning_resolution_state: input.meaning_resolution_state ?? "NO_RESPONSE",
    next_reconciliation_at: input.next_reconciliation_at ?? null,
    operation_id: input.operation_id,
    policy_snapshot_hash: input.policy_snapshot_hash,
    provenance_refs: [
      ...(input.provenance_refs ?? [`provenance://authority-interaction/${input.interaction_id}`]),
    ],
    reconciliation_attempt_count: input.reconciliation_attempt_count ?? 0,
    reconciliation_budget_state: input.reconciliation_budget_state ?? "NOT_OPENED",
    reconciliation_cadence_seconds: input.reconciliation_cadence_seconds ?? null,
    reconciliation_control_contract: input.reconciliation_control_contract,
    reconciliation_deadline_at: input.reconciliation_deadline_at ?? null,
    reconciliation_escalated_at: input.reconciliation_escalated_at ?? null,
    reconciliation_method: input.reconciliation_method ?? "NONE",
    reconciliation_workflow_item_ref: input.reconciliation_workflow_item_ref ?? null,
    request_hash: input.request_hash,
    request_id: input.request_id,
    request_identity_contract: input.request_identity_contract,
    resend_control_reason_codes: [...(input.resend_control_reason_codes ?? [])],
    resend_legality_state: input.resend_legality_state ?? "UNASSESSED",
    resolution_basis: input.resolution_basis ?? null,
    response_history_ids: [...(input.response_history_ids ?? [])],
    send_authorized_token_version_ref: input.send_authorized_token_version_ref ?? null,
    send_revalidated_at: input.send_revalidated_at ?? null,
    send_revalidation_reason_codes: [...(input.send_revalidation_reason_codes ?? [])],
    send_revalidation_state: input.send_revalidation_state ?? "NOT_PERFORMED",
    submission_record_ref: input.submission_record_ref ?? null,
    truth_boundary_contract:
      input.truth_boundary_contract ?? buildAuthorityInteractionTruthBoundaryContract(),
    abandonment_reason_code: input.abandonment_reason_code ?? null,
  });
}

export function cloneAuthorityInteractionRecord(record: AuthorityInteractionRecord) {
  return cloneRecord(record);
}

export function authorityInteractionRecordContentFingerprint(record: AuthorityInteractionRecord) {
  return hashObject("AUTHORITY_INTERACTION_RECORD_MODEL_V1", normalizeAuthorityInteractionRecord(record));
}
