/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type ArtifactAffordanceContract = {
  "contract_version": "ARTIFACT_AFFORDANCE_V1";
  "affordance_scope": "CLIENT_DOCUMENT_REQUEST" | "CLIENT_APPROVAL_PACK" | "COLLABORATION_CUSTOMER_REQUEST" | "COLLABORATION_ATTACHMENT_SLICE" | "NATIVE_SECONDARY_WINDOW";
  "primary_slot_policy": "CURRENT_PRIMARY_HISTORY_EXPLICIT";
  "primary_subject_role": "NO_CURRENT_ARTIFACT" | "CURRENT_ARTIFACT" | "CURRENT_REQUEST_UPLOAD" | "APPROVAL_PACK" | "HISTORICAL_CONTEXT";
  "visible_primary_subject_ref_or_null": string | null;
  "header_posture": "CURRENT" | "CURRENT_WITH_HISTORY" | "AWAITING_CURRENT_REPLACEMENT" | "HISTORICAL" | "SUPERSEDED" | "REJECTED" | "EXPIRED" | "QUARANTINED";
  "history_affordance_state": "NONE" | "EXPLICIT_SECONDARY" | "EXPLICIT_SECONDARY_LIMITED" | "HIDDEN_UNTIL_REQUESTED";
  "preview_open_policy": "CURRENT_SUMMARY_FIRST_ONLY" | "CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND";
  "default_preview_target_ref_or_null": string | null;
  "default_download_target_ref_or_null": string | null;
  "default_print_target_ref_or_null": string | null;
  "label_visibility_policy": "EXPLICIT_POSTURE_LABELS_REQUIRED";
  "invocation_validation_policy": "VISIBLE_PRIMARY_AND_DEFAULT_TARGETS_MUST_MATCH_GOVERNED_POSTURE";
};
export const ArtifactAffordanceContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/artifact_affordance_contract.schema.json", sourceHash: "af947513eb536bf6ef4870acb48ed2dda57ed4fa9451e7347a30bb736b2276a8" } as const;

export type ArtifactRetention = {
  "artifact_type": "ArtifactRetention";
  "retention_scope_class": "GOVERNED_ARTIFACT";
  "retention_id": string;
  "tenant_id": string;
  "artifact_ref": string;
  "retention_tag_ref": string;
  "retention_class": "regulated_record" | "derived_artifact" | "operational_log" | "analytics_projection" | "policy_governed_other";
  "lifecycle_state": "ACTIVE" | "LIMITED" | "LEGAL_HOLD" | "ERASURE_PENDING" | "PSEUDONYMISED" | "ERASED";
  "minimum_expiry_at": ISO8601DateTimeString;
  "policy_expiry_at": ISO8601DateTimeString;
  "effective_expiry_at": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
  "last_evaluated_at": ISO8601DateTimeString;
  "hold_ref": string | null;
  "next_checkpoint_at": ISO8601DateTimeString;
  "workflow_item_refs": Array<string>;
  "limitation_behavior": string | null;
  "limitation_reason_codes": Array<string>;
  "erasure_request_ref": string | null;
  "erasure_action_ref": string | null;
  "erasure_proof_ref": string | null;
};
export const ArtifactRetentionSchemaLineage = { schemaId: "https://taxat.dev/schemas/artifact_retention.schema.json", sourceHash: "e363e549cba2beef1dcf37b8f737dfa0ee6d93e31c54f74e962283f9c03fba65" } as const;

export type ArtifactSelectionContract = {
  "selection_scope": "CLIENT_DOCUMENT_REQUEST" | "CLIENT_APPROVAL_PACK" | "COLLABORATION_CUSTOMER_REQUEST" | "COLLABORATION_ATTACHMENT_SLICE";
  "presentation_mode": "CURRENT_PRIMARY_HISTORY_SECONDARY";
  "primary_subject_refs": Array<string>;
  "authoritative_subject_refs": Array<string>;
  "historical_subject_refs": Array<string>;
  "limited_history_state": "NONE" | "LIMITED" | "MASKED_PRESENT";
  "limited_history_count_or_null": number | null;
  "default_preview_target_ref_or_null": string | null;
  "default_download_target_ref_or_null": string | null;
  "default_print_target_ref_or_null": string | null;
};
export const ArtifactSelectionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/artifact_selection_contract.schema.json", sourceHash: "de32be087b747f594e253f51f95696cc13b303e474ca4ed225f3578e292d45ac" } as const;

export type CandidateFact = {
  "candidate_fact_id": string;
  "manifest_id": string;
  "artifact_type": "CandidateFact";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "fact_family": "TRANSACTION_FACT" | "RECORD_FACT" | "CATEGORY_TOTAL_FACT" | "ADJUSTMENT_FACT" | "PROFILE_FACT" | "OBLIGATION_FACT" | "SUBMISSION_STATE_FACT" | "AUTHORITY_COMPARISON_FACT" | "RISK_FEATURE_FACT" | "WORKFLOW_CONTEXT_FACT";
  "value_payload_ref": string;
  "confidence": number;
  "source_strength_tier": "TIER_1_AUTHORITY_FINAL" | "TIER_2_AUTHORITY_REFERENCE" | "TIER_3_STRUCTURED_EXTERNAL" | "TIER_4_STRUCTURED_INTERNAL" | "TIER_5_DOCUMENT_SUPPORT" | "TIER_6_DECLARED_ONLY" | "TIER_7_INFERRED" | "TIER_8_GOVERNANCE_ONLY";
  "promotion_state": "CANDIDATE" | "PROVISIONAL" | "CONTESTED" | "SUPERSEDED" | "RETIRED";
  "collection_boundary_ref": string;
  "normalization_context_ref": string;
  "source_record_refs": Array<string>;
  "source_record_lineage_hash": string;
  "supporting_evidence_refs": Array<string>;
  "evidence_lineage_hash": string;
  "partition_scope": string;
  "partition_scope_refs": Array<string>;
  "partition_isolation_state": "EXACT_SINGLE_PARTITION";
  "visibility_basis": "UNMASKED_AUTHORITATIVE_ONLY";
  "candidate_identity_hash": string;
  "dedupe_key": string;
  "conflict_membership_refs": Array<string>;
  "promotion_readiness": CandidateFactPromotionReadiness;
  "adjustment_binding"?: CandidateFactAdjustmentBinding | null;
  "contract": SchemaBundle;
};
export const CandidateFactSchemaLineage = { schemaId: "https://taxat.dev/schemas/candidate_fact.schema.json", sourceHash: "b0ebfc0d9fc8ec7cdcb1c0fe76853b677cdf3c5bdd57f1a48e4557cb5043f5dc" } as const;

export type CandidateFactPromotionReadiness = {
  "readiness_state": "CANDIDATE_ONLY" | "PROVISIONAL_ALLOWED" | "READY_FOR_CANONICAL" | "CONFLICT_BLOCKED";
  "conflict_set_ref": string;
  "resolution_frontier": "CLEAR" | "MONITORING_ONLY" | "BLOCKING_PRESENT";
  "blocking_conflict_ids": Array<string>;
  "blocking_conflict_count": number;
  "promotion_rule_ref": string;
  "approved_override_ref_or_null": string | null;
  "frozen_collection_boundary_required": true;
  "evidence_lineage_complete": true;
  "visibility_safe_for_authority": true;
};

export type CandidateFactAdjustmentBinding = {
  "applicable_reporting_scopes": Array<"year_end" | "quarterly_update" | "estimate_only">;
  "quarterly_basis_profile": "NOT_APPLICABLE" | "PERIODIC" | "CUMULATIVE";
  "time_window_basis": "FULL_TAX_YEAR" | "CURRENT_QUARTER_ONLY" | "TAX_YEAR_TO_DATE" | "EXPLICIT_WINDOW";
  "window_start_date_or_null": string | null;
  "window_end_date_or_null": string | null;
  "partition_application": "EXACT_PARTITION_ONLY";
  "analysis_mode_treatment": "MATCH_COMPLIANCE_BASIS" | "COUNTERFACTUAL_ONLY";
};

export type CandidateFactSet = {
  "set_id": string;
  "manifest_id": string;
  "artifact_type": "CandidateFactSet";
  "items": Array<CandidateFact>;
  "contract": SchemaBundle;
} & {
  "artifact_contract_hash": string;
  "item_identity_hash": string;
  "set_hash": string;
  "produced_at": ISO8601DateTimeString;
};
export const CandidateFactSetSchemaLineage = { schemaId: "https://taxat.dev/schemas/candidate_fact_set.schema.json", sourceHash: "c7f5ba11892b262a54cb34920735c6c7a3a5a301fb92b13df7e14988fec6b59c" } as const;

export type CanonicalFact = {
  "canonical_fact_id": string;
  "manifest_id": string;
  "artifact_type": "CanonicalFact";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "fact_family": "TRANSACTION_FACT" | "RECORD_FACT" | "CATEGORY_TOTAL_FACT" | "ADJUSTMENT_FACT" | "PROFILE_FACT" | "OBLIGATION_FACT" | "SUBMISSION_STATE_FACT" | "AUTHORITY_COMPARISON_FACT" | "RISK_FEATURE_FACT" | "WORKFLOW_CONTEXT_FACT";
  "value_payload_ref": string;
  "promotion_state": "PROVISIONAL" | "CANONICAL" | "CONTESTED" | "SUPERSEDED" | "RETIRED";
  "source_strength_tier": "TIER_1_AUTHORITY_FINAL" | "TIER_2_AUTHORITY_REFERENCE" | "TIER_3_STRUCTURED_EXTERNAL" | "TIER_4_STRUCTURED_INTERNAL" | "TIER_5_DOCUMENT_SUPPORT" | "TIER_6_DECLARED_ONLY" | "TIER_7_INFERRED" | "TIER_8_GOVERNANCE_ONLY";
  "retention_tag": RetentionTag;
  "erasure_state": "ACTIVE" | "LIMITED" | "LEGAL_HOLD" | "ERASURE_PENDING" | "PSEUDONYMISED" | "ERASED";
  "freshness_state": "CURRENT" | "STALE" | "EXPIRED" | "UNKNOWN" | "SUPERSEDED";
  "collection_boundary_ref": string;
  "normalization_context_ref": string;
  "source_record_refs": Array<string>;
  "source_record_lineage_hash": string;
  "supporting_evidence_refs": Array<string>;
  "evidence_lineage_hash": string;
  "partition_scope": string;
  "partition_scope_refs": Array<string>;
  "partition_isolation_state": "EXACT_SINGLE_PARTITION";
  "visibility_basis": "UNMASKED_AUTHORITATIVE_ONLY";
  "promoted_from_candidate_fact_refs": Array<string>;
  "canonical_identity_hash": string;
  "dedupe_key": string;
  "conflict_membership_refs": Array<string>;
  "promotion_record": CanonicalFactPromotionRecord;
  "adjustment_binding"?: CanonicalFactAdjustmentBinding | null;
  "contract": SchemaBundle;
};
export const CanonicalFactSchemaLineage = { schemaId: "https://taxat.dev/schemas/canonical_fact.schema.json", sourceHash: "6edafb833e2866207b7a6164d1c5e10b8979a2cdb8ef6bab79d1a91b023125e7" } as const;

export type CanonicalFactPromotionRecord = {
  "promotion_activity_ref": string;
  "conflict_set_ref": string;
  "resolution_frontier_at_promotion": "CLEAR" | "MONITORING_ONLY" | "BLOCKING_PRESENT";
  "blocking_conflict_ids_at_promotion": Array<string>;
  "blocking_conflict_count_at_promotion": number;
  "promotion_rule_ref": string;
  "approved_override_ref_or_null": string | null;
  "promoted_at": ISO8601DateTimeString;
  "frozen_collection_boundary_required": true;
  "evidence_lineage_complete": true;
  "visibility_safe_for_authority": true;
};

export type CanonicalFactAdjustmentBinding = {
  "applicable_reporting_scopes": Array<"year_end" | "quarterly_update" | "estimate_only">;
  "quarterly_basis_profile": "NOT_APPLICABLE" | "PERIODIC" | "CUMULATIVE";
  "time_window_basis": "FULL_TAX_YEAR" | "CURRENT_QUARTER_ONLY" | "TAX_YEAR_TO_DATE" | "EXPLICIT_WINDOW";
  "window_start_date_or_null": string | null;
  "window_end_date_or_null": string | null;
  "partition_application": "EXACT_PARTITION_ONLY";
  "analysis_mode_treatment": "MATCH_COMPLIANCE_BASIS" | "COUNTERFACTUAL_ONLY";
};

export type CanonicalFactSet = {
  "set_id": string;
  "manifest_id": string;
  "artifact_type": "CanonicalFactSet";
  "items": Array<CanonicalFact>;
  "contract": SchemaBundle;
} & {
  "artifact_contract_hash": string;
  "item_identity_hash": string;
  "set_hash": string;
  "produced_at": ISO8601DateTimeString;
};
export const CanonicalFactSetSchemaLineage = { schemaId: "https://taxat.dev/schemas/canonical_fact_set.schema.json", sourceHash: "be94df6e04292bb3d5ba408b1dfa3357131bdac7a3a900abdc4e7b4a5b2e5838" } as const;

export type ConflictRecord = {
  "conflict_id": string;
  "manifest_id": string;
  "artifact_type": "ConflictRecord";
  "conflict_type": "DUPLICATE_CANDIDATE" | "AMOUNT_MISMATCH" | "DATE_CONFLICT" | "CATEGORY_CONFLICT" | "BUSINESS_PARTITION_CONFLICT" | "SOURCE_PRECEDENCE_CONFLICT" | "AUTHORITY_DIFFERENCE" | "MISSING_REQUIRED_FIELD" | "LOW_CONFIDENCE_EXTRACTION" | "OUT_OF_PERIOD_RECORD";
  "involved_fact_refs": Array<string>;
  "severity": "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";
  "reason_codes": Array<string>;
  "blocking_class": "NON_BLOCKING" | "BLOCKS_AUTOMATION" | "BLOCKS_REVIEW_PROGRESS" | "BLOCKS_FILING" | "BLOCKS_AMENDMENT" | "BLOCKS_ERASURE" | "BLOCKS_RUN" | "BLOCKS_AUTHORITY_CALL";
  "resolution_state": "OPEN" | "IN_PROGRESS" | "MONITORING" | "RESOLVED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED";
  "contract": SchemaBundle;
  "contradiction_class": "NONE" | "SOFT_CONTRADICTION" | "DECISIVE_CONTRADICTION" | "AUTHORITY_DIVERGENCE";
  "decisive_target_refs": Array<string>;
  "evidence_refs": Array<string>;
  "authority_position_refs": Array<string>;
  "supersedes_conflict_id": string | null;
};
export const ConflictRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/conflict_record.schema.json", sourceHash: "ff7eb1d4469526c3102b7a3cf7eb64c4d6e59d6aeede19e238dcaabd383838c9" } as const;

export type ConflictSet = {
  "set_id": string;
  "manifest_id": string;
  "artifact_type": "ConflictSet";
  "normalization_context_ref": string;
  "conflict_detection_policy_ref": string;
  "business_partition_refs": Array<string>;
  "items": Array<ConflictRecord>;
  "open_conflict_ids": Array<string>;
  "blocking_conflict_ids": Array<string>;
  "resolution_frontier": "CLEAR" | "MONITORING_ONLY" | "BLOCKING_PRESENT";
  "open_conflict_count": number;
  "blocking_conflict_count": number;
  "dominant_blocking_class": "BLOCKS_AUTOMATION" | "BLOCKS_REVIEW_PROGRESS" | "BLOCKS_FILING" | "BLOCKS_AMENDMENT" | "BLOCKS_ERASURE" | "BLOCKS_RUN" | "BLOCKS_AUTHORITY_CALL" | null;
  "contract": SchemaBundle;
} & {
  "artifact_contract_hash": string;
  "item_identity_hash": string;
  "unresolved_conflict_hash": string;
  "set_hash": string;
  "produced_at": ISO8601DateTimeString;
};
export const ConflictSetSchemaLineage = { schemaId: "https://taxat.dev/schemas/conflict_set.schema.json", sourceHash: "9adb3f8124c70e4f71d59da9e3e97f0162879c031bf8c62d81bc3e9c562bb5b4" } as const;

export type ConstraintTraceabilityRegister = {
  "contract_version": "CONSTRAINT_TRACEABILITY_REGISTER_V1";
  "register_scope": "LIVE_CONSTRAINTS_ONLY";
  "historical_note_boundary": "HISTORICAL_NOTES_LIVE_IN_FORENSIC_DOCS_ONLY";
  "coherence_update_policy": "AUTHORITATIVE_AND_DOWNSTREAM_REFS_MOVE_IN_SAME_CHANGESET";
  "entries": Array<ConstraintTraceabilityRegisterConstraintEntry>;
};
export const ConstraintTraceabilityRegisterSchemaLineage = { schemaId: "https://taxat.dev/schemas/constraint_traceability_register.schema.json", sourceHash: "8c2cb165ae3a12b369fe1d1e4a7806d3c5381490b276d53249eb1d9aeb096827" } as const;

export type ConstraintTraceabilityRegisterTraceabilityRef = {
  "path": string;
  "kind": "PROSE_CONTRACT" | "SHARED_GUARDRAIL" | "SCHEMA" | "READ_MODEL" | "VALIDATOR" | "FORENSIC_GUARD" | "DATA_MODEL" | "README" | "GLOSSARY" | "INDEX" | "REGISTER" | "EXAMPLE_OR_VECTOR" | "FORENSIC_HISTORY";
  "required_terms": Array<string>;
};

export type ConstraintTraceabilityRegisterConstraintEntry = {
  "constraint_id": string;
  "constraint_name": string;
  "constraint_family": "FOUNDATION_SHARED_SPINE" | "INTERACTION_AND_PROJECTION_BOUNDARY" | "MANIFEST_REPLAY_AND_GATE_INTEGRITY" | "EVIDENCE_PROOF_AND_TWIN_COHERENCE" | "AUTHORITY_WORKFLOW_AND_AMENDMENT_CONTINUITY" | "GOVERNANCE_NIGHTLY_AND_EXTERNALIZATION_BOUNDARY" | "RELEASE_RECOVERY_AND_SCHEMA_EVOLUTION" | "CORPUS_TRACEABILITY_DISCIPLINE";
  "status": "ACTIVE";
  "architectural_rationale": string;
  "prompt_stage_refs": Array<string>;
  "authoritative_refs": Array<ConstraintTraceabilityRegisterTraceabilityRef>;
  "enforcement_refs": Array<ConstraintTraceabilityRegisterTraceabilityRef>;
  "downstream_refs": Array<ConstraintTraceabilityRegisterTraceabilityRef>;
  "example_refs": Array<ConstraintTraceabilityRegisterTraceabilityRef>;
  "historical_context_refs"?: Array<ConstraintTraceabilityRegisterTraceabilityRef>;
};

export type EnquiryPack = {
  "enquiry_pack_id": string;
  "manifest_id": string;
  "manifest_refs": Array<string>;
  "partition_contract": ProvenancePartitionContract;
  "graph_ref": string;
  "target_ref": string;
  "target_class": "FIGURE" | "TOTAL" | "FILING_FIELD" | "DECISION" | "LEGAL_STATE" | "DRIFT" | "RETENTION_LIMITATION" | "ERROR_CHAIN";
  "primary_path_ref": string;
  "critical_path_refs": Array<string>;
  "supporting_evidence_refs": Array<string>;
  "transformation_step_refs": Array<string>;
  "config_refs": Array<string>;
  "override_refs": Array<string>;
  "authority_refs": Array<string>;
  "limitation_notes": Array<EnquiryPackLimitationNote>;
  "audit_refs": Array<string>;
  "lineage_boundaries": Array<EnquiryPackLineageBoundary>;
  "masking_posture": "NONE" | "MASKED" | "REDACTED" | "LIMITED_EXPORT";
  "omission_entries": Array<EnquiryPackOmissionEntry>;
  "human_readable_ref": string;
  "machine_readable_ref": string;
  "generated_at": ISO8601DateTimeString;
  "proof_bundle_ref": string | null;
  "explanation_status": "AVAILABLE" | "LIMITED" | "FAILED";
  "retention_binding": {
    "retention_tag_ref": string;
    "limitation_behavior": "FULL" | "LIMITED" | "TOMBSTONED" | "PSEUDONYMISED";
    "minimum_available_until": ISO8601DateTimeString;
  };
  "retention_limited_explainability_contract": RetentionLimitedExplainabilityContract & {
    "boundary_scope"?: "ENQUIRY_PACK";
    "surface_role"?: "SCRUTINY_EXPORT_PACK";
    "surface_specific_binding_policy"?: "ENQUIRY_PACK_RETAINS_LIMITATION_NOTES_OMISSIONS_AND_RETENTION_BINDING";
  };
  "render_contract": {
    "operator_render_ref": string | null;
    "reviewer_render_ref": string | null;
    "filing_artifact_ref": string | null;
  };
  "externalization_governance_contract": ExternalizationGovernanceContract & {
    "boundary_scope"?: "ENQUIRY_PACK";
  };
};
export const EnquiryPackSchemaLineage = { schemaId: "https://taxat.dev/schemas/enquiry_pack.schema.json", sourceHash: "868b2c4fe7ccb706b0787bc115ccc20e0fb9d022624884e5644976a8a214a353" } as const;

export type EnquiryPackLineageBoundary = {
  "boundary_id": string;
  "boundary_edge_ref": string;
  "from_manifest_id": string;
  "to_manifest_id": string;
  "relation": "ED_CONTINUES" | "ED_REPLAYS" | "ED_RECOVERS" | "ED_SUPERSEDES";
  "exposed_in_path_refs": Array<string>;
  "decisive_in_path_refs": Array<string>;
  "tenant_id": string;
  "client_id": string | null;
  "partition_scope_refs": Array<string>;
  "period_scope_ref_or_null": string | null;
};

export type EnquiryPackLimitationNote = {
  "note_id": string;
  "limitation_code": string;
  "note_class": "RETENTION" | "PRIVACY" | "MASKING" | "MISSING_SUPPORT" | "AUTHORITY_LIMIT" | "SUPERSESSION";
  "affected_refs": Array<string>;
};

export type EnquiryPackOmissionEntry = {
  "omission_id": string;
  "omission_class": "MASKING" | "RETENTION" | "PRIVACY" | "AUTHORITY_LIMIT" | "EXTERNAL_LIMITATION";
  "affected_refs": Array<string>;
  "declared_reason_code": string;
};

export type EvidenceGraph = {
  "graph_id": string;
  "manifest_id": string;
  "manifest_refs": Array<string>;
  "partition_contract": ProvenancePartitionContract;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "graph_version": string;
  "lifecycle_state": "NOT_BUILT" | "BUILDING" | "BUILT" | "LIMITED" | "STALE" | "REBUILD_REQUIRED" | "SUPERSEDED";
  "nodes_ref": string | null;
  "edges_ref": string | null;
  "critical_paths_ref": string | null;
  "primary_path_ref": string | null;
  "path_ranking_basis": Array<EvidenceGraphRankingBasisItem>;
  "lineage_boundaries": Array<EvidenceGraphLineageBoundary>;
  "limitation_notes": Array<EvidenceGraphLimitationNote>;
  "retention_limited_explainability_contract": RetentionLimitedExplainabilityContract & {
    "boundary_scope"?: "EVIDENCE_GRAPH";
    "surface_role"?: "GRAPH_EXPLANATION_INDEX";
    "surface_specific_binding_policy"?: "EVIDENCE_GRAPH_RETAINS_LIMITATION_NOTES_AND_TARGET_EXPLANATION_POSTURE";
  };
  "confidence_summary": {
    "primary_path_weakest_support_confidence": number;
    "weighted_path_confidence": number;
    "admissible_critical_path_count": number;
    "limited_critical_path_count": number;
  };
  "supersession_summary": {
    "supersedes_graph_ref": string | null;
    "superseded_by_graph_ref": string | null;
    "lineage_reason": "NONE" | "CONTINUATION" | "REPLAY" | "RECOVERY" | "SUPERSESSION";
  };
  "quality": {
    "graph_quality_score": number;
    "critical_path_coverage": number;
    "critical_retention_limited_count": number;
    "critical_evidence_erased_count": number;
    "inferred_critical_path_ratio": number;
    "proof_bundle_coverage": number;
    "unsupported_critical_target_count": number;
    "contradicted_critical_target_count": number;
    "stale_critical_target_count": number;
    "replay_failure_target_count": number;
  };
  "built_at": ISO8601DateTimeString;
  "build_scope": Array<string>;
  "proof_bundle_refs": Array<string>;
  "graph_hash": string;
  "target_assessments": Array<EvidenceGraphTargetAssessment>;
  "integrity_summary": {
    "unsupported_critical_target_count": number;
    "contradicted_critical_target_count": number;
    "stale_critical_target_count": number;
    "open_critical_target_count": number;
    "replay_failure_target_count": number;
    "missing_proof_bundle_target_count": number;
    "explanation_failure_count": number;
    "rebuild_required": boolean;
  };
};
export const EvidenceGraphSchemaLineage = { schemaId: "https://taxat.dev/schemas/evidence_graph.schema.json", sourceHash: "f551b62ae3f539c70fe6d11d313c809d0ccf895c2d9e8e6fbca83455bf67ce96" } as const;

export type EvidenceGraphRankingBasisItem = {
  "criterion": "CONTRADICTION_FREE" | "LEGAL_STATE_PREREQUISITES" | "WEAKEST_SEGMENT_CONFIDENCE" | "UNRESOLVED_LIMITATION_COUNT" | "STALE_SEGMENT_COUNT" | "RETENTION_TOMBSTONE_COUNT" | "HOP_COUNT" | "LEXICAL_PATH_ID";
  "rank_order": number;
  "basis_value": string;
};

export type EvidenceGraphLineageBoundary = {
  "boundary_id": string;
  "boundary_edge_ref": string;
  "from_manifest_id": string;
  "to_manifest_id": string;
  "relation": "ED_CONTINUES" | "ED_REPLAYS" | "ED_RECOVERS" | "ED_SUPERSEDES";
  "exposed_in_path_refs": Array<string>;
  "decisive_in_path_refs": Array<string>;
  "tenant_id": string;
  "client_id": string | null;
  "partition_scope_refs": Array<string>;
  "period_scope_ref_or_null": string | null;
};

export type EvidenceGraphLimitationNote = {
  "note_id": string;
  "limitation_code": string;
  "note_class": "RETENTION" | "PRIVACY" | "MASKING" | "MISSING_SUPPORT" | "AUTHORITY_LIMIT" | "SUPERSESSION";
  "affected_refs": Array<string>;
};

export type EvidenceGraphTargetAssessment = {
  "target_ref": string;
  "target_class": "FIGURE" | "TOTAL" | "FILING_FIELD" | "DECISION" | "LEGAL_STATE";
  "filing_critical": boolean;
  "support_state": "SUPPORTED" | "PARTIALLY_SUPPORTED" | "UNSUPPORTED" | "CONTRADICTED" | "STALE";
  "admissibility_state": "ADMISSIBLE" | "LIMITED" | "INADMISSIBLE";
  "closure_state": "CLOSED" | "OPEN";
  "proof_closure_contract": ProofClosureContract;
  "primary_path_ref": string | null;
  "proof_bundle_ref": string | null;
  "rejected_path_refs": Array<string>;
  "replayable": boolean;
  "explanation_status": "AVAILABLE" | "LIMITED" | "FAILED";
  "contradiction_refs": Array<string>;
  "stale_reason_codes": Array<string>;
  "staleness_dependency_refs": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "closure_failure_reason_codes": Array<string>;
  "last_validated_at": ISO8601DateTimeString;
};

export type EvidenceItem = {
  "evidence_item_id": string;
  "manifest_id": string;
  "artifact_type": "EvidenceItem";
  "source_record_id": string;
  "evidence_kind": string;
  "content_ref": string;
  "extraction_method": string;
  "extraction_confidence": number;
  "source_strength_tier": "TIER_1_AUTHORITY_FINAL" | "TIER_2_AUTHORITY_REFERENCE" | "TIER_3_STRUCTURED_EXTERNAL" | "TIER_4_STRUCTURED_INTERNAL" | "TIER_5_DOCUMENT_SUPPORT" | "TIER_6_DECLARED_ONLY" | "TIER_7_INFERRED" | "TIER_8_GOVERNANCE_ONLY";
  "freshness_state": "CURRENT" | "STALE" | "EXPIRED" | "UNKNOWN" | "SUPERSEDED";
  "lineage_refs": Array<string>;
  "retention_tag": RetentionTag;
  "erasure_state": "ACTIVE" | "LIMITED" | "LEGAL_HOLD" | "ERASURE_PENDING" | "PSEUDONYMISED" | "ERASED";
  "business_partition": string;
  "period_partition": string;
  "contract": SchemaBundle;
};
export const EvidenceItemSchemaLineage = { schemaId: "https://taxat.dev/schemas/evidence_item.schema.json", sourceHash: "ce99fa0dcae0c2329b0750eb9d066ee3a293f942d8c6cbe39b39320bf1a6e50c" } as const;

export type EvidenceItemSet = {
  "set_id": string;
  "manifest_id": string;
  "artifact_type": "EvidenceItemSet";
  "items": Array<EvidenceItem>;
  "contract": SchemaBundle;
} & {
  "artifact_contract_hash": string;
  "item_identity_hash": string;
  "set_hash": string;
  "produced_at": ISO8601DateTimeString;
};
export const EvidenceItemSetSchemaLineage = { schemaId: "https://taxat.dev/schemas/evidence_item_set.schema.json", sourceHash: "1c2a53f4f76b5e7e10df0ab0497e8730c59f1e807430cad1a5833123b98b7b17" } as const;

export type InputFreeze = {
  "input_freeze_id": string;
  "manifest_id": string;
  "artifact_type": "InputFreeze";
  "source_plan_ref": string;
  "source_plan_hash": string;
  "collection_boundary_ref": string;
  "collection_boundary_hash": string;
  "input_policy_ref": string;
  "source_window_ref": string;
  "source_window_hash": string;
  "read_cutoff_at": ISO8601DateTimeString;
  "provider_environment_refs": Array<string>;
  "provider_api_versions": Array<string>;
  "provider_schema_versions": Array<string>;
  "connector_profile_ref": string;
  "connector_build_id": string;
  "cursor_checkpoint_refs": Array<string>;
  "request_audit_refs": Array<string>;
  "late_data_policy_bindings": Array<LateDataPolicyBinding>;
  "source_record_refs": Array<string>;
  "evidence_item_refs": Array<string>;
  "candidate_fact_refs": Array<string>;
  "canonical_fact_refs": Array<string>;
  "conflict_refs": Array<string>;
  "open_conflict_count": number;
  "blocking_conflict_count": number;
  "resolution_frontier": "CLEAR" | "MONITORING_ONLY" | "BLOCKING_PRESENT";
  "dominant_blocking_class": "BLOCKS_AUTOMATION" | "BLOCKS_REVIEW_PROGRESS" | "BLOCKS_FILING" | "BLOCKS_AMENDMENT" | "BLOCKS_ERASURE" | "BLOCKS_RUN" | "BLOCKS_AUTHORITY_CALL" | null;
  "exclusion_refs": Array<string>;
  "no_data_confirmed_declarations": Array<string>;
  "missing_source_declarations": Array<string>;
  "stale_source_declarations": Array<string>;
  "source_domain_postures": Array<InputFreezeSourceDomainPosture>;
  "normalization_context_ref": string;
  "normalization_context_hash": string;
  "artifact_contract_refs": Array<string>;
  "artifact_contract_hash": string;
  "input_set_hash": string;
  "input_consumption_mode": "FROZEN_INPUT_ONLY";
  "late_data_adoption_policy": "CHILD_REVIEW_OR_EXCLUDE_ONLY";
  "contract": SchemaBundle;
};
export const InputFreezeSchemaLineage = { schemaId: "https://taxat.dev/schemas/input_freeze.schema.json", sourceHash: "9caa78a33404ca8166946c590fcf07beb2b494ae695fa61ff4580ab60d33c45c" } as const;

export type InputFreezeSourceDomainPosture = {
  "source_domain": string;
  "source_class": LateDataPolicyBinding;
  "partition_scope_refs": LateDataPolicyBinding;
  "runtime_scope_refs": LateDataPolicyBinding;
  "boundary_disposition": "IN_SCOPE_COLLECTED" | "NO_DATA_CONFIRMED_AT_CUTOFF" | "EXCLUDED_BY_POLICY" | "MISSING_AT_CUTOFF" | "STALE_AT_CUTOFF";
  "late_data_policy_ref": LateDataPolicyBinding;
  "source_record_count": number;
  "evidence_item_count": number;
  "candidate_fact_count": number;
  "canonical_fact_count": number;
  "conflict_count": number;
};

export type NormalizationContext = {
  "normalization_context_id": string;
  "manifest_id": string;
  "artifact_type": "NormalizationContext";
  "mapping_rules_ref": string;
  "evidence_rules_ref": string;
  "promotion_rules_ref": string;
  "normalization_rules_ref": string;
  "transformation_version_set": Array<string>;
  "normalization_context_hash": string;
  "produced_at": ISO8601DateTimeString;
  "contract": SchemaBundle;
};
export const NormalizationContextSchemaLineage = { schemaId: "https://taxat.dev/schemas/normalization_context.schema.json", sourceHash: "8676029cc275c3822cea5b4b1ed71ac5181c601314f1c282cc98298e16d0eb91" } as const;

export type ProofBundle = {
  "artifact_type": "ProofBundle";
  "proof_bundle_id": string;
  "manifest_id": string;
  "manifest_refs": Array<string>;
  "partition_contract": ProvenancePartitionContract;
  "graph_ref": string;
  "target_ref": string;
  "target_class": "FIGURE" | "TOTAL" | "FILING_FIELD" | "DECISION" | "LEGAL_STATE";
  "bundle_purpose": "FILING_DEFENCE" | "GATE_EXPLANATION" | "LEGAL_STATE_PROOF" | "DRIFT_JUSTIFICATION" | "RETENTION_LIMITATION";
  "lifecycle_state": "GENERATED" | "LIMITED" | "STALE" | "SUPERSEDED";
  "support_state": "SUPPORTED" | "PARTIALLY_SUPPORTED" | "UNSUPPORTED" | "CONTRADICTED" | "STALE";
  "admissibility_state": "ADMISSIBLE" | "LIMITED" | "INADMISSIBLE";
  "closure_state": "CLOSED" | "OPEN";
  "proof_closure_contract": ProofClosureContract;
  "primary_path_ref": string | null;
  "decisive_path_refs": Array<string>;
  "rejected_path_refs": Array<string>;
  "rejected_path_entries": Array<{
      "path_ref": string;
      "path_rank": number;
      "rejection_class": "WEAKER_SUPPORT" | "CONTRADICTS_PRIMARY" | "SILENT_LIMITATION_AMBIGUITY" | "STALE_OR_SUPERSEDED" | "REPLAY_CLOSURE_FAILURE" | "AUTHORITY_CLOSURE_FAILURE";
      "rejection_reason_codes": Array<string>;
    }>;
  "decisive_evidence_refs": Array<string>;
  "authority_basis_refs": Array<string>;
  "config_basis_refs": Array<string>;
  "contradiction_refs": Array<string>;
  "stale_reason_codes": Array<string>;
  "staleness_dependency_refs": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "lineage_boundary_refs": Array<string>;
  "decisive_lineage_boundary_refs": Array<string>;
  "replay_recipe": {
    "manifest_refs": Array<string>;
    "required_artifact_refs": Array<string>;
    "deterministic_order_basis": Array<string>;
    "replayable": boolean;
    "path_ref_order": Array<string>;
    "lineage_boundary_refs": Array<string>;
  };
  "render_refs": {
    "operator_render_ref": string | null;
    "reviewer_render_ref": string | null;
    "filing_artifact_ref": string | null;
    "explanation_status": "AVAILABLE" | "LIMITED" | "FAILED";
  };
  "limitation_notes": Array<EnquiryPack>;
  "retention_limited_explainability_contract": RetentionLimitedExplainabilityContract & {
    "boundary_scope"?: "PROOF_BUNDLE";
    "surface_role"?: "FILING_PROOF_ARTIFACT";
    "surface_specific_binding_policy"?: "PROOF_BUNDLE_RETAINS_DECISIVE_LIMITATION_AND_RETENTION_BINDING";
  };
  "retention_binding": {
    "retention_tag_ref": string;
    "limitation_behavior": "FULL" | "LIMITED" | "TOMBSTONED" | "PSEUDONYMISED";
    "minimum_available_until": ISO8601DateTimeString;
  };
  "bundle_hash": string;
  "superseded_by_bundle_ref": string | null;
  "generated_at": ISO8601DateTimeString;
  "contract": SchemaBundle;
};
export const ProofBundleSchemaLineage = { schemaId: "https://taxat.dev/schemas/proof_bundle.schema.json", sourceHash: "b0f8a6a12eb03cf6e689d6b41c51b51374321423f21f4ae82adb86933911e379" } as const;

export type ProofClosureContract = {
  "closure_profile_code": "PROOF_CLOSURE_V1";
  "path_ranking_profile_code": "PROOF_PATH_SELECTION_V1";
  "support_closed": boolean;
  "authority_closed": boolean;
  "contradiction_isolated": boolean;
  "replay_closed": boolean;
  "silent_limitation_ambiguity_present": boolean;
  "current_decisive_anchor_present": boolean;
  "staleness_invalidated": boolean;
  "closure_failure_reason_codes": Array<string>;
};
export const ProofClosureContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/proof_closure_contract.schema.json", sourceHash: "0ec2ee3f713cd051764255d16433a92783b3f99ff6b4ed6762f682d5278c9888" } as const;

export type ProvenanceEdge = {
  "edge_id": string;
  "graph_id": string;
  "manifest_id": string;
  "tenant_id": string;
  "client_id": string | null;
  "business_partition": string | null;
  "period_scope": string | null;
  "from_node_id": string;
  "to_node_id": string;
  "edge_type": "ED_USED" | "ED_GENERATED" | "ED_DERIVED_FROM" | "ED_ATTRIBUTED_TO" | "ED_ASSOCIATED_WITH" | "ED_ACTED_ON_BEHALF_OF" | "ED_SUPPORTS" | "ED_EXTRACTED_FROM" | "ED_PROMOTED_FROM" | "ED_AGGREGATES" | "ED_ADJUSTS" | "ED_COMPARED_AGAINST" | "ED_GATED_BY" | "ED_OVERRIDDEN_BY" | "ED_ACKNOWLEDGED_BY" | "ED_RECONCILED_WITH" | "ED_AUDITED_BY" | "ED_CAUSED_BY_ERROR" | "ED_COMPENSATED_BY" | "ED_CONTINUES" | "ED_REPLAYS" | "ED_RECOVERS" | "ED_SUPERSEDES" | "ED_BASELINES" | "ED_LIMITED_BY_RETENTION" | "ED_ERASED_UNDER" | "ED_TRIGGERED_WORKFLOW" | "ED_DEPENDS_ON_CONFIG" | "ED_REPORTS_AS" | "ED_CONTRADICTS";
  "originating_activity_ref": string;
  "created_at": ISO8601DateTimeString;
  "support_type": "DIRECT" | "EXTRACTED" | "DECLARED" | "INFERRED" | "AUTHORITY_CONFIRMED" | "GOVERNANCE_ONLY";
  "support_confidence": number;
  "support_strength_tier": "TIER_1_AUTHORITY_FINAL" | "TIER_2_AUTHORITY_REFERENCE" | "TIER_3_STRUCTURED_EXTERNAL" | "TIER_4_STRUCTURED_INTERNAL" | "TIER_5_DOCUMENT_SUPPORT" | "TIER_6_DECLARED_ONLY" | "TIER_7_INFERRED" | "TIER_8_GOVERNANCE_ONLY";
  "limitation_codes": Array<string>;
  "from_manifest_id": string | null;
  "to_manifest_id": string | null;
  "lineage_relation": "ED_CONTINUES" | "ED_REPLAYS" | "ED_RECOVERS" | "ED_SUPERSEDES" | null;
  "decisive_support": boolean;
  "admissibility_state": "ADMISSIBLE" | "LIMITED" | "INADMISSIBLE";
  "contradicted_by_refs": Array<string>;
  "stale_at": ISO8601DateTimeString;
};
export const ProvenanceEdgeSchemaLineage = { schemaId: "https://taxat.dev/schemas/provenance_edge.schema.json", sourceHash: "945684bc14f15e6a218537ea8c17583759c2d846d235dddc71ae7315b1be66ac" } as const;

export type ProvenanceNode = {
  "node_id": string;
  "graph_id": string;
  "graph_address": string;
  "manifest_id": string;
  "tenant_id": string;
  "client_id": string | null;
  "business_partition": string | null;
  "period_scope": string | null;
  "node_class": "ENTITY" | "ACTIVITY" | "AGENT";
  "node_family": "EN_SOURCE_RECORD" | "EN_EVIDENCE_ITEM" | "EN_CANDIDATE_FACT" | "EN_CANONICAL_FACT" | "EN_DERIVED_VALUE" | "EN_SNAPSHOT" | "EN_CONFIG_FREEZE" | "EN_RUN_MANIFEST" | "EN_COMPUTE_RESULT" | "EN_PARITY_RESULT" | "EN_GATE_DECISION" | "EN_TRUST_SUMMARY" | "EN_EVIDENCE_GRAPH" | "EN_TWIN_VIEW" | "EN_WORKFLOW_ITEM" | "EN_FILING_PACKET" | "EN_FILING_FIELD" | "EN_SUBMISSION_RECORD" | "EN_PROOF_BUNDLE" | "EN_DRIFT_RECORD" | "EN_ERROR_RECORD" | "EN_COMPENSATION_RECORD" | "EN_AUDIT_EVENT" | "EN_OVERRIDE" | "EN_RETENTION_ACTION" | "EN_AUTHORITY_RESPONSE" | "AC_COLLECT_SOURCE_DATA" | "AC_NORMALIZE" | "AC_VALIDATE" | "AC_PROMOTE_FACT" | "AC_AGGREGATE" | "AC_ADJUST" | "AC_COMPUTE" | "AC_COMPARE_PARITY" | "AC_EVALUATE_GATE" | "AC_SYNTHESIZE_TRUST" | "AC_BUILD_GRAPH" | "AC_VALIDATE_GRAPH" | "AC_RECONSTRUCT_PROOF" | "AC_RENDER_EXPLANATION" | "AC_BUILD_TWIN" | "AC_RESOLVE_CONTINUATION" | "AC_PREPARE_FILING" | "AC_SUBMIT_TO_AUTHORITY" | "AC_RECONCILE_AUTHORITY_STATE" | "AC_DETECT_DRIFT" | "AC_EVALUATE_AMENDMENT" | "AC_RECORD_AUDIT_EVENT" | "AC_HANDLE_ERROR" | "AC_APPLY_COMPENSATION" | "AC_APPLY_OVERRIDE" | "AC_APPLY_RETENTION" | "AC_EXECUTE_ERASURE" | "AG_HUMAN_PRINCIPAL" | "AG_SERVICE_PRINCIPAL" | "AG_TENANT" | "AG_REPORTING_SUBJECT" | "AG_AUTHORITY_SYSTEM" | "AG_EXTERNAL_PROVIDER";
  "object_ref": string;
  "created_at": ISO8601DateTimeString;
  "tombstone_state": "ACTIVE" | "RETENTION_LIMITED" | "EXPIRED_PLACEHOLDER" | "ERASED_PLACEHOLDER" | "SUPERSEDED";
  "limitation_codes": Array<string>;
};
export const ProvenanceNodeSchemaLineage = { schemaId: "https://taxat.dev/schemas/provenance_node.schema.json", sourceHash: "b2e2af163a56ca0105799a8ea030bc8014e22734f355a534d1f7d0a12d325173" } as const;

export type ProvenancePartitionContract = {
  "contract_version": "PROVENANCE_PARTITION_V1";
  "tenant_id": string;
  "client_id": string | null;
  "partition_scope_refs": Array<string>;
  "period_scope_ref_or_null": string | null;
  "cross_manifest_traversal_policy": "EXPLICIT_BOUNDARY_EDGES_ONLY";
  "scope_widening_policy": "NO_TENANT_CLIENT_OR_SCOPE_WIDENING";
};
export const ProvenancePartitionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/provenance_partition_contract.schema.json", sourceHash: "82d7a1aa15815fafc0d16a2b178b2c2704102f710058e7b9ea882f4a98df72fb" } as const;

export type ProvenancePath = {
  "path_id": string;
  "graph_id": string;
  "manifest_id": string;
  "manifest_refs": Array<string>;
  "partition_contract": ProvenancePartitionContract;
  "target_ref": string;
  "path_class": "PATH_DERIVATION" | "PATH_EVIDENCE_SUPPORT" | "PATH_AUDIT_PROOF" | "PATH_AUTHORITY_STATE" | "PATH_PARITY_EXPLANATION" | "PATH_TRUST_EXPLANATION" | "PATH_DRIFT_BASELINE" | "PATH_AMENDMENT_JUSTIFICATION" | "PATH_REMEDIATION_CHAIN" | "PATH_CONTINUATION_LINEAGE" | "PATH_RETENTION_LIMITATION" | "PATH_FILING_PROOF";
  "path_role": "PRIMARY" | "ALTERNATIVE";
  "admissibility_state": "ADMISSIBLE" | "LIMITED" | "INADMISSIBLE";
  "node_refs": Array<string>;
  "edge_refs": Array<string>;
  "weakest_support_confidence": number;
  "inferred_decisive_segment_present": boolean;
  "retention_limited_segment_count": number;
  "tombstoned_segment_count": number;
  "limitation_codes": Array<string>;
  "ranking_basis": Array<ProvenancePathRankingBasisItem>;
  "lineage_boundary_refs": Array<string>;
  "decisive_lineage_boundary_refs": Array<string>;
  "hop_count": number;
  "generated_at": ISO8601DateTimeString;
  "closure_state": "CLOSED" | "OPEN";
  "replayable": boolean;
  "path_hash": string;
  "anchor_ref": string;
  "anchor_class": "EVIDENCE_ITEM" | "SOURCE_RECORD" | "AUTHORITY_RESPONSE" | "AUDIT_EVENT" | "CONFIG_FREEZE";
  "decisive_edge_refs": Array<string>;
  "contradiction_refs": Array<string>;
  "stale_segment_count": number;
};
export const ProvenancePathSchemaLineage = { schemaId: "https://taxat.dev/schemas/provenance_path.schema.json", sourceHash: "63b698086079de200ffd20c9c14adeb2a91caa1e14b67e7654c104158b5c1cab" } as const;

export type ProvenancePathRankingBasisItem = {
  "criterion": "CONTRADICTION_FREE" | "LEGAL_STATE_PREREQUISITES" | "WEAKEST_SEGMENT_CONFIDENCE" | "UNRESOLVED_LIMITATION_COUNT" | "STALE_SEGMENT_COUNT" | "RETENTION_TOMBSTONE_COUNT" | "HOP_COUNT" | "LEXICAL_PATH_ID";
  "rank_order": number;
  "basis_value": string;
};

export type Snapshot = {
  "snapshot_id": string;
  "manifest_id": string;
  "artifact_type": "Snapshot";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "lifecycle_state": "BUILT" | "VALID" | "WARNED" | "INVALID" | "SUPERSEDED" | "RETENTION_LIMITED" | "ERASED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "SNAPSHOT";
    "machine_code"?: "SNAPSHOT_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "source_record_set_ref": string;
  "source_record_set_hash": string;
  "evidence_item_set_ref": string;
  "evidence_item_set_hash": string;
  "candidate_fact_set_ref": string;
  "candidate_fact_set_hash": string;
  "canonical_fact_set_ref": string;
  "canonical_fact_set_hash": string;
  "conflict_set_ref": string;
  "conflict_set_hash": string;
  "quality": {
    "data_quality_score": number;
    "reason_codes"?: Array<string>;
    "invalid_domain_refs"?: Array<string>;
  };
  "completeness": {
    "completeness_score": number;
    "reason_codes"?: Array<string>;
    "missing_domain_refs"?: Array<string>;
  };
  "superseded_by_snapshot_id_or_null": string | null;
  "retention_limitation_ref_or_null": string | null;
  "erasure_proof_ref_or_null": string | null;
  "state_changed_at": ISO8601DateTimeString;
  "created_at": ISO8601DateTimeString;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
  "contract": SchemaBundle;
};
export const SnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/snapshot.schema.json", sourceHash: "5ffe832a9c9d6bc7dbb56a1d24ffe084b681329f834203cc9faf3e80de104941" } as const;

export type SourceCollectionRun = {
  "artifact_type": "SourceCollectionRun";
  "collection_run_id": string;
  "manifest_id": string;
  "lifecycle_state": "NOT_STARTED" | "FETCHING" | "FETCHED" | "PARTIAL" | "FAILED" | "ABANDONED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "SOURCE_COLLECTION_RUN";
    "machine_code"?: "SOURCE_COLLECTION_RUN_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "source_window_ref": string;
  "fetch_audit_refs": Array<string>;
  "partial_gap_refs": Array<string>;
  "failure_reason_code_or_null": string | null;
  "abandoned_reason_code_or_null": string | null;
  "started_at_or_null": ISO8601DateTimeString;
  "completed_at_or_null": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const SourceCollectionRunSchemaLineage = { schemaId: "https://taxat.dev/schemas/source_collection_run.schema.json", sourceHash: "d2040d67870f4592ab4aaa5619c5017efc782cc9751e14e78f69ba1024f7550e" } as const;

export type SourcePlan = {
  "source_plan_id": string;
  "manifest_id": string;
  "artifact_type": "SourcePlan";
  "source_plan_hash": string;
  "required_domains": Array<string>;
  "planned_sources": Array<SourcePlanPlannedSource>;
  "contract": SchemaBundle;
};
export const SourcePlanSchemaLineage = { schemaId: "https://taxat.dev/schemas/source_plan.schema.json", sourceHash: "6870c19228a405cfbcb6c53c6480d7b1d463fa47d42411d2be5e7344cfe6d7b9" } as const;

export type SourcePlanPlannedSource = {
  "source_domain": string;
  "source_class": LateDataPolicyBinding;
  "provider_binding_ref": string;
  "partition_scope_refs": Array<string>;
  "query_basis_ref": string;
  "cursor_strategy_ref": string;
  "read_model": "AS_OF" | "WINDOWED" | "POINT_IN_TIME" | "LATEST_ALLOWED";
  "late_data_policy_ref": LateDataPolicyBinding;
  "completeness_expectation_ref": string;
  "freshness_slo_ref": string;
  "required_schema_refs": Array<string>;
  "required_source_class_refs"?: Array<string>;
};

export type SourceRecord = {
  "source_record_id": string;
  "manifest_id": string;
  "artifact_type": "SourceRecord";
  "collection_boundary_ref": string;
  "source_class": "AUTHORITY_ACKNOWLEDGEMENT" | "AUTHORITY_REFERENCE" | "INSTITUTIONAL_FEED" | "BOOKS_OF_ENTRY" | "DOCUMENTARY_EVIDENCE" | "DECLARED_ASSERTION" | "DETERMINISTIC_DERIVATION" | "PROBABILISTIC_INFERENCE" | "GOVERNANCE_ARTIFACT";
  "provider": string;
  "provider_account_ref": string;
  "capture_method": string;
  "captured_at": ISO8601DateTimeString;
  "effective_period": string;
  "tenant_id": string;
  "client_id": string;
  "business_partition": string;
  "raw_hash": string;
  "raw_payload_ref": string;
  "ingestion_run_ref": string;
  "source_strength_tier": "TIER_1_AUTHORITY_FINAL" | "TIER_2_AUTHORITY_REFERENCE" | "TIER_3_STRUCTURED_EXTERNAL" | "TIER_4_STRUCTURED_INTERNAL" | "TIER_5_DOCUMENT_SUPPORT" | "TIER_6_DECLARED_ONLY" | "TIER_7_INFERRED" | "TIER_8_GOVERNANCE_ONLY";
  "freshness_state": "CURRENT" | "STALE" | "EXPIRED" | "UNKNOWN" | "SUPERSEDED";
  "retention_tag": RetentionTag;
  "erasure_state": "ACTIVE" | "LIMITED" | "LEGAL_HOLD" | "ERASURE_PENDING" | "PSEUDONYMISED" | "ERASED";
  "contract": SchemaBundle;
};
export const SourceRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/source_record.schema.json", sourceHash: "e4333598d1ceab21c9df8002cf9f1eca22a229c9f521e76e8af4a549945b4f3d" } as const;

export type SourceRecordSet = {
  "set_id": string;
  "manifest_id": string;
  "artifact_type": "SourceRecordSet";
  "items": Array<SourceRecord>;
  "contract": SchemaBundle;
} & {
  "artifact_contract_hash": string;
  "item_identity_hash": string;
  "set_hash": string;
  "produced_at": ISO8601DateTimeString;
};
export const SourceRecordSetSchemaLineage = { schemaId: "https://taxat.dev/schemas/source_record_set.schema.json", sourceHash: "3f480a4bb9c20b9cc0680318f31182a59d03081face81e1d7ec89f8c512614d7" } as const;

export type SourceWindow = {
  "source_window_id": string;
  "manifest_id": string;
  "artifact_type": "SourceWindow";
  "source_plan_ref": string;
  "collection_started_at": ISO8601DateTimeString;
  "collection_completed_at": ISO8601DateTimeString;
  "read_cutoff_at": ISO8601DateTimeString;
  "source_window_hash": string;
  "cutoff_enforcement_state": "HARD_CLOSED_AT_READ_CUTOFF";
  "post_cutoff_observation_mode": "LATE_DATA_ONLY";
  "contract": SchemaBundle;
};
export const SourceWindowSchemaLineage = { schemaId: "https://taxat.dev/schemas/source_window.schema.json", sourceHash: "b3def4a9a64cfdd2d059a440c392a9e0a8816c5cad8282657cf385ccf361f0aa" } as const;

export const ProvenanceAndEvidenceBindingManifest = { familyRef: "PROVENANCE_AND_EVIDENCE", schemaCount: 28 } as const;
