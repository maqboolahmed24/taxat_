-- pc_0128: provenance graph foundation.
-- ASSUMPTION_PROVENANCE_PACKAGE_CREATED: backend-provenance owns these append-only graph primitives.

CREATE TABLE IF NOT EXISTS provenance_nodes (
  node_id text PRIMARY KEY,
  graph_id text NOT NULL,
  graph_address text NOT NULL,
  manifest_id text NOT NULL,
  tenant_id text NOT NULL,
  client_id text,
  business_partition text,
  period_scope text,
  node_class text NOT NULL CHECK (node_class IN ('ENTITY', 'ACTIVITY', 'AGENT')),
  node_family text NOT NULL,
  object_ref text NOT NULL,
  created_at timestamptz NOT NULL,
  tombstone_state text NOT NULL CHECK (
    tombstone_state IN ('ACTIVE', 'RETENTION_LIMITED', 'EXPIRED_PLACEHOLDER', 'ERASED_PLACEHOLDER', 'SUPERSEDED')
  ),
  limitation_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  node_hash text NOT NULL UNIQUE,
  record jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(limitation_codes) = 'array'),
  CHECK (
    (tombstone_state = 'ACTIVE' AND jsonb_array_length(limitation_codes) = 0)
    OR (tombstone_state <> 'ACTIVE')
  ),
  CHECK (
    (tombstone_state IN ('RETENTION_LIMITED', 'EXPIRED_PLACEHOLDER', 'ERASED_PLACEHOLDER') AND jsonb_array_length(limitation_codes) > 0)
    OR (tombstone_state NOT IN ('RETENTION_LIMITED', 'EXPIRED_PLACEHOLDER', 'ERASED_PLACEHOLDER'))
  )
);

CREATE TABLE IF NOT EXISTS provenance_edges (
  edge_id text PRIMARY KEY,
  graph_id text NOT NULL,
  manifest_id text NOT NULL,
  tenant_id text NOT NULL,
  client_id text,
  business_partition text,
  period_scope text,
  from_node_id text NOT NULL REFERENCES provenance_nodes(node_id),
  to_node_id text NOT NULL REFERENCES provenance_nodes(node_id),
  edge_type text NOT NULL,
  originating_activity_ref text NOT NULL,
  created_at timestamptz NOT NULL,
  support_type text NOT NULL,
  support_confidence numeric NOT NULL CHECK (support_confidence >= 0 AND support_confidence <= 1),
  support_strength_tier text NOT NULL,
  limitation_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  from_manifest_id text,
  to_manifest_id text,
  lineage_relation text,
  decisive_support boolean NOT NULL,
  admissibility_state text NOT NULL CHECK (admissibility_state IN ('ADMISSIBLE', 'LIMITED', 'INADMISSIBLE')),
  contradicted_by_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  stale_at timestamptz,
  edge_hash text NOT NULL UNIQUE,
  record jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(limitation_codes) = 'array'),
  CHECK (jsonb_typeof(contradicted_by_refs) = 'array'),
  CHECK (
    (edge_type IN ('ED_CONTINUES', 'ED_REPLAYS', 'ED_RECOVERS', 'ED_SUPERSEDES')
      AND from_manifest_id IS NOT NULL
      AND to_manifest_id IS NOT NULL
      AND lineage_relation = edge_type)
    OR (edge_type NOT IN ('ED_CONTINUES', 'ED_REPLAYS', 'ED_RECOVERS', 'ED_SUPERSEDES')
      AND from_manifest_id IS NULL
      AND to_manifest_id IS NULL
      AND lineage_relation IS NULL)
  ),
  CHECK (
    admissibility_state <> 'ADMISSIBLE'
    OR (jsonb_array_length(limitation_codes) = 0 AND jsonb_array_length(contradicted_by_refs) = 0 AND stale_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS provenance_paths (
  path_id text PRIMARY KEY,
  graph_id text NOT NULL,
  manifest_id text NOT NULL,
  target_ref text NOT NULL,
  path_class text NOT NULL,
  path_role text NOT NULL CHECK (path_role IN ('PRIMARY', 'ALTERNATIVE')),
  admissibility_state text NOT NULL CHECK (admissibility_state IN ('ADMISSIBLE', 'LIMITED', 'INADMISSIBLE')),
  node_refs jsonb NOT NULL,
  edge_refs jsonb NOT NULL,
  decisive_edge_refs jsonb NOT NULL,
  lineage_boundary_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  decisive_lineage_boundary_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  weakest_support_confidence numeric NOT NULL CHECK (weakest_support_confidence >= 0 AND weakest_support_confidence <= 1),
  hop_count integer NOT NULL CHECK (hop_count >= 1),
  replayable boolean NOT NULL,
  path_hash text NOT NULL UNIQUE,
  record jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(node_refs) = 'array'),
  CHECK (jsonb_typeof(edge_refs) = 'array'),
  CHECK (jsonb_array_length(node_refs) = jsonb_array_length(edge_refs) + 1),
  CHECK (jsonb_array_length(edge_refs) = hop_count)
);

CREATE TABLE IF NOT EXISTS evidence_graphs (
  graph_id text PRIMARY KEY,
  manifest_id text NOT NULL,
  graph_version text NOT NULL,
  lifecycle_state text NOT NULL,
  nodes_ref text,
  edges_ref text,
  critical_paths_ref text,
  primary_path_ref text,
  graph_hash text NOT NULL UNIQUE,
  record jsonb NOT NULL,
  built_at timestamptz,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provenance_nodes_graph_idx ON provenance_nodes(graph_id, manifest_id);
CREATE INDEX IF NOT EXISTS provenance_nodes_object_ref_idx ON provenance_nodes(object_ref);
CREATE INDEX IF NOT EXISTS provenance_edges_graph_idx ON provenance_edges(graph_id, manifest_id);
CREATE INDEX IF NOT EXISTS provenance_edges_from_to_idx ON provenance_edges(from_node_id, to_node_id);
CREATE INDEX IF NOT EXISTS provenance_edges_lineage_idx ON provenance_edges(from_manifest_id, to_manifest_id)
  WHERE lineage_relation IS NOT NULL;
CREATE INDEX IF NOT EXISTS provenance_paths_graph_target_idx ON provenance_paths(graph_id, target_ref, path_role);
CREATE INDEX IF NOT EXISTS evidence_graphs_manifest_idx ON evidence_graphs(manifest_id, lifecycle_state);
