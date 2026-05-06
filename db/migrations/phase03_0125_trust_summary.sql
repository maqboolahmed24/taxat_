CREATE SCHEMA IF NOT EXISTS control_compute;

CREATE TABLE IF NOT EXISTS control_compute.trust_summary_register (
  trust_id text PRIMARY KEY,
  trust_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  execution_mode text NOT NULL CHECK (execution_mode IN ('COMPLIANCE', 'ANALYSIS')),
  analysis_only boolean NOT NULL,
  non_compliance_config_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  counterfactual_basis text,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('SYNTHESIZED', 'SUPERSEDED')),
  compute_result_ref text NOT NULL,
  parity_result_ref text NOT NULL,
  risk_report_ref text NOT NULL,
  evidence_graph_ref text NOT NULL,
  gate_decision_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  comparison_requirement text NOT NULL CHECK (
    comparison_requirement IN ('MANDATORY', 'DESIRABLE', 'NOT_REQUIRED')
  ),
  parity_classification text NOT NULL CHECK (
    parity_classification IN (
      'MATCH',
      'MINOR_DIFFERENCE',
      'MATERIAL_DIFFERENCE',
      'BLOCKING_DIFFERENCE',
      'NOT_COMPARABLE'
    )
  ),
  baseline_submission_state text NOT NULL CHECK (
    baseline_submission_state IN (
      'KNOWN_MATCHED',
      'KNOWN_FILED',
      'UNKNOWN',
      'OUT_OF_BAND_UNRECONCILED',
      'NOT_APPLICABLE'
    )
  ),
  live_authority_progression_requested boolean NOT NULL,
  completeness_score integer NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 100),
  data_quality_score integer NOT NULL CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  parity_score integer NOT NULL CHECK (parity_score >= 0 AND parity_score <= 100),
  graph_quality_score integer NOT NULL CHECK (graph_quality_score >= 0 AND graph_quality_score <= 100),
  risk_score integer NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  trust_core_score numeric NOT NULL CHECK (trust_core_score >= 0 AND trust_core_score <= 100),
  score_band text NOT NULL CHECK (score_band IN ('RED', 'AMBER', 'GREEN')),
  cap_band text NOT NULL CHECK (cap_band IN ('INSUFFICIENT_DATA', 'RED', 'AMBER', 'GREEN')),
  trust_band text NOT NULL CHECK (trust_band IN ('INSUFFICIENT_DATA', 'RED', 'AMBER', 'GREEN')),
  trust_score integer NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  trust_input_state text NOT NULL CHECK (
    trust_input_state IN ('ADMISSIBLE_CURRENT', 'ADMISSIBLE_STALE', 'INCOMPLETE', 'CONTRADICTED')
  ),
  threshold_stability_state text NOT NULL CHECK (threshold_stability_state IN ('STABLE', 'EDGE_REVIEW')),
  upstream_gate_cap text NOT NULL CHECK (
    upstream_gate_cap IN ('AUTO_ELIGIBLE', 'NOTICE_ONLY', 'REVIEW_ONLY', 'BLOCKED')
  ),
  trust_green_margin integer NOT NULL,
  trust_amber_margin integer NOT NULL,
  risk_automation_margin integer NOT NULL,
  active_filing_critical_override_count integer NOT NULL DEFAULT 0 CHECK (
    active_filing_critical_override_count >= 0
  ),
  critical_retention_limited_count integer NOT NULL DEFAULT 0 CHECK (
    critical_retention_limited_count >= 0
  ),
  unresolved_material_blocking_risk_flag boolean NOT NULL,
  unresolved_blocking_risk_flag boolean NOT NULL,
  override_penalty integer NOT NULL CHECK (override_penalty IN (0, 5, 10, 15, 20)),
  retention_penalty integer NOT NULL CHECK (retention_penalty IN (0, 20)),
  authority_uncertainty_score integer NOT NULL CHECK (
    authority_uncertainty_score >= 0 AND authority_uncertainty_score <= 100
  ),
  authority_penalty integer NOT NULL CHECK (authority_penalty >= 0 AND authority_penalty <= 30),
  trust_level text NOT NULL CHECK (trust_level IN ('READY', 'REVIEW_REQUIRED', 'BLOCKED')),
  automation_level text NOT NULL CHECK (automation_level IN ('ALLOWED', 'LIMITED', 'BLOCKED')),
  filing_readiness text NOT NULL CHECK (
    filing_readiness IN ('NOT_READY', 'READY_REVIEW', 'READY_TO_SUBMIT')
  ),
  dominant_reason_code text NOT NULL,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_constraint_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocking_dependency_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_human_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  temporal_propagation_event_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  support_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  trust_input_basis_contract jsonb NOT NULL,
  trust_sensitivity_analysis_contract jsonb NOT NULL,
  decision_explainability_contract jsonb NOT NULL,
  plain_summary text NOT NULL,
  trust_summary jsonb NOT NULL,
  trust_summary_contract jsonb NOT NULL,
  trust_summary_row_version bigint NOT NULL DEFAULT 1 CHECK (trust_summary_row_version > 0),
  trust_fresh_until timestamptz,
  persisted_at timestamptz NOT NULL,
  synthesized_at timestamptz NOT NULL,
  superseded_at timestamptz,
  superseded_by_trust_id text,
  CONSTRAINT trust_summary_execution_boundary_chk CHECK (
    (
      execution_mode = 'COMPLIANCE'
      AND analysis_only = false
      AND counterfactual_basis IS NULL
      AND jsonb_array_length(non_compliance_config_refs) = 0
    )
    OR (
      execution_mode = 'ANALYSIS'
      AND analysis_only = true
      AND counterfactual_basis IS NOT NULL
      AND length(counterfactual_basis) > 0
      AND reason_codes ? 'TRUST_ANALYSIS_MODE_CAP'
      AND trust_band IN ('AMBER', 'RED', 'INSUFFICIENT_DATA')
      AND automation_level IN ('LIMITED', 'BLOCKED')
      AND filing_readiness IN ('NOT_READY', 'READY_REVIEW')
    )
  ),
  CONSTRAINT trust_summary_lifecycle_chk CHECK (
    (
      lifecycle_state = 'SYNTHESIZED'
      AND superseded_at IS NULL
      AND superseded_by_trust_id IS NULL
    )
    OR (
      lifecycle_state = 'SUPERSEDED'
      AND superseded_at IS NOT NULL
      AND superseded_by_trust_id IS NOT NULL
    )
  ),
  CONSTRAINT trust_summary_automation_readiness_bridge_chk CHECK (
    (automation_level = 'ALLOWED' AND filing_readiness = 'READY_TO_SUBMIT')
    OR (automation_level = 'LIMITED' AND filing_readiness = 'READY_REVIEW')
    OR (automation_level = 'BLOCKED' AND filing_readiness = 'NOT_READY')
  ),
  CONSTRAINT trust_summary_green_posture_chk CHECK (
    trust_band <> 'GREEN'
    OR (
      trust_level = 'READY'
      AND automation_level = 'ALLOWED'
      AND filing_readiness = 'READY_TO_SUBMIT'
      AND trust_score >= 85
      AND trust_green_margin >= 0
      AND parity_classification IN ('MATCH', 'MINOR_DIFFERENCE')
      AND trust_input_state = 'ADMISSIBLE_CURRENT'
      AND threshold_stability_state = 'STABLE'
      AND active_filing_critical_override_count = 0
      AND critical_retention_limited_count = 0
      AND unresolved_material_blocking_risk_flag = false
      AND unresolved_blocking_risk_flag = false
      AND execution_mode = 'COMPLIANCE'
      AND reason_codes ? 'TRUST_GREEN'
    )
  ),
  CONSTRAINT trust_summary_amber_posture_chk CHECK (
    trust_band <> 'AMBER'
    OR (
      trust_level = 'REVIEW_REQUIRED'
      AND automation_level = 'LIMITED'
      AND filing_readiness = 'READY_REVIEW'
      AND trust_score >= 65
      AND trust_amber_margin >= 0
      AND unresolved_blocking_risk_flag = false
      AND reason_codes ? 'TRUST_AMBER'
      AND reason_codes ? 'TRUST_AUTOMATION_LIMITED'
    )
  ),
  CONSTRAINT trust_summary_red_or_insufficient_posture_chk CHECK (
    trust_band NOT IN ('RED', 'INSUFFICIENT_DATA')
    OR (
      trust_level = 'BLOCKED'
      AND automation_level = 'BLOCKED'
      AND filing_readiness = 'NOT_READY'
      AND (
        (trust_band = 'RED' AND reason_codes ? 'TRUST_RED')
        OR (trust_band = 'INSUFFICIENT_DATA' AND reason_codes ? 'TRUST_INSUFFICIENT_DATA')
      )
    )
  ),
  CONSTRAINT trust_summary_cap_band_chk CHECK (
    (cap_band = 'INSUFFICIENT_DATA' AND trust_band = 'INSUFFICIENT_DATA')
    OR (cap_band = 'RED' AND trust_band = 'RED')
    OR cap_band IN ('AMBER', 'GREEN')
  ),
  CONSTRAINT trust_summary_input_state_chk CHECK (
    trust_input_state NOT IN ('INCOMPLETE', 'CONTRADICTED')
    OR (
      trust_band = 'INSUFFICIENT_DATA'
      AND automation_level = 'BLOCKED'
      AND filing_readiness = 'NOT_READY'
      AND jsonb_array_length(blocking_dependency_refs) > 0
    )
  ),
  CONSTRAINT trust_summary_edge_review_chk CHECK (
    threshold_stability_state <> 'EDGE_REVIEW'
    OR (
      trust_band IN ('AMBER', 'RED', 'INSUFFICIENT_DATA')
      AND automation_level IN ('LIMITED', 'BLOCKED')
      AND filing_readiness IN ('NOT_READY', 'READY_REVIEW')
      AND reason_codes ? 'TRUST_THRESHOLD_EDGE_REVIEW'
    )
  ),
  CONSTRAINT trust_summary_upstream_gate_cap_chk CHECK (
    (
      upstream_gate_cap = 'BLOCKED'
      AND trust_band IN ('RED', 'INSUFFICIENT_DATA')
      AND automation_level = 'BLOCKED'
      AND filing_readiness = 'NOT_READY'
      AND reason_codes ? 'TRUST_UPSTREAM_GATE_BLOCK'
      AND jsonb_array_length(blocking_dependency_refs) > 0
    )
    OR (
      upstream_gate_cap = 'REVIEW_ONLY'
      AND trust_band IN ('AMBER', 'RED', 'INSUFFICIENT_DATA')
      AND automation_level IN ('LIMITED', 'BLOCKED')
      AND filing_readiness IN ('NOT_READY', 'READY_REVIEW')
      AND reason_codes ? 'TRUST_UPSTREAM_GATE_REVIEW_REQUIRED'
      AND jsonb_array_length(blocking_dependency_refs) > 0
    )
    OR (
      upstream_gate_cap = 'NOTICE_ONLY'
      AND reason_codes ? 'TRUST_UPSTREAM_GATE_NOTICE_ACTIVE'
    )
    OR upstream_gate_cap = 'AUTO_ELIGIBLE'
  ),
  CONSTRAINT trust_summary_baseline_not_applicable_chk CHECK (
    baseline_submission_state <> 'NOT_APPLICABLE'
    OR (
      authority_uncertainty_score = 0
      AND authority_penalty = 0
    )
  ),
  CONSTRAINT trust_summary_threshold_projection_chk CHECK (
    trust_sensitivity_analysis_contract->>'contract_version' = 'TRUST_SENSITIVITY_V1'
    AND jsonb_array_length(trust_sensitivity_analysis_contract->'projected_case_results') = 6
  )
);

CREATE INDEX IF NOT EXISTS trust_summary_manifest_idx
  ON control_compute.trust_summary_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS trust_summary_band_idx
  ON control_compute.trust_summary_register (trust_band, persisted_at);

CREATE INDEX IF NOT EXISTS trust_summary_automation_idx
  ON control_compute.trust_summary_register (automation_level, persisted_at);

CREATE INDEX IF NOT EXISTS trust_summary_threshold_stability_idx
  ON control_compute.trust_summary_register (threshold_stability_state, persisted_at);

CREATE INDEX IF NOT EXISTS trust_summary_upstream_gate_cap_idx
  ON control_compute.trust_summary_register (upstream_gate_cap, persisted_at);

CREATE INDEX IF NOT EXISTS trust_summary_lifecycle_idx
  ON control_compute.trust_summary_register (lifecycle_state, persisted_at);

ALTER TABLE control_compute.trust_summary_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY trust_summary_register_service_rw
  ON control_compute.trust_summary_register
  USING (true)
  WITH CHECK (true);
