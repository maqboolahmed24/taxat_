/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type BaselineSelectionContract = {
  "selection_profile_code": "DRIFT_BASELINE_SELECTION_V1";
  "dominance_key_profile_code": "DRIFT_BASELINE_DOMINANCE_KEY_V1";
  "selection_contract_hash": string;
  "active_exact_scope_key": string;
  "target_scope_refs": Array<string>;
  "selected_scope_refs": Array<string>;
  "scope_match_class": "EXACT_SCOPE_MATCH" | "SCOPE_SLICED_SUBSET_MATCH" | "BROADER_CLIENT_PERIOD_MATCH";
  "scope_resolution_state": "EXACT_SCOPE_SELECTED" | "SCOPE_SLICED_SUBSET_SELECTED_NO_EXACT_CANDIDATE" | "BROADER_SCOPE_SELECTED_NO_EXACT_CANDIDATE";
  "scope_rank": number;
  "exact_scope_candidate_present": boolean;
  "selected_baseline_type": "WORKING" | "FILED" | "AMENDED" | "AUTHORITY_CORRECTED" | "OUT_OF_BAND";
  "same_scope_truth_resolution_state": "NO_STRONGER_EXTERNAL_TRUTH_PRESENT" | "AUTHORITY_CORRECTED_TRUTH_SELECTED" | "OUT_OF_BAND_EXTERNAL_TRUTH_BLOCKS_INTERNAL_LINEAGE";
  "precedence_rank": number;
  "authority_resolution_class": "EXACT_AUTHORITY_CONFIRMED" | "AUTHORITY_OBSERVED_EXTERNAL" | "ENGINE_CHAIN_UNREFRESHED" | "WORKING_ONLY";
  "authority_resolution_rank": number;
  "continuity_class": "INTERNAL_CHAIN_CONTINUITY" | "AUTHORITY_CORRECTED_EXTERNAL_CONTINUITY" | "OUT_OF_BAND_EXTERNAL_CONTINUITY" | "WORKING_LOCAL_ONLY";
  "chain_continuity_rank": number;
  "selected_effective_at_or_null": ISO8601DateTimeString;
  "selected_manifest_generation_or_null": number | null;
  "stable_selection_id": string;
  "internal_chain_continuity_asserted": boolean;
  "baseline_anchor_weight": number;
  "uncertainty_reason_codes": Array<string>;
  "automation_ceiling": "ALLOWED" | "LIMITED" | "BLOCKED";
  "review_recommendation_floor": "NONE" | "REVIEW_REQUIRED" | "RECONCILIATION_REQUIRED";
  "amendment_progression_ceiling": "ELIGIBLE_NOW_ALLOWED" | "REVIEW_ONLY" | "RECONCILE_FIRST";
  "benign_drift_eligibility_state": "ALLOWED" | "FORBIDDEN";
};
export const BaselineSelectionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/baseline_selection_contract.schema.json", sourceHash: "1c219c5b517176385f35befd559727c5aa7f38607d2110ef2efa1c3f2410e377" } as const;

export type CalculationBasis = {
  "artifact_type": "CalculationBasis";
  "calculation_basis_id": string;
  "calculation_id": string;
  "calculation_request_ref": string;
  "manifest_id": string;
  "calculation_type": "in-year" | "intent-to-finalise" | "intent-to-amend" | "final-declaration";
  "basis_type": string;
  "basis_status": "PROVISIONAL" | "CONFIRMED" | "REJECTED" | "SUPERSEDED";
  "basis_payload_ref": string;
  "basis_hash": string;
  "parity_reusable": boolean;
  "filing_reusable": boolean;
  "user_confirmation_ref": string | null;
  "reason_codes": Array<string>;
  "captured_at": ISO8601DateTimeString;
  "confirmed_at": ISO8601DateTimeString;
  "superseded_at": ISO8601DateTimeString;
};
export const CalculationBasisSchemaLineage = { schemaId: "https://taxat.dev/schemas/calculation_basis.schema.json", sourceHash: "e17f23654c175b0a6bd0c05a6a581c97b121b53b02c359b1b134f2defeffd7fe" } as const;

export type CalculationUserConfirmation = {
  "artifact_type": "CalculationUserConfirmation";
  "user_confirmation_id": string;
  "calculation_id": string;
  "calculation_basis_ref": string;
  "manifest_id": string;
  "actor_ref": string;
  "actor_role": "PREPARER" | "REVIEWER" | "APPROVER" | "CLIENT_SIGNATORY" | "SUBJECT_SELF" | "SUBJECT_REPRESENTATIVE";
  "confirmation_state": "PENDING" | "CONFIRMED" | "DECLINED";
  "presentation_ref": string;
  "confirmed_basis_hash": string | null;
  "reason_codes": Array<string>;
  "confirmed_at": ISO8601DateTimeString;
  "declined_at": ISO8601DateTimeString;
};
export const CalculationUserConfirmationSchemaLineage = { schemaId: "https://taxat.dev/schemas/calculation_user_confirmation.schema.json", sourceHash: "1b5d67e3a1f9c3a37c41ebfeb4ffc6df274008cece89aaa840055c7c17343837" } as const;

export type ComputeResult = {
  "compute_id": string;
  "manifest_id": string;
  "artifact_type": "ComputeResult";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "lifecycle_state": "NOT_RUN" | "RUNNING" | "COMPUTED" | "BLOCKED" | "SUPERSEDED";
  "rule_version_ref": string;
  "reporting_scope": "year_end" | "quarterly_update" | "estimate_only";
  "effective_partition_scope_refs": Array<string>;
  "basis_profile_ref_or_null": string | null;
  "quarterly_basis_profile_or_null": "PERIODIC" | "CUMULATIVE" | null;
  "adjustment_inclusion_policy": "RECORD_ONLY" | "APPLY_SCOPE_FILTERED_ADJUSTMENTS";
  "adjustment_scope_source": "EXECUTABLE_REPORTING_SCOPE" | "COUNTERFACTUAL_ANALYSIS_SCOPE";
  "money_profile": SchemaBundle;
  "totals": {
    [key: string]: SchemaBundle | {
      [key: string]: SchemaBundle;
    };
  };
  "assumptions": {
    [key: string]: string | number | boolean | Array<string>;
  };
  "diagnostic_reason_codes": Array<string>;
  "diagnostic_artifact_refs": Array<string>;
  "computed_at": ISO8601DateTimeString;
  "contract": SchemaBundle;
};
export const ComputeResultSchemaLineage = { schemaId: "https://taxat.dev/schemas/compute_result.schema.json", sourceHash: "ad76df96a95d97fde3b86c5a65394097c6c62969fed0bfdd7e523a546f4b1e21" } as const;

export type DecisionBundle = {
  "decision_bundle_id": string;
  "manifest_id": string;
  "artifact_type": "DecisionBundle";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "decision_status": "COMPLETED" | "BLOCKED" | "REVIEW_REQUIRED";
  "decision_reason_codes": Array<string>;
  "dominant_reason_code": string;
  "workflow_item_refs": Array<string>;
  "snapshot_id"?: string | null;
  "compute_id"?: string | null;
  "forecast_id"?: string | null;
  "risk_id"?: string | null;
  "parity_id"?: string | null;
  "trust_id"?: string | null;
  "graph_id"?: string | null;
  "twin_id"?: string | null;
  "filing_packet_id"?: string | null;
  "submission_record_id"?: string | null;
  "outcome_class": "FINAL_SUCCESS" | "FINAL_BLOCKED" | "HUMAN_REVIEW" | "APPROVAL_PENDING" | "AUTHORITY_PENDING" | "AUTHORITY_UNKNOWN" | "LATE_DATA_PENDING" | "OUT_OF_BAND_REVIEW";
  "waiting_on": "NONE" | "HUMAN" | "APPROVAL" | "AUTHORITY" | "LATE_DATA";
  "checkpoint_state": "NONE" | "SOURCE_COLLECTION" | "PROJECTION_PENDING" | "HUMAN_REVIEW" | "APPROVAL_PENDING" | "AUTHORITY_PREFLIGHT" | "TRANSMIT_PENDING" | "PENDING_ACK" | "RECONCILIATION_PENDING" | "LATE_DATA_PENDING" | "CONFIRMED" | "REJECTED" | "UNKNOWN" | "OUT_OF_BAND";
  "truth_state": "LOCAL_INTENT_ONLY" | "PERSISTED_INTERNAL" | "AUTHORITY_PENDING" | "AUTHORITY_CONFIRMED" | "AUTHORITY_REJECTED" | "AUTHORITY_UNKNOWN" | "AUTHORITY_OUT_OF_BAND";
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "READ_SIDE_PROJECTION";
    "authoritative_record_families"?: ["RUN_MANIFEST","GATE_DECISION_RECORD","WORKFLOW_ITEM","AUTHORITY_INTERACTION_RECORD","AUDIT_EVENT"];
    "observable_projection_families"?: [];
  };
  "plain_reason": string;
  "decision_explainability_contract": DecisionExplainabilityContract & {
    "artifact_family"?: "DECISION_BUNDLE";
    "plain_text_field_name"?: "plain_reason";
  };
  "reason_codes": Array<string>;
  "next_action_codes": Array<string>;
  "blocked_action_codes": Array<string>;
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code": string | null;
  "no_safe_action_reason_code": string | null;
  "suggested_detail_surface_code": "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL" | null;
  "active_detail_surface_code": "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL" | null;
  "focus_anchor_ref": string | null;
  "next_checkpoint_at": ISO8601DateTimeString;
  "filing_case_id"?: string | null;
  "amendment_case_id"?: string | null;
  "replay_attestation_ref"?: string | null;
  "persisted_at": ISO8601DateTimeString;
  "contract": SchemaBundle;
  "primary_proof_bundle_ref": string | null;
};
export const DecisionBundleSchemaLineage = { schemaId: "https://taxat.dev/schemas/decision_bundle.schema.json", sourceHash: "175c3018abea47d20ef8538949e31da9c3ab101c87550d7241b23d412010392f" } as const;

export type DecisionExplainabilityContract = {
  "contract_version": "DECISION_EXPLAINABILITY_V1";
  "artifact_family": "GATE_DECISION_RECORD" | "TRUST_SUMMARY" | "DECISION_BUNDLE";
  "grammar_profile_code": "LOW_NOISE_DECISION_GRAMMAR_V1";
  "reason_order_policy": "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY";
  "dominant_reason_selection_policy": "FIRST_ORDERED_REASON_IS_DOMINANT";
  "summary_source_policy": "READ_SURFACES_MUST_USE_PERSISTED_FIELDS";
  "compression_policy": "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT";
  "compression_reason_cap": 3;
  "ordered_reason_codes": Array<string>;
  "dominant_reason_code": string;
  "compressed_reason_codes": Array<string>;
  "suppressed_reason_count": number;
  "semantic_qualifiers": Array<"AUTHORITY_STATE" | "LIMITATION_STATE" | "OVERRIDE_STATE" | "ACTIONABILITY_STATE">;
  "action_projection_state": "NONE" | "NEXT_ACTIONS_INCLUDED" | "PRIMARY_ACTION_INCLUDED" | "NO_SAFE_ACTION_DISCLOSED";
  "plain_text_field_name": "plain_explanation" | "plain_summary" | "plain_reason";
  "plain_text_character_limit": 200;
};
export const DecisionExplainabilityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/decision_explainability_contract.schema.json", sourceHash: "0e3a392f771fe04c24f057cf9cbcf6fc5414c2e582bb98de93b4dca3e6b2479d" } as const;

export type ForecastSet = {
  "forecast_id": string;
  "manifest_id": string;
  "artifact_type": "ForecastSet";
  "execution_mode": "ANALYSIS";
  "analysis_only": true;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string;
  "forecast_profile_ref": string;
  "baseline_compute_ref": string;
  "money_profile": SchemaBundle;
  "scenario_mode": "POINT_ONLY" | "MONTE_CARLO";
  "point_forecasts": Array<ForecastSetPointForecast>;
  "scenarios": Array<ForecastSetScenario>;
  "seeds": Array<ForecastSetScenarioSeed>;
  "created_at": ISO8601DateTimeString;
  "contract": SchemaBundle;
};
export const ForecastSetSchemaLineage = { schemaId: "https://taxat.dev/schemas/forecast_set.schema.json", sourceHash: "e3d40985841690f8f7afaee3fe993e0170a4ee23eb0a9bc0ba2edd7a93b7b7dd" } as const;

export type ForecastSetPointForecast = {
  "horizon_code": string;
  "category_code": string;
  "baseline_steps": number;
  "point_value": SchemaBundle;
  "normalized_seasonality": number;
  "annualized_growth_rate": number;
};

export type ForecastSetScenario = {
  "scenario_id": string;
  "seed_ref": string;
  "values": Array<ForecastSetScenarioValue>;
};

export type ForecastSetScenarioValue = {
  "horizon_code": string;
  "category_code": string;
  "simulated_value": SchemaBundle;
};

export type ForecastSetScenarioSeed = {
  "scenario_id": string;
  "seed": string;
};

export type GateAdmissibilityRecord = {
  "admissibility_id": string;
  "suite_result_ref": string;
  "suite_family": "SCHEMA_COMPATIBILITY" | "DETERMINISTIC_AND_STATE_MACHINE" | "NORTHBOUND_API" | "AUTHORITY_SANDBOX" | "OPERATOR_CLIENT" | "SECURITY" | "PERFORMANCE_AND_CANARY" | "RESTORE_DRILL" | "MIGRATION_VERIFICATION" | "SUPPLY_CHAIN" | "SUITE_ADMISSIBILITY";
  "candidate_environment_ref": string;
  "artifact_digest": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "schema_bundle_hash": string;
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "schema_bundle_compatibility_gate_contract": SchemaBundleCompatibilityGateContract;
  "migration_plan_ref": string | null;
  "authority_sandbox_coverage_contract_or_null": AuthoritySandboxCoverageContract | null;
  "supported_client_window_ref": string | null;
  "restore_drill_ref": string | null;
  "restore_checkpoint_ref": string | null;
  "deterministic_golden_pack_ref": string | null;
  "candidate_identity_match": boolean;
  "freshness_verified": boolean;
  "contract_window_consistent": boolean;
  "rerun_scope_preserved": boolean;
  "quarantine_state": "NONE" | "FLAKE_QUARANTINED" | "MUTED" | "MANUAL_WAIVER";
  "admissibility_state": "ADMISSIBLE" | "INADMISSIBLE";
  "evaluated_at": ISO8601DateTimeString;
  "reason_codes": Array<string>;
};
export const GateAdmissibilityRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/gate_admissibility_record.schema.json", sourceHash: "8f4832153cb12678309654a6fc3a8da810ad3e29f2ae026eed1920ee500167ff" } as const;

export type GateDecisionRecord = {
  "effective_scope"?: JsonValue;
} | {
  "effective_scope"?: JsonValue;
} | {
  "effective_scope"?: JsonValue;
};
export const GateDecisionRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/gate_decision_record.schema.json", sourceHash: "b7a32a1995617d4e480527da97335aaec796bfe2f91c3f0c75bd8f86c7fbcf0e" } as const;

export type GateSemanticsContract = {
  "contract_version": "GATE_SEMANTICS_CONTRACT_V1";
  "evaluation_order_profile_code": "NON_ACCESS_GATE_ORDER_V1";
  "reason_order_profile_code": "NON_ACCESS_GATE_REASON_PRIORITY_V1";
  "severity_profile_code": "NON_ACCESS_GATE_SEVERITY_V1";
  "decision_rank": number;
  "progression_rank": number;
  "blocking_class": "NON_BLOCKING" | "REVIEW_REQUIRED" | "BLOCKED";
  "progression_semantics": "AUTOMATED_CONTINUE" | "AUTOMATED_CONTINUE_WITH_NOTICE" | "REVIEW_ONLY" | "BLOCKED";
  "override_dependency_state": "OVERRIDE_INDEPENDENT" | "VALID_OVERRIDE_GOVERNED" | "OVERRIDE_REQUIRED_MISSING" | "OVERRIDE_FORBIDDEN";
};
export const GateSemanticsContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/gate_semantics_contract.schema.json", sourceHash: "1dc4ae82eee7f90560117ce92c9bce34f67f695330e24787680076e9c3d59671" } as const;

export type NightlyBatchRun = {
  "artifact_type": "NightlyBatchRun";
  "batch_run_id": string;
  "tenant_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "run_kind"?: "NIGHTLY";
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "nightly_window_key": string;
  "trigger_class": "SCHEDULED_WINDOW" | "MANUAL_RETRY_WINDOW" | "RECOVERY_RECLAIM_WINDOW";
  "reclaimed_predecessor_batch_run_ref": string | null;
  "lifecycle_state": "ALLOCATED" | "SELECTING" | "PLANNED" | "RUNNING" | "QUIESCING" | "COMPLETED" | "COMPLETED_WITH_FAILURES" | "BLOCKED" | "FAILED" | "ABANDONED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "NIGHTLY_BATCH_RUN";
    "machine_code"?: "NIGHTLY_BATCH_RUN_LIFECYCLE_V1";
    "state_field_name"?: "lifecycle_state";
  };
  "identity_contract": NightlyBatchIdentityContract;
  "scheduler_dedupe_key": string;
  "scheduled_for": ISO8601DateTimeString;
  "trigger_observed_at": ISO8601DateTimeString;
  "initiating_principal_context_ref": string;
  "policy_snapshot_hash": string;
  "autopilot_policy_hash": string;
  "release_verification_manifest_ref": string;
  "schema_bundle_hash": string;
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "code_build_id": string;
  "environment_ref": "DEV" | "TEST" | "UAT" | "SANDBOX" | "PRODUCTION";
  "global_concurrency_profile": NightlyBatchRunGlobalConcurrencyProfile;
  "selection_universe_hash": string;
  "selection_universe_count": number;
  "recovery_resume_state": "NOT_APPLICABLE" | "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED" | "PREDECESSOR_SELECTION_REUSED_RESHARDED";
  "backlog_pressure": number | null;
  "portfolio_tail_risk": number | null;
  "stability_state": "NORMAL" | "SOFT_THROTTLE" | "HARD_THROTTLE" | null;
  "selection_entries": Array<NightlyBatchRunSelectionEntry>;
  "shard_plan": Array<NightlyBatchRunShardPlanEntry>;
  "selected_count": number;
  "execution_count": number;
  "reused_result_count": number;
  "deferred_count": number;
  "escalated_count": number;
  "skipped_count": number;
  "waiting_on_authority_count": number;
  "waiting_on_late_data_count": number;
  "completed_count": number;
  "completed_with_failures_count": number;
  "failed_count": number;
  "selection_started_at": ISO8601DateTimeString;
  "selection_completed_at": ISO8601DateTimeString;
  "started_at": ISO8601DateTimeString;
  "last_heartbeat_at": ISO8601DateTimeString;
  "quiesced_at": ISO8601DateTimeString;
  "completed_at": ISO8601DateTimeString;
  "abandoned_at": ISO8601DateTimeString;
  "successor_batch_run_ref": string | null;
  "operator_digest_publication_state": "NOT_READY" | "WORKFLOW_PUBLICATION_PENDING" | "NOTIFICATION_PUBLICATION_PENDING" | "PUBLISHED_COMPLETE";
  "operator_digest_derivation_contract_or_null": OperatorDigestDerivationContract | null;
  "operator_digest_ref": string | null;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const NightlyBatchRunSchemaLineage = { schemaId: "https://taxat.dev/schemas/nightly_batch_run.schema.json", sourceHash: "c0797420d911474626316c8a02011f63d9336cf14be63ee298868e1d822d18cc" } as const;

export type NightlyBatchRunGlobalConcurrencyProfile = {
  "global_manifest_limit": number;
  "per_shard_manifest_limit": number;
  "authority_transmit_limit": number;
  "per_client_serialization": boolean;
  "heartbeat_interval_seconds": number;
  "stale_heartbeat_after_seconds": number;
  "soft_stability_rho": number;
  "hard_stability_rho": number;
  "retry_capacity_fraction": number;
  "base_deficit_quantum_minutes": number;
};

export type NightlyBatchRunSelectionEntry = {
  "entry_id": string;
  "candidate_identity_hash": string;
  "selection_basis_hash": string;
  "client_id": string;
  "period": string;
  "requested_scope": Array<"year_end" | "quarterly_update" | "estimate_only" | "prepare_submission" | "submit" | "amendment_intent" | "amendment_submit">;
  "selection_disposition": "EXECUTE_NEW_MANIFEST" | "EXECUTE_CONTINUATION_CHILD" | "REUSE_EXISTING_TERMINAL_RESULT" | "DEFER_ACTIVE_ATTEMPT" | "DEFER_RETRY_WINDOW" | "ESCALATE_ONLY" | "SKIP_INELIGIBLE";
  "terminal_result_reuse_state": "REUSED_TERMINAL_RESULT" | "NO_REUSABLE_TERMINAL_RESULT" | "TERMINAL_RESULT_CHECKPOINT_DUE" | "TERMINAL_RESULT_POLICY_CHANGED" | "TERMINAL_RESULT_OPERATOR_ACTION_STALE";
  "active_attempt_resolution_state": "NO_ACTIVE_ATTEMPT" | "ACTIVE_ATTEMPT_DEFERRED" | "STALE_ATTEMPT_RECLAIM_REQUIRED";
  "priority_tuple": NightlyBatchRunPriorityTuple;
  "reason_codes": Array<string>;
  "manifest_ref": string | null;
  "prior_manifest_ref": string | null;
  "predecessor_selection_entry_ref_or_null": string | null;
  "workflow_item_refs": Array<string>;
  "next_checkpoint_at": ISO8601DateTimeString;
  "fairness_group_key"?: string | null;
  "shard_key": string | null;
  "outcome_bucket": "AUTO_COMPLETED" | "WAITING_ON_AUTHORITY" | "WAITING_ON_LATE_DATA" | "REVIEW_REQUIRED" | "REQUEST_CLIENT_INFO" | "BLOCKED_INTERNAL" | "FAILED_RETRYABLE" | "FAILED_NON_RETRYABLE" | "REUSED_RESULT" | "DEFERRED" | "SKIPPED" | null;
  "executed_at": ISO8601DateTimeString;
};

export type NightlyBatchRunPriorityTuple = {
  "deadline_bucket": number;
  "filing_state_bucket": number;
  "authority_checkpoint_bucket": number;
  "risk_bucket": number;
  "automation_readiness_bucket": number;
  "retry_ready_bucket": number;
  "priority_score"?: number;
  "expected_service_minutes"?: number;
  "deadline_pressure"?: number;
  "checkpoint_pressure"?: number;
  "risk_pressure"?: number;
  "fairness_credit"?: number;
  "retry_success_probability"?: number;
  "retry_expected_gain"?: number;
  "stable_tie_break_key": string;
};

export type NightlyBatchRunShardPlanEntry = {
  "shard_key": string;
  "entry_refs": Array<string>;
  "shard_state": "PLANNED" | "RUNNING" | "QUIESCING" | "COMPLETED" | "FAILED_ISOLATED" | "TENANT_WIDE_BLOCKED" | "RECLAIM_REQUIRED";
  "blocked_entry_refs": Array<string>;
  "failure_reason_codes": Array<string>;
  "max_concurrent_manifests": number;
  "last_heartbeat_at": ISO8601DateTimeString;
  "current_owner_ref": string | null;
};

export type NightlyPortfolioSimulationBasisContract = {
  "contract_version": "NIGHTLY_PORTFOLIO_SIMULATION_BASIS_V1";
  "basis_contract_hash": string;
  "execution_mode_boundary_hash": string;
  "tenant_id": string;
  "nightly_window_key": string;
  "source_batch_run_refs": Array<string>;
  "source_batch_set_hash": string;
  "source_batch_count": number;
  "source_batch_window_state": "SINGLE_NIGHTLY_WINDOW";
  "source_batch_recovery_state": "SINGLE_BATCH" | "SUCCESSOR_RECOVERY_CHAIN";
  "covered_selection_entry_refs": Array<string>;
  "covered_selection_entry_count": number;
  "baseline_selection_universe_hash": string;
  "baseline_policy_snapshot_hash": string;
  "baseline_autopilot_policy_hash": string;
  "baseline_release_verification_manifest_ref": string;
  "baseline_schema_bundle_hash": string;
  "baseline_code_build_id": string;
  "baseline_environment_ref": "DEV" | "TEST" | "UAT" | "SANDBOX" | "PRODUCTION";
  "baseline_global_concurrency_profile": NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile;
  "counterfactual_policy_snapshot_hash_or_null": string | null;
  "counterfactual_autopilot_policy_hash_or_null": string | null;
  "counterfactual_release_verification_manifest_ref_or_null": string | null;
  "counterfactual_release_candidate_identity_contract_or_null": ReleaseCandidateIdentityContract | null;
  "counterfactual_global_concurrency_profile_or_null": NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile | null;
  "counterfactual_reason_codes": Array<string>;
  "candidate_counterfactuals": Array<NightlyPortfolioSimulationBasisContractCandidateCounterfactual>;
  "truth_source_policy": "PERSISTED_NIGHTLY_BATCH_SELECTION_DIGEST_AND_RELEASE_TRUTH_ONLY";
  "selection_projection_policy": "REPLAY_SELECTION_ENTRIES_WITHOUT_LIVE_REQUERY";
  "digest_projection_policy": "REPLAY_BASELINE_DIGEST_PARTITION_AND_APPLY_EXPLICIT_DIFFS_ONLY";
  "non_execution_boundary_policy": "STEP_UP_APPROVAL_RELEASE_AND_AUTHORITY_AMBIGUITY_REMAIN_BLOCKING";
  "release_identity_policy": "COUNTERFACTUAL_RELEASE_REQUIRES_EXACT_CANDIDATE_AND_SCHEMA_BINDING";
  "successor_recovery_policy": "SOURCE_BATCH_SET_MAY_INCLUDE_SUCCESSOR_CHAIN_FOR_ONE_WINDOW_ONLY";
  "diff_explainability_policy": "EVERY_BUCKET_ORDER_AND_HIGHLIGHT_CHANGE_REQUIRES_REASON_CODE_DIFFS";
};
export const NightlyPortfolioSimulationBasisContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/nightly_portfolio_simulation_basis_contract.schema.json", sourceHash: "efb21415923f226f89e6471da2bb55a7532220f715dfb9d9c0f9941c50906c81" } as const;

export type NightlyPortfolioSimulationBasisContractGlobalConcurrencyProfile = {
  "global_manifest_limit": number;
  "per_shard_manifest_limit": number;
  "authority_transmit_limit": number;
  "per_client_serialization": boolean;
  "heartbeat_interval_seconds": number;
  "stale_heartbeat_after_seconds": number;
  "soft_stability_rho": number;
  "hard_stability_rho": number;
  "retry_capacity_fraction": number;
  "base_deficit_quantum_minutes": number;
};

export type NightlyPortfolioSimulationBasisContractCandidateCounterfactual = {
  "selection_entry_ref": string;
  "candidate_identity_hash": string;
  "counterfactual_policy_outcome": "BASELINE" | "ALLOW" | "REVIEW_REQUIRED" | "DENY";
  "counterfactual_authority_outcome": "BASELINE" | "CLEAR" | "WAITING" | "AMBIGUOUS";
  "counterfactual_retry_outcome": "BASELINE" | "READY" | "DEFER";
  "counterfactual_release_outcome": "BASELINE" | "ADMISSIBLE" | "INADMISSIBLE";
  "reason_codes": Array<string>;
};

export type NightlyPortfolioWhatIfSimulation = {
  "artifact_type": "NightlyPortfolioWhatIfSimulation";
  "simulation_id": string;
  "tenant_id": string;
  "nightly_window_key": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "run_kind"?: "NIGHTLY";
    "execution_mode"?: "ANALYSIS";
    "analysis_only"?: true;
    "execution_posture"?: "LIVE_ANALYSIS";
    "legal_effect_boundary"?: "MODELED_READ_ONLY";
  };
  "basis_contract": NightlyPortfolioSimulationBasisContract;
  "baseline_digest_ref_or_null": string | null;
  "baseline_summary_counts": NightlyPortfolioWhatIfSimulationSummaryCounts;
  "simulated_summary_counts": NightlyPortfolioWhatIfSimulationSummaryCounts;
  "baseline_backlog_pressure": number | null;
  "simulated_backlog_pressure": number | null;
  "baseline_portfolio_tail_risk": number | null;
  "simulated_portfolio_tail_risk": number | null;
  "baseline_stability_state": "NORMAL" | "SOFT_THROTTLE" | "HARD_THROTTLE" | null;
  "simulated_stability_state": "NORMAL" | "SOFT_THROTTLE" | "HARD_THROTTLE" | null;
  "baseline_highlighted_selection_entry_refs": Array<string>;
  "simulated_highlighted_selection_entry_refs": Array<string>;
  "entry_diffs": Array<NightlyPortfolioWhatIfSimulationEntryDiff>;
  "highlight_diffs": Array<NightlyPortfolioWhatIfSimulationHighlightDiff>;
  "simulated_by_principal_ref": string;
  "simulated_at": ISO8601DateTimeString;
};
export const NightlyPortfolioWhatIfSimulationSchemaLineage = { schemaId: "https://taxat.dev/schemas/nightly_portfolio_what_if_simulation.schema.json", sourceHash: "c601ad2b4e0b46a6276dc14f859569e03707c7bfc92d1ca0da31d460dfab2870" } as const;

export type NightlyPortfolioWhatIfSimulationSummaryCounts = {
  "auto_completed": number;
  "waiting_on_authority": number;
  "waiting_on_late_data": number;
  "review_required": number;
  "request_client_info": number;
  "blocked_internal": number;
  "failed_retryable": number;
  "failed_non_retryable": number;
  "reused_result": number;
  "deferred": number;
  "skipped": number;
};

export type NightlyPortfolioWhatIfSimulationEntryDiff = {
  "selection_entry_ref": string;
  "candidate_identity_hash": string;
  "baseline_selection_basis_hash": string;
  "baseline_selection_disposition": NightlyPortfolioWhatIfSimulationSelectionDisposition;
  "simulated_selection_disposition": NightlyPortfolioWhatIfSimulationSelectionDisposition;
  "baseline_outcome_bucket": NightlyPortfolioWhatIfSimulationOutcomeBucket;
  "simulated_outcome_bucket": NightlyPortfolioWhatIfSimulationOutcomeBucket;
  "baseline_execution_rank_or_null": number | null;
  "simulated_execution_rank_or_null": number | null;
  "baseline_highlight_rank_or_null": number | null;
  "simulated_highlight_rank_or_null": number | null;
  "baseline_priority_score_or_null": number | null;
  "simulated_priority_score_or_null": number | null;
  "baseline_reason_codes": Array<string>;
  "simulated_reason_codes": Array<string>;
  "movement_reason_codes": Array<string>;
};

export type NightlyPortfolioWhatIfSimulationHighlightDiff = {
  "selection_entry_ref": string;
  "diff_state": "UNCHANGED" | "ADDED" | "REMOVED" | "RANK_RAISED" | "RANK_LOWERED" | "SCORE_CHANGED";
  "baseline_highlight_rank_or_null": number | null;
  "simulated_highlight_rank_or_null": number | null;
  "baseline_entry_loss_score_or_null": number | null;
  "simulated_entry_loss_score_or_null": number | null;
  "reason_codes": Array<string>;
};

export type NightlyPortfolioWhatIfSimulationSelectionDisposition = "EXECUTE_NEW_MANIFEST" | "EXECUTE_CONTINUATION_CHILD" | "REUSE_EXISTING_TERMINAL_RESULT" | "DEFER_ACTIVE_ATTEMPT" | "DEFER_RETRY_WINDOW" | "ESCALATE_ONLY" | "SKIP_INELIGIBLE";

export type NightlyPortfolioWhatIfSimulationOutcomeBucket = "AUTO_COMPLETED" | "WAITING_ON_AUTHORITY" | "WAITING_ON_LATE_DATA" | "REVIEW_REQUIRED" | "REQUEST_CLIENT_INFO" | "BLOCKED_INTERNAL" | "FAILED_RETRYABLE" | "FAILED_NON_RETRYABLE" | "REUSED_RESULT" | "DEFERRED" | "SKIPPED";

export type OperatorDigestDerivationContract = {
  "contract_version": "OPERATOR_DIGEST_DERIVATION_V1";
  "derivation_contract_hash": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "run_kind"?: "NIGHTLY";
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "coverage_date": string;
  "nightly_window_key": string;
  "source_batch_set_hash": string;
  "source_batch_count": number;
  "source_batch_window_state": "SINGLE_NIGHTLY_WINDOW";
  "truth_source_policy": "PERSISTED_BATCH_MANIFEST_DECISION_WORKFLOW_NOTIFICATION_AND_ERROR_TRUTH_ONLY";
  "unresolved_handoff_policy": "EVERY_UNRESOLVED_OUTCOME_REQUIRES_PUBLISHED_WORKFLOW_HANDOFF";
  "queue_summary_policy": "QUEUE_SUMMARIES_PARTITION_PUBLISHED_WORKFLOW_ITEMS";
  "highlight_ranking_profile": "ENTRY_LOSS_THEN_PRIORITY_TUPLE_V1";
  "highlight_source_policy": "HIGHLIGHTS_SUBSET_OF_PUBLISHED_WORKFLOW_AND_PERSISTED_OUTCOME_TRUTH";
  "publication_qa_profile": "DIGEST_PUBLICATION_HANDOFF_QA_V1";
  "publication_qa_state": "PASSED";
  "publication_qa_completed_at": ISO8601DateTimeString;
  "covered_selection_entry_ref_set_hash": string;
  "outcome_entry_partition_hash": string;
  "queue_partition_hash": string;
  "highlight_order_hash": string;
  "published_workflow_item_ref_set_hash": string;
  "published_notification_ref_set_hash": string;
  "waiting_on_authority_ref_set_hash": string;
  "late_data_hold_ref_set_hash": string;
  "workflow_publication_state": "COMPLETE_WITH_NO_UNRESOLVED_ITEMS" | "COMPLETE_WITH_PUBLISHED_WORKFLOW_ITEMS";
  "workflow_publication_settled_at": ISO8601DateTimeString;
  "published_workflow_outcome_counts": OperatorDigestDerivationContractSummaryCounts;
  "published_workflow_item_count": number;
  "notification_publication_state": "COMPLETE_WITH_EXPLICIT_NONE" | "COMPLETE_WITH_PUBLISHED_NOTIFICATION_REFS";
  "notification_publication_settled_at": ISO8601DateTimeString;
  "published_notification_ref_count": number;
  "persisted_outcome_counts": OperatorDigestDerivationContractSummaryCounts;
  "covered_selection_entry_count": number;
  "backlog_pressure_basis_hash": string;
  "portfolio_tail_risk_basis_hash": string;
  "stability_basis_hash": string;
  "publication_generation": number;
  "supersession_state": "INITIAL_PUBLICATION" | "RECOVERY_SUPERSESSION";
  "supersession_root_digest_id": string;
  "supersedes_digest_id_or_null": string | null;
  "supersession_reason_codes": Array<string>;
  "supersession_policy": "MONOTONIC_COVERAGE_DATE_PUBLICATION_WITH_EXPLICIT_SUPERSESSION";
};
export const OperatorDigestDerivationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/operator_digest_derivation_contract.schema.json", sourceHash: "99ef020118ac754fbd2f7ff93cfa2fce256017ea05e161d905e49ddf7120622b" } as const;

export type OperatorDigestDerivationContractSummaryCounts = {
  "auto_completed": number;
  "waiting_on_authority": number;
  "waiting_on_late_data": number;
  "review_required": number;
  "request_client_info": number;
  "blocked_internal": number;
  "failed_retryable": number;
  "failed_non_retryable": number;
  "reused_result": number;
  "deferred": number;
  "skipped": number;
};

export type OperatorMorningDigest = {
  "artifact_type": "OperatorMorningDigest";
  "digest_id": string;
  "tenant_id": string;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "run_kind"?: "NIGHTLY";
    "execution_posture"?: "LIVE_COMPLIANCE";
    "legal_effect_boundary"?: "COMPLIANCE_CAPABLE";
  };
  "coverage_date": string;
  "source_batch_run_refs": Array<string>;
  "derivation_contract": OperatorDigestDerivationContract;
  "covered_selection_entry_refs": Array<string>;
  "summary_counts": OperatorMorningDigestSummaryCounts;
  "outcome_entry_refs": OperatorMorningDigestOutcomeEntryRefs;
  "queue_summaries": Array<OperatorMorningDigestQueueSummary>;
  "highlighted_client_outcomes": Array<OperatorMorningDigestHighlightedClientOutcome>;
  "waiting_on_authority_refs": Array<string>;
  "late_data_hold_refs": Array<string>;
  "backlog_pressure": number | null;
  "portfolio_tail_risk": number | null;
  "stability_state": "NORMAL" | "SOFT_THROTTLE" | "HARD_THROTTLE" | null;
  "published_workflow_item_refs": Array<string>;
  "published_notification_refs": Array<string>;
  "generated_by_principal_ref": string;
  "generated_at": ISO8601DateTimeString;
  "published_at": ISO8601DateTimeString;
  "supersedes_digest_id": string | null;
};
export const OperatorMorningDigestSchemaLineage = { schemaId: "https://taxat.dev/schemas/operator_morning_digest.schema.json", sourceHash: "34c24e3559dbfc2eaf90d636f1f17995103c9e5506bd4c41c7ab4212fc321363" } as const;

export type OperatorMorningDigestSummaryCounts = {
  "auto_completed": number;
  "waiting_on_authority": number;
  "waiting_on_late_data": number;
  "review_required": number;
  "request_client_info": number;
  "blocked_internal": number;
  "failed_retryable": number;
  "failed_non_retryable": number;
  "reused_result": number;
  "deferred": number;
  "skipped": number;
};

export type OperatorMorningDigestSelectionEntryRefList = Array<string>;

export type OperatorMorningDigestOutcomeEntryRefs = {
  "auto_completed": OperatorMorningDigestSelectionEntryRefList;
  "waiting_on_authority": OperatorMorningDigestSelectionEntryRefList;
  "waiting_on_late_data": OperatorMorningDigestSelectionEntryRefList;
  "review_required": OperatorMorningDigestSelectionEntryRefList;
  "request_client_info": OperatorMorningDigestSelectionEntryRefList;
  "blocked_internal": OperatorMorningDigestSelectionEntryRefList;
  "failed_retryable": OperatorMorningDigestSelectionEntryRefList;
  "failed_non_retryable": OperatorMorningDigestSelectionEntryRefList;
  "reused_result": OperatorMorningDigestSelectionEntryRefList;
  "deferred": OperatorMorningDigestSelectionEntryRefList;
  "skipped": OperatorMorningDigestSelectionEntryRefList;
};

export type OperatorMorningDigestPrioritySummary = {
  "deadline_bucket": number;
  "risk_bucket": number;
  "stable_tie_break_key": string;
};

export type OperatorMorningDigestQueueSummary = {
  "queue_ref": string;
  "source_basis": "PUBLISHED_WORKFLOW_ITEMS";
  "item_refs": Array<string>;
  "dominant_reason_codes": Array<string>;
  "item_count": number;
  "highest_priority": OperatorMorningDigestPrioritySummary;
};

export type OperatorMorningDigestHighlightedClientOutcome = {
  "selection_entry_ref": string;
  "client_id": string;
  "period": string;
  "dominant_outcome": "AUTO_COMPLETED" | "WAITING_ON_AUTHORITY" | "WAITING_ON_LATE_DATA" | "REVIEW_REQUIRED" | "REQUEST_CLIENT_INFO" | "BLOCKED_INTERNAL" | "FAILED_RETRYABLE" | "FAILED_NON_RETRYABLE" | "REUSED_RESULT" | "DEFERRED" | "SKIPPED";
  "highlight_rank": number;
  "entry_loss_score": number;
  "manifest_ref": string | null;
  "work_item_ref": string | null;
  "reason_codes": Array<string>;
  "next_checkpoint_at": ISO8601DateTimeString;
};

export type ParityResult = {
  "parity_id": string;
  "manifest_id": string;
  "artifact_type": "ParityResult";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "lifecycle_state": "NOT_EVALUATED" | "EVALUATED" | "SUPERSEDED";
  "comparison_basis_ref": string | null;
  "comparison_requirement": "MANDATORY" | "DESIRABLE" | "NOT_REQUIRED";
  "parity_threshold_profile_ref": string | null;
  "comparison_set_state": "VALID" | "INVALID" | null;
  "ordered_field_codes": Array<string>;
  "money_profile": SchemaBundle;
  "parity_classification": "MATCH" | "MINOR_DIFFERENCE" | "MATERIAL_DIFFERENCE" | "BLOCKING_DIFFERENCE" | "NOT_COMPARABLE" | null;
  "parity_score": number | null;
  "comparison_coverage": number | null;
  "weighted_parity_pressure": number | null;
  "critical_blocking_field_count": number;
  "critical_material_field_count": number;
  "dominant_reason_code": string | null;
  "reason_codes": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "deltas": {
    [key: string]: ParityResultFieldDelta;
  };
  "cause_hypotheses": Array<string>;
  "evaluated_at": ISO8601DateTimeString;
  "contract": SchemaBundle;
};
export const ParityResultSchemaLineage = { schemaId: "https://taxat.dev/schemas/parity_result.schema.json", sourceHash: "6b8c5145216d3ab2f64d3dd5d61f2775c1c5f4cecb97c6c680dabb8f16057c14" } as const;

export type ParityResultFieldDelta = {
  "field_code": string;
  "criticality_class": "CRITICAL" | "HIGH" | "NORMAL";
  "criticality_weight": number;
  "abs_threshold": SchemaBundle;
  "rel_threshold": number;
  "abs_floor": SchemaBundle;
  "effective_abs_floor": SchemaBundle;
  "comparison_input_state": "COMPARABLE" | "AUTHORITY_MISSING" | "INVALID_INPUT";
  "field_class": "MATCH" | "MINOR_DIFFERENCE" | "MATERIAL_DIFFERENCE" | "BLOCKING_DIFFERENCE" | "NOT_COMPARABLE";
  "internal_value": SchemaBundle | null;
  "authority_value": SchemaBundle | null;
  "delta_signed": SchemaBundle | null;
  "delta_abs": SchemaBundle | null;
  "delta_rel": number | null;
  "breach_ratio": number | null;
  "reason_codes": Array<string>;
};

export type RiskReport = {
  "risk_id": string;
  "manifest_id": string;
  "artifact_type": "RiskReport";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "risk_threshold_profile_ref": string;
  "risk_score": number;
  "feature_scores": Array<RiskReportFeatureScore>;
  "flags": Array<string>;
  "unresolved_material_blocking_risk_flag": boolean;
  "unresolved_blocking_risk_flag": boolean;
  "created_at": ISO8601DateTimeString;
  "contract": SchemaBundle;
};
export const RiskReportSchemaLineage = { schemaId: "https://taxat.dev/schemas/risk_report.schema.json", sourceHash: "98e8db8465dd015ebed3bf89ce059c7db07b210a177df960f3a19c2eabb90440" } as const;

export type RiskReportFeatureScore = {
  "feature_code": string;
  "feature_value": number;
  "feature_weight": number;
  "material_threshold": number;
  "blocking_threshold": number;
  "feature_resolved": boolean;
  "flag_state": "NONE" | "MATERIAL_UNRESOLVED" | "BLOCKING_UNRESOLVED";
};

export type TrustInputBasisContract = {
  "contract_version": "TRUST_INPUT_BASIS_V1";
  "basis_contract_hash": string;
  "input_presence_state": "COMPLETE" | "INCOMPLETE";
  "manifest_binding_state": "ACTIVE_MANIFEST_OR_ADMITTED_LINEAGE" | "MANIFEST_MISMATCH";
  "lifecycle_binding_state": "CURRENT_UNSUPERSEDED" | "SUPERSEDED_OR_REPLACED";
  "consistency_state": "CONSISTENT" | "CONTRADICTED";
  "limitation_semantics_state": "EXPLICIT_LIMITATIONS_ONLY" | "SILENT_LIMITATION_AMBIGUITY";
  "freshness_state": "CURRENT" | "STALE_OR_INVALIDATED" | "NO_EXPIRING_DEPENDENCIES";
  "freshness_dependency_classes": Array<"AUTHORITY_STATE" | "LATE_DATA_MONITOR" | "OVERRIDE_LIFECYCLE" | "EXTERNAL_BASELINE">;
  "authority_progression_state": "NOT_REQUESTED_OR_NOT_APPLICABLE" | "CLEAR" | "REVIEW_LIMITED" | "BLOCKED";
  "baseline_progression_state": "MATCHED_OR_FILED" | "UNKNOWN_OR_OUT_OF_BAND" | "NOT_APPLICABLE";
  "baseline_selection_contract_hash_or_null": string | null;
  "baseline_automation_ceiling": "ALLOWED" | "LIMITED" | "BLOCKED";
  "baseline_limitation_reason_codes": Array<string>;
  "late_data_invalidation_state": "NONE" | "INVALIDATING_FINDING_PRESENT";
  "override_dependency_state": "NO_ACTIVE_OR_VALID_OVERRIDES" | "INVALID_OVERRIDE_RELIED_UPON";
  "human_step_state": "CLEARED" | "UNRESOLVED_PRETRUST_STEPS";
  "trust_input_state": "ADMISSIBLE_CURRENT" | "ADMISSIBLE_STALE" | "INCOMPLETE" | "CONTRADICTED";
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "automation_ceiling": "ALLOWED" | "LIMITED" | "BLOCKED";
  "filing_readiness_ceiling": "READY_TO_SUBMIT" | "READY_REVIEW" | "NOT_READY";
  "input_reason_codes": Array<string>;
  "blocking_dependency_refs": Array<string>;
  "trust_fresh_until": ISO8601DateTimeString;
};
export const TrustInputBasisContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/trust_input_basis_contract.schema.json", sourceHash: "e37d8e0ed7fc7df509cecc72f45f449842205647235bc16bcaeacb13033f3409" } as const;

export type TrustSensitivityAnalysisContract = TrustSensitivityContract;
export const TrustSensitivityAnalysisContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/trust_sensitivity_analysis_contract.schema.json", sourceHash: "013af2f88e375b8b3c252b49339dcd690cb09a0e70955fea8a315790ac64ed66" } as const;

export type TrustSensitivityContract = {
  "contract_version": "TRUST_SENSITIVITY_V1";
  "sensitivity_contract_hash": string;
  "trust_input_basis_contract_hash": string;
  "execution_mode_boundary_hash": string;
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "execution_legal_effect_boundary": "COMPLIANCE_CAPABLE" | "MODELED_READ_ONLY" | "HISTORICAL_REPLAY_READ_ONLY" | "COUNTERFACTUAL_REPLAY_READ_ONLY";
  "trust_score": number;
  "risk_score": number;
  "completeness_score": number;
  "graph_quality_score": number;
  "authority_uncertainty_score": number;
  "authority_penalty": number;
  "baseline_submission_state": "KNOWN_MATCHED" | "KNOWN_FILED" | "UNKNOWN" | "OUT_OF_BAND_UNRECONCILED" | "NOT_APPLICABLE";
  "live_authority_progression_requested": boolean;
  "active_filing_critical_override_count": number;
  "critical_retention_limited_count": number;
  "required_human_step_count": number;
  "late_data_invalidation_state": "NONE" | "INVALIDATING_FINDING_PRESENT";
  "override_dependency_state": "NO_ACTIVE_OR_VALID_OVERRIDES" | "INVALID_OVERRIDE_RELIED_UPON";
  "score_band": "RED" | "AMBER" | "GREEN";
  "cap_band": "INSUFFICIENT_DATA" | "RED" | "AMBER" | "GREEN";
  "trust_band": "INSUFFICIENT_DATA" | "RED" | "AMBER" | "GREEN";
  "trust_input_state": "ADMISSIBLE_CURRENT" | "ADMISSIBLE_STALE" | "INCOMPLETE" | "CONTRADICTED";
  "threshold_stability_state": "STABLE" | "EDGE_REVIEW";
  "upstream_gate_cap": "AUTO_ELIGIBLE" | "NOTICE_ONLY" | "REVIEW_ONLY" | "BLOCKED";
  "automation_level": "ALLOWED" | "LIMITED" | "BLOCKED";
  "filing_readiness": "READY_TO_SUBMIT" | "READY_REVIEW" | "NOT_READY";
  "trust_green_margin": number;
  "trust_amber_margin": number;
  "risk_automation_margin": number;
  "completeness_margin": number;
  "graph_filing_margin_or_null": number | null;
  "authority_review_margin_or_null": number | null;
  "authority_block_margin_or_null": number | null;
  "score_cap_alignment_state": "ALIGNED" | "SCORE_STRICTER_THAN_CAP" | "CAP_STRICTER_THAN_SCORE";
  "cap_driver_reason_codes": Array<"TRUST_INPUT_INCOMPLETE" | "TRUST_INPUT_CONTRADICTION" | "TRUST_INPUT_STALE" | "TRUST_OVERRIDE_INVALID" | "TRUST_THRESHOLD_EDGE_REVIEW" | "TRUST_UPSTREAM_GATE_BLOCK" | "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED" | "TRUST_REQUIRED_HUMAN_STEPS" | "TRUST_OVERRIDE_PENALTY" | "TRUST_RETENTION_PENALTY" | "TRUST_AUTHORITY_STATE_UNRESOLVED" | "TRUST_AUTHORITY_PENALTY" | "TRUST_ANALYSIS_MODE_CAP" | "TRUST_NON_LIVE_EXECUTION_BOUNDARY_CAP" | "TRUST_RECALCULATION_REQUIRED">;
  "edge_trigger_codes": Array<"TRUST_GREEN_GUARD_BAND" | "TRUST_AMBER_GUARD_BAND" | "RISK_AUTOMATION_GUARD_BAND" | "COMPLETENESS_GUARD_BAND" | "GRAPH_FILING_GUARD_BAND" | "AUTHORITY_REVIEW_GUARD_BAND" | "AUTHORITY_BLOCK_GUARD_BAND">;
  "projected_case_results": Array<{
      "case_code": "TRUST_SCORE_MINUS_ONE" | "TRUST_SCORE_PLUS_ONE" | "RISK_SCORE_PLUS_ONE" | "AUTHORITY_UNCERTAINTY_PLUS_ONE" | "FRESHNESS_INVALIDATED" | "INVALID_OVERRIDE_RELIED_UPON";
      "monotonicity_expectation": "NON_IMPROVING" | "NON_DEGRADING";
      "projected_trust_score": number;
      "projected_score_band": "RED" | "AMBER" | "GREEN";
      "projected_cap_band": "INSUFFICIENT_DATA" | "RED" | "AMBER" | "GREEN";
      "projected_trust_band": "INSUFFICIENT_DATA" | "RED" | "AMBER" | "GREEN";
      "projected_trust_input_state": "ADMISSIBLE_CURRENT" | "ADMISSIBLE_STALE" | "INCOMPLETE" | "CONTRADICTED";
      "projected_threshold_stability_state": "STABLE" | "EDGE_REVIEW";
      "projected_automation_level": "ALLOWED" | "LIMITED" | "BLOCKED";
      "projected_filing_readiness": "READY_TO_SUBMIT" | "READY_REVIEW" | "NOT_READY";
      "projected_trust_green_margin": number;
      "projected_trust_amber_margin": number;
      "projected_risk_automation_margin": number;
      "projected_completeness_margin": number;
      "projected_graph_filing_margin_or_null": number | null;
      "projected_authority_review_margin_or_null": number | null;
      "projected_authority_block_margin_or_null": number | null;
      "projected_edge_trigger_codes": Array<"TRUST_GREEN_GUARD_BAND" | "TRUST_AMBER_GUARD_BAND" | "RISK_AUTOMATION_GUARD_BAND" | "COMPLETENESS_GUARD_BAND" | "GRAPH_FILING_GUARD_BAND" | "AUTHORITY_REVIEW_GUARD_BAND" | "AUTHORITY_BLOCK_GUARD_BAND">;
      "projected_reason_code_additions": Array<string>;
      "projected_reason_code_removals": Array<string>;
    }>;
};
export const TrustSensitivityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/trust_sensitivity_contract.schema.json", sourceHash: "529519a523af2e5fab5bb1420aa28727a2627f1776af5c9ea6427835e626dd25" } as const;

export type TrustSummary = {
  "trust_id": string;
  "manifest_id": string;
  "artifact_type": "TrustSummary";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract;
  "lifecycle_state": "SYNTHESIZED" | "SUPERSEDED";
  "compute_result_ref": string;
  "parity_result_ref": string;
  "risk_report_ref": string;
  "evidence_graph_ref": string;
  "gate_decision_refs": Array<string>;
  "comparison_requirement": "MANDATORY" | "DESIRABLE" | "NOT_REQUIRED";
  "parity_classification": "MATCH" | "MINOR_DIFFERENCE" | "MATERIAL_DIFFERENCE" | "BLOCKING_DIFFERENCE" | "NOT_COMPARABLE";
  "baseline_submission_state": "KNOWN_MATCHED" | "KNOWN_FILED" | "UNKNOWN" | "OUT_OF_BAND_UNRECONCILED" | "NOT_APPLICABLE";
  "live_authority_progression_requested": boolean;
  "completeness_score": number;
  "data_quality_score": number;
  "parity_score": number;
  "graph_quality_score": number;
  "risk_score": number;
  "trust_core_score": number;
  "score_band": "RED" | "AMBER" | "GREEN";
  "cap_band": "INSUFFICIENT_DATA" | "RED" | "AMBER" | "GREEN";
  "trust_band": "INSUFFICIENT_DATA" | "RED" | "AMBER" | "GREEN";
  "trust_score": number;
  "trust_input_state": "ADMISSIBLE_CURRENT" | "ADMISSIBLE_STALE" | "INCOMPLETE" | "CONTRADICTED";
  "trust_input_basis_contract": TrustInputBasisContract;
  "trust_sensitivity_analysis_contract": TrustSensitivityAnalysisContract;
  "threshold_stability_state": "STABLE" | "EDGE_REVIEW";
  "upstream_gate_cap": "AUTO_ELIGIBLE" | "NOTICE_ONLY" | "REVIEW_ONLY" | "BLOCKED";
  "trust_green_margin": number;
  "trust_amber_margin": number;
  "risk_automation_margin": number;
  "active_filing_critical_override_count": number;
  "critical_retention_limited_count": number;
  "unresolved_material_blocking_risk_flag": boolean;
  "unresolved_blocking_risk_flag": boolean;
  "override_penalty": 0 | 5 | 10 | 15 | 20;
  "retention_penalty": 0 | 20;
  "authority_uncertainty_score": number;
  "authority_penalty": number;
  "trust_level": "READY" | "REVIEW_REQUIRED" | "BLOCKED";
  "automation_level": "ALLOWED" | "LIMITED" | "BLOCKED";
  "filing_readiness": "NOT_READY" | "READY_REVIEW" | "READY_TO_SUBMIT";
  "dominant_reason_code": string;
  "plain_summary": string;
  "decision_explainability_contract": DecisionExplainabilityContract & {
    "artifact_family"?: "TRUST_SUMMARY";
    "plain_text_field_name"?: "plain_summary";
  };
  "decision_constraint_codes": Array<string>;
  "reason_codes": Array<string>;
  "blocking_dependency_refs": Array<string>;
  "temporal_propagation_event_refs": Array<string>;
  "support_refs": Array<string>;
  "required_human_steps": Array<string>;
  "trust_fresh_until": ISO8601DateTimeString;
  "synthesized_at": ISO8601DateTimeString;
  "superseded_at": ISO8601DateTimeString;
  "superseded_by_trust_id": string | null;
  "contract": SchemaBundle;
};
export const TrustSummarySchemaLineage = { schemaId: "https://taxat.dev/schemas/trust_summary.schema.json", sourceHash: "9db7af8cb93e8d0e774abb562f8bc61e0fc531fadc29381d37c732fc35144866" } as const;

export const DecisioningAndNightlyBindingManifest = { familyRef: "DECISIONING_AND_NIGHTLY", schemaCount: 21 } as const;
