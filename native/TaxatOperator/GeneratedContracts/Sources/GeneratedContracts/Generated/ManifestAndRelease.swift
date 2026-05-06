// DO NOT EDIT: generated downstream from packages/contracts-core.
import Foundation

public struct ApiCommandReceipt: Codable, Sendable {
  public let artifact_type: JSONValue
  public let receipt_id: String
  public let tenant_id: String
  public let client_id: String
  public let principal_ref: String
  public let session_ref: String
  public let command_id: String
  public let command_type: String
  public let target_scope_class: String
  public let manifest_id: String?
  public let work_item_id: String?
  public let governance_target_ref: String?
  public let request_hash: String
  public let dependency_topology_hash: String?
  public let simulation_basis_hash: String?
  public let latest_mutation_basis_contract_or_null: JSONValue
  public let idempotency_key: String
  public let acceptance_state: String
  public let original_acceptance_state: JSONValue
  public let duplicate_of_receipt_id: String?
  public let projection_stream_class: String
  public let latest_projection_sequence: Int?
  public let latest_projection_ref: String?
  public let semantic_action_id: String?
  public let result_ref: String?
  public let reason_codes: [String]
  public let truth_boundary_contract: JSONValue
  public let mutation_precondition_binding: JSONValue
  public let stale_guard_family: JSONValue
  public let latest_stale_guard_value: String?
  public let latest_stability_contract_or_null: JSONValue
  public let activity_refs: [String]
  public let audit_event_refs: [String]
  public let notification_refs: [String]
  public let accepted_at: ISO8601DateTimeString
  public let expires_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    receipt_id: String,
    tenant_id: String,
    client_id: String,
    principal_ref: String,
    session_ref: String,
    command_id: String,
    command_type: String,
    target_scope_class: String,
    manifest_id: String?,
    work_item_id: String?,
    governance_target_ref: String?,
    request_hash: String,
    dependency_topology_hash: String?,
    simulation_basis_hash: String?,
    latest_mutation_basis_contract_or_null: JSONValue,
    idempotency_key: String,
    acceptance_state: String,
    original_acceptance_state: JSONValue,
    duplicate_of_receipt_id: String?,
    projection_stream_class: String,
    latest_projection_sequence: Int?,
    latest_projection_ref: String?,
    semantic_action_id: String?,
    result_ref: String?,
    reason_codes: [String],
    truth_boundary_contract: JSONValue,
    mutation_precondition_binding: JSONValue,
    stale_guard_family: JSONValue,
    latest_stale_guard_value: String?,
    latest_stability_contract_or_null: JSONValue,
    activity_refs: [String],
    audit_event_refs: [String],
    notification_refs: [String],
    accepted_at: ISO8601DateTimeString,
    expires_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.receipt_id = receipt_id
    self.tenant_id = tenant_id
    self.client_id = client_id
    self.principal_ref = principal_ref
    self.session_ref = session_ref
    self.command_id = command_id
    self.command_type = command_type
    self.target_scope_class = target_scope_class
    self.manifest_id = manifest_id
    self.work_item_id = work_item_id
    self.governance_target_ref = governance_target_ref
    self.request_hash = request_hash
    self.dependency_topology_hash = dependency_topology_hash
    self.simulation_basis_hash = simulation_basis_hash
    self.latest_mutation_basis_contract_or_null = latest_mutation_basis_contract_or_null
    self.idempotency_key = idempotency_key
    self.acceptance_state = acceptance_state
    self.original_acceptance_state = original_acceptance_state
    self.duplicate_of_receipt_id = duplicate_of_receipt_id
    self.projection_stream_class = projection_stream_class
    self.latest_projection_sequence = latest_projection_sequence
    self.latest_projection_ref = latest_projection_ref
    self.semantic_action_id = semantic_action_id
    self.result_ref = result_ref
    self.reason_codes = reason_codes
    self.truth_boundary_contract = truth_boundary_contract
    self.mutation_precondition_binding = mutation_precondition_binding
    self.stale_guard_family = stale_guard_family
    self.latest_stale_guard_value = latest_stale_guard_value
    self.latest_stability_contract_or_null = latest_stability_contract_or_null
    self.activity_refs = activity_refs
    self.audit_event_refs = audit_event_refs
    self.notification_refs = notification_refs
    self.accepted_at = accepted_at
    self.expires_at = expires_at
  }
}

public enum ApiCommandReceiptSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/api_command_receipt.schema.json"
  public static let sourceHash = "fe995f1540fa1295edffbce7fef87cc9f63da5b0d8e05b45c08c6dbb06a12ad6"
}

public struct BackfillExecutionContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let migration_id: String
  public let target_version: String
  public let target_schema_bundle_hash: String
  public let execution_requirement: String
  public let execution_state: String
  public let idempotency_policy: JSONValue
  public let meaning_preservation_policy: JSONValue
  public let lineage_recording_policy: JSONValue
  public let retry_safety_policy: JSONValue
  public let affected_artifact_types: [String]
  public let backfill_audit_refs: [String]

  public init(
    contract_version: JSONValue,
    migration_id: String,
    target_version: String,
    target_schema_bundle_hash: String,
    execution_requirement: String,
    execution_state: String,
    idempotency_policy: JSONValue,
    meaning_preservation_policy: JSONValue,
    lineage_recording_policy: JSONValue,
    retry_safety_policy: JSONValue,
    affected_artifact_types: [String],
    backfill_audit_refs: [String]
  ) {
    self.contract_version = contract_version
    self.migration_id = migration_id
    self.target_version = target_version
    self.target_schema_bundle_hash = target_schema_bundle_hash
    self.execution_requirement = execution_requirement
    self.execution_state = execution_state
    self.idempotency_policy = idempotency_policy
    self.meaning_preservation_policy = meaning_preservation_policy
    self.lineage_recording_policy = lineage_recording_policy
    self.retry_safety_policy = retry_safety_policy
    self.affected_artifact_types = affected_artifact_types
    self.backfill_audit_refs = backfill_audit_refs
  }
}

public enum BackfillExecutionContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/backfill_execution_contract.schema.json"
  public static let sourceHash = "5aad8237fd5fa59c1aafae3d0379ac3582dc186d0ec4030ae9e100fe31161b93"
}

public struct BuildArtifact: Codable, Sendable {
  public let build_id: String
  public let vcs_ref: String
  public let artifact_digest: String
  public let sbom_ref: String
  public let provenance_ref: String
  public let signature_ref: String
  public let artifact_registry_ref: String
  public let release_channel: String
  public let build_time: ISO8601DateTimeString
  public let distribution_targets: [String]
  public let desktop_notarization_ref: String?
  public let hardened_runtime_attestation_ref: String?

  public init(
    build_id: String,
    vcs_ref: String,
    artifact_digest: String,
    sbom_ref: String,
    provenance_ref: String,
    signature_ref: String,
    artifact_registry_ref: String,
    release_channel: String,
    build_time: ISO8601DateTimeString,
    distribution_targets: [String],
    desktop_notarization_ref: String?,
    hardened_runtime_attestation_ref: String?
  ) {
    self.build_id = build_id
    self.vcs_ref = vcs_ref
    self.artifact_digest = artifact_digest
    self.sbom_ref = sbom_ref
    self.provenance_ref = provenance_ref
    self.signature_ref = signature_ref
    self.artifact_registry_ref = artifact_registry_ref
    self.release_channel = release_channel
    self.build_time = build_time
    self.distribution_targets = distribution_targets
    self.desktop_notarization_ref = desktop_notarization_ref
    self.hardened_runtime_attestation_ref = hardened_runtime_attestation_ref
  }
}

public enum BuildArtifactSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/build_artifact.schema.json"
  public static let sourceHash = "c3beec556ae7f806aa1e8cb64911e1fef389ae8b92297d7cadde58f5257ed2dc"
}

public struct CanaryHealthSummary: Codable, Sendable {
  public let canary_summary_id: String
  public let candidate_environment_ref: String
  public let build_artifact_ref: String
  public let artifact_digest: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let canary_fraction: Double
  public let slo_profile_ref: String
  public let error_budget_profile_ref: String
  public let latency_budget_state: String
  public let error_budget_state: String
  public let health_gate_state: String
  public let abort_recommended: Bool
  public let summary_ref: String
  public let evaluated_at: ISO8601DateTimeString

  public init(
    canary_summary_id: String,
    candidate_environment_ref: String,
    build_artifact_ref: String,
    artifact_digest: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    canary_fraction: Double,
    slo_profile_ref: String,
    error_budget_profile_ref: String,
    latency_budget_state: String,
    error_budget_state: String,
    health_gate_state: String,
    abort_recommended: Bool,
    summary_ref: String,
    evaluated_at: ISO8601DateTimeString
  ) {
    self.canary_summary_id = canary_summary_id
    self.candidate_environment_ref = candidate_environment_ref
    self.build_artifact_ref = build_artifact_ref
    self.artifact_digest = artifact_digest
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.canary_fraction = canary_fraction
    self.slo_profile_ref = slo_profile_ref
    self.error_budget_profile_ref = error_budget_profile_ref
    self.latency_budget_state = latency_budget_state
    self.error_budget_state = error_budget_state
    self.health_gate_state = health_gate_state
    self.abort_recommended = abort_recommended
    self.summary_ref = summary_ref
    self.evaluated_at = evaluated_at
  }
}

public enum CanaryHealthSummarySchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/canary_health_summary.schema.json"
  public static let sourceHash = "dae0f978bc9c36ce668547a631f996ab2d657274a9ed55c2264d9466ccce81b8"
}

public struct DeploymentRelease: Codable, Sendable {
  public let release_id: String
  public let environment_ref: String
  public let build_id: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let recovery_governance_contract: RecoveryGovernanceContract
  public let schema_bundle_hash: String
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract
  public let config_bundle_hash: String
  public let rollout_strategy: String
  public let rollout_state: String
  public let state_transition_contract: StateTransitionContract
  public let rollback_boundary_state: String
  public let canary_fraction: Double?
  public let health_gate_state: String
  public let release_verification_manifest_ref: String
  public let supported_client_window_ref: String
  public let deployed_at: ISO8601DateTimeString
  public let rollback_of_release_id: String?
  public let compensating_release_id_or_null: String?
  public let rollback_runbook_ref: String
  public let fail_forward_runbook_ref: String
  public let fail_forward_owner_ref_or_null: String?
  public let emergency_override_ref: String?
  public let emergency_override_expires_at: ISO8601DateTimeString

  public init(
    release_id: String,
    environment_ref: String,
    build_id: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    recovery_governance_contract: RecoveryGovernanceContract,
    schema_bundle_hash: String,
    schema_reader_window_contract: SchemaReaderWindowContract,
    schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract,
    config_bundle_hash: String,
    rollout_strategy: String,
    rollout_state: String,
    state_transition_contract: StateTransitionContract,
    rollback_boundary_state: String,
    canary_fraction: Double?,
    health_gate_state: String,
    release_verification_manifest_ref: String,
    supported_client_window_ref: String,
    deployed_at: ISO8601DateTimeString,
    rollback_of_release_id: String?,
    compensating_release_id_or_null: String?,
    rollback_runbook_ref: String,
    fail_forward_runbook_ref: String,
    fail_forward_owner_ref_or_null: String?,
    emergency_override_ref: String?,
    emergency_override_expires_at: ISO8601DateTimeString
  ) {
    self.release_id = release_id
    self.environment_ref = environment_ref
    self.build_id = build_id
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.recovery_governance_contract = recovery_governance_contract
    self.schema_bundle_hash = schema_bundle_hash
    self.schema_reader_window_contract = schema_reader_window_contract
    self.schema_bundle_compatibility_gate_contract = schema_bundle_compatibility_gate_contract
    self.config_bundle_hash = config_bundle_hash
    self.rollout_strategy = rollout_strategy
    self.rollout_state = rollout_state
    self.state_transition_contract = state_transition_contract
    self.rollback_boundary_state = rollback_boundary_state
    self.canary_fraction = canary_fraction
    self.health_gate_state = health_gate_state
    self.release_verification_manifest_ref = release_verification_manifest_ref
    self.supported_client_window_ref = supported_client_window_ref
    self.deployed_at = deployed_at
    self.rollback_of_release_id = rollback_of_release_id
    self.compensating_release_id_or_null = compensating_release_id_or_null
    self.rollback_runbook_ref = rollback_runbook_ref
    self.fail_forward_runbook_ref = fail_forward_runbook_ref
    self.fail_forward_owner_ref_or_null = fail_forward_owner_ref_or_null
    self.emergency_override_ref = emergency_override_ref
    self.emergency_override_expires_at = emergency_override_expires_at
  }
}

public enum DeploymentReleaseSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/deployment_release.schema.json"
  public static let sourceHash = "aadebeda257a73863828b7d26a512e42abdf1c0cc06ec73768df2e8922595154"
}

public struct DeterministicGoldenPack: Codable, Sendable {
  public let golden_pack_id: String
  public let artifact_type: JSONValue
  public let contract_version: JSONValue
  public let golden_pack_hash: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let schema_bundle_hash: String
  public let config_bundle_hash: String
  public let canonical_serialization_policy: JSONValue
  public let exact_decimal_policy: JSONValue
  public let null_slot_policy: JSONValue
  public let replay_comparison_policy: JSONValue
  public let state_transition_policy: JSONValue
  public let cadence_policy: JSONValue
  public let module_fixtures: [DeterministicGoldenPackModuleFixture]
  public let state_transition_fixtures: [DeterministicGoldenPackStateTransitionFixture]
  public let replay_fixtures: [DeterministicGoldenPackReplayFixture]
  public let cadence_fixtures: [DeterministicGoldenPackCadenceFixture]

  public init(
    golden_pack_id: String,
    artifact_type: JSONValue,
    contract_version: JSONValue,
    golden_pack_hash: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    schema_bundle_hash: String,
    config_bundle_hash: String,
    canonical_serialization_policy: JSONValue,
    exact_decimal_policy: JSONValue,
    null_slot_policy: JSONValue,
    replay_comparison_policy: JSONValue,
    state_transition_policy: JSONValue,
    cadence_policy: JSONValue,
    module_fixtures: [DeterministicGoldenPackModuleFixture],
    state_transition_fixtures: [DeterministicGoldenPackStateTransitionFixture],
    replay_fixtures: [DeterministicGoldenPackReplayFixture],
    cadence_fixtures: [DeterministicGoldenPackCadenceFixture]
  ) {
    self.golden_pack_id = golden_pack_id
    self.artifact_type = artifact_type
    self.contract_version = contract_version
    self.golden_pack_hash = golden_pack_hash
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.schema_bundle_hash = schema_bundle_hash
    self.config_bundle_hash = config_bundle_hash
    self.canonical_serialization_policy = canonical_serialization_policy
    self.exact_decimal_policy = exact_decimal_policy
    self.null_slot_policy = null_slot_policy
    self.replay_comparison_policy = replay_comparison_policy
    self.state_transition_policy = state_transition_policy
    self.cadence_policy = cadence_policy
    self.module_fixtures = module_fixtures
    self.state_transition_fixtures = state_transition_fixtures
    self.replay_fixtures = replay_fixtures
    self.cadence_fixtures = cadence_fixtures
  }
}

public struct DeterministicGoldenPackDecimalFieldExpectation: Codable, Sendable {
  public let field_path: String
  public let decimal_value: ExactDecimalString

  public init(
    field_path: String,
    decimal_value: ExactDecimalString
  ) {
    self.field_path = field_path
    self.decimal_value = decimal_value
  }
}

public struct DeterministicGoldenPackOrderedArrayExpectation: Codable, Sendable {
  public let field_path: String
  public let ordering_policy: JSONValue
  public let expected_values: [String]

  public init(
    field_path: String,
    ordering_policy: JSONValue,
    expected_values: [String]
  ) {
    self.field_path = field_path
    self.ordering_policy = ordering_policy
    self.expected_values = expected_values
  }
}

public struct DeterministicGoldenPackModuleFixture: Codable, Sendable {
  public let fixture_id: String
  public let module_code: String
  public let artifact_family: String
  public let scope_binding_hash: String
  public let canonical_payload_hash: String
  public let expected_null_field_paths: [String]
  public let expected_decimal_fields: [DeterministicGoldenPackDecimalFieldExpectation]
  public let expected_ordered_array_fields: [DeterministicGoldenPackOrderedArrayExpectation]
  public let fixture_binding_policy: JSONValue

  public init(
    fixture_id: String,
    module_code: String,
    artifact_family: String,
    scope_binding_hash: String,
    canonical_payload_hash: String,
    expected_null_field_paths: [String],
    expected_decimal_fields: [DeterministicGoldenPackDecimalFieldExpectation],
    expected_ordered_array_fields: [DeterministicGoldenPackOrderedArrayExpectation],
    fixture_binding_policy: JSONValue
  ) {
    self.fixture_id = fixture_id
    self.module_code = module_code
    self.artifact_family = artifact_family
    self.scope_binding_hash = scope_binding_hash
    self.canonical_payload_hash = canonical_payload_hash
    self.expected_null_field_paths = expected_null_field_paths
    self.expected_decimal_fields = expected_decimal_fields
    self.expected_ordered_array_fields = expected_ordered_array_fields
    self.fixture_binding_policy = fixture_binding_policy
  }
}

public struct DeterministicGoldenPackStateTransitionFixture: Codable, Sendable {
  public let fixture_id: String
  public let scope_binding_hash: String
  public let state_transition_contract: StateTransitionContract
  public let expected_current_state: String
  public let expected_previous_state_or_null: String?
  public let expected_transition_event_code: String
  public let transition_binding_policy: JSONValue

  public init(
    fixture_id: String,
    scope_binding_hash: String,
    state_transition_contract: StateTransitionContract,
    expected_current_state: String,
    expected_previous_state_or_null: String?,
    expected_transition_event_code: String,
    transition_binding_policy: JSONValue
  ) {
    self.fixture_id = fixture_id
    self.scope_binding_hash = scope_binding_hash
    self.state_transition_contract = state_transition_contract
    self.expected_current_state = expected_current_state
    self.expected_previous_state_or_null = expected_previous_state_or_null
    self.expected_transition_event_code = expected_transition_event_code
    self.transition_binding_policy = transition_binding_policy
  }
}

public struct DeterministicGoldenPackReplayFixture: Codable, Sendable {
  public let fixture_id: String
  public let scope_binding_hash: String
  public let replay_class: String
  public let comparison_mode: String
  public let expected_outcome_class: String
  public let expected_execution_basis_hash: String
  public let expected_deterministic_outcome_hash: String
  public let comparison_binding_policy: JSONValue

  public init(
    fixture_id: String,
    scope_binding_hash: String,
    replay_class: String,
    comparison_mode: String,
    expected_outcome_class: String,
    expected_execution_basis_hash: String,
    expected_deterministic_outcome_hash: String,
    comparison_binding_policy: JSONValue
  ) {
    self.fixture_id = fixture_id
    self.scope_binding_hash = scope_binding_hash
    self.replay_class = replay_class
    self.comparison_mode = comparison_mode
    self.expected_outcome_class = expected_outcome_class
    self.expected_execution_basis_hash = expected_execution_basis_hash
    self.expected_deterministic_outcome_hash = expected_deterministic_outcome_hash
    self.comparison_binding_policy = comparison_binding_policy
  }
}

public struct DeterministicGoldenPackCadenceFixture: Codable, Sendable {
  public let fixture_id: String
  public let scope_binding_hash: String
  public let cadence_family: String
  public let attempt_index: Int
  public let expected_cadence_seconds: Int
  public let jitter_policy: JSONValue
  public let schedule_derivation_basis: String

  public init(
    fixture_id: String,
    scope_binding_hash: String,
    cadence_family: String,
    attempt_index: Int,
    expected_cadence_seconds: Int,
    jitter_policy: JSONValue,
    schedule_derivation_basis: String
  ) {
    self.fixture_id = fixture_id
    self.scope_binding_hash = scope_binding_hash
    self.cadence_family = cadence_family
    self.attempt_index = attempt_index
    self.expected_cadence_seconds = expected_cadence_seconds
    self.jitter_policy = jitter_policy
    self.schedule_derivation_basis = schedule_derivation_basis
  }
}

public enum DeterministicGoldenPackSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/deterministic_golden_pack.schema.json"
  public static let sourceHash = "f83bf3c5f265358b73c11893797564a683e566fbf9b23a290b84125ef7d36ea1"
}

public struct ManifestBranchDecisionContract: Codable, Sendable {
  public let branch_action: String
  public let branch_reason_code: String
  public let idempotency_key: String
  public let request_identity_hash: String
  public let access_binding_hash: String
  public let requested_scope: ManifestBranchDecisionContractScopeArray
  public let effective_scope: ManifestBranchDecisionContractScopeArray
  public let mode: String
  public let run_kind: String
  public let replay_class_or_null: JSONValue
  public let nightly_window_key_or_null: String?
  public let prior_manifest_id_or_null: String?
  public let prior_manifest_hash_at_decision_or_null: String?
  public let prior_manifest_lifecycle_state_or_null: JSONValue
  public let selected_manifest_id: String
  public let selected_manifest_continuation_basis: String
  public let root_manifest_id: String
  public let parent_manifest_id_or_null: String?
  public let continuation_of_manifest_id_or_null: String?
  public let replay_of_manifest_id_or_null: String?
  public let supersedes_manifest_id_or_null: String?
  public let selected_manifest_generation: Int
  public let config_inheritance_mode_or_null: JSONValue
  public let input_inheritance_mode_or_null: JSONValue
  public let returned_decision_bundle_hash_or_null: String?

  public init(
    branch_action: String,
    branch_reason_code: String,
    idempotency_key: String,
    request_identity_hash: String,
    access_binding_hash: String,
    requested_scope: ManifestBranchDecisionContractScopeArray,
    effective_scope: ManifestBranchDecisionContractScopeArray,
    mode: String,
    run_kind: String,
    replay_class_or_null: JSONValue,
    nightly_window_key_or_null: String?,
    prior_manifest_id_or_null: String?,
    prior_manifest_hash_at_decision_or_null: String?,
    prior_manifest_lifecycle_state_or_null: JSONValue,
    selected_manifest_id: String,
    selected_manifest_continuation_basis: String,
    root_manifest_id: String,
    parent_manifest_id_or_null: String?,
    continuation_of_manifest_id_or_null: String?,
    replay_of_manifest_id_or_null: String?,
    supersedes_manifest_id_or_null: String?,
    selected_manifest_generation: Int,
    config_inheritance_mode_or_null: JSONValue,
    input_inheritance_mode_or_null: JSONValue,
    returned_decision_bundle_hash_or_null: String?
  ) {
    self.branch_action = branch_action
    self.branch_reason_code = branch_reason_code
    self.idempotency_key = idempotency_key
    self.request_identity_hash = request_identity_hash
    self.access_binding_hash = access_binding_hash
    self.requested_scope = requested_scope
    self.effective_scope = effective_scope
    self.mode = mode
    self.run_kind = run_kind
    self.replay_class_or_null = replay_class_or_null
    self.nightly_window_key_or_null = nightly_window_key_or_null
    self.prior_manifest_id_or_null = prior_manifest_id_or_null
    self.prior_manifest_hash_at_decision_or_null = prior_manifest_hash_at_decision_or_null
    self.prior_manifest_lifecycle_state_or_null = prior_manifest_lifecycle_state_or_null
    self.selected_manifest_id = selected_manifest_id
    self.selected_manifest_continuation_basis = selected_manifest_continuation_basis
    self.root_manifest_id = root_manifest_id
    self.parent_manifest_id_or_null = parent_manifest_id_or_null
    self.continuation_of_manifest_id_or_null = continuation_of_manifest_id_or_null
    self.replay_of_manifest_id_or_null = replay_of_manifest_id_or_null
    self.supersedes_manifest_id_or_null = supersedes_manifest_id_or_null
    self.selected_manifest_generation = selected_manifest_generation
    self.config_inheritance_mode_or_null = config_inheritance_mode_or_null
    self.input_inheritance_mode_or_null = input_inheritance_mode_or_null
    self.returned_decision_bundle_hash_or_null = returned_decision_bundle_hash_or_null
  }
}

public typealias ManifestBranchDecisionContractScopeArray = JSONValue

public enum ManifestBranchDecisionContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json"
  public static let sourceHash = "8f8fc12d22eb147ce194ad6d6970f68aaaa4b124eaa858c0c34237593dee545c"
}

public struct ManifestLineageTrace: Codable, Sendable {
  public let lineage_trace_id: String
  public let contract_version: JSONValue
  public let binding_scope: JSONValue
  public let explorer_binding_policy: JSONValue
  public let operator_rendering_policy: JSONValue
  public let mirror_consistency_policy: JSONValue
  public let nightly_context_policy: JSONValue
  public let idempotency_key: String
  public let request_identity_hash: String
  public let access_binding_hash: String
  public let requested_scope: ManifestLineageTraceScopeArray
  public let effective_scope: ManifestLineageTraceScopeArray
  public let mode: String
  public let run_kind: String
  public let replay_class_or_null: JSONValue
  public let nightly_window_key_or_null: String?
  public let selected_branch_action: String
  public let selected_branch_reason_code: String
  public let selected_manifest_id: String
  public let selected_manifest_continuation_basis: String
  public let selected_manifest_generation: Int
  public let root_manifest_id: String
  public let parent_manifest_id_or_null: String?
  public let continuation_of_manifest_id_or_null: String?
  public let replay_of_manifest_id_or_null: String?
  public let supersedes_manifest_id_or_null: String?
  public let prior_manifest_id_or_null: String?
  public let prior_manifest_hash_at_decision_or_null: String?
  public let prior_manifest_lifecycle_state_or_null: JSONValue
  public let config_inheritance_mode_or_null: JSONValue
  public let input_inheritance_mode_or_null: JSONValue
  public let returned_decision_bundle_hash_or_null: String?
  public let candidate_evaluations: [ManifestLineageTraceCandidateEvaluation]
  public let mirror_consistency_state: JSONValue
  public let mirror_sources: [String]
  public let nightly_predecessor_batch_run_ref_or_null: String?
  public let nightly_predecessor_manifest_id_or_null: String?
  public let nightly_predecessor_manifest_hash_or_null: String?
  public let nightly_context_reason_code_or_null: String
  public let branch_decision_audit_refs: [String]
  public let branch_decision_trace_span_refs: [String]

  public init(
    lineage_trace_id: String,
    contract_version: JSONValue,
    binding_scope: JSONValue,
    explorer_binding_policy: JSONValue,
    operator_rendering_policy: JSONValue,
    mirror_consistency_policy: JSONValue,
    nightly_context_policy: JSONValue,
    idempotency_key: String,
    request_identity_hash: String,
    access_binding_hash: String,
    requested_scope: ManifestLineageTraceScopeArray,
    effective_scope: ManifestLineageTraceScopeArray,
    mode: String,
    run_kind: String,
    replay_class_or_null: JSONValue,
    nightly_window_key_or_null: String?,
    selected_branch_action: String,
    selected_branch_reason_code: String,
    selected_manifest_id: String,
    selected_manifest_continuation_basis: String,
    selected_manifest_generation: Int,
    root_manifest_id: String,
    parent_manifest_id_or_null: String?,
    continuation_of_manifest_id_or_null: String?,
    replay_of_manifest_id_or_null: String?,
    supersedes_manifest_id_or_null: String?,
    prior_manifest_id_or_null: String?,
    prior_manifest_hash_at_decision_or_null: String?,
    prior_manifest_lifecycle_state_or_null: JSONValue,
    config_inheritance_mode_or_null: JSONValue,
    input_inheritance_mode_or_null: JSONValue,
    returned_decision_bundle_hash_or_null: String?,
    candidate_evaluations: [ManifestLineageTraceCandidateEvaluation],
    mirror_consistency_state: JSONValue,
    mirror_sources: [String],
    nightly_predecessor_batch_run_ref_or_null: String?,
    nightly_predecessor_manifest_id_or_null: String?,
    nightly_predecessor_manifest_hash_or_null: String?,
    nightly_context_reason_code_or_null: String,
    branch_decision_audit_refs: [String],
    branch_decision_trace_span_refs: [String]
  ) {
    self.lineage_trace_id = lineage_trace_id
    self.contract_version = contract_version
    self.binding_scope = binding_scope
    self.explorer_binding_policy = explorer_binding_policy
    self.operator_rendering_policy = operator_rendering_policy
    self.mirror_consistency_policy = mirror_consistency_policy
    self.nightly_context_policy = nightly_context_policy
    self.idempotency_key = idempotency_key
    self.request_identity_hash = request_identity_hash
    self.access_binding_hash = access_binding_hash
    self.requested_scope = requested_scope
    self.effective_scope = effective_scope
    self.mode = mode
    self.run_kind = run_kind
    self.replay_class_or_null = replay_class_or_null
    self.nightly_window_key_or_null = nightly_window_key_or_null
    self.selected_branch_action = selected_branch_action
    self.selected_branch_reason_code = selected_branch_reason_code
    self.selected_manifest_id = selected_manifest_id
    self.selected_manifest_continuation_basis = selected_manifest_continuation_basis
    self.selected_manifest_generation = selected_manifest_generation
    self.root_manifest_id = root_manifest_id
    self.parent_manifest_id_or_null = parent_manifest_id_or_null
    self.continuation_of_manifest_id_or_null = continuation_of_manifest_id_or_null
    self.replay_of_manifest_id_or_null = replay_of_manifest_id_or_null
    self.supersedes_manifest_id_or_null = supersedes_manifest_id_or_null
    self.prior_manifest_id_or_null = prior_manifest_id_or_null
    self.prior_manifest_hash_at_decision_or_null = prior_manifest_hash_at_decision_or_null
    self.prior_manifest_lifecycle_state_or_null = prior_manifest_lifecycle_state_or_null
    self.config_inheritance_mode_or_null = config_inheritance_mode_or_null
    self.input_inheritance_mode_or_null = input_inheritance_mode_or_null
    self.returned_decision_bundle_hash_or_null = returned_decision_bundle_hash_or_null
    self.candidate_evaluations = candidate_evaluations
    self.mirror_consistency_state = mirror_consistency_state
    self.mirror_sources = mirror_sources
    self.nightly_predecessor_batch_run_ref_or_null = nightly_predecessor_batch_run_ref_or_null
    self.nightly_predecessor_manifest_id_or_null = nightly_predecessor_manifest_id_or_null
    self.nightly_predecessor_manifest_hash_or_null = nightly_predecessor_manifest_hash_or_null
    self.nightly_context_reason_code_or_null = nightly_context_reason_code_or_null
    self.branch_decision_audit_refs = branch_decision_audit_refs
    self.branch_decision_trace_span_refs = branch_decision_trace_span_refs
  }
}

public typealias ManifestLineageTraceScopeArray = [String]

public struct ManifestLineageTraceCandidateEvaluation: Codable, Sendable {
  public let candidate_action: String
  public let evaluation_state: String
  public let compared_manifest_id_or_null: String?
  public let compared_manifest_hash_or_null: String?
  public let compared_manifest_lifecycle_state_or_null: JSONValue
  public let disqualifier_reason_codes: [String]

  public init(
    candidate_action: String,
    evaluation_state: String,
    compared_manifest_id_or_null: String?,
    compared_manifest_hash_or_null: String?,
    compared_manifest_lifecycle_state_or_null: JSONValue,
    disqualifier_reason_codes: [String]
  ) {
    self.candidate_action = candidate_action
    self.evaluation_state = evaluation_state
    self.compared_manifest_id_or_null = compared_manifest_id_or_null
    self.compared_manifest_hash_or_null = compared_manifest_hash_or_null
    self.compared_manifest_lifecycle_state_or_null = compared_manifest_lifecycle_state_or_null
    self.disqualifier_reason_codes = disqualifier_reason_codes
  }
}

public enum ManifestLineageTraceSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/manifest_lineage_trace.schema.json"
  public static let sourceHash = "cd09f533c78f7b4580cafbf4ce26d515759094c9df230f82e6f67bcfcdc53335"
}

public struct ManifestStartClaimContract: Codable, Sendable {
  public let contract_class: JSONValue
  public let manifest_id: String
  public let manifest_hash: String
  public let execution_basis_hash: String
  public let access_binding_hash: String
  public let attempt_lineage_ref: String
  public let claim_state: String
  public let claim_status_code: String
  public let claim_epoch: Int
  public let claim_holder_ref_or_null: String?
  public let claim_token_or_null: String?
  public let claim_acquired_at_or_null: ISO8601DateTimeString
  public let claim_expires_at_or_null: ISO8601DateTimeString
  public let claim_released_at_or_null: ISO8601DateTimeString
  public let claim_release_reason_code_or_null: JSONValue
  public let stale_reclaim_reason_code_or_null: JSONValue
  public let publication_state: String
  public let stage_dag_ref_or_null: String?
  public let outbox_batch_ref_or_null: String?
  public let first_publication_committed_at_or_null: ISO8601DateTimeString
  public let concurrency_policy: JSONValue
  public let claim_publication_atomicity: JSONValue
  public let stale_reclaim_policy: JSONValue
  public let recovery_child_policy: JSONValue
  public let nightly_reclaim_policy: JSONValue

  public init(
    contract_class: JSONValue,
    manifest_id: String,
    manifest_hash: String,
    execution_basis_hash: String,
    access_binding_hash: String,
    attempt_lineage_ref: String,
    claim_state: String,
    claim_status_code: String,
    claim_epoch: Int,
    claim_holder_ref_or_null: String?,
    claim_token_or_null: String?,
    claim_acquired_at_or_null: ISO8601DateTimeString,
    claim_expires_at_or_null: ISO8601DateTimeString,
    claim_released_at_or_null: ISO8601DateTimeString,
    claim_release_reason_code_or_null: JSONValue,
    stale_reclaim_reason_code_or_null: JSONValue,
    publication_state: String,
    stage_dag_ref_or_null: String?,
    outbox_batch_ref_or_null: String?,
    first_publication_committed_at_or_null: ISO8601DateTimeString,
    concurrency_policy: JSONValue,
    claim_publication_atomicity: JSONValue,
    stale_reclaim_policy: JSONValue,
    recovery_child_policy: JSONValue,
    nightly_reclaim_policy: JSONValue
  ) {
    self.contract_class = contract_class
    self.manifest_id = manifest_id
    self.manifest_hash = manifest_hash
    self.execution_basis_hash = execution_basis_hash
    self.access_binding_hash = access_binding_hash
    self.attempt_lineage_ref = attempt_lineage_ref
    self.claim_state = claim_state
    self.claim_status_code = claim_status_code
    self.claim_epoch = claim_epoch
    self.claim_holder_ref_or_null = claim_holder_ref_or_null
    self.claim_token_or_null = claim_token_or_null
    self.claim_acquired_at_or_null = claim_acquired_at_or_null
    self.claim_expires_at_or_null = claim_expires_at_or_null
    self.claim_released_at_or_null = claim_released_at_or_null
    self.claim_release_reason_code_or_null = claim_release_reason_code_or_null
    self.stale_reclaim_reason_code_or_null = stale_reclaim_reason_code_or_null
    self.publication_state = publication_state
    self.stage_dag_ref_or_null = stage_dag_ref_or_null
    self.outbox_batch_ref_or_null = outbox_batch_ref_or_null
    self.first_publication_committed_at_or_null = first_publication_committed_at_or_null
    self.concurrency_policy = concurrency_policy
    self.claim_publication_atomicity = claim_publication_atomicity
    self.stale_reclaim_policy = stale_reclaim_policy
    self.recovery_child_policy = recovery_child_policy
    self.nightly_reclaim_policy = nightly_reclaim_policy
  }
}

public enum ManifestStartClaimContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json"
  public static let sourceHash = "43f25058c5b8c17c08d2c0e0f764f551f26d42a6af824f15382123bcae4beb00"
}

public struct RecoveryCheckpoint: Codable, Sendable {
  public let checkpoint_id: String
  public let datastore_ref: String
  public let recovery_governance_contract: RecoveryGovernanceContract
  public let backup_ref: String?
  public let checkpoint_inventory_ref: String?
  public let snapshot_time: ISO8601DateTimeString
  public let restore_tested_at: ISO8601DateTimeString
  public let restore_verification_hash: String?
  public let rpo_class: String
  public let rto_class: String
  public let checkpoint_state: String
  public let state_transition_contract: StateTransitionContract
  public let restore_drill_ref: String?
  public let privacy_reconciliation_contract: JSONValue
  public let audit_continuity_verified: Bool
  public let queue_rebuild_verified: Bool
  public let authority_rebuild_verified: Bool
  public let authority_binding_revalidation_verified: Bool
  public let privacy_reconciliation_outcome_ref: String?
  public let reopen_readiness_state: String
  public let quarantine_reason_code: String?

  public init(
    checkpoint_id: String,
    datastore_ref: String,
    recovery_governance_contract: RecoveryGovernanceContract,
    backup_ref: String?,
    checkpoint_inventory_ref: String?,
    snapshot_time: ISO8601DateTimeString,
    restore_tested_at: ISO8601DateTimeString,
    restore_verification_hash: String?,
    rpo_class: String,
    rto_class: String,
    checkpoint_state: String,
    state_transition_contract: StateTransitionContract,
    restore_drill_ref: String?,
    privacy_reconciliation_contract: JSONValue,
    audit_continuity_verified: Bool,
    queue_rebuild_verified: Bool,
    authority_rebuild_verified: Bool,
    authority_binding_revalidation_verified: Bool,
    privacy_reconciliation_outcome_ref: String?,
    reopen_readiness_state: String,
    quarantine_reason_code: String?
  ) {
    self.checkpoint_id = checkpoint_id
    self.datastore_ref = datastore_ref
    self.recovery_governance_contract = recovery_governance_contract
    self.backup_ref = backup_ref
    self.checkpoint_inventory_ref = checkpoint_inventory_ref
    self.snapshot_time = snapshot_time
    self.restore_tested_at = restore_tested_at
    self.restore_verification_hash = restore_verification_hash
    self.rpo_class = rpo_class
    self.rto_class = rto_class
    self.checkpoint_state = checkpoint_state
    self.state_transition_contract = state_transition_contract
    self.restore_drill_ref = restore_drill_ref
    self.privacy_reconciliation_contract = privacy_reconciliation_contract
    self.audit_continuity_verified = audit_continuity_verified
    self.queue_rebuild_verified = queue_rebuild_verified
    self.authority_rebuild_verified = authority_rebuild_verified
    self.authority_binding_revalidation_verified = authority_binding_revalidation_verified
    self.privacy_reconciliation_outcome_ref = privacy_reconciliation_outcome_ref
    self.reopen_readiness_state = reopen_readiness_state
    self.quarantine_reason_code = quarantine_reason_code
  }
}

public enum RecoveryCheckpointSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/recovery_checkpoint.schema.json"
  public static let sourceHash = "ff731ca38252d78d1bb84979fc46c20f4527d8acc52b19bbafd7f31641134dce"
}

public struct RecoveryGovernanceContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let boundary_scope: String
  public let protected_workload_class: String
  public let recovery_tier_class: String
  public let rpo_class: String
  public let rto_class: String
  public let boundary_specific_binding_policy: String
  public let checkpoint_inventory_policy: JSONValue
  public let checkpoint_evidence_policy: JSONValue
  public let privacy_reconciliation_policy: JSONValue
  public let compensating_re_erasure_policy: JSONValue
  public let limitation_reconciliation_policy: JSONValue
  public let queue_recovery_policy: JSONValue
  public let authority_recovery_policy: JSONValue
  public let reopen_gate_policy: JSONValue
  public let rollback_boundary_policy: JSONValue
  public let fail_forward_policy: JSONValue
  public let failover_audit_policy: JSONValue

  public init(
    contract_version: JSONValue,
    boundary_scope: String,
    protected_workload_class: String,
    recovery_tier_class: String,
    rpo_class: String,
    rto_class: String,
    boundary_specific_binding_policy: String,
    checkpoint_inventory_policy: JSONValue,
    checkpoint_evidence_policy: JSONValue,
    privacy_reconciliation_policy: JSONValue,
    compensating_re_erasure_policy: JSONValue,
    limitation_reconciliation_policy: JSONValue,
    queue_recovery_policy: JSONValue,
    authority_recovery_policy: JSONValue,
    reopen_gate_policy: JSONValue,
    rollback_boundary_policy: JSONValue,
    fail_forward_policy: JSONValue,
    failover_audit_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.boundary_scope = boundary_scope
    self.protected_workload_class = protected_workload_class
    self.recovery_tier_class = recovery_tier_class
    self.rpo_class = rpo_class
    self.rto_class = rto_class
    self.boundary_specific_binding_policy = boundary_specific_binding_policy
    self.checkpoint_inventory_policy = checkpoint_inventory_policy
    self.checkpoint_evidence_policy = checkpoint_evidence_policy
    self.privacy_reconciliation_policy = privacy_reconciliation_policy
    self.compensating_re_erasure_policy = compensating_re_erasure_policy
    self.limitation_reconciliation_policy = limitation_reconciliation_policy
    self.queue_recovery_policy = queue_recovery_policy
    self.authority_recovery_policy = authority_recovery_policy
    self.reopen_gate_policy = reopen_gate_policy
    self.rollback_boundary_policy = rollback_boundary_policy
    self.fail_forward_policy = fail_forward_policy
    self.failover_audit_policy = failover_audit_policy
  }
}

public enum RecoveryGovernanceContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/recovery_governance_contract.schema.json"
  public static let sourceHash = "34f94dd39c5e0d3f88b505641986bfb1ec497fea2e98baede2729f22b3b87952"
}

public struct ReleaseCandidateIdentityContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let candidate_identity_hash: String
  public let candidate_environment_ref: String
  public let build_artifact_ref: String
  public let artifact_digest: String
  public let schema_bundle_hash: String
  public let config_bundle_hash: String
  public let migration_plan_ref_or_null: String?
  public let enabled_provider_profile_refs: [String]
  public let supported_client_window_ref_or_null: String?
  public let array_canonicalization_policy: JSONValue
  public let suite_context_policy: JSONValue
  public let admissibility_binding_policy: JSONValue

  public init(
    contract_version: JSONValue,
    candidate_identity_hash: String,
    candidate_environment_ref: String,
    build_artifact_ref: String,
    artifact_digest: String,
    schema_bundle_hash: String,
    config_bundle_hash: String,
    migration_plan_ref_or_null: String?,
    enabled_provider_profile_refs: [String],
    supported_client_window_ref_or_null: String?,
    array_canonicalization_policy: JSONValue,
    suite_context_policy: JSONValue,
    admissibility_binding_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_environment_ref = candidate_environment_ref
    self.build_artifact_ref = build_artifact_ref
    self.artifact_digest = artifact_digest
    self.schema_bundle_hash = schema_bundle_hash
    self.config_bundle_hash = config_bundle_hash
    self.migration_plan_ref_or_null = migration_plan_ref_or_null
    self.enabled_provider_profile_refs = enabled_provider_profile_refs
    self.supported_client_window_ref_or_null = supported_client_window_ref_or_null
    self.array_canonicalization_policy = array_canonicalization_policy
    self.suite_context_policy = suite_context_policy
    self.admissibility_binding_policy = admissibility_binding_policy
  }
}

public enum ReleaseCandidateIdentityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json"
  public static let sourceHash = "c37f45e4b5bd4ad16bc3849f65e102d0f0c0b3d63c89c2b9d4e6620809b64656"
}

public struct ReleaseVerificationManifest: Codable, Sendable {
  public let verification_manifest_id: String
  public let candidate_environment_ref: String
  public let build_artifact_ref: String
  public let artifact_digest: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let manifest_assembly_contract: ReleaseVerificationManifestAssemblyContract
  public let schema_bundle_hash: String
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract
  public let config_bundle_hash: String
  public let migration_mode: String
  public let migration_plan_ref: String?
  public let enabled_provider_profile_refs: [String]
  public let executed_test_run_identifiers: [String]
  public let blocking_gates: [String: JSONValue]
  public let migration_ledger_refs: [String]
  public let canary_summary_ref: String?
  public let deterministic_golden_pack_ref: String?
  public let restore_drill_ref: String?
  public let restore_checkpoint_ref: String?
  public let supported_client_window_ref: String
  public let client_compatibility_matrix_ref: String?
  public let decision_state: String
  public let state_transition_contract: StateTransitionContract
  public let approval_ref: String?
  public let deployment_release_ref: String?
  public let superseded_by_verification_manifest_ref: String?
  public let decision_changed_at: ISO8601DateTimeString
  public let created_at: ISO8601DateTimeString

  public init(
    verification_manifest_id: String,
    candidate_environment_ref: String,
    build_artifact_ref: String,
    artifact_digest: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    manifest_assembly_contract: ReleaseVerificationManifestAssemblyContract,
    schema_bundle_hash: String,
    schema_reader_window_contract: SchemaReaderWindowContract,
    schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract,
    config_bundle_hash: String,
    migration_mode: String,
    migration_plan_ref: String?,
    enabled_provider_profile_refs: [String],
    executed_test_run_identifiers: [String],
    blocking_gates: [String: JSONValue],
    migration_ledger_refs: [String],
    canary_summary_ref: String?,
    deterministic_golden_pack_ref: String?,
    restore_drill_ref: String?,
    restore_checkpoint_ref: String?,
    supported_client_window_ref: String,
    client_compatibility_matrix_ref: String?,
    decision_state: String,
    state_transition_contract: StateTransitionContract,
    approval_ref: String?,
    deployment_release_ref: String?,
    superseded_by_verification_manifest_ref: String?,
    decision_changed_at: ISO8601DateTimeString,
    created_at: ISO8601DateTimeString
  ) {
    self.verification_manifest_id = verification_manifest_id
    self.candidate_environment_ref = candidate_environment_ref
    self.build_artifact_ref = build_artifact_ref
    self.artifact_digest = artifact_digest
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.manifest_assembly_contract = manifest_assembly_contract
    self.schema_bundle_hash = schema_bundle_hash
    self.schema_reader_window_contract = schema_reader_window_contract
    self.schema_bundle_compatibility_gate_contract = schema_bundle_compatibility_gate_contract
    self.config_bundle_hash = config_bundle_hash
    self.migration_mode = migration_mode
    self.migration_plan_ref = migration_plan_ref
    self.enabled_provider_profile_refs = enabled_provider_profile_refs
    self.executed_test_run_identifiers = executed_test_run_identifiers
    self.blocking_gates = blocking_gates
    self.migration_ledger_refs = migration_ledger_refs
    self.canary_summary_ref = canary_summary_ref
    self.deterministic_golden_pack_ref = deterministic_golden_pack_ref
    self.restore_drill_ref = restore_drill_ref
    self.restore_checkpoint_ref = restore_checkpoint_ref
    self.supported_client_window_ref = supported_client_window_ref
    self.client_compatibility_matrix_ref = client_compatibility_matrix_ref
    self.decision_state = decision_state
    self.state_transition_contract = state_transition_contract
    self.approval_ref = approval_ref
    self.deployment_release_ref = deployment_release_ref
    self.superseded_by_verification_manifest_ref = superseded_by_verification_manifest_ref
    self.decision_changed_at = decision_changed_at
    self.created_at = created_at
  }
}

public struct ReleaseVerificationManifestGateResult: Codable, Sendable {
  public let suite_family: String
  public let candidate_identity_hash: String
  public let compatibility_gate_hash_or_null: String?
  public let authority_sandbox_coverage_hash_or_null: String?
  public let result_ref: String
  public let admissibility_ref: String
  public let status: String
  public let admissibility_state: String
  public let quarantine_state: String
  public let manual_waiver_state: String
  public let executed_at: ISO8601DateTimeString

  public init(
    suite_family: String,
    candidate_identity_hash: String,
    compatibility_gate_hash_or_null: String?,
    authority_sandbox_coverage_hash_or_null: String?,
    result_ref: String,
    admissibility_ref: String,
    status: String,
    admissibility_state: String,
    quarantine_state: String,
    manual_waiver_state: String,
    executed_at: ISO8601DateTimeString
  ) {
    self.suite_family = suite_family
    self.candidate_identity_hash = candidate_identity_hash
    self.compatibility_gate_hash_or_null = compatibility_gate_hash_or_null
    self.authority_sandbox_coverage_hash_or_null = authority_sandbox_coverage_hash_or_null
    self.result_ref = result_ref
    self.admissibility_ref = admissibility_ref
    self.status = status
    self.admissibility_state = admissibility_state
    self.quarantine_state = quarantine_state
    self.manual_waiver_state = manual_waiver_state
    self.executed_at = executed_at
  }
}

public enum ReleaseVerificationManifestSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/release_verification_manifest.schema.json"
  public static let sourceHash = "f3aa0e66b6ccb71a8a0e8f39d538dbd4611b07942b62ad3b2024e64ac446d8a6"
}

public struct ReleaseVerificationManifestAssemblyContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let assembly_contract_hash: String
  public let candidate_identity_hash: String
  public let compatibility_gate_hash: String
  public let gate_order_policy: JSONValue
  public let evidence_source_policy: JSONValue
  public let admissibility_derivation_policy: JSONValue
  public let companion_evidence_policy: JSONValue
  public let decision_posture_policy: JSONValue
  public let supersession_policy: JSONValue
  public let enabled_provider_profile_refs: [String]
  public let executed_test_run_identifiers: [String]
  public let gate_bindings: [ReleaseVerificationManifestAssemblyContractGateBinding]
  public let migration_mode: String
  public let migration_plan_ref_or_null: String?
  public let migration_ledger_refs: [String]
  public let supported_client_window_ref: String
  public let canary_summary_ref_or_null: String?
  public let deterministic_golden_pack_ref_or_null: String?
  public let restore_drill_ref_or_null: String?
  public let restore_checkpoint_ref_or_null: String?
  public let client_compatibility_matrix_ref_or_null: String?
  public let decision_state: String
  public let approval_ref_or_null: String?
  public let deployment_release_ref_or_null: String?
  public let superseded_by_verification_manifest_ref_or_null: String?

  public init(
    contract_version: JSONValue,
    assembly_contract_hash: String,
    candidate_identity_hash: String,
    compatibility_gate_hash: String,
    gate_order_policy: JSONValue,
    evidence_source_policy: JSONValue,
    admissibility_derivation_policy: JSONValue,
    companion_evidence_policy: JSONValue,
    decision_posture_policy: JSONValue,
    supersession_policy: JSONValue,
    enabled_provider_profile_refs: [String],
    executed_test_run_identifiers: [String],
    gate_bindings: [ReleaseVerificationManifestAssemblyContractGateBinding],
    migration_mode: String,
    migration_plan_ref_or_null: String?,
    migration_ledger_refs: [String],
    supported_client_window_ref: String,
    canary_summary_ref_or_null: String?,
    deterministic_golden_pack_ref_or_null: String?,
    restore_drill_ref_or_null: String?,
    restore_checkpoint_ref_or_null: String?,
    client_compatibility_matrix_ref_or_null: String?,
    decision_state: String,
    approval_ref_or_null: String?,
    deployment_release_ref_or_null: String?,
    superseded_by_verification_manifest_ref_or_null: String?
  ) {
    self.contract_version = contract_version
    self.assembly_contract_hash = assembly_contract_hash
    self.candidate_identity_hash = candidate_identity_hash
    self.compatibility_gate_hash = compatibility_gate_hash
    self.gate_order_policy = gate_order_policy
    self.evidence_source_policy = evidence_source_policy
    self.admissibility_derivation_policy = admissibility_derivation_policy
    self.companion_evidence_policy = companion_evidence_policy
    self.decision_posture_policy = decision_posture_policy
    self.supersession_policy = supersession_policy
    self.enabled_provider_profile_refs = enabled_provider_profile_refs
    self.executed_test_run_identifiers = executed_test_run_identifiers
    self.gate_bindings = gate_bindings
    self.migration_mode = migration_mode
    self.migration_plan_ref_or_null = migration_plan_ref_or_null
    self.migration_ledger_refs = migration_ledger_refs
    self.supported_client_window_ref = supported_client_window_ref
    self.canary_summary_ref_or_null = canary_summary_ref_or_null
    self.deterministic_golden_pack_ref_or_null = deterministic_golden_pack_ref_or_null
    self.restore_drill_ref_or_null = restore_drill_ref_or_null
    self.restore_checkpoint_ref_or_null = restore_checkpoint_ref_or_null
    self.client_compatibility_matrix_ref_or_null = client_compatibility_matrix_ref_or_null
    self.decision_state = decision_state
    self.approval_ref_or_null = approval_ref_or_null
    self.deployment_release_ref_or_null = deployment_release_ref_or_null
    self.superseded_by_verification_manifest_ref_or_null = superseded_by_verification_manifest_ref_or_null
  }
}

public struct ReleaseVerificationManifestAssemblyContractGateBinding: Codable, Sendable {
  public let gate_name: String
  public let suite_family: String
  public let candidate_identity_hash: String
  public let compatibility_gate_hash_or_null: String?
  public let authority_sandbox_coverage_hash_or_null: String?
  public let result_ref: String
  public let admissibility_ref: String
  public let status: String
  public let admissibility_state: String
  public let quarantine_state: String
  public let manual_waiver_state: String
  public let executed_at: ISO8601DateTimeString

  public init(
    gate_name: String,
    suite_family: String,
    candidate_identity_hash: String,
    compatibility_gate_hash_or_null: String?,
    authority_sandbox_coverage_hash_or_null: String?,
    result_ref: String,
    admissibility_ref: String,
    status: String,
    admissibility_state: String,
    quarantine_state: String,
    manual_waiver_state: String,
    executed_at: ISO8601DateTimeString
  ) {
    self.gate_name = gate_name
    self.suite_family = suite_family
    self.candidate_identity_hash = candidate_identity_hash
    self.compatibility_gate_hash_or_null = compatibility_gate_hash_or_null
    self.authority_sandbox_coverage_hash_or_null = authority_sandbox_coverage_hash_or_null
    self.result_ref = result_ref
    self.admissibility_ref = admissibility_ref
    self.status = status
    self.admissibility_state = admissibility_state
    self.quarantine_state = quarantine_state
    self.manual_waiver_state = manual_waiver_state
    self.executed_at = executed_at
  }
}

public enum ReleaseVerificationManifestAssemblyContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/release_verification_manifest_assembly_contract.schema.json"
  public static let sourceHash = "7862e41c2a9073354e350cfe2bba3821df32b3e765a7e3a30d5949d68d85eb9c"
}

public struct ReplayAttestation: Codable, Sendable {
  public let replay_attestation_id: String
  public let manifest_id: String
  public let replay_of_manifest_id: String
  public let artifact_type: JSONValue
  public let execution_mode: String
  public let analysis_only: Bool
  public let non_compliance_config_refs: [String]
  public let counterfactual_basis: String?
  public let execution_mode_boundary_contract: JSONValue
  public let replay_class: String
  public let comparison_mode: String
  public let basis_validation_state: String
  public let outcome_class: String
  public let basis_integrity_contract: JSONValue
  public let basis_identity_verdict: String
  public let deterministic_equivalence_verdict: String
  public let expected_execution_basis_hash: String?
  public let actual_execution_basis_hash: String?
  public let expected_deterministic_outcome_hash: String?
  public let actual_deterministic_outcome_hash: String?
  public let basis_dimension_results: JSONValue
  public let outcome_component_results: JSONValue
  public let basis_coverage: Double
  public let basis_match_ratio: Double
  public let outcome_coverage: Double
  public let outcome_match_ratio: Double
  public let material_outcome_coverage: Double
  public let material_outcome_match_ratio: Double
  public let difference_reason_codes: [String]
  public let limitation_codes: [String]
  public let mismatch_inventory: [ReplayAttestationMismatchItem]
  public let plain_summary: String
  public let operator_summary_ref: String?
  public let auditor_summary_ref: String?
  public let compared_at: ISO8601DateTimeString
  public let signature_verification_state: String
  public let attestation_envelope_ref: String?
  public let verification_material_refs: [String]
  public let attestation_confidence_score: Int
  public let attestation_confidence_band: String
  public let contract: SchemaBundle

  public init(
    replay_attestation_id: String,
    manifest_id: String,
    replay_of_manifest_id: String,
    artifact_type: JSONValue,
    execution_mode: String,
    analysis_only: Bool,
    non_compliance_config_refs: [String],
    counterfactual_basis: String?,
    execution_mode_boundary_contract: JSONValue,
    replay_class: String,
    comparison_mode: String,
    basis_validation_state: String,
    outcome_class: String,
    basis_integrity_contract: JSONValue,
    basis_identity_verdict: String,
    deterministic_equivalence_verdict: String,
    expected_execution_basis_hash: String?,
    actual_execution_basis_hash: String?,
    expected_deterministic_outcome_hash: String?,
    actual_deterministic_outcome_hash: String?,
    basis_dimension_results: JSONValue,
    outcome_component_results: JSONValue,
    basis_coverage: Double,
    basis_match_ratio: Double,
    outcome_coverage: Double,
    outcome_match_ratio: Double,
    material_outcome_coverage: Double,
    material_outcome_match_ratio: Double,
    difference_reason_codes: [String],
    limitation_codes: [String],
    mismatch_inventory: [ReplayAttestationMismatchItem],
    plain_summary: String,
    operator_summary_ref: String?,
    auditor_summary_ref: String?,
    compared_at: ISO8601DateTimeString,
    signature_verification_state: String,
    attestation_envelope_ref: String?,
    verification_material_refs: [String],
    attestation_confidence_score: Int,
    attestation_confidence_band: String,
    contract: SchemaBundle
  ) {
    self.replay_attestation_id = replay_attestation_id
    self.manifest_id = manifest_id
    self.replay_of_manifest_id = replay_of_manifest_id
    self.artifact_type = artifact_type
    self.execution_mode = execution_mode
    self.analysis_only = analysis_only
    self.non_compliance_config_refs = non_compliance_config_refs
    self.counterfactual_basis = counterfactual_basis
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.replay_class = replay_class
    self.comparison_mode = comparison_mode
    self.basis_validation_state = basis_validation_state
    self.outcome_class = outcome_class
    self.basis_integrity_contract = basis_integrity_contract
    self.basis_identity_verdict = basis_identity_verdict
    self.deterministic_equivalence_verdict = deterministic_equivalence_verdict
    self.expected_execution_basis_hash = expected_execution_basis_hash
    self.actual_execution_basis_hash = actual_execution_basis_hash
    self.expected_deterministic_outcome_hash = expected_deterministic_outcome_hash
    self.actual_deterministic_outcome_hash = actual_deterministic_outcome_hash
    self.basis_dimension_results = basis_dimension_results
    self.outcome_component_results = outcome_component_results
    self.basis_coverage = basis_coverage
    self.basis_match_ratio = basis_match_ratio
    self.outcome_coverage = outcome_coverage
    self.outcome_match_ratio = outcome_match_ratio
    self.material_outcome_coverage = material_outcome_coverage
    self.material_outcome_match_ratio = material_outcome_match_ratio
    self.difference_reason_codes = difference_reason_codes
    self.limitation_codes = limitation_codes
    self.mismatch_inventory = mismatch_inventory
    self.plain_summary = plain_summary
    self.operator_summary_ref = operator_summary_ref
    self.auditor_summary_ref = auditor_summary_ref
    self.compared_at = compared_at
    self.signature_verification_state = signature_verification_state
    self.attestation_envelope_ref = attestation_envelope_ref
    self.verification_material_refs = verification_material_refs
    self.attestation_confidence_score = attestation_confidence_score
    self.attestation_confidence_band = attestation_confidence_band
    self.contract = contract
  }
}

public struct ReplayAttestationMismatchItem: Codable, Sendable {
  public let component_class: String
  public let component_ref: String?
  public let mismatch_class: String
  public let materiality: String
  public let expected_hash: String?
  public let actual_hash: String?
  public let reason_codes: [String]
  public let variance_class: String
  public let comparison_weight: Double

  public init(
    component_class: String,
    component_ref: String? = nil,
    mismatch_class: String,
    materiality: String,
    expected_hash: String?,
    actual_hash: String?,
    reason_codes: [String],
    variance_class: String,
    comparison_weight: Double
  ) {
    self.component_class = component_class
    self.component_ref = component_ref
    self.mismatch_class = mismatch_class
    self.materiality = materiality
    self.expected_hash = expected_hash
    self.actual_hash = actual_hash
    self.reason_codes = reason_codes
    self.variance_class = variance_class
    self.comparison_weight = comparison_weight
  }
}

public struct ReplayAttestationBasisDimensionResult: Codable, Sendable {
  public let dimension_code: String
  public let comparison_state: String
  public let variance_class: String
  public let comparison_weight: Double
  public let expected_hash: String?
  public let actual_hash: String?
  public let reason_codes: [String]

  public init(
    dimension_code: String,
    comparison_state: String,
    variance_class: String,
    comparison_weight: Double,
    expected_hash: String?,
    actual_hash: String?,
    reason_codes: [String]
  ) {
    self.dimension_code = dimension_code
    self.comparison_state = comparison_state
    self.variance_class = variance_class
    self.comparison_weight = comparison_weight
    self.expected_hash = expected_hash
    self.actual_hash = actual_hash
    self.reason_codes = reason_codes
  }
}

public struct ReplayAttestationOutcomeComponentResult: Codable, Sendable {
  public let component_class: String
  public let component_ref: String?
  public let comparison_state: String
  public let variance_class: String
  public let comparison_weight: Double
  public let materiality: String
  public let expected_hash: String?
  public let actual_hash: String?
  public let reason_codes: [String]

  public init(
    component_class: String,
    component_ref: String? = nil,
    comparison_state: String,
    variance_class: String,
    comparison_weight: Double,
    materiality: String,
    expected_hash: String?,
    actual_hash: String?,
    reason_codes: [String]
  ) {
    self.component_class = component_class
    self.component_ref = component_ref
    self.comparison_state = comparison_state
    self.variance_class = variance_class
    self.comparison_weight = comparison_weight
    self.materiality = materiality
    self.expected_hash = expected_hash
    self.actual_hash = actual_hash
    self.reason_codes = reason_codes
  }
}

public enum ReplayAttestationSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/replay_attestation.schema.json"
  public static let sourceHash = "47b616c74105f9d95cb779da399ae23526279da6e9dddaffdf33e0efe9e57e79"
}

public struct RestoreDrillResult: Codable, Sendable {
  public let restore_drill_id: String
  public let checkpoint_ref: String
  public let candidate_environment_ref: String
  public let build_artifact_ref: String
  public let artifact_digest: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let schema_bundle_hash: String
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let config_bundle_hash: String
  public let migration_plan_ref: String?
  public let enabled_provider_profile_refs: [String]
  public let drill_scope: String
  public let executed_at: ISO8601DateTimeString
  public let outcome: String
  public let audit_continuity_verified: Bool
  public let privacy_reconciliation_verified: Bool
  public let queue_rebuild_verified: Bool
  public let authority_rebuild_verified: Bool
  public let authority_binding_revalidation_verified: Bool
  public let privacy_reconciliation_contract: RestorePrivacyReconciliationContract
  public let drill_report_ref: String
  public let failure_reason_codes: [String]

  public init(
    restore_drill_id: String,
    checkpoint_ref: String,
    candidate_environment_ref: String,
    build_artifact_ref: String,
    artifact_digest: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    schema_bundle_hash: String,
    schema_reader_window_contract: SchemaReaderWindowContract,
    config_bundle_hash: String,
    migration_plan_ref: String?,
    enabled_provider_profile_refs: [String],
    drill_scope: String,
    executed_at: ISO8601DateTimeString,
    outcome: String,
    audit_continuity_verified: Bool,
    privacy_reconciliation_verified: Bool,
    queue_rebuild_verified: Bool,
    authority_rebuild_verified: Bool,
    authority_binding_revalidation_verified: Bool,
    privacy_reconciliation_contract: RestorePrivacyReconciliationContract,
    drill_report_ref: String,
    failure_reason_codes: [String]
  ) {
    self.restore_drill_id = restore_drill_id
    self.checkpoint_ref = checkpoint_ref
    self.candidate_environment_ref = candidate_environment_ref
    self.build_artifact_ref = build_artifact_ref
    self.artifact_digest = artifact_digest
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.schema_bundle_hash = schema_bundle_hash
    self.schema_reader_window_contract = schema_reader_window_contract
    self.config_bundle_hash = config_bundle_hash
    self.migration_plan_ref = migration_plan_ref
    self.enabled_provider_profile_refs = enabled_provider_profile_refs
    self.drill_scope = drill_scope
    self.executed_at = executed_at
    self.outcome = outcome
    self.audit_continuity_verified = audit_continuity_verified
    self.privacy_reconciliation_verified = privacy_reconciliation_verified
    self.queue_rebuild_verified = queue_rebuild_verified
    self.authority_rebuild_verified = authority_rebuild_verified
    self.authority_binding_revalidation_verified = authority_binding_revalidation_verified
    self.privacy_reconciliation_contract = privacy_reconciliation_contract
    self.drill_report_ref = drill_report_ref
    self.failure_reason_codes = failure_reason_codes
  }
}

public enum RestoreDrillResultSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/restore_drill_result.schema.json"
  public static let sourceHash = "819473b6d28a889373b01749e3970634bb682884a7fc44ec95bc09cc69b7a4bb"
}

public struct RestorePrivacyReconciliationContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let reconciliation_contract_hash: String
  public let checkpoint_ref: String
  public let restore_drill_ref: String
  public let reconciliation_scope_policy: JSONValue
  public let resurrected_data_posture: String
  public let resurrected_subject_count_or_null: Int?
  public let privacy_reconciliation_state: String
  public let privacy_reconciliation_outcome_ref: String
  public let compensating_re_erasure_state: String
  public let compensating_re_erasure_workflow_ref_or_null: String?
  public let compensating_re_erasure_audit_ref_or_null: String?
  public let legal_hold_ref_or_null: String?
  public let proof_preservation_basis_ref_or_null: String?
  public let authority_ambiguity_ref_or_null: String?
  public let audit_chain_continuity_state: String
  public let audit_chain_continuity_ref: String
  public let replay_limitation_state: String
  public let enquiry_limitation_state: String
  public let reopen_access_state: String
  public let reconciliation_decided_at_or_null: ISO8601DateTimeString
  public let re_erasure_completed_at_or_null: ISO8601DateTimeString

  public init(
    contract_version: JSONValue,
    reconciliation_contract_hash: String,
    checkpoint_ref: String,
    restore_drill_ref: String,
    reconciliation_scope_policy: JSONValue,
    resurrected_data_posture: String,
    resurrected_subject_count_or_null: Int?,
    privacy_reconciliation_state: String,
    privacy_reconciliation_outcome_ref: String,
    compensating_re_erasure_state: String,
    compensating_re_erasure_workflow_ref_or_null: String?,
    compensating_re_erasure_audit_ref_or_null: String?,
    legal_hold_ref_or_null: String?,
    proof_preservation_basis_ref_or_null: String?,
    authority_ambiguity_ref_or_null: String?,
    audit_chain_continuity_state: String,
    audit_chain_continuity_ref: String,
    replay_limitation_state: String,
    enquiry_limitation_state: String,
    reopen_access_state: String,
    reconciliation_decided_at_or_null: ISO8601DateTimeString,
    re_erasure_completed_at_or_null: ISO8601DateTimeString
  ) {
    self.contract_version = contract_version
    self.reconciliation_contract_hash = reconciliation_contract_hash
    self.checkpoint_ref = checkpoint_ref
    self.restore_drill_ref = restore_drill_ref
    self.reconciliation_scope_policy = reconciliation_scope_policy
    self.resurrected_data_posture = resurrected_data_posture
    self.resurrected_subject_count_or_null = resurrected_subject_count_or_null
    self.privacy_reconciliation_state = privacy_reconciliation_state
    self.privacy_reconciliation_outcome_ref = privacy_reconciliation_outcome_ref
    self.compensating_re_erasure_state = compensating_re_erasure_state
    self.compensating_re_erasure_workflow_ref_or_null = compensating_re_erasure_workflow_ref_or_null
    self.compensating_re_erasure_audit_ref_or_null = compensating_re_erasure_audit_ref_or_null
    self.legal_hold_ref_or_null = legal_hold_ref_or_null
    self.proof_preservation_basis_ref_or_null = proof_preservation_basis_ref_or_null
    self.authority_ambiguity_ref_or_null = authority_ambiguity_ref_or_null
    self.audit_chain_continuity_state = audit_chain_continuity_state
    self.audit_chain_continuity_ref = audit_chain_continuity_ref
    self.replay_limitation_state = replay_limitation_state
    self.enquiry_limitation_state = enquiry_limitation_state
    self.reopen_access_state = reopen_access_state
    self.reconciliation_decided_at_or_null = reconciliation_decided_at_or_null
    self.re_erasure_completed_at_or_null = re_erasure_completed_at_or_null
  }
}

public enum RestorePrivacyReconciliationContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json"
  public static let sourceHash = "7157d0d667ba768df915443b04f67d9474abca3625c0a4074af73511e307bf47"
}

public struct SchemaBundle: Codable, Sendable {
  public let schema_bundle_hash: String
  public let published_at: ISO8601DateTimeString?
  public let compatibility_profile_ref: String
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let entries: [SchemaBundleSchemaBundleEntry]

  public init(
    schema_bundle_hash: String,
    published_at: ISO8601DateTimeString? = nil,
    compatibility_profile_ref: String,
    schema_reader_window_contract: SchemaReaderWindowContract,
    entries: [SchemaBundleSchemaBundleEntry]
  ) {
    self.schema_bundle_hash = schema_bundle_hash
    self.published_at = published_at
    self.compatibility_profile_ref = compatibility_profile_ref
    self.schema_reader_window_contract = schema_reader_window_contract
    self.entries = entries
  }
}

public struct SchemaBundleSchemaBundleEntry: Codable, Sendable {
  public let schema_id: String
  public let artifact_type: String
  public let semantic_version: String
  public let content_hash: String
  public let dialect_ref: String
  public let compatibility_class: String
  public let supersedes_schema_id: String?
  public let writer_min_reader_version: String
  public let allowed_upgrade_kinds: [String]

  public init(
    schema_id: String,
    artifact_type: String,
    semantic_version: String,
    content_hash: String,
    dialect_ref: String,
    compatibility_class: String,
    supersedes_schema_id: String? = nil,
    writer_min_reader_version: String,
    allowed_upgrade_kinds: [String]
  ) {
    self.schema_id = schema_id
    self.artifact_type = artifact_type
    self.semantic_version = semantic_version
    self.content_hash = content_hash
    self.dialect_ref = dialect_ref
    self.compatibility_class = compatibility_class
    self.supersedes_schema_id = supersedes_schema_id
    self.writer_min_reader_version = writer_min_reader_version
    self.allowed_upgrade_kinds = allowed_upgrade_kinds
  }
}

public typealias SchemaBundleExactDecimalString = ExactDecimalString

public typealias SchemaBundleMoneyValue = ExactDecimalString

public struct SchemaBundleMoneyProfile: Codable, Sendable {
  public let currency_code: String
  public let scale: Int
  public let rounding_mode: String
  public let aggregation_boundary: String
  public let serialization_profile: JSONValue

  public init(
    currency_code: String,
    scale: Int,
    rounding_mode: String,
    aggregation_boundary: String,
    serialization_profile: JSONValue
  ) {
    self.currency_code = currency_code
    self.scale = scale
    self.rounding_mode = rounding_mode
    self.aggregation_boundary = aggregation_boundary
    self.serialization_profile = serialization_profile
  }
}

public struct SchemaBundleArtifactContract: Codable, Sendable {
  public let artifact_id: String
  public let schema_id: String
  public let artifact_type: String
  public let semantic_version: String
  public let content_hash: String
  public let dialect_ref: String
  public let compatibility_class: String
  public let supersedes_schema_id: String?
  public let writer_min_reader_version: String
  public let allowed_upgrade_kinds: [String]
  public let schema_bundle_hash: String
  public let artifact_content_hash: String
  public let writer_build_id: String

  public init(
    artifact_id: String,
    schema_id: String,
    artifact_type: String,
    semantic_version: String,
    content_hash: String,
    dialect_ref: String,
    compatibility_class: String,
    supersedes_schema_id: String? = nil,
    writer_min_reader_version: String,
    allowed_upgrade_kinds: [String],
    schema_bundle_hash: String,
    artifact_content_hash: String,
    writer_build_id: String
  ) {
    self.artifact_id = artifact_id
    self.schema_id = schema_id
    self.artifact_type = artifact_type
    self.semantic_version = semantic_version
    self.content_hash = content_hash
    self.dialect_ref = dialect_ref
    self.compatibility_class = compatibility_class
    self.supersedes_schema_id = supersedes_schema_id
    self.writer_min_reader_version = writer_min_reader_version
    self.allowed_upgrade_kinds = allowed_upgrade_kinds
    self.schema_bundle_hash = schema_bundle_hash
    self.artifact_content_hash = artifact_content_hash
    self.writer_build_id = writer_build_id
  }
}

public enum SchemaBundleSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/schema_bundle.schema.json"
  public static let sourceHash = "901500d2d44a2c6b76bc64dd2afe5daa5a8a0f1d853f04f6ea7555f994086bb8"
}

public struct SchemaBundleCompatibilityGateContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let compatibility_gate_hash: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let schema_bundle_hash: String
  public let compatibility_window_ref: String
  public let reader_window_state: String
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let migration_plan_ref_or_null: String?
  public let migration_ledger_refs: [String]
  public let supported_client_window_ref_or_null: String?
  public let historical_manifest_guard_state: String
  public let replay_restore_guard_state: String
  public let native_client_window_state: String
  public let migration_chronology_state: String
  public let destructive_contract_state: String
  public let rollback_boundary_state: String
  public let reason_codes: [String]
  public let historical_manifest_policy: JSONValue
  public let destructive_change_policy: JSONValue
  public let rollback_boundary_policy: JSONValue
  public let fail_forward_policy: JSONValue
  public let replay_restore_policy: JSONValue
  public let client_persistence_policy: JSONValue
  public let evidence_binding_policy: JSONValue

  public init(
    contract_version: JSONValue,
    compatibility_gate_hash: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    schema_bundle_hash: String,
    compatibility_window_ref: String,
    reader_window_state: String,
    schema_reader_window_contract: SchemaReaderWindowContract,
    migration_plan_ref_or_null: String?,
    migration_ledger_refs: [String],
    supported_client_window_ref_or_null: String?,
    historical_manifest_guard_state: String,
    replay_restore_guard_state: String,
    native_client_window_state: String,
    migration_chronology_state: String,
    destructive_contract_state: String,
    rollback_boundary_state: String,
    reason_codes: [String],
    historical_manifest_policy: JSONValue,
    destructive_change_policy: JSONValue,
    rollback_boundary_policy: JSONValue,
    fail_forward_policy: JSONValue,
    replay_restore_policy: JSONValue,
    client_persistence_policy: JSONValue,
    evidence_binding_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.compatibility_gate_hash = compatibility_gate_hash
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.schema_bundle_hash = schema_bundle_hash
    self.compatibility_window_ref = compatibility_window_ref
    self.reader_window_state = reader_window_state
    self.schema_reader_window_contract = schema_reader_window_contract
    self.migration_plan_ref_or_null = migration_plan_ref_or_null
    self.migration_ledger_refs = migration_ledger_refs
    self.supported_client_window_ref_or_null = supported_client_window_ref_or_null
    self.historical_manifest_guard_state = historical_manifest_guard_state
    self.replay_restore_guard_state = replay_restore_guard_state
    self.native_client_window_state = native_client_window_state
    self.migration_chronology_state = migration_chronology_state
    self.destructive_contract_state = destructive_contract_state
    self.rollback_boundary_state = rollback_boundary_state
    self.reason_codes = reason_codes
    self.historical_manifest_policy = historical_manifest_policy
    self.destructive_change_policy = destructive_change_policy
    self.rollback_boundary_policy = rollback_boundary_policy
    self.fail_forward_policy = fail_forward_policy
    self.replay_restore_policy = replay_restore_policy
    self.client_persistence_policy = client_persistence_policy
    self.evidence_binding_policy = evidence_binding_policy
  }
}

public enum SchemaBundleCompatibilityGateContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json"
  public static let sourceHash = "7e87b2e2b66221a56cae5df34ebce70e45b3dee0cb6131fd4905af4321f666a6"
}

public struct SchemaMigrationLedger: Codable, Sendable {
  public let migration_id: String
  public let datastore_ref: String
  public let target_version: String
  public let target_schema_bundle_hash: String
  public let compatibility_window_ref: String
  public let contract_phase_required: Bool
  public let phase_state: String
  public let state_transition_contract: StateTransitionContract
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let backfill_execution_contract: BackfillExecutionContract
  public let applied_at: ISO8601DateTimeString
  public let verified_at: ISO8601DateTimeString
  public let rollback_class: String
  public let verification_ref: String?
  public let halted_subphase: JSONValue
  public let compatibility_window_closed_at: ISO8601DateTimeString
  public let failure_ref: String?

  public init(
    migration_id: String,
    datastore_ref: String,
    target_version: String,
    target_schema_bundle_hash: String,
    compatibility_window_ref: String,
    contract_phase_required: Bool,
    phase_state: String,
    state_transition_contract: StateTransitionContract,
    schema_reader_window_contract: SchemaReaderWindowContract,
    backfill_execution_contract: BackfillExecutionContract,
    applied_at: ISO8601DateTimeString,
    verified_at: ISO8601DateTimeString,
    rollback_class: String,
    verification_ref: String?,
    halted_subphase: JSONValue,
    compatibility_window_closed_at: ISO8601DateTimeString,
    failure_ref: String?
  ) {
    self.migration_id = migration_id
    self.datastore_ref = datastore_ref
    self.target_version = target_version
    self.target_schema_bundle_hash = target_schema_bundle_hash
    self.compatibility_window_ref = compatibility_window_ref
    self.contract_phase_required = contract_phase_required
    self.phase_state = phase_state
    self.state_transition_contract = state_transition_contract
    self.schema_reader_window_contract = schema_reader_window_contract
    self.backfill_execution_contract = backfill_execution_contract
    self.applied_at = applied_at
    self.verified_at = verified_at
    self.rollback_class = rollback_class
    self.verification_ref = verification_ref
    self.halted_subphase = halted_subphase
    self.compatibility_window_closed_at = compatibility_window_closed_at
    self.failure_ref = failure_ref
  }
}

public enum SchemaMigrationLedgerSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/schema_migration_ledger.schema.json"
  public static let sourceHash = "f76ac0227adfa99b463e48fc219d02067b26bb53762b7fc7e3839398f1fca9d5"
}

public struct SchemaReaderWindowContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let compatibility_window_ref: String
  public let writer_schema_bundle_hash: String
  public let supported_reader_schema_bundle_hashes: [String]
  public let protected_historical_schema_bundle_hashes: [String]
  public let window_state: String
  public let historical_manifest_policy: JSONValue
  public let destructive_change_policy: JSONValue
  public let rollback_boundary_policy: JSONValue
  public let fail_forward_policy: JSONValue
  public let replay_restore_policy: JSONValue

  public init(
    contract_version: JSONValue,
    compatibility_window_ref: String,
    writer_schema_bundle_hash: String,
    supported_reader_schema_bundle_hashes: [String],
    protected_historical_schema_bundle_hashes: [String],
    window_state: String,
    historical_manifest_policy: JSONValue,
    destructive_change_policy: JSONValue,
    rollback_boundary_policy: JSONValue,
    fail_forward_policy: JSONValue,
    replay_restore_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.compatibility_window_ref = compatibility_window_ref
    self.writer_schema_bundle_hash = writer_schema_bundle_hash
    self.supported_reader_schema_bundle_hashes = supported_reader_schema_bundle_hashes
    self.protected_historical_schema_bundle_hashes = protected_historical_schema_bundle_hashes
    self.window_state = window_state
    self.historical_manifest_policy = historical_manifest_policy
    self.destructive_change_policy = destructive_change_policy
    self.rollback_boundary_policy = rollback_boundary_policy
    self.fail_forward_policy = fail_forward_policy
    self.replay_restore_policy = replay_restore_policy
  }
}

public enum SchemaReaderWindowContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/schema_reader_window_contract.schema.json"
  public static let sourceHash = "8f24727857ddc21e7524291ded9f10b82329d8462dd18640f36b95b03356285f"
}

public struct StateTransitionContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let object_family: String
  public let machine_code: String
  public let state_field_name: String
  public let current_state: String
  public let previous_state_or_null: String?
  public let transition_event_code: String
  public let transition_applied_at: ISO8601DateTimeString
  public let transition_audit_ref: String
  public let transition_application_policy: JSONValue
  public let illegal_transition_policy: JSONValue
  public let concurrency_guard_policy: JSONValue
  public let terminal_reentry_policy: JSONValue
  public let recovery_supersession_policy: JSONValue
  public let audit_evidence_policy: JSONValue
  public let typed_rejection_family: JSONValue

  public init(
    contract_version: JSONValue,
    object_family: String,
    machine_code: String,
    state_field_name: String,
    current_state: String,
    previous_state_or_null: String?,
    transition_event_code: String,
    transition_applied_at: ISO8601DateTimeString,
    transition_audit_ref: String,
    transition_application_policy: JSONValue,
    illegal_transition_policy: JSONValue,
    concurrency_guard_policy: JSONValue,
    terminal_reentry_policy: JSONValue,
    recovery_supersession_policy: JSONValue,
    audit_evidence_policy: JSONValue,
    typed_rejection_family: JSONValue
  ) {
    self.contract_version = contract_version
    self.object_family = object_family
    self.machine_code = machine_code
    self.state_field_name = state_field_name
    self.current_state = current_state
    self.previous_state_or_null = previous_state_or_null
    self.transition_event_code = transition_event_code
    self.transition_applied_at = transition_applied_at
    self.transition_audit_ref = transition_audit_ref
    self.transition_application_policy = transition_application_policy
    self.illegal_transition_policy = illegal_transition_policy
    self.concurrency_guard_policy = concurrency_guard_policy
    self.terminal_reentry_policy = terminal_reentry_policy
    self.recovery_supersession_policy = recovery_supersession_policy
    self.audit_evidence_policy = audit_evidence_policy
    self.typed_rejection_family = typed_rejection_family
  }
}

public enum StateTransitionContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/state_transition_contract.schema.json"
  public static let sourceHash = "af225ca70a88d2193c3a7d9ed722233b7379aed6ad45674e2c3814cfd7738c47"
}

public enum ManifestAndReleaseBindingManifest {
  public static let familyRef = "MANIFEST_AND_RELEASE"
  public static let schemaCount = 22
}
