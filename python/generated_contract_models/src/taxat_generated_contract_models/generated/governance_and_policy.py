"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class AcceptedRiskApproval(TypedDict, total=False):
    accepted_risk_approval_id: Required[str]
    error_id: Required[str]
    manifest_id: Required[str]
    root_manifest_id: Required[str]
    failure_resolution_contract: Required[FailureResolutionContract]
    decision_basis: Required[Literal["EXPLICIT_APPROVAL", "POLICY_BASIS"]]
    approval_state: Required[Literal["ACTIVE", "EXPIRED", "REVOKED", "SUPERSEDED"]]
    approver_type: Required[Literal["APPROVER", "TENANT_ADMIN", "SECURITY_OPERATOR", "SYSTEM_POLICY"]]
    approver_ref: Required[str | None]
    policy_basis_ref: Required[str | None]
    retention_class: Required[Literal["regulated_record", "derived_artifact", "operational_log", "analytics_projection", "policy_governed_other", None]]
    artifact_retention_ref: Required[str | None]
    workflow_item_id: Required[str | None]
    rationale_ref: Required[str]
    bounded_scope_refs: Required[list[str]]
    approved_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    revoked_at: Required[ISO8601DateTimeString]
    superseded_by_approval_id: Required[str | None]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

AcceptedRiskApprovalSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/accepted_risk_approval.schema.json",
    "source_hash": "4a813e45226ffac57abbba56b162d2e41a26ceac425e5ff6728a55204f4d09d1",
}

type AuditInvestigationFrameSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type AuditInvestigationFrameRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type AuditInvestigationFrameWorkspaceMode = Literal["EVENT_TIMELINE", "OBJECT_TIMELINE", "CORRELATION_TRACE"]

type AuditInvestigationFramePromotedSupportSurface = Literal["AUDIT_SIDECAR", "EXPORT_ELIGIBILITY_PANEL"]

type AuditInvestigationFrameTimelineMode = Literal["APPEND_ONLY"]

type AuditInvestigationFrameNeighborhoodMode = Literal["UPSTREAM_DOWNSTREAM"]

type AuditInvestigationFrameEventDiffPanelMode = Literal["CHANGE_NUCLEI", "MASKED_CHANGE_NUCLEI", "LIMITATION_NOTICE"]

type AuditInvestigationFrameRawPayloadPosture = Literal["SUMMARY_FIRST"]

type AuditInvestigationFrameExportPanelMode = Literal["FULL_EXPORT_READY", "MASKED_EXPORT_ONLY", "APPROVAL_GATE", "DENIED_NOTICE"]

type AuditInvestigationFrameInvocationPosture = Literal["ACTIVE_FILTERED_SLICE"]

class AuditInvestigationFrame(TypedDict, total=False):
    frame_id: Required[str]
    artifact_type: Required[Literal["AuditInvestigationFrame"]]
    tenant_id: Required[str]
    shell_family: Required[Literal["GOVERNANCE_DENSITY_SHELL"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    query_contract_code: Required[Literal["AUDIT_TRAIL", "RUN_TIMELINE", "NIGHTLY_BATCH_TIMELINE", "FILING_EVIDENCE_LEDGER", "PRIVACY_ACTION_LEDGER"]]
    query_anchor_ref: Required[str]
    ordering_basis: Required[Literal["AUDIT_STREAM_SEQUENCE", "RECORDED_AT_THEN_STREAM_SEQUENCE"]]
    settlement_state: Required[AuditInvestigationFrameSettlementState]
    recovery_posture: Required[AuditInvestigationFrameRecoveryPosture]
    interaction_layer: Required[GovernanceInteractionLayer]
    focus_anchor_ref: Required[str]
    ordered_event_refs: Required[list[str]]
    supporting_trace_span_refs: Required[list[str]]
    supporting_log_record_refs: Required[list[str]]
    correlation_keys: Required[list[str]]
    integrity_chain_posture: Required[Literal["VERIFIED", "PARTIAL_GAP", "BROKEN", "PENDING_REBUILD"]]
    export_posture: Required[AuditInvestigationFrameExportPosture]
    externalization_governance_contract: Required[ExternalizationGovernanceContract]
    active_filters: Required[AuditInvestigationFrameActiveFilters]
    audit_workspace: Required[AuditInvestigationFrameAuditWorkspace]
    audit_tape: Required[AuditInvestigationFrameAuditTape]
    object_neighborhood: Required[AuditInvestigationFrameObjectNeighborhood]
    event_diff_inspector: Required[AuditInvestigationFrameEventDiffInspector]
    export_eligibility_panel: Required[AuditInvestigationFrameExportEligibilityPanel]
    object_neighborhood_refs: Required[list[str]]
    next_cursor: NotRequired[str | None]
    updated_at: Required[ISO8601DateTimeString]

class AuditInvestigationFrameInteractionLayer(TypedDict, total=False):
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]

class AuditInvestigationFrameExportPosture(TypedDict, total=False):
    state: Required[Literal["FULL_ALLOWED", "MASKED_ONLY", "APPROVAL_REQUIRED", "DENIED"]]
    reason_codes: Required[list[str]]

class AuditInvestigationFrameActiveFilters(TypedDict, total=False):
    actor_refs: Required[list[str]]
    event_families: Required[list[str]]
    client_refs: Required[list[str]]
    manifest_refs: Required[list[str]]
    authority_operation_refs: Required[list[str]]
    object_refs: Required[list[str]]
    window_from: Required[ISO8601DateTimeString]
    window_to: Required[ISO8601DateTimeString]

class AuditInvestigationFrameAuditWorkspace(TypedDict, total=False):
    surface_order: Required[Literal[["INVENTORY_RAIL","WORKSPACE_CANVAS","EVENT_DIFF_INSPECTOR","AUDIT_SIDECAR"]]]
    workspace_mode: Required[AuditInvestigationFrameWorkspaceMode]
    active_filters: Required[AuditInvestigationFrameActiveFilters]
    selected_event_ref: Required[str]
    selected_object_ref_or_null: Required[str | None]
    promoted_support_surface: Required[AuditInvestigationFramePromotedSupportSurface]

class AuditInvestigationFrameAuditTapeRow(TypedDict, total=False):
    event_ref: Required[str]
    family_ref: Required[str]
    actor_or_service_ref_or_null: Required[str | None]
    primary_object_ref_or_null: Required[str | None]
    diff_available: Required[bool]

class AuditInvestigationFrameAuditTape(TypedDict, total=False):
    timeline_mode: Required[AuditInvestigationFrameTimelineMode]
    rows: Required[list[AuditInvestigationFrameAuditTapeRow]]
    selected_event_ref: Required[str]

class AuditInvestigationFrameObjectNeighborhood(TypedDict, total=False):
    neighborhood_mode: Required[AuditInvestigationFrameNeighborhoodMode]
    object_refs: Required[list[str]]
    selected_object_ref_or_null: Required[str | None]
    upstream_event_refs: Required[list[str]]
    selected_event_ref: Required[str]
    downstream_event_refs: Required[list[str]]

class AuditInvestigationFrameEventDiffInspector(TypedDict, total=False):
    panel_mode: Required[AuditInvestigationFrameEventDiffPanelMode]
    baseline_event_ref_or_null: Required[str | None]
    comparison_event_ref_or_null: Required[str | None]
    summary_ref_or_null: Required[str | None]
    changed_field_refs: Required[list[str]]
    raw_payload_posture: Required[AuditInvestigationFrameRawPayloadPosture]

class AuditInvestigationFrameExportEligibilityPanel(TypedDict, total=False):
    panel_mode: Required[AuditInvestigationFrameExportPanelMode]
    state: Required[Literal["FULL_ALLOWED", "MASKED_ONLY", "APPROVAL_REQUIRED", "DENIED"]]
    reason_codes: Required[list[str]]
    active_slice_scope_ref: Required[str]
    masked_preview_ref_or_null: Required[str | None]
    approval_requirement_ref_or_null: Required[str | None]
    invocation_posture: Required[AuditInvestigationFrameInvocationPosture]

AuditInvestigationFrameSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/audit_investigation_frame.schema.json",
    "source_hash": "da722027734a4912d7c128864c83942c88c373ebcbf473022eece8970e4e61f4",
}

class ConfigChangeRequest(TypedDict, total=False):
    artifact_type: Required[Literal["ConfigChangeRequest"]]
    ccr_id: Required[str]
    tenant_id: Required[str]
    lifecycle_state: Required[Literal["OPEN", "UNDER_REVIEW", "TESTING", "APPROVED", "REJECTED", "IMPLEMENTED", "ROLLED_BACK"]]
    state_transition_contract: Required[StateTransitionContract]
    diff_ref: Required[str]
    risk_assessment_ref: Required[str]
    approvals: Required[list[str]]
    rejected_reason_code_or_null: Required[str | None]
    implemented_release_ref_or_null: Required[str | None]
    rolled_back_release_ref_or_null: Required[str | None]
    state_changed_at: Required[ISO8601DateTimeString]
    created_at: Required[ISO8601DateTimeString]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

ConfigChangeRequestSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/config_change_request.schema.json",
    "source_hash": "93226f7dd63647dcc8861f2241aaa60be2fbd27738fd600abaea363f9513f862",
}

class ConfigFreeze(TypedDict, total=False):
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

class ConfigFreezeConfigEntry(TypedDict, total=False):
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

ConfigFreezeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/config_freeze.schema.json",
    "source_hash": "1f26e4494c27f052e93e42c424741fb32830b22a938be7c46c2754ca0d531c3e",
}

class ConfigVersion(TypedDict, total=False):
    artifact_type: Required[Literal["ConfigVersion"]]
    version_id: Required[str]
    config_type: Required[str]
    lifecycle_state: Required[Literal["DRAFT", "CANDIDATE", "VERIFIED", "APPROVED", "DEPRECATED", "REVOKED", "RETIRED"]]
    state_transition_contract: Required[StateTransitionContract]
    content_hash: Required[str]
    effective_scope: Required[list[str]]
    approvals: Required[list[str]]
    verification_evidence_ref_or_null: Required[str | None]
    approved_at_or_null: Required[ISO8601DateTimeString]
    superseded_by_version_id_or_null: Required[str | None]
    revocation_reason_code_or_null: Required[str | None]
    retired_at_or_null: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]
    created_at: Required[ISO8601DateTimeString]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

ConfigVersionSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/config_version.schema.json",
    "source_hash": "0f529937c9f6f689a0e1fbf82c23a121b7c0fea1175aa9305168cfff69d1ffd0",
}

type FeatureFlagSnapshotJsonValue = str | float | bool | None | list[FeatureFlagSnapshotJsonValue] | dict[str, FeatureFlagSnapshotJsonValue]

class FeatureFlagSnapshot(TypedDict, total=False):
    feature_flag_snapshot_id: Required[str]
    artifact_type: Required[Literal["FeatureFlagSnapshot"]]
    surface_state: Required[Literal["GOVERNED_FLAG_SURFACE_PRESENT", "NO_GOVERNED_FLAG_SURFACE"]]
    provider_adapter_ref_or_null: Required[str | None]
    provider_environment_ref_or_null: Required[str | None]
    provider_contract_profile_ref_or_null: Required[str | None]
    evaluation_context: Required[dict[str, JSONValue]]
    entries: Required[list[FeatureFlagSnapshotEntry]]
    ordered_flag_keys: Required[list[str]]
    feature_flag_snapshot_hash: Required[str | None]

class FeatureFlagSnapshotEntry(TypedDict, total=False):
    flag_key: Required[str]
    enabled: Required[bool]
    variant_ref_or_null: Required[str | None]
    value_json: Required[FeatureFlagSnapshotJsonValue]
    default_value_json: Required[FeatureFlagSnapshotJsonValue | None]
    rule_ref_or_null: Required[str | None]
    reason_code: Required[Literal["TARGETING_MATCH", "STATIC_DEFAULT", "NO_GOVERNED_FLAG_SURFACE"]]

FeatureFlagSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/feature_flag_snapshot.schema.json",
    "source_hash": "78887a7dd894d2e27f63927e213319c44fde362719cc0d3d6bab1756b39731ce",
}

type GovernanceAccessSimulationChainLayerOutcome = Literal["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY", "NOT_APPLICABLE"]

type GovernanceAccessSimulationSimulatorPosture = Literal["READ_ONLY_DECISION", "ADVISORY_ONLY", "APPROVAL_GATED", "BOUNDED_SAFE"]

type GovernanceAccessSimulationSessionAuthnLayer = GovernanceAccessSimulationAuthorityChainLayerBase

type GovernanceAccessSimulationTenantOperationalAuthorityLayer = GovernanceAccessSimulationAuthorityChainLayerBase

type GovernanceAccessSimulationClientDelegationCoverageLayer = GovernanceAccessSimulationAuthorityChainLayerBase

type GovernanceAccessSimulationExternalAuthorityLinkReadinessLayer = GovernanceAccessSimulationAuthorityChainLayerBase

type GovernanceAccessSimulationAuthorityOfRecordOutcomeLayer = GovernanceAccessSimulationAuthorityChainLayerBase

type GovernanceAccessSimulationAuthorityChainLayerStack = list[GovernanceAccessSimulationAuthorityOfRecordOutcomeLayer]

type GovernanceAccessSimulationMutationHazard = GovernanceMutationHazardContract

class GovernanceAccessSimulation(TypedDict, total=False):
    artifact_type: Required[Literal["GovernanceAccessSimulation"]]
    simulation_id: Required[str]
    tenant_id: Required[str]
    policy_snapshot_hash: Required[str]
    principal_context_ref: Required[str]
    governance_target_ref: Required[str | None]
    resource_class: Required[str]
    action_family: Required[str]
    requested_scope: Required[list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]]
    requested_partition_scope_refs: Required[list[str]]
    authorization_decision: Required[AuthorizationDecision]
    authority_layer_boundary: Required[AuthorityLayerBoundaryContract]
    authority_chain_layers: Required[GovernanceAccessSimulationAuthorityChainLayerStack]
    simulator_posture: Required[GovernanceAccessSimulationSimulatorPosture]
    mutation_hazard: Required[None | GovernanceAccessSimulationMutationHazard]
    mutation_basis_contract: Required[None | GovernanceMutationBasisContract]
    simulated_at: Required[ISO8601DateTimeString]

class GovernanceAccessSimulationAuthorityChainLayerBase(TypedDict, total=False):
    layer_code: Required[str]
    layer_outcome: Required[GovernanceAccessSimulationChainLayerOutcome]
    reason_codes: Required[list[str]]

GovernanceAccessSimulationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/governance_access_simulation.schema.json",
    "source_hash": "55616c7b0580b9de0f26f63079a791f68bded02f3cb803c25dee8259bd2665cc",
}

class GovernanceInteractionLayer(TypedDict, total=False):
    foundation_contract: Required[InteractionLayerFoundationContract]
    density_profile: Required[Literal["GOVERNANCE_DENSITY_PROFILE_V1"]]
    inventory_filter_grammar: Required[Literal["CANONICAL_ROUTE_FILTER_GRAMMAR"]]
    support_surface_policy: Required[Literal["ONE_PROMOTED_SUPPORT_SURFACE_MAX"]]
    diff_basket_policy: Required[Literal["STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT"]]
    export_binding_policy: Required[Literal["ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT"]]
    keyboard_focus_policy: Required[Literal["RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION"]]
    selector_profile: Required[Literal["GOVERNANCE_SEMANTIC_SELECTORS_V1"]]
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]
    motion_profile: Required[Literal["SUBTLE_CAUSAL_ONLY"]]
    feedback_truth_policy: Required[Literal["DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN"]]

GovernanceInteractionLayerSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/governance_interaction_layer.schema.json",
    "source_hash": "c0a51af44c626ce29574e93da9bdab4aa0afb58f94bc5c0697864a8de1efdce5",
}

class GovernanceMutationBasisContract(TypedDict, total=False):
    contract_version: Required[Literal["GOVERNANCE_MUTATION_BASIS_CONTRACT_V1"]]
    basis_contract_hash: Required[str]
    policy_snapshot_hash: Required[str]
    access_binding_hash: Required[str]
    dependency_topology_hash: Required[str]
    simulation_basis_hash: Required[str]
    hazard_contract_hash: Required[str]
    commit_authority_posture: Required[Literal["PREVIEW_ONLY", "APPROVAL_GATED", "BOUNDED_SAFE"]]
    approval_requirement: Required[Literal["NOT_REQUIRED", "SINGLE_APPROVER", "DUAL_APPROVER", "SECURITY_REVIEW", "CHANGE_ADVISORY_QUORUM"]]
    bounded_safe_mutation: Required[Literal[0, 1]]
    required_approvals: Required[list[str]]
    simulation_confidence_score: Required[int]
    predictability_score: Required[int]

GovernanceMutationBasisContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/governance_mutation_basis_contract.schema.json",
    "source_hash": "1064ce38b226d23fcb44181e3d6b41353a6a567cc99e0e1bc702350fecddbfbc",
}

type GovernanceMutationHazardContractImpactedCountClass = Literal["ZERO", "ONE", "SMALL_BATCH", "MEDIUM_BATCH", "LARGE_BATCH", "ESTATE_WIDE"]

type GovernanceMutationHazardContractRiskDriverCode = Literal["PRIVILEGE_GAIN", "SCOPE_EXPANSION", "MASKING_RELAXATION", "BROAD_BLAST_RADIUS"]

type GovernanceMutationHazardContractApprovalTriggerCode = Literal["SINGLE_APPROVER_REQUIRED", "DUAL_APPROVER_REQUIRED", "SECURITY_REVIEW_REQUIRED", "CHANGE_ADVISORY_QUORUM_REQUIRED"]

type GovernanceMutationHazardContractConfidenceLimiterCode = Literal["LOW_SIMULATION_CONFIDENCE", "LOW_PREDICTABILITY"]

type GovernanceMutationHazardContractBoundedSafetyBlockerCode = Literal["PRIVILEGE_GAIN_PRESENT", "SCOPE_EXPANSION_PRESENT", "MASKING_RELAXATION_PRESENT", "IMPACT_RADIUS_TOO_LARGE", "POLICY_RISK_TOO_HIGH", "CONFIDENCE_TOO_LOW", "PREDICTABILITY_TOO_LOW"]

class GovernanceMutationHazardContract(TypedDict, total=False):
    contract_version: Required[Literal["GOVERNANCE_MUTATION_HAZARD_CONTRACT_V1"]]
    hazard_contract_hash: Required[str]
    policy_snapshot_hash: Required[str]
    access_binding_hash: Required[str]
    dependency_topology_hash: Required[str]
    simulation_basis_hash: Required[str]
    count_class_profile_code: Required[Literal["GOVERNANCE_IMPACT_COUNT_CLASS_V1"]]
    commit_authority_posture: Required[Literal["PREVIEW_ONLY", "APPROVAL_GATED", "BOUNDED_SAFE"]]
    impact_radius_lower_score: Required[int]
    impact_radius_upper_score: Required[int]
    impacted_principal_count: Required[int]
    impacted_principal_count_class: Required[GovernanceMutationHazardContractImpactedCountClass]
    impacted_client_count: Required[int]
    impacted_client_count_class: Required[GovernanceMutationHazardContractImpactedCountClass]
    impacted_authority_operation_count: Required[int]
    impacted_authority_operation_count_class: Required[GovernanceMutationHazardContractImpactedCountClass]
    impacted_workflow_count: Required[int]
    impacted_workflow_count_class: Required[GovernanceMutationHazardContractImpactedCountClass]
    impacted_limitation_count: Required[int]
    impacted_limitation_count_class: Required[GovernanceMutationHazardContractImpactedCountClass]
    privilege_gain_score: Required[int]
    scope_expansion_score: Required[int]
    masking_relaxation_score: Required[int]
    policy_risk_score: Required[int]
    approval_necessity_score: Required[int]
    approval_requirement: Required[Literal["NOT_REQUIRED", "SINGLE_APPROVER", "DUAL_APPROVER", "SECURITY_REVIEW", "CHANGE_ADVISORY_QUORUM"]]
    bounded_safe_mutation: Required[Literal[0, 1]]
    required_approvals: Required[list[str]]
    simulation_confidence_score: Required[int]
    predictability_score: Required[int]
    risk_driver_codes: Required[list[GovernanceMutationHazardContractRiskDriverCode]]
    approval_trigger_codes: Required[list[GovernanceMutationHazardContractApprovalTriggerCode]]
    confidence_limiter_codes: Required[list[GovernanceMutationHazardContractConfidenceLimiterCode]]
    bounded_safety_blocker_codes: Required[list[GovernanceMutationHazardContractBoundedSafetyBlockerCode]]
    reason_codes: Required[list[str]]

GovernanceMutationHazardContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/governance_mutation_hazard_contract.schema.json",
    "source_hash": "d944e53b431440ebfa2e437888ce2726377e69e88d3aed78877373d9b5320b5a",
}

type GovernancePolicySnapshotSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type GovernancePolicySnapshotRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type GovernancePolicySnapshotApprovalRequirement = Literal["NOT_REQUIRED", "SINGLE_APPROVER", "DUAL_APPROVER", "SECURITY_REVIEW", "CHANGE_ADVISORY_QUORUM"]

type GovernancePolicySnapshotApprovalRequirementNullable = Literal["NOT_REQUIRED", "SINGLE_APPROVER", "DUAL_APPROVER", "SECURITY_REVIEW", "CHANGE_ADVISORY_QUORUM", None]

type GovernancePolicySnapshotSectionCode = Literal["TENANT_PROFILE", "SECURITY_POSTURE", "AUTHORITY_AND_ENVIRONMENTS", "CONNECTOR_POLICY", "APPROVAL_AND_CHANGE_CONTROL", "NOTIFICATIONS_AND_EVIDENCE"]

class GovernancePolicySnapshot(TypedDict, total=False):
    artifact_type: Required[Literal["GovernancePolicySnapshot"]]
    snapshot_id: Required[str]
    tenant_id: Required[str]
    shell_family: Required[Literal["GOVERNANCE_DENSITY_SHELL"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    settlement_state: Required[GovernancePolicySnapshotSettlementState]
    recovery_posture: Required[GovernancePolicySnapshotRecoveryPosture]
    interaction_layer: Required[GovernanceInteractionLayer]
    cache_isolation_contract: Required[CacheIsolationContract]
    policy_snapshot_hash: Required[str]
    environment_bindings: Required[list[GovernancePolicySnapshotEnvironmentBinding]]
    session_security_posture: Required[GovernancePolicySnapshotSessionSecurityPosture]
    step_up_rules: Required[list[GovernancePolicySnapshotStepUpRule]]
    approval_rules: Required[list[GovernancePolicySnapshotApprovalRule]]
    masking_defaults: Required[list[str]]
    last_material_change_ref: Required[str]
    tenant_config_workspace: Required[GovernancePolicySnapshotTenantConfigWorkspace]
    change_basket: Required[GovernancePolicySnapshotChangeBasket]
    approval_composer: Required[GovernancePolicySnapshotApprovalComposer]
    blast_radius_panel: Required[GovernancePolicySnapshotBlastRadiusPanel]
    config_history_timeline: Required[GovernancePolicySnapshotConfigHistoryTimeline]
    captured_at: Required[ISO8601DateTimeString]

class GovernancePolicySnapshotInteractionLayer(TypedDict, total=False):
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]

class GovernancePolicySnapshotEnvironmentBinding(TypedDict, total=False):
    environment_ref: Required[str]
    provider_environment: Required[str]
    status: Required[Literal["ACTIVE", "READ_ONLY", "DISABLED"]]

class GovernancePolicySnapshotSessionSecurityPosture(TypedDict, total=False):
    browser_session_allowed: Required[bool]
    native_session_allowed: Required[bool]
    automation_session_allowed: Required[bool]
    csrf_binding_required: Required[bool]
    native_device_binding_required: Required[bool]
    step_up_rotation_required: Required[bool]

class GovernancePolicySnapshotStepUpRule(TypedDict, total=False):
    action_family: Required[str]
    required_authn_level: Required[Literal["BASIC", "MFA", "STEP_UP"]]
    reason_codes: Required[list[str]]

class GovernancePolicySnapshotApprovalRule(TypedDict, total=False):
    action_family: Required[str]
    approval_required: Required[bool]
    approval_scope: Required[str | None]

class GovernancePolicySnapshotInlinePolicyHelp(TypedDict, total=False):
    help_mode: Required[Literal["INLINE"]]
    help_refs: Required[list[str]]

class GovernancePolicySnapshotTenantConfigWorkspace(TypedDict, total=False):
    surface_order: Required[Literal[["SECTION_NAV","CONFIG_FORM","INLINE_POLICY_HELP","BLAST_RADIUS_PANEL","CHANGE_BASKET","APPROVAL_COMPOSER","CONFIG_HISTORY_TIMELINE"]]]
    section_nav_order: Required[Literal[["TENANT_PROFILE","SECURITY_POSTURE","AUTHORITY_AND_ENVIRONMENTS","CONNECTOR_POLICY","APPROVAL_AND_CHANGE_CONTROL","NOTIFICATIONS_AND_EVIDENCE"]]]
    active_section_code: Required[GovernancePolicySnapshotSectionCode]
    visible_form_section_refs: Required[list[str]]
    inline_policy_help: Required[GovernancePolicySnapshotInlinePolicyHelp]

class GovernancePolicySnapshotStagedChange(TypedDict, total=False):
    change_ref: Required[str]
    field_ref: Required[str]
    current_value_label: Required[str]
    proposed_value_label: Required[str]
    effective_scope_label: Required[str]
    reason_required: Required[bool]
    approval_required: Required[bool]
    audit_event_families: Required[list[str]]
    input_commit_mode: Required[Literal["EXPLICIT_STAGE"]]

class GovernancePolicySnapshotStagedChangeGroup(TypedDict, total=False):
    object_type: Required[str]
    mutation_hazard: Required[GovernanceMutationHazardContract]
    mutation_basis_contract: Required[GovernanceMutationBasisContract]
    staged_changes: Required[list[GovernancePolicySnapshotStagedChange]]

class GovernancePolicySnapshotChangeBasket(TypedDict, total=False):
    basket_state: Required[Literal["EMPTY", "DRAFTING", "READY_TO_SUBMIT", "STEP_UP_REQUIRED", "STALE_REBASE_REQUIRED", "RECEIPT_PENDING"]]
    simulation_atomicity: Required[Literal["EMPTY", "ATOMIC", "MIXED_BASIS_BLOCKED", "STALE_BASIS_BLOCKED"]]
    submission_enabled: Required[bool]
    active_simulation_basis_hash: Required[str | None]
    active_dependency_topology_hash: Required[str | None]
    active_mutation_hazard_or_null: Required[None | GovernanceMutationHazardContract]
    active_mutation_basis_contract_or_null: Required[None | GovernanceMutationBasisContract]
    step_up_pending: Required[bool]
    approval_requirement: Required[GovernancePolicySnapshotApprovalRequirementNullable]
    bounded_safe_mutation: Required[Literal[0, 1, None]]
    required_approvals: Required[list[str]]
    staged_change_groups: Required[list[GovernancePolicySnapshotStagedChangeGroup]]

class GovernancePolicySnapshotApprovalComposer(TypedDict, total=False):
    composer_state: Required[Literal["NOT_REQUIRED", "DRAFT", "READY", "SUBMITTED"]]
    requested_approver_scope: Required[list[str]]
    related_object_refs: Required[list[str]]
    rationale_required: Required[bool]
    rationale_ref: Required[str | None]
    expires_at: Required[ISO8601DateTimeString]
    mutation_basis_contract_or_null: Required[None | GovernanceMutationBasisContract]

class GovernancePolicySnapshotBlastRadiusPanel(TypedDict, total=False):
    panel_state: Required[Literal["EMPTY", "ACTIVE", "STALE"]]
    mutation_hazard_or_null: Required[None | GovernanceMutationHazardContract]
    mutation_basis_contract_or_null: Required[None | GovernanceMutationBasisContract]

class GovernancePolicySnapshotConfigHistoryTimeline(TypedDict, total=False):
    timeline_state: Required[Literal["CURRENT", "REBASE_REQUIRED", "HISTORICAL_REVIEW"]]
    latest_change_ref: Required[str]
    selected_change_ref: Required[str]
    visible_change_refs: Required[list[str]]

GovernancePolicySnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/governance_policy_snapshot.schema.json",
    "source_hash": "7c1c26fae0b4f05b0cdfdba8ba26090359cafb3c616bc11083a3d90746473f35",
}

type RetentionGovernanceFrameSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type RetentionGovernanceFrameRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type RetentionGovernanceFrameWorkspaceMode = Literal["POLICIES", "LEGAL_HOLDS", "ERASURE"]

type RetentionGovernanceFramePromotedSupportSurface = Literal["AUDIT_SIDECAR", "RETENTION_IMPACT_PREVIEW"]

type RetentionGovernanceFrameWarningPosture = Literal["NONE", "STATUTORY_BLOCK", "LEGAL_HOLD_BLOCK", "DESTRUCTIVE_REVIEW", "APPROVAL_OR_STEP_UP_REQUIRED"]

type RetentionGovernanceFrameLegalHoldState = Literal["ACTIVE", "RELEASE_ELIGIBLE", "RELEASED"]

type RetentionGovernanceFrameReleaseEligibilityState = Literal["BLOCKED", "RELEASE_ELIGIBLE", "NOT_APPLICABLE"]

type RetentionGovernanceFrameErasureReadinessState = Literal["ELIGIBLE", "BLOCKED", "PENDING_REVIEW"]

type RetentionGovernanceFrameOverrideState = Literal["NONE", "APPLIED", "PENDING_APPROVAL", "BLOCKED_BY_STATUTORY_MINIMUM"]

class RetentionGovernanceFrame(TypedDict, total=False):
    frame_id: Required[str]
    artifact_type: Required[Literal["RetentionGovernanceFrame"]]
    tenant_id: Required[str]
    shell_family: Required[Literal["GOVERNANCE_DENSITY_SHELL"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    settlement_state: Required[RetentionGovernanceFrameSettlementState]
    recovery_posture: Required[RetentionGovernanceFrameRecoveryPosture]
    interaction_layer: Required[GovernanceInteractionLayer]
    policy_snapshot_hash: Required[str]
    focus_anchor_ref: Required[str]
    artifact_rows: Required[list[RetentionGovernanceFrameRetentionArtifactRow]]
    legal_hold_count: Required[int]
    erasure_queue_count: Required[int]
    limitation_count: Required[int]
    legal_hold_register_ref: Required[str]
    erasure_queue_ref: Required[str]
    retention_workspace: Required[RetentionGovernanceFrameRetentionWorkspace]
    retention_policy_matrix: Required[RetentionGovernanceFrameRetentionPolicyMatrix]
    legal_hold_register: Required[RetentionGovernanceFrameLegalHoldRegister]
    erasure_queue: Required[RetentionGovernanceFrameErasureQueue]
    retention_impact_preview: Required[RetentionGovernanceFrameRetentionImpactPreview]
    updated_at: Required[ISO8601DateTimeString]

class RetentionGovernanceFrameInteractionLayer(TypedDict, total=False):
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]

class RetentionGovernanceFrameRetentionWorkspaceFilters(TypedDict, total=False):
    artifact_classes: Required[list[str]]
    retention_classes: Required[list[str]]
    client_refs: Required[list[str]]
    legal_hold_states: Required[list[RetentionGovernanceFrameLegalHoldState]]
    release_eligibility_states: Required[list[RetentionGovernanceFrameReleaseEligibilityState]]
    erasure_readiness_states: Required[list[RetentionGovernanceFrameErasureReadinessState]]

class RetentionGovernanceFrameRetentionWorkspace(TypedDict, total=False):
    surface_order: Required[Literal[["INVENTORY_RAIL","WORKSPACE_CANVAS","RETENTION_IMPACT_PREVIEW","AUDIT_SIDECAR"]]]
    workspace_mode: Required[RetentionGovernanceFrameWorkspaceMode]
    active_filters: Required[RetentionGovernanceFrameRetentionWorkspaceFilters]
    selected_policy_row_ref: Required[str | None]
    selected_legal_hold_ref: Required[str | None]
    selected_erasure_item_ref: Required[str | None]
    promoted_support_surface: Required[RetentionGovernanceFramePromotedSupportSurface]
    warning_posture: Required[RetentionGovernanceFrameWarningPosture]

class RetentionGovernanceFrameRetentionArtifactRow(TypedDict, total=False):
    row_ref: Required[str]
    artifact_class: Required[str]
    retention_class: Required[str]
    statutory_minimum_ref: Required[str]
    tenant_override_ref: Required[str | None]
    effective_minimum_ref: Required[str]
    override_state: Required[RetentionGovernanceFrameOverrideState]
    pseudonymisation_mode: Required[str]
    limitation_behavior: Required[str]
    export_posture: Required[Literal["FULL", "MASKED", "LIMITED", "DENIED"]]
    legal_hold_count: Required[int]
    erasure_eligible_count: Required[int]
    limitation_count: Required[int]
    affected_artifact_count: Required[int]
    warning_posture: Required[RetentionGovernanceFrameWarningPosture]
    inline_warning_ref_or_null: Required[str | None]
    blocking_reason_refs: Required[list[str]]
    staged_change_ref_or_null: Required[str | None]
    legal_hold_register_ref_or_null: Required[str | None]
    erasure_queue_ref_or_null: Required[str | None]

class RetentionGovernanceFrameRetentionPolicyMatrix(TypedDict, total=False):
    column_order: Required[Literal[["ARTIFACT_CLASS","STATUTORY_BASELINE","TENANT_OVERRIDE","EFFECTIVE_MINIMUM","LIMITATION_BEHAVIOR","PSEUDONYMISATION_MODE","EXPORT_POSTURE"]]]
    row_refs: Required[list[str]]
    selected_row_ref: Required[str | None]
    editing_posture: Required[Literal["EXPLICIT_STAGE_ONLY"]]
    sticky_header_mode: Required[Literal["ROW_AND_COLUMN_HEADERS"]]
    inline_blocker_visibility: Required[Literal["ALWAYS_VISIBLE"]]

class RetentionGovernanceFrameLegalHoldRegister(TypedDict, total=False):
    column_order: Required[Literal[["CLIENT","OBJECT_REF","HOLD_REASON","RELEASE_ELIGIBILITY","BLOCKED_ERASURE_COUNT","LAST_CHANGED_AT"]]]
    hold_refs: Required[list[str]]
    selected_hold_ref_or_null: Required[str | None]
    blocking_hold_refs: Required[list[str]]
    release_candidate_hold_refs: Required[list[str]]
    release_preview_ref_or_null: Required[str | None]
    release_action_posture: Required[Literal["NONE_SELECTED", "PREVIEW_ONLY", "CHANGE_BASKET_REQUIRED"]]

class RetentionGovernanceFrameErasureQueue(TypedDict, total=False):
    section_order: Required[Literal[["ELIGIBLE","BLOCKED","PENDING_REVIEW"]]]
    eligible_item_refs: Required[list[str]]
    blocked_item_refs: Required[list[str]]
    pending_review_item_refs: Required[list[str]]
    selected_item_ref_or_null: Required[str | None]
    destructive_flow_mode: Required[Literal["CHANGE_BASKET_ONLY"]]
    primary_blocker_ref_or_null: Required[str | None]

class RetentionGovernanceFrameRetentionImpactPreview(TypedDict, total=False):
    panel_mode: Required[Literal["RETENTION_IMPACT_PREVIEW"]]
    preview_subject_ref_or_null: Required[str | None]
    preview_mode: Required[Literal["NONE_SELECTED", "POLICY_CHANGE", "HOLD_RELEASE", "ERASURE_ACTION"]]
    warning_posture: Required[RetentionGovernanceFrameWarningPosture]
    blocked_reason_refs: Required[list[str]]
    projected_provenance_limitation_refs: Required[list[str]]
    affected_artifact_count: Required[int]
    affected_client_count: Required[int]
    projected_pseudonymisation_count: Required[int]
    action_posture: Required[Literal["READ_ONLY", "CHANGE_BASKET_REQUIRED", "APPROVAL_OR_STEP_UP_REQUIRED", "BLOCKED"]]

RetentionGovernanceFrameSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/retention_governance_frame.schema.json",
    "source_hash": "75ef270714451fb6cff625372d7365bf01c3813d8ca5b6d5ecdbc617fac9a5df",
}

class RetentionLimitedExplainabilityContract(TypedDict, total=False):
    contract_version: Required[Literal["RETENTION_EXPLAINABILITY_V1"]]
    boundary_scope: Required[Literal["PROOF_BUNDLE", "EVIDENCE_GRAPH", "ENQUIRY_PACK", "AUDIT_EVENT"]]
    surface_role: Required[Literal["FILING_PROOF_ARTIFACT", "GRAPH_EXPLANATION_INDEX", "SCRUTINY_EXPORT_PACK", "AUDIT_RECONSTRUCTION_EVIDENCE"]]
    surface_specific_binding_policy: Required[Literal["PROOF_BUNDLE_RETAINS_DECISIVE_LIMITATION_AND_RETENTION_BINDING", "EVIDENCE_GRAPH_RETAINS_LIMITATION_NOTES_AND_TARGET_EXPLANATION_POSTURE", "ENQUIRY_PACK_RETAINS_LIMITATION_NOTES_OMISSIONS_AND_RETENTION_BINDING", "AUDIT_EVENT_RETAINS_MINIMUM_RECONSTRUCTION_CONTEXT_AFTER_PAYLOAD_EXPIRY"]]
    decisive_limitations_policy: Required[Literal["DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT"]]
    explanation_state_policy: Required[Literal["AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES"]]
    omission_disclosure_policy: Required[Literal["LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE"]]
    audit_sufficiency_policy: Required[Literal["POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM"]]
    present_limited_truth_policy: Required[Literal["RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED"]]
    silent_ambiguity_policy: Required[Literal["SILENT_LIMITATION_AMBIGUITY_FORBIDDEN"]]

RetentionLimitedExplainabilityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json",
    "source_hash": "6d3d1889f4d75ec9cb46fe0fae9a901c7d5c06db8d9b81b35e7782f2d74634d4",
}

class RetentionTag(TypedDict, total=False):
    artifact_type: Required[Literal["RetentionTag"]]
    retention_tag_id: Required[str]
    retention_class: Required[Literal["regulated_record", "derived_artifact", "operational_log", "analytics_projection", "policy_governed_other"]]
    anchor_event: Required[str]
    anchor_timestamp: Required[ISO8601DateTimeString]
    minimum_expiry_at: Required[ISO8601DateTimeString]
    policy_expiry_at: Required[ISO8601DateTimeString]
    effective_expiry_at: Required[ISO8601DateTimeString]
    legal_hold_state: Required[Literal["NONE", "ACTIVE", "RELEASE_ELIGIBLE", "RELEASED"]]
    legal_hold_ref: Required[str | None]
    legal_hold_changed_at: Required[ISO8601DateTimeString]
    erasure_eligibility: Required[Literal["ELIGIBLE", "BLOCKED_LEGAL_HOLD", "BLOCKED_STATUTORY_MINIMUM", "BLOCKED_PROOF_PRESERVATION", "BLOCKED_AUTHORITY_AMBIGUITY"]]
    erasure_decided_at: Required[ISO8601DateTimeString]
    erasure_reason_codes: Required[list[str]]
    pseudonymisation_mode: Required[str]
    limitation_behavior: Required[Literal["NONE", "SURVIVE_WITH_LIMITATION_NOTES", "EXPIRED_PLACEHOLDER_ONLY", "PSEUDONYMISED_SURVIVAL"]]
    limitation_reason_codes: Required[list[str]]
    retention_basis_ref: Required[str]
    proof_preservation_basis_ref: Required[str | None]
    authority_ambiguity_ref: Required[str | None]

RetentionTagSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/retention_tag.schema.json",
    "source_hash": "fe63f3a9a6a0aa79d2ab39160757ae58196b2659551c4308da4429c7e381e9e9",
}

type RoleTemplateMatrixSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type RoleTemplateMatrixRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type RoleTemplateMatrixMatrixDecision = Literal["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"]

type RoleTemplateMatrixMatrixCell = RoleTemplateMatrixCellDetailCore

type RoleTemplateMatrixSelectedActionDetail = RoleTemplateMatrixCellDetailCore

class RoleTemplateMatrix(TypedDict, total=False):
    artifact_type: Required[Literal["RoleTemplateMatrix"]]
    tenant_id: Required[str]
    shell_family: Required[Literal["GOVERNANCE_DENSITY_SHELL"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    settlement_state: Required[RoleTemplateMatrixSettlementState]
    recovery_posture: Required[RoleTemplateMatrixRecoveryPosture]
    interaction_layer: Required[GovernanceInteractionLayer]
    cache_isolation_contract: Required[CacheIsolationContract]
    role_id: Required[str]
    role_label: Required[str]
    policy_snapshot_hash: Required[str]
    version_hash: Required[str]
    focus_anchor_ref: Required[str | None]
    role_matrix_workspace: Required[RoleTemplateMatrixRoleMatrixWorkspace]
    matrix_rows: Required[list[RoleTemplateMatrixMatrixRow]]
    matrix_columns: Required[list[RoleTemplateMatrixMatrixColumn]]
    matrix_cells: Required[list[RoleTemplateMatrixMatrixCell]]
    selected_action_detail: Required[None | RoleTemplateMatrixSelectedActionDetail]
    captured_at: Required[ISO8601DateTimeString]

class RoleTemplateMatrixInteractionLayer(TypedDict, total=False):
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]

class RoleTemplateMatrixActiveFilters(TypedDict, total=False):
    resource_classes: Required[list[str]]
    action_families: Required[list[str]]
    decision_outcomes: Required[list[RoleTemplateMatrixMatrixDecision]]

class RoleTemplateMatrixRoleMatrixWorkspace(TypedDict, total=False):
    surface_order: Required[Literal[["PRINCIPAL_DIRECTORY","WORKSPACE_CANVAS","ACCESS_INSPECTOR","AUTHORITY_CHAIN_PANEL","POLICY_SIMULATOR"]]]
    active_filters: Required[RoleTemplateMatrixActiveFilters]
    selected_role_template_ref: Required[str]
    selected_cell_ref: Required[str | None]
    grid_navigation_model: Required[Literal["ROW_COLUMN_ROVING_TABINDEX"]]
    inspector_state: Required[Literal["HIDDEN", "CELL_SELECTED", "ROLE_EDITING"]]
    promoted_support_surface: Required[Literal["AUDIT_SIDECAR", "POLICY_SIMULATOR"]]
    latest_simulation_ref: Required[str | None]
    role_editor_pending_change_refs: Required[list[str]]

class RoleTemplateMatrixMatrixRow(TypedDict, total=False):
    resource_class: Required[str]
    row_label: Required[str]
    cell_refs: Required[list[str]]

class RoleTemplateMatrixMatrixColumn(TypedDict, total=False):
    action_family: Required[str]
    column_label: Required[str]

class RoleTemplateMatrixCellDetailCore(TypedDict, total=False):
    cell_ref: Required[str]
    resource_class: Required[str]
    action_family: Required[str]
    decision: Required[RoleTemplateMatrixMatrixDecision]
    reason_codes: Required[list[str]]
    effective_scope: Required[list[str]]
    masking_rules: Required[list[str]]
    required_approvals: Required[list[str]]
    required_authn_level: Required[Literal["BASIC", "MFA", "STEP_UP", None]]
    policy_path_ref: Required[str]
    pending_change_ref_or_null: Required[str | None]

RoleTemplateMatrixSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/role_template_matrix.schema.json",
    "source_hash": "cfea778dcba20ea75b73d43872b22603cb1c3e163c639da8ad128afd655a0f5d",
}

class SecretVersion(TypedDict, total=False):
    artifact_type: Required[Literal["SecretVersion"]]
    secret_version_id: Required[str]
    secret_class: Required[str]
    store_ref: Required[str]
    key_version_ref: Required[str]
    policy_profile_ref: Required[str]
    lineage_ref: Required[str]
    issued_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]
    rotation_state: Required[Literal["ISSUED", "ATTESTED", "ACTIVE", "ROTATING", "RETIRED", "REVOKED"]]
    last_attested_at: Required[ISO8601DateTimeString]
    attestation_ref: Required[str | None]
    activated_at: Required[ISO8601DateTimeString]
    rotation_started_at: Required[ISO8601DateTimeString]
    retired_at: Required[ISO8601DateTimeString]
    revoked_at: Required[ISO8601DateTimeString]
    revocation_reason_code: Required[str | None]
    historical_read_window_until: Required[ISO8601DateTimeString]
    superseded_by_secret_version_id: Required[str | None]

SecretVersionSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/secret_version.schema.json",
    "source_hash": "3dc107ec7c8b931bfda08cc44feff3af06eef169afb4d708bc2c82f62d870364",
}

type TenantGovernanceSnapshotSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type TenantGovernanceSnapshotRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

class TenantGovernanceSnapshot(TypedDict, total=False):
    snapshot_id: Required[str]
    artifact_type: Required[Literal["TenantGovernanceSnapshot"]]
    shell_family: Required[Literal["GOVERNANCE_DENSITY_SHELL"]]
    object_anchor_ref: Required[str]
    tenant_id: Required[str]
    environment_ref: Required[str]
    policy_snapshot_hash: Required[str]
    dominant_question: Required[str]
    dominance_contract: Required[ShellDominanceContract]
    state_taxonomy_contract: Required[ShellStateTaxonomyContract]
    cross_device_continuity_contract: Required[CrossDeviceContinuityContract]
    cache_isolation_contract: Required[CacheIsolationContract]
    semantic_accessibility_contract: Required[SemanticAccessibilityContract]
    settlement_state: Required[TenantGovernanceSnapshotSettlementState]
    recovery_posture: Required[TenantGovernanceSnapshotRecoveryPosture]
    interaction_layer: Required[GovernanceInteractionLayer]
    primary_queue_code: Required[Literal["PENDING_APPROVALS", "CONFIGURATION_DRIFT", "AUTHORITY_LINK_RISKS", "RETENTION_EXCEPTIONS", "AUDIT_HOTSPOTS"]]
    primary_worklist_ref: Required[str]
    active_filters: Required[TenantGovernanceSnapshotActiveFilters]
    selected_canvas_object_ref: Required[str | None]
    focus_anchor_ref: Required[str | None]
    pending_approval_count: Required[int]
    risky_configuration_drift_count: Required[int]
    expiring_authority_link_count: Required[int]
    retention_exception_count: Required[int]
    pending_approval_worklist_ref: Required[str]
    configuration_drift_worklist_ref: Required[str]
    authority_link_risk_worklist_ref: Required[str]
    retention_exception_worklist_ref: Required[str]
    audit_hotspot_worklist_ref: Required[str]
    pending_change_worklist_ref: Required[str]
    attention_summary: Required[TenantGovernanceSnapshotAttentionSummary]
    risk_ledger_entries: Required[list[TenantGovernanceSnapshotRiskLedgerEntry]]
    support_region_state: Required[TenantGovernanceSnapshotSupportRegionState]
    authority_link_risk_refs: Required[list[str]]
    retention_exception_refs: Required[list[str]]
    audit_hotspot_refs: Required[list[str]]
    recent_change_refs: Required[list[str]]
    pending_change_refs: Required[list[str]]
    updated_at: Required[ISO8601DateTimeString]

class TenantGovernanceSnapshotInteractionLayer(TypedDict, total=False):
    selected_filter_chip_refs: Required[list[str]]
    compaction_mode: Required[Literal["WIDE", "AUXILIARY_DRAWER", "AUXILIARY_TRAY", "FOCUS_STACK"]]
    auxiliary_surface_presentation: Required[Literal["SIDECAR", "DRAWER", "INSPECTOR", "TRAY"]]
    focus_trap_mode: Required[Literal["NON_MODAL", "MODAL_EXPLICIT"]]
    selection_persistence_mode: Required[Literal["PRESERVE_WHILE_OBJECT_RESOLVES"]]
    preserved_context_codes: Required[list[Literal["ACTIVE_FILTERS", "ACTIVE_SECTION", "SELECTION", "FOCUS_ANCHOR", "PROMOTED_SUPPORT_SURFACE", "STAGED_DIFF", "CHANGE_BASKET", "GUIDED_HANDSHAKE_STEP", "QUERY_SLICE"]]]

class TenantGovernanceSnapshotAttentionSummary(TypedDict, total=False):
    attention_family: Required[Literal["CALM", "PENDING_APPROVALS", "CONFIGURATION_DRIFT", "AUTHORITY_LINK_RISK", "RETENTION_EXCEPTION", "AUDIT_HOTSPOT"]]
    headline: Required[str]
    supporting_text: Required[str | None]
    primary_worklist_ref: Required[str | None]
    primary_action_label: Required[str | None]
    why_now_label: Required[str | None]
    affected_scope_label: Required[str | None]
    next_legal_action_label: Required[str | None]
    secondary_issue_count: Required[int]

class TenantGovernanceSnapshotRiskLedgerEntry(TypedDict, total=False):
    queue_code: Required[Literal["PENDING_APPROVALS", "CONFIGURATION_DRIFT", "AUTHORITY_LINK_RISKS", "RETENTION_EXCEPTIONS", "AUDIT_HOTSPOTS"]]
    headline: Required[str]
    open_count: Required[int]
    worklist_ref: Required[str]
    affected_scope_label: Required[str | None]
    next_action_label: Required[str | None]

class TenantGovernanceSnapshotActiveFilters(TypedDict, total=False):
    environment_ref: Required[str]
    client_refs: Required[list[str]]
    principal_classes: Required[list[Literal["HUMAN", "SERVICE", "EXTERNAL"]]]
    risk_families: Required[list[Literal["PENDING_APPROVALS", "CONFIGURATION_DRIFT", "AUTHORITY_LINK_RISKS", "RETENTION_EXCEPTIONS", "AUDIT_HOTSPOTS"]]]
    change_states: Required[list[str]]

class TenantGovernanceSnapshotSupportRegionState(TypedDict, total=False):
    mode: Required[Literal["NONE", "AUDIT", "BLAST_RADIUS", "DIFF", "EXPORT_ELIGIBILITY", "APPROVAL"]]
    selected_object_ref: Required[str | None]
    reason_code: Required[str | None]

TenantGovernanceSnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/tenant_governance_snapshot.schema.json",
    "source_hash": "c1fab84295a29dae9bcc9cede9c4a32281bdb8665174bb9923d2682711fdba82",
}

GovernanceAndPolicyBindingManifest = {"family_ref": "GOVERNANCE_AND_POLICY", "schema_count": 17}
