import { AuthorityModelError, normalizeTimestamp, requireString } from "../models/authority_common.ts";
import {
  type AuthorityResponseEnvelope,
  type AuthorityResponseEnvelopeBuildInput,
  type AuthorityResponseSource,
  buildAuthorityResponseEnvelope,
} from "../models/authority_response_envelope.ts";
import {
  type AuthorityIngressReceipt,
  authorityIngressReceiptRef,
} from "../models/authority_ingress_receipt.ts";
import { AuthorityIngressReceiptRepository } from "../repositories/authority_ingress_receipt_repository.ts";
import { buildAuthorityIngressProofContract } from "./build_authority_ingress_proof_contract.ts";
import { classifyIngressMutationGate } from "./classify_ingress_mutation_gate.ts";

export type NormalizeAuthorityResponseInput = Omit<
  AuthorityResponseEnvelopeBuildInput,
  "authority_ingress_proof_contract" | "ingress_receipt_ref" | "provider_delivery_ref" | "response_source"
> & {
  ingress_receipt?: AuthorityIngressReceipt;
  ingress_receipt_repository?: AuthorityIngressReceiptRepository;
  mark_ingress_normalized?: boolean;
  response_source: AuthorityResponseSource;
};

function asyncSource(source: AuthorityResponseSource) {
  return source === "CALLBACK" || source === "POLL" || source === "RECOVERY_READ";
}

function channelForSource(source: AuthorityResponseSource) {
  return (
    {
      CALLBACK: "CALLBACK",
      POLL: "POLL_RESULT",
      RECOVERY_READ: "GATEWAY_RECOVERED",
    } as const
  )[source as "CALLBACK" | "POLL" | "RECOVERY_READ"];
}

export async function normalizeAuthorityResponse(input: NormalizeAuthorityResponseInput): Promise<{
  ingress_receipt_repository: AuthorityIngressReceiptRepository | null;
  response: AuthorityResponseEnvelope;
}> {
  if (!asyncSource(input.response_source)) {
    const response = buildAuthorityResponseEnvelope({
      ...input,
      response_source: input.response_source,
    });
    return { ingress_receipt_repository: null, response };
  }

  const receipt = input.ingress_receipt;
  if (receipt === undefined) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "asynchronous authority response normalization requires a persisted AuthorityIngressReceipt",
    );
  }
  const gate = classifyIngressMutationGate({ receipt, requested_effect: "RESPONSE_NORMALIZATION" });
  if (!gate.can_normalize_response) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `ingress receipt ${receipt.ingress_receipt_id} cannot normalize response: ${gate.reason_codes.join(",")}`,
    );
  }
  const canonicalReceiptRef = receipt.canonical_ingress_receipt_ref ?? authorityIngressReceiptRef(receipt);
  const responseId = requireString("response_id", input.response_id);
  const proof = buildAuthorityIngressProofContract({
    authenticated_channel_state: receipt.authenticated_channel_state,
    authentication_evidence_modes: receipt.authority_ingress_proof_contract.authentication_evidence_modes,
    authentication_evidence_refs: receipt.authority_ingress_proof_contract.authentication_evidence_refs,
    authority_reference: receipt.authority_reference,
    binding_scope_class: "AUTHORITY_RESPONSE_ENVELOPE",
    bound_interaction_ref: receipt.bound_interaction_ref,
    canonical_ingress_receipt_ref: canonicalReceiptRef,
    correlation_status: receipt.correlation_status,
    delivery_dedupe_key: receipt.delivery_dedupe_key,
    duplicate_meaning_key: receipt.duplicate_meaning_key,
    idempotency_key: receipt.idempotency_key,
    identity_namespace_hash: receipt.identity_namespace_hash,
    ingress_channel_class: channelForSource(input.response_source),
    ingress_channel_metadata_hash: receipt.ingress_channel_metadata_hash,
    lineage_binding_basis: receipt.authority_ingress_correlation_contract.lineage_binding_basis,
    mutation_gate_state: "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT",
    normalized_response_ref: responseId,
    provider_delivery_ref: receipt.provider_delivery_ref,
    request_hash: receipt.request_hash,
    request_lineage_proof_hash: receipt.authority_ingress_proof_contract.request_lineage_proof_hash_or_null,
    response_body_hash: receipt.response_body_hash,
  });
  const response = buildAuthorityResponseEnvelope({
    ...input,
    authority_ingress_proof_contract: proof,
    authority_reference: input.authority_reference ?? receipt.authority_reference,
    correlation_status: input.correlation_status ?? receipt.correlation_status,
    inbox_receipt_ref: input.inbox_receipt_ref ?? `authority-inbox-receipt://${receipt.ingress_receipt_id}`,
    ingress_receipt_ref: canonicalReceiptRef,
    provider_delivery_ref: receipt.provider_delivery_ref,
    provider_received_at: input.provider_received_at ?? normalizeTimestamp("provider_received_at", receipt.received_at),
    received_at: input.received_at ?? receipt.persisted_at,
    response_body_hash: input.response_body_hash ?? receipt.response_body_hash,
    response_body_ref: input.response_body_ref ?? receipt.response_body_ref,
    response_source: input.response_source,
  });
  const repository = input.ingress_receipt_repository ?? null;
  if (repository !== null && input.mark_ingress_normalized === true) {
    await repository.markAuthorityIngressReceiptNormalized({
      ingress_receipt_id: receipt.ingress_receipt_id,
      normalized_response_ref: response.response_id,
    });
  }
  return { ingress_receipt_repository: repository, response };
}
