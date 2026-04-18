-- Taxat phase-01 bootstrap for the transactional control store.
-- This migration assumes the target database already exists and is named taxat_control.
-- It intentionally freezes schemas, role aliases, migration metadata, restore metadata,
-- and RLS support scaffolding before later phase tables are introduced.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_owner') THEN
    CREATE ROLE pg_control_owner NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_migrator') THEN
    CREATE ROLE pg_control_migrator NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_runtime_api') THEN
    CREATE ROLE pg_control_runtime_api NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_orchestrator') THEN
    CREATE ROLE pg_control_orchestrator NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_worker') THEN
    CREATE ROLE pg_control_worker NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_projector_ro') THEN
    CREATE ROLE pg_control_projector_ro NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_backup_restore') THEN
    CREATE ROLE pg_control_backup_restore NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_break_glass_operator') THEN
    CREATE ROLE pg_break_glass_operator NOLOGIN;
  END IF;
END $$;

GRANT pg_control_owner TO pg_control_migrator WITH SET TRUE, INHERIT FALSE;

CREATE SCHEMA IF NOT EXISTS control_manifest AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS control_workflow AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS control_receipt AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS control_upload AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS control_authority AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS control_retention AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS control_support AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS meta_migration AUTHORIZATION pg_control_owner;
CREATE SCHEMA IF NOT EXISTS restore_verification AUTHORIZATION pg_control_owner;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA
  control_manifest,
  control_workflow,
  control_receipt,
  control_upload,
  control_authority,
  control_retention,
  control_support
TO
  pg_control_runtime_api,
  pg_control_orchestrator,
  pg_control_worker,
  pg_control_projector_ro,
  pg_control_backup_restore,
  pg_break_glass_operator;

GRANT USAGE ON SCHEMA meta_migration, restore_verification TO
  pg_control_migrator,
  pg_control_backup_restore,
  pg_break_glass_operator;

GRANT CREATE ON SCHEMA
  control_manifest,
  control_workflow,
  control_receipt,
  control_upload,
  control_authority,
  control_retention,
  control_support,
  meta_migration,
  restore_verification
TO pg_control_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE pg_control_owner IN SCHEMA
  control_manifest,
  control_workflow,
  control_receipt,
  control_upload,
  control_authority,
  control_retention
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
  pg_control_runtime_api,
  pg_control_orchestrator,
  pg_control_worker;

ALTER DEFAULT PRIVILEGES FOR ROLE pg_control_owner IN SCHEMA
  control_manifest,
  control_workflow,
  control_receipt,
  control_upload,
  control_authority,
  control_retention
GRANT SELECT ON TABLES TO
  pg_control_projector_ro,
  pg_control_backup_restore,
  pg_break_glass_operator;

ALTER DEFAULT PRIVILEGES FOR ROLE pg_control_owner IN SCHEMA
  meta_migration,
  restore_verification,
  control_support
GRANT SELECT, INSERT, UPDATE ON TABLES TO
  pg_control_migrator,
  pg_control_backup_restore;

ALTER DEFAULT PRIVILEGES FOR ROLE pg_control_owner IN SCHEMA
  meta_migration,
  restore_verification,
  control_support
GRANT SELECT ON TABLES TO pg_break_glass_operator;

CREATE TABLE IF NOT EXISTS meta_migration.schema_migration_ledger (
  migration_id text PRIMARY KEY,
  schema_bundle_hash text NOT NULL,
  compatibility_window_ref text NOT NULL,
  rollout_phase text NOT NULL,
  state text NOT NULL,
  destructive_change_policy text NOT NULL,
  rollback_boundary_policy text NOT NULL,
  fail_forward_policy text NOT NULL,
  replay_restore_policy text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  completed_at timestamptz,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS restore_verification.restore_checkpoint_register (
  checkpoint_id text PRIMARY KEY,
  restore_drill_ref text,
  restore_verification_hash text,
  checkpoint_state text NOT NULL,
  reopen_readiness_state text NOT NULL,
  privacy_reconciliation_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  audit_continuity_verified boolean NOT NULL DEFAULT false,
  queue_rebuild_verified boolean NOT NULL DEFAULT false,
  authority_rebuild_verified boolean NOT NULL DEFAULT false,
  authority_binding_revalidation_verified boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restore_verification.restore_drill_result_register (
  restore_drill_ref text PRIMARY KEY,
  checkpoint_id text NOT NULL REFERENCES restore_verification.restore_checkpoint_register(checkpoint_id),
  restore_target_time timestamptz NOT NULL,
  schema_bundle_hash text NOT NULL,
  compatibility_window_ref text NOT NULL,
  privacy_reconciliation_state text NOT NULL,
  audit_continuity_state text NOT NULL,
  queue_rebuild_state text NOT NULL,
  authority_rebuild_state text NOT NULL,
  authority_binding_revalidation_state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION control_support.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('taxat.current_tenant_id', true), '');
$$;

CREATE OR REPLACE FUNCTION control_support.require_tenant_context()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tenant_context text;
BEGIN
  tenant_context := control_support.current_tenant_id();
  IF tenant_context IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'tenant_context_required';
  END IF;
  RETURN tenant_context;
END;
$$;

COMMENT ON FUNCTION control_support.current_tenant_id() IS
  'Later tenant-scoped control tables bind RLS policies to taxat.current_tenant_id.';

COMMENT ON FUNCTION control_support.require_tenant_context() IS
  'Fail-closed helper for future tenant-scoped writes and RLS WITH CHECK policies.';

COMMENT ON TABLE meta_migration.schema_migration_ledger IS
  'Expand, backfill, contract, rollback boundary, and reader-window posture for the control store.';

COMMENT ON TABLE restore_verification.restore_checkpoint_register IS
  'Tier-0 restore and reopen gates. No environment becomes reopen-safe until all blockers clear.';

COMMENT ON TABLE restore_verification.restore_drill_result_register IS
  'Bound restore-drill evidence aligned to the active schema-reader window and checkpoint.';
