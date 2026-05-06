/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type ActionAuthorityContract = {
  "projection_scope": "WORKSPACE_ACTION_STRIP" | "WORK_INBOX_ROW_ACTIONS" | "CUSTOMER_REQUEST_DETAIL" | "CUSTOMER_REQUEST_ROW";
  "source_module_code": "WORKFLOW_CHOREOGRAPHER";
  "basis_hash": string;
  "projection_route_key": string;
  "projection_version": number;
  "access_binding_hash": string;
  "visibility_cache_partition_key": string;
  "customer_safe_projection": boolean;
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code_or_null": string | null;
  "secondary_action_codes": Array<string>;
  "available_action_codes": Array<string>;
  "blocked_action_codes": Array<string>;
  "blocking_reason_code_or_null": string | null;
  "machine_reason_codes": Array<string>;
  "suggested_module_code_or_null": "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL" | null;
  "recovery_route_ref_or_null": string | null;
  "recovery_focus_anchor_ref_or_null": string | null;
};
export const ActionAuthorityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/action_authority_contract.schema.json", sourceHash: "1f7f036e3b8b69d1a342905380a79eb2e4dd840befd8d4aefcacd990c58233d6" } as const;

export type ActorSession = {
  "artifact_type": "ActorSession";
  "session_id": string;
  "tenant_id": string;
  "principal_ref": string;
  "principal_class": "HUMAN" | "SERVICE" | "EXTERNAL";
  "session_client_class": "BROWSER" | "NATIVE" | "AUTOMATION";
  "authn_level": "BASIC" | "MFA" | "STEP_UP";
  "step_up_state": "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED" | "EXPIRED";
  "session_binding_hash": string;
  "csrf_ref": string | null;
  "device_binding_state": "NOT_APPLICABLE" | "BOUND" | "UNVERIFIED" | "INVALIDATED";
  "issued_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "revoked_at": ISO8601DateTimeString;
  "revocation_reason": string | null;
  "step_up_completed_at": ISO8601DateTimeString;
  "last_seen_at": ISO8601DateTimeString;
};
export const ActorSessionSchemaLineage = { schemaId: "https://taxat.dev/schemas/actor_session.schema.json", sourceHash: "a75ec9cb55c8dc2926180ee7fda3ca436631049d07d9ba90fe83d1ea842a6b3a" } as const;

export type AuthorityBinding = {
  "artifact_type": "AuthorityBinding";
  "authority_binding_id": string;
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string;
  "principal_context_ref": string;
  "authorization_decision_ref": string;
  "authority_link_ref": string;
  "delegation_grant_ref": string | null;
  "delegation_state": "NOT_REQUIRED" | "SATISFIED" | "LIMITED" | "MISSING" | "EXPIRED" | "UNKNOWN";
  "authority_link_state": "UNLINKED" | "LINK_INITIATED" | "AUTHORISED_ACTIVE" | "AUTHORISED_LIMITED" | "TOKEN_INVALID" | "REVOKED" | "EXPIRED" | "SUPERSEDED";
  "partition_scope_refs": Array<string>;
  "token_binding_ref": string;
  "binding_lineage_ref": string;
  "token_version_ref": string;
  "subject_ref": string;
  "acting_party_ref": string;
  "authority_scope": string;
  "provider_environment": string;
  "provider_api_version": string;
  "access_binding_hash": string;
  "policy_snapshot_hash": string;
  "token_client_binding_state": "BOUND" | "MISMATCH" | "UNVERIFIED";
  "binding_health": "HEALTHY" | "LIMITED_SCOPE" | "EXPIRING_SOON" | "TOKEN_INVALID" | "CLIENT_BINDING_MISMATCH" | "DELEGATION_GAP" | "ENVIRONMENT_DRIFT" | "REVOKED" | "EXPIRED" | "UNKNOWN";
  "last_validated_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "blocked_reason_codes": Array<string>;
  "authority_layer_boundary": AuthorityLayerBoundaryContract & {
    "binding_scope_class"?: "AUTHORITY_BINDING";
    "integration_capability"?: "AUTHORITY_INTEGRATED";
  };
  "step_up_state": "NOT_REQUIRED" | "SATISFIED";
  "step_up_evidence_ref": string | null;
  "approval_state": "NOT_REQUIRED" | "SATISFIED";
  "approval_ref": string | null;
  "binding_resolved_at": ISO8601DateTimeString;
};
export const AuthorityBindingSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_binding.schema.json", sourceHash: "02882fc03c78975fa445787e7133885b4088882cb36a58c874004ffd5c37a1ad" } as const;

export type AuthorityBindingDriftSentinelContract = {
  "contract_version": "AUTHORITY_BINDING_DRIFT_SENTINEL_V1";
  "binding_scope_class": "AUTHORITY_INTERACTION_RECORD";
  "sentinel_contract_hash": string;
  "binding_verification_policy": "RECHECK_BOUND_IDENTITY_AND_LIVE_AUTHORITY_CONTEXT_BEFORE_NETWORK_ACTION";
  "duplicate_truth_policy": "LATEST_DUPLICATE_AND_STRONGER_TRUTH_MUST_BLOCK_OR_RECONCILE";
  "lineage_reuse_policy": "SEALED_REQUEST_LINEAGE_ONLY_NO_SILENT_REBIND";
  "checked_action_class": "NOT_YET_ATTEMPTED" | "TRANSMIT_MUTATION" | "RECONCILIATION_POLL" | "RECOVERY_READ";
  "decision_state": "NOT_EVALUATED" | "CLEAR_TO_PROCEED" | "BLOCKED";
  "checked_at": ISO8601DateTimeString;
  "tenant_id": string;
  "client_id": string;
  "authority_binding_ref": string;
  "authority_link_ref": string;
  "delegation_grant_ref_or_null": string | null;
  "binding_lineage_ref": string;
  "sealed_token_version_ref": string;
  "checked_token_version_ref_or_null": string | null;
  "subject_ref": string;
  "acting_party_ref": string;
  "authority_scope": string;
  "provider_environment": string;
  "provider_api_version": string;
  "access_binding_hash": string;
  "policy_snapshot_hash": string;
  "duplicate_meaning_key": string;
  "duplicate_truth_inputs_state": "NOT_CHECKED" | "RECHECKED_NO_CONFLICT" | "NEWER_TRUTH_OR_DUPLICATE_PRESENT";
  "latest_submission_record_ref_or_null": string | null;
  "latest_obligation_mirror_ref_or_null": string | null;
  "latest_ingress_receipt_ref_or_null": string | null;
  "exclusive_send_claim_state": "NOT_APPLICABLE" | "CLAIM_HELD" | "CLAIM_CONFLICT";
  "pass_reason_code_or_null": "SEALED_TOKEN_VERSION_REUSED" | "TOKEN_ROTATED_WITHIN_LINEAGE" | null;
  "block_reason_codes": Array<"SEND_CLAIM_CONFLICT" | "TOKEN_VERSION_NOT_USABLE" | "BINDING_LINEAGE_DRIFT" | "AUTHORITY_LINK_NOT_ACTIVE" | "CLIENT_SUBJECT_SCOPE_DRIFT" | "PROVIDER_CONTRACT_DRIFT" | "ACCESS_BINDING_HASH_DRIFT" | "POLICY_SNAPSHOT_HASH_DRIFT" | "STEP_UP_OR_APPROVAL_DRIFT" | "DUPLICATE_BUCKET_CHANGED" | "STRONGER_EXTERNAL_TRUTH_PRESENT" | "BODY_COLLISION_PRESENT">;
};
export const AuthorityBindingDriftSentinelContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_binding_drift_sentinel_contract.schema.json", sourceHash: "a1612b481daf34c09c7567f71e922f0bf3d18aec7ba082d522271f7c98f40e0e" } as const;

export type AuthorityCalculationReadinessContext = {
  "artifact_type": "AuthorityCalculationReadinessContext";
  "calculation_readiness_context_id": string;
  "context_scope": "FILING_PREPARATION" | "AMENDMENT_INTENT";
  "manifest_id": string;
  "owner_artifact_type": "FilingCase" | "AmendmentCase";
  "owner_artifact_ref": string;
  "calculation_request_ref": string;
  "calculation_id": string;
  "calculation_type": "in-year" | "intent-to-finalise" | "intent-to-amend" | "final-declaration";
  "request_state": "MODELED_ONLY" | "TRIGGERED" | "RETRIEVE_PENDING" | "RETRIEVED";
  "result_state": "MODELED" | "RETRIEVED";
  "calculation_hash": string | null;
  "calculation_basis_ref": string | null;
  "basis_status": "PROVISIONAL" | "CONFIRMED" | "REJECTED" | null;
  "basis_hash": string | null;
  "user_confirmation_ref": string | null;
  "confirmation_state": "PENDING" | "CONFIRMED" | "DECLINED" | null;
  "parity_reusable": boolean;
  "filing_reusable": boolean;
  "validation_outcome": "PASS" | "PASS_WITH_NOTICE" | "MANUAL_REVIEW" | "OVERRIDABLE_BLOCK" | "HARD_BLOCK";
  "reason_codes": Array<string>;
  "live_authority_call_executed": boolean;
  "persisted_at": ISO8601DateTimeString;
};
export const AuthorityCalculationReadinessContextSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_calculation_readiness_context.schema.json", sourceHash: "6c4f7e1ec5b76862ce49eed3ddb5a0c4acf6ad58fabe87cbae5a104ae756108b" } as const;

export type AuthorityCalculationRequest = {
  "artifact_type": "AuthorityCalculationRequest";
  "calculation_request_id": string;
  "manifest_id": string;
  "tenant_id": string;
  "client_id": string;
  "calculation_type": "in-year" | "intent-to-finalise" | "intent-to-amend" | "final-declaration";
  "authority_scope": string;
  "provider_environment": string;
  "operation_profile_ref": string;
  "authority_operation_ref": string | null;
  "target_obligation_ref": string | null;
  "runtime_scope": Array<string>;
  "scope_execution_binding": ScopeExecutionBinding & {
    "binding_scope_class"?: "AUTHORITY_CALCULATION_REQUEST";
  };
  "access_binding_hash": string;
  "request_state": "MODELED_ONLY" | "TRIGGERED" | "RETRIEVE_PENDING" | "RETRIEVED" | "SUPERSEDED";
  "live_authority_call_executed": boolean;
  "request_envelope_ref": string | null;
  "authority_interaction_ref": string | null;
  "reason_codes": Array<string>;
  "requested_at": ISO8601DateTimeString;
};
export const AuthorityCalculationRequestSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_calculation_request.schema.json", sourceHash: "9c0694f3b15563bbbafbec392744cc00d40888ce0fefeb183dab49b52958791b" } as const;

export type AuthorityCalculationResult = {
  "artifact_type": "AuthorityCalculationResult";
  "calculation_id": string;
  "calculation_request_ref": string;
  "manifest_id": string;
  "calculation_type": "in-year" | "intent-to-finalise" | "intent-to-amend" | "final-declaration";
  "result_state": "MODELED" | "RETRIEVED" | "SUPERSEDED";
  "validation_outcome": "PASS" | "PASS_WITH_NOTICE" | "MANUAL_REVIEW" | "OVERRIDABLE_BLOCK" | "HARD_BLOCK";
  "reason_codes": Array<string>;
  "live_authority_call_executed": boolean;
  "calculation_hash": string | null;
  "retrieved_payload_ref": string | null;
  "authority_response_ref": string | null;
  "retrieved_at": ISO8601DateTimeString;
  "superseded_at": ISO8601DateTimeString;
};
export const AuthorityCalculationResultSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_calculation_result.schema.json", sourceHash: "4a6579811ba343cb6f81a17986aba91960e65ed0c626062a31426a7d1e3b0d73" } as const;

export type AuthorityIngressCorrelationContract = {
  "contract_version": "AUTHORITY_INGRESS_CORRELATION_CONTRACT_V1";
  "bound_artifact_type": "AuthorityIngressReceipt";
  "correlation_status": "BOUND" | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS" | "UNBOUND";
  "lineage_binding_basis": "REQUEST_HASH_EXACT" | "IDEMPOTENCY_TUPLE_EXACT" | "REQUEST_HASH_AND_TUPLE_EXACT" | "AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS_MULTI_MATCH" | "UNBOUND_NO_MATCH";
  "comparison_set_state": "ONE_EXACT_MATCH" | "WEAK_MATCH_ONLY" | "MULTI_MATCH" | "NO_MATCH" | "MISSING_PROVIDER_KEYS";
  "resolution_state": "EXACT_BOUND" | "WEAK_AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS_MULTI_MATCH" | "UNBOUND_NO_MATCH" | "UNBOUND_MISSING_IDENTITY_CLAIMS";
  "extracted_authority_reference_or_null": string | null;
  "extracted_request_hash_or_null": string | null;
  "extracted_idempotency_key_or_null": string | null;
  "extracted_identity_namespace_hash_or_null": string | null;
  "extracted_duplicate_meaning_key_or_null": string | null;
  "candidate_lineages": Array<AuthorityIngressCorrelationContractCandidateLineage>;
  "correlation_reason_codes": Array<string>;
  "request_lineage_comparison_policy": "PERSISTED_REQUEST_LINEAGE_ONLY_NO_TRANSPORT_MEMORY";
  "legal_mutation_policy": "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION";
};
export const AuthorityIngressCorrelationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_ingress_correlation_contract.schema.json", sourceHash: "8622939e089e1d3e56cf0fe145ec76aabdffabca8ffd897ac3a3ad9c54c114cb" } as const;

export type AuthorityIngressCorrelationContractCandidateLineage = {
  "candidate_rank": number;
  "interaction_ref": string;
  "authority_reference_or_null": string | null;
  "request_hash_or_null": string | null;
  "idempotency_key_or_null": string | null;
  "identity_namespace_hash_or_null": string | null;
  "duplicate_meaning_key_or_null": string | null;
  "latest_submission_record_ref_or_null": string | null;
  "latest_obligation_mirror_ref_or_null": string | null;
  "match_basis_codes": Array<"AUTHORITY_REFERENCE_MATCH" | "DUPLICATE_MEANING_KEY_MATCH" | "IDEMPOTENCY_KEY_MATCH" | "IDENTITY_NAMESPACE_HASH_MATCH" | "REQUEST_HASH_MATCH">;
  "divergence_reason_codes": Array<string>;
};

export type AuthorityIngressInvestigationSnapshot = {
  "artifact_type": "AuthorityIngressInvestigationSnapshot";
  "investigation_id": string;
  "ingress_receipt_ref": string;
  "provider_environment": string;
  "provider_profile_ref": string;
  "ingress_channel_class": "CALLBACK" | "POLL_RESULT" | "INBOX_DELIVERY" | "WORKER_OBSERVED" | "GATEWAY_RECOVERED";
  "receipt_state": "QUARANTINED" | "DUPLICATE_SUPPRESSED";
  "correlation_status": "BOUND" | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS" | "UNBOUND";
  "authenticated_channel_state": "AUTHENTICATED" | "FAILED";
  "response_body_ref": string | null;
  "response_body_hash": string;
  "delivery_dedupe_key": string;
  "authority_reference_or_null": string | null;
  "bound_interaction_ref_or_null": string | null;
  "normalized_response_ref_or_null": string | null;
  "authority_ingress_proof_contract": AuthorityIngressProofContract & {
    "binding_scope_class"?: "AUTHORITY_INGRESS_RECEIPT";
  };
  "authority_ingress_correlation_contract": AuthorityIngressCorrelationContract;
  "delivery_lineage": AuthorityIngressInvestigationSnapshotDeliveryLineage;
  "quarantine_explainability": AuthorityIngressInvestigationSnapshotQuarantineExplainability;
  "safe_next_action_codes": Array<"COMPARE_CANDIDATE_LINEAGES" | "ESCALATE_PROVIDER_PAYLOAD" | "OPEN_RECONCILIATION_WORKFLOW" | "REVIEW_AUTHENTICATION_EVIDENCE" | "REVIEW_CANONICAL_RECEIPT" | "WAIT_FOR_SEPARATE_BINDING_DECISION">;
  "investigation_source_policy": "PERSISTED_RECEIPT_PAYLOAD_AUDIT_AND_LINEAGE_ONLY";
  "legal_mutation_policy": "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION";
  "updated_at": ISO8601DateTimeString;
};
export const AuthorityIngressInvestigationSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_ingress_investigation_snapshot.schema.json", sourceHash: "2c30cad1b59e20e100b52cd010fa9c35020bef7c2182eace9e6b72e381d1f9e4" } as const;

export type AuthorityIngressInvestigationSnapshotDeliveryLineage = {
  "delivery_novelty_state": "CANONICAL_FIRST_SEEN" | "DUPLICATE_SUPPRESSED";
  "canonical_ingress_receipt_ref_or_self": string;
  "related_duplicate_receipt_refs": Array<string>;
};

export type AuthorityIngressInvestigationSnapshotQuarantineExplainability = {
  "reason_codes": Array<string>;
  "comparison_candidate_refs": Array<string>;
  "supporting_audit_event_refs": Array<string>;
  "current_owner_ref_or_null": string | null;
  "resolution_state": "ESCALATED" | "OPEN_DUPLICATE_REVIEW" | "OPEN_QUARANTINE" | "READY_FOR_CANONICAL_DUPLICATE_CLOSE" | "READY_FOR_SEPARATE_RECONCILIATION";
  "blocked_mutation_reason_codes": Array<string>;
};

export type AuthorityIngressProofContract = {
  "contract_version": "AUTHORITY_INGRESS_PROOF_CONTRACT_V1";
  "binding_scope_class": "AUTHORITY_INGRESS_RECEIPT" | "AUTHORITY_RESPONSE_ENVELOPE" | "AUTHORITY_INTERACTION_RECORD" | "SUBMISSION_RECORD" | "OBLIGATION_MIRROR";
  "ingress_channel_class_or_null": "CALLBACK" | "POLL_RESULT" | "INBOX_DELIVERY" | "WORKER_OBSERVED" | "GATEWAY_RECOVERED" | null;
  "authenticated_channel_state": "NOT_APPLICABLE" | "AUTHENTICATED" | "FAILED";
  "authentication_evidence_modes": Array<"CALLBACK_SIGNATURE_VERIFIED" | "CALLBACK_MTLS_VERIFIED" | "SOURCE_ALLOWLIST_VERIFIED" | "POLL_CREDENTIAL_VERIFIED" | "INBOX_DELIVERY_CREDENTIAL_VERIFIED" | "WORKER_ATTESTATION_VERIFIED" | "GATEWAY_RECOVERY_CREDENTIAL_VERIFIED">;
  "authentication_evidence_refs": Array<string>;
  "delivery_identity_basis": "PROVIDER_DELIVERY_REF_RESPONSE_BODY_HASH_INGRESS_CHANNEL_METADATA_HASH";
  "provider_delivery_ref_or_null": string | null;
  "response_body_hash_or_null": string | null;
  "ingress_channel_metadata_hash_or_null": string | null;
  "delivery_dedupe_key_or_null": string | null;
  "correlation_status_or_null": "BOUND" | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS" | "UNBOUND" | null;
  "lineage_binding_basis": "NOT_APPLICABLE" | "REQUEST_HASH_EXACT" | "IDEMPOTENCY_TUPLE_EXACT" | "REQUEST_HASH_AND_TUPLE_EXACT" | "AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS_MULTI_MATCH" | "UNBOUND_NO_MATCH";
  "canonical_ingress_receipt_ref_or_null": string | null;
  "bound_interaction_ref_or_null": string | null;
  "authority_reference_or_null": string | null;
  "request_hash_or_null": string | null;
  "idempotency_key_or_null": string | null;
  "identity_namespace_hash_or_null": string | null;
  "duplicate_meaning_key_or_null": string | null;
  "request_lineage_proof_hash_or_null": string | null;
  "normalized_response_ref_or_null": string | null;
  "mutation_gate_state": "NOT_APPLICABLE" | "CHECKPOINT_ONLY" | "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT" | "STATE_MUTATION_ATTRIBUTED_TO_PERSISTED_RECEIPT" | "QUARANTINE_ONLY" | "DUPLICATE_SUPPRESSED_NO_MUTATION";
  "heuristic_correlation_policy": "DETERMINISTIC_ONLY_NO_RECENT_REQUEST_HEURISTICS";
  "transport_memory_mutation_policy": "FORBIDDEN_UNTIL_PERSISTED_PROOF";
};
export const AuthorityIngressProofContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json", sourceHash: "dda61f1e59d20ef5ca63737f2130a041ec946e46ea545b7bf833959e63fa4194" } as const;

export type AuthorityIngressReceipt = {
  "artifact_type": "AuthorityIngressReceipt";
  "ingress_receipt_id": string;
  "provider_environment": string;
  "provider_profile_ref": string;
  "ingress_channel_class": "CALLBACK" | "POLL_RESULT" | "INBOX_DELIVERY" | "WORKER_OBSERVED" | "GATEWAY_RECOVERED";
  "provider_delivery_ref": string;
  "response_body_ref": string | null;
  "response_body_hash": string;
  "ingress_channel_metadata_hash": string;
  "delivery_dedupe_key": string;
  "authority_reference": string | null;
  "request_hash": string | null;
  "idempotency_key": string | null;
  "identity_namespace_hash": string | null;
  "duplicate_meaning_key": string | null;
  "bound_interaction_ref": string | null;
  "authority_truth_contract": AuthorityTruthContract & {
    "boundary_scope"?: "AUTHORITY_INGRESS_RECEIPT";
    "truth_surface_role"?: "AUTHORITY_INGRESS_CHECKPOINT";
    "surface_specific_binding_policy"?: "INGRESS_RECEIPT_MUST_NOT_DECIDE_TRUTH_UNTIL_BOUND";
  };
  "correlation_status": "BOUND" | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS" | "UNBOUND";
  "authenticated_channel_state": "AUTHENTICATED" | "FAILED";
  "authority_ingress_proof_contract": AuthorityIngressProofContract & {
    "binding_scope_class"?: "AUTHORITY_INGRESS_RECEIPT";
  };
  "authority_ingress_correlation_contract": AuthorityIngressCorrelationContract;
  "receipt_state": "PERSISTED" | "NORMALIZED" | "QUARANTINED" | "DUPLICATE_SUPPRESSED";
  "received_at": ISO8601DateTimeString;
  "persisted_at": ISO8601DateTimeString;
  "quarantined_at": ISO8601DateTimeString;
  "quarantine_reason_codes": Array<string>;
  "canonical_ingress_receipt_ref": string | null;
  "reconciliation_owner_ref": string | null;
  "normalized_response_ref": string | null;
  "audit_event_refs": Array<string>;
};
export const AuthorityIngressReceiptSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_ingress_receipt.schema.json", sourceHash: "e4815200450d19e9488f76eeab7f2ec31b77d0c9bcf23cd54664895b62d9f797" } as const;

export type AuthorityInteractionRecord = {
  "interaction_id": string;
  "manifest_id": string;
  "operation_id": string;
  "request_id": string;
  "authority_operation_profile_ref": string;
  "request_identity_contract": AuthorityRequestIdentityContract & {
    "binding_scope_class"?: "AUTHORITY_INTERACTION_RECORD";
  };
  "binding_drift_sentinel_contract": AuthorityBindingDriftSentinelContract & {
    "binding_scope_class"?: "AUTHORITY_INTERACTION_RECORD";
  };
  "request_hash": string;
  "idempotency_key": string;
  "identity_namespace_hash": string;
  "duplicate_meaning_key": string;
  "authority_ingress_proof_contract": AuthorityIngressProofContract & {
    "binding_scope_class"?: "AUTHORITY_INTERACTION_RECORD";
  } | null;
  "authority_binding_ref": string;
  "authority_link_ref": string;
  "binding_lineage_ref": string;
  "access_binding_hash": string;
  "policy_snapshot_hash": string;
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "COMMAND_SIDE_AUTHORITY";
    "authoritative_record_families"?: ["RUN_MANIFEST","AUTHORITY_INTERACTION_RECORD","AUDIT_EVENT"];
    "observable_projection_families"?: [];
  };
  "authority_truth_contract": AuthorityTruthContract & {
    "boundary_scope"?: "AUTHORITY_INTERACTION_RECORD";
    "truth_surface_role"?: "AUTHORITY_RUNTIME_LEDGER";
    "surface_specific_binding_policy"?: "INTERACTION_RESPONSE_MEANING_CONTROLS_SETTLEMENT";
  };
  "lifecycle_state": "REQUEST_REGISTERED" | "DISPATCH_READY" | "TRANSMIT_IN_FLIGHT" | "RESPONSE_CAPTURED" | "RECONCILING" | "RESOLVED" | "ABANDONED";
  "created_at": ISO8601DateTimeString;
  "last_status_at": ISO8601DateTimeString;
  "active_response_id": string | null;
  "response_history_ids": Array<string>;
  "meaning_resolution_state": "NO_RESPONSE" | "PROVISIONAL_TIMEOUT" | "ACTIVE_DIRECT" | "ACTIVE_CORROBORATED" | "RECONCILIATION_REQUIRED" | "RECONCILIATION_RESOLVED";
  "submission_record_ref": string | null;
  "dispatch_ref": string;
  "send_revalidation_state": "NOT_PERFORMED" | "CLEAR_TO_SEND" | "BLOCKED";
  "send_revalidated_at": ISO8601DateTimeString;
  "send_authorized_token_version_ref": string | null;
  "send_revalidation_reason_codes": Array<"SEALED_TOKEN_VERSION_REUSED" | "TOKEN_ROTATED_WITHIN_LINEAGE" | "SEND_CLAIM_CONFLICT" | "TOKEN_VERSION_NOT_USABLE" | "BINDING_LINEAGE_DRIFT" | "AUTHORITY_LINK_NOT_ACTIVE" | "CLIENT_SUBJECT_SCOPE_DRIFT" | "PROVIDER_CONTRACT_DRIFT" | "ACCESS_BINDING_HASH_DRIFT" | "POLICY_SNAPSHOT_HASH_DRIFT" | "STEP_UP_OR_APPROVAL_DRIFT" | "DUPLICATE_BUCKET_CHANGED" | "STRONGER_EXTERNAL_TRUTH_PRESENT" | "BODY_COLLISION_PRESENT">;
  "reconciliation_method": "NONE" | "READ_AFTER_WRITE" | "POLL_STATUS" | "POLL_OBLIGATIONS" | "MANUAL_ONLY";
  "max_auto_reconciliation_attempts": number;
  "reconciliation_cadence_seconds": number | null;
  "reconciliation_budget_state": "NOT_OPENED" | "ACTIVE" | "EXHAUSTED" | "ESCALATED" | "CLOSED";
  "next_reconciliation_at": ISO8601DateTimeString;
  "reconciliation_attempt_count": number;
  "reconciliation_deadline_at": ISO8601DateTimeString;
  "reconciliation_escalated_at": ISO8601DateTimeString;
  "reconciliation_workflow_item_ref": string | null;
  "resend_legality_state": "UNASSESSED" | "IDEMPOTENT_RECOVERY_ONLY" | "FOLLOW_UP_READ_ONLY" | "BLOCKED_BY_RECONCILIATION" | "BLOCKED_BY_ESCALATION" | "CLOSED_NO_RESEND";
  "resend_control_reason_codes": Array<"IN_FLIGHT_REQUEST_LINEAGE_EXISTS" | "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY" | "PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION" | "TIMEOUT_PLACEHOLDER_REQUIRES_RECONCILIATION" | "AUTO_RECONCILIATION_BUDGET_EXHAUSTED" | "RECONCILIATION_DEADLINE_EXPIRED" | "CONTRADICTORY_AUTHORITY_EVIDENCE" | "OUT_OF_BAND_AUTHORITY_STATE_PRESENT" | "DUPLICATE_BUCKET_OCCUPIED" | "STRONGER_EXTERNAL_TRUTH_PRESENT" | "TERMINAL_AUTHORITY_STATE_RECORDED" | "INTERACTION_FINALIZED_NO_RESEND">;
  "reconciliation_control_contract": AuthorityReconciliationControlContract & {
    "binding_scope_class"?: "AUTHORITY_INTERACTION_RECORD";
  };
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
  "resolution_basis": "TERMINAL_RESPONSE" | "RECONCILIATION_RESULT" | null;
  "abandonment_reason_code": string | null;
};
export const AuthorityInteractionRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_interaction_record.schema.json", sourceHash: "bf1f6d39bb02f320e92165a709e657f4148c0a191ce40b7e17d2f83bb357085d" } as const;

export type AuthorityLayerBoundaryContract = {
  "contract_version": "AUTHORITY_LAYER_BOUNDARY_V1";
  "binding_scope_class": "AUTHORIZATION_DECISION" | "GOVERNANCE_ACCESS_SIMULATION" | "AUTHORITY_BINDING" | "AUTHORITY_OPERATION" | "AUTHORITY_REQUEST_ENVELOPE";
  "integration_capability": "INTERNAL_ONLY" | "AUTHORITY_INTEGRATED";
  "active_principal_class": "HUMAN" | "SERVICE" | "EXTERNAL";
  "tenant_permission_state": "SATISFIED" | "MASKED" | "DENIED";
  "client_delegation_state": "NOT_REQUIRED" | "SATISFIED" | "LIMITED" | "MISSING" | "EXPIRED";
  "delegation_basis": "SELF_ACTING" | "CLIENT_GRANTED" | "SELF_ASSESSMENT_IMPORTED" | "DIGITAL_HANDSHAKE" | "TENANT_INTERNAL" | "SYSTEM_ASSIGNED";
  "delegation_freshness_state": "NOT_APPLICABLE" | "CURRENT" | "REVALIDATION_REQUIRED";
  "authority_link_state": "NOT_REQUIRED" | "UNLINKED" | "LINK_INITIATED" | "AUTHORISED_ACTIVE" | "AUTHORISED_LIMITED" | "TOKEN_INVALID" | "REVOKED" | "EXPIRED" | "SUPERSEDED";
  "exceptional_authority_state": "NOT_APPLICABLE" | "BOUNDED_INTERNAL_EXCEPTION";
  "human_gate_requirement": "NOT_REQUIRED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "REQUIRE_STEP_UP_AND_APPROVAL";
  "human_gate_resolution_state": "NOT_REQUIRED" | "PENDING_EVIDENCE" | "EVIDENCE_FROZEN";
  "authority_truth_precedence_policy": "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION";
  "tenant_permission_substitution_policy": "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION";
  "link_delegation_independence_policy": "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION";
  "exceptional_scope_policy": "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS";
  "service_human_gate_satisfaction_permitted": false;
  "exceptional_authority_may_substitute_for_delegation": false;
  "exceptional_authority_may_override_authority_truth": false;
  "exceptional_authority_may_widen_client_scope": false;
  "exceptional_authority_may_widen_partition_scope": false;
};
export const AuthorityLayerBoundaryContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json", sourceHash: "5d8379487b939b840bb99ae8ffa83124517b2f7d9106ef9c6289342aa0333952" } as const;

export type AuthorityLink = {
  "artifact_type": "AuthorityLink";
  "authority_link_id": string;
  "tenant_id": string;
  "client_id": string;
  "reporting_subject_ref": string;
  "authority_name": string;
  "authority_scope": string;
  "provider_environment": string;
  "provider_api_version": string;
  "authorised_party_ref": string;
  "delegation_grant_ref": string | null;
  "partition_scope_refs": Array<string>;
  "token_binding_profile_ref": string | null;
  "validated_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "revoked_at": ISO8601DateTimeString;
  "superseded_by_link_id": string | null;
  "lifecycle_state": "UNLINKED" | "LINK_INITIATED" | "AUTHORISED_ACTIVE" | "AUTHORISED_LIMITED" | "TOKEN_INVALID" | "REVOKED" | "EXPIRED" | "SUPERSEDED";
  "binding_health": "HEALTHY" | "LIMITED_SCOPE" | "EXPIRING_SOON" | "TOKEN_INVALID" | "CLIENT_BINDING_MISMATCH" | "DELEGATION_GAP" | "ENVIRONMENT_DRIFT" | "REVOKED" | "EXPIRED" | "UNLINKED" | "UNKNOWN";
  "delegation_state": "NOT_REQUIRED" | "SATISFIED" | "LIMITED" | "MISSING" | "EXPIRED" | "UNKNOWN";
  "token_client_binding_state": "BOUND" | "MISMATCH" | "UNVERIFIED";
  "source_evidence_refs": Array<string>;
  "blocked_reason_codes": Array<string>;
  "last_binding_check_at": ISO8601DateTimeString;
};
export const AuthorityLinkSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_link.schema.json", sourceHash: "c4d35be54a4a6ceb5d2887d97890b07daef144c69fc96f5b04a7e6368a226af3" } as const;

export type AuthorityLinkInventoryItem = {
  "artifact_type": "AuthorityLinkInventoryItem";
  "tenant_id": string;
  "shell_family": "GOVERNANCE_DENSITY_SHELL";
  "object_anchor_ref": string;
  "dominant_question": string;
  "settlement_state": AuthorityLinkInventoryItemSettlementState;
  "recovery_posture": AuthorityLinkInventoryItemRecoveryPosture;
  "interaction_layer": GovernanceInteractionLayer;
  "authority_link_id": string;
  "client_id": string;
  "authority_scope": string;
  "provider_environment": string;
  "lifecycle_state": AuthorityLinkInventoryItemLifecycleState;
  "binding_health": AuthorityLinkInventoryItemBindingHealth;
  "delegation_state": AuthorityLinkInventoryItemDelegationState;
  "token_client_binding_state": AuthorityLinkInventoryItemTokenClientBindingState;
  "last_validated_at": ISO8601DateTimeString;
  "expires_at"?: ISO8601DateTimeString;
  "blocked_reason_codes"?: Array<string>;
  "focus_anchor_ref": string;
  "externalization_governance_contract": ExternalizationGovernanceContract & {
    "boundary_scope"?: "AUTHORITY_LINK_HANDOFF";
  };
  "authority_link_workspace": AuthorityLinkInventoryItemAuthorityLinkWorkspace;
  "guided_handshake_stepper": AuthorityLinkInventoryItemGuidedHandshakeStepper;
  "binding_health_timeline": AuthorityLinkInventoryItemBindingHealthTimeline;
  "handshake_history": AuthorityLinkInventoryItemHandshakeHistory;
  "affected_operation_list": AuthorityLinkInventoryItemAffectedOperationList;
  "preflight_checklist": AuthorityLinkInventoryItemPreflightChecklist;
  "affected_operation_counts": AuthorityLinkInventoryItemAffectedOperationCounts;
};
export const AuthorityLinkInventoryItemSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_link_inventory_item.schema.json", sourceHash: "dafa503e1d5b0152f01acad4406a7855c71cf5e1d2116cb6de6fbdeb09fea8e8" } as const;

export type AuthorityLinkInventoryItemSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type AuthorityLinkInventoryItemRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type AuthorityLinkInventoryItemInteractionLayer = {
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
};

export type AuthorityLinkInventoryItemLifecycleState = "UNLINKED" | "LINK_INITIATED" | "AUTHORISED_ACTIVE" | "AUTHORISED_LIMITED" | "TOKEN_INVALID" | "REVOKED" | "EXPIRED";

export type AuthorityLinkInventoryItemBindingHealth = "HEALTHY" | "LIMITED_SCOPE" | "EXPIRING_SOON" | "TOKEN_INVALID" | "CLIENT_BINDING_MISMATCH" | "DELEGATION_GAP" | "ENVIRONMENT_DRIFT" | "REVOKED" | "EXPIRED" | "UNLINKED" | "UNKNOWN";

export type AuthorityLinkInventoryItemDelegationState = "SATISFIED" | "LIMITED" | "MISSING" | "EXPIRED" | "UNKNOWN";

export type AuthorityLinkInventoryItemTokenClientBindingState = "BOUND" | "MISMATCH" | "UNVERIFIED";

export type AuthorityLinkInventoryItemGuidedFlowMode = "DETAILS" | "LINK" | "RELINK" | "UNLINK_REVIEW";

export type AuthorityLinkInventoryItemExpiryRiskBand = "NONE" | "EXPIRING_30_DAYS" | "EXPIRING_14_DAYS" | "EXPIRING_7_DAYS" | "EXPIRED";

export type AuthorityLinkInventoryItemHandshakeFlowState = "NOT_STARTED" | "IN_PROGRESS" | "HANDOFF_PENDING" | "VALIDATION_PENDING" | "LINKED" | "BLOCKED";

export type AuthorityLinkInventoryItemHandshakeStepCode = "SELECT_AUTHORITY" | "CONFIRM_CLIENT_SCOPE" | "RUN_PREFLIGHT_CHECKS" | "AUTHORISE_EXTERNAL_HANDOFF" | "VALIDATE_BINDING";

export type AuthorityLinkInventoryItemHandshakeAttemptState = "NONE_RECORDED" | "COMPLETED" | "FAILED" | "ABANDONED" | "EXPIRED" | "PENDING_RETURN";

export type AuthorityLinkInventoryItemPreflightCheckCode = "AUTHORITY_SCOPE" | "CLIENT_BINDING" | "DELEGATION_COVERAGE" | "PROVIDER_ENVIRONMENT" | "TOKEN_FRESHNESS";

export type AuthorityLinkInventoryItemPreflightCheckState = "PASS" | "WARNING" | "BLOCKED" | "NOT_RUN";

export type AuthorityLinkInventoryItemAuthorityLinkWorkspace = {
  "surface_order": ["INVENTORY_RAIL","WORKSPACE_CANVAS","AUDIT_SIDECAR"];
  "active_filters": AuthorityLinkInventoryItemAuthorityLinkWorkspaceFilters;
  "selected_authority_link_ref": string;
  "detail_module_order": ["AuthorityLinkIdentityCard","BindingHealthTimeline","HandshakeHistory","AffectedOperationList","PreflightChecklist"];
  "guided_flow_mode": AuthorityLinkInventoryItemGuidedFlowMode;
  "promoted_support_surface": "AUDIT_SIDECAR";
  "prominent_issue_ref_or_null": string | null;
};

export type AuthorityLinkInventoryItemAuthorityLinkWorkspaceFilters = {
  "authority_scopes": Array<string>;
  "client_refs": Array<string>;
  "provider_environments": Array<string>;
  "lifecycle_states": Array<AuthorityLinkInventoryItemLifecycleState>;
  "binding_health_states": Array<AuthorityLinkInventoryItemBindingHealth>;
  "expiry_risk_bands": Array<AuthorityLinkInventoryItemExpiryRiskBand>;
};

export type AuthorityLinkInventoryItemGuidedHandshakeStepper = {
  "flow_state": AuthorityLinkInventoryItemHandshakeFlowState;
  "step_order": ["SELECT_AUTHORITY","CONFIRM_CLIENT_SCOPE","RUN_PREFLIGHT_CHECKS","AUTHORISE_EXTERNAL_HANDOFF","VALIDATE_BINDING"];
  "current_step_code": AuthorityLinkInventoryItemHandshakeStepCode;
  "completed_step_codes": Array<AuthorityLinkInventoryItemHandshakeStepCode>;
  "credential_capture_mode": "GUIDED_HANDSHAKE_ONLY";
  "external_handoff_ref_or_null": string | null;
  "preflight_blocking_check_refs": Array<string>;
};

export type AuthorityLinkInventoryItemBindingHealthTimeline = {
  "current_binding_health": AuthorityLinkInventoryItemBindingHealth;
  "current_delegation_state": AuthorityLinkInventoryItemDelegationState;
  "current_token_client_binding_state": AuthorityLinkInventoryItemTokenClientBindingState;
  "promoted_issue_ref_or_null": string | null;
  "event_refs": Array<string>;
  "next_validation_due_at_or_null": ISO8601DateTimeString;
};

export type AuthorityLinkInventoryItemHandshakeHistory = {
  "attempt_refs": Array<string>;
  "selected_attempt_ref_or_null": string | null;
  "latest_attempt_state": AuthorityLinkInventoryItemHandshakeAttemptState;
  "latest_failure_ref_or_null": string | null;
};

export type AuthorityLinkInventoryItemAffectedOperationList = {
  "section_order": ["PREFLIGHT","SUBMISSION","RECONCILIATION","AMENDMENT"];
  "preflight_refs": Array<string>;
  "submission_refs": Array<string>;
  "reconciliation_refs": Array<string>;
  "amendment_refs": Array<string>;
  "primary_blocked_operation_ref_or_null": string | null;
};

export type AuthorityLinkInventoryItemPreflightChecklist = {
  "check_order": ["AUTHORITY_SCOPE","CLIENT_BINDING","DELEGATION_COVERAGE","PROVIDER_ENVIRONMENT","TOKEN_FRESHNESS"];
  "checks": Array<AuthorityLinkInventoryItemPreflightCheck>;
  "blocking_check_refs": Array<string>;
  "last_run_at_or_null": ISO8601DateTimeString;
};

export type AuthorityLinkInventoryItemPreflightCheck = {
  "check_ref": string;
  "check_code": AuthorityLinkInventoryItemPreflightCheckCode;
  "check_state": AuthorityLinkInventoryItemPreflightCheckState;
  "reason_refs": Array<string>;
};

export type AuthorityLinkInventoryItemAffectedOperationCounts = {
  "preflight_count": number;
  "submission_count": number;
  "reconciliation_count": number;
  "amendment_count": number;
};

export type AuthorityOperation = {
  "artifact_type": "AuthorityOperation";
  "operation_id": string;
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string;
  "manifest_hash": string;
  "execution_basis_hash": string;
  "attempt_lineage_manifest_id": string;
  "operation_family": "AUTH_READ_REFERENCE" | "AUTH_READ_OBLIGATIONS" | "AUTH_READ_CALCULATION" | "AUTH_CREATE_OR_AMEND_DATA" | "AUTH_DELETE_DATA" | "AUTH_TRIGGER_CALCULATION" | "AUTH_SUBMIT_FINAL_DECLARATION" | "AUTH_SUBMIT_PERIODIC_UPDATE" | "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT" | "AUTH_RECONCILE_STATUS";
  "authority_name": string;
  "authority_product_profile": string;
  "operation_profile_ref": string;
  "provider_environment": string;
  "provider_api_version": string;
  "authority_scope": string;
  "requested_scope": AuthorityOperationScopeArray;
  "runtime_scope": AuthorityOperationScopeArray;
  "scope_execution_binding": ScopeExecutionBinding & {
    "binding_scope_class"?: "AUTHORITY_OPERATION";
  };
  "access_binding_hash": string;
  "policy_snapshot_hash": string;
  "authority_binding_ref": string;
  "authority_link_ref": string;
  "delegation_grant_ref": string | null;
  "binding_lineage_ref": string;
  "token_binding_ref": string;
  "subject_ref": string;
  "acting_party_ref": string;
  "business_partitions": Array<string>;
  "period": string;
  "target_obligation_ref": string | null;
  "basis_type": string | null;
  "authority_layer_boundary": AuthorityLayerBoundaryContract & {
    "binding_scope_class"?: "AUTHORITY_OPERATION";
    "integration_capability"?: "AUTHORITY_INTEGRATED";
  };
  "contract": SchemaBundle;
};
export const AuthorityOperationSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_operation.schema.json", sourceHash: "a9c6f872ed9d6613cc2e75106a8df872de571c352e31b5c9aad593ee387daabd" } as const;

export type AuthorityOperationScopeArray = JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;

export type AuthorityOperationProfile = {
  "fraud_header_profile_ref"?: string;
} | {
  "fraud_header_exemption_reason"?: string;
};
export const AuthorityOperationProfileSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_operation_profile.schema.json", sourceHash: "39364a825e050a50d41e7ccc1ea580fe449621d21ef3bbbfcdd8eb0f2a92e303" } as const;

export type AuthorityOperationProfileTransportRules = {
  "http_method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  "path_template": string;
  "canonical_query_mode": "SORTED_KEYS" | "DECLARED_ORDER";
  "payload_required": boolean;
  "response_body_expected": boolean;
  "timeout_profile_ref": string;
  "transmit_policy_ref": string;
};

export type AuthorityOperationProfileSuccessResponseRules = {
  "success_status_codes": Array<number>;
  "response_class": "SUCCESS_BODY_REQUIRED" | "SUCCESS_BODY_OPTIONAL" | "SUCCESS_NO_BODY_ALLOWED";
  "extraction_rule_refs": Array<string>;
  "confirmed_state_on_success": "NO_LEGAL_STATE_CHANGE" | "PENDING_ACK" | "CONFIRMED";
};

export type AuthorityOperationProfilePendingUnknownRules = {
  "timeout_maps_to": "PENDING_ACK" | "UNKNOWN";
  "no_body_maps_to": "PENDING_ACK" | "UNKNOWN" | "CONFIRMED";
  "retry_class": "NO_RETRY" | "SAFE_RETRY" | "RECONCILE_THEN_RETRY" | "HUMAN_REVIEW_THEN_RETRY" | "REBUILD_THEN_RETRY" | "MANUAL_INTERVENTION_REQUIRED";
  "escalation_required": boolean;
};

export type AuthorityOperationProfileReconciliationRules = {
  "method": "NONE" | "READ_AFTER_WRITE" | "POLL_STATUS" | "POLL_OBLIGATIONS" | "MANUAL_ONLY";
  "max_auto_reconciliation_attempts": number;
  "cadence_seconds": number | null;
  "deadline_derivation_rule": string | null;
  "escalation_policy_ref": string | null;
  "authoritative_result_source": "DIRECT_RESPONSE" | "FOLLOW_UP_READ" | "OBLIGATION_MIRROR" | "MANUAL_REVIEW";
};

export type AuthorityOperationProfileLegalStateRules = {
  "authoritative_state_source": "DIRECT_ACK" | "OBLIGATION_MIRROR" | "CALCULATION_READ" | "RECONCILIATION_RESULT";
  "timeout_default_state": "PENDING_ACK" | "UNKNOWN";
  "accepted_pending_state": "PENDING_ACK" | "UNKNOWN";
  "out_of_band_state_allowed": boolean;
  "amendment_requires_confirmed_finalisation": boolean;
};

export type AuthorityReconciliationAnalyticsSnapshot = {
  "artifact_type": "AuthorityReconciliationAnalyticsSnapshot";
  "snapshot_id": string;
  "authority_operation_profile_ref": string;
  "provider_environment": string;
  "operation_family": string;
  "window_started_at": ISO8601DateTimeString;
  "window_ended_at": ISO8601DateTimeString;
  "interaction_refs": Array<string>;
  "total_interaction_count": number;
  "budget_state_counts": Array<AuthorityReconciliationAnalyticsSnapshotBudgetCountEntry>;
  "outcome_class_counts": Array<AuthorityReconciliationAnalyticsSnapshotOutcomeCountEntry>;
  "resend_refusal_reason_counts": Array<AuthorityReconciliationAnalyticsSnapshotResendReasonCountEntry>;
  "escalation_reason_counts": Array<AuthorityReconciliationAnalyticsSnapshotStringCountEntry>;
  "unresolved_ambiguity_count": number;
  "deadline_expiry_count": number;
  "escalated_count": number;
  "blind_resend_blocked_count": number;
  "replay_resume_count": number;
  "average_attempts_consumed": number;
  "max_attempts_consumed": number;
  "escalation_latency_seconds_p95_or_null": number | null;
  "tuning_recommendation_codes": Array<"NO_CHANGE_RECOMMENDED" | "INCREASE_DEADLINE_WINDOW" | "DECREASE_DEADLINE_WINDOW" | "INCREASE_AUTO_ATTEMPT_BUDGET" | "DECREASE_AUTO_ATTEMPT_BUDGET" | "INCREASE_CADENCE_INTERVAL" | "DECREASE_CADENCE_INTERVAL" | "REVIEW_PROVIDER_AMBIGUITY" | "REQUIRE_MANUAL_ESCALATION_EARLIER">;
  "source_policy": "DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY";
  "generated_at": ISO8601DateTimeString;
};
export const AuthorityReconciliationAnalyticsSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_reconciliation_analytics_snapshot.schema.json", sourceHash: "53ba434c4a60165d0f9aed061cce6c7c47a326584ded40c1209cb7761aefe022" } as const;

export type AuthorityReconciliationAnalyticsSnapshotBudgetCountEntry = {
  "code": "NOT_OPENED" | "ACTIVE" | "EXHAUSTED" | "ESCALATED" | "CLOSED";
  "count": number;
};

export type AuthorityReconciliationAnalyticsSnapshotOutcomeCountEntry = {
  "code": "NO_RESPONSE_YET" | "PENDING_ACK" | "UNKNOWN" | "AMBIGUOUS" | "OUT_OF_BAND" | "CONFIRMED" | "REJECTED" | "ESCALATED";
  "count": number;
};

export type AuthorityReconciliationAnalyticsSnapshotResendReasonCountEntry = {
  "code": "AUTO_RECONCILIATION_BUDGET_EXHAUSTED" | "RECONCILIATION_DEADLINE_EXPIRED" | "CONTRADICTORY_AUTHORITY_EVIDENCE" | "OUT_OF_BAND_AUTHORITY_STATE_PRESENT" | "DUPLICATE_BUCKET_OCCUPIED" | "STRONGER_EXTERNAL_TRUTH_PRESENT" | "TERMINAL_AUTHORITY_STATE_RECORDED" | "INTERACTION_FINALIZED_NO_RESEND";
  "count": number;
};

export type AuthorityReconciliationAnalyticsSnapshotStringCountEntry = {
  "code": string;
  "count": number;
};

export type AuthorityReconciliationControlContract = {
  "contract_version": "AUTHORITY_RECONCILIATION_CONTROL_V1";
  "binding_scope_class": "AUTHORITY_INTERACTION_RECORD" | "SUBMISSION_RECORD" | "OBLIGATION_MIRROR";
  "control_contract_hash": string;
  "interaction_ref_or_null": string | null;
  "authority_operation_profile_ref_or_null": string | null;
  "provider_environment_or_null": string | null;
  "operation_family_or_null": string | null;
  "duplicate_meaning_key_or_null": string | null;
  "authority_truth_state": "NOT_APPLICABLE" | "NOT_REQUESTED" | "UNKNOWN" | "PENDING_ACK" | "PARTIAL_ACK" | "CONFIRMED" | "REJECTED" | "OUT_OF_BAND";
  "submission_lifecycle_state_or_null": "INTENT_RECORDED" | "TRANSMIT_PENDING" | "TRANSMITTED" | "PENDING_ACK" | "CONFIRMED" | "REJECTED" | "UNKNOWN" | "OUT_OF_BAND" | "SUPERSEDED" | null;
  "reconciliation_method": "NONE" | "READ_AFTER_WRITE" | "POLL_STATUS" | "POLL_OBLIGATIONS" | "MANUAL_ONLY";
  "max_auto_reconciliation_attempts": number;
  "reconciliation_attempt_count": number;
  "attempts_remaining_count": number;
  "reconciliation_cadence_seconds_or_null": number | null;
  "reconciliation_budget_state": "NOT_OPENED" | "ACTIVE" | "EXHAUSTED" | "ESCALATED" | "CLOSED";
  "reconciliation_deadline_at_or_null": ISO8601DateTimeString;
  "next_reconciliation_at_or_null": ISO8601DateTimeString;
  "unresolved_authority_posture": "NO_UNRESOLVED_AUTHORITY" | "PENDING_ACK_UNRESOLVED" | "UNKNOWN_UNRESOLVED" | "CONTRADICTORY_EVIDENCE" | "OUT_OF_BAND_CONFLICT" | "MANUAL_REVIEW_REQUIRED";
  "unresolved_reason_codes": Array<string>;
  "resend_legality_state": "UNASSESSED" | "IDEMPOTENT_RECOVERY_ONLY" | "FOLLOW_UP_READ_ONLY" | "BLOCKED_BY_RECONCILIATION" | "BLOCKED_BY_ESCALATION" | "CLOSED_NO_RESEND";
  "resend_control_reason_codes": Array<"IN_FLIGHT_REQUEST_LINEAGE_EXISTS" | "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY" | "PENDING_OR_UNKNOWN_REQUIRES_RECONCILIATION" | "TIMEOUT_PLACEHOLDER_REQUIRES_RECONCILIATION" | "AUTO_RECONCILIATION_BUDGET_EXHAUSTED" | "RECONCILIATION_DEADLINE_EXPIRED" | "CONTRADICTORY_AUTHORITY_EVIDENCE" | "OUT_OF_BAND_AUTHORITY_STATE_PRESENT" | "DUPLICATE_BUCKET_OCCUPIED" | "STRONGER_EXTERNAL_TRUTH_PRESENT" | "TERMINAL_AUTHORITY_STATE_RECORDED" | "INTERACTION_FINALIZED_NO_RESEND">;
  "replay_resume_policy": "RESUME_PERSISTED_BUDGET_ONLY";
  "blind_resend_policy": "BLOCK_ON_AMBIGUITY_OR_EXHAUSTION";
  "escalation_state": "NOT_REQUIRED" | "READY_FOR_ESCALATION" | "ESCALATED";
  "escalation_owner_ref_or_null": string | null;
  "escalation_workflow_item_ref_or_null": string | null;
  "escalation_reason_codes": Array<string>;
  "escalation_evidence_refs": Array<string>;
  "escalation_due_at_or_null": ISO8601DateTimeString;
  "last_budget_event_at": ISO8601DateTimeString;
  "outcome_class_for_analytics": "NO_RESPONSE_YET" | "PENDING_ACK" | "UNKNOWN" | "AMBIGUOUS" | "OUT_OF_BAND" | "CONFIRMED" | "REJECTED" | "ESCALATED";
};
export const AuthorityReconciliationControlContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_reconciliation_control_contract.schema.json", sourceHash: "b15e49aa0ca2d3675756e87e592c9110574cf155992bc121aece0e8949a2fc53" } as const;

export type AuthorityRequestEnvelope = {
  "artifact_type": "AuthorityRequestEnvelope";
  "request_id": string;
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string;
  "manifest_hash": string;
  "execution_basis_hash": string;
  "attempt_lineage_manifest_id": string;
  "operation_id": string;
  "authority_name": string;
  "authority_product_profile": string;
  "provider_environment": string;
  "authority_scope": string;
  "operation_family": string;
  "operation_profile": string;
  "provider_api_version": string;
  "http_method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  "resource_template": string;
  "resolved_path_params": {
    [key: string]: string;
  };
  "query_params": {
    [key: string]: string | Array<string>;
  };
  "header_profile_refs": Array<string>;
  "payload_ref": string | null;
  "canonical_path": string;
  "canonical_query": string;
  "request_identity_contract": AuthorityRequestIdentityContract & {
    "binding_scope_class"?: "AUTHORITY_REQUEST_ENVELOPE";
  };
  "identity_profile_version": "AUTHORITY_REQUEST_IDENTITY_V2";
  "identity_namespace_hash": string;
  "normalized_obligation_ref": string;
  "normalized_basis_type": string;
  "duplicate_meaning_key": string;
  "request_body_hash": string;
  "request_hash": string;
  "idempotency_key": string;
  "access_binding_hash": string;
  "policy_snapshot_hash": string;
  "authority_binding_ref": string;
  "authority_link_ref": string;
  "delegation_grant_ref": string | null;
  "authority_layer_boundary": AuthorityLayerBoundaryContract & {
    "binding_scope_class"?: "AUTHORITY_REQUEST_ENVELOPE";
    "integration_capability"?: "AUTHORITY_INTEGRATED";
  };
  "subject_ref": string;
  "acting_party_ref": string;
  "token_binding_ref": string;
  "binding_lineage_ref": string;
  "business_partition_refs": Array<string>;
  "obligation_ref": string | null;
  "basis_type": string | null;
  "fraud_header_profile_ref": string | null;
  "fraud_header_capture_ref": string | null;
  "fraud_header_validation_ref": string | null;
  "fraud_header_exemption_reason": string | null;
  "transmit_policy_ref": string;
};
export const AuthorityRequestEnvelopeSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_request_envelope.schema.json", sourceHash: "a294dc0c10460ae07a910e085db9200635dd7d505e2c902ac6ee130618572167" } as const;

export type AuthorityRequestIdentityContract = {
  "contract_version": "AUTHORITY_REQUEST_IDENTITY_CONTRACT_V1";
  "binding_scope_class": "AUTHORITY_REQUEST_ENVELOPE" | "AUTHORITY_INTERACTION_RECORD" | "SUBMISSION_RECORD";
  "request_id": string;
  "tenant_id": string;
  "client_id": string;
  "manifest_id": string;
  "manifest_hash": string;
  "execution_basis_hash": string;
  "attempt_lineage_manifest_id": string;
  "operation_id": string;
  "authority_name": string;
  "authority_product_profile": string;
  "provider_environment": string;
  "authority_scope": string;
  "operation_family": string;
  "operation_profile": string;
  "provider_api_version": string;
  "http_method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  "canonical_path": string;
  "canonical_query": string;
  "header_profile_refs": Array<string>;
  "identity_profile_version": "AUTHORITY_REQUEST_IDENTITY_V2";
  "identity_namespace_hash": string;
  "normalized_obligation_ref": string;
  "normalized_basis_type": string;
  "obligation_ref_or_null": string | null;
  "basis_type_or_null": string | null;
  "request_body_hash": string;
  "duplicate_meaning_key": string;
  "request_hash": string;
  "idempotency_key": string;
  "access_binding_hash": string;
  "policy_snapshot_hash": string;
  "authority_binding_ref": string;
  "authority_link_ref": string;
  "delegation_grant_ref_or_null": string | null;
  "subject_ref": string;
  "acting_party_ref": string;
  "token_binding_ref": string;
  "binding_lineage_ref": string;
  "business_partition_refs": Array<string>;
};
export const AuthorityRequestIdentityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_request_identity_contract.schema.json", sourceHash: "954f6c22434059cf165cf46282cfda7dff722425849659ddeba5ba316e885f7c" } as const;

export type AuthorityResponseEnvelope = {
  "response_id": string;
  "request_id": string;
  "received_at": ISO8601DateTimeString;
  "provider_received_at": ISO8601DateTimeString;
  "http_status": number | null;
  "response_headers_ref": string | null;
  "response_body_ref": string | null;
  "response_body_hash": string;
  "authority_reference": string | null;
  "response_source": "INLINE_HTTP" | "CALLBACK" | "POLL" | "TRANSPORT_TIMEOUT" | "RECOVERY_READ";
  "provider_delivery_ref": string | null;
  "inbox_receipt_ref": string | null;
  "ingress_receipt_ref": string | null;
  "authority_ingress_proof_contract": AuthorityIngressProofContract & {
    "binding_scope_class"?: "AUTHORITY_RESPONSE_ENVELOPE";
  } | null;
  "derivation_posture": "PRIMARY_OBSERVATION" | "CORROBORATING_OBSERVATION" | "SUPERSEDES_TIMEOUT_PLACEHOLDER" | "CONFLICTING_OBSERVATION" | "TIMEOUT_PLACEHOLDER";
  "legal_effect_posture": "DIRECT_STATE_MUTATION" | "PROVISIONAL_STATE_MUTATION" | "RECONCILIATION_ONLY" | "NO_STATE_MUTATION";
  "supersedes_response_id": string | null;
  "corroborates_response_ids": Array<string>;
  "conflicting_response_ids": Array<string>;
  "recovery_basis_response_id": string | null;
  "correlation_status": "BOUND" | "BOUND_WITH_AUTHORITY_REFERENCE_ONLY" | "AMBIGUOUS" | "UNBOUND";
  "response_class": "ACK_SUCCESS" | "ACK_ACCEPTED_PENDING" | "ACK_REJECTED_VALIDATION" | "ACK_REJECTED_AUTH" | "ACK_RETRYABLE_FAILURE" | "ACK_TIMEOUT_OR_NO_RESOLUTION" | "ACK_EXTERNAL_STATE_DISCOVERED" | "ACK_AMBIGUOUS_CORRELATION" | "ACK_INCONSISTENT_STATE";
  "retry_class": "NO_RETRY" | "SAFE_RETRY" | "RECONCILE_THEN_RETRY" | "HUMAN_REVIEW_THEN_RETRY" | "REBUILD_THEN_RETRY" | "MANUAL_INTERVENTION_REQUIRED";
};
export const AuthorityResponseEnvelopeSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_response_envelope.schema.json", sourceHash: "3d667a68a2ebb0d4d83d955fa5ffb80a41fd77a557eff9ef6607b9c430800cac" } as const;

export type AuthoritySandboxCoverageContract = {
  "contract_version": "AUTHORITY_SANDBOX_COVERAGE_V1";
  "coverage_hash": string;
  "candidate_identity_hash": string;
  "schema_bundle_hash": string;
  "compatibility_gate_hash": string;
  "migration_plan_ref_or_null": string | null;
  "supported_client_window_ref_or_null": string | null;
  "reader_window_state": "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED" | "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED" | "VERIFIED_PREVIOUS_READERS_SUPPORTED" | "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
  "coverage_profile": "EXACT_ENABLED_PROVIDER_AND_OPERATION_FAMILY_MATRIX_V1";
  "request_identity_binding_policy": "REQUEST_IDENTITY_AND_FRAUD_HEADERS_BIND_TO_EXERCISED_AUTHORITY_REQUESTS";
  "namespace_isolation_policy": "SANDBOX_REQUEST_AND_DUPLICATE_NAMESPACES_MUST_NOT_MATCH_LIVE";
  "fraud_header_binding_policy": "FRAUD_HEADER_VALIDATION_OR_EXEMPTION_MUST_BE_PROVED_ON_EXERCISED_REQUEST_IDENTITY";
  "ingress_quarantine_policy": "AMBIGUOUS_OR_WEAK_INGRESS_MUST_REMAIN_QUARANTINE_OWNED";
  "reconciliation_budget_policy": "BUDGET_EXHAUSTION_MUST_BLOCK_BLIND_RESEND_AND_FORCE_REVIEW";
  "release_admissibility_scope_policy": "CANDIDATE_SCHEMA_MIGRATION_AND_CLIENT_WINDOW_BOUND";
  "evidence_replay_policy": "REPLAY_ONLY_REQUEST_BINDING_INTERACTION_AND_INGRESS_REFS";
  "sandbox_identity_namespace_hash": string;
  "sandbox_duplicate_bucket_hash": string;
  "enabled_provider_profile_refs": Array<string>;
  "required_operation_families": Array<AuthoritySandboxCoverageContractOperationFamily>;
  "exercised_provider_profile_refs": Array<string>;
  "exercised_operation_families": Array<AuthoritySandboxCoverageContractOperationFamily>;
  "operation_coverage": Array<AuthoritySandboxCoverageContractOperationCoverageEntry>;
  "negative_path_coverage": Array<AuthoritySandboxCoverageContractNegativePathCoverageEntry>;
  "provider_profile_coverage_state": "COMPLETE_EXACT_MATCH";
  "operation_family_coverage_state": "COMPLETE_EXACT_MATCH";
  "negative_path_coverage_state": "REQUIRED_CONTROLLED_EDGE_MATRIX_COMPLETE";
};
export const AuthoritySandboxCoverageContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_sandbox_coverage_contract.schema.json", sourceHash: "030242cf15ff1373792ad946c7279751d810864c94cfa8c9d11d0d3945b7e471" } as const;

export type AuthoritySandboxCoverageContractOperationFamily = "AUTH_READ_REFERENCE" | "AUTH_READ_OBLIGATIONS" | "AUTH_READ_CALCULATION" | "AUTH_CREATE_OR_AMEND_DATA" | "AUTH_DELETE_DATA" | "AUTH_TRIGGER_CALCULATION" | "AUTH_SUBMIT_FINAL_DECLARATION" | "AUTH_SUBMIT_PERIODIC_UPDATE" | "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT" | "AUTH_RECONCILE_STATUS";

export type AuthoritySandboxCoverageContractOperationCoverageEntry = {
  "provider_profile_ref": string;
  "provider_environment": string;
  "operation_family": AuthoritySandboxCoverageContractOperationFamily;
  "operation_profile_ref": string;
  "authority_binding_ref": string;
  "request_envelope_ref": string;
  "interaction_record_ref": string;
  "request_identity_namespace_hash": string;
  "duplicate_bucket_hash": string;
  "fraud_header_validation_ref_or_null": string | null;
  "coverage_outcome": "CANDIDATE_BOUND_EXERCISED";
};

export type AuthoritySandboxCoverageContractNegativePathCoverageEntry = {
  "case_code": "TOKEN_ROTATION" | "BINDING_LINEAGE_INVALIDATION" | "AMBIGUOUS_INGRESS_QUARANTINE" | "DUPLICATE_BUCKET_CHANGE" | "FRAUD_HEADER_VALIDATION" | "RECONCILIATION_BUDGET_EXHAUSTION";
  "provider_profile_ref": string;
  "operation_family": AuthoritySandboxCoverageContractOperationFamily;
  "operation_profile_ref": string;
  "request_identity_namespace_hash_or_null": string | null;
  "duplicate_bucket_hash_or_null": string | null;
  "authority_binding_ref_or_null": string | null;
  "request_envelope_ref_or_null": string | null;
  "interaction_record_ref_or_null": string | null;
  "ingress_receipt_ref_or_null": string | null;
  "expected_fail_closed_posture": "SEND_BLOCKED" | "INGRESS_QUARANTINED" | "DUPLICATE_SUPPRESSED" | "REVIEW_ESCALATED";
};

export type AuthorityTruthContract = {
  "contract_version": "AUTHORITY_TRUTH_V1";
  "boundary_scope": "AUTHORITY_INTERACTION_RECORD" | "AUTHORITY_INGRESS_RECEIPT" | "SUBMISSION_RECORD" | "OBLIGATION_MIRROR" | "WORKFLOW_ITEM" | "CLIENT_TIMELINE_EVENT";
  "truth_surface_role": "AUTHORITY_RUNTIME_LEDGER" | "AUTHORITY_INGRESS_CHECKPOINT" | "AUTHORITY_SETTLEMENT_LEDGER" | "INTERNAL_OBLIGATION_MIRROR" | "INTERNAL_WORKFLOW_COORDINATION" | "CUSTOMER_SAFE_STATUS_PROJECTION";
  "surface_specific_binding_policy": "INTERACTION_RESPONSE_MEANING_CONTROLS_SETTLEMENT" | "INGRESS_RECEIPT_MUST_NOT_DECIDE_TRUTH_UNTIL_BOUND" | "SUBMISSION_LEDGER_IS_AUTHORITY_RESULT_ONLY" | "MIRROR_IS_INTERNAL_VIEW_WITH_EXPLICIT_AUTHORITY_STATE" | "WORKFLOW_IS_COORDINATION_ONLY_WITH_EXPLICIT_AUTHORITY_STATE" | "TIMELINE_IS_CUSTOMER_SAFE_AND_EXPLICIT_ABOUT_AUTHORITY_STATE";
  "authority_confirmation_policy": "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM";
  "non_confirming_state_policy": "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING";
  "normalization_gate_policy": "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION";
  "mirror_projection_policy": "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY";
  "unresolved_projection_policy": "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED";
  "override_confirmation_policy": "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM";
  "correction_propagation_policy": "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE";
};
export const AuthorityTruthContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/authority_truth_contract.schema.json", sourceHash: "8ec4d21bb7ff13d5042ef87335b48f3b1920525111ccc4a12968bf2dc2dd9a0b" } as const;

export type AuthorizationDecision = {
  "artifact_type": "AuthorizationDecision";
  "decision_id": string;
  "principal_context_ref": string;
  "resource_class": string;
  "action_family": string;
  "decision": "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY";
  "reason_codes": Array<string>;
  "effective_scope": Array<"year_end" | "quarterly_update" | "estimate_only" | "prepare_submission" | "submit" | "amendment_intent" | "amendment_submit">;
  "effective_partition_scope_refs": Array<string>;
  "masking_rules": Array<string>;
  "required_approvals": Array<string>;
  "required_authn_level": "BASIC" | "MFA" | "STEP_UP" | null;
  "policy_snapshot_hash": string;
  "access_binding_hash": string;
  "dependency_topology_hash": string | null;
  "simulation_basis_hash": string | null;
  "delegation_snapshot_refs": Array<string>;
  "authority_link_snapshot_refs": Array<string>;
  "authority_layer_boundary": AuthorityLayerBoundaryContract & {
    "binding_scope_class"?: "AUTHORIZATION_DECISION";
  };
  "bounded_safe_mutation": 0 | 1 | null;
  "approval_requirement": "NOT_REQUIRED" | "SINGLE_APPROVER" | "DUAL_APPROVER" | "SECURITY_REVIEW" | "CHANGE_ADVISORY_QUORUM" | null;
  "evaluated_at": ISO8601DateTimeString;
};
export const AuthorizationDecisionSchemaLineage = { schemaId: "https://taxat.dev/schemas/authorization_decision.schema.json", sourceHash: "0e6c1e709c90ed63c93c8549abc297df5a9fa989dff4d00ac331e88c299c8ede" } as const;

export type ConnectorBinding = {
  "artifact_type": "ConnectorBinding";
  "binding_id": string;
  "tenant_id": string;
  "client_id": string;
  "provider": string;
  "provider_environment": string;
  "provider_api_version": string;
  "subject_ref": string;
  "scopes": Array<string>;
  "partition_scope_refs": Array<string>;
  "token_ref": string;
  "token_version_ref": string;
  "binding_lineage_ref": string;
  "lifecycle_state": "PENDING_VALIDATION" | "ACTIVE" | "LIMITED" | "TOKEN_INVALID" | "REVOKED" | "EXPIRED" | "SUPERSEDED";
  "health_state": "HEALTHY" | "LIMITED_SCOPE" | "EXPIRING_SOON" | "TOKEN_INVALID" | "CLIENT_BINDING_MISMATCH" | "DELEGATION_GAP" | "ENVIRONMENT_DRIFT" | "REVOKED" | "EXPIRED" | "UNKNOWN";
  "delegation_state": "NOT_REQUIRED" | "SATISFIED" | "LIMITED" | "MISSING" | "EXPIRED" | "UNKNOWN";
  "client_binding_state": "BOUND" | "MISMATCH" | "UNVERIFIED";
  "last_validated_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "revoked_at": ISO8601DateTimeString;
  "superseded_by_binding_id": string | null;
  "blocked_reason_codes": Array<string>;
  "source_evidence_refs": Array<string>;
};
export const ConnectorBindingSchemaLineage = { schemaId: "https://taxat.dev/schemas/connector_binding.schema.json", sourceHash: "5acd5da296acb854028adc3f1e848c1da3557e47996a7e78510ecb45b4ba3b49" } as const;

export type DelegationGrant = {
  "delegate_ref"?: string;
} | {
  "delegate_class"?: string;
};
export const DelegationGrantSchemaLineage = { schemaId: "https://taxat.dev/schemas/delegation_grant.schema.json", sourceHash: "0a8ff2754ea385ca0a0278cf49baed409fbbd6d9f717ef0c6fdffa8681182276" } as const;

export type ExceptionalAuthorityGrant = {
  "artifact_type": "ExceptionalAuthorityGrant";
  "exceptional_grant_id": string;
  "incident_ref": string;
  "target_action_family": string;
  "tenant_id": string;
  "client_id": string;
  "partition_scope_refs": Array<string>;
  "requesting_principal_ref": string;
  "requesting_principal_class": "HUMAN" | "EXTERNAL";
  "approving_principal_ref": string;
  "approving_principal_class": "HUMAN";
  "activated_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "revoked_at": ISO8601DateTimeString;
  "usage_limit": number;
  "remaining_uses": number;
  "rationale": string;
  "compensating_control_refs": Array<string>;
  "lifecycle_state": "PENDING_APPROVAL" | "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "REVOKED";
  "approval_step_up_state": "SATISFIED";
  "approval_step_up_evidence_ref": string;
  "self_approved": false;
  "authority_acknowledgement_override_permitted": false;
  "delegation_substitution_permitted": false;
  "silent_client_widening_permitted": false;
  "declaration_sign_without_signatory_basis_permitted": false;
  "truth_confirmation_override_permitted": false;
  "silent_partition_widening_permitted": false;
};
export const ExceptionalAuthorityGrantSchemaLineage = { schemaId: "https://taxat.dev/schemas/exceptional_authority_grant.schema.json", sourceHash: "4ac571c4c0de79a0a212bd8194dd409108127629a5dada7b891535c7963e4e43" } as const;

export type NightlyBatchIdentityContract = {
  "contract_version": "NIGHTLY_BATCH_IDENTITY_V1";
  "identity_contract_hash": string;
  "tenant_id": string;
  "nightly_window_key": string;
  "trigger_class": "SCHEDULED_WINDOW" | "MANUAL_RETRY_WINDOW" | "RECOVERY_RECLAIM_WINDOW";
  "release_verification_manifest_ref": string;
  "policy_snapshot_hash": string;
  "autopilot_policy_hash": string;
  "scheduler_dedupe_key": string;
  "schema_bundle_hash": string;
  "code_build_id": string;
  "environment_ref": "DEV" | "TEST" | "UAT" | "SANDBOX" | "PRODUCTION";
  "selection_universe_hash": string;
  "selection_universe_count": number;
  "reclaimed_predecessor_batch_run_ref_or_null": string | null;
  "recovery_resume_state": "NOT_APPLICABLE" | "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED" | "PREDECESSOR_SELECTION_REUSED_RESHARDED";
  "identity_binding_policy": "TENANT_WINDOW_TRIGGER_RELEASE_POLICY_AUTOPILOT_SCHEMA_BUILD_UNIVERSE_HASH";
  "same_window_duplicate_policy": "REUSE_BATCH_AND_PERSIST_EXPLICIT_CLIENT_DISPOSITIONS";
  "candidate_universe_policy": "EVERY_CANDIDATE_REQUIRES_PERSISTED_SELECTION_DISPOSITION";
  "terminal_result_reuse_policy": "REUSE_TERMINAL_RESULT_BEFORE_NEW_MANIFEST_ALLOCATION";
  "active_attempt_isolation_policy": "SAME_WINDOW_ACTIVE_ATTEMPT_REQUIRES_DEFER_OR_STALE_RECLAIM";
  "shard_failure_isolation_policy": "UNRELATED_CLIENTS_RETAIN_EXPLICIT_OUTCOME_DESPITE_SHARD_FAILURE";
  "cross_window_continuity_policy": "WINDOW_KEY_PART_OF_MANIFEST_AND_BATCH_IDENTITY";
  "recovery_lineage_policy": "SUCCESSOR_MUST_LINK_AND_RESUME_PREDECESSOR";
};
export const NightlyBatchIdentityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/nightly_batch_identity_contract.schema.json", sourceHash: "7dd3ba6dc2bfee171db16a79c73cb12b716a27b73fa7eb4c5a50d182b4d8c19a" } as const;

export type PrincipalAccessView = {
  "artifact_type": "PrincipalAccessView";
  "tenant_id": string;
  "shell_family": "GOVERNANCE_DENSITY_SHELL";
  "object_anchor_ref": string;
  "dominant_question": string;
  "settlement_state": PrincipalAccessViewSettlementState;
  "recovery_posture": PrincipalAccessViewRecoveryPosture;
  "interaction_layer": GovernanceInteractionLayer;
  "cache_isolation_contract": CacheIsolationContract & {
    "cache_scope_class"?: "PRINCIPAL_ACCESS_VIEW";
  };
  "principal_id": string;
  "principal_type": "HUMAN" | "SERVICE" | "EXTERNAL";
  "effective_role_set": Array<string>;
  "delegation_summaries": Array<PrincipalAccessViewDelegationSummary>;
  "authn_level": "BASIC" | "MFA" | "STEP_UP";
  "approval_capabilities": Array<string>;
  "run_kind_capabilities": Array<string>;
  "action_matrix": Array<PrincipalAccessViewActionMatrixCell>;
  "focus_anchor_ref": string | null;
  "access_workspace": PrincipalAccessViewAccessWorkspace;
  "selected_action_detail": null | PrincipalAccessViewSelectedActionDetail;
  "last_step_up_at": ISO8601DateTimeString;
  "last_modified_at": ISO8601DateTimeString;
};
export const PrincipalAccessViewSchemaLineage = { schemaId: "https://taxat.dev/schemas/principal_access_view.schema.json", sourceHash: "d14cf60086be7f6f1e7029ee705dd381471465fb7e48add6807a1412daa865f2" } as const;

export type PrincipalAccessViewSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type PrincipalAccessViewRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type PrincipalAccessViewInteractionLayer = {
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
};

export type PrincipalAccessViewWorkspaceMode = "PRINCIPALS" | "ROLES" | "SIMULATOR";

export type PrincipalAccessViewInspectorState = "HIDDEN" | "CELL_SELECTED" | "ROLE_EDITING" | "SIMULATION_SELECTED";

export type PrincipalAccessViewPromotedSupportSurface = "AUDIT_SIDECAR" | "AUTHORITY_CHAIN_PANEL" | "POLICY_SIMULATOR";

export type PrincipalAccessViewChainLayerOutcome = "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY" | "NOT_APPLICABLE";

export type PrincipalAccessViewDelegationSummary = {
  "client_id": string;
  "delegation_basis": "SELF_ACTING" | "CLIENT_GRANTED" | "SELF_ASSESSMENT_IMPORTED" | "DIGITAL_HANDSHAKE" | "TENANT_INTERNAL" | "SYSTEM_ASSIGNED";
  "scope_refs": Array<string>;
  "lifecycle_state": string;
  "expires_at"?: ISO8601DateTimeString;
};

export type PrincipalAccessViewAuthorityChainLayerBase = {
  "layer_code": string;
  "layer_outcome": PrincipalAccessViewChainLayerOutcome;
  "reason_codes": Array<string>;
};

export type PrincipalAccessViewSessionAuthnLayer = PrincipalAccessViewAuthorityChainLayerBase & {
  "layer_code"?: "SESSION_AUTHN_POSTURE";
};

export type PrincipalAccessViewTenantOperationalAuthorityLayer = PrincipalAccessViewAuthorityChainLayerBase & {
  "layer_code"?: "TENANT_OPERATIONAL_AUTHORITY";
};

export type PrincipalAccessViewClientDelegationCoverageLayer = PrincipalAccessViewAuthorityChainLayerBase & {
  "layer_code"?: "CLIENT_DELEGATION_COVERAGE";
};

export type PrincipalAccessViewExternalAuthorityLinkReadinessLayer = PrincipalAccessViewAuthorityChainLayerBase & {
  "layer_code"?: "EXTERNAL_AUTHORITY_LINK_READINESS";
};

export type PrincipalAccessViewAuthorityOfRecordOutcomeLayer = PrincipalAccessViewAuthorityChainLayerBase & {
  "layer_code"?: "AUTHORITY_OF_RECORD_OUTCOME";
};

export type PrincipalAccessViewAuthorityChainLayerStack = Array<PrincipalAccessViewAuthorityOfRecordOutcomeLayer>;

export type PrincipalAccessViewActionMatrixCell = {
  "cell_ref": string;
  "resource_class": string;
  "action_family": string;
  "decision": "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY";
  "reason_codes": Array<string>;
  "effective_scope": Array<string>;
  "masking_rules": Array<string>;
  "required_approvals": Array<string>;
  "required_authn_level": "BASIC" | "MFA" | "STEP_UP" | null;
  "policy_path_ref"?: string | null;
  "authority_chain_layers": PrincipalAccessViewAuthorityChainLayerStack;
};

export type PrincipalAccessViewActiveFilters = {
  "principal_types": Array<"HUMAN" | "SERVICE" | "EXTERNAL">;
  "principal_states": Array<string>;
  "role_refs": Array<string>;
  "delegated_client_refs": Array<string>;
  "recent_change_owner_refs": Array<string>;
};

export type PrincipalAccessViewAccessWorkspace = {
  "surface_order": ["PRINCIPAL_DIRECTORY","WORKSPACE_CANVAS","ACCESS_INSPECTOR","AUTHORITY_CHAIN_PANEL","POLICY_SIMULATOR"];
  "workspace_mode": PrincipalAccessViewWorkspaceMode;
  "active_filters": PrincipalAccessViewActiveFilters;
  "selected_principal_ref": string | null;
  "selected_role_template_ref": string | null;
  "selected_cell_ref": string | null;
  "grid_navigation_model": "ROW_COLUMN_ROVING_TABINDEX";
  "inspector_state": PrincipalAccessViewInspectorState;
  "promoted_support_surface": PrincipalAccessViewPromotedSupportSurface;
  "latest_simulation_ref": string | null;
  "role_editor_pending_change_refs": Array<string>;
};

export type PrincipalAccessViewSelectedActionDetail = {
  "panel_mode": "ACCESS_INSPECTOR";
  "cell_ref": string;
  "resource_class": string;
  "action_family": string;
  "decision": "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY";
  "reason_codes": Array<string>;
  "effective_scope": Array<string>;
  "masking_rules": Array<string>;
  "required_approvals": Array<string>;
  "required_authn_level": "BASIC" | "MFA" | "STEP_UP" | null;
  "policy_path_ref": string;
  "authority_chain_layers": PrincipalAccessViewAuthorityChainLayerStack;
};

export type PrincipalContext = {
  "artifact_type": "PrincipalContext";
  "principal_id": string;
  "principal_type": "HUMAN" | "SERVICE" | "EXTERNAL";
  "effective_role_set": Array<string>;
  "tenant_id": string;
  "client_scope": Array<string>;
  "requested_scope": Array<string>;
  "partition_scope_refs": Array<string>;
  "authn_level": "BASIC" | "MFA" | "STEP_UP";
  "subject_identity_assurance_level": "UNVERIFIED" | "VERIFIED" | "STEP_UP_VERIFIED";
  "session_id": string;
  "service_identity_ref": string | null;
  "delegation_basis": "SELF_ACTING" | "CLIENT_GRANTED" | "SELF_ASSESSMENT_IMPORTED" | "DIGITAL_HANDSHAKE" | "TENANT_INTERNAL" | "SYSTEM_ASSIGNED";
  "authorization_evaluated_at": ISO8601DateTimeString;
  "policy_snapshot_hash": string;
  "access_binding_hash": string;
  "delegation_snapshot_refs": Array<string>;
  "authority_link_refs": Array<string>;
  "authority_link_snapshot_refs": Array<string>;
  "masking_scope": string;
  "approval_capabilities": Array<string>;
  "client_portal_capabilities": Array<string>;
  "run_kind_capabilities": Array<string>;
};
export const PrincipalContextSchemaLineage = { schemaId: "https://taxat.dev/schemas/principal_context.schema.json", sourceHash: "28b2fdf11d31ba4d2a7a4b7328c36798b8416df04abdf364ba65399ecb5d2696" } as const;

export type ScopeExecutionBinding = {
  "binding_scope_class": "RUN_MANIFEST" | "FROZEN_EXECUTION_BINDING" | "AUTHORITY_OPERATION" | "AUTHORITY_CALCULATION_REQUEST";
  "execution_mode_or_null": "COMPLIANCE" | "ANALYSIS" | null;
  "requested_scope_family": "READ_ONLY" | "PREPARE_ONLY" | "PREPARE_AND_SUBMIT" | "AMENDMENT_INTENT" | "AMENDMENT_SUBMIT";
  "executable_scope_family": "READ_ONLY" | "PREPARE_ONLY" | "PREPARE_AND_SUBMIT" | "AMENDMENT_INTENT" | "AMENDMENT_SUBMIT";
  "requested_scope": ScopeExecutionBindingScopeArray;
  "executable_scope": ScopeExecutionBindingScopeArray;
  "executable_partition_scope_refs": Array<string>;
  "access_decision": "ALLOW" | "ALLOW_MASKED";
  "reduction_posture": "UNCHANGED" | "REDUCED_BY_AUTHORIZATION";
  "mutation_atomicity": "ATOMIC_REQUIRED" | "NARROWING_ALLOWED";
  "masking_rules": Array<string>;
  "required_approvals": Array<string>;
  "required_authn_level": "BASIC" | "MFA" | "STEP_UP" | null;
  "access_binding_hash": string;
  "reason_codes": Array<string>;
};
export const ScopeExecutionBindingSchemaLineage = { schemaId: "https://taxat.dev/schemas/scope_execution_binding.schema.json", sourceHash: "6470a226c64bfe14f18840f2e4c6b3aec5b9081ea5355e901b3f09e3999fc9ee" } as const;

export type ScopeExecutionBindingScopeArray = JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;

export const AuthorityAndAccessBindingManifest = { familyRef: "AUTHORITY_AND_ACCESS", schemaCount: 32 } as const;
