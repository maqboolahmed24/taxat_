-- phase03_0144_authority_reconciliation_analytics_snapshot.sql
-- Durable replay-safe reconciliation analytics snapshots derived only from
-- AuthorityInteractionRecord.reconciliation_control_contract packets.

CREATE TABLE IF NOT EXISTS authority_reconciliation_analytics_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  snapshot_ref TEXT NOT NULL UNIQUE,
  authority_operation_profile_ref TEXT NOT NULL,
  provider_environment TEXT NOT NULL,
  operation_family TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  window_ended_at TIMESTAMPTZ NOT NULL,
  interaction_refs JSONB NOT NULL,
  total_interaction_count INTEGER NOT NULL CHECK (total_interaction_count >= 0),
  budget_state_counts JSONB NOT NULL,
  outcome_class_counts JSONB NOT NULL,
  resend_refusal_reason_counts JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_reason_counts JSONB NOT NULL DEFAULT '[]'::jsonb,
  unresolved_ambiguity_count INTEGER NOT NULL CHECK (unresolved_ambiguity_count >= 0),
  deadline_expiry_count INTEGER NOT NULL CHECK (deadline_expiry_count >= 0),
  escalated_count INTEGER NOT NULL CHECK (escalated_count >= 0),
  blind_resend_blocked_count INTEGER NOT NULL CHECK (blind_resend_blocked_count >= 0),
  replay_resume_count INTEGER NOT NULL CHECK (replay_resume_count >= 0),
  average_attempts_consumed NUMERIC(12, 2) NOT NULL CHECK (average_attempts_consumed >= 0),
  max_attempts_consumed INTEGER NOT NULL CHECK (max_attempts_consumed >= 0),
  escalation_latency_seconds_p95_or_null NUMERIC(14, 3),
  tuning_recommendation_codes JSONB NOT NULL,
  source_policy TEXT NOT NULL CHECK (
    source_policy = 'DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY'
  ),
  generated_at TIMESTAMPTZ NOT NULL,
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (window_ended_at >= window_started_at),
  CHECK (generated_at >= window_ended_at),
  CHECK (deadline_expiry_count <= blind_resend_blocked_count),
  CHECK (unresolved_ambiguity_count <= total_interaction_count),
  CHECK (replay_resume_count <= total_interaction_count),
  CHECK (average_attempts_consumed <= max_attempts_consumed),
  CHECK (
    (escalated_count = 0 AND escalation_latency_seconds_p95_or_null IS NULL)
    OR escalated_count > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_authority_reconciliation_analytics_profile_window
  ON authority_reconciliation_analytics_snapshots (
    authority_operation_profile_ref,
    provider_environment,
    operation_family,
    window_started_at,
    window_ended_at
  );

CREATE INDEX IF NOT EXISTS idx_authority_reconciliation_analytics_hotspots
  ON authority_reconciliation_analytics_snapshots (
    provider_environment,
    operation_family,
    unresolved_ambiguity_count DESC,
    escalated_count DESC,
    replay_resume_count DESC
  );
