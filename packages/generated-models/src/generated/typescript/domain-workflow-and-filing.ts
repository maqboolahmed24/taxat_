/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type AmendmentBundle = {
  "artifact_type": "AmendmentBundle";
  "amendment_bundle_id": string;
  "manifest_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "amendment_case_ref": string;
  "drift_ref": string | null;
  "baseline_envelope_ref": string;
  "baseline_frozen_hash": string;
  "retroactive_impact_ref": string | null;
  "retroactive_impact_hash": string | null;
  "amendment_window_context_ref": string | null;
  "amendment_window_evaluation_hash": string | null;
  "calculation_basis_ref": string | null;
  "calculation_basis_hash": string | null;
  "user_confirmation_ref": string | null;
  "authority_operation_profile_ref": string | null;
  "affected_scope_refs": Array<string>;
  "packet_ref": string | null;
  "payload_hash": string | null;
  "bundle_identity_hash": string | null;
  "bundle_state": "PREPARED" | "FROZEN" | "SUBMITTED" | "CONFIRMED" | "VOID" | "SUPERSEDED";
  "supersedes_bundle_id": string | null;
  "created_at": ISO8601DateTimeString;
  "superseded_at": ISO8601DateTimeString;
};
export const AmendmentBundleSchemaLineage = { schemaId: "https://taxat.dev/schemas/amendment_bundle.schema.json", sourceHash: "62e75b6c443c3734cbe28923b78ba3c5e55009cc1feb4dfcf87dd1e1d3470a9c" } as const;

export type AmendmentCase = {
  "artifact_type": "AmendmentCase";
  "amendment_case_id": string;
  "filing_case_id": string | null;
  "client_id": string;
  "period": string;
  "current_manifest_ref": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "scope_key": string;
  "lifecycle_state": "NOT_ELIGIBLE" | "RECONCILE_REQUIRED" | "ELIGIBLE" | "INTENT_REQUIRED" | "INTENT_SUBMITTED" | "READY_TO_AMEND" | "AMEND_SUBMITTED" | "AMEND_PENDING" | "AMEND_CONFIRMED" | "AMEND_REJECTED" | "WINDOW_CLOSED" | "SUPERSEDED";
  "baseline_ref": string;
  "baseline_envelope_ref": string;
  "baseline_frozen_hash": string;
  "drift_ref": string | null;
  "retroactive_impact_ref": string | null;
  "retroactive_impact_hash": string | null;
  "current_bundle_ref": string | null;
  "supersedes_amendment_case_id": string | null;
  "active_chain_key": string;
  "intent_ref": string | null;
  "amendment_window_ref": string | null;
  "amendment_window_evaluation_hash": string | null;
  "authority_operation_profile_ref": string | null;
  "calculation_request_ref": string | null;
  "calculation_id": string | null;
  "calculation_type": "intent-to-amend" | "confirm-amendment" | null;
  "calculation_hash": string | null;
  "calculation_basis_ref": string | null;
  "user_confirmation_ref": string | null;
  "readiness_context_ref": string | null;
  "amendment_eligibility_contract": AmendmentEligibilityContract;
  "freshness_state": "NOT_APPLICABLE" | "FRESH" | "STALE";
  "freshness_invalidation_reason_codes": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "review_state": "NONE" | "REVIEW_OPEN" | "REVIEW_RESOLVED";
  "escalation_state": "NONE" | "OPERATOR_REVIEW" | "COMPLIANCE_ESCALATION" | "AUTHORITY_RECONCILIATION";
  "validation_outcome": "PASS" | "PASS_WITH_NOTICE" | "MANUAL_REVIEW" | "OVERRIDABLE_BLOCK" | "HARD_BLOCK" | null;
  "superseded_at": ISO8601DateTimeString;
};
export const AmendmentCaseSchemaLineage = { schemaId: "https://taxat.dev/schemas/amendment_case.schema.json", sourceHash: "2555ffbc214915ab844f9312260648fb75882b8ca2f5166705a4ef31b6929beb" } as const;

export type AmendmentEligibilityContract = {
  "eligibility_profile_code": "AMENDMENT_ELIGIBILITY_V1";
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "trigger_state": "NOT_TRIGGERED" | "TRIGGERED";
  "eligibility_state": "NOT_EVALUATED" | "ELIGIBLE_NOW" | "REVIEW_ONLY" | "RECONCILE_FIRST" | "WINDOW_CLOSED" | "UNPROVEN";
  "window_state_or_null": "OPEN" | "CLOSED" | "UNPROVEN" | null;
  "readiness_reuse_state": "NOT_APPLICABLE" | "FRESH" | "STALE";
  "baseline_frozen_hash_or_null": string | null;
  "baseline_selection_contract_hash_or_null": string | null;
  "baseline_progression_ceiling_or_null": "ELIGIBLE_NOW_ALLOWED" | "REVIEW_ONLY" | "RECONCILE_FIRST" | null;
  "baseline_limitation_reason_codes": Array<string>;
  "retroactive_impact_hash_or_null": string | null;
  "amendment_window_evaluation_hash_or_null": string | null;
  "authority_operation_profile_ref_or_null": string | null;
  "readiness_context_ref_or_null": string | null;
  "trigger_reason_codes": Array<string>;
  "eligibility_reason_codes": Array<string>;
  "readiness_invalidation_reason_codes": Array<string>;
};
export const AmendmentEligibilityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/amendment_eligibility_contract.schema.json", sourceHash: "a056971ede42adf3dfb0cf6109654f9062ae72f7359cdc8b8116f860a7480cf4" } as const;

export type AmendmentWindowContext = {
  "artifact_type": "AmendmentWindowContext";
  "amendment_window_context_id": string;
  "manifest_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "baseline_envelope_ref": string;
  "window_anchor_basis": string;
  "scope_refs": Array<string>;
  "statutory_filing_deadline": ISO8601DateTimeString;
  "final_declaration_confirmed_at": ISO8601DateTimeString;
  "window_opens_at": ISO8601DateTimeString;
  "window_closes_at": ISO8601DateTimeString;
  "window_state": "OPEN" | "CLOSED" | "UNPROVEN";
  "provider_profile_ref": string | null;
  "authority_basis_ref": string | null;
  "eligible_scope_refs": Array<string>;
  "blocked_scope_refs": Array<string>;
  "reason_codes": Array<string>;
  "evaluated_at": ISO8601DateTimeString;
  "stale_after_at": ISO8601DateTimeString;
  "evaluation_hash": string;
};
export const AmendmentWindowContextSchemaLineage = { schemaId: "https://taxat.dev/schemas/amendment_window_context.schema.json", sourceHash: "565f26a7a5d54a11b887b610f361189878c5dd9b9a91c02acdbdf507678a541f" } as const;

export type CacheIsolationContract = {
  "contract_version": "CACHE_ISOLATION_V1";
  "cache_scope_class": "LOW_NOISE_FRAME" | "WORKSPACE_SNAPSHOT" | "WORK_INBOX_SNAPSHOT" | "CLIENT_PORTAL_WORKSPACE" | "CUSTOMER_REQUEST_LIST" | "TENANT_GOVERNANCE_SNAPSHOT" | "GOVERNANCE_POLICY_SNAPSHOT" | "PRINCIPAL_ACCESS_VIEW" | "ROLE_TEMPLATE_MATRIX" | "NATIVE_OPERATOR_WORKSPACE_SCENE" | "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE";
  "tenant_id": string;
  "client_id_or_null": string | null;
  "principal_class": string;
  "session_binding_hash": string;
  "access_binding_hash_or_null": string | null;
  "masking_posture_fingerprint_or_null": string | null;
  "shell_stability_ref_or_null": string | null;
  "route_identity_ref": string;
  "canonical_object_ref": string;
  "shell_family": string;
  "projection_version_ref": string;
  "cache_partition_ref": string;
  "visibility_cache_partition_key_or_null": string | null;
  "customer_safe_projection": boolean;
  "preview_subject_ref_or_null": string | null;
  "delivery_binding_hash": string;
  "shared_cache_reuse_policy": "EXACT_SECURITY_CONTEXT_ONLY";
  "shared_layer_cache_policy": "NO_CDN_OR_PROXY_REUSE_WITHOUT_IDENTICAL_CONTEXT";
  "local_storage_reuse_policy": "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT";
  "hydration_guard_policy": "REJECT_ON_CONTEXT_ROUTE_VERSION_OR_PREVIEW_MISMATCH";
  "scope_narrowing_invalidation_policy": "PURGE_BROADER_VARIANTS_ON_ACCESS_OR_MASKING_NARROWING";
  "preview_export_reuse_policy": "ROUTE_AND_SELECTION_BOUND_CURRENT_ONLY";
  "delivery_revalidation_policy": "PREVIEW_EXPORT_AND_DOWNLOAD_REQUIRE_EXACT_BINDING";
  "temporary_artifact_policy": "TEMP_FILES_AND_NATIVE_PREVIEW_PURGED_ON_BINDING_DRIFT";
};
export const CacheIsolationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/cache_isolation_contract.schema.json", sourceHash: "d6ee2b1f1d0423e342016eebc1f159c93030131382a7094e78afea84ee6bd30a" } as const;

export type CollectionBoundary = {
  "collection_boundary_id": string;
  "manifest_id": string;
  "artifact_type": "CollectionBoundary";
  "source_plan_ref": string;
  "source_window_id": string;
  "read_cutoff_at": ISO8601DateTimeString;
  "connector_profile_ref": string;
  "connector_build_id": string;
  "collection_boundary_hash": string;
  "boundary_coverage_state": "EXPLICIT_SOURCE_DOMAIN_ACCOUNTING";
  "source_boundaries": Array<CollectionBoundarySourceBoundary>;
  "contract": SchemaBundle;
};
export const CollectionBoundarySchemaLineage = { schemaId: "https://taxat.dev/schemas/collection_boundary.schema.json", sourceHash: "77dcb01e5a32802132ced8c55d69d39154d9585161d45564eb28b6d8aa8f0088" } as const;

export type CollectionBoundarySourceBoundary = {
  "request_audit_refs"?: JsonValue;
} | {
  "page_request_audit_refs"?: JsonValue;
};

export type CommandEnvelope = {
  "artifact_type": "CommandEnvelope";
  "command_id": string;
  "command_type": string;
  "idempotency_key": string;
  "actor_session_ref": string;
  "target_scope_class": "MANIFEST" | "WORK_ITEM" | "GOVERNANCE";
  "tenant_id": string;
  "client_id": string | null;
  "manifest_id": string | null;
  "work_item_id": string | null;
  "governance_target_ref": string | null;
  "period": string | null;
  "requested_scope": Array<string>;
  "if_match_decision_bundle_hash": string | null;
  "if_match_shell_stability_token": string | null;
  "if_match_frame_epoch": number | null;
  "if_match_work_item_version": number | null;
  "if_match_internal_head_sequence": number | null;
  "if_match_customer_head_sequence": number | null;
  "if_match_request_state_version": number | null;
  "if_match_approval_pack_hash": string | null;
  "if_match_client_portal_workspace_version": number | null;
  "if_match_policy_snapshot_hash": string | null;
  "if_match_dependency_topology_hash": string | null;
  "simulation_basis_hash": string | null;
  "mutation_basis_contract": null | GovernanceMutationBasisContract;
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "COMMAND_REQUEST";
    "authoritative_record_families"?: ["RUN_MANIFEST","WORKFLOW_ITEM","GOVERNANCE_DOMAIN_OBJECT"];
    "observable_projection_families"?: ["DECISION_BUNDLE","EXPERIENCE_DELTA","LOW_NOISE_EXPERIENCE_FRAME","WORKSPACE_SNAPSHOT","CLIENT_PORTAL_WORKSPACE","GOVERNANCE_POLICY_SNAPSHOT","CLIENT_APPROVAL_PACK"];
  };
  "mutation_precondition_binding": MutationPreconditionBinding;
  "payload": {
    [key: string]: JsonValue;
  };
  "requested_at": ISO8601DateTimeString;
};
export const CommandEnvelopeSchemaLineage = { schemaId: "https://taxat.dev/schemas/command_envelope.schema.json", sourceHash: "7bcc8aca262314bba58ef65c15f0c3d035ed76ea3989ec64a003f89b0835afb1" } as const;

export type CommandTruthBoundaryContract = {
  "contract_version": "COMMAND_TRUTH_BOUNDARY_V1";
  "artifact_role": "COMMAND_REQUEST" | "COMMAND_SIDE_AUTHORITY" | "BOUNDARY_RECEIPT" | "READ_SIDE_PROJECTION";
  "authoritative_source_policy": "TARGET_DURABLE_IDS_ONLY" | "DURABLE_COMMAND_RECORDS_ONLY" | "DURABLE_COMMAND_RESULTS_ONLY" | "MIRROR_DURABLE_COMMAND_RECORDS_ONLY";
  "projection_input_policy": "STALE_GUARDS_ONLY" | "FORBIDDEN_AS_AUTHORITY" | "STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY" | "NO_PROJECTION_INPUTS";
  "durable_writeback_policy": "NO_DIRECT_STATE_WRITEBACK" | "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED" | "APPEND_ONLY_BOUNDARY_EVIDENCE" | "NO_DURABLE_STATE_WRITEBACK";
  "recovery_basis_policy": "DURABLE_IDS_AND_RECEIPTS_ONLY" | "MANIFEST_AND_DURABLE_RECORDS_ONLY" | "RECEIPT_PLUS_DURABLE_RESULTS_ONLY" | "REBUILD_FROM_DURABLE_RECORDS_ONLY";
  "authoritative_record_families": Array<CommandTruthBoundaryContractAuthoritativeRecordFamily>;
  "observable_projection_families": Array<CommandTruthBoundaryContractObservableProjectionFamily>;
};
export const CommandTruthBoundaryContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/command_truth_boundary_contract.schema.json", sourceHash: "9aee47831658515a13123efd6fa028dea43706b7f6e030a0e788cba697a02232" } as const;

export type CommandTruthBoundaryContractAuthoritativeRecordFamily = "RUN_MANIFEST" | "WORKFLOW_ITEM" | "GATE_DECISION_RECORD" | "AUTHORITY_INTERACTION_RECORD" | "GOVERNANCE_DOMAIN_OBJECT" | "AUDIT_EVENT" | "API_COMMAND_RECEIPT";

export type CommandTruthBoundaryContractObservableProjectionFamily = "DECISION_BUNDLE" | "EXPERIENCE_DELTA" | "LOW_NOISE_EXPERIENCE_FRAME" | "EXPERIENCE_CURSOR" | "WORKSPACE_SNAPSHOT" | "CLIENT_PORTAL_WORKSPACE" | "CLIENT_APPROVAL_PACK" | "CLIENT_UPLOAD_SESSION" | "GOVERNANCE_POLICY_SNAPSHOT";

export type DriftBaselineEnvelope = {
  "artifact_type": "DriftBaselineEnvelope";
  "baseline_envelope_id": string;
  "manifest_id": string;
  "client_id": string;
  "period": string;
  "baseline_ref": string;
  "baseline_manifest_id": string | null;
  "baseline_type": "WORKING" | "FILED" | "AMENDED" | "AUTHORITY_CORRECTED" | "OUT_OF_BAND";
  "baseline_scope_refs": Array<string>;
  "baseline_basis_ref": string | null;
  "authority_basis_refs": Array<string>;
  "baseline_submission_state": "WORKING" | "FILED_CONFIRMED" | "AMEND_CONFIRMED" | "AUTHORITY_CORRECTED" | "UNKNOWN" | "OUT_OF_BAND_UNRECONCILED";
  "truth_origin": string;
  "baseline_effective_at": ISO8601DateTimeString;
  "temporal_propagation_event_ref_or_null": string | null;
  "selection_reason_codes": Array<string>;
  "selection_contract": BaselineSelectionContract;
  "frozen_hash": string;
  "supersedes_baseline_frozen_hash_or_null": string | null;
  "superseded_by_baseline_envelope_id": string | null;
  "superseded_at": ISO8601DateTimeString;
};
export const DriftBaselineEnvelopeSchemaLineage = { schemaId: "https://taxat.dev/schemas/drift_baseline_envelope.schema.json", sourceHash: "4f0a58614377051612837fe22f95db23839d52c2da3efc609a437a3cc60c7648" } as const;

export type DriftBaselineSelectionVisualization = {
  "candidate_results"?: JsonValue;
} & {
  "same_scope_envelope_lineage"?: JsonValue;
};
export const DriftBaselineSelectionVisualizationSchemaLineage = { schemaId: "https://taxat.dev/schemas/drift_baseline_selection_visualization.schema.json", sourceHash: "6c5718f79c5505356276ca898375df182526bc67aaf4884fbcfa4ea64b7ba940" } as const;

export type DriftBaselineSelectionVisualizationBaselineType = "WORKING" | "FILED" | "AMENDED" | "AUTHORITY_CORRECTED" | "OUT_OF_BAND";

export type DriftBaselineSelectionVisualizationBaselineSubmissionState = "WORKING" | "FILED_CONFIRMED" | "AMEND_CONFIRMED" | "AUTHORITY_CORRECTED" | "UNKNOWN" | "OUT_OF_BAND_UNRECONCILED";

export type DriftBaselineSelectionVisualizationScopeCompatibilityState = "EXACT_SCOPE_COMPATIBLE" | "SUBSET_SCOPE_COMPATIBLE" | "BROADER_SCOPE_COMPATIBLE" | "INCOMPATIBLE_SCOPE";

export type DriftBaselineSelectionVisualizationScopeMatchClass = "EXACT_SCOPE_MATCH" | "SCOPE_SLICED_SUBSET_MATCH" | "BROADER_CLIENT_PERIOD_MATCH";

export type DriftBaselineSelectionVisualizationSameScopeTruthResolutionState = "NO_STRONGER_EXTERNAL_TRUTH_PRESENT" | "AUTHORITY_CORRECTED_TRUTH_SELECTED" | "OUT_OF_BAND_EXTERNAL_TRUTH_BLOCKS_INTERNAL_LINEAGE";

export type DriftBaselineSelectionVisualizationAuthorityResolutionClass = "EXACT_AUTHORITY_CONFIRMED" | "AUTHORITY_OBSERVED_EXTERNAL" | "ENGINE_CHAIN_UNREFRESHED" | "WORKING_ONLY";

export type DriftBaselineSelectionVisualizationContinuityClass = "INTERNAL_CHAIN_CONTINUITY" | "AUTHORITY_CORRECTED_EXTERNAL_CONTINUITY" | "OUT_OF_BAND_EXTERNAL_CONTINUITY" | "WORKING_LOCAL_ONLY";

export type DriftBaselineSelectionVisualizationAutomationCeiling = "ALLOWED" | "LIMITED" | "BLOCKED";

export type DriftBaselineSelectionVisualizationReviewRecommendationFloor = "NONE" | "REVIEW_REQUIRED" | "RECONCILIATION_REQUIRED";

export type DriftBaselineSelectionVisualizationAmendmentProgressionCeiling = "ELIGIBLE_NOW_ALLOWED" | "REVIEW_ONLY" | "RECONCILE_FIRST";

export type DriftBaselineSelectionVisualizationBenignDriftEligibilityState = "ALLOWED" | "FORBIDDEN";

export type DriftBaselineSelectionVisualizationSelectionOutcome = "SELECTED" | "REJECTED";

export type DriftBaselineSelectionVisualizationCandidateSupersessionState = "NONE" | "ACTIVE" | "SUPERSEDED" | "REUSED_HISTORICAL_MATCH";

export type DriftBaselineSelectionVisualizationLineageDisposition = "SELECTED_ACTIVE" | "REUSED_ACTIVE" | "SUPERSEDED_PREDECESSOR";

export type DriftBaselineSelectionVisualizationDominanceKey = {
  "scope_rank": number;
  "precedence_rank": number;
  "authority_resolution_rank": number;
  "chain_continuity_rank": number;
  "effective_time_rank_or_null": ISO8601DateTimeString;
  "manifest_generation_rank_or_null": number | null;
  "stable_id_rank": string;
};

export type DriftBaselineSelectionVisualizationCandidateResult = {
  "display_rank": number;
  "candidate_ref": string;
  "candidate_baseline_type": DriftBaselineSelectionVisualizationBaselineType;
  "candidate_submission_state": DriftBaselineSelectionVisualizationBaselineSubmissionState;
  "candidate_manifest_id_or_null": string | null;
  "candidate_scope_refs": Array<string>;
  "candidate_authority_basis_refs": Array<string>;
  "candidate_effective_at_or_null": ISO8601DateTimeString;
  "candidate_manifest_generation_or_null": number | null;
  "candidate_scope_compatibility_state": DriftBaselineSelectionVisualizationScopeCompatibilityState;
  "candidate_scope_match_class_or_null": "EXACT_SCOPE_MATCH" | "SCOPE_SLICED_SUBSET_MATCH" | "BROADER_CLIENT_PERIOD_MATCH" | null;
  "same_scope_truth_resolution_state_or_null": "NO_STRONGER_EXTERNAL_TRUTH_PRESENT" | "AUTHORITY_CORRECTED_TRUTH_SELECTED" | "OUT_OF_BAND_EXTERNAL_TRUTH_BLOCKS_INTERNAL_LINEAGE" | null;
  "authority_resolution_class_or_null": "EXACT_AUTHORITY_CONFIRMED" | "AUTHORITY_OBSERVED_EXTERNAL" | "ENGINE_CHAIN_UNREFRESHED" | "WORKING_ONLY" | null;
  "continuity_class_or_null": "INTERNAL_CHAIN_CONTINUITY" | "AUTHORITY_CORRECTED_EXTERNAL_CONTINUITY" | "OUT_OF_BAND_EXTERNAL_CONTINUITY" | "WORKING_LOCAL_ONLY" | null;
  "candidate_dominance_key_or_null": { [key: string]: never } | null;
  "candidate_anchor_weight_or_null": number | null;
  "candidate_uncertainty_reason_codes": Array<string>;
  "candidate_automation_ceiling_or_null": "ALLOWED" | "LIMITED" | "BLOCKED" | null;
  "candidate_review_recommendation_floor_or_null": "NONE" | "REVIEW_REQUIRED" | "RECONCILIATION_REQUIRED" | null;
  "candidate_amendment_progression_ceiling_or_null": "ELIGIBLE_NOW_ALLOWED" | "REVIEW_ONLY" | "RECONCILE_FIRST" | null;
  "candidate_benign_drift_eligibility_state_or_null": "ALLOWED" | "FORBIDDEN" | null;
  "internal_chain_continuity_asserted_or_null": boolean | null;
  "selection_outcome": DriftBaselineSelectionVisualizationSelectionOutcome;
  "loss_reason_codes": Array<string>;
  "selection_reason_codes_if_selected": Array<string>;
  "candidate_frozen_hash_or_null": string | null;
  "candidate_supersedes_frozen_hash_or_null": string | null;
  "candidate_superseded_by_frozen_hash_or_null": string | null;
  "candidate_supersession_state": DriftBaselineSelectionVisualizationCandidateSupersessionState;
};

export type DriftBaselineSelectionVisualizationLineageEntry = {
  "lineage_rank": number;
  "baseline_envelope_ref": string;
  "baseline_frozen_hash": string;
  "baseline_ref": string;
  "baseline_type": DriftBaselineSelectionVisualizationBaselineType;
  "baseline_submission_state": DriftBaselineSelectionVisualizationBaselineSubmissionState;
  "selected_scope_refs": Array<string>;
  "selection_contract_hash": string;
  "supersedes_baseline_frozen_hash_or_null": string | null;
  "superseded_at_or_null": ISO8601DateTimeString;
  "lineage_disposition": DriftBaselineSelectionVisualizationLineageDisposition;
};

export type DriftBaselineSelectionVisualizationBasisContract = {
  "contract_version": "DRIFT_BASELINE_SELECTION_VISUALIZATION_BASIS_V1";
  "basis_contract_hash": string;
  "execution_mode_boundary_hash": string;
  "source_manifest_id": string;
  "source_manifest_hash": string;
  "source_period": string;
  "active_exact_scope_key": string;
  "target_scope_refs": Array<string>;
  "candidate_refs": Array<string>;
  "candidate_universe_hash": string;
  "prior_active_baseline_envelope_ref_or_null": string | null;
  "prior_active_baseline_frozen_hash_or_null": string | null;
  "selection_profile_code": "DRIFT_BASELINE_SELECTION_V1";
  "dominance_key_profile_code": "DRIFT_BASELINE_DOMINANCE_KEY_V1";
  "scope_widening_policy": "EXACT_SCOPE_FIRST_NO_SILENT_CROSS_PARTITION_WIDENING";
  "external_truth_policy": "SAME_SCOPE_AUTHORITY_AND_OUT_OF_BAND_TRUTH_MUST_REMAIN_SCOPE_BOUND";
  "supersession_policy": "IMMUTABLE_ENVELOPE_REUSE_OR_SUCCESSOR_ONLY";
  "tie_break_policy": "LEXICOGRAPHIC_DOMINANCE_KEY_WITH_STABLE_ID_TIEBREAK";
  "uncertainty_policy": "BASELINE_ANCHOR_WEIGHT_RAISES_UNCERTAINTY_ONLY";
  "replay_reuse_policy": "PERSISTED_ENVELOPE_AND_CANDIDATE_LINEAGE_ONLY";
};
export const DriftBaselineSelectionVisualizationBasisContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/drift_baseline_selection_visualization_basis_contract.schema.json", sourceHash: "ed1bae438975cf7c318494faa7cb07ddae4254016f6701a1f195157faa6ebc12" } as const;

export type DriftRecord = {
  "artifact_type": "DriftRecord";
  "drift_id": string;
  "manifest_id": string;
  "baseline_ref": string;
  "baseline_envelope_ref": string;
  "baseline_manifest_id": string | null;
  "comparison_manifest_id": string | null;
  "baseline_type": "WORKING" | "FILED" | "AMENDED" | "AUTHORITY_CORRECTED" | "OUT_OF_BAND";
  "baseline_scope_refs": Array<string>;
  "drift_scope_refs": Array<string>;
  "active_exact_scope_key": string;
  "baseline_basis_ref": string;
  "authority_basis_refs": Array<string>;
  "drift_scope": "RECORD_LAYER" | "ADJUSTMENT_LAYER" | "AUTHORITY_LAYER" | "DECLARATION_LAYER" | "EXPLANATION_LAYER" | "RETENTION_LIMITED_LAYER";
  "difference_classes": Array<"FACT_STATE" | "TOTAL_STATE" | "FILING_STATE" | "AUTHORITY_STATE" | "EXPLANATION_STATE">;
  "field_deltas": Array<DriftRecordFieldDelta>;
  "money_profile": SchemaBundle;
  "plane_pressures": DriftRecordPlanePressures;
  "tax_delta_abs": SchemaBundle;
  "tax_delta_rel": number;
  "drift_pressure": number;
  "amendment_pressure": number;
  "critical_field_delta_count": number;
  "cause_codes": Array<"LATE_SOURCE_ARRIVAL" | "SOURCE_CORRECTION" | "CATEGORY_RECLASSIFICATION" | "PARTITION_REALLOCATION" | "RULE_OR_CONFIG_DIFFERENCE" | "AUTHORITY_REFERENCE_CHANGE" | "AUTHORITY_CORRECTION" | "OUT_OF_BAND_FILING_DISCOVERED" | "OVERRIDE_CHANGE" | "RETENTION_LIMITED_HISTORY" | "PREVIOUS_EXTRACTION_ERROR" | "CALCULATION_PATH_CHANGE">;
  "materiality_profile_ref": string | null;
  "materiality_class": "NO_CHANGE" | "EXPLANATION_ONLY" | "BENIGN_DRIFT" | "MATERIAL_REVIEW" | "AMENDMENT_REQUIRED" | null;
  "lifecycle_state": "NOT_ASSESSED" | "NO_CHANGE" | "EXPLANATION_ONLY" | "BENIGN_DRIFT" | "MATERIAL_REVIEW" | "REVIEW_REQUIRED" | "AMENDMENT_REQUIRED" | "RESOLVED" | "SUPERSEDED";
  "amendment_recommendation": "NO_ACTION" | "EXPLAIN_ONLY" | "REVIEW_ONLY" | "RECONCILE_FIRST" | "PREPARE_AMENDMENT" | "SUBMIT_AMENDMENT" | null;
  "amendment_eligibility_contract": AmendmentEligibilityContract;
  "amendment_window_context_ref": string | null;
  "retroactive_impact_ref": string | null;
  "late_data_indicator_refs": Array<string>;
  "source_contradiction_state": "NONE" | "CONTRADICTORY_EVIDENCE" | "CONTRADICTORY_AUTHORITY" | "CONTRADICTORY_SCOPE";
  "review_state": "NONE" | "REVIEW_OPEN" | "REVIEW_RESOLVED";
  "escalation_state": "NONE" | "OPERATOR_REVIEW" | "COMPLIANCE_ESCALATION" | "AUTHORITY_RECONCILIATION";
  "recommendation_cap": string | null;
  "automation_cap": string | null;
  "lineage_boundary_refs": Array<string>;
  "basis_limitations": Array<string>;
  "supersedes_drift_id": string | null;
  "superseded_at": ISO8601DateTimeString;
};
export const DriftRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/drift_record.schema.json", sourceHash: "dd55b48689d7c55a7afe41a937e1de1c80c05e8055fff53be0b0671506478ed2" } as const;

export type DriftRecordFieldDelta = {
  "field_code": string;
  "field_delta_abs": SchemaBundle;
  "field_delta_rel": number;
  "critical": boolean;
  "reason_codes"?: Array<string>;
};

export type DriftRecordPlanePressures = {
  "fact": number;
  "total": number;
  "filing": number;
  "authority": number;
  "explanation": number;
};

export type ExecutionModeBoundaryContract = {
  "contract_version": "EXECUTION_MODE_BOUNDARY_V1";
  "boundary_hash": string;
  "run_kind": "INTERACTIVE" | "NIGHTLY" | "BACKFILL" | "REPLAY" | "REMEDIATION" | "AMENDMENT" | "MIGRATION";
  "replay_class_or_null": "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "execution_posture": "LIVE_COMPLIANCE" | "LIVE_ANALYSIS" | "REPLAY_COMPLIANCE" | "REPLAY_COUNTERFACTUAL";
  "legal_effect_boundary": "COMPLIANCE_CAPABLE" | "MODELED_READ_ONLY" | "HISTORICAL_REPLAY_READ_ONLY" | "COUNTERFACTUAL_REPLAY_READ_ONLY";
  "disclosure_reason_codes": Array<string>;
};
export const ExecutionModeBoundaryContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/execution_mode_boundary_contract.schema.json", sourceHash: "60d71142dc223155c01080d292def49fa6eaa53823d39f575a63fca5c8d4eca8" } as const;

export type ExternalizationGovernanceContract = {
  "contract_version": "EXTERNALIZATION_GOVERNANCE_V1";
  "boundary_scope": "AUDIT_INVESTIGATION_FRAME" | "CLIENT_DOCUMENT_REQUEST" | "CLIENT_APPROVAL_PACK" | "ENQUIRY_PACK" | "AUTHORITY_LINK_HANDOFF";
  "tenant_id": string;
  "shell_family_or_null": "CLIENT_PORTAL_SHELL" | "GOVERNANCE_DENSITY_SHELL" | null;
  "context_anchor_ref": string;
  "slice_binding_ref": string;
  "delivery_surface_kind": "FILTERED_AUDIT_EXPORT" | "PORTAL_DOCUMENT_DOWNLOAD" | "PORTAL_APPROVAL_EXPORT" | "EXPLANATION_EXPORT" | "AUTHORITY_LINK_EXTERNAL_HANDOFF";
  "history_meaning_state": "ACTIVE_FILTERED_SLICE" | "CURRENT_ONLY" | "CURRENT_WITH_HISTORY_EXPLICIT" | "CURRENT_DECLARATION_OR_ISSUED_RECEIPT" | "LIMITED_EXPLANATION_EXPLICIT" | "HANDOFF_TARGET_EXPLICIT";
  "eligibility_state": "READY" | "MASKED_ONLY" | "LIMITED_READY" | "APPROVAL_REQUIRED" | "BLOCKED" | "PENDING_RETURN";
  "approval_state": "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED" | "DENIED";
  "access_binding_hash_or_null": string | null;
  "masking_state": "NONE" | "CUSTOMER_SAFE_ONLY" | "MASKED_EXPORT_ONLY" | "LIMITED_EXPORT" | "NOT_APPLICABLE";
  "masking_posture_fingerprint_or_null": string | null;
  "limitation_state": "FULL" | "INTEGRITY_LIMITED" | "HISTORY_LIMITED" | "RETENTION_LIMITED" | "PREFLIGHT_BLOCKED" | "POLICY_LIMITED" | "NOT_APPLICABLE";
  "visibility_cache_partition_key_or_null": string | null;
  "preview_target_ref_or_null": string | null;
  "download_target_ref_or_null": string | null;
  "print_target_ref_or_null": string | null;
  "external_handoff_target_ref_or_null": string | null;
  "approval_requirement_token_or_null": string | null;
  "blocking_context_tokens": Array<string>;
  "delivery_binding_hash": string;
  "slice_binding_policy": "ACTIVE_GOVERNED_SLICE_REQUIRED";
  "background_scope_policy": "DETACHED_BACKGROUND_SCOPE_FORBIDDEN";
  "direct_url_policy": "DIRECT_URL_BYPASS_FORBIDDEN";
  "posture_preservation_policy": "CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED";
  "handoff_target_policy": "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT";
  "reentry_validation_policy": "RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION";
  "delivery_context_policy": "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION";
  "signed_url_binding_policy": "SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING";
  "temporary_artifact_policy": "TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING";
};
export const ExternalizationGovernanceContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/externalization_governance_contract.schema.json", sourceHash: "973875f67a124bfdb5b2477e2c3457210cf1aa183f2c04ebe46b860546494b2a" } as const;

export type FilingCase = {
  "artifact_type": "FilingCase";
  "filing_case_id": string;
  "tenant_id": string;
  "client_id": string;
  "period": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "lifecycle_state": "NOT_STARTED" | "PREPARING" | "READY_REVIEW" | "READY_TO_SUBMIT" | "SUBMITTED_PENDING" | "FILED_CONFIRMED" | "FILED_UNKNOWN" | "REJECTED" | "AMENDMENT_ELIGIBLE" | "AMENDMENT_IN_PROGRESS" | "AMENDED_CONFIRMED" | "CLOSED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "FILING_CASE";
    "machine_code"?: "FILING_CASE_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "current_manifest_ref": string | null;
  "current_trust_ref": string | null;
  "current_parity_ref": string | null;
  "current_submission_ref": string | null;
  "current_submission_state": "INTENT_RECORDED" | "TRANSMIT_PENDING" | "TRANSMITTED" | "PENDING_ACK" | "CONFIRMED" | "REJECTED" | "UNKNOWN" | "OUT_OF_BAND" | "SUPERSEDED" | null;
  "current_packet_ref": string | null;
  "packet_state": "DRAFT" | "PREPARED" | "APPROVED_TO_SUBMIT" | "SUBMITTED" | "VOID" | "SUPERSEDED" | null;
  "calculation_basis_ref": string | null;
  "authority_calculation_ref": string | null;
  "amendment_case_ref": string | null;
  "calculation_request_ref": string | null;
  "calculation_id": string | null;
  "calculation_type": string | null;
  "calculation_hash": string | null;
  "readiness_context_ref": string | null;
  "trust_currency_state": "CURRENT" | "RECALC_REQUIRED" | "NOT_APPLICABLE_PRETRUST" | null;
  "trust_invalidated_at": ISO8601DateTimeString;
  "trust_invalidation_reason_codes": Array<string>;
  "trust_invalidation_dependency_refs": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "user_confirmation_ref": string | null;
  "last_transition_at": ISO8601DateTimeString;
  "controlling_proof_bundle_ref": string | null;
  "proof_closure_state": "NOT_APPLICABLE" | "CLOSED" | "OPEN";
};
export const FilingCaseSchemaLineage = { schemaId: "https://taxat.dev/schemas/filing_case.schema.json", sourceHash: "4ac49e59054e9e251f437bc8aeb2108a1bc8284d8450c2cb31bbafb44579d598" } as const;

export type FilingNoticeResolution = {
  "artifact_type": "FilingNoticeResolution";
  "notice_resolution_id": string;
  "manifest_id": string;
  "packet_id": string;
  "notice_step_refs": Array<string>;
  "notice_requirements_satisfied": boolean;
  "approval_state": "NOT_REQUIRED" | "SATISFIED" | "REQUIRED_PENDING" | "UNSATISFIABLE" | "DENIED";
  "declared_basis_ack_state": "NOT_APPLICABLE" | "NOT_REQUIRED" | "SATISFIED" | "REQUIRED_PENDING" | "UNSATISFIABLE";
  "notice_refs": Array<string>;
  "unresolved_reason_codes": Array<string>;
  "resolved_at": ISO8601DateTimeString;
};
export const FilingNoticeResolutionSchemaLineage = { schemaId: "https://taxat.dev/schemas/filing_notice_resolution.schema.json", sourceHash: "c20cb5718eb58ce5b11f4a8909500fedf18f41e52e1a9ef52cf4b1439698bb0f" } as const;

export type FilingNoticeStep = {
  "artifact_type": "FilingNoticeStep";
  "notice_step_id": string;
  "manifest_id": string;
  "packet_id": string;
  "step_code": "DECLARED_BASIS_ACK_REQUIRED" | "DISCLAIMER_ACK_REQUIRED" | "PACKET_APPROVAL_REQUIRED";
  "lifecycle_state": "PENDING" | "SATISFIED" | "UNSATISFIABLE";
  "reason_codes": Array<string>;
  "scope_refs": Array<string>;
  "packet_refs": Array<string>;
  "created_at": ISO8601DateTimeString;
  "resolved_at": ISO8601DateTimeString;
};
export const FilingNoticeStepSchemaLineage = { schemaId: "https://taxat.dev/schemas/filing_notice_step.schema.json", sourceHash: "3cbf1abd3f5e335c626cf154b8c5fe0b2f53e19a41dc48cfbb67e1714258a4b9" } as const;

export type FilingPacket = {
  "artifact_type": "FilingPacket";
  "packet_id": string;
  "manifest_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "lifecycle_state": "DRAFT" | "PREPARED" | "APPROVED_TO_SUBMIT" | "SUBMITTED" | "VOID" | "SUPERSEDED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "FILING_PACKET";
    "machine_code"?: "FILING_PACKET_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "payload_ref": string;
  "payload_hash": string;
  "manifest_binding_hash": string;
  "declared_basis": string;
  "disclaimers": Array<string>;
  "calculation_basis_ref": string | null;
  "authority_calculation_ref": string | null;
  "readiness_context_ref": string | null;
  "user_confirmation_ref": string | null;
  "controlling_proof_bundle_ref": string | null;
  "proof_closure_state": "NOT_APPLICABLE" | "OPEN" | "CLOSED";
  "approval_state": "NOT_REQUIRED" | "SATISFIED" | "REQUIRED_PENDING" | "UNSATISFIABLE" | "DENIED" | null;
  "declared_basis_ack_state": "NOT_APPLICABLE" | "NOT_REQUIRED" | "SATISFIED" | "REQUIRED_PENDING" | "UNSATISFIABLE" | null;
  "notice_step_refs": Array<string>;
  "notice_resolution_ref": string | null;
  "filing_gate_ref": string | null;
  "created_at": ISO8601DateTimeString;
  "approved_at": ISO8601DateTimeString;
  "submitted_at": ISO8601DateTimeString;
  "voided_at": ISO8601DateTimeString;
  "superseded_at": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
};
export const FilingPacketSchemaLineage = { schemaId: "https://taxat.dev/schemas/filing_packet.schema.json", sourceHash: "4ffab96fe91fcf225680c0365635275ecf93b626c8e14d2a698f5d26e26278eb" } as const;

export type InvariantEnforcementContract = {
  "contract_version": "INVARIANT_ENFORCEMENT_V1";
  "boundary_scope": "RUN_MANIFEST" | "ERROR_RECORD";
  "boundary_specific_binding_policy": "MANIFEST_RETAINS_FAIL_CLOSED_STAGE_AND_PRIMARY_ERROR_LINK" | "ERROR_RETAINS_INVARIANT_CLASS_FAULT_CODE_AND_TERMINAL_BINDING";
  "invariant_failure_state": "NOT_TRIGGERED" | "TRIGGERED";
  "invariant_class_or_null": "SCOPE_BINDING" | "MANIFEST_REUSE" | "LIFECYCLE_TRANSITION" | "PRESEAL_GATE_CHAIN" | "INPUT_POLICY" | "CANONICAL_PROMOTION" | "GRAPH_PROVENANCE" | "AMENDMENT_SUBMISSION" | "FILING_READINESS" | "REPLAY_BASIS" | "AUTHORITY_PREFLIGHT" | null;
  "error_family_or_null": "MANIFEST_ERROR" | "INPUT_BOUNDARY_ERROR" | "CANONICALIZATION_ERROR" | "PROVENANCE_ERROR" | "AMENDMENT_ERROR" | "WORKFLOW_ERROR" | "AUTHORITY_PROTOCOL_ERROR" | "SYSTEM_FAULT" | null;
  "error_code_or_null": string | null;
  "failure_stage_or_null": "PRESTART" | "POSTSTART" | null;
  "terminal_manifest_state_or_null": "BLOCKED" | "FAILED" | null;
  "transition_event_code_or_null": "system_fault" | null;
  "terminal_audit_event_type_or_null": "ManifestBlocked" | "ManifestFailed" | null;
  "error_record_ref_or_null": string | null;
  "typed_error_policy": "INVARIANTS_MUST_PERSIST_FAMILY_SPECIFIC_ERROR_RECORDS";
  "partial_write_policy": "NO_PARTIAL_MUTATION_OR_SIDE_EFFECT_AFTER_INVARIANT_FAILURE";
  "audit_evidence_policy": "INVARIANTS_REQUIRE_ERROR_AND_TERMINAL_AUDIT_EVIDENCE";
  "lifecycle_mapping_policy": "PRESTART_INVARIANTS_BLOCK_POSTSTART_INVARIANTS_FAIL";
  "assertion_conversion_policy": "ASSERTIONS_AND_GENERIC_EXCEPTIONS_MUST_COLLAPSE_TO_TYPED_FAIL_CLOSED_OUTCOMES";
  "normalization_rejection_policy": "IMPOSSIBLE_STATES_REJECTED_NEVER_NORMALIZED";
};
export const InvariantEnforcementContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/invariant_enforcement_contract.schema.json", sourceHash: "5438c9995521d16b98ceaef16984ff821d2431fce5c851813f79507e2f1c91aa" } as const;

export type LateDataConsequenceSummary = {
  "summary_profile_code": "LATE_DATA_SUMMARY_V1";
  "true_post_baseline_event_count": number;
  "pre_cutoff_preexisting_late_arrival_count": number;
  "post_cutoff_discovery_pre_baseline_fact_count": number;
  "authority_posting_lag_count": number;
  "temporally_unproved_count": number;
  "highest_legal_consequence": "NONE" | "CURRENT_SCOPE_INVALIDATION" | "RETROACTIVE_IMPACT_REVIEW" | "TEMPORAL_UNCERTAINTY_BLOCK";
  "retroactive_impact_required": boolean;
  "trust_invalidation_required": boolean;
  "proof_staleness_required": boolean;
  "amendment_reuse_invalidated": boolean;
  "blocking_temporal_uncertainty_present": boolean;
  "replay_lineage_policy": "HISTORICAL_LINEAGE_ONLY";
  "reason_codes": Array<string>;
};
export const LateDataConsequenceSummarySchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_consequence_summary.schema.json", sourceHash: "6fba4f5d4c59c261243981380cefb5d5d1511d72e33f15098ed59f8460f0de41" } as const;

export type LateDataFinding = {
  "artifact_type": "LateDataFinding";
  "finding_id": string;
  "manifest_id": string;
  "indicator_refs": Array<string>;
  "binding_ref": string;
  "source_domain": string;
  "source_class": LateDataPolicyBinding;
  "partition_scope_refs": LateDataPolicyBinding;
  "runtime_scope_refs": LateDataPolicyBinding;
  "late_data_policy_ref": LateDataPolicyBinding;
  "severity": "NOTICE" | "MANUAL_REVIEW" | "CHILD_MANIFEST_REQUIRED";
  "temporal_classification_contract": LateDataTemporalContract;
  "finding_state": "OPEN" | "EXCLUDED_FROM_ACTIVE_MANIFEST" | "REVIEW_REQUIRED" | "CHILD_MANIFEST_SPAWNED" | "SUPERSEDED";
  "active_manifest_effect": "NONE" | "NOTICE_ONLY" | "REVIEW_REQUIRED" | "OUT_OF_SCOPE_CHILD_REQUIRED";
  "child_manifest_ref": string | null;
  "workflow_item_ref": string | null;
  "superseded_by_finding_ref": string | null;
  "discovered_at": ISO8601DateTimeString;
  "resolved_at": ISO8601DateTimeString;
  "reason_codes": Array<string>;
};
export const LateDataFindingSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_finding.schema.json", sourceHash: "3c2661f4f4c7a27b45e2aaca01edb4525a37d2b41c77d3356d75fc0508f9a0ac" } as const;

export type LateDataIndicator = {
  "request_audit_ref": string;
} | {
  "source_record_ref": string;
} | {
  "evidence_ref": string;
};
export const LateDataIndicatorSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_indicator.schema.json", sourceHash: "26565dc5354c23c822edbd6b20f9bd3a4d33d86fa43494019aeadfa92a7fdce9" } as const;

export type LateDataIndicatorSet = {
  "set_id": string;
  "manifest_id": string;
  "artifact_type": "LateDataIndicatorSet";
  "collection_boundary_ref": string;
  "source_plan_ref": string;
  "runtime_scope_refs": LateDataPolicyBinding;
  "items": Array<LateDataIndicator>;
  "contract": SchemaBundle;
} & {
  "artifact_contract_hash": string;
  "item_identity_hash": string;
  "set_hash": string;
  "produced_at": ISO8601DateTimeString;
};
export const LateDataIndicatorSetSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_indicator_set.schema.json", sourceHash: "f821b361be87c9b110fcbee7a08dc5a99763f27c0c2209c883f02b2db2c51de5" } as const;

export type LateDataMonitorResult = {
  "artifact_type": "LateDataMonitorResult";
  "late_data_monitor_id": string;
  "manifest_id": string;
  "manifest_hash": string;
  "execution_basis_hash": string;
  "collection_boundary_ref": string;
  "source_window_ref": string;
  "input_freeze_ref": string;
  "runtime_scope_refs": LateDataPolicyBinding;
  "latest_indicator_set_ref": string;
  "finding_refs": Array<string>;
  "late_data_status": "NO_LATE_DATA" | "EXCLUDED_LATE_ONLY" | "REVIEW_REQUIRED" | "SPAWN_CHILD_MANIFEST_REQUIRED";
  "total_finding_count": number;
  "excluded_count": number;
  "review_required_count": number;
  "child_manifest_required_count": number;
  "temporal_consequence_summary": LateDataConsequenceSummary;
  "child_manifest_refs": Array<string>;
  "workflow_item_refs": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "classified_at": ISO8601DateTimeString;
  "reason_codes": Array<string>;
};
export const LateDataMonitorResultSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_monitor_result.schema.json", sourceHash: "4618a96169467eec2ae352b8559746ce40af398c0ca325a103da8fb3f5ee9a5a" } as const;

export type LateDataPolicyBinding = {
  "binding_id": string;
  "source_domain": string;
  "source_class": LateDataPolicyBindingSourceClassOrNull;
  "partition_scope_refs": LateDataPolicyBindingPartitionScopeRefs;
  "runtime_scope_refs": LateDataPolicyBindingRuntimeScopeRefs;
  "late_data_policy_ref": LateDataPolicyBindingLateDataPolicyRef;
  "binding_scope": LateDataPolicyBindingBindingScope;
  "precedence_rank": number;
};
export const LateDataPolicyBindingSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_policy_binding.schema.json", sourceHash: "87d4ee1a12c91761a34f79fdcaad68e113c1fc7e66e74b88f442329097543ce7" } as const;

export type LateDataPolicyBindingSourceClass = "AUTHORITY_ACKNOWLEDGEMENT" | "AUTHORITY_REFERENCE" | "INSTITUTIONAL_FEED" | "BOOKS_OF_ENTRY" | "DOCUMENTARY_EVIDENCE" | "DECLARED_ASSERTION" | "DETERMINISTIC_DERIVATION" | "PROBABILISTIC_INFERENCE" | "GOVERNANCE_ARTIFACT";

export type LateDataPolicyBindingSourceClassOrNull = "AUTHORITY_ACKNOWLEDGEMENT" | "AUTHORITY_REFERENCE" | "INSTITUTIONAL_FEED" | "BOOKS_OF_ENTRY" | "DOCUMENTARY_EVIDENCE" | "DECLARED_ASSERTION" | "DETERMINISTIC_DERIVATION" | "PROBABILISTIC_INFERENCE" | "GOVERNANCE_ARTIFACT" | null;

export type LateDataPolicyBindingPartitionScopeRefs = Array<string>;

export type LateDataPolicyBindingRuntimeScopeRefs = Array<"year_end" | "quarterly_update" | "estimate_only" | "prepare_submission" | "submit" | "amendment_intent" | "amendment_submit">;

export type LateDataPolicyBindingLateDataPolicyRef = "EXCLUDE_LATE" | "SPAWN_CHILD_MANIFEST" | "REVIEW_IF_LATE";

export type LateDataPolicyBindingBindingScope = "DOMAIN_WIDE" | "SOURCE_CLASS" | "PARTITION_SCOPED" | "RUNTIME_SCOPED";

export type LateDataRetroactiveImpactSimulation = {
  "artifact_type": "LateDataRetroactiveImpactSimulation";
  "simulation_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "run_kind"?: "REPLAY";
    "replay_class_or_null"?: "COUNTERFACTUAL_ANALYSIS";
    "execution_mode"?: "ANALYSIS";
    "analysis_only"?: true;
    "execution_posture"?: "REPLAY_COUNTERFACTUAL";
    "legal_effect_boundary"?: "COUNTERFACTUAL_REPLAY_READ_ONLY";
    "counterfactual_basis"?: "LATE_DATA_RETROACTIVE_IMPACT_SIMULATION";
  };
  "basis_contract": LateDataRetroactiveImpactSimulationBasisContract;
  "scenario_results": Array<LateDataRetroactiveImpactSimulationScenarioResult>;
  "current_only_count": number;
  "explanation_only_count": number;
  "amendment_triggering_count": number;
  "replay_triggering_count": number;
  "review_blocked_count": number;
  "simulated_by_principal_ref": string;
  "simulated_at": ISO8601DateTimeString;
  "simulation_hash": string;
};
export const LateDataRetroactiveImpactSimulationSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_retroactive_impact_simulation.schema.json", sourceHash: "60b38510166727600d60bca0fb716d6335081e5e4ffb295038e1be4e843a9541" } as const;

export type LateDataRetroactiveImpactSimulationTemporalClass = "PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL" | "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT" | "AUTHORITY_POSTING_LAG" | "TRUE_POST_BASELINE_EVENT" | "TEMPORALLY_UNPROVED";

export type LateDataRetroactiveImpactSimulationBaselineScopeClass = "CURRENT_SCOPE" | "PRIOR_SUBMISSION_CHAIN";

export type LateDataRetroactiveImpactSimulationLegalEffectBasis = "EFFECTIVE_TIME" | "VISIBILITY_TIME" | "AUTHORITY_PUBLICATION_TIME" | "UNKNOWN";

export type LateDataRetroactiveImpactSimulationTemporalCertaintyState = "PROVED" | "UNPROVED";

export type LateDataRetroactiveImpactSimulationLateDataStatus = "NO_LATE_DATA" | "EXCLUDED_LATE_ONLY" | "REVIEW_REQUIRED" | "SPAWN_CHILD_MANIFEST_REQUIRED";

export type LateDataRetroactiveImpactSimulationHighestLegalConsequence = "NONE" | "CURRENT_SCOPE_INVALIDATION" | "RETROACTIVE_IMPACT_REVIEW" | "TEMPORAL_UNCERTAINTY_BLOCK";

export type LateDataRetroactiveImpactSimulationBoundedRetroactivityClass = "NONE" | "CURRENT_SCOPE_ONLY" | "RESTATE_PRIOR_POSITION" | "REOPEN_CHAIN_REPLAY" | "AUTHORITY_RECONCILIATION_REQUIRED";

export type LateDataRetroactiveImpactSimulationReplayRequirement = "NONE" | "CONTINUATION_CHILD" | "EXACT_REPLAY" | "RECONCILE_FIRST";

export type LateDataRetroactiveImpactSimulationTrustCurrencyState = "CURRENT" | "RECALC_REQUIRED";

export type LateDataRetroactiveImpactSimulationProofEffect = "NONE" | "STALE_REVALIDATION_REQUIRED";

export type LateDataRetroactiveImpactSimulationAmendmentEffect = "NONE" | "INVALIDATE_READINESS_REUSE" | "RECONCILE_FIRST";

export type LateDataRetroactiveImpactSimulationOutcomeClass = "CURRENT_ONLY" | "EXPLANATION_ONLY" | "AMENDMENT_TRIGGERING" | "REPLAY_TRIGGERING" | "REVIEW_BLOCKED";

export type LateDataRetroactiveImpactSimulationHistoricalPositionHandling = "NO_HISTORICAL_MUTATION_NEEDED" | "BOUNDED_CONTINUATION_OR_REPLAY_REQUIRED" | "RECONCILIATION_BEFORE_ANY_MUTATION";

export type LateDataRetroactiveImpactSimulationScenarioResult = {
  "scenario_case_code": LateDataRetroactiveImpactSimulationTemporalClass;
  "t_effective_or_null": ISO8601DateTimeString;
  "t_visible_or_null": ISO8601DateTimeString;
  "t_discovered": ISO8601DateTimeString;
  "baseline_scope_class": LateDataRetroactiveImpactSimulationBaselineScopeClass;
  "filing_critical_baseline_touch": boolean;
  "decisive_proof_path_touch": boolean;
  "legal_effect_basis": LateDataRetroactiveImpactSimulationLegalEffectBasis;
  "temporal_certainty_state": LateDataRetroactiveImpactSimulationTemporalCertaintyState;
  "late_data_status": LateDataRetroactiveImpactSimulationLateDataStatus;
  "highest_legal_consequence": LateDataRetroactiveImpactSimulationHighestLegalConsequence;
  "bounded_retroactivity_class": LateDataRetroactiveImpactSimulationBoundedRetroactivityClass;
  "replay_requirement": LateDataRetroactiveImpactSimulationReplayRequirement;
  "restatement_required": boolean;
  "impacted_scope_refs": Array<string>;
  "impacted_submission_refs": Array<string>;
  "restatement_scope_refs": Array<string>;
  "trust_currency_state": LateDataRetroactiveImpactSimulationTrustCurrencyState;
  "proof_effect": LateDataRetroactiveImpactSimulationProofEffect;
  "amendment_effect": LateDataRetroactiveImpactSimulationAmendmentEffect;
  "historical_position_handling": LateDataRetroactiveImpactSimulationHistoricalPositionHandling;
  "simulation_outcome_class": LateDataRetroactiveImpactSimulationOutcomeClass;
  "reason_codes": Array<string>;
};

export type LateDataRetroactiveImpactSimulationBasisContract = {
  "required_temporal_classes"?: JsonValue;
} & {
  "required_temporal_classes"?: JsonValue;
} & {
  "required_temporal_classes"?: JsonValue;
} & {
  "required_temporal_classes"?: JsonValue;
} & {
  "required_temporal_classes"?: JsonValue;
} & {
  "required_outcome_classes"?: JsonValue;
} & {
  "required_outcome_classes"?: JsonValue;
} & {
  "required_outcome_classes"?: JsonValue;
} & {
  "required_outcome_classes"?: JsonValue;
} & {
  "required_outcome_classes"?: JsonValue;
};
export const LateDataRetroactiveImpactSimulationBasisContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json", sourceHash: "acb388e46f3e8d43be81c582b224d580200ad773285ebd792528709a5ae5ac44" } as const;

export type LateDataRetroactiveImpactSimulationBasisContractTemporalClass = "PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL" | "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT" | "AUTHORITY_POSTING_LAG" | "TRUE_POST_BASELINE_EVENT" | "TEMPORALLY_UNPROVED";

export type LateDataRetroactiveImpactSimulationBasisContractOutcomeClass = "CURRENT_ONLY" | "EXPLANATION_ONLY" | "AMENDMENT_TRIGGERING" | "REPLAY_TRIGGERING" | "REVIEW_BLOCKED";

export type LateDataTemporalContract = {
  "classification_profile_code": "LATE_DATA_TEMPORAL_V1";
  "temporal_classification": "TEMPORALLY_UNPROVED" | "AUTHORITY_POSTING_LAG" | "TRUE_POST_BASELINE_EVENT" | "PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL" | "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT";
  "temporal_certainty_state": "PROVED" | "UNPROVED";
  "legal_effect_basis": "EFFECTIVE_TIME" | "VISIBILITY_TIME" | "AUTHORITY_PUBLICATION_TIME" | "UNKNOWN";
  "baseline_scope_class": "NONE" | "CURRENT_SCOPE" | "PRIOR_SUBMISSION_CHAIN";
  "filing_critical_baseline_touch": boolean;
  "t_cutoff": ISO8601DateTimeString;
  "t_effective_or_null": ISO8601DateTimeString;
  "t_visible_or_null": ISO8601DateTimeString;
  "t_discovered": ISO8601DateTimeString;
  "retroactive_impact_required": boolean;
  "trust_invalidation_required": boolean;
  "proof_staleness_required": boolean;
  "amendment_reuse_invalidated": boolean;
  "replay_lineage_policy": "HISTORICAL_LINEAGE_ONLY";
  "reason_codes": Array<string>;
};
export const LateDataTemporalContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/late_data_temporal_contract.schema.json", sourceHash: "99511eb06531115230f8885406e6abfbf541f8222e3ed879b21e0f378e873823" } as const;

export type MutationPreconditionBinding = {
  "profile_code": "MANIFEST_RENDER_FRAME" | "MANIFEST_APPROVAL_PACK_REVIEW" | "WORK_ITEM_STATE_MUTATION" | "WORK_ITEM_INTERNAL_APPEND" | "WORK_ITEM_CUSTOMER_APPEND" | "WORK_ITEM_REQUEST_RESPONSE" | "CLIENT_PORTAL_ROUTE_MUTATION" | "GOVERNANCE_POLICY_MUTATION" | "GOVERNANCE_SIMULATION_COMMIT";
  "target_scope_classes": Array<"MANIFEST" | "WORK_ITEM" | "GOVERNANCE">;
  "required_guard_fields": Array<"if_match_decision_bundle_hash" | "if_match_shell_stability_token" | "if_match_frame_epoch" | "if_match_work_item_version" | "if_match_internal_head_sequence" | "if_match_customer_head_sequence" | "if_match_request_state_version" | "if_match_approval_pack_hash" | "if_match_client_portal_workspace_version" | "if_match_policy_snapshot_hash" | "if_match_dependency_topology_hash" | "simulation_basis_hash">;
  "stale_guard_families": Array<"DECISION_BUNDLE_HASH" | "SHELL_STABILITY_TOKEN" | "FRAME_EPOCH" | "WORK_ITEM_VERSION" | "INTERNAL_THREAD_HEAD" | "CUSTOMER_THREAD_HEAD" | "REQUEST_STATE_VERSION" | "APPROVAL_PACK_HASH" | "CLIENT_PORTAL_WORKSPACE_VERSION" | "POLICY_SNAPSHOT_HASH" | "DEPENDENCY_TOPOLOGY_HASH" | "SIMULATION_BASIS_HASH" | "MUTATION_BASIS_CONTRACT_HASH">;
  "requires_live_freshness": boolean;
  "invalidates_on_visibility_shift": boolean;
};
export const MutationPreconditionBindingSchemaLineage = { schemaId: "https://taxat.dev/schemas/mutation_precondition_binding.schema.json", sourceHash: "3ecd94abd5e8e79e464ab47c4d54308a64289a23cda088bf96824f15b0cf8f1e" } as const;

export type ObligationMirror = {
  "artifact_type": "ObligationMirror";
  "obligation_mirror_id": string;
  "tenant_id": string;
  "client_id": string;
  "income_source_partition": string;
  "period": string;
  "authority_truth_contract": AuthorityTruthContract & {
    "boundary_scope"?: "OBLIGATION_MIRROR";
    "truth_surface_role"?: "INTERNAL_OBLIGATION_MIRROR";
    "surface_specific_binding_policy"?: "MIRROR_IS_INTERNAL_VIEW_WITH_EXPLICIT_AUTHORITY_STATE";
  };
  "authority_ingress_proof_contract": AuthorityIngressProofContract & {
    "binding_scope_class"?: "OBLIGATION_MIRROR";
  } | null;
  "authority_truth_state": "NOT_APPLICABLE" | "NOT_REQUESTED" | "UNKNOWN" | "PENDING_ACK" | "PARTIAL_ACK" | "CONFIRMED" | "REJECTED" | "OUT_OF_BAND";
  "lifecycle_state": "NOT_YET_OPEN" | "OPEN" | "DUE_SOON" | "READY_TO_FILE" | "SUBMITTED_PENDING" | "MET_CONFIRMED" | "LATE_UNMET" | "NO_LONGER_RELEVANT";
  "authority_refs": Array<string>;
  "due_at": ISO8601DateTimeString;
  "current_submission_ref": string | null;
  "last_confirmed_submission_ref": string | null;
  "ready_manifest_ref": string | null;
  "blocked_reason_codes": Array<string>;
  "last_authority_sync_at": ISO8601DateTimeString;
  "reconciliation_control_contract_or_null": AuthorityReconciliationControlContract & {
    "binding_scope_class"?: "OBLIGATION_MIRROR";
  } | null;
  "authority_status_ref": string | null;
};
export const ObligationMirrorSchemaLineage = { schemaId: "https://taxat.dev/schemas/obligation_mirror.schema.json", sourceHash: "77ca99c8e2523ca82c718ab5b99f10654c62b84551bfd8c62784904af17414a2" } as const;

export type PresealGateEvaluationContract = {
  "contract_class": "MANIFEST_PRESEAL_GATE_EVALUATION";
  "manifest_id": string;
  "execution_basis_hash": string;
  "access_binding_hash": string;
  "authorized_scope": PresealGateEvaluationContractScopeArray;
  "required_gate_codes": PresealGateEvaluationContractPresealGateCodeArray;
  "evaluated_gate_codes": Array<"MANIFEST_GATE" | "ARTIFACT_CONTRACT_GATE" | "INPUT_BOUNDARY_GATE" | "DATA_QUALITY_GATE">;
  "ordered_gate_decision_ids": Array<string>;
  "blocking_gate_codes": Array<"MANIFEST_GATE" | "ARTIFACT_CONTRACT_GATE" | "INPUT_BOUNDARY_GATE" | "DATA_QUALITY_GATE">;
  "completion_state": "PENDING_PREREQUISITES" | "COMPLETE_READY_TO_SEAL" | "COMPLETE_BLOCKED_PRESTART";
  "prerequisite_materialization_state": "AWAITING_PREREQUISITE_MATERIALIZATION" | "FULLY_MATERIALIZED";
  "missing_prerequisite_refs": Array<string>;
  "durability_boundary": "NO_PERSISTED_TAPE_YET" | "PERSIST_PRESTART_TERMINAL_CONTEXT" | "ATOMIC_GATE_BATCH_AND_SEAL";
  "reuse_policy": "REUSE_PERSISTED_PRESEAL_TAPE_ONLY";
  "post_seal_interpretation_policy": "APPEND_ONLY_POSTSEAL_CANNOT_REINTERPRET_PRESEAL";
};
export const PresealGateEvaluationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/preseal_gate_evaluation_contract.schema.json", sourceHash: "658e41fcac6a3b20ec0f8320aad4d1ceaff56faab9eee3edb1c60256d24a81d1" } as const;

export type PresealGateEvaluationContractScopeArray = JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;

export type PresealGateEvaluationContractPresealGateCodeArray = Array<JsonValue>;

export type ProblemEnvelope = {
  "artifact_type": "ProblemEnvelope";
  "problem_code": string;
  "title": string;
  "detail": string;
  "reason_codes": Array<string>;
  "retryable": boolean;
  "correlation_id": string;
  "manifest_id": string | null;
  "latest_decision_bundle_ref": string | null;
  "latest_workspace_snapshot_ref": string | null;
  "latest_approval_pack_ref": string | null;
  "latest_client_portal_workspace_ref": string | null;
  "latest_upload_session_ref": string | null;
  "latest_policy_snapshot_ref": string | null;
  "latest_command_receipt_ref": string | null;
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "BOUNDARY_RECEIPT";
    "authoritative_record_families"?: ["RUN_MANIFEST","WORKFLOW_ITEM","AUTHORITY_INTERACTION_RECORD","GOVERNANCE_DOMAIN_OBJECT","AUDIT_EVENT","API_COMMAND_RECEIPT"];
    "observable_projection_families"?: ["DECISION_BUNDLE","WORKSPACE_SNAPSHOT","CLIENT_PORTAL_WORKSPACE","CLIENT_APPROVAL_PACK","CLIENT_UPLOAD_SESSION","GOVERNANCE_POLICY_SNAPSHOT"];
  };
  "mutation_precondition_binding_or_null": MutationPreconditionBinding | null;
  "stale_guard_family": "DECISION_BUNDLE_HASH" | "SHELL_STABILITY_TOKEN" | "FRAME_EPOCH" | "WORK_ITEM_VERSION" | "INTERNAL_THREAD_HEAD" | "CUSTOMER_THREAD_HEAD" | "REQUEST_STATE_VERSION" | "APPROVAL_PACK_HASH" | "CLIENT_PORTAL_WORKSPACE_VERSION" | "POLICY_SNAPSHOT_HASH" | "DEPENDENCY_TOPOLOGY_HASH" | "SIMULATION_BASIS_HASH" | "MUTATION_BASIS_CONTRACT_HASH" | null;
  "latest_stale_guard_value": string | number | null;
  "latest_resume_token": string | null;
  "latest_stability_contract_or_null": RouteStabilityContract | null;
  "rebase_required": boolean;
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "suggested_detail_surface_code": "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL" | "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | "FILES" | "LINKED_CONTEXT" | "AUDIT_TRAIL" | null;
};
export const ProblemEnvelopeSchemaLineage = { schemaId: "https://taxat.dev/schemas/problem_envelope.schema.json", sourceHash: "d0ecad4da0b4ef69fbacb2a378c835ec510fd9ba0488f32267415789fce81206" } as const;

export type ReplayBasisIntegrityContract = {
  "integrity_profile_code": "REPLAY_BASIS_INTEGRITY_V1";
  "replay_class": "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS";
  "historical_basis_policy": "NO_SILENT_HISTORICAL_SUBSTITUTION";
  "config_basis_source_class": "HISTORICAL_FROZEN_REUSED" | "DECLARED_COUNTERFACTUAL_SUBSTITUTION" | "MISSING_HISTORICAL_FREEZE" | "CORRUPT_HISTORICAL_FREEZE";
  "input_basis_source_class": "HISTORICAL_FROZEN_REUSED" | "DECLARED_COUNTERFACTUAL_SUBSTITUTION" | "MISSING_HISTORICAL_FREEZE" | "CORRUPT_HISTORICAL_FREEZE";
  "preseal_gate_source_class": "HISTORICAL_PRESEAL_TAPE_REUSED" | "MISSING_PRESEAL_TAPE" | "CORRUPT_PRESEAL_TAPE";
  "authority_basis_source_class": "HISTORICAL_POST_SEAL_REUSED" | "DECLARED_COUNTERFACTUAL_SUBSTITUTION" | "NOT_MATERIAL" | "MISSING_HISTORICAL_BASIS" | "CORRUPT_HISTORICAL_BASIS";
  "baseline_basis_source_class": "HISTORICAL_POST_SEAL_REUSED" | "DECLARED_COUNTERFACTUAL_SUBSTITUTION" | "NOT_MATERIAL" | "MISSING_HISTORICAL_BASIS" | "CORRUPT_HISTORICAL_BASIS";
  "late_data_basis_source_class": "HISTORICAL_POST_SEAL_REUSED" | "DECLARED_COUNTERFACTUAL_SUBSTITUTION" | "NOT_MATERIAL" | "MISSING_HISTORICAL_BASIS" | "CORRUPT_HISTORICAL_BASIS";
  "temporal_propagation_event_source_class": "HISTORICAL_POST_SEAL_REUSED" | "DECLARED_COUNTERFACTUAL_SUBSTITUTION" | "NOT_MATERIAL" | "MISSING_HISTORICAL_BASIS" | "CORRUPT_HISTORICAL_BASIS";
  "live_connector_read_class": "NOT_PERFORMED" | "DECLARED_COUNTERFACTUAL_EXECUTED" | "UNDECLARED_EXECUTED";
  "live_authority_read_class": "NOT_PERFORMED" | "DECLARED_COUNTERFACTUAL_EXECUTED" | "UNDECLARED_EXECUTED";
  "late_data_rescan_class": "NOT_PERFORMED" | "DECLARED_COUNTERFACTUAL_EXECUTED" | "UNDECLARED_EXECUTED";
  "missing_basis_dimensions": ReplayBasisIntegrityContractSourceDimensionArray;
  "corrupt_basis_dimensions": ReplayBasisIntegrityContractSourceDimensionArray;
  "substituted_basis_dimensions": ReplayBasisIntegrityContractSourceDimensionArray;
  "declared_counterfactual_dimensions": ReplayBasisIntegrityContractCounterfactualDimensionArray;
  "undeclared_basis_drift_dimensions": ReplayBasisIntegrityContractCounterfactualDimensionArray;
  "deterministic_outcome_source_policy": "PERSISTED_OR_TRANSACTIONALLY_STAGED_ONLY";
  "non_persisted_outcome_component_classes": Array<"DECISION_BUNDLE" | "GATE_SEQUENCE" | "SNAPSHOT" | "COMPUTE_RESULT" | "FORECAST_SET" | "RISK_REPORT" | "PARITY_RESULT" | "TRUST_SUMMARY" | "EVIDENCE_GRAPH" | "TWIN_VIEW" | "FILING_PACKET" | "AUTHORITY_RESULT" | "LATE_DATA_BASIS" | "DRIFT_RECORD">;
  "publication_gate": "ATTESTATION_REQUIRED_BEFORE_REPLAY_CLAIM";
};
export const ReplayBasisIntegrityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/replay_basis_integrity_contract.schema.json", sourceHash: "b6514b696dc09cf7d3280a515f078a463f9bb297813da390552a3c9fbdfb4b87" } as const;

export type ReplayBasisIntegrityContractSourceDimensionArray = Array<"CONFIG" | "INPUT" | "PRESEAL_GATE_TAPE" | "AUTHORITY_POST_SEAL" | "BASELINE_POST_SEAL" | "LATE_DATA_POST_SEAL" | "TEMPORAL_PROPAGATION_POST_SEAL">;

export type ReplayBasisIntegrityContractCounterfactualDimensionArray = Array<"IDENTITY_AUTHORITY" | "EXECUTABLE" | "CONFIG" | "INPUT" | "POST_SEAL" | "DETERMINISM" | "AUTHORITY_POST_SEAL" | "BASELINE_POST_SEAL" | "LATE_DATA_POST_SEAL" | "TEMPORAL_PROPAGATION_POST_SEAL">;

export type RetroactiveImpactAnalysis = {
  "artifact_type": "RetroactiveImpactAnalysis";
  "retroactive_impact_id": string;
  "manifest_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "drift_ref": string | null;
  "baseline_envelope_ref": string;
  "temporal_propagation_event_ref": string;
  "impacted_scope_refs": Array<string>;
  "impacted_submission_refs": Array<string>;
  "earliest_affected_effective_at": ISO8601DateTimeString;
  "latest_affected_effective_at": ISO8601DateTimeString;
  "bounded_retroactivity_class": "NONE" | "CURRENT_SCOPE_ONLY" | "RESTATE_PRIOR_POSITION" | "REOPEN_CHAIN_REPLAY" | "AUTHORITY_RECONCILIATION_REQUIRED";
  "late_data_interaction_class": "NONE" | "CURRENT_SCOPE_ONLY" | "RESTATE_PRIOR_POSITION" | "AUTHORITY_CORRECTION_ONLY" | "CONTRADICTORY";
  "replay_requirement": "NONE" | "CONTINUATION_CHILD" | "EXACT_REPLAY" | "RECONCILE_FIRST";
  "restatement_required": boolean;
  "restatement_scope_refs": Array<string>;
  "reason_codes": Array<string>;
  "analyzed_at": ISO8601DateTimeString;
  "analysis_hash": string;
};
export const RetroactiveImpactAnalysisSchemaLineage = { schemaId: "https://taxat.dev/schemas/retroactive_impact_analysis.schema.json", sourceHash: "15d02e2b9e597dad0694a23b12ddc13ef1c1b50b3946a5d03f21fb5d2c896c46" } as const;

export type RunManifest = {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
} & {
  "gating_decisions"?: JsonValue;
};
export const RunManifestSchemaLineage = { schemaId: "https://taxat.dev/schemas/run_manifest.schema.json", sourceHash: "17d4fad61503e2a8ebd437a2398de9ea3ec466af2537fc7cc2e7d2777ef232a4" } as const;

export type RunManifestScopeArray = JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;

export type RunManifestProviderEnvironment = {
  "provider_name": string;
  "provider_environment": string;
  "api_base_profile"?: string | null;
  "api_version"?: string | null;
  "schema_version"?: string | null;
  "fraud_header_profile_ref"?: string | null;
  "token_binding_profile_ref"?: string | null;
  "compatible_product_chain_refs"?: Array<string>;
};

export type RunManifestConfigEntry = {
  "config_type": string;
  "version_id": string;
  "content_hash": string;
  "status_at_freeze": "DRAFT" | "CANDIDATE" | "VERIFIED" | "APPROVED" | "DEPRECATED" | "REVOKED";
  "effective_scope": string | null;
  "effective_from": ISO8601DateTimeString;
  "effective_to": ISO8601DateTimeString;
  "ccr_id": string | null;
  "test_suite_refs": Array<string>;
  "provider_api_version": string | null;
  "provider_schema_version": string | null;
  "environment_allowlist": Array<string>;
  "compatibility_class": string | null;
  "superseded_by_version_id": string | null;
};

export type RunManifestConfigFreeze = {
  "config_freeze_id": string;
  "manifest_id": string;
  "artifact_type": "ConfigFreeze";
  "entries": JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;
  "config_freeze_hash": string;
  "schema_bundle_hash": string;
  "feature_flag_snapshot_hash": string | null;
  "config_surface_hash": string;
  "config_completeness_state": "COMPLETE_REQUIRED_CONFIG_SET";
  "config_resolution_basis": "DIRECT_REQUEST_RESOLUTION" | "REPLAY_EXACT_REUSE" | "RECOVERY_EXACT_REUSE" | "HISTORICAL_EXPLICIT_REUSE";
  "source_config_freeze_ref": string | null;
  "source_config_freeze_hash": string | null;
  "source_config_surface_hash": string | null;
  "config_consumption_mode": "FROZEN_CONFIG_ONLY";
  "approval_snapshot_ref": string;
  "materiality_profile_ref": string;
  "amendment_materiality_profile_ref": string;
  "retention_profile_ref": string;
  "provider_contract_profile_ref": string;
  "workflow_policy_ref": string;
  "override_policy_ref": string;
  "masking_export_policy_ref": string;
  "canonicalization_rules_ref": string;
  "connector_mapping_rules_ref": string;
  "parity_threshold_profile_ref": string;
  "trust_threshold_profile_ref": string;
  "risk_threshold_profile_ref": string;
  "evidence_confidence_policy_ref": string;
  "computation_rules_ref": string;
  "required_config_types_present": ["COMPUTATION_RULES","PARITY_THRESHOLDS","TRUST_THRESHOLDS","RISK_THRESHOLDS","WORKFLOW_POLICY","OVERRIDE_POLICY","RETENTION_POLICY","EVIDENCE_CONFIDENCE_POLICY","CANONICALIZATION_RULES","CONNECTOR_MAPPING_RULES","PROVIDER_CONTRACT_PROFILE","MATERIALITY_PROFILE","AMENDMENT_MATERIALITY_PROFILE","MASKING_EXPORT_POLICY"];
};

export type RunManifestInputFreeze = {
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
  "exclusion_refs": Array<string>;
  "no_data_confirmed_declarations": Array<string>;
  "conflict_refs": Array<string>;
  "open_conflict_count": number;
  "blocking_conflict_count": number;
  "resolution_frontier": "CLEAR" | "MONITORING_ONLY" | "BLOCKING_PRESENT";
  "dominant_blocking_class": "BLOCKS_AUTOMATION" | "BLOCKS_REVIEW_PROGRESS" | "BLOCKS_FILING" | "BLOCKS_AMENDMENT" | "BLOCKS_ERASURE" | "BLOCKS_RUN" | "BLOCKS_AUTHORITY_CALL" | null;
  "missing_source_declarations": Array<string>;
  "stale_source_declarations": Array<string>;
  "source_domain_postures": Array<{
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
    }>;
  "normalization_context_ref": string;
  "normalization_context_hash": string;
  "artifact_contract_refs": Array<string>;
  "artifact_contract_hash": string;
  "input_set_hash": string;
  "input_consumption_mode": "FROZEN_INPUT_ONLY";
  "late_data_adoption_policy": "CHILD_REVIEW_OR_EXCLUDE_ONLY";
  "contract": SchemaBundle;
};

export type RunManifestHashSet = {
  "access_binding_hash": string;
  "config_freeze_hash": string;
  "config_surface_hash": string;
  "input_set_hash": string;
  "execution_basis_hash": string;
  "manifest_hash": string;
};

export type RunManifestContinuationSet = {
  "root_manifest_id": string | null;
  "parent_manifest_id": string | null;
  "continuation_of_manifest_id": string | null;
  "replay_of_manifest_id": string | null;
  "supersedes_manifest_id": string | null;
  "manifest_generation": number;
  "parent_manifest_hash_at_branch": string | null;
  "inherited_config_freeze_ref": string | null;
  "fresh_resolution_reason_code": string | null;
  "inherited_input_freeze_ref": string | null;
  "fresh_collection_reason_code": string | null;
  "config_inheritance_mode": "FRESH_CHILD_RESOLUTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "input_inheritance_mode": "FRESH_CHILD_COLLECTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
};

export type RunManifestFrozenExecutionBinding = {
  "manifest_id": string;
  "manifest_hash": string;
  "execution_basis_hash": string;
  "continuation_basis": "NEW_MANIFEST" | "REPLAY_CHILD" | "RECOVERY_CHILD" | "CONTINUATION_CHILD" | "NEW_REQUEST_CHILD";
  "root_manifest_id": string;
  "parent_manifest_id": string | null;
  "continuation_of_manifest_id": string | null;
  "replay_of_manifest_id": string | null;
  "supersedes_manifest_id": string | null;
  "manifest_generation": number;
  "parent_manifest_hash_at_branch": string | null;
  "config_inheritance_mode": "FRESH_CHILD_RESOLUTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "input_inheritance_mode": "FRESH_CHILD_COLLECTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "inherited_config_freeze_ref": string | null;
  "fresh_resolution_reason_code": string | null;
  "inherited_input_freeze_ref": string | null;
  "fresh_collection_reason_code": string | null;
  "config_freeze_ref": string;
  "config_freeze_hash": string;
  "config_surface_hash": string;
  "config_resolution_basis": "DIRECT_REQUEST_RESOLUTION" | "REPLAY_EXACT_REUSE" | "RECOVERY_EXACT_REUSE" | "HISTORICAL_EXPLICIT_REUSE";
  "input_freeze_ref": string;
  "input_set_hash": string;
  "source_plan_ref": string;
  "source_plan_hash": string;
  "source_window_ref": string;
  "source_window_hash": string;
  "collection_boundary_ref": string;
  "collection_boundary_hash": string;
  "normalization_context_ref": string;
  "normalization_context_hash": string;
  "requested_scope": RunManifestScopeArray;
  "executable_scope": RunManifestScopeArray;
  "scope_execution_binding": ScopeExecutionBinding & {
    "binding_scope_class"?: "FROZEN_EXECUTION_BINDING";
  };
  "access_binding_hash": string;
  "environment_ref": "DEV" | "TEST" | "UAT" | "SANDBOX" | "PRODUCTION";
  "provider_environment_refs": Array<RunManifestProviderEnvironment>;
  "code_build_id": string;
  "schema_bundle_hash": string;
  "feature_flag_snapshot_hash": string | null;
  "deterministic_seed": string;
  "authority_context_ref": string | null;
  "config_consumption_mode": "FROZEN_CONFIG_ONLY";
  "input_consumption_mode": "FROZEN_INPUT_ONLY";
  "worker_consumption_mode": "MANIFEST_BOUND_ONLY";
};

export type RunManifestPostSealBasis = {
  "basis_state": "NULL_SENTINEL" | "MATERIAL";
  "post_seal_basis_hash": string;
  "authority_context_ref": string | null;
  "authority_context_hash": string | null;
  "late_data_monitor_result_ref": string | null;
  "late_data_monitor_result_hash": string | null;
  "baseline_envelope_refs": Array<string>;
  "baseline_envelope_hashes": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "temporal_propagation_event_hashes": Array<string>;
  "authority_calculation_result_refs": Array<string>;
  "authority_calculation_result_hashes": Array<string>;
  "drift_record_refs": Array<string>;
  "drift_record_hashes": Array<string>;
};

export type RunManifestAppendOnlyOutcomeProjection = {
  "projection_generation": number;
  "projection_hash": string;
  "post_seal_basis": RunManifestPostSealBasis;
  "gating_decisions": Array<GateDecisionRecord>;
  "output_refs": RunManifestOutputLinkMap;
  "audit_refs": Array<string>;
  "submission_refs": Array<string>;
  "drift_refs": Array<string>;
  "decision_bundle_hash": string | null;
  "deterministic_outcome_hash": string | null;
  "replay_attestation_ref": string | null;
};

export type RunManifestOutputLinkEntry = {
  "linkage_role_code": "DECISION_BUNDLE" | "FILING_CASE" | "AMENDMENT_CASE" | "PRIMARY_PROOF_BUNDLE" | "EVIDENCE_GRAPH" | "PARITY_RESULT" | "TWIN_VIEW" | "FILING_PACKET" | "SUBMISSION_RECORD" | "REPLAY_ATTESTATION" | "DRIFT_RECORD" | "OTHER";
  "artifact_type": string;
  "artifact_ref": string;
  "artifact_hash_or_null": string | null;
  "produced_by_manifest_id": string;
  "dependency_identity_refs": Array<string>;
};

export type RunManifestOutputLinkMap = {
  [key: string]: RunManifestOutputLinkEntry;
};

export type RunManifestAccessDecision = {
  "decision": "ALLOW" | "ALLOW_MASKED";
  "reason_codes": Array<string>;
  "effective_scope": Array<"year_end" | "quarterly_update" | "estimate_only" | "prepare_submission" | "submit" | "amendment_intent" | "amendment_submit">;
  "masking_rules": Array<string>;
  "required_approvals": Array<string>;
  "required_authn_level": null;
};

export type RunManifestGateDecision = {
  "gate_decision_id": string;
  "manifest_id": string;
  "gate_code": string;
  "gate_class": "NON_ACCESS";
  "decision": "PASS" | "PASS_WITH_NOTICE" | "MANUAL_REVIEW" | "OVERRIDABLE_BLOCK" | "HARD_BLOCK";
  "reason_codes": Array<string>;
  "severity": "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";
  "metrics"?: {
    [key: string]: JsonValue;
  };
  "overrideability": "NONE" | "SCOPED_OVERRIDE_ALLOWED" | "SCOPED_OVERRIDE_REQUIRED" | "NON_OVERRIDEABLE";
  "required_override_scope"?: string | null;
  "next_action_codes"?: Array<string>;
  "policy_version_ref": string;
  "decided_at": ISO8601DateTimeString;
  "effective_scope"?: Array<"year_end" | "quarterly_update" | "estimate_only" | "prepare_submission" | "submit" | "amendment_intent" | "amendment_submit">;
};

export type StreamRecoveryContract = {
  "contract_version": "STREAM_RECOVERY_V1";
  "stream_scope_class": "MANIFEST_EXPERIENCE" | "WORKSPACE";
  "route_key": string;
  "subject_ref": string;
  "shell_stability_token": string;
  "session_ref": string;
  "session_binding_hash": string;
  "access_binding_hash": string;
  "masking_context_hash": string;
  "publication_generation": number;
  "frame_epoch": number;
  "last_published_sequence": number;
  "compaction_floor_sequence_or_null": number | null;
  "resume_binding_representation": "RAW_TOKEN" | "HASHED_TOKEN";
  "resume_binding_ref_or_null": string | null;
  "delivery_window_state": "LIVE_RESUMABLE" | "REBASE_REQUIRED" | "ACCESS_REBIND_REQUIRED" | "SNAPSHOT_ONLY";
  "rebase_reason_code_or_null": "FRAME_EPOCH_ADVANCED" | "HISTORY_COMPACTED" | "SHELL_STABILITY_CHANGED" | "ROUTE_CONTEXT_CHANGED" | "SESSION_BINDING_CHANGED" | "ACCESS_BINDING_CHANGED" | "MASKING_POSTURE_CHANGED" | "SCHEMA_INCOMPATIBLE" | null;
  "resume_token_binding_mode": "EXACT_ROUTE_SESSION_SCOPE_MASKING";
  "sequence_application_policy": "STRICTLY_MONOTONIC_GAP_FREE_WITHIN_EPOCH";
  "duplicate_delivery_policy": "IDEMPOTENT_BY_SCOPE_EPOCH_SEQUENCE";
  "catch_up_policy": "CATCH_UP_BEFORE_LIVE";
  "rebase_trigger_policy": "REBASE_ON_EPOCH_ADVANCE_OR_COMPACTION_OR_CONTEXT_DRIFT";
};
export const StreamRecoveryContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/stream_recovery_contract.schema.json", sourceHash: "06cb7418b7e2c3b762fb82c9e487b14747c15d356a56303d00c9b8e3f3c7c416" } as const;

export type SubmissionRecord = {
  "artifact_type": "SubmissionRecord";
  "submission_id": string;
  "manifest_id": string;
  "client_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "provider_environment": string;
  "authority_scope": string;
  "operation_family": string;
  "basis_type": string;
  "attempt_lineage_manifest_id": string;
  "obligation_ref": string | null;
  "packet_ref": string | null;
  "request_envelope_ref": string | null;
  "authority_truth_contract": AuthorityTruthContract & {
    "boundary_scope"?: "SUBMISSION_RECORD";
    "truth_surface_role"?: "AUTHORITY_SETTLEMENT_LEDGER";
    "surface_specific_binding_policy"?: "SUBMISSION_LEDGER_IS_AUTHORITY_RESULT_ONLY";
  };
  "request_identity_contract": AuthorityRequestIdentityContract & {
    "binding_scope_class"?: "SUBMISSION_RECORD";
  } | null;
  "idempotency_key": string | null;
  "authority_ingress_proof_contract": AuthorityIngressProofContract & {
    "binding_scope_class"?: "SUBMISSION_RECORD";
  } | null;
  "lifecycle_state": "INTENT_RECORDED" | "TRANSMIT_PENDING" | "TRANSMITTED" | "PENDING_ACK" | "CONFIRMED" | "REJECTED" | "UNKNOWN" | "OUT_OF_BAND" | "SUPERSEDED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "SUBMISSION_RECORD";
    "machine_code"?: "SUBMISSION_RECORD_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "authority_reference": string | null;
  "request_hash": string | null;
  "identity_namespace_hash": string;
  "duplicate_meaning_key": string;
  "response_ref": string | null;
  "correlation_refs": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "baseline_type": "WORKING" | "FILED" | "AMENDED" | "AUTHORITY_CORRECTED" | "OUT_OF_BAND" | null;
  "reconciliation_deadline_at": ISO8601DateTimeString;
  "reconciliation_control_contract_or_null": AuthorityReconciliationControlContract & {
    "binding_scope_class"?: "SUBMISSION_RECORD";
  } | null;
  "authority_evidence_ref": string | null;
  "proof_bundle_ref": string | null;
  "proof_bundle_hash": string | null;
  "rejection_reason_codes": Array<string>;
  "superseded_by_submission_id": string | null;
  "state_changed_at": ISO8601DateTimeString;
};
export const SubmissionRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/submission_record.schema.json", sourceHash: "17da58f11a731851ab655f4508b62869419f372addc0bb4d764c7b0e33ff279a" } as const;

export type TemporalPropagationEvent = {
  "artifact_type": "TemporalPropagationEvent";
  "temporal_event_id": string;
  "manifest_id": string;
  "event_class": "LATE_DATA_INVALIDATION" | "AUTHORITY_CORRECTION" | "OUT_OF_BAND_DISCOVERY" | "TEMPORAL_UNCERTAINTY_BLOCK";
  "active_exact_scope_key": string;
  "affected_scope_refs": Array<string>;
  "affected_submission_refs": Array<string>;
  "source_late_data_monitor_ref_or_null": string | null;
  "source_late_data_finding_refs": Array<string>;
  "source_authority_basis_refs": Array<string>;
  "source_baseline_envelope_ref_or_null": string | null;
  "source_drift_ref_or_null": string | null;
  "trust_effect": "NONE" | "RECALC_REQUIRED";
  "proof_effect": "NONE" | "STALE_REVALIDATION_REQUIRED";
  "baseline_effect": "NONE" | "SCOPE_SLICED_REBUILD_REQUIRED";
  "retroactive_effect": "NONE" | "ANALYSIS_REQUIRED";
  "amendment_effect": "NONE" | "INVALIDATE_READINESS_REUSE" | "RECONCILE_FIRST";
  "replay_effect": "NOT_MATERIAL" | "HISTORICAL_EVENT_REQUIRED" | "LIMITED_COMPARISON_ONLY";
  "mirror_reopen_effect": "NONE" | "REOPEN_REQUIRED";
  "historical_reuse_policy": "NO_FRESH_RECLASSIFICATION";
  "reason_codes": Array<string>;
  "emitted_at": ISO8601DateTimeString;
  "event_hash": string;
};
export const TemporalPropagationEventSchemaLineage = { schemaId: "https://taxat.dev/schemas/temporal_propagation_event.schema.json", sourceHash: "34a5ef1377692154a184249f80f6346d88dcaf91119cb300d029f78f6eb943f9" } as const;

export type TwinDeltaArc = {
  "artifact_type": "TwinDeltaArc";
  "delta_arc_id": string;
  "twin_id": string;
  "timeline_ref": string;
  "comparison_key": string;
  "comparison_key_profile_code": "TWIN_KEY_V1_SHA256";
  "subject_identity_code": string;
  "reporting_scope_ref_or_null": string | null;
  "authority_scope_ref_or_null": string | null;
  "business_partition_ref_or_null": string | null;
  "period_ref_or_null": string | null;
  "basis_type_or_null": string | null;
  "lineage_anchor_ref_or_null": string | null;
  "left_lane_code": "INTERNAL_COMPUTED";
  "right_lane_code": "AUTHORITY";
  "subject_ref": string;
  "subject_class": "FACT" | "TOTAL" | "FILING" | "ACKNOWLEDGEMENT" | "STATUS" | "OBLIGATION" | "DECLARED_BASIS";
  "delta_class": "MATCH_EXACT" | "MATCH_EQUIVALENT" | "VALUE_MISMATCH" | "TOTAL_MISMATCH" | "STATUS_MISMATCH" | "BASIS_MISMATCH" | "TIMELINE_LAG" | "TIMELINE_GAP" | "INTERNAL_ONLY" | "AUTHORITY_ONLY" | "ACK_PENDING" | "ACK_PARTIAL" | "ACK_CONTRADICTORY" | "REJECTED_OR_REVERSED" | "OUT_OF_BAND" | "BASELINE_MISSING" | "STALE_COMPARISON" | "LIMITED_VISIBILITY" | "REPLAY_NON_AUTHORITATIVE";
  "comparability_state": "COMPARABLE" | "WAITING_ON_AUTHORITY" | "PARTIALLY_COMPARABLE" | "NON_COMPARABLE" | "OUT_OF_BAND" | "CONTRADICTORY";
  "comparability_reason_code": "NONE" | "BASELINE_MISSING" | "STALE_COMPARISON" | "LIMITED_VISIBILITY" | "REPLAY_NON_AUTHORITATIVE" | "ACK_PENDING" | "ACK_PARTIAL" | "ACK_CONTRADICTORY" | "OUT_OF_BAND" | "CONTRADICTION_COMPONENTS";
  "delta_precedence_rank": number;
  "materiality_class": "NONE" | "INFORMATIONAL" | "REVIEW" | "MATERIAL" | "BLOCKING";
  "resolution_class": "NONE" | "REFRESH_TWIN" | "WAIT_FOR_AUTHORITY" | "RUN_RECONCILIATION" | "OPEN_REVIEW" | "PREPARE_AMENDMENT";
  "priority_rank": number;
  "baseline_state": "NOT_APPLICABLE" | "PROVED" | "PARTIAL" | "MISSING" | "STALE";
  "confidence_state": "HIGH" | "MEDIUM" | "LOW" | "LIMITED";
  "freshness_state": "LIVE" | "RECENT" | "STALE" | "LIMITED";
  "explanation_ref": string | null;
  "parity_delta_ref": string | null;
  "equivalence_reason_codes": Array<string>;
  "blocking_reason_codes": Array<string>;
  "left_subject_refs": Array<string>;
  "right_subject_refs": Array<string>;
  "contradiction_component_refs": Array<string>;
  "limitation_codes": Array<string>;
  "left_observed_at": ISO8601DateTimeString;
  "right_observed_at": ISO8601DateTimeString;
  "resolution_deadline_at": ISO8601DateTimeString;
  "last_compared_at": ISO8601DateTimeString;
};
export const TwinDeltaArcSchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_delta_arc.schema.json", sourceHash: "bd4a4ca534d8f8a7da711ff6a72af7db915c80fabca4b3e6ea042bced49be276" } as const;

export type TwinInterpretationState = {
  "artifact_type": "TwinInterpretationState";
  "twin_interpretation_state_id": string;
  "twin_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "generated_from_surface": "TWIN_PANEL";
  "default_view_space": "SOURCE_SPACE" | "COMPUTATION_SPACE" | "AUTHORITY_SPACE";
  "enabled_view_spaces": Array<"SOURCE_SPACE" | "COMPUTATION_SPACE" | "AUTHORITY_SPACE">;
  "compare_mode": "LOCKED" | "DELTA_COMPARE" | "PINNED_COMPARE";
  "pinned_object_ref": string | null;
  "active_delta_arc_ref": string | null;
  "focus_anchor_ref": string | null;
  "show_confidence_overlay": boolean;
  "show_freshness_overlay": boolean;
  "preserve_focus_across_refresh": boolean;
  "default_sort_mode": "PRIORITY_RANK" | "TIMELINE" | "SUBJECT_CLASS";
  "default_noise_filter": "ACTIONABLE_ONLY" | "REVIEW_AND_ABOVE" | "ALL_MISMATCHES";
  "summary_priority_mode": "ACTIONABILITY_FIRST" | "AUTHORITY_FIRST" | "AUDIT_FIRST";
  "dominant_attention_state": "READY" | "REVIEW_REQUIRED" | "WAITING_ON_AUTHORITY" | "RECONCILIATION_REQUIRED" | "NON_COMPARABLE" | "OUT_OF_BAND" | "CONTRADICTORY";
  "dominant_delta_arc_ref_or_null": string | null;
  "dominant_reconciliation_state_ref_or_null": string | null;
  "collapse_matches_by_default": boolean;
  "suppress_informational_when_higher_severity_present": boolean;
  "authority_first_summary": boolean;
};
export const TwinInterpretationStateSchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_interpretation_state.schema.json", sourceHash: "b9b7492d2965f7c2fa93a24ef203c710e8b60a6cf1538c2ad16699ad1ec33fff" } as const;

export type TwinMismatchSummary = {
  "artifact_type": "TwinMismatchSummary";
  "mismatch_summary_id": string;
  "twin_id": string;
  "ranking_profile_code": "TWIN_MISMATCH_SORT_V1";
  "total_subject_count": number;
  "matched_count": number;
  "mismatch_count": number;
  "comparable_mismatch_count": number;
  "waiting_count": number;
  "partial_ack_count": number;
  "non_comparable_count": number;
  "contradictory_count": number;
  "blocking_count": number;
  "material_count": number;
  "review_count": number;
  "informational_count": number;
  "limited_count": number;
  "stale_count": number;
  "out_of_band_count": number;
  "highest_priority_rank": number;
  "highest_materiality_class": "NONE" | "INFORMATIONAL" | "REVIEW" | "MATERIAL" | "BLOCKING";
  "top_mismatch_refs": Array<string>;
  "top_ranked_mismatches": Array<{
      "delta_arc_ref": string;
      "comparison_key": string;
      "comparability_state": "COMPARABLE" | "WAITING_ON_AUTHORITY" | "PARTIALLY_COMPARABLE" | "NON_COMPARABLE" | "OUT_OF_BAND" | "CONTRADICTORY";
      "comparability_reason_code": "NONE" | "BASELINE_MISSING" | "STALE_COMPARISON" | "LIMITED_VISIBILITY" | "REPLAY_NON_AUTHORITATIVE" | "ACK_PENDING" | "ACK_PARTIAL" | "ACK_CONTRADICTORY" | "OUT_OF_BAND" | "CONTRADICTION_COMPONENTS";
      "priority_rank": number;
      "last_compared_at": ISO8601DateTimeString;
      "materiality_class": "INFORMATIONAL" | "REVIEW" | "MATERIAL" | "BLOCKING";
    }>;
  "suppressed_match_count": number;
  "generated_at": ISO8601DateTimeString;
};
export const TwinMismatchSummarySchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_mismatch_summary.schema.json", sourceHash: "095d3484945ed224163d79bcba81df7584d198ffba0786aca4f5c8b8d712651a" } as const;

export type TwinPortfolioSummary = {
  "artifact_type": "TwinPortfolioSummary";
  "twin_portfolio_summary_id": string;
  "tenant_id": string;
  "scope_ref": string;
  "generated_at": ISO8601DateTimeString;
  "total_twin_count": number;
  "ready_count": number;
  "review_required_count": number;
  "waiting_on_authority_count": number;
  "reconciliation_required_count": number;
  "blocked_count": number;
  "stale_twin_count": number;
  "out_of_band_twin_count": number;
  "highest_attention_rank": number;
  "top_twin_refs": Array<string>;
  "top_mismatch_refs": Array<string>;
};
export const TwinPortfolioSummarySchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_portfolio_summary.schema.json", sourceHash: "4733c74716b13f756f7839348a0aa7a6091baa9e9929fcee98a498e0b796c494" } as const;

export type TwinReadinessState = {
  "artifact_type": "TwinReadinessState";
  "twin_readiness_id": string;
  "twin_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "filing_readiness": "NOT_READY" | "READY_REVIEW" | "READY_TO_SUBMIT";
  "twin_readiness_class": "READY" | "REVIEW_REQUIRED" | "WAITING_ON_AUTHORITY" | "RECONCILIATION_REQUIRED" | "BLOCKED";
  "safe_action_state": "SAFE_TO_ACT" | "REVIEW_BEFORE_ACT" | "WAIT_ONLY" | "REFRESH_REQUIRED" | "NO_SAFE_ACTION";
  "decision_usefulness": "HIGH" | "MEDIUM" | "LOW" | "NONE";
  "trust_summary_ref": string;
  "decision_bundle_ref": string | null;
  "gate_decision_refs": Array<string>;
  "authority_posture": "NOT_REQUESTED" | "CURRENT_MATCHED" | "CURRENT_MISMATCHED" | "PENDING" | "PARTIAL" | "STALE" | "UNKNOWN" | "OUT_OF_BAND";
  "baseline_state": "NOT_APPLICABLE" | "PROVED" | "PARTIAL" | "MISSING" | "STALE";
  "usefulness_cap_reason_codes": Array<string>;
  "blocking_reason_codes": Array<string>;
  "review_reason_codes": Array<string>;
  "unresolved_conflict_refs": Array<string>;
  "blocking_mismatch_refs": Array<string>;
  "review_mismatch_refs": Array<string>;
  "waiting_mismatch_refs": Array<string>;
  "reconciliation_mismatch_refs": Array<string>;
  "contradictory_mismatch_refs": Array<string>;
  "non_comparable_mismatch_refs": Array<string>;
  "out_of_band_mismatch_refs": Array<string>;
  "no_safe_action_reason_codes": Array<string>;
  "last_evaluated_at": ISO8601DateTimeString;
};
export const TwinReadinessStateSchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_readiness_state.schema.json", sourceHash: "0c586923439fa2a11ca21f1601e98ce3fec612fd2dd5041df2e44c12768f46d7" } as const;

export type TwinReconciliationState = {
  "artifact_type": "TwinReconciliationState";
  "twin_reconciliation_state_id": string;
  "twin_id": string;
  "lifecycle_state": "NOT_REQUIRED" | "QUEUED" | "IN_PROGRESS" | "WAITING_ON_AUTHORITY" | "WAITING_ON_OPERATOR" | "RESOLVED" | "SUPERSEDED";
  "resolution_state": "NONE" | "UNRESOLVED" | "PARTIALLY_RESOLVED" | "RESOLVED_MATCH" | "RESOLVED_OUT_OF_BAND" | "RESOLVED_REJECTED" | "RESOLVED_AMENDED_BASELINE";
  "target_mismatch_refs": Array<string>;
  "blocking_mismatch_refs": Array<string>;
  "recommended_action_code": "NONE" | "RETRY_AUTHORITY_SYNC" | "AWAIT_AUTHORITY" | "OPEN_OPERATOR_WORKFLOW" | "RUN_MANUAL_RECONCILIATION" | "PREPARE_AMENDMENT_REVIEW" | "RECORD_OUT_OF_BAND_RESOLUTION" | "RESOLVED" | "SUPERSEDED";
  "reconciliation_budget_state": "NOT_APPLICABLE" | "WITHIN_BUDGET" | "EXHAUSTED" | "MANUAL_ESCALATION";
  "workflow_item_refs": Array<string>;
  "primary_workflow_item_ref_or_null": string | null;
  "auto_attempt_count": number;
  "max_auto_attempts": number;
  "reconciliation_deadline_at": ISO8601DateTimeString;
  "next_action_owner": "NONE" | "SYSTEM" | "AUTHORITY" | "OPERATOR";
  "next_action_due_at": ISO8601DateTimeString;
  "last_attempted_at": ISO8601DateTimeString;
  "resolved_at": ISO8601DateTimeString;
  "reason_codes": Array<string>;
  "generated_at": ISO8601DateTimeString;
};
export const TwinReconciliationStateSchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_reconciliation_state.schema.json", sourceHash: "8c71a8d61bbe56290267892c39e57dcf2badf0efd8120945c6879094cee59117" } as const;

export type TwinStateSnapshot = {
  "artifact_type": "TwinStateSnapshot";
  "twin_state_snapshot_id": string;
  "twin_id": string;
  "lane_code": "INTERNAL_COMPUTED" | "AUTHORITY";
  "assembly_state": "ASSEMBLED" | "PARTIAL" | "LIMITED" | "STALE" | "CONTRADICTORY" | "UNAVAILABLE" | "SUPERSEDED";
  "snapshot_role": "WORKING_STATE" | "AUTHORITY_OBSERVED";
  "comparison_key_profile_code": "TWIN_KEY_V1_SHA256";
  "comparison_basis_ref": string | null;
  "baseline_ref": string | null;
  "component_refs": Array<string>;
  "subject_count": number;
  "comparable_subject_count": number;
  "non_comparable_subject_count": number;
  "subject_key_collision_refs": Array<string>;
  "contradictory_component_refs": Array<string>;
  "freshness_state": "LIVE" | "RECENT" | "STALE" | "LIMITED";
  "confidence_state": "HIGH" | "MEDIUM" | "LOW" | "LIMITED";
  "limitation_codes": Array<string>;
  "authority_truth_state": "NOT_APPLICABLE" | "NOT_REQUESTED" | "UNKNOWN" | "PENDING_ACK" | "PARTIAL_ACK" | "CONFIRMED" | "REJECTED" | "OUT_OF_BAND";
  "baseline_state": "NOT_APPLICABLE" | "PROVED" | "PARTIAL" | "MISSING" | "STALE" | "SUPERSEDED";
  "amendment_position": "NOT_APPLICABLE" | "PRE_BASELINE" | "FILED_BASELINE" | "AMENDED_BASELINE" | "AUTHORITY_CORRECTED_BASELINE";
  "replay_authoritativeness": "LIVE" | "REPLAY" | "ANALYSIS_ONLY";
  "as_of": ISO8601DateTimeString;
  "stale_after": ISO8601DateTimeString;
  "generated_at": ISO8601DateTimeString;
};
export const TwinStateSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_state_snapshot.schema.json", sourceHash: "b0c6017af313b4c1caecc879f3b6171483c6a241438dd12cf67a722d71236c9f" } as const;

export type TwinTimeline = {
  "artifact_type": "TwinTimeline";
  "twin_timeline_id": string;
  "twin_id": string;
  "lifecycle_state": "BUILT" | "STALE" | "SUPERSEDED";
  "temporal_alignment_state": "LOCKED" | "DRIFTING" | "DIVERGED";
  "alignment_score": number;
  "primary_anchor_ref": string | null;
  "window_start_at": ISO8601DateTimeString;
  "window_end_at": ISO8601DateTimeString;
  "aligned_anchor_count": number;
  "contradictory_anchor_count": number;
  "unpaired_anchor_count": number;
  "alignment_reason_codes": Array<string>;
  "lanes": JsonValue & JsonValue;
};
export const TwinTimelineSchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_timeline.schema.json", sourceHash: "1762f32657400ba9c519d49beb89129a175ef86c1ae4e1a3e3255fbe78b7e495" } as const;

export type TwinView = {
  "artifact_type": "TwinView";
  "twin_id": string;
  "manifest_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "lifecycle_state": "NOT_BUILT" | "BUILT" | "STALE" | "SUPERSEDED";
  "comparison_key_profile_code": "TWIN_KEY_V1_SHA256";
  "delta_precedence_profile_code": "TWIN_DELTA_PRECEDENCE_V1";
  "mismatch_ranking_profile_code": "TWIN_MISMATCH_SORT_V1";
  "comparison_basis_ref": string | null;
  "internal_state_ref": string | null;
  "authority_state_ref": string | null;
  "timeline_ref": string | null;
  "cross_source_delta_refs": Array<string>;
  "mismatch_summary_ref": string | null;
  "readiness_ref": string | null;
  "reconciliation_state_ref": string | null;
  "interpretation_state_ref": string | null;
  "parity_result_ref": string | null;
  "built_at": ISO8601DateTimeString;
  "stale_at": ISO8601DateTimeString;
  "superseded_at": ISO8601DateTimeString;
};
export const TwinViewSchemaLineage = { schemaId: "https://taxat.dev/schemas/twin_view.schema.json", sourceHash: "64311e1d1bb5398904767c42b445844ba7005b35f6ab05e04f8b2aeca19b75d3" } as const;

export type UploadRequestBindingContract = {
  "contract_version": "UPLOAD_REQUEST_BINDING_V1";
  "frozen_tenant_id": string;
  "frozen_client_id": string;
  "frozen_request_id": string;
  "request_identity_ref": string;
  "frozen_request_version_ref": string;
  "live_request_version_ref": string;
  "request_binding_state": "ORIGINAL_CURRENT" | "RECONFIRMED_CURRENT" | "RECONFIRMATION_REQUIRED" | "SUPERSEDED";
  "binding_resolution_basis": "ORIGINAL_FROZEN_REQUEST" | "EXPLICIT_RECONFIRMATION" | "ACTIVE_REQUEST_REBASE_PENDING_CONFIRMATION" | "ACTIVE_REQUEST_SUPERSEDED";
  "resume_identity_policy": "RESUME_EXISTING_SESSION_ONLY";
  "duplicate_session_policy": "NO_DUPLICATE_SESSION_ON_RECONNECT";
  "duplicate_file_policy": "REUSE_FROZEN_STORAGE_REF_ON_RESUME_OR_RETRY";
  "inflight_rebase_policy": "IN_FLIGHT_REBASE_PRESERVES_SESSION_UNTIL_TRANSFER_TERMINATES";
  "stale_completion_policy": "STALE_BYTES_NEVER_SATISFY_CURRENT_REQUEST";
  "attachment_authority_policy": "ATTACH_ONLY_TO_CURRENT_OR_RECONFIRMED_REQUEST";
  "next_action_authority_policy": "TRANSFER_AND_BINDING_STATE_DETERMINE_NEXT_ACTION";
  "cross_device_resume_policy": "CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION";
  "frozen_binding_scope_hash": string;
  "rebase_detected_at_or_null": ISO8601DateTimeString;
};
export const UploadRequestBindingContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/upload_request_binding_contract.schema.json", sourceHash: "7b18e6aa410b184c61ce007a45da048e816fbeda8a4a2edec2e6fe2791e160a4" } as const;

export type UploadSessionRecoveryHarness = {
  "contract_version": "UPLOAD_SESSION_RECOVERY_HARNESS_V1";
  "harness_id": string;
  "deterministic_seed": number;
  "suite_profile": "RESUMABLE_UPLOAD_RECONNECT_REBASE_AND_DUPLICATE_MATRIX";
  "run_mode": "DETERMINISTIC_SESSION_RECOVERY_ENUMERATION";
  "identity_policy": "FROZEN_TENANT_CLIENT_REQUEST_AND_VERSION_SCOPE";
  "resume_policy": "RESUME_EXISTING_SESSION_AND_STORAGE_REF_ONLY";
  "rebase_policy": "LIVE_REQUEST_VERSION_MAY_ADVANCE_FROZEN_VERSION_MAY_NOT";
  "completion_policy": "TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION";
  "duplicate_policy": "NO_DUPLICATE_SESSION_OR_STORAGE_REF_ON_RETRY_OR_CROSS_DEVICE_RESUME";
  "recovery_action_policy": "NEXT_ACTION_AND_RESUMABILITY_STATE_GOVERN_ALL_RECOVERY";
  "cases": Array<UploadSessionRecoveryHarnessHarnessCase>;
};
export const UploadSessionRecoveryHarnessSchemaLineage = { schemaId: "https://taxat.dev/schemas/upload_session_recovery_harness.schema.json", sourceHash: "68c683f58ddb2795f1d5d905bd37b659ef6e16c16eca6303731b7588c701d96c" } as const;

export type UploadSessionRecoveryHarnessSurfaceClass = "MOBILE" | "BROWSER" | "DESKTOP";

export type UploadSessionRecoveryHarnessScenarioCode = "MOBILE_RECONNECT" | "BROWSER_RELOAD" | "STALE_REQUEST_REBASE" | "DUPLICATE_ALLOCATION_RETRY" | "CHECKSUM_OR_SCANNER_DELAY" | "ATTACHMENT_CONFIRMATION" | "CROSS_DEVICE_CONTINUATION";

export type UploadSessionRecoveryHarnessCompletionState = "NOT_READY_BYTES_IN_FLIGHT" | "NOT_READY_SCAN_OR_VALIDATION_PENDING" | "NOT_READY_ATTACHMENT_CONFIRMATION_PENDING" | "NOT_READY_STALE_RECONFIRM_REQUIRED" | "READY_CURRENT_REQUEST_SATISFIED";

export type UploadSessionRecoveryHarnessSessionSnapshot = {
  "upload_session_id": string;
  "storage_ref": string;
  "tenant_id": string;
  "client_id": string;
  "request_id": string;
  "frozen_request_version_ref": string;
  "live_request_version_ref": string;
  "request_binding_state": "ORIGINAL_CURRENT" | "RECONFIRMED_CURRENT" | "RECONFIRMATION_REQUIRED" | "SUPERSEDED";
  "resumability_state": "RESUMABLE" | "RESTART_REQUIRED" | "CLOSED";
  "attachment_state": "STAGED" | "CONFIRMATION_REQUIRED" | "ATTACHED" | "REBIND_REQUIRED";
  "transfer_state": "QUEUED" | "UPLOADING" | "SCANNING" | "ACCEPTED" | "REJECTED" | "FAILED";
  "integrity_state": "PENDING" | "VERIFIED" | "FAILED";
  "malware_scan_state": "PENDING" | "CLEAN" | "QUARANTINED";
  "validation_state": "PENDING" | "ACCEPTED" | "REJECTED" | "REQUIRES_REPLACEMENT";
  "next_action_code": "NONE" | "RESUME_UPLOAD" | "CONFIRM_ATTACHMENT" | "RECONFIRM_REQUEST" | "RETRY_UPLOAD" | "UPLOAD_REPLACEMENT" | "CONTACT_SUPPORT";
  "byte_count": number;
  "bytes_transferred": number;
  "upload_confidence_score": number;
  "resume_token_ref_or_null": string | null;
  "attached_document_ref_or_null": string | null;
  "attachment_confirmed_at_or_null": ISO8601DateTimeString;
};

export type UploadSessionRecoveryHarnessRequestProjectionSnapshot = {
  "request_id": string;
  "request_version_ref": string;
  "latest_upload_ref_or_null": string | null;
  "current_request_upload_ref_or_null": string | null;
};

export type UploadSessionRecoveryHarnessHarnessCase = {
  "case_id": string;
  "scenario_code": UploadSessionRecoveryHarnessScenarioCode;
  "entry_surface_class": UploadSessionRecoveryHarnessSurfaceClass;
  "resume_surface_class": UploadSessionRecoveryHarnessSurfaceClass;
  "duplicate_session_created": false;
  "duplicate_storage_ref_created": false;
  "expected_request_completion_state": UploadSessionRecoveryHarnessCompletionState;
  "pre_session": UploadSessionRecoveryHarnessSessionSnapshot;
  "post_session": UploadSessionRecoveryHarnessSessionSnapshot;
  "post_request_projection": UploadSessionRecoveryHarnessRequestProjectionSnapshot;
};

export type VerificationSuiteResult = {
  "suite_result_id": string;
  "suite_family": "SCHEMA_COMPATIBILITY" | "DETERMINISTIC_AND_STATE_MACHINE" | "NORTHBOUND_API" | "AUTHORITY_SANDBOX" | "OPERATOR_CLIENT" | "SECURITY" | "PERFORMANCE_AND_CANARY" | "RESTORE_DRILL" | "MIGRATION_VERIFICATION" | "SUPPLY_CHAIN" | "SUITE_ADMISSIBILITY";
  "candidate_environment_ref": string;
  "build_artifact_ref": string;
  "artifact_digest": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "schema_bundle_hash": string;
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "schema_bundle_compatibility_gate_contract": SchemaBundleCompatibilityGateContract;
  "config_bundle_hash": string;
  "migration_plan_ref": string | null;
  "enabled_provider_profile_refs": Array<string>;
  "authority_sandbox_coverage_contract_or_null": AuthoritySandboxCoverageContract | null;
  "supported_client_window_ref": string | null;
  "restore_drill_ref": string | null;
  "restore_checkpoint_ref": string | null;
  "deterministic_golden_pack_ref": string | null;
  "test_run_identifiers": Array<string>;
  "result_state": "PASSED" | "FAILED" | "ERROR";
  "result_summary_ref": string;
  "executed_at": ISO8601DateTimeString;
};
export const VerificationSuiteResultSchemaLineage = { schemaId: "https://taxat.dev/schemas/verification_suite_result.schema.json", sourceHash: "16d98c98d60378245e8ec9761a60f24e67d2033ffb5161d9f31a86a59d3ab307" } as const;

export type VisibilityPartitionContract = {
  "partition_scope": "WORKSPACE_SNAPSHOT" | "WORKSPACE_STREAM_EVENT" | "WORK_INBOX_SNAPSHOT" | "WORK_INBOX_DELTA" | "CLIENT_PORTAL_WORKSPACE" | "CUSTOMER_REQUEST_LIST" | "COLLABORATION_ACTIVITY_SLICE" | "COLLABORATION_ATTACHMENT_SLICE" | "WORK_ITEM_NOTIFICATION";
  "audience_class": "STAFF" | "CUSTOMER_COLLABORATION" | "CLIENT_PORTAL";
  "allowed_visibility_classes": Array<"CUSTOMER_VISIBLE" | "INTERNAL_ONLY">;
  "access_binding_hash": string;
  "masking_posture_fingerprint": string;
  "cache_partition_key": string;
  "badge_counter_policy": "SPLIT_LANE_COUNTS" | "SURFACE_VISIBLE_ONLY" | "NO_BADGES";
  "ordering_side_channel_policy": "VISIBLE_EVENTS_ONLY" | "SEGMENTED_VISIBLE_EVENTS_ONLY" | "CANONICAL_LIST_ONLY";
  "limited_state_presentation": "EXPLICIT_LIMITATION_NOTICE";
  "export_scope_policy": "MOUNTED_ROUTE_VISIBILITY_ONLY";
  "fallback_discovery_policy": "NO_CROSS_PARTITION_DISCOVERY";
};
export const VisibilityPartitionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/visibility_partition_contract.schema.json", sourceHash: "12b1bdad17162a04e0943cf9a89a50f94544d65334d329311625f6a57f634a12" } as const;

export type WorkflowItem = {
  "artifact_type": "WorkflowItem";
  "item_id": string;
  "tenant_id": string;
  "client_id": string;
  "period": string;
  "type": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "lifecycle_state": "OPEN" | "IN_PROGRESS" | "WAITING_ON_CLIENT" | "WAITING_ON_AUTHORITY" | "BLOCKED" | "DONE" | "CANCELLED" | "STALE";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "WORKFLOW_ITEM";
    "machine_code"?: "WORKFLOW_ITEM_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
  "due_at": ISO8601DateTimeString;
  "context_refs": Array<string>;
  "title": string;
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "COMMAND_SIDE_AUTHORITY";
    "authoritative_record_families"?: ["RUN_MANIFEST","WORKFLOW_ITEM","AUDIT_EVENT"];
    "observable_projection_families"?: [];
  };
  "authority_truth_contract": AuthorityTruthContract & {
    "boundary_scope"?: "WORKFLOW_ITEM";
    "truth_surface_role"?: "INTERNAL_WORKFLOW_COORDINATION";
    "surface_specific_binding_policy"?: "WORKFLOW_IS_COORDINATION_ONLY_WITH_EXPLICIT_AUTHORITY_STATE";
  };
  "collaboration_visibility": "INTERNAL_ONLY" | "CUSTOMER_SHARED";
  "authority_truth_state": "NOT_APPLICABLE" | "NOT_REQUESTED" | "UNKNOWN" | "PENDING_ACK" | "PARTIAL_ACK" | "CONFIRMED" | "REJECTED" | "OUT_OF_BAND";
  "customer_status_projection": "UNDER_REVIEW" | "ACTION_REQUIRED" | "WAITING_ON_CONFIRMATION" | "RESOLVED" | "CLOSED" | null;
  "current_assignee_ref": string | null;
  "assignment_state": "UNASSIGNED" | "ASSIGNED" | "ESCALATED";
  "escalation_target_ref": string | null;
  "routing_queue_ref": string;
  "routing_contract": CollaborationRoutingContract & {
    "routing_scope"?: "WORKFLOW_ITEM";
  };
  "waiting_on_actor": "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM";
  "sla_policy_ref": string | null;
  "sla_due_at": ISO8601DateTimeString;
  "customer_due_at": ISO8601DateTimeString;
  "due_state": "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "BREACHED" | null;
  "queue_entered_at": ISO8601DateTimeString;
  "last_assignment_at": ISO8601DateTimeString;
  "waiting_since_at": ISO8601DateTimeString;
  "reassignment_count_30d": number;
  "ownership_confidence_score": number;
  "assignment_efficiency_score": number;
  "sla_pressure_score": number;
  "escalation_pressure_score": number;
  "collaboration_priority_score": number;
  "resolution_confidence_score": number;
  "customer_thread_ref": string | null;
  "internal_thread_ref": string;
  "staff_workspace_version": number;
  "customer_workspace_version": number;
  "active_request_info_ref": string | null;
  "next_request_info_ordinal": number;
  "last_customer_activity_at": ISO8601DateTimeString;
  "last_internal_activity_at": ISO8601DateTimeString;
  "last_customer_visible_event_ref": string | null;
  "last_internal_event_ref": string | null;
  "dedupe_key": string;
  "closed_at": ISO8601DateTimeString;
};
export const WorkflowItemSchemaLineage = { schemaId: "https://taxat.dev/schemas/workflow_item.schema.json", sourceHash: "8272d23e3a9a0c66800f155d377f96df0a97f733c1669451a97cf4e6cff9fc57" } as const;

export const DomainWorkflowAndFilingBindingManifest = { familyRef: "DOMAIN_WORKFLOW_AND_FILING", schemaCount: 52 } as const;
