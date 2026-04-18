-- Taxat phase-01 bootstrap for the append-only audit store.
-- This migration assumes the target database already exists and is named taxat_audit.
-- It freezes the append-only audit ledger, stream-head monotonicity register,
-- partition retention posture, and hard mutation rejection.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_audit_owner') THEN
    CREATE ROLE pg_audit_owner NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_audit_append_writer') THEN
    CREATE ROLE pg_audit_append_writer NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_audit_investigator_ro') THEN
    CREATE ROLE pg_audit_investigator_ro NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_audit_partition_maintainer') THEN
    CREATE ROLE pg_audit_partition_maintainer NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_control_backup_restore') THEN
    CREATE ROLE pg_control_backup_restore NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_break_glass_operator') THEN
    CREATE ROLE pg_break_glass_operator NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS audit_ledger AUTHORIZATION pg_audit_owner;
CREATE SCHEMA IF NOT EXISTS audit_admin AUTHORIZATION pg_audit_owner;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA audit_ledger TO
  pg_audit_append_writer,
  pg_audit_investigator_ro,
  pg_control_backup_restore,
  pg_break_glass_operator;

GRANT USAGE ON SCHEMA audit_admin TO
  pg_audit_append_writer,
  pg_audit_investigator_ro,
  pg_audit_partition_maintainer,
  pg_control_backup_restore,
  pg_break_glass_operator;

CREATE TABLE IF NOT EXISTS audit_admin.audit_stream_head (
  audit_stream_ref text PRIMARY KEY,
  last_stream_sequence bigint NOT NULL CHECK (last_stream_sequence > 0),
  last_event_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_ledger.audit_event_stream (
  recorded_at timestamptz NOT NULL DEFAULT now(),
  audit_event_id text NOT NULL,
  event_type text NOT NULL,
  event_time timestamptz NOT NULL,
  audit_stream_ref text NOT NULL,
  stream_sequence bigint NOT NULL CHECK (stream_sequence > 0),
  tenant_id text,
  client_id text,
  manifest_id text,
  actor_ref text,
  service_ref text,
  object_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  correlation_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_payload_hash text NOT NULL,
  prev_event_hash text,
  visibility_class text NOT NULL,
  retention_class text NOT NULL,
  signature_ref text,
  retention_limited_explainability_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  retained_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (recorded_at, audit_event_id)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE IF NOT EXISTS audit_ledger.audit_event_stream_default
  PARTITION OF audit_ledger.audit_event_stream DEFAULT;

CREATE INDEX IF NOT EXISTS audit_event_stream_order_lookup
  ON audit_ledger.audit_event_stream (audit_stream_ref, stream_sequence, recorded_at);

CREATE INDEX IF NOT EXISTS audit_event_stream_manifest_lookup
  ON audit_ledger.audit_event_stream (manifest_id, recorded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS audit_event_stream_sequence_guard
  ON audit_ledger.audit_event_stream (recorded_at, audit_stream_ref, stream_sequence);

CREATE OR REPLACE FUNCTION audit_admin.guard_audit_event_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit_admin, audit_ledger, pg_temp
AS $$
DECLARE
  existing_head audit_admin.audit_stream_head%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.audit_stream_ref, 0));

  SELECT *
  INTO existing_head
  FROM audit_admin.audit_stream_head
  WHERE audit_stream_ref = NEW.audit_stream_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    IF NEW.stream_sequence <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'append_only_violation:first_event_requires_stream_sequence_1';
    END IF;
    IF NEW.prev_event_hash IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'append_only_violation:first_event_must_not_point_to_prev_hash';
    END IF;
  ELSE
    IF NEW.stream_sequence <> existing_head.last_stream_sequence + 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'append_only_violation:stream_sequence_must_be_monotonic';
    END IF;
    IF NEW.prev_event_hash IS DISTINCT FROM existing_head.last_event_hash THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'append_only_violation:prev_event_hash_must_match_stream_head';
    END IF;
  END IF;

  INSERT INTO audit_admin.audit_stream_head (
    audit_stream_ref,
    last_stream_sequence,
    last_event_hash,
    updated_at
  )
  VALUES (
    NEW.audit_stream_ref,
    NEW.stream_sequence,
    NEW.event_payload_hash,
    COALESCE(NEW.recorded_at, now())
  )
  ON CONFLICT (audit_stream_ref)
  DO UPDATE SET
    last_stream_sequence = EXCLUDED.last_stream_sequence,
    last_event_hash = EXCLUDED.last_event_hash,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_admin.reject_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'append_only_violation:update_delete_forbidden';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_event_stream_insert_guard ON audit_ledger.audit_event_stream;
CREATE TRIGGER trg_audit_event_stream_insert_guard
BEFORE INSERT ON audit_ledger.audit_event_stream
FOR EACH ROW
EXECUTE FUNCTION audit_admin.guard_audit_event_insert();

DROP TRIGGER IF EXISTS trg_audit_event_stream_reject_mutation ON audit_ledger.audit_event_stream;
CREATE TRIGGER trg_audit_event_stream_reject_mutation
BEFORE UPDATE OR DELETE ON audit_ledger.audit_event_stream
FOR EACH ROW
EXECUTE FUNCTION audit_admin.reject_audit_event_mutation();

REVOKE ALL ON ALL TABLES IN SCHEMA audit_ledger FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA audit_admin FROM PUBLIC;

GRANT INSERT, SELECT ON audit_ledger.audit_event_stream TO pg_audit_append_writer;
GRANT SELECT ON audit_ledger.audit_event_stream TO
  pg_audit_investigator_ro,
  pg_control_backup_restore,
  pg_break_glass_operator;

GRANT SELECT ON audit_admin.audit_stream_head TO
  pg_audit_append_writer,
  pg_audit_investigator_ro,
  pg_control_backup_restore,
  pg_break_glass_operator;

GRANT CREATE ON SCHEMA audit_ledger TO pg_audit_partition_maintainer;
GRANT CREATE ON SCHEMA audit_admin TO pg_audit_partition_maintainer;

COMMENT ON TABLE audit_ledger.audit_event_stream IS
  'Append-only evidence ledger. Canonical order is audit_stream_ref plus stream_sequence; no row may be updated or deleted in place.';

COMMENT ON TABLE audit_admin.audit_stream_head IS
  'Per-stream monotonicity register used by insert-time guards. This admin table is mutable but evidence rows remain append-only.';

COMMENT ON FUNCTION audit_admin.guard_audit_event_insert() IS
  'Ensures first-event, monotonic stream_sequence, and prev_event_hash correctness before an audit row lands.';

COMMENT ON FUNCTION audit_admin.reject_audit_event_mutation() IS
  'Rejects UPDATE and DELETE against append-only audit evidence rows.';
