"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class ArtifactAffordanceContract(TypedDict, total=False):
    contract_version: Required[Literal["ARTIFACT_AFFORDANCE_V1"]]
    affordance_scope: Required[Literal["CLIENT_DOCUMENT_REQUEST", "CLIENT_APPROVAL_PACK", "COLLABORATION_CUSTOMER_REQUEST", "COLLABORATION_ATTACHMENT_SLICE", "NATIVE_SECONDARY_WINDOW"]]
    primary_slot_policy: Required[Literal["CURRENT_PRIMARY_HISTORY_EXPLICIT"]]
    primary_subject_role: Required[Literal["NO_CURRENT_ARTIFACT", "CURRENT_ARTIFACT", "CURRENT_REQUEST_UPLOAD", "APPROVAL_PACK", "HISTORICAL_CONTEXT"]]
    visible_primary_subject_ref_or_null: Required[str | None]
    header_posture: Required[Literal["CURRENT", "CURRENT_WITH_HISTORY", "AWAITING_CURRENT_REPLACEMENT", "HISTORICAL", "SUPERSEDED", "REJECTED", "EXPIRED", "QUARANTINED"]]
    history_affordance_state: Required[Literal["NONE", "EXPLICIT_SECONDARY", "EXPLICIT_SECONDARY_LIMITED", "HIDDEN_UNTIL_REQUESTED"]]
    preview_open_policy: Required[Literal["CURRENT_SUMMARY_FIRST_ONLY", "CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND"]]
    default_preview_target_ref_or_null: Required[str | None]
    default_download_target_ref_or_null: Required[str | None]
    default_print_target_ref_or_null: Required[str | None]
    label_visibility_policy: Required[Literal["EXPLICIT_POSTURE_LABELS_REQUIRED"]]
    invocation_validation_policy: Required[Literal["VISIBLE_PRIMARY_AND_DEFAULT_TARGETS_MUST_MATCH_GOVERNED_POSTURE"]]

ArtifactAffordanceContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/artifact_affordance_contract.schema.json",
    "source_hash": "af947513eb536bf6ef4870acb48ed2dda57ed4fa9451e7347a30bb736b2276a8",
}

class ArtifactRetention(TypedDict, total=False):
    artifact_type: Required[Literal["ArtifactRetention"]]
    retention_scope_class: Required[Literal["GOVERNED_ARTIFACT"]]
    retention_id: Required[str]
    tenant_id: Required[str]
    artifact_ref: Required[str]
    retention_tag_ref: Required[str]
    retention_class: Required[Literal["regulated_record", "derived_artifact", "operational_log", "analytics_projection", "policy_governed_other"]]
    lifecycle_state: Required[Literal["ACTIVE", "LIMITED", "LEGAL_HOLD", "ERASURE_PENDING", "PSEUDONYMISED", "ERASED"]]
    minimum_expiry_at: Required[ISO8601DateTimeString]
    policy_expiry_at: Required[ISO8601DateTimeString]
    effective_expiry_at: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]
    last_evaluated_at: Required[ISO8601DateTimeString]
    hold_ref: Required[str | None]
    next_checkpoint_at: Required[ISO8601DateTimeString]
    workflow_item_refs: Required[list[str]]
    limitation_behavior: Required[str | None]
    limitation_reason_codes: Required[list[str]]
    erasure_request_ref: Required[str | None]
    erasure_action_ref: Required[str | None]
    erasure_proof_ref: Required[str | None]

ArtifactRetentionSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/artifact_retention.schema.json",
    "source_hash": "e363e549cba2beef1dcf37b8f737dfa0ee6d93e31c54f74e962283f9c03fba65",
}

class ArtifactSelectionContract(TypedDict, total=False):
    selection_scope: Required[Literal["CLIENT_DOCUMENT_REQUEST", "CLIENT_APPROVAL_PACK", "COLLABORATION_CUSTOMER_REQUEST", "COLLABORATION_ATTACHMENT_SLICE"]]
    presentation_mode: Required[Literal["CURRENT_PRIMARY_HISTORY_SECONDARY"]]
    primary_subject_refs: Required[list[str]]
    authoritative_subject_refs: Required[list[str]]
    historical_subject_refs: Required[list[str]]
    limited_history_state: Required[Literal["NONE", "LIMITED", "MASKED_PRESENT"]]
    limited_history_count_or_null: Required[int | None]
    default_preview_target_ref_or_null: Required[str | None]
    default_download_target_ref_or_null: Required[str | None]
    default_print_target_ref_or_null: Required[str | None]

ArtifactSelectionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/artifact_selection_contract.schema.json",
    "source_hash": "de32be087b747f594e253f51f95696cc13b303e474ca4ed225f3578e292d45ac",
}

class CandidateFact(TypedDict, total=False):
    candidate_fact_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["CandidateFact"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    fact_family: Required[Literal["TRANSACTION_FACT", "RECORD_FACT", "CATEGORY_TOTAL_FACT", "ADJUSTMENT_FACT", "PROFILE_FACT", "OBLIGATION_FACT", "SUBMISSION_STATE_FACT", "AUTHORITY_COMPARISON_FACT", "RISK_FEATURE_FACT", "WORKFLOW_CONTEXT_FACT"]]
    value_payload_ref: Required[str]
    confidence: Required[float]
    source_strength_tier: Required[Literal["TIER_1_AUTHORITY_FINAL", "TIER_2_AUTHORITY_REFERENCE", "TIER_3_STRUCTURED_EXTERNAL", "TIER_4_STRUCTURED_INTERNAL", "TIER_5_DOCUMENT_SUPPORT", "TIER_6_DECLARED_ONLY", "TIER_7_INFERRED", "TIER_8_GOVERNANCE_ONLY"]]
    promotion_state: Required[Literal["CANDIDATE", "PROVISIONAL", "CONTESTED", "SUPERSEDED", "RETIRED"]]
    collection_boundary_ref: Required[str]
    normalization_context_ref: Required[str]
    source_record_refs: Required[list[str]]
    source_record_lineage_hash: Required[str]
    supporting_evidence_refs: Required[list[str]]
    evidence_lineage_hash: Required[str]
    partition_scope: Required[str]
    partition_scope_refs: Required[list[str]]
    partition_isolation_state: Required[Literal["EXACT_SINGLE_PARTITION"]]
    visibility_basis: Required[Literal["UNMASKED_AUTHORITATIVE_ONLY"]]
    candidate_identity_hash: Required[str]
    dedupe_key: Required[str]
    conflict_membership_refs: Required[list[str]]
    promotion_readiness: Required[CandidateFactPromotionReadiness]
    adjustment_binding: NotRequired[CandidateFactAdjustmentBinding | None]
    contract: Required[SchemaBundle]

class CandidateFactPromotionReadiness(TypedDict, total=False):
    readiness_state: Required[Literal["CANDIDATE_ONLY", "PROVISIONAL_ALLOWED", "READY_FOR_CANONICAL", "CONFLICT_BLOCKED"]]
    conflict_set_ref: Required[str]
    resolution_frontier: Required[Literal["CLEAR", "MONITORING_ONLY", "BLOCKING_PRESENT"]]
    blocking_conflict_ids: Required[list[str]]
    blocking_conflict_count: Required[int]
    promotion_rule_ref: Required[str]
    approved_override_ref_or_null: Required[str | None]
    frozen_collection_boundary_required: Required[Literal[True]]
    evidence_lineage_complete: Required[Literal[True]]
    visibility_safe_for_authority: Required[Literal[True]]

class CandidateFactAdjustmentBinding(TypedDict, total=False):
    applicable_reporting_scopes: Required[list[Literal["year_end", "quarterly_update", "estimate_only"]]]
    quarterly_basis_profile: Required[Literal["NOT_APPLICABLE", "PERIODIC", "CUMULATIVE"]]
    time_window_basis: Required[Literal["FULL_TAX_YEAR", "CURRENT_QUARTER_ONLY", "TAX_YEAR_TO_DATE", "EXPLICIT_WINDOW"]]
    window_start_date_or_null: Required[str | None]
    window_end_date_or_null: Required[str | None]
    partition_application: Required[Literal["EXACT_PARTITION_ONLY"]]
    analysis_mode_treatment: Required[Literal["MATCH_COMPLIANCE_BASIS", "COUNTERFACTUAL_ONLY"]]

CandidateFactSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/candidate_fact.schema.json",
    "source_hash": "b0ebfc0d9fc8ec7cdcb1c0fe76853b677cdf3c5bdd57f1a48e4557cb5043f5dc",
}

type CandidateFactSet = JSONValue

CandidateFactSetSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/candidate_fact_set.schema.json",
    "source_hash": "c7f5ba11892b262a54cb34920735c6c7a3a5a301fb92b13df7e14988fec6b59c",
}

class CanonicalFact(TypedDict, total=False):
    canonical_fact_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["CanonicalFact"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    fact_family: Required[Literal["TRANSACTION_FACT", "RECORD_FACT", "CATEGORY_TOTAL_FACT", "ADJUSTMENT_FACT", "PROFILE_FACT", "OBLIGATION_FACT", "SUBMISSION_STATE_FACT", "AUTHORITY_COMPARISON_FACT", "RISK_FEATURE_FACT", "WORKFLOW_CONTEXT_FACT"]]
    value_payload_ref: Required[str]
    promotion_state: Required[Literal["PROVISIONAL", "CANONICAL", "CONTESTED", "SUPERSEDED", "RETIRED"]]
    source_strength_tier: Required[Literal["TIER_1_AUTHORITY_FINAL", "TIER_2_AUTHORITY_REFERENCE", "TIER_3_STRUCTURED_EXTERNAL", "TIER_4_STRUCTURED_INTERNAL", "TIER_5_DOCUMENT_SUPPORT", "TIER_6_DECLARED_ONLY", "TIER_7_INFERRED", "TIER_8_GOVERNANCE_ONLY"]]
    retention_tag: Required[RetentionTag]
    erasure_state: Required[Literal["ACTIVE", "LIMITED", "LEGAL_HOLD", "ERASURE_PENDING", "PSEUDONYMISED", "ERASED"]]
    freshness_state: Required[Literal["CURRENT", "STALE", "EXPIRED", "UNKNOWN", "SUPERSEDED"]]
    collection_boundary_ref: Required[str]
    normalization_context_ref: Required[str]
    source_record_refs: Required[list[str]]
    source_record_lineage_hash: Required[str]
    supporting_evidence_refs: Required[list[str]]
    evidence_lineage_hash: Required[str]
    partition_scope: Required[str]
    partition_scope_refs: Required[list[str]]
    partition_isolation_state: Required[Literal["EXACT_SINGLE_PARTITION"]]
    visibility_basis: Required[Literal["UNMASKED_AUTHORITATIVE_ONLY"]]
    promoted_from_candidate_fact_refs: Required[list[str]]
    canonical_identity_hash: Required[str]
    dedupe_key: Required[str]
    conflict_membership_refs: Required[list[str]]
    promotion_record: Required[CanonicalFactPromotionRecord]
    adjustment_binding: NotRequired[CanonicalFactAdjustmentBinding | None]
    contract: Required[SchemaBundle]

class CanonicalFactPromotionRecord(TypedDict, total=False):
    promotion_activity_ref: Required[str]
    conflict_set_ref: Required[str]
    resolution_frontier_at_promotion: Required[Literal["CLEAR", "MONITORING_ONLY", "BLOCKING_PRESENT"]]
    blocking_conflict_ids_at_promotion: Required[list[str]]
    blocking_conflict_count_at_promotion: Required[int]
    promotion_rule_ref: Required[str]
    approved_override_ref_or_null: Required[str | None]
    promoted_at: Required[ISO8601DateTimeString]
    frozen_collection_boundary_required: Required[Literal[True]]
    evidence_lineage_complete: Required[Literal[True]]
    visibility_safe_for_authority: Required[Literal[True]]

class CanonicalFactAdjustmentBinding(TypedDict, total=False):
    applicable_reporting_scopes: Required[list[Literal["year_end", "quarterly_update", "estimate_only"]]]
    quarterly_basis_profile: Required[Literal["NOT_APPLICABLE", "PERIODIC", "CUMULATIVE"]]
    time_window_basis: Required[Literal["FULL_TAX_YEAR", "CURRENT_QUARTER_ONLY", "TAX_YEAR_TO_DATE", "EXPLICIT_WINDOW"]]
    window_start_date_or_null: Required[str | None]
    window_end_date_or_null: Required[str | None]
    partition_application: Required[Literal["EXACT_PARTITION_ONLY"]]
    analysis_mode_treatment: Required[Literal["MATCH_COMPLIANCE_BASIS", "COUNTERFACTUAL_ONLY"]]

CanonicalFactSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/canonical_fact.schema.json",
    "source_hash": "6edafb833e2866207b7a6164d1c5e10b8979a2cdb8ef6bab79d1a91b023125e7",
}

type CanonicalFactSet = JSONValue

CanonicalFactSetSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/canonical_fact_set.schema.json",
    "source_hash": "be94df6e04292bb3d5ba408b1dfa3357131bdac7a3a900abdc4e7b4a5b2e5838",
}

class ConflictRecord(TypedDict, total=False):
    conflict_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["ConflictRecord"]]
    conflict_type: Required[Literal["DUPLICATE_CANDIDATE", "AMOUNT_MISMATCH", "DATE_CONFLICT", "CATEGORY_CONFLICT", "BUSINESS_PARTITION_CONFLICT", "SOURCE_PRECEDENCE_CONFLICT", "AUTHORITY_DIFFERENCE", "MISSING_REQUIRED_FIELD", "LOW_CONFIDENCE_EXTRACTION", "OUT_OF_PERIOD_RECORD"]]
    involved_fact_refs: Required[list[str]]
    severity: Required[Literal["INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL"]]
    reason_codes: Required[list[str]]
    blocking_class: Required[Literal["NON_BLOCKING", "BLOCKS_AUTOMATION", "BLOCKS_REVIEW_PROGRESS", "BLOCKS_FILING", "BLOCKS_AMENDMENT", "BLOCKS_ERASURE", "BLOCKS_RUN", "BLOCKS_AUTHORITY_CALL"]]
    resolution_state: Required[Literal["OPEN", "IN_PROGRESS", "MONITORING", "RESOLVED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED"]]
    contract: Required[SchemaBundle]
    contradiction_class: Required[Literal["NONE", "SOFT_CONTRADICTION", "DECISIVE_CONTRADICTION", "AUTHORITY_DIVERGENCE"]]
    decisive_target_refs: Required[list[str]]
    evidence_refs: Required[list[str]]
    authority_position_refs: Required[list[str]]
    supersedes_conflict_id: Required[str | None]

ConflictRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/conflict_record.schema.json",
    "source_hash": "ff7eb1d4469526c3102b7a3cf7eb64c4d6e59d6aeede19e238dcaabd383838c9",
}

type ConflictSet = JSONValue

ConflictSetSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/conflict_set.schema.json",
    "source_hash": "9adb3f8124c70e4f71d59da9e3e97f0162879c031bf8c62d81bc3e9c562bb5b4",
}

class ConstraintTraceabilityRegister(TypedDict, total=False):
    contract_version: Required[Literal["CONSTRAINT_TRACEABILITY_REGISTER_V1"]]
    register_scope: Required[Literal["LIVE_CONSTRAINTS_ONLY"]]
    historical_note_boundary: Required[Literal["HISTORICAL_NOTES_LIVE_IN_FORENSIC_DOCS_ONLY"]]
    coherence_update_policy: Required[Literal["AUTHORITATIVE_AND_DOWNSTREAM_REFS_MOVE_IN_SAME_CHANGESET"]]
    entries: Required[list[ConstraintTraceabilityRegisterConstraintEntry]]

class ConstraintTraceabilityRegisterTraceabilityRef(TypedDict, total=False):
    path: Required[str]
    kind: Required[Literal["PROSE_CONTRACT", "SHARED_GUARDRAIL", "SCHEMA", "READ_MODEL", "VALIDATOR", "FORENSIC_GUARD", "DATA_MODEL", "README", "GLOSSARY", "INDEX", "REGISTER", "EXAMPLE_OR_VECTOR", "FORENSIC_HISTORY"]]
    required_terms: Required[list[str]]

class ConstraintTraceabilityRegisterConstraintEntry(TypedDict, total=False):
    constraint_id: Required[str]
    constraint_name: Required[str]
    constraint_family: Required[Literal["FOUNDATION_SHARED_SPINE", "INTERACTION_AND_PROJECTION_BOUNDARY", "MANIFEST_REPLAY_AND_GATE_INTEGRITY", "EVIDENCE_PROOF_AND_TWIN_COHERENCE", "AUTHORITY_WORKFLOW_AND_AMENDMENT_CONTINUITY", "GOVERNANCE_NIGHTLY_AND_EXTERNALIZATION_BOUNDARY", "RELEASE_RECOVERY_AND_SCHEMA_EVOLUTION", "CORPUS_TRACEABILITY_DISCIPLINE"]]
    status: Required[Literal["ACTIVE"]]
    architectural_rationale: Required[str]
    prompt_stage_refs: Required[list[str]]
    authoritative_refs: Required[list[ConstraintTraceabilityRegisterTraceabilityRef]]
    enforcement_refs: Required[list[ConstraintTraceabilityRegisterTraceabilityRef]]
    downstream_refs: Required[list[ConstraintTraceabilityRegisterTraceabilityRef]]
    example_refs: Required[list[ConstraintTraceabilityRegisterTraceabilityRef]]
    historical_context_refs: NotRequired[list[ConstraintTraceabilityRegisterTraceabilityRef]]

ConstraintTraceabilityRegisterSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/constraint_traceability_register.schema.json",
    "source_hash": "8c2cb165ae3a12b369fe1d1e4a7806d3c5381490b276d53249eb1d9aeb096827",
}

class EnquiryPack(TypedDict, total=False):
    enquiry_pack_id: Required[str]
    manifest_id: Required[str]
    manifest_refs: Required[list[str]]
    partition_contract: Required[ProvenancePartitionContract]
    graph_ref: Required[str]
    target_ref: Required[str]
    target_class: Required[Literal["FIGURE", "TOTAL", "FILING_FIELD", "DECISION", "LEGAL_STATE", "DRIFT", "RETENTION_LIMITATION", "ERROR_CHAIN"]]
    primary_path_ref: Required[str]
    critical_path_refs: Required[list[str]]
    supporting_evidence_refs: Required[list[str]]
    transformation_step_refs: Required[list[str]]
    config_refs: Required[list[str]]
    override_refs: Required[list[str]]
    authority_refs: Required[list[str]]
    limitation_notes: Required[list[EnquiryPackLimitationNote]]
    audit_refs: Required[list[str]]
    lineage_boundaries: Required[list[EnquiryPackLineageBoundary]]
    masking_posture: Required[Literal["NONE", "MASKED", "REDACTED", "LIMITED_EXPORT"]]
    omission_entries: Required[list[EnquiryPackOmissionEntry]]
    human_readable_ref: Required[str]
    machine_readable_ref: Required[str]
    generated_at: Required[ISO8601DateTimeString]
    proof_bundle_ref: Required[str | None]
    explanation_status: Required[Literal["AVAILABLE", "LIMITED", "FAILED"]]
    retention_binding: Required[dict[str, JSONValue]]
    retention_limited_explainability_contract: Required[RetentionLimitedExplainabilityContract]
    render_contract: Required[dict[str, JSONValue]]
    externalization_governance_contract: Required[ExternalizationGovernanceContract]

class EnquiryPackLineageBoundary(TypedDict, total=False):
    boundary_id: Required[str]
    boundary_edge_ref: Required[str]
    from_manifest_id: Required[str]
    to_manifest_id: Required[str]
    relation: Required[Literal["ED_CONTINUES", "ED_REPLAYS", "ED_RECOVERS", "ED_SUPERSEDES"]]
    exposed_in_path_refs: Required[list[str]]
    decisive_in_path_refs: Required[list[str]]
    tenant_id: Required[str]
    client_id: Required[str | None]
    partition_scope_refs: Required[list[str]]
    period_scope_ref_or_null: Required[str | None]

class EnquiryPackLimitationNote(TypedDict, total=False):
    note_id: Required[str]
    limitation_code: Required[str]
    note_class: Required[Literal["RETENTION", "PRIVACY", "MASKING", "MISSING_SUPPORT", "AUTHORITY_LIMIT", "SUPERSESSION"]]
    affected_refs: Required[list[str]]

class EnquiryPackOmissionEntry(TypedDict, total=False):
    omission_id: Required[str]
    omission_class: Required[Literal["MASKING", "RETENTION", "PRIVACY", "AUTHORITY_LIMIT", "EXTERNAL_LIMITATION"]]
    affected_refs: Required[list[str]]
    declared_reason_code: Required[str]

EnquiryPackSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/enquiry_pack.schema.json",
    "source_hash": "868b2c4fe7ccb706b0787bc115ccc20e0fb9d022624884e5644976a8a214a353",
}

class EvidenceGraph(TypedDict, total=False):
    graph_id: Required[str]
    manifest_id: Required[str]
    manifest_refs: Required[list[str]]
    partition_contract: Required[ProvenancePartitionContract]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    graph_version: Required[str]
    lifecycle_state: Required[Literal["NOT_BUILT", "BUILDING", "BUILT", "LIMITED", "STALE", "REBUILD_REQUIRED", "SUPERSEDED"]]
    nodes_ref: Required[str | None]
    edges_ref: Required[str | None]
    critical_paths_ref: Required[str | None]
    primary_path_ref: Required[str | None]
    path_ranking_basis: Required[list[EvidenceGraphRankingBasisItem]]
    lineage_boundaries: Required[list[EvidenceGraphLineageBoundary]]
    limitation_notes: Required[list[EvidenceGraphLimitationNote]]
    retention_limited_explainability_contract: Required[RetentionLimitedExplainabilityContract]
    confidence_summary: Required[dict[str, JSONValue]]
    supersession_summary: Required[dict[str, JSONValue]]
    quality: Required[dict[str, JSONValue]]
    built_at: Required[ISO8601DateTimeString]
    build_scope: Required[list[str]]
    proof_bundle_refs: Required[list[str]]
    graph_hash: Required[str]
    target_assessments: Required[list[EvidenceGraphTargetAssessment]]
    integrity_summary: Required[dict[str, JSONValue]]

class EvidenceGraphRankingBasisItem(TypedDict, total=False):
    criterion: Required[Literal["CONTRADICTION_FREE", "LEGAL_STATE_PREREQUISITES", "WEAKEST_SEGMENT_CONFIDENCE", "UNRESOLVED_LIMITATION_COUNT", "STALE_SEGMENT_COUNT", "RETENTION_TOMBSTONE_COUNT", "HOP_COUNT", "LEXICAL_PATH_ID"]]
    rank_order: Required[int]
    basis_value: Required[str]

class EvidenceGraphLineageBoundary(TypedDict, total=False):
    boundary_id: Required[str]
    boundary_edge_ref: Required[str]
    from_manifest_id: Required[str]
    to_manifest_id: Required[str]
    relation: Required[Literal["ED_CONTINUES", "ED_REPLAYS", "ED_RECOVERS", "ED_SUPERSEDES"]]
    exposed_in_path_refs: Required[list[str]]
    decisive_in_path_refs: Required[list[str]]
    tenant_id: Required[str]
    client_id: Required[str | None]
    partition_scope_refs: Required[list[str]]
    period_scope_ref_or_null: Required[str | None]

class EvidenceGraphLimitationNote(TypedDict, total=False):
    note_id: Required[str]
    limitation_code: Required[str]
    note_class: Required[Literal["RETENTION", "PRIVACY", "MASKING", "MISSING_SUPPORT", "AUTHORITY_LIMIT", "SUPERSESSION"]]
    affected_refs: Required[list[str]]

class EvidenceGraphTargetAssessment(TypedDict, total=False):
    target_ref: Required[str]
    target_class: Required[Literal["FIGURE", "TOTAL", "FILING_FIELD", "DECISION", "LEGAL_STATE"]]
    filing_critical: Required[bool]
    support_state: Required[Literal["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "CONTRADICTED", "STALE"]]
    admissibility_state: Required[Literal["ADMISSIBLE", "LIMITED", "INADMISSIBLE"]]
    closure_state: Required[Literal["CLOSED", "OPEN"]]
    proof_closure_contract: Required[ProofClosureContract]
    primary_path_ref: Required[str | None]
    proof_bundle_ref: Required[str | None]
    rejected_path_refs: Required[list[str]]
    replayable: Required[bool]
    explanation_status: Required[Literal["AVAILABLE", "LIMITED", "FAILED"]]
    contradiction_refs: Required[list[str]]
    stale_reason_codes: Required[list[str]]
    staleness_dependency_refs: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    closure_failure_reason_codes: Required[list[str]]
    last_validated_at: Required[ISO8601DateTimeString]

EvidenceGraphSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/evidence_graph.schema.json",
    "source_hash": "f551b62ae3f539c70fe6d11d313c809d0ccf895c2d9e8e6fbca83455bf67ce96",
}

class EvidenceItem(TypedDict, total=False):
    evidence_item_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["EvidenceItem"]]
    source_record_id: Required[str]
    evidence_kind: Required[str]
    content_ref: Required[str]
    extraction_method: Required[str]
    extraction_confidence: Required[float]
    source_strength_tier: Required[Literal["TIER_1_AUTHORITY_FINAL", "TIER_2_AUTHORITY_REFERENCE", "TIER_3_STRUCTURED_EXTERNAL", "TIER_4_STRUCTURED_INTERNAL", "TIER_5_DOCUMENT_SUPPORT", "TIER_6_DECLARED_ONLY", "TIER_7_INFERRED", "TIER_8_GOVERNANCE_ONLY"]]
    freshness_state: Required[Literal["CURRENT", "STALE", "EXPIRED", "UNKNOWN", "SUPERSEDED"]]
    lineage_refs: Required[list[str]]
    retention_tag: Required[RetentionTag]
    erasure_state: Required[Literal["ACTIVE", "LIMITED", "LEGAL_HOLD", "ERASURE_PENDING", "PSEUDONYMISED", "ERASED"]]
    business_partition: Required[str]
    period_partition: Required[str]
    contract: Required[SchemaBundle]

EvidenceItemSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/evidence_item.schema.json",
    "source_hash": "ce99fa0dcae0c2329b0750eb9d066ee3a293f942d8c6cbe39b39320bf1a6e50c",
}

type EvidenceItemSet = JSONValue

EvidenceItemSetSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/evidence_item_set.schema.json",
    "source_hash": "1c2a53f4f76b5e7e10df0ab0497e8730c59f1e807430cad1a5833123b98b7b17",
}

class InputFreeze(TypedDict, total=False):
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
    conflict_refs: Required[list[str]]
    open_conflict_count: Required[int]
    blocking_conflict_count: Required[int]
    resolution_frontier: Required[Literal["CLEAR", "MONITORING_ONLY", "BLOCKING_PRESENT"]]
    dominant_blocking_class: Required[Literal["BLOCKS_AUTOMATION", "BLOCKS_REVIEW_PROGRESS", "BLOCKS_FILING", "BLOCKS_AMENDMENT", "BLOCKS_ERASURE", "BLOCKS_RUN", "BLOCKS_AUTHORITY_CALL", None]]
    exclusion_refs: Required[list[str]]
    no_data_confirmed_declarations: Required[list[str]]
    missing_source_declarations: Required[list[str]]
    stale_source_declarations: Required[list[str]]
    source_domain_postures: Required[list[InputFreezeSourceDomainPosture]]
    normalization_context_ref: Required[str]
    normalization_context_hash: Required[str]
    artifact_contract_refs: Required[list[str]]
    artifact_contract_hash: Required[str]
    input_set_hash: Required[str]
    input_consumption_mode: Required[Literal["FROZEN_INPUT_ONLY"]]
    late_data_adoption_policy: Required[Literal["CHILD_REVIEW_OR_EXCLUDE_ONLY"]]
    contract: Required[SchemaBundle]

class InputFreezeSourceDomainPosture(TypedDict, total=False):
    source_domain: Required[str]
    source_class: Required[LateDataPolicyBinding]
    partition_scope_refs: Required[LateDataPolicyBinding]
    runtime_scope_refs: Required[LateDataPolicyBinding]
    boundary_disposition: Required[Literal["IN_SCOPE_COLLECTED", "NO_DATA_CONFIRMED_AT_CUTOFF", "EXCLUDED_BY_POLICY", "MISSING_AT_CUTOFF", "STALE_AT_CUTOFF"]]
    late_data_policy_ref: Required[LateDataPolicyBinding]
    source_record_count: Required[int]
    evidence_item_count: Required[int]
    candidate_fact_count: Required[int]
    canonical_fact_count: Required[int]
    conflict_count: Required[int]

InputFreezeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/input_freeze.schema.json",
    "source_hash": "9caa78a33404ca8166946c590fcf07beb2b494ae695fa61ff4580ab60d33c45c",
}

class NormalizationContext(TypedDict, total=False):
    normalization_context_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["NormalizationContext"]]
    mapping_rules_ref: Required[str]
    evidence_rules_ref: Required[str]
    promotion_rules_ref: Required[str]
    normalization_rules_ref: Required[str]
    transformation_version_set: Required[list[str]]
    normalization_context_hash: Required[str]
    produced_at: Required[ISO8601DateTimeString]
    contract: Required[SchemaBundle]

NormalizationContextSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/normalization_context.schema.json",
    "source_hash": "8676029cc275c3822cea5b4b1ed71ac5181c601314f1c282cc98298e16d0eb91",
}

class ProofBundle(TypedDict, total=False):
    artifact_type: Required[Literal["ProofBundle"]]
    proof_bundle_id: Required[str]
    manifest_id: Required[str]
    manifest_refs: Required[list[str]]
    partition_contract: Required[ProvenancePartitionContract]
    graph_ref: Required[str]
    target_ref: Required[str]
    target_class: Required[Literal["FIGURE", "TOTAL", "FILING_FIELD", "DECISION", "LEGAL_STATE"]]
    bundle_purpose: Required[Literal["FILING_DEFENCE", "GATE_EXPLANATION", "LEGAL_STATE_PROOF", "DRIFT_JUSTIFICATION", "RETENTION_LIMITATION"]]
    lifecycle_state: Required[Literal["GENERATED", "LIMITED", "STALE", "SUPERSEDED"]]
    support_state: Required[Literal["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "CONTRADICTED", "STALE"]]
    admissibility_state: Required[Literal["ADMISSIBLE", "LIMITED", "INADMISSIBLE"]]
    closure_state: Required[Literal["CLOSED", "OPEN"]]
    proof_closure_contract: Required[ProofClosureContract]
    primary_path_ref: Required[str | None]
    decisive_path_refs: Required[list[str]]
    rejected_path_refs: Required[list[str]]
    rejected_path_entries: Required[list[dict[str, JSONValue]]]
    decisive_evidence_refs: Required[list[str]]
    authority_basis_refs: Required[list[str]]
    config_basis_refs: Required[list[str]]
    contradiction_refs: Required[list[str]]
    stale_reason_codes: Required[list[str]]
    staleness_dependency_refs: Required[list[str]]
    temporal_propagation_event_refs: Required[list[str]]
    lineage_boundary_refs: Required[list[str]]
    decisive_lineage_boundary_refs: Required[list[str]]
    replay_recipe: Required[dict[str, JSONValue]]
    render_refs: Required[dict[str, JSONValue]]
    limitation_notes: Required[list[EnquiryPack]]
    retention_limited_explainability_contract: Required[RetentionLimitedExplainabilityContract]
    retention_binding: Required[dict[str, JSONValue]]
    bundle_hash: Required[str]
    superseded_by_bundle_ref: Required[str | None]
    generated_at: Required[ISO8601DateTimeString]
    contract: Required[SchemaBundle]

ProofBundleSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/proof_bundle.schema.json",
    "source_hash": "b0f8a6a12eb03cf6e689d6b41c51b51374321423f21f4ae82adb86933911e379",
}

class ProofClosureContract(TypedDict, total=False):
    closure_profile_code: Required[Literal["PROOF_CLOSURE_V1"]]
    path_ranking_profile_code: Required[Literal["PROOF_PATH_SELECTION_V1"]]
    support_closed: Required[bool]
    authority_closed: Required[bool]
    contradiction_isolated: Required[bool]
    replay_closed: Required[bool]
    silent_limitation_ambiguity_present: Required[bool]
    current_decisive_anchor_present: Required[bool]
    staleness_invalidated: Required[bool]
    closure_failure_reason_codes: Required[list[str]]

ProofClosureContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/proof_closure_contract.schema.json",
    "source_hash": "0ec2ee3f713cd051764255d16433a92783b3f99ff6b4ed6762f682d5278c9888",
}

class ProvenanceEdge(TypedDict, total=False):
    edge_id: Required[str]
    graph_id: Required[str]
    manifest_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str | None]
    business_partition: Required[str | None]
    period_scope: Required[str | None]
    from_node_id: Required[str]
    to_node_id: Required[str]
    edge_type: Required[Literal["ED_USED", "ED_GENERATED", "ED_DERIVED_FROM", "ED_ATTRIBUTED_TO", "ED_ASSOCIATED_WITH", "ED_ACTED_ON_BEHALF_OF", "ED_SUPPORTS", "ED_EXTRACTED_FROM", "ED_PROMOTED_FROM", "ED_AGGREGATES", "ED_ADJUSTS", "ED_COMPARED_AGAINST", "ED_GATED_BY", "ED_OVERRIDDEN_BY", "ED_ACKNOWLEDGED_BY", "ED_RECONCILED_WITH", "ED_AUDITED_BY", "ED_CAUSED_BY_ERROR", "ED_COMPENSATED_BY", "ED_CONTINUES", "ED_REPLAYS", "ED_RECOVERS", "ED_SUPERSEDES", "ED_BASELINES", "ED_LIMITED_BY_RETENTION", "ED_ERASED_UNDER", "ED_TRIGGERED_WORKFLOW", "ED_DEPENDS_ON_CONFIG", "ED_REPORTS_AS", "ED_CONTRADICTS"]]
    originating_activity_ref: Required[str]
    created_at: Required[ISO8601DateTimeString]
    support_type: Required[Literal["DIRECT", "EXTRACTED", "DECLARED", "INFERRED", "AUTHORITY_CONFIRMED", "GOVERNANCE_ONLY"]]
    support_confidence: Required[float]
    support_strength_tier: Required[Literal["TIER_1_AUTHORITY_FINAL", "TIER_2_AUTHORITY_REFERENCE", "TIER_3_STRUCTURED_EXTERNAL", "TIER_4_STRUCTURED_INTERNAL", "TIER_5_DOCUMENT_SUPPORT", "TIER_6_DECLARED_ONLY", "TIER_7_INFERRED", "TIER_8_GOVERNANCE_ONLY"]]
    limitation_codes: Required[list[str]]
    from_manifest_id: Required[str | None]
    to_manifest_id: Required[str | None]
    lineage_relation: Required[Literal["ED_CONTINUES", "ED_REPLAYS", "ED_RECOVERS", "ED_SUPERSEDES", None]]
    decisive_support: Required[bool]
    admissibility_state: Required[Literal["ADMISSIBLE", "LIMITED", "INADMISSIBLE"]]
    contradicted_by_refs: Required[list[str]]
    stale_at: Required[ISO8601DateTimeString]

ProvenanceEdgeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/provenance_edge.schema.json",
    "source_hash": "945684bc14f15e6a218537ea8c17583759c2d846d235dddc71ae7315b1be66ac",
}

class ProvenanceNode(TypedDict, total=False):
    node_id: Required[str]
    graph_id: Required[str]
    graph_address: Required[str]
    manifest_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str | None]
    business_partition: Required[str | None]
    period_scope: Required[str | None]
    node_class: Required[Literal["ENTITY", "ACTIVITY", "AGENT"]]
    node_family: Required[Literal["EN_SOURCE_RECORD", "EN_EVIDENCE_ITEM", "EN_CANDIDATE_FACT", "EN_CANONICAL_FACT", "EN_DERIVED_VALUE", "EN_SNAPSHOT", "EN_CONFIG_FREEZE", "EN_RUN_MANIFEST", "EN_COMPUTE_RESULT", "EN_PARITY_RESULT", "EN_GATE_DECISION", "EN_TRUST_SUMMARY", "EN_EVIDENCE_GRAPH", "EN_TWIN_VIEW", "EN_WORKFLOW_ITEM", "EN_FILING_PACKET", "EN_FILING_FIELD", "EN_SUBMISSION_RECORD", "EN_PROOF_BUNDLE", "EN_DRIFT_RECORD", "EN_ERROR_RECORD", "EN_COMPENSATION_RECORD", "EN_AUDIT_EVENT", "EN_OVERRIDE", "EN_RETENTION_ACTION", "EN_AUTHORITY_RESPONSE", "AC_COLLECT_SOURCE_DATA", "AC_NORMALIZE", "AC_VALIDATE", "AC_PROMOTE_FACT", "AC_AGGREGATE", "AC_ADJUST", "AC_COMPUTE", "AC_COMPARE_PARITY", "AC_EVALUATE_GATE", "AC_SYNTHESIZE_TRUST", "AC_BUILD_GRAPH", "AC_VALIDATE_GRAPH", "AC_RECONSTRUCT_PROOF", "AC_RENDER_EXPLANATION", "AC_BUILD_TWIN", "AC_RESOLVE_CONTINUATION", "AC_PREPARE_FILING", "AC_SUBMIT_TO_AUTHORITY", "AC_RECONCILE_AUTHORITY_STATE", "AC_DETECT_DRIFT", "AC_EVALUATE_AMENDMENT", "AC_RECORD_AUDIT_EVENT", "AC_HANDLE_ERROR", "AC_APPLY_COMPENSATION", "AC_APPLY_OVERRIDE", "AC_APPLY_RETENTION", "AC_EXECUTE_ERASURE", "AG_HUMAN_PRINCIPAL", "AG_SERVICE_PRINCIPAL", "AG_TENANT", "AG_REPORTING_SUBJECT", "AG_AUTHORITY_SYSTEM", "AG_EXTERNAL_PROVIDER"]]
    object_ref: Required[str]
    created_at: Required[ISO8601DateTimeString]
    tombstone_state: Required[Literal["ACTIVE", "RETENTION_LIMITED", "EXPIRED_PLACEHOLDER", "ERASED_PLACEHOLDER", "SUPERSEDED"]]
    limitation_codes: Required[list[str]]

ProvenanceNodeSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/provenance_node.schema.json",
    "source_hash": "b2e2af163a56ca0105799a8ea030bc8014e22734f355a534d1f7d0a12d325173",
}

class ProvenancePartitionContract(TypedDict, total=False):
    contract_version: Required[Literal["PROVENANCE_PARTITION_V1"]]
    tenant_id: Required[str]
    client_id: Required[str | None]
    partition_scope_refs: Required[list[str]]
    period_scope_ref_or_null: Required[str | None]
    cross_manifest_traversal_policy: Required[Literal["EXPLICIT_BOUNDARY_EDGES_ONLY"]]
    scope_widening_policy: Required[Literal["NO_TENANT_CLIENT_OR_SCOPE_WIDENING"]]

ProvenancePartitionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/provenance_partition_contract.schema.json",
    "source_hash": "82d7a1aa15815fafc0d16a2b178b2c2704102f710058e7b9ea882f4a98df72fb",
}

class ProvenancePath(TypedDict, total=False):
    path_id: Required[str]
    graph_id: Required[str]
    manifest_id: Required[str]
    manifest_refs: Required[list[str]]
    partition_contract: Required[ProvenancePartitionContract]
    target_ref: Required[str]
    path_class: Required[Literal["PATH_DERIVATION", "PATH_EVIDENCE_SUPPORT", "PATH_AUDIT_PROOF", "PATH_AUTHORITY_STATE", "PATH_PARITY_EXPLANATION", "PATH_TRUST_EXPLANATION", "PATH_DRIFT_BASELINE", "PATH_AMENDMENT_JUSTIFICATION", "PATH_REMEDIATION_CHAIN", "PATH_CONTINUATION_LINEAGE", "PATH_RETENTION_LIMITATION", "PATH_FILING_PROOF"]]
    path_role: Required[Literal["PRIMARY", "ALTERNATIVE"]]
    admissibility_state: Required[Literal["ADMISSIBLE", "LIMITED", "INADMISSIBLE"]]
    node_refs: Required[list[str]]
    edge_refs: Required[list[str]]
    weakest_support_confidence: Required[float]
    inferred_decisive_segment_present: Required[bool]
    retention_limited_segment_count: Required[int]
    tombstoned_segment_count: Required[int]
    limitation_codes: Required[list[str]]
    ranking_basis: Required[list[ProvenancePathRankingBasisItem]]
    lineage_boundary_refs: Required[list[str]]
    decisive_lineage_boundary_refs: Required[list[str]]
    hop_count: Required[int]
    generated_at: Required[ISO8601DateTimeString]
    closure_state: Required[Literal["CLOSED", "OPEN"]]
    replayable: Required[bool]
    path_hash: Required[str]
    anchor_ref: Required[str]
    anchor_class: Required[Literal["EVIDENCE_ITEM", "SOURCE_RECORD", "AUTHORITY_RESPONSE", "AUDIT_EVENT", "CONFIG_FREEZE"]]
    decisive_edge_refs: Required[list[str]]
    contradiction_refs: Required[list[str]]
    stale_segment_count: Required[int]

class ProvenancePathRankingBasisItem(TypedDict, total=False):
    criterion: Required[Literal["CONTRADICTION_FREE", "LEGAL_STATE_PREREQUISITES", "WEAKEST_SEGMENT_CONFIDENCE", "UNRESOLVED_LIMITATION_COUNT", "STALE_SEGMENT_COUNT", "RETENTION_TOMBSTONE_COUNT", "HOP_COUNT", "LEXICAL_PATH_ID"]]
    rank_order: Required[int]
    basis_value: Required[str]

ProvenancePathSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/provenance_path.schema.json",
    "source_hash": "63b698086079de200ffd20c9c14adeb2a91caa1e14b67e7654c104158b5c1cab",
}

class Snapshot(TypedDict, total=False):
    snapshot_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["Snapshot"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    lifecycle_state: Required[Literal["BUILT", "VALID", "WARNED", "INVALID", "SUPERSEDED", "RETENTION_LIMITED", "ERASED"]]
    state_transition_contract: Required[StateTransitionContract]
    source_record_set_ref: Required[str]
    source_record_set_hash: Required[str]
    evidence_item_set_ref: Required[str]
    evidence_item_set_hash: Required[str]
    candidate_fact_set_ref: Required[str]
    candidate_fact_set_hash: Required[str]
    canonical_fact_set_ref: Required[str]
    canonical_fact_set_hash: Required[str]
    conflict_set_ref: Required[str]
    conflict_set_hash: Required[str]
    quality: Required[dict[str, JSONValue]]
    completeness: Required[dict[str, JSONValue]]
    superseded_by_snapshot_id_or_null: Required[str | None]
    retention_limitation_ref_or_null: Required[str | None]
    erasure_proof_ref_or_null: Required[str | None]
    state_changed_at: Required[ISO8601DateTimeString]
    created_at: Required[ISO8601DateTimeString]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]
    contract: Required[SchemaBundle]

SnapshotSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/snapshot.schema.json",
    "source_hash": "5ffe832a9c9d6bc7dbb56a1d24ffe084b681329f834203cc9faf3e80de104941",
}

class SourceCollectionRun(TypedDict, total=False):
    artifact_type: Required[Literal["SourceCollectionRun"]]
    collection_run_id: Required[str]
    manifest_id: Required[str]
    lifecycle_state: Required[Literal["NOT_STARTED", "FETCHING", "FETCHED", "PARTIAL", "FAILED", "ABANDONED"]]
    state_transition_contract: Required[StateTransitionContract]
    source_window_ref: Required[str]
    fetch_audit_refs: Required[list[str]]
    partial_gap_refs: Required[list[str]]
    failure_reason_code_or_null: Required[str | None]
    abandoned_reason_code_or_null: Required[str | None]
    started_at_or_null: Required[ISO8601DateTimeString]
    completed_at_or_null: Required[ISO8601DateTimeString]
    state_changed_at: Required[ISO8601DateTimeString]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

SourceCollectionRunSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/source_collection_run.schema.json",
    "source_hash": "d2040d67870f4592ab4aaa5619c5017efc782cc9751e14e78f69ba1024f7550e",
}

class SourcePlan(TypedDict, total=False):
    source_plan_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["SourcePlan"]]
    source_plan_hash: Required[str]
    required_domains: Required[list[str]]
    planned_sources: Required[list[SourcePlanPlannedSource]]
    contract: Required[SchemaBundle]

class SourcePlanPlannedSource(TypedDict, total=False):
    source_domain: Required[str]
    source_class: Required[LateDataPolicyBinding]
    provider_binding_ref: Required[str]
    partition_scope_refs: Required[list[str]]
    query_basis_ref: Required[str]
    cursor_strategy_ref: Required[str]
    read_model: Required[Literal["AS_OF", "WINDOWED", "POINT_IN_TIME", "LATEST_ALLOWED"]]
    late_data_policy_ref: Required[LateDataPolicyBinding]
    completeness_expectation_ref: Required[str]
    freshness_slo_ref: Required[str]
    required_schema_refs: Required[list[str]]
    required_source_class_refs: NotRequired[list[str]]

SourcePlanSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/source_plan.schema.json",
    "source_hash": "6870c19228a405cfbcb6c53c6480d7b1d463fa47d42411d2be5e7344cfe6d7b9",
}

class SourceRecord(TypedDict, total=False):
    source_record_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["SourceRecord"]]
    collection_boundary_ref: Required[str]
    source_class: Required[Literal["AUTHORITY_ACKNOWLEDGEMENT", "AUTHORITY_REFERENCE", "INSTITUTIONAL_FEED", "BOOKS_OF_ENTRY", "DOCUMENTARY_EVIDENCE", "DECLARED_ASSERTION", "DETERMINISTIC_DERIVATION", "PROBABILISTIC_INFERENCE", "GOVERNANCE_ARTIFACT"]]
    provider: Required[str]
    provider_account_ref: Required[str]
    capture_method: Required[str]
    captured_at: Required[ISO8601DateTimeString]
    effective_period: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    business_partition: Required[str]
    raw_hash: Required[str]
    raw_payload_ref: Required[str]
    ingestion_run_ref: Required[str]
    source_strength_tier: Required[Literal["TIER_1_AUTHORITY_FINAL", "TIER_2_AUTHORITY_REFERENCE", "TIER_3_STRUCTURED_EXTERNAL", "TIER_4_STRUCTURED_INTERNAL", "TIER_5_DOCUMENT_SUPPORT", "TIER_6_DECLARED_ONLY", "TIER_7_INFERRED", "TIER_8_GOVERNANCE_ONLY"]]
    freshness_state: Required[Literal["CURRENT", "STALE", "EXPIRED", "UNKNOWN", "SUPERSEDED"]]
    retention_tag: Required[RetentionTag]
    erasure_state: Required[Literal["ACTIVE", "LIMITED", "LEGAL_HOLD", "ERASURE_PENDING", "PSEUDONYMISED", "ERASED"]]
    contract: Required[SchemaBundle]

SourceRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/source_record.schema.json",
    "source_hash": "e4333598d1ceab21c9df8002cf9f1eca22a229c9f521e76e8af4a549945b4f3d",
}

type SourceRecordSet = JSONValue

SourceRecordSetSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/source_record_set.schema.json",
    "source_hash": "3f480a4bb9c20b9cc0680318f31182a59d03081face81e1d7ec89f8c512614d7",
}

class SourceWindow(TypedDict, total=False):
    source_window_id: Required[str]
    manifest_id: Required[str]
    artifact_type: Required[Literal["SourceWindow"]]
    source_plan_ref: Required[str]
    collection_started_at: Required[ISO8601DateTimeString]
    collection_completed_at: Required[ISO8601DateTimeString]
    read_cutoff_at: Required[ISO8601DateTimeString]
    source_window_hash: Required[str]
    cutoff_enforcement_state: Required[Literal["HARD_CLOSED_AT_READ_CUTOFF"]]
    post_cutoff_observation_mode: Required[Literal["LATE_DATA_ONLY"]]
    contract: Required[SchemaBundle]

SourceWindowSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/source_window.schema.json",
    "source_hash": "b3def4a9a64cfdd2d059a440c392a9e0a8816c5cad8282657cf385ccf361f0aa",
}

ProvenanceAndEvidenceBindingManifest = {"family_ref": "PROVENANCE_AND_EVIDENCE", "schema_count": 28}
