-- pc_0129: proof bundle generation and defensible filing graph closure.
-- ProofBundle rows are bounded proof artifacts: path refs and replay recipes are retained,
-- but full evidence payloads remain in their owning graph/source artifacts.

CREATE TABLE IF NOT EXISTS proof_bundles (
  proof_bundle_id text PRIMARY KEY,
  proof_bundle_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  graph_ref text NOT NULL,
  target_ref text NOT NULL,
  target_class text NOT NULL CHECK (target_class IN ('FIGURE', 'TOTAL', 'FILING_FIELD', 'DECISION', 'LEGAL_STATE')),
  bundle_purpose text NOT NULL CHECK (
    bundle_purpose IN ('FILING_DEFENCE', 'GATE_EXPLANATION', 'LEGAL_STATE_PROOF', 'DRIFT_JUSTIFICATION', 'RETENTION_LIMITATION')
  ),
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('GENERATED', 'LIMITED', 'STALE', 'SUPERSEDED')),
  support_state text NOT NULL CHECK (
    support_state IN ('SUPPORTED', 'PARTIALLY_SUPPORTED', 'UNSUPPORTED', 'CONTRADICTED', 'STALE')
  ),
  admissibility_state text NOT NULL CHECK (admissibility_state IN ('ADMISSIBLE', 'LIMITED', 'INADMISSIBLE')),
  closure_state text NOT NULL CHECK (closure_state IN ('CLOSED', 'OPEN')),
  primary_path_ref text,
  decisive_path_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_path_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_path_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  contradiction_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  stale_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  staleness_dependency_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  temporal_propagation_event_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  lineage_boundary_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  replay_recipe jsonb NOT NULL,
  render_refs jsonb NOT NULL,
  retention_binding jsonb NOT NULL,
  bundle_hash text NOT NULL UNIQUE,
  superseded_by_bundle_ref text,
  record jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(decisive_path_refs) = 'array'),
  CHECK (jsonb_typeof(rejected_path_refs) = 'array'),
  CHECK (jsonb_typeof(rejected_path_entries) = 'array'),
  CHECK (jsonb_typeof(contradiction_refs) = 'array'),
  CHECK (jsonb_typeof(stale_reason_codes) = 'array'),
  CHECK (jsonb_typeof(staleness_dependency_refs) = 'array'),
  CHECK (jsonb_typeof(temporal_propagation_event_refs) = 'array'),
  CHECK (jsonb_typeof(lineage_boundary_refs) = 'array'),
  CHECK (
    (support_state = 'UNSUPPORTED'
      AND closure_state = 'OPEN'
      AND primary_path_ref IS NULL
      AND jsonb_array_length(decisive_path_refs) = 0
      AND jsonb_array_length(rejected_path_refs) = 0)
    OR support_state <> 'UNSUPPORTED'
  ),
  CHECK (
    (support_state IN ('SUPPORTED', 'PARTIALLY_SUPPORTED')
      AND closure_state = 'CLOSED'
      AND primary_path_ref IS NOT NULL
      AND jsonb_array_length(decisive_path_refs) > 0)
    OR support_state NOT IN ('SUPPORTED', 'PARTIALLY_SUPPORTED')
  ),
  CHECK (
    (support_state IN ('CONTRADICTED', 'STALE') AND closure_state = 'OPEN' AND primary_path_ref IS NOT NULL)
    OR support_state NOT IN ('CONTRADICTED', 'STALE')
  ),
  CHECK (
    (support_state = 'STALE'
      AND jsonb_array_length(stale_reason_codes) > 0
      AND jsonb_array_length(staleness_dependency_refs) > 0
      AND jsonb_array_length(temporal_propagation_event_refs) > 0)
    OR support_state <> 'STALE'
  ),
  CHECK (
    (lifecycle_state = 'SUPERSEDED' AND superseded_by_bundle_ref IS NOT NULL)
    OR lifecycle_state <> 'SUPERSEDED'
  )
);

CREATE INDEX IF NOT EXISTS proof_bundles_manifest_idx
  ON proof_bundles(manifest_id, lifecycle_state, support_state);

CREATE INDEX IF NOT EXISTS proof_bundles_graph_target_idx
  ON proof_bundles(graph_ref, target_ref, bundle_purpose, lifecycle_state);

CREATE INDEX IF NOT EXISTS proof_bundles_primary_path_idx
  ON proof_bundles(primary_path_ref)
  WHERE primary_path_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS proof_bundles_controlling_idx
  ON proof_bundles(graph_ref, target_ref, bundle_purpose)
  WHERE lifecycle_state IN ('GENERATED', 'LIMITED')
    AND support_state IN ('SUPPORTED', 'PARTIALLY_SUPPORTED')
    AND closure_state = 'CLOSED';
