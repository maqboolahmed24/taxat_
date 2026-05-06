-- phase03_0109_source_plan_window_boundary.sql
-- Durable collection control objects for SourcePlan, SourceWindow, and CollectionBoundary.

CREATE SCHEMA IF NOT EXISTS control_collection;

CREATE TABLE IF NOT EXISTS control_collection.source_plan_register (
  tenant_id text NOT NULL,
  source_plan_id text PRIMARY KEY,
  source_plan_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  source_plan_hash text NOT NULL,
  required_domains jsonb NOT NULL,
  source_plan_payload jsonb NOT NULL,
  source_plan_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  CHECK (jsonb_typeof(required_domains) = 'array'),
  CHECK (jsonb_typeof(source_plan_payload) = 'object')
);

CREATE TABLE IF NOT EXISTS control_collection.source_plan_planned_source (
  source_plan_id text NOT NULL REFERENCES control_collection.source_plan_register(source_plan_id),
  source_domain text NOT NULL,
  source_class text NOT NULL,
  provider_binding_ref text NOT NULL,
  partition_scope_refs jsonb NOT NULL,
  query_basis_ref text NOT NULL,
  cursor_strategy_ref text NOT NULL,
  read_model text NOT NULL,
  late_data_policy_ref text NOT NULL,
  completeness_expectation_ref text NOT NULL,
  freshness_slo_ref text NOT NULL,
  required_schema_refs jsonb NOT NULL,
  required_source_class_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  planned_source_ordinal integer NOT NULL,
  PRIMARY KEY (source_plan_id, source_domain, partition_scope_refs),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(required_schema_refs) = 'array'),
  CHECK (jsonb_typeof(required_source_class_refs) = 'array'),
  CHECK (read_model IN ('AS_OF', 'WINDOWED', 'POINT_IN_TIME', 'LATEST_ALLOWED')),
  CHECK (late_data_policy_ref IN ('EXCLUDE_LATE', 'SPAWN_CHILD_MANIFEST', 'REVIEW_IF_LATE'))
);

CREATE TABLE IF NOT EXISTS control_collection.source_window_register (
  tenant_id text NOT NULL,
  source_window_id text PRIMARY KEY,
  source_window_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  source_plan_ref text NOT NULL,
  collection_started_at timestamptz NOT NULL,
  collection_completed_at timestamptz NOT NULL,
  read_cutoff_at timestamptz NOT NULL,
  source_window_hash text NOT NULL,
  cutoff_enforcement_state text NOT NULL DEFAULT 'HARD_CLOSED_AT_READ_CUTOFF',
  post_cutoff_observation_mode text NOT NULL DEFAULT 'LATE_DATA_ONLY',
  source_window_payload jsonb NOT NULL,
  source_window_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  CHECK (collection_started_at <= collection_completed_at),
  CHECK (collection_completed_at <= read_cutoff_at),
  CHECK (cutoff_enforcement_state = 'HARD_CLOSED_AT_READ_CUTOFF'),
  CHECK (post_cutoff_observation_mode = 'LATE_DATA_ONLY'),
  CHECK (jsonb_typeof(source_window_payload) = 'object')
);

CREATE TABLE IF NOT EXISTS control_collection.collection_boundary_register (
  tenant_id text NOT NULL,
  collection_boundary_id text PRIMARY KEY,
  collection_boundary_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  source_plan_ref text NOT NULL,
  source_window_id text NOT NULL,
  read_cutoff_at timestamptz NOT NULL,
  connector_profile_ref text NOT NULL,
  connector_build_id text NOT NULL,
  collection_boundary_hash text NOT NULL,
  boundary_coverage_state text NOT NULL DEFAULT 'EXPLICIT_SOURCE_DOMAIN_ACCOUNTING',
  collection_boundary_payload jsonb NOT NULL,
  collection_boundary_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  CHECK (boundary_coverage_state = 'EXPLICIT_SOURCE_DOMAIN_ACCOUNTING'),
  CHECK (jsonb_typeof(collection_boundary_payload) = 'object')
);

CREATE TABLE IF NOT EXISTS control_collection.collection_boundary_source_boundary (
  collection_boundary_id text NOT NULL REFERENCES control_collection.collection_boundary_register(collection_boundary_id),
  source_domain text NOT NULL,
  source_class text NULL,
  partition_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  runtime_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_environment_ref text NOT NULL,
  provider_api_version text NOT NULL,
  provider_schema_version text NOT NULL,
  cursor_checkpoint_ref text NOT NULL,
  revision_ref text NOT NULL,
  request_audit_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_request_audit_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  completeness_expectation_ref text NOT NULL,
  late_data_policy_ref text NOT NULL,
  boundary_disposition text NOT NULL,
  source_boundary_ordinal integer NOT NULL,
  PRIMARY KEY (collection_boundary_id, source_domain, partition_scope_refs),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(runtime_scope_refs) = 'array'),
  CHECK (jsonb_typeof(request_audit_refs) = 'array'),
  CHECK (jsonb_typeof(page_request_audit_refs) = 'array'),
  CHECK (jsonb_array_length(request_audit_refs) > 0 OR jsonb_array_length(page_request_audit_refs) > 0),
  CHECK (late_data_policy_ref IN ('EXCLUDE_LATE', 'SPAWN_CHILD_MANIFEST', 'REVIEW_IF_LATE')),
  CHECK (boundary_disposition IN (
    'IN_SCOPE_COLLECTED',
    'NO_DATA_CONFIRMED_AT_CUTOFF',
    'EXCLUDED_BY_POLICY',
    'MISSING_AT_CUTOFF',
    'STALE_AT_CUTOFF'
  ))
);

CREATE INDEX IF NOT EXISTS source_plan_manifest_idx
  ON control_collection.source_plan_register (tenant_id, manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS source_window_manifest_idx
  ON control_collection.source_window_register (tenant_id, manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS source_window_plan_ref_idx
  ON control_collection.source_window_register (tenant_id, source_plan_ref, persisted_at);

CREATE INDEX IF NOT EXISTS collection_boundary_manifest_idx
  ON control_collection.collection_boundary_register (tenant_id, manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS collection_boundary_plan_ref_idx
  ON control_collection.collection_boundary_register (tenant_id, source_plan_ref, persisted_at);

CREATE INDEX IF NOT EXISTS collection_boundary_window_idx
  ON control_collection.collection_boundary_register (tenant_id, source_window_id, persisted_at);

ALTER TABLE control_collection.source_plan_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.source_plan_planned_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.source_window_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.collection_boundary_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.collection_boundary_source_boundary ENABLE ROW LEVEL SECURITY;
