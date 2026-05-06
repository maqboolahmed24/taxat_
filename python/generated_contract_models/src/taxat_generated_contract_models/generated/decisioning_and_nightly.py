"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class BaselineSelectionContract(TypedDict, total=False):
    selection_profile_code: Required[Literal["DRIFT_BASELINE_SELECTION_V1"]]
    dominance_key_profile_code: Required[Literal["DRIFT_BASELINE_DOMINANCE_KEY_V1"]]
    selection_contract_hash: Required[str]
    active_exact_scope_key: Required[str]
    target_scope_refs: Required[list[str]]
    selected_scope_refs: Required[list[str]]
    scope_match_class: Required[Literal["EXACT_SCOPE_MATCH", "SCOPE_SLICED_SUBSET_MATCH", "BROADER_CLIENT_PERIOD_MATCH"]]
    scope_resolution_state: Required[Literal["EXACT_SCOPE_SELECTED", "SCOPE_SLICED_SUBSET_SELECTED_NO_EXACT_CANDIDATE", "BROADER_SCOPE_SELECTED_NO_EXACT_CANDIDATE"]]
    scope_rank: Required[int]
    exact_scope_candidate_present: Required[bool]
    selected_baseline_type: Required[Literal["WORKING", "FILED", "AMENDED", "AUTHORITY_CORRECTED", "OUT_OF_BAND"]]
    same_scope_truth_resolution_state: Required[Literal["NO_STRONGER_EXTERNAL_TRUTH_PRESENT", "AUTHORITY_CORRECTED_TRUTH_SELECTED", "OUT_OF_BAND_EXTERNAL_TRUTH_BLOCKS_INTERNAL_LINEAGE"]]
    precedence_rank: Required[int]
    authority_resolution_class: Required[Literal["EXACT_AUTHORITY_CONFIRMED", "AUTHORITY_OBSERVED_EXTERNAL", "ENGINE_CHAIN_UNREFRESHED", "WORKING_ONLY"]]
    authority_resolution_rank: Required[int]
    continuity_class: Required[Literal["INTERNAL_CHAIN_CONTINUITY", "AUTHORITY_CORRECTED_EXTERNAL_CONTINUITY", "OUT_OF_BAND_EXTERNAL_CONTINUITY", "WORKING_LOCAL_ONLY"]]
    chain_continuity_rank: Required[int]
    selected_effective_at_or_null: Required[ISO8601DateTimeString]
    selected_manifest_generation_or_null: Required[int | None]
    stable_selection_id: Required[str]
    internal_chain_continuity_asserted: Required[bool]
    baseline_anchor_weight: Required[float]
    uncertainty_reason_codes: Required[list[str]]
    automation_ceiling: Required[Literal["ALLOWED", "LIMITED", "BLOCKED"]]
    review_recommendation_floor: Required[Literal["NONE", "REVIEW_REQUIRED", "RECONCILIATION_REQUIRED"]]
    amendment_progression_ceiling: Required[Literal["ELIGIBLE_NOW_ALLOWED", "REVIEW_ONLY", "RECONCILE_FIRST"]]
    benign_drift_eligibility_state: Required[Literal["ALLOWED", "FORBIDDEN"]]

BaselineSelectionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/baseline_selection_contract.schema.json",
    "source_hash": "1c219c5b517176385f35befd559727c5aa7f38607d2110ef2efa1c3f2410e377",
}

class CalculationBasis(TypedDict, total=False):
    artifact_type: Required[Literal["CalculationBasis"]]
    calculation_basis_id: Required[str]
    calculation_id: Required[str]
    calculation_request_ref: Required[str]
    manifest_id: Required[str]
    calculation_type: Required[Literal["in-year", "intent-to-finalise", "intent-to-amend", "final-declaration"]]
    basis_type: Required[str]
    basis_status: Required[Literal["PROVISIONAL", "CONFIRMED", "REJECTED", "SUPERSEDED"]]
    basis_payload_ref: Required[str]
    basis_hash: Required[str]
    parity_reusable: Required[bool]
    filing_reusable: Required[bool]
    user_confirmation_ref: Required[str | None]
    reason_codes: Required[list[str]]
    captured_at: Required[ISO8601DateTimeString]
    confirmed_at: Required[ISO8601DateTimeString]
    superseded_at: Required[ISO8601DateTimeString]

CalculationBasisSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/calculation_basis.schema.json",
    "source_hash": "e17f23654c175b0a6bd0c05a6a581c97b121b53b02c359b1b134f2defeffd7fe",
}

class CalculationUserConfirmation(TypedDict, total=False):
    artifact_type: Required[Literal["CalculationUserConfirmation"]]
    user_confirmation_id: Required[str]
    calculation_id: Required[str]
    calculation_basis_ref: Required[str]
    manifest_id: Required[str]
    actor_ref: Required[str]
    actor_role: Required[Literal["PREPARER", "REVIEWER", "APPROVER", "CLIENT_SIGNATORY", "SUBJECT_SELF", "SUBJECT_REPRESENTATIVE"]]
    confirmation_state: Required[Literal["PENDING", "CONFIRMED", "DECLINED"]]
    presentation_ref: Required[str]
    confirmed_basis_hash: Required[str | None]
    reason_codes: Required[list[str]]
    confirmed_at: Required[ISO8601DateTimeString]
    declined_at: Required[ISO8601DateTimeString]

CalculationUserConfirmationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/calculation_user_confirmation.schema.json",
    "source_hash": "1b5d67e3a1f9c3a37c41ebfeb4ffc6df274008cece89aaa840055c7c17343837",
}

class ComputeResult(TypedDict, total=False):
    compute_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["ComputeResult"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    lifecycle_state: Required[Literal["NOT_RUN", "RUNNING", "COMPUTED", "BLOCKED", "SUPERSEDED"]]
    rule_version_ref: Required[str]
    reporting_scope: Required[Literal["year_end", "quarterly_update", "estimate_only"]]
    effective_partition_scope_refs: Required[list[str]]
    basis_profile_ref_or_null: Required[str | None]
    quarterly_basis_profile_or_null: Required[Literal["PERIODIC", "CUMULATIVE", None]]
    adjustment_inclusion_policy: Required[Literal["RECORD_ONLY", "APPLY_SCOPE_FILTERED_ADJUSTMENTS"]]
    adjustment_scope_source: Required[Literal["EXECUTABLE_REPORTING_SCOPE", "COUNTERFACTUAL_ANALYSIS_SCOPE"]]
    money_profile: Required[SchemaBundle]
    totals: Required[dict[str, SchemaBundle | dict[str, SchemaBundle]]]
    assumptions: Required[dict[str, str | float | bool | list[str]]]
    diagnostic_reason_codes: Required[list[str]]
    diagnostic_artifact_refs: Required[list[str]]
    computed_at: Required[ISO8601DateTimeString]
    contract: Required[SchemaBundle]

ComputeResultSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/compute_result.schema.json",
    "source_hash": "ad76df96a95d97fde3b86c5a65394097c6c62969fed0bfdd7e523a546f4b1e21",
}

class DecisionBundle(TypedDict, total=False):
    decision_bundle_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["DecisionBundle"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    decision_status: Required[Literal["COMPLETED", "BLOCKED", "REVIEW_REQUIRED"]]
    decision_reason_codes: Required[list[str]]
    dominant_reason_code: Required[str]
    workflow_item_refs: Required[list[str]]
    snapshot_id: NotRequired[str | None]
    compute_id: NotRequired[str | None]
    forecast_id: NotRequired[str | None]
    risk_id: NotRequired[str | None]
    parity_id: NotRequired[str | None]
    trust_id: NotRequired[str | None]
    graph_id: NotRequired[str | None]
    twin_id: NotRequired[str | None]
    filing_packet_id: NotRequired[str | None]
    submission_record_id: NotRequired[str | None]
    outcome_class: Required[Literal["FINAL_SUCCESS", "FINAL_BLOCKED", "HUMAN_REVIEW", "APPROVAL_PENDING", "AUTHORITY_PENDING", "AUTHORITY_UNKNOWN", "LATE_DATA_PENDING", "OUT_OF_BAND_REVIEW"]]
    waiting_on: Required[Literal["NONE", "HUMAN", "APPROVAL", "AUTHORITY", "LATE_DATA"]]
    checkpoint_state: Required[Literal["NONE", "SOURCE_COLLECTION", "PROJECTION_PENDING", "HUMAN_REVIEW", "APPROVAL_PENDING", "AUTHORITY_PREFLIGHT", "TRANSMIT_PENDING", "PENDING_ACK", "RECONCILIATION_PENDING", "LATE_DATA_PENDING", "CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND"]]
    truth_state: Required[Literal["LOCAL_INTENT_ONLY", "PERSISTED_INTERNAL", "AUTHORITY_PENDING", "AUTHORITY_CONFIRMED", "AUTHORITY_REJECTED", "AUTHORITY_UNKNOWN", "AUTHORITY_OUT_OF_BAND"]]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    plain_reason: Required[str]
    decision_explainability_contract: Required[DecisionExplainabilityContract]
    reason_codes: Required[list[str]]
    next_action_codes: Required[list[str]]
    blocked_action_codes: Required[list[str]]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code: Required[str | None]
    no_safe_action_reason_code: Required[str | None]
    suggested_detail_surface_code: Required[Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL", None]]
    active_detail_surface_code: Required[Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL", None]]
    focus_anchor_ref: Required[str | None]
    next_checkpoint_at: Required[ISO8601DateTimeString]
    filing_case_id: NotRequired[str | None]
    amendment_case_id: NotRequired[str | None]
    replay_attestation_ref: NotRequired[str | None]
    persisted_at: Required[ISO8601DateTimeString]
    contract: Required[SchemaBundle]
    primary_proof_bundle_ref: Required[str | None]

DecisionBundleSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/decision_bundle.schema.json",
    "source_hash": "175c3018abea47d20ef8538949e31da9c3ab101c87550d7241b23d412010392f",
}

class DecisionExplainabilityContract(TypedDict, total=False):
    contract_version: Required[Literal["DECISION_EXPLAINABILITY_V1"]]
    artifact_family: Required[Literal["GATE_DECISION_RECORD", "TRUST_SUMMARY", "DECISION_BUNDLE"]]
    grammar_profile_code: Required[Literal["LOW_NOISE_DECISION_GRAMMAR_V1"]]
    reason_order_policy: Required[Literal["DOMINANT_REASON_FIRST_CANONICAL_PRIORITY"]]
    dominant_reason_selection_policy: Required[Literal["FIRST_ORDERED_REASON_IS_DOMINANT"]]
    summary_source_policy: Required[Literal["READ_SURFACES_MUST_USE_PERSISTED_FIELDS"]]
    compression_policy: Required[Literal["PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT"]]
    compression_reason_cap: Required[Literal[3]]
    ordered_reason_codes: Required[list[str]]
    dominant_reason_code: Required[str]
    compressed_reason_codes: Required[list[str]]
    suppressed_reason_count: Required[int]
    semantic_qualifiers: Required[list[Literal["AUTHORITY_STATE", "LIMITATION_STATE", "OVERRIDE_STATE", "ACTIONABILITY_STATE"]]]
    action_projection_state: Required[Literal["NONE", "NEXT_ACTIONS_INCLUDED", "PRIMARY_ACTION_INCLUDED", "NO_SAFE_ACTION_DISCLOSED"]]
    plain_text_field_name: Required[Literal["plain_explanation", "plain_summary", "plain_reason"]]
    plain_text_character_limit: Required[Literal[200]]

DecisionExplainabilityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/decision_explainability_contract.schema.json",
    "source_hash": "0e3a392f771fe04c24f057cf9cbcf6fc5414c2e582bb98de93b4dca3e6b2479d",
}

class ForecastSet(TypedDict, total=False):
    forecast_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["ForecastSet"]]
    execution_mode: Required[Literal["ANALYSIS"]]
    analysis_only: Required[Literal[True]]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str]
    forecast_profile_ref: Required[str]
    baseline_compute_ref: Required[str]
    money_profile: Required[SchemaBundle]
    scenario_mode: Required[Literal["POINT_ONLY", "MONTE_CARLO"]]
    point_forecasts: Required[list[ForecastSetPointForecast]]
    scenarios: Required[list[ForecastSetScenario]]
    seeds: Required[list[ForecastSetScenarioSeed]]
    created_at: Required[ISO8601DateTimeString]
    contract: Required[SchemaBundle]

class ForecastSetPointForecast(TypedDict, total=False):
    horizon_code: Required[str]
    category_code: Required[str]
    baseline_steps: Required[int]
    point_value: Required[SchemaBundle]
    normalized_seasonality: Required[float]
    annualized_growth_rate: Required[float]

class ForecastSetScenario(TypedDict, total=False):
    scenario_id: Required[str]
    seed_ref: Required[str]
    values: Required[list[ForecastSetScenarioValue]]

class ForecastSetScenarioValue(TypedDict, total=False):
    horizon_code: Required[str]
    category_code: Required[str]
    simulated_value: Required[SchemaBundle]

class ForecastSetScenarioSeed(TypedDict, total=False):
    scenario_id: Required[str]
    seed: Required[str]

ForecastSetSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/forecast_set.schema.json",
    "source_hash": "e3d40985841690f8f7afaee3fe993e0170a4ee23eb0a9bc0ba2edd7a93b7b7dd",
}

class GateAdmissibilityRecord(TypedDict, total=False):
    admissibility_id: Required[str]
    suite_result_ref: Required[str]
    suite_family: Required[Literal["SCHEMA_COMPATIBILITY", "DETERMINISTIC_AND_STATE_MACHINE", "NORTHBOUND_API", "AUTHORITY_SANDBOX", "OPERATOR_CLIENT", "SECURITY", "PERFORMANCE_AND_CANARY", "RESTORE_DRILL", "MIGRATION_VERIFICATION", "SUPPLY_CHAIN", "SUITE_ADMISSIBILITY"]]
    candidate_environment_ref: Required[str]
    artifact_digest: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    schema_bundle_hash: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    schema_bundle_compatibility_gate_contract: Required[SchemaBundleCompatibilityGateContract]
    migration_plan_ref: Required[str | None]
    authority_sandbox_coverage_contract_or_null: Required[AuthoritySandboxCoverageContract | None]
    supported_client_window_ref: Required[str | None]
    restore_drill_ref: Required[str | None]
    restore_checkpoint_ref: Required[str | None]
    deterministic_golden_pack_ref: Required[str | None]
    candidate_identity_match: Required[bool]
    freshness_verified: Required[bool]
    contract_window_consistent: Required[bool]
    rerun_scope_preserved: Required[bool]
    quarantine_state: Required[Literal["NONE", "FLAKE_QUARANTINED", "MUTED", "MANUAL_WAIVER"]]
    admissibility_state: Required[Literal["ADMISSIBLE", "INADMISSIBLE"]]
    evaluated_at: Required[ISO8601DateTimeString]
    reason_codes: Required[list[str]]

GateAdmissibilityRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/gate_admissibility_record.schema.json",
    "source_hash": "8f4832153cb12678309654a6fc3a8da810ad3e29f2ae026eed1920ee500167ff",
}

class GateDecisionRecord(TypedDict, total=False):
    artifact_type: Required[Literal["GateDecisionRecord"]]
    gate_decision_id: Required[str]
    manifest_id: Required[str]
    gate_code: Required[Literal["MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE", "INPUT_BOUNDARY_GATE", "DATA_QUALITY_GATE", "RETENTION_EVIDENCE_GATE", "PARITY_GATE", "TRUST_GATE", "AMENDMENT_GATE", "FILING_GATE", "SUBMISSION_GATE"]]
    gate_stage_index: Required[int]
    gate_class: Required[Literal["NON_ACCESS"]]
    decision: Required[Literal["PASS", "PASS_WITH_NOTICE", "MANUAL_REVIEW", "OVERRIDABLE_BLOCK", "HARD_BLOCK"]]
    reason_codes: Required[list[str]]
    dominant_reason_code: Required[str]
    plain_explanation: Required[str]
    decision_explainability_contract: Required[DecisionExplainabilityContract]
    severity: Required[Literal["INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL"]]
    gate_semantics_contract: Required[GateSemanticsContract]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    metrics: Required[dict[str, JSONValue]]
    decision_basis_ref: Required[str]
    input_artifact_refs: Required[list[str]]
    prerequisite_gate_refs: Required[list[str]]
    blocking_dependency_refs: Required[list[str]]
    overrideability: Required[Literal["NONE", "SCOPED_OVERRIDE_ALLOWED", "SCOPED_OVERRIDE_REQUIRED", "NON_OVERRIDEABLE"]]
    override_resolution_state: Required[Literal["NOT_APPLICABLE", "NO_VALID_OVERRIDE", "VALID_OVERRIDE_ACTIVE"]]
    active_override_refs: Required[list[str]]
    required_override_scope: Required[str | None]
    next_action_codes: Required[list[str]]
    policy_version_ref: Required[str]
    decided_at: Required[ISO8601DateTimeString]
    effective_scope: Required[list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]]

GateDecisionRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/gate_decision_record.schema.json",
    "source_hash": "b7a32a1995617d4e480527da97335aaec796bfe2f91c3f0c75bd8f86c7fbcf0e",
}

class GateSemanticsContract(TypedDict, total=False):
    contract_version: Required[Literal["GATE_SEMANTICS_CONTRACT_V1"]]
    evaluation_order_profile_code: Required[Literal["NON_ACCESS_GATE_ORDER_V1"]]
    reason_order_profile_code: Required[Literal["NON_ACCESS_GATE_REASON_PRIORITY_V1"]]
    severity_profile_code: Required[Literal["NON_ACCESS_GATE_SEVERITY_V1"]]
    decision_rank: Required[int]
    progression_rank: Required[int]
    blocking_class: Required[Literal["NON_BLOCKING", "REVIEW_REQUIRED", "BLOCKED"]]
    progression_semantics: Required[Literal["AUTOMATED_CONTINUE", "AUTOMATED_CONTINUE_WITH_NOTICE", "REVIEW_ONLY", "BLOCKED"]]
    override_dependency_state: Required[Literal["OVERRIDE_INDEPENDENT", "VALID_OVERRIDE_GOVERNED", "OVERRIDE_REQUIRED_MISSING", "OVERRIDE_FORBIDDEN"]]

GateSemanticsContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/gate_semantics_contract.schema.json",
    "source_hash": "1dc4ae82eee7f90560117ce92c9bce34f67f695330e24787680076e9c3d59671",
}

class NightlyBatchRun(TypedDict, total=False):
    artifact_type: Required[Literal["NightlyBatchRun"]]
    batch_run_id: Required[str]
    tenant_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    nightly_window_key: Required[str]
    trigger_class: Required[Literal["SCHEDULED_WINDOW", "MANUAL_RETRY_WINDOW", "RECOVERY_RECLAIM_WINDOW"]]
    reclaimed_predecessor_batch_run_ref: Required[str | None]
    lifecycle_state: Required[Literal["ALLOCATED", "SELECTING", "PLANNED", "RUNNING", "QUIESCING", "COMPLETED", "COMPLETED_WITH_FAILURES", "BLOCKED", "FAILED", "ABANDONED"]]
    state_transition_contract: Required[StateTransitionContract]
    identity_contract: Required[NightlyBatchIdentityContract]
    scheduler_dedupe_key: Required[str]
    scheduled_for: Required[ISO8601DateTimeString]
    trigger_observed_at: Required[ISO8601DateTimeString]
    initiating_principal_context_ref: Required[str]
    policy_snapshot_hash: Required[str]
    autopilot_policy_hash: Required[str]
    release_verification_manifest_ref: Required[str]
    schema_bundle_hash: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    code_build_id: Required[str]
    environment_ref: Required[Literal["DEV", "TEST", "UAT", "SANDBOX", "PRODUCTION"]]
    global_concurrency_profile: Required[NightlyBatchRunGlobalConcurrencyProfile]
    selection_universe_hash: Required[str]
    selection_universe_count: Required[int]
    recovery_resume_state: Required[Literal["NOT_APPLICABLE", "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED", "PREDECESSOR_SELECTION_REUSED_RESHARDED"]]
    backlog_pressure: Required[float | None]
    portfolio_tail_risk: Required[float | None]
    stability_state: Required[Literal["NORMAL", "SOFT_THROTTLE", "HARD_THROTTLE", None]]
    selection_entries: Required[list[NightlyBatchRunSelectionEntry]]
    shard_plan: Required[list[NightlyBatchRunShardPlanEntry]]
    selected_count: Required[int]
    execution_count: Required[int]
    reused_result_count: Required[int]
    deferred_count: Required[int]
    escalated_count: Required[int]
    skipped_count: Required[int]
    waiting_on_authority_count: Required[int]
    waiting_on_late_data_count: Required[int]
    completed_count: Required[int]
    completed_with_failures_count: Required[int]
    failed_count: Required[int]
    selection_started_at: Required[ISO8601DateTimeString]
    selection_completed_at: Required[ISO8601DateTimeString]
    started_at: Required[ISO8601DateTimeString]
    last_heartbeat_at: Required[ISO8601DateTimeString]
    quiesced_at: Required[ISO8601DateTimeString]
    completed_at: Required[ISO8601DateTimeString]
    abandoned_at: Required[ISO8601DateTimeString]
    successor_batch_run_ref: Required[str | None]
    operator_digest_publication_state: Required[Literal["NOT_READY", "WORKFLOW_PUBLICATION_PENDING", "NOTIFICATION_PUBLICATION_PENDING", "PUBLISHED_COMPLETE"]]
    operator_digest_derivation_contract_or_null: Required[OperatorDigestDerivationContract | None]
    operator_digest_ref: Required[str | None]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

class NightlyBatchRunGlobalConcurrencyProfile(TypedDict, total=False):
    global_manifest_limit: Required[int]
    per_shard_manifest_limit: Required[int]
    authority_transmit_limit: Required[int]
    per_client_serialization: Required[bool]
    heartbeat_interval_seconds: Required[int]
    stale_heartbeat_after_seconds: Required[int]
    soft_stability_rho: Required[float]
    hard_stability_rho: Required[float]
    retry_capacity_fraction: Required[float]
    base_deficit_quantum_minutes: Required[float]

class NightlyBatchRunSelectionEntry(TypedDict, total=False):
    entry_id: Required[str]
    candidate_identity_hash: Required[str]
    selection_basis_hash: Required[str]
    client_id: Required[str]
    period: Required[str]
    requested_scope: Required[list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]]
    selection_disposition: Required[Literal["EXECUTE_NEW_MANIFEST", "EXECUTE_CONTINUATION_CHILD", "REUSE_EXISTING_TERMINAL_RESULT", "DEFER_ACTIVE_ATTEMPT", "DEFER_RETRY_WINDOW", "ESCALATE_ONLY", "SKIP_INELIGIBLE"]]
    terminal_result_reuse_state: Required[Literal["REUSED_TERMINAL_RESULT", "NO_REUSABLE_TERMINAL_RESULT", "TERMINAL_RESULT_CHECKPOINT_DUE", "TERMINAL_RESULT_POLICY_CHANGED", "TERMINAL_RESULT_OPERATOR_ACTION_STALE"]]
    active_attempt_resolution_state: Required[Literal["NO_ACTIVE_ATTEMPT", "ACTIVE_ATTEMPT_DEFERRED", "STALE_ATTEMPT_RECLAIM_REQUIRED"]]
    priority_tuple: Required[NightlyBatchRunPriorityTuple]
    reason_codes: Required[list[str]]
    manifest_ref: Required[str | None]
    prior_manifest_ref: Required[str | None]
    predecessor_selection_entry_ref_or_null: Required[str | None]
    workflow_item_refs: Required[list[str]]
    next_checkpoint_at: Required[ISO8601DateTimeString]
    fairness_group_key: NotRequired[str | None]
    shard_key: Required[str | None]
    outcome_bucket: Required[Literal["AUTO_COMPLETED", "WAITING_ON_AUTHORITY", "WAITING_ON_LATE_DATA", "REVIEW_REQUIRED", "REQUEST_CLIENT_INFO", "BLOCKED_INTERNAL", "FAILED_RETRYABLE", "FAILED_NON_RETRYABLE", "REUSED_RESULT", "DEFERRED", "SKIPPED", None]]
    executed_at: Required[ISO8601DateTimeString]

class NightlyBatchRunPriorityTuple(TypedDict, total=False):
    deadline_bucket: Required[int]
    filing_state_bucket: Required[int]
    authority_checkpoint_bucket: Required[int]
    risk_bucket: Required[int]
    automation_readiness_bucket: Required[int]
    retry_ready_bucket: Required[int]
    priority_score: NotRequired[float]
    expected_service_minutes: NotRequired[float]
    deadline_pressure: NotRequired[float]
    checkpoint_pressure: NotRequired[float]
    risk_pressure: NotRequired[float]
    fairness_credit: NotRequired[float]
    retry_success_probability: NotRequired[float]
    retry_expected_gain: NotRequired[float]
    stable_tie_break_key: Required[str]

class NightlyBatchRunShardPlanEntry(TypedDict, total=False):
    shard_key: Required[str]
    entry_refs: Required[list[str]]
    shard_state: Required[Literal["PLANNED", "RUNNING", "QUIESCING", "COMPLETED", "FAILED_ISOLATED", "TENANT_WIDE_BLOCKED", "RECLAIM_REQUIRED"]]
    blocked_entry_refs: Required[list[str]]
    failure_reason_codes: Required[list[str]]
    max_concurrent_manifests: Required[int]
    last_heartbeat_at: Required[ISO8601DateTimeString]
    current_owner_ref: Required[str | None]

NightlyBatchRunSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/nightly_batch_run.schema.json",
    "source_hash": "c0797420d911474626316c8a02011f63d9336cf14be63ee298868e1d822d18cc",
}

class NightlyPortfolioSimulationBasisContract(TypedDict, total=False):
    contract_version: Required[Literal["NIGHTLY_PORTFOLIO_SIMULATION_BASIS_V1"]]
    basis_contract_hash: Required[str]
    execution_mode_boundary_hash: Required[str]
    tenant_id: Required[str]
    nightly_window_key: Required[str]
    source_batch_run_refs: Required[list[str]]
    source_batch_set_hash: Required[str]
    source_batch_count: Required[int]
    source_batch_window_state: Required[Literal["SINGLE_NIGHTLY_WINDOW"]]
    source_batch_recovery_state: Required[Literal["SINGLE_BATCH", "SUCCESSOR_RECOVERY_CHAIN"]]
    covered_selection_entry_refs: Required[list[str]]
    covered_selection_entry_count: Required[int]
    baseline_selection_universe_hash: Required[str]
    baseline_policy_snapshot_hash: Required[str]
    baseline_autopilot_policy_hash: Required[str]
    baseline_release_verification_manifest_ref: Required[str]
    baseline_schema_bundle_hash: Required[str]
    baseline_code_build_id: Required[str]
    baseline_environment_ref: Required[Literal["DEV", "TEST", "UAT", "SANDBOX", "PRODUCTION"]]
    baseline_global_concurrency_profile: Required[NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile]
    counterfactual_policy_snapshot_hash_or_null: Required[str | None]
    counterfactual_autopilot_policy_hash_or_null: Required[str | None]
    counterfactual_release_verification_manifest_ref_or_null: Required[str | None]
    counterfactual_release_candidate_identity_contract_or_null: Required[ReleaseCandidateIdentityContract | None]
    counterfactual_global_concurrency_profile_or_null: Required[NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile | None]
    counterfactual_reason_codes: Required[list[str]]
    candidate_counterfactuals: Required[list[NightlyPortfolioSimulationBasisContractCandidateCounterfactual]]
    truth_source_policy: Required[Literal["PERSISTED_NIGHTLY_BATCH_SELECTION_DIGEST_AND_RELEASE_TRUTH_ONLY"]]
    selection_projection_policy: Required[Literal["REPLAY_SELECTION_ENTRIES_WITHOUT_LIVE_REQUERY"]]
    digest_projection_policy: Required[Literal["REPLAY_BASELINE_DIGEST_PARTITION_AND_APPLY_EXPLICIT_DIFFS_ONLY"]]
    non_execution_boundary_policy: Required[Literal["STEP_UP_APPROVAL_RELEASE_AND_AUTHORITY_AMBIGUITY_REMAIN_BLOCKING"]]
    release_identity_policy: Required[Literal["COUNTERFACTUAL_RELEASE_REQUIRES_EXACT_CANDIDATE_AND_SCHEMA_BINDING"]]
    successor_recovery_policy: Required[Literal["SOURCE_BATCH_SET_MAY_INCLUDE_SUCCESSOR_CHAIN_FOR_ONE_WINDOW_ONLY"]]
    diff_explainability_policy: Required[Literal["EVERY_BUCKET_ORDER_AND_HIGHLIGHT_CHANGE_REQUIRES_REASON_CODE_DIFFS"]]

class NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile(TypedDict, total=False):
    global_manifest_limit: Required[int]
    per_shard_manifest_limit: Required[int]
    authority_transmit_limit: Required[int]
    per_client_serialization: Required[bool]
    heartbeat_interval_seconds: Required[int]
    stale_heartbeat_after_seconds: Required[int]
    soft_stability_rho: Required[float]
    hard_stability_rho: Required[float]
    retry_capacity_fraction: Required[float]
    base_deficit_quantum_minutes: Required[float]

class NightlyPortfolioSimulationBasisContractCandidateCounterfactual(TypedDict, total=False):
    selection_entry_ref: Required[str]
    candidate_identity_hash: Required[str]
    counterfactual_policy_outcome: Required[Literal["BASELINE", "ALLOW", "REVIEW_REQUIRED", "DENY"]]
    counterfactual_authority_outcome: Required[Literal["BASELINE", "CLEAR", "WAITING", "AMBIGUOUS"]]
    counterfactual_retry_outcome: Required[Literal["BASELINE", "READY", "DEFER"]]
    counterfactual_release_outcome: Required[Literal["BASELINE", "ADMISSIBLE", "INADMISSIBLE"]]
    reason_codes: Required[list[str]]

NightlyPortfolioSimulationBasisContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/nightly_portfolio_simulation_basis_contract.schema.json",
    "source_hash": "efb21415923f226f89e6471da2bb55a7532220f715dfb9d9c0f9941c50906c81",
}

type NightlyPortfolioWhatIfSimulationSelectionDisposition = Literal["EXECUTE_NEW_MANIFEST", "EXECUTE_CONTINUATION_CHILD", "REUSE_EXISTING_TERMINAL_RESULT", "DEFER_ACTIVE_ATTEMPT", "DEFER_RETRY_WINDOW", "ESCALATE_ONLY", "SKIP_INELIGIBLE"]

type NightlyPortfolioWhatIfSimulationOutcomeBucket = Literal["AUTO_COMPLETED", "WAITING_ON_AUTHORITY", "WAITING_ON_LATE_DATA", "REVIEW_REQUIRED", "REQUEST_CLIENT_INFO", "BLOCKED_INTERNAL", "FAILED_RETRYABLE", "FAILED_NON_RETRYABLE", "REUSED_RESULT", "DEFERRED", "SKIPPED"]

class NightlyPortfolioWhatIfSimulation(TypedDict, total=False):
    artifact_type: Required[Literal["NightlyPortfolioWhatIfSimulation"]]
    simulation_id: Required[str]
    tenant_id: Required[str]
    nightly_window_key: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    basis_contract: Required[NightlyPortfolioSimulationBasisContract]
    baseline_digest_ref_or_null: Required[str | None]
    baseline_summary_counts: Required[NightlyPortfolioWhatIfSimulationSummaryCounts]
    simulated_summary_counts: Required[NightlyPortfolioWhatIfSimulationSummaryCounts]
    baseline_backlog_pressure: Required[float | None]
    simulated_backlog_pressure: Required[float | None]
    baseline_portfolio_tail_risk: Required[float | None]
    simulated_portfolio_tail_risk: Required[float | None]
    baseline_stability_state: Required[Literal["NORMAL", "SOFT_THROTTLE", "HARD_THROTTLE", None]]
    simulated_stability_state: Required[Literal["NORMAL", "SOFT_THROTTLE", "HARD_THROTTLE", None]]
    baseline_highlighted_selection_entry_refs: Required[list[str]]
    simulated_highlighted_selection_entry_refs: Required[list[str]]
    entry_diffs: Required[list[NightlyPortfolioWhatIfSimulationEntryDiff]]
    highlight_diffs: Required[list[NightlyPortfolioWhatIfSimulationHighlightDiff]]
    simulated_by_principal_ref: Required[str]
    simulated_at: Required[ISO8601DateTimeString]

class NightlyPortfolioWhatIfSimulationSummaryCounts(TypedDict, total=False):
    auto_completed: Required[int]
    waiting_on_authority: Required[int]
    waiting_on_late_data: Required[int]
    review_required: Required[int]
    request_client_info: Required[int]
    blocked_internal: Required[int]
    failed_retryable: Required[int]
    failed_non_retryable: Required[int]
    reused_result: Required[int]
    deferred: Required[int]
    skipped: Required[int]

class NightlyPortfolioWhatIfSimulationEntryDiff(TypedDict, total=False):
    selection_entry_ref: Required[str]
    candidate_identity_hash: Required[str]
    baseline_selection_basis_hash: Required[str]
    baseline_selection_disposition: Required[NightlyPortfolioWhatIfSimulationSelectionDisposition]
    simulated_selection_disposition: Required[NightlyPortfolioWhatIfSimulationSelectionDisposition]
    baseline_outcome_bucket: Required[NightlyPortfolioWhatIfSimulationOutcomeBucket]
    simulated_outcome_bucket: Required[NightlyPortfolioWhatIfSimulationOutcomeBucket]
    baseline_execution_rank_or_null: Required[int | None]
    simulated_execution_rank_or_null: Required[int | None]
    baseline_highlight_rank_or_null: Required[int | None]
    simulated_highlight_rank_or_null: Required[int | None]
    baseline_priority_score_or_null: Required[float | None]
    simulated_priority_score_or_null: Required[float | None]
    baseline_reason_codes: Required[list[str]]
    simulated_reason_codes: Required[list[str]]
    movement_reason_codes: Required[list[str]]

class NightlyPortfolioWhatIfSimulationHighlightDiff(TypedDict, total=False):
    selection_entry_ref: Required[str]
    diff_state: Required[Literal["UNCHANGED", "ADDED", "REMOVED", "RANK_RAISED", "RANK_LOWERED", "SCORE_CHANGED"]]
    baseline_highlight_rank_or_null: Required[int | None]
    simulated_highlight_rank_or_null: Required[int | None]
    baseline_entry_loss_score_or_null: Required[float | None]
    simulated_entry_loss_score_or_null: Required[float | None]
    reason_codes: Required[list[str]]

NightlyPortfolioWhatIfSimulationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/nightly_portfolio_what_if_simulation.schema.json",
    "source_hash": "c601ad2b4e0b46a6276dc14f859569e03707c7bfc92d1ca0da31d460dfab2870",
}

class OperatorDigestDerivationContract(TypedDict, total=False):
    contract_version: Required[Literal["OPERATOR_DIGEST_DERIVATION_V1"]]
    derivation_contract_hash: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    coverage_date: Required[str]
    nightly_window_key: Required[str]
    source_batch_set_hash: Required[str]
    source_batch_count: Required[int]
    source_batch_window_state: Required[Literal["SINGLE_NIGHTLY_WINDOW"]]
    truth_source_policy: Required[Literal["PERSISTED_BATCH_MANIFEST_DECISION_WORKFLOW_NOTIFICATION_AND_ERROR_TRUTH_ONLY"]]
    unresolved_handoff_policy: Required[Literal["EVERY_UNRESOLVED_OUTCOME_REQUIRES_PUBLISHED_WORKFLOW_HANDOFF"]]
    queue_summary_policy: Required[Literal["QUEUE_SUMMARIES_PARTITION_PUBLISHED_WORKFLOW_ITEMS"]]
    highlight_ranking_profile: Required[Literal["ENTRY_LOSS_THEN_PRIORITY_TUPLE_V1"]]
    highlight_source_policy: Required[Literal["HIGHLIGHTS_SUBSET_OF_PUBLISHED_WORKFLOW_AND_PERSISTED_OUTCOME_TRUTH"]]
    publication_qa_profile: Required[Literal["DIGEST_PUBLICATION_HANDOFF_QA_V1"]]
    publication_qa_state: Required[Literal["PASSED"]]
    publication_qa_completed_at: Required[ISO8601DateTimeString]
    covered_selection_entry_ref_set_hash: Required[str]
    outcome_entry_partition_hash: Required[str]
    queue_partition_hash: Required[str]
    highlight_order_hash: Required[str]
    published_workflow_item_ref_set_hash: Required[str]
    published_notification_ref_set_hash: Required[str]
    waiting_on_authority_ref_set_hash: Required[str]
    late_data_hold_ref_set_hash: Required[str]
    workflow_publication_state: Required[Literal["COMPLETE_WITH_NO_UNRESOLVED_ITEMS", "COMPLETE_WITH_PUBLISHED_WORKFLOW_ITEMS"]]
    workflow_publication_settled_at: Required[ISO8601DateTimeString]
    published_workflow_outcome_counts: Required[OperatorDigestDerivationContractSummaryCounts]
    published_workflow_item_count: Required[int]
    notification_publication_state: Required[Literal["COMPLETE_WITH_EXPLICIT_NONE", "COMPLETE_WITH_PUBLISHED_NOTIFICATION_REFS"]]
    notification_publication_settled_at: Required[ISO8601DateTimeString]
    published_notification_ref_count: Required[int]
    persisted_outcome_counts: Required[OperatorDigestDerivationContractSummaryCounts]
    covered_selection_entry_count: Required[int]
    backlog_pressure_basis_hash: Required[str]
    portfolio_tail_risk_basis_hash: Required[str]
    stability_basis_hash: Required[str]
    publication_generation: Required[int]
    supersession_state: Required[Literal["INITIAL_PUBLICATION", "RECOVERY_SUPERSESSION"]]
    supersession_root_digest_id: Required[str]
    supersedes_digest_id_or_null: Required[str | None]
    supersession_reason_codes: Required[list[str]]
    supersession_policy: Required[Literal["MONOTONIC_COVERAGE_DATE_PUBLICATION_WITH_EXPLICIT_SUPERSESSION"]]

class OperatorDigestDerivationContractSummaryCounts(TypedDict, total=False):
    auto_completed: Required[int]
    waiting_on_authority: Required[int]
    waiting_on_late_data: Required[int]
    review_required: Required[int]
    request_client_info: Required[int]
    blocked_internal: Required[int]
    failed_retryable: Required[int]
    failed_non_retryable: Required[int]
    reused_result: Required[int]
    deferred: Required[int]
    skipped: Required[int]

OperatorDigestDerivationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/operator_digest_derivation_contract.schema.json",
    "source_hash": "99ef020118ac754fbd2f7ff93cfa2fce256017ea05e161d905e49ddf7120622b",
}

type OperatorMorningDigestSelectionEntryRefList = list[str]

class OperatorMorningDigest(TypedDict, total=False):
    artifact_type: Required[Literal["OperatorMorningDigest"]]
    digest_id: Required[str]
    tenant_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    coverage_date: Required[str]
    source_batch_run_refs: Required[list[str]]
    derivation_contract: Required[OperatorDigestDerivationContract]
    covered_selection_entry_refs: Required[list[str]]
    summary_counts: Required[OperatorMorningDigestSummaryCounts]
    outcome_entry_refs: Required[OperatorMorningDigestOutcomeEntryRefs]
    queue_summaries: Required[list[OperatorMorningDigestQueueSummary]]
    highlighted_client_outcomes: Required[list[OperatorMorningDigestHighlightedClientOutcome]]
    waiting_on_authority_refs: Required[list[str]]
    late_data_hold_refs: Required[list[str]]
    backlog_pressure: Required[float | None]
    portfolio_tail_risk: Required[float | None]
    stability_state: Required[Literal["NORMAL", "SOFT_THROTTLE", "HARD_THROTTLE", None]]
    published_workflow_item_refs: Required[list[str]]
    published_notification_refs: Required[list[str]]
    generated_by_principal_ref: Required[str]
    generated_at: Required[ISO8601DateTimeString]
    published_at: Required[ISO8601DateTimeString]
    supersedes_digest_id: Required[str | None]

class OperatorMorningDigestSummaryCounts(TypedDict, total=False):
    auto_completed: Required[int]
    waiting_on_authority: Required[int]
    waiting_on_late_data: Required[int]
    review_required: Required[int]
    request_client_info: Required[int]
    blocked_internal: Required[int]
    failed_retryable: Required[int]
    failed_non_retryable: Required[int]
    reused_result: Required[int]
    deferred: Required[int]
    skipped: Required[int]

class OperatorMorningDigestOutcomeEntryRefs(TypedDict, total=False):
    auto_completed: Required[OperatorMorningDigestSelectionEntryRefList]
    waiting_on_authority: Required[OperatorMorningDigestSelectionEntryRefList]
    waiting_on_late_data: Required[OperatorMorningDigestSelectionEntryRefList]
    review_required: Required[OperatorMorningDigestSelectionEntryRefList]
    request_client_info: Required[OperatorMorningDigestSelectionEntryRefList]
    blocked_internal: Required[OperatorMorningDigestSelectionEntryRefList]
    failed_retryable: Required[OperatorMorningDigestSelectionEntryRefList]
    failed_non_retryable: Required[OperatorMorningDigestSelectionEntryRefList]
    reused_result: Required[OperatorMorningDigestSelectionEntryRefList]
    deferred: Required[OperatorMorningDigestSelectionEntryRefList]
    skipped: Required[OperatorMorningDigestSelectionEntryRefList]

class OperatorMorningDigestPrioritySummary(TypedDict, total=False):
    deadline_bucket: Required[int]
    risk_bucket: Required[int]
    stable_tie_break_key: Required[str]

class OperatorMorningDigestQueueSummary(TypedDict, total=False):
    queue_ref: Required[str]
    source_basis: Required[Literal["PUBLISHED_WORKFLOW_ITEMS"]]
    item_refs: Required[list[str]]
    dominant_reason_codes: Required[list[str]]
    item_count: Required[int]
    highest_priority: Required[OperatorMorningDigestPrioritySummary]

class OperatorMorningDigestHighlightedClientOutcome(TypedDict, total=False):
    selection_entry_ref: Required[str]
    client_id: Required[str]
    period: Required[str]
    dominant_outcome: Required[Literal["AUTO_COMPLETED", "WAITING_ON_AUTHORITY", "WAITING_ON_LATE_DATA", "REVIEW_REQUIRED", "REQUEST_CLIENT_INFO", "BLOCKED_INTERNAL", "FAILED_RETRYABLE", "FAILED_NON_RETRYABLE", "REUSED_RESULT", "DEFERRED", "SKIPPED"]]
    highlight_rank: Required[int]
    entry_loss_score: Required[float]
    manifest_ref: Required[str | None]
    work_item_ref: Required[str | None]
    reason_codes: Required[list[str]]
    next_checkpoint_at: Required[ISO8601DateTimeString]

OperatorMorningDigestSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/operator_morning_digest.schema.json",
    "source_hash": "34c24e3559dbfc2eaf90d636f1f17995103c9e5506bd4c41c7ab4212fc321363",
}

class ParityResult(TypedDict, total=False):
    parity_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["ParityResult"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    lifecycle_state: Required[Literal["NOT_EVALUATED", "EVALUATED", "SUPERSEDED"]]
    comparison_basis_ref: Required[str | None]
    comparison_requirement: Required[Literal["MANDATORY", "DESIRABLE", "NOT_REQUIRED"]]
    parity_threshold_profile_ref: Required[str | None]
    comparison_set_state: Required[Literal["VALID", "INVALID", None]]
    ordered_field_codes: Required[list[str]]
    money_profile: Required[SchemaBundle]
    parity_classification: Required[Literal["MATCH", "MINOR_DIFFERENCE", "MATERIAL_DIFFERENCE", "BLOCKING_DIFFERENCE", "NOT_COMPARABLE", None]]
    parity_score: Required[float | None]
    comparison_coverage: Required[float | None]
    weighted_parity_pressure: Required[float | None]
    critical_blocking_field_count: Required[int]
    critical_material_field_count: Required[int]
    dominant_reason_code: Required[str | None]
    reason_codes: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    deltas: Required[dict[str, ParityResultFieldDelta]]
    cause_hypotheses: Required[list[str]]
    evaluated_at: Required[ISO8601DateTimeString]
    contract: Required[SchemaBundle]

class ParityResultFieldDelta(TypedDict, total=False):
    field_code: Required[str]
    criticality_class: Required[Literal["CRITICAL", "HIGH", "NORMAL"]]
    criticality_weight: Required[float]
    abs_threshold: Required[SchemaBundle]
    rel_threshold: Required[float]
    abs_floor: Required[SchemaBundle]
    effective_abs_floor: Required[SchemaBundle]
    comparison_input_state: Required[Literal["COMPARABLE", "AUTHORITY_MISSING", "INVALID_INPUT"]]
    field_class: Required[Literal["MATCH", "MINOR_DIFFERENCE", "MATERIAL_DIFFERENCE", "BLOCKING_DIFFERENCE", "NOT_COMPARABLE"]]
    internal_value: Required[SchemaBundle | None]
    authority_value: Required[SchemaBundle | None]
    delta_signed: Required[SchemaBundle | None]
    delta_abs: Required[SchemaBundle | None]
    delta_rel: Required[float | None]
    breach_ratio: Required[float | None]
    reason_codes: Required[list[str]]

ParityResultSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/parity_result.schema.json",
    "source_hash": "6b8c5145216d3ab2f64d3dd5d61f2775c1c5f4cecb97c6c680dabb8f16057c14",
}

class RiskReport(TypedDict, total=False):
    risk_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["RiskReport"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    risk_threshold_profile_ref: Required[str]
    risk_score: Required[float]
    feature_scores: Required[list[RiskReportFeatureScore]]
    flags: Required[list[str]]
    unresolved_material_blocking_risk_flag: Required[bool]
    unresolved_blocking_risk_flag: Required[bool]
    created_at: Required[ISO8601DateTimeString]
    contract: Required[SchemaBundle]

class RiskReportFeatureScore(TypedDict, total=False):
    feature_code: Required[str]
    feature_value: Required[float]
    feature_weight: Required[float]
    material_threshold: Required[float]
    blocking_threshold: Required[float]
    feature_resolved: Required[bool]
    flag_state: Required[Literal["NONE", "MATERIAL_UNRESOLVED", "BLOCKING_UNRESOLVED"]]

RiskReportSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/risk_report.schema.json",
    "source_hash": "98e8db8465dd015ebed3bf89ce059c7db07b210a177df960f3a19c2eabb90440",
}

class TrustInputBasisContract(TypedDict, total=False):
    contract_version: Required[Literal["TRUST_INPUT_BASIS_V1"]]
    basis_contract_hash: Required[str]
    input_presence_state: Required[Literal["COMPLETE", "INCOMPLETE"]]
    manifest_binding_state: Required[Literal["ACTIVE_MANIFEST_OR_ADMITTED_LINEAGE", "MANIFEST_MISMATCH"]]
    lifecycle_binding_state: Required[Literal["CURRENT_UNSUPERSEDED", "SUPERSEDED_OR_REPLACED"]]
    consistency_state: Required[Literal["CONSISTENT", "CONTRADICTED"]]
    limitation_semantics_state: Required[Literal["EXPLICIT_LIMITATIONS_ONLY", "SILENT_LIMITATION_AMBIGUITY"]]
    freshness_state: Required[Literal["CURRENT", "STALE_OR_INVALIDATED", "NO_EXPIRING_DEPENDENCIES"]]
    freshness_dependency_classes: Required[list[Literal["AUTHORITY_STATE", "LATE_DATA_MONITOR", "OVERRIDE_LIFECYCLE", "EXTERNAL_BASELINE"]]]
    authority_progression_state: Required[Literal["NOT_REQUESTED_OR_NOT_APPLICABLE", "CLEAR", "REVIEW_LIMITED", "BLOCKED"]]
    baseline_progression_state: Required[Literal["MATCHED_OR_FILED", "UNKNOWN_OR_OUT_OF_BAND", "NOT_APPLICABLE"]]
    baseline_selection_contract_hash_or_null: Required[str | None]
    baseline_automation_ceiling: Required[Literal["ALLOWED", "LIMITED", "BLOCKED"]]
    baseline_limitation_reason_codes: Required[list[str]]
    late_data_invalidation_state: Required[Literal["NONE", "INVALIDATING_FINDING_PRESENT"]]
    override_dependency_state: Required[Literal["NO_ACTIVE_OR_VALID_OVERRIDES", "INVALID_OVERRIDE_RELIED_UPON"]]
    human_step_state: Required[Literal["CLEARED", "UNRESOLVED_PRETRUST_STEPS"]]
    trust_input_state: Required[Literal["ADMISSIBLE_CURRENT", "ADMISSIBLE_STALE", "INCOMPLETE", "CONTRADICTED"]]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    automation_ceiling: Required[Literal["ALLOWED", "LIMITED", "BLOCKED"]]
    filing_readiness_ceiling: Required[Literal["READY_TO_SUBMIT", "READY_REVIEW", "NOT_READY"]]
    input_reason_codes: Required[list[str]]
    blocking_dependency_refs: Required[list[str]]
    trust_fresh_until: Required[ISO8601DateTimeString]

TrustInputBasisContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/trust_input_basis_contract.schema.json",
    "source_hash": "e37d8e0ed7fc7df509cecc72f45f449842205647235bc16bcaeacb13033f3409",
}

type TrustSensitivityAnalysisContract = TrustSensitivityContract

TrustSensitivityAnalysisContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/trust_sensitivity_analysis_contract.schema.json",
    "source_hash": "013af2f88e375b8b3c252b49339dcd690cb09a0e70955fea8a315790ac64ed66",
}

class TrustSensitivityContract(TypedDict, total=False):
    contract_version: Required[Literal["TRUST_SENSITIVITY_V1"]]
    sensitivity_contract_hash: Required[str]
    trust_input_basis_contract_hash: Required[str]
    execution_mode_boundary_hash: Required[str]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    execution_legal_effect_boundary: Required[Literal["COMPLIANCE_CAPABLE", "MODELED_READ_ONLY", "HISTORICAL_REPLAY_READ_ONLY", "COUNTERFACTUAL_REPLAY_READ_ONLY"]]
    trust_score: Required[int]
    risk_score: Required[int]
    completeness_score: Required[int]
    graph_quality_score: Required[int]
    authority_uncertainty_score: Required[int]
    authority_penalty: Required[int]
    baseline_submission_state: Required[Literal["KNOWN_MATCHED", "KNOWN_FILED", "UNKNOWN", "OUT_OF_BAND_UNRECONCILED", "NOT_APPLICABLE"]]
    live_authority_progression_requested: Required[bool]
    active_filing_critical_override_count: Required[int]
    critical_retention_limited_count: Required[int]
    required_human_step_count: Required[int]
    late_data_invalidation_state: Required[Literal["NONE", "INVALIDATING_FINDING_PRESENT"]]
    override_dependency_state: Required[Literal["NO_ACTIVE_OR_VALID_OVERRIDES", "INVALID_OVERRIDE_RELIED_UPON"]]
    score_band: Required[Literal["RED", "AMBER", "GREEN"]]
    cap_band: Required[Literal["INSUFFICIENT_DATA", "RED", "AMBER", "GREEN"]]
    trust_band: Required[Literal["INSUFFICIENT_DATA", "RED", "AMBER", "GREEN"]]
    trust_input_state: Required[Literal["ADMISSIBLE_CURRENT", "ADMISSIBLE_STALE", "INCOMPLETE", "CONTRADICTED"]]
    threshold_stability_state: Required[Literal["STABLE", "EDGE_REVIEW"]]
    upstream_gate_cap: Required[Literal["AUTO_ELIGIBLE", "NOTICE_ONLY", "REVIEW_ONLY", "BLOCKED"]]
    automation_level: Required[Literal["ALLOWED", "LIMITED", "BLOCKED"]]
    filing_readiness: Required[Literal["READY_TO_SUBMIT", "READY_REVIEW", "NOT_READY"]]
    trust_green_margin: Required[int]
    trust_amber_margin: Required[int]
    risk_automation_margin: Required[int]
    completeness_margin: Required[int]
    graph_filing_margin_or_null: Required[int | None]
    authority_review_margin_or_null: Required[int | None]
    authority_block_margin_or_null: Required[int | None]
    score_cap_alignment_state: Required[Literal["ALIGNED", "SCORE_STRICTER_THAN_CAP", "CAP_STRICTER_THAN_SCORE"]]
    cap_driver_reason_codes: Required[list[Literal["TRUST_INPUT_INCOMPLETE", "TRUST_INPUT_CONTRADICTION", "TRUST_INPUT_STALE", "TRUST_OVERRIDE_INVALID", "TRUST_THRESHOLD_EDGE_REVIEW", "TRUST_UPSTREAM_GATE_BLOCK", "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED", "TRUST_REQUIRED_HUMAN_STEPS", "TRUST_OVERRIDE_PENALTY", "TRUST_RETENTION_PENALTY", "TRUST_AUTHORITY_STATE_UNRESOLVED", "TRUST_AUTHORITY_PENALTY", "TRUST_ANALYSIS_MODE_CAP", "TRUST_NON_LIVE_EXECUTION_BOUNDARY_CAP", "TRUST_RECALCULATION_REQUIRED"]]]
    edge_trigger_codes: Required[list[Literal["TRUST_GREEN_GUARD_BAND", "TRUST_AMBER_GUARD_BAND", "RISK_AUTOMATION_GUARD_BAND", "COMPLETENESS_GUARD_BAND", "GRAPH_FILING_GUARD_BAND", "AUTHORITY_REVIEW_GUARD_BAND", "AUTHORITY_BLOCK_GUARD_BAND"]]]
    projected_case_results: Required[list[dict[str, JSONValue]]]

TrustSensitivityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/trust_sensitivity_contract.schema.json",
    "source_hash": "529519a523af2e5fab5bb1420aa28727a2627f1776af5c9ea6427835e626dd25",
}

class TrustSummary(TypedDict, total=False):
    trust_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["TrustSummary"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    lifecycle_state: Required[Literal["SYNTHESIZED", "SUPERSEDED"]]
    compute_result_ref: Required[str]
    parity_result_ref: Required[str]
    risk_report_ref: Required[str]
    evidence_graph_ref: Required[str]
    gate_decision_refs: Required[list[str]]
    comparison_requirement: Required[Literal["MANDATORY", "DESIRABLE", "NOT_REQUIRED"]]
    parity_classification: Required[Literal["MATCH", "MINOR_DIFFERENCE", "MATERIAL_DIFFERENCE", "BLOCKING_DIFFERENCE", "NOT_COMPARABLE"]]
    baseline_submission_state: Required[Literal["KNOWN_MATCHED", "KNOWN_FILED", "UNKNOWN", "OUT_OF_BAND_UNRECONCILED", "NOT_APPLICABLE"]]
    live_authority_progression_requested: Required[bool]
    completeness_score: Required[int]
    data_quality_score: Required[int]
    parity_score: Required[int]
    graph_quality_score: Required[int]
    risk_score: Required[int]
    trust_core_score: Required[float]
    score_band: Required[Literal["RED", "AMBER", "GREEN"]]
    cap_band: Required[Literal["INSUFFICIENT_DATA", "RED", "AMBER", "GREEN"]]
    trust_band: Required[Literal["INSUFFICIENT_DATA", "RED", "AMBER", "GREEN"]]
    trust_score: Required[int]
    trust_input_state: Required[Literal["ADMISSIBLE_CURRENT", "ADMISSIBLE_STALE", "INCOMPLETE", "CONTRADICTED"]]
    trust_input_basis_contract: Required[TrustInputBasisContract]
    trust_sensitivity_analysis_contract: Required[TrustSensitivityAnalysisContract]
    threshold_stability_state: Required[Literal["STABLE", "EDGE_REVIEW"]]
    upstream_gate_cap: Required[Literal["AUTO_ELIGIBLE", "NOTICE_ONLY", "REVIEW_ONLY", "BLOCKED"]]
    trust_green_margin: Required[int]
    trust_amber_margin: Required[int]
    risk_automation_margin: Required[int]
    active_filing_critical_override_count: Required[int]
    critical_retention_limited_count: Required[int]
    unresolved_material_blocking_risk_flag: Required[bool]
    unresolved_blocking_risk_flag: Required[bool]
    override_penalty: Required[Literal[0, 5, 10, 15, 20]]
    retention_penalty: Required[Literal[0, 20]]
    authority_uncertainty_score: Required[int]
    authority_penalty: Required[int]
    trust_level: Required[Literal["READY", "REVIEW_REQUIRED", "BLOCKED"]]
    automation_level: Required[Literal["ALLOWED", "LIMITED", "BLOCKED"]]
    filing_readiness: Required[Literal["NOT_READY", "READY_REVIEW", "READY_TO_SUBMIT"]]
    dominant_reason_code: Required[str]
    plain_summary: Required[str]
    decision_explainability_contract: Required[DecisionExplainabilityContract]
    decision_constraint_codes: Required[list[str]]
    reason_codes: Required[list[str]]
    blocking_dependency_refs: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    support_refs: Required[list[str]]
    required_human_steps: Required[list[str]]
    trust_fresh_until: Required[ISO8601DateTimeString]
    synthesized_at: Required[ISO8601DateTimeString]
    superseded_at: Required[ISO8601DateTimeString]
    superseded_by_trust_id: Required[str | None]
    contract: Required[SchemaBundle]

TrustSummarySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/trust_summary.schema.json",
    "source_hash": "9db7af8cb93e8d0e774abb562f8bc61e0fc531fadc29381d37c732fc35144866",
}

DecisioningAndNightlyBindingManifest = {"family_ref": "DECISIONING_AND_NIGHTLY", "schema_count": 21}
