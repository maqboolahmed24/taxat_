import { NONE_SENTINEL, stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AuthorityIngressProofContract,
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
} from "./authority_common.ts";
import type { AuthorityRequestEnvelope } from "./authority_request_envelope.ts";

export const AUTHORITY_RESPONSE_SOURCES = [
  "INLINE_HTTP",
  "CALLBACK",
  "POLL",
  "TRANSPORT_TIMEOUT",
  "RECOVERY_READ",
] as const;

export type AuthorityResponseSource = (typeof AUTHORITY_RESPONSE_SOURCES)[number];
export type AuthorityResponseDerivationPosture =
  | "PRIMARY_OBSERVATION"
  | "CORROBORATING_OBSERVATION"
  | "SUPERSEDES_TIMEOUT_PLACEHOLDER"
  | "CONFLICTING_OBSERVATION"
  | "TIMEOUT_PLACEHOLDER";
export type AuthorityResponseLegalEffectPosture =
  | "DIRECT_STATE_MUTATION"
  | "PROVISIONAL_STATE_MUTATION"
  | "RECONCILIATION_ONLY"
  | "NO_STATE_MUTATION";
export type AuthorityResponseCorrelationStatus =
  | "BOUND"
  | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY"
  | "AMBIGUOUS"
  | "UNBOUND";
export type AuthorityResponseClass =
  | "ACK_SUCCESS"
  | "ACK_ACCEPTED_PENDING"
  | "ACK_REJECTED_VALIDATION"
  | "ACK_REJECTED_AUTH"
  | "ACK_RETRYABLE_FAILURE"
  | "ACK_TIMEOUT_OR_NO_RESOLUTION"
  | "ACK_EXTERNAL_STATE_DISCOVERED"
  | "ACK_AMBIGUOUS_CORRELATION"
  | "ACK_INCONSISTENT_STATE";
export type AuthorityResponseRetryClass =
  | "NO_RETRY"
  | "SAFE_RETRY"
  | "RECONCILE_THEN_RETRY"
  | "HUMAN_REVIEW_THEN_RETRY"
  | "REBUILD_THEN_RETRY"
  | "MANUAL_INTERVENTION_REQUIRED";

export type AuthorityResponseEnvelope = {
  authority_ingress_proof_contract: AuthorityIngressProofContract | null;
  authority_reference: string | null;
  conflicting_response_ids: string[];
  corroborates_response_ids: string[];
  correlation_status: AuthorityResponseCorrelationStatus;
  derivation_posture: AuthorityResponseDerivationPosture;
  http_status: number | null;
  inbox_receipt_ref: string | null;
  ingress_receipt_ref: string | null;
  legal_effect_posture: AuthorityResponseLegalEffectPosture;
  provider_delivery_ref: string | null;
  provider_received_at: string | null;
  received_at: string;
  recovery_basis_response_id: string | null;
  request_id: string;
  response_body_hash: string;
  response_body_ref: string | null;
  response_class: AuthorityResponseClass;
  response_headers_ref: string | null;
  response_id: string;
  response_source: AuthorityResponseSource;
  retry_class: AuthorityResponseRetryClass;
  supersedes_response_id: string | null;
};

export type AuthorityResponseEnvelopeBuildInput = Partial<
  Omit<
    AuthorityResponseEnvelope,
    | "authority_ingress_proof_contract"
    | "conflicting_response_ids"
    | "corroborates_response_ids"
  >
> & {
  authority_ingress_proof_contract?: AuthorityIngressProofContract | null;
  conflicting_response_ids?: readonly string[];
  corroborates_response_ids?: readonly string[];
  request?: AuthorityRequestEnvelope;
  response_body?: unknown;
  request_id: string;
  response_id: string;
  response_source: AuthorityResponseSource;
};

const ASYNC_RESPONSE_SOURCES = new Set<AuthorityResponseSource>(["CALLBACK", "POLL", "RECOVERY_READ"]);
const AMBIGUITY_RETRY_CLASSES = new Set<AuthorityResponseRetryClass>([
  "RECONCILE_THEN_RETRY",
  "HUMAN_REVIEW_THEN_RETRY",
  "MANUAL_INTERVENTION_REQUIRED",
]);

function ingressChannelForSource(source: AuthorityResponseSource) {
  return (
    {
      CALLBACK: "CALLBACK",
      POLL: "POLL_RESULT",
      RECOVERY_READ: "GATEWAY_RECOVERED",
    } as const
  )[source as "CALLBACK" | "POLL" | "RECOVERY_READ"];
}

function normalizeHttpStatus(value: number | null | undefined) {
  if (value == null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", "http_status must be null or an HTTP status code");
  }
  return value;
}

function deriveResponseBodyHash(input: {
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

export function buildAuthorityResponseIngressProofContract(input: {
  authority_reference: string | null;
  correlation_status: AuthorityResponseCorrelationStatus;
  duplicate_meaning_key: string | null;
  idempotency_key: string | null;
  identity_namespace_hash: string | null;
  ingress_channel_metadata_hash?: string;
  ingress_receipt_ref: string;
  provider_delivery_ref: string;
  request_hash: string | null;
  request_lineage_proof_hash?: string | null;
  response_body_hash: string;
  response_id: string;
  response_source: Exclude<AuthorityResponseSource, "INLINE_HTTP" | "TRANSPORT_TIMEOUT">;
}): AuthorityIngressProofContract {
  const ingressReceiptRef = requireString("ingress_receipt_ref", input.ingress_receipt_ref);
  const responseId = requireString("response_id", input.response_id);
  const providerDeliveryRef = requireString("provider_delivery_ref", input.provider_delivery_ref);
  return normalizeAuthorityIngressProofContract({
    authenticated_channel_state: "AUTHENTICATED",
    authentication_evidence_modes: [
      input.response_source === "CALLBACK"
        ? "CALLBACK_SIGNATURE_VERIFIED"
        : input.response_source === "POLL"
          ? "POLL_CREDENTIAL_VERIFIED"
          : "GATEWAY_RECOVERY_CREDENTIAL_VERIFIED",
    ],
    authentication_evidence_refs: [`authority-ingress-evidence://${ingressReceiptRef}`],
    authority_reference_or_null: input.authority_reference,
    binding_scope_class: "AUTHORITY_RESPONSE_ENVELOPE",
    bound_interaction_ref_or_null: null,
    canonical_ingress_receipt_ref_or_null: ingressReceiptRef,
    contract_version: "AUTHORITY_INGRESS_PROOF_CONTRACT_V1",
    correlation_status_or_null: input.correlation_status,
    delivery_dedupe_key_or_null: `delivery-dedupe://${providerDeliveryRef}/${input.response_body_hash}`,
    delivery_identity_basis: "PROVIDER_DELIVERY_REF_RESPONSE_BODY_HASH_INGRESS_CHANNEL_METADATA_HASH",
    duplicate_meaning_key_or_null: input.duplicate_meaning_key,
    heuristic_correlation_policy: "DETERMINISTIC_ONLY_NO_RECENT_REQUEST_HEURISTICS",
    idempotency_key_or_null: input.idempotency_key,
    identity_namespace_hash_or_null: input.identity_namespace_hash,
    ingress_channel_class_or_null: ingressChannelForSource(input.response_source),
    ingress_channel_metadata_hash_or_null:
      input.ingress_channel_metadata_hash ?? stableJsonHash([input.response_source, providerDeliveryRef]),
    lineage_binding_basis:
      input.correlation_status === "BOUND"
        ? "REQUEST_HASH_AND_TUPLE_EXACT"
        : input.correlation_status === "BOUND_WITH_AUTHORITY_REFERENCE_ONLY"
          ? "AUTHORITY_REFERENCE_ONLY"
          : input.correlation_status === "AMBIGUOUS"
            ? "AMBIGUOUS_MULTI_MATCH"
            : "UNBOUND_NO_MATCH",
    mutation_gate_state: "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT",
    normalized_response_ref_or_null: responseId,
    provider_delivery_ref_or_null: providerDeliveryRef,
    request_hash_or_null: input.request_hash,
    request_lineage_proof_hash_or_null:
      input.request_lineage_proof_hash ?? (input.request_hash === null ? null : stableJsonHash([input.request_hash, responseId])),
    response_body_hash_or_null: input.response_body_hash,
    transport_memory_mutation_policy: "FORBIDDEN_UNTIL_PERSISTED_PROOF",
  });
}

function assertBodyPosture(response: AuthorityResponseEnvelope) {
  if (response.response_body_ref === null && response.response_body_hash !== NONE_SENTINEL) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "response_body_hash must be <NONE> when response_body_ref is null",
    );
  }
  if (response.response_body_ref !== null && response.response_body_hash === NONE_SENTINEL) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "response_body_hash must not be <NONE> when response_body_ref exists",
    );
  }
}

function assertResponseSourceRules(response: AuthorityResponseEnvelope) {
  if (ASYNC_RESPONSE_SOURCES.has(response.response_source)) {
    requireNonNull("provider_delivery_ref", response.provider_delivery_ref);
    requireNonNull("inbox_receipt_ref", response.inbox_receipt_ref);
    requireNonNull("ingress_receipt_ref", response.ingress_receipt_ref);
    const proof = requireNonNull("authority_ingress_proof_contract", response.authority_ingress_proof_contract);
    if (proof.binding_scope_class !== "AUTHORITY_RESPONSE_ENVELOPE") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "async response ingress proof must be scoped to AUTHORITY_RESPONSE_ENVELOPE",
      );
    }
    if (proof.ingress_channel_class_or_null !== ingressChannelForSource(response.response_source)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract.ingress_channel_class_or_null must mirror response_source",
      );
    }
    if (
      proof.authenticated_channel_state !== "AUTHENTICATED" ||
      proof.canonical_ingress_receipt_ref_or_null !== response.ingress_receipt_ref ||
      proof.correlation_status_or_null !== response.correlation_status ||
      proof.mutation_gate_state !== "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT" ||
      proof.normalized_response_ref_or_null !== response.response_id ||
      proof.provider_delivery_ref_or_null !== response.provider_delivery_ref ||
      proof.response_body_hash_or_null !== response.response_body_hash
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "authority_ingress_proof_contract must mirror async response ingress lineage",
      );
    }
    return;
  }
  requireNull("authority_ingress_proof_contract", response.authority_ingress_proof_contract);
  if (response.response_source === "INLINE_HTTP") {
    requireNull("provider_delivery_ref", response.provider_delivery_ref);
    requireNull("inbox_receipt_ref", response.inbox_receipt_ref);
    requireNull("ingress_receipt_ref", response.ingress_receipt_ref);
    requireNull("recovery_basis_response_id", response.recovery_basis_response_id);
  }
  if (response.response_source === "TRANSPORT_TIMEOUT") {
    for (const [label, value] of [
      ["provider_received_at", response.provider_received_at],
      ["http_status", response.http_status],
      ["response_headers_ref", response.response_headers_ref],
      ["response_body_ref", response.response_body_ref],
      ["authority_reference", response.authority_reference],
      ["provider_delivery_ref", response.provider_delivery_ref],
      ["inbox_receipt_ref", response.inbox_receipt_ref],
      ["ingress_receipt_ref", response.ingress_receipt_ref],
    ] as const) {
      requireNull(label, value);
    }
    if (
      response.response_body_hash !== NONE_SENTINEL ||
      response.response_class !== "ACK_TIMEOUT_OR_NO_RESOLUTION" ||
      response.derivation_posture !== "TIMEOUT_PLACEHOLDER" ||
      response.legal_effect_posture !== "PROVISIONAL_STATE_MUTATION" ||
      response.supersedes_response_id !== null ||
      response.recovery_basis_response_id !== null ||
      response.corroborates_response_ids.length > 0 ||
      response.conflicting_response_ids.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "TRANSPORT_TIMEOUT responses must keep timeout placeholder posture and clear payload lineage",
      );
    }
  }
}

function assertCorrelationRules(response: AuthorityResponseEnvelope) {
  if (["AMBIGUOUS", "UNBOUND"].includes(response.correlation_status)) {
    if (
      response.response_class !== "ACK_AMBIGUOUS_CORRELATION" ||
      response.legal_effect_posture !== "RECONCILIATION_ONLY" ||
      !AMBIGUITY_RETRY_CLASSES.has(response.retry_class)
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "ambiguous or unbound responses require ambiguous correlation and reconciliation-only retry posture",
      );
    }
  }
  if (response.response_class === "ACK_TIMEOUT_OR_NO_RESOLUTION" && response.response_source !== "TRANSPORT_TIMEOUT") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "ACK_TIMEOUT_OR_NO_RESOLUTION must serialize as TRANSPORT_TIMEOUT",
    );
  }
  if (
    [
      "ACK_SUCCESS",
      "ACK_ACCEPTED_PENDING",
      "ACK_REJECTED_VALIDATION",
      "ACK_REJECTED_AUTH",
      "ACK_RETRYABLE_FAILURE",
      "ACK_EXTERNAL_STATE_DISCOVERED",
    ].includes(response.response_class) &&
    response.correlation_status !== "BOUND"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "successful, pending, rejection, retryable, and external-state responses require BOUND correlation",
    );
  }
  if (response.correlation_status === "BOUND_WITH_AUTHORITY_REFERENCE_ONLY") {
    if (response.authority_reference === null || response.response_class !== "ACK_INCONSISTENT_STATE") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "BOUND_WITH_AUTHORITY_REFERENCE_ONLY requires authority_reference and ACK_INCONSISTENT_STATE",
      );
    }
  }
  if (response.response_class === "ACK_INCONSISTENT_STATE") {
    if (
      !["BOUND", "BOUND_WITH_AUTHORITY_REFERENCE_ONLY"].includes(response.correlation_status) ||
      response.legal_effect_posture !== "RECONCILIATION_ONLY" ||
      !AMBIGUITY_RETRY_CLASSES.has(response.retry_class)
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "ACK_INCONSISTENT_STATE requires bound correlation and reconciliation-owned retry posture",
      );
    }
  }
}

function assertDerivationRules(response: AuthorityResponseEnvelope) {
  if (response.response_source === "RECOVERY_READ") {
    requireNonNull("recovery_basis_response_id", response.recovery_basis_response_id);
    if (response.derivation_posture === "PRIMARY_OBSERVATION") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RECOVERY_READ must preserve recovery derivation against earlier response lineage",
      );
    }
  }
  if (response.derivation_posture === "PRIMARY_OBSERVATION") {
    if (
      response.legal_effect_posture !== "DIRECT_STATE_MUTATION" ||
      response.supersedes_response_id !== null ||
      response.recovery_basis_response_id !== null ||
      response.corroborates_response_ids.length > 0 ||
      response.conflicting_response_ids.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "PRIMARY_OBSERVATION must retain direct state posture and clear derivation lineage",
      );
    }
  }
  if (response.derivation_posture === "CORROBORATING_OBSERVATION") {
    if (
      response.legal_effect_posture !== "NO_STATE_MUTATION" ||
      response.corroborates_response_ids.length === 0 ||
      response.supersedes_response_id !== null ||
      response.conflicting_response_ids.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CORROBORATING_OBSERVATION must retain corroboration lineage only and no state mutation",
      );
    }
  }
  if (response.derivation_posture === "SUPERSEDES_TIMEOUT_PLACEHOLDER") {
    if (
      !ASYNC_RESPONSE_SOURCES.has(response.response_source) ||
      response.legal_effect_posture !== "RECONCILIATION_ONLY" ||
      response.supersedes_response_id === null ||
      response.corroborates_response_ids.length > 0 ||
      response.conflicting_response_ids.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "SUPERSEDES_TIMEOUT_PLACEHOLDER requires async source, supersession lineage, and reconciliation-only posture",
      );
    }
  }
  if (response.derivation_posture === "CONFLICTING_OBSERVATION") {
    if (
      response.legal_effect_posture !== "RECONCILIATION_ONLY" ||
      response.response_class !== "ACK_INCONSISTENT_STATE" ||
      response.conflicting_response_ids.length === 0 ||
      response.supersedes_response_id !== null ||
      response.corroborates_response_ids.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CONFLICTING_OBSERVATION must preserve inconsistent-state conflict lineage only",
      );
    }
  }
  if (response.derivation_posture === "TIMEOUT_PLACEHOLDER") {
    if (
      response.response_source !== "TRANSPORT_TIMEOUT" ||
      response.legal_effect_posture !== "PROVISIONAL_STATE_MUTATION" ||
      response.supersedes_response_id !== null ||
      response.recovery_basis_response_id !== null ||
      response.corroborates_response_ids.length > 0 ||
      response.conflicting_response_ids.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "TIMEOUT_PLACEHOLDER must remain transport-timeout-only and clear derivation lineage",
      );
    }
  }
  if (response.legal_effect_posture === "NO_STATE_MUTATION" && response.derivation_posture !== "CORROBORATING_OBSERVATION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "NO_STATE_MUTATION is reserved for corroborating observations",
    );
  }
  if (response.legal_effect_posture === "DIRECT_STATE_MUTATION" && response.derivation_posture !== "PRIMARY_OBSERVATION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "DIRECT_STATE_MUTATION is reserved for primary observations",
    );
  }
  if (response.supersedes_response_id !== null && response.derivation_posture !== "SUPERSEDES_TIMEOUT_PLACEHOLDER") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "supersedes_response_id must force SUPERSEDES_TIMEOUT_PLACEHOLDER",
    );
  }
  if (response.corroborates_response_ids.length > 0 && response.derivation_posture !== "CORROBORATING_OBSERVATION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "corroborates_response_ids must force CORROBORATING_OBSERVATION",
    );
  }
  if (response.conflicting_response_ids.length > 0 && response.derivation_posture !== "CONFLICTING_OBSERVATION") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "conflicting_response_ids must force CONFLICTING_OBSERVATION",
    );
  }
  if (response.recovery_basis_response_id !== null && response.response_source !== "RECOVERY_READ") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "recovery_basis_response_id must force RECOVERY_READ",
    );
  }
  if (
    response.supersedes_response_id === response.response_id ||
    response.recovery_basis_response_id === response.response_id ||
    response.corroborates_response_ids.includes(response.response_id) ||
    response.conflicting_response_ids.includes(response.response_id)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "response lineage refs must not point back to response_id",
    );
  }
  const overlap = response.corroborates_response_ids.filter((id) => response.conflicting_response_ids.includes(id));
  if (overlap.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "corroborates_response_ids and conflicting_response_ids must be disjoint",
    );
  }
}

export function normalizeAuthorityResponseEnvelope(input: AuthorityResponseEnvelope): AuthorityResponseEnvelope {
  const response: AuthorityResponseEnvelope = {
    authority_ingress_proof_contract: input.authority_ingress_proof_contract === null
      ? null
      : normalizeAuthorityIngressProofContract(input.authority_ingress_proof_contract),
    authority_reference: normalizeNullableString("authority_reference", input.authority_reference),
    conflicting_response_ids: normalizeSortedStringSet("conflicting_response_ids", input.conflicting_response_ids),
    corroborates_response_ids: normalizeSortedStringSet("corroborates_response_ids", input.corroborates_response_ids),
    correlation_status: assertEnum("correlation_status", input.correlation_status, [
      "BOUND",
      "BOUND_WITH_AUTHORITY_REFERENCE_ONLY",
      "AMBIGUOUS",
      "UNBOUND",
    ] as const),
    derivation_posture: assertEnum("derivation_posture", input.derivation_posture, [
      "PRIMARY_OBSERVATION",
      "CORROBORATING_OBSERVATION",
      "SUPERSEDES_TIMEOUT_PLACEHOLDER",
      "CONFLICTING_OBSERVATION",
      "TIMEOUT_PLACEHOLDER",
    ] as const),
    http_status: normalizeHttpStatus(input.http_status),
    inbox_receipt_ref: normalizeNullableString("inbox_receipt_ref", input.inbox_receipt_ref),
    ingress_receipt_ref: normalizeNullableString("ingress_receipt_ref", input.ingress_receipt_ref),
    legal_effect_posture: assertEnum("legal_effect_posture", input.legal_effect_posture, [
      "DIRECT_STATE_MUTATION",
      "PROVISIONAL_STATE_MUTATION",
      "RECONCILIATION_ONLY",
      "NO_STATE_MUTATION",
    ] as const),
    provider_delivery_ref: normalizeNullableString("provider_delivery_ref", input.provider_delivery_ref),
    provider_received_at: normalizeNullableTimestamp("provider_received_at", input.provider_received_at),
    received_at: normalizeTimestamp("received_at", input.received_at),
    recovery_basis_response_id: normalizeNullableString("recovery_basis_response_id", input.recovery_basis_response_id),
    request_id: requireString("request_id", input.request_id),
    response_body_hash: requireString("response_body_hash", input.response_body_hash),
    response_body_ref: normalizeNullableString("response_body_ref", input.response_body_ref),
    response_class: assertEnum("response_class", input.response_class, [
      "ACK_SUCCESS",
      "ACK_ACCEPTED_PENDING",
      "ACK_REJECTED_VALIDATION",
      "ACK_REJECTED_AUTH",
      "ACK_RETRYABLE_FAILURE",
      "ACK_TIMEOUT_OR_NO_RESOLUTION",
      "ACK_EXTERNAL_STATE_DISCOVERED",
      "ACK_AMBIGUOUS_CORRELATION",
      "ACK_INCONSISTENT_STATE",
    ] as const),
    response_headers_ref: normalizeNullableString("response_headers_ref", input.response_headers_ref),
    response_id: requireString("response_id", input.response_id),
    response_source: assertEnum("response_source", input.response_source, AUTHORITY_RESPONSE_SOURCES),
    retry_class: assertEnum("retry_class", input.retry_class, [
      "NO_RETRY",
      "SAFE_RETRY",
      "RECONCILE_THEN_RETRY",
      "HUMAN_REVIEW_THEN_RETRY",
      "REBUILD_THEN_RETRY",
      "MANUAL_INTERVENTION_REQUIRED",
    ] as const),
    supersedes_response_id: normalizeNullableString("supersedes_response_id", input.supersedes_response_id),
  };
  if (
    response.provider_received_at !== null &&
    Date.parse(response.provider_received_at) > Date.parse(response.received_at)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "provider_received_at must not be later than received_at",
    );
  }
  assertBodyPosture(response);
  assertResponseSourceRules(response);
  assertCorrelationRules(response);
  assertDerivationRules(response);
  return response;
}

function defaultDerivation(input: AuthorityResponseEnvelopeBuildInput): AuthorityResponseDerivationPosture {
  if (input.response_source === "TRANSPORT_TIMEOUT") {
    return "TIMEOUT_PLACEHOLDER";
  }
  if (input.supersedes_response_id !== undefined && input.supersedes_response_id !== null) {
    return "SUPERSEDES_TIMEOUT_PLACEHOLDER";
  }
  if ((input.conflicting_response_ids ?? []).length > 0) {
    return "CONFLICTING_OBSERVATION";
  }
  if ((input.corroborates_response_ids ?? []).length > 0) {
    return "CORROBORATING_OBSERVATION";
  }
  return "PRIMARY_OBSERVATION";
}

function legalEffectForDerivation(derivation: AuthorityResponseDerivationPosture): AuthorityResponseLegalEffectPosture {
  if (derivation === "PRIMARY_OBSERVATION") {
    return "DIRECT_STATE_MUTATION";
  }
  if (derivation === "CORROBORATING_OBSERVATION") {
    return "NO_STATE_MUTATION";
  }
  if (derivation === "TIMEOUT_PLACEHOLDER") {
    return "PROVISIONAL_STATE_MUTATION";
  }
  return "RECONCILIATION_ONLY";
}

function defaultClass(input: AuthorityResponseEnvelopeBuildInput, derivation: AuthorityResponseDerivationPosture) {
  if (input.response_source === "TRANSPORT_TIMEOUT") {
    return "ACK_TIMEOUT_OR_NO_RESOLUTION";
  }
  if (["AMBIGUOUS", "UNBOUND"].includes(input.correlation_status ?? "")) {
    return "ACK_AMBIGUOUS_CORRELATION";
  }
  if (derivation === "CONFLICTING_OBSERVATION" || input.correlation_status === "BOUND_WITH_AUTHORITY_REFERENCE_ONLY") {
    return "ACK_INCONSISTENT_STATE";
  }
  if (input.http_status !== undefined && input.http_status !== null && input.http_status >= 400) {
    return input.http_status === 401 || input.http_status === 403 ? "ACK_REJECTED_AUTH" : "ACK_RETRYABLE_FAILURE";
  }
  return "ACK_SUCCESS";
}

function defaultRetry(responseClass: AuthorityResponseClass): AuthorityResponseRetryClass {
  if (responseClass === "ACK_SUCCESS" || responseClass === "ACK_ACCEPTED_PENDING") {
    return "NO_RETRY";
  }
  if (responseClass === "ACK_TIMEOUT_OR_NO_RESOLUTION" || responseClass === "ACK_AMBIGUOUS_CORRELATION") {
    return "RECONCILE_THEN_RETRY";
  }
  if (responseClass === "ACK_INCONSISTENT_STATE") {
    return "HUMAN_REVIEW_THEN_RETRY";
  }
  if (responseClass === "ACK_RETRYABLE_FAILURE") {
    return "SAFE_RETRY";
  }
  return "NO_RETRY";
}

export function buildAuthorityResponseEnvelope(input: AuthorityResponseEnvelopeBuildInput): AuthorityResponseEnvelope {
  const responseSource = assertEnum("response_source", input.response_source, AUTHORITY_RESPONSE_SOURCES);
  const receivedAt = normalizeTimestamp("received_at", input.received_at ?? new Date(0).toISOString());
  if (responseSource === "TRANSPORT_TIMEOUT") {
    return normalizeAuthorityResponseEnvelope({
      authority_ingress_proof_contract: null,
      authority_reference: null,
      conflicting_response_ids: [],
      corroborates_response_ids: [],
      correlation_status: input.correlation_status ?? "BOUND",
      derivation_posture: "TIMEOUT_PLACEHOLDER",
      http_status: null,
      inbox_receipt_ref: null,
      ingress_receipt_ref: null,
      legal_effect_posture: "PROVISIONAL_STATE_MUTATION",
      provider_delivery_ref: null,
      provider_received_at: null,
      received_at: receivedAt,
      recovery_basis_response_id: null,
      request_id: input.request_id,
      response_body_hash: NONE_SENTINEL,
      response_body_ref: null,
      response_class: "ACK_TIMEOUT_OR_NO_RESOLUTION",
      response_headers_ref: null,
      response_id: input.response_id,
      response_source: "TRANSPORT_TIMEOUT",
      retry_class: input.retry_class ?? "RECONCILE_THEN_RETRY",
      supersedes_response_id: null,
    });
  }

  const responseBodyRef = normalizeNullableString("response_body_ref", input.response_body_ref ?? null);
  const responseBodyHash = deriveResponseBodyHash({
    response_body: input.response_body,
    response_body_hash: input.response_body_hash,
    response_body_ref: responseBodyRef,
  });
  const derivationPosture = input.derivation_posture ?? defaultDerivation(input);
  const legalEffectPosture = input.legal_effect_posture ?? legalEffectForDerivation(derivationPosture);
  const responseClass = input.response_class ?? defaultClass(input, derivationPosture);
  const providerDeliveryRef = input.provider_delivery_ref ?? null;
  const ingressReceiptRef = input.ingress_receipt_ref ?? null;
  const correlationStatus = input.correlation_status ?? "BOUND";
  const proof = input.authority_ingress_proof_contract ?? null;

  return normalizeAuthorityResponseEnvelope({
    authority_ingress_proof_contract: proof,
    authority_reference: input.authority_reference ?? null,
    conflicting_response_ids: [...(input.conflicting_response_ids ?? [])],
    corroborates_response_ids: [...(input.corroborates_response_ids ?? [])],
    correlation_status: correlationStatus,
    derivation_posture: derivationPosture,
    http_status: input.http_status ?? (responseClass === "ACK_SUCCESS" ? 200 : null),
    inbox_receipt_ref: input.inbox_receipt_ref ?? null,
    ingress_receipt_ref: ingressReceiptRef,
    legal_effect_posture: legalEffectPosture,
    provider_delivery_ref: providerDeliveryRef,
    provider_received_at: input.provider_received_at ?? receivedAt,
    received_at: receivedAt,
    recovery_basis_response_id: input.recovery_basis_response_id ?? null,
    request_id: input.request_id,
    response_body_hash: responseBodyHash,
    response_body_ref: responseBodyRef,
    response_class: responseClass,
    response_headers_ref: input.response_headers_ref ?? (responseSource === "INLINE_HTTP" ? "authority-response-headers://inline" : null),
    response_id: input.response_id,
    response_source: responseSource,
    retry_class: input.retry_class ?? defaultRetry(responseClass),
    supersedes_response_id: input.supersedes_response_id ?? null,
  });
}

export function authorityResponseEnvelopeRef(response: Pick<AuthorityResponseEnvelope, "response_id"> | string) {
  return refFromId(
    "authority-response-envelope",
    typeof response === "string" ? response : response.response_id,
  );
}

export function cloneAuthorityResponseEnvelope(response: AuthorityResponseEnvelope) {
  return cloneRecord(response);
}

export function authorityResponseEnvelopeContentFingerprint(response: AuthorityResponseEnvelope) {
  return hashObject("AUTHORITY_RESPONSE_ENVELOPE_MODEL_V1", normalizeAuthorityResponseEnvelope(response));
}
