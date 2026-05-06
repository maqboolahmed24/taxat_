-- phase03_0118_snapshot.sql
-- Governed collection Snapshot assembly register and lifecycle transition ledger.

CREATE SCHEMA IF NOT EXISTS control_collection;

CREATE TABLE IF NOT EXISTS control_collection.snapshot_register (
  snapshot_id text PRIMARY KEY,
  snapshot_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  artifact_type text NOT NULL DEFAULT 'Snapshot',
  execution_mode text NOT NULL,
  analysis_only boolean NOT NULL,
  non_compliance_config_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  counterfactual_basis text NULL,
  lifecycle_state text NOT NULL,
  state_transition_contract jsonb NOT NULL,
  source_record_set_ref text NOT NULL,
  source_record_set_hash text NOT NULL,
  evidence_item_set_ref text NOT NULL,
  evidence_item_set_hash text NOT NULL,
  candidate_fact_set_ref text NOT NULL,
  candidate_fact_set_hash text NOT NULL,
  canonical_fact_set_ref text NOT NULL,
  canonical_fact_set_hash text NOT NULL,
  conflict_set_ref text NOT NULL,
  conflict_set_hash text NOT NULL,
  quality jsonb NOT NULL,
  completeness jsonb NOT NULL,
  superseded_by_snapshot_id_or_null text NULL,
  retention_limitation_ref_or_null text NULL,
  erasure_proof_ref_or_null text NULL,
  state_changed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  audit_refs jsonb NOT NULL,
  provenance_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot_payload jsonb NOT NULL,
  snapshot_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (artifact_type = 'Snapshot'),
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
    )
  ),
  CHECK (
    execution_mode <> 'ANALYSIS'
    OR counterfactual_basis IS NOT NULL
  ),
  CHECK (lifecycle_state IN (
    'BUILT',
    'VALID',
    'WARNED',
    'INVALID',
    'SUPERSEDED',
    'RETENTION_LIMITED',
    'ERASED'
  )),
  CHECK (jsonb_typeof(state_transition_contract) = 'object'),
  CHECK (state_transition_contract ->> 'object_family' = 'SNAPSHOT'),
  CHECK (state_transition_contract ->> 'machine_code' = 'SNAPSHOT_LIFECYCLE_V1'),
  CHECK (state_transition_contract ->> 'state_field_name' = 'lifecycle_state'),
  CHECK (state_transition_contract ->> 'current_state' = lifecycle_state),
  CHECK (length(source_record_set_ref) > 0),
  CHECK (length(source_record_set_hash) > 0),
  CHECK (length(evidence_item_set_ref) > 0),
  CHECK (length(evidence_item_set_hash) > 0),
  CHECK (length(candidate_fact_set_ref) > 0),
  CHECK (length(candidate_fact_set_hash) > 0),
  CHECK (length(canonical_fact_set_ref) > 0),
  CHECK (length(canonical_fact_set_hash) > 0),
  CHECK (length(conflict_set_ref) > 0),
  CHECK (length(conflict_set_hash) > 0),
  CHECK (jsonb_typeof(quality) = 'object'),
  CHECK (quality ? 'data_quality_score'),
  CHECK (((quality ->> 'data_quality_score')::numeric) >= 0),
  CHECK (((quality ->> 'data_quality_score')::numeric) <= 100),
  CHECK (jsonb_typeof(COALESCE(quality -> 'reason_codes', '[]'::jsonb)) = 'array'),
  CHECK (jsonb_typeof(COALESCE(quality -> 'invalid_domain_refs', '[]'::jsonb)) = 'array'),
  CHECK (jsonb_typeof(completeness) = 'object'),
  CHECK (completeness ? 'completeness_score'),
  CHECK (((completeness ->> 'completeness_score')::numeric) >= 0),
  CHECK (((completeness ->> 'completeness_score')::numeric) <= 100),
  CHECK (jsonb_typeof(COALESCE(completeness -> 'reason_codes', '[]'::jsonb)) = 'array'),
  CHECK (jsonb_typeof(COALESCE(completeness -> 'missing_domain_refs', '[]'::jsonb)) = 'array'),
  CHECK (
    lifecycle_state NOT IN ('WARNED', 'INVALID')
    OR jsonb_array_length(COALESCE(quality -> 'reason_codes', '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE(completeness -> 'reason_codes', '[]'::jsonb)) > 0
  ),
  CHECK (
    lifecycle_state NOT IN ('BUILT', 'VALID', 'WARNED', 'INVALID')
    OR (
      superseded_by_snapshot_id_or_null IS NULL
      AND retention_limitation_ref_or_null IS NULL
      AND erasure_proof_ref_or_null IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'SUPERSEDED'
    OR (
      superseded_by_snapshot_id_or_null IS NOT NULL
      AND retention_limitation_ref_or_null IS NULL
      AND erasure_proof_ref_or_null IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'RETENTION_LIMITED'
    OR (
      superseded_by_snapshot_id_or_null IS NULL
      AND retention_limitation_ref_or_null IS NOT NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'ERASED'
    OR (
      superseded_by_snapshot_id_or_null IS NULL
      AND erasure_proof_ref_or_null IS NOT NULL
    )
  ),
  CHECK (jsonb_typeof(audit_refs) = 'array'),
  CHECK (jsonb_array_length(audit_refs) > 0),
  CHECK (jsonb_typeof(provenance_refs) = 'array'),
  CHECK (jsonb_typeof(snapshot_payload) = 'object')
);

CREATE TABLE IF NOT EXISTS control_collection.snapshot_transition_log (
  transition_id text PRIMARY KEY,
  snapshot_id text NOT NULL REFERENCES control_collection.snapshot_register(snapshot_id),
  from_lifecycle_state text NULL,
  to_lifecycle_state text NOT NULL,
  event_code text NOT NULL,
  transition_audit_ref text NOT NULL,
  transitioned_at timestamptz NOT NULL,
  snapshot_row_version integer NOT NULL,
  CHECK (event_code IN (
    'snapshot_validation_passed',
    'snapshot_validation_warned',
    'snapshot_validation_failed',
    'snapshot_superseded',
    'snapshot_retention_limited',
    'erasure_complete'
  ))
);

CREATE INDEX IF NOT EXISTS snapshot_manifest_idx
  ON control_collection.snapshot_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS snapshot_lifecycle_idx
  ON control_collection.snapshot_register (lifecycle_state, updated_at);

CREATE INDEX IF NOT EXISTS snapshot_source_record_set_hash_idx
  ON control_collection.snapshot_register (source_record_set_hash, persisted_at);

CREATE INDEX IF NOT EXISTS snapshot_evidence_item_set_hash_idx
  ON control_collection.snapshot_register (evidence_item_set_hash, persisted_at);

CREATE INDEX IF NOT EXISTS snapshot_candidate_fact_set_hash_idx
  ON control_collection.snapshot_register (candidate_fact_set_hash, persisted_at);

CREATE INDEX IF NOT EXISTS snapshot_conflict_set_hash_idx
  ON control_collection.snapshot_register (conflict_set_hash, persisted_at);

CREATE INDEX IF NOT EXISTS snapshot_canonical_fact_set_hash_idx
  ON control_collection.snapshot_register (canonical_fact_set_hash, persisted_at);

CREATE INDEX IF NOT EXISTS snapshot_transition_idx
  ON control_collection.snapshot_transition_log (snapshot_id, transitioned_at);

ALTER TABLE control_collection.snapshot_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.snapshot_transition_log ENABLE ROW LEVEL SECURITY;
