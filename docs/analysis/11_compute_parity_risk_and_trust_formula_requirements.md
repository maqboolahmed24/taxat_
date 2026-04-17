# Compute, Parity, Risk, and Trust Formula Requirements

This document turns `compute_parity_and_trust_formulas.md` into a machine-oriented registry of formula families, operational bindings, downstream gate consumers, and schema-backed output surfaces.

## Coverage Summary

- Formula records: `19`
- Core formula families: `13`
- Secondary formula families: `2`
- Covered numbered sections: `8.1, 8.2, 8.3, 8.4, 8.5, 8.5A, 8.6, 8.7, 8.8, 8.9, 8.10, 8.10A, 8.11, 8.11A, 8.12, 8.13`
- Schema-backed artifacts covered: `TrustSummary, ComputeResult, ForecastSet, RiskReport, ParityResult, GateDecisionRecord, TrustInputBasisContract, TrustSensitivityAnalysisContract, WorkRoutingContract, WorkQueueHealthContract, ClientUploadSession, ClientApprovalPack, ClientPortalWorkspace, DecisionExplainabilityContract`

## Formula Family Matrix

| Formula ID | Section | Family | Output Artifacts | Module Bindings | Gate Consumers |
| --- | --- | --- | --- | --- | --- |
| `trustsummary_artifact_binding` | `8.1` | `binding_contract` | TrustSummary, ComputeResult, ForecastSet, RiskReport, ParityResult | COMPUTE_OUTCOME, FORECAST, SCORE_RISK, EVALUATE_PARITY, SYNTHESIZE_TRUST | TRUST_GATE, FILING_GATE, SUBMISSION_GATE, AMENDMENT_GATE |
| `standard_normalization_rules` | `8.2` | `shared_runtime_helpers` | ComputeResult, ForecastSet, ParityResult, TrustSummary | COMPUTE_OUTCOME, FORECAST, SCORE_RISK, EVALUATE_PARITY, ASSESS_TRUST_INPUT_STATE, SYNTHESIZE_TRUST | DATA_QUALITY_GATE, PARITY_GATE, TRUST_GATE, FILING_GATE |
| `data_quality_and_completeness` | `8.3` | `core_formula_family` | TrustSummary, GateDecisionRecord | ASSESS_TRUST_INPUT_STATE, SYNTHESIZE_TRUST | DATA_QUALITY_GATE, TRUST_GATE, FILING_GATE |
| `record_and_adjustment_compute` | `8.4` | `core_formula_family` | ComputeResult | COMPUTE_OUTCOME | PARITY_GATE, TRUST_GATE, FILING_GATE, AMENDMENT_GATE |
| `forecast` | `8.5` | `core_formula_family` | ForecastSet | FORECAST | n/a |
| `risk_scoring` | `8.5A` | `core_formula_family` | RiskReport, TrustSummary | SCORE_RISK, SYNTHESIZE_TRUST | TRUST_GATE, FILING_GATE |
| `parity_comparison_set_construction` | `8.6` | `core_formula_family` | ParityResult | EVALUATE_PARITY | PARITY_GATE, TRUST_GATE, AMENDMENT_GATE |
| `per_field_parity` | `8.7` | `core_formula_family` | ParityResult | EVALUATE_PARITY | PARITY_GATE, TRUST_GATE |
| `aggregate_parity` | `8.8` | `core_formula_family` | ParityResult, TrustSummary | EVALUATE_PARITY, SYNTHESIZE_TRUST | PARITY_GATE, TRUST_GATE, AMENDMENT_GATE, FILING_GATE |
| `evidence_graph_quality` | `8.9` | `core_formula_family` | TrustSummary, GateDecisionRecord | SYNTHESIZE_TRUST | RETENTION_EVIDENCE_GATE, TRUST_GATE, FILING_GATE |
| `trust_authority_uncertainty` | `8.10` | `core_formula_family` | TrustSummary, TrustInputBasisContract | ASSESS_TRUST_INPUT_STATE, SYNTHESIZE_TRUST | TRUST_GATE, FILING_GATE, AMENDMENT_GATE |
| `trust_input_admissibility_and_basis` | `8.10` | `core_formula_family` | TrustSummary, TrustInputBasisContract | VALIDATE_OVERRIDE_DEPENDENCIES, ASSESS_TRUST_INPUT_STATE, CHECK_TRUST_CURRENCY, SYNTHESIZE_TRUST | TRUST_GATE, FILING_GATE, SUBMISSION_GATE |
| `trust_upstream_gate_cap` | `8.10` | `core_formula_family` | TrustSummary | SYNTHESIZE_TRUST, TRUST_GATE | TRUST_GATE, FILING_GATE |
| `trust_scoring_bands_and_readiness` | `8.10` | `core_formula_family` | TrustSummary, TrustSensitivityAnalysisContract | SYNTHESIZE_TRUST, BUILD_GATE_EXPLANATION, TRUST_GATE | TRUST_GATE, FILING_GATE, AMENDMENT_GATE, SUBMISSION_GATE |
| `collaboration_orchestration_queue_routing` | `8.10A` | `secondary_formula_family` | WorkRoutingContract, WorkQueueHealthContract | n/a | n/a |
| `trust_currency_and_recalculation` | `8.11` | `core_formula_family` | TrustSummary | CHECK_TRUST_CURRENCY | TRUST_GATE, FILING_GATE, SUBMISSION_GATE |
| `client_flow_reliability_and_completion` | `8.11A` | `secondary_formula_family` | ClientUploadSession, ClientApprovalPack, ClientPortalWorkspace | n/a | n/a |
| `formula_reason_code_emission` | `8.12` | `reason_code_contract` | TrustSummary, DecisionExplainabilityContract | BUILD_GATE_EXPLANATION, SYNTHESIZE_TRUST, TRUST_GATE | TRUST_GATE, FILING_GATE |
| `formula_layer_summary` | `8.13` | `summary_anchor` | TrustSummary | SYNTHESIZE_TRUST | TRUST_GATE, FILING_GATE, AMENDMENT_GATE |

## Notes

- `8.10A` and `8.11A` are indexed as `secondary_formula_family` records so collaboration and client-flow metrics cannot be mistaken for filing trust.
- `projection_*` confidence terms remain indexed but are explicitly constrained to read-side use; they do not feed compute, parity, trust, or filing readiness.
- Trust synthesis is split across authority uncertainty, admissibility/basis, upstream gate cap, and score/cap/readiness records so later engineers do not collapse distinct ceilings into one score.

### `trustsummary_artifact_binding`

- Label: TrustSummary Artifact Binding
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L9[8.1_TrustSummary_artifact_binding]
- Inputs: `compute_result_ref`, `parity_result_ref`, `risk_report_ref`, `evidence_graph_ref`, `gate_decision_refs`, `baseline_submission_state`, `live_authority_progression_requested`
- Key intermediates: `trust_input_basis_contract`, `trust_sensitivity_analysis_contract`, `threshold_stability_state`
- Output fields: `execution_mode`, `analysis_only`, `compute_result_ref`, `parity_result_ref`, `risk_report_ref`, `evidence_graph_ref`, `gate_decision_refs`, `trust_input_state`, `trust_input_basis_contract`, `trust_sensitivity_analysis_contract`, `score_band`, `cap_band`, `trust_band`, `trust_score`, `automation_level`, `filing_readiness`, `dominant_reason_code`, `decision_constraint_codes`, `blocking_dependency_refs`
- Threshold deps: `trust_input_state_enum`, `score_band_enum`, `cap_band_enum`, `trust_band_enum`, `automation_level_enum`, `filing_readiness_enum`
- Reason codes: n/a
- Sensitivity hooks: `trust_input_basis_contract`, `trust_sensitivity_analysis_contract`
- Notes: This record is a contract surface, not an arithmetic equation family.; It freezes the schema-backed output boundary for all later formula families.

### `standard_normalization_rules`

- Label: Standard Normalization Rules
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L73[8.2_Standard_normalization_rules]
- Inputs: `money_profile`, `active_weights`, `timestamps`, `runtime_scope`
- Key intermediates: `clamp01`, `clamp100`, `round_score`, `round_penalty30`, `round_money`, `safe_unit`, `weighted_mean`, `min_non_null`, `hours_between`, `half_life_score`, `sigmoid`, `Σw`
- Output fields: `money_profile`, `serialization_profile`, `aggregation_boundary`
- Threshold deps: `money_profile_contract`, `canonical_decimal_serialization_v1`
- Reason codes: n/a
- Sensitivity hooks: `money_profile`
- Notes: Shared helper layer for all downstream formula records.

### `data_quality_and_completeness`

- Label: Data-Quality and Completeness
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L114[8.3_Data-quality_and_completeness_formulas]
- Inputs: `C_d`, `fact_confidence_f`, `fact_weight_f`, `decision_information_ratio_f`, `projection_information_ratio_f`, `limitation_explicitness_f`, `error_budget_d`, `critical_errors_d`, `major_errors_d`, `minor_errors_d`, `partition_integrity_d`, `weight_d`
- Key intermediates: `decision_survivability_f`, `decision_confidence_f`, `projection_fidelity_f`, `projected_confidence_f`, `presence_d`, `survivability_d`, `limitation_clarity_d`, `privacy_projection_quality_d`, `confidence_d`, `validation_d`, `effective_presence_d`, `domain_quality_d`
- Output fields: `completeness_score`, `data_quality_score`
- Threshold deps: `data_quality_freshness_scale`, `dq_structural_fail_closed_conditions`, `completeness_minimum_for_trust_caps`
- Reason codes: `DQ_CONFIDENCE_WEIGHT_INVALID`, `PRIVACY_PROJECTION_RATIO_INVALID`, `LIMITATION_SILENT_AMBIGUITY`, `DQ_INVALID_ERROR_BUDGET`, `DQ_WEIGHT_PROFILE_INVALID`, `DQ_LOW_COMPLETENESS`, `DQ_LOW_QUALITY`
- Sensitivity hooks: `decision_information_ratio_f`, `projection_fidelity_f`, `limitation_explicitness_f`
- Notes: Decision confidence and projection confidence are deliberately separated to preserve legal decisioning boundaries.

### `record_and_adjustment_compute`

- Label: Record-Layer and Adjustment-Layer Compute
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L212[8.4_Record-layer_and_adjustment-layer_compute_formulas], Algorithm/compute_parity_and_trust_formulas.md::L250[Quarterly_basis_profile], Algorithm/compute_parity_and_trust_formulas.md::L274[Year-end_reportable_totals], Algorithm/compute_parity_and_trust_formulas.md::L286[Rule-evaluated_outcome]
- Inputs: `F_record`, `F_adjust`, `runtime_scope`, `adjustment_binding(a)`, `eligible_compute_facts(mode)`, `rule_version`, `profile_facts`, `declaration_facts`, `authority_reference_facts`
- Key intermediates: `reporting_scope(runtime_scope[])`, `selected_reporting_scope(runtime_scope[])`, `record_total`, `adjustment_total`, `quarterly_reportable_total`, `annual_record_total`, `annual_adjusted_total`, `annual_adjusted_totals`, `outcome_vector`
- Output fields: `reporting_scope`, `adjustment_scope_source`, `quarterly_basis_profile_or_null`, `totals`, `assumptions`, `diagnostic_reason_codes`
- Threshold deps: `quarterly_basis_enum`, `analysis_only_mode_boundary`
- Reason codes: n/a
- Sensitivity hooks: `adjustment_scope_source`, `quarterly_basis`, `analysis_mode_treatment`
- Notes: Amendment intent and amendment submit remain year-end reporting basis rather than a new reporting-scope token.

### `forecast`

- Label: Forecast
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L307[8.5_Forecast_formula]
- Inputs: `baseline_total(c)`, `baseline_steps(c)`, `seasonality_index(h,c)`, `annualized_growth_rate(c)`, `horizon_years(h)`, `forecast_profile`, `deterministic_seed`
- Key intermediates: `baseline_run_rate(c)`, `normalized_seasonality(h,c)`, `forecast_seed`, `epsilon_(h,c,s)`, `point_forecast(h,c)`, `simulated_forecast(h,c,s)`
- Output fields: `point_forecasts`, `scenarios`, `seeds`
- Threshold deps: `forecast_floor_cap_profile`
- Reason codes: n/a
- Sensitivity hooks: `forecast_seed`, `scenario_id`, `canonical_forecast_profile`
- Notes: No forecast should be emitted for categories with zero baseline steps.

### `risk_scoring`

- Label: Risk Scoring
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L339[8.5A_Risk_scoring_formula]
- Inputs: `feature_value_m`, `feature_weight_m`, `material_threshold_m`, `blocking_threshold_m`, `feature_resolved_m`
- Key intermediates: `Σw_risk`, `risk_score_raw`, `material_risk_flag_count`, `blocking_risk_flag_count`
- Output fields: `risk_score`, `feature_scores`, `flags`, `unresolved_material_blocking_risk_flag`, `unresolved_blocking_risk_flag`
- Threshold deps: `risk_blocking_thresholds`, `risk_automation_guard_threshold`
- Reason codes: `RISK_WEIGHT_PROFILE_INVALID`, `RISK_MATERIAL_FLAG`, `RISK_BLOCKING_FLAG`, `TRUST_BLOCKING_RISK`
- Sensitivity hooks: `risk_threshold_profile_ref`, `feature_weight_m`, `material_threshold_m`, `blocking_threshold_m`
- Notes: Trust consumes both risk_score and the unresolved blocking flags rather than score alone.

### `parity_comparison_set_construction`

- Label: Parity Comparison-Set Construction
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L376[8.6_Parity_comparison-set_construction], Algorithm/compute_parity_and_trust_formulas.md::L415[Scope_rules]
- Inputs: `internal_value_k`, `authority_value_k`, `criticality_weight_k`, `abs_threshold_k`, `rel_threshold_k`, `abs_floor_k`, `criticality_class`, `comparison_basis_ref`, `comparison_requirement`
- Key intermediates: `K`, `criticality_rank`, `comparison_set_state`
- Output fields: `comparison_basis_ref`, `comparison_requirement`, `comparison_set_state`, `ordered_field_codes`, `dominant_reason_code`, `reason_codes`
- Threshold deps: `comparison_requirement_enum`, `parity_threshold_profile`
- Reason codes: `PARITY_COMPARISON_SET_INVALID`, `PARITY_NOT_COMPARABLE`, `PARITY_PARTIAL_COVERAGE`
- Sensitivity hooks: `comparison_requirement`, `comparison_basis_ref`, `parity_threshold_profile_ref`
- Notes: Authority calculation path must be frozen before parity evaluation and reused by later filing or amendment stages.

### `per_field_parity`

- Label: Per-Field Parity
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L457[8.7_Per-field_parity_formulas], Algorithm/compute_parity_and_trust_formulas.md::L492[Per-field_classification]
- Inputs: `internal_value_k`, `authority_value_k`, `abs_threshold_k`, `rel_threshold_k`, `abs_floor_k`, `minimum_rel_floor`
- Key intermediates: `delta_signed_k`, `delta_abs_k`, `effective_abs_floor_k`, `delta_rel_k`, `breach_abs_k`, `breach_rel_k`, `breach_ratio_k`, `field_class_k`
- Output fields: `deltas`
- Threshold deps: `minimum_rel_floor`, `blocking_ratio_cap`, `parity_field_class_thresholds`
- Reason codes: n/a
- Sensitivity hooks: `abs_threshold_k`, `rel_threshold_k`, `abs_floor_k`, `minimum_rel_floor`, `blocking_ratio_cap`
- Notes: Per-field classification is a deterministic threshold surface, not a UI-only explanation layer.

### `aggregate_parity`

- Label: Aggregate Parity
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L517[8.8_Aggregate_parity_formulas], Algorithm/compute_parity_and_trust_formulas.md::L546[Aggregate_parity_classification]
- Inputs: `K`, `field_class_k`, `criticality_weight_k`, `comparison_requirement`, `comparison_set_state`
- Key intermediates: `Σw_required`, `Σw_comparable`, `comparison_coverage`, `weighted_parity_pressure`, `parity_score_raw`, `parity_score`
- Output fields: `comparison_coverage`, `weighted_parity_pressure`, `parity_score`, `parity_classification`, `dominant_reason_code`, `reason_codes`
- Threshold deps: `parity_aggregate_thresholds`, `comparison_requirement_enum`
- Reason codes: `PARITY_COMPARISON_SET_INVALID`, `PARITY_NOT_COMPARABLE`, `PARITY_PARTIAL_COVERAGE`, `PARITY_BLOCKING_DIFFERENCE`, `PARITY_MATERIAL_DIFFERENCE`, `PARITY_MINOR_DIFFERENCE`, `PARITY_MATCH`, `PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS`
- Sensitivity hooks: `comparison_requirement`, `comparison_coverage`, `weighted_parity_pressure`
- Notes: The NOT_REQUIRED fallback applies only when the policy explicitly marks the scope as not requiring authority comparison.

### `evidence_graph_quality`

- Label: Evidence-Graph Quality
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L589[8.9_Evidence-graph_quality_formula]
- Inputs: `F_return`, `F_critical`, `support_state(f)`, `closure_state(f)`, `proof_bundle_ref(f)`, `support_confidence_e`, `decision_information_ratio_e`, `limitation_explicitness_e`, `review_projection_ratio_e`, `figure_weight_f`
- Key intermediates: `coverage_return`, `coverage_critical`, `closed_critical_ratio`, `proof_bundle_coverage`, `unsupported_ratio`, `contradicted_ratio`, `stale_ratio`, `replay_failure_ratio`, `open_closure_ratio`, `explanation_failure_ratio`, `path_survivability`, `path_clarity`, `path_review_projection_fidelity`, `best_admissible_path`, `best_path_confidence`, `explanation_quality`, `weighted_explanation_quality`, `weighted_path_survivability`, `limitation_clarity_ratio`, `silent_ambiguity_ratio`, `inferred_path_ratio`, `graph_quality_raw`, `graph_quality_score`
- Output fields: `graph_quality_score`
- Threshold deps: `graph_quality_fail_closed_caps`, `graph_survivability_minima`
- Reason codes: `GRAPH_LOW_COVERAGE`, `GRAPH_HIGH_INFERENCE`, `GRAPH_WEIGHT_PROFILE_INVALID`, `TRUST_RETENTION_PENALTY`
- Sensitivity hooks: `review_projection_ratio_e`, `figure_weight_f`, `submit_survivability_min`, `review_survivability_min`, `audit_survivability_min`
- Notes: Projection-side reviewer fidelity is scored explicitly without mutating canonical support semantics.

### `trust_authority_uncertainty`

- Label: Trust Authority Uncertainty
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L674[8.10_Trust_synthesis_formula], Algorithm/compute_parity_and_trust_formulas.md::L734[Authority-grounded_uncertainty_score]
- Inputs: `O`, `src_rel_o`, `corr_o`, `fresh_o`, `clarity_o`
- Key intermediates: `w_o`, `W`, `p_x`, `reconciliation_confidence`, `external_truth_ambiguity`, `authority_state_staleness_score`, `authority_uncertainty_raw`, `authority_uncertainty_score`
- Output fields: `authority_uncertainty_score`
- Threshold deps: `authority_review_threshold`, `authority_block_threshold`, `authority_penalty_curve`
- Reason codes: `TRUST_AUTHORITY_CONFIDENCE_LOW`, `TRUST_AUTHORITY_AMBIGUITY_HIGH`, `TRUST_AUTHORITY_STATE_STALE`, `TRUST_AUTHORITY_STATE_UNRESOLVED`
- Sensitivity hooks: `half_life_seconds(source_class(o))`, `src_rel_o`, `corr_o`, `clarity_o`
- Notes: Authority-defined legal truth outranks UI-defined confidence.

### `trust_input_admissibility_and_basis`

- Label: Trust Input Admissibility and Basis
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L674[8.10_Trust_synthesis_formula], Algorithm/compute_parity_and_trust_formulas.md::L707[Required_trust_input], Algorithm/compute_parity_and_trust_formulas.md::L763[Trust-input_admissibility_state], Algorithm/compute_parity_and_trust_formulas.md::L808[TrustInputBasisContract]
- Inputs: `required_trust_artifacts[]`, `required_context_inputs[]`, `baseline_submission_state`, `authority_uncertainty_score`, `live_authority_progression_requested`, `execution_mode`, `analysis_only`, `required_human_steps[]`, `late_data_monitor`, `overrides`
- Key intermediates: `input_presence_ok`, `input_manifest_ok`, `input_lifecycle_ok`, `input_consistency_ok`, `input_limitation_ok`, `external_freshness_deadlines[]`, `trust_fresh_until`, `input_freshness_ok`, `input_presence_state`, `manifest_binding_state`, `lifecycle_binding_state`, `consistency_state`, `limitation_semantics_state`, `freshness_state`, `freshness_dependency_classes[]`, `baseline_progression_state`, `baseline_selection_contract_hash_or_null`, `baseline_automation_ceiling`, `baseline_limitation_reason_codes[]`, `authority_progression_state`, `late_data_invalidation_state`, `override_dependency_state`, `human_step_state`, `automation_ceiling`, `filing_readiness_ceiling`
- Output fields: `trust_input_state`, `trust_input_basis_contract`, `trust_fresh_until`, `blocking_dependency_refs`
- Threshold deps: `trust_input_state_enum`, `automation_ceiling_enum`, `filing_readiness_ceiling_enum`, `baseline_progression_state_enum`, `authority_progression_state_enum`
- Reason codes: `TRUST_INPUT_INCOMPLETE`, `TRUST_INPUT_STALE`, `TRUST_INPUT_CONTRADICTION`, `TRUST_OVERRIDE_INVALID`, `TRUST_REQUIRED_HUMAN_STEPS`
- Sensitivity hooks: `external_freshness_deadlines[]`, `baseline_automation_ceiling`, `authority_progression_state`, `human_step_state`
- Notes: Every non-dominant basis reason must survive into decision_constraint_codes so later surfaces do not lose the ceiling rationale.

### `trust_upstream_gate_cap`

- Label: Trust Upstream Gate Cap
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L674[8.10_Trust_synthesis_formula], Algorithm/compute_parity_and_trust_formulas.md::L861[Upstream_gate_progression_cap]
- Inputs: `upstream_gate_records[]`
- Key intermediates: `u_block`, `u_review`, `u_notice`, `upstream_gate_cap`
- Output fields: `upstream_gate_cap`
- Threshold deps: `upstream_gate_cap_enum`
- Reason codes: `TRUST_UPSTREAM_GATE_BLOCK`, `TRUST_UPSTREAM_GATE_REVIEW_REQUIRED`, `TRUST_UPSTREAM_GATE_NOTICE_ACTIVE`, `TRUST_GATE`
- Sensitivity hooks: `upstream_gate_cap`
- Notes: Upstream gate posture is a stage-local legal ceiling, not a UI convenience.

### `trust_scoring_bands_and_readiness`

- Label: Trust Scoring, Bands, and Readiness
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L674[8.10_Trust_synthesis_formula], Algorithm/compute_parity_and_trust_formulas.md::L897[Base_trust_score], Algorithm/compute_parity_and_trust_formulas.md::L922[Penalties], Algorithm/compute_parity_and_trust_formulas.md::L939[Score_bands_threshold_guard_bands_and_band_caps], Algorithm/compute_parity_and_trust_formulas.md::L1038[Projected_human-facing_level], Algorithm/compute_parity_and_trust_formulas.md::L1044[Automation_level], Algorithm/compute_parity_and_trust_formulas.md::L1069[Trust_sensitivity_analyzer], Algorithm/compute_parity_and_trust_formulas.md::L1090[Filing_readiness], Algorithm/compute_parity_and_trust_formulas.md::L1129[Amendment_freshness_and_retroactive_caps]
- Inputs: `Q`, `P`, `G`, `R`, `risk_score`, `completeness_score`, `graph_quality_score`, `authority_uncertainty_score`, `comparison_requirement`, `baseline_submission_state`, `execution_mode`, `analysis_only`, `required_human_steps_count`, `active_filing_critical_override_count`, `critical_retention_limited_count`, `trust_input_state`, `upstream_gate_cap`
- Key intermediates: `q_raw`, `p_raw`, `g_raw`, `r_raw`, `trust_core_score`, `override_penalty`, `retention_penalty`, `authority_penalty`, `trust_score`, `score_band`, `trust_green_margin`, `trust_amber_margin`, `risk_automation_margin`, `completeness_margin`, `graph_filing_margin`, `authority_review_margin`, `authority_block_margin`, `threshold_stability_state`, `cap_band`, `trust_band`, `trust_level`, `automation_level`, `score_cap_alignment_state`, `cap_driver_reason_codes[]`, `edge_trigger_codes[]`, `projected_case_results[]`, `readiness_rank`, `automation_rank`, `legal_progression_rank`, `retroactive_penalty`, `amendment_freshness_penalty`
- Output fields: `trust_core_score`, `trust_score`, `score_band`, `cap_band`, `trust_band`, `threshold_stability_state`, `trust_level`, `automation_level`, `filing_readiness`, `legal_progression_rank`, `trust_sensitivity_analysis_contract`
- Threshold deps: `trust_score_bands`, `trust_guard_bands`, `trust_cap_band_rules`, `automation_level_enum`, `filing_readiness_enum`, `threshold_stability_enum`, `trust_edge_trigger_enum`, `analysis_mode_cap`, `amendment_freshness_caps`
- Reason codes: `PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS`, `TRUST_AUTHORITY_PENALTY`, `TRUST_THRESHOLD_EDGE_REVIEW`, `TRUST_AUTOMATION_LIMITED`, `TRUST_ANALYSIS_MODE_CAP`, `TRUST_AMENDMENT_FRESHNESS_STALE`, `TRUST_RETROACTIVE_IMPACT_UNRESOLVED`, `TRUST_GREEN`, `TRUST_AMBER`, `TRUST_RED`, `TRUST_INSUFFICIENT_DATA`, `TRUST_GREEN_GUARD_BAND`, `TRUST_AMBER_GUARD_BAND`, `RISK_AUTOMATION_GUARD_BAND`, `GRAPH_FILING_GUARD_BAND`, `TRUST_SCORE_MINUS_ONE`, `TRUST_SCORE_PLUS_ONE`, `RISK_SCORE_PLUS_ONE`
- Sensitivity hooks: `trust_green_margin`, `trust_amber_margin`, `risk_automation_margin`, `completeness_margin`, `graph_filing_margin_or_null`, `authority_review_margin_or_null`, `authority_block_margin_or_null`, `edge_trigger_codes[]`, `projected_case_results[]`
- Notes: Sensitivity analysis is a first-class persisted contract rather than debug-only output.

### `collaboration_orchestration_queue_routing`

- Label: Collaboration Orchestration, Queue, and Routing
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L1155[8.10A_Collaboration_orchestration_queue_and_routing_formulas], Algorithm/compute_parity_and_trust_formulas.md::L1184[Assignment_efficiency_and_ownership_confidence], Algorithm/compute_parity_and_trust_formulas.md::L1217[Resolution_confidence], Algorithm/compute_parity_and_trust_formulas.md::L1246[Escalation_pressure_and_escalation_rank], Algorithm/compute_parity_and_trust_formulas.md::L1262[Queue_health], Algorithm/compute_parity_and_trust_formulas.md::L1303[Collaboration_priority_and_stable_order]
- Inputs: `effective_due_at_i`, `queue_entered_at_i`, `waiting_since_at_i`, `routing_policy`, `eligible_assignee_set`, `arrival_rate_q`, `service_rate_q`, `staffed_parallelism_q`
- Key intermediates: `remaining_hours_i`, `item_age_hours_i`, `waiting_age_hours_i`, `priority_base_i`, `age_pressure_i`, `customer_wait_pressure_i`, `staff_wait_pressure_i`, `authority_wait_pressure_i`, `due_soon_signal_i`, `breach_signal_i`, `sla_pressure_raw_i`, `sla_pressure_score_i`, `assignment_efficiency_(i,a)`, `best_assign_score_i`, `assignment_margin_i`, `ownership_confidence_raw_i`, `ownership_confidence_score_i`, `resolution_confidence_raw_i`, `resolution_confidence_score_i`, `resolution_uncertainty_i`, `escalation_pressure_raw_i`, `escalation_pressure_score_i`, `escalation_rank_i`, `P_wait_q`, `expected_wait_hours_q`, `queue_health_signal_q`, `queue_health_score_q`, `queue_pressure_i`, `collaboration_priority_signal_i`, `collaboration_priority_score_i`, `priority_tuple_i`
- Output fields: `assignment_efficiency_score`, `ownership_confidence_score`, `resolution_confidence_score`, `escalation_rank`, `queue_health_score`, `collaboration_priority_score`
- Threshold deps: `work_priority_base_map`, `work_resolution_caps`, `queue_health_floor`, `escalation_pressure_threshold`
- Reason codes: `WORK_SLA_UNBOUND`, `WORK_OWNERSHIP_AMBIGUOUS`, `WORK_ASSIGNMENT_LOW_EFFICIENCY`, `WORK_RESPONSE_GUARD_STALE`, `WORK_RESOLUTION_CONFIDENCE_LOW`, `WORK_ESCALATION_PRESSURE_HIGH`, `WORK_QUEUE_HEALTH_DEGRADED`
- Sensitivity hooks: `item_age_half_life_hours(type_i)`, `queue_health_floor`, `reassignment_gain_threshold`, `resolution_confidence_floor`
- Notes: Secondary operational formula family; do not fold into TrustSummary trust_score semantics.

### `trust_currency_and_recalculation`

- Label: Trust Currency and Recalculation
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L1337[8.11_Out-of-band_stale-input_and_recalculation_handling]
- Inputs: `baseline_submission_state`, `authority_uncertainty_score`, `ComputeResult`, `ParityResult`, `RiskReport`, `graph_quality basis`, `upstream gates`, `overrides`, `LateDataMonitorResult`, `authority-state observation`, `runtime_scope[]`
- Key intermediates: `trust_currency_state`, `TRUST_RECALCULATION_REQUIRED`
- Output fields: `lifecycle_state`, `superseded_at`, `superseded_by_trust_id`
- Threshold deps: `authority_review_threshold`, `authority_block_threshold`
- Reason codes: `TRUST_AUTHORITY_STATE_UNRESOLVED`, `TRUST_RECALCULATION_REQUIRED`
- Sensitivity hooks: `authority_uncertainty_score`, `late_data monitor changes`, `override lifecycle changes`
- Notes: Currency evaluation is fail-closed and lineage-sensitive rather than timestamp-only freshness checking.

### `client_flow_reliability_and_completion`

- Label: Client-Flow Reliability and Completion
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L1369[8.11A_Client-flow_stability_upload-confidence_recovery_approval-readiness_and_completion_formulas], Algorithm/compute_parity_and_trust_formulas.md::L1414[Flow-stability_score], Algorithm/compute_parity_and_trust_formulas.md::L1439[Upload-confidence_score], Algorithm/compute_parity_and_trust_formulas.md::L1470[Recovery_posture_and_viability], Algorithm/compute_parity_and_trust_formulas.md::L1523[Approval-readiness_score], Algorithm/compute_parity_and_trust_formulas.md::L1548[Risk-weighted_friction_score], Algorithm/compute_parity_and_trust_formulas.md::L1574[Completion_probability]
- Inputs: `surface_class`, `network_posture`, `freshness_state`, `interaction_posture`, `draft_state`, `focus_anchor_ref`, `bytes_transferred`, `byte_count`, `request_binding_state`, `integrity_state`, `malware_scan_state`, `validation_state`, `step_up_expires_at`, `remaining_required_step_count`, `required_input_count`, `blocking_wait_seconds`, `retry_count`, `external_handoff_count`
- Key intermediates: `surface_penalty`, `network_instability`, `flow_stability_raw`, `flow_stability_score`, `progress_ratio`, `observed_throughput_bps`, `eta_seconds`, `expiry_buffer`, `binding_factor`, `resume_success_ratio`, `integrity_factor`, `scan_factor`, `validation_factor`, `upload_confidence_raw`, `upload_confidence_score`, `recovery_mode_class`, `resume_viability`, `artifact_currency`, `locality_factor`, `preservation_factor`, `recovery_posture_score`, `approval_readiness_raw`, `approval_readiness_score`, `step_burden`, `input_burden`, `wait_burden`, `retry_burden`, `handoff_burden`, `risk_justification`, `raw_friction`, `friction_allowance`, `avoidable_friction`, `risk_weighted_friction_score`, `hazard_j`, `completion_probability`
- Output fields: `flow_stability_score`, `upload_confidence_score`, `recovery_posture_score`, `approval_readiness_score`, `risk_weighted_friction_score`, `completion_probability`
- Threshold deps: `client_flow_thresholds`, `upload_confidence_thresholds`, `recovery_posture_mapping`, `approval_readiness_thresholds`, `completion_probability_thresholds`
- Reason codes: `FLOW_STABILITY_LOW`, `UPLOAD_CONFIDENCE_LOW`, `UPLOAD_RESUME_EXPIRING`, `UPLOAD_BINDING_STALE`, `UPLOAD_INTEGRITY_FAILED`, `APPROVAL_READINESS_LOW`, `APPROVAL_VIEW_STALE`, `APPROVAL_STEP_UP_EXPIRED`, `FRICTION_EXCESSIVE`, `COMPLETION_RISK_HIGH`, `UPLOAD_REPLACEMENT`
- Sensitivity hooks: `portal_reliability_profile_ref`, `surface_class`, `network_posture`, `risk_justification`
- Notes: Secondary governed-client formula family; its outputs should not be mistaken for filing trust or gate semantics.

### `formula_reason_code_emission`

- Label: Formula Reason-Code Emission
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L1604[8.12_Reason-code_emission_rules_for_formulas]
- Inputs: `matched thresholds`, `matched caps`, `freshness state`, `admissibility state`, `trust posture`
- Key intermediates: `compressed_reason_codes`, `suppressed_reason_count`, `semantic_qualifiers`
- Output fields: `reason_codes`, `dominant_reason_code`, `plain_summary`, `decision_constraint_codes`, `decision_explainability_contract`
- Threshold deps: `trust_band_reason_codes`, `decision_explainability_contract`
- Reason codes: `DQ_LOW_COMPLETENESS`, `DQ_LOW_QUALITY`, `DQ_INVALID_ERROR_BUDGET`, `DQ_CONFIDENCE_WEIGHT_INVALID`, `DQ_WEIGHT_PROFILE_INVALID`, `PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS`, `PARITY_MINOR_DIFFERENCE`, `PARITY_MATERIAL_DIFFERENCE`, `PARITY_BLOCKING_DIFFERENCE`, `PARITY_NOT_COMPARABLE`, `PARITY_PARTIAL_COVERAGE`, `PARITY_COMPARISON_SET_INVALID`, `RISK_WEIGHT_PROFILE_INVALID`, `RISK_MATERIAL_FLAG`, `RISK_BLOCKING_FLAG`, `GRAPH_LOW_COVERAGE`, `GRAPH_HIGH_INFERENCE`, `GRAPH_WEIGHT_PROFILE_INVALID`, `TRUST_INPUT_INCOMPLETE`, `TRUST_INPUT_STALE`, `TRUST_INPUT_CONTRADICTION`, `TRUST_OVERRIDE_INVALID`, `TRUST_THRESHOLD_EDGE_REVIEW`, `TRUST_RECALCULATION_REQUIRED`, `TRUST_OVERRIDE_PENALTY`, `TRUST_RETENTION_PENALTY`, `TRUST_AUTHORITY_PENALTY`, `TRUST_AUTHORITY_CONFIDENCE_LOW`, `TRUST_AUTHORITY_AMBIGUITY_HIGH`, `TRUST_AUTHORITY_STATE_STALE`, `TRUST_AUTHORITY_STATE_UNRESOLVED`, `TRUST_AMENDMENT_FRESHNESS_STALE`, `WORK_SLA_UNBOUND`, `WORK_OWNERSHIP_AMBIGUOUS`, `WORK_ASSIGNMENT_LOW_EFFICIENCY`, `WORK_ESCALATION_PRESSURE_HIGH`, `WORK_QUEUE_HEALTH_DEGRADED`, `WORK_RESPONSE_GUARD_STALE`, `WORK_RESOLUTION_CONFIDENCE_LOW`, `TRUST_RETROACTIVE_IMPACT_UNRESOLVED`, `TRUST_ANALYSIS_MODE_CAP`, `TRUST_BLOCKING_RISK`, `TRUST_REQUIRED_HUMAN_STEPS`, `FLOW_STABILITY_LOW`, `UPLOAD_CONFIDENCE_LOW`, `UPLOAD_RESUME_EXPIRING`, `UPLOAD_BINDING_STALE`, `UPLOAD_INTEGRITY_FAILED`, `APPROVAL_READINESS_LOW`, `APPROVAL_VIEW_STALE`, `APPROVAL_STEP_UP_EXPIRED`, `FRICTION_EXCESSIVE`, `COMPLETION_RISK_HIGH`, `TRUST_AUTOMATION_LIMITED`, `TRUST_UPSTREAM_GATE_BLOCK`, `TRUST_UPSTREAM_GATE_REVIEW_REQUIRED`, `TRUST_UPSTREAM_GATE_NOTICE_ACTIVE`, `TRUST_GREEN`, `TRUST_AMBER`, `TRUST_RED`, `TRUST_INSUFFICIENT_DATA`
- Sensitivity hooks: `cap_driver_reason_codes[]`, `edge_trigger_codes[]`, `decision_constraint_codes[]`
- Notes: Reason-code emission is normative semantics, not a renderer-local narration layer.

### `formula_layer_summary`

- Label: Formula Layer Summary
- Source refs: Algorithm/compute_parity_and_trust_formulas.md::L1690[8.13_One-sentence_summary]
- Inputs: `evidence quality`, `compute outputs`, `authority comparison`, `graph defensibility`, `override reliance`
- Key intermediates: n/a
- Output fields: `trust posture`
- Threshold deps: n/a
- Reason codes: n/a
- Sensitivity hooks: n/a
- Notes: Summary-only numbered section included to keep numbered-section coverage exact.

