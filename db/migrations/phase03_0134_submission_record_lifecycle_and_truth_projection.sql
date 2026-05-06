-- pc_0134: SubmissionRecord lifecycle and authority-truth projection.
-- SubmissionRecord is the durable authority-settlement ledger. Obligation mirrors, workflow, and
-- client timeline rows remain projections and must not invent confirmed authority truth.

CREATE TABLE IF NOT EXISTS submission_records (
  submission_id text PRIMARY KEY,
  submission_record_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  client_id text NOT NULL,
  provider_environment text NOT NULL,
  authority_scope text NOT NULL,
  operation_family text NOT NULL,
  basis_type text NOT NULL,
  attempt_lineage_manifest_id text NOT NULL,
  obligation_ref text NOT NULL,
  lifecycle_state text NOT NULL CHECK (
    lifecycle_state IN (
      'INTENT_RECORDED',
      'TRANSMIT_PENDING',
      'TRANSMITTED',
      'PENDING_ACK',
      'CONFIRMED',
      'REJECTED',
      'UNKNOWN',
      'OUT_OF_BAND',
      'SUPERSEDED'
    )
  ),
  packet_ref text,
  request_envelope_ref text,
  request_hash text,
  idempotency_key text,
  identity_namespace_hash text NOT NULL,
  duplicate_meaning_key text NOT NULL,
  response_ref text,
  authority_reference text,
  authority_evidence_ref text,
  baseline_type text CHECK (
    baseline_type IN ('WORKING', 'FILED', 'AMENDED', 'AUTHORITY_CORRECTED', 'OUT_OF_BAND')
  ),
  reconciliation_deadline_at timestamptz,
  superseded_by_submission_id text,
  proof_bundle_ref text,
  proof_bundle_hash text,
  rejection_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  correlation_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  temporal_propagation_event_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_identity_contract jsonb,
  authority_ingress_proof_contract jsonb,
  reconciliation_control_contract jsonb,
  authority_truth_contract jsonb NOT NULL,
  state_transition_contract jsonb NOT NULL,
  execution_mode_boundary_contract jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  record jsonb NOT NULL,
  state_changed_at timestamptz NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(rejection_reason_codes) = 'array'),
  CHECK (jsonb_typeof(correlation_refs) = 'array'),
  CHECK (jsonb_typeof(temporal_propagation_event_refs) = 'array'),
  CHECK ((proof_bundle_ref IS NULL AND proof_bundle_hash IS NULL) OR (proof_bundle_ref IS NOT NULL AND proof_bundle_hash IS NOT NULL)),
  CHECK (
    lifecycle_state <> 'INTENT_RECORDED'
    OR (
      packet_ref IS NOT NULL
      AND request_envelope_ref IS NOT NULL
      AND request_hash IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND request_identity_contract IS NOT NULL
      AND response_ref IS NULL
      AND authority_reference IS NULL
      AND authority_evidence_ref IS NULL
      AND baseline_type IS NULL
      AND reconciliation_deadline_at IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(rejection_reason_codes) = 0
      AND superseded_by_submission_id IS NULL
    )
  ),
  CHECK (
    lifecycle_state NOT IN ('TRANSMIT_PENDING', 'TRANSMITTED')
    OR (
      packet_ref IS NOT NULL
      AND request_envelope_ref IS NOT NULL
      AND request_hash IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND request_identity_contract IS NOT NULL
      AND response_ref IS NULL
      AND authority_reference IS NULL
      AND authority_evidence_ref IS NULL
      AND baseline_type IS NULL
      AND reconciliation_deadline_at IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(rejection_reason_codes) = 0
      AND superseded_by_submission_id IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'PENDING_ACK'
    OR (
      packet_ref IS NOT NULL
      AND request_envelope_ref IS NOT NULL
      AND request_hash IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND request_identity_contract IS NOT NULL
      AND response_ref IS NOT NULL
      AND authority_ingress_proof_contract IS NOT NULL
      AND reconciliation_control_contract IS NOT NULL
      AND reconciliation_deadline_at IS NOT NULL
      AND baseline_type IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(rejection_reason_codes) = 0
      AND superseded_by_submission_id IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'CONFIRMED'
    OR (
      packet_ref IS NOT NULL
      AND request_envelope_ref IS NOT NULL
      AND request_hash IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND request_identity_contract IS NOT NULL
      AND response_ref IS NOT NULL
      AND authority_reference IS NOT NULL
      AND authority_evidence_ref IS NOT NULL
      AND authority_ingress_proof_contract IS NOT NULL
      AND baseline_type IN ('FILED', 'AMENDED', 'AUTHORITY_CORRECTED')
      AND reconciliation_deadline_at IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(temporal_propagation_event_refs) > 0
      AND jsonb_array_length(rejection_reason_codes) = 0
      AND superseded_by_submission_id IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'REJECTED'
    OR (
      packet_ref IS NOT NULL
      AND request_envelope_ref IS NOT NULL
      AND request_hash IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND request_identity_contract IS NOT NULL
      AND response_ref IS NOT NULL
      AND authority_evidence_ref IS NOT NULL
      AND authority_ingress_proof_contract IS NOT NULL
      AND baseline_type IS NULL
      AND reconciliation_deadline_at IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(rejection_reason_codes) > 0
      AND superseded_by_submission_id IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'UNKNOWN'
    OR (
      packet_ref IS NOT NULL
      AND request_envelope_ref IS NOT NULL
      AND request_hash IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND request_identity_contract IS NOT NULL
      AND response_ref IS NOT NULL
      AND reconciliation_control_contract IS NOT NULL
      AND reconciliation_deadline_at IS NOT NULL
      AND baseline_type IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(rejection_reason_codes) = 0
      AND superseded_by_submission_id IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'OUT_OF_BAND'
    OR (
      packet_ref IS NULL
      AND request_envelope_ref IS NULL
      AND request_hash IS NULL
      AND idempotency_key IS NULL
      AND request_identity_contract IS NULL
      AND response_ref IS NULL
      AND authority_evidence_ref IS NOT NULL
      AND baseline_type = 'OUT_OF_BAND'
      AND reconciliation_control_contract IS NOT NULL
      AND reconciliation_deadline_at IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(temporal_propagation_event_refs) > 0
      AND jsonb_array_length(rejection_reason_codes) = 0
      AND superseded_by_submission_id IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'SUPERSEDED'
    OR (
      packet_ref IS NOT NULL
      AND request_envelope_ref IS NOT NULL
      AND request_hash IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND request_identity_contract IS NOT NULL
      AND baseline_type IS NULL
      AND reconciliation_deadline_at IS NULL
      AND proof_bundle_ref IS NOT NULL
      AND proof_bundle_hash IS NOT NULL
      AND jsonb_array_length(rejection_reason_codes) = 0
      AND superseded_by_submission_id IS NOT NULL
      AND superseded_by_submission_id <> submission_id
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS submission_records_one_active_duplicate_meaning
  ON submission_records (duplicate_meaning_key)
  WHERE lifecycle_state <> 'SUPERSEDED';

CREATE INDEX IF NOT EXISTS submission_records_client_idx
  ON submission_records (client_id, operation_family, obligation_ref, state_changed_at);

CREATE INDEX IF NOT EXISTS submission_records_manifest_idx
  ON submission_records (manifest_id, state_changed_at);
