import { NONE_SENTINEL, stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AuthorityIngressProofContract,
  type AuthorityTruthContract,
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  hashObject,
  normalizeAuthorityIngressProofContract,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireNonNull,
  requireNull,
  requireString,
  stableEqual,
} from "./authority_common.ts";

export const AUTHORITY_INGRESS_CHANNEL_CLASSES = [
  "CALLBACK",
  "POLL_RESULT",
  "INBOX_DELIVERY",
  "WORKER_OBSERVED",
  "GATEWAY_RECOVERED",
] as const;

export const AUTHORITY_INGRESS_CORRELATION_STATUSES = [
  "BOUND",
  "BOUND_WITH_AUTHORITY_REFERENCE_ONLY",
  "AMBIGUOUS",
  "UNBOUND",
] as const;

export const AUTHORITY_INGRESS_RECEIPT_STATES = [
  "PERSISTED",
  "NORMALIZED",
  "QUARANTINED",
  "DUPLICATE_SUPPRESSED",
] as const;

export type AuthorityIngressChannelClass = (typeof AUTHORITY_INGRESS_CHANNEL_CLASSES)[number];
export type AuthorityIngressCorrelationStatus = (typeof AUTHORITY_INGRESS_CORRELATION_STATUSES)[number];
export type AuthorityIngressReceiptState = (typeof AUTHORITY_INGRESS_RECEIPT_STATES)[number];
export type AuthorityIngressAuthenticatedChannelState = "AUTHENTICATED" | "FAILED";
export type AuthorityIngressLineageBindingBasis =
  | "REQUEST_HASH_EXACT"
  | "IDEMPOTENCY_TUPLE_EXACT"
  | "REQUEST_HASH_AND_TUPLE_EXACT"
  | "AUTHORITY_REFERENCE_ONLY"
  | "AMBIGUOUS_MULTI_MATCH"
  | "UNBOUND_NO_MATCH";
export type AuthorityIngressComparisonSetState =
  | "ONE_EXACT_MATCH"
  | "WEAK_MATCH_ONLY"
  | "MULTI_MATCH"
  | "NO_MATCH"
  | "MISSING_PROVIDER_KEYS";
export type AuthorityIngressResolutionState =
  | "EXACT_BOUND"
  | "WEAK_AUTHORITY_REFERENCE_ONLY"
  | "AMBIGUOUS_MULTI_MATCH"
  | "UNBOUND_NO_MATCH"
  | "UNBOUND_MISSING_IDENTITY_CLAIMS";
export type AuthorityIngressCandidateMatchBasis =
  | "AUTHORITY_REFERENCE_MATCH"
  | "DUPLICATE_MEANING_KEY_MATCH"
  | "IDEMPOTENCY_KEY_MATCH"
  | "IDENTITY_NAMESPACE_HASH_MATCH"
  | "REQUEST_HASH_MATCH";

export type AuthorityIngressCandidateLineage = {
  authority_reference_or_null: string | null;
  candidate_rank: number;
  divergence_reason_codes: string[];
  duplicate_meaning_key_or_null: string | null;
  idempotency_key_or_null: string | null;
  identity_namespace_hash_or_null: string | null;
  interaction_ref: string;
  latest_obligation_mirror_ref_or_null: string | null;
  latest_submission_record_ref_or_null: string | null;
  match_basis_codes: AuthorityIngressCandidateMatchBasis[];
  request_hash_or_null: string | null;
};

export type AuthorityIngressCorrelationContract = {
  bound_artifact_type: "AuthorityIngressReceipt";
  candidate_lineages: AuthorityIngressCandidateLineage[];
  comparison_set_state: AuthorityIngressComparisonSetState;
  contract_version: "AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1";
  correlation_reason_codes: string[];
  correlation_status: AuthorityIngressCorrelationStatus;
  extracted_authority_reference_or_null: string | null;
  extracted_duplicate_meaning_key_or_null: string | null;
  extracted_idempotency_key_or_null: string | null;
  extracted_identity_namespace_hash_or_null: string | null;
  extracted_request_hash_or_null: string | null;
  legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION";
  lineage_binding_basis: AuthorityIngressLineageBindingBasis;
  request_lineage_comparison_policy: "PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY";
  resolution_state: AuthorityIngressResolutionState;
};

export type AuthorityIngressReceipt = {
  artifact_type: "AuthorityIngressReceipt";
  audit_event_refs: string[];
  authenticated_channel_state: AuthorityIngressAuthenticatedChannelState;
  authority_ingress_correlation_contract: AuthorityIngressCorrelationContract;
  authority_ingress_proof_contract: AuthorityIngressProofContract;
  authority_reference: string | null;
  authority_truth_contract: AuthorityTruthContract;
  bound_interaction_ref: string | null;
  canonical_ingress_receipt_ref: string | null;
  correlation_status: AuthorityIngressCorrelationStatus;
  delivery_dedupe_key: string;
  duplicate_meaning_key: string | null;
  idempotency_key: string | null;
  identity_namespace_hash: string | null;
  ingress_channel_class: AuthorityIngressChannelClass;
  ingress_channel_metadata_hash: string;
  ingress_receipt_id: string;
  normalized_response_ref: string | null;
  persisted_at: string;
  provider_delivery_ref: string;
  provider_environment: string;
  provider_profile_ref: string;
  quarantine_reason_codes: string[];
  quarantined_at: string | null;
  received_at: string;
  reconciliation_owner_ref: string | null;
  request_hash: string | null;
  response_body_hash: string;
  response_body_ref: string | null;
  receipt_state: AuthorityIngressReceiptState;
};

export type AuthorityIngressReceiptBuildInput = Omit<
  Partial<AuthorityIngressReceipt>,
  | "artifact_type"
  | "audit_event_refs"
  | "authority_ingress_correlation_contract"
  | "authority_ingress_proof_contract"
  | "authority_truth_contract"
  | "quarantine_reason_codes"
> & {
  audit_event_refs?: readonly string[];
  authority_ingress_correlation_contract: AuthorityIngressCorrelationContract;
  authority_ingress_proof_contract: AuthorityIngressProofContract;
  authority_truth_contract?: AuthorityTruthContract;
  quarantine_reason_codes?: readonly string[];
  response_body?: unknown;
  response_body_hash?: string | null;
};

function normalizePositiveInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", `${label} must be a positive integer`);
  }
  return value;
}

function normalizeCandidateLineage(candidate: AuthorityIngressCandidateLineage): AuthorityIngressCandidateLineage {
  return {
    authority_reference_or_null: normalizeNullableString(
      "candidate_lineage.authority_reference_or_null",
      candidate.authority_reference_or_null,
    ),
    candidate_rank: normalizePositiveInteger("candidate_lineage.candidate_rank", candidate.candidate_rank),
    divergence_reason_codes: normalizeSortedStringSet(
      "candidate_lineage.divergence_reason_codes",
      candidate.divergence_reason_codes,
    ),
    duplicate_meaning_key_or_null: normalizeNullableString(
      "candidate_lineage.duplicate_meaning_key_or_null",
      candidate.duplicate_meaning_key_or_null,
    ),
    idempotency_key_or_null: normalizeNullableString(
      "candidate_lineage.idempotency_key_or_null",
      candidate.idempotency_key_or_null,
    ),
    identity_namespace_hash_or_null: normalizeNullableString(
      "candidate_lineage.identity_namespace_hash_or_null",
      candidate.identity_namespace_hash_or_null,
    ),
    interaction_ref: requireString("candidate_lineage.interaction_ref", candidate.interaction_ref),
    latest_obligation_mirror_ref_or_null: normalizeNullableString(
      "candidate_lineage.latest_obligation_mirror_ref_or_null",
      candidate.latest_obligation_mirror_ref_or_null,
    ),
    latest_submission_record_ref_or_null: normalizeNullableString(
      "candidate_lineage.latest_submission_record_ref_or_null",
      candidate.latest_submission_record_ref_or_null,
    ),
    match_basis_codes: normalizeSortedStringSet(
      "candidate_lineage.match_basis_codes",
      candidate.match_basis_codes,
      { minItems: 1 },
    ) as AuthorityIngressCandidateMatchBasis[],
    request_hash_or_null: normalizeNullableString(
      "candidate_lineage.request_hash_or_null",
      candidate.request_hash_or_null,
    ),
  };
}

export function normalizeAuthorityIngressCorrelationContract(
  input: AuthorityIngressCorrelationContract,
): AuthorityIngressCorrelationContract {
  const contract: AuthorityIngressCorrelationContract = {
    bound_artifact_type: "AuthorityIngressReceipt",
    candidate_lineages: input.candidate_lineages
      .map(normalizeCandidateLineage)
      .sort((left, right) => left.candidate_rank - right.candidate_rank || left.interaction_ref.localeCompare(right.interaction_ref)),
    comparison_set_state: assertEnum("authority_ingress_correlation_contract.comparison_set_state", input.comparison_set_state, [
      "ONE_EXACT_MATCH",
      "WEAK_MATCH_ONLY",
      "MULTI_MATCH",
      "NO_MATCH",
      "MISSING_PROVIDER_KEYS",
    ] as const),
    contract_version: "AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1",
    correlation_reason_codes: normalizeSortedStringSet(
      "authority_ingress_correlation_contract.correlation_reason_codes",
      input.correlation_reason_codes,
    ),
    correlation_status: assertEnum(
      "authority_ingress_correlation_contract.correlation_status",
      input.correlation_status,
      AUTHORITY_INGRESS_CORRELATION_STATUSES,
    ),
    extracted_authority_reference_or_null: normalizeNullableString(
      "authority_ingress_correlation_contract.extracted_authority_reference_or_null",
      input.extracted_authority_reference_or_null,
    ),
    extracted_duplicate_meaning_key_or_null: normalizeNullableString(
      "authority_ingress_correlation_contract.extracted_duplicate_meaning_key_or_null",
      input.extracted_duplicate_meaning_key_or_null,
    ),
    extracted_idempotency_key_or_null: normalizeNullableString(
      "authority_ingress_correlation_contract.extracted_idempotency_key_or_null",
      input.extracted_idempotency_key_or_null,
    ),
    extracted_identity_namespace_hash_or_null: normalizeNullableString(
      "authority_ingress_correlation_contract.extracted_identity_namespace_hash_or_null",
      input.extracted_identity_namespace_hash_or_null,
    ),
    extracted_request_hash_or_null: normalizeNullableString(
      "authority_ingress_correlation_contract.extracted_request_hash_or_null",
      input.extracted_request_hash_or_null,
    ),
    legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION",
    lineage_binding_basis: assertEnum(
      "authority_ingress_correlation_contract.lineage_binding_basis",
      input.lineage_binding_basis,
      [
        "REQUEST_HASH_EXACT",
        "IDEMPOTENCY_TUPLE_EXACT",
        "REQUEST_HASH_AND_TUPLE_EXACT",
        "AUTHORITY_REFERENCE_ONLY",
        "AMBIGUOUS_MULTI_MATCH",
        "UNBOUND_NO_MATCH",
      ] as const,
    ),
    request_lineage_comparison_policy: "PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY",
    resolution_state: assertEnum("authority_ingress_correlation_contract.resolution_state", input.resolution_state, [
      "EXACT_BOUND",
      "WEAK_AUTHORITY_REFERENCE_ONLY",
      "AMBIGUOUS_MULTI_MATCH",
      "UNBOUND_NO_MATCH",
      "UNBOUND_MISSING_IDENTITY_CLAIMS",
    ] as const),
  };
  assertCorrelationContractRules(contract);
  return contract;
}

function assertCorrelationContractRules(contract: AuthorityIngressCorrelationContract) {
  const candidateRanks = new Set<number>();
  const candidateInteractionRefs = new Set<string>();
  for (const [index, candidate] of contract.candidate_lineages.entries()) {
    const expectedRank = index + 1;
    if (candidate.candidate_rank !== expectedRank) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority ingress candidate_lineages must use contiguous rank order starting at 1",
      );
    }
    if (candidateRanks.has(candidate.candidate_rank)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority ingress candidate_lineages must be unique by candidate_rank",
      );
    }
    if (candidateInteractionRefs.has(candidate.interaction_ref)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority ingress candidate_lineages must be unique by interaction_ref",
      );
    }
    candidateRanks.add(candidate.candidate_rank);
    candidateInteractionRefs.add(candidate.interaction_ref);
  }
  if (contract.correlation_status === "BOUND") {
    if (
      !["REQUEST_HASH_EXACT", "IDEMPOTENCY_TUPLE_EXACT", "REQUEST_HASH_AND_TUPLE_EXACT"].includes(
        contract.lineage_binding_basis,
      ) ||
      contract.comparison_set_state !== "ONE_EXACT_MATCH" ||
      contract.resolution_state !== "EXACT_BOUND" ||
      contract.candidate_lineages.length !== 1 ||
      contract.extracted_authority_reference_or_null === null
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "BOUND ingress correlation requires one exact request-lineage candidate and authority reference",
      );
    }
    const matchBasisCodes = new Set(contract.candidate_lineages[0].match_basis_codes);
    const hasExactTuple =
      matchBasisCodes.has("IDEMPOTENCY_KEY_MATCH") &&
      matchBasisCodes.has("IDENTITY_NAMESPACE_HASH_MATCH") &&
      matchBasisCodes.has("DUPLICATE_MEANING_KEY_MATCH");
    if (!matchBasisCodes.has("REQUEST_HASH_MATCH") && !hasExactTuple) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "BOUND ingress correlation requires request hash or exact idempotency tuple evidence",
      );
    }
    if (contract.candidate_lineages[0].divergence_reason_codes.length > 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "BOUND ingress correlation must not retain divergence reason codes",
      );
    }
  }
  if (contract.correlation_status === "BOUND_WITH_AUTHORITY_REFERENCE_ONLY") {
    if (
      contract.lineage_binding_basis !== "AUTHORITY_REFERENCE_ONLY" ||
      contract.comparison_set_state !== "WEAK_MATCH_ONLY" ||
      contract.resolution_state !== "WEAK_AUTHORITY_REFERENCE_ONLY" ||
      contract.candidate_lineages.length !== 1 ||
      contract.extracted_authority_reference_or_null === null
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "BOUND_WITH_AUTHORITY_REFERENCE_ONLY requires one weak authority-reference candidate",
      );
    }
    const matchBasisCodes = new Set(contract.candidate_lineages[0].match_basis_codes);
    const hasExactTuple =
      matchBasisCodes.has("IDEMPOTENCY_KEY_MATCH") &&
      matchBasisCodes.has("IDENTITY_NAMESPACE_HASH_MATCH") &&
      matchBasisCodes.has("DUPLICATE_MEANING_KEY_MATCH");
    if (!matchBasisCodes.has("AUTHORITY_REFERENCE_MATCH") || matchBasisCodes.has("REQUEST_HASH_MATCH") || hasExactTuple) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "BOUND_WITH_AUTHORITY_REFERENCE_ONLY must retain only weak authority-reference evidence",
      );
    }
  }
  if (contract.correlation_status === "AMBIGUOUS") {
    if (
      contract.lineage_binding_basis !== "AMBIGUOUS_MULTI_MATCH" ||
      contract.comparison_set_state !== "MULTI_MATCH" ||
      contract.resolution_state !== "AMBIGUOUS_MULTI_MATCH" ||
      contract.candidate_lineages.length < 2
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AMBIGUOUS ingress correlation requires multiple candidate lineages",
      );
    }
  }
  if (contract.correlation_status === "UNBOUND") {
    if (
      contract.lineage_binding_basis !== "UNBOUND_NO_MATCH" ||
      contract.candidate_lineages.length > 0 ||
      !["NO_MATCH", "MISSING_PROVIDER_KEYS"].includes(contract.comparison_set_state)
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "UNBOUND ingress correlation must not retain candidate lineages",
      );
    }
    if (
      contract.comparison_set_state === "MISSING_PROVIDER_KEYS" &&
      contract.resolution_state !== "UNBOUND_MISSING_IDENTITY_CLAIMS"
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "MISSING_PROVIDER_KEYS must serialize UNBOUND_MISSING_IDENTITY_CLAIMS",
      );
    }
    if (contract.comparison_set_state === "NO_MATCH" && contract.resolution_state !== "UNBOUND_NO_MATCH") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "NO_MATCH must serialize UNBOUND_NO_MATCH",
      );
    }
  }
}

export function buildAuthorityIngressReceiptAuthorityTruthContract(): AuthorityTruthContract {
  return {
    authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    boundary_scope: "AUTHORITY_INGRESS_RECEIPT",
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    surface_specific_binding_policy: "INGRESS_RECEIPT_MUST_NOT_DECIDE_TRUTH_UNTIL_BOUND",
    truth_surface_role: "AUTHORITY_INGRESS_CHECKPOINT",
    unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
  };
}

export function normalizeAuthorityIngressReceiptAuthorityTruthContract(
  input: AuthorityTruthContract,
): AuthorityTruthContract {
  const expected = buildAuthorityIngressReceiptAuthorityTruthContract();
  if (!stableEqual(input, expected)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityIngressReceipt authority_truth_contract must match AUTHORITY_INGRESS_CHECKPOINT policy",
    );
  }
  return cloneRecord(expected);
}

export function deriveAuthorityIngressResponseBodyHash(input: {
  response_body?: unknown;
  response_body_hash?: string | null;
  response_body_ref: string | null;
}) {
  if (input.response_body_ref === null) {
    return NONE_SENTINEL;
  }
  if (input.response_body_hash !== undefined && input.response_body_hash !== null) {
    return requireString("response_body_hash", input.response_body_hash);
  }
  return stableJsonHash(input.response_body ?? { response_body_ref: input.response_body_ref });
}

export function authorityIngressReceiptRef(receipt: Pick<AuthorityIngressReceipt, "ingress_receipt_id"> | string) {
  return refFromId(
    "authority-ingress-receipt",
    typeof receipt === "string" ? receipt : receipt.ingress_receipt_id,
  );
}

function assertReceiptBodyPosture(receipt: AuthorityIngressReceipt) {
  if (receipt.response_body_ref === null && receipt.response_body_hash !== NONE_SENTINEL) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "response_body_hash must be <NONE> when response_body_ref is null",
    );
  }
  if (receipt.response_body_ref !== null && receipt.response_body_hash === NONE_SENTINEL) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "response_body_hash must not be <NONE> when response_body_ref exists",
    );
  }
}

function assertReceiptCorrelationRules(receipt: AuthorityIngressReceipt) {
  if (receipt.correlation_status !== receipt.authority_ingress_correlation_contract.correlation_status) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "receipt correlation_status must mirror authority_ingress_correlation_contract",
    );
  }
  if (receipt.correlation_status === "BOUND") {
    for (const [label, value] of [
      ["authority_reference", receipt.authority_reference],
      ["request_hash", receipt.request_hash],
      ["idempotency_key", receipt.idempotency_key],
      ["identity_namespace_hash", receipt.identity_namespace_hash],
      ["duplicate_meaning_key", receipt.duplicate_meaning_key],
      ["bound_interaction_ref", receipt.bound_interaction_ref],
    ] as const) {
      requireNonNull(label, value);
    }
    return;
  }
  requireNull("bound_interaction_ref", receipt.bound_interaction_ref);
  if (receipt.correlation_status === "BOUND_WITH_AUTHORITY_REFERENCE_ONLY") {
    requireNonNull("authority_reference", receipt.authority_reference);
    requireNull("request_hash", receipt.request_hash);
    requireNull("idempotency_key", receipt.idempotency_key);
    requireNull("identity_namespace_hash", receipt.identity_namespace_hash);
    requireNull("duplicate_meaning_key", receipt.duplicate_meaning_key);
  }
}

function assertReceiptStateRules(receipt: AuthorityIngressReceipt) {
  if (receipt.authenticated_channel_state === "FAILED" && receipt.receipt_state !== "QUARANTINED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "failed authenticated channel state must quarantine the ingress receipt",
    );
  }
  if (
    ["BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS", "UNBOUND"].includes(receipt.correlation_status) &&
    !["QUARANTINED", "DUPLICATE_SUPPRESSED"].includes(receipt.receipt_state)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "weak, ambiguous, or unbound ingress must remain quarantined or duplicate-suppressed",
    );
  }
  if (receipt.receipt_state === "PERSISTED") {
    requireNull("quarantined_at", receipt.quarantined_at);
    requireNull("canonical_ingress_receipt_ref", receipt.canonical_ingress_receipt_ref);
    requireNull("reconciliation_owner_ref", receipt.reconciliation_owner_ref);
    requireNull("normalized_response_ref", receipt.normalized_response_ref);
    if (receipt.quarantine_reason_codes.length > 0) {
      throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "PERSISTED receipts must not carry quarantine reasons");
    }
  }
  if (receipt.receipt_state === "NORMALIZED") {
    if (receipt.authenticated_channel_state !== "AUTHENTICATED" || receipt.correlation_status !== "BOUND") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "NORMALIZED receipts require authenticated, BOUND ingress",
      );
    }
    requireNull("quarantined_at", receipt.quarantined_at);
    requireNull("canonical_ingress_receipt_ref", receipt.canonical_ingress_receipt_ref);
    requireNull("reconciliation_owner_ref", receipt.reconciliation_owner_ref);
    requireNonNull("normalized_response_ref", receipt.normalized_response_ref);
    if (receipt.quarantine_reason_codes.length > 0) {
      throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "NORMALIZED receipts must not carry quarantine reasons");
    }
  }
  if (receipt.receipt_state === "QUARANTINED") {
    requireNonNull("quarantined_at", receipt.quarantined_at);
    requireNull("canonical_ingress_receipt_ref", receipt.canonical_ingress_receipt_ref);
    requireNonNull("reconciliation_owner_ref", receipt.reconciliation_owner_ref);
    requireNull("normalized_response_ref", receipt.normalized_response_ref);
    if (receipt.quarantine_reason_codes.length === 0) {
      throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "QUARANTINED receipts require reason codes");
    }
  }
  if (receipt.receipt_state === "DUPLICATE_SUPPRESSED") {
    if (receipt.authenticated_channel_state !== "AUTHENTICATED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "DUPLICATE_SUPPRESSED receipts require authenticated channel state",
      );
    }
    requireNull("quarantined_at", receipt.quarantined_at);
    requireNonNull("canonical_ingress_receipt_ref", receipt.canonical_ingress_receipt_ref);
    requireNull("reconciliation_owner_ref", receipt.reconciliation_owner_ref);
    requireNull("normalized_response_ref", receipt.normalized_response_ref);
    if (receipt.quarantine_reason_codes.length > 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "DUPLICATE_SUPPRESSED receipts must not carry quarantine reasons",
      );
    }
  }
}

function assertReceiptProofRules(receipt: AuthorityIngressReceipt) {
  const proof = receipt.authority_ingress_proof_contract;
  if (proof.binding_scope_class !== "AUTHORITY_INGRESS_RECEIPT") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityIngressReceipt proof must be scoped to AUTHORITY_INGRESS_RECEIPT",
    );
  }
  const canonicalRef = receipt.canonical_ingress_receipt_ref ?? receipt.ingress_receipt_id;
  if (
    proof.authenticated_channel_state !== receipt.authenticated_channel_state ||
    proof.ingress_channel_class_or_null !== receipt.ingress_channel_class ||
    proof.provider_delivery_ref_or_null !== receipt.provider_delivery_ref ||
    proof.response_body_hash_or_null !== receipt.response_body_hash ||
    proof.ingress_channel_metadata_hash_or_null !== receipt.ingress_channel_metadata_hash ||
    proof.delivery_dedupe_key_or_null !== receipt.delivery_dedupe_key ||
    proof.correlation_status_or_null !== receipt.correlation_status ||
    proof.canonical_ingress_receipt_ref_or_null !== canonicalRef ||
    proof.bound_interaction_ref_or_null !== receipt.bound_interaction_ref ||
    proof.authority_reference_or_null !== receipt.authority_reference ||
    proof.request_hash_or_null !== receipt.request_hash ||
    proof.idempotency_key_or_null !== receipt.idempotency_key ||
    proof.identity_namespace_hash_or_null !== receipt.identity_namespace_hash ||
    proof.duplicate_meaning_key_or_null !== receipt.duplicate_meaning_key ||
    proof.normalized_response_ref_or_null !== receipt.normalized_response_ref
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_ingress_proof_contract must mirror receipt lineage and canonical receipt anchor",
    );
  }
  if (receipt.receipt_state === "DUPLICATE_SUPPRESSED" && proof.mutation_gate_state !== "DUPLICATE_SUPPRESSED_NO_MUTATION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "duplicate-suppressed receipts require duplicate-suppressed mutation gate",
    );
  }
  if (receipt.receipt_state === "QUARANTINED" && proof.mutation_gate_state !== "QUARANTINE_ONLY") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "quarantined receipts require quarantine-only mutation gate",
    );
  }
  if (receipt.receipt_state === "PERSISTED" && proof.mutation_gate_state !== "CHECKPOINT_ONLY") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "persisted ingress receipts must remain checkpoint-only until normalization starts",
    );
  }
  if (receipt.receipt_state === "NORMALIZED" && proof.mutation_gate_state !== "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "normalized ingress receipts require the normalization mutation gate",
    );
  }
}

export function normalizeAuthorityIngressReceipt(input: AuthorityIngressReceipt): AuthorityIngressReceipt {
  const receipt: AuthorityIngressReceipt = {
    artifact_type: "AuthorityIngressReceipt",
    audit_event_refs: normalizeSortedStringSet("audit_event_refs", input.audit_event_refs, { minItems: 1 }),
    authenticated_channel_state: assertEnum("authenticated_channel_state", input.authenticated_channel_state, [
      "AUTHENTICATED",
      "FAILED",
    ] as const),
    authority_ingress_correlation_contract: normalizeAuthorityIngressCorrelationContract(
      input.authority_ingress_correlation_contract,
    ),
    authority_ingress_proof_contract: normalizeAuthorityIngressProofContract(input.authority_ingress_proof_contract),
    authority_reference: normalizeNullableString("authority_reference", input.authority_reference),
    authority_truth_contract: normalizeAuthorityIngressReceiptAuthorityTruthContract(input.authority_truth_contract),
    bound_interaction_ref: normalizeNullableString("bound_interaction_ref", input.bound_interaction_ref),
    canonical_ingress_receipt_ref: normalizeNullableString(
      "canonical_ingress_receipt_ref",
      input.canonical_ingress_receipt_ref,
    ),
    correlation_status: assertEnum("correlation_status", input.correlation_status, AUTHORITY_INGRESS_CORRELATION_STATUSES),
    delivery_dedupe_key: requireString("delivery_dedupe_key", input.delivery_dedupe_key),
    duplicate_meaning_key: normalizeNullableString("duplicate_meaning_key", input.duplicate_meaning_key),
    idempotency_key: normalizeNullableString("idempotency_key", input.idempotency_key),
    identity_namespace_hash: normalizeNullableString("identity_namespace_hash", input.identity_namespace_hash),
    ingress_channel_class: assertEnum("ingress_channel_class", input.ingress_channel_class, AUTHORITY_INGRESS_CHANNEL_CLASSES),
    ingress_channel_metadata_hash: requireString("ingress_channel_metadata_hash", input.ingress_channel_metadata_hash),
    ingress_receipt_id: requireString("ingress_receipt_id", input.ingress_receipt_id),
    normalized_response_ref: normalizeNullableString("normalized_response_ref", input.normalized_response_ref),
    persisted_at: normalizeTimestamp("persisted_at", input.persisted_at),
    provider_delivery_ref: requireString("provider_delivery_ref", input.provider_delivery_ref),
    provider_environment: requireString("provider_environment", input.provider_environment),
    provider_profile_ref: requireString("provider_profile_ref", input.provider_profile_ref),
    quarantine_reason_codes: normalizeSortedStringSet("quarantine_reason_codes", input.quarantine_reason_codes),
    quarantined_at: normalizeNullableTimestamp("quarantined_at", input.quarantined_at),
    received_at: normalizeTimestamp("received_at", input.received_at),
    reconciliation_owner_ref: normalizeNullableString("reconciliation_owner_ref", input.reconciliation_owner_ref),
    request_hash: normalizeNullableString("request_hash", input.request_hash),
    response_body_hash: requireString("response_body_hash", input.response_body_hash),
    response_body_ref: normalizeNullableString("response_body_ref", input.response_body_ref),
    receipt_state: assertEnum("receipt_state", input.receipt_state, AUTHORITY_INGRESS_RECEIPT_STATES),
  };
  if (Date.parse(receipt.persisted_at) < Date.parse(receipt.received_at)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "persisted_at must not be earlier than received_at",
    );
  }
  assertReceiptBodyPosture(receipt);
  assertReceiptCorrelationRules(receipt);
  assertReceiptStateRules(receipt);
  assertReceiptProofRules(receipt);
  return receipt;
}

export function buildAuthorityIngressReceipt(input: AuthorityIngressReceiptBuildInput): AuthorityIngressReceipt {
  const responseBodyRef = normalizeNullableString("response_body_ref", input.response_body_ref ?? null);
  const responseBodyHash = deriveAuthorityIngressResponseBodyHash({
    response_body: input.response_body,
    response_body_hash: input.response_body_hash,
    response_body_ref: responseBodyRef,
  });
  return normalizeAuthorityIngressReceipt({
    artifact_type: "AuthorityIngressReceipt",
    audit_event_refs: [...(input.audit_event_refs ?? [`audit-event://${input.ingress_receipt_id ?? "authority-ingress"}/checkpointed`])],
    authenticated_channel_state: input.authenticated_channel_state ?? "AUTHENTICATED",
    authority_ingress_correlation_contract: input.authority_ingress_correlation_contract,
    authority_ingress_proof_contract: input.authority_ingress_proof_contract,
    authority_reference: input.authority_reference ?? input.authority_ingress_correlation_contract.extracted_authority_reference_or_null,
    authority_truth_contract: input.authority_truth_contract ?? buildAuthorityIngressReceiptAuthorityTruthContract(),
    bound_interaction_ref: input.bound_interaction_ref ?? null,
    canonical_ingress_receipt_ref: input.canonical_ingress_receipt_ref ?? null,
    correlation_status: input.correlation_status ?? input.authority_ingress_correlation_contract.correlation_status,
    delivery_dedupe_key: requireString("delivery_dedupe_key", input.delivery_dedupe_key),
    duplicate_meaning_key: input.duplicate_meaning_key ?? input.authority_ingress_correlation_contract.extracted_duplicate_meaning_key_or_null,
    idempotency_key: input.idempotency_key ?? input.authority_ingress_correlation_contract.extracted_idempotency_key_or_null,
    identity_namespace_hash: input.identity_namespace_hash ?? input.authority_ingress_correlation_contract.extracted_identity_namespace_hash_or_null,
    ingress_channel_class: requireString("ingress_channel_class", input.ingress_channel_class) as AuthorityIngressChannelClass,
    ingress_channel_metadata_hash: requireString("ingress_channel_metadata_hash", input.ingress_channel_metadata_hash),
    ingress_receipt_id: requireString("ingress_receipt_id", input.ingress_receipt_id),
    normalized_response_ref: input.normalized_response_ref ?? null,
    persisted_at: normalizeTimestamp("persisted_at", input.persisted_at ?? input.received_at ?? new Date(0).toISOString()),
    provider_delivery_ref: requireString("provider_delivery_ref", input.provider_delivery_ref),
    provider_environment: requireString("provider_environment", input.provider_environment),
    provider_profile_ref: requireString("provider_profile_ref", input.provider_profile_ref),
    quarantine_reason_codes: [...(input.quarantine_reason_codes ?? [])],
    quarantined_at: input.quarantined_at ?? null,
    received_at: normalizeTimestamp("received_at", input.received_at ?? new Date(0).toISOString()),
    reconciliation_owner_ref: input.reconciliation_owner_ref ?? null,
    request_hash: input.request_hash ?? input.authority_ingress_correlation_contract.extracted_request_hash_or_null,
    response_body_hash: responseBodyHash,
    response_body_ref: responseBodyRef,
    receipt_state: input.receipt_state ?? "PERSISTED",
  });
}

export function cloneAuthorityIngressReceipt(receipt: AuthorityIngressReceipt) {
  return cloneRecord(receipt);
}

export function authorityIngressReceiptContentFingerprint(receipt: AuthorityIngressReceipt) {
  return hashObject("AUTHORITY_INGRESS_RECEIPT_MODEL_V1", normalizeAuthorityIngressReceipt(receipt));
}
