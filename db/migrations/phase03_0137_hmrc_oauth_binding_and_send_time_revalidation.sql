-- pc_0137: HMRC OAuth token-client binding and send-time revalidation.
-- These tables preserve pre-network legality checks without storing raw OAuth tokens.

CREATE TABLE IF NOT EXISTS authority_send_claims (
  dispatch_ref text NOT NULL,
  request_hash text NOT NULL,
  duplicate_meaning_key text NOT NULL,
  lifecycle_state text NOT NULL,
  claim_owner_ref text NOT NULL,
  claim_state text NOT NULL,
  claimed_at timestamptz NOT NULL,
  closed_at timestamptz,
  release_reason_code text,
  PRIMARY KEY (dispatch_ref, request_hash, duplicate_meaning_key),
  CHECK (lifecycle_state IN ('DISPATCH_READY', 'TRANSMIT_IN_FLIGHT')),
  CHECK (claim_state IN ('ACTIVE', 'RELEASED', 'CLOSED')),
  CHECK (
    claim_state = 'ACTIVE'
    OR (closed_at IS NOT NULL AND release_reason_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS authority_send_claims_owner_idx
  ON authority_send_claims (claim_owner_ref, claim_state, claimed_at DESC);

CREATE TABLE IF NOT EXISTS authority_send_revalidation_projections (
  interaction_id text PRIMARY KEY,
  dispatch_ref text NOT NULL,
  request_hash text NOT NULL,
  send_revalidation_state text NOT NULL,
  send_revalidated_at timestamptz,
  send_authorized_token_version_ref text,
  send_revalidation_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  binding_drift_sentinel_contract jsonb NOT NULL,
  binding_lineage_ref text GENERATED ALWAYS AS ((binding_drift_sentinel_contract ->> 'binding_lineage_ref')) STORED,
  subject_ref text GENERATED ALWAYS AS ((binding_drift_sentinel_contract ->> 'subject_ref')) STORED,
  client_id text GENERATED ALWAYS AS ((binding_drift_sentinel_contract ->> 'client_id')) STORED,
  duplicate_meaning_key text GENERATED ALWAYS AS ((binding_drift_sentinel_contract ->> 'duplicate_meaning_key')) STORED,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (send_revalidation_state IN ('NOT_PERFORMED', 'CLEAR_TO_SEND', 'BLOCKED')),
  CHECK (jsonb_typeof(send_revalidation_reason_codes) = 'array'),
  CHECK (jsonb_typeof(binding_drift_sentinel_contract) = 'object'),
  CHECK (
    send_revalidation_state <> 'NOT_PERFORMED'
    OR (
      send_revalidated_at IS NULL
      AND send_authorized_token_version_ref IS NULL
      AND jsonb_array_length(send_revalidation_reason_codes) = 0
    )
  ),
  CHECK (
    send_revalidation_state <> 'CLEAR_TO_SEND'
    OR (
      send_revalidated_at IS NOT NULL
      AND send_authorized_token_version_ref IS NOT NULL
      AND jsonb_array_length(send_revalidation_reason_codes) = 1
    )
  ),
  CHECK (
    send_revalidation_state <> 'BLOCKED'
    OR (
      send_revalidated_at IS NOT NULL
      AND send_authorized_token_version_ref IS NULL
      AND jsonb_array_length(send_revalidation_reason_codes) > 0
    )
  )
);

CREATE INDEX IF NOT EXISTS authority_send_revalidation_request_idx
  ON authority_send_revalidation_projections (request_hash, send_revalidation_state, inserted_at DESC);

CREATE INDEX IF NOT EXISTS authority_send_revalidation_dispatch_idx
  ON authority_send_revalidation_projections (dispatch_ref, inserted_at DESC);

CREATE INDEX IF NOT EXISTS authority_send_revalidation_binding_tuple_idx
  ON authority_send_revalidation_projections (
    binding_lineage_ref,
    subject_ref,
    client_id,
    duplicate_meaning_key,
    send_revalidation_state,
    inserted_at DESC
  );

CREATE INDEX IF NOT EXISTS authority_request_identity_lookup_binding_lineage_idx
  ON authority_request_identity_lookup (binding_lineage_ref, subject_ref, client_id, duplicate_meaning_key, inserted_at DESC);
