-- pc_0138: fraud-prevention header capture, validation, and request binding.
-- Raw high-risk fraud-header values are not stored in ordinary row columns.

CREATE TABLE IF NOT EXISTS fraud_header_profiles (
  profile_id text PRIMARY KEY,
  fraud_header_profile_ref text NOT NULL UNIQUE,
  authority_name text NOT NULL,
  authority_product_profiles text[] NOT NULL,
  provider_environments text[] NOT NULL,
  operation_families text[] NOT NULL,
  operation_profile_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  connection_method text NOT NULL,
  required_for_operation boolean NOT NULL,
  validation_required boolean NOT NULL,
  validation_ttl_seconds integer NOT NULL,
  exemption_policy text NOT NULL,
  profile_hash text NOT NULL UNIQUE,
  profile_record jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(profile_record) = 'object'),
  CHECK (array_length(authority_product_profiles, 1) > 0),
  CHECK (array_length(provider_environments, 1) > 0),
  CHECK (array_length(operation_families, 1) > 0),
  CHECK (validation_ttl_seconds > 0),
  CHECK (exemption_policy IN ('NOT_ALLOWED', 'HMRC_AGREED_MISSING_FIELDS_ONLY')),
  CHECK (
    connection_method IN (
      'BATCH_PROCESS_DIRECT',
      'DESKTOP_APP_DIRECT',
      'DESKTOP_APP_VIA_SERVER',
      'MOBILE_APP_DIRECT',
      'MOBILE_APP_VIA_SERVER',
      'OTHER_DIRECT',
      'OTHER_VIA_SERVER',
      'WEB_APP_VIA_SERVER'
    )
  )
);

CREATE INDEX IF NOT EXISTS fraud_header_profiles_applicability_idx
  ON fraud_header_profiles USING gin (authority_product_profiles, provider_environments, operation_families);

CREATE TABLE IF NOT EXISTS fraud_header_captures (
  capture_id text PRIMARY KEY,
  capture_ref text NOT NULL UNIQUE,
  fraud_header_profile_ref text NOT NULL REFERENCES fraud_header_profiles (fraud_header_profile_ref),
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  subject_ref text NOT NULL,
  provider_environment text NOT NULL,
  authority_product_profile text NOT NULL,
  operation_family text NOT NULL,
  operation_profile text NOT NULL,
  connection_method text NOT NULL,
  capture_state text NOT NULL,
  header_set_hash text NOT NULL,
  capture_fingerprint text NOT NULL UNIQUE,
  normalized_header_names text[] NOT NULL,
  missing_header_names text[] NOT NULL,
  redacted_header_values jsonb NOT NULL,
  secure_payload_ref_or_null text,
  captured_at timestamptz NOT NULL,
  expires_at timestamptz,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_environment IN ('SANDBOX', 'PRODUCTION')),
  CHECK (capture_state IN ('COMPLETE', 'INCOMPLETE', 'EXEMPTION_DECLARED')),
  CHECK (jsonb_typeof(redacted_header_values) = 'array'),
  CHECK (capture_state <> 'COMPLETE' OR cardinality(missing_header_names) = 0),
  CHECK (capture_state = 'COMPLETE' OR cardinality(missing_header_names) > 0)
);

CREATE INDEX IF NOT EXISTS fraud_header_captures_tuple_idx
  ON fraud_header_captures (tenant_id, client_id, subject_ref, provider_environment, operation_profile, captured_at DESC);

CREATE INDEX IF NOT EXISTS fraud_header_captures_header_hash_idx
  ON fraud_header_captures (header_set_hash, captured_at DESC);

CREATE TABLE IF NOT EXISTS fraud_header_validations (
  validation_id text PRIMARY KEY,
  validation_ref text NOT NULL UNIQUE,
  fraud_header_profile_ref text NOT NULL REFERENCES fraud_header_profiles (fraud_header_profile_ref),
  capture_ref text NOT NULL REFERENCES fraud_header_captures (capture_ref),
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  subject_ref text NOT NULL,
  provider_environment text NOT NULL,
  validation_mode text NOT NULL,
  result_code text NOT NULL,
  header_set_hash text NOT NULL,
  capture_fingerprint text NOT NULL,
  validation_hash text NOT NULL UNIQUE,
  validation_reason_codes text[] NOT NULL,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  sandbox_validator_response_ref_or_null text,
  validator_spec_version_or_null text,
  validated_at timestamptz NOT NULL,
  expires_at timestamptz,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_environment IN ('SANDBOX', 'PRODUCTION')),
  CHECK (validation_mode IN ('OFFLINE_CONTRACT', 'HMRC_SANDBOX_VALIDATOR', 'FIXTURE_SANDBOX_VALIDATOR')),
  CHECK (result_code IN ('VALID', 'WARNINGS', 'INVALID', 'EXEMPTED')),
  CHECK (jsonb_typeof(validation_errors) = 'array'),
  CHECK (jsonb_typeof(validation_warnings) = 'array'),
  CHECK (result_code <> 'INVALID' OR jsonb_array_length(validation_errors) > 0)
);

CREATE INDEX IF NOT EXISTS fraud_header_validations_tuple_idx
  ON fraud_header_validations (tenant_id, client_id, subject_ref, provider_environment, result_code, validated_at DESC);

CREATE INDEX IF NOT EXISTS fraud_header_validations_capture_idx
  ON fraud_header_validations (capture_ref, result_code, expires_at);

CREATE INDEX IF NOT EXISTS authority_request_envelopes_fraud_header_refs_idx
  ON authority_request_envelopes (
    fraud_header_profile_ref,
    fraud_header_capture_ref,
    fraud_header_validation_ref,
    fraud_header_exemption_reason
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'authority_request_envelopes_fraud_header_complete_chk'
  ) THEN
    ALTER TABLE authority_request_envelopes
      ADD CONSTRAINT authority_request_envelopes_fraud_header_complete_chk
      CHECK (
        fraud_header_profile_ref IS NULL
        OR fraud_header_validation_ref IS NOT NULL
        OR fraud_header_exemption_reason IS NOT NULL
      );
  END IF;
END $$;
