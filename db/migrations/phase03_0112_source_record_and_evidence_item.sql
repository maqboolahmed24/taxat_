-- phase03_0112_source_record_and_evidence_item.sql
-- Durable raw-source and evidence artifact registers for collection materialization.

CREATE SCHEMA IF NOT EXISTS control_collection;

CREATE TABLE IF NOT EXISTS control_collection.source_record_register (
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  source_record_id text PRIMARY KEY,
  source_record_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  collection_boundary_ref text NOT NULL,
  source_class text NOT NULL,
  provider text NOT NULL,
  provider_account_ref text NOT NULL,
  capture_method text NOT NULL,
  captured_at timestamptz NOT NULL,
  effective_period text NOT NULL,
  business_partition text NOT NULL,
  raw_hash text NOT NULL,
  raw_payload_ref text NOT NULL,
  ingestion_run_ref text NOT NULL,
  source_strength_tier text NOT NULL,
  freshness_state text NOT NULL,
  erasure_state text NOT NULL,
  retention_tag jsonb NOT NULL,
  source_record_payload jsonb NOT NULL,
  source_record_row_version integer NOT NULL DEFAULT 1,
  stored_at timestamptz NOT NULL,
  CHECK (source_class IN (
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
  CHECK (capture_method IN (
    'CONTROLLED_GATEWAY_FETCH',
    'MANUAL_UPLOAD',
    'OPERATOR_DECLARATION',
    'SYSTEM_DERIVATION',
    'QUARANTINED_GATEWAY_CAPTURE'
  )),
  CHECK (source_strength_tier IN (
    'TIER_1_AUTHORITY_FINAL',
    'TIER_2_AUTHORITY_REFERENCE',
    'TIER_3_STRUCTURED_EXTERNAL',
    'TIER_4_STRUCTURED_INTERNAL',
    'TIER_5_DOCUMENT_SUPPORT',
    'TIER_6_DECLARED_ONLY',
    'TIER_7_INFERRED',
    'TIER_8_GOVERNANCE_ONLY'
  )),
  CHECK (freshness_state IN ('CURRENT', 'STALE', 'EXPIRED', 'UNKNOWN', 'SUPERSEDED')),
  CHECK (erasure_state IN (
    'ACTIVE',
    'LIMITED',
    'LEGAL_HOLD',
    'ERASURE_PENDING',
    'PSEUDONYMISED',
    'ERASED'
  )),
  CHECK (length(raw_hash) > 0),
  CHECK (length(raw_payload_ref) > 0),
  CHECK (jsonb_typeof(retention_tag) = 'object'),
  CHECK (jsonb_typeof(source_record_payload) = 'object'),
  CHECK (
    erasure_state <> 'LIMITED'
    OR (
      capture_method = 'QUARANTINED_GATEWAY_CAPTURE'
      OR retention_tag ->> 'limitation_behavior' <> 'NONE'
    )
  )
);

CREATE TABLE IF NOT EXISTS control_collection.evidence_item_register (
  evidence_item_id text PRIMARY KEY,
  evidence_item_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  source_record_id text NOT NULL
    REFERENCES control_collection.source_record_register(source_record_id),
  evidence_kind text NOT NULL,
  content_ref text NOT NULL,
  extraction_method text NOT NULL,
  extraction_confidence numeric NOT NULL,
  source_strength_tier text NOT NULL,
  freshness_state text NOT NULL,
  lineage_refs jsonb NOT NULL,
  retention_tag jsonb NOT NULL,
  erasure_state text NOT NULL,
  business_partition text NOT NULL,
  period_partition text NOT NULL,
  evidence_item_payload jsonb NOT NULL,
  evidence_item_row_version integer NOT NULL DEFAULT 1,
  stored_at timestamptz NOT NULL,
  CHECK (evidence_kind IN (
    'STRUCTURED_PROVIDER_PAYLOAD',
    'DOCUMENTARY_RAW_PAYLOAD',
    'DECLARED_ASSERTION_TEXT',
    'GOVERNANCE_CONTROL_RECORD',
    'EXTRACTION_REVIEW_REQUIRED',
    'QUARANTINED_CONTENT'
  )),
  CHECK (extraction_method IN (
    'STRUCTURED_PAYLOAD_DIRECT',
    'OCR_TEXT_EXTRACTION',
    'MANUAL_REVIEW_REQUIRED',
    'DECLARED_TEXT_DIRECT',
    'NO_TEXT_EXTRACTION_RETAINED',
    'QUARANTINE_BLOCKED_EXTRACTION'
  )),
  CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
  CHECK (source_strength_tier IN (
    'TIER_1_AUTHORITY_FINAL',
    'TIER_2_AUTHORITY_REFERENCE',
    'TIER_3_STRUCTURED_EXTERNAL',
    'TIER_4_STRUCTURED_INTERNAL',
    'TIER_5_DOCUMENT_SUPPORT',
    'TIER_6_DECLARED_ONLY',
    'TIER_7_INFERRED',
    'TIER_8_GOVERNANCE_ONLY'
  )),
  CHECK (freshness_state IN ('CURRENT', 'STALE', 'EXPIRED', 'UNKNOWN', 'SUPERSEDED')),
  CHECK (erasure_state IN (
    'ACTIVE',
    'LIMITED',
    'LEGAL_HOLD',
    'ERASURE_PENDING',
    'PSEUDONYMISED',
    'ERASED'
  )),
  CHECK (jsonb_typeof(lineage_refs) = 'array'),
  CHECK (jsonb_array_length(lineage_refs) > 0),
  CHECK (jsonb_typeof(retention_tag) = 'object'),
  CHECK (jsonb_typeof(evidence_item_payload) = 'object'),
  CHECK (
    evidence_kind <> 'QUARANTINED_CONTENT'
    OR (
      erasure_state = 'LIMITED'
      AND extraction_method = 'QUARANTINE_BLOCKED_EXTRACTION'
      AND extraction_confidence = 0
    )
  ),
  CHECK (
    evidence_kind <> 'EXTRACTION_REVIEW_REQUIRED'
    OR extraction_confidence = 0
  )
);

CREATE INDEX IF NOT EXISTS source_record_manifest_idx
  ON control_collection.source_record_register (tenant_id, manifest_id, stored_at);

CREATE INDEX IF NOT EXISTS source_record_boundary_idx
  ON control_collection.source_record_register (tenant_id, collection_boundary_ref, stored_at);

CREATE INDEX IF NOT EXISTS source_record_partition_idx
  ON control_collection.source_record_register (tenant_id, manifest_id, business_partition, stored_at);

CREATE INDEX IF NOT EXISTS source_record_source_class_idx
  ON control_collection.source_record_register (tenant_id, manifest_id, source_class, stored_at);

CREATE INDEX IF NOT EXISTS source_record_raw_hash_idx
  ON control_collection.source_record_register (tenant_id, manifest_id, raw_hash, stored_at);

CREATE INDEX IF NOT EXISTS evidence_item_manifest_idx
  ON control_collection.evidence_item_register (manifest_id, stored_at);

CREATE INDEX IF NOT EXISTS evidence_item_source_record_idx
  ON control_collection.evidence_item_register (source_record_id, stored_at);

CREATE INDEX IF NOT EXISTS evidence_item_partition_idx
  ON control_collection.evidence_item_register (manifest_id, business_partition, period_partition, stored_at);

CREATE INDEX IF NOT EXISTS evidence_item_kind_idx
  ON control_collection.evidence_item_register (manifest_id, evidence_kind, stored_at);

ALTER TABLE control_collection.source_record_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_collection.evidence_item_register ENABLE ROW LEVEL SECURITY;
