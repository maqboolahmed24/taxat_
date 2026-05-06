-- pc_0136: Authority request identity lookup and duplicate bucket indexes.
-- This table stores only grouped identity contracts and derived hashes. Raw authority payload bytes
-- remain outside lookup APIs and persistence surfaces.

CREATE TABLE IF NOT EXISTS authority_request_identity_lookup (
  lookup_id text PRIMARY KEY,
  source_record_type text NOT NULL,
  source_record_ref text NOT NULL UNIQUE,
  lookup_posture text NOT NULL,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  request_id text NOT NULL,
  attempt_lineage_manifest_id text NOT NULL,
  provider_environment text NOT NULL,
  provider_api_version text NOT NULL,
  authority_scope text NOT NULL,
  authority_name text NOT NULL,
  authority_product_profile text NOT NULL,
  operation_family text NOT NULL,
  operation_profile text NOT NULL,
  canonical_path text NOT NULL,
  canonical_query text NOT NULL,
  request_body_hash text NOT NULL,
  identity_namespace_hash text NOT NULL,
  duplicate_meaning_key text NOT NULL,
  request_hash text NOT NULL,
  idempotency_key text NOT NULL,
  access_binding_hash text NOT NULL,
  policy_snapshot_hash text NOT NULL,
  authority_binding_ref text NOT NULL,
  authority_link_ref text NOT NULL,
  binding_lineage_ref text NOT NULL,
  token_binding_ref text NOT NULL,
  subject_ref text NOT NULL,
  acting_party_ref text NOT NULL,
  business_partition_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_identity_contract jsonb NOT NULL,
  authority_truth_state text NOT NULL DEFAULT 'NONE',
  stronger_truth_ref text,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_record_type IN (
    'AUTHORITY_REQUEST_ENVELOPE',
    'AUTHORITY_INTERACTION_RECORD',
    'SUBMISSION_RECORD',
    'EXTERNAL_STRONGER_TRUTH'
  )),
  CHECK (lookup_posture IN (
    'REQUEST_SEALED',
    'INTERACTION_REGISTERED',
    'SUBMISSION_SETTLEMENT',
    'STRONGER_AUTHORITY_TRUTH'
  )),
  CHECK (authority_truth_state IN (
    'NONE',
    'PENDING_ACK',
    'UNKNOWN',
    'CONFIRMED',
    'REJECTED',
    'OUT_OF_BAND'
  )),
  CHECK (jsonb_typeof(business_partition_refs) = 'array'),
  CHECK (jsonb_typeof(request_identity_contract) = 'object'),
  CHECK (
    lookup_posture <> 'STRONGER_AUTHORITY_TRUTH'
    OR stronger_truth_ref IS NOT NULL
  ),
  CHECK (
    authority_truth_state NOT IN ('CONFIRMED', 'REJECTED', 'OUT_OF_BAND')
    OR stronger_truth_ref IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS authority_request_identity_lookup_duplicate_idx
  ON authority_request_identity_lookup (tenant_id, client_id, duplicate_meaning_key, inserted_at DESC);

CREATE INDEX IF NOT EXISTS authority_request_identity_lookup_request_hash_idx
  ON authority_request_identity_lookup (request_hash, inserted_at DESC);

CREATE INDEX IF NOT EXISTS authority_request_identity_lookup_idempotency_idx
  ON authority_request_identity_lookup (idempotency_key, inserted_at DESC);

CREATE INDEX IF NOT EXISTS authority_request_identity_lookup_namespace_idx
  ON authority_request_identity_lookup (identity_namespace_hash, binding_lineage_ref, inserted_at DESC);

CREATE INDEX IF NOT EXISTS authority_request_identity_lookup_truth_idx
  ON authority_request_identity_lookup (tenant_id, client_id, authority_truth_state, duplicate_meaning_key)
  WHERE authority_truth_state IN ('CONFIRMED', 'REJECTED', 'OUT_OF_BAND');

CREATE INDEX IF NOT EXISTS authority_request_envelopes_identity_namespace_idx
  ON authority_request_envelopes (identity_namespace_hash, binding_lineage_ref, inserted_at DESC);
