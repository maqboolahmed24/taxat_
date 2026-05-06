/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type AcceptedRiskApproval = {
  "accepted_risk_approval_id": string;
  "error_id": string;
  "manifest_id": string;
  "root_manifest_id": string;
  "failure_resolution_contract": FailureResolutionContract & {
    "lifecycle_role"?: "ACCEPTED_RISK_APPROVAL";
    "role_specific_binding_policy"?: "APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS";
  };
  "decision_basis": "EXPLICIT_APPROVAL" | "POLICY_BASIS";
  "approval_state": "ACTIVE" | "EXPIRED" | "REVOKED" | "SUPERSEDED";
  "approver_type": "APPROVER" | "TENANT_ADMIN" | "SECURITY_OPERATOR" | "SYSTEM_POLICY";
  "approver_ref": string | null;
  "policy_basis_ref": string | null;
  "retention_class": "regulated_record" | "derived_artifact" | "operational_log" | "analytics_projection" | "policy_governed_other" | null;
  "artifact_retention_ref": string | null;
  "workflow_item_id": string | null;
  "rationale_ref": string;
  "bounded_scope_refs": Array<string>;
  "approved_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "revoked_at": ISO8601DateTimeString;
  "superseded_by_approval_id": string | null;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const AcceptedRiskApprovalSchemaLineage = { schemaId: "https://taxat.dev/schemas/accepted_risk_approval.schema.json", sourceHash: "4a813e45226ffac57abbba56b162d2e41a26ceac425e5ff6728a55204f4d09d1" } as const;

export type AuditInvestigationFrame = {
  "frame_id": string;
  "artifact_type": "AuditInvestigationFrame";
  "tenant_id": string;
  "shell_family": "GOVERNANCE_DENSITY_SHELL";
  "object_anchor_ref": string;
  "dominant_question": string;
  "query_contract_code": "AUDIT_TRAIL" | "RUN_TIMELINE" | "NIGHTLY_BATCH_TIMELINE" | "FILING_EVIDENCE_LEDGER" | "PRIVACY_ACTION_LEDGER";
  "query_anchor_ref": string;
  "ordering_basis": "AUDIT_STREAM_SEQUENCE" | "RECORDED_AT_THEN_STREAM_SEQUENCE";
  "settlement_state": AuditInvestigationFrameSettlementState;
  "recovery_posture": AuditInvestigationFrameRecoveryPosture;
  "interaction_layer": GovernanceInteractionLayer;
  "focus_anchor_ref": string;
  "ordered_event_refs": Array<string>;
  "supporting_trace_span_refs": Array<string>;
  "supporting_log_record_refs": Array<string>;
  "correlation_keys": Array<string>;
  "integrity_chain_posture": "VERIFIED" | "PARTIAL_GAP" | "BROKEN" | "PENDING_REBUILD";
  "export_posture": AuditInvestigationFrameExportPosture;
  "externalization_governance_contract": ExternalizationGovernanceContract & {
    "boundary_scope"?: "AUDIT_INVESTIGATION_FRAME";
  };
  "active_filters": AuditInvestigationFrameActiveFilters;
  "audit_workspace": AuditInvestigationFrameAuditWorkspace;
  "audit_tape": AuditInvestigationFrameAuditTape;
  "object_neighborhood": AuditInvestigationFrameObjectNeighborhood;
  "event_diff_inspector": AuditInvestigationFrameEventDiffInspector;
  "export_eligibility_panel": AuditInvestigationFrameExportEligibilityPanel;
  "object_neighborhood_refs": Array<string>;
  "next_cursor"?: string | null;
  "updated_at": ISO8601DateTimeString;
};
export const AuditInvestigationFrameSchemaLineage = { schemaId: "https://taxat.dev/schemas/audit_investigation_frame.schema.json", sourceHash: "da722027734a4912d7c128864c83942c88c373ebcbf473022eece8970e4e61f4" } as const;

export type AuditInvestigationFrameSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type AuditInvestigationFrameRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type AuditInvestigationFrameInteractionLayer = {
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
};

export type AuditInvestigationFrameWorkspaceMode = "EVENT_TIMELINE" | "OBJECT_TIMELINE" | "CORRELATION_TRACE";

export type AuditInvestigationFramePromotedSupportSurface = "AUDIT_SIDECAR" | "EXPORT_ELIGIBILITY_PANEL";

export type AuditInvestigationFrameTimelineMode = "APPEND_ONLY";

export type AuditInvestigationFrameNeighborhoodMode = "UPSTREAM_DOWNSTREAM";

export type AuditInvestigationFrameEventDiffPanelMode = "CHANGE_NUCLEI" | "MASKED_CHANGE_NUCLEI" | "LIMITATION_NOTICE";

export type AuditInvestigationFrameRawPayloadPosture = "SUMMARY_FIRST";

export type AuditInvestigationFrameExportPanelMode = "FULL_EXPORT_READY" | "MASKED_EXPORT_ONLY" | "APPROVAL_GATE" | "DENIED_NOTICE";

export type AuditInvestigationFrameInvocationPosture = "ACTIVE_FILTERED_SLICE";

export type AuditInvestigationFrameExportPosture = {
  "state": "FULL_ALLOWED" | "MASKED_ONLY" | "APPROVAL_REQUIRED" | "DENIED";
  "reason_codes": Array<string>;
};

export type AuditInvestigationFrameActiveFilters = {
  "actor_refs": Array<string>;
  "event_families": Array<string>;
  "client_refs": Array<string>;
  "manifest_refs": Array<string>;
  "authority_operation_refs": Array<string>;
  "object_refs": Array<string>;
  "window_from": ISO8601DateTimeString;
  "window_to": ISO8601DateTimeString;
};

export type AuditInvestigationFrameAuditWorkspace = {
  "surface_order": ["INVENTORY_RAIL","WORKSPACE_CANVAS","EVENT_DIFF_INSPECTOR","AUDIT_SIDECAR"];
  "workspace_mode": AuditInvestigationFrameWorkspaceMode;
  "active_filters": AuditInvestigationFrameActiveFilters;
  "selected_event_ref": string;
  "selected_object_ref_or_null": string | null;
  "promoted_support_surface": AuditInvestigationFramePromotedSupportSurface;
};

export type AuditInvestigationFrameAuditTapeRow = {
  "event_ref": string;
  "family_ref": string;
  "actor_or_service_ref_or_null": string | null;
  "primary_object_ref_or_null": string | null;
  "diff_available": boolean;
};

export type AuditInvestigationFrameAuditTape = {
  "timeline_mode": AuditInvestigationFrameTimelineMode;
  "rows": Array<AuditInvestigationFrameAuditTapeRow>;
  "selected_event_ref": string;
};

export type AuditInvestigationFrameObjectNeighborhood = {
  "upstream_event_refs"?: JsonValue;
} | {
  "downstream_event_refs"?: JsonValue;
};

export type AuditInvestigationFrameEventDiffInspector = {
  "panel_mode": AuditInvestigationFrameEventDiffPanelMode;
  "baseline_event_ref_or_null": string | null;
  "comparison_event_ref_or_null": string | null;
  "summary_ref_or_null": string | null;
  "changed_field_refs": Array<string>;
  "raw_payload_posture": AuditInvestigationFrameRawPayloadPosture;
};

export type AuditInvestigationFrameExportEligibilityPanel = {
  "panel_mode": AuditInvestigationFrameExportPanelMode;
  "state": "FULL_ALLOWED" | "MASKED_ONLY" | "APPROVAL_REQUIRED" | "DENIED";
  "reason_codes": Array<string>;
  "active_slice_scope_ref": string;
  "masked_preview_ref_or_null": string | null;
  "approval_requirement_ref_or_null": string | null;
  "invocation_posture": AuditInvestigationFrameInvocationPosture;
};

export type ConfigChangeRequest = {
  "artifact_type": "ConfigChangeRequest";
  "ccr_id": string;
  "tenant_id": string;
  "lifecycle_state": "OPEN" | "UNDER_REVIEW" | "TESTING" | "APPROVED" | "REJECTED" | "IMPLEMENTED" | "ROLLED_BACK";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "CONFIG_CHANGE_REQUEST";
    "machine_code"?: "CONFIG_CHANGE_REQUEST_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "diff_ref": string;
  "risk_assessment_ref": string;
  "approvals": Array<string>;
  "rejected_reason_code_or_null": string | null;
  "implemented_release_ref_or_null": string | null;
  "rolled_back_release_ref_or_null": string | null;
  "state_changed_at": ISO8601DateTimeString;
  "created_at": ISO8601DateTimeString;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const ConfigChangeRequestSchemaLineage = { schemaId: "https://taxat.dev/schemas/config_change_request.schema.json", sourceHash: "93226f7dd63647dcc8861f2241aaa60be2fbd27738fd600abaea363f9513f862" } as const;

export type ConfigFreeze = {
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
export const ConfigFreezeSchemaLineage = { schemaId: "https://taxat.dev/schemas/config_freeze.schema.json", sourceHash: "1f26e4494c27f052e93e42c424741fb32830b22a938be7c46c2754ca0d531c3e" } as const;

export type ConfigFreezeConfigEntry = {
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

export type ConfigVersion = {
  "artifact_type": "ConfigVersion";
  "version_id": string;
  "config_type": string;
  "lifecycle_state": "DRAFT" | "CANDIDATE" | "VERIFIED" | "APPROVED" | "DEPRECATED" | "REVOKED" | "RETIRED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "CONFIG_VERSION";
    "machine_code"?: "CONFIG_VERSION_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "content_hash": string;
  "effective_scope": Array<string>;
  "approvals": Array<string>;
  "verification_evidence_ref_or_null": string | null;
  "approved_at_or_null": ISO8601DateTimeString;
  "superseded_by_version_id_or_null": string | null;
  "revocation_reason_code_or_null": string | null;
  "retired_at_or_null": ISO8601DateTimeString;
  "state_changed_at": ISO8601DateTimeString;
  "created_at": ISO8601DateTimeString;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const ConfigVersionSchemaLineage = { schemaId: "https://taxat.dev/schemas/config_version.schema.json", sourceHash: "0f529937c9f6f689a0e1fbf82c23a121b7c0fea1175aa9305168cfff69d1ffd0" } as const;

export type FeatureFlagSnapshot = {
  "feature_flag_snapshot_id": string;
  "artifact_type": "FeatureFlagSnapshot";
  "surface_state": "GOVERNED_FLAG_SURFACE_PRESENT" | "NO_GOVERNED_FLAG_SURFACE";
  "provider_adapter_ref_or_null": string | null;
  "provider_environment_ref_or_null": string | null;
  "provider_contract_profile_ref_or_null": string | null;
  "evaluation_context": {
    "tenant_id": string;
    "client_id_or_null": string | null;
    "environment_ref": string;
    "requested_scope": Array<string>;
    "executable_scope": Array<string>;
    "principal_context_ref_or_null": string | null;
    "access_binding_hash_or_null": string | null;
    "route_identity_ref_or_null": string | null;
  };
  "entries": Array<FeatureFlagSnapshotEntry>;
  "ordered_flag_keys": Array<string>;
  "feature_flag_snapshot_hash": string | null;
};
export const FeatureFlagSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/feature_flag_snapshot.schema.json", sourceHash: "78887a7dd894d2e27f63927e213319c44fde362719cc0d3d6bab1756b39731ce" } as const;

export type FeatureFlagSnapshotEntry = {
  "flag_key": string;
  "enabled": boolean;
  "variant_ref_or_null": string | null;
  "value_json": FeatureFlagSnapshotJsonValue;
  "default_value_json": FeatureFlagSnapshotJsonValue | null;
  "rule_ref_or_null": string | null;
  "reason_code": "TARGETING_MATCH" | "STATIC_DEFAULT" | "NO_GOVERNED_FLAG_SURFACE";
};

export type FeatureFlagSnapshotJsonValue = string | number | boolean | null | Array<FeatureFlagSnapshotJsonValue> | {
  [key: string]: FeatureFlagSnapshotJsonValue;
};

export type GovernanceAccessSimulation = {
  "artifact_type": "GovernanceAccessSimulation";
  "simulation_id": string;
  "tenant_id": string;
  "policy_snapshot_hash": string;
  "principal_context_ref": string;
  "governance_target_ref": string | null;
  "resource_class": string;
  "action_family": string;
  "requested_scope": Array<"year_end" | "quarterly_update" | "estimate_only" | "prepare_submission" | "submit" | "amendment_intent" | "amendment_submit">;
  "requested_partition_scope_refs": Array<string>;
  "authorization_decision": AuthorizationDecision;
  "authority_layer_boundary": AuthorityLayerBoundaryContract & {
    "binding_scope_class"?: "GOVERNANCE_ACCESS_SIMULATION";
  };
  "authority_chain_layers": GovernanceAccessSimulationAuthorityChainLayerStack;
  "simulator_posture": GovernanceAccessSimulationSimulatorPosture;
  "mutation_hazard": null | GovernanceAccessSimulationMutationHazard;
  "mutation_basis_contract": null | GovernanceMutationBasisContract;
  "simulated_at": ISO8601DateTimeString;
};
export const GovernanceAccessSimulationSchemaLineage = { schemaId: "https://taxat.dev/schemas/governance_access_simulation.schema.json", sourceHash: "55616c7b0580b9de0f26f63079a791f68bded02f3cb803c25dee8259bd2665cc" } as const;

export type GovernanceAccessSimulationChainLayerOutcome = "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY" | "NOT_APPLICABLE";

export type GovernanceAccessSimulationSimulatorPosture = "READ_ONLY_DECISION" | "ADVISORY_ONLY" | "APPROVAL_GATED" | "BOUNDED_SAFE";

export type GovernanceAccessSimulationAuthorityChainLayerBase = {
  "layer_code": string;
  "layer_outcome": GovernanceAccessSimulationChainLayerOutcome;
  "reason_codes": Array<string>;
};

export type GovernanceAccessSimulationSessionAuthnLayer = GovernanceAccessSimulationAuthorityChainLayerBase & {
  "layer_code"?: "SESSION_AUTHN_POSTURE";
};

export type GovernanceAccessSimulationTenantOperationalAuthorityLayer = GovernanceAccessSimulationAuthorityChainLayerBase & {
  "layer_code"?: "TENANT_OPERATIONAL_AUTHORITY";
};

export type GovernanceAccessSimulationClientDelegationCoverageLayer = GovernanceAccessSimulationAuthorityChainLayerBase & {
  "layer_code"?: "CLIENT_DELEGATION_COVERAGE";
};

export type GovernanceAccessSimulationExternalAuthorityLinkReadinessLayer = GovernanceAccessSimulationAuthorityChainLayerBase & {
  "layer_code"?: "EXTERNAL_AUTHORITY_LINK_READINESS";
};

export type GovernanceAccessSimulationAuthorityOfRecordOutcomeLayer = GovernanceAccessSimulationAuthorityChainLayerBase & {
  "layer_code"?: "AUTHORITY_OF_RECORD_OUTCOME";
};

export type GovernanceAccessSimulationAuthorityChainLayerStack = Array<GovernanceAccessSimulationAuthorityOfRecordOutcomeLayer>;

export type GovernanceAccessSimulationMutationHazard = GovernanceMutationHazardContract;

export type GovernanceInteractionLayer = {
  "foundation_contract": InteractionLayerFoundationContract & {
    "shell_family"?: "GOVERNANCE_DENSITY_SHELL";
  };
  "density_profile": "GOVERNANCE_DENSITY_PROFILE_V1";
  "inventory_filter_grammar": "CANONICAL_ROUTE_FILTER_GRAMMAR";
  "support_surface_policy": "ONE_PROMOTED_SUPPORT_SURFACE_MAX";
  "diff_basket_policy": "STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT";
  "export_binding_policy": "ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT";
  "keyboard_focus_policy": "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION";
  "selector_profile": "GOVERNANCE_SEMANTIC_SELECTORS_V1";
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
  "motion_profile": "SUBTLE_CAUSAL_ONLY";
  "feedback_truth_policy": "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
};
export const GovernanceInteractionLayerSchemaLineage = { schemaId: "https://taxat.dev/schemas/governance_interaction_layer.schema.json", sourceHash: "c0a51af44c626ce29574e93da9bdab4aa0afb58f94bc5c0697864a8de1efdce5" } as const;

export type GovernanceMutationBasisContract = {
  "contract_version": "GOVERNANCE_MUTATION_BASIS_CONTRACT_V1";
  "basis_contract_hash": string;
  "policy_snapshot_hash": string;
  "access_binding_hash": string;
  "dependency_topology_hash": string;
  "simulation_basis_hash": string;
  "hazard_contract_hash": string;
  "commit_authority_posture": "PREVIEW_ONLY" | "APPROVAL_GATED" | "BOUNDED_SAFE";
  "approval_requirement": "NOT_REQUIRED" | "SINGLE_APPROVER" | "DUAL_APPROVER" | "SECURITY_REVIEW" | "CHANGE_ADVISORY_QUORUM";
  "bounded_safe_mutation": 0 | 1;
  "required_approvals": Array<string>;
  "simulation_confidence_score": number;
  "predictability_score": number;
};
export const GovernanceMutationBasisContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/governance_mutation_basis_contract.schema.json", sourceHash: "1064ce38b226d23fcb44181e3d6b41353a6a567cc99e0e1bc702350fecddbfbc" } as const;

export type GovernanceMutationHazardContract = {
  "contract_version": "GOVERNANCE_MUTATION_HAZARD_CONTRACT_V1";
  "hazard_contract_hash": string;
  "policy_snapshot_hash": string;
  "access_binding_hash": string;
  "dependency_topology_hash": string;
  "simulation_basis_hash": string;
  "count_class_profile_code": "GOVERNANCE_IMPACT_COUNT_CLASS_V1";
  "commit_authority_posture": "PREVIEW_ONLY" | "APPROVAL_GATED" | "BOUNDED_SAFE";
  "impact_radius_lower_score": number;
  "impact_radius_upper_score": number;
  "impacted_principal_count": number;
  "impacted_principal_count_class": GovernanceMutationHazardContractImpactedCountClass;
  "impacted_client_count": number;
  "impacted_client_count_class": GovernanceMutationHazardContractImpactedCountClass;
  "impacted_authority_operation_count": number;
  "impacted_authority_operation_count_class": GovernanceMutationHazardContractImpactedCountClass;
  "impacted_workflow_count": number;
  "impacted_workflow_count_class": GovernanceMutationHazardContractImpactedCountClass;
  "impacted_limitation_count": number;
  "impacted_limitation_count_class": GovernanceMutationHazardContractImpactedCountClass;
  "privilege_gain_score": number;
  "scope_expansion_score": number;
  "masking_relaxation_score": number;
  "policy_risk_score": number;
  "approval_necessity_score": number;
  "approval_requirement": "NOT_REQUIRED" | "SINGLE_APPROVER" | "DUAL_APPROVER" | "SECURITY_REVIEW" | "CHANGE_ADVISORY_QUORUM";
  "bounded_safe_mutation": 0 | 1;
  "required_approvals": Array<string>;
  "simulation_confidence_score": number;
  "predictability_score": number;
  "risk_driver_codes": Array<GovernanceMutationHazardContractRiskDriverCode>;
  "approval_trigger_codes": Array<GovernanceMutationHazardContractApprovalTriggerCode>;
  "confidence_limiter_codes": Array<GovernanceMutationHazardContractConfidenceLimiterCode>;
  "bounded_safety_blocker_codes": Array<GovernanceMutationHazardContractBoundedSafetyBlockerCode>;
  "reason_codes": Array<string>;
};
export const GovernanceMutationHazardContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/governance_mutation_hazard_contract.schema.json", sourceHash: "d944e53b431440ebfa2e437888ce2726377e69e88d3aed78877373d9b5320b5a" } as const;

export type GovernanceMutationHazardContractImpactedCountClass = "ZERO" | "ONE" | "SMALL_BATCH" | "MEDIUM_BATCH" | "LARGE_BATCH" | "ESTATE_WIDE";

export type GovernanceMutationHazardContractRiskDriverCode = "PRIVILEGE_GAIN" | "SCOPE_EXPANSION" | "MASKING_RELAXATION" | "BROAD_BLAST_RADIUS";

export type GovernanceMutationHazardContractApprovalTriggerCode = "SINGLE_APPROVER_REQUIRED" | "DUAL_APPROVER_REQUIRED" | "SECURITY_REVIEW_REQUIRED" | "CHANGE_ADVISORY_QUORUM_REQUIRED";

export type GovernanceMutationHazardContractConfidenceLimiterCode = "LOW_SIMULATION_CONFIDENCE" | "LOW_PREDICTABILITY";

export type GovernanceMutationHazardContractBoundedSafetyBlockerCode = "PRIVILEGE_GAIN_PRESENT" | "SCOPE_EXPANSION_PRESENT" | "MASKING_RELAXATION_PRESENT" | "IMPACT_RADIUS_TOO_LARGE" | "POLICY_RISK_TOO_HIGH" | "CONFIDENCE_TOO_LOW" | "PREDICTABILITY_TOO_LOW";

export type GovernancePolicySnapshot = {
  "artifact_type": "GovernancePolicySnapshot";
  "snapshot_id": string;
  "tenant_id": string;
  "shell_family": "GOVERNANCE_DENSITY_SHELL";
  "object_anchor_ref": string;
  "dominant_question": string;
  "settlement_state": GovernancePolicySnapshotSettlementState;
  "recovery_posture": GovernancePolicySnapshotRecoveryPosture;
  "interaction_layer": GovernanceInteractionLayer;
  "cache_isolation_contract": CacheIsolationContract & {
    "cache_scope_class"?: "GOVERNANCE_POLICY_SNAPSHOT";
  };
  "policy_snapshot_hash": string;
  "environment_bindings": Array<GovernancePolicySnapshotEnvironmentBinding>;
  "session_security_posture": GovernancePolicySnapshotSessionSecurityPosture;
  "step_up_rules": Array<GovernancePolicySnapshotStepUpRule>;
  "approval_rules": Array<GovernancePolicySnapshotApprovalRule>;
  "masking_defaults": Array<string>;
  "last_material_change_ref": string;
  "tenant_config_workspace": GovernancePolicySnapshotTenantConfigWorkspace;
  "change_basket": GovernancePolicySnapshotChangeBasket;
  "approval_composer": GovernancePolicySnapshotApprovalComposer;
  "blast_radius_panel": GovernancePolicySnapshotBlastRadiusPanel;
  "config_history_timeline": GovernancePolicySnapshotConfigHistoryTimeline;
  "captured_at": ISO8601DateTimeString;
};
export const GovernancePolicySnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/governance_policy_snapshot.schema.json", sourceHash: "7c1c26fae0b4f05b0cdfdba8ba26090359cafb3c616bc11083a3d90746473f35" } as const;

export type GovernancePolicySnapshotSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type GovernancePolicySnapshotRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type GovernancePolicySnapshotInteractionLayer = {
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
};

export type GovernancePolicySnapshotApprovalRequirement = "NOT_REQUIRED" | "SINGLE_APPROVER" | "DUAL_APPROVER" | "SECURITY_REVIEW" | "CHANGE_ADVISORY_QUORUM";

export type GovernancePolicySnapshotApprovalRequirementNullable = "NOT_REQUIRED" | "SINGLE_APPROVER" | "DUAL_APPROVER" | "SECURITY_REVIEW" | "CHANGE_ADVISORY_QUORUM" | null;

export type GovernancePolicySnapshotSectionCode = "TENANT_PROFILE" | "SECURITY_POSTURE" | "AUTHORITY_AND_ENVIRONMENTS" | "CONNECTOR_POLICY" | "APPROVAL_AND_CHANGE_CONTROL" | "NOTIFICATIONS_AND_EVIDENCE";

export type GovernancePolicySnapshotEnvironmentBinding = {
  "environment_ref": string;
  "provider_environment": string;
  "status": "ACTIVE" | "READ_ONLY" | "DISABLED";
};

export type GovernancePolicySnapshotSessionSecurityPosture = {
  "browser_session_allowed": boolean;
  "native_session_allowed": boolean;
  "automation_session_allowed": boolean;
  "csrf_binding_required": boolean;
  "native_device_binding_required": boolean;
  "step_up_rotation_required": boolean;
};

export type GovernancePolicySnapshotStepUpRule = {
  "action_family": string;
  "required_authn_level": "BASIC" | "MFA" | "STEP_UP";
  "reason_codes": Array<string>;
};

export type GovernancePolicySnapshotApprovalRule = {
  "action_family": string;
  "approval_required": boolean;
  "approval_scope": string | null;
};

export type GovernancePolicySnapshotInlinePolicyHelp = {
  "help_mode": "INLINE";
  "help_refs": Array<string>;
};

export type GovernancePolicySnapshotTenantConfigWorkspace = {
  "surface_order": ["SECTION_NAV","CONFIG_FORM","INLINE_POLICY_HELP","BLAST_RADIUS_PANEL","CHANGE_BASKET","APPROVAL_COMPOSER","CONFIG_HISTORY_TIMELINE"];
  "section_nav_order": ["TENANT_PROFILE","SECURITY_POSTURE","AUTHORITY_AND_ENVIRONMENTS","CONNECTOR_POLICY","APPROVAL_AND_CHANGE_CONTROL","NOTIFICATIONS_AND_EVIDENCE"];
  "active_section_code": GovernancePolicySnapshotSectionCode;
  "visible_form_section_refs": Array<string>;
  "inline_policy_help": GovernancePolicySnapshotInlinePolicyHelp;
};

export type GovernancePolicySnapshotStagedChange = {
  "change_ref": string;
  "field_ref": string;
  "current_value_label": string;
  "proposed_value_label": string;
  "effective_scope_label": string;
  "reason_required": boolean;
  "approval_required": boolean;
  "audit_event_families": Array<string>;
  "input_commit_mode": "EXPLICIT_STAGE";
};

export type GovernancePolicySnapshotStagedChangeGroup = {
  "object_type": string;
  "mutation_hazard": GovernanceMutationHazardContract;
  "mutation_basis_contract": GovernanceMutationBasisContract;
  "staged_changes": Array<GovernancePolicySnapshotStagedChange>;
};

export type GovernancePolicySnapshotChangeBasket = {
  "basket_state": "EMPTY" | "DRAFTING" | "READY_TO_SUBMIT" | "STEP_UP_REQUIRED" | "STALE_REBASE_REQUIRED" | "RECEIPT_PENDING";
  "simulation_atomicity": "EMPTY" | "ATOMIC" | "MIXED_BASIS_BLOCKED" | "STALE_BASIS_BLOCKED";
  "submission_enabled": boolean;
  "active_simulation_basis_hash": string | null;
  "active_dependency_topology_hash": string | null;
  "active_mutation_hazard_or_null": null | GovernanceMutationHazardContract;
  "active_mutation_basis_contract_or_null": null | GovernanceMutationBasisContract;
  "step_up_pending": boolean;
  "approval_requirement": GovernancePolicySnapshotApprovalRequirementNullable;
  "bounded_safe_mutation": 0 | 1 | null;
  "required_approvals": Array<string>;
  "staged_change_groups": Array<GovernancePolicySnapshotStagedChangeGroup>;
};

export type GovernancePolicySnapshotApprovalComposer = {
  "composer_state": "NOT_REQUIRED" | "DRAFT" | "READY" | "SUBMITTED";
  "requested_approver_scope": Array<string>;
  "related_object_refs": Array<string>;
  "rationale_required": boolean;
  "rationale_ref": string | null;
  "expires_at": ISO8601DateTimeString;
  "mutation_basis_contract_or_null": null | GovernanceMutationBasisContract;
};

export type GovernancePolicySnapshotBlastRadiusPanel = {
  "panel_state": "EMPTY" | "ACTIVE" | "STALE";
  "mutation_hazard_or_null": null | GovernanceMutationHazardContract;
  "mutation_basis_contract_or_null": null | GovernanceMutationBasisContract;
};

export type GovernancePolicySnapshotConfigHistoryTimeline = {
  "timeline_state": "CURRENT" | "REBASE_REQUIRED" | "HISTORICAL_REVIEW";
  "latest_change_ref": string;
  "selected_change_ref": string;
  "visible_change_refs": Array<string>;
};

export type RetentionGovernanceFrame = {
  "frame_id": string;
  "artifact_type": "RetentionGovernanceFrame";
  "tenant_id": string;
  "shell_family": "GOVERNANCE_DENSITY_SHELL";
  "object_anchor_ref": string;
  "dominant_question": string;
  "settlement_state": RetentionGovernanceFrameSettlementState;
  "recovery_posture": RetentionGovernanceFrameRecoveryPosture;
  "interaction_layer": GovernanceInteractionLayer;
  "policy_snapshot_hash": string;
  "focus_anchor_ref": string;
  "artifact_rows": Array<RetentionGovernanceFrameRetentionArtifactRow>;
  "legal_hold_count": number;
  "erasure_queue_count": number;
  "limitation_count": number;
  "legal_hold_register_ref": string;
  "erasure_queue_ref": string;
  "retention_workspace": RetentionGovernanceFrameRetentionWorkspace;
  "retention_policy_matrix": RetentionGovernanceFrameRetentionPolicyMatrix;
  "legal_hold_register": RetentionGovernanceFrameLegalHoldRegister;
  "erasure_queue": RetentionGovernanceFrameErasureQueue;
  "retention_impact_preview": RetentionGovernanceFrameRetentionImpactPreview;
  "updated_at": ISO8601DateTimeString;
};
export const RetentionGovernanceFrameSchemaLineage = { schemaId: "https://taxat.dev/schemas/retention_governance_frame.schema.json", sourceHash: "75ef270714451fb6cff625372d7365bf01c3813d8ca5b6d5ecdbc617fac9a5df" } as const;

export type RetentionGovernanceFrameSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type RetentionGovernanceFrameRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type RetentionGovernanceFrameInteractionLayer = {
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
};

export type RetentionGovernanceFrameWorkspaceMode = "POLICIES" | "LEGAL_HOLDS" | "ERASURE";

export type RetentionGovernanceFramePromotedSupportSurface = "AUDIT_SIDECAR" | "RETENTION_IMPACT_PREVIEW";

export type RetentionGovernanceFrameWarningPosture = "NONE" | "STATUTORY_BLOCK" | "LEGAL_HOLD_BLOCK" | "DESTRUCTIVE_REVIEW" | "APPROVAL_OR_STEP_UP_REQUIRED";

export type RetentionGovernanceFrameLegalHoldState = "ACTIVE" | "RELEASE_ELIGIBLE" | "RELEASED";

export type RetentionGovernanceFrameReleaseEligibilityState = "BLOCKED" | "RELEASE_ELIGIBLE" | "NOT_APPLICABLE";

export type RetentionGovernanceFrameErasureReadinessState = "ELIGIBLE" | "BLOCKED" | "PENDING_REVIEW";

export type RetentionGovernanceFrameOverrideState = "NONE" | "APPLIED" | "PENDING_APPROVAL" | "BLOCKED_BY_STATUTORY_MINIMUM";

export type RetentionGovernanceFrameRetentionWorkspaceFilters = {
  "artifact_classes": Array<string>;
  "retention_classes": Array<string>;
  "client_refs": Array<string>;
  "legal_hold_states": Array<RetentionGovernanceFrameLegalHoldState>;
  "release_eligibility_states": Array<RetentionGovernanceFrameReleaseEligibilityState>;
  "erasure_readiness_states": Array<RetentionGovernanceFrameErasureReadinessState>;
};

export type RetentionGovernanceFrameRetentionWorkspace = {
  "surface_order": ["INVENTORY_RAIL","WORKSPACE_CANVAS","RETENTION_IMPACT_PREVIEW","AUDIT_SIDECAR"];
  "workspace_mode": RetentionGovernanceFrameWorkspaceMode;
  "active_filters": RetentionGovernanceFrameRetentionWorkspaceFilters;
  "selected_policy_row_ref": string | null;
  "selected_legal_hold_ref": string | null;
  "selected_erasure_item_ref": string | null;
  "promoted_support_surface": RetentionGovernanceFramePromotedSupportSurface;
  "warning_posture": RetentionGovernanceFrameWarningPosture;
};

export type RetentionGovernanceFrameRetentionArtifactRow = {
  "row_ref": string;
  "artifact_class": string;
  "retention_class": string;
  "statutory_minimum_ref": string;
  "tenant_override_ref": string | null;
  "effective_minimum_ref": string;
  "override_state": RetentionGovernanceFrameOverrideState;
  "pseudonymisation_mode": string;
  "limitation_behavior": string;
  "export_posture": "FULL" | "MASKED" | "LIMITED" | "DENIED";
  "legal_hold_count": number;
  "erasure_eligible_count": number;
  "limitation_count": number;
  "affected_artifact_count": number;
  "warning_posture": RetentionGovernanceFrameWarningPosture;
  "inline_warning_ref_or_null": string | null;
  "blocking_reason_refs": Array<string>;
  "staged_change_ref_or_null": string | null;
  "legal_hold_register_ref_or_null": string | null;
  "erasure_queue_ref_or_null": string | null;
};

export type RetentionGovernanceFrameRetentionPolicyMatrix = {
  "column_order": ["ARTIFACT_CLASS","STATUTORY_BASELINE","TENANT_OVERRIDE","EFFECTIVE_MINIMUM","LIMITATION_BEHAVIOR","PSEUDONYMISATION_MODE","EXPORT_POSTURE"];
  "row_refs": Array<string>;
  "selected_row_ref": string | null;
  "editing_posture": "EXPLICIT_STAGE_ONLY";
  "sticky_header_mode": "ROW_AND_COLUMN_HEADERS";
  "inline_blocker_visibility": "ALWAYS_VISIBLE";
};

export type RetentionGovernanceFrameLegalHoldRegister = {
  "column_order": ["CLIENT","OBJECT_REF","HOLD_REASON","RELEASE_ELIGIBILITY","BLOCKED_ERASURE_COUNT","LAST_CHANGED_AT"];
  "hold_refs": Array<string>;
  "selected_hold_ref_or_null": string | null;
  "blocking_hold_refs": Array<string>;
  "release_candidate_hold_refs": Array<string>;
  "release_preview_ref_or_null": string | null;
  "release_action_posture": "NONE_SELECTED" | "PREVIEW_ONLY" | "CHANGE_BASKET_REQUIRED";
};

export type RetentionGovernanceFrameErasureQueue = {
  "section_order": ["ELIGIBLE","BLOCKED","PENDING_REVIEW"];
  "eligible_item_refs": Array<string>;
  "blocked_item_refs": Array<string>;
  "pending_review_item_refs": Array<string>;
  "selected_item_ref_or_null": string | null;
  "destructive_flow_mode": "CHANGE_BASKET_ONLY";
  "primary_blocker_ref_or_null": string | null;
};

export type RetentionGovernanceFrameRetentionImpactPreview = {
  "panel_mode": "RETENTION_IMPACT_PREVIEW";
  "preview_subject_ref_or_null": string | null;
  "preview_mode": "NONE_SELECTED" | "POLICY_CHANGE" | "HOLD_RELEASE" | "ERASURE_ACTION";
  "warning_posture": RetentionGovernanceFrameWarningPosture;
  "blocked_reason_refs": Array<string>;
  "projected_provenance_limitation_refs": Array<string>;
  "affected_artifact_count": number;
  "affected_client_count": number;
  "projected_pseudonymisation_count": number;
  "action_posture": "READ_ONLY" | "CHANGE_BASKET_REQUIRED" | "APPROVAL_OR_STEP_UP_REQUIRED" | "BLOCKED";
};

export type RetentionLimitedExplainabilityContract = {
  "contract_version": "RETENTION_EXPLAINABILITY_V1";
  "boundary_scope": "PROOF_BUNDLE" | "EVIDENCE_GRAPH" | "ENQUIRY_PACK" | "AUDIT_EVENT";
  "surface_role": "FILING_PROOF_ARTIFACT" | "GRAPH_EXPLANATION_INDEX" | "SCRUTINY_EXPORT_PACK" | "AUDIT_RECONSTRUCTION_EVIDENCE";
  "surface_specific_binding_policy": "PROOF_BUNDLE_RETAINS_DECISIVE_LIMITATION_AND_RETENTION_BINDING" | "EVIDENCE_GRAPH_RETAINS_LIMITATION_NOTES_AND_TARGET_EXPLANATION_POSTURE" | "ENQUIRY_PACK_RETAINS_LIMITATION_NOTES_OMISSIONS_AND_RETENTION_BINDING" | "AUDIT_EVENT_RETAINS_MINIMUM_RECONSTRUCTION_CONTEXT_AFTER_PAYLOAD_EXPIRY";
  "decisive_limitations_policy": "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT";
  "explanation_state_policy": "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES";
  "omission_disclosure_policy": "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE";
  "audit_sufficiency_policy": "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM";
  "present_limited_truth_policy": "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED";
  "silent_ambiguity_policy": "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN";
};
export const RetentionLimitedExplainabilityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/retention_limited_explainability_contract.schema.json", sourceHash: "6d3d1889f4d75ec9cb46fe0fae9a901c7d5c06db8d9b81b35e7782f2d74634d4" } as const;

export type RetentionTag = {
  "artifact_type": "RetentionTag";
  "retention_tag_id": string;
  "retention_class": "regulated_record" | "derived_artifact" | "operational_log" | "analytics_projection" | "policy_governed_other";
  "anchor_event": string;
  "anchor_timestamp": ISO8601DateTimeString;
  "minimum_expiry_at": ISO8601DateTimeString;
  "policy_expiry_at": ISO8601DateTimeString;
  "effective_expiry_at": ISO8601DateTimeString;
  "legal_hold_state": "NONE" | "ACTIVE" | "RELEASE_ELIGIBLE" | "RELEASED";
  "legal_hold_ref": string | null;
  "legal_hold_changed_at": ISO8601DateTimeString;
  "erasure_eligibility": "ELIGIBLE" | "BLOCKED_LEGAL_HOLD" | "BLOCKED_STATUTORY_MINIMUM" | "BLOCKED_PROOF_PRESERVATION" | "BLOCKED_AUTHORITY_AMBIGUITY";
  "erasure_decided_at": ISO8601DateTimeString;
  "erasure_reason_codes": Array<string>;
  "pseudonymisation_mode": string;
  "limitation_behavior": "NONE" | "SURVIVE_WITH_LIMITATION_NOTES" | "EXPIRED_PLACEHOLDER_ONLY" | "PSEUDONYMISED_SURVIVAL";
  "limitation_reason_codes": Array<string>;
  "retention_basis_ref": string;
  "proof_preservation_basis_ref": string | null;
  "authority_ambiguity_ref": string | null;
};
export const RetentionTagSchemaLineage = { schemaId: "https://taxat.dev/schemas/retention_tag.schema.json", sourceHash: "fe63f3a9a6a0aa79d2ab39160757ae58196b2659551c4308da4429c7e381e9e9" } as const;

export type RoleTemplateMatrix = {
  "artifact_type": "RoleTemplateMatrix";
  "tenant_id": string;
  "shell_family": "GOVERNANCE_DENSITY_SHELL";
  "object_anchor_ref": string;
  "dominant_question": string;
  "settlement_state": RoleTemplateMatrixSettlementState;
  "recovery_posture": RoleTemplateMatrixRecoveryPosture;
  "interaction_layer": GovernanceInteractionLayer;
  "cache_isolation_contract": CacheIsolationContract & {
    "cache_scope_class"?: "ROLE_TEMPLATE_MATRIX";
  };
  "role_id": string;
  "role_label": string;
  "policy_snapshot_hash": string;
  "version_hash": string;
  "focus_anchor_ref": string | null;
  "role_matrix_workspace": RoleTemplateMatrixRoleMatrixWorkspace;
  "matrix_rows": Array<RoleTemplateMatrixMatrixRow>;
  "matrix_columns": Array<RoleTemplateMatrixMatrixColumn>;
  "matrix_cells": Array<RoleTemplateMatrixMatrixCell>;
  "selected_action_detail": null | RoleTemplateMatrixSelectedActionDetail;
  "captured_at": ISO8601DateTimeString;
};
export const RoleTemplateMatrixSchemaLineage = { schemaId: "https://taxat.dev/schemas/role_template_matrix.schema.json", sourceHash: "cfea778dcba20ea75b73d43872b22603cb1c3e163c639da8ad128afd655a0f5d" } as const;

export type RoleTemplateMatrixSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type RoleTemplateMatrixRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type RoleTemplateMatrixInteractionLayer = {
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
};

export type RoleTemplateMatrixMatrixDecision = "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY";

export type RoleTemplateMatrixActiveFilters = {
  "resource_classes": Array<string>;
  "action_families": Array<string>;
  "decision_outcomes": Array<RoleTemplateMatrixMatrixDecision>;
};

export type RoleTemplateMatrixRoleMatrixWorkspace = {
  "surface_order": ["PRINCIPAL_DIRECTORY","WORKSPACE_CANVAS","ACCESS_INSPECTOR","AUTHORITY_CHAIN_PANEL","POLICY_SIMULATOR"];
  "active_filters": RoleTemplateMatrixActiveFilters;
  "selected_role_template_ref": string;
  "selected_cell_ref": string | null;
  "grid_navigation_model": "ROW_COLUMN_ROVING_TABINDEX";
  "inspector_state": "HIDDEN" | "CELL_SELECTED" | "ROLE_EDITING";
  "promoted_support_surface": "AUDIT_SIDECAR" | "POLICY_SIMULATOR";
  "latest_simulation_ref": string | null;
  "role_editor_pending_change_refs": Array<string>;
};

export type RoleTemplateMatrixMatrixRow = {
  "resource_class": string;
  "row_label": string;
  "cell_refs": Array<string>;
};

export type RoleTemplateMatrixMatrixColumn = {
  "action_family": string;
  "column_label": string;
};

export type RoleTemplateMatrixCellDetailCore = {
  "cell_ref": string;
  "resource_class": string;
  "action_family": string;
  "decision": RoleTemplateMatrixMatrixDecision;
  "reason_codes": Array<string>;
  "effective_scope": Array<string>;
  "masking_rules": Array<string>;
  "required_approvals": Array<string>;
  "required_authn_level": "BASIC" | "MFA" | "STEP_UP" | null;
  "policy_path_ref": string;
  "pending_change_ref_or_null": string | null;
};

export type RoleTemplateMatrixMatrixCell = RoleTemplateMatrixCellDetailCore;

export type RoleTemplateMatrixSelectedActionDetail = RoleTemplateMatrixCellDetailCore & {
  "panel_mode": "ACCESS_INSPECTOR";
};

export type SecretVersion = {
  "artifact_type": "SecretVersion";
  "secret_version_id": string;
  "secret_class": string;
  "store_ref": string;
  "key_version_ref": string;
  "policy_profile_ref": string;
  "lineage_ref": string;
  "issued_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
  "rotation_state": "ISSUED" | "ATTESTED" | "ACTIVE" | "ROTATING" | "RETIRED" | "REVOKED";
  "last_attested_at": ISO8601DateTimeString;
  "attestation_ref": string | null;
  "activated_at": ISO8601DateTimeString;
  "rotation_started_at": ISO8601DateTimeString;
  "retired_at": ISO8601DateTimeString;
  "revoked_at": ISO8601DateTimeString;
  "revocation_reason_code": string | null;
  "historical_read_window_until": ISO8601DateTimeString;
  "superseded_by_secret_version_id": string | null;
};
export const SecretVersionSchemaLineage = { schemaId: "https://taxat.dev/schemas/secret_version.schema.json", sourceHash: "3dc107ec7c8b931bfda08cc44feff3af06eef169afb4d708bc2c82f62d870364" } as const;

export type TenantGovernanceSnapshot = {
  "snapshot_id": string;
  "artifact_type": "TenantGovernanceSnapshot";
  "shell_family": "GOVERNANCE_DENSITY_SHELL";
  "object_anchor_ref": string;
  "tenant_id": string;
  "environment_ref": string;
  "policy_snapshot_hash": string;
  "dominant_question": string;
  "dominance_contract": ShellDominanceContract & {
    "dominant_question_surface_code"?: "ATTENTION_SUMMARY";
    "dominant_action_surface_code"?: "ATTENTION_SUMMARY";
    "supplemental_queue_policy"?: "SECONDARY_TO_PRIMARY_ACTION";
    "promoted_support_surface_code_or_null"?: "AUDIT_SIDECAR" | "BLAST_RADIUS_PANEL" | "DIFF_PANEL" | "EXPORT_ELIGIBILITY_PANEL" | "APPROVAL_PANEL" | null;
  };
  "state_taxonomy_contract": ShellStateTaxonomyContract;
  "cross_device_continuity_contract": CrossDeviceContinuityContract & {
    "continuity_scope"?: "GOVERNANCE_ROUTE";
  };
  "cache_isolation_contract": CacheIsolationContract & {
    "cache_scope_class"?: "TENANT_GOVERNANCE_SNAPSHOT";
  };
  "semantic_accessibility_contract": SemanticAccessibilityContract;
  "settlement_state": TenantGovernanceSnapshotSettlementState;
  "recovery_posture": TenantGovernanceSnapshotRecoveryPosture;
  "interaction_layer": GovernanceInteractionLayer;
  "primary_queue_code": "PENDING_APPROVALS" | "CONFIGURATION_DRIFT" | "AUTHORITY_LINK_RISKS" | "RETENTION_EXCEPTIONS" | "AUDIT_HOTSPOTS";
  "primary_worklist_ref": string;
  "active_filters": TenantGovernanceSnapshotActiveFilters;
  "selected_canvas_object_ref": string | null;
  "focus_anchor_ref": string | null;
  "pending_approval_count": number;
  "risky_configuration_drift_count": number;
  "expiring_authority_link_count": number;
  "retention_exception_count": number;
  "pending_approval_worklist_ref": string;
  "configuration_drift_worklist_ref": string;
  "authority_link_risk_worklist_ref": string;
  "retention_exception_worklist_ref": string;
  "audit_hotspot_worklist_ref": string;
  "pending_change_worklist_ref": string;
  "attention_summary": TenantGovernanceSnapshotAttentionSummary;
  "risk_ledger_entries": Array<TenantGovernanceSnapshotRiskLedgerEntry>;
  "support_region_state": TenantGovernanceSnapshotSupportRegionState;
  "authority_link_risk_refs": Array<string>;
  "retention_exception_refs": Array<string>;
  "audit_hotspot_refs": Array<string>;
  "recent_change_refs": Array<string>;
  "pending_change_refs": Array<string>;
  "updated_at": ISO8601DateTimeString;
};
export const TenantGovernanceSnapshotSchemaLineage = { schemaId: "https://taxat.dev/schemas/tenant_governance_snapshot.schema.json", sourceHash: "c1fab84295a29dae9bcc9cede9c4a32281bdb8665174bb9923d2682711fdba82" } as const;

export type TenantGovernanceSnapshotSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type TenantGovernanceSnapshotRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type TenantGovernanceSnapshotInteractionLayer = {
  "selected_filter_chip_refs": Array<string>;
  "compaction_mode": "WIDE" | "AUXILIARY_DRAWER" | "AUXILIARY_TRAY" | "FOCUS_STACK";
  "auxiliary_surface_presentation": "SIDECAR" | "DRAWER" | "INSPECTOR" | "TRAY";
  "focus_trap_mode": "NON_MODAL" | "MODAL_EXPLICIT";
  "selection_persistence_mode": "PRESERVE_WHILE_OBJECT_RESOLVES";
  "preserved_context_codes": Array<"ACTIVE_FILTERS" | "ACTIVE_SECTION" | "SELECTION" | "FOCUS_ANCHOR" | "PROMOTED_SUPPORT_SURFACE" | "STAGED_DIFF" | "CHANGE_BASKET" | "GUIDED_HANDSHAKE_STEP" | "QUERY_SLICE">;
};

export type TenantGovernanceSnapshotAttentionSummary = {
  "attention_family": "CALM" | "PENDING_APPROVALS" | "CONFIGURATION_DRIFT" | "AUTHORITY_LINK_RISK" | "RETENTION_EXCEPTION" | "AUDIT_HOTSPOT";
  "headline": string;
  "supporting_text": string | null;
  "primary_worklist_ref": string | null;
  "primary_action_label": string | null;
  "why_now_label": string | null;
  "affected_scope_label": string | null;
  "next_legal_action_label": string | null;
  "secondary_issue_count": number;
};

export type TenantGovernanceSnapshotRiskLedgerEntry = {
  "queue_code": "PENDING_APPROVALS" | "CONFIGURATION_DRIFT" | "AUTHORITY_LINK_RISKS" | "RETENTION_EXCEPTIONS" | "AUDIT_HOTSPOTS";
  "headline": string;
  "open_count": number;
  "worklist_ref": string;
  "affected_scope_label": string | null;
  "next_action_label": string | null;
};

export type TenantGovernanceSnapshotActiveFilters = {
  "environment_ref": string;
  "client_refs": Array<string>;
  "principal_classes": Array<"HUMAN" | "SERVICE" | "EXTERNAL">;
  "risk_families": Array<"PENDING_APPROVALS" | "CONFIGURATION_DRIFT" | "AUTHORITY_LINK_RISKS" | "RETENTION_EXCEPTIONS" | "AUDIT_HOTSPOTS">;
  "change_states": Array<string>;
};

export type TenantGovernanceSnapshotSupportRegionState = {
  "mode": "NONE" | "AUDIT" | "BLAST_RADIUS" | "DIFF" | "EXPORT_ELIGIBILITY" | "APPROVAL";
  "selected_object_ref": string | null;
  "reason_code": string | null;
};

export const GovernanceAndPolicyBindingManifest = { familyRef: "GOVERNANCE_AND_POLICY", schemaCount: 17 } as const;
