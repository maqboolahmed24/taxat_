import { normalizeNullableString, normalizeSortedStringSet, requireString } from "../models/authority_common.ts";
import {
  type AuthorityIngressCandidateLineage,
  type AuthorityIngressCandidateMatchBasis,
  type AuthorityIngressCorrelationContract,
  type AuthorityIngressLineageBindingBasis,
  normalizeAuthorityIngressCorrelationContract,
} from "../models/authority_ingress_receipt.ts";

export type AuthorityIngressExtractedIdentityClaims = {
  authority_reference?: string | null;
  duplicate_meaning_key?: string | null;
  idempotency_key?: string | null;
  identity_namespace_hash?: string | null;
  request_hash?: string | null;
};

export type AuthorityIngressLineageCandidateInput = {
  authority_reference?: string | null;
  duplicate_meaning_key?: string | null;
  idempotency_key?: string | null;
  identity_namespace_hash?: string | null;
  interaction_ref: string;
  latest_obligation_mirror_ref?: string | null;
  latest_submission_record_ref?: string | null;
  request_hash?: string | null;
};

function exactTupleMatches(claims: NormalizedClaims, candidate: NormalizedCandidate) {
  return (
    claims.idempotency_key !== null &&
    claims.identity_namespace_hash !== null &&
    claims.duplicate_meaning_key !== null &&
    claims.idempotency_key === candidate.idempotency_key &&
    claims.identity_namespace_hash === candidate.identity_namespace_hash &&
    claims.duplicate_meaning_key === candidate.duplicate_meaning_key
  );
}

function requestHashMatches(claims: NormalizedClaims, candidate: NormalizedCandidate) {
  return claims.request_hash !== null && claims.request_hash === candidate.request_hash;
}

function authorityReferenceMatches(claims: NormalizedClaims, candidate: NormalizedCandidate) {
  return claims.authority_reference !== null && claims.authority_reference === candidate.authority_reference;
}

type NormalizedClaims = {
  authority_reference: string | null;
  duplicate_meaning_key: string | null;
  idempotency_key: string | null;
  identity_namespace_hash: string | null;
  request_hash: string | null;
};

type NormalizedCandidate = {
  authority_reference: string | null;
  duplicate_meaning_key: string | null;
  idempotency_key: string | null;
  identity_namespace_hash: string | null;
  interaction_ref: string;
  latest_obligation_mirror_ref: string | null;
  latest_submission_record_ref: string | null;
  request_hash: string | null;
};

function normalizeClaims(input: AuthorityIngressExtractedIdentityClaims): NormalizedClaims {
  return {
    authority_reference: normalizeNullableString("authority_reference", input.authority_reference ?? null),
    duplicate_meaning_key: normalizeNullableString("duplicate_meaning_key", input.duplicate_meaning_key ?? null),
    idempotency_key: normalizeNullableString("idempotency_key", input.idempotency_key ?? null),
    identity_namespace_hash: normalizeNullableString("identity_namespace_hash", input.identity_namespace_hash ?? null),
    request_hash: normalizeNullableString("request_hash", input.request_hash ?? null),
  };
}

function normalizeCandidate(input: AuthorityIngressLineageCandidateInput): NormalizedCandidate {
  return {
    authority_reference: normalizeNullableString("candidate.authority_reference", input.authority_reference ?? null),
    duplicate_meaning_key: normalizeNullableString("candidate.duplicate_meaning_key", input.duplicate_meaning_key ?? null),
    idempotency_key: normalizeNullableString("candidate.idempotency_key", input.idempotency_key ?? null),
    identity_namespace_hash: normalizeNullableString("candidate.identity_namespace_hash", input.identity_namespace_hash ?? null),
    interaction_ref: requireString("candidate.interaction_ref", input.interaction_ref),
    latest_obligation_mirror_ref: normalizeNullableString(
      "candidate.latest_obligation_mirror_ref",
      input.latest_obligation_mirror_ref ?? null,
    ),
    latest_submission_record_ref: normalizeNullableString(
      "candidate.latest_submission_record_ref",
      input.latest_submission_record_ref ?? null,
    ),
    request_hash: normalizeNullableString("candidate.request_hash", input.request_hash ?? null),
  };
}

function matchBasis(claims: NormalizedClaims, candidate: NormalizedCandidate) {
  const basis: AuthorityIngressCandidateMatchBasis[] = [];
  if (authorityReferenceMatches(claims, candidate)) {
    basis.push("AUTHORITY_REFERENCE_MATCH");
  }
  if (claims.duplicate_meaning_key !== null && claims.duplicate_meaning_key === candidate.duplicate_meaning_key) {
    basis.push("DUPLICATE_MEANING_KEY_MATCH");
  }
  if (claims.idempotency_key !== null && claims.idempotency_key === candidate.idempotency_key) {
    basis.push("IDEMPOTENCY_KEY_MATCH");
  }
  if (claims.identity_namespace_hash !== null && claims.identity_namespace_hash === candidate.identity_namespace_hash) {
    basis.push("IDENTITY_NAMESPACE_HASH_MATCH");
  }
  if (requestHashMatches(claims, candidate)) {
    basis.push("REQUEST_HASH_MATCH");
  }
  return basis;
}

function toLineage(claims: NormalizedClaims, candidate: NormalizedCandidate, rank: number): AuthorityIngressCandidateLineage {
  const basis = matchBasis(claims, candidate);
  return {
    authority_reference_or_null: candidate.authority_reference,
    candidate_rank: rank,
    divergence_reason_codes: basis.includes("REQUEST_HASH_MATCH") || exactTupleMatches(claims, candidate)
      ? []
      : ["CANDIDATE_NOT_STRONGLY_BOUND"],
    duplicate_meaning_key_or_null: candidate.duplicate_meaning_key,
    idempotency_key_or_null: candidate.idempotency_key,
    identity_namespace_hash_or_null: candidate.identity_namespace_hash,
    interaction_ref: candidate.interaction_ref,
    latest_obligation_mirror_ref_or_null: candidate.latest_obligation_mirror_ref,
    latest_submission_record_ref_or_null: candidate.latest_submission_record_ref,
    match_basis_codes: basis,
    request_hash_or_null: candidate.request_hash,
  };
}

function sortCandidates(left: NormalizedCandidate, right: NormalizedCandidate) {
  return left.interaction_ref.localeCompare(right.interaction_ref);
}

function hasAnyProviderKey(claims: NormalizedClaims) {
  return Object.values(claims).some((value) => value !== null);
}

function lineageBasis(claims: NormalizedClaims, candidate: NormalizedCandidate): AuthorityIngressLineageBindingBasis {
  const request = requestHashMatches(claims, candidate);
  const tuple = exactTupleMatches(claims, candidate);
  if (request && tuple) {
    return "REQUEST_HASH_AND_TUPLE_EXACT";
  }
  if (request) {
    return "REQUEST_HASH_EXACT";
  }
  return "IDEMPOTENCY_TUPLE_EXACT";
}

export function buildAuthorityIngressCorrelationContract(input: {
  candidates?: readonly AuthorityIngressLineageCandidateInput[];
  extracted_identity_claims: AuthorityIngressExtractedIdentityClaims;
  reason_codes?: readonly string[];
}): AuthorityIngressCorrelationContract {
  const claims = normalizeClaims(input.extracted_identity_claims);
  const candidates = [...(input.candidates ?? [])].map(normalizeCandidate).sort(sortCandidates);
  const exactCandidates = candidates.filter(
    (candidate) => requestHashMatches(claims, candidate) || exactTupleMatches(claims, candidate),
  );
  const weakCandidates = exactCandidates.length === 0
    ? candidates.filter((candidate) => authorityReferenceMatches(claims, candidate))
    : [];
  const baseReasonCodes = normalizeSortedStringSet("correlation_reason_codes", input.reason_codes ?? []);

  if (exactCandidates.length === 1) {
    const candidate = exactCandidates[0];
    return normalizeAuthorityIngressCorrelationContract({
      bound_artifact_type: "AuthorityIngressReceipt",
      candidate_lineages: [toLineage(claims, candidate, 1)],
      comparison_set_state: "ONE_EXACT_MATCH",
      contract_version: "AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1",
      correlation_reason_codes: [
        ...baseReasonCodes,
        requestHashMatches(claims, candidate) ? "REQUEST_HASH_EXACT_MATCH" : "IDEMPOTENCY_TUPLE_EXACT_MATCH",
      ],
      correlation_status: "BOUND",
      extracted_authority_reference_or_null: claims.authority_reference ?? candidate.authority_reference,
      extracted_duplicate_meaning_key_or_null: claims.duplicate_meaning_key ?? candidate.duplicate_meaning_key,
      extracted_idempotency_key_or_null: claims.idempotency_key ?? candidate.idempotency_key,
      extracted_identity_namespace_hash_or_null: claims.identity_namespace_hash ?? candidate.identity_namespace_hash,
      extracted_request_hash_or_null: claims.request_hash ?? candidate.request_hash,
      legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION",
      lineage_binding_basis: lineageBasis(claims, candidate),
      request_lineage_comparison_policy: "PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY",
      resolution_state: "EXACT_BOUND",
    });
  }

  if (exactCandidates.length > 1 || weakCandidates.length > 1) {
    const ambiguous = (exactCandidates.length > 1 ? exactCandidates : weakCandidates).map((candidate, index) =>
      toLineage(claims, candidate, index + 1)
    );
    return normalizeAuthorityIngressCorrelationContract({
      bound_artifact_type: "AuthorityIngressReceipt",
      candidate_lineages: ambiguous,
      comparison_set_state: "MULTI_MATCH",
      contract_version: "AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1",
      correlation_reason_codes: [...baseReasonCodes, "MULTI_MATCH_REQUIRES_RECONCILIATION"],
      correlation_status: "AMBIGUOUS",
      extracted_authority_reference_or_null: claims.authority_reference,
      extracted_duplicate_meaning_key_or_null: claims.duplicate_meaning_key,
      extracted_idempotency_key_or_null: claims.idempotency_key,
      extracted_identity_namespace_hash_or_null: claims.identity_namespace_hash,
      extracted_request_hash_or_null: claims.request_hash,
      legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION",
      lineage_binding_basis: "AMBIGUOUS_MULTI_MATCH",
      request_lineage_comparison_policy: "PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY",
      resolution_state: "AMBIGUOUS_MULTI_MATCH",
    });
  }

  if (weakCandidates.length === 1) {
    return normalizeAuthorityIngressCorrelationContract({
      bound_artifact_type: "AuthorityIngressReceipt",
      candidate_lineages: [toLineage(claims, weakCandidates[0], 1)],
      comparison_set_state: "WEAK_MATCH_ONLY",
      contract_version: "AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1",
      correlation_reason_codes: [...baseReasonCodes, "AUTHORITY_REFERENCE_ONLY_WEAK_MATCH"],
      correlation_status: "BOUND_WITH_AUTHORITY_REFERENCE_ONLY",
      extracted_authority_reference_or_null: claims.authority_reference,
      extracted_duplicate_meaning_key_or_null: null,
      extracted_idempotency_key_or_null: null,
      extracted_identity_namespace_hash_or_null: null,
      extracted_request_hash_or_null: null,
      legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION",
      lineage_binding_basis: "AUTHORITY_REFERENCE_ONLY",
      request_lineage_comparison_policy: "PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY",
      resolution_state: "WEAK_AUTHORITY_REFERENCE_ONLY",
    });
  }

  const missingProviderKeys = !hasAnyProviderKey(claims);
  return normalizeAuthorityIngressCorrelationContract({
    bound_artifact_type: "AuthorityIngressReceipt",
    candidate_lineages: [],
    comparison_set_state: missingProviderKeys ? "MISSING_PROVIDER_KEYS" : "NO_MATCH",
    contract_version: "AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1",
    correlation_reason_codes: [...baseReasonCodes, missingProviderKeys ? "MISSING_PROVIDER_KEYS" : "NO_MATCH_FOR_PROVIDER_KEYS"],
    correlation_status: "UNBOUND",
    extracted_authority_reference_or_null: claims.authority_reference,
    extracted_duplicate_meaning_key_or_null: claims.duplicate_meaning_key,
    extracted_idempotency_key_or_null: claims.idempotency_key,
    extracted_identity_namespace_hash_or_null: claims.identity_namespace_hash,
    extracted_request_hash_or_null: claims.request_hash,
    legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION",
    lineage_binding_basis: "UNBOUND_NO_MATCH",
    request_lineage_comparison_policy: "PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY",
    resolution_state: missingProviderKeys ? "UNBOUND_MISSING_IDENTITY_CLAIMS" : "UNBOUND_NO_MATCH",
  });
}

