-- pc_0142: durable post-seal authority correction and out-of-band propagation.

CREATE TABLE IF NOT EXISTS temporal_propagation_events (
  temporal_event_id text PRIMARY KEY,
  manifest_id text NOT NULL,
  event_class text NOT NULL,
  active_exact_scope_key text NOT NULL,
  affected_scope_refs jsonb NOT NULL,
  affected_submission_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_late_data_monitor_ref_or_null text,
  source_late_data_finding_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_authority_basis_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_baseline_envelope_ref_or_null text,
  source_drift_ref_or_null text,
  trust_effect text NOT NULL,
  proof_effect text NOT NULL,
  baseline_effect text NOT NULL,
  retroactive_effect text NOT NULL,
  amendment_effect text NOT NULL,
  replay_effect text NOT NULL,
  mirror_reopen_effect text NOT NULL,
  historical_reuse_policy text NOT NULL,
  reason_codes jsonb NOT NULL,
  emitted_at timestamptz NOT NULL,
  event_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CHECK (event_class IN (
    'LATE_DATA_INVALIDATION',
    'AUTHORITY_CORRECTION',
    'OUT_OF_BAND_DISCOVERY',
    'TEMPORAL_UNCERTAINTY_BLOCK'
  )),
  CHECK (jsonb_typeof(affected_scope_refs) = 'array' AND jsonb_array_length(affected_scope_refs) > 0),
  CHECK (jsonb_typeof(affected_submission_refs) = 'array'),
  CHECK (jsonb_typeof(source_late_data_finding_refs) = 'array'),
  CHECK (jsonb_typeof(source_authority_basis_refs) = 'array'),
  CHECK (jsonb_typeof(reason_codes) = 'array' AND jsonb_array_length(reason_codes) > 0),
  CHECK (trust_effect IN ('NONE', 'RECALC_REQUIRED')),
  CHECK (proof_effect IN ('NONE', 'STALE_REVALIDATION_REQUIRED')),
  CHECK (baseline_effect IN ('NONE', 'SCOPE_SLICED_REBUILD_REQUIRED')),
  CHECK (retroactive_effect IN ('NONE', 'ANALYSIS_REQUIRED')),
  CHECK (amendment_effect IN ('NONE', 'INVALIDATE_READINESS_REUSE', 'RECONCILE_FIRST')),
  CHECK (replay_effect IN ('NOT_MATERIAL', 'HISTORICAL_EVENT_REQUIRED', 'LIMITED_COMPARISON_ONLY')),
  CHECK (mirror_reopen_effect IN ('NONE', 'REOPEN_REQUIRED')),
  CHECK (historical_reuse_policy = 'NO_FRESH_RECLASSIFICATION'),
  CHECK (
    event_class NOT IN ('AUTHORITY_CORRECTION', 'OUT_OF_BAND_DISCOVERY')
    OR jsonb_array_length(source_authority_basis_refs) > 0
  ),
  CHECK (
    event_class NOT IN ('LATE_DATA_INVALIDATION', 'TEMPORAL_UNCERTAINTY_BLOCK')
    OR source_late_data_monitor_ref_or_null IS NOT NULL
    OR jsonb_array_length(source_late_data_finding_refs) > 0
  ),
  CHECK (
    retroactive_effect <> 'ANALYSIS_REQUIRED'
    OR jsonb_array_length(affected_submission_refs) > 0
  )
);

CREATE INDEX IF NOT EXISTS temporal_propagation_events_manifest_idx
  ON temporal_propagation_events (manifest_id, emitted_at, temporal_event_id);

CREATE INDEX IF NOT EXISTS temporal_propagation_events_scope_idx
  ON temporal_propagation_events (active_exact_scope_key, emitted_at, temporal_event_id);

CREATE INDEX IF NOT EXISTS temporal_propagation_events_class_idx
  ON temporal_propagation_events (event_class, emitted_at, temporal_event_id);

CREATE INDEX IF NOT EXISTS temporal_propagation_events_affected_submission_gin_idx
  ON temporal_propagation_events USING gin (affected_submission_refs);

CREATE INDEX IF NOT EXISTS temporal_propagation_events_affected_scope_gin_idx
  ON temporal_propagation_events USING gin (affected_scope_refs);
