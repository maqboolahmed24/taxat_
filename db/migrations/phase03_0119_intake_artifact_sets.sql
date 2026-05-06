-- phase03_0119_intake_artifact_sets.sql
-- Durable intake artifact-set envelope and artifact-contract reference registers.

CREATE SCHEMA IF NOT EXISTS control_collection;

CREATE TABLE IF NOT EXISTS control_collection.intake_artifact_set_register (
  set_id text PRIMARY KEY,
  set_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  artifact_type text NOT NULL,
  item_identity_hash text NOT NULL,
  set_hash text NOT NULL,
  artifact_contract_hash text NOT NULL,
  artifact_contract_ref text NOT NULL,
  produced_at timestamptz NOT NULL,
  item_count integer NOT NULL,
  item_identity_refs jsonb NOT NULL,
  set_payload jsonb NOT NULL,
  set_row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  CHECK (artifact_type IN (
    'SourceRecordSet',
    'EvidenceItemSet',
    'CandidateFactSet',
    'ConflictSet',
    'CanonicalFactSet'
  )),
  CHECK (length(set_ref) > 0),
  CHECK (length(item_identity_hash) > 0),
  CHECK (length(set_hash) > 0),
  CHECK (length(artifact_contract_hash) > 0),
  CHECK (length(artifact_contract_ref) > 0),
  CHECK (artifact_contract_ref LIKE 'artifact-contract://%'),
  CHECK (item_count >= 0),
  CHECK (jsonb_typeof(item_identity_refs) = 'array'),
  CHECK (jsonb_array_length(item_identity_refs) = item_count),
  CHECK (jsonb_typeof(set_payload) = 'object'),
  CHECK (set_payload ->> 'set_id' = set_id),
  CHECK (set_payload ->> 'manifest_id' = manifest_id),
  CHECK (set_payload ->> 'artifact_type' = artifact_type),
  CHECK (set_payload ->> 'set_hash' = set_hash),
  CHECK (set_payload ->> 'item_identity_hash' = item_identity_hash),
  CHECK (set_payload ->> 'artifact_contract_hash' = artifact_contract_hash),
  CHECK (jsonb_typeof(set_payload -> 'items') = 'array'),
  CHECK (jsonb_array_length(set_payload -> 'items') = item_count),
  CHECK (jsonb_typeof(set_payload -> 'contract') = 'object')
);

CREATE TABLE IF NOT EXISTS control_collection.intake_artifact_contract_ref_register (
  artifact_contract_ref text PRIMARY KEY,
  artifact_contract_hash text NOT NULL,
  artifact_id text NOT NULL,
  artifact_type text NOT NULL,
  schema_id text NOT NULL,
  schema_bundle_hash text NOT NULL,
  artifact_content_hash text NOT NULL,
  manifest_id text NULL,
  contract_payload jsonb NOT NULL,
  recorded_at timestamptz NOT NULL,
  CHECK (artifact_contract_ref LIKE 'artifact-contract://%'),
  CHECK (length(artifact_contract_hash) > 0),
  CHECK (length(artifact_id) > 0),
  CHECK (length(artifact_type) > 0),
  CHECK (length(schema_id) > 0),
  CHECK (length(schema_bundle_hash) > 0),
  CHECK (length(artifact_content_hash) > 0),
  CHECK (jsonb_typeof(contract_payload) = 'object'),
  CHECK (contract_payload ->> 'artifact_id' = artifact_id),
  CHECK (contract_payload ->> 'artifact_type' = artifact_type),
  CHECK (contract_payload ->> 'schema_id' = schema_id),
  CHECK (contract_payload ->> 'schema_bundle_hash' = schema_bundle_hash),
  CHECK (contract_payload ->> 'artifact_content_hash' = artifact_content_hash)
);

CREATE TABLE IF NOT EXISTS control_collection.intake_artifact_contract_pack_register (
  artifact_contract_hash text PRIMARY KEY,
  manifest_id text NOT NULL,
  hash_scope text NOT NULL,
  artifact_contract_refs jsonb NOT NULL,
  artifact_contract_ref_count integer NOT NULL,
  recorded_at timestamptz NOT NULL,
  CHECK (length(artifact_contract_hash) > 0),
  CHECK (length(hash_scope) > 0),
  CHECK (jsonb_typeof(artifact_contract_refs) = 'array'),
  CHECK (artifact_contract_ref_count > 0),
  CHECK (jsonb_array_length(artifact_contract_refs) = artifact_contract_ref_count)
);

CREATE INDEX IF NOT EXISTS intake_artifact_set_manifest_idx
  ON control_collection.intake_artifact_set_register (manifest_id, artifact_type, persisted_at);

CREATE INDEX IF NOT EXISTS intake_artifact_set_hash_idx
  ON control_collection.intake_artifact_set_register (set_hash, persisted_at);

CREATE INDEX IF NOT EXISTS intake_artifact_set_contract_hash_idx
  ON control_collection.intake_artifact_set_register (artifact_contract_hash, persisted_at);

CREATE INDEX IF NOT EXISTS intake_artifact_contract_ref_type_idx
  ON control_collection.intake_artifact_contract_ref_register (artifact_type, recorded_at);

CREATE INDEX IF NOT EXISTS intake_artifact_contract_ref_hash_idx
  ON control_collection.intake_artifact_contract_ref_register (artifact_contract_hash, recorded_at);

CREATE INDEX IF NOT EXISTS intake_artifact_contract_ref_schema_bundle_idx
  ON control_collection.intake_artifact_contract_ref_register (schema_bundle_hash, recorded_at);

CREATE INDEX IF NOT EXISTS intake_artifact_contract_pack_manifest_idx
  ON control_collection.intake_artifact_contract_pack_register (manifest_id, recorded_at);

ALTER TABLE control_collection.intake_artifact_set_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.intake_artifact_contract_ref_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.intake_artifact_contract_pack_register ENABLE ROW LEVEL SECURITY;
