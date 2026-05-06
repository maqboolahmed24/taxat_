-- Phase-03 schema bundle, reader-window, migration-ledger, and backfill control objects.
-- Storage strategy:
--   1. `control_manifest.schema_bundle_register` stores immutable hash-addressed writer bundles
--      with the persisted reader-window contract used by manifests and config freezes.
--   2. `control_manifest.schema_bundle_entry_register` normalizes entries for schema/artifact lookup
--      while preserving the full bundle payload for exact contract validation.
--   3. `control_manifest.schema_migration_ledger_register` stores migration chronology, reader-window
--      posture, rollback class, verification evidence, and the linked backfill execution contract.

CREATE TABLE IF NOT EXISTS control_manifest.schema_bundle_register (
  schema_bundle_hash text PRIMARY KEY,
  compatibility_profile_ref text NOT NULL,
  compatibility_window_ref text NOT NULL,
  writer_schema_bundle_hash text NOT NULL,
  window_state text NOT NULL CHECK (window_state IN (
    'EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED',
    'BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED',
    'VERIFIED_PREVIOUS_READERS_SUPPORTED',
    'CONTRACT_ELIGIBLE_WINDOW_CLOSED'
  )),
  supported_reader_schema_bundle_hashes jsonb NOT NULL,
  protected_historical_schema_bundle_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at timestamptz,
  schema_reader_window_contract jsonb NOT NULL,
  bundle_payload jsonb NOT NULL,
  entry_count integer NOT NULL CHECK (entry_count >= 1),
  persisted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (writer_schema_bundle_hash = schema_bundle_hash),
  CHECK (jsonb_typeof(supported_reader_schema_bundle_hashes) = 'array' AND jsonb_array_length(supported_reader_schema_bundle_hashes) >= 1),
  CHECK (jsonb_typeof(protected_historical_schema_bundle_hashes) = 'array'),
  CHECK (jsonb_typeof(schema_reader_window_contract) = 'object'),
  CHECK (jsonb_typeof(bundle_payload) = 'object')
);

CREATE TABLE IF NOT EXISTS control_manifest.schema_bundle_entry_register (
  schema_bundle_hash text NOT NULL REFERENCES control_manifest.schema_bundle_register (schema_bundle_hash) ON UPDATE RESTRICT ON DELETE CASCADE,
  entry_order integer NOT NULL CHECK (entry_order >= 1),
  schema_id text NOT NULL,
  artifact_type text NOT NULL,
  semantic_version text NOT NULL,
  content_hash text NOT NULL,
  dialect_ref text NOT NULL,
  compatibility_class text NOT NULL,
  supersedes_schema_id text,
  writer_min_reader_version text NOT NULL,
  allowed_upgrade_kinds jsonb NOT NULL,
  entry_payload jsonb NOT NULL,
  PRIMARY KEY (schema_bundle_hash, entry_order),
  UNIQUE (schema_bundle_hash, schema_id, artifact_type),
  CHECK (jsonb_typeof(allowed_upgrade_kinds) = 'array' AND jsonb_array_length(allowed_upgrade_kinds) >= 1),
  CHECK (jsonb_typeof(entry_payload) = 'object')
);

CREATE TABLE IF NOT EXISTS control_manifest.schema_migration_ledger_register (
  migration_id text PRIMARY KEY,
  datastore_ref text NOT NULL,
  target_version text NOT NULL,
  target_schema_bundle_hash text NOT NULL REFERENCES control_manifest.schema_bundle_register (schema_bundle_hash) ON UPDATE RESTRICT ON DELETE RESTRICT,
  compatibility_window_ref text NOT NULL,
  contract_phase_required boolean NOT NULL,
  phase_state text NOT NULL CHECK (phase_state IN (
    'PLANNED',
    'APPLYING',
    'APPLIED',
    'VERIFYING',
    'VERIFIED',
    'CONTRACTING',
    'CONTRACTED',
    'HALTED',
    'FAILED',
    'SUPERSEDED'
  )),
  state_transition_contract jsonb NOT NULL,
  schema_reader_window_contract jsonb NOT NULL,
  backfill_execution_contract jsonb NOT NULL,
  applied_at timestamptz,
  verified_at timestamptz,
  rollback_class text NOT NULL CHECK (rollback_class IN ('ROLLBACK_SAFE', 'FAIL_FORWARD_ONLY')),
  verification_ref text,
  halted_subphase text CHECK (halted_subphase IS NULL OR halted_subphase IN ('APPLYING', 'VERIFYING', 'CONTRACTING')),
  compatibility_window_closed_at timestamptz,
  failure_ref text,
  ledger_payload jsonb NOT NULL,
  ledger_row_version integer NOT NULL DEFAULT 1 CHECK (ledger_row_version >= 1),
  persisted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(state_transition_contract) = 'object'),
  CHECK (jsonb_typeof(schema_reader_window_contract) = 'object'),
  CHECK (jsonb_typeof(backfill_execution_contract) = 'object'),
  CHECK (jsonb_typeof(ledger_payload) = 'object'),
  CHECK (
    (phase_state = 'PLANNED' AND applied_at IS NULL AND verified_at IS NULL AND verification_ref IS NULL AND halted_subphase IS NULL AND compatibility_window_closed_at IS NULL AND failure_ref IS NULL) OR
    (phase_state <> 'PLANNED' AND applied_at IS NOT NULL)
  ),
  CHECK (
    (phase_state IN ('VERIFYING', 'VERIFIED', 'CONTRACTING', 'CONTRACTED', 'SUPERSEDED') AND verification_ref IS NOT NULL) OR
    (phase_state NOT IN ('VERIFYING', 'VERIFIED', 'CONTRACTING', 'CONTRACTED', 'SUPERSEDED'))
  ),
  CHECK (
    (phase_state IN ('VERIFIED', 'CONTRACTING', 'CONTRACTED', 'SUPERSEDED') AND verified_at IS NOT NULL) OR
    (phase_state NOT IN ('VERIFIED', 'CONTRACTING', 'CONTRACTED', 'SUPERSEDED') AND verified_at IS NULL)
  ),
  CHECK (
    (phase_state = 'HALTED' AND halted_subphase IS NOT NULL AND failure_ref IS NOT NULL) OR
    (phase_state <> 'HALTED')
  ),
  CHECK (
    (phase_state = 'FAILED' AND halted_subphase IS NULL AND failure_ref IS NOT NULL) OR
    (phase_state <> 'FAILED')
  ),
  CHECK (
    (contract_phase_required = false AND phase_state NOT IN ('CONTRACTING', 'CONTRACTED')) OR
    contract_phase_required = true
  ),
  CHECK (
    (phase_state IN ('CONTRACTING', 'CONTRACTED') AND compatibility_window_closed_at IS NOT NULL AND rollback_class = 'FAIL_FORWARD_ONLY') OR
    phase_state NOT IN ('CONTRACTING', 'CONTRACTED')
  ),
  CHECK (
    (compatibility_window_closed_at IS NOT NULL AND rollback_class = 'FAIL_FORWARD_ONLY') OR
    compatibility_window_closed_at IS NULL
  )
);

CREATE TABLE IF NOT EXISTS control_manifest.schema_migration_ledger_transition_log (
  transition_id text PRIMARY KEY,
  migration_id text NOT NULL REFERENCES control_manifest.schema_migration_ledger_register (migration_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  ledger_row_version integer NOT NULL CHECK (ledger_row_version >= 1),
  from_phase_state text,
  to_phase_state text NOT NULL CHECK (to_phase_state IN (
    'PLANNED',
    'APPLYING',
    'APPLIED',
    'VERIFYING',
    'VERIFIED',
    'CONTRACTING',
    'CONTRACTED',
    'HALTED',
    'FAILED',
    'SUPERSEDED'
  )),
  transition_event_code text NOT NULL CHECK (transition_event_code IN (
    'start_apply',
    'apply_complete',
    'start_verify',
    'verify_success',
    'start_contract',
    'contract_complete',
    'halt',
    'fail',
    'resume_apply',
    'resume_verify',
    'resume_contract',
    'supersede'
  )),
  transition_reason_code text NOT NULL,
  transition_audit_ref text NOT NULL,
  transitioned_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schema_bundle_artifact_lookup
  ON control_manifest.schema_bundle_entry_register (artifact_type, schema_id, semantic_version);

CREATE INDEX IF NOT EXISTS schema_bundle_window_state_lookup
  ON control_manifest.schema_bundle_register (window_state, published_at DESC);

CREATE INDEX IF NOT EXISTS schema_migration_target_bundle_lookup
  ON control_manifest.schema_migration_ledger_register (target_schema_bundle_hash, phase_state, persisted_at DESC);

CREATE INDEX IF NOT EXISTS schema_migration_compatibility_window_lookup
  ON control_manifest.schema_migration_ledger_register (compatibility_window_ref, phase_state, persisted_at DESC);

CREATE INDEX IF NOT EXISTS schema_migration_phase_lookup
  ON control_manifest.schema_migration_ledger_register (phase_state, persisted_at DESC);

CREATE INDEX IF NOT EXISTS schema_migration_transition_log_lookup
  ON control_manifest.schema_migration_ledger_transition_log (migration_id, transitioned_at DESC);

COMMENT ON TABLE control_manifest.schema_bundle_register IS
  'Hash-addressed schema bundle root with persisted SCHEMA_READER_WINDOW_CONTRACT_V1 posture for manifest/config-freeze consumption.';

COMMENT ON TABLE control_manifest.schema_bundle_entry_register IS
  'Normalized schema bundle entries used for artifact lookup while preserving the immutable bundle payload.';

COMMENT ON TABLE control_manifest.schema_migration_ledger_register IS
  'SchemaMigrationLedger control row preserving expand/backfill/verify/contract chronology, verification evidence, reader-window closure, rollback class, and backfill execution posture.';
