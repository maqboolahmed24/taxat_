import { hashObject, normalizeTimestamp, requireString } from "../models/authority_common.ts";
import {
  type AuthorityIngressChannelClass,
  type AuthorityIngressReceipt,
  buildAuthorityIngressReceipt,
  deriveAuthorityIngressResponseBodyHash,
} from "../models/authority_ingress_receipt.ts";
import { AuthorityIngressReceiptRepository } from "../repositories/authority_ingress_receipt_repository.ts";
import {
  type AuthorityIngressLineageCandidateInput,
  buildAuthorityIngressCorrelationContract,
} from "./build_authority_ingress_correlation_contract.ts";
import { buildAuthorityIngressProofContract } from "./build_authority_ingress_proof_contract.ts";
import { dedupeAuthorityIngressReceipt } from "./dedupe_authority_ingress_receipt.ts";

export type CheckpointAuthorityIngressInput = {
  audit_event_refs?: readonly string[];
  authenticated_channel_state?: "AUTHENTICATED" | "FAILED";
  authentication_evidence_modes?: readonly (
    | "CALLBACK_SIGNATURE_VERIFIED"
    | "CALLBACK_MTLS_VERIFIED"
    | "SOURCE_ALLOWLIST_VERIFIED"
    | "POLL_CREDENTIAL_VERIFIED"
    | "INBOX_DELIVERY_CREDENTIAL_VERIFIED"
    | "WORKER_ATTESTATION_VERIFIED"
    | "GATEWAY_RECOVERY_CREDENTIAL_VERIFIED"
  )[];
  authentication_evidence_refs?: readonly string[];
  authority_reference?: string | null;
  candidate_lineages?: readonly AuthorityIngressLineageCandidateInput[];
  duplicate_meaning_key?: string | null;
  idempotency_key?: string | null;
  identity_namespace_hash?: string | null;
  ingress_channel_class: AuthorityIngressChannelClass;
  ingress_channel_metadata?: unknown;
  ingress_channel_metadata_hash?: string;
  ingress_receipt_id: string;
  persisted_at?: string;
  provider_delivery_ref: string;
  provider_environment: string;
  provider_profile_ref: string;
  received_at: string;
  reconciliation_owner_ref?: string | null;
  repository?: AuthorityIngressReceiptRepository;
  request_hash?: string | null;
  response_body?: unknown;
  response_body_hash?: string | null;
  response_body_ref: string | null;
};

function defaultEvidenceMode(channel: AuthorityIngressChannelClass) {
  return (
    {
      CALLBACK: "CALLBACK_SIGNATURE_VERIFIED",
      GATEWAY_RECOVERED: "GATEWAY_RECOVERY_CREDENTIAL_VERIFIED",
      INBOX_DELIVERY: "INBOX_DELIVERY_CREDENTIAL_VERIFIED",
      POLL_RESULT: "POLL_CREDENTIAL_VERIFIED",
      WORKER_OBSERVED: "WORKER_ATTESTATION_VERIFIED",
    } as const
  )[channel];
}

function quarantineReasons(input: {
  authenticated_channel_state: "AUTHENTICATED" | "FAILED";
  correlation_status: AuthorityIngressReceipt["correlation_status"];
  correlation_reason_codes: readonly string[];
}) {
  const reasons = new Set<string>();
  if (input.authenticated_channel_state === "FAILED") {
    reasons.add("PROVIDER_CHANNEL_AUTHENTICATION_FAILED");
  }
  if (input.correlation_status !== "BOUND") {
    reasons.add(`${input.correlation_status}_INGRESS_REQUIRES_RECONCILIATION`);
  }
  for (const reason of input.correlation_reason_codes) {
    reasons.add(reason);
  }
  return [...reasons].sort();
}

export async function checkpointAuthorityIngress(input: CheckpointAuthorityIngressInput): Promise<{
  canonical_receipt: AuthorityIngressReceipt | null;
  duplicate_suppressed: boolean;
  receipt: AuthorityIngressReceipt;
  repository: AuthorityIngressReceiptRepository;
  stored: Awaited<ReturnType<AuthorityIngressReceiptRepository["persistAuthorityIngressReceipt"]>>;
}> {
  const repository = input.repository ?? new AuthorityIngressReceiptRepository();
  const receivedAt = normalizeTimestamp("received_at", input.received_at);
  const persistedAt = normalizeTimestamp("persisted_at", input.persisted_at ?? receivedAt);
  const metadataHash = input.ingress_channel_metadata_hash ??
    hashObject("AUTHORITY_INGRESS_CHANNEL_METADATA_V1", input.ingress_channel_metadata ?? input.ingress_channel_class);
  const responseBodyHash = deriveAuthorityIngressResponseBodyHash({
    response_body: input.response_body,
    response_body_hash: input.response_body_hash,
    response_body_ref: input.response_body_ref,
  });
  const dedupe = await dedupeAuthorityIngressReceipt({
    ingress_channel_metadata_hash: metadataHash,
    provider_delivery_ref: input.provider_delivery_ref,
    repository,
    response_body_hash: responseBodyHash,
  });
  const authenticated = input.authenticated_channel_state ?? "AUTHENTICATED";
  const correlation = buildAuthorityIngressCorrelationContract({
    candidates: input.candidate_lineages,
    extracted_identity_claims: {
      authority_reference: input.authority_reference ?? null,
      duplicate_meaning_key: input.duplicate_meaning_key ?? null,
      idempotency_key: input.idempotency_key ?? null,
      identity_namespace_hash: input.identity_namespace_hash ?? null,
      request_hash: input.request_hash ?? null,
    },
    reason_codes: authenticated === "FAILED" ? ["CHANNEL_AUTHENTICATION_FAILED_BEFORE_CORRELATION"] : [],
  });
  const canonicalRef = dedupe.canonical_ingress_receipt_ref ?? requireString("ingress_receipt_id", input.ingress_receipt_id);
  const receiptState = dedupe.duplicate_suppressed
    ? "DUPLICATE_SUPPRESSED"
    : authenticated === "FAILED" || correlation.correlation_status !== "BOUND"
      ? "QUARANTINED"
      : "PERSISTED";
  const boundCandidate = correlation.candidate_lineages[0] ?? null;
  const boundInteractionRef = correlation.correlation_status === "BOUND" ? boundCandidate?.interaction_ref ?? null : null;
  const authorityReference = correlation.correlation_status === "BOUND_WITH_AUTHORITY_REFERENCE_ONLY"
    ? correlation.extracted_authority_reference_or_null
    : correlation.extracted_authority_reference_or_null ?? boundCandidate?.authority_reference_or_null ?? null;
  const requestHash = correlation.correlation_status === "BOUND"
    ? correlation.extracted_request_hash_or_null ?? boundCandidate?.request_hash_or_null ?? null
    : null;
  const idempotencyKey = correlation.correlation_status === "BOUND"
    ? correlation.extracted_idempotency_key_or_null ?? boundCandidate?.idempotency_key_or_null ?? null
    : null;
  const identityNamespaceHash = correlation.correlation_status === "BOUND"
    ? correlation.extracted_identity_namespace_hash_or_null ?? boundCandidate?.identity_namespace_hash_or_null ?? null
    : null;
  const duplicateMeaningKey = correlation.correlation_status === "BOUND"
    ? correlation.extracted_duplicate_meaning_key_or_null ?? boundCandidate?.duplicate_meaning_key_or_null ?? null
    : null;
  const proof = buildAuthorityIngressProofContract({
    authenticated_channel_state: authenticated,
    authentication_evidence_modes: [
      ...(input.authentication_evidence_modes ?? [defaultEvidenceMode(input.ingress_channel_class)]),
    ],
    authentication_evidence_refs: [
      ...(input.authentication_evidence_refs ?? [`authority-ingress-evidence://${input.ingress_receipt_id}`]),
    ],
    authority_reference: authorityReference,
    binding_scope_class: "AUTHORITY_INGRESS_RECEIPT",
    bound_interaction_ref: boundInteractionRef,
    canonical_ingress_receipt_ref: canonicalRef,
    correlation_status: correlation.correlation_status,
    delivery_dedupe_key: dedupe.delivery_dedupe_key,
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: idempotencyKey,
    identity_namespace_hash: identityNamespaceHash,
    ingress_channel_class: input.ingress_channel_class,
    ingress_channel_metadata_hash: metadataHash,
    lineage_binding_basis: correlation.lineage_binding_basis,
    mutation_gate_state: receiptState === "DUPLICATE_SUPPRESSED"
      ? "DUPLICATE_SUPPRESSED_NO_MUTATION"
      : receiptState === "QUARANTINED"
        ? "QUARANTINE_ONLY"
        : "CHECKPOINT_ONLY",
    normalized_response_ref: null,
    provider_delivery_ref: input.provider_delivery_ref,
    request_hash: requestHash,
    response_body_hash: responseBodyHash,
  });
  const quarantineReasonCodes = receiptState === "QUARANTINED"
    ? quarantineReasons({
        authenticated_channel_state: authenticated,
        correlation_reason_codes: correlation.correlation_reason_codes,
        correlation_status: correlation.correlation_status,
      })
    : [];
  const receipt = buildAuthorityIngressReceipt({
    audit_event_refs: input.audit_event_refs ?? [`audit-event://${input.ingress_receipt_id}/authority-ingress-checkpointed`],
    authenticated_channel_state: authenticated,
    authority_ingress_correlation_contract: correlation,
    authority_ingress_proof_contract: proof,
    authority_reference: authorityReference,
    bound_interaction_ref: boundInteractionRef,
    canonical_ingress_receipt_ref: dedupe.canonical_ingress_receipt_ref,
    correlation_status: correlation.correlation_status,
    delivery_dedupe_key: dedupe.delivery_dedupe_key,
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: idempotencyKey,
    identity_namespace_hash: identityNamespaceHash,
    ingress_channel_class: input.ingress_channel_class,
    ingress_channel_metadata_hash: metadataHash,
    ingress_receipt_id: requireString("ingress_receipt_id", input.ingress_receipt_id),
    persisted_at: persistedAt,
    provider_delivery_ref: input.provider_delivery_ref,
    provider_environment: input.provider_environment,
    provider_profile_ref: input.provider_profile_ref,
    quarantine_reason_codes: quarantineReasonCodes,
    quarantined_at: receiptState === "QUARANTINED" ? persistedAt : null,
    received_at: receivedAt,
    reconciliation_owner_ref: receiptState === "QUARANTINED"
      ? input.reconciliation_owner_ref ?? `authority-reconciliation-owner://${input.ingress_receipt_id}`
      : null,
    request_hash: requestHash,
    response_body_hash: responseBodyHash,
    response_body_ref: input.response_body_ref,
    receipt_state: receiptState,
  });
  const stored = await repository.persistAuthorityIngressReceipt({ receipt });
  return {
    canonical_receipt: dedupe.canonical_receipt,
    duplicate_suppressed: dedupe.duplicate_suppressed,
    receipt,
    repository,
    stored,
  };
}
