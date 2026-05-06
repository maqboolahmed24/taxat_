-- pc_0131: twin view, state snapshot, delta arc, mismatch summary, readiness, and timeline foundation.
-- Twin records persist comparison identity, ranked deltas, and readiness caps without storing full mirrored payloads.

CREATE TABLE IF NOT EXISTS twin_state_snapshots (
  twin_state_snapshot_id text PRIMARY KEY,
  twin_state_snapshot_ref text NOT NULL UNIQUE,
  twin_id text NOT NULL,
  lane_code text NOT NULL CHECK (lane_code IN ('INTERNAL_COMPUTED', 'AUTHORITY')),
  assembly_state text NOT NULL CHECK (
    assembly_state IN ('ASSEMBLED', 'PARTIAL', 'LIMITED', 'STALE', 'CONTRADICTORY', 'UNAVAILABLE', 'SUPERSEDED')
  ),
  snapshot_role text NOT NULL CHECK (snapshot_role IN ('WORKING_STATE', 'AUTHORITY_OBSERVED')),
  comparison_key_profile_code text NOT NULL CHECK (comparison_key_profile_code = 'TWIN_KEY_V1_SHA256'),
  comparison_basis_ref text,
  baseline_ref text,
  component_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject_count integer NOT NULL CHECK (subject_count >= 0),
  comparable_subject_count integer NOT NULL CHECK (comparable_subject_count >= 0),
  non_comparable_subject_count integer NOT NULL CHECK (non_comparable_subject_count >= 0),
  subject_key_collision_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  contradictory_component_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  freshness_state text NOT NULL CHECK (freshness_state IN ('LIVE', 'RECENT', 'STALE', 'LIMITED')),
  confidence_state text NOT NULL CHECK (confidence_state IN ('HIGH', 'MEDIUM', 'LOW', 'LIMITED')),
  limitation_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_truth_state text NOT NULL CHECK (
    authority_truth_state IN ('NOT_APPLICABLE', 'NOT_REQUESTED', 'UNKNOWN', 'PENDING_ACK', 'PARTIAL_ACK', 'CONFIRMED', 'REJECTED', 'OUT_OF_BAND')
  ),
  baseline_state text NOT NULL CHECK (
    baseline_state IN ('NOT_APPLICABLE', 'PROVED', 'PARTIAL', 'MISSING', 'STALE', 'SUPERSEDED')
  ),
  amendment_position text NOT NULL CHECK (
    amendment_position IN ('NOT_APPLICABLE', 'PRE_BASELINE', 'FILED_BASELINE', 'AMENDED_BASELINE', 'AUTHORITY_CORRECTED_BASELINE')
  ),
  replay_authoritativeness text NOT NULL CHECK (replay_authoritativeness IN ('LIVE', 'REPLAY', 'ANALYSIS_ONLY')),
  record jsonb NOT NULL,
  as_of timestamptz NOT NULL,
  stale_after timestamptz,
  generated_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (subject_count = comparable_subject_count + non_comparable_subject_count),
  CHECK (jsonb_typeof(component_refs) = 'array'),
  CHECK (jsonb_typeof(subject_key_collision_refs) = 'array'),
  CHECK (jsonb_typeof(contradictory_component_refs) = 'array'),
  CHECK (jsonb_typeof(limitation_codes) = 'array'),
  CHECK (
    (assembly_state = 'UNAVAILABLE'
      AND comparison_basis_ref IS NULL
      AND jsonb_array_length(component_refs) = 0
      AND subject_count = 0)
    OR assembly_state <> 'UNAVAILABLE'
  ),
  CHECK (
    (assembly_state = 'ASSEMBLED'
      AND non_comparable_subject_count = 0
      AND jsonb_array_length(subject_key_collision_refs) = 0
      AND jsonb_array_length(contradictory_component_refs) = 0
      AND jsonb_array_length(limitation_codes) = 0)
    OR assembly_state <> 'ASSEMBLED'
  ),
  CHECK (
    (jsonb_array_length(subject_key_collision_refs) = 0)
    OR assembly_state = 'CONTRADICTORY'
  )
);

CREATE TABLE IF NOT EXISTS twin_timelines (
  twin_timeline_id text PRIMARY KEY,
  timeline_ref text NOT NULL UNIQUE,
  twin_id text NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('BUILT', 'STALE', 'SUPERSEDED')),
  temporal_alignment_state text NOT NULL CHECK (temporal_alignment_state IN ('LOCKED', 'DRIFTING', 'DIVERGED')),
  alignment_score numeric NOT NULL CHECK (alignment_score >= 0 AND alignment_score <= 1),
  primary_anchor_ref text,
  window_start_at timestamptz,
  window_end_at timestamptz,
  aligned_anchor_count integer NOT NULL CHECK (aligned_anchor_count >= 0),
  contradictory_anchor_count integer NOT NULL CHECK (contradictory_anchor_count >= 0),
  unpaired_anchor_count integer NOT NULL CHECK (unpaired_anchor_count >= 0),
  alignment_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  lanes jsonb NOT NULL,
  record jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(alignment_reason_codes) = 'array'),
  CHECK (jsonb_typeof(lanes) = 'array' AND jsonb_array_length(lanes) = 2),
  CHECK (window_start_at IS NULL OR window_end_at IS NULL OR window_start_at <= window_end_at),
  CHECK (
    (aligned_anchor_count + contradictory_anchor_count + unpaired_anchor_count = 0 AND primary_anchor_ref IS NULL)
    OR (aligned_anchor_count + contradictory_anchor_count + unpaired_anchor_count > 0 AND primary_anchor_ref IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS twin_delta_arcs (
  delta_arc_id text PRIMARY KEY,
  delta_arc_ref text NOT NULL UNIQUE,
  twin_id text NOT NULL,
  timeline_ref text NOT NULL,
  comparison_key text NOT NULL,
  comparison_key_profile_code text NOT NULL CHECK (comparison_key_profile_code = 'TWIN_KEY_V1_SHA256'),
  subject_identity_code text NOT NULL,
  subject_class text NOT NULL CHECK (
    subject_class IN ('FACT', 'TOTAL', 'FILING', 'ACKNOWLEDGEMENT', 'STATUS', 'OBLIGATION', 'DECLARED_BASIS')
  ),
  delta_class text NOT NULL,
  comparability_state text NOT NULL,
  comparability_reason_code text NOT NULL,
  delta_precedence_rank integer NOT NULL CHECK (delta_precedence_rank BETWEEN 1 AND 11),
  materiality_class text NOT NULL CHECK (materiality_class IN ('NONE', 'INFORMATIONAL', 'REVIEW', 'MATERIAL', 'BLOCKING')),
  resolution_class text NOT NULL,
  priority_rank integer NOT NULL CHECK (priority_rank >= 0),
  baseline_state text NOT NULL CHECK (baseline_state IN ('NOT_APPLICABLE', 'PROVED', 'PARTIAL', 'MISSING', 'STALE')),
  confidence_state text NOT NULL CHECK (confidence_state IN ('HIGH', 'MEDIUM', 'LOW', 'LIMITED')),
  freshness_state text NOT NULL CHECK (freshness_state IN ('LIVE', 'RECENT', 'STALE', 'LIMITED')),
  left_subject_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  right_subject_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  contradiction_component_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitation_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocking_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  record jsonb NOT NULL,
  last_compared_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (twin_id, comparison_key),
  CHECK (jsonb_typeof(left_subject_refs) = 'array'),
  CHECK (jsonb_typeof(right_subject_refs) = 'array'),
  CHECK (jsonb_typeof(contradiction_component_refs) = 'array'),
  CHECK (jsonb_typeof(limitation_codes) = 'array'),
  CHECK (jsonb_typeof(blocking_reason_codes) = 'array'),
  CHECK (
    (delta_class IN ('MATCH_EXACT', 'MATCH_EQUIVALENT') AND priority_rank = 0 AND materiality_class = 'NONE' AND resolution_class = 'NONE')
    OR delta_class NOT IN ('MATCH_EXACT', 'MATCH_EQUIVALENT')
  ),
  CHECK (
    (materiality_class = 'BLOCKING' AND jsonb_array_length(blocking_reason_codes) > 0)
    OR materiality_class <> 'BLOCKING'
  )
);

CREATE TABLE IF NOT EXISTS twin_mismatch_summaries (
  mismatch_summary_id text PRIMARY KEY,
  mismatch_summary_ref text NOT NULL UNIQUE,
  twin_id text NOT NULL,
  ranking_profile_code text NOT NULL CHECK (ranking_profile_code = 'TWIN_MISMATCH_SORT_V1'),
  total_subject_count integer NOT NULL CHECK (total_subject_count >= 0),
  matched_count integer NOT NULL CHECK (matched_count >= 0),
  mismatch_count integer NOT NULL CHECK (mismatch_count >= 0),
  top_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_ranked_mismatches jsonb NOT NULL DEFAULT '[]'::jsonb,
  record jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (total_subject_count = matched_count + mismatch_count),
  CHECK (jsonb_typeof(top_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(top_ranked_mismatches) = 'array'),
  CHECK (
    (mismatch_count = 0 AND jsonb_array_length(top_mismatch_refs) = 0 AND jsonb_array_length(top_ranked_mismatches) = 0)
    OR (mismatch_count > 0 AND jsonb_array_length(top_mismatch_refs) > 0 AND jsonb_array_length(top_ranked_mismatches) > 0)
  )
);

CREATE TABLE IF NOT EXISTS twin_readiness_states (
  twin_readiness_id text PRIMARY KEY,
  twin_readiness_ref text NOT NULL UNIQUE,
  twin_id text NOT NULL,
  twin_readiness_class text NOT NULL,
  safe_action_state text NOT NULL,
  decision_usefulness text NOT NULL,
  authority_posture text NOT NULL,
  baseline_state text NOT NULL,
  usefulness_cap_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocking_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  waiting_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reconciliation_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  contradictory_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  non_comparable_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  out_of_band_mismatch_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  record jsonb NOT NULL,
  last_evaluated_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(usefulness_cap_reason_codes) = 'array'),
  CHECK (jsonb_typeof(blocking_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(review_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(waiting_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(reconciliation_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(contradictory_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(non_comparable_mismatch_refs) = 'array'),
  CHECK (jsonb_typeof(out_of_band_mismatch_refs) = 'array'),
  CHECK (
    (safe_action_state = 'NO_SAFE_ACTION' AND jsonb_array_length(record->'no_safe_action_reason_codes') > 0)
    OR safe_action_state <> 'NO_SAFE_ACTION'
  )
);

CREATE TABLE IF NOT EXISTS twin_views (
  twin_id text PRIMARY KEY,
  twin_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('NOT_BUILT', 'BUILT', 'STALE', 'SUPERSEDED')),
  comparison_key_profile_code text NOT NULL CHECK (comparison_key_profile_code = 'TWIN_KEY_V1_SHA256'),
  delta_precedence_profile_code text NOT NULL CHECK (delta_precedence_profile_code = 'TWIN_DELTA_PRECEDENCE_V1'),
  mismatch_ranking_profile_code text NOT NULL CHECK (mismatch_ranking_profile_code = 'TWIN_MISMATCH_SORT_V1'),
  internal_state_ref text,
  authority_state_ref text,
  timeline_ref text,
  cross_source_delta_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  mismatch_summary_ref text,
  readiness_ref text,
  reconciliation_state_ref text,
  interpretation_state_ref text,
  parity_result_ref text,
  record jsonb NOT NULL,
  built_at timestamptz,
  stale_at timestamptz,
  superseded_at timestamptz,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(cross_source_delta_refs) = 'array'),
  CHECK (
    (lifecycle_state = 'NOT_BUILT' AND jsonb_array_length(cross_source_delta_refs) = 0 AND built_at IS NULL)
    OR lifecycle_state <> 'NOT_BUILT'
  ),
  CHECK (
    (lifecycle_state IN ('BUILT', 'STALE', 'SUPERSEDED')
      AND internal_state_ref IS NOT NULL
      AND authority_state_ref IS NOT NULL
      AND timeline_ref IS NOT NULL
      AND mismatch_summary_ref IS NOT NULL
      AND readiness_ref IS NOT NULL
      AND jsonb_array_length(cross_source_delta_refs) > 0
      AND built_at IS NOT NULL)
    OR lifecycle_state = 'NOT_BUILT'
  ),
  CHECK (stale_at IS NULL OR lifecycle_state = 'STALE'),
  CHECK (superseded_at IS NULL OR lifecycle_state = 'SUPERSEDED')
);

CREATE INDEX IF NOT EXISTS twin_state_snapshots_twin_lane_idx
  ON twin_state_snapshots(twin_id, lane_code, generated_at);

CREATE INDEX IF NOT EXISTS twin_delta_arcs_twin_rank_idx
  ON twin_delta_arcs(twin_id, priority_rank DESC, last_compared_at DESC, comparison_key);

CREATE INDEX IF NOT EXISTS twin_mismatch_summaries_twin_idx
  ON twin_mismatch_summaries(twin_id, generated_at);

CREATE INDEX IF NOT EXISTS twin_readiness_states_twin_idx
  ON twin_readiness_states(twin_id, twin_readiness_class, safe_action_state);

CREATE INDEX IF NOT EXISTS twin_views_manifest_idx
  ON twin_views(manifest_id, lifecycle_state, built_at);
