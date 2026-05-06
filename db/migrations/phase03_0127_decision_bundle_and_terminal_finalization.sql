CREATE SCHEMA IF NOT EXISTS control_compute;

CREATE TABLE IF NOT EXISTS control_compute.decision_bundle_register (
  decision_bundle_id text PRIMARY KEY,
  manifest_id text NOT NULL,
  decision_bundle_hash text NOT NULL UNIQUE,
  decision_bundle_ref text NOT NULL UNIQUE,
  decision_status text NOT NULL,
  outcome_class text NOT NULL,
  waiting_on text NOT NULL,
  checkpoint_state text NOT NULL,
  truth_state text NOT NULL,
  dominant_reason_code text NOT NULL,
  decision_reason_codes text[] NOT NULL,
  reason_codes text[] NOT NULL,
  workflow_item_refs text[] NOT NULL DEFAULT '{}',
  next_action_codes text[] NOT NULL DEFAULT '{}',
  blocked_action_codes text[] NOT NULL DEFAULT '{}',
  actionability_state text NOT NULL,
  primary_action_code text,
  no_safe_action_reason_code text,
  suggested_detail_surface_code text,
  snapshot_id text,
  compute_id text,
  forecast_id text,
  risk_id text,
  parity_id text,
  trust_id text,
  graph_id text,
  twin_id text,
  filing_packet_id text,
  submission_record_id text,
  filing_case_id text,
  amendment_case_id text,
  replay_attestation_ref text,
  primary_proof_bundle_ref text,
  next_checkpoint_at timestamptz,
  persisted_at timestamptz NOT NULL,
  bundle_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_bundle_status_chk CHECK (
    decision_status IN ('COMPLETED', 'BLOCKED', 'REVIEW_REQUIRED')
  ),
  CONSTRAINT decision_bundle_outcome_chk CHECK (
    outcome_class IN (
      'FINAL_SUCCESS',
      'FINAL_BLOCKED',
      'HUMAN_REVIEW',
      'APPROVAL_PENDING',
      'AUTHORITY_PENDING',
      'AUTHORITY_UNKNOWN',
      'LATE_DATA_PENDING',
      'OUT_OF_BAND_REVIEW'
    )
  ),
  CONSTRAINT decision_bundle_reason_compression_chk CHECK (
    cardinality(decision_reason_codes) BETWEEN 1 AND 3
    AND decision_reason_codes = reason_codes[1:LEAST(3, cardinality(reason_codes))]
    AND dominant_reason_code = reason_codes[1]
  ),
  CONSTRAINT decision_bundle_action_available_chk CHECK (
    actionability_state <> 'ACTION_AVAILABLE'
    OR (
      primary_action_code IS NOT NULL
      AND primary_action_code = ANY(next_action_codes)
      AND NOT primary_action_code = ANY(blocked_action_codes)
      AND no_safe_action_reason_code IS NULL
      AND suggested_detail_surface_code IS NULL
    )
  ),
  CONSTRAINT decision_bundle_no_safe_action_chk CHECK (
    actionability_state <> 'NO_SAFE_ACTION'
    OR (
      primary_action_code IS NULL
      AND cardinality(next_action_codes) = 0
      AND no_safe_action_reason_code IS NOT NULL
      AND suggested_detail_surface_code IS NOT NULL
    )
  ),
  CONSTRAINT decision_bundle_primary_proof_graph_chk CHECK (
    primary_proof_bundle_ref IS NULL OR graph_id IS NOT NULL
  ),
  CONSTRAINT decision_bundle_twin_graph_parity_chk CHECK (
    twin_id IS NULL OR (graph_id IS NOT NULL AND parity_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS decision_bundle_manifest_idx
  ON control_compute.decision_bundle_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS decision_bundle_status_idx
  ON control_compute.decision_bundle_register (decision_status, outcome_class, waiting_on);

CREATE INDEX IF NOT EXISTS decision_bundle_checkpoint_idx
  ON control_compute.decision_bundle_register (checkpoint_state, truth_state);

ALTER TABLE control_compute.decision_bundle_register ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE control_compute.decision_bundle_register IS
  'Append-only terminal DecisionBundle register. Manifests mirror decision_bundle_hash and deterministic_outcome_hash after finalization.';

COMMENT ON CONSTRAINT decision_bundle_reason_compression_chk
  ON control_compute.decision_bundle_register IS
  'DecisionBundle.decision_reason_codes must be the first three reason_codes and dominant_reason_code must be the first ordered reason.';
