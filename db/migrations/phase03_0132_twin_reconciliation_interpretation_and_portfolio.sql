-- pc_0132: twin reconciliation state, interpretation state, and portfolio summary.
-- These tables persist follow-up posture, low-noise operator interpretation, and portfolio rollups
-- from existing twin artifacts without recomputing subject-level comparison semantics.

CREATE TABLE IF NOT EXISTS twin_reconciliation_states (
  twin_reconciliation_state_id text PRIMARY KEY,
  twin_reconciliation_state_ref text NOT NULL UNIQUE,
  twin_id text NOT NULL,
  lifecycle_state text NOT NULL CHECK (
    lifecycle_state IN (
      'NOT_REQUIRED',
      'QUEUED',
      'IN_PROGRESS',
      'WAITING_ON_AUTHORITY',
      'WAITING_ON_OPERATOR',
      'RESOLVED',
      'SUPERSEDED'
    )
  ),
  resolution_state text NOT NULL CHECK (
    resolution_state IN (
      'NONE',
      'UNRESOLVED',
      'PARTIALLY_RESOLVED',
      'RESOLVED_MATCH',
      'RESOLVED_OUT_OF_BAND',
      'RESOLVED_REJECTED',
      'RESOLVED_AMENDED_BASELINE'
    )
  ),
  reconciliation_dedupe_key text,
  target_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocking_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_action_code text NOT NULL CHECK (
    recommended_action_code IN (
      'NONE',
      'RETRY_AUTHORITY_SYNC',
      'AWAIT_AUTHORITY',
      'OPEN_OPERATOR_WORKFLOW',
      'RUN_MANUAL_RECONCILIATION',
      'PREPARE_AMENDMENT_REVIEW',
      'RECORD_OUT_OF_BAND_RESOLUTION',
      'RESOLVED',
      'SUPERSEDED'
    )
  ),
  reconciliation_budget_state text NOT NULL CHECK (
    reconciliation_budget_state IN ('NOT_APPLICABLE', 'WITHIN_BUDGET', 'EXHAUSTED', 'MANUAL_ESCALATION')
  ),
  workflow_item_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_workflow_item_ref_or_null text,
  auto_attempt_count integer NOT NULL CHECK (auto_attempt_count >= 0),
  max_auto_attempts integer NOT NULL CHECK (max_auto_attempts >= 0),
  reconciliation_deadline_at timestamptz,
  next_action_owner text NOT NULL CHECK (next_action_owner IN ('NONE', 'SYSTEM', 'AUTHORITY', 'OPERATOR')),
  next_action_due_at timestamptz,
  last_attempted_at timestamptz,
  resolved_at timestamptz,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  record jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(target_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(blocking_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(workflow_item_refs) = 'array'),
  CHECK (jsonb_typeof(reason_codes) = 'array'),
  CHECK (auto_attempt_count <= max_auto_attempts),
  CHECK (
    (lifecycle_state = 'NOT_REQUIRED'
      AND resolution_state = 'NONE'
      AND jsonb_array_length(target_mismatch_refs) = 0
      AND jsonb_array_length(blocking_mismatch_refs) = 0
      AND recommended_action_code = 'NONE'
      AND reconciliation_budget_state = 'NOT_APPLICABLE'
      AND jsonb_array_length(workflow_item_refs) = 0
      AND primary_workflow_item_ref_or_null IS NULL
      AND auto_attempt_count = 0
      AND max_auto_attempts = 0
      AND reconciliation_deadline_at IS NULL
      AND next_action_owner = 'NONE'
      AND next_action_due_at IS NULL
      AND last_attempted_at IS NULL
      AND resolved_at IS NULL
      AND jsonb_array_length(reason_codes) = 0)
    OR lifecycle_state <> 'NOT_REQUIRED'
  ),
  CHECK (
    lifecycle_state = 'NOT_REQUIRED'
    OR jsonb_array_length(target_mismatch_refs) > 0
  ),
  CHECK (
    (lifecycle_state = 'WAITING_ON_AUTHORITY'
      AND next_action_owner = 'AUTHORITY'
      AND next_action_due_at IS NOT NULL
      AND reconciliation_deadline_at IS NOT NULL)
    OR lifecycle_state <> 'WAITING_ON_AUTHORITY'
  ),
  CHECK (
    (lifecycle_state = 'WAITING_ON_OPERATOR'
      AND next_action_owner = 'OPERATOR'
      AND next_action_due_at IS NOT NULL
      AND primary_workflow_item_ref_or_null IS NOT NULL
      AND jsonb_array_length(workflow_item_refs) > 0
      AND reconciliation_budget_state IN ('EXHAUSTED', 'MANUAL_ESCALATION'))
    OR lifecycle_state <> 'WAITING_ON_OPERATOR'
  ),
  CHECK (
    (lifecycle_state = 'RESOLVED'
      AND resolved_at IS NOT NULL
      AND recommended_action_code = 'RESOLVED'
      AND next_action_owner = 'NONE'
      AND next_action_due_at IS NULL
      AND resolution_state IN (
        'RESOLVED_MATCH',
        'RESOLVED_OUT_OF_BAND',
        'RESOLVED_REJECTED',
        'RESOLVED_AMENDED_BASELINE'
      ))
    OR lifecycle_state <> 'RESOLVED'
  ),
  CHECK (
    (reconciliation_budget_state = 'WITHIN_BUDGET'
      AND NOT (max_auto_attempts > 0 AND auto_attempt_count >= max_auto_attempts))
    OR reconciliation_budget_state <> 'WITHIN_BUDGET'
  ),
  CHECK (
    (reconciliation_budget_state = 'EXHAUSTED' AND auto_attempt_count >= max_auto_attempts)
    OR reconciliation_budget_state <> 'EXHAUSTED'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS twin_reconciliation_states_active_dedupe_idx
  ON twin_reconciliation_states(reconciliation_dedupe_key)
  WHERE lifecycle_state NOT IN ('NOT_REQUIRED', 'RESOLVED', 'SUPERSEDED');

CREATE TABLE IF NOT EXISTS twin_interpretation_states (
  twin_interpretation_state_id text PRIMARY KEY,
  twin_interpretation_state_ref text NOT NULL UNIQUE,
  twin_id text NOT NULL,
  generated_from_surface text NOT NULL CHECK (generated_from_surface = 'TWIN_PANEL'),
  default_view_space text NOT NULL CHECK (
    default_view_space IN ('SOURCE_SPACE', 'COMPUTATION_SPACE', 'AUTHORITY_SPACE')
  ),
  enabled_view_spaces jsonb NOT NULL DEFAULT '[]'::jsonb,
  compare_mode text NOT NULL CHECK (compare_mode IN ('LOCKED', 'DELTA_COMPARE', 'PINNED_COMPARE')),
  pinned_object_ref text,
  active_delta_arc_ref text,
  focus_anchor_ref text,
  show_confidence_overlay boolean NOT NULL,
  show_freshness_overlay boolean NOT NULL,
  preserve_focus_across_refresh boolean NOT NULL,
  default_sort_mode text NOT NULL CHECK (default_sort_mode IN ('PRIORITY_RANK', 'TIMELINE', 'SUBJECT_CLASS')),
  default_noise_filter text NOT NULL CHECK (
    default_noise_filter IN ('ACTIONABLE_ONLY', 'REVIEW_AND_ABOVE', 'ALL_MISMATCHES')
  ),
  summary_priority_mode text NOT NULL CHECK (
    summary_priority_mode IN ('ACTIONABILITY_FIRST', 'AUTHORITY_FIRST', 'AUDIT_FIRST')
  ),
  dominant_attention_state text NOT NULL CHECK (
    dominant_attention_state IN (
      'READY',
      'REVIEW_REQUIRED',
      'WAITING_ON_AUTHORITY',
      'RECONCILIATION_REQUIRED',
      'NON_COMPARABLE',
      'OUT_OF_BAND',
      'CONTRADICTORY'
    )
  ),
  dominant_delta_arc_ref_or_null text,
  dominant_reconciliation_state_ref_or_null text,
  collapse_matches_by_default boolean NOT NULL,
  suppress_informational_when_higher_severity_present boolean NOT NULL,
  authority_first_summary boolean NOT NULL,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(enabled_view_spaces) = 'array' AND jsonb_array_length(enabled_view_spaces) > 0),
  CHECK (
    (compare_mode = 'LOCKED' AND pinned_object_ref IS NULL AND active_delta_arc_ref IS NULL)
    OR compare_mode <> 'LOCKED'
  ),
  CHECK (
    (compare_mode = 'DELTA_COMPARE' AND active_delta_arc_ref IS NOT NULL)
    OR compare_mode <> 'DELTA_COMPARE'
  ),
  CHECK (
    (dominant_attention_state = 'READY'
      AND dominant_delta_arc_ref_or_null IS NULL
      AND dominant_reconciliation_state_ref_or_null IS NULL)
    OR dominant_attention_state <> 'READY'
  ),
  CHECK (
    (dominant_attention_state IN (
        'WAITING_ON_AUTHORITY',
        'RECONCILIATION_REQUIRED',
        'OUT_OF_BAND',
        'CONTRADICTORY'
      )
      AND dominant_reconciliation_state_ref_or_null IS NOT NULL
      AND authority_first_summary = true
      AND default_noise_filter IN ('ACTIONABLE_ONLY', 'REVIEW_AND_ABOVE')
      AND summary_priority_mode IN ('ACTIONABILITY_FIRST', 'AUTHORITY_FIRST'))
    OR dominant_attention_state NOT IN (
      'WAITING_ON_AUTHORITY',
      'RECONCILIATION_REQUIRED',
      'OUT_OF_BAND',
      'CONTRADICTORY'
    )
  )
);

CREATE TABLE IF NOT EXISTS twin_portfolio_summaries (
  twin_portfolio_summary_id text PRIMARY KEY,
  twin_portfolio_summary_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  scope_ref text NOT NULL,
  generated_at timestamptz NOT NULL,
  total_twin_count integer NOT NULL CHECK (total_twin_count >= 0),
  ready_count integer NOT NULL CHECK (ready_count >= 0),
  review_required_count integer NOT NULL CHECK (review_required_count >= 0),
  waiting_on_authority_count integer NOT NULL CHECK (waiting_on_authority_count >= 0),
  reconciliation_required_count integer NOT NULL CHECK (reconciliation_required_count >= 0),
  blocked_count integer NOT NULL CHECK (blocked_count >= 0),
  stale_twin_count integer NOT NULL CHECK (stale_twin_count >= 0),
  out_of_band_twin_count integer NOT NULL CHECK (out_of_band_twin_count >= 0),
  highest_attention_rank integer NOT NULL CHECK (highest_attention_rank >= 0),
  top_twin_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(top_twin_refs) = 'array'),
  CHECK (jsonb_typeof(top_mismatch_refs) = 'array'),
  CHECK (
    total_twin_count =
    ready_count +
    review_required_count +
    waiting_on_authority_count +
    reconciliation_required_count +
    blocked_count
  ),
  CHECK (
    (total_twin_count = 0
      AND highest_attention_rank = 0
      AND jsonb_array_length(top_twin_refs) = 0
      AND jsonb_array_length(top_mismatch_refs) = 0)
    OR total_twin_count > 0
  ),
  CHECK (
    (total_twin_count > 0
      AND highest_attention_rank > 0
      AND jsonb_array_length(top_twin_refs) > 0)
    OR total_twin_count = 0
  )
);

CREATE INDEX IF NOT EXISTS twin_reconciliation_states_twin_idx
  ON twin_reconciliation_states(twin_id, lifecycle_state, generated_at);

CREATE INDEX IF NOT EXISTS twin_interpretation_states_twin_idx
  ON twin_interpretation_states(twin_id, dominant_attention_state);

CREATE INDEX IF NOT EXISTS twin_portfolio_summaries_scope_idx
  ON twin_portfolio_summaries(tenant_id, scope_ref, generated_at DESC);
