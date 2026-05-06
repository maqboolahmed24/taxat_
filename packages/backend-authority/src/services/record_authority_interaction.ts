import {
  type AuthorityIngressProofContract,
  type AuthorityReconciliationControlContract,
  type AuthorityTruthState,
  normalizeAuthorityIngressProofContract,
  normalizeTimestamp,
} from "../models/authority_common.ts";
import type { AuthorityBinding } from "../models/authority_binding.ts";
import {
  type AuthorityInteractionMeaningResolutionState,
  type AuthorityInteractionRecord,
  authorityInteractionRecordRef,
  buildAuthorityInteractionRecord,
  normalizeAuthorityInteractionRecord,
} from "../models/authority_interaction_record.ts";
import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import type { AuthorityResponseEnvelope } from "../models/authority_response_envelope.ts";
import type { AuthorityInteractionRecordRepository } from "../repositories/authority_interaction_record_repository.ts";
import {
  buildBindingDriftSentinelContract,
  type AuthorityBindingDriftSentinelContract,
} from "./build_binding_drift_sentinel_contract.ts";
import { buildAuthorityIngressProofContract } from "./build_authority_ingress_proof_contract.ts";
import { buildInteractionReconciliationControlContract } from "./build_reconciliation_control_contract.ts";
import { classifySendRevalidationOutcome, type SendRevalidationProjection } from "./classify_send_revalidation_outcome.ts";
import { buildRequestIdentityContractFromEnvelope } from "./build_request_identity_contract.ts";
import {
  type AuthorityInteractionTransitionEvent,
  validateAuthorityInteractionTransition,
} from "./validate_authority_interaction_transition.ts";

function mergeUnique(left: readonly string[], right: readonly string[]) {
  return [...new Set([...left, ...right])].sort();
}

function defaultInteractionId(request: AuthorityRequestEnvelope) {
  return `interaction-${request.request_id}`;
}

function defaultAuthorityOperationProfileRef(request: AuthorityRequestEnvelope) {
  return request.operation_profile.startsWith("authority-operation-profile://")
    ? request.operation_profile
    : `authority-operation-profile://${request.operation_profile}`;
}

function sealedIdentityFromRequest(input: {
  authority_binding?: AuthorityBinding;
  authority_request: AuthorityRequestEnvelope;
  sealed_token_version_ref?: string;
}) {
  if (input.authority_binding !== undefined) {
    return undefined;
  }
  const request = input.authority_request;
  return {
    access_binding_hash: request.access_binding_hash,
    acting_party_ref: request.acting_party_ref,
    authority_binding_ref: request.authority_binding_ref,
    authority_link_ref: request.authority_link_ref,
    authority_scope: request.authority_scope,
    binding_lineage_ref: request.binding_lineage_ref,
    client_id: request.client_id,
    delegation_grant_ref_or_null: request.delegation_grant_ref,
    policy_snapshot_hash: request.policy_snapshot_hash,
    provider_api_version: request.provider_api_version,
    provider_environment: request.provider_environment,
    sealed_token_version_ref: input.sealed_token_version_ref ?? request.token_binding_ref,
    subject_ref: request.subject_ref,
    tenant_id: request.tenant_id,
  };
}

function responseTruthState(response: AuthorityResponseEnvelope): AuthorityTruthState {
  if (response.response_class === "ACK_SUCCESS") {
    return "CONFIRMED";
  }
  if (response.response_class === "ACK_ACCEPTED_PENDING") {
    return "PENDING_ACK";
  }
  if (
    response.response_class === "ACK_REJECTED_AUTH" ||
    response.response_class === "ACK_REJECTED_VALIDATION"
  ) {
    return "REJECTED";
  }
  if (response.response_class === "ACK_EXTERNAL_STATE_DISCOVERED") {
    return "OUT_OF_BAND";
  }
  return "UNKNOWN";
}

function responseMeaning(input: {
  current: AuthorityInteractionRecord;
  response: AuthorityResponseEnvelope;
}): {
  active_response_id: string;
  meaning_resolution_state: AuthorityInteractionMeaningResolutionState;
  response_history_ids: string[];
} {
  const history = input.current.response_history_ids.includes(input.response.response_id)
    ? [...input.current.response_history_ids]
    : [...input.current.response_history_ids, input.response.response_id];
  if (input.response.response_class === "ACK_TIMEOUT_OR_NO_RESOLUTION") {
    return {
      active_response_id: input.current.active_response_id ?? input.response.response_id,
      meaning_resolution_state: "PROVISIONAL_TIMEOUT",
      response_history_ids: history,
    };
  }
  if (input.response.derivation_posture === "CORROBORATING_OBSERVATION") {
    return {
      active_response_id: input.current.active_response_id ?? input.response.response_id,
      meaning_resolution_state: "ACTIVE_CORROBORATED",
      response_history_ids: history,
    };
  }
  if (
    input.response.derivation_posture === "CONFLICTING_OBSERVATION" ||
    input.response.derivation_posture === "SUPERSEDES_TIMEOUT_PLACEHOLDER" ||
    input.response.legal_effect_posture === "RECONCILIATION_ONLY"
  ) {
    return {
      active_response_id: input.current.active_response_id ?? input.response.response_id,
      meaning_resolution_state: "RECONCILIATION_REQUIRED",
      response_history_ids: history,
    };
  }
  return {
    active_response_id: input.response.response_id,
    meaning_resolution_state: "ACTIVE_DIRECT",
    response_history_ids: history,
  };
}

function projectInteractionIngressProof(input: {
  interaction: AuthorityInteractionRecord;
  normalized_response_ref: string;
  proof: AuthorityIngressProofContract | null;
}) {
  const canonicalIngressReceiptRef = input.proof?.canonical_ingress_receipt_ref_or_null ?? null;
  if (input.proof === null || canonicalIngressReceiptRef === null) {
    return null;
  }
  const proof = normalizeAuthorityIngressProofContract(input.proof);
  return buildAuthorityIngressProofContract({
    authenticated_channel_state:
      proof.authenticated_channel_state === "AUTHENTICATED" ? "AUTHENTICATED" : "FAILED",
    authentication_evidence_modes: proof.authentication_evidence_modes,
    authentication_evidence_refs: proof.authentication_evidence_refs,
    authority_reference: proof.authority_reference_or_null,
    binding_scope_class: "AUTHORITY_INTERACTION_RECORD",
    bound_interaction_ref: authorityInteractionRecordRef(input.interaction),
    canonical_ingress_receipt_ref: canonicalIngressReceiptRef,
    correlation_status: proof.correlation_status_or_null ?? "BOUND",
    delivery_dedupe_key: proof.delivery_dedupe_key_or_null ?? `delivery-dedupe://${input.normalized_response_ref}`,
    duplicate_meaning_key: proof.duplicate_meaning_key_or_null ?? input.interaction.duplicate_meaning_key,
    idempotency_key: proof.idempotency_key_or_null ?? input.interaction.idempotency_key,
    identity_namespace_hash: proof.identity_namespace_hash_or_null ?? input.interaction.identity_namespace_hash,
    ingress_channel_class: proof.ingress_channel_class_or_null ?? "WORKER_OBSERVED",
    ingress_channel_metadata_hash:
      proof.ingress_channel_metadata_hash_or_null ?? `hash.ingress-metadata.${input.normalized_response_ref}`,
    lineage_binding_basis:
      proof.lineage_binding_basis === "NOT_APPLICABLE"
        ? "REQUEST_HASH_AND_TUPLE_EXACT"
        : proof.lineage_binding_basis,
    mutation_gate_state: "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT",
    normalized_response_ref: input.normalized_response_ref,
    provider_delivery_ref: proof.provider_delivery_ref_or_null ?? `provider-delivery://${input.normalized_response_ref}`,
    request_hash: proof.request_hash_or_null ?? input.interaction.request_hash,
    request_lineage_proof_hash: proof.request_lineage_proof_hash_or_null,
    response_body_hash: proof.response_body_hash_or_null ?? `hash.response-body.${input.normalized_response_ref}`,
  });
}

function shouldOpenReconciliation(input: {
  meaning_resolution_state: AuthorityInteractionMeaningResolutionState;
  truth_state: AuthorityTruthState;
}) {
  return (
    input.meaning_resolution_state === "PROVISIONAL_TIMEOUT" ||
    input.meaning_resolution_state === "RECONCILIATION_REQUIRED" ||
    input.truth_state === "PENDING_ACK" ||
    input.truth_state === "UNKNOWN"
  );
}

function buildControlForResponse(input: {
  at: string;
  current: AuthorityInteractionRecord;
  meaning_resolution_state: AuthorityInteractionMeaningResolutionState;
  reconciliation_cadence_seconds?: number | undefined;
  reconciliation_deadline_at?: string | undefined;
  truth_state: AuthorityTruthState;
}) {
  const open = shouldOpenReconciliation({
    meaning_resolution_state: input.meaning_resolution_state,
    truth_state: input.truth_state,
  });
  const method = open
    ? input.current.reconciliation_method === "NONE"
      ? "POLL_STATUS"
      : input.current.reconciliation_method
    : input.current.reconciliation_attempt_count > 0
      ? input.current.reconciliation_method
      : "NONE";
  const maxAttempts = open
    ? Math.max(input.current.max_auto_reconciliation_attempts, 3)
    : input.current.reconciliation_attempt_count > 0
      ? input.current.max_auto_reconciliation_attempts
      : 0;
  const cadence = open
    ? input.current.reconciliation_cadence_seconds ?? input.reconciliation_cadence_seconds ?? 3600
    : method === "NONE" || method === "MANUAL_ONLY"
      ? null
      : input.current.reconciliation_cadence_seconds;
  const deadline =
    open
      ? input.current.reconciliation_deadline_at ??
        input.reconciliation_deadline_at ??
        new Date(Date.parse(input.at) + 86_400_000).toISOString()
      : null;
  return buildInteractionReconciliationControlContract({
    authority_operation_profile_ref: input.current.authority_operation_profile_ref,
    authority_truth_state: input.truth_state,
    duplicate_meaning_key: input.current.duplicate_meaning_key,
    idempotency_key: input.current.idempotency_key,
    interaction_id: input.current.interaction_id,
    last_budget_event_at: input.at,
    max_auto_reconciliation_attempts: maxAttempts,
    operation_family: input.current.request_identity_contract.operation_family,
    provider_environment: input.current.request_identity_contract.provider_environment,
    reconciliation_attempt_count: input.current.reconciliation_attempt_count,
    reconciliation_budget_state: open ? "ACTIVE" : "CLOSED",
    reconciliation_cadence_seconds_or_null: cadence,
    reconciliation_deadline_at_or_null: deadline,
    reconciliation_method: method,
  });
}

export async function recordAuthorityInteraction(input: {
  authority_binding?: AuthorityBinding;
  authority_operation_profile_ref?: string;
  authority_request: AuthorityRequestEnvelope;
  created_at: string;
  dispatch_ref: string;
  interaction_id?: string;
  repository?: AuthorityInteractionRecordRepository;
  sealed_token_version_ref?: string;
  submission_record_ref?: string | null;
}) {
  const request = input.authority_request;
  const interactionId = input.interaction_id ?? defaultInteractionId(request);
  const sentinel =
    input.authority_binding === undefined
      ? buildBindingDriftSentinelContract({
          checked_action_class: "NOT_YET_ATTEMPTED",
          decision_state: "NOT_EVALUATED",
          duplicate_meaning_key: request.duplicate_meaning_key,
          sealed_binding_identity: sealedIdentityFromRequest({
            authority_request: request,
            ...(input.sealed_token_version_ref !== undefined
              ? { sealed_token_version_ref: input.sealed_token_version_ref }
              : {}),
          }),
        })
      : buildBindingDriftSentinelContract({
          authority_binding: input.authority_binding,
          checked_action_class: "NOT_YET_ATTEMPTED",
          decision_state: "NOT_EVALUATED",
          duplicate_meaning_key: request.duplicate_meaning_key,
        });
  const control = buildInteractionReconciliationControlContract({
    authority_operation_profile_ref:
      input.authority_operation_profile_ref ?? defaultAuthorityOperationProfileRef(request),
    authority_truth_state: "NOT_REQUESTED",
    duplicate_meaning_key: request.duplicate_meaning_key,
    idempotency_key: request.idempotency_key,
    interaction_id: interactionId,
    last_budget_event_at: input.created_at,
    max_auto_reconciliation_attempts: 0,
    operation_family: request.operation_family,
    provider_environment: request.provider_environment,
    reconciliation_attempt_count: 0,
    reconciliation_budget_state: "NOT_OPENED",
    reconciliation_cadence_seconds_or_null: null,
    reconciliation_deadline_at_or_null: null,
    reconciliation_method: "NONE",
  });
  const interaction = buildAuthorityInteractionRecord({
    access_binding_hash: request.access_binding_hash,
    authority_binding_ref: request.authority_binding_ref,
    authority_link_ref: request.authority_link_ref,
    authority_operation_profile_ref:
      input.authority_operation_profile_ref ?? defaultAuthorityOperationProfileRef(request),
    binding_drift_sentinel_contract: sentinel,
    binding_lineage_ref: request.binding_lineage_ref,
    created_at: input.created_at,
    dispatch_ref: input.dispatch_ref,
    duplicate_meaning_key: request.duplicate_meaning_key,
    idempotency_key: request.idempotency_key,
    identity_namespace_hash: request.identity_namespace_hash,
    interaction_id: interactionId,
    manifest_id: request.manifest_id,
    operation_id: request.operation_id,
    policy_snapshot_hash: request.policy_snapshot_hash,
    reconciliation_control_contract: control,
    request_hash: request.request_hash,
    request_id: request.request_id,
    request_identity_contract: buildRequestIdentityContractFromEnvelope(
      request,
      "AUTHORITY_INTERACTION_RECORD",
    ),
    submission_record_ref: input.submission_record_ref ?? null,
  });
  const stored = input.repository
    ? await input.repository.persistAuthorityInteractionRecord({ interaction })
    : null;
  return { interaction, stored };
}

export async function materializeAuthorityInteractionDispatch(input: {
  current: AuthorityInteractionRecord;
  dispatch_ref?: string;
  repository?: AuthorityInteractionRecordRepository;
  transition_at: string;
}) {
  const transition = validateAuthorityInteractionTransition({
    current: input.current,
    event: "dispatch_materialized",
    transition_at: input.transition_at,
  });
  const interaction = normalizeAuthorityInteractionRecord({
    ...input.current,
    audit_refs: mergeUnique(input.current.audit_refs, [transition.transition_audit_ref]),
    dispatch_ref: input.dispatch_ref ?? input.current.dispatch_ref,
    last_status_at: transition.transition_at,
    lifecycle_state: transition.to_state,
  });
  const stored = input.repository
    ? await input.repository.persistAuthorityInteractionRecord({ interaction })
    : null;
  return { interaction, stored, transition };
}

function blockedTransitionEvent(projection: SendRevalidationProjection): AuthorityInteractionTransitionEvent {
  return projection.send_revalidation_reason_codes.some((code) =>
    ["DUPLICATE_BUCKET_CHANGED", "STRONGER_EXTERNAL_TRUTH_PRESENT", "BODY_COLLISION_PRESENT"].includes(code),
  )
    ? "duplicate_bucket_changed_before_send"
    : "binding_invalidated_before_send";
}

export async function applyAuthorityInteractionSendRevalidation(input: {
  current: AuthorityInteractionRecord;
  projection?: SendRevalidationProjection;
  repository?: AuthorityInteractionRecordRepository;
  sentinel: AuthorityBindingDriftSentinelContract;
}) {
  const projection = input.projection ?? classifySendRevalidationOutcome(input.sentinel);
  const event =
    projection.send_revalidation_state === "CLEAR_TO_SEND"
      ? "exclusive_gateway_claim_and_send_begin"
      : blockedTransitionEvent(projection);
  const transition = validateAuthorityInteractionTransition({
    current: input.current,
    event,
    transition_at: projection.send_revalidated_at ?? input.current.last_status_at,
  });
  const interaction = normalizeAuthorityInteractionRecord({
    ...input.current,
    abandonment_reason_code:
      projection.send_revalidation_state === "BLOCKED"
        ? `SEND_REVALIDATION_${projection.send_revalidation_reason_codes[0] ?? "BLOCKED"}`
        : null,
    audit_refs: mergeUnique(input.current.audit_refs, [transition.transition_audit_ref]),
    binding_drift_sentinel_contract: input.sentinel,
    last_status_at: transition.transition_at,
    lifecycle_state: transition.to_state,
    resend_control_reason_codes:
      projection.send_revalidation_state === "CLEAR_TO_SEND"
        ? ["IN_FLIGHT_REQUEST_LINEAGE_EXISTS", "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY"]
        : ["INTERACTION_FINALIZED_NO_RESEND"],
    resend_legality_state:
      projection.send_revalidation_state === "CLEAR_TO_SEND"
        ? "IDEMPOTENT_RECOVERY_ONLY"
        : "CLOSED_NO_RESEND",
    send_authorized_token_version_ref: projection.send_authorized_token_version_ref,
    send_revalidated_at: projection.send_revalidated_at,
    send_revalidation_reason_codes: projection.send_revalidation_reason_codes,
    send_revalidation_state: projection.send_revalidation_state,
  });
  const stored = input.repository
    ? await input.repository.persistAuthorityInteractionRecord({ interaction })
    : null;
  return { interaction, stored, transition };
}

export async function appendAuthorityInteractionResponseObservation(input: {
  current: AuthorityInteractionRecord;
  reconciliation_cadence_seconds?: number;
  reconciliation_deadline_at?: string;
  repository?: AuthorityInteractionRecordRepository;
  response: AuthorityResponseEnvelope;
}) {
  const at = normalizeTimestamp("received_at", input.response.received_at);
  const transition =
    input.current.lifecycle_state === "TRANSMIT_IN_FLIGHT"
      ? validateAuthorityInteractionTransition({
          current: input.current,
          event:
            input.response.response_class === "ACK_TIMEOUT_OR_NO_RESOLUTION"
              ? "timeout_envelope_recorded"
              : "provider_response_captured",
          transition_at: at,
        })
      : null;
  const meaning = responseMeaning({
    current: input.current,
    response: input.response,
  });
  const truthState = responseTruthState(input.response);
  const control = buildControlForResponse({
    at,
    current: input.current,
    meaning_resolution_state: meaning.meaning_resolution_state,
    reconciliation_cadence_seconds: input.reconciliation_cadence_seconds,
    reconciliation_deadline_at: input.reconciliation_deadline_at,
    truth_state: truthState,
  });
  const interaction = normalizeAuthorityInteractionRecord({
    ...input.current,
    active_response_id: meaning.active_response_id,
    audit_refs: mergeUnique(input.current.audit_refs, [
      transition?.transition_audit_ref ??
        `audit://authority-interaction/${input.current.interaction_id}/response-observation/${input.response.response_id}`,
    ]),
    authority_ingress_proof_contract:
      meaning.active_response_id === input.response.response_id
        ? projectInteractionIngressProof({
            interaction: input.current,
            normalized_response_ref: meaning.active_response_id,
            proof: input.response.authority_ingress_proof_contract,
          })
        : input.current.authority_ingress_proof_contract,
    last_status_at: at,
    lifecycle_state: transition?.to_state ?? input.current.lifecycle_state,
    max_auto_reconciliation_attempts: control.max_auto_reconciliation_attempts,
    meaning_resolution_state: meaning.meaning_resolution_state,
    next_reconciliation_at: control.next_reconciliation_at_or_null,
    provenance_refs: mergeUnique(input.current.provenance_refs, [input.response.response_id]),
    reconciliation_attempt_count: control.reconciliation_attempt_count,
    reconciliation_budget_state: control.reconciliation_budget_state,
    reconciliation_cadence_seconds: control.reconciliation_cadence_seconds_or_null,
    reconciliation_control_contract: control,
    reconciliation_deadline_at: control.reconciliation_deadline_at_or_null,
    reconciliation_method: control.reconciliation_method,
    resend_control_reason_codes: control.resend_control_reason_codes,
    resend_legality_state: control.resend_legality_state,
    response_history_ids: meaning.response_history_ids,
  });
  const stored = input.repository
    ? await input.repository.persistAuthorityInteractionRecord({ interaction })
    : null;
  return { interaction, stored, transition };
}
