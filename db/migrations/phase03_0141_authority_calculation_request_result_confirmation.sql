-- pc_0141: authority calculation request/result/basis/confirmation/readiness artifacts.
-- These tables keep the calculation handshake first-class before packet build or sign-off.

CREATE TABLE IF NOT EXISTS authority_calculation_requests (
  calculation_request_id text PRIMARY KEY,
  calculation_request_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  manifest_id text NOT NULL,
  calculation_type text NOT NULL,
  request_state text NOT NULL,
  live_authority_call_executed boolean NOT NULL,
  access_binding_hash text NOT NULL,
  authority_operation_ref text,
  request_envelope_ref text,
  authority_interaction_ref text,
  record jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  requested_at timestamptz NOT NULL,
  CHECK (calculation_type IN ('in-year', 'intent-to-finalise', 'intent-to-amend', 'final-declaration')),
  CHECK (request_state IN ('MODELED_ONLY', 'TRIGGERED', 'RETRIEVE_PENDING', 'RETRIEVED', 'SUPERSEDED')),
  CHECK (
    live_authority_call_executed
    OR (
      request_state = 'MODELED_ONLY'
      AND authority_operation_ref IS NULL
      AND request_envelope_ref IS NULL
      AND authority_interaction_ref IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_authority_calculation_requests_manifest
  ON authority_calculation_requests (manifest_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_authority_calculation_requests_client
  ON authority_calculation_requests (tenant_id, client_id, requested_at);

CREATE TABLE IF NOT EXISTS authority_calculation_results (
  calculation_id text PRIMARY KEY,
  authority_calculation_ref text NOT NULL UNIQUE,
  calculation_request_ref text NOT NULL,
  manifest_id text NOT NULL,
  calculation_type text NOT NULL,
  result_state text NOT NULL,
  validation_outcome text NOT NULL,
  live_authority_call_executed boolean NOT NULL,
  calculation_hash text,
  retrieved_payload_ref text,
  authority_response_ref text,
  record jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  retrieved_at timestamptz,
  superseded_at timestamptz,
  CHECK (result_state IN ('MODELED', 'RETRIEVED', 'SUPERSEDED')),
  CHECK (validation_outcome IN ('PASS', 'PASS_WITH_NOTICE', 'MANUAL_REVIEW', 'OVERRIDABLE_BLOCK', 'HARD_BLOCK')),
  CHECK (result_state <> 'MODELED' OR (NOT live_authority_call_executed AND validation_outcome <> 'PASS' AND calculation_hash IS NULL)),
  CHECK (superseded_at IS NULL OR retrieved_at IS NULL OR superseded_at >= retrieved_at)
);

CREATE INDEX IF NOT EXISTS idx_authority_calculation_results_request
  ON authority_calculation_results (calculation_request_ref, retrieved_at);

CREATE TABLE IF NOT EXISTS calculation_bases (
  calculation_basis_id text PRIMARY KEY,
  calculation_basis_ref text NOT NULL UNIQUE,
  calculation_id text NOT NULL,
  calculation_request_ref text NOT NULL,
  manifest_id text NOT NULL,
  calculation_type text NOT NULL,
  basis_status text NOT NULL,
  basis_hash text NOT NULL,
  user_confirmation_ref text,
  parity_reusable boolean NOT NULL,
  filing_reusable boolean NOT NULL,
  record jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  captured_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  superseded_at timestamptz,
  CHECK (basis_status IN ('PROVISIONAL', 'CONFIRMED', 'REJECTED', 'SUPERSEDED')),
  CHECK ((parity_reusable = false AND filing_reusable = false) OR basis_status = 'CONFIRMED'),
  CHECK (superseded_at IS NULL OR basis_status = 'SUPERSEDED'),
  CHECK (confirmed_at IS NULL OR confirmed_at >= captured_at),
  CHECK (superseded_at IS NULL OR superseded_at >= COALESCE(confirmed_at, captured_at))
);

CREATE INDEX IF NOT EXISTS idx_calculation_bases_calculation
  ON calculation_bases (calculation_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_calculation_bases_status
  ON calculation_bases (basis_status, captured_at);

CREATE TABLE IF NOT EXISTS calculation_user_confirmations (
  user_confirmation_id text PRIMARY KEY,
  user_confirmation_ref text NOT NULL UNIQUE,
  calculation_id text NOT NULL,
  calculation_basis_ref text NOT NULL,
  manifest_id text NOT NULL,
  actor_ref text NOT NULL,
  actor_role text NOT NULL,
  confirmation_state text NOT NULL,
  confirmed_basis_hash text,
  record jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  confirmed_at timestamptz,
  declined_at timestamptz,
  CHECK (confirmation_state IN ('PENDING', 'CONFIRMED', 'DECLINED')),
  CHECK (confirmation_state <> 'CONFIRMED' OR (confirmed_basis_hash IS NOT NULL AND confirmed_at IS NOT NULL AND declined_at IS NULL)),
  CHECK (confirmation_state <> 'DECLINED' OR (confirmed_basis_hash IS NULL AND confirmed_at IS NULL AND declined_at IS NOT NULL)),
  CHECK (confirmation_state <> 'PENDING' OR (confirmed_basis_hash IS NULL AND confirmed_at IS NULL AND declined_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_calculation_user_confirmations_basis
  ON calculation_user_confirmations (calculation_basis_ref);

CREATE TABLE IF NOT EXISTS authority_calculation_readiness_contexts (
  calculation_readiness_context_id text PRIMARY KEY,
  calculation_readiness_context_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  owner_artifact_type text NOT NULL,
  owner_artifact_ref text NOT NULL,
  calculation_request_ref text NOT NULL,
  calculation_id text NOT NULL,
  calculation_type text NOT NULL,
  validation_outcome text NOT NULL,
  live_authority_call_executed boolean NOT NULL,
  calculation_hash text,
  calculation_basis_ref text,
  basis_hash text,
  user_confirmation_ref text,
  parity_reusable boolean NOT NULL,
  filing_reusable boolean NOT NULL,
  record jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  persisted_at timestamptz NOT NULL,
  CHECK (owner_artifact_type IN ('FilingCase', 'AmendmentCase')),
  CHECK (validation_outcome IN ('PASS', 'PASS_WITH_NOTICE', 'MANUAL_REVIEW', 'OVERRIDABLE_BLOCK', 'HARD_BLOCK')),
  CHECK (
    validation_outcome NOT IN ('PASS', 'PASS_WITH_NOTICE')
    OR (
      live_authority_call_executed
      AND calculation_hash IS NOT NULL
      AND calculation_basis_ref IS NOT NULL
      AND basis_hash IS NOT NULL
      AND user_confirmation_ref IS NOT NULL
      AND (parity_reusable OR filing_reusable)
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_authority_calculation_readiness_owner
  ON authority_calculation_readiness_contexts (owner_artifact_ref, persisted_at);
CREATE INDEX IF NOT EXISTS idx_authority_calculation_readiness_manifest
  ON authority_calculation_readiness_contexts (manifest_id, persisted_at);
