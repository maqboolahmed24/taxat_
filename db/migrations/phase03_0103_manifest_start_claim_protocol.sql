-- Phase-03 manifest start-claim protocol hardening.
-- This migration keeps the existing JSONB carrier on run_manifest_register, then adds lookup and
-- fail-closed posture checks for the SEALED -> IN_PROGRESS single-writer boundary.

CREATE INDEX IF NOT EXISTS run_manifest_start_claim_attempt_lookup
  ON control_manifest.run_manifest_register (
    tenant_id,
    ((manifest_start_claim ->> 'attempt_lineage_ref')),
    ((manifest_start_claim ->> 'claim_state')),
    updated_recorded_at DESC
  )
  WHERE manifest_start_claim IS NOT NULL;

CREATE INDEX IF NOT EXISTS run_manifest_start_claim_active_lookup
  ON control_manifest.run_manifest_register (
    tenant_id,
    ((manifest_start_claim ->> 'claim_holder_ref_or_null')),
    ((manifest_start_claim ->> 'claim_expires_at_or_null'))
  )
  WHERE manifest_start_claim ->> 'claim_state' IN ('ACTIVE_LEASED', 'STALE_RECLAIM_REQUIRED');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'run_manifest_start_claim_prestart_or_active_check'
  ) THEN
    ALTER TABLE control_manifest.run_manifest_register
      ADD CONSTRAINT run_manifest_start_claim_prestart_or_active_check
      CHECK (
        manifest_start_claim IS NULL
        OR (
          lifecycle_state = 'SEALED'
          AND opened_at IS NULL
          AND manifest_start_claim ->> 'claim_state' = 'UNCLAIMED_SEALED'
          AND manifest_start_claim -> 'stage_dag_ref_or_null' = 'null'::jsonb
          AND manifest_start_claim -> 'outbox_batch_ref_or_null' = 'null'::jsonb
          AND manifest_start_claim -> 'first_publication_committed_at_or_null' = 'null'::jsonb
        )
        OR (
          lifecycle_state = 'IN_PROGRESS'
          AND opened_at IS NOT NULL
          AND manifest_start_claim ->> 'claim_state' IN ('ACTIVE_LEASED', 'STALE_RECLAIM_REQUIRED')
          AND manifest_start_claim ->> 'claim_token_or_null' IS NOT NULL
          AND manifest_start_claim ->> 'claim_holder_ref_or_null' IS NOT NULL
          AND manifest_start_claim ->> 'stage_dag_ref_or_null' IS NOT NULL
          AND manifest_start_claim ->> 'outbox_batch_ref_or_null' IS NOT NULL
          AND manifest_start_claim ->> 'first_publication_committed_at_or_null' IS NOT NULL
        )
        OR (
          lifecycle_state IN ('COMPLETED', 'BLOCKED', 'FAILED', 'SUPERSEDED', 'REPLAY_ONLY', 'RETIRED')
          AND manifest_start_claim ->> 'claim_state' IN ('STALE_RECLAIM_REQUIRED', 'TERMINAL_RESULT_RECORDED')
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN control_manifest.run_manifest_register.manifest_start_claim IS
  'Authoritative MANIFEST_START_CLAIM JSONB object. The claim state, token, holder, epoch, expiry, attempt lineage, and first stage/outbox publication refs update in one compare-and-swap boundary with run_started or reclaim ownership. Preserves SINGLE_WRITER_LEASED_START_ONLY and CLAIM_AND_FIRST_PUBLICATION_COMMIT_TOGETHER semantics.';

COMMENT ON INDEX control_manifest.run_manifest_start_claim_attempt_lookup IS
  'Lookup for same-attempt recovery and duplicate-start suppression by tenant, attempt lineage, and durable start-claim state.';

COMMENT ON INDEX control_manifest.run_manifest_start_claim_active_lookup IS
  'Lookup for active or stale start-lease holders and expiry timestamps without treating queue state as claim truth.';
