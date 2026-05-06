// DO NOT EDIT: generated downstream from packages/contracts-core.
import Foundation

public struct ActionAuthorityContract: Codable, Sendable {
  public let projection_scope: String
  public let source_module_code: JSONValue
  public let basis_hash: String
  public let projection_route_key: String
  public let projection_version: Int
  public let access_binding_hash: String
  public let visibility_cache_partition_key: String
  public let customer_safe_projection: Bool
  public let actionability_state: String
  public let primary_action_code_or_null: String?
  public let secondary_action_codes: [String]
  public let available_action_codes: [String]
  public let blocked_action_codes: [String]
  public let blocking_reason_code_or_null: String?
  public let machine_reason_codes: [String]
  public let suggested_module_code_or_null: JSONValue
  public let recovery_route_ref_or_null: String?
  public let recovery_focus_anchor_ref_or_null: String?

  public init(
    projection_scope: String,
    source_module_code: JSONValue,
    basis_hash: String,
    projection_route_key: String,
    projection_version: Int,
    access_binding_hash: String,
    visibility_cache_partition_key: String,
    customer_safe_projection: Bool,
    actionability_state: String,
    primary_action_code_or_null: String?,
    secondary_action_codes: [String],
    available_action_codes: [String],
    blocked_action_codes: [String],
    blocking_reason_code_or_null: String?,
    machine_reason_codes: [String],
    suggested_module_code_or_null: JSONValue,
    recovery_route_ref_or_null: String?,
    recovery_focus_anchor_ref_or_null: String?
  ) {
    self.projection_scope = projection_scope
    self.source_module_code = source_module_code
    self.basis_hash = basis_hash
    self.projection_route_key = projection_route_key
    self.projection_version = projection_version
    self.access_binding_hash = access_binding_hash
    self.visibility_cache_partition_key = visibility_cache_partition_key
    self.customer_safe_projection = customer_safe_projection
    self.actionability_state = actionability_state
    self.primary_action_code_or_null = primary_action_code_or_null
    self.secondary_action_codes = secondary_action_codes
    self.available_action_codes = available_action_codes
    self.blocked_action_codes = blocked_action_codes
    self.blocking_reason_code_or_null = blocking_reason_code_or_null
    self.machine_reason_codes = machine_reason_codes
    self.suggested_module_code_or_null = suggested_module_code_or_null
    self.recovery_route_ref_or_null = recovery_route_ref_or_null
    self.recovery_focus_anchor_ref_or_null = recovery_focus_anchor_ref_or_null
  }
}

public enum ActionAuthorityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/action_authority_contract.schema.json"
  public static let sourceHash = "1f7f036e3b8b69d1a342905380a79eb2e4dd840befd8d4aefcacd990c58233d6"
}

public struct ActorSession: Codable, Sendable {
  public let artifact_type: JSONValue
  public let session_id: String
  public let tenant_id: String
  public let principal_ref: String
  public let principal_class: String
  public let session_client_class: String
  public let authn_level: String
  public let step_up_state: String
  public let session_binding_hash: String
  public let csrf_ref: String?
  public let device_binding_state: String
  public let issued_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString
  public let revoked_at: ISO8601DateTimeString
  public let revocation_reason: String?
  public let step_up_completed_at: ISO8601DateTimeString
  public let last_seen_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    session_id: String,
    tenant_id: String,
    principal_ref: String,
    principal_class: String,
    session_client_class: String,
    authn_level: String,
    step_up_state: String,
    session_binding_hash: String,
    csrf_ref: String?,
    device_binding_state: String,
    issued_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString,
    revoked_at: ISO8601DateTimeString,
    revocation_reason: String?,
    step_up_completed_at: ISO8601DateTimeString,
    last_seen_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.session_id = session_id
    self.tenant_id = tenant_id
    self.principal_ref = principal_ref
    self.principal_class = principal_class
    self.session_client_class = session_client_class
    self.authn_level = authn_level
    self.step_up_state = step_up_state
    self.session_binding_hash = session_binding_hash
    self.csrf_ref = csrf_ref
    self.device_binding_state = device_binding_state
    self.issued_at = issued_at
    self.expires_at = expires_at
    self.revoked_at = revoked_at
    self.revocation_reason = revocation_reason
    self.step_up_completed_at = step_up_completed_at
    self.last_seen_at = last_seen_at
  }
}

public enum ActorSessionSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/actor_session.schema.json"
  public static let sourceHash = "a75ec9cb55c8dc2926180ee7fda3ca436631049d07d9ba90fe83d1ea842a6b3a"
}

public struct AuthorityBinding: Codable, Sendable {
  public let artifact_type: JSONValue
  public let authority_binding_id: String
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String
  public let principal_context_ref: String
  public let authorization_decision_ref: String
  public let authority_link_ref: String
  public let delegation_grant_ref: String?
  public let delegation_state: String
  public let authority_link_state: String
  public let partition_scope_refs: [String]
  public let token_binding_ref: String
  public let binding_lineage_ref: String
  public let token_version_ref: String
  public let subject_ref: String
  public let acting_party_ref: String
  public let authority_scope: String
  public let provider_environment: String
  public let provider_api_version: String
  public let access_binding_hash: String
  public let policy_snapshot_hash: String
  public let token_client_binding_state: String
  public let binding_health: String
  public let last_validated_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString
  public let blocked_reason_codes: [String]
  public let authority_layer_boundary: AuthorityLayerBoundaryContract
  public let step_up_state: String
  public let step_up_evidence_ref: String?
  public let approval_state: String
  public let approval_ref: String?
  public let binding_resolved_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    authority_binding_id: String,
    tenant_id: String,
    client_id: String,
    manifest_id: String,
    principal_context_ref: String,
    authorization_decision_ref: String,
    authority_link_ref: String,
    delegation_grant_ref: String?,
    delegation_state: String,
    authority_link_state: String,
    partition_scope_refs: [String],
    token_binding_ref: String,
    binding_lineage_ref: String,
    token_version_ref: String,
    subject_ref: String,
    acting_party_ref: String,
    authority_scope: String,
    provider_environment: String,
    provider_api_version: String,
    access_binding_hash: String,
    policy_snapshot_hash: String,
    token_client_binding_state: String,
    binding_health: String,
    last_validated_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString,
    blocked_reason_codes: [String],
    authority_layer_boundary: AuthorityLayerBoundaryContract,
    step_up_state: String,
    step_up_evidence_ref: String?,
    approval_state: String,
    approval_ref: String?,
    binding_resolved_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.authority_binding_id = authority_binding_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.principal_context_ref = principal_context_ref
    self.authorization_decision_ref = authorization_decision_ref
    self.authority_link_ref = authority_link_ref
    self.delegation_grant_ref = delegation_grant_ref
    self.delegation_state = delegation_state
    self.authority_link_state = authority_link_state
    self.partition_scope_refs = partition_scope_refs
    self.token_binding_ref = token_binding_ref
    self.binding_lineage_ref = binding_lineage_ref
    self.token_version_ref = token_version_ref
    self.subject_ref = subject_ref
    self.acting_party_ref = acting_party_ref
    self.authority_scope = authority_scope
    self.provider_environment = provider_environment
    self.provider_api_version = provider_api_version
    self.access_binding_hash = access_binding_hash
    self.policy_snapshot_hash = policy_snapshot_hash
    self.token_client_binding_state = token_client_binding_state
    self.binding_health = binding_health
    self.last_validated_at = last_validated_at
    self.expires_at = expires_at
    self.blocked_reason_codes = blocked_reason_codes
    self.authority_layer_boundary = authority_layer_boundary
    self.step_up_state = step_up_state
    self.step_up_evidence_ref = step_up_evidence_ref
    self.approval_state = approval_state
    self.approval_ref = approval_ref
    self.binding_resolved_at = binding_resolved_at
  }
}

public enum AuthorityBindingSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_binding.schema.json"
  public static let sourceHash = "02882fc03c78975fa445787e7133885b4088882cb36a58c874004ffd5c37a1ad"
}

public struct AuthorityBindingDriftSentinelContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let binding_scope_class: JSONValue
  public let sentinel_contract_hash: String
  public let binding_verification_policy: JSONValue
  public let duplicate_truth_policy: JSONValue
  public let lineage_reuse_policy: JSONValue
  public let checked_action_class: String
  public let decision_state: String
  public let checked_at: ISO8601DateTimeString
  public let tenant_id: String
  public let client_id: String
  public let authority_binding_ref: String
  public let authority_link_ref: String
  public let delegation_grant_ref_or_null: String?
  public let binding_lineage_ref: String
  public let sealed_token_version_ref: String
  public let checked_token_version_ref_or_null: String?
  public let subject_ref: String
  public let acting_party_ref: String
  public let authority_scope: String
  public let provider_environment: String
  public let provider_api_version: String
  public let access_binding_hash: String
  public let policy_snapshot_hash: String
  public let duplicate_meaning_key: String
  public let duplicate_truth_inputs_state: String
  public let latest_submission_record_ref_or_null: String?
  public let latest_obligation_mirror_ref_or_null: String?
  public let latest_ingress_receipt_ref_or_null: String?
  public let exclusive_send_claim_state: String
  public let pass_reason_code_or_null: JSONValue
  public let block_reason_codes: [String]

  public init(
    contract_version: JSONValue,
    binding_scope_class: JSONValue,
    sentinel_contract_hash: String,
    binding_verification_policy: JSONValue,
    duplicate_truth_policy: JSONValue,
    lineage_reuse_policy: JSONValue,
    checked_action_class: String,
    decision_state: String,
    checked_at: ISO8601DateTimeString,
    tenant_id: String,
    client_id: String,
    authority_binding_ref: String,
    authority_link_ref: String,
    delegation_grant_ref_or_null: String?,
    binding_lineage_ref: String,
    sealed_token_version_ref: String,
    checked_token_version_ref_or_null: String?,
    subject_ref: String,
    acting_party_ref: String,
    authority_scope: String,
    provider_environment: String,
    provider_api_version: String,
    access_binding_hash: String,
    policy_snapshot_hash: String,
    duplicate_meaning_key: String,
    duplicate_truth_inputs_state: String,
    latest_submission_record_ref_or_null: String?,
    latest_obligation_mirror_ref_or_null: String?,
    latest_ingress_receipt_ref_or_null: String?,
    exclusive_send_claim_state: String,
    pass_reason_code_or_null: JSONValue,
    block_reason_codes: [String]
  ) {
    self.contract_version = contract_version
    self.binding_scope_class = binding_scope_class
    self.sentinel_contract_hash = sentinel_contract_hash
    self.binding_verification_policy = binding_verification_policy
    self.duplicate_truth_policy = duplicate_truth_policy
    self.lineage_reuse_policy = lineage_reuse_policy
    self.checked_action_class = checked_action_class
    self.decision_state = decision_state
    self.checked_at = checked_at
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.authority_binding_ref = authority_binding_ref
    self.authority_link_ref = authority_link_ref
    self.delegation_grant_ref_or_null = delegation_grant_ref_or_null
    self.binding_lineage_ref = binding_lineage_ref
    self.sealed_token_version_ref = sealed_token_version_ref
    self.checked_token_version_ref_or_null = checked_token_version_ref_or_null
    self.subject_ref = subject_ref
    self.acting_party_ref = acting_party_ref
    self.authority_scope = authority_scope
    self.provider_environment = provider_environment
    self.provider_api_version = provider_api_version
    self.access_binding_hash = access_binding_hash
    self.policy_snapshot_hash = policy_snapshot_hash
    self.duplicate_meaning_key = duplicate_meaning_key
    self.duplicate_truth_inputs_state = duplicate_truth_inputs_state
    self.latest_submission_record_ref_or_null = latest_submission_record_ref_or_null
    self.latest_obligation_mirror_ref_or_null = latest_obligation_mirror_ref_or_null
    self.latest_ingress_receipt_ref_or_null = latest_ingress_receipt_ref_or_null
    self.exclusive_send_claim_state = exclusive_send_claim_state
    self.pass_reason_code_or_null = pass_reason_code_or_null
    self.block_reason_codes = block_reason_codes
  }
}

public enum AuthorityBindingDriftSentinelContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_binding_drift_sentinel_contract.schema.json"
  public static let sourceHash = "a1612b481daf34c09c7567f71e922f0bf3d18aec7ba082d522271f7c98f40e0e"
}

public struct AuthorityCalculationReadinessContext: Codable, Sendable {
  public let artifact_type: JSONValue
  public let calculation_readiness_context_id: String
  public let context_scope: String
  public let manifest_id: String
  public let owner_artifact_type: String
  public let owner_artifact_ref: String
  public let calculation_request_ref: String
  public let calculation_id: String
  public let calculation_type: String
  public let request_state: String
  public let result_state: String
  public let calculation_hash: String?
  public let calculation_basis_ref: String?
  public let basis_status: JSONValue
  public let basis_hash: String?
  public let user_confirmation_ref: String?
  public let confirmation_state: JSONValue
  public let parity_reusable: Bool
  public let filing_reusable: Bool
  public let validation_outcome: String
  public let reason_codes: [String]
  public let live_authority_call_executed: Bool
  public let persisted_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    calculation_readiness_context_id: String,
    context_scope: String,
    manifest_id: String,
    owner_artifact_type: String,
    owner_artifact_ref: String,
    calculation_request_ref: String,
    calculation_id: String,
    calculation_type: String,
    request_state: String,
    result_state: String,
    calculation_hash: String?,
    calculation_basis_ref: String?,
    basis_status: JSONValue,
    basis_hash: String?,
    user_confirmation_ref: String?,
    confirmation_state: JSONValue,
    parity_reusable: Bool,
    filing_reusable: Bool,
    validation_outcome: String,
    reason_codes: [String],
    live_authority_call_executed: Bool,
    persisted_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.calculation_readiness_context_id = calculation_readiness_context_id
    self.context_scope = context_scope
    self.manifest_id = manifest_id
    self.owner_artifact_type = owner_artifact_type
    self.owner_artifact_ref = owner_artifact_ref
    self.calculation_request_ref = calculation_request_ref
    self.calculation_id = calculation_id
    self.calculation_type = calculation_type
    self.request_state = request_state
    self.result_state = result_state
    self.calculation_hash = calculation_hash
    self.calculation_basis_ref = calculation_basis_ref
    self.basis_status = basis_status
    self.basis_hash = basis_hash
    self.user_confirmation_ref = user_confirmation_ref
    self.confirmation_state = confirmation_state
    self.parity_reusable = parity_reusable
    self.filing_reusable = filing_reusable
    self.validation_outcome = validation_outcome
    self.reason_codes = reason_codes
    self.live_authority_call_executed = live_authority_call_executed
    self.persisted_at = persisted_at
  }
}

public enum AuthorityCalculationReadinessContextSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_calculation_readiness_context.schema.json"
  public static let sourceHash = "6c4f7e1ec5b76862ce49eed3ddb5a0c4acf6ad58fabe87cbae5a104ae756108b"
}

public struct AuthorityCalculationRequest: Codable, Sendable {
  public let artifact_type: JSONValue
  public let calculation_request_id: String
  public let manifest_id: String
  public let tenant_id: String
  public let client_id: String
  public let calculation_type: String
  public let authority_scope: String
  public let provider_environment: String
  public let operation_profile_ref: String
  public let authority_operation_ref: String?
  public let target_obligation_ref: String?
  public let runtime_scope: [String]
  public let scope_execution_binding: ScopeExecutionBinding
  public let access_binding_hash: String
  public let request_state: String
  public let live_authority_call_executed: Bool
  public let request_envelope_ref: String?
  public let authority_interaction_ref: String?
  public let reason_codes: [String]
  public let requested_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    calculation_request_id: String,
    manifest_id: String,
    tenant_id: String,
    client_id: String,
    calculation_type: String,
    authority_scope: String,
    provider_environment: String,
    operation_profile_ref: String,
    authority_operation_ref: String?,
    target_obligation_ref: String?,
    runtime_scope: [String],
    scope_execution_binding: ScopeExecutionBinding,
    access_binding_hash: String,
    request_state: String,
    live_authority_call_executed: Bool,
    request_envelope_ref: String?,
    authority_interaction_ref: String?,
    reason_codes: [String],
    requested_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.calculation_request_id = calculation_request_id
    self.manifest_id = manifest_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.calculation_type = calculation_type
    self.authority_scope = authority_scope
    self.provider_environment = provider_environment
    self.operation_profile_ref = operation_profile_ref
    self.authority_operation_ref = authority_operation_ref
    self.target_obligation_ref = target_obligation_ref
    self.runtime_scope = runtime_scope
    self.scope_execution_binding = scope_execution_binding
    self.access_binding_hash = access_binding_hash
    self.request_state = request_state
    self.live_authority_call_executed = live_authority_call_executed
    self.request_envelope_ref = request_envelope_ref
    self.authority_interaction_ref = authority_interaction_ref
    self.reason_codes = reason_codes
    self.requested_at = requested_at
  }
}

public enum AuthorityCalculationRequestSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_calculation_request.schema.json"
  public static let sourceHash = "9c0694f3b15563bbbafbec392744cc00d40888ce0fefeb183dab49b52958791b"
}

public struct AuthorityCalculationResult: Codable, Sendable {
  public let artifact_type: JSONValue
  public let calculation_id: String
  public let calculation_request_ref: String
  public let manifest_id: String
  public let calculation_type: String
  public let result_state: String
  public let validation_outcome: String
  public let reason_codes: [String]
  public let live_authority_call_executed: Bool
  public let calculation_hash: String?
  public let retrieved_payload_ref: String?
  public let authority_response_ref: String?
  public let retrieved_at: ISO8601DateTimeString
  public let superseded_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    calculation_id: String,
    calculation_request_ref: String,
    manifest_id: String,
    calculation_type: String,
    result_state: String,
    validation_outcome: String,
    reason_codes: [String],
    live_authority_call_executed: Bool,
    calculation_hash: String?,
    retrieved_payload_ref: String?,
    authority_response_ref: String?,
    retrieved_at: ISO8601DateTimeString,
    superseded_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.calculation_id = calculation_id
    self.calculation_request_ref = calculation_request_ref
    self.manifest_id = manifest_id
    self.calculation_type = calculation_type
    self.result_state = result_state
    self.validation_outcome = validation_outcome
    self.reason_codes = reason_codes
    self.live_authority_call_executed = live_authority_call_executed
    self.calculation_hash = calculation_hash
    self.retrieved_payload_ref = retrieved_payload_ref
    self.authority_response_ref = authority_response_ref
    self.retrieved_at = retrieved_at
    self.superseded_at = superseded_at
  }
}

public enum AuthorityCalculationResultSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_calculation_result.schema.json"
  public static let sourceHash = "4a6579811ba343cb6f81a17986aba91960e65ed0c626062a31426a7d1e3b0d73"
}

public struct AuthorityIngressCorrelationContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let bound_artifact_type: JSONValue
  public let correlation_status: String
  public let lineage_binding_basis: String
  public let comparison_set_state: String
  public let resolution_state: String
  public let extracted_authority_reference_or_null: String?
  public let extracted_request_hash_or_null: String?
  public let extracted_idempotency_key_or_null: String?
  public let extracted_identity_namespace_hash_or_null: String?
  public let extracted_duplicate_meaning_key_or_null: String?
  public let candidate_lineages: [AuthorityIngressCorrelationContractCandidateLineage]
  public let correlation_reason_codes: [String]
  public let request_lineage_comparison_policy: JSONValue
  public let legal_mutation_policy: JSONValue

  public init(
    contract_version: JSONValue,
    bound_artifact_type: JSONValue,
    correlation_status: String,
    lineage_binding_basis: String,
    comparison_set_state: String,
    resolution_state: String,
    extracted_authority_reference_or_null: String?,
    extracted_request_hash_or_null: String?,
    extracted_idempotency_key_or_null: String?,
    extracted_identity_namespace_hash_or_null: String?,
    extracted_duplicate_meaning_key_or_null: String?,
    candidate_lineages: [AuthorityIngressCorrelationContractCandidateLineage],
    correlation_reason_codes: [String],
    request_lineage_comparison_policy: JSONValue,
    legal_mutation_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.bound_artifact_type = bound_artifact_type
    self.correlation_status = correlation_status
    self.lineage_binding_basis = lineage_binding_basis
    self.comparison_set_state = comparison_set_state
    self.resolution_state = resolution_state
    self.extracted_authority_reference_or_null = extracted_authority_reference_or_null
    self.extracted_request_hash_or_null = extracted_request_hash_or_null
    self.extracted_idempotency_key_or_null = extracted_idempotency_key_or_null
    self.extracted_identity_namespace_hash_or_null = extracted_identity_namespace_hash_or_null
    self.extracted_duplicate_meaning_key_or_null = extracted_duplicate_meaning_key_or_null
    self.candidate_lineages = candidate_lineages
    self.correlation_reason_codes = correlation_reason_codes
    self.request_lineage_comparison_policy = request_lineage_comparison_policy
    self.legal_mutation_policy = legal_mutation_policy
  }
}

public struct AuthorityIngressCorrelationContractCandidateLineage: Codable, Sendable {
  public let candidate_rank: Int
  public let interaction_ref: String
  public let authority_reference_or_null: String?
  public let request_hash_or_null: String?
  public let idempotency_key_or_null: String?
  public let identity_namespace_hash_or_null: String?
  public let duplicate_meaning_key_or_null: String?
  public let latest_submission_record_ref_or_null: String?
  public let latest_obligation_mirror_ref_or_null: String?
  public let match_basis_codes: [String]
  public let divergence_reason_codes: [String]

  public init(
    candidate_rank: Int,
    interaction_ref: String,
    authority_reference_or_null: String?,
    request_hash_or_null: String?,
    idempotency_key_or_null: String?,
    identity_namespace_hash_or_null: String?,
    duplicate_meaning_key_or_null: String?,
    latest_submission_record_ref_or_null: String?,
    latest_obligation_mirror_ref_or_null: String?,
    match_basis_codes: [String],
    divergence_reason_codes: [String]
  ) {
    self.candidate_rank = candidate_rank
    self.interaction_ref = interaction_ref
    self.authority_reference_or_null = authority_reference_or_null
    self.request_hash_or_null = request_hash_or_null
    self.idempotency_key_or_null = idempotency_key_or_null
    self.identity_namespace_hash_or_null = identity_namespace_hash_or_null
    self.duplicate_meaning_key_or_null = duplicate_meaning_key_or_null
    self.latest_submission_record_ref_or_null = latest_submission_record_ref_or_null
    self.latest_obligation_mirror_ref_or_null = latest_obligation_mirror_ref_or_null
    self.match_basis_codes = match_basis_codes
    self.divergence_reason_codes = divergence_reason_codes
  }
}

public enum AuthorityIngressCorrelationContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_ingress_correlation_contract.schema.json"
  public static let sourceHash = "8622939e089e1d3e56cf0fe145ec76aabdffabca8ffd897ac3a3ad9c54c114cb"
}

public struct AuthorityIngressInvestigationSnapshot: Codable, Sendable {
  public let artifact_type: JSONValue
  public let investigation_id: String
  public let ingress_receipt_ref: String
  public let provider_environment: String
  public let provider_profile_ref: String
  public let ingress_channel_class: String
  public let receipt_state: String
  public let correlation_status: String
  public let authenticated_channel_state: String
  public let response_body_ref: String?
  public let response_body_hash: String
  public let delivery_dedupe_key: String
  public let authority_reference_or_null: String?
  public let bound_interaction_ref_or_null: String?
  public let normalized_response_ref_or_null: String?
  public let authority_ingress_proof_contract: AuthorityIngressProofContract
  public let authority_ingress_correlation_contract: AuthorityIngressCorrelationContract
  public let delivery_lineage: AuthorityIngressInvestigationSnapshotDeliveryLineage
  public let quarantine_explainability: AuthorityIngressInvestigationSnapshotQuarantineExplainability
  public let safe_next_action_codes: [String]
  public let investigation_source_policy: JSONValue
  public let legal_mutation_policy: JSONValue
  public let updated_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    investigation_id: String,
    ingress_receipt_ref: String,
    provider_environment: String,
    provider_profile_ref: String,
    ingress_channel_class: String,
    receipt_state: String,
    correlation_status: String,
    authenticated_channel_state: String,
    response_body_ref: String?,
    response_body_hash: String,
    delivery_dedupe_key: String,
    authority_reference_or_null: String?,
    bound_interaction_ref_or_null: String?,
    normalized_response_ref_or_null: String?,
    authority_ingress_proof_contract: AuthorityIngressProofContract,
    authority_ingress_correlation_contract: AuthorityIngressCorrelationContract,
    delivery_lineage: AuthorityIngressInvestigationSnapshotDeliveryLineage,
    quarantine_explainability: AuthorityIngressInvestigationSnapshotQuarantineExplainability,
    safe_next_action_codes: [String],
    investigation_source_policy: JSONValue,
    legal_mutation_policy: JSONValue,
    updated_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.investigation_id = investigation_id
    self.ingress_receipt_ref = ingress_receipt_ref
    self.provider_environment = provider_environment
    self.provider_profile_ref = provider_profile_ref
    self.ingress_channel_class = ingress_channel_class
    self.receipt_state = receipt_state
    self.correlation_status = correlation_status
    self.authenticated_channel_state = authenticated_channel_state
    self.response_body_ref = response_body_ref
    self.response_body_hash = response_body_hash
    self.delivery_dedupe_key = delivery_dedupe_key
    self.authority_reference_or_null = authority_reference_or_null
    self.bound_interaction_ref_or_null = bound_interaction_ref_or_null
    self.normalized_response_ref_or_null = normalized_response_ref_or_null
    self.authority_ingress_proof_contract = authority_ingress_proof_contract
    self.authority_ingress_correlation_contract = authority_ingress_correlation_contract
    self.delivery_lineage = delivery_lineage
    self.quarantine_explainability = quarantine_explainability
    self.safe_next_action_codes = safe_next_action_codes
    self.investigation_source_policy = investigation_source_policy
    self.legal_mutation_policy = legal_mutation_policy
    self.updated_at = updated_at
  }
}

public struct AuthorityIngressInvestigationSnapshotDeliveryLineage: Codable, Sendable {
  public let delivery_novelty_state: String
  public let canonical_ingress_receipt_ref_or_self: String
  public let related_duplicate_receipt_refs: [String]

  public init(
    delivery_novelty_state: String,
    canonical_ingress_receipt_ref_or_self: String,
    related_duplicate_receipt_refs: [String]
  ) {
    self.delivery_novelty_state = delivery_novelty_state
    self.canonical_ingress_receipt_ref_or_self = canonical_ingress_receipt_ref_or_self
    self.related_duplicate_receipt_refs = related_duplicate_receipt_refs
  }
}

public struct AuthorityIngressInvestigationSnapshotQuarantineExplainability: Codable, Sendable {
  public let reason_codes: [String]
  public let comparison_candidate_refs: [String]
  public let supporting_audit_event_refs: [String]
  public let current_owner_ref_or_null: String?
  public let resolution_state: String
  public let blocked_mutation_reason_codes: [String]

  public init(
    reason_codes: [String],
    comparison_candidate_refs: [String],
    supporting_audit_event_refs: [String],
    current_owner_ref_or_null: String?,
    resolution_state: String,
    blocked_mutation_reason_codes: [String]
  ) {
    self.reason_codes = reason_codes
    self.comparison_candidate_refs = comparison_candidate_refs
    self.supporting_audit_event_refs = supporting_audit_event_refs
    self.current_owner_ref_or_null = current_owner_ref_or_null
    self.resolution_state = resolution_state
    self.blocked_mutation_reason_codes = blocked_mutation_reason_codes
  }
}

public enum AuthorityIngressInvestigationSnapshotSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_ingress_investigation_snapshot.schema.json"
  public static let sourceHash = "2c30cad1b59e20e100b52cd010fa9c35020bef7c2182eace9e6b72e381d1f9e4"
}

public struct AuthorityIngressProofContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let binding_scope_class: String
  public let ingress_channel_class_or_null: JSONValue
  public let authenticated_channel_state: String
  public let authentication_evidence_modes: [String]
  public let authentication_evidence_refs: [String]
  public let delivery_identity_basis: JSONValue
  public let provider_delivery_ref_or_null: String?
  public let response_body_hash_or_null: String?
  public let ingress_channel_metadata_hash_or_null: String?
  public let delivery_dedupe_key_or_null: String?
  public let correlation_status_or_null: JSONValue
  public let lineage_binding_basis: String
  public let canonical_ingress_receipt_ref_or_null: String?
  public let bound_interaction_ref_or_null: String?
  public let authority_reference_or_null: String?
  public let request_hash_or_null: String?
  public let idempotency_key_or_null: String?
  public let identity_namespace_hash_or_null: String?
  public let duplicate_meaning_key_or_null: String?
  public let request_lineage_proof_hash_or_null: String?
  public let normalized_response_ref_or_null: String?
  public let mutation_gate_state: String
  public let heuristic_correlation_policy: JSONValue
  public let transport_memory_mutation_policy: JSONValue

  public init(
    contract_version: JSONValue,
    binding_scope_class: String,
    ingress_channel_class_or_null: JSONValue,
    authenticated_channel_state: String,
    authentication_evidence_modes: [String],
    authentication_evidence_refs: [String],
    delivery_identity_basis: JSONValue,
    provider_delivery_ref_or_null: String?,
    response_body_hash_or_null: String?,
    ingress_channel_metadata_hash_or_null: String?,
    delivery_dedupe_key_or_null: String?,
    correlation_status_or_null: JSONValue,
    lineage_binding_basis: String,
    canonical_ingress_receipt_ref_or_null: String?,
    bound_interaction_ref_or_null: String?,
    authority_reference_or_null: String?,
    request_hash_or_null: String?,
    idempotency_key_or_null: String?,
    identity_namespace_hash_or_null: String?,
    duplicate_meaning_key_or_null: String?,
    request_lineage_proof_hash_or_null: String?,
    normalized_response_ref_or_null: String?,
    mutation_gate_state: String,
    heuristic_correlation_policy: JSONValue,
    transport_memory_mutation_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.binding_scope_class = binding_scope_class
    self.ingress_channel_class_or_null = ingress_channel_class_or_null
    self.authenticated_channel_state = authenticated_channel_state
    self.authentication_evidence_modes = authentication_evidence_modes
    self.authentication_evidence_refs = authentication_evidence_refs
    self.delivery_identity_basis = delivery_identity_basis
    self.provider_delivery_ref_or_null = provider_delivery_ref_or_null
    self.response_body_hash_or_null = response_body_hash_or_null
    self.ingress_channel_metadata_hash_or_null = ingress_channel_metadata_hash_or_null
    self.delivery_dedupe_key_or_null = delivery_dedupe_key_or_null
    self.correlation_status_or_null = correlation_status_or_null
    self.lineage_binding_basis = lineage_binding_basis
    self.canonical_ingress_receipt_ref_or_null = canonical_ingress_receipt_ref_or_null
    self.bound_interaction_ref_or_null = bound_interaction_ref_or_null
    self.authority_reference_or_null = authority_reference_or_null
    self.request_hash_or_null = request_hash_or_null
    self.idempotency_key_or_null = idempotency_key_or_null
    self.identity_namespace_hash_or_null = identity_namespace_hash_or_null
    self.duplicate_meaning_key_or_null = duplicate_meaning_key_or_null
    self.request_lineage_proof_hash_or_null = request_lineage_proof_hash_or_null
    self.normalized_response_ref_or_null = normalized_response_ref_or_null
    self.mutation_gate_state = mutation_gate_state
    self.heuristic_correlation_policy = heuristic_correlation_policy
    self.transport_memory_mutation_policy = transport_memory_mutation_policy
  }
}

public enum AuthorityIngressProofContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_ingress_proof_contract.schema.json"
  public static let sourceHash = "dda61f1e59d20ef5ca63737f2130a041ec946e46ea545b7bf833959e63fa4194"
}

public struct AuthorityIngressReceipt: Codable, Sendable {
  public let artifact_type: JSONValue
  public let ingress_receipt_id: String
  public let provider_environment: String
  public let provider_profile_ref: String
  public let ingress_channel_class: String
  public let provider_delivery_ref: String
  public let response_body_ref: String?
  public let response_body_hash: String
  public let ingress_channel_metadata_hash: String
  public let delivery_dedupe_key: String
  public let authority_reference: String?
  public let request_hash: String?
  public let idempotency_key: String?
  public let identity_namespace_hash: String?
  public let duplicate_meaning_key: String?
  public let bound_interaction_ref: String?
  public let authority_truth_contract: AuthorityTruthContract
  public let correlation_status: String
  public let authenticated_channel_state: String
  public let authority_ingress_proof_contract: AuthorityIngressProofContract
  public let authority_ingress_correlation_contract: AuthorityIngressCorrelationContract
  public let receipt_state: String
  public let received_at: ISO8601DateTimeString
  public let persisted_at: ISO8601DateTimeString
  public let quarantined_at: ISO8601DateTimeString
  public let quarantine_reason_codes: [String]
  public let canonical_ingress_receipt_ref: String?
  public let reconciliation_owner_ref: String?
  public let normalized_response_ref: String?
  public let audit_event_refs: [String]

  public init(
    artifact_type: JSONValue,
    ingress_receipt_id: String,
    provider_environment: String,
    provider_profile_ref: String,
    ingress_channel_class: String,
    provider_delivery_ref: String,
    response_body_ref: String?,
    response_body_hash: String,
    ingress_channel_metadata_hash: String,
    delivery_dedupe_key: String,
    authority_reference: String?,
    request_hash: String?,
    idempotency_key: String?,
    identity_namespace_hash: String?,
    duplicate_meaning_key: String?,
    bound_interaction_ref: String?,
    authority_truth_contract: AuthorityTruthContract,
    correlation_status: String,
    authenticated_channel_state: String,
    authority_ingress_proof_contract: AuthorityIngressProofContract,
    authority_ingress_correlation_contract: AuthorityIngressCorrelationContract,
    receipt_state: String,
    received_at: ISO8601DateTimeString,
    persisted_at: ISO8601DateTimeString,
    quarantined_at: ISO8601DateTimeString,
    quarantine_reason_codes: [String],
    canonical_ingress_receipt_ref: String?,
    reconciliation_owner_ref: String?,
    normalized_response_ref: String?,
    audit_event_refs: [String]
  ) {
    self.artifact_type = artifact_type
    self.ingress_receipt_id = ingress_receipt_id
    self.provider_environment = provider_environment
    self.provider_profile_ref = provider_profile_ref
    self.ingress_channel_class = ingress_channel_class
    self.provider_delivery_ref = provider_delivery_ref
    self.response_body_ref = response_body_ref
    self.response_body_hash = response_body_hash
    self.ingress_channel_metadata_hash = ingress_channel_metadata_hash
    self.delivery_dedupe_key = delivery_dedupe_key
    self.authority_reference = authority_reference
    self.request_hash = request_hash
    self.idempotency_key = idempotency_key
    self.identity_namespace_hash = identity_namespace_hash
    self.duplicate_meaning_key = duplicate_meaning_key
    self.bound_interaction_ref = bound_interaction_ref
    self.authority_truth_contract = authority_truth_contract
    self.correlation_status = correlation_status
    self.authenticated_channel_state = authenticated_channel_state
    self.authority_ingress_proof_contract = authority_ingress_proof_contract
    self.authority_ingress_correlation_contract = authority_ingress_correlation_contract
    self.receipt_state = receipt_state
    self.received_at = received_at
    self.persisted_at = persisted_at
    self.quarantined_at = quarantined_at
    self.quarantine_reason_codes = quarantine_reason_codes
    self.canonical_ingress_receipt_ref = canonical_ingress_receipt_ref
    self.reconciliation_owner_ref = reconciliation_owner_ref
    self.normalized_response_ref = normalized_response_ref
    self.audit_event_refs = audit_event_refs
  }
}

public enum AuthorityIngressReceiptSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_ingress_receipt.schema.json"
  public static let sourceHash = "e4815200450d19e9488f76eeab7f2ec31b77d0c9bcf23cd54664895b62d9f797"
}

public struct AuthorityInteractionRecord: Codable, Sendable {
  public let interaction_id: String
  public let manifest_id: String
  public let operation_id: String
  public let request_id: String
  public let authority_operation_profile_ref: String
  public let request_identity_contract: AuthorityRequestIdentityContract
  public let binding_drift_sentinel_contract: AuthorityBindingDriftSentinelContract
  public let request_hash: String
  public let idempotency_key: String
  public let identity_namespace_hash: String
  public let duplicate_meaning_key: String
  public let authority_ingress_proof_contract: JSONValue
  public let authority_binding_ref: String
  public let authority_link_ref: String
  public let binding_lineage_ref: String
  public let access_binding_hash: String
  public let policy_snapshot_hash: String
  public let truth_boundary_contract: JSONValue
  public let authority_truth_contract: AuthorityTruthContract
  public let lifecycle_state: String
  public let created_at: ISO8601DateTimeString
  public let last_status_at: ISO8601DateTimeString
  public let active_response_id: String?
  public let response_history_ids: [String]
  public let meaning_resolution_state: String
  public let submission_record_ref: String?
  public let dispatch_ref: String
  public let send_revalidation_state: String
  public let send_revalidated_at: ISO8601DateTimeString
  public let send_authorized_token_version_ref: String?
  public let send_revalidation_reason_codes: [String]
  public let reconciliation_method: String
  public let max_auto_reconciliation_attempts: Int
  public let reconciliation_cadence_seconds: Int?
  public let reconciliation_budget_state: String
  public let next_reconciliation_at: ISO8601DateTimeString
  public let reconciliation_attempt_count: Int
  public let reconciliation_deadline_at: ISO8601DateTimeString
  public let reconciliation_escalated_at: ISO8601DateTimeString
  public let reconciliation_workflow_item_ref: String?
  public let resend_legality_state: String
  public let resend_control_reason_codes: [String]
  public let reconciliation_control_contract: AuthorityReconciliationControlContract
  public let audit_refs: [String]
  public let provenance_refs: [String]
  public let resolution_basis: JSONValue
  public let abandonment_reason_code: String?

  public init(
    interaction_id: String,
    manifest_id: String,
    operation_id: String,
    request_id: String,
    authority_operation_profile_ref: String,
    request_identity_contract: AuthorityRequestIdentityContract,
    binding_drift_sentinel_contract: AuthorityBindingDriftSentinelContract,
    request_hash: String,
    idempotency_key: String,
    identity_namespace_hash: String,
    duplicate_meaning_key: String,
    authority_ingress_proof_contract: JSONValue,
    authority_binding_ref: String,
    authority_link_ref: String,
    binding_lineage_ref: String,
    access_binding_hash: String,
    policy_snapshot_hash: String,
    truth_boundary_contract: JSONValue,
    authority_truth_contract: AuthorityTruthContract,
    lifecycle_state: String,
    created_at: ISO8601DateTimeString,
    last_status_at: ISO8601DateTimeString,
    active_response_id: String?,
    response_history_ids: [String],
    meaning_resolution_state: String,
    submission_record_ref: String?,
    dispatch_ref: String,
    send_revalidation_state: String,
    send_revalidated_at: ISO8601DateTimeString,
    send_authorized_token_version_ref: String?,
    send_revalidation_reason_codes: [String],
    reconciliation_method: String,
    max_auto_reconciliation_attempts: Int,
    reconciliation_cadence_seconds: Int?,
    reconciliation_budget_state: String,
    next_reconciliation_at: ISO8601DateTimeString,
    reconciliation_attempt_count: Int,
    reconciliation_deadline_at: ISO8601DateTimeString,
    reconciliation_escalated_at: ISO8601DateTimeString,
    reconciliation_workflow_item_ref: String?,
    resend_legality_state: String,
    resend_control_reason_codes: [String],
    reconciliation_control_contract: AuthorityReconciliationControlContract,
    audit_refs: [String],
    provenance_refs: [String],
    resolution_basis: JSONValue,
    abandonment_reason_code: String?
  ) {
    self.interaction_id = interaction_id
    self.manifest_id = manifest_id
    self.operation_id = operation_id
    self.request_id = request_id
    self.authority_operation_profile_ref = authority_operation_profile_ref
    self.request_identity_contract = request_identity_contract
    self.binding_drift_sentinel_contract = binding_drift_sentinel_contract
    self.request_hash = request_hash
    self.idempotency_key = idempotency_key
    self.identity_namespace_hash = identity_namespace_hash
    self.duplicate_meaning_key = duplicate_meaning_key
    self.authority_ingress_proof_contract = authority_ingress_proof_contract
    self.authority_binding_ref = authority_binding_ref
    self.authority_link_ref = authority_link_ref
    self.binding_lineage_ref = binding_lineage_ref
    self.access_binding_hash = access_binding_hash
    self.policy_snapshot_hash = policy_snapshot_hash
    self.truth_boundary_contract = truth_boundary_contract
    self.authority_truth_contract = authority_truth_contract
    self.lifecycle_state = lifecycle_state
    self.created_at = created_at
    self.last_status_at = last_status_at
    self.active_response_id = active_response_id
    self.response_history_ids = response_history_ids
    self.meaning_resolution_state = meaning_resolution_state
    self.submission_record_ref = submission_record_ref
    self.dispatch_ref = dispatch_ref
    self.send_revalidation_state = send_revalidation_state
    self.send_revalidated_at = send_revalidated_at
    self.send_authorized_token_version_ref = send_authorized_token_version_ref
    self.send_revalidation_reason_codes = send_revalidation_reason_codes
    self.reconciliation_method = reconciliation_method
    self.max_auto_reconciliation_attempts = max_auto_reconciliation_attempts
    self.reconciliation_cadence_seconds = reconciliation_cadence_seconds
    self.reconciliation_budget_state = reconciliation_budget_state
    self.next_reconciliation_at = next_reconciliation_at
    self.reconciliation_attempt_count = reconciliation_attempt_count
    self.reconciliation_deadline_at = reconciliation_deadline_at
    self.reconciliation_escalated_at = reconciliation_escalated_at
    self.reconciliation_workflow_item_ref = reconciliation_workflow_item_ref
    self.resend_legality_state = resend_legality_state
    self.resend_control_reason_codes = resend_control_reason_codes
    self.reconciliation_control_contract = reconciliation_control_contract
    self.audit_refs = audit_refs
    self.provenance_refs = provenance_refs
    self.resolution_basis = resolution_basis
    self.abandonment_reason_code = abandonment_reason_code
  }
}

public enum AuthorityInteractionRecordSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_interaction_record.schema.json"
  public static let sourceHash = "bf1f6d39bb02f320e92165a709e657f4148c0a191ce40b7e17d2f83bb357085d"
}

public struct AuthorityLayerBoundaryContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let binding_scope_class: String
  public let integration_capability: String
  public let active_principal_class: String
  public let tenant_permission_state: String
  public let client_delegation_state: String
  public let delegation_basis: String
  public let delegation_freshness_state: String
  public let authority_link_state: String
  public let exceptional_authority_state: String
  public let human_gate_requirement: String
  public let human_gate_resolution_state: String
  public let authority_truth_precedence_policy: JSONValue
  public let tenant_permission_substitution_policy: JSONValue
  public let link_delegation_independence_policy: JSONValue
  public let exceptional_scope_policy: JSONValue
  public let service_human_gate_satisfaction_permitted: JSONValue
  public let exceptional_authority_may_substitute_for_delegation: JSONValue
  public let exceptional_authority_may_override_authority_truth: JSONValue
  public let exceptional_authority_may_widen_client_scope: JSONValue
  public let exceptional_authority_may_widen_partition_scope: JSONValue

  public init(
    contract_version: JSONValue,
    binding_scope_class: String,
    integration_capability: String,
    active_principal_class: String,
    tenant_permission_state: String,
    client_delegation_state: String,
    delegation_basis: String,
    delegation_freshness_state: String,
    authority_link_state: String,
    exceptional_authority_state: String,
    human_gate_requirement: String,
    human_gate_resolution_state: String,
    authority_truth_precedence_policy: JSONValue,
    tenant_permission_substitution_policy: JSONValue,
    link_delegation_independence_policy: JSONValue,
    exceptional_scope_policy: JSONValue,
    service_human_gate_satisfaction_permitted: JSONValue,
    exceptional_authority_may_substitute_for_delegation: JSONValue,
    exceptional_authority_may_override_authority_truth: JSONValue,
    exceptional_authority_may_widen_client_scope: JSONValue,
    exceptional_authority_may_widen_partition_scope: JSONValue
  ) {
    self.contract_version = contract_version
    self.binding_scope_class = binding_scope_class
    self.integration_capability = integration_capability
    self.active_principal_class = active_principal_class
    self.tenant_permission_state = tenant_permission_state
    self.client_delegation_state = client_delegation_state
    self.delegation_basis = delegation_basis
    self.delegation_freshness_state = delegation_freshness_state
    self.authority_link_state = authority_link_state
    self.exceptional_authority_state = exceptional_authority_state
    self.human_gate_requirement = human_gate_requirement
    self.human_gate_resolution_state = human_gate_resolution_state
    self.authority_truth_precedence_policy = authority_truth_precedence_policy
    self.tenant_permission_substitution_policy = tenant_permission_substitution_policy
    self.link_delegation_independence_policy = link_delegation_independence_policy
    self.exceptional_scope_policy = exceptional_scope_policy
    self.service_human_gate_satisfaction_permitted = service_human_gate_satisfaction_permitted
    self.exceptional_authority_may_substitute_for_delegation = exceptional_authority_may_substitute_for_delegation
    self.exceptional_authority_may_override_authority_truth = exceptional_authority_may_override_authority_truth
    self.exceptional_authority_may_widen_client_scope = exceptional_authority_may_widen_client_scope
    self.exceptional_authority_may_widen_partition_scope = exceptional_authority_may_widen_partition_scope
  }
}

public enum AuthorityLayerBoundaryContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_layer_boundary_contract.schema.json"
  public static let sourceHash = "5d8379487b939b840bb99ae8ffa83124517b2f7d9106ef9c6289342aa0333952"
}

public struct AuthorityLink: Codable, Sendable {
  public let artifact_type: JSONValue
  public let authority_link_id: String
  public let tenant_id: String
  public let client_id: String
  public let reporting_subject_ref: String
  public let authority_name: String
  public let authority_scope: String
  public let provider_environment: String
  public let provider_api_version: String
  public let authorised_party_ref: String
  public let delegation_grant_ref: String?
  public let partition_scope_refs: [String]
  public let token_binding_profile_ref: String?
  public let validated_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString
  public let revoked_at: ISO8601DateTimeString
  public let superseded_by_link_id: String?
  public let lifecycle_state: String
  public let binding_health: String
  public let delegation_state: String
  public let token_client_binding_state: String
  public let source_evidence_refs: [String]
  public let blocked_reason_codes: [String]
  public let last_binding_check_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    authority_link_id: String,
    tenant_id: String,
    client_id: String,
    reporting_subject_ref: String,
    authority_name: String,
    authority_scope: String,
    provider_environment: String,
    provider_api_version: String,
    authorised_party_ref: String,
    delegation_grant_ref: String?,
    partition_scope_refs: [String],
    token_binding_profile_ref: String?,
    validated_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString,
    revoked_at: ISO8601DateTimeString,
    superseded_by_link_id: String?,
    lifecycle_state: String,
    binding_health: String,
    delegation_state: String,
    token_client_binding_state: String,
    source_evidence_refs: [String],
    blocked_reason_codes: [String],
    last_binding_check_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.authority_link_id = authority_link_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.reporting_subject_ref = reporting_subject_ref
    self.authority_name = authority_name
    self.authority_scope = authority_scope
    self.provider_environment = provider_environment
    self.provider_api_version = provider_api_version
    self.authorised_party_ref = authorised_party_ref
    self.delegation_grant_ref = delegation_grant_ref
    self.partition_scope_refs = partition_scope_refs
    self.token_binding_profile_ref = token_binding_profile_ref
    self.validated_at = validated_at
    self.expires_at = expires_at
    self.revoked_at = revoked_at
    self.superseded_by_link_id = superseded_by_link_id
    self.lifecycle_state = lifecycle_state
    self.binding_health = binding_health
    self.delegation_state = delegation_state
    self.token_client_binding_state = token_client_binding_state
    self.source_evidence_refs = source_evidence_refs
    self.blocked_reason_codes = blocked_reason_codes
    self.last_binding_check_at = last_binding_check_at
  }
}

public enum AuthorityLinkSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_link.schema.json"
  public static let sourceHash = "c4d35be54a4a6ceb5d2887d97890b07daef144c69fc96f5b04a7e6368a226af3"
}

public struct AuthorityLinkInventoryItem: Codable, Sendable {
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let shell_family: JSONValue
  public let object_anchor_ref: String
  public let dominant_question: String
  public let settlement_state: AuthorityLinkInventoryItemSettlementState
  public let recovery_posture: AuthorityLinkInventoryItemRecoveryPosture
  public let interaction_layer: JSONValue
  public let authority_link_id: String
  public let client_id: String
  public let authority_scope: String
  public let provider_environment: String
  public let lifecycle_state: AuthorityLinkInventoryItemLifecycleState
  public let binding_health: AuthorityLinkInventoryItemBindingHealth
  public let delegation_state: AuthorityLinkInventoryItemDelegationState
  public let token_client_binding_state: AuthorityLinkInventoryItemTokenClientBindingState
  public let last_validated_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString?
  public let blocked_reason_codes: [String]?
  public let focus_anchor_ref: String
  public let externalization_governance_contract: JSONValue
  public let authority_link_workspace: AuthorityLinkInventoryItemAuthorityLinkWorkspace
  public let guided_handshake_stepper: AuthorityLinkInventoryItemGuidedHandshakeStepper
  public let binding_health_timeline: AuthorityLinkInventoryItemBindingHealthTimeline
  public let handshake_history: AuthorityLinkInventoryItemHandshakeHistory
  public let affected_operation_list: AuthorityLinkInventoryItemAffectedOperationList
  public let preflight_checklist: AuthorityLinkInventoryItemPreflightChecklist
  public let affected_operation_counts: AuthorityLinkInventoryItemAffectedOperationCounts

  public init(
    artifact_type: JSONValue,
    tenant_id: String,
    shell_family: JSONValue,
    object_anchor_ref: String,
    dominant_question: String,
    settlement_state: AuthorityLinkInventoryItemSettlementState,
    recovery_posture: AuthorityLinkInventoryItemRecoveryPosture,
    interaction_layer: JSONValue,
    authority_link_id: String,
    client_id: String,
    authority_scope: String,
    provider_environment: String,
    lifecycle_state: AuthorityLinkInventoryItemLifecycleState,
    binding_health: AuthorityLinkInventoryItemBindingHealth,
    delegation_state: AuthorityLinkInventoryItemDelegationState,
    token_client_binding_state: AuthorityLinkInventoryItemTokenClientBindingState,
    last_validated_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString? = nil,
    blocked_reason_codes: [String]? = nil,
    focus_anchor_ref: String,
    externalization_governance_contract: JSONValue,
    authority_link_workspace: AuthorityLinkInventoryItemAuthorityLinkWorkspace,
    guided_handshake_stepper: AuthorityLinkInventoryItemGuidedHandshakeStepper,
    binding_health_timeline: AuthorityLinkInventoryItemBindingHealthTimeline,
    handshake_history: AuthorityLinkInventoryItemHandshakeHistory,
    affected_operation_list: AuthorityLinkInventoryItemAffectedOperationList,
    preflight_checklist: AuthorityLinkInventoryItemPreflightChecklist,
    affected_operation_counts: AuthorityLinkInventoryItemAffectedOperationCounts
  ) {
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.shell_family = shell_family
    self.object_anchor_ref = object_anchor_ref
    self.dominant_question = dominant_question
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.interaction_layer = interaction_layer
    self.authority_link_id = authority_link_id
    self.client_id = client_id
    self.authority_scope = authority_scope
    self.provider_environment = provider_environment
    self.lifecycle_state = lifecycle_state
    self.binding_health = binding_health
    self.delegation_state = delegation_state
    self.token_client_binding_state = token_client_binding_state
    self.last_validated_at = last_validated_at
    self.expires_at = expires_at
    self.blocked_reason_codes = blocked_reason_codes
    self.focus_anchor_ref = focus_anchor_ref
    self.externalization_governance_contract = externalization_governance_contract
    self.authority_link_workspace = authority_link_workspace
    self.guided_handshake_stepper = guided_handshake_stepper
    self.binding_health_timeline = binding_health_timeline
    self.handshake_history = handshake_history
    self.affected_operation_list = affected_operation_list
    self.preflight_checklist = preflight_checklist
    self.affected_operation_counts = affected_operation_counts
  }
}

public enum AuthorityLinkInventoryItemSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum AuthorityLinkInventoryItemRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public struct AuthorityLinkInventoryItemInteractionLayer: Codable, Sendable {
  public let selected_filter_chip_refs: [String]
  public let compaction_mode: String
  public let auxiliary_surface_presentation: String
  public let focus_trap_mode: String
  public let selection_persistence_mode: JSONValue
  public let preserved_context_codes: [String]

  public init(
    selected_filter_chip_refs: [String],
    compaction_mode: String,
    auxiliary_surface_presentation: String,
    focus_trap_mode: String,
    selection_persistence_mode: JSONValue,
    preserved_context_codes: [String]
  ) {
    self.selected_filter_chip_refs = selected_filter_chip_refs
    self.compaction_mode = compaction_mode
    self.auxiliary_surface_presentation = auxiliary_surface_presentation
    self.focus_trap_mode = focus_trap_mode
    self.selection_persistence_mode = selection_persistence_mode
    self.preserved_context_codes = preserved_context_codes
  }
}

public enum AuthorityLinkInventoryItemLifecycleState: String, Codable, Sendable {
  case uNLINKED = "UNLINKED"
  case lINKINITIATED = "LINK_INITIATED"
  case aUTHORISEDACTIVE = "AUTHORISED_ACTIVE"
  case aUTHORISEDLIMITED = "AUTHORISED_LIMITED"
  case tOKENINVALID = "TOKEN_INVALID"
  case rEVOKED = "REVOKED"
  case eXPIRED = "EXPIRED"
}

public enum AuthorityLinkInventoryItemBindingHealth: String, Codable, Sendable {
  case hEALTHY = "HEALTHY"
  case lIMITEDSCOPE = "LIMITED_SCOPE"
  case eXPIRINGSOON = "EXPIRING_SOON"
  case tOKENINVALID = "TOKEN_INVALID"
  case cLIENTBINDINGMISMATCH = "CLIENT_BINDING_MISMATCH"
  case dELEGATIONGAP = "DELEGATION_GAP"
  case eNVIRONMENTDRIFT = "ENVIRONMENT_DRIFT"
  case rEVOKED = "REVOKED"
  case eXPIRED = "EXPIRED"
  case uNLINKED = "UNLINKED"
  case uNKNOWN = "UNKNOWN"
}

public enum AuthorityLinkInventoryItemDelegationState: String, Codable, Sendable {
  case sATISFIED = "SATISFIED"
  case lIMITED = "LIMITED"
  case mISSING = "MISSING"
  case eXPIRED = "EXPIRED"
  case uNKNOWN = "UNKNOWN"
}

public enum AuthorityLinkInventoryItemTokenClientBindingState: String, Codable, Sendable {
  case bOUND = "BOUND"
  case mISMATCH = "MISMATCH"
  case uNVERIFIED = "UNVERIFIED"
}

public enum AuthorityLinkInventoryItemGuidedFlowMode: String, Codable, Sendable {
  case dETAILS = "DETAILS"
  case lINK = "LINK"
  case rELINK = "RELINK"
  case uNLINKREVIEW = "UNLINK_REVIEW"
}

public enum AuthorityLinkInventoryItemExpiryRiskBand: String, Codable, Sendable {
  case nONE = "NONE"
  case eXPIRING30DAYS = "EXPIRING_30_DAYS"
  case eXPIRING14DAYS = "EXPIRING_14_DAYS"
  case eXPIRING7DAYS = "EXPIRING_7_DAYS"
  case eXPIRED = "EXPIRED"
}

public enum AuthorityLinkInventoryItemHandshakeFlowState: String, Codable, Sendable {
  case nOTSTARTED = "NOT_STARTED"
  case iNPROGRESS = "IN_PROGRESS"
  case hANDOFFPENDING = "HANDOFF_PENDING"
  case vALIDATIONPENDING = "VALIDATION_PENDING"
  case lINKED = "LINKED"
  case bLOCKED = "BLOCKED"
}

public enum AuthorityLinkInventoryItemHandshakeStepCode: String, Codable, Sendable {
  case sELECTAUTHORITY = "SELECT_AUTHORITY"
  case cONFIRMCLIENTSCOPE = "CONFIRM_CLIENT_SCOPE"
  case rUNPREFLIGHTCHECKS = "RUN_PREFLIGHT_CHECKS"
  case aUTHORISEEXTERNALHANDOFF = "AUTHORISE_EXTERNAL_HANDOFF"
  case vALIDATEBINDING = "VALIDATE_BINDING"
}

public enum AuthorityLinkInventoryItemHandshakeAttemptState: String, Codable, Sendable {
  case nONERECORDED = "NONE_RECORDED"
  case cOMPLETED = "COMPLETED"
  case fAILED = "FAILED"
  case aBANDONED = "ABANDONED"
  case eXPIRED = "EXPIRED"
  case pENDINGRETURN = "PENDING_RETURN"
}

public enum AuthorityLinkInventoryItemPreflightCheckCode: String, Codable, Sendable {
  case aUTHORITYSCOPE = "AUTHORITY_SCOPE"
  case cLIENTBINDING = "CLIENT_BINDING"
  case dELEGATIONCOVERAGE = "DELEGATION_COVERAGE"
  case pROVIDERENVIRONMENT = "PROVIDER_ENVIRONMENT"
  case tOKENFRESHNESS = "TOKEN_FRESHNESS"
}

public enum AuthorityLinkInventoryItemPreflightCheckState: String, Codable, Sendable {
  case pASS = "PASS"
  case wARNING = "WARNING"
  case bLOCKED = "BLOCKED"
  case nOTRUN = "NOT_RUN"
}

public struct AuthorityLinkInventoryItemAuthorityLinkWorkspace: Codable, Sendable {
  public let surface_order: JSONValue
  public let active_filters: AuthorityLinkInventoryItemAuthorityLinkWorkspaceFilters
  public let selected_authority_link_ref: String
  public let detail_module_order: JSONValue
  public let guided_flow_mode: AuthorityLinkInventoryItemGuidedFlowMode
  public let promoted_support_surface: JSONValue
  public let prominent_issue_ref_or_null: String?

  public init(
    surface_order: JSONValue,
    active_filters: AuthorityLinkInventoryItemAuthorityLinkWorkspaceFilters,
    selected_authority_link_ref: String,
    detail_module_order: JSONValue,
    guided_flow_mode: AuthorityLinkInventoryItemGuidedFlowMode,
    promoted_support_surface: JSONValue,
    prominent_issue_ref_or_null: String?
  ) {
    self.surface_order = surface_order
    self.active_filters = active_filters
    self.selected_authority_link_ref = selected_authority_link_ref
    self.detail_module_order = detail_module_order
    self.guided_flow_mode = guided_flow_mode
    self.promoted_support_surface = promoted_support_surface
    self.prominent_issue_ref_or_null = prominent_issue_ref_or_null
  }
}

public struct AuthorityLinkInventoryItemAuthorityLinkWorkspaceFilters: Codable, Sendable {
  public let authority_scopes: [String]
  public let client_refs: [String]
  public let provider_environments: [String]
  public let lifecycle_states: [AuthorityLinkInventoryItemLifecycleState]
  public let binding_health_states: [AuthorityLinkInventoryItemBindingHealth]
  public let expiry_risk_bands: [AuthorityLinkInventoryItemExpiryRiskBand]

  public init(
    authority_scopes: [String],
    client_refs: [String],
    provider_environments: [String],
    lifecycle_states: [AuthorityLinkInventoryItemLifecycleState],
    binding_health_states: [AuthorityLinkInventoryItemBindingHealth],
    expiry_risk_bands: [AuthorityLinkInventoryItemExpiryRiskBand]
  ) {
    self.authority_scopes = authority_scopes
    self.client_refs = client_refs
    self.provider_environments = provider_environments
    self.lifecycle_states = lifecycle_states
    self.binding_health_states = binding_health_states
    self.expiry_risk_bands = expiry_risk_bands
  }
}

public struct AuthorityLinkInventoryItemGuidedHandshakeStepper: Codable, Sendable {
  public let flow_state: AuthorityLinkInventoryItemHandshakeFlowState
  public let step_order: JSONValue
  public let current_step_code: AuthorityLinkInventoryItemHandshakeStepCode
  public let completed_step_codes: [AuthorityLinkInventoryItemHandshakeStepCode]
  public let credential_capture_mode: JSONValue
  public let external_handoff_ref_or_null: String?
  public let preflight_blocking_check_refs: [String]

  public init(
    flow_state: AuthorityLinkInventoryItemHandshakeFlowState,
    step_order: JSONValue,
    current_step_code: AuthorityLinkInventoryItemHandshakeStepCode,
    completed_step_codes: [AuthorityLinkInventoryItemHandshakeStepCode],
    credential_capture_mode: JSONValue,
    external_handoff_ref_or_null: String?,
    preflight_blocking_check_refs: [String]
  ) {
    self.flow_state = flow_state
    self.step_order = step_order
    self.current_step_code = current_step_code
    self.completed_step_codes = completed_step_codes
    self.credential_capture_mode = credential_capture_mode
    self.external_handoff_ref_or_null = external_handoff_ref_or_null
    self.preflight_blocking_check_refs = preflight_blocking_check_refs
  }
}

public struct AuthorityLinkInventoryItemBindingHealthTimeline: Codable, Sendable {
  public let current_binding_health: AuthorityLinkInventoryItemBindingHealth
  public let current_delegation_state: AuthorityLinkInventoryItemDelegationState
  public let current_token_client_binding_state: AuthorityLinkInventoryItemTokenClientBindingState
  public let promoted_issue_ref_or_null: String?
  public let event_refs: [String]
  public let next_validation_due_at_or_null: ISO8601DateTimeString

  public init(
    current_binding_health: AuthorityLinkInventoryItemBindingHealth,
    current_delegation_state: AuthorityLinkInventoryItemDelegationState,
    current_token_client_binding_state: AuthorityLinkInventoryItemTokenClientBindingState,
    promoted_issue_ref_or_null: String?,
    event_refs: [String],
    next_validation_due_at_or_null: ISO8601DateTimeString
  ) {
    self.current_binding_health = current_binding_health
    self.current_delegation_state = current_delegation_state
    self.current_token_client_binding_state = current_token_client_binding_state
    self.promoted_issue_ref_or_null = promoted_issue_ref_or_null
    self.event_refs = event_refs
    self.next_validation_due_at_or_null = next_validation_due_at_or_null
  }
}

public struct AuthorityLinkInventoryItemHandshakeHistory: Codable, Sendable {
  public let attempt_refs: [String]
  public let selected_attempt_ref_or_null: String?
  public let latest_attempt_state: AuthorityLinkInventoryItemHandshakeAttemptState
  public let latest_failure_ref_or_null: String?

  public init(
    attempt_refs: [String],
    selected_attempt_ref_or_null: String?,
    latest_attempt_state: AuthorityLinkInventoryItemHandshakeAttemptState,
    latest_failure_ref_or_null: String?
  ) {
    self.attempt_refs = attempt_refs
    self.selected_attempt_ref_or_null = selected_attempt_ref_or_null
    self.latest_attempt_state = latest_attempt_state
    self.latest_failure_ref_or_null = latest_failure_ref_or_null
  }
}

public struct AuthorityLinkInventoryItemAffectedOperationList: Codable, Sendable {
  public let section_order: JSONValue
  public let preflight_refs: [String]
  public let submission_refs: [String]
  public let reconciliation_refs: [String]
  public let amendment_refs: [String]
  public let primary_blocked_operation_ref_or_null: String?

  public init(
    section_order: JSONValue,
    preflight_refs: [String],
    submission_refs: [String],
    reconciliation_refs: [String],
    amendment_refs: [String],
    primary_blocked_operation_ref_or_null: String?
  ) {
    self.section_order = section_order
    self.preflight_refs = preflight_refs
    self.submission_refs = submission_refs
    self.reconciliation_refs = reconciliation_refs
    self.amendment_refs = amendment_refs
    self.primary_blocked_operation_ref_or_null = primary_blocked_operation_ref_or_null
  }
}

public struct AuthorityLinkInventoryItemPreflightChecklist: Codable, Sendable {
  public let check_order: JSONValue
  public let checks: [AuthorityLinkInventoryItemPreflightCheck]
  public let blocking_check_refs: [String]
  public let last_run_at_or_null: ISO8601DateTimeString

  public init(
    check_order: JSONValue,
    checks: [AuthorityLinkInventoryItemPreflightCheck],
    blocking_check_refs: [String],
    last_run_at_or_null: ISO8601DateTimeString
  ) {
    self.check_order = check_order
    self.checks = checks
    self.blocking_check_refs = blocking_check_refs
    self.last_run_at_or_null = last_run_at_or_null
  }
}

public struct AuthorityLinkInventoryItemPreflightCheck: Codable, Sendable {
  public let check_ref: String
  public let check_code: AuthorityLinkInventoryItemPreflightCheckCode
  public let check_state: AuthorityLinkInventoryItemPreflightCheckState
  public let reason_refs: [String]

  public init(
    check_ref: String,
    check_code: AuthorityLinkInventoryItemPreflightCheckCode,
    check_state: AuthorityLinkInventoryItemPreflightCheckState,
    reason_refs: [String]
  ) {
    self.check_ref = check_ref
    self.check_code = check_code
    self.check_state = check_state
    self.reason_refs = reason_refs
  }
}

public struct AuthorityLinkInventoryItemAffectedOperationCounts: Codable, Sendable {
  public let preflight_count: Int
  public let submission_count: Int
  public let reconciliation_count: Int
  public let amendment_count: Int

  public init(
    preflight_count: Int,
    submission_count: Int,
    reconciliation_count: Int,
    amendment_count: Int
  ) {
    self.preflight_count = preflight_count
    self.submission_count = submission_count
    self.reconciliation_count = reconciliation_count
    self.amendment_count = amendment_count
  }
}

public enum AuthorityLinkInventoryItemSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_link_inventory_item.schema.json"
  public static let sourceHash = "dafa503e1d5b0152f01acad4406a7855c71cf5e1d2116cb6de6fbdeb09fea8e8"
}

public struct AuthorityOperation: Codable, Sendable {
  public let artifact_type: JSONValue
  public let operation_id: String
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String
  public let manifest_hash: String
  public let execution_basis_hash: String
  public let attempt_lineage_manifest_id: String
  public let operation_family: String
  public let authority_name: String
  public let authority_product_profile: String
  public let operation_profile_ref: String
  public let provider_environment: String
  public let provider_api_version: String
  public let authority_scope: String
  public let requested_scope: AuthorityOperationScopeArray
  public let runtime_scope: AuthorityOperationScopeArray
  public let scope_execution_binding: ScopeExecutionBinding
  public let access_binding_hash: String
  public let policy_snapshot_hash: String
  public let authority_binding_ref: String
  public let authority_link_ref: String
  public let delegation_grant_ref: String?
  public let binding_lineage_ref: String
  public let token_binding_ref: String
  public let subject_ref: String
  public let acting_party_ref: String
  public let business_partitions: [String]
  public let period: String
  public let target_obligation_ref: String?
  public let basis_type: String?
  public let authority_layer_boundary: AuthorityLayerBoundaryContract
  public let contract: SchemaBundle

  public init(
    artifact_type: JSONValue,
    operation_id: String,
    tenant_id: String,
    client_id: String,
    manifest_id: String,
    manifest_hash: String,
    execution_basis_hash: String,
    attempt_lineage_manifest_id: String,
    operation_family: String,
    authority_name: String,
    authority_product_profile: String,
    operation_profile_ref: String,
    provider_environment: String,
    provider_api_version: String,
    authority_scope: String,
    requested_scope: AuthorityOperationScopeArray,
    runtime_scope: AuthorityOperationScopeArray,
    scope_execution_binding: ScopeExecutionBinding,
    access_binding_hash: String,
    policy_snapshot_hash: String,
    authority_binding_ref: String,
    authority_link_ref: String,
    delegation_grant_ref: String?,
    binding_lineage_ref: String,
    token_binding_ref: String,
    subject_ref: String,
    acting_party_ref: String,
    business_partitions: [String],
    period: String,
    target_obligation_ref: String?,
    basis_type: String?,
    authority_layer_boundary: AuthorityLayerBoundaryContract,
    contract: SchemaBundle
  ) {
    self.artifact_type = artifact_type
    self.operation_id = operation_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.manifest_hash = manifest_hash
    self.execution_basis_hash = execution_basis_hash
    self.attempt_lineage_manifest_id = attempt_lineage_manifest_id
    self.operation_family = operation_family
    self.authority_name = authority_name
    self.authority_product_profile = authority_product_profile
    self.operation_profile_ref = operation_profile_ref
    self.provider_environment = provider_environment
    self.provider_api_version = provider_api_version
    self.authority_scope = authority_scope
    self.requested_scope = requested_scope
    self.runtime_scope = runtime_scope
    self.scope_execution_binding = scope_execution_binding
    self.access_binding_hash = access_binding_hash
    self.policy_snapshot_hash = policy_snapshot_hash
    self.authority_binding_ref = authority_binding_ref
    self.authority_link_ref = authority_link_ref
    self.delegation_grant_ref = delegation_grant_ref
    self.binding_lineage_ref = binding_lineage_ref
    self.token_binding_ref = token_binding_ref
    self.subject_ref = subject_ref
    self.acting_party_ref = acting_party_ref
    self.business_partitions = business_partitions
    self.period = period
    self.target_obligation_ref = target_obligation_ref
    self.basis_type = basis_type
    self.authority_layer_boundary = authority_layer_boundary
    self.contract = contract
  }
}

public typealias AuthorityOperationScopeArray = JSONValue

public enum AuthorityOperationSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_operation.schema.json"
  public static let sourceHash = "a9c6f872ed9d6613cc2e75106a8df872de571c352e31b5c9aad593ee387daabd"
}

public struct AuthorityOperationProfile: Codable, Sendable {
  public let artifact_type: JSONValue
  public let profile_id: String
  public let operation_family: String
  public let authority_name: String
  public let authority_product_profile: String
  public let provider_environment: String
  public let provider_api_version: String
  public let transport_rules: AuthorityOperationProfileTransportRules
  public let required_scopes: AuthorityOperation
  public let fraud_header_profile_ref: String?
  public let fraud_header_exemption_reason: String?
  public let idempotency_strategy: String
  public let success_response_rules: AuthorityOperationProfileSuccessResponseRules
  public let pending_unknown_rules: AuthorityOperationProfilePendingUnknownRules
  public let reconciliation_rules: AuthorityOperationProfileReconciliationRules
  public let legal_state_rules: AuthorityOperationProfileLegalStateRules

  public init(
    artifact_type: JSONValue,
    profile_id: String,
    operation_family: String,
    authority_name: String,
    authority_product_profile: String,
    provider_environment: String,
    provider_api_version: String,
    transport_rules: AuthorityOperationProfileTransportRules,
    required_scopes: AuthorityOperation,
    fraud_header_profile_ref: String?,
    fraud_header_exemption_reason: String?,
    idempotency_strategy: String,
    success_response_rules: AuthorityOperationProfileSuccessResponseRules,
    pending_unknown_rules: AuthorityOperationProfilePendingUnknownRules,
    reconciliation_rules: AuthorityOperationProfileReconciliationRules,
    legal_state_rules: AuthorityOperationProfileLegalStateRules
  ) {
    self.artifact_type = artifact_type
    self.profile_id = profile_id
    self.operation_family = operation_family
    self.authority_name = authority_name
    self.authority_product_profile = authority_product_profile
    self.provider_environment = provider_environment
    self.provider_api_version = provider_api_version
    self.transport_rules = transport_rules
    self.required_scopes = required_scopes
    self.fraud_header_profile_ref = fraud_header_profile_ref
    self.fraud_header_exemption_reason = fraud_header_exemption_reason
    self.idempotency_strategy = idempotency_strategy
    self.success_response_rules = success_response_rules
    self.pending_unknown_rules = pending_unknown_rules
    self.reconciliation_rules = reconciliation_rules
    self.legal_state_rules = legal_state_rules
  }
}

public struct AuthorityOperationProfileTransportRules: Codable, Sendable {
  public let http_method: String
  public let path_template: String
  public let canonical_query_mode: String
  public let payload_required: Bool
  public let response_body_expected: Bool
  public let timeout_profile_ref: String
  public let transmit_policy_ref: String

  public init(
    http_method: String,
    path_template: String,
    canonical_query_mode: String,
    payload_required: Bool,
    response_body_expected: Bool,
    timeout_profile_ref: String,
    transmit_policy_ref: String
  ) {
    self.http_method = http_method
    self.path_template = path_template
    self.canonical_query_mode = canonical_query_mode
    self.payload_required = payload_required
    self.response_body_expected = response_body_expected
    self.timeout_profile_ref = timeout_profile_ref
    self.transmit_policy_ref = transmit_policy_ref
  }
}

public struct AuthorityOperationProfileSuccessResponseRules: Codable, Sendable {
  public let success_status_codes: [Int]
  public let response_class: String
  public let extraction_rule_refs: [String]
  public let confirmed_state_on_success: String

  public init(
    success_status_codes: [Int],
    response_class: String,
    extraction_rule_refs: [String],
    confirmed_state_on_success: String
  ) {
    self.success_status_codes = success_status_codes
    self.response_class = response_class
    self.extraction_rule_refs = extraction_rule_refs
    self.confirmed_state_on_success = confirmed_state_on_success
  }
}

public struct AuthorityOperationProfilePendingUnknownRules: Codable, Sendable {
  public let timeout_maps_to: String
  public let no_body_maps_to: String
  public let retry_class: String
  public let escalation_required: Bool

  public init(
    timeout_maps_to: String,
    no_body_maps_to: String,
    retry_class: String,
    escalation_required: Bool
  ) {
    self.timeout_maps_to = timeout_maps_to
    self.no_body_maps_to = no_body_maps_to
    self.retry_class = retry_class
    self.escalation_required = escalation_required
  }
}

public struct AuthorityOperationProfileReconciliationRules: Codable, Sendable {
  public let method: String
  public let max_auto_reconciliation_attempts: Int
  public let cadence_seconds: Int?
  public let deadline_derivation_rule: String?
  public let escalation_policy_ref: String?
  public let authoritative_result_source: String

  public init(
    method: String,
    max_auto_reconciliation_attempts: Int,
    cadence_seconds: Int?,
    deadline_derivation_rule: String?,
    escalation_policy_ref: String?,
    authoritative_result_source: String
  ) {
    self.method = method
    self.max_auto_reconciliation_attempts = max_auto_reconciliation_attempts
    self.cadence_seconds = cadence_seconds
    self.deadline_derivation_rule = deadline_derivation_rule
    self.escalation_policy_ref = escalation_policy_ref
    self.authoritative_result_source = authoritative_result_source
  }
}

public struct AuthorityOperationProfileLegalStateRules: Codable, Sendable {
  public let authoritative_state_source: String
  public let timeout_default_state: String
  public let accepted_pending_state: String
  public let out_of_band_state_allowed: Bool
  public let amendment_requires_confirmed_finalisation: Bool

  public init(
    authoritative_state_source: String,
    timeout_default_state: String,
    accepted_pending_state: String,
    out_of_band_state_allowed: Bool,
    amendment_requires_confirmed_finalisation: Bool
  ) {
    self.authoritative_state_source = authoritative_state_source
    self.timeout_default_state = timeout_default_state
    self.accepted_pending_state = accepted_pending_state
    self.out_of_band_state_allowed = out_of_band_state_allowed
    self.amendment_requires_confirmed_finalisation = amendment_requires_confirmed_finalisation
  }
}

public enum AuthorityOperationProfileSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_operation_profile.schema.json"
  public static let sourceHash = "39364a825e050a50d41e7ccc1ea580fe449621d21ef3bbbfcdd8eb0f2a92e303"
}

public struct AuthorityReconciliationAnalyticsSnapshot: Codable, Sendable {
  public let artifact_type: JSONValue
  public let snapshot_id: String
  public let authority_operation_profile_ref: String
  public let provider_environment: String
  public let operation_family: String
  public let window_started_at: ISO8601DateTimeString
  public let window_ended_at: ISO8601DateTimeString
  public let interaction_refs: [String]
  public let total_interaction_count: Int
  public let budget_state_counts: [AuthorityReconciliationAnalyticsSnapshotBudgetCountEntry]
  public let outcome_class_counts: [AuthorityReconciliationAnalyticsSnapshotOutcomeCountEntry]
  public let resend_refusal_reason_counts: [AuthorityReconciliationAnalyticsSnapshotResendReasonCountEntry]
  public let escalation_reason_counts: [AuthorityReconciliationAnalyticsSnapshotStringCountEntry]
  public let unresolved_ambiguity_count: Int
  public let deadline_expiry_count: Int
  public let escalated_count: Int
  public let blind_resend_blocked_count: Int
  public let replay_resume_count: Int
  public let average_attempts_consumed: Double
  public let max_attempts_consumed: Int
  public let escalation_latency_seconds_p95_or_null: Double?
  public let tuning_recommendation_codes: [String]
  public let source_policy: JSONValue
  public let generated_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    snapshot_id: String,
    authority_operation_profile_ref: String,
    provider_environment: String,
    operation_family: String,
    window_started_at: ISO8601DateTimeString,
    window_ended_at: ISO8601DateTimeString,
    interaction_refs: [String],
    total_interaction_count: Int,
    budget_state_counts: [AuthorityReconciliationAnalyticsSnapshotBudgetCountEntry],
    outcome_class_counts: [AuthorityReconciliationAnalyticsSnapshotOutcomeCountEntry],
    resend_refusal_reason_counts: [AuthorityReconciliationAnalyticsSnapshotResendReasonCountEntry],
    escalation_reason_counts: [AuthorityReconciliationAnalyticsSnapshotStringCountEntry],
    unresolved_ambiguity_count: Int,
    deadline_expiry_count: Int,
    escalated_count: Int,
    blind_resend_blocked_count: Int,
    replay_resume_count: Int,
    average_attempts_consumed: Double,
    max_attempts_consumed: Int,
    escalation_latency_seconds_p95_or_null: Double?,
    tuning_recommendation_codes: [String],
    source_policy: JSONValue,
    generated_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.snapshot_id = snapshot_id
    self.authority_operation_profile_ref = authority_operation_profile_ref
    self.provider_environment = provider_environment
    self.operation_family = operation_family
    self.window_started_at = window_started_at
    self.window_ended_at = window_ended_at
    self.interaction_refs = interaction_refs
    self.total_interaction_count = total_interaction_count
    self.budget_state_counts = budget_state_counts
    self.outcome_class_counts = outcome_class_counts
    self.resend_refusal_reason_counts = resend_refusal_reason_counts
    self.escalation_reason_counts = escalation_reason_counts
    self.unresolved_ambiguity_count = unresolved_ambiguity_count
    self.deadline_expiry_count = deadline_expiry_count
    self.escalated_count = escalated_count
    self.blind_resend_blocked_count = blind_resend_blocked_count
    self.replay_resume_count = replay_resume_count
    self.average_attempts_consumed = average_attempts_consumed
    self.max_attempts_consumed = max_attempts_consumed
    self.escalation_latency_seconds_p95_or_null = escalation_latency_seconds_p95_or_null
    self.tuning_recommendation_codes = tuning_recommendation_codes
    self.source_policy = source_policy
    self.generated_at = generated_at
  }
}

public struct AuthorityReconciliationAnalyticsSnapshotBudgetCountEntry: Codable, Sendable {
  public let code: String
  public let count: Int

  public init(
    code: String,
    count: Int
  ) {
    self.code = code
    self.count = count
  }
}

public struct AuthorityReconciliationAnalyticsSnapshotOutcomeCountEntry: Codable, Sendable {
  public let code: String
  public let count: Int

  public init(
    code: String,
    count: Int
  ) {
    self.code = code
    self.count = count
  }
}

public struct AuthorityReconciliationAnalyticsSnapshotResendReasonCountEntry: Codable, Sendable {
  public let code: String
  public let count: Int

  public init(
    code: String,
    count: Int
  ) {
    self.code = code
    self.count = count
  }
}

public struct AuthorityReconciliationAnalyticsSnapshotStringCountEntry: Codable, Sendable {
  public let code: String
  public let count: Int

  public init(
    code: String,
    count: Int
  ) {
    self.code = code
    self.count = count
  }
}

public enum AuthorityReconciliationAnalyticsSnapshotSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_reconciliation_analytics_snapshot.schema.json"
  public static let sourceHash = "53ba434c4a60165d0f9aed061cce6c7c47a326584ded40c1209cb7761aefe022"
}

public struct AuthorityReconciliationControlContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let binding_scope_class: String
  public let control_contract_hash: String
  public let interaction_ref_or_null: String?
  public let authority_operation_profile_ref_or_null: String?
  public let provider_environment_or_null: String?
  public let operation_family_or_null: String?
  public let duplicate_meaning_key_or_null: String?
  public let authority_truth_state: String
  public let submission_lifecycle_state_or_null: JSONValue
  public let reconciliation_method: String
  public let max_auto_reconciliation_attempts: Int
  public let reconciliation_attempt_count: Int
  public let attempts_remaining_count: Int
  public let reconciliation_cadence_seconds_or_null: Int?
  public let reconciliation_budget_state: String
  public let reconciliation_deadline_at_or_null: ISO8601DateTimeString
  public let next_reconciliation_at_or_null: ISO8601DateTimeString
  public let unresolved_authority_posture: String
  public let unresolved_reason_codes: [String]
  public let resend_legality_state: String
  public let resend_control_reason_codes: [String]
  public let replay_resume_policy: JSONValue
  public let blind_resend_policy: JSONValue
  public let escalation_state: String
  public let escalation_owner_ref_or_null: String?
  public let escalation_workflow_item_ref_or_null: String?
  public let escalation_reason_codes: [String]
  public let escalation_evidence_refs: [String]
  public let escalation_due_at_or_null: ISO8601DateTimeString
  public let last_budget_event_at: ISO8601DateTimeString
  public let outcome_class_for_analytics: String

  public init(
    contract_version: JSONValue,
    binding_scope_class: String,
    control_contract_hash: String,
    interaction_ref_or_null: String?,
    authority_operation_profile_ref_or_null: String?,
    provider_environment_or_null: String?,
    operation_family_or_null: String?,
    duplicate_meaning_key_or_null: String?,
    authority_truth_state: String,
    submission_lifecycle_state_or_null: JSONValue,
    reconciliation_method: String,
    max_auto_reconciliation_attempts: Int,
    reconciliation_attempt_count: Int,
    attempts_remaining_count: Int,
    reconciliation_cadence_seconds_or_null: Int?,
    reconciliation_budget_state: String,
    reconciliation_deadline_at_or_null: ISO8601DateTimeString,
    next_reconciliation_at_or_null: ISO8601DateTimeString,
    unresolved_authority_posture: String,
    unresolved_reason_codes: [String],
    resend_legality_state: String,
    resend_control_reason_codes: [String],
    replay_resume_policy: JSONValue,
    blind_resend_policy: JSONValue,
    escalation_state: String,
    escalation_owner_ref_or_null: String?,
    escalation_workflow_item_ref_or_null: String?,
    escalation_reason_codes: [String],
    escalation_evidence_refs: [String],
    escalation_due_at_or_null: ISO8601DateTimeString,
    last_budget_event_at: ISO8601DateTimeString,
    outcome_class_for_analytics: String
  ) {
    self.contract_version = contract_version
    self.binding_scope_class = binding_scope_class
    self.control_contract_hash = control_contract_hash
    self.interaction_ref_or_null = interaction_ref_or_null
    self.authority_operation_profile_ref_or_null = authority_operation_profile_ref_or_null
    self.provider_environment_or_null = provider_environment_or_null
    self.operation_family_or_null = operation_family_or_null
    self.duplicate_meaning_key_or_null = duplicate_meaning_key_or_null
    self.authority_truth_state = authority_truth_state
    self.submission_lifecycle_state_or_null = submission_lifecycle_state_or_null
    self.reconciliation_method = reconciliation_method
    self.max_auto_reconciliation_attempts = max_auto_reconciliation_attempts
    self.reconciliation_attempt_count = reconciliation_attempt_count
    self.attempts_remaining_count = attempts_remaining_count
    self.reconciliation_cadence_seconds_or_null = reconciliation_cadence_seconds_or_null
    self.reconciliation_budget_state = reconciliation_budget_state
    self.reconciliation_deadline_at_or_null = reconciliation_deadline_at_or_null
    self.next_reconciliation_at_or_null = next_reconciliation_at_or_null
    self.unresolved_authority_posture = unresolved_authority_posture
    self.unresolved_reason_codes = unresolved_reason_codes
    self.resend_legality_state = resend_legality_state
    self.resend_control_reason_codes = resend_control_reason_codes
    self.replay_resume_policy = replay_resume_policy
    self.blind_resend_policy = blind_resend_policy
    self.escalation_state = escalation_state
    self.escalation_owner_ref_or_null = escalation_owner_ref_or_null
    self.escalation_workflow_item_ref_or_null = escalation_workflow_item_ref_or_null
    self.escalation_reason_codes = escalation_reason_codes
    self.escalation_evidence_refs = escalation_evidence_refs
    self.escalation_due_at_or_null = escalation_due_at_or_null
    self.last_budget_event_at = last_budget_event_at
    self.outcome_class_for_analytics = outcome_class_for_analytics
  }
}

public enum AuthorityReconciliationControlContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_reconciliation_control_contract.schema.json"
  public static let sourceHash = "b15e49aa0ca2d3675756e87e592c9110574cf155992bc121aece0e8949a2fc53"
}

public struct AuthorityRequestEnvelope: Codable, Sendable {
  public let artifact_type: JSONValue
  public let request_id: String
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String
  public let manifest_hash: String
  public let execution_basis_hash: String
  public let attempt_lineage_manifest_id: String
  public let operation_id: String
  public let authority_name: String
  public let authority_product_profile: String
  public let provider_environment: String
  public let authority_scope: String
  public let operation_family: String
  public let operation_profile: String
  public let provider_api_version: String
  public let http_method: String
  public let resource_template: String
  public let resolved_path_params: [String: String]
  public let query_params: [String: JSONValue]
  public let header_profile_refs: [String]
  public let payload_ref: String?
  public let canonical_path: String
  public let canonical_query: String
  public let request_identity_contract: AuthorityRequestIdentityContract
  public let identity_profile_version: JSONValue
  public let identity_namespace_hash: String
  public let normalized_obligation_ref: String
  public let normalized_basis_type: String
  public let duplicate_meaning_key: String
  public let request_body_hash: String
  public let request_hash: String
  public let idempotency_key: String
  public let access_binding_hash: String
  public let policy_snapshot_hash: String
  public let authority_binding_ref: String
  public let authority_link_ref: String
  public let delegation_grant_ref: String?
  public let authority_layer_boundary: AuthorityLayerBoundaryContract
  public let subject_ref: String
  public let acting_party_ref: String
  public let token_binding_ref: String
  public let binding_lineage_ref: String
  public let business_partition_refs: [String]
  public let obligation_ref: String?
  public let basis_type: String?
  public let fraud_header_profile_ref: String?
  public let fraud_header_capture_ref: String?
  public let fraud_header_validation_ref: String?
  public let fraud_header_exemption_reason: String?
  public let transmit_policy_ref: String

  public init(
    artifact_type: JSONValue,
    request_id: String,
    tenant_id: String,
    client_id: String,
    manifest_id: String,
    manifest_hash: String,
    execution_basis_hash: String,
    attempt_lineage_manifest_id: String,
    operation_id: String,
    authority_name: String,
    authority_product_profile: String,
    provider_environment: String,
    authority_scope: String,
    operation_family: String,
    operation_profile: String,
    provider_api_version: String,
    http_method: String,
    resource_template: String,
    resolved_path_params: [String: String],
    query_params: [String: JSONValue],
    header_profile_refs: [String],
    payload_ref: String?,
    canonical_path: String,
    canonical_query: String,
    request_identity_contract: AuthorityRequestIdentityContract,
    identity_profile_version: JSONValue,
    identity_namespace_hash: String,
    normalized_obligation_ref: String,
    normalized_basis_type: String,
    duplicate_meaning_key: String,
    request_body_hash: String,
    request_hash: String,
    idempotency_key: String,
    access_binding_hash: String,
    policy_snapshot_hash: String,
    authority_binding_ref: String,
    authority_link_ref: String,
    delegation_grant_ref: String?,
    authority_layer_boundary: AuthorityLayerBoundaryContract,
    subject_ref: String,
    acting_party_ref: String,
    token_binding_ref: String,
    binding_lineage_ref: String,
    business_partition_refs: [String],
    obligation_ref: String?,
    basis_type: String?,
    fraud_header_profile_ref: String?,
    fraud_header_capture_ref: String?,
    fraud_header_validation_ref: String?,
    fraud_header_exemption_reason: String?,
    transmit_policy_ref: String
  ) {
    self.artifact_type = artifact_type
    self.request_id = request_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.manifest_hash = manifest_hash
    self.execution_basis_hash = execution_basis_hash
    self.attempt_lineage_manifest_id = attempt_lineage_manifest_id
    self.operation_id = operation_id
    self.authority_name = authority_name
    self.authority_product_profile = authority_product_profile
    self.provider_environment = provider_environment
    self.authority_scope = authority_scope
    self.operation_family = operation_family
    self.operation_profile = operation_profile
    self.provider_api_version = provider_api_version
    self.http_method = http_method
    self.resource_template = resource_template
    self.resolved_path_params = resolved_path_params
    self.query_params = query_params
    self.header_profile_refs = header_profile_refs
    self.payload_ref = payload_ref
    self.canonical_path = canonical_path
    self.canonical_query = canonical_query
    self.request_identity_contract = request_identity_contract
    self.identity_profile_version = identity_profile_version
    self.identity_namespace_hash = identity_namespace_hash
    self.normalized_obligation_ref = normalized_obligation_ref
    self.normalized_basis_type = normalized_basis_type
    self.duplicate_meaning_key = duplicate_meaning_key
    self.request_body_hash = request_body_hash
    self.request_hash = request_hash
    self.idempotency_key = idempotency_key
    self.access_binding_hash = access_binding_hash
    self.policy_snapshot_hash = policy_snapshot_hash
    self.authority_binding_ref = authority_binding_ref
    self.authority_link_ref = authority_link_ref
    self.delegation_grant_ref = delegation_grant_ref
    self.authority_layer_boundary = authority_layer_boundary
    self.subject_ref = subject_ref
    self.acting_party_ref = acting_party_ref
    self.token_binding_ref = token_binding_ref
    self.binding_lineage_ref = binding_lineage_ref
    self.business_partition_refs = business_partition_refs
    self.obligation_ref = obligation_ref
    self.basis_type = basis_type
    self.fraud_header_profile_ref = fraud_header_profile_ref
    self.fraud_header_capture_ref = fraud_header_capture_ref
    self.fraud_header_validation_ref = fraud_header_validation_ref
    self.fraud_header_exemption_reason = fraud_header_exemption_reason
    self.transmit_policy_ref = transmit_policy_ref
  }
}

public enum AuthorityRequestEnvelopeSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_request_envelope.schema.json"
  public static let sourceHash = "a294dc0c10460ae07a910e085db9200635dd7d505e2c902ac6ee130618572167"
}

public struct AuthorityRequestIdentityContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let binding_scope_class: String
  public let request_id: String
  public let tenant_id: String
  public let client_id: String
  public let manifest_id: String
  public let manifest_hash: String
  public let execution_basis_hash: String
  public let attempt_lineage_manifest_id: String
  public let operation_id: String
  public let authority_name: String
  public let authority_product_profile: String
  public let provider_environment: String
  public let authority_scope: String
  public let operation_family: String
  public let operation_profile: String
  public let provider_api_version: String
  public let http_method: String
  public let canonical_path: String
  public let canonical_query: String
  public let header_profile_refs: [String]
  public let identity_profile_version: JSONValue
  public let identity_namespace_hash: String
  public let normalized_obligation_ref: String
  public let normalized_basis_type: String
  public let obligation_ref_or_null: String?
  public let basis_type_or_null: String?
  public let request_body_hash: String
  public let duplicate_meaning_key: String
  public let request_hash: String
  public let idempotency_key: String
  public let access_binding_hash: String
  public let policy_snapshot_hash: String
  public let authority_binding_ref: String
  public let authority_link_ref: String
  public let delegation_grant_ref_or_null: String?
  public let subject_ref: String
  public let acting_party_ref: String
  public let token_binding_ref: String
  public let binding_lineage_ref: String
  public let business_partition_refs: [String]

  public init(
    contract_version: JSONValue,
    binding_scope_class: String,
    request_id: String,
    tenant_id: String,
    client_id: String,
    manifest_id: String,
    manifest_hash: String,
    execution_basis_hash: String,
    attempt_lineage_manifest_id: String,
    operation_id: String,
    authority_name: String,
    authority_product_profile: String,
    provider_environment: String,
    authority_scope: String,
    operation_family: String,
    operation_profile: String,
    provider_api_version: String,
    http_method: String,
    canonical_path: String,
    canonical_query: String,
    header_profile_refs: [String],
    identity_profile_version: JSONValue,
    identity_namespace_hash: String,
    normalized_obligation_ref: String,
    normalized_basis_type: String,
    obligation_ref_or_null: String?,
    basis_type_or_null: String?,
    request_body_hash: String,
    duplicate_meaning_key: String,
    request_hash: String,
    idempotency_key: String,
    access_binding_hash: String,
    policy_snapshot_hash: String,
    authority_binding_ref: String,
    authority_link_ref: String,
    delegation_grant_ref_or_null: String?,
    subject_ref: String,
    acting_party_ref: String,
    token_binding_ref: String,
    binding_lineage_ref: String,
    business_partition_refs: [String]
  ) {
    self.contract_version = contract_version
    self.binding_scope_class = binding_scope_class
    self.request_id = request_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.manifest_id = manifest_id
    self.manifest_hash = manifest_hash
    self.execution_basis_hash = execution_basis_hash
    self.attempt_lineage_manifest_id = attempt_lineage_manifest_id
    self.operation_id = operation_id
    self.authority_name = authority_name
    self.authority_product_profile = authority_product_profile
    self.provider_environment = provider_environment
    self.authority_scope = authority_scope
    self.operation_family = operation_family
    self.operation_profile = operation_profile
    self.provider_api_version = provider_api_version
    self.http_method = http_method
    self.canonical_path = canonical_path
    self.canonical_query = canonical_query
    self.header_profile_refs = header_profile_refs
    self.identity_profile_version = identity_profile_version
    self.identity_namespace_hash = identity_namespace_hash
    self.normalized_obligation_ref = normalized_obligation_ref
    self.normalized_basis_type = normalized_basis_type
    self.obligation_ref_or_null = obligation_ref_or_null
    self.basis_type_or_null = basis_type_or_null
    self.request_body_hash = request_body_hash
    self.duplicate_meaning_key = duplicate_meaning_key
    self.request_hash = request_hash
    self.idempotency_key = idempotency_key
    self.access_binding_hash = access_binding_hash
    self.policy_snapshot_hash = policy_snapshot_hash
    self.authority_binding_ref = authority_binding_ref
    self.authority_link_ref = authority_link_ref
    self.delegation_grant_ref_or_null = delegation_grant_ref_or_null
    self.subject_ref = subject_ref
    self.acting_party_ref = acting_party_ref
    self.token_binding_ref = token_binding_ref
    self.binding_lineage_ref = binding_lineage_ref
    self.business_partition_refs = business_partition_refs
  }
}

public enum AuthorityRequestIdentityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_request_identity_contract.schema.json"
  public static let sourceHash = "954f6c22434059cf165cf46282cfda7dff722425849659ddeba5ba316e885f7c"
}

public struct AuthorityResponseEnvelope: Codable, Sendable {
  public let response_id: String
  public let request_id: String
  public let received_at: ISO8601DateTimeString
  public let provider_received_at: ISO8601DateTimeString
  public let http_status: Int?
  public let response_headers_ref: String?
  public let response_body_ref: String?
  public let response_body_hash: String
  public let authority_reference: String?
  public let response_source: String
  public let provider_delivery_ref: String?
  public let inbox_receipt_ref: String?
  public let ingress_receipt_ref: String?
  public let authority_ingress_proof_contract: JSONValue
  public let derivation_posture: String
  public let legal_effect_posture: String
  public let supersedes_response_id: String?
  public let corroborates_response_ids: [String]
  public let conflicting_response_ids: [String]
  public let recovery_basis_response_id: String?
  public let correlation_status: String
  public let response_class: String
  public let retry_class: String

  public init(
    response_id: String,
    request_id: String,
    received_at: ISO8601DateTimeString,
    provider_received_at: ISO8601DateTimeString,
    http_status: Int?,
    response_headers_ref: String?,
    response_body_ref: String?,
    response_body_hash: String,
    authority_reference: String?,
    response_source: String,
    provider_delivery_ref: String?,
    inbox_receipt_ref: String?,
    ingress_receipt_ref: String?,
    authority_ingress_proof_contract: JSONValue,
    derivation_posture: String,
    legal_effect_posture: String,
    supersedes_response_id: String?,
    corroborates_response_ids: [String],
    conflicting_response_ids: [String],
    recovery_basis_response_id: String?,
    correlation_status: String,
    response_class: String,
    retry_class: String
  ) {
    self.response_id = response_id
    self.request_id = request_id
    self.received_at = received_at
    self.provider_received_at = provider_received_at
    self.http_status = http_status
    self.response_headers_ref = response_headers_ref
    self.response_body_ref = response_body_ref
    self.response_body_hash = response_body_hash
    self.authority_reference = authority_reference
    self.response_source = response_source
    self.provider_delivery_ref = provider_delivery_ref
    self.inbox_receipt_ref = inbox_receipt_ref
    self.ingress_receipt_ref = ingress_receipt_ref
    self.authority_ingress_proof_contract = authority_ingress_proof_contract
    self.derivation_posture = derivation_posture
    self.legal_effect_posture = legal_effect_posture
    self.supersedes_response_id = supersedes_response_id
    self.corroborates_response_ids = corroborates_response_ids
    self.conflicting_response_ids = conflicting_response_ids
    self.recovery_basis_response_id = recovery_basis_response_id
    self.correlation_status = correlation_status
    self.response_class = response_class
    self.retry_class = retry_class
  }
}

public enum AuthorityResponseEnvelopeSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_response_envelope.schema.json"
  public static let sourceHash = "3d667a68a2ebb0d4d83d955fa5ffb80a41fd77a557eff9ef6607b9c430800cac"
}

public struct AuthoritySandboxCoverageContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let coverage_hash: String
  public let candidate_identity_hash: String
  public let schema_bundle_hash: String
  public let compatibility_gate_hash: String
  public let migration_plan_ref_or_null: String?
  public let supported_client_window_ref_or_null: String?
  public let reader_window_state: String
  public let coverage_profile: JSONValue
  public let request_identity_binding_policy: JSONValue
  public let namespace_isolation_policy: JSONValue
  public let fraud_header_binding_policy: JSONValue
  public let ingress_quarantine_policy: JSONValue
  public let reconciliation_budget_policy: JSONValue
  public let release_admissibility_scope_policy: JSONValue
  public let evidence_replay_policy: JSONValue
  public let sandbox_identity_namespace_hash: String
  public let sandbox_duplicate_bucket_hash: String
  public let enabled_provider_profile_refs: [String]
  public let required_operation_families: [AuthoritySandboxCoverageContractOperationFamily]
  public let exercised_provider_profile_refs: [String]
  public let exercised_operation_families: [AuthoritySandboxCoverageContractOperationFamily]
  public let operation_coverage: [AuthoritySandboxCoverageContractOperationCoverageEntry]
  public let negative_path_coverage: [AuthoritySandboxCoverageContractNegativePathCoverageEntry]
  public let provider_profile_coverage_state: JSONValue
  public let operation_family_coverage_state: JSONValue
  public let negative_path_coverage_state: JSONValue

  public init(
    contract_version: JSONValue,
    coverage_hash: String,
    candidate_identity_hash: String,
    schema_bundle_hash: String,
    compatibility_gate_hash: String,
    migration_plan_ref_or_null: String?,
    supported_client_window_ref_or_null: String?,
    reader_window_state: String,
    coverage_profile: JSONValue,
    request_identity_binding_policy: JSONValue,
    namespace_isolation_policy: JSONValue,
    fraud_header_binding_policy: JSONValue,
    ingress_quarantine_policy: JSONValue,
    reconciliation_budget_policy: JSONValue,
    release_admissibility_scope_policy: JSONValue,
    evidence_replay_policy: JSONValue,
    sandbox_identity_namespace_hash: String,
    sandbox_duplicate_bucket_hash: String,
    enabled_provider_profile_refs: [String],
    required_operation_families: [AuthoritySandboxCoverageContractOperationFamily],
    exercised_provider_profile_refs: [String],
    exercised_operation_families: [AuthoritySandboxCoverageContractOperationFamily],
    operation_coverage: [AuthoritySandboxCoverageContractOperationCoverageEntry],
    negative_path_coverage: [AuthoritySandboxCoverageContractNegativePathCoverageEntry],
    provider_profile_coverage_state: JSONValue,
    operation_family_coverage_state: JSONValue,
    negative_path_coverage_state: JSONValue
  ) {
    self.contract_version = contract_version
    self.coverage_hash = coverage_hash
    self.candidate_identity_hash = candidate_identity_hash
    self.schema_bundle_hash = schema_bundle_hash
    self.compatibility_gate_hash = compatibility_gate_hash
    self.migration_plan_ref_or_null = migration_plan_ref_or_null
    self.supported_client_window_ref_or_null = supported_client_window_ref_or_null
    self.reader_window_state = reader_window_state
    self.coverage_profile = coverage_profile
    self.request_identity_binding_policy = request_identity_binding_policy
    self.namespace_isolation_policy = namespace_isolation_policy
    self.fraud_header_binding_policy = fraud_header_binding_policy
    self.ingress_quarantine_policy = ingress_quarantine_policy
    self.reconciliation_budget_policy = reconciliation_budget_policy
    self.release_admissibility_scope_policy = release_admissibility_scope_policy
    self.evidence_replay_policy = evidence_replay_policy
    self.sandbox_identity_namespace_hash = sandbox_identity_namespace_hash
    self.sandbox_duplicate_bucket_hash = sandbox_duplicate_bucket_hash
    self.enabled_provider_profile_refs = enabled_provider_profile_refs
    self.required_operation_families = required_operation_families
    self.exercised_provider_profile_refs = exercised_provider_profile_refs
    self.exercised_operation_families = exercised_operation_families
    self.operation_coverage = operation_coverage
    self.negative_path_coverage = negative_path_coverage
    self.provider_profile_coverage_state = provider_profile_coverage_state
    self.operation_family_coverage_state = operation_family_coverage_state
    self.negative_path_coverage_state = negative_path_coverage_state
  }
}

public enum AuthoritySandboxCoverageContractOperationFamily: String, Codable, Sendable {
  case aUTHREADREFERENCE = "AUTH_READ_REFERENCE"
  case aUTHREADOBLIGATIONS = "AUTH_READ_OBLIGATIONS"
  case aUTHREADCALCULATION = "AUTH_READ_CALCULATION"
  case aUTHCREATEORAMENDDATA = "AUTH_CREATE_OR_AMEND_DATA"
  case aUTHDELETEDATA = "AUTH_DELETE_DATA"
  case aUTHTRIGGERCALCULATION = "AUTH_TRIGGER_CALCULATION"
  case aUTHSUBMITFINALDECLARATION = "AUTH_SUBMIT_FINAL_DECLARATION"
  case aUTHSUBMITPERIODICUPDATE = "AUTH_SUBMIT_PERIODIC_UPDATE"
  case aUTHSUBMITPOSTFINALISATIONAMENDMENT = "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT"
  case aUTHRECONCILESTATUS = "AUTH_RECONCILE_STATUS"
}

public struct AuthoritySandboxCoverageContractOperationCoverageEntry: Codable, Sendable {
  public let provider_profile_ref: String
  public let provider_environment: String
  public let operation_family: AuthoritySandboxCoverageContractOperationFamily
  public let operation_profile_ref: String
  public let authority_binding_ref: String
  public let request_envelope_ref: String
  public let interaction_record_ref: String
  public let request_identity_namespace_hash: String
  public let duplicate_bucket_hash: String
  public let fraud_header_validation_ref_or_null: String?
  public let coverage_outcome: JSONValue

  public init(
    provider_profile_ref: String,
    provider_environment: String,
    operation_family: AuthoritySandboxCoverageContractOperationFamily,
    operation_profile_ref: String,
    authority_binding_ref: String,
    request_envelope_ref: String,
    interaction_record_ref: String,
    request_identity_namespace_hash: String,
    duplicate_bucket_hash: String,
    fraud_header_validation_ref_or_null: String?,
    coverage_outcome: JSONValue
  ) {
    self.provider_profile_ref = provider_profile_ref
    self.provider_environment = provider_environment
    self.operation_family = operation_family
    self.operation_profile_ref = operation_profile_ref
    self.authority_binding_ref = authority_binding_ref
    self.request_envelope_ref = request_envelope_ref
    self.interaction_record_ref = interaction_record_ref
    self.request_identity_namespace_hash = request_identity_namespace_hash
    self.duplicate_bucket_hash = duplicate_bucket_hash
    self.fraud_header_validation_ref_or_null = fraud_header_validation_ref_or_null
    self.coverage_outcome = coverage_outcome
  }
}

public struct AuthoritySandboxCoverageContractNegativePathCoverageEntry: Codable, Sendable {
  public let case_code: String
  public let provider_profile_ref: String
  public let operation_family: AuthoritySandboxCoverageContractOperationFamily
  public let operation_profile_ref: String
  public let request_identity_namespace_hash_or_null: String?
  public let duplicate_bucket_hash_or_null: String?
  public let authority_binding_ref_or_null: String?
  public let request_envelope_ref_or_null: String?
  public let interaction_record_ref_or_null: String?
  public let ingress_receipt_ref_or_null: String?
  public let expected_fail_closed_posture: String

  public init(
    case_code: String,
    provider_profile_ref: String,
    operation_family: AuthoritySandboxCoverageContractOperationFamily,
    operation_profile_ref: String,
    request_identity_namespace_hash_or_null: String?,
    duplicate_bucket_hash_or_null: String?,
    authority_binding_ref_or_null: String?,
    request_envelope_ref_or_null: String?,
    interaction_record_ref_or_null: String?,
    ingress_receipt_ref_or_null: String?,
    expected_fail_closed_posture: String
  ) {
    self.case_code = case_code
    self.provider_profile_ref = provider_profile_ref
    self.operation_family = operation_family
    self.operation_profile_ref = operation_profile_ref
    self.request_identity_namespace_hash_or_null = request_identity_namespace_hash_or_null
    self.duplicate_bucket_hash_or_null = duplicate_bucket_hash_or_null
    self.authority_binding_ref_or_null = authority_binding_ref_or_null
    self.request_envelope_ref_or_null = request_envelope_ref_or_null
    self.interaction_record_ref_or_null = interaction_record_ref_or_null
    self.ingress_receipt_ref_or_null = ingress_receipt_ref_or_null
    self.expected_fail_closed_posture = expected_fail_closed_posture
  }
}

public enum AuthoritySandboxCoverageContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_sandbox_coverage_contract.schema.json"
  public static let sourceHash = "030242cf15ff1373792ad946c7279751d810864c94cfa8c9d11d0d3945b7e471"
}

public struct AuthorityTruthContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let boundary_scope: String
  public let truth_surface_role: String
  public let surface_specific_binding_policy: String
  public let authority_confirmation_policy: JSONValue
  public let non_confirming_state_policy: JSONValue
  public let normalization_gate_policy: JSONValue
  public let mirror_projection_policy: JSONValue
  public let unresolved_projection_policy: JSONValue
  public let override_confirmation_policy: JSONValue
  public let correction_propagation_policy: JSONValue

  public init(
    contract_version: JSONValue,
    boundary_scope: String,
    truth_surface_role: String,
    surface_specific_binding_policy: String,
    authority_confirmation_policy: JSONValue,
    non_confirming_state_policy: JSONValue,
    normalization_gate_policy: JSONValue,
    mirror_projection_policy: JSONValue,
    unresolved_projection_policy: JSONValue,
    override_confirmation_policy: JSONValue,
    correction_propagation_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.boundary_scope = boundary_scope
    self.truth_surface_role = truth_surface_role
    self.surface_specific_binding_policy = surface_specific_binding_policy
    self.authority_confirmation_policy = authority_confirmation_policy
    self.non_confirming_state_policy = non_confirming_state_policy
    self.normalization_gate_policy = normalization_gate_policy
    self.mirror_projection_policy = mirror_projection_policy
    self.unresolved_projection_policy = unresolved_projection_policy
    self.override_confirmation_policy = override_confirmation_policy
    self.correction_propagation_policy = correction_propagation_policy
  }
}

public enum AuthorityTruthContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authority_truth_contract.schema.json"
  public static let sourceHash = "8ec4d21bb7ff13d5042ef87335b48f3b1920525111ccc4a12968bf2dc2dd9a0b"
}

public struct AuthorizationDecision: Codable, Sendable {
  public let artifact_type: JSONValue
  public let decision_id: String
  public let principal_context_ref: String
  public let resource_class: String
  public let action_family: String
  public let decision: String
  public let reason_codes: [String]
  public let effective_scope: [String]
  public let effective_partition_scope_refs: [String]
  public let masking_rules: [String]
  public let required_approvals: [String]
  public let required_authn_level: JSONValue
  public let policy_snapshot_hash: String
  public let access_binding_hash: String
  public let dependency_topology_hash: String?
  public let simulation_basis_hash: String?
  public let delegation_snapshot_refs: [String]
  public let authority_link_snapshot_refs: [String]
  public let authority_layer_boundary: AuthorityLayerBoundaryContract
  public let bounded_safe_mutation: JSONValue
  public let approval_requirement: JSONValue
  public let evaluated_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    decision_id: String,
    principal_context_ref: String,
    resource_class: String,
    action_family: String,
    decision: String,
    reason_codes: [String],
    effective_scope: [String],
    effective_partition_scope_refs: [String],
    masking_rules: [String],
    required_approvals: [String],
    required_authn_level: JSONValue,
    policy_snapshot_hash: String,
    access_binding_hash: String,
    dependency_topology_hash: String?,
    simulation_basis_hash: String?,
    delegation_snapshot_refs: [String],
    authority_link_snapshot_refs: [String],
    authority_layer_boundary: AuthorityLayerBoundaryContract,
    bounded_safe_mutation: JSONValue,
    approval_requirement: JSONValue,
    evaluated_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.decision_id = decision_id
    self.principal_context_ref = principal_context_ref
    self.resource_class = resource_class
    self.action_family = action_family
    self.decision = decision
    self.reason_codes = reason_codes
    self.effective_scope = effective_scope
    self.effective_partition_scope_refs = effective_partition_scope_refs
    self.masking_rules = masking_rules
    self.required_approvals = required_approvals
    self.required_authn_level = required_authn_level
    self.policy_snapshot_hash = policy_snapshot_hash
    self.access_binding_hash = access_binding_hash
    self.dependency_topology_hash = dependency_topology_hash
    self.simulation_basis_hash = simulation_basis_hash
    self.delegation_snapshot_refs = delegation_snapshot_refs
    self.authority_link_snapshot_refs = authority_link_snapshot_refs
    self.authority_layer_boundary = authority_layer_boundary
    self.bounded_safe_mutation = bounded_safe_mutation
    self.approval_requirement = approval_requirement
    self.evaluated_at = evaluated_at
  }
}

public enum AuthorizationDecisionSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/authorization_decision.schema.json"
  public static let sourceHash = "0e6c1e709c90ed63c93c8549abc297df5a9fa989dff4d00ac331e88c299c8ede"
}

public struct ConnectorBinding: Codable, Sendable {
  public let artifact_type: JSONValue
  public let binding_id: String
  public let tenant_id: String
  public let client_id: String
  public let provider: String
  public let provider_environment: String
  public let provider_api_version: String
  public let subject_ref: String
  public let scopes: [String]
  public let partition_scope_refs: [String]
  public let token_ref: String
  public let token_version_ref: String
  public let binding_lineage_ref: String
  public let lifecycle_state: String
  public let health_state: String
  public let delegation_state: String
  public let client_binding_state: String
  public let last_validated_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString
  public let revoked_at: ISO8601DateTimeString
  public let superseded_by_binding_id: String?
  public let blocked_reason_codes: [String]
  public let source_evidence_refs: [String]

  public init(
    artifact_type: JSONValue,
    binding_id: String,
    tenant_id: String,
    client_id: String,
    provider: String,
    provider_environment: String,
    provider_api_version: String,
    subject_ref: String,
    scopes: [String],
    partition_scope_refs: [String],
    token_ref: String,
    token_version_ref: String,
    binding_lineage_ref: String,
    lifecycle_state: String,
    health_state: String,
    delegation_state: String,
    client_binding_state: String,
    last_validated_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString,
    revoked_at: ISO8601DateTimeString,
    superseded_by_binding_id: String?,
    blocked_reason_codes: [String],
    source_evidence_refs: [String]
  ) {
    self.artifact_type = artifact_type
    self.binding_id = binding_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.provider = provider
    self.provider_environment = provider_environment
    self.provider_api_version = provider_api_version
    self.subject_ref = subject_ref
    self.scopes = scopes
    self.partition_scope_refs = partition_scope_refs
    self.token_ref = token_ref
    self.token_version_ref = token_version_ref
    self.binding_lineage_ref = binding_lineage_ref
    self.lifecycle_state = lifecycle_state
    self.health_state = health_state
    self.delegation_state = delegation_state
    self.client_binding_state = client_binding_state
    self.last_validated_at = last_validated_at
    self.expires_at = expires_at
    self.revoked_at = revoked_at
    self.superseded_by_binding_id = superseded_by_binding_id
    self.blocked_reason_codes = blocked_reason_codes
    self.source_evidence_refs = source_evidence_refs
  }
}

public enum ConnectorBindingSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/connector_binding.schema.json"
  public static let sourceHash = "5acd5da296acb854028adc3f1e848c1da3557e47996a7e78510ecb45b4ba3b49"
}

public struct DelegationGrant: Codable, Sendable {
  public let artifact_type: JSONValue
  public let delegation_grant_id: String
  public let tenant_id: String
  public let reporting_subject_ref: String
  public let delegate_ref: String?
  public let delegate_class: JSONValue
  public let authority_scope_refs: [String]
  public let partition_scope_refs: [String]
  public let basis_type: String
  public let basis_evidence_refs: [String]
  public let effective_from: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString
  public let revoked_at: ISO8601DateTimeString
  public let superseded_by_grant_id: String?
  public let lifecycle_state: String
  public let last_validated_at: ISO8601DateTimeString
  public let imported_evidence_fresh_until: ISO8601DateTimeString
  public let limitation_reason_codes: [String]

  public init(
    artifact_type: JSONValue,
    delegation_grant_id: String,
    tenant_id: String,
    reporting_subject_ref: String,
    delegate_ref: String?,
    delegate_class: JSONValue,
    authority_scope_refs: [String],
    partition_scope_refs: [String],
    basis_type: String,
    basis_evidence_refs: [String],
    effective_from: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString,
    revoked_at: ISO8601DateTimeString,
    superseded_by_grant_id: String?,
    lifecycle_state: String,
    last_validated_at: ISO8601DateTimeString,
    imported_evidence_fresh_until: ISO8601DateTimeString,
    limitation_reason_codes: [String]
  ) {
    self.artifact_type = artifact_type
    self.delegation_grant_id = delegation_grant_id
    self.tenant_id = tenant_id
    self.reporting_subject_ref = reporting_subject_ref
    self.delegate_ref = delegate_ref
    self.delegate_class = delegate_class
    self.authority_scope_refs = authority_scope_refs
    self.partition_scope_refs = partition_scope_refs
    self.basis_type = basis_type
    self.basis_evidence_refs = basis_evidence_refs
    self.effective_from = effective_from
    self.expires_at = expires_at
    self.revoked_at = revoked_at
    self.superseded_by_grant_id = superseded_by_grant_id
    self.lifecycle_state = lifecycle_state
    self.last_validated_at = last_validated_at
    self.imported_evidence_fresh_until = imported_evidence_fresh_until
    self.limitation_reason_codes = limitation_reason_codes
  }
}

public enum DelegationGrantSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/delegation_grant.schema.json"
  public static let sourceHash = "0a8ff2754ea385ca0a0278cf49baed409fbbd6d9f717ef0c6fdffa8681182276"
}

public struct ExceptionalAuthorityGrant: Codable, Sendable {
  public let artifact_type: JSONValue
  public let exceptional_grant_id: String
  public let incident_ref: String
  public let target_action_family: String
  public let tenant_id: String
  public let client_id: String
  public let partition_scope_refs: [String]
  public let requesting_principal_ref: String
  public let requesting_principal_class: String
  public let approving_principal_ref: String
  public let approving_principal_class: JSONValue
  public let activated_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString
  public let revoked_at: ISO8601DateTimeString
  public let usage_limit: Int
  public let remaining_uses: Int
  public let rationale: String
  public let compensating_control_refs: [String]
  public let lifecycle_state: String
  public let approval_step_up_state: JSONValue
  public let approval_step_up_evidence_ref: String
  public let self_approved: JSONValue
  public let authority_acknowledgement_override_permitted: JSONValue
  public let delegation_substitution_permitted: JSONValue
  public let silent_client_widening_permitted: JSONValue
  public let declaration_sign_without_signatory_basis_permitted: JSONValue
  public let truth_confirmation_override_permitted: JSONValue
  public let silent_partition_widening_permitted: JSONValue

  public init(
    artifact_type: JSONValue,
    exceptional_grant_id: String,
    incident_ref: String,
    target_action_family: String,
    tenant_id: String,
    client_id: String,
    partition_scope_refs: [String],
    requesting_principal_ref: String,
    requesting_principal_class: String,
    approving_principal_ref: String,
    approving_principal_class: JSONValue,
    activated_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString,
    revoked_at: ISO8601DateTimeString,
    usage_limit: Int,
    remaining_uses: Int,
    rationale: String,
    compensating_control_refs: [String],
    lifecycle_state: String,
    approval_step_up_state: JSONValue,
    approval_step_up_evidence_ref: String,
    self_approved: JSONValue,
    authority_acknowledgement_override_permitted: JSONValue,
    delegation_substitution_permitted: JSONValue,
    silent_client_widening_permitted: JSONValue,
    declaration_sign_without_signatory_basis_permitted: JSONValue,
    truth_confirmation_override_permitted: JSONValue,
    silent_partition_widening_permitted: JSONValue
  ) {
    self.artifact_type = artifact_type
    self.exceptional_grant_id = exceptional_grant_id
    self.incident_ref = incident_ref
    self.target_action_family = target_action_family
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.partition_scope_refs = partition_scope_refs
    self.requesting_principal_ref = requesting_principal_ref
    self.requesting_principal_class = requesting_principal_class
    self.approving_principal_ref = approving_principal_ref
    self.approving_principal_class = approving_principal_class
    self.activated_at = activated_at
    self.expires_at = expires_at
    self.revoked_at = revoked_at
    self.usage_limit = usage_limit
    self.remaining_uses = remaining_uses
    self.rationale = rationale
    self.compensating_control_refs = compensating_control_refs
    self.lifecycle_state = lifecycle_state
    self.approval_step_up_state = approval_step_up_state
    self.approval_step_up_evidence_ref = approval_step_up_evidence_ref
    self.self_approved = self_approved
    self.authority_acknowledgement_override_permitted = authority_acknowledgement_override_permitted
    self.delegation_substitution_permitted = delegation_substitution_permitted
    self.silent_client_widening_permitted = silent_client_widening_permitted
    self.declaration_sign_without_signatory_basis_permitted = declaration_sign_without_signatory_basis_permitted
    self.truth_confirmation_override_permitted = truth_confirmation_override_permitted
    self.silent_partition_widening_permitted = silent_partition_widening_permitted
  }
}

public enum ExceptionalAuthorityGrantSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/exceptional_authority_grant.schema.json"
  public static let sourceHash = "4ac571c4c0de79a0a212bd8194dd409108127629a5dada7b891535c7963e4e43"
}

public struct NightlyBatchIdentityContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let identity_contract_hash: String
  public let tenant_id: String
  public let nightly_window_key: String
  public let trigger_class: String
  public let release_verification_manifest_ref: String
  public let policy_snapshot_hash: String
  public let autopilot_policy_hash: String
  public let scheduler_dedupe_key: String
  public let schema_bundle_hash: String
  public let code_build_id: String
  public let environment_ref: String
  public let selection_universe_hash: String
  public let selection_universe_count: Int
  public let reclaimed_predecessor_batch_run_ref_or_null: String?
  public let recovery_resume_state: String
  public let identity_binding_policy: JSONValue
  public let same_window_duplicate_policy: JSONValue
  public let candidate_universe_policy: JSONValue
  public let terminal_result_reuse_policy: JSONValue
  public let active_attempt_isolation_policy: JSONValue
  public let shard_failure_isolation_policy: JSONValue
  public let cross_window_continuity_policy: JSONValue
  public let recovery_lineage_policy: JSONValue

  public init(
    contract_version: JSONValue,
    identity_contract_hash: String,
    tenant_id: String,
    nightly_window_key: String,
    trigger_class: String,
    release_verification_manifest_ref: String,
    policy_snapshot_hash: String,
    autopilot_policy_hash: String,
    scheduler_dedupe_key: String,
    schema_bundle_hash: String,
    code_build_id: String,
    environment_ref: String,
    selection_universe_hash: String,
    selection_universe_count: Int,
    reclaimed_predecessor_batch_run_ref_or_null: String?,
    recovery_resume_state: String,
    identity_binding_policy: JSONValue,
    same_window_duplicate_policy: JSONValue,
    candidate_universe_policy: JSONValue,
    terminal_result_reuse_policy: JSONValue,
    active_attempt_isolation_policy: JSONValue,
    shard_failure_isolation_policy: JSONValue,
    cross_window_continuity_policy: JSONValue,
    recovery_lineage_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.identity_contract_hash = identity_contract_hash
    self.tenant_id = tenant_id
    self.nightly_window_key = nightly_window_key
    self.trigger_class = trigger_class
    self.release_verification_manifest_ref = release_verification_manifest_ref
    self.policy_snapshot_hash = policy_snapshot_hash
    self.autopilot_policy_hash = autopilot_policy_hash
    self.scheduler_dedupe_key = scheduler_dedupe_key
    self.schema_bundle_hash = schema_bundle_hash
    self.code_build_id = code_build_id
    self.environment_ref = environment_ref
    self.selection_universe_hash = selection_universe_hash
    self.selection_universe_count = selection_universe_count
    self.reclaimed_predecessor_batch_run_ref_or_null = reclaimed_predecessor_batch_run_ref_or_null
    self.recovery_resume_state = recovery_resume_state
    self.identity_binding_policy = identity_binding_policy
    self.same_window_duplicate_policy = same_window_duplicate_policy
    self.candidate_universe_policy = candidate_universe_policy
    self.terminal_result_reuse_policy = terminal_result_reuse_policy
    self.active_attempt_isolation_policy = active_attempt_isolation_policy
    self.shard_failure_isolation_policy = shard_failure_isolation_policy
    self.cross_window_continuity_policy = cross_window_continuity_policy
    self.recovery_lineage_policy = recovery_lineage_policy
  }
}

public enum NightlyBatchIdentityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/nightly_batch_identity_contract.schema.json"
  public static let sourceHash = "7dd3ba6dc2bfee171db16a79c73cb12b716a27b73fa7eb4c5a50d182b4d8c19a"
}

public struct PrincipalAccessView: Codable, Sendable {
  public let artifact_type: JSONValue
  public let tenant_id: String
  public let shell_family: JSONValue
  public let object_anchor_ref: String
  public let dominant_question: String
  public let settlement_state: PrincipalAccessViewSettlementState
  public let recovery_posture: PrincipalAccessViewRecoveryPosture
  public let interaction_layer: JSONValue
  public let cache_isolation_contract: JSONValue
  public let principal_id: String
  public let principal_type: String
  public let effective_role_set: [String]
  public let delegation_summaries: [PrincipalAccessViewDelegationSummary]
  public let authn_level: String
  public let approval_capabilities: [String]
  public let run_kind_capabilities: [String]
  public let action_matrix: [PrincipalAccessViewActionMatrixCell]
  public let focus_anchor_ref: String?
  public let access_workspace: PrincipalAccessViewAccessWorkspace
  public let selected_action_detail: JSONValue
  public let last_step_up_at: ISO8601DateTimeString
  public let last_modified_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    tenant_id: String,
    shell_family: JSONValue,
    object_anchor_ref: String,
    dominant_question: String,
    settlement_state: PrincipalAccessViewSettlementState,
    recovery_posture: PrincipalAccessViewRecoveryPosture,
    interaction_layer: JSONValue,
    cache_isolation_contract: JSONValue,
    principal_id: String,
    principal_type: String,
    effective_role_set: [String],
    delegation_summaries: [PrincipalAccessViewDelegationSummary],
    authn_level: String,
    approval_capabilities: [String],
    run_kind_capabilities: [String],
    action_matrix: [PrincipalAccessViewActionMatrixCell],
    focus_anchor_ref: String?,
    access_workspace: PrincipalAccessViewAccessWorkspace,
    selected_action_detail: JSONValue,
    last_step_up_at: ISO8601DateTimeString,
    last_modified_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.tenant_id = tenant_id
    self.shell_family = shell_family
    self.object_anchor_ref = object_anchor_ref
    self.dominant_question = dominant_question
    self.settlement_state = settlement_state
    self.recovery_posture = recovery_posture
    self.interaction_layer = interaction_layer
    self.cache_isolation_contract = cache_isolation_contract
    self.principal_id = principal_id
    self.principal_type = principal_type
    self.effective_role_set = effective_role_set
    self.delegation_summaries = delegation_summaries
    self.authn_level = authn_level
    self.approval_capabilities = approval_capabilities
    self.run_kind_capabilities = run_kind_capabilities
    self.action_matrix = action_matrix
    self.focus_anchor_ref = focus_anchor_ref
    self.access_workspace = access_workspace
    self.selected_action_detail = selected_action_detail
    self.last_step_up_at = last_step_up_at
    self.last_modified_at = last_modified_at
  }
}

public enum PrincipalAccessViewSettlementState: String, Codable, Sendable {
  case sTEADY = "STEADY"
  case rECEIPTPENDING = "RECEIPT_PENDING"
  case fRESHENING = "FRESHENING"
  case sTALEREVIEWREQUIRED = "STALE_REVIEW_REQUIRED"
  case dEGRADEDREADONLY = "DEGRADED_READ_ONLY"
  case rECOVERYREQUIRED = "RECOVERY_REQUIRED"
}

public enum PrincipalAccessViewRecoveryPosture: String, Codable, Sendable {
  case nONE = "NONE"
  case iNLINERECONNECT = "INLINE_RECONNECT"
  case iNLINEREBASE = "INLINE_REBASE"
  case rEADONLYLIMITED = "READ_ONLY_LIMITED"
  case oBJECTSUPERSEDED = "OBJECT_SUPERSEDED"
  case aCCESSREBINDREQUIRED = "ACCESS_REBIND_REQUIRED"
}

public struct PrincipalAccessViewInteractionLayer: Codable, Sendable {
  public let selected_filter_chip_refs: [String]
  public let compaction_mode: String
  public let auxiliary_surface_presentation: String
  public let focus_trap_mode: String
  public let selection_persistence_mode: JSONValue
  public let preserved_context_codes: [String]

  public init(
    selected_filter_chip_refs: [String],
    compaction_mode: String,
    auxiliary_surface_presentation: String,
    focus_trap_mode: String,
    selection_persistence_mode: JSONValue,
    preserved_context_codes: [String]
  ) {
    self.selected_filter_chip_refs = selected_filter_chip_refs
    self.compaction_mode = compaction_mode
    self.auxiliary_surface_presentation = auxiliary_surface_presentation
    self.focus_trap_mode = focus_trap_mode
    self.selection_persistence_mode = selection_persistence_mode
    self.preserved_context_codes = preserved_context_codes
  }
}

public enum PrincipalAccessViewWorkspaceMode: String, Codable, Sendable {
  case pRINCIPALS = "PRINCIPALS"
  case rOLES = "ROLES"
  case sIMULATOR = "SIMULATOR"
}

public enum PrincipalAccessViewInspectorState: String, Codable, Sendable {
  case hIDDEN = "HIDDEN"
  case cELLSELECTED = "CELL_SELECTED"
  case rOLEEDITING = "ROLE_EDITING"
  case sIMULATIONSELECTED = "SIMULATION_SELECTED"
}

public enum PrincipalAccessViewPromotedSupportSurface: String, Codable, Sendable {
  case aUDITSIDECAR = "AUDIT_SIDECAR"
  case aUTHORITYCHAINPANEL = "AUTHORITY_CHAIN_PANEL"
  case pOLICYSIMULATOR = "POLICY_SIMULATOR"
}

public enum PrincipalAccessViewChainLayerOutcome: String, Codable, Sendable {
  case aLLOW = "ALLOW"
  case aLLOWMASKED = "ALLOW_MASKED"
  case rEQUIRESTEPUP = "REQUIRE_STEP_UP"
  case rEQUIREAPPROVAL = "REQUIRE_APPROVAL"
  case dENY = "DENY"
  case nOTAPPLICABLE = "NOT_APPLICABLE"
}

public struct PrincipalAccessViewDelegationSummary: Codable, Sendable {
  public let client_id: String
  public let delegation_basis: String
  public let scope_refs: [String]
  public let lifecycle_state: String
  public let expires_at: ISO8601DateTimeString?

  public init(
    client_id: String,
    delegation_basis: String,
    scope_refs: [String],
    lifecycle_state: String,
    expires_at: ISO8601DateTimeString? = nil
  ) {
    self.client_id = client_id
    self.delegation_basis = delegation_basis
    self.scope_refs = scope_refs
    self.lifecycle_state = lifecycle_state
    self.expires_at = expires_at
  }
}

public struct PrincipalAccessViewAuthorityChainLayerBase: Codable, Sendable {
  public let layer_code: String
  public let layer_outcome: PrincipalAccessViewChainLayerOutcome
  public let reason_codes: [String]

  public init(
    layer_code: String,
    layer_outcome: PrincipalAccessViewChainLayerOutcome,
    reason_codes: [String]
  ) {
    self.layer_code = layer_code
    self.layer_outcome = layer_outcome
    self.reason_codes = reason_codes
  }
}

public typealias PrincipalAccessViewSessionAuthnLayer = PrincipalAccessViewAuthorityChainLayerBase

public typealias PrincipalAccessViewTenantOperationalAuthorityLayer = PrincipalAccessViewAuthorityChainLayerBase

public typealias PrincipalAccessViewClientDelegationCoverageLayer = PrincipalAccessViewAuthorityChainLayerBase

public typealias PrincipalAccessViewExternalAuthorityLinkReadinessLayer = PrincipalAccessViewAuthorityChainLayerBase

public typealias PrincipalAccessViewAuthorityOfRecordOutcomeLayer = PrincipalAccessViewAuthorityChainLayerBase

public typealias PrincipalAccessViewAuthorityChainLayerStack = [PrincipalAccessViewAuthorityOfRecordOutcomeLayer]

public struct PrincipalAccessViewActionMatrixCell: Codable, Sendable {
  public let cell_ref: String
  public let resource_class: String
  public let action_family: String
  public let decision: String
  public let reason_codes: [String]
  public let effective_scope: [String]
  public let masking_rules: [String]
  public let required_approvals: [String]
  public let required_authn_level: JSONValue
  public let policy_path_ref: String?
  public let authority_chain_layers: PrincipalAccessViewAuthorityChainLayerStack

  public init(
    cell_ref: String,
    resource_class: String,
    action_family: String,
    decision: String,
    reason_codes: [String],
    effective_scope: [String],
    masking_rules: [String],
    required_approvals: [String],
    required_authn_level: JSONValue,
    policy_path_ref: String? = nil,
    authority_chain_layers: PrincipalAccessViewAuthorityChainLayerStack
  ) {
    self.cell_ref = cell_ref
    self.resource_class = resource_class
    self.action_family = action_family
    self.decision = decision
    self.reason_codes = reason_codes
    self.effective_scope = effective_scope
    self.masking_rules = masking_rules
    self.required_approvals = required_approvals
    self.required_authn_level = required_authn_level
    self.policy_path_ref = policy_path_ref
    self.authority_chain_layers = authority_chain_layers
  }
}

public struct PrincipalAccessViewActiveFilters: Codable, Sendable {
  public let principal_types: [String]
  public let principal_states: [String]
  public let role_refs: [String]
  public let delegated_client_refs: [String]
  public let recent_change_owner_refs: [String]

  public init(
    principal_types: [String],
    principal_states: [String],
    role_refs: [String],
    delegated_client_refs: [String],
    recent_change_owner_refs: [String]
  ) {
    self.principal_types = principal_types
    self.principal_states = principal_states
    self.role_refs = role_refs
    self.delegated_client_refs = delegated_client_refs
    self.recent_change_owner_refs = recent_change_owner_refs
  }
}

public struct PrincipalAccessViewAccessWorkspace: Codable, Sendable {
  public let surface_order: JSONValue
  public let workspace_mode: PrincipalAccessViewWorkspaceMode
  public let active_filters: PrincipalAccessViewActiveFilters
  public let selected_principal_ref: String?
  public let selected_role_template_ref: String?
  public let selected_cell_ref: String?
  public let grid_navigation_model: JSONValue
  public let inspector_state: PrincipalAccessViewInspectorState
  public let promoted_support_surface: PrincipalAccessViewPromotedSupportSurface
  public let latest_simulation_ref: String?
  public let role_editor_pending_change_refs: [String]

  public init(
    surface_order: JSONValue,
    workspace_mode: PrincipalAccessViewWorkspaceMode,
    active_filters: PrincipalAccessViewActiveFilters,
    selected_principal_ref: String?,
    selected_role_template_ref: String?,
    selected_cell_ref: String?,
    grid_navigation_model: JSONValue,
    inspector_state: PrincipalAccessViewInspectorState,
    promoted_support_surface: PrincipalAccessViewPromotedSupportSurface,
    latest_simulation_ref: String?,
    role_editor_pending_change_refs: [String]
  ) {
    self.surface_order = surface_order
    self.workspace_mode = workspace_mode
    self.active_filters = active_filters
    self.selected_principal_ref = selected_principal_ref
    self.selected_role_template_ref = selected_role_template_ref
    self.selected_cell_ref = selected_cell_ref
    self.grid_navigation_model = grid_navigation_model
    self.inspector_state = inspector_state
    self.promoted_support_surface = promoted_support_surface
    self.latest_simulation_ref = latest_simulation_ref
    self.role_editor_pending_change_refs = role_editor_pending_change_refs
  }
}

public struct PrincipalAccessViewSelectedActionDetail: Codable, Sendable {
  public let panel_mode: JSONValue
  public let cell_ref: String
  public let resource_class: String
  public let action_family: String
  public let decision: String
  public let reason_codes: [String]
  public let effective_scope: [String]
  public let masking_rules: [String]
  public let required_approvals: [String]
  public let required_authn_level: JSONValue
  public let policy_path_ref: String
  public let authority_chain_layers: PrincipalAccessViewAuthorityChainLayerStack

  public init(
    panel_mode: JSONValue,
    cell_ref: String,
    resource_class: String,
    action_family: String,
    decision: String,
    reason_codes: [String],
    effective_scope: [String],
    masking_rules: [String],
    required_approvals: [String],
    required_authn_level: JSONValue,
    policy_path_ref: String,
    authority_chain_layers: PrincipalAccessViewAuthorityChainLayerStack
  ) {
    self.panel_mode = panel_mode
    self.cell_ref = cell_ref
    self.resource_class = resource_class
    self.action_family = action_family
    self.decision = decision
    self.reason_codes = reason_codes
    self.effective_scope = effective_scope
    self.masking_rules = masking_rules
    self.required_approvals = required_approvals
    self.required_authn_level = required_authn_level
    self.policy_path_ref = policy_path_ref
    self.authority_chain_layers = authority_chain_layers
  }
}

public enum PrincipalAccessViewSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/principal_access_view.schema.json"
  public static let sourceHash = "d14cf60086be7f6f1e7029ee705dd381471465fb7e48add6807a1412daa865f2"
}

public struct PrincipalContext: Codable, Sendable {
  public let artifact_type: JSONValue
  public let principal_id: String
  public let principal_type: String
  public let effective_role_set: [String]
  public let tenant_id: String
  public let client_scope: [String]
  public let requested_scope: [String]
  public let partition_scope_refs: [String]
  public let authn_level: String
  public let subject_identity_assurance_level: String
  public let session_id: String
  public let service_identity_ref: String?
  public let delegation_basis: String
  public let authorization_evaluated_at: ISO8601DateTimeString
  public let policy_snapshot_hash: String
  public let access_binding_hash: String
  public let delegation_snapshot_refs: [String]
  public let authority_link_refs: [String]
  public let authority_link_snapshot_refs: [String]
  public let masking_scope: String
  public let approval_capabilities: [String]
  public let client_portal_capabilities: [String]
  public let run_kind_capabilities: [String]

  public init(
    artifact_type: JSONValue,
    principal_id: String,
    principal_type: String,
    effective_role_set: [String],
    tenant_id: String,
    client_scope: [String],
    requested_scope: [String],
    partition_scope_refs: [String],
    authn_level: String,
    subject_identity_assurance_level: String,
    session_id: String,
    service_identity_ref: String?,
    delegation_basis: String,
    authorization_evaluated_at: ISO8601DateTimeString,
    policy_snapshot_hash: String,
    access_binding_hash: String,
    delegation_snapshot_refs: [String],
    authority_link_refs: [String],
    authority_link_snapshot_refs: [String],
    masking_scope: String,
    approval_capabilities: [String],
    client_portal_capabilities: [String],
    run_kind_capabilities: [String]
  ) {
    self.artifact_type = artifact_type
    self.principal_id = principal_id
    self.principal_type = principal_type
    self.effective_role_set = effective_role_set
    self.tenant_id = tenant_id
    self.client_scope = client_scope
    self.requested_scope = requested_scope
    self.partition_scope_refs = partition_scope_refs
    self.authn_level = authn_level
    self.subject_identity_assurance_level = subject_identity_assurance_level
    self.session_id = session_id
    self.service_identity_ref = service_identity_ref
    self.delegation_basis = delegation_basis
    self.authorization_evaluated_at = authorization_evaluated_at
    self.policy_snapshot_hash = policy_snapshot_hash
    self.access_binding_hash = access_binding_hash
    self.delegation_snapshot_refs = delegation_snapshot_refs
    self.authority_link_refs = authority_link_refs
    self.authority_link_snapshot_refs = authority_link_snapshot_refs
    self.masking_scope = masking_scope
    self.approval_capabilities = approval_capabilities
    self.client_portal_capabilities = client_portal_capabilities
    self.run_kind_capabilities = run_kind_capabilities
  }
}

public enum PrincipalContextSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/principal_context.schema.json"
  public static let sourceHash = "28b2fdf11d31ba4d2a7a4b7328c36798b8416df04abdf364ba65399ecb5d2696"
}

public struct ScopeExecutionBinding: Codable, Sendable {
  public let binding_scope_class: String
  public let execution_mode_or_null: JSONValue
  public let requested_scope_family: String
  public let executable_scope_family: String
  public let requested_scope: ScopeExecutionBindingScopeArray
  public let executable_scope: ScopeExecutionBindingScopeArray
  public let executable_partition_scope_refs: [String]
  public let access_decision: String
  public let reduction_posture: String
  public let mutation_atomicity: String
  public let masking_rules: [String]
  public let required_approvals: [String]
  public let required_authn_level: JSONValue
  public let access_binding_hash: String
  public let reason_codes: [String]

  public init(
    binding_scope_class: String,
    execution_mode_or_null: JSONValue,
    requested_scope_family: String,
    executable_scope_family: String,
    requested_scope: ScopeExecutionBindingScopeArray,
    executable_scope: ScopeExecutionBindingScopeArray,
    executable_partition_scope_refs: [String],
    access_decision: String,
    reduction_posture: String,
    mutation_atomicity: String,
    masking_rules: [String],
    required_approvals: [String],
    required_authn_level: JSONValue,
    access_binding_hash: String,
    reason_codes: [String]
  ) {
    self.binding_scope_class = binding_scope_class
    self.execution_mode_or_null = execution_mode_or_null
    self.requested_scope_family = requested_scope_family
    self.executable_scope_family = executable_scope_family
    self.requested_scope = requested_scope
    self.executable_scope = executable_scope
    self.executable_partition_scope_refs = executable_partition_scope_refs
    self.access_decision = access_decision
    self.reduction_posture = reduction_posture
    self.mutation_atomicity = mutation_atomicity
    self.masking_rules = masking_rules
    self.required_approvals = required_approvals
    self.required_authn_level = required_authn_level
    self.access_binding_hash = access_binding_hash
    self.reason_codes = reason_codes
  }
}

public typealias ScopeExecutionBindingScopeArray = JSONValue

public enum ScopeExecutionBindingSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/scope_execution_binding.schema.json"
  public static let sourceHash = "6470a226c64bfe14f18840f2e4c6b3aec5b9081ea5355e901b3f09e3999fc9ee"
}

public enum AuthorityAndAccessBindingManifest {
  public static let familyRef = "AUTHORITY_AND_ACCESS"
  public static let schemaCount = 32
}
