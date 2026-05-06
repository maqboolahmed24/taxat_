-- phase03_0139_authority_ingress_receipt_and_normalization_pipeline
-- Durable authority ingress checkpoint, quarantine/investigation, and normalization lineage.

CREATE TABLE IF NOT EXISTS authority_ingress_receipts (
  ingress_receipt_id text PRIMARY KEY,
  provider_environment text NOT NULL,
  provider_profile_ref text NOT NULL,
  ingress_channel_class text NOT NULL CHECK (
    ingress_channel_class IN (
      'CALLBACK',
      'POLL_RESULT',
      'INBOX_DELIVERY',
      'WORKER_OBSERVED',
      'GATEWAY_RECOVERED'
    )
  ),
  provider_delivery_ref text NOT NULL,
  response_body_ref text,
  response_body_hash text NOT NULL,
  ingress_channel_metadata_hash text NOT NULL,
  delivery_dedupe_key text NOT NULL,
  authority_reference text,
  request_hash text,
  idempotency_key text,
  identity_namespace_hash text,
  duplicate_meaning_key text,
  bound_interaction_ref text,
  correlation_status text NOT NULL CHECK (
    correlation_status IN ('BOUND', 'BOUND_WITH_AUTHORITY_REFERENCE_ONLY', 'AMBIGUOUS', 'UNBOUND')
  ),
  authenticated_channel_state text NOT NULL CHECK (authenticated_channel_state IN ('AUTHENTICATED', 'FAILED')),
  receipt_state text NOT NULL CHECK (receipt_state IN ('PERSISTED', 'NORMALIZED', 'QUARANTINED', 'DUPLICATE_SUPPRESSED')),
  received_at timestamptz NOT NULL,
  persisted_at timestamptz NOT NULL,
  quarantined_at timestamptz,
  quarantine_reason_codes text[] NOT NULL DEFAULT '{}',
  canonical_ingress_receipt_ref text,
  reconciliation_owner_ref text,
  normalized_response_ref text,
  audit_event_refs text[] NOT NULL,
  authority_truth_contract jsonb NOT NULL,
  authority_ingress_proof_contract jsonb NOT NULL,
  authority_ingress_correlation_contract jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (persisted_at >= received_at),
  CHECK ((response_body_ref IS NULL AND response_body_hash = '<NONE>') OR (response_body_ref IS NOT NULL AND response_body_hash <> '<NONE>')),
  CHECK (
    (correlation_status = 'BOUND' AND authority_reference IS NOT NULL AND request_hash IS NOT NULL AND idempotency_key IS NOT NULL AND identity_namespace_hash IS NOT NULL AND duplicate_meaning_key IS NOT NULL AND bound_interaction_ref IS NOT NULL)
    OR (correlation_status <> 'BOUND' AND bound_interaction_ref IS NULL)
  ),
  CHECK (
    (receipt_state = 'PERSISTED' AND quarantined_at IS NULL AND cardinality(quarantine_reason_codes) = 0 AND canonical_ingress_receipt_ref IS NULL AND reconciliation_owner_ref IS NULL AND normalized_response_ref IS NULL)
    OR (receipt_state = 'NORMALIZED' AND authenticated_channel_state = 'AUTHENTICATED' AND correlation_status = 'BOUND' AND quarantined_at IS NULL AND cardinality(quarantine_reason_codes) = 0 AND canonical_ingress_receipt_ref IS NULL AND reconciliation_owner_ref IS NULL AND normalized_response_ref IS NOT NULL)
    OR (receipt_state = 'QUARANTINED' AND quarantined_at IS NOT NULL AND cardinality(quarantine_reason_codes) > 0 AND canonical_ingress_receipt_ref IS NULL AND reconciliation_owner_ref IS NOT NULL AND normalized_response_ref IS NULL)
    OR (receipt_state = 'DUPLICATE_SUPPRESSED' AND authenticated_channel_state = 'AUTHENTICATED' AND quarantined_at IS NULL AND cardinality(quarantine_reason_codes) = 0 AND canonical_ingress_receipt_ref IS NOT NULL AND reconciliation_owner_ref IS NULL AND normalized_response_ref IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_provider_delivery_ref
  ON authority_ingress_receipts (provider_delivery_ref);
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_response_body_hash
  ON authority_ingress_receipts (response_body_hash);
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_metadata_hash
  ON authority_ingress_receipts (ingress_channel_metadata_hash);
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_delivery_dedupe_key
  ON authority_ingress_receipts (delivery_dedupe_key, persisted_at, ingress_receipt_id);
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_request_hash
  ON authority_ingress_receipts (request_hash) WHERE request_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_idempotency_key
  ON authority_ingress_receipts (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_identity_namespace_hash
  ON authority_ingress_receipts (identity_namespace_hash) WHERE identity_namespace_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_duplicate_meaning_key
  ON authority_ingress_receipts (duplicate_meaning_key) WHERE duplicate_meaning_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authority_ingress_receipts_correlation_status
  ON authority_ingress_receipts (correlation_status, receipt_state);

CREATE TABLE IF NOT EXISTS authority_ingress_investigation_snapshots (
  investigation_id text PRIMARY KEY,
  ingress_receipt_ref text NOT NULL,
  provider_environment text NOT NULL,
  provider_profile_ref text NOT NULL,
  ingress_channel_class text NOT NULL CHECK (
    ingress_channel_class IN (
      'CALLBACK',
      'POLL_RESULT',
      'INBOX_DELIVERY',
      'WORKER_OBSERVED',
      'GATEWAY_RECOVERED'
    )
  ),
  receipt_state text NOT NULL CHECK (receipt_state IN ('QUARANTINED', 'DUPLICATE_SUPPRESSED')),
  correlation_status text NOT NULL CHECK (
    correlation_status IN ('BOUND', 'BOUND_WITH_AUTHORITY_REFERENCE_ONLY', 'AMBIGUOUS', 'UNBOUND')
  ),
  authenticated_channel_state text NOT NULL CHECK (authenticated_channel_state IN ('AUTHENTICATED', 'FAILED')),
  response_body_ref text,
  response_body_hash text NOT NULL,
  delivery_dedupe_key text NOT NULL,
  authority_reference_or_null text,
  bound_interaction_ref_or_null text,
  normalized_response_ref_or_null text,
  authority_ingress_proof_contract jsonb NOT NULL,
  authority_ingress_correlation_contract jsonb NOT NULL,
  delivery_lineage jsonb NOT NULL,
  quarantine_explainability jsonb NOT NULL,
  safe_next_action_codes text[] NOT NULL,
  investigation_source_policy text NOT NULL DEFAULT 'PERSISTED_RECEIPT_PAYLOAD_AUDIT_AND_LINEAGE_ONLY',
  legal_mutation_policy text NOT NULL DEFAULT 'NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION',
  updated_at timestamptz NOT NULL,
  CHECK ((response_body_ref IS NULL AND response_body_hash = '<NONE>') OR (response_body_ref IS NOT NULL AND response_body_hash <> '<NONE>')),
  CHECK (cardinality(safe_next_action_codes) > 0),
  CHECK (investigation_source_policy = 'PERSISTED_RECEIPT_PAYLOAD_AUDIT_AND_LINEAGE_ONLY'),
  CHECK (legal_mutation_policy = 'NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION')
);

CREATE INDEX IF NOT EXISTS idx_authority_ingress_investigation_receipt_ref
  ON authority_ingress_investigation_snapshots (ingress_receipt_ref, updated_at);
CREATE INDEX IF NOT EXISTS idx_authority_ingress_investigation_receipt_state
  ON authority_ingress_investigation_snapshots (receipt_state, updated_at);
CREATE INDEX IF NOT EXISTS idx_authority_ingress_investigation_correlation_status
  ON authority_ingress_investigation_snapshots (correlation_status, updated_at);

