# Threshold, Edge-Case, and Sensitivity Matrix

This document centralizes the band, guard-band, fail-closed cap, and secondary-threshold semantics that were previously scattered across prose.

## Threshold Groups

| Threshold ID | Formula IDs | Kind | Key Values |
| --- | --- | --- | --- |
| `data_quality_freshness_scale` | `data_quality_and_completeness` | `ordered_scalar_map` | `{"current": 1, "expired": 0, "stale": 0.5, "unknown": 0.25}` |
| `dq_structural_fail_closed_conditions` | `data_quality_and_completeness` | `fail_closed_conditions` | `["DQ_INVALID_ERROR_BUDGET", "DQ_CONFIDENCE_WEIGHT_INVALID", "DQ_WEIGHT_PROFILE_INVALID", "LIMITATION_SILENT_AMBIGUITY on filing-critical domain or profile"]` |
| `quarterly_basis_enum` | `record_and_adjustment_compute` | `enum` | `["PERIODIC", "CUMULATIVE"]` |
| `risk_blocking_thresholds` | `risk_scoring`, `trust_scoring_bands_and_readiness` | `profile_thresholds` | `{"blocking_threshold_m": "feature-specific in [material_threshold_m,1]", "material_threshold_m": "feature-specific in (0,1]", "risk_automation_guard_trigger": "risk_score >= 40 blocks green automation margin", "risk_guard_band": 2}` |
| `comparison_requirement_enum` | `parity_comparison_set_construction`, `aggregate_parity`, `trust_scoring_bands_and_readiness` | `enum` | `["MANDATORY", "DESIRABLE", "NOT_REQUIRED"]` |
| `parity_field_class_thresholds` | `per_field_parity` | `band_thresholds` | `{"blocking_gte": 2.5, "blocking_ratio_cap_default": 3.0, "match_lt": 0.25, "material_lt": 2.5, "minor_lt": 1.0}` |
| `parity_aggregate_thresholds` | `aggregate_parity` | `band_thresholds` | `{"coverage_full_required": 1, "material_pressure_gte": 1.0, "minor_pressure_gte": 0.25}` |
| `graph_survivability_minima` | `evidence_graph_quality` | `named_thresholds` | `{"audit_survivability_min": 0.15, "review_survivability_min": 0.45, "submit_survivability_min": 0.8}` |
| `graph_quality_fail_closed_caps` | `evidence_graph_quality` | `ordered_caps` | `{"contradicted_target": 39, "missing_proof_bundle_or_explanation_failure": 69, "nonreplayable_or_low_review_survivability": 69, "open_closure": 59, "silent_ambiguity_ratio_gt_0": 29, "stale_or_low_submit_survivability": 79, "unsupported_target": 49}` |
| `authority_review_threshold` | `trust_authority_uncertainty`, `trust_input_admissibility_and_basis`, `trust_scoring_bands_and_readiness`, `trust_currency_and_recalculation` | `numeric` | `{"review_limit": 35}` |
| `authority_block_threshold` | `trust_input_admissibility_and_basis`, `trust_scoring_bands_and_readiness`, `trust_currency_and_recalculation` | `numeric` | `{"block_limit": 70}` |
| `trust_input_state_enum` | `trustsummary_artifact_binding`, `trust_input_admissibility_and_basis`, `trust_scoring_bands_and_readiness` | `enum` | `["ADMISSIBLE_CURRENT", "ADMISSIBLE_STALE", "INCOMPLETE", "CONTRADICTED"]` |
| `upstream_gate_cap_enum` | `trustsummary_artifact_binding`, `trust_upstream_gate_cap`, `trust_scoring_bands_and_readiness` | `enum` | `["AUTO_ELIGIBLE", "NOTICE_ONLY", "REVIEW_ONLY", "BLOCKED"]` |
| `trust_score_bands` | `trustsummary_artifact_binding`, `trust_scoring_bands_and_readiness` | `band_thresholds` | `{"amber_gte": 65, "green_gte": 85, "red_lt": 65}` |
| `trust_guard_bands` | `trust_scoring_bands_and_readiness` | `guard_bands` | `{"amber_guard_band": 2, "authority_allow_guard_band": 2, "authority_block_guard_band": 2, "authority_review_guard_band": 2, "completeness_guard_band": 3, "graph_guard_band": 3, "green_guard_band": 2, "risk_guard_band": 2}` |
| `threshold_stability_enum` | `trustsummary_artifact_binding`, `trust_scoring_bands_and_readiness` | `enum` | `["STABLE", "EDGE_REVIEW"]` |
| `trust_edge_trigger_enum` | `trust_scoring_bands_and_readiness` | `enum` | `["TRUST_GREEN_GUARD_BAND", "TRUST_AMBER_GUARD_BAND", "RISK_AUTOMATION_GUARD_BAND", "COMPLETENESS_GUARD_BAND", "GRAPH_FILING_GUARD_BAND", "AUTHORITY_REVIEW_GUARD_BAND", "AUTHORITY_BLOCK_GUARD_BAND"]` |
| `trust_cap_band_rules` | `trustsummary_artifact_binding`, `trust_scoring_bands_and_readiness` | `ordered_band_rules` | `{"amber_conditions": ["execution_mode = ANALYSIS", "trust_input_state = ADMISSIBLE_STALE", "threshold_stability_state = EDGE_REVIEW", "risk_automation_margin < risk_guard_band", "upstream_gate_cap = REVIEW_ONLY", "required_human_steps_count > 0", "active_filing_critical_override_count > 0", "critical_retention_limited_count > 0", "unresolved_material_blocking_risk_flag = true", "live_authority_progression_requested and authority_uncertainty_score >= 35", "baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}"], "cap_band_enum": ["INSUFFICIENT_DATA", "RED", "AMBER", "GREEN"], "insufficient_data_conditions": ["trust_input_state in {INCOMPLETE, CONTRADICTED}", "missing required evidence/authority link/comparison/baseline or silent limitation ambiguity", "completeness_score < 60", "filing-capable run and graph_quality_score < 50"], "red_conditions": ["unresolved_blocking_risk_flag = true", "upstream_gate_cap = BLOCKED", "live_authority_progression_requested and authority_uncertainty_score >= 70"], "severity_order": ["GREEN", "AMBER", "RED", "INSUFFICIENT_DATA"]}` |
| `automation_level_enum` | `trustsummary_artifact_binding`, `trust_input_admissibility_and_basis`, `trust_scoring_bands_and_readiness` | `enum` | `["ALLOWED", "LIMITED", "BLOCKED"]` |
| `filing_readiness_enum` | `trustsummary_artifact_binding`, `trust_input_admissibility_and_basis`, `trust_scoring_bands_and_readiness` | `enum` | `["NOT_READY", "READY_REVIEW", "READY_TO_SUBMIT"]` |
| `analysis_mode_cap` | `trust_scoring_bands_and_readiness` | `hard_caps` | `{"max_automation_level": "LIMITED", "max_filing_readiness": "READY_REVIEW", "max_trust_band": "AMBER", "reason_code": "TRUST_ANALYSIS_MODE_CAP"}` |
| `amendment_freshness_caps` | `trust_scoring_bands_and_readiness` | `hard_caps` | `{"automation_level_max": "LIMITED", "filing_readiness_max": "READY_REVIEW", "predicates": ["same DriftBaselineEnvelope.frozen_hash", "no widened difference_classes or filing-critical deltas", "no widened RetroactiveImpactAnalysis", "no provider-profile or amendment-window change"]}` |
| `work_priority_base_map` | `collaboration_orchestration_queue_routing` | `ordered_scalar_map` | `{"CRITICAL": 1.0, "HIGH": 0.6, "LOW": 0.15, "NORMAL": 0.35, "URGENT": 0.8}` |
| `work_resolution_caps` | `collaboration_orchestration_queue_routing` | `ordered_caps` | `{"next_action_clarity_zero": 49, "response_or_lane_integrity_zero": 39, "unassigned_item": 69}` |
| `queue_health_floor` | `collaboration_orchestration_queue_routing` | `profile_threshold` | `{"queue_health_floor": "profile-defined"}` |
| `client_flow_thresholds` | `client_flow_reliability_and_completion` | `thresholds` | `{"flow_stability_unstable_lt": 60}` |
| `upload_confidence_thresholds` | `client_flow_reliability_and_completion` | `hard_overrides` | `{"attached_minimum": 85, "binding_superseded_maximum": 25, "integrity_failed": 0, "malware_quarantined": 0, "submit_attach_minimum": 70}` |
| `recovery_posture_mapping` | `client_flow_reliability_and_completion` | `ordered_mapping` | `{"HARD_RESET_REQUIRED": "re-upload or restart required", "INLINE_RESUME": ">= 85 and no guard mismatch", "RECONFIRM_INLINE": "65-84 with in-place rebase or rebinding path", "STALE_REVIEW_REQUIRED": "40-64", "STEP_UP_RETRY": "only blocker is step-up proof", "SUPPORT_REQUIRED": "self-recovery unsafe"}` |
| `approval_readiness_thresholds` | `client_flow_reliability_and_completion` | `hard_overrides` | `{"sign_now_minimum": 85, "step_up_expired_maximum": 40, "superseded_or_expired": 0}` |
| `completion_probability_thresholds` | `client_flow_reliability_and_completion` | `band_thresholds` | `{"completion_cta_gte": 0.7, "review_affordance_lt": 0.7, "save_or_help_lt": 0.4}` |

## Sensitivity Hooks

- Canonical trust edge-trigger enum: `TRUST_GREEN_GUARD_BAND, TRUST_AMBER_GUARD_BAND, RISK_AUTOMATION_GUARD_BAND, COMPLETENESS_GUARD_BAND, GRAPH_FILING_GUARD_BAND, AUTHORITY_REVIEW_GUARD_BAND, AUTHORITY_BLOCK_GUARD_BAND`
- Canonical trust probe order: `TRUST_SCORE_MINUS_ONE, TRUST_SCORE_PLUS_ONE, RISK_SCORE_PLUS_ONE, AUTHORITY_UNCERTAINTY_PLUS_ONE, FRESHNESS_INVALIDATED, INVALID_OVERRIDE_RELIED_UPON`

## Test Vector Plan

| Vector | Coverage | Formula IDs |
| --- | --- | --- |
| `TV-55` | `existing_corpus_vector` | `trust_scoring_bands_and_readiness` |
| `TV-56` | `existing_corpus_vector` | `trust_scoring_bands_and_readiness` |
| `TV-56A` | `existing_corpus_vector` | `trust_upstream_gate_cap`, `trust_scoring_bands_and_readiness` |
| `TV-56B` | `existing_corpus_vector` | `trust_input_admissibility_and_basis`, `trust_scoring_bands_and_readiness` |
| `TV-56C` | `existing_corpus_vector` | `formula_reason_code_emission` |
| `TV-56D` | `existing_corpus_vector` | `trust_scoring_bands_and_readiness` |
| `TV-56E` | `existing_corpus_vector` | `trust_scoring_bands_and_readiness` |
| `TV-56F` | `existing_corpus_vector` | `trust_input_admissibility_and_basis`, `trust_currency_and_recalculation`, `trust_scoring_bands_and_readiness` |
| `TV-56G` | `existing_corpus_vector` | `trust_authority_uncertainty`, `trust_scoring_bands_and_readiness` |
| `TV-57` | `existing_corpus_vector` | `trust_currency_and_recalculation` |
| `TV-58` | `existing_corpus_vector` | `trust_currency_and_recalculation`, `aggregate_parity`, `trust_scoring_bands_and_readiness` |
| `FORMULA-DQ-01` | `planned_from_source_gap` | `data_quality_and_completeness` |
| `FORMULA-DQ-02` | `planned_from_source_gap` | `data_quality_and_completeness` |
| `FORMULA-COMPUTE-01` | `planned_from_source_gap` | `record_and_adjustment_compute` |
| `FORMULA-FORECAST-01` | `planned_from_source_gap` | `forecast` |
| `FORMULA-RISK-01` | `planned_from_source_gap` | `risk_scoring` |
| `FORMULA-PARITY-01` | `planned_from_source_gap` | `parity_comparison_set_construction`, `per_field_parity`, `aggregate_parity` |
| `FORMULA-GRAPH-01` | `planned_from_source_gap` | `evidence_graph_quality` |
| `FORMULA-WORK-01` | `planned_from_source_gap` | `collaboration_orchestration_queue_routing` |
| `FORMULA-CLIENT-01` | `planned_from_source_gap` | `client_flow_reliability_and_completion` |

## Edge-Case Notes

- Exact-decimal money semantics, canonical decimal-string serialization, and declared aggregation boundaries are binding implementation requirements.
- `projection_*` confidence terms remain read-side only.
- Silent limitation ambiguity, invalid weight profiles, stale or contradictory trust inputs, and invalid override dependencies are fail-closed states rather than advisory warnings.

