import {
  type AuthorityIngressProofContract,
  AuthorityModelError,
  hashObject,
  normalizeAuthorityIngressProofContract,
  normalizeNullableString,
  requireString,
} from "../models/authority_common.ts";
import type {
  AuthorityIngressAuthenticatedChannelState,
  AuthorityIngressChannelClass,
  AuthorityIngressCorrelationStatus,
  AuthorityIngressLineageBindingBasis,
} from "../models/authority_ingress_receipt.ts";

export function deriveAuthorityIngressDeliveryDedupeKey(input: {
  ingress_channel_metadata_hash: string;
  provider_delivery_ref: string;
  response_body_hash: string;
}) {
  const spine = {
    ingress_channel_metadata_hash: requireString("ingress_channel_metadata_hash", input.ingress_channel_metadata_hash),
    provider_delivery_ref: requireString("provider_delivery_ref", input.provider_delivery_ref),
    response_body_hash: requireString("response_body_hash", input.response_body_hash),
  };
  return `delivery-dedupe://${hashObject("AUTHORITY_INGRESS_DELIVERY_DEDUPE_V1", spine)}`;
}

export function buildAuthorityIngressLineageProofHash(input: {
  bound_interaction_ref: string | null;
  duplicate_meaning_key: string | null;
  idempotency_key: string | null;
  identity_namespace_hash: string | null;
  request_hash: string | null;
}) {
  if (
    input.bound_interaction_ref === null ||
    input.request_hash === null ||
    input.idempotency_key === null ||
    input.identity_namespace_hash === null ||
    input.duplicate_meaning_key === null
  ) {
    return null;
  }
  return hashObject("AUTHORITY_INGRESS_LINEAGE_PROOF_V1", {
    bound_interaction_ref: input.bound_interaction_ref,
    duplicate_meaning_key: input.duplicate_meaning_key,
    idempotency_key: input.idempotency_key,
    identity_namespace_hash: input.identity_namespace_hash,
    request_hash: input.request_hash,
  });
}

export type BuildAuthorityIngressProofContractInput = {
  authenticated_channel_state: AuthorityIngressAuthenticatedChannelState;
  authentication_evidence_modes: AuthorityIngressProofContract["authentication_evidence_modes"];
  authentication_evidence_refs: readonly string[];
  authority_reference: string | null;
  binding_scope_class: AuthorityIngressProofContract["binding_scope_class"];
  bound_interaction_ref: string | null;
  canonical_ingress_receipt_ref: string;
  correlation_status: AuthorityIngressCorrelationStatus;
  delivery_dedupe_key: string;
  duplicate_meaning_key: string | null;
  idempotency_key: string | null;
  identity_namespace_hash: string | null;
  ingress_channel_class: AuthorityIngressChannelClass;
  ingress_channel_metadata_hash: string;
  lineage_binding_basis: AuthorityIngressLineageBindingBasis;
  mutation_gate_state: AuthorityIngressProofContract["mutation_gate_state"];
  normalized_response_ref: string | null;
  provider_delivery_ref: string;
  request_hash: string | null;
  request_lineage_proof_hash?: string | null;
  response_body_hash: string;
};

export function buildAuthorityIngressProofContract(
  input: BuildAuthorityIngressProofContractInput,
): AuthorityIngressProofContract {
  const canonicalRef = requireString("canonical_ingress_receipt_ref", input.canonical_ingress_receipt_ref);
  const requestHash = normalizeNullableString("request_hash", input.request_hash);
  const idempotencyKey = normalizeNullableString("idempotency_key", input.idempotency_key);
  const identityNamespaceHash = normalizeNullableString("identity_namespace_hash", input.identity_namespace_hash);
  const duplicateMeaningKey = normalizeNullableString("duplicate_meaning_key", input.duplicate_meaning_key);
  const boundInteractionRef = normalizeNullableString("bound_interaction_ref", input.bound_interaction_ref);
  const requestLineageProofHash =
    input.request_lineage_proof_hash !== undefined
      ? normalizeNullableString("request_lineage_proof_hash", input.request_lineage_proof_hash)
      : buildAuthorityIngressLineageProofHash({
          bound_interaction_ref: boundInteractionRef,
          duplicate_meaning_key: duplicateMeaningKey,
          idempotency_key: idempotencyKey,
          identity_namespace_hash: identityNamespaceHash,
          request_hash: requestHash,
        });

  if (input.correlation_status === "BOUND" && requestLineageProofHash === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "BOUND ingress proof requires request-lineage proof hash",
    );
  }

  return normalizeAuthorityIngressProofContract({
    authenticated_channel_state: input.authenticated_channel_state,
    authentication_evidence_modes: [...input.authentication_evidence_modes],
    authentication_evidence_refs: [...input.authentication_evidence_refs],
    authority_reference_or_null: input.authority_reference,
    binding_scope_class: input.binding_scope_class,
    bound_interaction_ref_or_null: boundInteractionRef,
    canonical_ingress_receipt_ref_or_null: canonicalRef,
    contract_version: "AUTHORITY_INGRESS_PROOF_CONTRACT_V1",
    correlation_status_or_null: input.correlation_status,
    delivery_dedupe_key_or_null: requireString("delivery_dedupe_key", input.delivery_dedupe_key),
    delivery_identity_basis: "PROVIDER_DELIVERY_REF_RESPONSE_BODY_HASH_INGRESS_CHANNEL_METADATA_HASH",
    duplicate_meaning_key_or_null: duplicateMeaningKey,
    heuristic_correlation_policy: "DETERMINISTIC_ONLY_NO_RECENT_REQUEST_HEURISTICS",
    idempotency_key_or_null: idempotencyKey,
    identity_namespace_hash_or_null: identityNamespaceHash,
    ingress_channel_class_or_null: input.ingress_channel_class,
    ingress_channel_metadata_hash_or_null: requireString(
      "ingress_channel_metadata_hash",
      input.ingress_channel_metadata_hash,
    ),
    lineage_binding_basis: input.lineage_binding_basis,
    mutation_gate_state: input.mutation_gate_state,
    normalized_response_ref_or_null: input.normalized_response_ref,
    provider_delivery_ref_or_null: requireString("provider_delivery_ref", input.provider_delivery_ref),
    request_hash_or_null: requestHash,
    request_lineage_proof_hash_or_null: requestLineageProofHash,
    response_body_hash_or_null: requireString("response_body_hash", input.response_body_hash),
    transport_memory_mutation_policy: "FORBIDDEN_UNTIL_PERSISTED_PROOF",
  });
}

