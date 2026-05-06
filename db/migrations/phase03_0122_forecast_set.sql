-- phase03_0122_forecast_set.sql
-- Governed analysis-only ForecastSet register.

CREATE SCHEMA IF NOT EXISTS control_compute;

CREATE TABLE IF NOT EXISTS control_compute.forecast_set_register (
  forecast_id text PRIMARY KEY,
  forecast_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  artifact_type text NOT NULL DEFAULT 'ForecastSet',
  execution_mode text NOT NULL DEFAULT 'ANALYSIS',
  analysis_only boolean NOT NULL DEFAULT true,
  non_compliance_config_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  counterfactual_basis text NOT NULL,
  forecast_profile_ref text NOT NULL,
  baseline_compute_ref text NOT NULL,
  money_profile jsonb NOT NULL,
  scenario_mode text NOT NULL,
  point_forecasts jsonb NOT NULL,
  scenarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  seeds jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL,
  contract jsonb NOT NULL,
  forecast_payload jsonb NOT NULL,
  forecast_set_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  CHECK (artifact_type = 'ForecastSet'),
  CHECK (forecast_ref LIKE 'forecast-set://%'),
  CHECK (execution_mode = 'ANALYSIS'),
  CHECK (analysis_only = true),
  CHECK (jsonb_typeof(non_compliance_config_refs) = 'array'),
  CHECK (length(counterfactual_basis) > 0),
  CHECK (length(forecast_profile_ref) > 0),
  CHECK (length(baseline_compute_ref) > 0),
  CHECK (baseline_compute_ref LIKE 'compute-result://%'),
  CHECK (jsonb_typeof(money_profile) = 'object'),
  CHECK (money_profile ->> 'serialization_profile' = 'CANONICAL_DECIMAL_STRING_V1'),
  CHECK (scenario_mode IN ('POINT_ONLY', 'MONTE_CARLO')),
  CHECK (jsonb_typeof(point_forecasts) = 'array'),
  CHECK (jsonb_array_length(point_forecasts) > 0),
  CHECK (jsonb_typeof(scenarios) = 'array'),
  CHECK (jsonb_typeof(seeds) = 'array'),
  CHECK (
    scenario_mode <> 'POINT_ONLY'
    OR (
      jsonb_array_length(scenarios) = 0
      AND jsonb_array_length(seeds) = 0
    )
  ),
  CHECK (
    scenario_mode <> 'MONTE_CARLO'
    OR (
      jsonb_array_length(scenarios) > 0
      AND jsonb_array_length(seeds) > 0
    )
  ),
  CHECK (jsonb_typeof(contract) = 'object'),
  CHECK (contract ->> 'artifact_id' = forecast_ref),
  CHECK (contract ->> 'artifact_type' = 'ForecastSet'),
  CHECK (jsonb_typeof(forecast_payload) = 'object'),
  CHECK (forecast_payload ->> 'forecast_id' = forecast_id),
  CHECK (forecast_payload ->> 'manifest_id' = manifest_id),
  CHECK (forecast_payload ->> 'artifact_type' = 'ForecastSet'),
  CHECK (forecast_payload ->> 'execution_mode' = 'ANALYSIS')
);

CREATE INDEX IF NOT EXISTS forecast_set_manifest_idx
  ON control_compute.forecast_set_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS forecast_set_baseline_compute_idx
  ON control_compute.forecast_set_register (baseline_compute_ref, persisted_at);

CREATE INDEX IF NOT EXISTS forecast_set_profile_idx
  ON control_compute.forecast_set_register (forecast_profile_ref, persisted_at);

CREATE INDEX IF NOT EXISTS forecast_set_scenario_mode_idx
  ON control_compute.forecast_set_register (scenario_mode, persisted_at);

ALTER TABLE control_compute.forecast_set_register ENABLE ROW LEVEL SECURITY;
