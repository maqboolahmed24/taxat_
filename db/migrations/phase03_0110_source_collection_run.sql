-- phase03_0110_source_collection_run.sql
-- Durable governed SourceCollectionRun lifecycle register and transition ledger.

CREATE SCHEMA IF NOT EXISTS control_collection;

CREATE TABLE IF NOT EXISTS control_collection.source_collection_run_register (
  tenant_id text NOT NULL,
  collection_run_id text PRIMARY KEY,
  manifest_id text NOT NULL UNIQUE,
  lifecycle_state text NOT NULL,
  source_window_ref text NOT NULL UNIQUE,
  fetch_audit_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  partial_gap_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_reason_code_or_null text NULL,
  abandoned_reason_code_or_null text NULL,
  started_at_or_null timestamptz NULL,
  completed_at_or_null timestamptz NULL,
  state_changed_at timestamptz NOT NULL,
  audit_refs jsonb NOT NULL,
  provenance_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_collection_run_payload jsonb NOT NULL,
  source_collection_run_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (lifecycle_state IN (
    'NOT_STARTED',
    'FETCHING',
    'FETCHED',
    'PARTIAL',
    'FAILED',
    'ABANDONED'
  )),
  CHECK (jsonb_typeof(fetch_audit_refs) = 'array'),
  CHECK (jsonb_typeof(partial_gap_refs) = 'array'),
  CHECK (jsonb_typeof(audit_refs) = 'array'),
  CHECK (jsonb_array_length(audit_refs) > 0),
  CHECK (jsonb_typeof(provenance_refs) = 'array'),
  CHECK (jsonb_typeof(source_collection_run_payload) = 'object'),
  CHECK (completed_at_or_null IS NULL OR started_at_or_null IS NULL OR completed_at_or_null >= started_at_or_null),
  CHECK (
    lifecycle_state <> 'NOT_STARTED'
    OR (
      started_at_or_null IS NULL
      AND completed_at_or_null IS NULL
      AND jsonb_array_length(partial_gap_refs) = 0
      AND failure_reason_code_or_null IS NULL
      AND abandoned_reason_code_or_null IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'FETCHING'
    OR (
      started_at_or_null IS NOT NULL
      AND completed_at_or_null IS NULL
      AND jsonb_array_length(partial_gap_refs) = 0
      AND failure_reason_code_or_null IS NULL
      AND abandoned_reason_code_or_null IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'FETCHED'
    OR (
      started_at_or_null IS NOT NULL
      AND completed_at_or_null IS NOT NULL
      AND jsonb_array_length(partial_gap_refs) = 0
      AND failure_reason_code_or_null IS NULL
      AND abandoned_reason_code_or_null IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'PARTIAL'
    OR (
      started_at_or_null IS NOT NULL
      AND completed_at_or_null IS NOT NULL
      AND jsonb_array_length(partial_gap_refs) > 0
      AND failure_reason_code_or_null IS NULL
      AND abandoned_reason_code_or_null IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'FAILED'
    OR (
      started_at_or_null IS NOT NULL
      AND completed_at_or_null IS NOT NULL
      AND failure_reason_code_or_null IN (
        'FATAL_PROVIDER_FAILURE',
        'DISPATCH_FATAL_FAILURE',
        'FETCH_ROLLUP_FATAL',
        'NO_FETCH_RESULTS',
        'READ_CUTOFF_VIOLATED',
        'SYSTEM_FAULT'
      )
      AND abandoned_reason_code_or_null IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'ABANDONED'
    OR (
      started_at_or_null IS NOT NULL
      AND completed_at_or_null IS NOT NULL
      AND failure_reason_code_or_null IS NULL
      AND abandoned_reason_code_or_null IN (
        'OPERATOR_ABORT',
        'SUPERSEDED_BY_MANIFEST',
        'STALE_COLLECTION_RUN',
        'MANUAL_CHECKPOINT_REQUIRED'
      )
    )
  )
);

CREATE TABLE IF NOT EXISTS control_collection.source_collection_run_transition_log (
  transition_id text PRIMARY KEY,
  collection_run_id text NOT NULL REFERENCES control_collection.source_collection_run_register(collection_run_id),
  from_lifecycle_state text NULL,
  to_lifecycle_state text NOT NULL,
  event_code text NOT NULL,
  transition_audit_ref text NOT NULL,
  transitioned_at timestamptz NOT NULL,
  source_collection_run_row_version integer NOT NULL,
  CHECK (event_code IN (
    'fetch_begin',
    'all_sources_returned',
    'some_sources_returned_with_gaps',
    'fatal_provider_failure',
    'operator_abort'
  ))
);

CREATE INDEX IF NOT EXISTS source_collection_run_manifest_idx
  ON control_collection.source_collection_run_register (tenant_id, manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS source_collection_run_lifecycle_idx
  ON control_collection.source_collection_run_register (tenant_id, lifecycle_state, updated_at);

CREATE INDEX IF NOT EXISTS source_collection_run_window_ref_idx
  ON control_collection.source_collection_run_register (tenant_id, source_window_ref);

CREATE INDEX IF NOT EXISTS source_collection_run_transition_idx
  ON control_collection.source_collection_run_transition_log (collection_run_id, transitioned_at);

ALTER TABLE control_collection.source_collection_run_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.source_collection_run_transition_log ENABLE ROW LEVEL SECURITY;
