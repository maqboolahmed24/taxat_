import {
  type AuthorityIngressProofContract,
  type AuthorityReconciliationControlContract,
  type AuthorityTruthContract,
  type ExecutionModeBoundaryContract,
  type StateTransitionContract,
  AuthorityModelError,
  assertEnum,
  assertLiveComplianceBoundary,
  buildLiveExecutionModeBoundaryContract,
  buildStateTransitionContract,
  buildSubmissionRecordAuthorityTruthContract,
  cloneRecord,
  hashObject,
  normalizeAuthorityIngressProofContract,
  normalizeAuthorityReconciliationControlContract,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeStateTransitionContract,
  normalizeSubmissionRecordAuthorityTruthContract,
  normalizeTimestamp,
  refFromId,
  requireEmpty,
  requireNonNull,
  requireNull,
  requireString,
} from "./authority_common.ts";

export const SUBMISSION_RECORD_LIFECYCLE_STATES = [
  "INTENT_RECORDED",
  "TRANSMIT_PENDING",
  "TRANSMITTED",
  "PENDING_ACK",
  "CONFIRMED",
  "REJECTED",
  "UNKNOWN",
  "OUT_OF_BAND",
  "SUPERSEDED",
] as const;

export const SUBMISSION_BASELINE_TYPES = [
  "WORKING",
  "FILED",
  "AMENDED",
  "AUTHORITY_CORRECTED",
  "OUT_OF_BAND",
] as const;

export type SubmissionRecordLifecycleState = (typeof SUBMISSION_RECORD_LIFECYCLE_STATES)[number];
export type SubmissionBaselineType = (typeof SUBMISSION_BASELINE_TYPES)[number];
export type ConfirmedSubmissionBaselineType = Extract<
  SubmissionBaselineType,
  "FILED" | "AMENDED" | "AUTHORITY_CORRECTED"
>;

export type AuthorityRequestIdentityContract = {
  access_binding_hash: string;
  acting_party_ref: string;
  attempt_lineage_manifest_id: string;
  authority_binding_ref: string;
  authority_link_ref: string;
  authority_name: string;
  authority_product_profile: string;
  authority_scope: string;
  basis_type_or_null: string | null;
  binding_lineage_ref: string;
  binding_scope_class: "AUTHORITY_REQUEST_ENVELOPE" | "AUTHORITY_INTERACTION_RECORD" | "SUBMISSION_RECORD";
  business_partition_refs: string[];
  canonical_path: string;
  canonical_query: string;
  client_id: string;
  contract_version: "AUTHORITY_REQUEST_IDENTITY_CONTRACT_V1";
  delegation_grant_ref_or_null: string | null;
  duplicate_meaning_key: string;
  execution_basis_hash: string;
  header_profile_refs: string[];
  http_method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  identity_namespace_hash: string;
  identity_profile_version: "AUTHORITY_REQUEST_IDENTITY_V2";
  idempotency_key: string;
  manifest_hash: string;
  manifest_id: string;
  normalized_basis_type: string;
  normalized_obligation_ref: string;
  obligation_ref_or_null: string | null;
  operation_family: string;
  operation_id: string;
  operation_profile: string;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  request_body_hash: string;
  request_hash: string;
  request_id: string;
  subject_ref: string;
  tenant_id: string;
  token_binding_ref: string;
};

export type AuthorityRequestIdentityBuildInput = Partial<
  Omit<
    AuthorityRequestIdentityContract,
    | "binding_scope_class"
    | "business_partition_refs"
    | "contract_version"
    | "header_profile_refs"
    | "identity_profile_version"
  >
> & {
  business_partition_refs?: readonly string[];
  client_id: string;
  duplicate_meaning_key: string;
  header_profile_refs?: readonly string[];
  identity_namespace_hash: string;
  idempotency_key: string;
  manifest_id: string;
  operation_family: string;
  provider_environment: string;
  request_hash: string;
};

export type SubmissionRecord = {
  artifact_type: "SubmissionRecord";
  attempt_lineage_manifest_id: string;
  authority_evidence_ref: string | null;
  authority_ingress_proof_contract: AuthorityIngressProofContract | null;
  authority_reference: string | null;
  authority_scope: string;
  authority_truth_contract: AuthorityTruthContract;
  baseline_type: SubmissionBaselineType | null;
  basis_type: string;
  client_id: string;
  correlation_refs: string[];
  duplicate_meaning_key: string;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  idempotency_key: string | null;
  identity_namespace_hash: string;
  lifecycle_state: SubmissionRecordLifecycleState;
  manifest_id: string;
  obligation_ref: string;
  operation_family: string;
  packet_ref: string | null;
  proof_bundle_hash: string | null;
  proof_bundle_ref: string | null;
  provider_environment: string;
  reconciliation_control_contract_or_null: AuthorityReconciliationControlContract | null;
  reconciliation_deadline_at: string | null;
  rejection_reason_codes: string[];
  request_envelope_ref: string | null;
  request_hash: string | null;
  request_identity_contract: AuthorityRequestIdentityContract | null;
  response_ref: string | null;
  state_changed_at: string;
  state_transition_contract: StateTransitionContract;
  submission_id: string;
  superseded_by_submission_id: string | null;
  temporal_propagation_event_refs: string[];
};

export type SubmissionRecordBuildInput = Partial<
  Omit<
    SubmissionRecord,
    | "artifact_type"
    | "authority_truth_contract"
    | "correlation_refs"
    | "execution_mode_boundary_contract"
    | "rejection_reason_codes"
    | "state_transition_contract"
    | "temporal_propagation_event_refs"
  >
> & {
  authority_truth_contract?: AuthorityTruthContract;
  correlation_refs?: readonly string[];
  execution_mode_boundary_contract?: ExecutionModeBoundaryContract;
  rejection_reason_codes?: readonly string[];
  state_changed_at: string;
  state_transition_contract?: StateTransitionContract;
  temporal_propagation_event_refs?: readonly string[];
};

export function submissionRecordRef(record: Pick<SubmissionRecord, "submission_id"> | string) {
  return refFromId("submission-record", typeof record === "string" ? record : record.submission_id);
}

function defaultSubmissionId(input: Pick<
  SubmissionRecordBuildInput,
  "duplicate_meaning_key" | "manifest_id" | "request_hash"
>) {
  return [
    "submission-record",
    requireString("manifest_id", input.manifest_id),
    requireString("duplicate_meaning_key", input.duplicate_meaning_key).slice(0, 24),
    normalizeNullableString("request_hash", input.request_hash)?.slice(0, 16) ?? "out-of-band",
  ].join(".");
}

function normalizeCanonicalQuery(value: unknown) {
  if (typeof value !== "string") {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      "authority_request_identity_contract.canonical_query must be a string",
    );
  }
  return value;
}

function normalizeNullableIdentityString(label: string, value: unknown) {
  return value == null ? null : requireString(label, value);
}

export function buildSubmissionRequestIdentityContract(
  input: AuthorityRequestIdentityBuildInput,
): AuthorityRequestIdentityContract {
  return normalizeSubmissionRequestIdentityContract({
    access_binding_hash: input.access_binding_hash ?? "hash.access-binding.unknown",
    acting_party_ref: input.acting_party_ref ?? "actor://authority-request/unknown",
    attempt_lineage_manifest_id: input.attempt_lineage_manifest_id ?? input.manifest_id,
    authority_binding_ref: input.authority_binding_ref ?? "authority-binding://unknown",
    authority_link_ref: input.authority_link_ref ?? "authority-link://unknown",
    authority_name: input.authority_name ?? "UNKNOWN_AUTHORITY",
    authority_product_profile: input.authority_product_profile ?? "UNKNOWN_PRODUCT_PROFILE",
    authority_scope: input.authority_scope ?? "UNKNOWN_SCOPE",
    basis_type_or_null: input.basis_type_or_null ?? input.normalized_basis_type ?? null,
    binding_lineage_ref: input.binding_lineage_ref ?? "authority-binding-lineage://unknown",
    binding_scope_class: "SUBMISSION_RECORD",
    business_partition_refs: [...(input.business_partition_refs ?? ["business-partition://unknown"])],
    canonical_path: input.canonical_path ?? "/unknown-authority-path",
    canonical_query: input.canonical_query ?? "",
    client_id: input.client_id,
    contract_version: "AUTHORITY_REQUEST_IDENTITY_CONTRACT_V1",
    delegation_grant_ref_or_null: input.delegation_grant_ref_or_null ?? null,
    duplicate_meaning_key: input.duplicate_meaning_key,
    execution_basis_hash: input.execution_basis_hash ?? "hash.execution-basis.unknown",
    header_profile_refs: [...(input.header_profile_refs ?? [])],
    http_method: input.http_method ?? "POST",
    identity_namespace_hash: input.identity_namespace_hash,
    identity_profile_version: "AUTHORITY_REQUEST_IDENTITY_V2",
    idempotency_key: input.idempotency_key,
    manifest_hash: input.manifest_hash ?? "hash.manifest.unknown",
    manifest_id: input.manifest_id,
    normalized_basis_type: input.normalized_basis_type ?? input.basis_type_or_null ?? "UNKNOWN_BASIS",
    normalized_obligation_ref: input.normalized_obligation_ref ?? input.obligation_ref_or_null ?? "obligation://unknown",
    obligation_ref_or_null: input.obligation_ref_or_null ?? null,
    operation_family: input.operation_family,
    operation_id: input.operation_id ?? "authority-operation://unknown",
    operation_profile: input.operation_profile ?? "authority-operation-profile://unknown",
    policy_snapshot_hash: input.policy_snapshot_hash ?? "hash.policy-snapshot.unknown",
    provider_api_version: input.provider_api_version ?? "unknown",
    provider_environment: input.provider_environment,
    request_body_hash: input.request_body_hash ?? "hash.request-body.unknown",
    request_hash: input.request_hash,
    request_id: input.request_id ?? "authority-request://unknown",
    subject_ref: input.subject_ref ?? `client://${input.client_id}`,
    tenant_id: input.tenant_id ?? "tenant://unknown",
    token_binding_ref: input.token_binding_ref ?? "authority-token-binding://unknown",
  });
}

export function normalizeAuthorityRequestIdentityContract(
  input: AuthorityRequestIdentityContract,
  expectedBindingScopeClass: AuthorityRequestIdentityContract["binding_scope_class"],
): AuthorityRequestIdentityContract {
  const contract: AuthorityRequestIdentityContract = {
    access_binding_hash: requireString("authority_request_identity_contract.access_binding_hash", input.access_binding_hash),
    acting_party_ref: requireString("authority_request_identity_contract.acting_party_ref", input.acting_party_ref),
    attempt_lineage_manifest_id: requireString(
      "authority_request_identity_contract.attempt_lineage_manifest_id",
      input.attempt_lineage_manifest_id,
    ),
    authority_binding_ref: requireString("authority_request_identity_contract.authority_binding_ref", input.authority_binding_ref),
    authority_link_ref: requireString("authority_request_identity_contract.authority_link_ref", input.authority_link_ref),
    authority_name: requireString("authority_request_identity_contract.authority_name", input.authority_name),
    authority_product_profile: requireString(
      "authority_request_identity_contract.authority_product_profile",
      input.authority_product_profile,
    ),
    authority_scope: requireString("authority_request_identity_contract.authority_scope", input.authority_scope),
    basis_type_or_null: normalizeNullableIdentityString(
      "authority_request_identity_contract.basis_type_or_null",
      input.basis_type_or_null,
    ),
    binding_lineage_ref: requireString("authority_request_identity_contract.binding_lineage_ref", input.binding_lineage_ref),
    binding_scope_class: assertEnum(
      "authority_request_identity_contract.binding_scope_class",
      input.binding_scope_class,
      [expectedBindingScopeClass] as const,
    ),
    business_partition_refs: normalizeSortedStringSet(
      "authority_request_identity_contract.business_partition_refs",
      input.business_partition_refs,
    ),
    canonical_path: requireString("authority_request_identity_contract.canonical_path", input.canonical_path),
    canonical_query: normalizeCanonicalQuery(input.canonical_query),
    client_id: requireString("authority_request_identity_contract.client_id", input.client_id),
    contract_version: "AUTHORITY_REQUEST_IDENTITY_CONTRACT_V1",
    delegation_grant_ref_or_null: normalizeNullableIdentityString(
      "authority_request_identity_contract.delegation_grant_ref_or_null",
      input.delegation_grant_ref_or_null,
    ),
    duplicate_meaning_key: requireString(
      "authority_request_identity_contract.duplicate_meaning_key",
      input.duplicate_meaning_key,
    ),
    execution_basis_hash: requireString(
      "authority_request_identity_contract.execution_basis_hash",
      input.execution_basis_hash,
    ),
    header_profile_refs: normalizeSortedStringSet(
      "authority_request_identity_contract.header_profile_refs",
      input.header_profile_refs,
    ),
    http_method: assertEnum("authority_request_identity_contract.http_method", input.http_method, [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ] as const),
    identity_namespace_hash: requireString(
      "authority_request_identity_contract.identity_namespace_hash",
      input.identity_namespace_hash,
    ),
    identity_profile_version: "AUTHORITY_REQUEST_IDENTITY_V2",
    idempotency_key: requireString("authority_request_identity_contract.idempotency_key", input.idempotency_key),
    manifest_hash: requireString("authority_request_identity_contract.manifest_hash", input.manifest_hash),
    manifest_id: requireString("authority_request_identity_contract.manifest_id", input.manifest_id),
    normalized_basis_type: requireString(
      "authority_request_identity_contract.normalized_basis_type",
      input.normalized_basis_type,
    ),
    normalized_obligation_ref: requireString(
      "authority_request_identity_contract.normalized_obligation_ref",
      input.normalized_obligation_ref,
    ),
    obligation_ref_or_null: normalizeNullableIdentityString(
      "authority_request_identity_contract.obligation_ref_or_null",
      input.obligation_ref_or_null,
    ),
    operation_family: requireString("authority_request_identity_contract.operation_family", input.operation_family),
    operation_id: requireString("authority_request_identity_contract.operation_id", input.operation_id),
    operation_profile: requireString("authority_request_identity_contract.operation_profile", input.operation_profile),
    policy_snapshot_hash: requireString(
      "authority_request_identity_contract.policy_snapshot_hash",
      input.policy_snapshot_hash,
    ),
    provider_api_version: requireString(
      "authority_request_identity_contract.provider_api_version",
      input.provider_api_version,
    ),
    provider_environment: requireString(
      "authority_request_identity_contract.provider_environment",
      input.provider_environment,
    ),
    request_body_hash: requireString("authority_request_identity_contract.request_body_hash", input.request_body_hash),
    request_hash: requireString("authority_request_identity_contract.request_hash", input.request_hash),
    request_id: requireString("authority_request_identity_contract.request_id", input.request_id),
    subject_ref: requireString("authority_request_identity_contract.subject_ref", input.subject_ref),
    tenant_id: requireString("authority_request_identity_contract.tenant_id", input.tenant_id),
    token_binding_ref: requireString("authority_request_identity_contract.token_binding_ref", input.token_binding_ref),
  };
  return contract;
}

export function normalizeSubmissionRequestIdentityContract(
  input: AuthorityRequestIdentityContract,
): AuthorityRequestIdentityContract {
  return normalizeAuthorityRequestIdentityContract(input, "SUBMISSION_RECORD");
}

function normalizeBaselineType(value: SubmissionBaselineType | null | undefined) {
  return value == null ? null : assertEnum("baseline_type", value, SUBMISSION_BASELINE_TYPES);
}

function assertProofBundle(record: SubmissionRecord) {
  requireNonNull("proof_bundle_ref", record.proof_bundle_ref);
  requireNonNull("proof_bundle_hash", record.proof_bundle_hash);
}

function assertRequestBacked(record: SubmissionRecord) {
  requireNonNull("packet_ref", record.packet_ref);
  requireNonNull("request_hash", record.request_hash);
  requireNonNull("request_envelope_ref", record.request_envelope_ref);
  requireNonNull("request_identity_contract", record.request_identity_contract);
  requireNonNull("idempotency_key", record.idempotency_key);
  assertProofBundle(record);
}

function assertRequestIdentityMirrorsRecord(record: SubmissionRecord) {
  if (record.request_identity_contract === null) {
    return;
  }
  for (const field of [
    "client_id",
    "manifest_id",
    "attempt_lineage_manifest_id",
    "provider_environment",
    "authority_scope",
    "operation_family",
    "request_hash",
    "idempotency_key",
    "identity_namespace_hash",
    "duplicate_meaning_key",
  ] as const) {
    if (record.request_identity_contract[field] !== record[field]) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `request_identity_contract.${field} must mirror ${field}`,
      );
    }
  }
  if (record.request_identity_contract.obligation_ref_or_null !== record.obligation_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "request_identity_contract.obligation_ref_or_null must mirror obligation_ref",
    );
  }
  if (record.request_identity_contract.basis_type_or_null !== record.basis_type) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "request_identity_contract.basis_type_or_null must mirror basis_type",
    );
  }
}

function assertIngressProofMatchesRecord(record: SubmissionRecord) {
  const proof = record.authority_ingress_proof_contract;
  if (proof === null) {
    return;
  }
  if (proof.binding_scope_class !== "SUBMISSION_RECORD") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "SubmissionRecord ingress proof must be scoped to SUBMISSION_RECORD",
    );
  }
  const canonicalReceiptRef = proof.canonical_ingress_receipt_ref_or_null;
  if (canonicalReceiptRef !== null && !record.correlation_refs.includes(canonicalReceiptRef)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "correlation_refs must include the canonical ingress receipt ref used by the settlement proof",
    );
  }
  if (["PENDING_ACK", "CONFIRMED", "REJECTED"].includes(record.lifecycle_state)) {
    requireNonNull("authority_ingress_proof_contract", proof);
    if (
      proof.authenticated_channel_state !== "AUTHENTICATED" ||
      proof.correlation_status_or_null !== "BOUND" ||
      proof.mutation_gate_state !== "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT"
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "request-backed settlement mutations require authenticated, bound, mutation-attributed ingress proof",
      );
    }
    if (proof.normalized_response_ref_or_null !== record.response_ref) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract.normalized_response_ref_or_null must mirror response_ref",
      );
    }
    if (proof.request_hash_or_null !== record.request_hash) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract.request_hash_or_null must mirror request_hash",
      );
    }
    if (proof.idempotency_key_or_null !== record.idempotency_key) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract.idempotency_key_or_null must mirror idempotency_key",
      );
    }
    if (proof.identity_namespace_hash_or_null !== record.identity_namespace_hash) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract.identity_namespace_hash_or_null must mirror identity_namespace_hash",
      );
    }
    if (proof.duplicate_meaning_key_or_null !== record.duplicate_meaning_key) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract.duplicate_meaning_key_or_null must mirror duplicate_meaning_key",
      );
    }
    if (proof.authority_reference_or_null !== record.authority_reference) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract.authority_reference_or_null must mirror authority_reference",
      );
    }
  }
}

function expectedSubmissionTruthState(lifecycleState: SubmissionRecordLifecycleState) {
  return (
    {
      CONFIRMED: "CONFIRMED",
      OUT_OF_BAND: "OUT_OF_BAND",
      PENDING_ACK: "PENDING_ACK",
      REJECTED: "REJECTED",
      UNKNOWN: "UNKNOWN",
    } as const
  )[lifecycleState];
}

function assertReconciliationControlMatchesRecord(record: SubmissionRecord) {
  const control = record.reconciliation_control_contract_or_null;
  if (["PENDING_ACK", "UNKNOWN", "OUT_OF_BAND"].includes(record.lifecycle_state)) {
    requireNonNull("reconciliation_control_contract_or_null", control);
  }
  if (control === null) {
    return;
  }
  if (control.binding_scope_class !== "SUBMISSION_RECORD") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "SubmissionRecord reconciliation control must be scoped to SUBMISSION_RECORD",
    );
  }
  const expectedTruth = expectedSubmissionTruthState(record.lifecycle_state);
  if (expectedTruth !== undefined && control.authority_truth_state !== expectedTruth) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract_or_null.authority_truth_state must mirror submission truth",
    );
  }
  if (control.provider_environment_or_null !== record.provider_environment) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract_or_null.provider_environment_or_null must mirror provider_environment",
    );
  }
  if (control.operation_family_or_null !== record.operation_family) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract_or_null.operation_family_or_null must mirror operation_family",
    );
  }
  if (control.duplicate_meaning_key_or_null !== record.duplicate_meaning_key) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract_or_null.duplicate_meaning_key_or_null must mirror duplicate_meaning_key",
    );
  }
  if (control.submission_lifecycle_state_or_null !== record.lifecycle_state) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract_or_null.submission_lifecycle_state_or_null must mirror lifecycle_state",
    );
  }
  if (control.reconciliation_deadline_at_or_null !== record.reconciliation_deadline_at) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_control_contract_or_null.reconciliation_deadline_at_or_null must mirror reconciliation_deadline_at",
    );
  }
  if (
    ["PENDING_ACK", "UNKNOWN"].includes(record.lifecycle_state) &&
    ["NOT_OPENED", "CLOSED"].includes(control.reconciliation_budget_state)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "pending and unknown submission states must keep an open reconciliation budget",
    );
  }
  if (
    ["CONFIRMED", "REJECTED", "OUT_OF_BAND"].includes(record.lifecycle_state) &&
    control.reconciliation_budget_state !== "CLOSED"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority-grounded terminal submission controls must be CLOSED",
    );
  }
}

function assertStateSpecificSubmissionRules(record: SubmissionRecord) {
  if (
    (record.proof_bundle_ref === null) !== (record.proof_bundle_hash === null)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "proof_bundle_ref and proof_bundle_hash must appear together",
    );
  }
  if (record.superseded_by_submission_id === record.submission_id) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "superseded_by_submission_id must not point to submission_id",
    );
  }
  if (record.reconciliation_deadline_at !== null && !["PENDING_ACK", "UNKNOWN"].includes(record.lifecycle_state)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation_deadline_at may remain populated only for PENDING_ACK or UNKNOWN",
    );
  }
  if (record.rejection_reason_codes.length > 0 && record.lifecycle_state !== "REJECTED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "rejection_reason_codes may be non-empty only for REJECTED",
    );
  }
  if (record.superseded_by_submission_id !== null && record.lifecycle_state !== "SUPERSEDED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "superseded_by_submission_id may be non-null only for SUPERSEDED",
    );
  }

  switch (record.lifecycle_state) {
    case "INTENT_RECORDED":
      assertRequestBacked(record);
      requireNull("response_ref", record.response_ref);
      requireNull("authority_reference", record.authority_reference);
      requireNull("authority_evidence_ref", record.authority_evidence_ref);
      requireNull("baseline_type", record.baseline_type);
      requireNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireNull("superseded_by_submission_id", record.superseded_by_submission_id);
      requireEmpty("rejection_reason_codes", record.rejection_reason_codes);
      requireNull("authority_ingress_proof_contract", record.authority_ingress_proof_contract);
      break;
    case "TRANSMIT_PENDING":
    case "TRANSMITTED":
      assertRequestBacked(record);
      requireNull("response_ref", record.response_ref);
      requireNull("authority_reference", record.authority_reference);
      requireNull("authority_evidence_ref", record.authority_evidence_ref);
      requireNull("baseline_type", record.baseline_type);
      requireNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireNull("superseded_by_submission_id", record.superseded_by_submission_id);
      requireEmpty("rejection_reason_codes", record.rejection_reason_codes);
      requireNull("authority_ingress_proof_contract", record.authority_ingress_proof_contract);
      break;
    case "PENDING_ACK":
      assertRequestBacked(record);
      requireNonNull("response_ref", record.response_ref);
      requireNonNull("authority_ingress_proof_contract", record.authority_ingress_proof_contract);
      requireNonNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireNonNull("reconciliation_control_contract_or_null", record.reconciliation_control_contract_or_null);
      requireNull("baseline_type", record.baseline_type);
      requireNull("superseded_by_submission_id", record.superseded_by_submission_id);
      requireEmpty("rejection_reason_codes", record.rejection_reason_codes);
      break;
    case "CONFIRMED":
      assertRequestBacked(record);
      requireNonNull("response_ref", record.response_ref);
      requireNonNull("authority_reference", record.authority_reference);
      requireNonNull("authority_evidence_ref", record.authority_evidence_ref);
      requireNonNull("authority_ingress_proof_contract", record.authority_ingress_proof_contract);
      assertEnum("baseline_type", record.baseline_type, [
        "FILED",
        "AMENDED",
        "AUTHORITY_CORRECTED",
      ] as const);
      if (record.temporal_propagation_event_refs.length === 0) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "confirmed submission records must retain temporal_propagation_event_refs",
        );
      }
      requireNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireNull("superseded_by_submission_id", record.superseded_by_submission_id);
      requireEmpty("rejection_reason_codes", record.rejection_reason_codes);
      break;
    case "REJECTED":
      assertRequestBacked(record);
      requireNonNull("response_ref", record.response_ref);
      requireNonNull("authority_evidence_ref", record.authority_evidence_ref);
      requireNonNull("authority_ingress_proof_contract", record.authority_ingress_proof_contract);
      requireNull("baseline_type", record.baseline_type);
      requireNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireNull("superseded_by_submission_id", record.superseded_by_submission_id);
      if (record.rejection_reason_codes.length === 0) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "REJECTED submission records require rejection_reason_codes",
        );
      }
      break;
    case "UNKNOWN":
      assertRequestBacked(record);
      requireNonNull("response_ref", record.response_ref);
      requireNonNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireNonNull("reconciliation_control_contract_or_null", record.reconciliation_control_contract_or_null);
      requireNull("baseline_type", record.baseline_type);
      requireNull("superseded_by_submission_id", record.superseded_by_submission_id);
      requireEmpty("rejection_reason_codes", record.rejection_reason_codes);
      break;
    case "OUT_OF_BAND":
      requireNull("packet_ref", record.packet_ref);
      requireNull("request_hash", record.request_hash);
      requireNull("request_envelope_ref", record.request_envelope_ref);
      requireNull("request_identity_contract", record.request_identity_contract);
      requireNull("idempotency_key", record.idempotency_key);
      requireNull("response_ref", record.response_ref);
      requireNonNull("authority_evidence_ref", record.authority_evidence_ref);
      assertProofBundle(record);
      if (record.baseline_type !== "OUT_OF_BAND") {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "OUT_OF_BAND submission records require baseline_type OUT_OF_BAND",
        );
      }
      if (record.temporal_propagation_event_refs.length === 0) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "OUT_OF_BAND submission records must retain temporal_propagation_event_refs",
        );
      }
      requireNonNull("reconciliation_control_contract_or_null", record.reconciliation_control_contract_or_null);
      requireNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireNull("superseded_by_submission_id", record.superseded_by_submission_id);
      requireEmpty("rejection_reason_codes", record.rejection_reason_codes);
      break;
    case "SUPERSEDED":
      assertRequestBacked(record);
      requireNonNull("superseded_by_submission_id", record.superseded_by_submission_id);
      requireNull("baseline_type", record.baseline_type);
      requireNull("reconciliation_deadline_at", record.reconciliation_deadline_at);
      requireEmpty("rejection_reason_codes", record.rejection_reason_codes);
      break;
  }
}

export function buildSubmissionRecord(input: SubmissionRecordBuildInput): SubmissionRecord {
  const lifecycleState = input.lifecycle_state ?? "INTENT_RECORDED";
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  const submissionId = input.submission_id ?? defaultSubmissionId(input);
  const record: SubmissionRecord = {
    artifact_type: "SubmissionRecord",
    attempt_lineage_manifest_id: requireString(
      "attempt_lineage_manifest_id",
      input.attempt_lineage_manifest_id,
    ),
    authority_evidence_ref: normalizeNullableString("authority_evidence_ref", input.authority_evidence_ref),
    authority_ingress_proof_contract: input.authority_ingress_proof_contract
      ? normalizeAuthorityIngressProofContract(input.authority_ingress_proof_contract)
      : null,
    authority_reference: normalizeNullableString("authority_reference", input.authority_reference),
    authority_scope: requireString("authority_scope", input.authority_scope),
    authority_truth_contract: input.authority_truth_contract ?? buildSubmissionRecordAuthorityTruthContract(),
    baseline_type: normalizeBaselineType(input.baseline_type),
    basis_type: requireString("basis_type", input.basis_type),
    client_id: requireString("client_id", input.client_id),
    correlation_refs: normalizeSortedStringSet("correlation_refs", input.correlation_refs),
    duplicate_meaning_key: requireString("duplicate_meaning_key", input.duplicate_meaning_key),
    execution_mode_boundary_contract: input.execution_mode_boundary_contract ?? buildLiveExecutionModeBoundaryContract(),
    idempotency_key: normalizeNullableString("idempotency_key", input.idempotency_key),
    identity_namespace_hash: requireString("identity_namespace_hash", input.identity_namespace_hash),
    lifecycle_state: assertEnum("lifecycle_state", lifecycleState, SUBMISSION_RECORD_LIFECYCLE_STATES),
    manifest_id: requireString("manifest_id", input.manifest_id),
    obligation_ref: requireString("obligation_ref", input.obligation_ref),
    operation_family: requireString("operation_family", input.operation_family),
    packet_ref: normalizeNullableString("packet_ref", input.packet_ref),
    proof_bundle_hash: normalizeNullableString("proof_bundle_hash", input.proof_bundle_hash),
    proof_bundle_ref: normalizeNullableString("proof_bundle_ref", input.proof_bundle_ref),
    provider_environment: requireString("provider_environment", input.provider_environment),
    reconciliation_control_contract_or_null: input.reconciliation_control_contract_or_null
      ? normalizeAuthorityReconciliationControlContract(input.reconciliation_control_contract_or_null)
      : null,
    reconciliation_deadline_at: normalizeNullableTimestamp(
      "reconciliation_deadline_at",
      input.reconciliation_deadline_at,
    ),
    rejection_reason_codes: normalizeSortedStringSet(
      "rejection_reason_codes",
      input.rejection_reason_codes,
    ),
    request_envelope_ref: normalizeNullableString("request_envelope_ref", input.request_envelope_ref),
    request_hash: normalizeNullableString("request_hash", input.request_hash),
    request_identity_contract: input.request_identity_contract
      ? normalizeSubmissionRequestIdentityContract(input.request_identity_contract)
      : null,
    response_ref: normalizeNullableString("response_ref", input.response_ref),
    state_changed_at: stateChangedAt,
    state_transition_contract:
      input.state_transition_contract ??
      buildStateTransitionContract({
        current_state: lifecycleState,
        object_family: "SUBMISSION_RECORD",
        previous_state_or_null: null,
        transition_applied_at: stateChangedAt,
        transition_event_code: lifecycleState === "INTENT_RECORDED" ? "intent_recorded" : "submission_record_upserted",
      }),
    submission_id: requireString("submission_id", submissionId),
    superseded_by_submission_id: normalizeNullableString(
      "superseded_by_submission_id",
      input.superseded_by_submission_id,
    ),
    temporal_propagation_event_refs: normalizeOrderedStringSet(
      "temporal_propagation_event_refs",
      input.temporal_propagation_event_refs,
    ),
  };
  return normalizeSubmissionRecord(record);
}

export function normalizeSubmissionRecord(input: SubmissionRecord): SubmissionRecord {
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at);
  const record: SubmissionRecord = {
    ...input,
    artifact_type: "SubmissionRecord",
    attempt_lineage_manifest_id: requireString(
      "attempt_lineage_manifest_id",
      input.attempt_lineage_manifest_id,
    ),
    authority_evidence_ref: normalizeNullableString("authority_evidence_ref", input.authority_evidence_ref),
    authority_ingress_proof_contract: input.authority_ingress_proof_contract
      ? normalizeAuthorityIngressProofContract(input.authority_ingress_proof_contract)
      : null,
    authority_reference: normalizeNullableString("authority_reference", input.authority_reference),
    authority_scope: requireString("authority_scope", input.authority_scope),
    authority_truth_contract: normalizeSubmissionRecordAuthorityTruthContract(input.authority_truth_contract),
    baseline_type: normalizeBaselineType(input.baseline_type),
    basis_type: requireString("basis_type", input.basis_type),
    client_id: requireString("client_id", input.client_id),
    correlation_refs: normalizeSortedStringSet("correlation_refs", input.correlation_refs),
    duplicate_meaning_key: requireString("duplicate_meaning_key", input.duplicate_meaning_key),
    execution_mode_boundary_contract: assertLiveComplianceBoundary(input.execution_mode_boundary_contract),
    idempotency_key: normalizeNullableString("idempotency_key", input.idempotency_key),
    identity_namespace_hash: requireString("identity_namespace_hash", input.identity_namespace_hash),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, SUBMISSION_RECORD_LIFECYCLE_STATES),
    manifest_id: requireString("manifest_id", input.manifest_id),
    obligation_ref: requireString("obligation_ref", input.obligation_ref),
    operation_family: requireString("operation_family", input.operation_family),
    packet_ref: normalizeNullableString("packet_ref", input.packet_ref),
    proof_bundle_hash: normalizeNullableString("proof_bundle_hash", input.proof_bundle_hash),
    proof_bundle_ref: normalizeNullableString("proof_bundle_ref", input.proof_bundle_ref),
    provider_environment: requireString("provider_environment", input.provider_environment),
    reconciliation_control_contract_or_null: input.reconciliation_control_contract_or_null
      ? normalizeAuthorityReconciliationControlContract(input.reconciliation_control_contract_or_null)
      : null,
    reconciliation_deadline_at: normalizeNullableTimestamp(
      "reconciliation_deadline_at",
      input.reconciliation_deadline_at,
    ),
    rejection_reason_codes: normalizeSortedStringSet(
      "rejection_reason_codes",
      input.rejection_reason_codes,
    ),
    request_envelope_ref: normalizeNullableString("request_envelope_ref", input.request_envelope_ref),
    request_hash: normalizeNullableString("request_hash", input.request_hash),
    request_identity_contract: input.request_identity_contract
      ? normalizeSubmissionRequestIdentityContract(input.request_identity_contract)
      : null,
    response_ref: normalizeNullableString("response_ref", input.response_ref),
    state_changed_at: stateChangedAt,
    state_transition_contract: normalizeStateTransitionContract(input.state_transition_contract, {
      current_state: input.lifecycle_state,
      machine_code: "SUBMISSION_RECORD_LIFECYCLE_V1",
      object_family: "SUBMISSION_RECORD",
      state_field_name: "lifecycle_state",
      transition_applied_at: stateChangedAt,
    }),
    submission_id: requireString("submission_id", input.submission_id),
    superseded_by_submission_id: normalizeNullableString(
      "superseded_by_submission_id",
      input.superseded_by_submission_id,
    ),
    temporal_propagation_event_refs: normalizeOrderedStringSet(
      "temporal_propagation_event_refs",
      input.temporal_propagation_event_refs,
    ),
  };
  assertRequestIdentityMirrorsRecord(record);
  assertIngressProofMatchesRecord(record);
  assertReconciliationControlMatchesRecord(record);
  assertStateSpecificSubmissionRules(record);
  return record;
}

export function submissionRecordContentFingerprint(record: SubmissionRecord) {
  return hashObject("SUBMISSION_RECORD_CONTENT_V1", {
    authority_evidence_ref: record.authority_evidence_ref,
    authority_reference: record.authority_reference,
    baseline_type: record.baseline_type,
    duplicate_meaning_key: record.duplicate_meaning_key,
    lifecycle_state: record.lifecycle_state,
    proof_bundle_hash: record.proof_bundle_hash,
    proof_bundle_ref: record.proof_bundle_ref,
    request_hash: record.request_hash,
    response_ref: record.response_ref,
    superseded_by_submission_id: record.superseded_by_submission_id,
  });
}

export function cloneSubmissionRecord(record: SubmissionRecord) {
  return cloneRecord(record);
}
