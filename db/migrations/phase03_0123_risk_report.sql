CREATE SCHEMA IF NOT EXISTS control_compute;

CREATE TABLE IF NOT EXISTS control_compute.risk_report_register (
  risk_id text PRIMARY KEY,
  risk_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  execution_mode text NOT NULL CHECK (execution_mode IN ('COMPLIANCE', 'ANALYSIS')),
  analysis_only boolean NOT NULL,
  non_compliance_config_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  counterfactual_basis text,
  risk_threshold_profile_ref text NOT NULL,
  risk_score numeric NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  feature_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  unresolved_material_blocking_risk_flag boolean NOT NULL,
  unresolved_blocking_risk_flag boolean NOT NULL,
  risk_report jsonb NOT NULL,
  risk_report_contract jsonb NOT NULL,
  risk_report_row_version bigint NOT NULL DEFAULT 1 CHECK (risk_report_row_version > 0),
  persisted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT risk_report_execution_boundary_chk CHECK (
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
  CONSTRAINT risk_report_invalid_profile_chk CHECK (
    NOT (flags ? 'RISK_WEIGHT_PROFILE_INVALID')
    OR (
      risk_score = 100
      AND jsonb_array_length(feature_scores) = 0
      AND unresolved_material_blocking_risk_flag = true
      AND unresolved_blocking_risk_flag = false
    )
  ),
  CONSTRAINT risk_report_blocking_flag_chk CHECK (
    unresolved_blocking_risk_flag = false
    OR (
      unresolved_material_blocking_risk_flag = true
      AND flags ? 'BLOCKING_RISK_UNRESOLVED'
    )
  )
);

CREATE INDEX IF NOT EXISTS risk_report_manifest_idx
  ON control_compute.risk_report_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS risk_report_threshold_profile_idx
  ON control_compute.risk_report_register (risk_threshold_profile_ref, persisted_at);

CREATE INDEX IF NOT EXISTS risk_report_execution_mode_idx
  ON control_compute.risk_report_register (execution_mode, persisted_at);

CREATE INDEX IF NOT EXISTS risk_report_unresolved_idx
  ON control_compute.risk_report_register (
    unresolved_material_blocking_risk_flag,
    unresolved_blocking_risk_flag
  );

ALTER TABLE control_compute.risk_report_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY risk_report_register_service_rw
  ON control_compute.risk_report_register
  USING (true)
  WITH CHECK (true);
