CREATE SCHEMA IF NOT EXISTS meta_migration AUTHORIZATION pg_control_owner;

CREATE TABLE IF NOT EXISTS meta_migration.schema_migration_ledger (
  migration_id text PRIMARY KEY,
  datastore_ref text NOT NULL,
  target_version text NOT NULL UNIQUE,
  target_schema_bundle_hash text NOT NULL,
  compatibility_window_ref text NOT NULL,
  contract_phase_required boolean NOT NULL,
  phase_state text NOT NULL,
  state_transition_contract jsonb NOT NULL,
  schema_reader_window_contract jsonb NOT NULL,
  backfill_execution_contract jsonb NOT NULL,
  applied_at timestamptz,
  verified_at timestamptz,
  rollback_class text NOT NULL,
  verification_ref text,
  halted_subphase text,
  compatibility_window_closed_at timestamptz,
  failure_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    phase_state IN (
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
    )
  ),
  CHECK (rollback_class IN ('ROLLBACK_SAFE', 'FAIL_FORWARD_ONLY')),
  CHECK (halted_subphase IN ('APPLYING', 'VERIFYING', 'CONTRACTING') OR halted_subphase IS NULL),
  CHECK (
    (phase_state = 'PLANNED' AND applied_at IS NULL)
    OR phase_state <> 'PLANNED'
  ),
  CHECK (
    compatibility_window_closed_at IS NULL
    OR rollback_class = 'FAIL_FORWARD_ONLY'
  )
);

CREATE TABLE IF NOT EXISTS meta_migration.backfill_execution_run (
  backfill_run_ref text PRIMARY KEY,
  migration_id text NOT NULL REFERENCES meta_migration.schema_migration_ledger(migration_id),
  execution_state text NOT NULL,
  resume_token text,
  audit_ref text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (execution_state IN ('PLANNED', 'IN_PROGRESS', 'COMPLETE', 'HALTED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS meta_migration.migration_lock_register (
  lock_name text PRIMARY KEY,
  lock_scope text NOT NULL,
  lock_key_ref text NOT NULL UNIQUE,
  preferred_pg_function text NOT NULL,
  session_lock_allowed boolean NOT NULL DEFAULT false,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  CHECK (lock_scope = 'TRANSACTION_SCOPED'),
  CHECK (preferred_pg_function = 'pg_advisory_xact_lock')
);

INSERT INTO meta_migration.migration_lock_register (
  lock_name,
  lock_scope,
  lock_key_ref,
  preferred_pg_function,
  session_lock_allowed,
  notes
)
VALUES (
  'control-plane-db-migration-singleton',
  'TRANSACTION_SCOPED',
  'control-plane-db-primary-control-store',
  'pg_advisory_xact_lock',
  false,
  jsonb_build_array(
    'Default singleton posture is a transaction-scoped advisory lock.',
    'Session-scoped locks are reserved for explicit break-glass maintenance.'
  )
)
ON CONFLICT (lock_name) DO NOTHING;

COMMENT ON TABLE meta_migration.schema_migration_ledger IS
  'Durable phase-state lineage for expand, backfill, verify, contract, halt, failure, rollback, and fail-forward posture.';

COMMENT ON TABLE meta_migration.backfill_execution_run IS
  'Resumable backfill execution evidence kept separate from structural DDL application.';

COMMENT ON TABLE meta_migration.migration_lock_register IS
  'Declared singleton lock posture for migration execution; transaction-scoped advisory locking is the default.';
