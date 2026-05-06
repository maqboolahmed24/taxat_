CREATE SCHEMA IF NOT EXISTS control_compute;

CREATE TABLE IF NOT EXISTS control_compute.gate_decision_record_register (
  gate_decision_id text PRIMARY KEY,
  gate_decision_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  gate_code text NOT NULL CHECK (
    gate_code IN (
      'MANIFEST_GATE',
      'ARTIFACT_CONTRACT_GATE',
      'INPUT_BOUNDARY_GATE',
      'DATA_QUALITY_GATE',
      'RETENTION_EVIDENCE_GATE',
      'PARITY_GATE',
      'TRUST_GATE',
      'AMENDMENT_GATE',
      'FILING_GATE',
      'SUBMISSION_GATE'
    )
  ),
  gate_stage_index integer NOT NULL CHECK (gate_stage_index BETWEEN 1 AND 10),
  gate_class text NOT NULL CHECK (gate_class = 'NON_ACCESS'),
  decision text NOT NULL CHECK (
    decision IN ('PASS', 'PASS_WITH_NOTICE', 'MANUAL_REVIEW', 'OVERRIDABLE_BLOCK', 'HARD_BLOCK')
  ),
  severity text NOT NULL CHECK (severity IN ('INFO', 'NOTICE', 'WARNING', 'ERROR', 'CRITICAL')),
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  dominant_reason_code text NOT NULL,
  plain_explanation text NOT NULL CHECK (length(plain_explanation) BETWEEN 1 AND 200),
  decision_explainability_contract jsonb NOT NULL,
  gate_semantics_contract jsonb NOT NULL,
  truth_boundary_contract jsonb NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_basis_ref text NOT NULL,
  input_artifact_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  prerequisite_gate_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocking_dependency_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  overrideability text NOT NULL CHECK (
    overrideability IN ('NONE', 'SCOPED_OVERRIDE_ALLOWED', 'SCOPED_OVERRIDE_REQUIRED', 'NON_OVERRIDEABLE')
  ),
  override_resolution_state text NOT NULL CHECK (
    override_resolution_state IN ('NOT_APPLICABLE', 'NO_VALID_OVERRIDE', 'VALID_OVERRIDE_ACTIVE')
  ),
  active_override_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_override_scope text,
  next_action_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  policy_version_ref text NOT NULL,
  effective_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  gate_decision_record jsonb NOT NULL,
  gate_decision_record_row_version bigint NOT NULL DEFAULT 1 CHECK (gate_decision_record_row_version = 1),
  decided_at timestamptz NOT NULL,
  persisted_at timestamptz NOT NULL,
  CONSTRAINT gate_decision_manifest_stage_uniq UNIQUE (manifest_id, gate_stage_index),
  CONSTRAINT gate_decision_manifest_code_uniq UNIQUE (manifest_id, gate_code),
  CONSTRAINT gate_decision_reason_dominant_chk CHECK (
    jsonb_typeof(reason_codes) = 'array'
    AND jsonb_array_length(reason_codes) BETWEEN 1 AND 8
    AND reason_codes ->> 0 = dominant_reason_code
    AND decision_explainability_contract ->> 'dominant_reason_code' = dominant_reason_code
  ),
  CONSTRAINT gate_decision_effective_scope_reporting_first_chk CHECK (
    jsonb_typeof(effective_scope) = 'array'
    AND jsonb_array_length(effective_scope) BETWEEN 1 AND 5
    AND effective_scope ->> 0 IN ('year_end', 'quarterly_update', 'estimate_only')
    AND (
      (CASE WHEN effective_scope ? 'year_end' THEN 1 ELSE 0 END) +
      (CASE WHEN effective_scope ? 'quarterly_update' THEN 1 ELSE 0 END) +
      (CASE WHEN effective_scope ? 'estimate_only' THEN 1 ELSE 0 END)
    ) = 1
  ),
  CONSTRAINT gate_decision_stage_code_chk CHECK (
    (
      gate_code = 'MANIFEST_GATE'
      AND gate_stage_index = 1
      AND jsonb_array_length(prerequisite_gate_refs) = 0
    )
    OR (
      gate_code = 'ARTIFACT_CONTRACT_GATE'
      AND gate_stage_index = 2
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'INPUT_BOUNDARY_GATE'
      AND gate_stage_index = 3
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'DATA_QUALITY_GATE'
      AND gate_stage_index = 4
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'RETENTION_EVIDENCE_GATE'
      AND gate_stage_index = 5
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'PARITY_GATE'
      AND gate_stage_index = 6
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'TRUST_GATE'
      AND gate_stage_index = 7
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'AMENDMENT_GATE'
      AND gate_stage_index = 8
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'FILING_GATE'
      AND gate_stage_index = 9
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
    OR (
      gate_code = 'SUBMISSION_GATE'
      AND gate_stage_index = 10
      AND jsonb_array_length(prerequisite_gate_refs) > 0
    )
  ),
  CONSTRAINT gate_decision_no_valid_override_chk CHECK (
    override_resolution_state <> 'NO_VALID_OVERRIDE'
    OR (
      decision = 'OVERRIDABLE_BLOCK'
      AND overrideability IN ('SCOPED_OVERRIDE_ALLOWED', 'SCOPED_OVERRIDE_REQUIRED')
      AND required_override_scope IS NOT NULL
      AND jsonb_array_length(active_override_refs) = 0
    )
  ),
  CONSTRAINT gate_decision_valid_override_active_chk CHECK (
    override_resolution_state <> 'VALID_OVERRIDE_ACTIVE'
    OR (
      decision IN ('PASS', 'PASS_WITH_NOTICE', 'MANUAL_REVIEW')
      AND overrideability = 'NONE'
      AND required_override_scope IS NULL
      AND jsonb_array_length(active_override_refs) > 0
      AND gate_semantics_contract ->> 'override_dependency_state' = 'VALID_OVERRIDE_GOVERNED'
    )
  ),
  CONSTRAINT gate_decision_decision_posture_chk CHECK (
    (
      decision = 'PASS'
      AND severity = 'INFO'
      AND jsonb_array_length(next_action_codes) = 0
      AND jsonb_array_length(blocking_dependency_refs) = 0
      AND overrideability = 'NONE'
      AND override_resolution_state IN ('NOT_APPLICABLE', 'VALID_OVERRIDE_ACTIVE')
      AND required_override_scope IS NULL
      AND gate_semantics_contract ->> 'decision_rank' = '0'
      AND gate_semantics_contract ->> 'progression_rank' = '2'
    )
    OR (
      decision = 'PASS_WITH_NOTICE'
      AND severity = 'NOTICE'
      AND jsonb_array_length(blocking_dependency_refs) = 0
      AND overrideability = 'NONE'
      AND override_resolution_state IN ('NOT_APPLICABLE', 'VALID_OVERRIDE_ACTIVE')
      AND required_override_scope IS NULL
      AND gate_semantics_contract ->> 'decision_rank' = '1'
      AND gate_semantics_contract ->> 'progression_rank' = '2'
    )
    OR (
      decision = 'MANUAL_REVIEW'
      AND severity = 'WARNING'
      AND jsonb_array_length(next_action_codes) > 0
      AND overrideability = 'NONE'
      AND override_resolution_state IN ('NOT_APPLICABLE', 'VALID_OVERRIDE_ACTIVE')
      AND required_override_scope IS NULL
      AND gate_semantics_contract ->> 'decision_rank' = '2'
      AND gate_semantics_contract ->> 'progression_rank' = '1'
    )
    OR (
      decision = 'OVERRIDABLE_BLOCK'
      AND severity = 'ERROR'
      AND jsonb_array_length(next_action_codes) > 0
      AND overrideability IN ('SCOPED_OVERRIDE_ALLOWED', 'SCOPED_OVERRIDE_REQUIRED')
      AND override_resolution_state = 'NO_VALID_OVERRIDE'
      AND required_override_scope IS NOT NULL
      AND gate_semantics_contract ->> 'decision_rank' = '3'
      AND gate_semantics_contract ->> 'progression_rank' = '0'
    )
    OR (
      decision = 'HARD_BLOCK'
      AND severity = 'CRITICAL'
      AND jsonb_array_length(next_action_codes) > 0
      AND overrideability = 'NON_OVERRIDEABLE'
      AND override_resolution_state = 'NOT_APPLICABLE'
      AND required_override_scope IS NULL
      AND gate_semantics_contract ->> 'decision_rank' = '4'
      AND gate_semantics_contract ->> 'progression_rank' = '0'
    )
  )
);

CREATE INDEX IF NOT EXISTS gate_decision_manifest_stage_idx
  ON control_compute.gate_decision_record_register (manifest_id, gate_stage_index);

CREATE INDEX IF NOT EXISTS gate_decision_gate_code_idx
  ON control_compute.gate_decision_record_register (gate_code);

CREATE INDEX IF NOT EXISTS gate_decision_decision_idx
  ON control_compute.gate_decision_record_register (decision);

CREATE INDEX IF NOT EXISTS gate_decision_severity_idx
  ON control_compute.gate_decision_record_register (severity);

CREATE INDEX IF NOT EXISTS gate_decision_policy_version_idx
  ON control_compute.gate_decision_record_register (policy_version_ref);

ALTER TABLE control_compute.gate_decision_record_register ENABLE ROW LEVEL SECURITY;
