-- phase03_0121_compute_result.sql
-- Governed post-seal ComputeResult register and lifecycle transition ledger.

CREATE SCHEMA IF NOT EXISTS control_compute;

CREATE TABLE IF NOT EXISTS control_compute.compute_result_register (
  compute_id text PRIMARY KEY,
  compute_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  artifact_type text NOT NULL DEFAULT 'ComputeResult',
  execution_mode text NOT NULL,
  analysis_only boolean NOT NULL,
  non_compliance_config_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  counterfactual_basis text NULL,
  lifecycle_state text NOT NULL,
  rule_version_ref text NOT NULL,
  reporting_scope text NOT NULL,
  effective_partition_scope_refs jsonb NOT NULL,
  basis_profile_ref_or_null text NULL,
  quarterly_basis_profile_or_null text NULL,
  adjustment_inclusion_policy text NOT NULL,
  adjustment_scope_source text NOT NULL,
  money_profile jsonb NOT NULL,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  diagnostic_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnostic_artifact_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NULL,
  contract jsonb NOT NULL,
  compute_payload jsonb NOT NULL,
  compute_result_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (artifact_type = 'ComputeResult'),
  CHECK (compute_ref LIKE 'compute-result://%'),
  CHECK (execution_mode IN ('COMPLIANCE', 'ANALYSIS')),
  CHECK (jsonb_typeof(non_compliance_config_refs) = 'array'),
  CHECK (
    (analysis_only = false AND execution_mode = 'COMPLIANCE')
    OR (analysis_only = true AND execution_mode = 'ANALYSIS')
  ),
  CHECK (
    execution_mode <> 'COMPLIANCE'
    OR (
      counterfactual_basis IS NULL
      AND jsonb_array_length(non_compliance_config_refs) = 0
      AND adjustment_scope_source = 'EXECUTABLE_REPORTING_SCOPE'
    )
  ),
  CHECK (
    execution_mode <> 'ANALYSIS'
    OR counterfactual_basis IS NOT NULL
  ),
  CHECK (lifecycle_state IN (
    'NOT_RUN',
    'RUNNING',
    'COMPUTED',
    'BLOCKED',
    'SUPERSEDED'
  )),
  CHECK (reporting_scope IN ('year_end', 'quarterly_update', 'estimate_only')),
  CHECK (jsonb_typeof(effective_partition_scope_refs) = 'array'),
  CHECK (jsonb_array_length(effective_partition_scope_refs) > 0),
  CHECK (quarterly_basis_profile_or_null IS NULL OR quarterly_basis_profile_or_null IN ('PERIODIC', 'CUMULATIVE')),
  CHECK (
    reporting_scope = 'quarterly_update'
    OR quarterly_basis_profile_or_null IS NULL
  ),
  CHECK (
    reporting_scope <> 'quarterly_update'
    OR (
      quarterly_basis_profile_or_null IN ('PERIODIC', 'CUMULATIVE')
      AND adjustment_inclusion_policy = 'RECORD_ONLY'
    )
  ),
  CHECK (adjustment_inclusion_policy IN ('RECORD_ONLY', 'APPLY_SCOPE_FILTERED_ADJUSTMENTS')),
  CHECK (adjustment_scope_source IN ('EXECUTABLE_REPORTING_SCOPE', 'COUNTERFACTUAL_ANALYSIS_SCOPE')),
  CHECK (
    adjustment_inclusion_policy <> 'APPLY_SCOPE_FILTERED_ADJUSTMENTS'
    OR reporting_scope IN ('year_end', 'estimate_only')
  ),
  CHECK (jsonb_typeof(money_profile) = 'object'),
  CHECK (money_profile ? 'currency_code'),
  CHECK (money_profile ? 'scale'),
  CHECK (money_profile ? 'rounding_mode'),
  CHECK (money_profile ->> 'serialization_profile' = 'CANONICAL_DECIMAL_STRING_V1'),
  CHECK (jsonb_typeof(totals) = 'object'),
  CHECK (jsonb_typeof(assumptions) = 'object'),
  CHECK (jsonb_typeof(diagnostic_reason_codes) = 'array'),
  CHECK (jsonb_typeof(diagnostic_artifact_refs) = 'array'),
  CHECK (
    lifecycle_state NOT IN ('NOT_RUN', 'RUNNING')
    OR (
      jsonb_object_length(totals) = 0
      AND jsonb_array_length(diagnostic_reason_codes) = 0
      AND jsonb_array_length(diagnostic_artifact_refs) = 0
      AND computed_at IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'BLOCKED'
    OR (
      jsonb_object_length(totals) = 0
      AND jsonb_array_length(diagnostic_reason_codes) > 0
      AND jsonb_array_length(diagnostic_artifact_refs) > 0
      AND computed_at IS NULL
    )
  ),
  CHECK (
    lifecycle_state NOT IN ('COMPUTED', 'SUPERSEDED')
    OR (
      jsonb_object_length(totals) > 0
      AND computed_at IS NOT NULL
    )
  ),
  CHECK (jsonb_typeof(contract) = 'object'),
  CHECK (contract ->> 'artifact_id' = compute_ref),
  CHECK (contract ->> 'artifact_type' = 'ComputeResult'),
  CHECK (jsonb_typeof(compute_payload) = 'object'),
  CHECK (compute_payload ->> 'compute_id' = compute_id),
  CHECK (compute_payload ->> 'manifest_id' = manifest_id),
  CHECK (compute_payload ->> 'artifact_type' = 'ComputeResult'),
  CHECK (compute_payload ->> 'lifecycle_state' = lifecycle_state)
);

CREATE TABLE IF NOT EXISTS control_compute.compute_result_transition_log (
  transition_id text PRIMARY KEY,
  compute_id text NOT NULL REFERENCES control_compute.compute_result_register(compute_id),
  from_lifecycle_state text NULL,
  to_lifecycle_state text NOT NULL,
  event_code text NOT NULL,
  transition_audit_ref text NOT NULL,
  transitioned_at timestamptz NOT NULL,
  compute_result_row_version integer NOT NULL,
  CHECK (event_code IN (
    'compute_start',
    'compute_success',
    'data_or_policy_block',
    'newer_manifest_compute'
  ))
);

CREATE INDEX IF NOT EXISTS compute_result_manifest_idx
  ON control_compute.compute_result_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS compute_result_lifecycle_idx
  ON control_compute.compute_result_register (lifecycle_state, updated_at);

CREATE INDEX IF NOT EXISTS compute_result_reporting_scope_idx
  ON control_compute.compute_result_register (manifest_id, reporting_scope, persisted_at);

CREATE INDEX IF NOT EXISTS compute_result_rule_version_idx
  ON control_compute.compute_result_register (rule_version_ref, persisted_at);

CREATE INDEX IF NOT EXISTS compute_result_transition_idx
  ON control_compute.compute_result_transition_log (compute_id, transitioned_at);

ALTER TABLE control_compute.compute_result_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_compute.compute_result_transition_log ENABLE ROW LEVEL SECURITY;
