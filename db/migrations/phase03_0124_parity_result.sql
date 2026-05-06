CREATE SCHEMA IF NOT EXISTS control_compute;

CREATE TABLE IF NOT EXISTS control_compute.parity_result_register (
  parity_id text PRIMARY KEY,
  parity_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  execution_mode text NOT NULL CHECK (execution_mode IN ('COMPLIANCE', 'ANALYSIS')),
  analysis_only boolean NOT NULL,
  non_compliance_config_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  counterfactual_basis text,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('NOT_EVALUATED', 'EVALUATED', 'SUPERSEDED')),
  comparison_basis_ref text,
  comparison_requirement text NOT NULL CHECK (
    comparison_requirement IN ('MANDATORY', 'DESIRABLE', 'NOT_REQUIRED')
  ),
  parity_threshold_profile_ref text,
  comparison_set_state text CHECK (comparison_set_state IN ('VALID', 'INVALID')),
  ordered_field_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  money_profile jsonb NOT NULL,
  parity_classification text CHECK (
    parity_classification IN (
      'MATCH',
      'MINOR_DIFFERENCE',
      'MATERIAL_DIFFERENCE',
      'BLOCKING_DIFFERENCE',
      'NOT_COMPARABLE'
    )
  ),
  parity_score numeric CHECK (parity_score IS NULL OR (parity_score >= 0 AND parity_score <= 100)),
  comparison_coverage numeric CHECK (
    comparison_coverage IS NULL OR (comparison_coverage >= 0 AND comparison_coverage <= 1)
  ),
  weighted_parity_pressure numeric CHECK (
    weighted_parity_pressure IS NULL OR weighted_parity_pressure >= 0
  ),
  critical_blocking_field_count integer NOT NULL DEFAULT 0 CHECK (critical_blocking_field_count >= 0),
  critical_material_field_count integer NOT NULL DEFAULT 0 CHECK (critical_material_field_count >= 0),
  dominant_reason_code text,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  temporal_propagation_event_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  deltas jsonb NOT NULL DEFAULT '{}'::jsonb,
  cause_hypotheses jsonb NOT NULL DEFAULT '[]'::jsonb,
  parity_result jsonb NOT NULL,
  parity_result_contract jsonb NOT NULL,
  parity_result_row_version bigint NOT NULL DEFAULT 1 CHECK (parity_result_row_version > 0),
  persisted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  evaluated_at timestamptz,
  CONSTRAINT parity_result_execution_boundary_chk CHECK (
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
    )
  ),
  CONSTRAINT parity_result_requirement_basis_chk CHECK (
    comparison_requirement = 'NOT_REQUIRED'
    OR (
      comparison_basis_ref IS NOT NULL
      AND length(comparison_basis_ref) > 0
    )
  ),
  CONSTRAINT parity_result_not_evaluated_posture_chk CHECK (
    lifecycle_state <> 'NOT_EVALUATED'
    OR (
      parity_threshold_profile_ref IS NULL
      AND comparison_set_state IS NULL
      AND parity_classification IS NULL
      AND parity_score IS NULL
      AND comparison_coverage IS NULL
      AND weighted_parity_pressure IS NULL
      AND critical_blocking_field_count = 0
      AND critical_material_field_count = 0
      AND dominant_reason_code IS NULL
      AND jsonb_array_length(ordered_field_codes) = 0
      AND jsonb_array_length(reason_codes) = 0
      AND jsonb_object_length(deltas) = 0
      AND jsonb_array_length(cause_hypotheses) = 0
      AND evaluated_at IS NULL
    )
  ),
  CONSTRAINT parity_result_evaluated_posture_chk CHECK (
    lifecycle_state = 'NOT_EVALUATED'
    OR (
      parity_threshold_profile_ref IS NOT NULL
      AND comparison_set_state IS NOT NULL
      AND parity_classification IS NOT NULL
      AND parity_score IS NOT NULL
      AND comparison_coverage IS NOT NULL
      AND weighted_parity_pressure IS NOT NULL
      AND dominant_reason_code IS NOT NULL
      AND jsonb_array_length(reason_codes) > 0
      AND evaluated_at IS NOT NULL
    )
  ),
  CONSTRAINT parity_result_invalid_set_chk CHECK (
    comparison_set_state <> 'INVALID'
    OR (
      parity_classification = 'NOT_COMPARABLE'
      AND parity_score = 0
      AND comparison_coverage = 0
      AND weighted_parity_pressure = 0
      AND critical_blocking_field_count = 0
      AND critical_material_field_count = 0
      AND jsonb_array_length(ordered_field_codes) = 0
      AND reason_codes ? 'PARITY_COMPARISON_SET_INVALID'
    )
  ),
  CONSTRAINT parity_result_blocking_chk CHECK (
    parity_classification <> 'BLOCKING_DIFFERENCE'
    OR critical_blocking_field_count >= 1
  )
);

CREATE INDEX IF NOT EXISTS parity_result_manifest_idx
  ON control_compute.parity_result_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS parity_result_comparison_basis_idx
  ON control_compute.parity_result_register (comparison_basis_ref, persisted_at);

CREATE INDEX IF NOT EXISTS parity_result_threshold_profile_idx
  ON control_compute.parity_result_register (parity_threshold_profile_ref, persisted_at);

CREATE INDEX IF NOT EXISTS parity_result_lifecycle_idx
  ON control_compute.parity_result_register (lifecycle_state, persisted_at);

CREATE INDEX IF NOT EXISTS parity_result_classification_idx
  ON control_compute.parity_result_register (parity_classification, persisted_at);

ALTER TABLE control_compute.parity_result_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY parity_result_register_service_rw
  ON control_compute.parity_result_register
  USING (true)
  WITH CHECK (true);
