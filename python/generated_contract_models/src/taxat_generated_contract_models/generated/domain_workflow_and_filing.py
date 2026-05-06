"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class AmendmentBundle(TypedDict, total=False):
    artifact_type: Required[Literal["AmendmentBundle"]]
    amendment_bundle_id: Required[str]
    manifest_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    amendment_case_ref: Required[str]
    drift_ref: Required[str | None]
    baseline_envelope_ref: Required[str]
    baseline_frozen_hash: Required[str]
    retroactive_impact_ref: Required[str | None]
    retroactive_impact_hash: Required[str | None]
    amendment_window_context_ref: Required[str | None]
    amendment_window_evaluation_hash: Required[str | None]
    calculation_basis_ref: Required[str | None]
    calculation_basis_hash: Required[str | None]
    user_confirmation_ref: Required[str | None]
    authority_operation_profile_ref: Required[str | None]
    affected_scope_refs: Required[list[str]]
    packet_ref: Required[str | None]
    payload_hash: Required[str | None]
    bundle_identity_hash: Required[str | None]
    bundle_state: Required[Literal["PREPARED", "FROZEN", "SUBMITTED", "CONFIRMED", "VOID", "SUPERSEDED"]]
    supersedes_bundle_id: Required[str | None]
    created_at: Required[ISO8601DateTimeString]
    superseded_at: Required[ISO8601DateTimeString]

AmendmentBundleSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/amendment_bundle.schema.json",
    "source_hash": "62e75b6c443c3734cbe28923b78ba3c5e55009cc1feb4dfcf87dd1e1d3470a9c",
}

class AmendmentCase(TypedDict, total=False):
    artifact_type: Required[Literal["AmendmentCase"]]
    amendment_case_id: Required[str]
    filing_case_id: Required[str | None]
    client_id: Required[str]
    period: Required[str]
    current_manifest_ref: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    scope_key: Required[str]
    lifecycle_state: Required[Literal["NOT_ELIGIBLE", "RECONCILE_REQUIRED", "ELIGIBLE", "INTENT_REQUIRED", "INTENT_SUBMITTED", "READY_TO_AMEND", "AMEND_SUBMITTED", "AMEND_PENDING", "AMEND_CONFIRMED", "AMEND_REJECTED", "WINDOW_CLOSED", "SUPERSEDED"]]
    baseline_ref: Required[str]
    baseline_envelope_ref: Required[str]
    baseline_frozen_hash: Required[str]
    drift_ref: Required[str | None]
    retroactive_impact_ref: Required[str | None]
    retroactive_impact_hash: Required[str | None]
    current_bundle_ref: Required[str | None]
    supersedes_amendment_case_id: Required[str | None]
    active_chain_key: Required[str]
    intent_ref: Required[str | None]
    amendment_window_ref: Required[str | None]
    amendment_window_evaluation_hash: Required[str | None]
    authority_operation_profile_ref: Required[str | None]
    calculation_request_ref: Required[str | None]
    calculation_id: Required[str | None]
    calculation_type: Required[Literal["intent-to-amend", "confirm-amendment", None]]
    calculation_hash: Required[str | None]
    calculation_basis_ref: Required[str | None]
    user_confirmation_ref: Required[str | None]
    readiness_context_ref: Required[str | None]
    amendment_eligibility_contract: Required[AmendmentEligibilityContract]
    freshness_state: Required[Literal["NOT_APPLICABLE", "FRESH", "STALE"]]
    freshness_invalidation_reason_codes: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    review_state: Required[Literal["NONE", "REVIEW_OPEN", "REVIEW_RESOLVED"]]
    escalation_state: Required[Literal["NONE", "OPERATOR_REVIEW", "COMPLIANCE_ESCALATION", "AUTHORITY_RECONCILIATION"]]
    validation_outcome: Required[Literal["PASS", "PASS_WITH_NOTICE", "MANUAL_REVIEW", "OVERRIDABLE_BLOCK", "HARD_BLOCK", None]]
    superseded_at: Required[ISO8601DateTimeString]

AmendmentCaseSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/amendment_case.schema.json",
    "source_hash": "2555ffbc214915ab844f9312260648fb75882b8ca2f5166705a4ef31b6929beb",
}

class AmendmentEligibilityContract(TypedDict, total=False):
    eligibility_profile_code: Required[Literal["AMENDMENT_ELIGIBILITY_V1"]]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    trigger_state: Required[Literal["NOT_TRIGGERED", "TRIGGERED"]]
    eligibility_state: Required[Literal["NOT_EVALUATED", "ELIGIBLE_NOW", "REVIEW_ONLY", "RECONCILE_FIRST", "WINDOW_CLOSED", "UNPROVEN"]]
    window_state_or_null: Required[Literal["OPEN", "CLOSED", "UNPROVEN", None]]
    readiness_reuse_state: Required[Literal["NOT_APPLICABLE", "FRESH", "STALE"]]
    baseline_frozen_hash_or_null: Required[str | None]
    baseline_selection_contract_hash_or_null: Required[str | None]
    baseline_progression_ceiling_or_null: Required[Literal["ELIGIBLE_NOW_ALLOWED", "REVIEW_ONLY", "RECONCILE_FIRST", None]]
    baseline_limitation_reason_codes: Required[list[str]]
    retroactive_impact_hash_or_null: Required[str | None]
    amendment_window_evaluation_hash_or_null: Required[str | None]
    authority_operation_profile_ref_or_null: Required[str | None]
    readiness_context_ref_or_null: Required[str | None]
    trigger_reason_codes: Required[list[str]]
    eligibility_reason_codes: Required[list[str]]
    readiness_invalidation_reason_codes: Required[list[str]]

AmendmentEligibilityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/amendment_eligibility_contract.schema.json",
    "source_hash": "a056971ede42adf3dfb0cf6109654f9062ae72f7359cdc8b8116f860a7480cf4",
}

class AmendmentWindowContext(TypedDict, total=False):
    artifact_type: Required[Literal["AmendmentWindowContext"]]
    amendment_window_context_id: Required[str]
    manifest_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    baseline_envelope_ref: Required[str]
    window_anchor_basis: Required[str]
    scope_refs: Required[list[str]]
    statutory_filing_deadline: Required[ISO8601DateTimeString]
    final_declaration_confirmed_at: Required[ISO8601DateTimeString]
    window_opens_at: Required[ISO8601DateTimeString]
    window_closes_at: Required[ISO8601DateTimeString]
    window_state: Required[Literal["OPEN", "CLOSED", "UNPROVEN"]]
    provider_profile_ref: Required[str | None]
    authority_basis_ref: Required[str | None]
    eligible_scope_refs: Required[list[str]]
    blocked_scope_refs: Required[list[str]]
    reason_codes: Required[list[str]]
    evaluated_at: Required[ISO8601DateTimeString]
    stale_after_at: Required[ISO8601DateTimeString]
    evaluation_hash: Required[str]

AmendmentWindowContextSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/amendment_window_context.schema.json",
    "source_hash": "565f26a7a5d54a11b887b610f361189878c5dd9b9a91c02acdbdf507678a541f",
}

class CacheIsolationContract(TypedDict, total=False):
    contract_version: Required[Literal["CACHE_ISOLATION_V1"]]
    cache_scope_class: Required[Literal["LOW_NOISE_FRAME", "WORKSPACE_SNAPSHOT", "WORK_INBOX_SNAPSHOT", "CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST", "TENANT_GOVERNANCE_SNAPSHOT", "GOVERNANCE_POLICY_SNAPSHOT", "PRINCIPAL_ACCESS_VIEW", "ROLE_TEMPLATE_MATRIX", "NATIVE_OPERATOR_WORKSPACE_SCENE", "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE"]]
    tenant_id: Required[str]
    client_id_or_null: Required[str | None]
    principal_class: Required[str]
    session_binding_hash: Required[str]
    access_binding_hash_or_null: Required[str | None]
    masking_posture_fingerprint_or_null: Required[str | None]
    shell_stability_ref_or_null: Required[str | None]
    route_identity_ref: Required[str]
    canonical_object_ref: Required[str]
    shell_family: Required[str]
    projection_version_ref: Required[str]
    cache_partition_ref: Required[str]
    visibility_cache_partition_key_or_null: Required[str | None]
    customer_safe_projection: Required[bool]
    preview_subject_ref_or_null: Required[str | None]
    delivery_binding_hash: Required[str]
    shared_cache_reuse_policy: Required[Literal["EXACT_SECURITY_CONTEXT_ONLY"]]
    shared_layer_cache_policy: Required[Literal["NO_CDN_OR_PROXY_REUSE_WITHOUT_IDENTICAL_CONTEXT"]]
    local_storage_reuse_policy: Required[Literal["PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT"]]
    hydration_guard_policy: Required[Literal["REJECT_ON_CONTEXT_ROUTE_VERSION_OR_PREVIEW_MISMATCH"]]
    scope_narrowing_invalidation_policy: Required[Literal["PURGE_BROADER_VARIANTS_ON_ACCESS_OR_MASKING_NARROWING"]]
    preview_export_reuse_policy: Required[Literal["ROUTE_AND_SELECTION_BOUND_CURRENT_ONLY"]]
    delivery_revalidation_policy: Required[Literal["PREVIEW_EXPORT_AND_DOWNLOAD_REQUIRE_EXACT_BINDING"]]
    temporary_artifact_policy: Required[Literal["TEMP_FILES_AND_NATIVE_PREVIEW_PURGED_ON_BINDING_DRIFT"]]

CacheIsolationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/cache_isolation_contract.schema.json",
    "source_hash": "d6ee2b1f1d0423e342016eebc1f159c93030131382a7094e78afea84ee6bd30a",
}

class CollectionBoundary(TypedDict, total=False):
    collection_boundary_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["CollectionBoundary"]]
    source_plan_ref: Required[str]
    source_window_id: Required[str]
    read_cutoff_at: Required[ISO8601DateTimeString]
    connector_profile_ref: Required[str]
    connector_build_id: Required[str]
    collection_boundary_hash: Required[str]
    boundary_coverage_state: Required[Literal["EXPLICIT_SOURCE_DOMAIN_ACCOUNTING"]]
    source_boundaries: Required[list[CollectionBoundarySourceBoundary]]
    contract: Required[SchemaBundle]

class CollectionBoundarySourceBoundary(TypedDict, total=False):
    source_domain: Required[str]
    source_class: Required[LateDataPolicyBinding]
    partition_scope_refs: Required[LateDataPolicyBinding]
    runtime_scope_refs: Required[LateDataPolicyBinding]
    provider_environment_ref: Required[str]
    provider_api_version: Required[str]
    provider_schema_version: Required[str]
    cursor_checkpoint_ref: Required[str]
    revision_ref: Required[str]
    request_audit_refs: Required[list[str]]
    page_request_audit_refs: NotRequired[list[str]]
    completeness_expectation_ref: Required[str]
    late_data_policy_ref: Required[LateDataPolicyBinding]
    boundary_disposition: Required[Literal["IN_SCOPE_COLLECTED", "NO_DATA_CONFIRMED_AT_CUTOFF", "EXCLUDED_BY_POLICY", "MISSING_AT_CUTOFF", "STALE_AT_CUTOFF"]]

CollectionBoundarySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/collection_boundary.schema.json",
    "source_hash": "77dcb01e5a32802132ced8c55d69d39154d9585161d45564eb28b6d8aa8f0088",
}

class CommandEnvelope(TypedDict, total=False):
    artifact_type: Required[Literal["CommandEnvelope"]]
    command_id: Required[str]
    command_type: Required[str]
    idempotency_key: Required[str]
    actor_session_ref: Required[str]
    target_scope_class: Required[Literal["MANIFEST", "WORK_ITEM", "GOVERNANCE"]]
    tenant_id: Required[str]
    client_id: Required[str | None]
    manifest_id: Required[str | None]
    work_item_id: Required[str | None]
    governance_target_ref: Required[str | None]
    period: Required[str | None]
    requested_scope: Required[list[str]]
    if_match_decision_bundle_hash: Required[str | None]
    if_match_shell_stability_token: Required[str | None]
    if_match_frame_epoch: Required[int | None]
    if_match_work_item_version: Required[int | None]
    if_match_internal_head_sequence: Required[int | None]
    if_match_customer_head_sequence: Required[int | None]
    if_match_request_state_version: Required[int | None]
    if_match_approval_pack_hash: Required[str | None]
    if_match_client_portal_workspace_version: Required[int | None]
    if_match_policy_snapshot_hash: Required[str | None]
    if_match_dependency_topology_hash: Required[str | None]
    simulation_basis_hash: Required[str | None]
    mutation_basis_contract: Required[None | GovernanceMutationBasisContract]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    mutation_precondition_binding: Required[MutationPreconditionBinding]
    payload: Required[dict[str, JSONValue]]
    requested_at: Required[ISO8601DateTimeString]

CommandEnvelopeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/command_envelope.schema.json",
    "source_hash": "7bcc8aca262314bba58ef65c15f0c3d035ed76ea3989ec64a003f89b0835afb1",
}

type CommandTruthBoundaryContractAuthoritativeRecordFamily = Literal["RUN_MANIFEST", "WORKFLOW_ITEM", "GATE_DECISION_RECORD", "AUTHORITY_INTERACTION_RECORD", "GOVERNANCE_DOMAIN_OBJECT", "AUDIT_EVENT", "API_COMMAND_RECEIPT"]

type CommandTruthBoundaryContractObservableProjectionFamily = Literal["DECISION_BUNDLE", "EXPERIENCE_DELTA", "LOW_NOISE_EXPERIENCE_FRAME", "EXPERIENCE_CURSOR", "WORKSPACE_SNAPSHOT", "CLIENT_PORTAL_WORKSPACE", "CLIENT_APPROVAL_PACK", "CLIENT_UPLOAD_SESSION", "GOVERNANCE_POLICY_SNAPSHOT"]

class CommandTruthBoundaryContract(TypedDict, total=False):
    contract_version: Required[Literal["COMMAND_TRUTH_BOUNDARY_V1"]]
    artifact_role: Required[Literal["COMMAND_REQUEST", "COMMAND_SIDE_AUTHORITY", "BOUNDARY_RECEIPT", "READ_SIDE_PROJECTION"]]
    authoritative_source_policy: Required[Literal["TARGET_DURABLE_IDS_ONLY", "DURABLE_COMMAND_RECORDS_ONLY", "DURABLE_COMMAND_RESULTS_ONLY", "MIRROR_DURABLE_COMMAND_RECORDS_ONLY"]]
    projection_input_policy: Required[Literal["STALE_GUARDS_ONLY", "FORBIDDEN_AS_AUTHORITY", "STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY", "NO_PROJECTION_INPUTS"]]
    durable_writeback_policy: Required[Literal["NO_DIRECT_STATE_WRITEBACK", "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED", "APPEND_ONLY_BOUNDARY_EVIDENCE", "NO_DURABLE_STATE_WRITEBACK"]]
    recovery_basis_policy: Required[Literal["DURABLE_IDS_AND_RECEIPTS_ONLY", "MANIFEST_AND_DURABLE_RECORDS_ONLY", "RECEIPT_PLUS_DURABLE_RESULTS_ONLY", "REBUILD_FROM_DURABLE_RECORDS_ONLY"]]
    authoritative_record_families: Required[list[CommandTruthBoundaryContractAuthoritativeRecordFamily]]
    observable_projection_families: Required[list[CommandTruthBoundaryContractObservableProjectionFamily]]

CommandTruthBoundaryContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json",
    "source_hash": "9aee47831658515a13123efd6fa028dea43706b7f6e030a0e788cba697a02232",
}

class DriftBaselineEnvelope(TypedDict, total=False):
    artifact_type: Required[Literal["DriftBaselineEnvelope"]]
    baseline_envelope_id: Required[str]
    manifest_id: Required[str]
    client_id: Required[str]
    period: Required[str]
    baseline_ref: Required[str]
    baseline_manifest_id: Required[str | None]
    baseline_type: Required[Literal["WORKING", "FILED", "AMENDED", "AUTHORITY_CORRECTED", "OUT_OF_BAND"]]
    baseline_scope_refs: Required[list[str]]
    baseline_basis_ref: Required[str | None]
    authority_basis_refs: Required[list[str]]
    baseline_submission_state: Required[Literal["WORKING", "FILED_CONFIRMED", "AMEND_CONFIRMED", "AUTHORITY_CORRECTED", "UNKNOWN", "OUT_OF_BAND_UNRECONCILED"]]
    truth_origin: Required[str]
    baseline_effective_at: Required[ISO8601DateTimeString]
    temporal_propagation_event_ref_or_null: Required[str | None]
    selection_reason_codes: Required[list[str]]
    selection_contract: Required[BaselineSelectionContract]
    frozen_hash: Required[str]
    supersedes_baseline_frozen_hash_or_null: Required[str | None]
    superseded_by_baseline_envelope_id: Required[str | None]
    superseded_at: Required[ISO8601DateTimeString]

DriftBaselineEnvelopeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/drift_baseline_envelope.schema.json",
    "source_hash": "4f0a58614377051612837fe22f95db23839d52c2da3efc609a437a3cc60c7648",
}

type DriftBaselineSelectionVisualizationBaselineType = Literal["WORKING", "FILED", "AMENDED", "AUTHORITY_CORRECTED", "OUT_OF_BAND"]

type DriftBaselineSelectionVisualizationBaselineSubmissionState = Literal["WORKING", "FILED_CONFIRMED", "AMEND_CONFIRMED", "AUTHORITY_CORRECTED", "UNKNOWN", "OUT_OF_BAND_UNRECONCILED"]

type DriftBaselineSelectionVisualizationScopeCompatibilityState = Literal["EXACT_SCOPE_COMPATIBLE", "SUBSET_SCOPE_COMPATIBLE", "BROADER_SCOPE_COMPATIBLE", "INCOMPATIBLE_SCOPE"]

type DriftBaselineSelectionVisualizationScopeMatchClass = Literal["EXACT_SCOPE_MATCH", "SCOPE_SLICED_SUBSET_MATCH", "BROADER_CLIENT_PERIOD_MATCH"]

type DriftBaselineSelectionVisualizationSameScopeTruthResolutionState = Literal["NO_STRONGER_EXTERNAL_TRUTH_PRESENT", "AUTHORITY_CORRECTED_TRUTH_SELECTED", "OUT_OF_BAND_EXTERNAL_TRUTH_BLOCKS_INTERNAL_LINEAGE"]

type DriftBaselineSelectionVisualizationAuthorityResolutionClass = Literal["EXACT_AUTHORITY_CONFIRMED", "AUTHORITY_OBSERVED_EXTERNAL", "ENGINE_CHAIN_UNREFRESHED", "WORKING_ONLY"]

type DriftBaselineSelectionVisualizationContinuityClass = Literal["INTERNAL_CHAIN_CONTINUITY", "AUTHORITY_CORRECTED_EXTERNAL_CONTINUITY", "OUT_OF_BAND_EXTERNAL_CONTINUITY", "WORKING_LOCAL_ONLY"]

type DriftBaselineSelectionVisualizationAutomationCeiling = Literal["ALLOWED", "LIMITED", "BLOCKED"]

type DriftBaselineSelectionVisualizationReviewRecommendationFloor = Literal["NONE", "REVIEW_REQUIRED", "RECONCILIATION_REQUIRED"]

type DriftBaselineSelectionVisualizationAmendmentProgressionCeiling = Literal["ELIGIBLE_NOW_ALLOWED", "REVIEW_ONLY", "RECONCILE_FIRST"]

type DriftBaselineSelectionVisualizationBenignDriftEligibilityState = Literal["ALLOWED", "FORBIDDEN"]

type DriftBaselineSelectionVisualizationSelectionOutcome = Literal["SELECTED", "REJECTED"]

type DriftBaselineSelectionVisualizationCandidateSupersessionState = Literal["NONE", "ACTIVE", "SUPERSEDED", "REUSED_HISTORICAL_MATCH"]

type DriftBaselineSelectionVisualizationLineageDisposition = Literal["SELECTED_ACTIVE", "REUSED_ACTIVE", "SUPERSEDED_PREDECESSOR"]

class DriftBaselineSelectionVisualization(TypedDict, total=False):
    artifact_type: Required[Literal["DriftBaselineSelectionVisualization"]]
    visualization_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    basis_contract: Required[DriftBaselineSelectionVisualizationBasisContract]
    visualization_outcome: Required[Literal["PERSIST_ENVELOPE", "REUSE_ENVELOPE", "SUPERSEDE_ENVELOPE"]]
    selected_candidate_ref: Required[str]
    selected_selection_contract: Required[BaselineSelectionContract]
    selected_selection_reason_codes: Required[list[str]]
    selected_baseline_envelope_ref: Required[str]
    selected_baseline_frozen_hash: Required[str]
    candidate_results: Required[list[DriftBaselineSelectionVisualizationCandidateResult]]
    candidate_count: Required[int]
    exact_scope_candidate_count: Required[int]
    compatible_candidate_count: Required[int]
    rejected_candidate_count: Required[int]
    same_scope_envelope_lineage: Required[list[DriftBaselineSelectionVisualizationLineageEntry]]
    superseded_lineage_count: Required[int]
    visualized_by_principal_ref: Required[str]
    visualized_at: Required[ISO8601DateTimeString]
    visualization_hash: Required[str]

class DriftBaselineSelectionVisualizationDominanceKey(TypedDict, total=False):
    scope_rank: Required[int]
    precedence_rank: Required[int]
    authority_resolution_rank: Required[int]
    chain_continuity_rank: Required[int]
    effective_time_rank_or_null: Required[ISO8601DateTimeString]
    manifest_generation_rank_or_null: Required[int | None]
    stable_id_rank: Required[str]

class DriftBaselineSelectionVisualizationCandidateResult(TypedDict, total=False):
    display_rank: Required[int]
    candidate_ref: Required[str]
    candidate_baseline_type: Required[DriftBaselineSelectionVisualizationBaselineType]
    candidate_submission_state: Required[DriftBaselineSelectionVisualizationBaselineSubmissionState]
    candidate_manifest_id_or_null: Required[str | None]
    candidate_scope_refs: Required[list[str]]
    candidate_authority_basis_refs: Required[list[str]]
    candidate_effective_at_or_null: Required[ISO8601DateTimeString]
    candidate_manifest_generation_or_null: Required[int | None]
    candidate_scope_compatibility_state: Required[DriftBaselineSelectionVisualizationScopeCompatibilityState]
    candidate_scope_match_class_or_null: Required[Literal["EXACT_SCOPE_MATCH", "SCOPE_SLICED_SUBSET_MATCH", "BROADER_CLIENT_PERIOD_MATCH", None]]
    same_scope_truth_resolution_state_or_null: Required[Literal["NO_STRONGER_EXTERNAL_TRUTH_PRESENT", "AUTHORITY_CORRECTED_TRUTH_SELECTED", "OUT_OF_BAND_EXTERNAL_TRUTH_BLOCKS_INTERNAL_LINEAGE", None]]
    authority_resolution_class_or_null: Required[Literal["EXACT_AUTHORITY_CONFIRMED", "AUTHORITY_OBSERVED_EXTERNAL", "ENGINE_CHAIN_UNREFRESHED", "WORKING_ONLY", None]]
    continuity_class_or_null: Required[Literal["INTERNAL_CHAIN_CONTINUITY", "AUTHORITY_CORRECTED_EXTERNAL_CONTINUITY", "OUT_OF_BAND_EXTERNAL_CONTINUITY", "WORKING_LOCAL_ONLY", None]]
    candidate_dominance_key_or_null: Required[JSONValue]
    candidate_anchor_weight_or_null: Required[float | None]
    candidate_uncertainty_reason_codes: Required[list[str]]
    candidate_automation_ceiling_or_null: Required[Literal["ALLOWED", "LIMITED", "BLOCKED", None]]
    candidate_review_recommendation_floor_or_null: Required[Literal["NONE", "REVIEW_REQUIRED", "RECONCILIATION_REQUIRED", None]]
    candidate_amendment_progression_ceiling_or_null: Required[Literal["ELIGIBLE_NOW_ALLOWED", "REVIEW_ONLY", "RECONCILE_FIRST", None]]
    candidate_benign_drift_eligibility_state_or_null: Required[Literal["ALLOWED", "FORBIDDEN", None]]
    internal_chain_continuity_asserted_or_null: Required[bool | None]
    selection_outcome: Required[DriftBaselineSelectionVisualizationSelectionOutcome]
    loss_reason_codes: Required[list[str]]
    selection_reason_codes_if_selected: Required[list[str]]
    candidate_frozen_hash_or_null: Required[str | None]
    candidate_supersedes_frozen_hash_or_null: Required[str | None]
    candidate_superseded_by_frozen_hash_or_null: Required[str | None]
    candidate_supersession_state: Required[DriftBaselineSelectionVisualizationCandidateSupersessionState]

class DriftBaselineSelectionVisualizationLineageEntry(TypedDict, total=False):
    lineage_rank: Required[int]
    baseline_envelope_ref: Required[str]
    baseline_frozen_hash: Required[str]
    baseline_ref: Required[str]
    baseline_type: Required[DriftBaselineSelectionVisualizationBaselineType]
    baseline_submission_state: Required[DriftBaselineSelectionVisualizationBaselineSubmissionState]
    selected_scope_refs: Required[list[str]]
    selection_contract_hash: Required[str]
    supersedes_baseline_frozen_hash_or_null: Required[str | None]
    superseded_at_or_null: Required[ISO8601DateTimeString]
    lineage_disposition: Required[DriftBaselineSelectionVisualizationLineageDisposition]

DriftBaselineSelectionVisualizationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/drift_baseline_selection_visualization.schema.json",
    "source_hash": "6c5718f79c5505356276ca898375df182526bc67aaf4884fbcfa4ea64b7ba940",
}

class DriftBaselineSelectionVisualizationBasisContract(TypedDict, total=False):
    contract_version: Required[Literal["DRIFT_BASELINE_SELECTION_VISUALIZATION_BASIS_V1"]]
    basis_contract_hash: Required[str]
    execution_mode_boundary_hash: Required[str]
    source_manifest_id: Required[str]
    source_manifest_hash: Required[str]
    source_period: Required[str]
    active_exact_scope_key: Required[str]
    target_scope_refs: Required[list[str]]
    candidate_refs: Required[list[str]]
    candidate_universe_hash: Required[str]
    prior_active_baseline_envelope_ref_or_null: Required[str | None]
    prior_active_baseline_frozen_hash_or_null: Required[str | None]
    selection_profile_code: Required[Literal["DRIFT_BASELINE_SELECTION_V1"]]
    dominance_key_profile_code: Required[Literal["DRIFT_BASELINE_DOMINANCE_KEY_V1"]]
    scope_widening_policy: Required[Literal["EXACT_SCOPE_FIRST_NO_SILENT_CROSS_PARTITION_WIDENING"]]
    external_truth_policy: Required[Literal["SAME_SCOPE_AUTHORITY_AND_OUT_OF_BAND_TRUTH_MUST_REMAIN_SCOPE_BOUND"]]
    supersession_policy: Required[Literal["IMMUTABLE_ENVELOPE_REUSE_OR_SUCCESSOR_ONLY"]]
    tie_break_policy: Required[Literal["LEXICOGRAPHIC_DOMINANCE_KEY_WITH_STABLE_ID_TIEBREAK"]]
    uncertainty_policy: Required[Literal["BASELINE_ANCHOR_WEIGHT_RAISES_UNCERTAINTY_ONLY"]]
    replay_reuse_policy: Required[Literal["PERSISTED_ENVELOPE_AND_CANDIDATE_LINEAGE_ONLY"]]

DriftBaselineSelectionVisualizationBasisContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/drift_baseline_selection_visualization_basis_contract.schema.json",
    "source_hash": "ed1bae438975cf7c318494faa7cb07ddae4254016f6701a1f195157faa6ebc12",
}

class DriftRecord(TypedDict, total=False):
    artifact_type: Required[Literal["DriftRecord"]]
    drift_id: Required[str]
    manifest_id: Required[str]
    baseline_ref: Required[str]
    baseline_envelope_ref: Required[str]
    baseline_manifest_id: Required[str | None]
    comparison_manifest_id: Required[str | None]
    baseline_type: Required[Literal["WORKING", "FILED", "AMENDED", "AUTHORITY_CORRECTED", "OUT_OF_BAND"]]
    baseline_scope_refs: Required[list[str]]
    drift_scope_refs: Required[list[str]]
    active_exact_scope_key: Required[str]
    baseline_basis_ref: Required[str]
    authority_basis_refs: Required[list[str]]
    drift_scope: Required[Literal["RECORD_LAYER", "ADJUSTMENT_LAYER", "AUTHORITY_LAYER", "DECLARATION_LAYER", "EXPLANATION_LAYER", "RETENTION_LIMITED_LAYER"]]
    difference_classes: Required[list[Literal["FACT_STATE", "TOTAL_STATE", "FILING_STATE", "AUTHORITY_STATE", "EXPLANATION_STATE"]]]
    field_deltas: Required[list[DriftRecordFieldDelta]]
    money_profile: Required[SchemaBundle]
    plane_pressures: Required[DriftRecordPlanePressures]
    tax_delta_abs: Required[SchemaBundle]
    tax_delta_rel: Required[float]
    drift_pressure: Required[float]
    amendment_pressure: Required[float]
    critical_field_delta_count: Required[int]
    cause_codes: Required[list[Literal["LATE_SOURCE_ARRIVAL", "SOURCE_CORRECTION", "CATEGORY_RECLASSIFICATION", "PARTITION_REALLOCATION", "RULE_OR_CONFIG_DIFFERENCE", "AUTHORITY_REFERENCE_CHANGE", "AUTHORITY_CORRECTION", "OUT_OF_BAND_FILING_DISCOVERED", "OVERRIDE_CHANGE", "RETENTION_LIMITED_HISTORY", "PREVIOUS_EXTRACTION_ERROR", "CALCULATION_PATH_CHANGE"]]]
    materiality_profile_ref: Required[str | None]
    materiality_class: Required[Literal["NO_CHANGE", "EXPLANATION_ONLY", "BENIGN_DRIFT", "MATERIAL_REVIEW", "AMENDMENT_REQUIRED", None]]
    lifecycle_state: Required[Literal["NOT_ASSESSED", "NO_CHANGE", "EXPLANATION_ONLY", "BENIGN_DRIFT", "MATERIAL_REVIEW", "REVIEW_REQUIRED", "AMENDMENT_REQUIRED", "RESOLVED", "SUPERSEDED"]]
    amendment_recommendation: Required[Literal["NO_ACTION", "EXPLAIN_ONLY", "REVIEW_ONLY", "RECONCILE_FIRST", "PREPARE_AMENDMENT", "SUBMIT_AMENDMENT", None]]
    amendment_eligibility_contract: Required[AmendmentEligibilityContract]
    amendment_window_context_ref: Required[str | None]
    retroactive_impact_ref: Required[str | None]
    late_data_indicator_refs: Required[list[str]]
    source_contradiction_state: Required[Literal["NONE", "CONTRADICTORY_EVIDENCE", "CONTRADICTORY_AUTHORITY", "CONTRADICTORY_SCOPE"]]
    review_state: Required[Literal["NONE", "REVIEW_OPEN", "REVIEW_RESOLVED"]]
    escalation_state: Required[Literal["NONE", "OPERATOR_REVIEW", "COMPLIANCE_ESCALATION", "AUTHORITY_RECONCILIATION"]]
    recommendation_cap: Required[str | None]
    automation_cap: Required[str | None]
    lineage_boundary_refs: Required[list[str]]
    basis_limitations: Required[list[str]]
    supersedes_drift_id: Required[str | None]
    superseded_at: Required[ISO8601DateTimeString]

class DriftRecordFieldDelta(TypedDict, total=False):
    field_code: Required[str]
    field_delta_abs: Required[SchemaBundle]
    field_delta_rel: Required[float]
    critical: Required[bool]
    reason_codes: NotRequired[list[str]]

class DriftRecordPlanePressures(TypedDict, total=False):
    fact: Required[float]
    total: Required[float]
    filing: Required[float]
    authority: Required[float]
    explanation: Required[float]

DriftRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/drift_record.schema.json",
    "source_hash": "dd55b48689d7c55a7afe41a937e1de1c80c05e8055fff53be0b0671506478ed2",
}

class ExecutionModeBoundaryContract(TypedDict, total=False):
    contract_version: Required[Literal["EXECUTION_MODE_BOUNDARY_V1"]]
    boundary_hash: Required[str]
    run_kind: Required[Literal["INTERACTIVE", "NIGHTLY", "BACKFILL", "REPLAY", "REMEDIATION", "AMENDMENT", "MIGRATION"]]
    replay_class_or_null: Required[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS", None]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    execution_posture: Required[Literal["LIVE_COMPLIANCE", "LIVE_ANALYSIS", "REPLAY_COMPLIANCE", "REPLAY_COUNTERFACTUAL"]]
    legal_effect_boundary: Required[Literal["COMPLIANCE_CAPABLE", "MODELED_READ_ONLY", "HISTORICAL_REPLAY_READ_ONLY", "COUNTERFACTUAL_REPLAY_READ_ONLY"]]
    disclosure_reason_codes: Required[list[str]]

ExecutionModeBoundaryContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json",
    "source_hash": "60d71142dc223155c01080d292def49fa6eaa53823d39f575a63fca5c8d4eca8",
}

class ExternalizationGovernanceContract(TypedDict, total=False):
    contract_version: Required[Literal["EXTERNALIZATION_GOVERNANCE_V1"]]
    boundary_scope: Required[Literal["AUDIT_INVESTIGATION_FRAME", "CLIENT_DOCUMENT_REQUEST", "CLIENT_APPROVAL_PACK", "ENQUIRY_PACK", "AUTHORITY_LINK_HANDOFF"]]
    tenant_id: Required[str]
    shell_family_or_null: Required[Literal["CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL", None]]
    context_anchor_ref: Required[str]
    slice_binding_ref: Required[str]
    delivery_surface_kind: Required[Literal["FILTERED_AUDIT_EXPORT", "PORTAL_DOCUMENT_DOWNLOAD", "PORTAL_APPROVAL_EXPORT", "EXPLANATION_EXPORT", "AUTHORITY_LINK_EXTERNAL_HANDOFF"]]
    history_meaning_state: Required[Literal["ACTIVE_FILTERED_SLICE", "CURRENT_ONLY", "CURRENT_WITH_HISTORY_EXPLICIT", "CURRENT_DECLARATION_OR_ISSUED_RECEIPT", "LIMITED_EXPLANATION_EXPLICIT", "HANDOFF_TARGET_EXPLICIT"]]
    eligibility_state: Required[Literal["READY", "MASKED_ONLY", "LIMITED_READY", "APPROVAL_REQUIRED", "BLOCKED", "PENDING_RETURN"]]
    approval_state: Required[Literal["NOT_REQUIRED", "REQUIRED_PENDING", "SATISFIED", "DENIED"]]
    access_binding_hash_or_null: Required[str | None]
    masking_state: Required[Literal["NONE", "CUSTOMER_SAFE_ONLY", "MASKED_EXPORT_ONLY", "LIMITED_EXPORT", "NOT_APPLICABLE"]]
    masking_posture_fingerprint_or_null: Required[str | None]
    limitation_state: Required[Literal["FULL", "INTEGRITY_LIMITED", "HISTORY_LIMITED", "RETENTION_LIMITED", "PREFLIGHT_BLOCKED", "POLICY_LIMITED", "NOT_APPLICABLE"]]
    visibility_cache_partition_key_or_null: Required[str | None]
    preview_target_ref_or_null: Required[str | None]
    download_target_ref_or_null: Required[str | None]
    print_target_ref_or_null: Required[str | None]
    external_handoff_target_ref_or_null: Required[str | None]
    approval_requirement_token_or_null: Required[str | None]
    blocking_context_tokens: Required[list[str]]
    delivery_binding_hash: Required[str]
    slice_binding_policy: Required[Literal["ACTIVE_GOVERNED_SLICE_REQUIRED"]]
    background_scope_policy: Required[Literal["DETACHED_BACKGROUND_SCOPE_FORBIDDEN"]]
    direct_url_policy: Required[Literal["DIRECT_URL_BYPASS_FORBIDDEN"]]
    posture_preservation_policy: Required[Literal["CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED"]]
    handoff_target_policy: Required[Literal["EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT"]]
    reentry_validation_policy: Required[Literal["RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION"]]
    delivery_context_policy: Required[Literal["TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION"]]
    signed_url_binding_policy: Required[Literal["SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING"]]
    temporary_artifact_policy: Required[Literal["TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING"]]

ExternalizationGovernanceContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/externalization_governance_contract.schema.json",
    "source_hash": "973875f67a124bfdb5b2477e2c3457210cf1aa183f2c04ebe46b860546494b2a",
}

class FilingCase(TypedDict, total=False):
    artifact_type: Required[Literal["FilingCase"]]
    filing_case_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    period: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    lifecycle_state: Required[Literal["NOT_STARTED", "PREPARING", "READY_REVIEW", "READY_TO_SUBMIT", "SUBMITTED_PENDING", "FILED_CONFIRMED", "FILED_UNKNOWN", "REJECTED", "AMENDMENT_ELIGIBLE", "AMENDMENT_IN_PROGRESS", "AMENDED_CONFIRMED", "CLOSED"]]
    state_transition_contract: Required[StateTransitionContract]
    current_manifest_ref: Required[str | None]
    current_trust_ref: Required[str | None]
    current_parity_ref: Required[str | None]
    current_submission_ref: Required[str | None]
    current_submission_state: Required[Literal["INTENT_RECORDED", "TRANSMIT_PENDING", "TRANSMITTED", "PENDING_ACK", "CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND", "SUPERSEDED", None]]
    current_packet_ref: Required[str | None]
    packet_state: Required[Literal["DRAFT", "PREPARED", "APPROVED_TO_SUBMIT", "SUBMITTED", "VOID", "SUPERSEDED", None]]
    calculation_basis_ref: Required[str | None]
    authority_calculation_ref: Required[str | None]
    amendment_case_ref: Required[str | None]
    calculation_request_ref: Required[str | None]
    calculation_id: Required[str | None]
    calculation_type: Required[str | None]
    calculation_hash: Required[str | None]
    readiness_context_ref: Required[str | None]
    trust_currency_state: Required[Literal["CURRENT", "RECALC_REQUIRED", "NOT_APPLICABLE_PRETRUST", None]]
    trust_invalidated_at: Required[ISO8601DateTimeString]
    trust_invalidation_reason_codes: Required[list[str]]
    trust_invalidation_dependency_refs: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    user_confirmation_ref: Required[str | None]
    last_transition_at: Required[ISO8601DateTimeString]
    controlling_proof_bundle_ref: Required[str | None]
    proof_closure_state: Required[Literal["NOT_APPLICABLE", "CLOSED", "OPEN"]]

FilingCaseSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/filing_case.schema.json",
    "source_hash": "4ac49e59054e9e251f437bc8aeb2108a1bc8284d8450c2cb31bbafb44579d598",
}

class FilingNoticeResolution(TypedDict, total=False):
    artifact_type: Required[Literal["FilingNoticeResolution"]]
    notice_resolution_id: Required[str]
    manifest_id: Required[str]
    packet_id: Required[str]
    notice_step_refs: Required[list[str]]
    notice_requirements_satisfied: Required[bool]
    approval_state: Required[Literal["NOT_REQUIRED", "SATISFIED", "REQUIRED_PENDING", "UNSATISFIABLE", "DENIED"]]
    declared_basis_ack_state: Required[Literal["NOT_APPLICABLE", "NOT_REQUIRED", "SATISFIED", "REQUIRED_PENDING", "UNSATISFIABLE"]]
    notice_refs: Required[list[str]]
    unresolved_reason_codes: Required[list[str]]
    resolved_at: Required[ISO8601DateTimeString]

FilingNoticeResolutionSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/filing_notice_resolution.schema.json",
    "source_hash": "c20cb5718eb58ce5b11f4a8909500fedf18f41e52e1a9ef52cf4b1439698bb0f",
}

class FilingNoticeStep(TypedDict, total=False):
    artifact_type: Required[Literal["FilingNoticeStep"]]
    notice_step_id: Required[str]
    manifest_id: Required[str]
    packet_id: Required[str]
    step_code: Required[Literal["DECLARED_BASIS_ACK_REQUIRED", "DISCLAIMER_ACK_REQUIRED", "PACKET_APPROVAL_REQUIRED"]]
    lifecycle_state: Required[Literal["PENDING", "SATISFIED", "UNSATISFIABLE"]]
    reason_codes: Required[list[str]]
    scope_refs: Required[list[str]]
    packet_refs: Required[list[str]]
    created_at: Required[ISO8601DateTimeString]
    resolved_at: Required[ISO8601DateTimeString]

FilingNoticeStepSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/filing_notice_step.schema.json",
    "source_hash": "3cbf1abd3f5e335c626cf154b8c5fe0b2f53e19a41dc48cfbb67e1714258a4b9",
}

class FilingPacket(TypedDict, total=False):
    artifact_type: Required[Literal["FilingPacket"]]
    packet_id: Required[str]
    manifest_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    lifecycle_state: Required[Literal["DRAFT", "PREPARED", "APPROVED_TO_SUBMIT", "SUBMITTED", "VOID", "SUPERSEDED"]]
    state_transition_contract: Required[StateTransitionContract]
    payload_ref: Required[str]
    payload_hash: Required[str]
    manifest_binding_hash: Required[str]
    declared_basis: Required[str]
    disclaimers: Required[list[str]]
    calculation_basis_ref: Required[str | None]
    authority_calculation_ref: Required[str | None]
    readiness_context_ref: Required[str | None]
    user_confirmation_ref: Required[str | None]
    controlling_proof_bundle_ref: Required[str | None]
    proof_closure_state: Required[Literal["NOT_APPLICABLE", "OPEN", "CLOSED"]]
    approval_state: Required[Literal["NOT_REQUIRED", "SATISFIED", "REQUIRED_PENDING", "UNSATISFIABLE", "DENIED", None]]
    declared_basis_ack_state: Required[Literal["NOT_APPLICABLE", "NOT_REQUIRED", "SATISFIED", "REQUIRED_PENDING", "UNSATISFIABLE", None]]
    notice_step_refs: Required[list[str]]
    notice_resolution_ref: Required[str | None]
    filing_gate_ref: Required[str | None]
    created_at: Required[ISO8601DateTimeString]
    approved_at: Required[ISO8601DateTimeString]
    submitted_at: Required[ISO8601DateTimeString]
    voided_at: Required[ISO8601DateTimeString]
    superseded_at: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]

FilingPacketSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/filing_packet.schema.json",
    "source_hash": "4ffab96fe91fcf225680c0365635275ecf93b626c8e14d2a698f5d26e26278eb",
}

class InvariantEnforcementContract(TypedDict, total=False):
    contract_version: Required[Literal["INVARIANT_ENFORCEMENT_V1"]]
    boundary_scope: Required[Literal["RUN_MANIFEST", "ERROR_RECORD"]]
    boundary_specific_binding_policy: Required[Literal["MANIFEST_RETAINS_FAIL_CLOSED_STAGE_AND_PRIMARY_ERROR_LINK", "ERROR_RETAINS_INVARIANT_CLASS_FAULT_CODE_AND_TERMINAL_BINDING"]]
    invariant_failure_state: Required[Literal["NOT_TRIGGERED", "TRIGGERED"]]
    invariant_class_or_null: Required[Literal["SCOPE_BINDING", "MANIFEST_REUSE", "LIFECYCLE_TRANSITION", "PRESEAL_GATE_CHAIN", "INPUT_POLICY", "CANONICAL_PROMOTION", "GRAPH_PROVENANCE", "AMENDMENT_SUBMISSION", "FILING_READINESS", "REPLAY_BASIS", "AUTHORITY_PREFLIGHT", None]]
    error_family_or_null: Required[Literal["MANIFEST_ERROR", "INPUT_BOUNDARY_ERROR", "CANONICALIZATION_ERROR", "PROVENANCE_ERROR", "AMENDMENT_ERROR", "WORKFLOW_ERROR", "AUTHORITY_PROTOCOL_ERROR", "SYSTEM_FAULT", None]]
    error_code_or_null: Required[str | None]
    failure_stage_or_null: Required[Literal["PRESTART", "POSTSTART", None]]
    terminal_manifest_state_or_null: Required[Literal["BLOCKED", "FAILED", None]]
    transition_event_code_or_null: Required[Literal["system_fault", None]]
    terminal_audit_event_type_or_null: Required[Literal["ManifestBlocked", "ManifestFailed", None]]
    error_record_ref_or_null: Required[str | None]
    typed_error_policy: Required[Literal["INVARIANTS_MUST_PERSIST_FAMILY_SPECIFIC_ERROR_RECORDS"]]
    partial_write_policy: Required[Literal["NO_PARTIAL_MUTATION_OR_SIDE_EFFECT_AFTER_INVARIANT_FAILURE"]]
    audit_evidence_policy: Required[Literal["INVARIANTS_REQUIRE_ERROR_AND_TERMINAL_AUDIT_EVIDENCE"]]
    lifecycle_mapping_policy: Required[Literal["PRESTART_INVARIANTS_BLOCK_POSTSTART_INVARIANTS_FAIL"]]
    assertion_conversion_policy: Required[Literal["ASSERTIONS_AND_GENERIC_EXCEPTIONS_MUST_COLLAPSE_TO_TYPED_FAIL_CLOSED_OUTCOMES"]]
    normalization_rejection_policy: Required[Literal["IMPOSSIBLE_STATES_REJECTED_NEVER_NORMALIZED"]]

InvariantEnforcementContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/invariant_enforcement_contract.schema.json",
    "source_hash": "5438c9995521d16b98ceaef16984ff821d2431fce5c851813f79507e2f1c91aa",
}

class LateDataConsequenceSummary(TypedDict, total=False):
    summary_profile_code: Required[Literal["LATE_DATA_SUMMARY_V1"]]
    true_post_baseline_event_count: Required[int]
    pre_cutoff_preexisting_late_arrival_count: Required[int]
    post_cutoff_discovery_pre_baseline_fact_count: Required[int]
    authority_posting_lag_count: Required[int]
    temporally_unproved_count: Required[int]
    highest_legal_consequence: Required[Literal["NONE", "CURRENT_SCOPE_INVALIDATION", "RETROACTIVE_IMPACT_REVIEW", "TEMPORAL_UNCERTAINTY_BLOCK"]]
    retroactive_impact_required: Required[bool]
    trust_invalidation_required: Required[bool]
    proof_staleness_required: Required[bool]
    amendment_reuse_invalidated: Required[bool]
    blocking_temporal_uncertainty_present: Required[bool]
    replay_lineage_policy: Required[Literal["HISTORICAL_LINEAGE_ONLY"]]
    reason_codes: Required[list[str]]

LateDataConsequenceSummarySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_consequence_summary.schema.json",
    "source_hash": "6fba4f5d4c59c261243981380cefb5d5d1511d72e33f15098ed59f8460f0de41",
}

class LateDataFinding(TypedDict, total=False):
    artifact_type: Required[Literal["LateDataFinding"]]
    finding_id: Required[str]
    manifest_id: Required[str]
    indicator_refs: Required[list[str]]
    binding_ref: Required[str]
    source_domain: Required[str]
    source_class: Required[LateDataPolicyBinding]
    partition_scope_refs: Required[LateDataPolicyBinding]
    runtime_scope_refs: Required[LateDataPolicyBinding]
    late_data_policy_ref: Required[LateDataPolicyBinding]
    severity: Required[Literal["NOTICE", "MANUAL_REVIEW", "CHILD_MANIFEST_REQUIRED"]]
    temporal_classification_contract: Required[LateDataTemporalContract]
    finding_state: Required[Literal["OPEN", "EXCLUDED_FROM_ACTIVE_MANIFEST", "REVIEW_REQUIRED", "CHILD_MANIFEST_SPAWNED", "SUPERSEDED"]]
    active_manifest_effect: Required[Literal["NONE", "NOTICE_ONLY", "REVIEW_REQUIRED", "OUT_OF_SCOPE_CHILD_REQUIRED"]]
    child_manifest_ref: Required[str | None]
    workflow_item_ref: Required[str | None]
    superseded_by_finding_ref: Required[str | None]
    discovered_at: Required[ISO8601DateTimeString]
    resolved_at: Required[ISO8601DateTimeString]
    reason_codes: Required[list[str]]

LateDataFindingSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_finding.schema.json",
    "source_hash": "3c2661f4f4c7a27b45e2aaca01edb4525a37d2b41c77d3356d75fc0508f9a0ac",
}

class LateDataIndicator(TypedDict, total=False):
    artifact_type: Required[Literal["LateDataIndicator"]]
    indicator_id: Required[str]
    manifest_id: Required[str]
    collection_boundary_ref: Required[str]
    source_plan_ref: Required[str]
    binding_ref: Required[str]
    source_domain: Required[str]
    source_class: Required[LateDataPolicyBinding]
    partition_scope_refs: Required[LateDataPolicyBinding]
    runtime_scope_refs: Required[LateDataPolicyBinding]
    indicator_type: Required[Literal["POST_CUTOFF_RECORD", "CURSOR_ADVANCED", "REVISION_ADVANCED", "SCHEMA_VERSION_ADVANCED", "FRESHNESS_SLO_BREACH"]]
    detection_basis: Required[Literal["REQUEST_AUDIT", "CURSOR_CHECKPOINT", "REVISION_MARKER", "SOURCE_RECORD_TIMESTAMP", "PROVIDER_SCHEMA_SIGNAL", "FRESHNESS_EVALUATION"]]
    late_data_policy_ref: Required[LateDataPolicyBinding]
    severity: Required[Literal["NOTICE", "MANUAL_REVIEW", "CHILD_MANIFEST_REQUIRED"]]
    temporal_classification_contract: Required[LateDataTemporalContract]
    discovered_at: Required[ISO8601DateTimeString]
    request_audit_ref: Required[str | None]
    source_record_ref: Required[str | None]
    evidence_ref: Required[str | None]
    indicator_hash: Required[str]
    reason_codes: Required[list[str]]

LateDataIndicatorSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_indicator.schema.json",
    "source_hash": "26565dc5354c23c822edbd6b20f9bd3a4d33d86fa43494019aeadfa92a7fdce9",
}

type LateDataIndicatorSet = JSONValue

LateDataIndicatorSetSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_indicator_set.schema.json",
    "source_hash": "f821b361be87c9b110fcbee7a08dc5a99763f27c0c2209c883f02b2db2c51de5",
}

class LateDataMonitorResult(TypedDict, total=False):
    artifact_type: Required[Literal["LateDataMonitorResult"]]
    late_data_monitor_id: Required[str]
    manifest_id: Required[str]
    manifest_hash: Required[str]
    execution_basis_hash: Required[str]
    collection_boundary_ref: Required[str]
    source_window_ref: Required[str]
    input_freeze_ref: Required[str]
    runtime_scope_refs: Required[LateDataPolicyBinding]
    latest_indicator_set_ref: Required[str]
    finding_refs: Required[list[str]]
    late_data_status: Required[Literal["NO_LATE_DATA", "EXCLUDED_LATE_ONLY", "REVIEW_REQUIRED", "SPAWN_CHILD_MANIFEST_REQUIRED"]]
    total_finding_count: Required[int]
    excluded_count: Required[int]
    review_required_count: Required[int]
    child_manifest_required_count: Required[int]
    temporal_consequence_summary: Required[LateDataConsequenceSummary]
    child_manifest_refs: Required[list[str]]
    workflow_item_refs: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    classified_at: Required[ISO8601DateTimeString]
    reason_codes: Required[list[str]]

LateDataMonitorResultSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_monitor_result.schema.json",
    "source_hash": "4618a96169467eec2ae352b8559746ce40af398c0ca325a103da8fb3f5ee9a5a",
}

type LateDataPolicyBindingSourceClass = Literal["AUTHORITY_ACKNOWLEDGEMENT", "AUTHORITY_REFERENCE", "INSTITUTIONAL_FEED", "BOOKS_OF_ENTRY", "DOCUMENTARY_EVIDENCE", "DECLARED_ASSERTION", "DETERMINISTIC_DERIVATION", "PROBABILISTIC_INFERENCE", "GOVERNANCE_ARTIFACT"]

type LateDataPolicyBindingSourceClassOrNull = Literal["AUTHORITY_ACKNOWLEDGEMENT", "AUTHORITY_REFERENCE", "INSTITUTIONAL_FEED", "BOOKS_OF_ENTRY", "DOCUMENTARY_EVIDENCE", "DECLARED_ASSERTION", "DETERMINISTIC_DERIVATION", "PROBABILISTIC_INFERENCE", "GOVERNANCE_ARTIFACT", None]

type LateDataPolicyBindingPartitionScopeRefs = list[str]

type LateDataPolicyBindingRuntimeScopeRefs = list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]

type LateDataPolicyBindingLateDataPolicyRef = Literal["EXCLUDE_LATE", "SPAWN_CHILD_MANIFEST", "REVIEW_IF_LATE"]

type LateDataPolicyBindingBindingScope = Literal["DOMAIN_WIDE", "SOURCE_CLASS", "PARTITION_SCOPED", "RUNTIME_SCOPED"]

class LateDataPolicyBinding(TypedDict, total=False):
    binding_id: Required[str]
    source_domain: Required[str]
    source_class: Required[LateDataPolicyBindingSourceClassOrNull]
    partition_scope_refs: Required[LateDataPolicyBindingPartitionScopeRefs]
    runtime_scope_refs: Required[LateDataPolicyBindingRuntimeScopeRefs]
    late_data_policy_ref: Required[LateDataPolicyBindingLateDataPolicyRef]
    binding_scope: Required[LateDataPolicyBindingBindingScope]
    precedence_rank: Required[int]

LateDataPolicyBindingSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_policy_binding.schema.json",
    "source_hash": "87d4ee1a12c91761a34f79fdcaad68e113c1fc7e66e74b88f442329097543ce7",
}

type LateDataRetroactiveImpactSimulationTemporalClass = Literal["PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL", "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT", "AUTHORITY_POSTING_LAG", "TRUE_POST_BASELINE_EVENT", "TEMPORALLY_UNPROVED"]

type LateDataRetroactiveImpactSimulationBaselineScopeClass = Literal["CURRENT_SCOPE", "PRIOR_SUBMISSION_CHAIN"]

type LateDataRetroactiveImpactSimulationLegalEffectBasis = Literal["EFFECTIVE_TIME", "VISIBILITY_TIME", "AUTHORITY_PUBLICATION_TIME", "UNKNOWN"]

type LateDataRetroactiveImpactSimulationTemporalCertaintyState = Literal["PROVED", "UNPROVED"]

type LateDataRetroactiveImpactSimulationLateDataStatus = Literal["NO_LATE_DATA", "EXCLUDED_LATE_ONLY", "REVIEW_REQUIRED", "SPAWN_CHILD_MANIFEST_REQUIRED"]

type LateDataRetroactiveImpactSimulationHighestLegalConsequence = Literal["NONE", "CURRENT_SCOPE_INVALIDATION", "RETROACTIVE_IMPACT_REVIEW", "TEMPORAL_UNCERTAINTY_BLOCK"]

type LateDataRetroactiveImpactSimulationBoundedRetroactivityClass = Literal["NONE", "CURRENT_SCOPE_ONLY", "RESTATE_PRIOR_POSITION", "REOPEN_CHAIN_REPLAY", "AUTHORITY_RECONCILIATION_REQUIRED"]

type LateDataRetroactiveImpactSimulationReplayRequirement = Literal["NONE", "CONTINUATION_CHILD", "EXACT_REPLAY", "RECONCILE_FIRST"]

type LateDataRetroactiveImpactSimulationTrustCurrencyState = Literal["CURRENT", "RECALC_REQUIRED"]

type LateDataRetroactiveImpactSimulationProofEffect = Literal["NONE", "STALE_REVALIDATION_REQUIRED"]

type LateDataRetroactiveImpactSimulationAmendmentEffect = Literal["NONE", "INVALIDATE_READINESS_REUSE", "RECONCILE_FIRST"]

type LateDataRetroactiveImpactSimulationOutcomeClass = Literal["CURRENT_ONLY", "EXPLANATION_ONLY", "AMENDMENT_TRIGGERING", "REPLAY_TRIGGERING", "REVIEW_BLOCKED"]

type LateDataRetroactiveImpactSimulationHistoricalPositionHandling = Literal["NO_HISTORICAL_MUTATION_NEEDED", "BOUNDED_CONTINUATION_OR_REPLAY_REQUIRED", "RECONCILIATION_BEFORE_ANY_MUTATION"]

class LateDataRetroactiveImpactSimulation(TypedDict, total=False):
    artifact_type: Required[Literal["LateDataRetroactiveImpactSimulation"]]
    simulation_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    basis_contract: Required[LateDataRetroactiveImpactSimulationBasisContract]
    scenario_results: Required[list[LateDataRetroactiveImpactSimulationScenarioResult]]
    current_only_count: Required[int]
    explanation_only_count: Required[int]
    amendment_triggering_count: Required[int]
    replay_triggering_count: Required[int]
    review_blocked_count: Required[int]
    simulated_by_principal_ref: Required[str]
    simulated_at: Required[ISO8601DateTimeString]
    simulation_hash: Required[str]

class LateDataRetroactiveImpactSimulationScenarioResult(TypedDict, total=False):
    scenario_case_code: Required[LateDataRetroactiveImpactSimulationTemporalClass]
    t_effective_or_null: Required[ISO8601DateTimeString]
    t_visible_or_null: Required[ISO8601DateTimeString]
    t_discovered: Required[ISO8601DateTimeString]
    baseline_scope_class: Required[LateDataRetroactiveImpactSimulationBaselineScopeClass]
    filing_critical_baseline_touch: Required[bool]
    decisive_proof_path_touch: Required[bool]
    legal_effect_basis: Required[LateDataRetroactiveImpactSimulationLegalEffectBasis]
    temporal_certainty_state: Required[LateDataRetroactiveImpactSimulationTemporalCertaintyState]
    late_data_status: Required[LateDataRetroactiveImpactSimulationLateDataStatus]
    highest_legal_consequence: Required[LateDataRetroactiveImpactSimulationHighestLegalConsequence]
    bounded_retroactivity_class: Required[LateDataRetroactiveImpactSimulationBoundedRetroactivityClass]
    replay_requirement: Required[LateDataRetroactiveImpactSimulationReplayRequirement]
    restatement_required: Required[bool]
    impacted_scope_refs: Required[list[str]]
    impacted_submission_refs: Required[list[str]]
    restatement_scope_refs: Required[list[str]]
    trust_currency_state: Required[LateDataRetroactiveImpactSimulationTrustCurrencyState]
    proof_effect: Required[LateDataRetroactiveImpactSimulationProofEffect]
    amendment_effect: Required[LateDataRetroactiveImpactSimulationAmendmentEffect]
    historical_position_handling: Required[LateDataRetroactiveImpactSimulationHistoricalPositionHandling]
    simulation_outcome_class: Required[LateDataRetroactiveImpactSimulationOutcomeClass]
    reason_codes: Required[list[str]]

LateDataRetroactiveImpactSimulationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_retroactive_impact_simulation.schema.json",
    "source_hash": "60b38510166727600d60bca0fb716d6335081e5e4ffb295038e1be4e843a9541",
}

type LateDataRetroactiveImpactSimulationBasisContractTemporalClass = Literal["PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL", "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT", "AUTHORITY_POSTING_LAG", "TRUE_POST_BASELINE_EVENT", "TEMPORALLY_UNPROVED"]

type LateDataRetroactiveImpactSimulationBasisContractOutcomeClass = Literal["CURRENT_ONLY", "EXPLANATION_ONLY", "AMENDMENT_TRIGGERING", "REPLAY_TRIGGERING", "REVIEW_BLOCKED"]

class LateDataRetroactiveImpactSimulationBasisContract(TypedDict, total=False):
    contract_version: Required[Literal["LATE_DATA_RETROACTIVE_IMPACT_SIMULATION_BASIS_V1"]]
    basis_contract_hash: Required[str]
    execution_mode_boundary_hash: Required[str]
    source_manifest_id: Required[str]
    source_manifest_hash: Required[str]
    source_execution_basis_hash: Required[str]
    source_collection_boundary_ref: Required[str]
    source_source_window_ref: Required[str]
    source_input_freeze_ref: Required[str]
    source_cutoff_at: Required[ISO8601DateTimeString]
    source_baseline_envelope_ref: Required[str]
    source_baseline_effective_at: Required[ISO8601DateTimeString]
    source_active_exact_scope_key: Required[str]
    covered_scope_refs: Required[list[str]]
    covered_submission_refs: Required[list[str]]
    source_late_data_policy_refs: Required[list[str]]
    source_late_data_monitor_ref: Required[str]
    source_late_data_finding_refs: Required[list[str]]
    source_temporal_propagation_event_refs: Required[list[str]]
    source_retroactive_impact_ref_or_null: Required[str | None]
    source_filing_case_ref_or_null: Required[str | None]
    source_proof_bundle_refs: Required[list[str]]
    source_evidence_graph_ref_or_null: Required[str | None]
    required_temporal_classes: Required[list[LateDataRetroactiveImpactSimulationBasisContractTemporalClass]]
    required_outcome_classes: Required[list[LateDataRetroactiveImpactSimulationBasisContractOutcomeClass]]
    truth_source_policy: Required[Literal["PERSISTED_LATE_DATA_BASELINE_AND_PROOF_ARTIFACTS_ONLY"]]
    historical_reuse_policy: Required[Literal["NO_FRESH_RECLASSIFICATION_OR_CONNECTOR_RESCAN"]]
    scope_widening_policy: Required[Literal["ONLY_DECLARED_COVERED_SCOPE_AND_SUBMISSION_CHAIN_REFS"]]
    trust_invalidation_policy: Required[Literal["POST_SEAL_MATERIAL_OR_UNPROVED_REQUIRES_RECALC"]]
    proof_staleness_policy: Required[Literal["DECISIVE_PATH_TOUCH_REQUIRES_STALE_PROOF"]]
    historical_mutation_policy: Required[Literal["NO_IN_PLACE_MUTATION_OF_PRIOR_LEGAL_STATE"]]
    simulation_case_policy: Required[Literal["CANONICAL_FIVE_TEMPORAL_CLASSES_AND_OUTCOME_CLASSES_REQUIRED"]]

LateDataRetroactiveImpactSimulationBasisContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json",
    "source_hash": "acb388e46f3e8d43be81c582b224d580200ad773285ebd792528709a5ae5ac44",
}

class LateDataTemporalContract(TypedDict, total=False):
    classification_profile_code: Required[Literal["LATE_DATA_TEMPORAL_V1"]]
    temporal_classification: Required[Literal["TEMPORALLY_UNPROVED", "AUTHORITY_POSTING_LAG", "TRUE_POST_BASELINE_EVENT", "PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL", "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT"]]
    temporal_certainty_state: Required[Literal["PROVED", "UNPROVED"]]
    legal_effect_basis: Required[Literal["EFFECTIVE_TIME", "VISIBILITY_TIME", "AUTHORITY_PUBLICATION_TIME", "UNKNOWN"]]
    baseline_scope_class: Required[Literal["NONE", "CURRENT_SCOPE", "PRIOR_SUBMISSION_CHAIN"]]
    filing_critical_baseline_touch: Required[bool]
    t_cutoff: Required[ISO8601DateTimeString]
    t_effective_or_null: Required[ISO8601DateTimeString]
    t_visible_or_null: Required[ISO8601DateTimeString]
    t_discovered: Required[ISO8601DateTimeString]
    retroactive_impact_required: Required[bool]
    trust_invalidation_required: Required[bool]
    proof_staleness_required: Required[bool]
    amendment_reuse_invalidated: Required[bool]
    replay_lineage_policy: Required[Literal["HISTORICAL_LINEAGE_ONLY"]]
    reason_codes: Required[list[str]]

LateDataTemporalContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/late_data_temporal_contract.schema.json",
    "source_hash": "99511eb06531115230f8885406e6abfbf541f8222e3ed879b21e0f378e873823",
}

class MutationPreconditionBinding(TypedDict, total=False):
    profile_code: Required[Literal["MANIFEST_RENDER_FRAME", "MANIFEST_APPROVAL_PACK_REVIEW", "WORK_ITEM_STATE_MUTATION", "WORK_ITEM_INTERNAL_APPEND", "WORK_ITEM_CUSTOMER_APPEND", "WORK_ITEM_REQUEST_RESPONSE", "CLIENT_PORTAL_ROUTE_MUTATION", "GOVERNANCE_POLICY_MUTATION", "GOVERNANCE_SIMULATION_COMMIT"]]
    target_scope_classes: Required[list[Literal["MANIFEST", "WORK_ITEM", "GOVERNANCE"]]]
    required_guard_fields: Required[list[Literal["if_match_decision_bundle_hash", "if_match_shell_stability_token", "if_match_frame_epoch", "if_match_work_item_version", "if_match_internal_head_sequence", "if_match_customer_head_sequence", "if_match_request_state_version", "if_match_approval_pack_hash", "if_match_client_portal_workspace_version", "if_match_policy_snapshot_hash", "if_match_dependency_topology_hash", "simulation_basis_hash"]]]
    stale_guard_families: Required[list[Literal["DECISION_BUNDLE_HASH", "SHELL_STABILITY_TOKEN", "FRAME_EPOCH", "WORK_ITEM_VERSION", "INTERNAL_THREAD_HEAD", "CUSTOMER_THREAD_HEAD", "REQUEST_STATE_VERSION", "APPROVAL_PACK_HASH", "CLIENT_PORTAL_WORKSPACE_VERSION", "POLICY_SNAPSHOT_HASH", "DEPENDENCY_TOPOLOGY_HASH", "SIMULATION_BASIS_HASH", "MUTATION_BASIS_CONTRACT_HASH"]]]
    requires_live_freshness: Required[bool]
    invalidates_on_visibility_shift: Required[bool]

MutationPreconditionBindingSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/mutation_precondition_binding.schema.json",
    "source_hash": "3ecd94abd5e8e79e464ab47c4d54308a64289a23cda088bf96824f15b0cf8f1e",
}

class ObligationMirror(TypedDict, total=False):
    artifact_type: Required[Literal["ObligationMirror"]]
    obligation_mirror_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    income_source_partition: Required[str]
    period: Required[str]
    authority_truth_contract: Required[AuthorityTruthContract]
    authority_ingress_proof_contract: Required[AuthorityIngressProofContract | None]
    authority_truth_state: Required[Literal["NOT_APPLICABLE", "NOT_REQUESTED", "UNKNOWN", "PENDING_ACK", "PARTIAL_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"]]
    lifecycle_state: Required[Literal["NOT_YET_OPEN", "OPEN", "DUE_SOON", "READY_TO_FILE", "SUBMITTED_PENDING", "MET_CONFIRMED", "LATE_UNMET", "NO_LONGER_RELEVANT"]]
    authority_refs: Required[list[str]]
    due_at: Required[ISO8601DateTimeString]
    current_submission_ref: Required[str | None]
    last_confirmed_submission_ref: Required[str | None]
    ready_manifest_ref: Required[str | None]
    blocked_reason_codes: Required[list[str]]
    last_authority_sync_at: Required[ISO8601DateTimeString]
    reconciliation_control_contract_or_null: Required[AuthorityReconciliationControlContract | None]
    authority_status_ref: Required[str | None]

ObligationMirrorSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/obligation_mirror.schema.json",
    "source_hash": "77ca99c8e2523ca82c718ab5b99f10654c62b84551bfd8c62784904af17414a2",
}

type PresealGateEvaluationContractScopeArray = JSONValue

type PresealGateEvaluationContractPresealGateCodeArray = list[JSONValue]

class PresealGateEvaluationContract(TypedDict, total=False):
    contract_class: Required[Literal["MANIFEST_PRESEAL_GATE_EVALUATION"]]
    manifest_id: Required[str]
    execution_basis_hash: Required[str]
    access_binding_hash: Required[str]
    authorized_scope: Required[PresealGateEvaluationContractScopeArray]
    required_gate_codes: Required[PresealGateEvaluationContractPresealGateCodeArray]
    evaluated_gate_codes: Required[list[Literal["MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE", "INPUT_BOUNDARY_GATE", "DATA_QUALITY_GATE"]]]
    ordered_gate_decision_ids: Required[list[str]]
    blocking_gate_codes: Required[list[Literal["MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE", "INPUT_BOUNDARY_GATE", "DATA_QUALITY_GATE"]]]
    completion_state: Required[Literal["PENDING_PREREQUISITES", "COMPLETE_READY_TO_SEAL", "COMPLETE_BLOCKED_PRESTART"]]
    prerequisite_materialization_state: Required[Literal["AWAITING_PREREQUISITE_MATERIALIZATION", "FULLY_MATERIALIZED"]]
    missing_prerequisite_refs: Required[list[str]]
    durability_boundary: Required[Literal["NO_PERSISTED_TAPE_YET", "PERSIST_PRESTART_TERMINAL_CONTEXT", "ATOMIC_GATE_BATCH_AND_SEAL"]]
    reuse_policy: Required[Literal["REUSE_PERSISTED_PRESEAL_TAPE_ONLY"]]
    post_seal_interpretation_policy: Required[Literal["APPEND_ONLY_POSTSEAL_CANNOT_REINTERPRET_PRESEAL"]]

PresealGateEvaluationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/preseal_gate_evaluation_contract.schema.json",
    "source_hash": "658e41fcac6a3b20ec0f8320aad4d1ceaff56faab9eee3edb1c60256d24a81d1",
}

class ProblemEnvelope(TypedDict, total=False):
    artifact_type: Required[Literal["ProblemEnvelope"]]
    problem_code: Required[str]
    title: Required[str]
    detail: Required[str]
    reason_codes: Required[list[str]]
    retryable: Required[bool]
    correlation_id: Required[str]
    manifest_id: Required[str | None]
    latest_decision_bundle_ref: Required[str | None]
    latest_workspace_snapshot_ref: Required[str | None]
    latest_approval_pack_ref: Required[str | None]
    latest_client_portal_workspace_ref: Required[str | None]
    latest_upload_session_ref: Required[str | None]
    latest_policy_snapshot_ref: Required[str | None]
    latest_command_receipt_ref: Required[str | None]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    mutation_precondition_binding_or_null: Required[MutationPreconditionBinding | None]
    stale_guard_family: Required[Literal["DECISION_BUNDLE_HASH", "SHELL_STABILITY_TOKEN", "FRAME_EPOCH", "WORK_ITEM_VERSION", "INTERNAL_THREAD_HEAD", "CUSTOMER_THREAD_HEAD", "REQUEST_STATE_VERSION", "APPROVAL_PACK_HASH", "CLIENT_PORTAL_WORKSPACE_VERSION", "POLICY_SNAPSHOT_HASH", "DEPENDENCY_TOPOLOGY_HASH", "SIMULATION_BASIS_HASH", "MUTATION_BASIS_CONTRACT_HASH", None]]
    latest_stale_guard_value: Required[str | int | None]
    latest_resume_token: Required[str | None]
    latest_stability_contract_or_null: Required[RouteStabilityContract | None]
    rebase_required: Required[bool]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    suggested_detail_surface_code: Required[Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL", "CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL", None]]

ProblemEnvelopeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/problem_envelope.schema.json",
    "source_hash": "d0ecad4da0b4ef69fbacb2a378c835ec510fd9ba0488f32267415789fce81206",
}

type ReplayBasisIntegrityContractSourceDimensionArray = list[Literal["CONFIG", "INPUT", "PRESEAL_GATE_TAPE", "AUTHORITY_POST_SEAL", "BASELINE_POST_SEAL", "LATE_DATA_POST_SEAL", "TEMPORAL_PROPAGATION_POST_SEAL"]]

type ReplayBasisIntegrityContractCounterfactualDimensionArray = list[Literal["IDENTITY_AUTHORITY", "EXECUTABLE", "CONFIG", "INPUT", "POST_SEAL", "DETERMINISM", "AUTHORITY_POST_SEAL", "BASELINE_POST_SEAL", "LATE_DATA_POST_SEAL", "TEMPORAL_PROPAGATION_POST_SEAL"]]

class ReplayBasisIntegrityContract(TypedDict, total=False):
    integrity_profile_code: Required[Literal["REPLAY_BASIS_INTEGRITY_V1"]]
    replay_class: Required[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS"]]
    historical_basis_policy: Required[Literal["NO_SILENT_HISTORICAL_SUBSTITUTION"]]
    config_basis_source_class: Required[Literal["HISTORICAL_FROZEN_REUSED", "DECLARED_COUNTERFACTUAL_SUBSTITUTION", "MISSING_HISTORICAL_FREEZE", "CORRUPT_HISTORICAL_FREEZE"]]
    input_basis_source_class: Required[Literal["HISTORICAL_FROZEN_REUSED", "DECLARED_COUNTERFACTUAL_SUBSTITUTION", "MISSING_HISTORICAL_FREEZE", "CORRUPT_HISTORICAL_FREEZE"]]
    preseal_gate_source_class: Required[Literal["HISTORICAL_PRESEAL_TAPE_REUSED", "MISSING_PRESEAL_TAPE", "CORRUPT_PRESEAL_TAPE"]]
    authority_basis_source_class: Required[Literal["HISTORICAL_POST_SEAL_REUSED", "DECLARED_COUNTERFACTUAL_SUBSTITUTION", "NOT_MATERIAL", "MISSING_HISTORICAL_BASIS", "CORRUPT_HISTORICAL_BASIS"]]
    baseline_basis_source_class: Required[Literal["HISTORICAL_POST_SEAL_REUSED", "DECLARED_COUNTERFACTUAL_SUBSTITUTION", "NOT_MATERIAL", "MISSING_HISTORICAL_BASIS", "CORRUPT_HISTORICAL_BASIS"]]
    late_data_basis_source_class: Required[Literal["HISTORICAL_POST_SEAL_REUSED", "DECLARED_COUNTERFACTUAL_SUBSTITUTION", "NOT_MATERIAL", "MISSING_HISTORICAL_BASIS", "CORRUPT_HISTORICAL_BASIS"]]
    temporal_propagation_event_source_class: Required[Literal["HISTORICAL_POST_SEAL_REUSED", "DECLARED_COUNTERFACTUAL_SUBSTITUTION", "NOT_MATERIAL", "MISSING_HISTORICAL_BASIS", "CORRUPT_HISTORICAL_BASIS"]]
    live_connector_read_class: Required[Literal["NOT_PERFORMED", "DECLARED_COUNTERFACTUAL_EXECUTED", "UNDECLARED_EXECUTED"]]
    live_authority_read_class: Required[Literal["NOT_PERFORMED", "DECLARED_COUNTERFACTUAL_EXECUTED", "UNDECLARED_EXECUTED"]]
    late_data_rescan_class: Required[Literal["NOT_PERFORMED", "DECLARED_COUNTERFACTUAL_EXECUTED", "UNDECLARED_EXECUTED"]]
    missing_basis_dimensions: Required[ReplayBasisIntegrityContractSourceDimensionArray]
    corrupt_basis_dimensions: Required[ReplayBasisIntegrityContractSourceDimensionArray]
    substituted_basis_dimensions: Required[ReplayBasisIntegrityContractSourceDimensionArray]
    declared_counterfactual_dimensions: Required[ReplayBasisIntegrityContractCounterfactualDimensionArray]
    undeclared_basis_drift_dimensions: Required[ReplayBasisIntegrityContractCounterfactualDimensionArray]
    deterministic_outcome_source_policy: Required[Literal["PERSISTED_OR_TRANSACTIONALLY_STAGED_ONLY"]]
    non_persisted_outcome_component_classes: Required[list[Literal["DECISION_BUNDLE", "GATE_SEQUENCE", "SNAPSHOT", "COMPUTE_RESULT", "FORECAST_SET", "RISK_REPORT", "PARITY_RESULT", "TRUST_SUMMARY", "EVIDENCE_GRAPH", "TWIN_VIEW", "FILING_PACKET", "AUTHORITY_RESULT", "LATE_DATA_BASIS", "DRIFT_RECORD"]]]
    publication_gate: Required[Literal["ATTESTATION_REQUIRED_BEFORE_REPLAY_CLAIM"]]

ReplayBasisIntegrityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/replay_basis_integrity_contract.schema.json",
    "source_hash": "b6514b696dc09cf7d3280a515f078a463f9bb297813da390552a3c9fbdfb4b87",
}

class RetroactiveImpactAnalysis(TypedDict, total=False):
    artifact_type: Required[Literal["RetroactiveImpactAnalysis"]]
    retroactive_impact_id: Required[str]
    manifest_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    drift_ref: Required[str | None]
    baseline_envelope_ref: Required[str]
    temporal_propagation_event_ref: Required[str]
    impacted_scope_refs: Required[list[str]]
    impacted_submission_refs: Required[list[str]]
    earliest_affected_effective_at: Required[ISO8601DateTimeString]
    latest_affected_effective_at: Required[ISO8601DateTimeString]
    bounded_retroactivity_class: Required[Literal["NONE", "CURRENT_SCOPE_ONLY", "RESTATE_PRIOR_POSITION", "REOPEN_CHAIN_REPLAY", "AUTHORITY_RECONCILIATION_REQUIRED"]]
    late_data_interaction_class: Required[Literal["NONE", "CURRENT_SCOPE_ONLY", "RESTATE_PRIOR_POSITION", "AUTHORITY_CORRECTION_ONLY", "CONTRADICTORY"]]
    replay_requirement: Required[Literal["NONE", "CONTINUATION_CHILD", "EXACT_REPLAY", "RECONCILE_FIRST"]]
    restatement_required: Required[bool]
    restatement_scope_refs: Required[list[str]]
    reason_codes: Required[list[str]]
    analyzed_at: Required[ISO8601DateTimeString]
    analysis_hash: Required[str]

RetroactiveImpactAnalysisSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/retroactive_impact_analysis.schema.json",
    "source_hash": "15d02e2b9e597dad0694a23b12ddc13ef1c1b50b3946a5d03f21fb5d2c896c46",
}

type RunManifestScopeArray = JSONValue

class RunManifest(TypedDict, total=False):
    manifest_id: Required[str]
    root_manifest_id: Required[str | None]
    parent_manifest_id: Required[str | None]
    continuation_of_manifest_id: Required[str | None]
    replay_of_manifest_id: Required[str | None]
    supersedes_manifest_id: Required[str | None]
    manifest_generation: Required[int]
    manifest_schema_version: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    business_partitions: NotRequired[list[str]]
    income_source_partitions: NotRequired[list[str]]
    period: Required[str]
    requested_scope: Required[JSONValue]
    scope_execution_binding: Required[ScopeExecutionBinding]
    mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    run_kind: Required[Literal["INTERACTIVE", "NIGHTLY", "BACKFILL", "REPLAY", "REMEDIATION", "AMENDMENT", "MIGRATION"]]
    nightly_batch_run_ref: NotRequired[str | None]
    nightly_window_key: NotRequired[str | None]
    authority_context_ref: NotRequired[str | None]
    principal_context_ref: Required[str]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    invariant_enforcement_contract: Required[InvariantEnforcementContract]
    access_binding_hash: Required[str]
    delegation_basis: NotRequired[Literal["SELF_ACTING", "CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE", "TENANT_INTERNAL", "SYSTEM_ASSIGNED", None]]
    authority_link_refs: NotRequired[list[str]]
    approval_refs: NotRequired[list[str]]
    override_refs: NotRequired[list[str]]
    environment_ref: Required[Literal["DEV", "TEST", "UAT", "SANDBOX", "PRODUCTION"]]
    provider_environment_refs: NotRequired[list[RunManifestProviderEnvironment]]
    code_build_id: Required[str]
    code_commit_sha: Required[str | None]
    container_image_digest: Required[str | None]
    schema_bundle_hash: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    feature_flag_snapshot_hash: Required[str | None]
    config_freeze: NotRequired[RunManifestConfigFreeze]
    input_freeze: NotRequired[RunManifestInputFreeze]
    deterministic_seed: Required[str]
    idempotency_key: Required[str]
    continuation_basis: Required[Literal["NEW_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]]
    manifest_branch_decision: Required[ManifestBranchDecisionContract]
    manifest_lineage_trace_refs: Required[list[str]]
    replay_class: NotRequired[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS", None]]
    non_deterministic_module_allowlist: NotRequired[list[str]]
    hash_set: NotRequired[RunManifestHashSet]
    frozen_execution_binding: NotRequired[RunManifestFrozenExecutionBinding]
    preseal_gate_evaluation: NotRequired[PresealGateEvaluationContract]
    manifest_start_claim: NotRequired[ManifestStartClaimContract]
    append_only_outcome_projection: NotRequired[RunManifestAppendOnlyOutcomeProjection]
    continuation_set: Required[RunManifestContinuationSet]
    lifecycle_state: Required[Literal["ALLOCATED", "FROZEN", "SEALED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "FAILED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED"]]
    state_transition_contract: Required[StateTransitionContract]
    created_at: Required[ISO8601DateTimeString]
    frozen_at: NotRequired[ISO8601DateTimeString]
    opened_at: NotRequired[ISO8601DateTimeString]
    sealed_at: NotRequired[ISO8601DateTimeString]
    completed_at: NotRequired[ISO8601DateTimeString]
    superseded_at: NotRequired[ISO8601DateTimeString]
    retired_at: NotRequired[ISO8601DateTimeString]
    gating_decisions: NotRequired[list[GateDecisionRecord]]
    access_decision: NotRequired[RunManifestAccessDecision]
    output_refs: NotRequired[RunManifestOutputLinkMap]
    audit_refs: NotRequired[list[str]]
    decision_bundle_hash: NotRequired[str | None]
    deterministic_outcome_hash: NotRequired[str | None]
    replay_attestation_ref: NotRequired[str | None]
    submission_refs: NotRequired[list[str]]
    drift_refs: NotRequired[list[str]]

class RunManifestProviderEnvironment(TypedDict, total=False):
    provider_name: Required[str]
    provider_environment: Required[str]
    api_base_profile: NotRequired[str | None]
    api_version: NotRequired[str | None]
    schema_version: NotRequired[str | None]
    fraud_header_profile_ref: NotRequired[str | None]
    token_binding_profile_ref: NotRequired[str | None]
    compatible_product_chain_refs: NotRequired[list[str]]

class RunManifestConfigEntry(TypedDict, total=False):
    config_type: Required[str]
    version_id: Required[str]
    content_hash: Required[str]
    status_at_freeze: Required[Literal["DRAFT", "CANDIDATE", "VERIFIED", "APPROVED", "DEPRECATED", "REVOKED"]]
    effective_scope: Required[str | None]
    effective_from: Required[ISO8601DateTimeString]
    effective_to: Required[ISO8601DateTimeString]
    ccr_id: Required[str | None]
    test_suite_refs: Required[list[str]]
    provider_api_version: Required[str | None]
    provider_schema_version: Required[str | None]
    environment_allowlist: Required[list[str]]
    compatibility_class: Required[str | None]
    superseded_by_version_id: Required[str | None]

class RunManifestConfigFreeze(TypedDict, total=False):
    config_freeze_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["ConfigFreeze"]]
    entries: Required[JSONValue]
    config_freeze_hash: Required[str]
    schema_bundle_hash: Required[str]
    feature_flag_snapshot_hash: Required[str | None]
    config_surface_hash: Required[str]
    config_completeness_state: Required[Literal["COMPLETE_REQUIRED_CONFIG_SET"]]
    config_resolution_basis: Required[Literal["DIRECT_REQUEST_RESOLUTION", "REPLAY_EXACT_REUSE", "RECOVERY_EXACT_REUSE", "HISTORICAL_EXPLICIT_REUSE"]]
    source_config_freeze_ref: Required[str | None]
    source_config_freeze_hash: Required[str | None]
    source_config_surface_hash: Required[str | None]
    config_consumption_mode: Required[Literal["FROZEN_CONFIG_ONLY"]]
    approval_snapshot_ref: Required[str]
    materiality_profile_ref: Required[str]
    amendment_materiality_profile_ref: Required[str]
    retention_profile_ref: Required[str]
    provider_contract_profile_ref: Required[str]
    workflow_policy_ref: Required[str]
    override_policy_ref: Required[str]
    masking_export_policy_ref: Required[str]
    canonicalization_rules_ref: Required[str]
    connector_mapping_rules_ref: Required[str]
    parity_threshold_profile_ref: Required[str]
    trust_threshold_profile_ref: Required[str]
    risk_threshold_profile_ref: Required[str]
    evidence_confidence_policy_ref: Required[str]
    computation_rules_ref: Required[str]
    required_config_types_present: Required[Literal[["COMPUTATION_RULES","PARITY_THRESHOLDS","TRUST_THRESHOLDS","RISK_THRESHOLDS","WORKFLOW_POLICY","OVERRIDE_POLICY","RETENTION_POLICY","EVIDENCE_CONFIDENCE_POLICY","CANONICALIZATION_RULES","CONNECTOR_MAPPING_RULES","PROVIDER_CONTRACT_PROFILE","MATERIALITY_PROFILE","AMENDMENT_MATERIALITY_PROFILE","MASKING_EXPORT_POLICY"]]]

class RunManifestInputFreeze(TypedDict, total=False):
    input_freeze_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["InputFreeze"]]
    source_plan_ref: Required[str]
    source_plan_hash: Required[str]
    collection_boundary_ref: Required[str]
    collection_boundary_hash: Required[str]
    input_policy_ref: Required[str]
    source_window_ref: Required[str]
    source_window_hash: Required[str]
    read_cutoff_at: Required[ISO8601DateTimeString]
    provider_environment_refs: Required[list[str]]
    provider_api_versions: Required[list[str]]
    provider_schema_versions: Required[list[str]]
    connector_profile_ref: Required[str]
    connector_build_id: Required[str]
    cursor_checkpoint_refs: Required[list[str]]
    request_audit_refs: Required[list[str]]
    late_data_policy_bindings: Required[list[LateDataPolicyBinding]]
    source_record_refs: Required[list[str]]
    evidence_item_refs: Required[list[str]]
    candidate_fact_refs: Required[list[str]]
    canonical_fact_refs: Required[list[str]]
    exclusion_refs: Required[list[str]]
    no_data_confirmed_declarations: Required[list[str]]
    conflict_refs: Required[list[str]]
    open_conflict_count: Required[int]
    blocking_conflict_count: Required[int]
    resolution_frontier: Required[Literal["CLEAR", "MONITORING_ONLY", "BLOCKING_PRESENT"]]
    dominant_blocking_class: Required[Literal["BLOCKS_AUTOMATION", "BLOCKS_REVIEW_PROGRESS", "BLOCKS_FILING", "BLOCKS_AMENDMENT", "BLOCKS_ERASURE", "BLOCKS_RUN", "BLOCKS_AUTHORITY_CALL", None]]
    missing_source_declarations: Required[list[str]]
    stale_source_declarations: Required[list[str]]
    source_domain_postures: Required[list[dict[str, JSONValue]]]
    normalization_context_ref: Required[str]
    normalization_context_hash: Required[str]
    artifact_contract_refs: Required[list[str]]
    artifact_contract_hash: Required[str]
    input_set_hash: Required[str]
    input_consumption_mode: Required[Literal["FROZEN_INPUT_ONLY"]]
    late_data_adoption_policy: Required[Literal["CHILD_REVIEW_OR_EXCLUDE_ONLY"]]
    contract: Required[SchemaBundle]

class RunManifestHashSet(TypedDict, total=False):
    access_binding_hash: Required[str]
    config_freeze_hash: Required[str]
    config_surface_hash: Required[str]
    input_set_hash: Required[str]
    execution_basis_hash: Required[str]
    manifest_hash: Required[str]

class RunManifestContinuationSet(TypedDict, total=False):
    root_manifest_id: Required[str | None]
    parent_manifest_id: Required[str | None]
    continuation_of_manifest_id: Required[str | None]
    replay_of_manifest_id: Required[str | None]
    supersedes_manifest_id: Required[str | None]
    manifest_generation: Required[int]
    parent_manifest_hash_at_branch: Required[str | None]
    inherited_config_freeze_ref: Required[str | None]
    fresh_resolution_reason_code: Required[str | None]
    inherited_input_freeze_ref: Required[str | None]
    fresh_collection_reason_code: Required[str | None]
    config_inheritance_mode: Required[Literal["FRESH_CHILD_RESOLUTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    input_inheritance_mode: Required[Literal["FRESH_CHILD_COLLECTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]

class RunManifestFrozenExecutionBinding(TypedDict, total=False):
    manifest_id: Required[str]
    manifest_hash: Required[str]
    execution_basis_hash: Required[str]
    continuation_basis: Required[Literal["NEW_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]]
    root_manifest_id: Required[str]
    parent_manifest_id: Required[str | None]
    continuation_of_manifest_id: Required[str | None]
    replay_of_manifest_id: Required[str | None]
    supersedes_manifest_id: Required[str | None]
    manifest_generation: Required[int]
    parent_manifest_hash_at_branch: Required[str | None]
    config_inheritance_mode: Required[Literal["FRESH_CHILD_RESOLUTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    input_inheritance_mode: Required[Literal["FRESH_CHILD_COLLECTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    inherited_config_freeze_ref: Required[str | None]
    fresh_resolution_reason_code: Required[str | None]
    inherited_input_freeze_ref: Required[str | None]
    fresh_collection_reason_code: Required[str | None]
    config_freeze_ref: Required[str]
    config_freeze_hash: Required[str]
    config_surface_hash: Required[str]
    config_resolution_basis: Required[Literal["DIRECT_REQUEST_RESOLUTION", "REPLAY_EXACT_REUSE", "RECOVERY_EXACT_REUSE", "HISTORICAL_EXPLICIT_REUSE"]]
    input_freeze_ref: Required[str]
    input_set_hash: Required[str]
    source_plan_ref: Required[str]
    source_plan_hash: Required[str]
    source_window_ref: Required[str]
    source_window_hash: Required[str]
    collection_boundary_ref: Required[str]
    collection_boundary_hash: Required[str]
    normalization_context_ref: Required[str]
    normalization_context_hash: Required[str]
    requested_scope: Required[RunManifestScopeArray]
    executable_scope: Required[RunManifestScopeArray]
    scope_execution_binding: Required[ScopeExecutionBinding]
    access_binding_hash: Required[str]
    environment_ref: Required[Literal["DEV", "TEST", "UAT", "SANDBOX", "PRODUCTION"]]
    provider_environment_refs: Required[list[RunManifestProviderEnvironment]]
    code_build_id: Required[str]
    schema_bundle_hash: Required[str]
    feature_flag_snapshot_hash: Required[str | None]
    deterministic_seed: Required[str]
    authority_context_ref: Required[str | None]
    config_consumption_mode: Required[Literal["FROZEN_CONFIG_ONLY"]]
    input_consumption_mode: Required[Literal["FROZEN_INPUT_ONLY"]]
    worker_consumption_mode: Required[Literal["MANIFEST_BOUND_ONLY"]]

class RunManifestPostSealBasis(TypedDict, total=False):
    basis_state: Required[Literal["NULL_SENTINEL", "MATERIAL"]]
    post_seal_basis_hash: Required[str]
    authority_context_ref: Required[str | None]
    authority_context_hash: Required[str | None]
    late_data_monitor_result_ref: Required[str | None]
    late_data_monitor_result_hash: Required[str | None]
    baseline_envelope_refs: Required[list[str]]
    baseline_envelope_hashes: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    temporal_propagation_event_hashes: Required[list[str]]
    authority_calculation_result_refs: Required[list[str]]
    authority_calculation_result_hashes: Required[list[str]]
    drift_record_refs: Required[list[str]]
    drift_record_hashes: Required[list[str]]

class RunManifestAppendOnlyOutcomeProjection(TypedDict, total=False):
    projection_generation: Required[int]
    projection_hash: Required[str]
    post_seal_basis: Required[RunManifestPostSealBasis]
    gating_decisions: Required[list[GateDecisionRecord]]
    output_refs: Required[RunManifestOutputLinkMap]
    audit_refs: Required[list[str]]
    submission_refs: Required[list[str]]
    drift_refs: Required[list[str]]
    decision_bundle_hash: Required[str | None]
    deterministic_outcome_hash: Required[str | None]
    replay_attestation_ref: Required[str | None]

class RunManifestOutputLinkEntry(TypedDict, total=False):
    linkage_role_code: Required[Literal["DECISION_BUNDLE", "FILING_CASE", "AMENDMENT_CASE", "PRIMARY_PROOF_BUNDLE", "EVIDENCE_GRAPH", "PARITY_RESULT", "TWIN_VIEW", "FILING_PACKET", "SUBMISSION_RECORD", "REPLAY_ATTESTATION", "DRIFT_RECORD", "OTHER"]]
    artifact_type: Required[str]
    artifact_ref: Required[str]
    artifact_hash_or_null: Required[str | None]
    produced_by_manifest_id: Required[str]
    dependency_identity_refs: Required[list[str]]

class RunManifestOutputLinkMap(TypedDict, total=False):
    pass

class RunManifestAccessDecision(TypedDict, total=False):
    decision: Required[Literal["ALLOW", "ALLOW_MASKED"]]
    reason_codes: Required[list[str]]
    effective_scope: Required[list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]]
    masking_rules: Required[list[str]]
    required_approvals: Required[list[str]]
    required_authn_level: Required[None]

class RunManifestGateDecision(TypedDict, total=False):
    gate_decision_id: Required[str]
    manifest_id: Required[str]
    gate_code: Required[str]
    gate_class: Required[Literal["NON_ACCESS"]]
    decision: Required[Literal["PASS", "PASS_WITH_NOTICE", "MANUAL_REVIEW", "OVERRIDABLE_BLOCK", "HARD_BLOCK"]]
    reason_codes: Required[list[str]]
    severity: Required[Literal["INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL"]]
    metrics: NotRequired[dict[str, JSONValue]]
    overrideability: Required[Literal["NONE", "SCOPED_OVERRIDE_ALLOWED", "SCOPED_OVERRIDE_REQUIRED", "NON_OVERRIDEABLE"]]
    required_override_scope: NotRequired[str | None]
    next_action_codes: NotRequired[list[str]]
    policy_version_ref: Required[str]
    decided_at: Required[ISO8601DateTimeString]
    effective_scope: NotRequired[list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]]

RunManifestSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/run_manifest.schema.json",
    "source_hash": "17d4fad61503e2a8ebd437a2398de9ea3ec466af2537fc7cc2e7d2777ef232a4",
}

class StreamRecoveryContract(TypedDict, total=False):
    contract_version: Required[Literal["STREAM_RECOVERY_V1"]]
    stream_scope_class: Required[Literal["MANIFEST_EXPERIENCE", "WORKSPACE"]]
    route_key: Required[str]
    subject_ref: Required[str]
    shell_stability_token: Required[str]
    session_ref: Required[str]
    session_binding_hash: Required[str]
    access_binding_hash: Required[str]
    masking_context_hash: Required[str]
    publication_generation: Required[int]
    frame_epoch: Required[int]
    last_published_sequence: Required[int]
    compaction_floor_sequence_or_null: Required[int | None]
    resume_binding_representation: Required[Literal["RAW_TOKEN", "HASHED_TOKEN"]]
    resume_binding_ref_or_null: Required[str | None]
    delivery_window_state: Required[Literal["LIVE_RESUMABLE", "REBASE_REQUIRED", "ACCESS_REBIND_REQUIRED", "SNAPSHOT_ONLY"]]
    rebase_reason_code_or_null: Required[Literal["FRAME_EPOCH_ADVANCED", "HISTORY_COMPACTED", "SHELL_STABILITY_CHANGED", "ROUTE_CONTEXT_CHANGED", "SESSION_BINDING_CHANGED", "ACCESS_BINDING_CHANGED", "MASKING_POSTURE_CHANGED", "SCHEMA_INCOMPATIBLE", None]]
    resume_token_binding_mode: Required[Literal["EXACT_ROUTE_SESSION_SCOPE_MASKING"]]
    sequence_application_policy: Required[Literal["STRICTLY_MONOTONIC_GAP_FREE_WITHIN_EPOCH"]]
    duplicate_delivery_policy: Required[Literal["IDEMPOTENT_BY_SCOPE_EPOCH_SEQUENCE"]]
    catch_up_policy: Required[Literal["CATCH_UP_BEFORE_LIVE"]]
    rebase_trigger_policy: Required[Literal["REBASE_ON_EPOCH_ADVANCE_OR_COMPACTION_OR_CONTEXT_DRIFT"]]

StreamRecoveryContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/stream_recovery_contract.schema.json",
    "source_hash": "06cb7418b7e2c3b762fb82c9e487b14747c15d356a56303d00c9b8e3f3c7c416",
}

class SubmissionRecord(TypedDict, total=False):
    artifact_type: Required[Literal["SubmissionRecord"]]
    submission_id: Required[str]
    manifest_id: Required[str]
    client_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    provider_environment: Required[str]
    authority_scope: Required[str]
    operation_family: Required[str]
    basis_type: Required[str]
    attempt_lineage_manifest_id: Required[str]
    obligation_ref: Required[str | None]
    packet_ref: Required[str | None]
    request_envelope_ref: Required[str | None]
    authority_truth_contract: Required[AuthorityTruthContract]
    request_identity_contract: Required[AuthorityRequestIdentityContract | None]
    idempotency_key: Required[str | None]
    authority_ingress_proof_contract: Required[AuthorityIngressProofContract | None]
    lifecycle_state: Required[Literal["INTENT_RECORDED", "TRANSMIT_PENDING", "TRANSMITTED", "PENDING_ACK", "CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND", "SUPERSEDED"]]
    state_transition_contract: Required[StateTransitionContract]
    authority_reference: Required[str | None]
    request_hash: Required[str | None]
    identity_namespace_hash: Required[str]
    duplicate_meaning_key: Required[str]
    response_ref: Required[str | None]
    correlation_refs: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    baseline_type: Required[Literal["WORKING", "FILED", "AMENDED", "AUTHORITY_CORRECTED", "OUT_OF_BAND", None]]
    reconciliation_deadline_at: Required[ISO8601DateTimeString]
    reconciliation_control_contract_or_null: Required[AuthorityReconciliationControlContract | None]
    authority_evidence_ref: Required[str | None]
    proof_bundle_ref: Required[str | None]
    proof_bundle_hash: Required[str | None]
    rejection_reason_codes: Required[list[str]]
    superseded_by_submission_id: Required[str | None]
    state_changed_at: Required[ISO8601DateTimeString]

SubmissionRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/submission_record.schema.json",
    "source_hash": "17da58f11a731851ab655f4508b62869419f372addc0bb4d764c7b0e33ff279a",
}

class TemporalPropagationEvent(TypedDict, total=False):
    artifact_type: Required[Literal["TemporalPropagationEvent"]]
    temporal_event_id: Required[str]
    manifest_id: Required[str]
    event_class: Required[Literal["LATE_DATA_INVALIDATION", "AUTHORITY_CORRECTION", "OUT_OF_BAND_DISCOVERY", "TEMPORAL_UNCERTAINTY_BLOCK"]]
    active_exact_scope_key: Required[str]
    affected_scope_refs: Required[list[str]]
    affected_submission_refs: Required[list[str]]
    source_late_data_monitor_ref_or_null: Required[str | None]
    source_late_data_finding_refs: Required[list[str]]
    source_authority_basis_refs: Required[list[str]]
    source_baseline_envelope_ref_or_null: Required[str | None]
    source_drift_ref_or_null: Required[str | None]
    trust_effect: Required[Literal["NONE", "RECALC_REQUIRED"]]
    proof_effect: Required[Literal["NONE", "STALE_REVALIDATION_REQUIRED"]]
    baseline_effect: Required[Literal["NONE", "SCOPE_SLICED_REBUILD_REQUIRED"]]
    retroactive_effect: Required[Literal["NONE", "ANALYSIS_REQUIRED"]]
    amendment_effect: Required[Literal["NONE", "INVALIDATE_READINESS_REUSE", "RECONCILE_FIRST"]]
    replay_effect: Required[Literal["NOT_MATERIAL", "HISTORICAL_EVENT_REQUIRED", "LIMITED_COMPARISON_ONLY"]]
    mirror_reopen_effect: Required[Literal["NONE", "REOPEN_REQUIRED"]]
    historical_reuse_policy: Required[Literal["NO_FRESH_RECLASSIFICATION"]]
    reason_codes: Required[list[str]]
    emitted_at: Required[ISO8601DateTimeString]
    event_hash: Required[str]

TemporalPropagationEventSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/temporal_propagation_event.schema.json",
    "source_hash": "34a5ef1377692154a184249f80f6346d88dcaf91119cb300d029f78f6eb943f9",
}

class TwinDeltaArc(TypedDict, total=False):
    artifact_type: Required[Literal["TwinDeltaArc"]]
    delta_arc_id: Required[str]
    twin_id: Required[str]
    timeline_ref: Required[str]
    comparison_key: Required[str]
    comparison_key_profile_code: Required[Literal["TWIN_KEY_V1_SHA256"]]
    subject_identity_code: Required[str]
    reporting_scope_ref_or_null: Required[str | None]
    authority_scope_ref_or_null: Required[str | None]
    business_partition_ref_or_null: Required[str | None]
    period_ref_or_null: Required[str | None]
    basis_type_or_null: Required[str | None]
    lineage_anchor_ref_or_null: Required[str | None]
    left_lane_code: Required[Literal["INTERNAL_COMPUTED"]]
    right_lane_code: Required[Literal["AUTHORITY"]]
    subject_ref: Required[str]
    subject_class: Required[Literal["FACT", "TOTAL", "FILING", "ACKNOWLEDGEMENT", "STATUS", "OBLIGATION", "DECLARED_BASIS"]]
    delta_class: Required[Literal["MATCH_EXACT", "MATCH_EQUIVALENT", "VALUE_MISMATCH", "TOTAL_MISMATCH", "STATUS_MISMATCH", "BASIS_MISMATCH", "TIMELINE_LAG", "TIMELINE_GAP", "INTERNAL_ONLY", "AUTHORITY_ONLY", "ACK_PENDING", "ACK_PARTIAL", "ACK_CONTRADICTORY", "REJECTED_OR_REVERSED", "OUT_OF_BAND", "BASELINE_MISSING", "STALE_COMPARISON", "LIMITED_VISIBILITY", "REPLAY_NON_AUTHORITATIVE"]]
    comparability_state: Required[Literal["COMPARABLE", "WAITING_ON_AUTHORITY", "PARTIALLY_COMPARABLE", "NON_COMPARABLE", "OUT_OF_BAND", "CONTRADICTORY"]]
    comparability_reason_code: Required[Literal["NONE", "BASELINE_MISSING", "STALE_COMPARISON", "LIMITED_VISIBILITY", "REPLAY_NON_AUTHORITATIVE", "ACK_PENDING", "ACK_PARTIAL", "ACK_CONTRADICTORY", "OUT_OF_BAND", "CONTRADICTION_COMPONENTS"]]
    delta_precedence_rank: Required[int]
    materiality_class: Required[Literal["NONE", "INFORMATIONAL", "REVIEW", "MATERIAL", "BLOCKING"]]
    resolution_class: Required[Literal["NONE", "REFRESH_TWIN", "WAIT_FOR_AUTHORITY", "RUN_RECONCILIATION", "OPEN_REVIEW", "PREPARE_AMENDMENT"]]
    priority_rank: Required[int]
    baseline_state: Required[Literal["NOT_APPLICABLE", "PROVED", "PARTIAL", "MISSING", "STALE"]]
    confidence_state: Required[Literal["HIGH", "MEDIUM", "LOW", "LIMITED"]]
    freshness_state: Required[Literal["LIVE", "RECENT", "STALE", "LIMITED"]]
    explanation_ref: Required[str | None]
    parity_delta_ref: Required[str | None]
    equivalence_reason_codes: Required[list[str]]
    blocking_reason_codes: Required[list[str]]
    left_subject_refs: Required[list[str]]
    right_subject_refs: Required[list[str]]
    contradiction_component_refs: Required[list[str]]
    limitation_codes: Required[list[str]]
    left_observed_at: Required[ISO8601DateTimeString]
    right_observed_at: Required[ISO8601DateTimeString]
    resolution_deadline_at: Required[ISO8601DateTimeString]
    last_compared_at: Required[ISO8601DateTimeString]

TwinDeltaArcSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_delta_arc.schema.json",
    "source_hash": "bd4a4ca534d8f8a7da711ff6a72af7db915c80fabca4b3e6ea042bced49be276",
}

class TwinInterpretationState(TypedDict, total=False):
    artifact_type: Required[Literal["TwinInterpretationState"]]
    twin_interpretation_state_id: Required[str]
    twin_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    generated_from_surface: Required[Literal["TWIN_PANEL"]]
    default_view_space: Required[Literal["SOURCE_SPACE", "COMPUTATION_SPACE", "AUTHORITY_SPACE"]]
    enabled_view_spaces: Required[list[Literal["SOURCE_SPACE", "COMPUTATION_SPACE", "AUTHORITY_SPACE"]]]
    compare_mode: Required[Literal["LOCKED", "DELTA_COMPARE", "PINNED_COMPARE"]]
    pinned_object_ref: Required[str | None]
    active_delta_arc_ref: Required[str | None]
    focus_anchor_ref: Required[str | None]
    show_confidence_overlay: Required[bool]
    show_freshness_overlay: Required[bool]
    preserve_focus_across_refresh: Required[bool]
    default_sort_mode: Required[Literal["PRIORITY_RANK", "TIMELINE", "SUBJECT_CLASS"]]
    default_noise_filter: Required[Literal["ACTIONABLE_ONLY", "REVIEW_AND_ABOVE", "ALL_MISMATCHES"]]
    summary_priority_mode: Required[Literal["ACTIONABILITY_FIRST", "AUTHORITY_FIRST", "AUDIT_FIRST"]]
    dominant_attention_state: Required[Literal["READY", "REVIEW_REQUIRED", "WAITING_ON_AUTHORITY", "RECONCILIATION_REQUIRED", "NON_COMPARABLE", "OUT_OF_BAND", "CONTRADICTORY"]]
    dominant_delta_arc_ref_or_null: Required[str | None]
    dominant_reconciliation_state_ref_or_null: Required[str | None]
    collapse_matches_by_default: Required[bool]
    suppress_informational_when_higher_severity_present: Required[bool]
    authority_first_summary: Required[bool]

TwinInterpretationStateSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_interpretation_state.schema.json",
    "source_hash": "b9b7492d2965f7c2fa93a24ef203c710e8b60a6cf1538c2ad16699ad1ec33fff",
}

class TwinMismatchSummary(TypedDict, total=False):
    artifact_type: Required[Literal["TwinMismatchSummary"]]
    mismatch_summary_id: Required[str]
    twin_id: Required[str]
    ranking_profile_code: Required[Literal["TWIN_MISMATCH_SORT_V1"]]
    total_subject_count: Required[int]
    matched_count: Required[int]
    mismatch_count: Required[int]
    comparable_mismatch_count: Required[int]
    waiting_count: Required[int]
    partial_ack_count: Required[int]
    non_comparable_count: Required[int]
    contradictory_count: Required[int]
    blocking_count: Required[int]
    material_count: Required[int]
    review_count: Required[int]
    informational_count: Required[int]
    limited_count: Required[int]
    stale_count: Required[int]
    out_of_band_count: Required[int]
    highest_priority_rank: Required[int]
    highest_materiality_class: Required[Literal["NONE", "INFORMATIONAL", "REVIEW", "MATERIAL", "BLOCKING"]]
    top_mismatch_refs: Required[list[str]]
    top_ranked_mismatches: Required[list[dict[str, JSONValue]]]
    suppressed_match_count: Required[int]
    generated_at: Required[ISO8601DateTimeString]

TwinMismatchSummarySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_mismatch_summary.schema.json",
    "source_hash": "095d3484945ed224163d79bcba81df7584d198ffba0786aca4f5c8b8d712651a",
}

class TwinPortfolioSummary(TypedDict, total=False):
    artifact_type: Required[Literal["TwinPortfolioSummary"]]
    twin_portfolio_summary_id: Required[str]
    tenant_id: Required[str]
    scope_ref: Required[str]
    generated_at: Required[ISO8601DateTimeString]
    total_twin_count: Required[int]
    ready_count: Required[int]
    review_required_count: Required[int]
    waiting_on_authority_count: Required[int]
    reconciliation_required_count: Required[int]
    blocked_count: Required[int]
    stale_twin_count: Required[int]
    out_of_band_twin_count: Required[int]
    highest_attention_rank: Required[int]
    top_twin_refs: Required[list[str]]
    top_mismatch_refs: Required[list[str]]

TwinPortfolioSummarySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_portfolio_summary.schema.json",
    "source_hash": "4733c74716b13f756f7839348a0aa7a6091baa9e9929fcee98a498e0b796c494",
}

class TwinReadinessState(TypedDict, total=False):
    artifact_type: Required[Literal["TwinReadinessState"]]
    twin_readiness_id: Required[str]
    twin_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    filing_readiness: Required[Literal["NOT_READY", "READY_REVIEW", "READY_TO_SUBMIT"]]
    twin_readiness_class: Required[Literal["READY", "REVIEW_REQUIRED", "WAITING_ON_AUTHORITY", "RECONCILIATION_REQUIRED", "BLOCKED"]]
    safe_action_state: Required[Literal["SAFE_TO_ACT", "REVIEW_BEFORE_ACT", "WAIT_ONLY", "REFRESH_REQUIRED", "NO_SAFE_ACTION"]]
    decision_usefulness: Required[Literal["HIGH", "MEDIUM", "LOW", "NONE"]]
    trust_summary_ref: Required[str]
    decision_bundle_ref: Required[str | None]
    gate_decision_refs: Required[list[str]]
    authority_posture: Required[Literal["NOT_REQUESTED", "CURRENT_MATCHED", "CURRENT_MISMATCHED", "PENDING", "PARTIAL", "STALE", "UNKNOWN", "OUT_OF_BAND"]]
    baseline_state: Required[Literal["NOT_APPLICABLE", "PROVED", "PARTIAL", "MISSING", "STALE"]]
    usefulness_cap_reason_codes: Required[list[str]]
    blocking_reason_codes: Required[list[str]]
    review_reason_codes: Required[list[str]]
    unresolved_conflict_refs: Required[list[str]]
    blocking_mismatch_refs: Required[list[str]]
    review_mismatch_refs: Required[list[str]]
    waiting_mismatch_refs: Required[list[str]]
    reconciliation_mismatch_refs: Required[list[str]]
    contradictory_mismatch_refs: Required[list[str]]
    non_comparable_mismatch_refs: Required[list[str]]
    out_of_band_mismatch_refs: Required[list[str]]
    no_safe_action_reason_codes: Required[list[str]]
    last_evaluated_at: Required[ISO8601DateTimeString]

TwinReadinessStateSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_readiness_state.schema.json",
    "source_hash": "0c586923439fa2a11ca21f1601e98ce3fec612fd2dd5041df2e44c12768f46d7",
}

class TwinReconciliationState(TypedDict, total=False):
    artifact_type: Required[Literal["TwinReconciliationState"]]
    twin_reconciliation_state_id: Required[str]
    twin_id: Required[str]
    lifecycle_state: Required[Literal["NOT_REQUIRED", "QUEUED", "IN_PROGRESS", "WAITING_ON_AUTHORITY", "WAITING_ON_OPERATOR", "RESOLVED", "SUPERSEDED"]]
    resolution_state: Required[Literal["NONE", "UNRESOLVED", "PARTIALLY_RESOLVED", "RESOLVED_MATCH", "RESOLVED_OUT_OF_BAND", "RESOLVED_REJECTED", "RESOLVED_AMENDED_BASELINE"]]
    target_mismatch_refs: Required[list[str]]
    blocking_mismatch_refs: Required[list[str]]
    recommended_action_code: Required[Literal["NONE", "RETRY_AUTHORITY_SYNC", "AWAIT_AUTHORITY", "OPEN_OPERATOR_WORKFLOW", "RUN_MANUAL_RECONCILIATION", "PREPARE_AMENDMENT_REVIEW", "RECORD_OUT_OF_BAND_RESOLUTION", "RESOLVED", "SUPERSEDED"]]
    reconciliation_budget_state: Required[Literal["NOT_APPLICABLE", "WITHIN_BUDGET", "EXHAUSTED", "MANUAL_ESCALATION"]]
    workflow_item_refs: Required[list[str]]
    primary_workflow_item_ref_or_null: Required[str | None]
    auto_attempt_count: Required[int]
    max_auto_attempts: Required[int]
    reconciliation_deadline_at: Required[ISO8601DateTimeString]
    next_action_owner: Required[Literal["NONE", "SYSTEM", "AUTHORITY", "OPERATOR"]]
    next_action_due_at: Required[ISO8601DateTimeString]
    last_attempted_at: Required[ISO8601DateTimeString]
    resolved_at: Required[ISO8601DateTimeString]
    reason_codes: Required[list[str]]
    generated_at: Required[ISO8601DateTimeString]

TwinReconciliationStateSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_reconciliation_state.schema.json",
    "source_hash": "8c71a8d61bbe56290267892c39e57dcf2badf0efd8120945c6879094cee59117",
}

class TwinStateSnapshot(TypedDict, total=False):
    artifact_type: Required[Literal["TwinStateSnapshot"]]
    twin_state_snapshot_id: Required[str]
    twin_id: Required[str]
    lane_code: Required[Literal["INTERNAL_COMPUTED", "AUTHORITY"]]
    assembly_state: Required[Literal["ASSEMBLED", "PARTIAL", "LIMITED", "STALE", "CONTRADICTORY", "UNAVAILABLE", "SUPERSEDED"]]
    snapshot_role: Required[Literal["WORKING_STATE", "AUTHORITY_OBSERVED"]]
    comparison_key_profile_code: Required[Literal["TWIN_KEY_V1_SHA256"]]
    comparison_basis_ref: Required[str | None]
    baseline_ref: Required[str | None]
    component_refs: Required[list[str]]
    subject_count: Required[int]
    comparable_subject_count: Required[int]
    non_comparable_subject_count: Required[int]
    subject_key_collision_refs: Required[list[str]]
    contradictory_component_refs: Required[list[str]]
    freshness_state: Required[Literal["LIVE", "RECENT", "STALE", "LIMITED"]]
    confidence_state: Required[Literal["HIGH", "MEDIUM", "LOW", "LIMITED"]]
    limitation_codes: Required[list[str]]
    authority_truth_state: Required[Literal["NOT_APPLICABLE", "NOT_REQUESTED", "UNKNOWN", "PENDING_ACK", "PARTIAL_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"]]
    baseline_state: Required[Literal["NOT_APPLICABLE", "PROVED", "PARTIAL", "MISSING", "STALE", "SUPERSEDED"]]
    amendment_position: Required[Literal["NOT_APPLICABLE", "PRE_BASELINE", "FILED_BASELINE", "AMENDED_BASELINE", "AUTHORITY_CORRECTED_BASELINE"]]
    replay_authoritativeness: Required[Literal["LIVE", "REPLAY", "ANALYSIS_ONLY"]]
    as_of: Required[ISO8601DateTimeString]
    stale_after: Required[ISO8601DateTimeString]
    generated_at: Required[ISO8601DateTimeString]

TwinStateSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_state_snapshot.schema.json",
    "source_hash": "b0c6017af313b4c1caecc879f3b6171483c6a241438dd12cf67a722d71236c9f",
}

class TwinTimeline(TypedDict, total=False):
    artifact_type: Required[Literal["TwinTimeline"]]
    twin_timeline_id: Required[str]
    twin_id: Required[str]
    lifecycle_state: Required[Literal["BUILT", "STALE", "SUPERSEDED"]]
    temporal_alignment_state: Required[Literal["LOCKED", "DRIFTING", "DIVERGED"]]
    alignment_score: Required[float]
    primary_anchor_ref: Required[str | None]
    window_start_at: Required[ISO8601DateTimeString]
    window_end_at: Required[ISO8601DateTimeString]
    aligned_anchor_count: Required[int]
    contradictory_anchor_count: Required[int]
    unpaired_anchor_count: Required[int]
    alignment_reason_codes: Required[list[str]]
    lanes: Required[JSONValue]

TwinTimelineSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_timeline.schema.json",
    "source_hash": "1762f32657400ba9c519d49beb89129a175ef86c1ae4e1a3e3255fbe78b7e495",
}

class TwinView(TypedDict, total=False):
    artifact_type: Required[Literal["TwinView"]]
    twin_id: Required[str]
    manifest_id: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    lifecycle_state: Required[Literal["NOT_BUILT", "BUILT", "STALE", "SUPERSEDED"]]
    comparison_key_profile_code: Required[Literal["TWIN_KEY_V1_SHA256"]]
    delta_precedence_profile_code: Required[Literal["TWIN_DELTA_PRECEDENCE_V1"]]
    mismatch_ranking_profile_code: Required[Literal["TWIN_MISMATCH_SORT_V1"]]
    comparison_basis_ref: Required[str | None]
    internal_state_ref: Required[str | None]
    authority_state_ref: Required[str | None]
    timeline_ref: Required[str | None]
    cross_source_delta_refs: Required[list[str]]
    mismatch_summary_ref: Required[str | None]
    readiness_ref: Required[str | None]
    reconciliation_state_ref: Required[str | None]
    interpretation_state_ref: Required[str | None]
    parity_result_ref: Required[str | None]
    built_at: Required[ISO8601DateTimeString]
    stale_at: Required[ISO8601DateTimeString]
    superseded_at: Required[ISO8601DateTimeString]

TwinViewSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/twin_view.schema.json",
    "source_hash": "64311e1d1bb5398904767c42b445844ba7005b35f6ab05e04f8b2aeca19b75d3",
}

class UploadRequestBindingContract(TypedDict, total=False):
    contract_version: Required[Literal["UPLOAD_REQUEST_BINDING_V1"]]
    frozen_tenant_id: Required[str]
    frozen_client_id: Required[str]
    frozen_request_id: Required[str]
    request_identity_ref: Required[str]
    frozen_request_version_ref: Required[str]
    live_request_version_ref: Required[str]
    request_binding_state: Required[Literal["ORIGINAL_CURRENT", "RECONFIRMED_CURRENT", "RECONFIRMATION_REQUIRED", "SUPERSEDED"]]
    binding_resolution_basis: Required[Literal["ORIGINAL_FROZEN_REQUEST", "EXPLICIT_RECONFIRMATION", "ACTIVE_REQUEST_REBASE_PENDING_CONFIRMATION", "ACTIVE_REQUEST_SUPERSEDED"]]
    resume_identity_policy: Required[Literal["RESUME_EXISTING_SESSION_ONLY"]]
    duplicate_session_policy: Required[Literal["NO_DUPLICATE_SESSION_ON_RECONNECT"]]
    duplicate_file_policy: Required[Literal["REUSE_FROZEN_STORAGE_REF_ON_RESUME_OR_RETRY"]]
    inflight_rebase_policy: Required[Literal["IN_FLIGHT_REBASE_PRESERVES_SESSION_UNTIL_TRANSFER_TERMINATES"]]
    stale_completion_policy: Required[Literal["STALE_BYTES_NEVER_SATISFY_CURRENT_REQUEST"]]
    attachment_authority_policy: Required[Literal["ATTACH_ONLY_TO_CURRENT_OR_RECONFIRMED_REQUEST"]]
    next_action_authority_policy: Required[Literal["TRANSFER_AND_BINDING_STATE_DETERMINE_NEXT_ACTION"]]
    cross_device_resume_policy: Required[Literal["CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION"]]
    frozen_binding_scope_hash: Required[str]
    rebase_detected_at_or_null: Required[ISO8601DateTimeString]

UploadRequestBindingContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/upload_request_binding_contract.schema.json",
    "source_hash": "7b18e6aa410b184c61ce007a45da048e816fbeda8a4a2edec2e6fe2791e160a4",
}

type UploadSessionRecoveryHarnessSurfaceClass = Literal["MOBILE", "BROWSER", "DESKTOP"]

type UploadSessionRecoveryHarnessScenarioCode = Literal["MOBILE_RECONNECT", "BROWSER_RELOAD", "STALE_REQUEST_REBASE", "DUPLICATE_ALLOCATION_RETRY", "CHECKSUM_OR_SCANNER_DELAY", "ATTACHMENT_CONFIRMATION", "CROSS_DEVICE_CONTINUATION"]

type UploadSessionRecoveryHarnessCompletionState = Literal["NOT_READY_BYTES_IN_FLIGHT", "NOT_READY_SCAN_OR_VALIDATION_PENDING", "NOT_READY_ATTACHMENT_CONFIRMATION_PENDING", "NOT_READY_STALE_RECONFIRM_REQUIRED", "READY_CURRENT_REQUEST_SATISFIED"]

class UploadSessionRecoveryHarness(TypedDict, total=False):
    contract_version: Required[Literal["UPLOAD_SESSION_RECOVERY_HARNESS_V1"]]
    harness_id: Required[str]
    deterministic_seed: Required[int]
    suite_profile: Required[Literal["RESUMABLE_UPLOAD_RECONNECT_REBASE_AND_DUPLICATE_MATRIX"]]
    run_mode: Required[Literal["DETERMINISTIC_SESSION_RECOVERY_ENUMERATION"]]
    identity_policy: Required[Literal["FROZEN_TENANT_CLIENT_REQUEST_AND_VERSION_SCOPE"]]
    resume_policy: Required[Literal["RESUME_EXISTING_SESSION_AND_STORAGE_REF_ONLY"]]
    rebase_policy: Required[Literal["LIVE_REQUEST_VERSION_MAY_ADVANCE_FROZEN_VERSION_MAY_NOT"]]
    completion_policy: Required[Literal["TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION"]]
    duplicate_policy: Required[Literal["NO_DUPLICATE_SESSION_OR_STORAGE_REF_ON_RETRY_OR_CROSS_DEVICE_RESUME"]]
    recovery_action_policy: Required[Literal["NEXT_ACTION_AND_RESUMABILITY_STATE_GOVERN_ALL_RECOVERY"]]
    cases: Required[list[UploadSessionRecoveryHarnessHarnessCase]]

class UploadSessionRecoveryHarnessSessionSnapshot(TypedDict, total=False):
    upload_session_id: Required[str]
    storage_ref: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    request_id: Required[str]
    frozen_request_version_ref: Required[str]
    live_request_version_ref: Required[str]
    request_binding_state: Required[Literal["ORIGINAL_CURRENT", "RECONFIRMED_CURRENT", "RECONFIRMATION_REQUIRED", "SUPERSEDED"]]
    resumability_state: Required[Literal["RESUMABLE", "RESTART_REQUIRED", "CLOSED"]]
    attachment_state: Required[Literal["STAGED", "CONFIRMATION_REQUIRED", "ATTACHED", "REBIND_REQUIRED"]]
    transfer_state: Required[Literal["QUEUED", "UPLOADING", "SCANNING", "ACCEPTED", "REJECTED", "FAILED"]]
    integrity_state: Required[Literal["PENDING", "VERIFIED", "FAILED"]]
    malware_scan_state: Required[Literal["PENDING", "CLEAN", "QUARANTINED"]]
    validation_state: Required[Literal["PENDING", "ACCEPTED", "REJECTED", "REQUIRES_REPLACEMENT"]]
    next_action_code: Required[Literal["NONE", "RESUME_UPLOAD", "CONFIRM_ATTACHMENT", "RECONFIRM_REQUEST", "RETRY_UPLOAD", "UPLOAD_REPLACEMENT", "CONTACT_SUPPORT"]]
    byte_count: Required[int]
    bytes_transferred: Required[int]
    upload_confidence_score: Required[int]
    resume_token_ref_or_null: Required[str | None]
    attached_document_ref_or_null: Required[str | None]
    attachment_confirmed_at_or_null: Required[ISO8601DateTimeString]

class UploadSessionRecoveryHarnessRequestProjectionSnapshot(TypedDict, total=False):
    request_id: Required[str]
    request_version_ref: Required[str]
    latest_upload_ref_or_null: Required[str | None]
    current_request_upload_ref_or_null: Required[str | None]

class UploadSessionRecoveryHarnessHarnessCase(TypedDict, total=False):
    case_id: Required[str]
    scenario_code: Required[UploadSessionRecoveryHarnessScenarioCode]
    entry_surface_class: Required[UploadSessionRecoveryHarnessSurfaceClass]
    resume_surface_class: Required[UploadSessionRecoveryHarnessSurfaceClass]
    duplicate_session_created: Required[Literal[False]]
    duplicate_storage_ref_created: Required[Literal[False]]
    expected_request_completion_state: Required[UploadSessionRecoveryHarnessCompletionState]
    pre_session: Required[UploadSessionRecoveryHarnessSessionSnapshot]
    post_session: Required[UploadSessionRecoveryHarnessSessionSnapshot]
    post_request_projection: Required[UploadSessionRecoveryHarnessRequestProjectionSnapshot]

UploadSessionRecoveryHarnessSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/upload_session_recovery_harness.schema.json",
    "source_hash": "68c683f58ddb2795f1d5d905bd37b659ef6e16c16eca6303731b7588c701d96c",
}

class VerificationSuiteResult(TypedDict, total=False):
    suite_result_id: Required[str]
    suite_family: Required[Literal["SCHEMA_COMPATIBILITY", "DETERMINISTIC_AND_STATE_MACHINE", "NORTHBOUND_API", "AUTHORITY_SANDBOX", "OPERATOR_CLIENT", "SECURITY", "PERFORMANCE_AND_CANARY", "RESTORE_DRILL", "MIGRATION_VERIFICATION", "SUPPLY_CHAIN", "SUITE_ADMISSIBILITY"]]
    candidate_environment_ref: Required[str]
    build_artifact_ref: Required[str]
    artifact_digest: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    schema_bundle_hash: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    schema_bundle_compatibility_gate_contract: Required[SchemaBundleCompatibilityGateContract]
    config_bundle_hash: Required[str]
    migration_plan_ref: Required[str | None]
    enabled_provider_profile_refs: Required[list[str]]
    authority_sandbox_coverage_contract_or_null: Required[AuthoritySandboxCoverageContract | None]
    supported_client_window_ref: Required[str | None]
    restore_drill_ref: Required[str | None]
    restore_checkpoint_ref: Required[str | None]
    deterministic_golden_pack_ref: Required[str | None]
    test_run_identifiers: Required[list[str]]
    result_state: Required[Literal["PASSED", "FAILED", "ERROR"]]
    result_summary_ref: Required[str]
    executed_at: Required[ISO8601DateTimeString]

VerificationSuiteResultSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/verification_suite_result.schema.json",
    "source_hash": "16d98c98d60378245e8ec9761a60f24e67d2033ffb5161d9f31a86a59d3ab307",
}

class VisibilityPartitionContract(TypedDict, total=False):
    partition_scope: Required[Literal["WORKSPACE_SNAPSHOT", "WORKSPACE_STREAM_EVENT", "WORK_INBOX_SNAPSHOT", "WORK_INBOX_DELTA", "CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST", "COLLABORATION_ACTIVITY_SLICE", "COLLABORATION_ATTACHMENT_SLICE", "WORK_ITEM_NOTIFICATION"]]
    audience_class: Required[Literal["STAFF", "CUSTOMER_COLLABORATION", "CLIENT_PORTAL"]]
    allowed_visibility_classes: Required[list[Literal["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]]]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    cache_partition_key: Required[str]
    badge_counter_policy: Required[Literal["SPLIT_LANE_COUNTS", "SURFACE_VISIBLE_ONLY", "NO_BADGES"]]
    ordering_side_channel_policy: Required[Literal["VISIBLE_EVENTS_ONLY", "SEGMENTED_VISIBLE_EVENTS_ONLY", "CANONICAL_LIST_ONLY"]]
    limited_state_presentation: Required[Literal["EXPLICIT_LIMITATION_NOTICE"]]
    export_scope_policy: Required[Literal["MOUNTED_ROUTE_VISIBILITY_ONLY"]]
    fallback_discovery_policy: Required[Literal["NO_CROSS_PARTITION_DISCOVERY"]]

VisibilityPartitionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/visibility_partition_contract.schema.json",
    "source_hash": "12b1bdad17162a04e0943cf9a89a50f94544d65334d329311625f6a57f634a12",
}

class WorkflowItem(TypedDict, total=False):
    artifact_type: Required[Literal["WorkflowItem"]]
    item_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    period: Required[str]
    type: Required[str]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    lifecycle_state: Required[Literal["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "WAITING_ON_AUTHORITY", "BLOCKED", "DONE", "CANCELLED", "STALE"]]
    state_transition_contract: Required[StateTransitionContract]
    priority: Required[Literal["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"]]
    due_at: Required[ISO8601DateTimeString]
    context_refs: Required[list[str]]
    title: Required[str]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    authority_truth_contract: Required[AuthorityTruthContract]
    collaboration_visibility: Required[Literal["INTERNAL_ONLY", "CUSTOMER_SHARED"]]
    authority_truth_state: Required[Literal["NOT_APPLICABLE", "NOT_REQUESTED", "UNKNOWN", "PENDING_ACK", "PARTIAL_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"]]
    customer_status_projection: Required[Literal["UNDER_REVIEW", "ACTION_REQUIRED", "WAITING_ON_CONFIRMATION", "RESOLVED", "CLOSED", None]]
    current_assignee_ref: Required[str | None]
    assignment_state: Required[Literal["UNASSIGNED", "ASSIGNED", "ESCALATED"]]
    escalation_target_ref: Required[str | None]
    routing_queue_ref: Required[str]
    routing_contract: Required[CollaborationRoutingContract]
    waiting_on_actor: Required[Literal["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM"]]
    sla_policy_ref: Required[str | None]
    sla_due_at: Required[ISO8601DateTimeString]
    customer_due_at: Required[ISO8601DateTimeString]
    due_state: Required[Literal["ON_TRACK", "DUE_SOON", "OVERDUE", "BREACHED", None]]
    queue_entered_at: Required[ISO8601DateTimeString]
    last_assignment_at: Required[ISO8601DateTimeString]
    waiting_since_at: Required[ISO8601DateTimeString]
    reassignment_count_30d: Required[int]
    ownership_confidence_score: Required[int]
    assignment_efficiency_score: Required[int]
    sla_pressure_score: Required[int]
    escalation_pressure_score: Required[int]
    collaboration_priority_score: Required[int]
    resolution_confidence_score: Required[int]
    customer_thread_ref: Required[str | None]
    internal_thread_ref: Required[str]
    staff_workspace_version: Required[int]
    customer_workspace_version: Required[int]
    active_request_info_ref: Required[str | None]
    next_request_info_ordinal: Required[int]
    last_customer_activity_at: Required[ISO8601DateTimeString]
    last_internal_activity_at: Required[ISO8601DateTimeString]
    last_customer_visible_event_ref: Required[str | None]
    last_internal_event_ref: Required[str | None]
    dedupe_key: Required[str]
    closed_at: Required[ISO8601DateTimeString]

WorkflowItemSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/workflow_item.schema.json",
    "source_hash": "8272d23e3a9a0c66800f155d377f96df0a97f733c1669451a97cf4e6cff9fc57",
}

DomainWorkflowAndFilingBindingManifest = {"family_ref": "DOMAIN_WORKFLOW_AND_FILING", "schema_count": 52}
