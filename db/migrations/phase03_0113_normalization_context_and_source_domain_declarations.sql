-- phase03_0113_normalization_context_and_source_domain_declarations.sql
-- Durable normalization context freeze and explicit source-domain declaration registers.

CREATE SCHEMA IF NOT EXISTS control_collection;

CREATE TABLE IF NOT EXISTS control_collection.normalization_context_register (
  normalization_context_id text PRIMARY KEY,
  normalization_context_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL UNIQUE,
  mapping_rules_ref text NOT NULL,
  evidence_rules_ref text NOT NULL,
  promotion_rules_ref text NOT NULL,
  normalization_rules_ref text NOT NULL,
  transformation_version_set jsonb NOT NULL,
  normalization_context_hash text NOT NULL,
  normalization_context_payload jsonb NOT NULL,
  normalization_context_row_version integer NOT NULL DEFAULT 1,
  produced_at timestamptz NOT NULL,
  persisted_at timestamptz NOT NULL,
  CHECK (jsonb_typeof(transformation_version_set) = 'array'),
  CHECK (jsonb_array_length(transformation_version_set) > 0),
  CHECK (jsonb_typeof(normalization_context_payload) = 'object'),
  CHECK (length(mapping_rules_ref) > 0),
  CHECK (length(evidence_rules_ref) > 0),
  CHECK (length(promotion_rules_ref) > 0),
  CHECK (length(normalization_rules_ref) > 0),
  CHECK (length(normalization_context_hash) > 0)
);

CREATE TABLE IF NOT EXISTS control_collection.source_domain_declaration_register (
  declaration_id text PRIMARY KEY,
  declaration_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  source_plan_ref text NOT NULL,
  collection_boundary_ref text NOT NULL,
  source_domain text NOT NULL,
  source_class text NULL,
  partition_scope_refs jsonb NOT NULL,
  runtime_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  declaration_kind text NOT NULL,
  boundary_disposition text NOT NULL,
  late_data_policy_ref text NOT NULL,
  reason_code text NOT NULL,
  evidence_refs jsonb NOT NULL,
  declaration_hash text NOT NULL,
  declaration_payload jsonb NOT NULL,
  declaration_row_version integer NOT NULL DEFAULT 1,
  produced_at timestamptz NOT NULL,
  persisted_at timestamptz NOT NULL,
  CHECK (source_class IS NULL OR source_class IN (
    'AUTHORITY_ACKNOWLEDGEMENT',
    'AUTHORITY_REFERENCE',
    'INSTITUTIONAL_FEED',
    'BOOKS_OF_ENTRY',
    'DOCUMENTARY_EVIDENCE',
    'DECLARED_ASSERTION',
    'DETERMINISTIC_DERIVATION',
    'PROBABILISTIC_INFERENCE',
    'GOVERNANCE_ARTIFACT'
  )),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_array_length(partition_scope_refs) > 0),
  CHECK (jsonb_typeof(runtime_scope_refs) = 'array'),
  CHECK (declaration_kind IN (
    'EXCLUDED_BY_POLICY',
    'NO_DATA_CONFIRMED_AT_CUTOFF',
    'MISSING_AT_CUTOFF',
    'STALE_AT_CUTOFF'
  )),
  CHECK (boundary_disposition = declaration_kind),
  CHECK (late_data_policy_ref IN ('EXCLUDE_LATE', 'SPAWN_CHILD_MANIFEST', 'REVIEW_IF_LATE')),
  CHECK (reason_code IN (
    'POLICY_EXCLUDED',
    'CLIENT_DECLARED_EXCLUSION',
    'EMPTY_RESPONSE_CONFIRMED',
    'NO_DATA_BOUNDARY_DISPOSITION',
    'NO_BOUNDARY_DISPOSITION',
    'NO_DATA_CONFIRMATION_MISSING',
    'MISSING_AT_CUTOFF',
    'STALE_AT_CUTOFF',
    'SCHEMA_DRIFT',
    'REVISION_DRIFT',
    'FRESHNESS_POLICY_VIOLATION'
  )),
  CHECK (
    declaration_kind <> 'EXCLUDED_BY_POLICY'
    OR reason_code IN ('POLICY_EXCLUDED', 'CLIENT_DECLARED_EXCLUSION')
  ),
  CHECK (
    declaration_kind <> 'NO_DATA_CONFIRMED_AT_CUTOFF'
    OR reason_code IN ('EMPTY_RESPONSE_CONFIRMED', 'NO_DATA_BOUNDARY_DISPOSITION')
  ),
  CHECK (
    declaration_kind <> 'MISSING_AT_CUTOFF'
    OR reason_code IN ('NO_BOUNDARY_DISPOSITION', 'NO_DATA_CONFIRMATION_MISSING', 'MISSING_AT_CUTOFF')
  ),
  CHECK (
    declaration_kind <> 'STALE_AT_CUTOFF'
    OR reason_code IN ('STALE_AT_CUTOFF', 'SCHEMA_DRIFT', 'REVISION_DRIFT', 'FRESHNESS_POLICY_VIOLATION')
  ),
  CHECK (jsonb_typeof(evidence_refs) = 'array'),
  CHECK (jsonb_array_length(evidence_refs) > 0),
  CHECK (jsonb_typeof(declaration_payload) = 'object'),
  UNIQUE (manifest_id, source_domain, source_class, partition_scope_refs)
);

CREATE INDEX IF NOT EXISTS normalization_context_manifest_idx
  ON control_collection.normalization_context_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS normalization_context_hash_idx
  ON control_collection.normalization_context_register (normalization_context_hash, persisted_at);

CREATE INDEX IF NOT EXISTS source_domain_declaration_manifest_idx
  ON control_collection.source_domain_declaration_register (manifest_id, persisted_at);

CREATE INDEX IF NOT EXISTS source_domain_declaration_boundary_idx
  ON control_collection.source_domain_declaration_register (collection_boundary_ref, persisted_at);

CREATE INDEX IF NOT EXISTS source_domain_declaration_kind_idx
  ON control_collection.source_domain_declaration_register (manifest_id, declaration_kind, persisted_at);

CREATE INDEX IF NOT EXISTS source_domain_declaration_source_domain_idx
  ON control_collection.source_domain_declaration_register (manifest_id, source_domain, persisted_at);

ALTER TABLE control_collection.normalization_context_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.source_domain_declaration_register ENABLE ROW LEVEL SECURITY;
