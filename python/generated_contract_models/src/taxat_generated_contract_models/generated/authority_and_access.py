"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class ActionAuthorityContract(TypedDict, total=False):
    projection_scope: Required[Literal["WORKSPACE_ACTION_STRIP", "WORK_INBOX_ROW_ACTIONS", "CUSTOMER_REQUEST_DETAIL", "CUSTOMER_REQUEST_ROW"]]
    source_module_code: Required[Literal["WORKFLOW_CHOREOGRAPHER"]]
    basis_hash: Required[str]
    projection_route_key: Required[str]
    projection_version: Required[int]
    access_binding_hash: Required[str]
    visibility_cache_partition_key: Required[str]
    customer_safe_projection: Required[bool]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code_or_null: Required[str | None]
    secondary_action_codes: Required[list[str]]
    available_action_codes: Required[list[str]]
    blocked_action_codes: Required[list[str]]
    blocking_reason_code_or_null: Required[str | None]
    machine_reason_codes: Required[list[str]]
    suggested_module_code_or_null: Required[Literal["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL", None]]
    recovery_route_ref_or_null: Required[str | None]
    recovery_focus_anchor_ref_or_null: Required[str | None]

ActionAuthorityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/action_authority_contract.schema.json",
    "source_hash": "1f7f036e3b8b69d1a342905380a79eb2e4dd840befd8d4aefcacd990c58233d6",
}

class ActorSession(TypedDict, total=False):
    artifact_type: Required[Literal["ActorSession"]]
    session_id: Required[str]
    tenant_id: Required[str]
    principal_ref: Required[str]
    principal_class: Required[Literal["HUMAN", "SERVICE", "EXTERNAL"]]
    session_client_class: Required[Literal["BROWSER", "NATIVE", "AUTOMATION"]]
    authn_level: Required[Literal["BASIC", "MFA", "STEP_UP"]]
    step_up_state: Required[Literal["NOT_REQUIRED", "REQUIRED_PENDING", "SATISFIED", "EXPIRED"]]
    session_binding_hash: Required[str]
    csrf_ref: Required[str | None]
    device_binding_state: Required[Literal["NOT_APPLICABLE", "BOUND", "UNVERIFIED", "INVALIDATED"]]
    issued_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    revoked_at: Required[ISO8601DateTimeString]
    revocation_reason: Required[str | None]
    step_up_completed_at: Required[ISO8601DateTimeString]
    last_seen_at: Required[ISO8601DateTimeString]

ActorSessionSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/actor_session.schema.json",
    "source_hash": "a75ec9cb55c8dc2926180ee7fda3ca436631049d07d9ba90fe83d1ea842a6b3a",
}

class AuthorityBinding(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityBinding"]]
    authority_binding_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str]
    principal_context_ref: Required[str]
    authorization_decision_ref: Required[str]
    authority_link_ref: Required[str]
    delegation_grant_ref: Required[str | None]
    delegation_state: Required[Literal["NOT_REQUIRED", "SATISFIED", "LIMITED", "MISSING", "EXPIRED", "UNKNOWN"]]
    authority_link_state: Required[Literal["UNLINKED", "LINK_INITIATED", "AUTHORISED_ACTIVE", "AUTHORISED_LIMITED", "TOKEN_INVALID", "REVOKED", "EXPIRED", "SUPERSEDED"]]
    partition_scope_refs: Required[list[str]]
    token_binding_ref: Required[str]
    binding_lineage_ref: Required[str]
    token_version_ref: Required[str]
    subject_ref: Required[str]
    acting_party_ref: Required[str]
    authority_scope: Required[str]
    provider_environment: Required[str]
    provider_api_version: Required[str]
    access_binding_hash: Required[str]
    policy_snapshot_hash: Required[str]
    token_client_binding_state: Required[Literal["BOUND", "MISMATCH", "UNVERIFIED"]]
    binding_health: Required[Literal["HEALTHY", "LIMITED_SCOPE", "EXPIRING_SOON", "TOKEN_INVALID", "CLIENT_BINDING_MISMATCH", "DELEGATION_GAP", "ENVIRONMENT_DRIFT", "REVOKED", "EXPIRED", "UNKNOWN"]]
    last_validated_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    blocked_reason_codes: Required[list[str]]
    authority_layer_boundary: Required[AuthorityLayerBoundaryContract]
    step_up_state: Required[Literal["NOT_REQUIRED", "SATISFIED"]]
    step_up_evidence_ref: Required[str | None]
    approval_state: Required[Literal["NOT_REQUIRED", "SATISFIED"]]
    approval_ref: Required[str | None]
    binding_resolved_at: Required[ISO8601DateTimeString]

AuthorityBindingSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_binding.schema.json",
    "source_hash": "02882fc03c78975fa445787e7133885b4088882cb36a58c874004ffd5c37a1ad",
}

class AuthorityBindingDriftSentinelContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_BINDING_DRIFT_SENTINEL_V1"]]
    binding_scope_class: Required[Literal["AUTHORITY_INTERACTION_RECORD"]]
    sentinel_contract_hash: Required[str]
    binding_verification_policy: Required[Literal["RECHECK_BOUND_IDENTITY_AND_LIVE_AUTHORITY_CONTEXT_BEFORE_NETWORK_ACTION"]]
    duplicate_truth_policy: Required[Literal["LATEST_DUPLICATE_AND_STRONGER_TRUTH_MUST_BLOCK_OR_RECONCILE"]]
    lineage_reuse_policy: Required[Literal["SEALED_REQUEST_LINEAGE_ONLY_NO_SILENT_REBIND"]]
    checked_action_class: Required[Literal["NOT_YET_ATTEMPTED", "TRANSMIT_MUTATION", "RECONCILIATION_POLL", "RECOVERY_READ"]]
    decision_state: Required[Literal["NOT_EVALUATED", "CLEAR_TO_PROCEED", "BLOCKED"]]
    checked_at: Required[ISO8601DateTimeString]
    tenant_id: Required[str]
    client_id: Required[str]
    authority_binding_ref: Required[str]
    authority_link_ref: Required[str]
    delegation_grant_ref_or_null: Required[str | None]
    binding_lineage_ref: Required[str]
    sealed_token_version_ref: Required[str]
    checked_token_version_ref_or_null: Required[str | None]
    subject_ref: Required[str]
    acting_party_ref: Required[str]
    authority_scope: Required[str]
    provider_environment: Required[str]
    provider_api_version: Required[str]
    access_binding_hash: Required[str]
    policy_snapshot_hash: Required[str]
    duplicate_meaning_key: Required[str]
    duplicate_truth_inputs_state: Required[Literal["NOT_CHECKED", "RECHECKED_NO_CONFLICT", "NEWER_TRUTH_OR_DUPLICATE_PRESENT"]]
    latest_submission_record_ref_or_null: Required[str | None]
    latest_obligation_mirror_ref_or_null: Required[str | None]
    latest_ingress_receipt_ref_or_null: Required[str | None]
    exclusive_send_claim_state: Required[Literal["NOT_APPLICABLE", "CLAIM_HELD", "CLAIM_CONFLICT"]]
    pass_reason_code_or_null: Required[Literal["SEALED_TOKEN_VERSION_REUSED", "TOKEN_ROTATED_WITHIN_LINEAGE", None]]
    block_reason_codes: Required[list[Literal["SEND_CLAIM_CONFLICT", "TOKEN_VERSION_NOT_USABLE", "BINDING_LINEAGE_DRIFT", "AUTHORITY_LINK_NOT_ACTIVE", "CLIENT_SUBJECT_SCOPE_DRIFT", "PROVIDER_CONTRACT_DRIFT", "ACCESS_BINDING_HASH_DRIFT", "POLICY_SNAPSHOT_HASH_DRIFT", "STEP_UP_OR_APPROVAL_DRIFT", "DUPLICATE_BUCKET_CHANGED", "STRONGER_EXTERNAL_TRUTH_PRESENT", "BODY_COLLISION_PRESENT"]]]

AuthorityBindingDriftSentinelContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_binding_drift_sentinel_contract.schema.json",
    "source_hash": "a1612b481daf34c09c7567f71e922f0bf3d18aec7ba082d522271f7c98f40e0e",
}

class AuthorityCalculationReadinessContext(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityCalculationReadinessContext"]]
    calculation_readiness_context_id: Required[str]
    context_scope: Required[Literal["FILING_PREPARATION", "AMENDMENT_INTENT"]]
    manifest_id: Required[str]
    owner_artifact_type: Required[Literal["FilingCase", "AmendmentCase"]]
    owner_artifact_ref: Required[str]
    calculation_request_ref: Required[str]
    calculation_id: Required[str]
    calculation_type: Required[Literal["in-year", "intent-to-finalise", "intent-to-amend", "final-declaration"]]
    request_state: Required[Literal["MODELED_ONLY", "TRIGGERED", "RETRIEVE_PENDING", "RETRIEVED"]]
    result_state: Required[Literal["MODELED", "RETRIEVED"]]
    calculation_hash: Required[str | None]
    calculation_basis_ref: Required[str | None]
    basis_status: Required[Literal["PROVISIONAL", "CONFIRMED", "REJECTED", None]]
    basis_hash: Required[str | None]
    user_confirmation_ref: Required[str | None]
    confirmation_state: Required[Literal["PENDING", "CONFIRMED", "DECLINED", None]]
    parity_reusable: Required[bool]
    filing_reusable: Required[bool]
    validation_outcome: Required[Literal["PASS", "PASS_WITH_NOTICE", "MANUAL_REVIEW", "OVERRIDABLE_BLOCK", "HARD_BLOCK"]]
    reason_codes: Required[list[str]]
    live_authority_call_executed: Required[bool]
    persisted_at: Required[ISO8601DateTimeString]

AuthorityCalculationReadinessContextSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_calculation_readiness_context.schema.json",
    "source_hash": "6c4f7e1ec5b76862ce49eed3ddb5a0c4acf6ad58fabe87cbae5a104ae756108b",
}

class AuthorityCalculationRequest(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityCalculationRequest"]]
    calculation_request_id: Required[str]
    manifest_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    calculation_type: Required[Literal["in-year", "intent-to-finalise", "intent-to-amend", "final-declaration"]]
    authority_scope: Required[str]
    provider_environment: Required[str]
    operation_profile_ref: Required[str]
    authority_operation_ref: Required[str | None]
    target_obligation_ref: Required[str | None]
    runtime_scope: Required[list[str]]
    scope_execution_binding: Required[ScopeExecutionBinding]
    access_binding_hash: Required[str]
    request_state: Required[Literal["MODELED_ONLY", "TRIGGERED", "RETRIEVE_PENDING", "RETRIEVED", "SUPERSEDED"]]
    live_authority_call_executed: Required[bool]
    request_envelope_ref: Required[str | None]
    authority_interaction_ref: Required[str | None]
    reason_codes: Required[list[str]]
    requested_at: Required[ISO8601DateTimeString]

AuthorityCalculationRequestSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_calculation_request.schema.json",
    "source_hash": "9c0694f3b15563bbbafbec392744cc00d40888ce0fefeb183dab49b52958791b",
}

class AuthorityCalculationResult(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityCalculationResult"]]
    calculation_id: Required[str]
    calculation_request_ref: Required[str]
    manifest_id: Required[str]
    calculation_type: Required[Literal["in-year", "intent-to-finalise", "intent-to-amend", "final-declaration"]]
    result_state: Required[Literal["MODELED", "RETRIEVED", "SUPERSEDED"]]
    validation_outcome: Required[Literal["PASS", "PASS_WITH_NOTICE", "MANUAL_REVIEW", "OVERRIDABLE_BLOCK", "HARD_BLOCK"]]
    reason_codes: Required[list[str]]
    live_authority_call_executed: Required[bool]
    calculation_hash: Required[str | None]
    retrieved_payload_ref: Required[str | None]
    authority_response_ref: Required[str | None]
    retrieved_at: Required[ISO8601DateTimeString]
    superseded_at: Required[ISO8601DateTimeString]

AuthorityCalculationResultSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_calculation_result.schema.json",
    "source_hash": "4a6579811ba343cb6f81a17986aba91960e65ed0c626062a31426a7d1e3b0d73",
}

class AuthorityIngressCorrelationContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1"]]
    bound_artifact_type: Required[Literal["AuthorityIngressReceipt"]]
    correlation_status: Required[Literal["BOUND", "BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS", "UNBOUND"]]
    lineage_binding_basis: Required[Literal["REQUEST_HASH_EXACT", "IDEMPOTENCY_TUPLE_EXACT", "REQUEST_HASH_AND_TUPLE_EXACT", "AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS_MULTI_MATCH", "UNBOUND_NO_MATCH"]]
    comparison_set_state: Required[Literal["ONE_EXACT_MATCH", "WEAK_MATCH_ONLY", "MULTI_MATCH", "NO_MATCH", "MISSING_PROVIDER_KEYS"]]
    resolution_state: Required[Literal["EXACT_BOUND", "WEAK_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS_MULTI_MATCH", "UNBOUND_NO_MATCH", "UNBOUND_MISSING_IDENTITY_CLAIMS"]]
    extracted_authority_reference_or_null: Required[str | None]
    extracted_request_hash_or_null: Required[str | None]
    extracted_idempotency_key_or_null: Required[str | None]
    extracted_identity_namespace_hash_or_null: Required[str | None]
    extracted_duplicate_meaning_key_or_null: Required[str | None]
    candidate_lineages: Required[list[AuthorityIngressCorrelationContractCandidateLineage]]
    correlation_reason_codes: Required[list[str]]
    request_lineage_comparison_policy: Required[Literal["PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY"]]
    legal_mutation_policy: Required[Literal["NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION"]]

class AuthorityIngressCorrelationContractCandidateLineage(TypedDict, total=False):
    candidate_rank: Required[int]
    interaction_ref: Required[str]
    authority_reference_or_null: Required[str | None]
    request_hash_or_null: Required[str | None]
    idempotency_key_or_null: Required[str | None]
    identity_namespace_hash_or_null: Required[str | None]
    duplicate_meaning_key_or_null: Required[str | None]
    latest_submission_record_ref_or_null: Required[str | None]
    latest_obligation_mirror_ref_or_null: Required[str | None]
    match_basis_codes: Required[list[Literal["AUTHORITY_REFERENCE_MATCH", "DUPLICATE_MEANING_KEY_MATCH", "IDEMPOTENCY_KEY_MATCH", "IDENTITY_NAMESPACE_HASH_MATCH", "REQUEST_HASH_MATCH"]]]
    divergence_reason_codes: Required[list[str]]

AuthorityIngressCorrelationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_ingress_correlation_contract.schema.json",
    "source_hash": "8622939e089e1d3e56cf0fe145ec76aabdffabca8ffd897ac3a3ad9c54c114cb",
}

class AuthorityIngressInvestigationSnapshot(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityIngressInvestigationSnapshot"]]
    investigation_id: Required[str]
    ingress_receipt_ref: Required[str]
    provider_environment: Required[str]
    provider_profile_ref: Required[str]
    ingress_channel_class: Required[Literal["CALLBACK", "POLL_RESULT", "INBOX_DELIVERY", "WORKER_OBSERVED", "GATEWAY_RECOVERED"]]
    receipt_state: Required[Literal["QUARANTINED", "DUPLICATE_SUPPRESSED"]]
    correlation_status: Required[Literal["BOUND", "BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS", "UNBOUND"]]
    authenticated_channel_state: Required[Literal["AUTHENTICATED", "FAILED"]]
    response_body_ref: Required[str | None]
    response_body_hash: Required[str]
    delivery_dedupe_key: Required[str]
    authority_reference_or_null: Required[str | None]
    bound_interaction_ref_or_null: Required[str | None]
    normalized_response_ref_or_null: Required[str | None]
    authority_ingress_proof_contract: Required[AuthorityIngressProofContract]
    authority_ingress_correlation_contract: Required[AuthorityIngressCorrelationContract]
    delivery_lineage: Required[AuthorityIngressInvestigationSnapshotDeliveryLineage]
    quarantine_explainability: Required[AuthorityIngressInvestigationSnapshotQuarantineExplainability]
    safe_next_action_codes: Required[list[Literal["COMPARE_CANDIDATE_LINEAGES", "ESCALATE_PROVIDER_PAYLOAD", "OPEN_RECONCILIATION_WORKFLOW", "REVIEW_AUTHENTICATION_EVIDENCE", "REVIEW_CANONICAL_RECEIPT", "WAIT_FOR_SEPARATE_BINDING_DECISION"]]]
    investigation_source_policy: Required[Literal["PERSISTED_RECEIPT_PAYLOAD_AUDIT_AND_LINEAGE_ONLY"]]
    legal_mutation_policy: Required[Literal["NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION"]]
    updated_at: Required[ISO8601DateTimeString]

class AuthorityIngressInvestigationSnapshotDeliveryLineage(TypedDict, total=False):
    delivery_novelty_state: Required[Literal["CANONICAL_FIRST_SEEN", "DUPLICATE_SUPPRESSED"]]
    canonical_ingress_receipt_ref_or_self: Required[str]
    related_duplicate_receipt_refs: Required[list[str]]

class AuthorityIngressInvestigationSnapshotQuarantineExplainability(TypedDict, total=False):
    reason_codes: Required[list[str]]
    comparison_candidate_refs: Required[list[str]]
    supporting_audit_event_refs: Required[list[str]]
    current_owner_ref_or_null: Required[str | None]
    resolution_state: Required[Literal["ESCALATED", "OPEN_DUPLICATE_REVIEW", "OPEN_QUARANTINE", "READY_FOR_CANONICAL_DUPLICATE_CLOSE", "READY_FOR_SEPARATE_RECONCILIATION"]]
    blocked_mutation_reason_codes: Required[list[str]]

AuthorityIngressInvestigationSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_ingress_investigation_snapshot.schema.json",
    "source_hash": "2c30cad1b59e20e100b52cd010fa9c35020bef7c2182eace9e6b72e381d1f9e4",
}

class AuthorityIngressProofContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_INGRESS_PROOF_CONTRACT_V1"]]
    binding_scope_class: Required[Literal["AUTHORITY_INGRESS_RECEIPT", "AUTHORITY_RESPONSE_ENVELOPE", "AUTHORITY_INTERACTION_RECORD", "SUBMISSION_RECORD", "OBLIGATION_MIRROR"]]
    ingress_channel_class_or_null: Required[Literal["CALLBACK", "POLL_RESULT", "INBOX_DELIVERY", "WORKER_OBSERVED", "GATEWAY_RECOVERED", None]]
    authenticated_channel_state: Required[Literal["NOT_APPLICABLE", "AUTHENTICATED", "FAILED"]]
    authentication_evidence_modes: Required[list[Literal["CALLBACK_SIGNATURE_VERIFIED", "CALLBACK_MTLS_VERIFIED", "SOURCE_ALLOWLIST_VERIFIED", "POLL_CREDENTIAL_VERIFIED", "INBOX_DELIVERY_CREDENTIAL_VERIFIED", "WORKER_ATTESTATION_VERIFIED", "GATEWAY_RECOVERY_CREDENTIAL_VERIFIED"]]]
    authentication_evidence_refs: Required[list[str]]
    delivery_identity_basis: Required[Literal["PROVIDER_DELIVERY_REF_RESPONSE_BODY_HASH_INGRESS_CHANNEL_METADATA_HASH"]]
    provider_delivery_ref_or_null: Required[str | None]
    response_body_hash_or_null: Required[str | None]
    ingress_channel_metadata_hash_or_null: Required[str | None]
    delivery_dedupe_key_or_null: Required[str | None]
    correlation_status_or_null: Required[Literal["BOUND", "BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS", "UNBOUND", None]]
    lineage_binding_basis: Required[Literal["NOT_APPLICABLE", "REQUEST_HASH_EXACT", "IDEMPOTENCY_TUPLE_EXACT", "REQUEST_HASH_AND_TUPLE_EXACT", "AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS_MULTI_MATCH", "UNBOUND_NO_MATCH"]]
    canonical_ingress_receipt_ref_or_null: Required[str | None]
    bound_interaction_ref_or_null: Required[str | None]
    authority_reference_or_null: Required[str | None]
    request_hash_or_null: Required[str | None]
    idempotency_key_or_null: Required[str | None]
    identity_namespace_hash_or_null: Required[str | None]
    duplicate_meaning_key_or_null: Required[str | None]
    request_lineage_proof_hash_or_null: Required[str | None]
    normalized_response_ref_or_null: Required[str | None]
    mutation_gate_state: Required[Literal["NOT_APPLICABLE", "CHECKPOINT_ONLY", "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT", "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT", "QUARANTINE_ONLY", "DUPLICATE_SUPPRESSED_NO_MUTATION"]]
    heuristic_correlation_policy: Required[Literal["DETERMINISTIC_ONLY_NO_RECENT_REQUEST_HEURISTICS"]]
    transport_memory_mutation_policy: Required[Literal["FORBIDDEN_UNTIL_PERSISTED_PROOF"]]

AuthorityIngressProofContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json",
    "source_hash": "dda61f1e59d20ef5ca63737f2130a041ec946e46ea545b7bf833959e63fa4194",
}

class AuthorityIngressReceipt(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityIngressReceipt"]]
    ingress_receipt_id: Required[str]
    provider_environment: Required[str]
    provider_profile_ref: Required[str]
    ingress_channel_class: Required[Literal["CALLBACK", "POLL_RESULT", "INBOX_DELIVERY", "WORKER_OBSERVED", "GATEWAY_RECOVERED"]]
    provider_delivery_ref: Required[str]
    response_body_ref: Required[str | None]
    response_body_hash: Required[str]
    ingress_channel_metadata_hash: Required[str]
    delivery_dedupe_key: Required[str]
    authority_reference: Required[str | None]
    request_hash: Required[str | None]
    idempotency_key: Required[str | None]
    identity_namespace_hash: Required[str | None]
    duplicate_meaning_key: Required[str | None]
    bound_interaction_ref: Required[str | None]
    authority_truth_contract: Required[AuthorityTruthContract]
    correlation_status: Required[Literal["BOUND", "BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS", "UNBOUND"]]
    authenticated_channel_state: Required[Literal["AUTHENTICATED", "FAILED"]]
    authority_ingress_proof_contract: Required[AuthorityIngressProofContract]
    authority_ingress_correlation_contract: Required[AuthorityIngressCorrelationContract]
    receipt_state: Required[Literal["PERSISTED", "NORMALIZED", "QUARANTINED", "DUPLICATE_SUPPRESSED"]]
    received_at: Required[ISO8601DateTimeString]
    persisted_at: Required[ISO8601DateTimeString]
    quarantined_at: Required[ISO8601DateTimeString]
    quarantine_reason_codes: Required[list[str]]
    canonical_ingress_receipt_ref: Required[str | None]
    reconciliation_owner_ref: Required[str | None]
    normalized_response_ref: Required[str | None]
    audit_event_refs: Required[list[str]]

AuthorityIngressReceiptSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_ingress_receipt.schema.json",
    "source_hash": "e4815200450d19e9488f76eeab7f2ec31b77d0c9bcf23cd54664895b62d9f797",
}

class AuthorityInteractionRecord(TypedDict, total=False):
    interaction_id: Required[str]
    manifest_id: Required[str]
    operation_id: Required[str]
    request_id: Required[str]
    authority_operation_profile_ref: Required[str]
    request_identity_contract: Required[AuthorityRequestIdentityContract]
    binding_drift_sentinel_contract: Required[AuthorityBindingDriftSentinelContract]
    request_hash: Required[str]
    idempotency_key: Required[str]
    identity_namespace_hash: Required[str]
    duplicate_meaning_key: Required[str]
    authority_ingress_proof_contract: Required[AuthorityIngressProofContract | None]
    authority_binding_ref: Required[str]
    authority_link_ref: Required[str]
    binding_lineage_ref: Required[str]
    access_binding_hash: Required[str]
    policy_snapshot_hash: Required[str]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    authority_truth_contract: Required[AuthorityTruthContract]
    lifecycle_state: Required[Literal["REQUEST_REGISTERED", "DISPATCH_READY", "TRANSMIT_IN_FLIGHT", "RESPONSE_CAPTURED", "RECONCILING", "RESOLVED", "ABANDONED"]]
    created_at: Required[ISO8601DateTimeString]
    last_status_at: Required[ISO8601DateTimeString]
    active_response_id: Required[str | None]
    response_history_ids: Required[list[str]]
    meaning_resolution_state: Required[Literal["NO_RESPONSE", "PROVISIONAL_TIMEOUT", "ACTIVE_DIRECT", "ACTIVE_CORROBORATED", "RECONCILIATION_REQUIRED", "RECONCILIATION_RESOLVED"]]
    submission_record_ref: Required[str | None]
    dispatch_ref: Required[str]
    send_revalidation_state: Required[Literal["NOT_PERFORMED", "CLEAR_TO_SEND", "BLOCKED"]]
    send_revalidated_at: Required[ISO8601DateTimeString]
    send_authorized_token_version_ref: Required[str | None]
    send_revalidation_reason_codes: Required[list[Literal["SEALED_TOKEN_VERSION_REUSED", "TOKEN_ROTATED_WITHIN_LINEAGE", "SEND_CLAIM_CONFLICT", "TOKEN_VERSION_NOT_USABLE", "BINDING_LINEAGE_DRIFT", "AUTHORITY_LINK_NOT_ACTIVE", "CLIENT_SUBJECT_SCOPE_DRIFT", "PROVIDER_CONTRACT_DRIFT", "ACCESS_BINDING_HASH_DRIFT", "POLICY_SNAPSHOT_HASH_DRIFT", "STEP_UP_OR_APPROVAL_DRIFT", "DUPLICATE_BUCKET_CHANGED", "STRONGER_EXTERNAL_TRUTH_PRESENT", "BODY_COLLISION_PRESENT"]]]
    reconciliation_method: Required[Literal["NONE", "READ_AFTER_WRITE", "POLL_STATUS", "POLL_OBLIGATIONS", "MANUAL_ONLY"]]
    max_auto_reconciliation_attempts: Required[int]
    reconciliation_cadence_seconds: Required[int | None]
    reconciliation_budget_state: Required[Literal["NOT_OPENED", "ACTIVE", "EXHAUSTED", "ESCALATED", "CLOSED"]]
    next_reconciliation_at: Required[ISO8601DateTimeString]
    reconciliation_attempt_count: Required[int]
    reconciliation_deadline_at: Required[ISO8601DateTimeString]
    reconciliation_escalated_at: Required[ISO8601DateTimeString]
    reconciliation_workflow_item_ref: Required[str | None]
    resend_legality_state: Required[Literal["UNASSESSED", "IDEMPOTENT_RECOVERY_ONLY", "FOLLOW_UP_READ_ONLY", "BLOCKED_BY_RECONCILIATION", "BLOCKED_BY_ESCALATION", "CLOSED_NO_RESEND"]]
    resend_control_reason_codes: Required[list[Literal["IN_FLIGHT_REQUEST_LINEAGE_EXISTS", "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY", "PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION", "TIMEOUT_PLACEHOLDER_REQUIRES_RECONCILIATION", "AUTO_RECONCILIATION_BUDGET_EXHAUSTED", "RECONCILIATION_DEADLINE_EXPIRED", "CONTRADICTORY_AUTHORITY_EVIDENCE", "OUT_OF_BAND_AUTHORITY_STATE_PRESENT", "DUPLICATE_BUCKET_OCCUPIED", "STRONGER_EXTERNAL_TRUTH_PRESENT", "TERMINAL_AUTHORITY_STATE_RECORDED", "INTERACTION_FINALIZED_NO_RESEND"]]]
    reconciliation_control_contract: Required[AuthorityReconciliationControlContract]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]
    resolution_basis: Required[Literal["TERMINAL_RESPONSE", "RECONCILIATION_RESULT", None]]
    abandonment_reason_code: Required[str | None]

AuthorityInteractionRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_interaction_record.schema.json",
    "source_hash": "bf1f6d39bb02f320e92165a709e657f4148c0a191ce40b7e17d2f83bb357085d",
}

class AuthorityLayerBoundaryContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_LAYER_BOUNDARY_V1"]]
    binding_scope_class: Required[Literal["AUTHORIZATION_DECISION", "GOVERNANCE_ACCESS_SIMULATION", "AUTHORITY_BINDING", "AUTHORITY_OPERATION", "AUTHORITY_REQUEST_ENVELOPE"]]
    integration_capability: Required[Literal["INTERNAL_ONLY", "AUTHORITY_INTEGRATED"]]
    active_principal_class: Required[Literal["HUMAN", "SERVICE", "EXTERNAL"]]
    tenant_permission_state: Required[Literal["SATISFIED", "MASKED", "DENIED"]]
    client_delegation_state: Required[Literal["NOT_REQUIRED", "SATISFIED", "LIMITED", "MISSING", "EXPIRED"]]
    delegation_basis: Required[Literal["SELF_ACTING", "CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE", "TENANT_INTERNAL", "SYSTEM_ASSIGNED"]]
    delegation_freshness_state: Required[Literal["NOT_APPLICABLE", "CURRENT", "REVALIDATION_REQUIRED"]]
    authority_link_state: Required[Literal["NOT_REQUIRED", "UNLINKED", "LINK_INITIATED", "AUTHORISED_ACTIVE", "AUTHORISED_LIMITED", "TOKEN_INVALID", "REVOKED", "EXPIRED", "SUPERSEDED"]]
    exceptional_authority_state: Required[Literal["NOT_APPLICABLE", "BOUNDED_INTERNAL_EXCEPTION"]]
    human_gate_requirement: Required[Literal["NOT_REQUIRED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "REQUIRE_STEP_UP_AND_APPROVAL"]]
    human_gate_resolution_state: Required[Literal["NOT_REQUIRED", "PENDING_EVIDENCE", "EVIDENCE_FROZEN"]]
    authority_truth_precedence_policy: Required[Literal["EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION"]]
    tenant_permission_substitution_policy: Required[Literal["INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION"]]
    link_delegation_independence_policy: Required[Literal["AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION"]]
    exceptional_scope_policy: Required[Literal["EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS"]]
    service_human_gate_satisfaction_permitted: Required[Literal[False]]
    exceptional_authority_may_substitute_for_delegation: Required[Literal[False]]
    exceptional_authority_may_override_authority_truth: Required[Literal[False]]
    exceptional_authority_may_widen_client_scope: Required[Literal[False]]
    exceptional_authority_may_widen_partition_scope: Required[Literal[False]]

AuthorityLayerBoundaryContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json",
    "source_hash": "5d8379487b939b840bb99ae8ffa83124517b2f7d9106ef9c6289342aa0333952",
}

class AuthorityLink(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityLink"]]
    authority_link_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    reporting_subject_ref: Required[str]
    authority_name: Required[str]
    authority_scope: Required[str]
    provider_environment: Required[str]
    provider_api_version: Required[str]
    authorised_party_ref: Required[str]
    delegation_grant_ref: Required[str | None]
    partition_scope_refs: Required[list[str]]
    token_binding_profile_ref: Required[str | None]
    validated_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    revoked_at: Required[ISO8601DateTimeString]
    superseded_by_link_id: Required[str | None]
    lifecycle_state: Required[Literal["UNLINKED", "LINK_INITIATED", "AUTHORISED_ACTIVE", "AUTHORISED_LIMITED", "TOKEN_INVALID", "REVOKED", "EXPIRED", "SUPERSEDED"]]
    binding_health: Required[Literal["HEALTHY", "LIMITED_SCOPE", "EXPIRING_SOON", "TOKEN_INVALID", "CLIENT_BINDING_MISMATCH", "DELEGATION_GAP", "ENVIRONMENT_DRIFT", "REVOKED", "EXPIRED", "UNLINKED", "UNKNOWN"]]
    delegation_state: Required[Literal["NOT_REQUIRED", "SATISFIED", "LIMITED", "MISSING", "EXPIRED", "UNKNOWN"]]
    token_client_binding_state: Required[Literal["BOUND", "MISMATCH", "UNVERIFIED"]]
    source_evidence_refs: Required[list[str]]
    blocked_reason_codes: Required[list[str]]
    last_binding_check_at: Required[ISO8601DateTimeString]

AuthorityLinkSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_link.schema.json",
    "source_hash": "c4d35be54a4a6ceb5d2887d97890b07daef144c69fc96f5b04a7e6368a226af3",
}

type AuthorityLinkInventoryItemSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type AuthorityLinkInventoryItemRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type AuthorityLinkInventoryItemLifecycleState = Literal["UNLINKED", "LINK_INITIATED", "AUTHORISED_ACTIVE", "AUTHORISED_LIMITED", "TOKEN_INVALID", "REVOKED", "EXPIRED"]

type AuthorityLinkInventoryItemBindingHealth = Literal["HEALTHY", "LIMITED_SCOPE", "EXPIRING_SOON", "TOKEN_INVALID", "CLIENT_BINDING_MISMATCH", "DELEGATION_GAP", "ENVIRONMENT_DRIFT", "REVOKED", "EXPIRED", "UNLINKED", "UNKNOWN"]

type AuthorityLinkInventoryItemDelegationState = Literal["SATISFIED", "LIMITED", "MISSING", "EXPIRED", "UNKNOWN"]

type AuthorityLinkInventoryItemTokenClientBindingState = Literal["BOUND", "MISMATCH", "UNVERIFIED"]

type AuthorityLinkInventoryItemGuidedFlowMode = Literal["DETAILS", "LINK", "RELINK", "UNLINK_REVIEW"]

type AuthorityLinkInventoryItemExpiryRiskBand = Literal["NONE", "EXPIRING_30_DAYS", "EXPIRING_14_DAYS", "EXPIRING_7_DAYS", "EXPIRED"]

type AuthorityLinkInventoryItemHandshakeFlowState = Literal["NOT_STARTED", "IN_PROGRESS", "HANDOFF_PENDING", "VALIDATION_PENDING", "LINKED", "BLOCKED"]

type AuthorityLinkInventoryItemHandshakeStepCode = Literal["SELECT_AUTHORITY", "CONFIRM_CLIENT_SCOPE", "RUN_PREFLIGHT_CHECKS", "AUTHORISE_EXTERNAL_HANDOFF", "VALIDATE_BINDING"]

type AuthorityLinkInventoryItemHandshakeAttemptState = Literal["NONE_RECORDED", "COMPLETED", "FAILED", "ABANDONED", "EXPIRED", "PENDING_RETURN"]

type AuthorityLinkInventoryItemPreflightCheckCode = Literal["AUTHORITY_SCOPE", "CLIENT_BINDING", "DELEGATION_COVERAGE", "PROVIDER_ENVIRONMENT", "TOKEN_FRESHNESS"]

type AuthorityLinkInventoryItemPreflightCheckState = Literal["PASS", "WARNING", "BLOCKED", "NOT_RUN"]

class AuthorityLinkInventoryItem(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityLinkInventoryItem"]]
    tenant_id: Required[str]
    shell_family: Required[Literal["GOVERNANCE_DENSITY_SHELL"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    settlement_state: Required[AuthorityLinkInventoryItemSettlementState]
    recovery_posture: Required[AuthorityLinkInventoryItemRecoveryPosture]
    interaction_layer: Required[GovernanceInteractionLayer]
    authority_link_id: Required[str]
    client_id: Required[str]
    authority_scope: Required[str]
    provider_environment: Required[str]
    lifecycle_state: Required[AuthorityLinkInventoryItemLifecycleState]
    binding_health: Required[AuthorityLinkInventoryItemBindingHealth]
    delegation_state: Required[AuthorityLinkInventoryItemDelegationState]
    token_client_binding_state: Required[AuthorityLinkInventoryItemTokenClientBindingState]
    last_validated_at: Required[ISO8601DateTimeString]
    expires_at: NotRequired[ISO8601DateTimeString]
    blocked_reason_codes: NotRequired[list[str]]
    focus_anchor_ref: Required[str]
    externalization_governance_contract: Required[ExternalizationGovernanceContract]
    authority_link_workspace: Required[AuthorityLinkInventoryItemAuthorityLinkWorkspace]
    guided_handshake_stepper: Required[AuthorityLinkInventoryItemGuidedHandshakeStepper]
    binding_health_timeline: Required[AuthorityLinkInventoryItemBindingHealthTimeline]
    handshake_history: Required[AuthorityLinkInventoryItemHandshakeHistory]
    affected_operation_list: Required[AuthorityLinkInventoryItemAffectedOperationList]
    preflight_checklist: Required[AuthorityLinkInventoryItemPreflightChecklist]
    affected_operation_counts: Required[AuthorityLinkInventoryItemAffectedOperationCounts]

class AuthorityLinkInventoryItemInteractionLayer(TypedDict, total=False):
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]

class AuthorityLinkInventoryItemAuthorityLinkWorkspace(TypedDict, total=False):
    surface_order: Required[Literal[["INVENTORY_RAIL","WORKSPACE_CANVAS","AUDIT_SIDECAR"]]]
    active_filters: Required[AuthorityLinkInventoryItemAuthorityLinkWorkspaceFilters]
    selected_authority_link_ref: Required[str]
    detail_module_order: Required[Literal[["AuthorityLinkIdentityCard","BindingHealthTimeline","HandshakeHistory","AffectedOperationList","PreflightChecklist"]]]
    guided_flow_mode: Required[AuthorityLinkInventoryItemGuidedFlowMode]
    promoted_support_surface: Required[Literal["AUDIT_SIDECAR"]]
    prominent_issue_ref_or_null: Required[str | None]

class AuthorityLinkInventoryItemAuthorityLinkWorkspaceFilters(TypedDict, total=False):
    authority_scopes: Required[list[str]]
    client_refs: Required[list[str]]
    provider_environments: Required[list[str]]
    lifecycle_states: Required[list[AuthorityLinkInventoryItemLifecycleState]]
    binding_health_states: Required[list[AuthorityLinkInventoryItemBindingHealth]]
    expiry_risk_bands: Required[list[AuthorityLinkInventoryItemExpiryRiskBand]]

class AuthorityLinkInventoryItemGuidedHandshakeStepper(TypedDict, total=False):
    flow_state: Required[AuthorityLinkInventoryItemHandshakeFlowState]
    step_order: Required[Literal[["SELECT_AUTHORITY","CONFIRM_CLIENT_SCOPE","RUN_PREFLIGHT_CHECKS","AUTHORISE_EXTERNAL_HANDOFF","VALIDATE_BINDING"]]]
    current_step_code: Required[AuthorityLinkInventoryItemHandshakeStepCode]
    completed_step_codes: Required[list[AuthorityLinkInventoryItemHandshakeStepCode]]
    credential_capture_mode: Required[Literal["GUIDED_HANDSHAKE_ONLY"]]
    external_handoff_ref_or_null: Required[str | None]
    preflight_blocking_check_refs: Required[list[str]]

class AuthorityLinkInventoryItemBindingHealthTimeline(TypedDict, total=False):
    current_binding_health: Required[AuthorityLinkInventoryItemBindingHealth]
    current_delegation_state: Required[AuthorityLinkInventoryItemDelegationState]
    current_token_client_binding_state: Required[AuthorityLinkInventoryItemTokenClientBindingState]
    promoted_issue_ref_or_null: Required[str | None]
    event_refs: Required[list[str]]
    next_validation_due_at_or_null: Required[ISO8601DateTimeString]

class AuthorityLinkInventoryItemHandshakeHistory(TypedDict, total=False):
    attempt_refs: Required[list[str]]
    selected_attempt_ref_or_null: Required[str | None]
    latest_attempt_state: Required[AuthorityLinkInventoryItemHandshakeAttemptState]
    latest_failure_ref_or_null: Required[str | None]

class AuthorityLinkInventoryItemAffectedOperationList(TypedDict, total=False):
    section_order: Required[Literal[["PREFLIGHT","SUBMISSION","RECONCILIATION","AMENDMENT"]]]
    preflight_refs: Required[list[str]]
    submission_refs: Required[list[str]]
    reconciliation_refs: Required[list[str]]
    amendment_refs: Required[list[str]]
    primary_blocked_operation_ref_or_null: Required[str | None]

class AuthorityLinkInventoryItemPreflightChecklist(TypedDict, total=False):
    check_order: Required[Literal[["AUTHORITY_SCOPE","CLIENT_BINDING","DELEGATION_COVERAGE","PROVIDER_ENVIRONMENT","TOKEN_FRESHNESS"]]]
    checks: Required[list[AuthorityLinkInventoryItemPreflightCheck]]
    blocking_check_refs: Required[list[str]]
    last_run_at_or_null: Required[ISO8601DateTimeString]

class AuthorityLinkInventoryItemPreflightCheck(TypedDict, total=False):
    check_ref: Required[str]
    check_code: Required[AuthorityLinkInventoryItemPreflightCheckCode]
    check_state: Required[AuthorityLinkInventoryItemPreflightCheckState]
    reason_refs: Required[list[str]]

class AuthorityLinkInventoryItemAffectedOperationCounts(TypedDict, total=False):
    preflight_count: Required[int]
    submission_count: Required[int]
    reconciliation_count: Required[int]
    amendment_count: Required[int]

AuthorityLinkInventoryItemSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_link_inventory_item.schema.json",
    "source_hash": "dafa503e1d5b0152f01acad4406a7855c71cf5e1d2116cb6de6fbdeb09fea8e8",
}

type AuthorityOperationScopeArray = JSONValue

class AuthorityOperation(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityOperation"]]
    operation_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str]
    manifest_hash: Required[str]
    execution_basis_hash: Required[str]
    attempt_lineage_manifest_id: Required[str]
    operation_family: Required[Literal["AUTH_READ_REFERENCE", "AUTH_READ_OBLIGATIONS", "AUTH_READ_CALCULATION", "AUTH_CREATE_OR_AMEND_DATA", "AUTH_DELETE_DATA", "AUTH_TRIGGER_CALCULATION", "AUTH_SUBMIT_FINAL_DECLARATION", "AUTH_SUBMIT_PERIODIC_UPDATE", "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT", "AUTH_RECONCILE_STATUS"]]
    authority_name: Required[str]
    authority_product_profile: Required[str]
    operation_profile_ref: Required[str]
    provider_environment: Required[str]
    provider_api_version: Required[str]
    authority_scope: Required[str]
    requested_scope: Required[AuthorityOperationScopeArray]
    runtime_scope: Required[AuthorityOperationScopeArray]
    scope_execution_binding: Required[ScopeExecutionBinding]
    access_binding_hash: Required[str]
    policy_snapshot_hash: Required[str]
    authority_binding_ref: Required[str]
    authority_link_ref: Required[str]
    delegation_grant_ref: Required[str | None]
    binding_lineage_ref: Required[str]
    token_binding_ref: Required[str]
    subject_ref: Required[str]
    acting_party_ref: Required[str]
    business_partitions: Required[list[str]]
    period: Required[str]
    target_obligation_ref: Required[str | None]
    basis_type: Required[str | None]
    authority_layer_boundary: Required[AuthorityLayerBoundaryContract]
    contract: Required[SchemaBundle]

AuthorityOperationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_operation.schema.json",
    "source_hash": "a9c6f872ed9d6613cc2e75106a8df872de571c352e31b5c9aad593ee387daabd",
}

class AuthorityOperationProfile(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityOperationProfile"]]
    profile_id: Required[str]
    operation_family: Required[Literal["AUTH_READ_REFERENCE", "AUTH_READ_OBLIGATIONS", "AUTH_READ_CALCULATION", "AUTH_CREATE_OR_AMEND_DATA", "AUTH_DELETE_DATA", "AUTH_TRIGGER_CALCULATION", "AUTH_SUBMIT_FINAL_DECLARATION", "AUTH_SUBMIT_PERIODIC_UPDATE", "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT", "AUTH_RECONCILE_STATUS"]]
    authority_name: Required[str]
    authority_product_profile: Required[str]
    provider_environment: Required[str]
    provider_api_version: Required[str]
    transport_rules: Required[AuthorityOperationProfileTransportRules]
    required_scopes: Required[AuthorityOperation]
    fraud_header_profile_ref: Required[str | None]
    fraud_header_exemption_reason: Required[str | None]
    idempotency_strategy: Required[Literal["NOT_REQUIRED", "REQUEST_HASH", "IDEMPOTENCY_KEY", "REQUEST_HASH_AND_IDEMPOTENCY_KEY"]]
    success_response_rules: Required[AuthorityOperationProfileSuccessResponseRules]
    pending_unknown_rules: Required[AuthorityOperationProfilePendingUnknownRules]
    reconciliation_rules: Required[AuthorityOperationProfileReconciliationRules]
    legal_state_rules: Required[AuthorityOperationProfileLegalStateRules]

class AuthorityOperationProfileTransportRules(TypedDict, total=False):
    http_method: Required[Literal["GET", "POST", "PUT", "PATCH", "DELETE"]]
    path_template: Required[str]
    canonical_query_mode: Required[Literal["SORTED_KEYS", "DECLARED_ORDER"]]
    payload_required: Required[bool]
    response_body_expected: Required[bool]
    timeout_profile_ref: Required[str]
    transmit_policy_ref: Required[str]

class AuthorityOperationProfileSuccessResponseRules(TypedDict, total=False):
    success_status_codes: Required[list[int]]
    response_class: Required[Literal["SUCCESS_BODY_REQUIRED", "SUCCESS_BODY_OPTIONAL", "SUCCESS_NO_BODY_ALLOWED"]]
    extraction_rule_refs: Required[list[str]]
    confirmed_state_on_success: Required[Literal["NO_LEGAL_STATE_CHANGE", "PENDING_ACK", "CONFIRMED"]]

class AuthorityOperationProfilePendingUnknownRules(TypedDict, total=False):
    timeout_maps_to: Required[Literal["PENDING_ACK", "UNKNOWN"]]
    no_body_maps_to: Required[Literal["PENDING_ACK", "UNKNOWN", "CONFIRMED"]]
    retry_class: Required[Literal["NO_RETRY", "SAFE_RETRY", "RECONCILE_THEN_RETRY", "HUMAN_REVIEW_THEN_RETRY", "REBUILD_THEN_RETRY", "MANUAL_INTERVENTION_REQUIRED"]]
    escalation_required: Required[bool]

class AuthorityOperationProfileReconciliationRules(TypedDict, total=False):
    method: Required[Literal["NONE", "READ_AFTER_WRITE", "POLL_STATUS", "POLL_OBLIGATIONS", "MANUAL_ONLY"]]
    max_auto_reconciliation_attempts: Required[int]
    cadence_seconds: Required[int | None]
    deadline_derivation_rule: Required[str | None]
    escalation_policy_ref: Required[str | None]
    authoritative_result_source: Required[Literal["DIRECT_RESPONSE", "FOLLOW_UP_READ", "OBLIGATION_MIRROR", "MANUAL_REVIEW"]]

class AuthorityOperationProfileLegalStateRules(TypedDict, total=False):
    authoritative_state_source: Required[Literal["DIRECT_ACK", "OBLIGATION_MIRROR", "CALCULATION_READ", "RECONCILIATION_RESULT"]]
    timeout_default_state: Required[Literal["PENDING_ACK", "UNKNOWN"]]
    accepted_pending_state: Required[Literal["PENDING_ACK", "UNKNOWN"]]
    out_of_band_state_allowed: Required[bool]
    amendment_requires_confirmed_finalisation: Required[bool]

AuthorityOperationProfileSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_operation_profile.schema.json",
    "source_hash": "39364a825e050a50d41e7ccc1ea580fe449621d21ef3bbbfcdd8eb0f2a92e303",
}

class AuthorityReconciliationAnalyticsSnapshot(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityReconciliationAnalyticsSnapshot"]]
    snapshot_id: Required[str]
    authority_operation_profile_ref: Required[str]
    provider_environment: Required[str]
    operation_family: Required[str]
    window_started_at: Required[ISO8601DateTimeString]
    window_ended_at: Required[ISO8601DateTimeString]
    interaction_refs: Required[list[str]]
    total_interaction_count: Required[int]
    budget_state_counts: Required[list[AuthorityReconciliationAnalyticsSnapshotBudgetCountEntry]]
    outcome_class_counts: Required[list[AuthorityReconciliationAnalyticsSnapshotOutcomeCountEntry]]
    resend_refusal_reason_counts: Required[list[AuthorityReconciliationAnalyticsSnapshotResendReasonCountEntry]]
    escalation_reason_counts: Required[list[AuthorityReconciliationAnalyticsSnapshotStringCountEntry]]
    unresolved_ambiguity_count: Required[int]
    deadline_expiry_count: Required[int]
    escalated_count: Required[int]
    blind_resend_blocked_count: Required[int]
    replay_resume_count: Required[int]
    average_attempts_consumed: Required[float]
    max_attempts_consumed: Required[int]
    escalation_latency_seconds_p95_or_null: Required[float | None]
    tuning_recommendation_codes: Required[list[Literal["NO_CHANGE_RECOMMENDED", "INCREASE_DEADLINE_WINDOW", "DECREASE_DEADLINE_WINDOW", "INCREASE_AUTO_ATTEMPT_BUDGET", "DECREASE_AUTO_ATTEMPT_BUDGET", "INCREASE_CADENCE_INTERVAL", "DECREASE_CADENCE_INTERVAL", "REVIEW_PROVIDER_AMBIGUITY", "REQUIRE_MANUAL_ESCALATION_EARLIER"]]]
    source_policy: Required[Literal["DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY"]]
    generated_at: Required[ISO8601DateTimeString]

class AuthorityReconciliationAnalyticsSnapshotBudgetCountEntry(TypedDict, total=False):
    code: Required[Literal["NOT_OPENED", "ACTIVE", "EXHAUSTED", "ESCALATED", "CLOSED"]]
    count: Required[int]

class AuthorityReconciliationAnalyticsSnapshotOutcomeCountEntry(TypedDict, total=False):
    code: Required[Literal["NO_RESPONSE_YET", "PENDING_ACK", "UNKNOWN", "AMBIGUOUS", "OUT_OF_BAND", "CONFIRMED", "REJECTED", "ESCALATED"]]
    count: Required[int]

class AuthorityReconciliationAnalyticsSnapshotResendReasonCountEntry(TypedDict, total=False):
    code: Required[Literal["AUTO_RECONCILIATION_BUDGET_EXHAUSTED", "RECONCILIATION_DEADLINE_EXPIRED", "CONTRADICTORY_AUTHORITY_EVIDENCE", "OUT_OF_BAND_AUTHORITY_STATE_PRESENT", "DUPLICATE_BUCKET_OCCUPIED", "STRONGER_EXTERNAL_TRUTH_PRESENT", "TERMINAL_AUTHORITY_STATE_RECORDED", "INTERACTION_FINALIZED_NO_RESEND"]]
    count: Required[int]

class AuthorityReconciliationAnalyticsSnapshotStringCountEntry(TypedDict, total=False):
    code: Required[str]
    count: Required[int]

AuthorityReconciliationAnalyticsSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_reconciliation_analytics_snapshot.schema.json",
    "source_hash": "53ba434c4a60165d0f9aed061cce6c7c47a326584ded40c1209cb7761aefe022",
}

class AuthorityReconciliationControlContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_RECONCILIATION_CONTROL_V1"]]
    binding_scope_class: Required[Literal["AUTHORITY_INTERACTION_RECORD", "SUBMISSION_RECORD", "OBLIGATION_MIRROR"]]
    control_contract_hash: Required[str]
    interaction_ref_or_null: Required[str | None]
    authority_operation_profile_ref_or_null: Required[str | None]
    provider_environment_or_null: Required[str | None]
    operation_family_or_null: Required[str | None]
    duplicate_meaning_key_or_null: Required[str | None]
    authority_truth_state: Required[Literal["NOT_APPLICABLE", "NOT_REQUESTED", "UNKNOWN", "PENDING_ACK", "PARTIAL_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"]]
    submission_lifecycle_state_or_null: Required[Literal["INTENT_RECORDED", "TRANSMIT_PENDING", "TRANSMITTED", "PENDING_ACK", "CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND", "SUPERSEDED", None]]
    reconciliation_method: Required[Literal["NONE", "READ_AFTER_WRITE", "POLL_STATUS", "POLL_OBLIGATIONS", "MANUAL_ONLY"]]
    max_auto_reconciliation_attempts: Required[int]
    reconciliation_attempt_count: Required[int]
    attempts_remaining_count: Required[int]
    reconciliation_cadence_seconds_or_null: Required[int | None]
    reconciliation_budget_state: Required[Literal["NOT_OPENED", "ACTIVE", "EXHAUSTED", "ESCALATED", "CLOSED"]]
    reconciliation_deadline_at_or_null: Required[ISO8601DateTimeString]
    next_reconciliation_at_or_null: Required[ISO8601DateTimeString]
    unresolved_authority_posture: Required[Literal["NO_UNRESOLVED_AUTHORITY", "PENDING_ACK_UNRESOLVED", "UNKNOWN_UNRESOLVED", "CONTRADICTORY_EVIDENCE", "OUT_OF_BAND_CONFLICT", "MANUAL_REVIEW_REQUIRED"]]
    unresolved_reason_codes: Required[list[str]]
    resend_legality_state: Required[Literal["UNASSESSED", "IDEMPOTENT_RECOVERY_ONLY", "FOLLOW_UP_READ_ONLY", "BLOCKED_BY_RECONCILIATION", "BLOCKED_BY_ESCALATION", "CLOSED_NO_RESEND"]]
    resend_control_reason_codes: Required[list[Literal["IN_FLIGHT_REQUEST_LINEAGE_EXISTS", "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY", "PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION", "TIMEOUT_PLACEHOLDER_REQUIRES_RECONCILIATION", "AUTO_RECONCILIATION_BUDGET_EXHAUSTED", "RECONCILIATION_DEADLINE_EXPIRED", "CONTRADICTORY_AUTHORITY_EVIDENCE", "OUT_OF_BAND_AUTHORITY_STATE_PRESENT", "DUPLICATE_BUCKET_OCCUPIED", "STRONGER_EXTERNAL_TRUTH_PRESENT", "TERMINAL_AUTHORITY_STATE_RECORDED", "INTERACTION_FINALIZED_NO_RESEND"]]]
    replay_resume_policy: Required[Literal["RESUME_PERSISTED_BUDGET_ONLY"]]
    blind_resend_policy: Required[Literal["BLOCK_ON_AMBIGUITY_OR_EXHAUSTION"]]
    escalation_state: Required[Literal["NOT_REQUIRED", "READY_FOR_ESCALATION", "ESCALATED"]]
    escalation_owner_ref_or_null: Required[str | None]
    escalation_workflow_item_ref_or_null: Required[str | None]
    escalation_reason_codes: Required[list[str]]
    escalation_evidence_refs: Required[list[str]]
    escalation_due_at_or_null: Required[ISO8601DateTimeString]
    last_budget_event_at: Required[ISO8601DateTimeString]
    outcome_class_for_analytics: Required[Literal["NO_RESPONSE_YET", "PENDING_ACK", "UNKNOWN", "AMBIGUOUS", "OUT_OF_BAND", "CONFIRMED", "REJECTED", "ESCALATED"]]

AuthorityReconciliationControlContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_reconciliation_control_contract.schema.json",
    "source_hash": "b15e49aa0ca2d3675756e87e592c9110574cf155992bc121aece0e8949a2fc53",
}

class AuthorityRequestEnvelope(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorityRequestEnvelope"]]
    request_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str]
    manifest_hash: Required[str]
    execution_basis_hash: Required[str]
    attempt_lineage_manifest_id: Required[str]
    operation_id: Required[str]
    authority_name: Required[str]
    authority_product_profile: Required[str]
    provider_environment: Required[str]
    authority_scope: Required[str]
    operation_family: Required[str]
    operation_profile: Required[str]
    provider_api_version: Required[str]
    http_method: Required[Literal["GET", "POST", "PUT", "PATCH", "DELETE"]]
    resource_template: Required[str]
    resolved_path_params: Required[dict[str, str]]
    query_params: Required[dict[str, str | list[str]]]
    header_profile_refs: Required[list[str]]
    payload_ref: Required[str | None]
    canonical_path: Required[str]
    canonical_query: Required[str]
    request_identity_contract: Required[AuthorityRequestIdentityContract]
    identity_profile_version: Required[Literal["AUTHORITY_REQUEST_IDENTITY_V2"]]
    identity_namespace_hash: Required[str]
    normalized_obligation_ref: Required[str]
    normalized_basis_type: Required[str]
    duplicate_meaning_key: Required[str]
    request_body_hash: Required[str]
    request_hash: Required[str]
    idempotency_key: Required[str]
    access_binding_hash: Required[str]
    policy_snapshot_hash: Required[str]
    authority_binding_ref: Required[str]
    authority_link_ref: Required[str]
    delegation_grant_ref: Required[str | None]
    authority_layer_boundary: Required[AuthorityLayerBoundaryContract]
    subject_ref: Required[str]
    acting_party_ref: Required[str]
    token_binding_ref: Required[str]
    binding_lineage_ref: Required[str]
    business_partition_refs: Required[list[str]]
    obligation_ref: Required[str | None]
    basis_type: Required[str | None]
    fraud_header_profile_ref: Required[str | None]
    fraud_header_capture_ref: Required[str | None]
    fraud_header_validation_ref: Required[str | None]
    fraud_header_exemption_reason: Required[str | None]
    transmit_policy_ref: Required[str]

AuthorityRequestEnvelopeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_request_envelope.schema.json",
    "source_hash": "a294dc0c10460ae07a910e085db9200635dd7d505e2c902ac6ee130618572167",
}

class AuthorityRequestIdentityContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_REQUEST_IDENTITY_CONTRACT_V1"]]
    binding_scope_class: Required[Literal["AUTHORITY_REQUEST_ENVELOPE", "AUTHORITY_INTERACTION_RECORD", "SUBMISSION_RECORD"]]
    request_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    manifest_id: Required[str]
    manifest_hash: Required[str]
    execution_basis_hash: Required[str]
    attempt_lineage_manifest_id: Required[str]
    operation_id: Required[str]
    authority_name: Required[str]
    authority_product_profile: Required[str]
    provider_environment: Required[str]
    authority_scope: Required[str]
    operation_family: Required[str]
    operation_profile: Required[str]
    provider_api_version: Required[str]
    http_method: Required[Literal["GET", "POST", "PUT", "PATCH", "DELETE"]]
    canonical_path: Required[str]
    canonical_query: Required[str]
    header_profile_refs: Required[list[str]]
    identity_profile_version: Required[Literal["AUTHORITY_REQUEST_IDENTITY_V2"]]
    identity_namespace_hash: Required[str]
    normalized_obligation_ref: Required[str]
    normalized_basis_type: Required[str]
    obligation_ref_or_null: Required[str | None]
    basis_type_or_null: Required[str | None]
    request_body_hash: Required[str]
    duplicate_meaning_key: Required[str]
    request_hash: Required[str]
    idempotency_key: Required[str]
    access_binding_hash: Required[str]
    policy_snapshot_hash: Required[str]
    authority_binding_ref: Required[str]
    authority_link_ref: Required[str]
    delegation_grant_ref_or_null: Required[str | None]
    subject_ref: Required[str]
    acting_party_ref: Required[str]
    token_binding_ref: Required[str]
    binding_lineage_ref: Required[str]
    business_partition_refs: Required[list[str]]

AuthorityRequestIdentityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_request_identity_contract.schema.json",
    "source_hash": "954f6c22434059cf165cf46282cfda7dff722425849659ddeba5ba316e885f7c",
}

class AuthorityResponseEnvelope(TypedDict, total=False):
    response_id: Required[str]
    request_id: Required[str]
    received_at: Required[ISO8601DateTimeString]
    provider_received_at: Required[ISO8601DateTimeString]
    http_status: Required[int | None]
    response_headers_ref: Required[str | None]
    response_body_ref: Required[str | None]
    response_body_hash: Required[str]
    authority_reference: Required[str | None]
    response_source: Required[Literal["INLINE_HTTP", "CALLBACK", "POLL", "TRANSPORT_TIMEOUT", "RECOVERY_READ"]]
    provider_delivery_ref: Required[str | None]
    inbox_receipt_ref: Required[str | None]
    ingress_receipt_ref: Required[str | None]
    authority_ingress_proof_contract: Required[AuthorityIngressProofContract | None]
    derivation_posture: Required[Literal["PRIMARY_OBSERVATION", "CORROBORATING_OBSERVATION", "SUPERSEDES_TIMEOUT_PLACEHOLDER", "CONFLICTING_OBSERVATION", "TIMEOUT_PLACEHOLDER"]]
    legal_effect_posture: Required[Literal["DIRECT_STATE_MUTATION", "PROVISIONAL_STATE_MUTATION", "RECONCILIATION_ONLY", "NO_STATE_MUTATION"]]
    supersedes_response_id: Required[str | None]
    corroborates_response_ids: Required[list[str]]
    conflicting_response_ids: Required[list[str]]
    recovery_basis_response_id: Required[str | None]
    correlation_status: Required[Literal["BOUND", "BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS", "UNBOUND"]]
    response_class: Required[Literal["ACK_SUCCESS", "ACK_ACCEPTED_PENDING", "ACK_REJECTED_VALIDATION", "ACK_REJECTED_AUTH", "ACK_RETRYABLE_FAILURE", "ACK_TIMEOUT_OR_NO_RESOLUTION", "ACK_EXTERNAL_STATE_DISCOVERED", "ACK_AMBIGUOUS_CORRELATION", "ACK_INCONSISTENT_STATE"]]
    retry_class: Required[Literal["NO_RETRY", "SAFE_RETRY", "RECONCILE_THEN_RETRY", "HUMAN_REVIEW_THEN_RETRY", "REBUILD_THEN_RETRY", "MANUAL_INTERVENTION_REQUIRED"]]

AuthorityResponseEnvelopeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_response_envelope.schema.json",
    "source_hash": "3d667a68a2ebb0d4d83d955fa5ffb80a41fd77a557eff9ef6607b9c430800cac",
}

type AuthoritySandboxCoverageContractOperationFamily = Literal["AUTH_READ_REFERENCE", "AUTH_READ_OBLIGATIONS", "AUTH_READ_CALCULATION", "AUTH_CREATE_OR_AMEND_DATA", "AUTH_DELETE_DATA", "AUTH_TRIGGER_CALCULATION", "AUTH_SUBMIT_FINAL_DECLARATION", "AUTH_SUBMIT_PERIODIC_UPDATE", "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT", "AUTH_RECONCILE_STATUS"]

class AuthoritySandboxCoverageContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_SANDBOX_COVERAGE_V1"]]
    coverage_hash: Required[str]
    candidate_identity_hash: Required[str]
    schema_bundle_hash: Required[str]
    compatibility_gate_hash: Required[str]
    migration_plan_ref_or_null: Required[str | None]
    supported_client_window_ref_or_null: Required[str | None]
    reader_window_state: Required[Literal["EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED", "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED", "VERIFIED_PREVIOUS_READERS_SUPPORTED", "CONTRACT_ELIGIBLE_WINDOW_CLOSED"]]
    coverage_profile: Required[Literal["EXACT_ENABLED_PROVIDER_AND_OPERATION_FAMILY_MATRIX_V1"]]
    request_identity_binding_policy: Required[Literal["REQUEST_IDENTITY_AND_FRAUD_HEADERS_BIND_TO_EXERCISED_AUTHORITY_REQUESTS"]]
    namespace_isolation_policy: Required[Literal["SANDBOX_REQUEST_AND_DUPLICATE_NAMESPACES_MUST_NOT_MATCH_LIVE"]]
    fraud_header_binding_policy: Required[Literal["FRAUD_HEADER_VALIDATION_OR_EXEMPTION_MUST_BE_PROVED_ON_EXERCISED_REQUEST_IDENTITY"]]
    ingress_quarantine_policy: Required[Literal["AMBIGUOUS_OR_WEAK_INGRESS_MUST_REMAIN_QUARANTINE_OWNED"]]
    reconciliation_budget_policy: Required[Literal["BUDGET_EXHAUSTION_MUST_BLOCK_BLIND_RESEND_AND_FORCE_REVIEW"]]
    release_admissibility_scope_policy: Required[Literal["CANDIDATE_SCHEMA_MIGRATION_AND_CLIENT_WINDOW_BOUND"]]
    evidence_replay_policy: Required[Literal["REPLAY_ONLY_REQUEST_BINDING_INTERACTION_AND_INGRESS_REFS"]]
    sandbox_identity_namespace_hash: Required[str]
    sandbox_duplicate_bucket_hash: Required[str]
    enabled_provider_profile_refs: Required[list[str]]
    required_operation_families: Required[list[AuthoritySandboxCoverageContractOperationFamily]]
    exercised_provider_profile_refs: Required[list[str]]
    exercised_operation_families: Required[list[AuthoritySandboxCoverageContractOperationFamily]]
    operation_coverage: Required[list[AuthoritySandboxCoverageContractOperationCoverageEntry]]
    negative_path_coverage: Required[list[AuthoritySandboxCoverageContractNegativePathCoverageEntry]]
    provider_profile_coverage_state: Required[Literal["COMPLETE_EXACT_MATCH"]]
    operation_family_coverage_state: Required[Literal["COMPLETE_EXACT_MATCH"]]
    negative_path_coverage_state: Required[Literal["REQUIRED_CONTROLLED_EDGE_MATRIX_COMPLETE"]]

class AuthoritySandboxCoverageContractOperationCoverageEntry(TypedDict, total=False):
    provider_profile_ref: Required[str]
    provider_environment: Required[str]
    operation_family: Required[AuthoritySandboxCoverageContractOperationFamily]
    operation_profile_ref: Required[str]
    authority_binding_ref: Required[str]
    request_envelope_ref: Required[str]
    interaction_record_ref: Required[str]
    request_identity_namespace_hash: Required[str]
    duplicate_bucket_hash: Required[str]
    fraud_header_validation_ref_or_null: Required[str | None]
    coverage_outcome: Required[Literal["CANDIDATE_BOUND_EXERCISED"]]

class AuthoritySandboxCoverageContractNegativePathCoverageEntry(TypedDict, total=False):
    case_code: Required[Literal["TOKEN_ROTATION", "BINDING_LINEAGE_INVALIDATION", "AMBIGUOUS_INGRESS_QUARANTINE", "DUPLICATE_BUCKET_CHANGE", "FRAUD_HEADER_VALIDATION", "RECONCILIATION_BUDGET_EXHAUSTION"]]
    provider_profile_ref: Required[str]
    operation_family: Required[AuthoritySandboxCoverageContractOperationFamily]
    operation_profile_ref: Required[str]
    request_identity_namespace_hash_or_null: Required[str | None]
    duplicate_bucket_hash_or_null: Required[str | None]
    authority_binding_ref_or_null: Required[str | None]
    request_envelope_ref_or_null: Required[str | None]
    interaction_record_ref_or_null: Required[str | None]
    ingress_receipt_ref_or_null: Required[str | None]
    expected_fail_closed_posture: Required[Literal["SEND_BLOCKED", "INGRESS_QUARANTINED", "DUPLICATE_SUPPRESSED", "REVIEW_ESCALATED"]]

AuthoritySandboxCoverageContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_sandbox_coverage_contract.schema.json",
    "source_hash": "030242cf15ff1373792ad946c7279751d810864c94cfa8c9d11d0d3945b7e471",
}

class AuthorityTruthContract(TypedDict, total=False):
    contract_version: Required[Literal["AUTHORITY_TRUTH_V1"]]
    boundary_scope: Required[Literal["AUTHORITY_INTERACTION_RECORD", "AUTHORITY_INGRESS_RECEIPT", "SUBMISSION_RECORD", "OBLIGATION_MIRROR", "WORKFLOW_ITEM", "CLIENT_TIMELINE_EVENT"]]
    truth_surface_role: Required[Literal["AUTHORITY_RUNTIME_LEDGER", "AUTHORITY_INGRESS_CHECKPOINT", "AUTHORITY_SETTLEMENT_LEDGER", "INTERNAL_OBLIGATION_MIRROR", "INTERNAL_WORKFLOW_COORDINATION", "CUSTOMER_SAFE_STATUS_PROJECTION"]]
    surface_specific_binding_policy: Required[Literal["INTERACTION_RESPONSE_MEANING_CONTROLS_SETTLEMENT", "INGRESS_RECEIPT_MUST_NOT_DECIDE_TRUTH_UNTIL_BOUND", "SUBMISSION_LEDGER_IS_AUTHORITY_RESULT_ONLY", "MIRROR_IS_INTERNAL_VIEW_WITH_EXPLICIT_AUTHORITY_STATE", "WORKFLOW_IS_COORDINATION_ONLY_WITH_EXPLICIT_AUTHORITY_STATE", "TIMELINE_IS_CUSTOMER_SAFE_AND_EXPLICIT_ABOUT_AUTHORITY_STATE"]]
    authority_confirmation_policy: Required[Literal["ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM"]]
    non_confirming_state_policy: Required[Literal["PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING"]]
    normalization_gate_policy: Required[Literal["CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION"]]
    mirror_projection_policy: Required[Literal["INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY"]]
    unresolved_projection_policy: Required[Literal["UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED"]]
    override_confirmation_policy: Required[Literal["OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM"]]
    correction_propagation_policy: Required[Literal["AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE"]]

AuthorityTruthContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authority_truth_contract.schema.json",
    "source_hash": "8ec4d21bb7ff13d5042ef87335b48f3b1920525111ccc4a12968bf2dc2dd9a0b",
}

class AuthorizationDecision(TypedDict, total=False):
    artifact_type: Required[Literal["AuthorizationDecision"]]
    decision_id: Required[str]
    principal_context_ref: Required[str]
    resource_class: Required[str]
    action_family: Required[str]
    decision: Required[Literal["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"]]
    reason_codes: Required[list[str]]
    effective_scope: Required[list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]]
    effective_partition_scope_refs: Required[list[str]]
    masking_rules: Required[list[str]]
    required_approvals: Required[list[str]]
    required_authn_level: Required[Literal["BASIC", "MFA", "STEP_UP", None]]
    policy_snapshot_hash: Required[str]
    access_binding_hash: Required[str]
    dependency_topology_hash: Required[str | None]
    simulation_basis_hash: Required[str | None]
    delegation_snapshot_refs: Required[list[str]]
    authority_link_snapshot_refs: Required[list[str]]
    authority_layer_boundary: Required[AuthorityLayerBoundaryContract]
    bounded_safe_mutation: Required[Literal[0, 1, None]]
    approval_requirement: Required[Literal["NOT_REQUIRED", "SINGLE_APPROVER", "DUAL_APPROVER", "SECURITY_REVIEW", "CHANGE_ADVISORY_QUORUM", None]]
    evaluated_at: Required[ISO8601DateTimeString]

AuthorizationDecisionSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/authorization_decision.schema.json",
    "source_hash": "0e6c1e709c90ed63c93c8549abc297df5a9fa989dff4d00ac331e88c299c8ede",
}

class ConnectorBinding(TypedDict, total=False):
    artifact_type: Required[Literal["ConnectorBinding"]]
    binding_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    provider: Required[str]
    provider_environment: Required[str]
    provider_api_version: Required[str]
    subject_ref: Required[str]
    scopes: Required[list[str]]
    partition_scope_refs: Required[list[str]]
    token_ref: Required[str]
    token_version_ref: Required[str]
    binding_lineage_ref: Required[str]
    lifecycle_state: Required[Literal["PENDING_VALIDATION", "ACTIVE", "LIMITED", "TOKEN_INVALID", "REVOKED", "EXPIRED", "SUPERSEDED"]]
    health_state: Required[Literal["HEALTHY", "LIMITED_SCOPE", "EXPIRING_SOON", "TOKEN_INVALID", "CLIENT_BINDING_MISMATCH", "DELEGATION_GAP", "ENVIRONMENT_DRIFT", "REVOKED", "EXPIRED", "UNKNOWN"]]
    delegation_state: Required[Literal["NOT_REQUIRED", "SATISFIED", "LIMITED", "MISSING", "EXPIRED", "UNKNOWN"]]
    client_binding_state: Required[Literal["BOUND", "MISMATCH", "UNVERIFIED"]]
    last_validated_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    revoked_at: Required[ISO8601DateTimeString]
    superseded_by_binding_id: Required[str | None]
    blocked_reason_codes: Required[list[str]]
    source_evidence_refs: Required[list[str]]

ConnectorBindingSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/connector_binding.schema.json",
    "source_hash": "5acd5da296acb854028adc3f1e848c1da3557e47996a7e78510ecb45b4ba3b49",
}

class DelegationGrant(TypedDict, total=False):
    artifact_type: Required[Literal["DelegationGrant"]]
    delegation_grant_id: Required[str]
    tenant_id: Required[str]
    reporting_subject_ref: Required[str]
    delegate_ref: Required[str | None]
    delegate_class: Required[Literal["HUMAN", "EXTERNAL", "ROLE_GROUP", "SERVICE", None]]
    authority_scope_refs: Required[list[str]]
    partition_scope_refs: Required[list[str]]
    basis_type: Required[Literal["CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"]]
    basis_evidence_refs: Required[list[str]]
    effective_from: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    revoked_at: Required[ISO8601DateTimeString]
    superseded_by_grant_id: Required[str | None]
    lifecycle_state: Required[Literal["PENDING_VALIDATION", "ACTIVE", "LIMITED_SCOPE", "REVOKED", "EXPIRED", "SUPERSEDED"]]
    last_validated_at: Required[ISO8601DateTimeString]
    imported_evidence_fresh_until: Required[ISO8601DateTimeString]
    limitation_reason_codes: Required[list[str]]

DelegationGrantSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/delegation_grant.schema.json",
    "source_hash": "0a8ff2754ea385ca0a0278cf49baed409fbbd6d9f717ef0c6fdffa8681182276",
}

class ExceptionalAuthorityGrant(TypedDict, total=False):
    artifact_type: Required[Literal["ExceptionalAuthorityGrant"]]
    exceptional_grant_id: Required[str]
    incident_ref: Required[str]
    target_action_family: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    partition_scope_refs: Required[list[str]]
    requesting_principal_ref: Required[str]
    requesting_principal_class: Required[Literal["HUMAN", "EXTERNAL"]]
    approving_principal_ref: Required[str]
    approving_principal_class: Required[Literal["HUMAN"]]
    activated_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    revoked_at: Required[ISO8601DateTimeString]
    usage_limit: Required[int]
    remaining_uses: Required[int]
    rationale: Required[str]
    compensating_control_refs: Required[list[str]]
    lifecycle_state: Required[Literal["PENDING_APPROVAL", "ACTIVE", "EXHAUSTED", "EXPIRED", "REVOKED"]]
    approval_step_up_state: Required[Literal["SATISFIED"]]
    approval_step_up_evidence_ref: Required[str]
    self_approved: Required[Literal[False]]
    authority_acknowledgement_override_permitted: Required[Literal[False]]
    delegation_substitution_permitted: Required[Literal[False]]
    silent_client_widening_permitted: Required[Literal[False]]
    declaration_sign_without_signatory_basis_permitted: Required[Literal[False]]
    truth_confirmation_override_permitted: Required[Literal[False]]
    silent_partition_widening_permitted: Required[Literal[False]]

ExceptionalAuthorityGrantSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/exceptional_authority_grant.schema.json",
    "source_hash": "4ac571c4c0de79a0a212bd8194dd409108127629a5dada7b891535c7963e4e43",
}

class NightlyBatchIdentityContract(TypedDict, total=False):
    contract_version: Required[Literal["NIGHTLY_BATCH_IDENTITY_V1"]]
    identity_contract_hash: Required[str]
    tenant_id: Required[str]
    nightly_window_key: Required[str]
    trigger_class: Required[Literal["SCHEDULED_WINDOW", "MANUAL_RETRY_WINDOW", "RECOVERY_RECLAIM_WINDOW"]]
    release_verification_manifest_ref: Required[str]
    policy_snapshot_hash: Required[str]
    autopilot_policy_hash: Required[str]
    scheduler_dedupe_key: Required[str]
    schema_bundle_hash: Required[str]
    code_build_id: Required[str]
    environment_ref: Required[Literal["DEV", "TEST", "UAT", "SANDBOX", "PRODUCTION"]]
    selection_universe_hash: Required[str]
    selection_universe_count: Required[int]
    reclaimed_predecessor_batch_run_ref_or_null: Required[str | None]
    recovery_resume_state: Required[Literal["NOT_APPLICABLE", "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED", "PREDECESSOR_SELECTION_REUSED_RESHARDED"]]
    identity_binding_policy: Required[Literal["TENANT_WINDOW_TRIGGER_RELEASE_POLICY_AUTOPILOT_SCHEMA_BUILD_UNIVERSE_HASH"]]
    same_window_duplicate_policy: Required[Literal["REUSE_BATCH_AND_PERSIST_EXPLICIT_CLIENT_DISPOSITIONS"]]
    candidate_universe_policy: Required[Literal["EVERY_CANDIDATE_REQUIRES_PERSISTED_SELECTION_DISPOSITION"]]
    terminal_result_reuse_policy: Required[Literal["REUSE_TERMINAL_RESULT_BEFORE_NEW_MANIFEST_ALLOCATION"]]
    active_attempt_isolation_policy: Required[Literal["SAME_WINDOW_ACTIVE_ATTEMPT_REQUIRES_DEFER_OR_STALE_RECLAIM"]]
    shard_failure_isolation_policy: Required[Literal["UNRELATED_CLIENTS_RETAIN_EXPLICIT_OUTCOME_DESPITE_SHARD_FAILURE"]]
    cross_window_continuity_policy: Required[Literal["WINDOW_KEY_PART_OF_MANIFEST_AND_BATCH_IDENTITY"]]
    recovery_lineage_policy: Required[Literal["SUCCESSOR_MUST_LINK_AND_RESUME_PREDECESSOR"]]

NightlyBatchIdentityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/nightly_batch_identity_contract.schema.json",
    "source_hash": "7dd3ba6dc2bfee171db16a79c73cb12b716a27b73fa7eb4c5a50d182b4d8c19a",
}

type PrincipalAccessViewSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type PrincipalAccessViewRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type PrincipalAccessViewWorkspaceMode = Literal["PRINCIPALS", "ROLES", "SIMULATOR"]

type PrincipalAccessViewInspectorState = Literal["HIDDEN", "CELL_SELECTED", "ROLE_EDITING", "SIMULATION_SELECTED"]

type PrincipalAccessViewPromotedSupportSurface = Literal["AUDIT_SIDECAR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"]

type PrincipalAccessViewChainLayerOutcome = Literal["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY", "NOT_APPLICABLE"]

type PrincipalAccessViewSessionAuthnLayer = PrincipalAccessViewAuthorityChainLayerBase

type PrincipalAccessViewTenantOperationalAuthorityLayer = PrincipalAccessViewAuthorityChainLayerBase

type PrincipalAccessViewClientDelegationCoverageLayer = PrincipalAccessViewAuthorityChainLayerBase

type PrincipalAccessViewExternalAuthorityLinkReadinessLayer = PrincipalAccessViewAuthorityChainLayerBase

type PrincipalAccessViewAuthorityOfRecordOutcomeLayer = PrincipalAccessViewAuthorityChainLayerBase

type PrincipalAccessViewAuthorityChainLayerStack = list[PrincipalAccessViewAuthorityOfRecordOutcomeLayer]

class PrincipalAccessView(TypedDict, total=False):
    artifact_type: Required[Literal["PrincipalAccessView"]]
    tenant_id: Required[str]
    shell_family: Required[Literal["GOVERNANCE_DENSITY_SHELL"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    settlement_state: Required[PrincipalAccessViewSettlementState]
    recovery_posture: Required[PrincipalAccessViewRecoveryPosture]
    interaction_layer: Required[GovernanceInteractionLayer]
    cache_isolation_contract: Required[CacheIsolationContract]
    principal_id: Required[str]
    principal_type: Required[Literal["HUMAN", "SERVICE", "EXTERNAL"]]
    effective_role_set: Required[list[str]]
    delegation_summaries: Required[list[PrincipalAccessViewDelegationSummary]]
    authn_level: Required[Literal["BASIC", "MFA", "STEP_UP"]]
    approval_capabilities: Required[list[str]]
    run_kind_capabilities: Required[list[str]]
    action_matrix: Required[list[PrincipalAccessViewActionMatrixCell]]
    focus_anchor_ref: Required[str | None]
    access_workspace: Required[PrincipalAccessViewAccessWorkspace]
    selected_action_detail: Required[None | PrincipalAccessViewSelectedActionDetail]
    last_step_up_at: Required[ISO8601DateTimeString]
    last_modified_at: Required[ISO8601DateTimeString]

class PrincipalAccessViewInteractionLayer(TypedDict, total=False):
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]

class PrincipalAccessViewDelegationSummary(TypedDict, total=False):
    client_id: Required[str]
    delegation_basis: Required[Literal["SELF_ACTING", "CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE", "TENANT_INTERNAL", "SYSTEM_ASSIGNED"]]
    scope_refs: Required[list[str]]
    lifecycle_state: Required[str]
    expires_at: NotRequired[ISO8601DateTimeString]

class PrincipalAccessViewAuthorityChainLayerBase(TypedDict, total=False):
    layer_code: Required[str]
    layer_outcome: Required[PrincipalAccessViewChainLayerOutcome]
    reason_codes: Required[list[str]]

class PrincipalAccessViewActionMatrixCell(TypedDict, total=False):
    cell_ref: Required[str]
    resource_class: Required[str]
    action_family: Required[str]
    decision: Required[Literal["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"]]
    reason_codes: Required[list[str]]
    effective_scope: Required[list[str]]
    masking_rules: Required[list[str]]
    required_approvals: Required[list[str]]
    required_authn_level: Required[Literal["BASIC", "MFA", "STEP_UP", None]]
    policy_path_ref: NotRequired[str | None]
    authority_chain_layers: Required[PrincipalAccessViewAuthorityChainLayerStack]

class PrincipalAccessViewActiveFilters(TypedDict, total=False):
    principal_types: Required[list[Literal["HUMAN", "SERVICE", "EXTERNAL"]]]
    principal_states: Required[list[str]]
    role_refs: Required[list[str]]
    delegated_client_refs: Required[list[str]]
    recent_change_owner_refs: Required[list[str]]

class PrincipalAccessViewAccessWorkspace(TypedDict, total=False):
    surface_order: Required[Literal[["PRINCIPAL_DIRECTORY","WORKSPACE_CANVAS","ACCESS_INSPECTOR","AUTHORITY_CHAIN_PANEL","POLICY_SIMULATOR"]]]
    workspace_mode: Required[PrincipalAccessViewWorkspaceMode]
    active_filters: Required[PrincipalAccessViewActiveFilters]
    selected_principal_ref: Required[str | None]
    selected_role_template_ref: Required[str | None]
    selected_cell_ref: Required[str | None]
    grid_navigation_model: Required[Literal["ROW_COLUMN_ROVING_TABINDEX"]]
    inspector_state: Required[PrincipalAccessViewInspectorState]
    promoted_support_surface: Required[PrincipalAccessViewPromotedSupportSurface]
    latest_simulation_ref: Required[str | None]
    role_editor_pending_change_refs: Required[list[str]]

class PrincipalAccessViewSelectedActionDetail(TypedDict, total=False):
    panel_mode: Required[Literal["ACCESS_INSPECTOR"]]
    cell_ref: Required[str]
    resource_class: Required[str]
    action_family: Required[str]
    decision: Required[Literal["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"]]
    reason_codes: Required[list[str]]
    effective_scope: Required[list[str]]
    masking_rules: Required[list[str]]
    required_approvals: Required[list[str]]
    required_authn_level: Required[Literal["BASIC", "MFA", "STEP_UP", None]]
    policy_path_ref: Required[str]
    authority_chain_layers: Required[PrincipalAccessViewAuthorityChainLayerStack]

PrincipalAccessViewSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/principal_access_view.schema.json",
    "source_hash": "d14cf60086be7f6f1e7029ee705dd381471465fb7e48add6807a1412daa865f2",
}

class PrincipalContext(TypedDict, total=False):
    artifact_type: Required[Literal["PrincipalContext"]]
    principal_id: Required[str]
    principal_type: Required[Literal["HUMAN", "SERVICE", "EXTERNAL"]]
    effective_role_set: Required[list[str]]
    tenant_id: Required[str]
    client_scope: Required[list[str]]
    requested_scope: Required[list[str]]
    partition_scope_refs: Required[list[str]]
    authn_level: Required[Literal["BASIC", "MFA", "STEP_UP"]]
    subject_identity_assurance_level: Required[Literal["UNVERIFIED", "VERIFIED", "STEP_UP_VERIFIED"]]
    session_id: Required[str]
    service_identity_ref: Required[str | None]
    delegation_basis: Required[Literal["SELF_ACTING", "CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE", "TENANT_INTERNAL", "SYSTEM_ASSIGNED"]]
    authorization_evaluated_at: Required[ISO8601DateTimeString]
    policy_snapshot_hash: Required[str]
    access_binding_hash: Required[str]
    delegation_snapshot_refs: Required[list[str]]
    authority_link_refs: Required[list[str]]
    authority_link_snapshot_refs: Required[list[str]]
    masking_scope: Required[str]
    approval_capabilities: Required[list[str]]
    client_portal_capabilities: Required[list[str]]
    run_kind_capabilities: Required[list[str]]

PrincipalContextSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/principal_context.schema.json",
    "source_hash": "28b2fdf11d31ba4d2a7a4b7328c36798b8416df04abdf364ba65399ecb5d2696",
}

type ScopeExecutionBindingScopeArray = JSONValue

class ScopeExecutionBinding(TypedDict, total=False):
    binding_scope_class: Required[Literal["RUN_MANIFEST", "FROZEN_EXECUTION_BINDING", "AUTHORITY_OPERATION", "AUTHORITY_CALCULATION_REQUEST"]]
    execution_mode_or_null: Required[Literal["COMPLIANCE", "ANALYSIS", None]]
    requested_scope_family: Required[Literal["READ_ONLY", "PREPARE_ONLY", "PREPARE_AND_SUBMIT", "AMENDMENT_INTENT", "AMENDMENT_SUBMIT"]]
    executable_scope_family: Required[Literal["READ_ONLY", "PREPARE_ONLY", "PREPARE_AND_SUBMIT", "AMENDMENT_INTENT", "AMENDMENT_SUBMIT"]]
    requested_scope: Required[ScopeExecutionBindingScopeArray]
    executable_scope: Required[ScopeExecutionBindingScopeArray]
    executable_partition_scope_refs: Required[list[str]]
    access_decision: Required[Literal["ALLOW", "ALLOW_MASKED"]]
    reduction_posture: Required[Literal["UNCHANGED", "REDUCED_BY_AUTHORIZATION"]]
    mutation_atomicity: Required[Literal["ATOMIC_REQUIRED", "NARROWING_ALLOWED"]]
    masking_rules: Required[list[str]]
    required_approvals: Required[list[str]]
    required_authn_level: Required[Literal["BASIC", "MFA", "STEP_UP", None]]
    access_binding_hash: Required[str]
    reason_codes: Required[list[str]]

ScopeExecutionBindingSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/scope_execution_binding.schema.json",
    "source_hash": "6470a226c64bfe14f18840f2e4c6b3aec5b9081ea5355e901b3f09e3999fc9ee",
}

AuthorityAndAccessBindingManifest = {"family_ref": "AUTHORITY_AND_ACCESS", "schema_count": 32}
