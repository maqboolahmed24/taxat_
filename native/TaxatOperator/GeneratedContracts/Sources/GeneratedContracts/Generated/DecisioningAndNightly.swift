// DO NOT EDIT: generated downstream from packages/contracts-core.
import Foundation

public struct BaselineSelectionContract: Codable, Sendable {
  public let selection_profile_code: JSONValue
  public let dominance_key_profile_code: JSONValue
  public let selection_contract_hash: String
  public let active_exact_scope_key: String
  public let target_scope_refs: [String]
  public let selected_scope_refs: [String]
  public let scope_match_class: String
  public let scope_resolution_state: String
  public let scope_rank: Int
  public let exact_scope_candidate_present: Bool
  public let selected_baseline_type: String
  public let same_scope_truth_resolution_state: String
  public let precedence_rank: Int
  public let authority_resolution_class: String
  public let authority_resolution_rank: Int
  public let continuity_class: String
  public let chain_continuity_rank: Int
  public let selected_effective_at_or_null: ISO8601DateTimeString
  public let selected_manifest_generation_or_null: Int?
  public let stable_selection_id: String
  public let internal_chain_continuity_asserted: Bool
  public let baseline_anchor_weight: Double
  public let uncertainty_reason_codes: [String]
  public let automation_ceiling: String
  public let review_recommendation_floor: String
  public let amendment_progression_ceiling: String
  public let benign_drift_eligibility_state: String

  public init(
    selection_profile_code: JSONValue,
    dominance_key_profile_code: JSONValue,
    selection_contract_hash: String,
    active_exact_scope_key: String,
    target_scope_refs: [String],
    selected_scope_refs: [String],
    scope_match_class: String,
    scope_resolution_state: String,
    scope_rank: Int,
    exact_scope_candidate_present: Bool,
    selected_baseline_type: String,
    same_scope_truth_resolution_state: String,
    precedence_rank: Int,
    authority_resolution_class: String,
    authority_resolution_rank: Int,
    continuity_class: String,
    chain_continuity_rank: Int,
    selected_effective_at_or_null: ISO8601DateTimeString,
    selected_manifest_generation_or_null: Int?,
    stable_selection_id: String,
    internal_chain_continuity_asserted: Bool,
    baseline_anchor_weight: Double,
    uncertainty_reason_codes: [String],
    automation_ceiling: String,
    review_recommendation_floor: String,
    amendment_progression_ceiling: String,
    benign_drift_eligibility_state: String
  ) {
    self.selection_profile_code = selection_profile_code
    self.dominance_key_profile_code = dominance_key_profile_code
    self.selection_contract_hash = selection_contract_hash
    self.active_exact_scope_key = active_exact_scope_key
    self.target_scope_refs = target_scope_refs
    self.selected_scope_refs = selected_scope_refs
    self.scope_match_class = scope_match_class
    self.scope_resolution_state = scope_resolution_state
    self.scope_rank = scope_rank
    self.exact_scope_candidate_present = exact_scope_candidate_present
    self.selected_baseline_type = selected_baseline_type
    self.same_scope_truth_resolution_state = same_scope_truth_resolution_state
    self.precedence_rank = precedence_rank
    self.authority_resolution_class = authority_resolution_class
    self.authority_resolution_rank = authority_resolution_rank
    self.continuity_class = continuity_class
    self.chain_continuity_rank = chain_continuity_rank
    self.selected_effective_at_or_null = selected_effective_at_or_null
    self.selected_manifest_generation_or_null = selected_manifest_generation_or_null
    self.stable_selection_id = stable_selection_id
    self.internal_chain_continuity_asserted = internal_chain_continuity_asserted
    self.baseline_anchor_weight = baseline_anchor_weight
    self.uncertainty_reason_codes = uncertainty_reason_codes
    self.automation_ceiling = automation_ceiling
    self.review_recommendation_floor = review_recommendation_floor
    self.amendment_progression_ceiling = amendment_progression_ceiling
    self.benign_drift_eligibility_state = benign_drift_eligibility_state
  }
}

public enum BaselineSelectionContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/baseline_selection_contract.schema.json"
  public static let sourceHash = "1c219c5b517176385f35befd559727c5aa7f38607d2110ef2efa1c3f2410e377"
}

public struct CalculationBasis: Codable, Sendable {
  public let artifact_type: JSONValue
  public let calculation_basis_id: String
  public let calculation_id: String
  public let calculation_request_ref: String
  public let manifest_id: String
  public let calculation_type: String
  public let basis_type: String
  public let basis_status: String
  public let basis_payload_ref: String
  public let basis_hash: String
  public let parity_reusable: Bool
  public let filing_reusable: Bool
  public let user_confirmation_ref: String?
  public let reason_codes: [String]
  public let captured_at: ISO8601DateTimeString
  public let confirmed_at: ISO8601DateTimeString
  public let superseded_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    calculation_basis_id: String,
    calculation_id: String,
    calculation_request_ref: String,
    manifest_id: String,
    calculation_type: String,
    basis_type: String,
    basis_status: String,
    basis_payload_ref: String,
    basis_hash: String,
    parity_reusable: Bool,
    filing_reusable: Bool,
    user_confirmation_ref: String?,
    reason_codes: [String],
    captured_at: ISO8601DateTimeString,
    confirmed_at: ISO8601DateTimeString,
    superseded_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.calculation_basis_id = calculation_basis_id
    self.calculation_id = calculation_id
    self.calculation_request_ref = calculation_request_ref
    self.manifest_id = manifest_id
    self.calculation_type = calculation_type
    self.basis_type = basis_type
    self.basis_status = basis_status
    self.basis_payload_ref = basis_payload_ref
    self.basis_hash = basis_hash
    self.parity_reusable = parity_reusable
    self.filing_reusable = filing_reusable
    self.user_confirmation_ref = user_confirmation_ref
    self.reason_codes = reason_codes
    self.captured_at = captured_at
    self.confirmed_at = confirmed_at
    self.superseded_at = superseded_at
  }
}

public enum CalculationBasisSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/calculation_basis.schema.json"
  public static let sourceHash = "e17f23654c175b0a6bd0c05a6a581c97b121b53b02c359b1b134f2defeffd7fe"
}

public struct CalculationUserConfirmation: Codable, Sendable {
  public let artifact_type: JSONValue
  public let user_confirmation_id: String
  public let calculation_id: String
  public let calculation_basis_ref: String
  public let manifest_id: String
  public let actor_ref: String
  public let actor_role: String
  public let confirmation_state: String
  public let presentation_ref: String
  public let confirmed_basis_hash: String?
  public let reason_codes: [String]
  public let confirmed_at: ISO8601DateTimeString
  public let declined_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    user_confirmation_id: String,
    calculation_id: String,
    calculation_basis_ref: String,
    manifest_id: String,
    actor_ref: String,
    actor_role: String,
    confirmation_state: String,
    presentation_ref: String,
    confirmed_basis_hash: String?,
    reason_codes: [String],
    confirmed_at: ISO8601DateTimeString,
    declined_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.user_confirmation_id = user_confirmation_id
    self.calculation_id = calculation_id
    self.calculation_basis_ref = calculation_basis_ref
    self.manifest_id = manifest_id
    self.actor_ref = actor_ref
    self.actor_role = actor_role
    self.confirmation_state = confirmation_state
    self.presentation_ref = presentation_ref
    self.confirmed_basis_hash = confirmed_basis_hash
    self.reason_codes = reason_codes
    self.confirmed_at = confirmed_at
    self.declined_at = declined_at
  }
}

public enum CalculationUserConfirmationSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/calculation_user_confirmation.schema.json"
  public static let sourceHash = "1b5d67e3a1f9c3a37c41ebfeb4ffc6df274008cece89aaa840055c7c17343837"
}

public struct ComputeResult: Codable, Sendable {
  public let compute_id: String
  public let manifest_id: String
  public let artifact_type: JSONValue
  public let execution_mode: String
  public let analysis_only: Bool
  public let non_compliance_config_refs: [String]
  public let counterfactual_basis: String?
  public let lifecycle_state: String
  public let rule_version_ref: String
  public let reporting_scope: String
  public let effective_partition_scope_refs: [String]
  public let basis_profile_ref_or_null: String?
  public let quarterly_basis_profile_or_null: JSONValue
  public let adjustment_inclusion_policy: String
  public let adjustment_scope_source: String
  public let money_profile: SchemaBundle
  public let totals: [String: JSONValue]
  public let assumptions: [String: JSONValue]
  public let diagnostic_reason_codes: [String]
  public let diagnostic_artifact_refs: [String]
  public let computed_at: ISO8601DateTimeString
  public let contract: SchemaBundle

  public init(
    compute_id: String,
    manifest_id: String,
    artifact_type: JSONValue,
    execution_mode: String,
    analysis_only: Bool,
    non_compliance_config_refs: [String],
    counterfactual_basis: String?,
    lifecycle_state: String,
    rule_version_ref: String,
    reporting_scope: String,
    effective_partition_scope_refs: [String],
    basis_profile_ref_or_null: String?,
    quarterly_basis_profile_or_null: JSONValue,
    adjustment_inclusion_policy: String,
    adjustment_scope_source: String,
    money_profile: SchemaBundle,
    totals: [String: JSONValue],
    assumptions: [String: JSONValue],
    diagnostic_reason_codes: [String],
    diagnostic_artifact_refs: [String],
    computed_at: ISO8601DateTimeString,
    contract: SchemaBundle
  ) {
    self.compute_id = compute_id
    self.manifest_id = manifest_id
    self.artifact_type = artifact_type
    self.execution_mode = execution_mode
    self.analysis_only = analysis_only
    self.non_compliance_config_refs = non_compliance_config_refs
    self.counterfactual_basis = counterfactual_basis
    self.lifecycle_state = lifecycle_state
    self.rule_version_ref = rule_version_ref
    self.reporting_scope = reporting_scope
    self.effective_partition_scope_refs = effective_partition_scope_refs
    self.basis_profile_ref_or_null = basis_profile_ref_or_null
    self.quarterly_basis_profile_or_null = quarterly_basis_profile_or_null
    self.adjustment_inclusion_policy = adjustment_inclusion_policy
    self.adjustment_scope_source = adjustment_scope_source
    self.money_profile = money_profile
    self.totals = totals
    self.assumptions = assumptions
    self.diagnostic_reason_codes = diagnostic_reason_codes
    self.diagnostic_artifact_refs = diagnostic_artifact_refs
    self.computed_at = computed_at
    self.contract = contract
  }
}

public enum ComputeResultSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/compute_result.schema.json"
  public static let sourceHash = "ad76df96a95d97fde3b86c5a65394097c6c62969fed0bfdd7e523a546f4b1e21"
}

public struct DecisionBundle: Codable, Sendable {
  public let decision_bundle_id: String
  public let manifest_id: String
  public let artifact_type: JSONValue
  public let execution_mode: String
  public let analysis_only: Bool
  public let non_compliance_config_refs: [String]
  public let counterfactual_basis: String?
  public let execution_mode_boundary_contract: JSONValue
  public let decision_status: String
  public let decision_reason_codes: [String]
  public let dominant_reason_code: String
  public let workflow_item_refs: [String]
  public let snapshot_id: String?
  public let compute_id: String?
  public let forecast_id: String?
  public let risk_id: String?
  public let parity_id: String?
  public let trust_id: String?
  public let graph_id: String?
  public let twin_id: String?
  public let filing_packet_id: String?
  public let submission_record_id: String?
  public let outcome_class: String
  public let waiting_on: String
  public let checkpoint_state: String
  public let truth_state: String
  public let truth_boundary_contract: JSONValue
  public let plain_reason: String
  public let decision_explainability_contract: DecisionExplainabilityContract
  public let reason_codes: [String]
  public let next_action_codes: [String]
  public let blocked_action_codes: [String]
  public let actionability_state: String
  public let primary_action_code: String?
  public let no_safe_action_reason_code: String?
  public let suggested_detail_surface_code: JSONValue
  public let active_detail_surface_code: JSONValue
  public let focus_anchor_ref: String?
  public let next_checkpoint_at: ISO8601DateTimeString
  public let filing_case_id: String?
  public let amendment_case_id: String?
  public let replay_attestation_ref: String?
  public let persisted_at: ISO8601DateTimeString
  public let contract: SchemaBundle
  public let primary_proof_bundle_ref: String?

  public init(
    decision_bundle_id: String,
    manifest_id: String,
    artifact_type: JSONValue,
    execution_mode: String,
    analysis_only: Bool,
    non_compliance_config_refs: [String],
    counterfactual_basis: String?,
    execution_mode_boundary_contract: JSONValue,
    decision_status: String,
    decision_reason_codes: [String],
    dominant_reason_code: String,
    workflow_item_refs: [String],
    snapshot_id: String? = nil,
    compute_id: String? = nil,
    forecast_id: String? = nil,
    risk_id: String? = nil,
    parity_id: String? = nil,
    trust_id: String? = nil,
    graph_id: String? = nil,
    twin_id: String? = nil,
    filing_packet_id: String? = nil,
    submission_record_id: String? = nil,
    outcome_class: String,
    waiting_on: String,
    checkpoint_state: String,
    truth_state: String,
    truth_boundary_contract: JSONValue,
    plain_reason: String,
    decision_explainability_contract: DecisionExplainabilityContract,
    reason_codes: [String],
    next_action_codes: [String],
    blocked_action_codes: [String],
    actionability_state: String,
    primary_action_code: String?,
    no_safe_action_reason_code: String?,
    suggested_detail_surface_code: JSONValue,
    active_detail_surface_code: JSONValue,
    focus_anchor_ref: String?,
    next_checkpoint_at: ISO8601DateTimeString,
    filing_case_id: String? = nil,
    amendment_case_id: String? = nil,
    replay_attestation_ref: String? = nil,
    persisted_at: ISO8601DateTimeString,
    contract: SchemaBundle,
    primary_proof_bundle_ref: String?
  ) {
    self.decision_bundle_id = decision_bundle_id
    self.manifest_id = manifest_id
    self.artifact_type = artifact_type
    self.execution_mode = execution_mode
    self.analysis_only = analysis_only
    self.non_compliance_config_refs = non_compliance_config_refs
    self.counterfactual_basis = counterfactual_basis
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.decision_status = decision_status
    self.decision_reason_codes = decision_reason_codes
    self.dominant_reason_code = dominant_reason_code
    self.workflow_item_refs = workflow_item_refs
    self.snapshot_id = snapshot_id
    self.compute_id = compute_id
    self.forecast_id = forecast_id
    self.risk_id = risk_id
    self.parity_id = parity_id
    self.trust_id = trust_id
    self.graph_id = graph_id
    self.twin_id = twin_id
    self.filing_packet_id = filing_packet_id
    self.submission_record_id = submission_record_id
    self.outcome_class = outcome_class
    self.waiting_on = waiting_on
    self.checkpoint_state = checkpoint_state
    self.truth_state = truth_state
    self.truth_boundary_contract = truth_boundary_contract
    self.plain_reason = plain_reason
    self.decision_explainability_contract = decision_explainability_contract
    self.reason_codes = reason_codes
    self.next_action_codes = next_action_codes
    self.blocked_action_codes = blocked_action_codes
    self.actionability_state = actionability_state
    self.primary_action_code = primary_action_code
    self.no_safe_action_reason_code = no_safe_action_reason_code
    self.suggested_detail_surface_code = suggested_detail_surface_code
    self.active_detail_surface_code = active_detail_surface_code
    self.focus_anchor_ref = focus_anchor_ref
    self.next_checkpoint_at = next_checkpoint_at
    self.filing_case_id = filing_case_id
    self.amendment_case_id = amendment_case_id
    self.replay_attestation_ref = replay_attestation_ref
    self.persisted_at = persisted_at
    self.contract = contract
    self.primary_proof_bundle_ref = primary_proof_bundle_ref
  }
}

public enum DecisionBundleSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/decision_bundle.schema.json"
  public static let sourceHash = "175c3018abea47d20ef8538949e31da9c3ab101c87550d7241b23d412010392f"
}

public struct DecisionExplainabilityContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let artifact_family: String
  public let grammar_profile_code: JSONValue
  public let reason_order_policy: JSONValue
  public let dominant_reason_selection_policy: JSONValue
  public let summary_source_policy: JSONValue
  public let compression_policy: JSONValue
  public let compression_reason_cap: JSONValue
  public let ordered_reason_codes: [String]
  public let dominant_reason_code: String
  public let compressed_reason_codes: [String]
  public let suppressed_reason_count: Int
  public let semantic_qualifiers: [String]
  public let action_projection_state: String
  public let plain_text_field_name: String
  public let plain_text_character_limit: JSONValue

  public init(
    contract_version: JSONValue,
    artifact_family: String,
    grammar_profile_code: JSONValue,
    reason_order_policy: JSONValue,
    dominant_reason_selection_policy: JSONValue,
    summary_source_policy: JSONValue,
    compression_policy: JSONValue,
    compression_reason_cap: JSONValue,
    ordered_reason_codes: [String],
    dominant_reason_code: String,
    compressed_reason_codes: [String],
    suppressed_reason_count: Int,
    semantic_qualifiers: [String],
    action_projection_state: String,
    plain_text_field_name: String,
    plain_text_character_limit: JSONValue
  ) {
    self.contract_version = contract_version
    self.artifact_family = artifact_family
    self.grammar_profile_code = grammar_profile_code
    self.reason_order_policy = reason_order_policy
    self.dominant_reason_selection_policy = dominant_reason_selection_policy
    self.summary_source_policy = summary_source_policy
    self.compression_policy = compression_policy
    self.compression_reason_cap = compression_reason_cap
    self.ordered_reason_codes = ordered_reason_codes
    self.dominant_reason_code = dominant_reason_code
    self.compressed_reason_codes = compressed_reason_codes
    self.suppressed_reason_count = suppressed_reason_count
    self.semantic_qualifiers = semantic_qualifiers
    self.action_projection_state = action_projection_state
    self.plain_text_field_name = plain_text_field_name
    self.plain_text_character_limit = plain_text_character_limit
  }
}

public enum DecisionExplainabilityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/decision_explainability_contract.schema.json"
  public static let sourceHash = "0e3a392f771fe04c24f057cf9cbcf6fc5414c2e582bb98de93b4dca3e6b2479d"
}

public struct ForecastSet: Codable, Sendable {
  public let forecast_id: String
  public let manifest_id: String
  public let artifact_type: JSONValue
  public let execution_mode: JSONValue
  public let analysis_only: JSONValue
  public let non_compliance_config_refs: [String]
  public let counterfactual_basis: String
  public let forecast_profile_ref: String
  public let baseline_compute_ref: String
  public let money_profile: SchemaBundle
  public let scenario_mode: String
  public let point_forecasts: [ForecastSetPointForecast]
  public let scenarios: [ForecastSetScenario]
  public let seeds: [ForecastSetScenarioSeed]
  public let created_at: ISO8601DateTimeString
  public let contract: SchemaBundle

  public init(
    forecast_id: String,
    manifest_id: String,
    artifact_type: JSONValue,
    execution_mode: JSONValue,
    analysis_only: JSONValue,
    non_compliance_config_refs: [String],
    counterfactual_basis: String,
    forecast_profile_ref: String,
    baseline_compute_ref: String,
    money_profile: SchemaBundle,
    scenario_mode: String,
    point_forecasts: [ForecastSetPointForecast],
    scenarios: [ForecastSetScenario],
    seeds: [ForecastSetScenarioSeed],
    created_at: ISO8601DateTimeString,
    contract: SchemaBundle
  ) {
    self.forecast_id = forecast_id
    self.manifest_id = manifest_id
    self.artifact_type = artifact_type
    self.execution_mode = execution_mode
    self.analysis_only = analysis_only
    self.non_compliance_config_refs = non_compliance_config_refs
    self.counterfactual_basis = counterfactual_basis
    self.forecast_profile_ref = forecast_profile_ref
    self.baseline_compute_ref = baseline_compute_ref
    self.money_profile = money_profile
    self.scenario_mode = scenario_mode
    self.point_forecasts = point_forecasts
    self.scenarios = scenarios
    self.seeds = seeds
    self.created_at = created_at
    self.contract = contract
  }
}

public struct ForecastSetPointForecast: Codable, Sendable {
  public let horizon_code: String
  public let category_code: String
  public let baseline_steps: Int
  public let point_value: SchemaBundle
  public let normalized_seasonality: Double
  public let annualized_growth_rate: Double

  public init(
    horizon_code: String,
    category_code: String,
    baseline_steps: Int,
    point_value: SchemaBundle,
    normalized_seasonality: Double,
    annualized_growth_rate: Double
  ) {
    self.horizon_code = horizon_code
    self.category_code = category_code
    self.baseline_steps = baseline_steps
    self.point_value = point_value
    self.normalized_seasonality = normalized_seasonality
    self.annualized_growth_rate = annualized_growth_rate
  }
}

public struct ForecastSetScenario: Codable, Sendable {
  public let scenario_id: String
  public let seed_ref: String
  public let values: [ForecastSetScenarioValue]

  public init(
    scenario_id: String,
    seed_ref: String,
    values: [ForecastSetScenarioValue]
  ) {
    self.scenario_id = scenario_id
    self.seed_ref = seed_ref
    self.values = values
  }
}

public struct ForecastSetScenarioValue: Codable, Sendable {
  public let horizon_code: String
  public let category_code: String
  public let simulated_value: SchemaBundle

  public init(
    horizon_code: String,
    category_code: String,
    simulated_value: SchemaBundle
  ) {
    self.horizon_code = horizon_code
    self.category_code = category_code
    self.simulated_value = simulated_value
  }
}

public struct ForecastSetScenarioSeed: Codable, Sendable {
  public let scenario_id: String
  public let seed: String

  public init(
    scenario_id: String,
    seed: String
  ) {
    self.scenario_id = scenario_id
    self.seed = seed
  }
}

public enum ForecastSetSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/forecast_set.schema.json"
  public static let sourceHash = "e3d40985841690f8f7afaee3fe993e0170a4ee23eb0a9bc0ba2edd7a93b7b7dd"
}

public struct GateAdmissibilityRecord: Codable, Sendable {
  public let admissibility_id: String
  public let suite_result_ref: String
  public let suite_family: String
  public let candidate_environment_ref: String
  public let artifact_digest: String
  public let candidate_identity_hash: String
  public let candidate_identity_contract: ReleaseCandidateIdentityContract
  public let schema_bundle_hash: String
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract
  public let migration_plan_ref: String?
  public let authority_sandbox_coverage_contract_or_null: JSONValue
  public let supported_client_window_ref: String?
  public let restore_drill_ref: String?
  public let restore_checkpoint_ref: String?
  public let deterministic_golden_pack_ref: String?
  public let candidate_identity_match: Bool
  public let freshness_verified: Bool
  public let contract_window_consistent: Bool
  public let rerun_scope_preserved: Bool
  public let quarantine_state: String
  public let admissibility_state: String
  public let evaluated_at: ISO8601DateTimeString
  public let reason_codes: [String]

  public init(
    admissibility_id: String,
    suite_result_ref: String,
    suite_family: String,
    candidate_environment_ref: String,
    artifact_digest: String,
    candidate_identity_hash: String,
    candidate_identity_contract: ReleaseCandidateIdentityContract,
    schema_bundle_hash: String,
    schema_reader_window_contract: SchemaReaderWindowContract,
    schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContract,
    migration_plan_ref: String?,
    authority_sandbox_coverage_contract_or_null: JSONValue,
    supported_client_window_ref: String?,
    restore_drill_ref: String?,
    restore_checkpoint_ref: String?,
    deterministic_golden_pack_ref: String?,
    candidate_identity_match: Bool,
    freshness_verified: Bool,
    contract_window_consistent: Bool,
    rerun_scope_preserved: Bool,
    quarantine_state: String,
    admissibility_state: String,
    evaluated_at: ISO8601DateTimeString,
    reason_codes: [String]
  ) {
    self.admissibility_id = admissibility_id
    self.suite_result_ref = suite_result_ref
    self.suite_family = suite_family
    self.candidate_environment_ref = candidate_environment_ref
    self.artifact_digest = artifact_digest
    self.candidate_identity_hash = candidate_identity_hash
    self.candidate_identity_contract = candidate_identity_contract
    self.schema_bundle_hash = schema_bundle_hash
    self.schema_reader_window_contract = schema_reader_window_contract
    self.schema_bundle_compatibility_gate_contract = schema_bundle_compatibility_gate_contract
    self.migration_plan_ref = migration_plan_ref
    self.authority_sandbox_coverage_contract_or_null = authority_sandbox_coverage_contract_or_null
    self.supported_client_window_ref = supported_client_window_ref
    self.restore_drill_ref = restore_drill_ref
    self.restore_checkpoint_ref = restore_checkpoint_ref
    self.deterministic_golden_pack_ref = deterministic_golden_pack_ref
    self.candidate_identity_match = candidate_identity_match
    self.freshness_verified = freshness_verified
    self.contract_window_consistent = contract_window_consistent
    self.rerun_scope_preserved = rerun_scope_preserved
    self.quarantine_state = quarantine_state
    self.admissibility_state = admissibility_state
    self.evaluated_at = evaluated_at
    self.reason_codes = reason_codes
  }
}

public enum GateAdmissibilityRecordSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/gate_admissibility_record.schema.json"
  public static let sourceHash = "8f4832153cb12678309654a6fc3a8da810ad3e29f2ae026eed1920ee500167ff"
}

public struct GateDecisionRecord: Codable, Sendable {
  public let artifact_type: JSONValue
  public let gate_decision_id: String
  public let manifest_id: String
  public let gate_code: String
  public let gate_stage_index: Int
  public let gate_class: String
  public let decision: String
  public let reason_codes: [String]
  public let dominant_reason_code: String
  public let plain_explanation: String
  public let decision_explainability_contract: DecisionExplainabilityContract
  public let severity: String
  public let gate_semantics_contract: GateSemanticsContract
  public let truth_boundary_contract: JSONValue
  public let metrics: [String: JSONValue]
  public let decision_basis_ref: String
  public let input_artifact_refs: [String]
  public let prerequisite_gate_refs: [String]
  public let blocking_dependency_refs: [String]
  public let overrideability: String
  public let override_resolution_state: String
  public let active_override_refs: [String]
  public let required_override_scope: String?
  public let next_action_codes: [String]
  public let policy_version_ref: String
  public let decided_at: ISO8601DateTimeString
  public let effective_scope: [String]

  public init(
    artifact_type: JSONValue,
    gate_decision_id: String,
    manifest_id: String,
    gate_code: String,
    gate_stage_index: Int,
    gate_class: String,
    decision: String,
    reason_codes: [String],
    dominant_reason_code: String,
    plain_explanation: String,
    decision_explainability_contract: DecisionExplainabilityContract,
    severity: String,
    gate_semantics_contract: GateSemanticsContract,
    truth_boundary_contract: JSONValue,
    metrics: [String: JSONValue],
    decision_basis_ref: String,
    input_artifact_refs: [String],
    prerequisite_gate_refs: [String],
    blocking_dependency_refs: [String],
    overrideability: String,
    override_resolution_state: String,
    active_override_refs: [String],
    required_override_scope: String?,
    next_action_codes: [String],
    policy_version_ref: String,
    decided_at: ISO8601DateTimeString,
    effective_scope: [String]
  ) {
    self.artifact_type = artifact_type
    self.gate_decision_id = gate_decision_id
    self.manifest_id = manifest_id
    self.gate_code = gate_code
    self.gate_stage_index = gate_stage_index
    self.gate_class = gate_class
    self.decision = decision
    self.reason_codes = reason_codes
    self.dominant_reason_code = dominant_reason_code
    self.plain_explanation = plain_explanation
    self.decision_explainability_contract = decision_explainability_contract
    self.severity = severity
    self.gate_semantics_contract = gate_semantics_contract
    self.truth_boundary_contract = truth_boundary_contract
    self.metrics = metrics
    self.decision_basis_ref = decision_basis_ref
    self.input_artifact_refs = input_artifact_refs
    self.prerequisite_gate_refs = prerequisite_gate_refs
    self.blocking_dependency_refs = blocking_dependency_refs
    self.overrideability = overrideability
    self.override_resolution_state = override_resolution_state
    self.active_override_refs = active_override_refs
    self.required_override_scope = required_override_scope
    self.next_action_codes = next_action_codes
    self.policy_version_ref = policy_version_ref
    self.decided_at = decided_at
    self.effective_scope = effective_scope
  }
}

public enum GateDecisionRecordSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/gate_decision_record.schema.json"
  public static let sourceHash = "b7a32a1995617d4e480527da97335aaec796bfe2f91c3f0c75bd8f86c7fbcf0e"
}

public struct GateSemanticsContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let evaluation_order_profile_code: JSONValue
  public let reason_order_profile_code: JSONValue
  public let severity_profile_code: JSONValue
  public let decision_rank: Int
  public let progression_rank: Int
  public let blocking_class: String
  public let progression_semantics: String
  public let override_dependency_state: String

  public init(
    contract_version: JSONValue,
    evaluation_order_profile_code: JSONValue,
    reason_order_profile_code: JSONValue,
    severity_profile_code: JSONValue,
    decision_rank: Int,
    progression_rank: Int,
    blocking_class: String,
    progression_semantics: String,
    override_dependency_state: String
  ) {
    self.contract_version = contract_version
    self.evaluation_order_profile_code = evaluation_order_profile_code
    self.reason_order_profile_code = reason_order_profile_code
    self.severity_profile_code = severity_profile_code
    self.decision_rank = decision_rank
    self.progression_rank = progression_rank
    self.blocking_class = blocking_class
    self.progression_semantics = progression_semantics
    self.override_dependency_state = override_dependency_state
  }
}

public enum GateSemanticsContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/gate_semantics_contract.schema.json"
  public static let sourceHash = "1dc4ae82eee7f90560117ce92c9bce34f67f695330e24787680076e9c3d59671"
}

public struct NightlyBatchRun: Codable, Sendable {
  public let artifact_type: JSONValue
  public let batch_run_id: String
  public let tenant_id: String
  public let execution_mode_boundary_contract: JSONValue
  public let nightly_window_key: String
  public let trigger_class: String
  public let reclaimed_predecessor_batch_run_ref: String?
  public let lifecycle_state: String
  public let state_transition_contract: StateTransitionContract
  public let identity_contract: NightlyBatchIdentityContract
  public let scheduler_dedupe_key: String
  public let scheduled_for: ISO8601DateTimeString
  public let trigger_observed_at: ISO8601DateTimeString
  public let initiating_principal_context_ref: String
  public let policy_snapshot_hash: String
  public let autopilot_policy_hash: String
  public let release_verification_manifest_ref: String
  public let schema_bundle_hash: String
  public let schema_reader_window_contract: SchemaReaderWindowContract
  public let code_build_id: String
  public let environment_ref: String
  public let global_concurrency_profile: NightlyBatchRunGlobalConcurrencyProfile
  public let selection_universe_hash: String
  public let selection_universe_count: Int
  public let recovery_resume_state: String
  public let backlog_pressure: Double?
  public let portfolio_tail_risk: Double?
  public let stability_state: JSONValue
  public let selection_entries: [NightlyBatchRunSelectionEntry]
  public let shard_plan: [NightlyBatchRunShardPlanEntry]
  public let selected_count: Int
  public let execution_count: Int
  public let reused_result_count: Int
  public let deferred_count: Int
  public let escalated_count: Int
  public let skipped_count: Int
  public let waiting_on_authority_count: Int
  public let waiting_on_late_data_count: Int
  public let completed_count: Int
  public let completed_with_failures_count: Int
  public let failed_count: Int
  public let selection_started_at: ISO8601DateTimeString
  public let selection_completed_at: ISO8601DateTimeString
  public let started_at: ISO8601DateTimeString
  public let last_heartbeat_at: ISO8601DateTimeString
  public let quiesced_at: ISO8601DateTimeString
  public let completed_at: ISO8601DateTimeString
  public let abandoned_at: ISO8601DateTimeString
  public let successor_batch_run_ref: String?
  public let operator_digest_publication_state: String
  public let operator_digest_derivation_contract_or_null: JSONValue
  public let operator_digest_ref: String?
  public let audit_refs: [String]
  public let provenance_refs: [String]

  public init(
    artifact_type: JSONValue,
    batch_run_id: String,
    tenant_id: String,
    execution_mode_boundary_contract: JSONValue,
    nightly_window_key: String,
    trigger_class: String,
    reclaimed_predecessor_batch_run_ref: String?,
    lifecycle_state: String,
    state_transition_contract: StateTransitionContract,
    identity_contract: NightlyBatchIdentityContract,
    scheduler_dedupe_key: String,
    scheduled_for: ISO8601DateTimeString,
    trigger_observed_at: ISO8601DateTimeString,
    initiating_principal_context_ref: String,
    policy_snapshot_hash: String,
    autopilot_policy_hash: String,
    release_verification_manifest_ref: String,
    schema_bundle_hash: String,
    schema_reader_window_contract: SchemaReaderWindowContract,
    code_build_id: String,
    environment_ref: String,
    global_concurrency_profile: NightlyBatchRunGlobalConcurrencyProfile,
    selection_universe_hash: String,
    selection_universe_count: Int,
    recovery_resume_state: String,
    backlog_pressure: Double?,
    portfolio_tail_risk: Double?,
    stability_state: JSONValue,
    selection_entries: [NightlyBatchRunSelectionEntry],
    shard_plan: [NightlyBatchRunShardPlanEntry],
    selected_count: Int,
    execution_count: Int,
    reused_result_count: Int,
    deferred_count: Int,
    escalated_count: Int,
    skipped_count: Int,
    waiting_on_authority_count: Int,
    waiting_on_late_data_count: Int,
    completed_count: Int,
    completed_with_failures_count: Int,
    failed_count: Int,
    selection_started_at: ISO8601DateTimeString,
    selection_completed_at: ISO8601DateTimeString,
    started_at: ISO8601DateTimeString,
    last_heartbeat_at: ISO8601DateTimeString,
    quiesced_at: ISO8601DateTimeString,
    completed_at: ISO8601DateTimeString,
    abandoned_at: ISO8601DateTimeString,
    successor_batch_run_ref: String?,
    operator_digest_publication_state: String,
    operator_digest_derivation_contract_or_null: JSONValue,
    operator_digest_ref: String?,
    audit_refs: [String],
    provenance_refs: [String]
  ) {
    self.artifact_type = artifact_type
    self.batch_run_id = batch_run_id
    self.tenant_id = tenant_id
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.nightly_window_key = nightly_window_key
    self.trigger_class = trigger_class
    self.reclaimed_predecessor_batch_run_ref = reclaimed_predecessor_batch_run_ref
    self.lifecycle_state = lifecycle_state
    self.state_transition_contract = state_transition_contract
    self.identity_contract = identity_contract
    self.scheduler_dedupe_key = scheduler_dedupe_key
    self.scheduled_for = scheduled_for
    self.trigger_observed_at = trigger_observed_at
    self.initiating_principal_context_ref = initiating_principal_context_ref
    self.policy_snapshot_hash = policy_snapshot_hash
    self.autopilot_policy_hash = autopilot_policy_hash
    self.release_verification_manifest_ref = release_verification_manifest_ref
    self.schema_bundle_hash = schema_bundle_hash
    self.schema_reader_window_contract = schema_reader_window_contract
    self.code_build_id = code_build_id
    self.environment_ref = environment_ref
    self.global_concurrency_profile = global_concurrency_profile
    self.selection_universe_hash = selection_universe_hash
    self.selection_universe_count = selection_universe_count
    self.recovery_resume_state = recovery_resume_state
    self.backlog_pressure = backlog_pressure
    self.portfolio_tail_risk = portfolio_tail_risk
    self.stability_state = stability_state
    self.selection_entries = selection_entries
    self.shard_plan = shard_plan
    self.selected_count = selected_count
    self.execution_count = execution_count
    self.reused_result_count = reused_result_count
    self.deferred_count = deferred_count
    self.escalated_count = escalated_count
    self.skipped_count = skipped_count
    self.waiting_on_authority_count = waiting_on_authority_count
    self.waiting_on_late_data_count = waiting_on_late_data_count
    self.completed_count = completed_count
    self.completed_with_failures_count = completed_with_failures_count
    self.failed_count = failed_count
    self.selection_started_at = selection_started_at
    self.selection_completed_at = selection_completed_at
    self.started_at = started_at
    self.last_heartbeat_at = last_heartbeat_at
    self.quiesced_at = quiesced_at
    self.completed_at = completed_at
    self.abandoned_at = abandoned_at
    self.successor_batch_run_ref = successor_batch_run_ref
    self.operator_digest_publication_state = operator_digest_publication_state
    self.operator_digest_derivation_contract_or_null = operator_digest_derivation_contract_or_null
    self.operator_digest_ref = operator_digest_ref
    self.audit_refs = audit_refs
    self.provenance_refs = provenance_refs
  }
}

public struct NightlyBatchRunGlobalConcurrencyProfile: Codable, Sendable {
  public let global_manifest_limit: Int
  public let per_shard_manifest_limit: Int
  public let authority_transmit_limit: Int
  public let per_client_serialization: Bool
  public let heartbeat_interval_seconds: Int
  public let stale_heartbeat_after_seconds: Int
  public let soft_stability_rho: Double
  public let hard_stability_rho: Double
  public let retry_capacity_fraction: Double
  public let base_deficit_quantum_minutes: Double

  public init(
    global_manifest_limit: Int,
    per_shard_manifest_limit: Int,
    authority_transmit_limit: Int,
    per_client_serialization: Bool,
    heartbeat_interval_seconds: Int,
    stale_heartbeat_after_seconds: Int,
    soft_stability_rho: Double,
    hard_stability_rho: Double,
    retry_capacity_fraction: Double,
    base_deficit_quantum_minutes: Double
  ) {
    self.global_manifest_limit = global_manifest_limit
    self.per_shard_manifest_limit = per_shard_manifest_limit
    self.authority_transmit_limit = authority_transmit_limit
    self.per_client_serialization = per_client_serialization
    self.heartbeat_interval_seconds = heartbeat_interval_seconds
    self.stale_heartbeat_after_seconds = stale_heartbeat_after_seconds
    self.soft_stability_rho = soft_stability_rho
    self.hard_stability_rho = hard_stability_rho
    self.retry_capacity_fraction = retry_capacity_fraction
    self.base_deficit_quantum_minutes = base_deficit_quantum_minutes
  }
}

public struct NightlyBatchRunSelectionEntry: Codable, Sendable {
  public let entry_id: String
  public let candidate_identity_hash: String
  public let selection_basis_hash: String
  public let client_id: String
  public let period: String
  public let requested_scope: [String]
  public let selection_disposition: String
  public let terminal_result_reuse_state: String
  public let active_attempt_resolution_state: String
  public let priority_tuple: NightlyBatchRunPriorityTuple
  public let reason_codes: [String]
  public let manifest_ref: String?
  public let prior_manifest_ref: String?
  public let predecessor_selection_entry_ref_or_null: String?
  public let workflow_item_refs: [String]
  public let next_checkpoint_at: ISO8601DateTimeString
  public let fairness_group_key: String?
  public let shard_key: String?
  public let outcome_bucket: JSONValue
  public let executed_at: ISO8601DateTimeString

  public init(
    entry_id: String,
    candidate_identity_hash: String,
    selection_basis_hash: String,
    client_id: String,
    period: String,
    requested_scope: [String],
    selection_disposition: String,
    terminal_result_reuse_state: String,
    active_attempt_resolution_state: String,
    priority_tuple: NightlyBatchRunPriorityTuple,
    reason_codes: [String],
    manifest_ref: String?,
    prior_manifest_ref: String?,
    predecessor_selection_entry_ref_or_null: String?,
    workflow_item_refs: [String],
    next_checkpoint_at: ISO8601DateTimeString,
    fairness_group_key: String? = nil,
    shard_key: String?,
    outcome_bucket: JSONValue,
    executed_at: ISO8601DateTimeString
  ) {
    self.entry_id = entry_id
    self.candidate_identity_hash = candidate_identity_hash
    self.selection_basis_hash = selection_basis_hash
    self.client_id = client_id
    self.period = period
    self.requested_scope = requested_scope
    self.selection_disposition = selection_disposition
    self.terminal_result_reuse_state = terminal_result_reuse_state
    self.active_attempt_resolution_state = active_attempt_resolution_state
    self.priority_tuple = priority_tuple
    self.reason_codes = reason_codes
    self.manifest_ref = manifest_ref
    self.prior_manifest_ref = prior_manifest_ref
    self.predecessor_selection_entry_ref_or_null = predecessor_selection_entry_ref_or_null
    self.workflow_item_refs = workflow_item_refs
    self.next_checkpoint_at = next_checkpoint_at
    self.fairness_group_key = fairness_group_key
    self.shard_key = shard_key
    self.outcome_bucket = outcome_bucket
    self.executed_at = executed_at
  }
}

public struct NightlyBatchRunPriorityTuple: Codable, Sendable {
  public let deadline_bucket: Int
  public let filing_state_bucket: Int
  public let authority_checkpoint_bucket: Int
  public let risk_bucket: Int
  public let automation_readiness_bucket: Int
  public let retry_ready_bucket: Int
  public let priority_score: Double?
  public let expected_service_minutes: Double?
  public let deadline_pressure: Double?
  public let checkpoint_pressure: Double?
  public let risk_pressure: Double?
  public let fairness_credit: Double?
  public let retry_success_probability: Double?
  public let retry_expected_gain: Double?
  public let stable_tie_break_key: String

  public init(
    deadline_bucket: Int,
    filing_state_bucket: Int,
    authority_checkpoint_bucket: Int,
    risk_bucket: Int,
    automation_readiness_bucket: Int,
    retry_ready_bucket: Int,
    priority_score: Double? = nil,
    expected_service_minutes: Double? = nil,
    deadline_pressure: Double? = nil,
    checkpoint_pressure: Double? = nil,
    risk_pressure: Double? = nil,
    fairness_credit: Double? = nil,
    retry_success_probability: Double? = nil,
    retry_expected_gain: Double? = nil,
    stable_tie_break_key: String
  ) {
    self.deadline_bucket = deadline_bucket
    self.filing_state_bucket = filing_state_bucket
    self.authority_checkpoint_bucket = authority_checkpoint_bucket
    self.risk_bucket = risk_bucket
    self.automation_readiness_bucket = automation_readiness_bucket
    self.retry_ready_bucket = retry_ready_bucket
    self.priority_score = priority_score
    self.expected_service_minutes = expected_service_minutes
    self.deadline_pressure = deadline_pressure
    self.checkpoint_pressure = checkpoint_pressure
    self.risk_pressure = risk_pressure
    self.fairness_credit = fairness_credit
    self.retry_success_probability = retry_success_probability
    self.retry_expected_gain = retry_expected_gain
    self.stable_tie_break_key = stable_tie_break_key
  }
}

public struct NightlyBatchRunShardPlanEntry: Codable, Sendable {
  public let shard_key: String
  public let entry_refs: [String]
  public let shard_state: String
  public let blocked_entry_refs: [String]
  public let failure_reason_codes: [String]
  public let max_concurrent_manifests: Int
  public let last_heartbeat_at: ISO8601DateTimeString
  public let current_owner_ref: String?

  public init(
    shard_key: String,
    entry_refs: [String],
    shard_state: String,
    blocked_entry_refs: [String],
    failure_reason_codes: [String],
    max_concurrent_manifests: Int,
    last_heartbeat_at: ISO8601DateTimeString,
    current_owner_ref: String?
  ) {
    self.shard_key = shard_key
    self.entry_refs = entry_refs
    self.shard_state = shard_state
    self.blocked_entry_refs = blocked_entry_refs
    self.failure_reason_codes = failure_reason_codes
    self.max_concurrent_manifests = max_concurrent_manifests
    self.last_heartbeat_at = last_heartbeat_at
    self.current_owner_ref = current_owner_ref
  }
}

public enum NightlyBatchRunSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/nightly_batch_run.schema.json"
  public static let sourceHash = "c0797420d911474626316c8a02011f63d9336cf14be63ee298868e1d822d18cc"
}

public struct NightlyPortfolioSimulationBasisContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let basis_contract_hash: String
  public let execution_mode_boundary_hash: String
  public let tenant_id: String
  public let nightly_window_key: String
  public let source_batch_run_refs: [String]
  public let source_batch_set_hash: String
  public let source_batch_count: Int
  public let source_batch_window_state: JSONValue
  public let source_batch_recovery_state: String
  public let covered_selection_entry_refs: [String]
  public let covered_selection_entry_count: Int
  public let baseline_selection_universe_hash: String
  public let baseline_policy_snapshot_hash: String
  public let baseline_autopilot_policy_hash: String
  public let baseline_release_verification_manifest_ref: String
  public let baseline_schema_bundle_hash: String
  public let baseline_code_build_id: String
  public let baseline_environment_ref: String
  public let baseline_global_concurrency_profile: NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile
  public let counterfactual_policy_snapshot_hash_or_null: String?
  public let counterfactual_autopilot_policy_hash_or_null: String?
  public let counterfactual_release_verification_manifest_ref_or_null: String?
  public let counterfactual_release_candidate_identity_contract_or_null: JSONValue
  public let counterfactual_global_concurrency_profile_or_null: JSONValue
  public let counterfactual_reason_codes: [String]
  public let candidate_counterfactuals: [NightlyPortfolioSimulationBasisContractCandidateCounterfactual]
  public let truth_source_policy: JSONValue
  public let selection_projection_policy: JSONValue
  public let digest_projection_policy: JSONValue
  public let non_execution_boundary_policy: JSONValue
  public let release_identity_policy: JSONValue
  public let successor_recovery_policy: JSONValue
  public let diff_explainability_policy: JSONValue

  public init(
    contract_version: JSONValue,
    basis_contract_hash: String,
    execution_mode_boundary_hash: String,
    tenant_id: String,
    nightly_window_key: String,
    source_batch_run_refs: [String],
    source_batch_set_hash: String,
    source_batch_count: Int,
    source_batch_window_state: JSONValue,
    source_batch_recovery_state: String,
    covered_selection_entry_refs: [String],
    covered_selection_entry_count: Int,
    baseline_selection_universe_hash: String,
    baseline_policy_snapshot_hash: String,
    baseline_autopilot_policy_hash: String,
    baseline_release_verification_manifest_ref: String,
    baseline_schema_bundle_hash: String,
    baseline_code_build_id: String,
    baseline_environment_ref: String,
    baseline_global_concurrency_profile: NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile,
    counterfactual_policy_snapshot_hash_or_null: String?,
    counterfactual_autopilot_policy_hash_or_null: String?,
    counterfactual_release_verification_manifest_ref_or_null: String?,
    counterfactual_release_candidate_identity_contract_or_null: JSONValue,
    counterfactual_global_concurrency_profile_or_null: JSONValue,
    counterfactual_reason_codes: [String],
    candidate_counterfactuals: [NightlyPortfolioSimulationBasisContractCandidateCounterfactual],
    truth_source_policy: JSONValue,
    selection_projection_policy: JSONValue,
    digest_projection_policy: JSONValue,
    non_execution_boundary_policy: JSONValue,
    release_identity_policy: JSONValue,
    successor_recovery_policy: JSONValue,
    diff_explainability_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.basis_contract_hash = basis_contract_hash
    self.execution_mode_boundary_hash = execution_mode_boundary_hash
    self.tenant_id = tenant_id
    self.nightly_window_key = nightly_window_key
    self.source_batch_run_refs = source_batch_run_refs
    self.source_batch_set_hash = source_batch_set_hash
    self.source_batch_count = source_batch_count
    self.source_batch_window_state = source_batch_window_state
    self.source_batch_recovery_state = source_batch_recovery_state
    self.covered_selection_entry_refs = covered_selection_entry_refs
    self.covered_selection_entry_count = covered_selection_entry_count
    self.baseline_selection_universe_hash = baseline_selection_universe_hash
    self.baseline_policy_snapshot_hash = baseline_policy_snapshot_hash
    self.baseline_autopilot_policy_hash = baseline_autopilot_policy_hash
    self.baseline_release_verification_manifest_ref = baseline_release_verification_manifest_ref
    self.baseline_schema_bundle_hash = baseline_schema_bundle_hash
    self.baseline_code_build_id = baseline_code_build_id
    self.baseline_environment_ref = baseline_environment_ref
    self.baseline_global_concurrency_profile = baseline_global_concurrency_profile
    self.counterfactual_policy_snapshot_hash_or_null = counterfactual_policy_snapshot_hash_or_null
    self.counterfactual_autopilot_policy_hash_or_null = counterfactual_autopilot_policy_hash_or_null
    self.counterfactual_release_verification_manifest_ref_or_null = counterfactual_release_verification_manifest_ref_or_null
    self.counterfactual_release_candidate_identity_contract_or_null = counterfactual_release_candidate_identity_contract_or_null
    self.counterfactual_global_concurrency_profile_or_null = counterfactual_global_concurrency_profile_or_null
    self.counterfactual_reason_codes = counterfactual_reason_codes
    self.candidate_counterfactuals = candidate_counterfactuals
    self.truth_source_policy = truth_source_policy
    self.selection_projection_policy = selection_projection_policy
    self.digest_projection_policy = digest_projection_policy
    self.non_execution_boundary_policy = non_execution_boundary_policy
    self.release_identity_policy = release_identity_policy
    self.successor_recovery_policy = successor_recovery_policy
    self.diff_explainability_policy = diff_explainability_policy
  }
}

public struct NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile: Codable, Sendable {
  public let global_manifest_limit: Int
  public let per_shard_manifest_limit: Int
  public let authority_transmit_limit: Int
  public let per_client_serialization: Bool
  public let heartbeat_interval_seconds: Int
  public let stale_heartbeat_after_seconds: Int
  public let soft_stability_rho: Double
  public let hard_stability_rho: Double
  public let retry_capacity_fraction: Double
  public let base_deficit_quantum_minutes: Double

  public init(
    global_manifest_limit: Int,
    per_shard_manifest_limit: Int,
    authority_transmit_limit: Int,
    per_client_serialization: Bool,
    heartbeat_interval_seconds: Int,
    stale_heartbeat_after_seconds: Int,
    soft_stability_rho: Double,
    hard_stability_rho: Double,
    retry_capacity_fraction: Double,
    base_deficit_quantum_minutes: Double
  ) {
    self.global_manifest_limit = global_manifest_limit
    self.per_shard_manifest_limit = per_shard_manifest_limit
    self.authority_transmit_limit = authority_transmit_limit
    self.per_client_serialization = per_client_serialization
    self.heartbeat_interval_seconds = heartbeat_interval_seconds
    self.stale_heartbeat_after_seconds = stale_heartbeat_after_seconds
    self.soft_stability_rho = soft_stability_rho
    self.hard_stability_rho = hard_stability_rho
    self.retry_capacity_fraction = retry_capacity_fraction
    self.base_deficit_quantum_minutes = base_deficit_quantum_minutes
  }
}

public struct NightlyPortfolioSimulationBasisContractCandidateCounterfactual: Codable, Sendable {
  public let selection_entry_ref: String
  public let candidate_identity_hash: String
  public let counterfactual_policy_outcome: String
  public let counterfactual_authority_outcome: String
  public let counterfactual_retry_outcome: String
  public let counterfactual_release_outcome: String
  public let reason_codes: [String]

  public init(
    selection_entry_ref: String,
    candidate_identity_hash: String,
    counterfactual_policy_outcome: String,
    counterfactual_authority_outcome: String,
    counterfactual_retry_outcome: String,
    counterfactual_release_outcome: String,
    reason_codes: [String]
  ) {
    self.selection_entry_ref = selection_entry_ref
    self.candidate_identity_hash = candidate_identity_hash
    self.counterfactual_policy_outcome = counterfactual_policy_outcome
    self.counterfactual_authority_outcome = counterfactual_authority_outcome
    self.counterfactual_retry_outcome = counterfactual_retry_outcome
    self.counterfactual_release_outcome = counterfactual_release_outcome
    self.reason_codes = reason_codes
  }
}

public enum NightlyPortfolioSimulationBasisContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/nightly_portfolio_simulation_basis_contract.schema.json"
  public static let sourceHash = "efb21415923f226f89e6471da2bb55a7532220f715dfb9d9c0f9941c50906c81"
}

public struct NightlyPortfolioWhatIfSimulation: Codable, Sendable {
  public let artifact_type: JSONValue
  public let simulation_id: String
  public let tenant_id: String
  public let nightly_window_key: String
  public let execution_mode_boundary_contract: JSONValue
  public let basis_contract: NightlyPortfolioSimulationBasisContract
  public let baseline_digest_ref_or_null: String?
  public let baseline_summary_counts: NightlyPortfolioWhatIfSimulationSummaryCounts
  public let simulated_summary_counts: NightlyPortfolioWhatIfSimulationSummaryCounts
  public let baseline_backlog_pressure: Double?
  public let simulated_backlog_pressure: Double?
  public let baseline_portfolio_tail_risk: Double?
  public let simulated_portfolio_tail_risk: Double?
  public let baseline_stability_state: JSONValue
  public let simulated_stability_state: JSONValue
  public let baseline_highlighted_selection_entry_refs: [String]
  public let simulated_highlighted_selection_entry_refs: [String]
  public let entry_diffs: [NightlyPortfolioWhatIfSimulationEntryDiff]
  public let highlight_diffs: [NightlyPortfolioWhatIfSimulationHighlightDiff]
  public let simulated_by_principal_ref: String
  public let simulated_at: ISO8601DateTimeString

  public init(
    artifact_type: JSONValue,
    simulation_id: String,
    tenant_id: String,
    nightly_window_key: String,
    execution_mode_boundary_contract: JSONValue,
    basis_contract: NightlyPortfolioSimulationBasisContract,
    baseline_digest_ref_or_null: String?,
    baseline_summary_counts: NightlyPortfolioWhatIfSimulationSummaryCounts,
    simulated_summary_counts: NightlyPortfolioWhatIfSimulationSummaryCounts,
    baseline_backlog_pressure: Double?,
    simulated_backlog_pressure: Double?,
    baseline_portfolio_tail_risk: Double?,
    simulated_portfolio_tail_risk: Double?,
    baseline_stability_state: JSONValue,
    simulated_stability_state: JSONValue,
    baseline_highlighted_selection_entry_refs: [String],
    simulated_highlighted_selection_entry_refs: [String],
    entry_diffs: [NightlyPortfolioWhatIfSimulationEntryDiff],
    highlight_diffs: [NightlyPortfolioWhatIfSimulationHighlightDiff],
    simulated_by_principal_ref: String,
    simulated_at: ISO8601DateTimeString
  ) {
    self.artifact_type = artifact_type
    self.simulation_id = simulation_id
    self.tenant_id = tenant_id
    self.nightly_window_key = nightly_window_key
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.basis_contract = basis_contract
    self.baseline_digest_ref_or_null = baseline_digest_ref_or_null
    self.baseline_summary_counts = baseline_summary_counts
    self.simulated_summary_counts = simulated_summary_counts
    self.baseline_backlog_pressure = baseline_backlog_pressure
    self.simulated_backlog_pressure = simulated_backlog_pressure
    self.baseline_portfolio_tail_risk = baseline_portfolio_tail_risk
    self.simulated_portfolio_tail_risk = simulated_portfolio_tail_risk
    self.baseline_stability_state = baseline_stability_state
    self.simulated_stability_state = simulated_stability_state
    self.baseline_highlighted_selection_entry_refs = baseline_highlighted_selection_entry_refs
    self.simulated_highlighted_selection_entry_refs = simulated_highlighted_selection_entry_refs
    self.entry_diffs = entry_diffs
    self.highlight_diffs = highlight_diffs
    self.simulated_by_principal_ref = simulated_by_principal_ref
    self.simulated_at = simulated_at
  }
}

public struct NightlyPortfolioWhatIfSimulationSummaryCounts: Codable, Sendable {
  public let auto_completed: Int
  public let waiting_on_authority: Int
  public let waiting_on_late_data: Int
  public let review_required: Int
  public let request_client_info: Int
  public let blocked_internal: Int
  public let failed_retryable: Int
  public let failed_non_retryable: Int
  public let reused_result: Int
  public let deferred: Int
  public let skipped: Int

  public init(
    auto_completed: Int,
    waiting_on_authority: Int,
    waiting_on_late_data: Int,
    review_required: Int,
    request_client_info: Int,
    blocked_internal: Int,
    failed_retryable: Int,
    failed_non_retryable: Int,
    reused_result: Int,
    deferred: Int,
    skipped: Int
  ) {
    self.auto_completed = auto_completed
    self.waiting_on_authority = waiting_on_authority
    self.waiting_on_late_data = waiting_on_late_data
    self.review_required = review_required
    self.request_client_info = request_client_info
    self.blocked_internal = blocked_internal
    self.failed_retryable = failed_retryable
    self.failed_non_retryable = failed_non_retryable
    self.reused_result = reused_result
    self.deferred = deferred
    self.skipped = skipped
  }
}

public struct NightlyPortfolioWhatIfSimulationEntryDiff: Codable, Sendable {
  public let selection_entry_ref: String
  public let candidate_identity_hash: String
  public let baseline_selection_basis_hash: String
  public let baseline_selection_disposition: NightlyPortfolioWhatIfSimulationSelectionDisposition
  public let simulated_selection_disposition: NightlyPortfolioWhatIfSimulationSelectionDisposition
  public let baseline_outcome_bucket: NightlyPortfolioWhatIfSimulationOutcomeBucket
  public let simulated_outcome_bucket: NightlyPortfolioWhatIfSimulationOutcomeBucket
  public let baseline_execution_rank_or_null: Int?
  public let simulated_execution_rank_or_null: Int?
  public let baseline_highlight_rank_or_null: Int?
  public let simulated_highlight_rank_or_null: Int?
  public let baseline_priority_score_or_null: Double?
  public let simulated_priority_score_or_null: Double?
  public let baseline_reason_codes: [String]
  public let simulated_reason_codes: [String]
  public let movement_reason_codes: [String]

  public init(
    selection_entry_ref: String,
    candidate_identity_hash: String,
    baseline_selection_basis_hash: String,
    baseline_selection_disposition: NightlyPortfolioWhatIfSimulationSelectionDisposition,
    simulated_selection_disposition: NightlyPortfolioWhatIfSimulationSelectionDisposition,
    baseline_outcome_bucket: NightlyPortfolioWhatIfSimulationOutcomeBucket,
    simulated_outcome_bucket: NightlyPortfolioWhatIfSimulationOutcomeBucket,
    baseline_execution_rank_or_null: Int?,
    simulated_execution_rank_or_null: Int?,
    baseline_highlight_rank_or_null: Int?,
    simulated_highlight_rank_or_null: Int?,
    baseline_priority_score_or_null: Double?,
    simulated_priority_score_or_null: Double?,
    baseline_reason_codes: [String],
    simulated_reason_codes: [String],
    movement_reason_codes: [String]
  ) {
    self.selection_entry_ref = selection_entry_ref
    self.candidate_identity_hash = candidate_identity_hash
    self.baseline_selection_basis_hash = baseline_selection_basis_hash
    self.baseline_selection_disposition = baseline_selection_disposition
    self.simulated_selection_disposition = simulated_selection_disposition
    self.baseline_outcome_bucket = baseline_outcome_bucket
    self.simulated_outcome_bucket = simulated_outcome_bucket
    self.baseline_execution_rank_or_null = baseline_execution_rank_or_null
    self.simulated_execution_rank_or_null = simulated_execution_rank_or_null
    self.baseline_highlight_rank_or_null = baseline_highlight_rank_or_null
    self.simulated_highlight_rank_or_null = simulated_highlight_rank_or_null
    self.baseline_priority_score_or_null = baseline_priority_score_or_null
    self.simulated_priority_score_or_null = simulated_priority_score_or_null
    self.baseline_reason_codes = baseline_reason_codes
    self.simulated_reason_codes = simulated_reason_codes
    self.movement_reason_codes = movement_reason_codes
  }
}

public struct NightlyPortfolioWhatIfSimulationHighlightDiff: Codable, Sendable {
  public let selection_entry_ref: String
  public let diff_state: String
  public let baseline_highlight_rank_or_null: Int?
  public let simulated_highlight_rank_or_null: Int?
  public let baseline_entry_loss_score_or_null: Double?
  public let simulated_entry_loss_score_or_null: Double?
  public let reason_codes: [String]

  public init(
    selection_entry_ref: String,
    diff_state: String,
    baseline_highlight_rank_or_null: Int?,
    simulated_highlight_rank_or_null: Int?,
    baseline_entry_loss_score_or_null: Double?,
    simulated_entry_loss_score_or_null: Double?,
    reason_codes: [String]
  ) {
    self.selection_entry_ref = selection_entry_ref
    self.diff_state = diff_state
    self.baseline_highlight_rank_or_null = baseline_highlight_rank_or_null
    self.simulated_highlight_rank_or_null = simulated_highlight_rank_or_null
    self.baseline_entry_loss_score_or_null = baseline_entry_loss_score_or_null
    self.simulated_entry_loss_score_or_null = simulated_entry_loss_score_or_null
    self.reason_codes = reason_codes
  }
}

public enum NightlyPortfolioWhatIfSimulationSelectionDisposition: String, Codable, Sendable {
  case eXECUTENEWMANIFEST = "EXECUTE_NEW_MANIFEST"
  case eXECUTECONTINUATIONCHILD = "EXECUTE_CONTINUATION_CHILD"
  case rEUSEEXISTINGTERMINALRESULT = "REUSE_EXISTING_TERMINAL_RESULT"
  case dEFERACTIVEATTEMPT = "DEFER_ACTIVE_ATTEMPT"
  case dEFERRETRYWINDOW = "DEFER_RETRY_WINDOW"
  case eSCALATEONLY = "ESCALATE_ONLY"
  case sKIPINELIGIBLE = "SKIP_INELIGIBLE"
}

public enum NightlyPortfolioWhatIfSimulationOutcomeBucket: String, Codable, Sendable {
  case aUTOCOMPLETED = "AUTO_COMPLETED"
  case wAITINGONAUTHORITY = "WAITING_ON_AUTHORITY"
  case wAITINGONLATEDATA = "WAITING_ON_LATE_DATA"
  case rEVIEWREQUIRED = "REVIEW_REQUIRED"
  case rEQUESTCLIENTINFO = "REQUEST_CLIENT_INFO"
  case bLOCKEDINTERNAL = "BLOCKED_INTERNAL"
  case fAILEDRETRYABLE = "FAILED_RETRYABLE"
  case fAILEDNONRETRYABLE = "FAILED_NON_RETRYABLE"
  case rEUSEDRESULT = "REUSED_RESULT"
  case dEFERRED = "DEFERRED"
  case sKIPPED = "SKIPPED"
}

public enum NightlyPortfolioWhatIfSimulationSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/nightly_portfolio_what_if_simulation.schema.json"
  public static let sourceHash = "c601ad2b4e0b46a6276dc14f859569e03707c7bfc92d1ca0da31d460dfab2870"
}

public struct OperatorDigestDerivationContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let derivation_contract_hash: String
  public let execution_mode_boundary_contract: JSONValue
  public let coverage_date: String
  public let nightly_window_key: String
  public let source_batch_set_hash: String
  public let source_batch_count: Int
  public let source_batch_window_state: JSONValue
  public let truth_source_policy: JSONValue
  public let unresolved_handoff_policy: JSONValue
  public let queue_summary_policy: JSONValue
  public let highlight_ranking_profile: JSONValue
  public let highlight_source_policy: JSONValue
  public let publication_qa_profile: JSONValue
  public let publication_qa_state: JSONValue
  public let publication_qa_completed_at: ISO8601DateTimeString
  public let covered_selection_entry_ref_set_hash: String
  public let outcome_entry_partition_hash: String
  public let queue_partition_hash: String
  public let highlight_order_hash: String
  public let published_workflow_item_ref_set_hash: String
  public let published_notification_ref_set_hash: String
  public let waiting_on_authority_ref_set_hash: String
  public let late_data_hold_ref_set_hash: String
  public let workflow_publication_state: String
  public let workflow_publication_settled_at: ISO8601DateTimeString
  public let published_workflow_outcome_counts: OperatorDigestDerivationContractSummaryCounts
  public let published_workflow_item_count: Int
  public let notification_publication_state: String
  public let notification_publication_settled_at: ISO8601DateTimeString
  public let published_notification_ref_count: Int
  public let persisted_outcome_counts: OperatorDigestDerivationContractSummaryCounts
  public let covered_selection_entry_count: Int
  public let backlog_pressure_basis_hash: String
  public let portfolio_tail_risk_basis_hash: String
  public let stability_basis_hash: String
  public let publication_generation: Int
  public let supersession_state: String
  public let supersession_root_digest_id: String
  public let supersedes_digest_id_or_null: String?
  public let supersession_reason_codes: [String]
  public let supersession_policy: JSONValue

  public init(
    contract_version: JSONValue,
    derivation_contract_hash: String,
    execution_mode_boundary_contract: JSONValue,
    coverage_date: String,
    nightly_window_key: String,
    source_batch_set_hash: String,
    source_batch_count: Int,
    source_batch_window_state: JSONValue,
    truth_source_policy: JSONValue,
    unresolved_handoff_policy: JSONValue,
    queue_summary_policy: JSONValue,
    highlight_ranking_profile: JSONValue,
    highlight_source_policy: JSONValue,
    publication_qa_profile: JSONValue,
    publication_qa_state: JSONValue,
    publication_qa_completed_at: ISO8601DateTimeString,
    covered_selection_entry_ref_set_hash: String,
    outcome_entry_partition_hash: String,
    queue_partition_hash: String,
    highlight_order_hash: String,
    published_workflow_item_ref_set_hash: String,
    published_notification_ref_set_hash: String,
    waiting_on_authority_ref_set_hash: String,
    late_data_hold_ref_set_hash: String,
    workflow_publication_state: String,
    workflow_publication_settled_at: ISO8601DateTimeString,
    published_workflow_outcome_counts: OperatorDigestDerivationContractSummaryCounts,
    published_workflow_item_count: Int,
    notification_publication_state: String,
    notification_publication_settled_at: ISO8601DateTimeString,
    published_notification_ref_count: Int,
    persisted_outcome_counts: OperatorDigestDerivationContractSummaryCounts,
    covered_selection_entry_count: Int,
    backlog_pressure_basis_hash: String,
    portfolio_tail_risk_basis_hash: String,
    stability_basis_hash: String,
    publication_generation: Int,
    supersession_state: String,
    supersession_root_digest_id: String,
    supersedes_digest_id_or_null: String?,
    supersession_reason_codes: [String],
    supersession_policy: JSONValue
  ) {
    self.contract_version = contract_version
    self.derivation_contract_hash = derivation_contract_hash
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.coverage_date = coverage_date
    self.nightly_window_key = nightly_window_key
    self.source_batch_set_hash = source_batch_set_hash
    self.source_batch_count = source_batch_count
    self.source_batch_window_state = source_batch_window_state
    self.truth_source_policy = truth_source_policy
    self.unresolved_handoff_policy = unresolved_handoff_policy
    self.queue_summary_policy = queue_summary_policy
    self.highlight_ranking_profile = highlight_ranking_profile
    self.highlight_source_policy = highlight_source_policy
    self.publication_qa_profile = publication_qa_profile
    self.publication_qa_state = publication_qa_state
    self.publication_qa_completed_at = publication_qa_completed_at
    self.covered_selection_entry_ref_set_hash = covered_selection_entry_ref_set_hash
    self.outcome_entry_partition_hash = outcome_entry_partition_hash
    self.queue_partition_hash = queue_partition_hash
    self.highlight_order_hash = highlight_order_hash
    self.published_workflow_item_ref_set_hash = published_workflow_item_ref_set_hash
    self.published_notification_ref_set_hash = published_notification_ref_set_hash
    self.waiting_on_authority_ref_set_hash = waiting_on_authority_ref_set_hash
    self.late_data_hold_ref_set_hash = late_data_hold_ref_set_hash
    self.workflow_publication_state = workflow_publication_state
    self.workflow_publication_settled_at = workflow_publication_settled_at
    self.published_workflow_outcome_counts = published_workflow_outcome_counts
    self.published_workflow_item_count = published_workflow_item_count
    self.notification_publication_state = notification_publication_state
    self.notification_publication_settled_at = notification_publication_settled_at
    self.published_notification_ref_count = published_notification_ref_count
    self.persisted_outcome_counts = persisted_outcome_counts
    self.covered_selection_entry_count = covered_selection_entry_count
    self.backlog_pressure_basis_hash = backlog_pressure_basis_hash
    self.portfolio_tail_risk_basis_hash = portfolio_tail_risk_basis_hash
    self.stability_basis_hash = stability_basis_hash
    self.publication_generation = publication_generation
    self.supersession_state = supersession_state
    self.supersession_root_digest_id = supersession_root_digest_id
    self.supersedes_digest_id_or_null = supersedes_digest_id_or_null
    self.supersession_reason_codes = supersession_reason_codes
    self.supersession_policy = supersession_policy
  }
}

public struct OperatorDigestDerivationContractSummaryCounts: Codable, Sendable {
  public let auto_completed: Int
  public let waiting_on_authority: Int
  public let waiting_on_late_data: Int
  public let review_required: Int
  public let request_client_info: Int
  public let blocked_internal: Int
  public let failed_retryable: Int
  public let failed_non_retryable: Int
  public let reused_result: Int
  public let deferred: Int
  public let skipped: Int

  public init(
    auto_completed: Int,
    waiting_on_authority: Int,
    waiting_on_late_data: Int,
    review_required: Int,
    request_client_info: Int,
    blocked_internal: Int,
    failed_retryable: Int,
    failed_non_retryable: Int,
    reused_result: Int,
    deferred: Int,
    skipped: Int
  ) {
    self.auto_completed = auto_completed
    self.waiting_on_authority = waiting_on_authority
    self.waiting_on_late_data = waiting_on_late_data
    self.review_required = review_required
    self.request_client_info = request_client_info
    self.blocked_internal = blocked_internal
    self.failed_retryable = failed_retryable
    self.failed_non_retryable = failed_non_retryable
    self.reused_result = reused_result
    self.deferred = deferred
    self.skipped = skipped
  }
}

public enum OperatorDigestDerivationContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/operator_digest_derivation_contract.schema.json"
  public static let sourceHash = "99ef020118ac754fbd2f7ff93cfa2fce256017ea05e161d905e49ddf7120622b"
}

public struct OperatorMorningDigest: Codable, Sendable {
  public let artifact_type: JSONValue
  public let digest_id: String
  public let tenant_id: String
  public let execution_mode_boundary_contract: JSONValue
  public let coverage_date: String
  public let source_batch_run_refs: [String]
  public let derivation_contract: OperatorDigestDerivationContract
  public let covered_selection_entry_refs: [String]
  public let summary_counts: OperatorMorningDigestSummaryCounts
  public let outcome_entry_refs: OperatorMorningDigestOutcomeEntryRefs
  public let queue_summaries: [OperatorMorningDigestQueueSummary]
  public let highlighted_client_outcomes: [OperatorMorningDigestHighlightedClientOutcome]
  public let waiting_on_authority_refs: [String]
  public let late_data_hold_refs: [String]
  public let backlog_pressure: Double?
  public let portfolio_tail_risk: Double?
  public let stability_state: JSONValue
  public let published_workflow_item_refs: [String]
  public let published_notification_refs: [String]
  public let generated_by_principal_ref: String
  public let generated_at: ISO8601DateTimeString
  public let published_at: ISO8601DateTimeString
  public let supersedes_digest_id: String?

  public init(
    artifact_type: JSONValue,
    digest_id: String,
    tenant_id: String,
    execution_mode_boundary_contract: JSONValue,
    coverage_date: String,
    source_batch_run_refs: [String],
    derivation_contract: OperatorDigestDerivationContract,
    covered_selection_entry_refs: [String],
    summary_counts: OperatorMorningDigestSummaryCounts,
    outcome_entry_refs: OperatorMorningDigestOutcomeEntryRefs,
    queue_summaries: [OperatorMorningDigestQueueSummary],
    highlighted_client_outcomes: [OperatorMorningDigestHighlightedClientOutcome],
    waiting_on_authority_refs: [String],
    late_data_hold_refs: [String],
    backlog_pressure: Double?,
    portfolio_tail_risk: Double?,
    stability_state: JSONValue,
    published_workflow_item_refs: [String],
    published_notification_refs: [String],
    generated_by_principal_ref: String,
    generated_at: ISO8601DateTimeString,
    published_at: ISO8601DateTimeString,
    supersedes_digest_id: String?
  ) {
    self.artifact_type = artifact_type
    self.digest_id = digest_id
    self.tenant_id = tenant_id
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.coverage_date = coverage_date
    self.source_batch_run_refs = source_batch_run_refs
    self.derivation_contract = derivation_contract
    self.covered_selection_entry_refs = covered_selection_entry_refs
    self.summary_counts = summary_counts
    self.outcome_entry_refs = outcome_entry_refs
    self.queue_summaries = queue_summaries
    self.highlighted_client_outcomes = highlighted_client_outcomes
    self.waiting_on_authority_refs = waiting_on_authority_refs
    self.late_data_hold_refs = late_data_hold_refs
    self.backlog_pressure = backlog_pressure
    self.portfolio_tail_risk = portfolio_tail_risk
    self.stability_state = stability_state
    self.published_workflow_item_refs = published_workflow_item_refs
    self.published_notification_refs = published_notification_refs
    self.generated_by_principal_ref = generated_by_principal_ref
    self.generated_at = generated_at
    self.published_at = published_at
    self.supersedes_digest_id = supersedes_digest_id
  }
}

public struct OperatorMorningDigestSummaryCounts: Codable, Sendable {
  public let auto_completed: Int
  public let waiting_on_authority: Int
  public let waiting_on_late_data: Int
  public let review_required: Int
  public let request_client_info: Int
  public let blocked_internal: Int
  public let failed_retryable: Int
  public let failed_non_retryable: Int
  public let reused_result: Int
  public let deferred: Int
  public let skipped: Int

  public init(
    auto_completed: Int,
    waiting_on_authority: Int,
    waiting_on_late_data: Int,
    review_required: Int,
    request_client_info: Int,
    blocked_internal: Int,
    failed_retryable: Int,
    failed_non_retryable: Int,
    reused_result: Int,
    deferred: Int,
    skipped: Int
  ) {
    self.auto_completed = auto_completed
    self.waiting_on_authority = waiting_on_authority
    self.waiting_on_late_data = waiting_on_late_data
    self.review_required = review_required
    self.request_client_info = request_client_info
    self.blocked_internal = blocked_internal
    self.failed_retryable = failed_retryable
    self.failed_non_retryable = failed_non_retryable
    self.reused_result = reused_result
    self.deferred = deferred
    self.skipped = skipped
  }
}

public typealias OperatorMorningDigestSelectionEntryRefList = [String]

public struct OperatorMorningDigestOutcomeEntryRefs: Codable, Sendable {
  public let auto_completed: OperatorMorningDigestSelectionEntryRefList
  public let waiting_on_authority: OperatorMorningDigestSelectionEntryRefList
  public let waiting_on_late_data: OperatorMorningDigestSelectionEntryRefList
  public let review_required: OperatorMorningDigestSelectionEntryRefList
  public let request_client_info: OperatorMorningDigestSelectionEntryRefList
  public let blocked_internal: OperatorMorningDigestSelectionEntryRefList
  public let failed_retryable: OperatorMorningDigestSelectionEntryRefList
  public let failed_non_retryable: OperatorMorningDigestSelectionEntryRefList
  public let reused_result: OperatorMorningDigestSelectionEntryRefList
  public let deferred: OperatorMorningDigestSelectionEntryRefList
  public let skipped: OperatorMorningDigestSelectionEntryRefList

  public init(
    auto_completed: OperatorMorningDigestSelectionEntryRefList,
    waiting_on_authority: OperatorMorningDigestSelectionEntryRefList,
    waiting_on_late_data: OperatorMorningDigestSelectionEntryRefList,
    review_required: OperatorMorningDigestSelectionEntryRefList,
    request_client_info: OperatorMorningDigestSelectionEntryRefList,
    blocked_internal: OperatorMorningDigestSelectionEntryRefList,
    failed_retryable: OperatorMorningDigestSelectionEntryRefList,
    failed_non_retryable: OperatorMorningDigestSelectionEntryRefList,
    reused_result: OperatorMorningDigestSelectionEntryRefList,
    deferred: OperatorMorningDigestSelectionEntryRefList,
    skipped: OperatorMorningDigestSelectionEntryRefList
  ) {
    self.auto_completed = auto_completed
    self.waiting_on_authority = waiting_on_authority
    self.waiting_on_late_data = waiting_on_late_data
    self.review_required = review_required
    self.request_client_info = request_client_info
    self.blocked_internal = blocked_internal
    self.failed_retryable = failed_retryable
    self.failed_non_retryable = failed_non_retryable
    self.reused_result = reused_result
    self.deferred = deferred
    self.skipped = skipped
  }
}

public struct OperatorMorningDigestPrioritySummary: Codable, Sendable {
  public let deadline_bucket: Int
  public let risk_bucket: Int
  public let stable_tie_break_key: String

  public init(
    deadline_bucket: Int,
    risk_bucket: Int,
    stable_tie_break_key: String
  ) {
    self.deadline_bucket = deadline_bucket
    self.risk_bucket = risk_bucket
    self.stable_tie_break_key = stable_tie_break_key
  }
}

public struct OperatorMorningDigestQueueSummary: Codable, Sendable {
  public let queue_ref: String
  public let source_basis: JSONValue
  public let item_refs: [String]
  public let dominant_reason_codes: [String]
  public let item_count: Int
  public let highest_priority: OperatorMorningDigestPrioritySummary

  public init(
    queue_ref: String,
    source_basis: JSONValue,
    item_refs: [String],
    dominant_reason_codes: [String],
    item_count: Int,
    highest_priority: OperatorMorningDigestPrioritySummary
  ) {
    self.queue_ref = queue_ref
    self.source_basis = source_basis
    self.item_refs = item_refs
    self.dominant_reason_codes = dominant_reason_codes
    self.item_count = item_count
    self.highest_priority = highest_priority
  }
}

public struct OperatorMorningDigestHighlightedClientOutcome: Codable, Sendable {
  public let selection_entry_ref: String
  public let client_id: String
  public let period: String
  public let dominant_outcome: String
  public let highlight_rank: Int
  public let entry_loss_score: Double
  public let manifest_ref: String?
  public let work_item_ref: String?
  public let reason_codes: [String]
  public let next_checkpoint_at: ISO8601DateTimeString

  public init(
    selection_entry_ref: String,
    client_id: String,
    period: String,
    dominant_outcome: String,
    highlight_rank: Int,
    entry_loss_score: Double,
    manifest_ref: String?,
    work_item_ref: String?,
    reason_codes: [String],
    next_checkpoint_at: ISO8601DateTimeString
  ) {
    self.selection_entry_ref = selection_entry_ref
    self.client_id = client_id
    self.period = period
    self.dominant_outcome = dominant_outcome
    self.highlight_rank = highlight_rank
    self.entry_loss_score = entry_loss_score
    self.manifest_ref = manifest_ref
    self.work_item_ref = work_item_ref
    self.reason_codes = reason_codes
    self.next_checkpoint_at = next_checkpoint_at
  }
}

public enum OperatorMorningDigestSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/operator_morning_digest.schema.json"
  public static let sourceHash = "34c24e3559dbfc2eaf90d636f1f17995103c9e5506bd4c41c7ab4212fc321363"
}

public struct ParityResult: Codable, Sendable {
  public let parity_id: String
  public let manifest_id: String
  public let artifact_type: JSONValue
  public let execution_mode: String
  public let analysis_only: Bool
  public let non_compliance_config_refs: [String]
  public let counterfactual_basis: String?
  public let lifecycle_state: String
  public let comparison_basis_ref: String?
  public let comparison_requirement: String
  public let parity_threshold_profile_ref: String?
  public let comparison_set_state: JSONValue
  public let ordered_field_codes: [String]
  public let money_profile: SchemaBundle
  public let parity_classification: JSONValue
  public let parity_score: Double?
  public let comparison_coverage: Double?
  public let weighted_parity_pressure: Double?
  public let critical_blocking_field_count: Int
  public let critical_material_field_count: Int
  public let dominant_reason_code: String?
  public let reason_codes: [String]
  public let temporal_propagation_event_refs: [String]
  public let deltas: [String: ParityResultFieldDelta]
  public let cause_hypotheses: [String]
  public let evaluated_at: ISO8601DateTimeString
  public let contract: SchemaBundle

  public init(
    parity_id: String,
    manifest_id: String,
    artifact_type: JSONValue,
    execution_mode: String,
    analysis_only: Bool,
    non_compliance_config_refs: [String],
    counterfactual_basis: String?,
    lifecycle_state: String,
    comparison_basis_ref: String?,
    comparison_requirement: String,
    parity_threshold_profile_ref: String?,
    comparison_set_state: JSONValue,
    ordered_field_codes: [String],
    money_profile: SchemaBundle,
    parity_classification: JSONValue,
    parity_score: Double?,
    comparison_coverage: Double?,
    weighted_parity_pressure: Double?,
    critical_blocking_field_count: Int,
    critical_material_field_count: Int,
    dominant_reason_code: String?,
    reason_codes: [String],
    temporal_propagation_event_refs: [String],
    deltas: [String: ParityResultFieldDelta],
    cause_hypotheses: [String],
    evaluated_at: ISO8601DateTimeString,
    contract: SchemaBundle
  ) {
    self.parity_id = parity_id
    self.manifest_id = manifest_id
    self.artifact_type = artifact_type
    self.execution_mode = execution_mode
    self.analysis_only = analysis_only
    self.non_compliance_config_refs = non_compliance_config_refs
    self.counterfactual_basis = counterfactual_basis
    self.lifecycle_state = lifecycle_state
    self.comparison_basis_ref = comparison_basis_ref
    self.comparison_requirement = comparison_requirement
    self.parity_threshold_profile_ref = parity_threshold_profile_ref
    self.comparison_set_state = comparison_set_state
    self.ordered_field_codes = ordered_field_codes
    self.money_profile = money_profile
    self.parity_classification = parity_classification
    self.parity_score = parity_score
    self.comparison_coverage = comparison_coverage
    self.weighted_parity_pressure = weighted_parity_pressure
    self.critical_blocking_field_count = critical_blocking_field_count
    self.critical_material_field_count = critical_material_field_count
    self.dominant_reason_code = dominant_reason_code
    self.reason_codes = reason_codes
    self.temporal_propagation_event_refs = temporal_propagation_event_refs
    self.deltas = deltas
    self.cause_hypotheses = cause_hypotheses
    self.evaluated_at = evaluated_at
    self.contract = contract
  }
}

public struct ParityResultFieldDelta: Codable, Sendable {
  public let field_code: String
  public let criticality_class: String
  public let criticality_weight: Double
  public let abs_threshold: SchemaBundle
  public let rel_threshold: Double
  public let abs_floor: SchemaBundle
  public let effective_abs_floor: SchemaBundle
  public let comparison_input_state: String
  public let field_class: String
  public let internal_value: JSONValue
  public let authority_value: JSONValue
  public let delta_signed: JSONValue
  public let delta_abs: JSONValue
  public let delta_rel: Double?
  public let breach_ratio: Double?
  public let reason_codes: [String]

  public init(
    field_code: String,
    criticality_class: String,
    criticality_weight: Double,
    abs_threshold: SchemaBundle,
    rel_threshold: Double,
    abs_floor: SchemaBundle,
    effective_abs_floor: SchemaBundle,
    comparison_input_state: String,
    field_class: String,
    internal_value: JSONValue,
    authority_value: JSONValue,
    delta_signed: JSONValue,
    delta_abs: JSONValue,
    delta_rel: Double?,
    breach_ratio: Double?,
    reason_codes: [String]
  ) {
    self.field_code = field_code
    self.criticality_class = criticality_class
    self.criticality_weight = criticality_weight
    self.abs_threshold = abs_threshold
    self.rel_threshold = rel_threshold
    self.abs_floor = abs_floor
    self.effective_abs_floor = effective_abs_floor
    self.comparison_input_state = comparison_input_state
    self.field_class = field_class
    self.internal_value = internal_value
    self.authority_value = authority_value
    self.delta_signed = delta_signed
    self.delta_abs = delta_abs
    self.delta_rel = delta_rel
    self.breach_ratio = breach_ratio
    self.reason_codes = reason_codes
  }
}

public enum ParityResultSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/parity_result.schema.json"
  public static let sourceHash = "6b8c5145216d3ab2f64d3dd5d61f2775c1c5f4cecb97c6c680dabb8f16057c14"
}

public struct RiskReport: Codable, Sendable {
  public let risk_id: String
  public let manifest_id: String
  public let artifact_type: JSONValue
  public let execution_mode: String
  public let analysis_only: Bool
  public let non_compliance_config_refs: [String]
  public let counterfactual_basis: String?
  public let risk_threshold_profile_ref: String
  public let risk_score: Double
  public let feature_scores: [RiskReportFeatureScore]
  public let flags: [String]
  public let unresolved_material_blocking_risk_flag: Bool
  public let unresolved_blocking_risk_flag: Bool
  public let created_at: ISO8601DateTimeString
  public let contract: SchemaBundle

  public init(
    risk_id: String,
    manifest_id: String,
    artifact_type: JSONValue,
    execution_mode: String,
    analysis_only: Bool,
    non_compliance_config_refs: [String],
    counterfactual_basis: String?,
    risk_threshold_profile_ref: String,
    risk_score: Double,
    feature_scores: [RiskReportFeatureScore],
    flags: [String],
    unresolved_material_blocking_risk_flag: Bool,
    unresolved_blocking_risk_flag: Bool,
    created_at: ISO8601DateTimeString,
    contract: SchemaBundle
  ) {
    self.risk_id = risk_id
    self.manifest_id = manifest_id
    self.artifact_type = artifact_type
    self.execution_mode = execution_mode
    self.analysis_only = analysis_only
    self.non_compliance_config_refs = non_compliance_config_refs
    self.counterfactual_basis = counterfactual_basis
    self.risk_threshold_profile_ref = risk_threshold_profile_ref
    self.risk_score = risk_score
    self.feature_scores = feature_scores
    self.flags = flags
    self.unresolved_material_blocking_risk_flag = unresolved_material_blocking_risk_flag
    self.unresolved_blocking_risk_flag = unresolved_blocking_risk_flag
    self.created_at = created_at
    self.contract = contract
  }
}

public struct RiskReportFeatureScore: Codable, Sendable {
  public let feature_code: String
  public let feature_value: Double
  public let feature_weight: Double
  public let material_threshold: Double
  public let blocking_threshold: Double
  public let feature_resolved: Bool
  public let flag_state: String

  public init(
    feature_code: String,
    feature_value: Double,
    feature_weight: Double,
    material_threshold: Double,
    blocking_threshold: Double,
    feature_resolved: Bool,
    flag_state: String
  ) {
    self.feature_code = feature_code
    self.feature_value = feature_value
    self.feature_weight = feature_weight
    self.material_threshold = material_threshold
    self.blocking_threshold = blocking_threshold
    self.feature_resolved = feature_resolved
    self.flag_state = flag_state
  }
}

public enum RiskReportSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/risk_report.schema.json"
  public static let sourceHash = "98e8db8465dd015ebed3bf89ce059c7db07b210a177df960f3a19c2eabb90440"
}

public struct TrustInputBasisContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let basis_contract_hash: String
  public let input_presence_state: String
  public let manifest_binding_state: String
  public let lifecycle_binding_state: String
  public let consistency_state: String
  public let limitation_semantics_state: String
  public let freshness_state: String
  public let freshness_dependency_classes: [String]
  public let authority_progression_state: String
  public let baseline_progression_state: String
  public let baseline_selection_contract_hash_or_null: String?
  public let baseline_automation_ceiling: String
  public let baseline_limitation_reason_codes: [String]
  public let late_data_invalidation_state: String
  public let override_dependency_state: String
  public let human_step_state: String
  public let trust_input_state: String
  public let execution_mode_boundary_contract: JSONValue
  public let automation_ceiling: String
  public let filing_readiness_ceiling: String
  public let input_reason_codes: [String]
  public let blocking_dependency_refs: [String]
  public let trust_fresh_until: ISO8601DateTimeString

  public init(
    contract_version: JSONValue,
    basis_contract_hash: String,
    input_presence_state: String,
    manifest_binding_state: String,
    lifecycle_binding_state: String,
    consistency_state: String,
    limitation_semantics_state: String,
    freshness_state: String,
    freshness_dependency_classes: [String],
    authority_progression_state: String,
    baseline_progression_state: String,
    baseline_selection_contract_hash_or_null: String?,
    baseline_automation_ceiling: String,
    baseline_limitation_reason_codes: [String],
    late_data_invalidation_state: String,
    override_dependency_state: String,
    human_step_state: String,
    trust_input_state: String,
    execution_mode_boundary_contract: JSONValue,
    automation_ceiling: String,
    filing_readiness_ceiling: String,
    input_reason_codes: [String],
    blocking_dependency_refs: [String],
    trust_fresh_until: ISO8601DateTimeString
  ) {
    self.contract_version = contract_version
    self.basis_contract_hash = basis_contract_hash
    self.input_presence_state = input_presence_state
    self.manifest_binding_state = manifest_binding_state
    self.lifecycle_binding_state = lifecycle_binding_state
    self.consistency_state = consistency_state
    self.limitation_semantics_state = limitation_semantics_state
    self.freshness_state = freshness_state
    self.freshness_dependency_classes = freshness_dependency_classes
    self.authority_progression_state = authority_progression_state
    self.baseline_progression_state = baseline_progression_state
    self.baseline_selection_contract_hash_or_null = baseline_selection_contract_hash_or_null
    self.baseline_automation_ceiling = baseline_automation_ceiling
    self.baseline_limitation_reason_codes = baseline_limitation_reason_codes
    self.late_data_invalidation_state = late_data_invalidation_state
    self.override_dependency_state = override_dependency_state
    self.human_step_state = human_step_state
    self.trust_input_state = trust_input_state
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.automation_ceiling = automation_ceiling
    self.filing_readiness_ceiling = filing_readiness_ceiling
    self.input_reason_codes = input_reason_codes
    self.blocking_dependency_refs = blocking_dependency_refs
    self.trust_fresh_until = trust_fresh_until
  }
}

public enum TrustInputBasisContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/trust_input_basis_contract.schema.json"
  public static let sourceHash = "e37d8e0ed7fc7df509cecc72f45f449842205647235bc16bcaeacb13033f3409"
}

public typealias TrustSensitivityAnalysisContract = TrustSensitivityContract

public enum TrustSensitivityAnalysisContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/trust_sensitivity_analysis_contract.schema.json"
  public static let sourceHash = "013af2f88e375b8b3c252b49339dcd690cb09a0e70955fea8a315790ac64ed66"
}

public struct TrustSensitivityContract: Codable, Sendable {
  public let contract_version: JSONValue
  public let sensitivity_contract_hash: String
  public let trust_input_basis_contract_hash: String
  public let execution_mode_boundary_hash: String
  public let execution_mode: String
  public let execution_legal_effect_boundary: String
  public let trust_score: Int
  public let risk_score: Int
  public let completeness_score: Int
  public let graph_quality_score: Int
  public let authority_uncertainty_score: Int
  public let authority_penalty: Int
  public let baseline_submission_state: String
  public let live_authority_progression_requested: Bool
  public let active_filing_critical_override_count: Int
  public let critical_retention_limited_count: Int
  public let required_human_step_count: Int
  public let late_data_invalidation_state: String
  public let override_dependency_state: String
  public let score_band: String
  public let cap_band: String
  public let trust_band: String
  public let trust_input_state: String
  public let threshold_stability_state: String
  public let upstream_gate_cap: String
  public let automation_level: String
  public let filing_readiness: String
  public let trust_green_margin: Int
  public let trust_amber_margin: Int
  public let risk_automation_margin: Int
  public let completeness_margin: Int
  public let graph_filing_margin_or_null: Int?
  public let authority_review_margin_or_null: Int?
  public let authority_block_margin_or_null: Int?
  public let score_cap_alignment_state: String
  public let cap_driver_reason_codes: [String]
  public let edge_trigger_codes: [String]
  public let projected_case_results: [[String: JSONValue]]

  public init(
    contract_version: JSONValue,
    sensitivity_contract_hash: String,
    trust_input_basis_contract_hash: String,
    execution_mode_boundary_hash: String,
    execution_mode: String,
    execution_legal_effect_boundary: String,
    trust_score: Int,
    risk_score: Int,
    completeness_score: Int,
    graph_quality_score: Int,
    authority_uncertainty_score: Int,
    authority_penalty: Int,
    baseline_submission_state: String,
    live_authority_progression_requested: Bool,
    active_filing_critical_override_count: Int,
    critical_retention_limited_count: Int,
    required_human_step_count: Int,
    late_data_invalidation_state: String,
    override_dependency_state: String,
    score_band: String,
    cap_band: String,
    trust_band: String,
    trust_input_state: String,
    threshold_stability_state: String,
    upstream_gate_cap: String,
    automation_level: String,
    filing_readiness: String,
    trust_green_margin: Int,
    trust_amber_margin: Int,
    risk_automation_margin: Int,
    completeness_margin: Int,
    graph_filing_margin_or_null: Int?,
    authority_review_margin_or_null: Int?,
    authority_block_margin_or_null: Int?,
    score_cap_alignment_state: String,
    cap_driver_reason_codes: [String],
    edge_trigger_codes: [String],
    projected_case_results: [[String: JSONValue]]
  ) {
    self.contract_version = contract_version
    self.sensitivity_contract_hash = sensitivity_contract_hash
    self.trust_input_basis_contract_hash = trust_input_basis_contract_hash
    self.execution_mode_boundary_hash = execution_mode_boundary_hash
    self.execution_mode = execution_mode
    self.execution_legal_effect_boundary = execution_legal_effect_boundary
    self.trust_score = trust_score
    self.risk_score = risk_score
    self.completeness_score = completeness_score
    self.graph_quality_score = graph_quality_score
    self.authority_uncertainty_score = authority_uncertainty_score
    self.authority_penalty = authority_penalty
    self.baseline_submission_state = baseline_submission_state
    self.live_authority_progression_requested = live_authority_progression_requested
    self.active_filing_critical_override_count = active_filing_critical_override_count
    self.critical_retention_limited_count = critical_retention_limited_count
    self.required_human_step_count = required_human_step_count
    self.late_data_invalidation_state = late_data_invalidation_state
    self.override_dependency_state = override_dependency_state
    self.score_band = score_band
    self.cap_band = cap_band
    self.trust_band = trust_band
    self.trust_input_state = trust_input_state
    self.threshold_stability_state = threshold_stability_state
    self.upstream_gate_cap = upstream_gate_cap
    self.automation_level = automation_level
    self.filing_readiness = filing_readiness
    self.trust_green_margin = trust_green_margin
    self.trust_amber_margin = trust_amber_margin
    self.risk_automation_margin = risk_automation_margin
    self.completeness_margin = completeness_margin
    self.graph_filing_margin_or_null = graph_filing_margin_or_null
    self.authority_review_margin_or_null = authority_review_margin_or_null
    self.authority_block_margin_or_null = authority_block_margin_or_null
    self.score_cap_alignment_state = score_cap_alignment_state
    self.cap_driver_reason_codes = cap_driver_reason_codes
    self.edge_trigger_codes = edge_trigger_codes
    self.projected_case_results = projected_case_results
  }
}

public enum TrustSensitivityContractSchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/trust_sensitivity_contract.schema.json"
  public static let sourceHash = "529519a523af2e5fab5bb1420aa28727a2627f1776af5c9ea6427835e626dd25"
}

public struct TrustSummary: Codable, Sendable {
  public let trust_id: String
  public let manifest_id: String
  public let artifact_type: JSONValue
  public let execution_mode: String
  public let analysis_only: Bool
  public let non_compliance_config_refs: [String]
  public let counterfactual_basis: String?
  public let execution_mode_boundary_contract: JSONValue
  public let lifecycle_state: String
  public let compute_result_ref: String
  public let parity_result_ref: String
  public let risk_report_ref: String
  public let evidence_graph_ref: String
  public let gate_decision_refs: [String]
  public let comparison_requirement: String
  public let parity_classification: String
  public let baseline_submission_state: String
  public let live_authority_progression_requested: Bool
  public let completeness_score: Int
  public let data_quality_score: Int
  public let parity_score: Int
  public let graph_quality_score: Int
  public let risk_score: Int
  public let trust_core_score: Double
  public let score_band: String
  public let cap_band: String
  public let trust_band: String
  public let trust_score: Int
  public let trust_input_state: String
  public let trust_input_basis_contract: TrustInputBasisContract
  public let trust_sensitivity_analysis_contract: TrustSensitivityAnalysisContract
  public let threshold_stability_state: String
  public let upstream_gate_cap: String
  public let trust_green_margin: Int
  public let trust_amber_margin: Int
  public let risk_automation_margin: Int
  public let active_filing_critical_override_count: Int
  public let critical_retention_limited_count: Int
  public let unresolved_material_blocking_risk_flag: Bool
  public let unresolved_blocking_risk_flag: Bool
  public let override_penalty: JSONValue
  public let retention_penalty: JSONValue
  public let authority_uncertainty_score: Int
  public let authority_penalty: Int
  public let trust_level: String
  public let automation_level: String
  public let filing_readiness: String
  public let dominant_reason_code: String
  public let plain_summary: String
  public let decision_explainability_contract: DecisionExplainabilityContract
  public let decision_constraint_codes: [String]
  public let reason_codes: [String]
  public let blocking_dependency_refs: [String]
  public let temporal_propagation_event_refs: [String]
  public let support_refs: [String]
  public let required_human_steps: [String]
  public let trust_fresh_until: ISO8601DateTimeString
  public let synthesized_at: ISO8601DateTimeString
  public let superseded_at: ISO8601DateTimeString
  public let superseded_by_trust_id: String?
  public let contract: SchemaBundle

  public init(
    trust_id: String,
    manifest_id: String,
    artifact_type: JSONValue,
    execution_mode: String,
    analysis_only: Bool,
    non_compliance_config_refs: [String],
    counterfactual_basis: String?,
    execution_mode_boundary_contract: JSONValue,
    lifecycle_state: String,
    compute_result_ref: String,
    parity_result_ref: String,
    risk_report_ref: String,
    evidence_graph_ref: String,
    gate_decision_refs: [String],
    comparison_requirement: String,
    parity_classification: String,
    baseline_submission_state: String,
    live_authority_progression_requested: Bool,
    completeness_score: Int,
    data_quality_score: Int,
    parity_score: Int,
    graph_quality_score: Int,
    risk_score: Int,
    trust_core_score: Double,
    score_band: String,
    cap_band: String,
    trust_band: String,
    trust_score: Int,
    trust_input_state: String,
    trust_input_basis_contract: TrustInputBasisContract,
    trust_sensitivity_analysis_contract: TrustSensitivityAnalysisContract,
    threshold_stability_state: String,
    upstream_gate_cap: String,
    trust_green_margin: Int,
    trust_amber_margin: Int,
    risk_automation_margin: Int,
    active_filing_critical_override_count: Int,
    critical_retention_limited_count: Int,
    unresolved_material_blocking_risk_flag: Bool,
    unresolved_blocking_risk_flag: Bool,
    override_penalty: JSONValue,
    retention_penalty: JSONValue,
    authority_uncertainty_score: Int,
    authority_penalty: Int,
    trust_level: String,
    automation_level: String,
    filing_readiness: String,
    dominant_reason_code: String,
    plain_summary: String,
    decision_explainability_contract: DecisionExplainabilityContract,
    decision_constraint_codes: [String],
    reason_codes: [String],
    blocking_dependency_refs: [String],
    temporal_propagation_event_refs: [String],
    support_refs: [String],
    required_human_steps: [String],
    trust_fresh_until: ISO8601DateTimeString,
    synthesized_at: ISO8601DateTimeString,
    superseded_at: ISO8601DateTimeString,
    superseded_by_trust_id: String?,
    contract: SchemaBundle
  ) {
    self.trust_id = trust_id
    self.manifest_id = manifest_id
    self.artifact_type = artifact_type
    self.execution_mode = execution_mode
    self.analysis_only = analysis_only
    self.non_compliance_config_refs = non_compliance_config_refs
    self.counterfactual_basis = counterfactual_basis
    self.execution_mode_boundary_contract = execution_mode_boundary_contract
    self.lifecycle_state = lifecycle_state
    self.compute_result_ref = compute_result_ref
    self.parity_result_ref = parity_result_ref
    self.risk_report_ref = risk_report_ref
    self.evidence_graph_ref = evidence_graph_ref
    self.gate_decision_refs = gate_decision_refs
    self.comparison_requirement = comparison_requirement
    self.parity_classification = parity_classification
    self.baseline_submission_state = baseline_submission_state
    self.live_authority_progression_requested = live_authority_progression_requested
    self.completeness_score = completeness_score
    self.data_quality_score = data_quality_score
    self.parity_score = parity_score
    self.graph_quality_score = graph_quality_score
    self.risk_score = risk_score
    self.trust_core_score = trust_core_score
    self.score_band = score_band
    self.cap_band = cap_band
    self.trust_band = trust_band
    self.trust_score = trust_score
    self.trust_input_state = trust_input_state
    self.trust_input_basis_contract = trust_input_basis_contract
    self.trust_sensitivity_analysis_contract = trust_sensitivity_analysis_contract
    self.threshold_stability_state = threshold_stability_state
    self.upstream_gate_cap = upstream_gate_cap
    self.trust_green_margin = trust_green_margin
    self.trust_amber_margin = trust_amber_margin
    self.risk_automation_margin = risk_automation_margin
    self.active_filing_critical_override_count = active_filing_critical_override_count
    self.critical_retention_limited_count = critical_retention_limited_count
    self.unresolved_material_blocking_risk_flag = unresolved_material_blocking_risk_flag
    self.unresolved_blocking_risk_flag = unresolved_blocking_risk_flag
    self.override_penalty = override_penalty
    self.retention_penalty = retention_penalty
    self.authority_uncertainty_score = authority_uncertainty_score
    self.authority_penalty = authority_penalty
    self.trust_level = trust_level
    self.automation_level = automation_level
    self.filing_readiness = filing_readiness
    self.dominant_reason_code = dominant_reason_code
    self.plain_summary = plain_summary
    self.decision_explainability_contract = decision_explainability_contract
    self.decision_constraint_codes = decision_constraint_codes
    self.reason_codes = reason_codes
    self.blocking_dependency_refs = blocking_dependency_refs
    self.temporal_propagation_event_refs = temporal_propagation_event_refs
    self.support_refs = support_refs
    self.required_human_steps = required_human_steps
    self.trust_fresh_until = trust_fresh_until
    self.synthesized_at = synthesized_at
    self.superseded_at = superseded_at
    self.superseded_by_trust_id = superseded_by_trust_id
    self.contract = contract
  }
}

public enum TrustSummarySchemaLineage {
  public static let schemaId = "https://taxat.dev/schemas/trust_summary.schema.json"
  public static let sourceHash = "9db7af8cb93e8d0e774abb562f8bc61e0fc531fadc29381d37c732fc35144866"
}

public enum DecisioningAndNightlyBindingManifest {
  public static let familyRef = "DECISIONING_AND_NIGHTLY"
  public static let schemaCount = 21
}
