-- Phase-03 manifest lineage trace and branch-decision narration.
-- Storage strategy:
--   1. `control_manifest.manifest_lineage_trace_register` stores the authoritative request-time
--      trace payload plus scalar lookup fields for request identity, selected action, and selected
--      manifest.
--   2. `control_manifest.manifest_lineage_trace_candidate_evaluation` stores one ordered row per
--      canonical branch candidate so auditors can query rejected actions without unpacking JSONB.
--   3. `control_manifest.manifest_lineage_trace_selected_manifest_link` records the append-only
--      selected-manifest trace-ref update. `RunManifest.manifest_branch_decision` remains embedded
--      manifest-local truth; no second write-side branch-decision table is introduced.

CREATE TABLE IF NOT EXISTS control_manifest.manifest_lineage_trace_register (
  lineage_trace_id text PRIMARY KEY,
  lineage_trace_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  selected_manifest_id text NOT NULL REFERENCES control_manifest.run_manifest_register (manifest_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  request_identity_hash text NOT NULL,
  access_binding_hash text NOT NULL,
  idempotency_key text NOT NULL,
  selected_branch_action text NOT NULL CHECK (selected_branch_action IN ('NEW_MANIFEST', 'RETURN_EXISTING_BUNDLE', 'REUSE_SEALED_MANIFEST', 'REPLAY_CHILD', 'RECOVERY_CHILD', 'CONTINUATION_CHILD', 'NEW_REQUEST_CHILD')),
  selected_branch_reason_code text NOT NULL CHECK (selected_branch_reason_code IN ('NO_PRIOR_MANIFEST', 'TERMINAL_IDEMPOTENT_RETRY', 'PRESTART_SEALED_CONTEXT_REUSE', 'REPLAY_REQUESTED_EXACT', 'STARTED_ATTEMPT_RECOVERY', 'POST_TERMINAL_CONTINUATION_REQUIRED', 'REQUEST_IDENTITY_CHANGED', 'NIGHTLY_WINDOW_ADVANCED')),
  selected_manifest_continuation_basis text NOT NULL CHECK (selected_manifest_continuation_basis IN ('NEW_MANIFEST', 'REPLAY_CHILD', 'RECOVERY_CHILD', 'CONTINUATION_CHILD', 'NEW_REQUEST_CHILD')),
  selected_manifest_generation integer NOT NULL CHECK (selected_manifest_generation >= 0),
  prior_manifest_id text,
  prior_manifest_hash_at_decision text,
  prior_manifest_lifecycle_state text CHECK (prior_manifest_lifecycle_state IS NULL OR prior_manifest_lifecycle_state IN ('ALLOCATED', 'FROZEN', 'SEALED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'FAILED', 'SUPERSEDED', 'REPLAY_ONLY', 'RETIRED')),
  returned_decision_bundle_hash text,
  run_kind text NOT NULL CHECK (run_kind IN ('INTERACTIVE', 'NIGHTLY', 'BACKFILL', 'REPLAY', 'REMEDIATION', 'AMENDMENT', 'MIGRATION')),
  nightly_window_key text,
  nightly_predecessor_batch_run_ref text,
  nightly_predecessor_manifest_id text,
  nightly_predecessor_manifest_hash text,
  nightly_context_reason_code text NOT NULL CHECK (nightly_context_reason_code IN ('NOT_NIGHTLY', 'NO_PREDECESSOR_BATCH', 'SAME_WINDOW_REUSE', 'WINDOW_ADVANCE_FROM_PREDECESSOR')),
  mirror_sources jsonb NOT NULL,
  branch_decision_audit_refs jsonb NOT NULL,
  branch_decision_trace_span_refs jsonb NOT NULL,
  trace_payload jsonb NOT NULL,
  trace_payload_hash text NOT NULL,
  persisted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(mirror_sources) = 'array'),
  CHECK (jsonb_typeof(branch_decision_audit_refs) = 'array'),
  CHECK (jsonb_typeof(branch_decision_trace_span_refs) = 'array'),
  CHECK (jsonb_typeof(trace_payload) = 'object'),
  CHECK (
    (selected_branch_action = 'RETURN_EXISTING_BUNDLE' AND returned_decision_bundle_hash IS NOT NULL) OR
    (selected_branch_action <> 'RETURN_EXISTING_BUNDLE' AND returned_decision_bundle_hash IS NULL)
  ),
  CHECK (
    (run_kind = 'NIGHTLY' AND nightly_window_key IS NOT NULL AND nightly_context_reason_code <> 'NOT_NIGHTLY') OR
    (run_kind <> 'NIGHTLY' AND nightly_window_key IS NULL AND nightly_context_reason_code = 'NOT_NIGHTLY')
  )
);

CREATE TABLE IF NOT EXISTS control_manifest.manifest_lineage_trace_candidate_evaluation (
  lineage_trace_id text NOT NULL REFERENCES control_manifest.manifest_lineage_trace_register (lineage_trace_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  candidate_order integer NOT NULL CHECK (candidate_order BETWEEN 1 AND 7),
  candidate_action text NOT NULL CHECK (candidate_action IN ('NEW_MANIFEST', 'RETURN_EXISTING_BUNDLE', 'REUSE_SEALED_MANIFEST', 'REPLAY_CHILD', 'RECOVERY_CHILD', 'CONTINUATION_CHILD', 'NEW_REQUEST_CHILD')),
  evaluation_state text NOT NULL CHECK (evaluation_state IN ('SELECTED', 'REJECTED')),
  compared_manifest_id text,
  compared_manifest_hash text,
  compared_manifest_lifecycle_state text CHECK (compared_manifest_lifecycle_state IS NULL OR compared_manifest_lifecycle_state IN ('ALLOCATED', 'FROZEN', 'SEALED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'FAILED', 'SUPERSEDED', 'REPLAY_ONLY', 'RETIRED')),
  disqualifier_reason_codes jsonb NOT NULL,
  PRIMARY KEY (lineage_trace_id, candidate_order),
  UNIQUE (lineage_trace_id, candidate_action),
  CHECK (jsonb_typeof(disqualifier_reason_codes) = 'array'),
  CHECK (
    (evaluation_state = 'SELECTED' AND jsonb_array_length(disqualifier_reason_codes) = 0) OR
    (evaluation_state = 'REJECTED' AND jsonb_array_length(disqualifier_reason_codes) > 0)
  )
);

CREATE TABLE IF NOT EXISTS control_manifest.manifest_lineage_trace_selected_manifest_link (
  lineage_trace_id text PRIMARY KEY REFERENCES control_manifest.manifest_lineage_trace_register (lineage_trace_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  lineage_trace_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  selected_manifest_id text NOT NULL REFERENCES control_manifest.run_manifest_register (manifest_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  manifest_row_version_before_append integer NOT NULL CHECK (manifest_row_version_before_append >= 1),
  manifest_row_version_after_append integer NOT NULL CHECK (manifest_row_version_after_append >= manifest_row_version_before_append),
  appended_at timestamptz NOT NULL,
  CHECK (manifest_row_version_after_append >= manifest_row_version_before_append)
);

CREATE UNIQUE INDEX IF NOT EXISTS manifest_lineage_trace_request_identity_unique
  ON control_manifest.manifest_lineage_trace_register (tenant_id, request_identity_hash, selected_branch_action, lineage_trace_id);

CREATE INDEX IF NOT EXISTS manifest_lineage_trace_selected_manifest_lookup
  ON control_manifest.manifest_lineage_trace_register (tenant_id, selected_manifest_id, persisted_at DESC);

CREATE INDEX IF NOT EXISTS manifest_lineage_trace_branch_lookup
  ON control_manifest.manifest_lineage_trace_register (tenant_id, selected_branch_action, selected_branch_reason_code, persisted_at DESC);

CREATE INDEX IF NOT EXISTS manifest_lineage_trace_candidate_lookup
  ON control_manifest.manifest_lineage_trace_candidate_evaluation (candidate_action, evaluation_state);

CREATE INDEX IF NOT EXISTS manifest_lineage_trace_selected_manifest_link_lookup
  ON control_manifest.manifest_lineage_trace_selected_manifest_link (tenant_id, selected_manifest_id, appended_at DESC);

ALTER TABLE control_manifest.manifest_lineage_trace_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_manifest.manifest_lineage_trace_candidate_evaluation ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_manifest.manifest_lineage_trace_selected_manifest_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY manifest_lineage_trace_register_tenant_scope
  ON control_manifest.manifest_lineage_trace_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY manifest_lineage_trace_candidate_evaluation_tenant_scope
  ON control_manifest.manifest_lineage_trace_candidate_evaluation
  USING (
    EXISTS (
      SELECT 1
      FROM control_manifest.manifest_lineage_trace_register trace
      WHERE trace.lineage_trace_id = manifest_lineage_trace_candidate_evaluation.lineage_trace_id
        AND trace.tenant_id = control_support.require_tenant_context()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM control_manifest.manifest_lineage_trace_register trace
      WHERE trace.lineage_trace_id = manifest_lineage_trace_candidate_evaluation.lineage_trace_id
        AND trace.tenant_id = control_support.require_tenant_context()
    )
  );

CREATE POLICY manifest_lineage_trace_selected_manifest_link_tenant_scope
  ON control_manifest.manifest_lineage_trace_selected_manifest_link
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

COMMENT ON TABLE control_manifest.manifest_lineage_trace_register IS
  'Authoritative request-time ManifestLineageTrace artifact for manifest branch, reuse, return, replay, recovery, and nightly decisions.';

COMMENT ON TABLE control_manifest.manifest_lineage_trace_candidate_evaluation IS
  'Ordered canonical branch-candidate evaluations with typed rejection reason codes for branch explorer and audit queries.';

COMMENT ON TABLE control_manifest.manifest_lineage_trace_selected_manifest_link IS
  'Append-only linkage evidence proving the selected manifest retained the persisted lineage trace ref without rewriting manifest-local continuation truth.';
