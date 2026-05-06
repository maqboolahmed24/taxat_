-- pc_0135: Authority operation, binding, request envelope, and response envelope models.
-- These tables persist the frozen authority transport spine. Token versions remain sealed on
-- authority_bindings, while request envelopes freeze binding lineage and response envelopes remain
-- append-only observations.

CREATE TABLE IF NOT EXISTS authority_operations (
  operation_id text PRIMARY KEY,
  operation_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  manifest_id text NOT NULL,
  manifest_hash text NOT NULL,
  execution_basis_hash text NOT NULL,
  attempt_lineage_manifest_id text NOT NULL,
  operation_family text NOT NULL,
  authority_binding_ref text NOT NULL,
  authority_link_ref text NOT NULL,
  delegation_grant_ref text,
  binding_lineage_ref text NOT NULL,
  token_binding_ref text NOT NULL,
  subject_ref text NOT NULL,
  acting_party_ref text NOT NULL,
  requested_scope jsonb NOT NULL,
  runtime_scope jsonb NOT NULL,
  business_partitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope_execution_binding jsonb NOT NULL,
  authority_layer_boundary jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(requested_scope) = 'array' AND jsonb_array_length(requested_scope) > 0),
  CHECK (jsonb_typeof(runtime_scope) = 'array' AND jsonb_array_length(runtime_scope) > 0),
  CHECK (jsonb_typeof(business_partitions) = 'array'),
  CHECK (jsonb_typeof(scope_execution_binding) = 'object'),
  CHECK (jsonb_typeof(authority_layer_boundary) = 'object'),
  CHECK (
    acting_party_ref <> subject_ref
    OR delegation_grant_ref IS NULL
  ),
  CHECK (
    acting_party_ref = subject_ref
    OR delegation_grant_ref IS NOT NULL
  ),
  CHECK (
    operation_family NOT IN (
      'AUTH_CREATE_OR_AMEND_DATA',
      'AUTH_DELETE_DATA',
      'AUTH_TRIGGER_CALCULATION',
      'AUTH_SUBMIT_FINAL_DECLARATION',
      'AUTH_SUBMIT_PERIODIC_UPDATE',
      'AUTH_SUBMIT_POST_FINALISATION_AMENDMENT'
    )
    OR jsonb_array_length(business_partitions) > 0
  )
);

CREATE INDEX IF NOT EXISTS authority_operations_manifest_idx
  ON authority_operations (tenant_id, manifest_id, operation_family);

CREATE INDEX IF NOT EXISTS authority_operations_binding_idx
  ON authority_operations (authority_binding_ref, inserted_at DESC);

CREATE TABLE IF NOT EXISTS authority_bindings (
  authority_binding_id text PRIMARY KEY,
  authority_binding_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  manifest_id text NOT NULL,
  principal_context_ref text NOT NULL,
  authorization_decision_ref text NOT NULL,
  authority_link_ref text NOT NULL,
  delegation_grant_ref text,
  delegation_state text NOT NULL,
  authority_link_state text NOT NULL,
  partition_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  token_binding_ref text NOT NULL,
  binding_lineage_ref text NOT NULL UNIQUE,
  token_version_ref text NOT NULL,
  subject_ref text NOT NULL,
  acting_party_ref text NOT NULL,
  authority_scope text NOT NULL,
  provider_environment text NOT NULL,
  provider_api_version text NOT NULL,
  access_binding_hash text NOT NULL,
  policy_snapshot_hash text NOT NULL,
  token_client_binding_state text NOT NULL,
  binding_health text NOT NULL,
  last_validated_at timestamptz NOT NULL,
  expires_at timestamptz,
  blocked_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_layer_boundary jsonb NOT NULL,
  step_up_state text NOT NULL,
  step_up_evidence_ref text,
  approval_state text NOT NULL,
  approval_ref text,
  binding_resolved_at timestamptz NOT NULL,
  content_fingerprint text NOT NULL,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(blocked_reason_codes) = 'array'),
  CHECK (jsonb_typeof(authority_layer_boundary) = 'object'),
  CHECK (binding_resolved_at >= last_validated_at),
  CHECK (
    binding_health NOT IN ('EXPIRING_SOON', 'EXPIRED')
    OR expires_at IS NOT NULL
  ),
  CHECK (
    binding_health <> 'EXPIRED'
    OR expires_at <= binding_resolved_at
  ),
  CHECK (
    binding_health NOT IN ('HEALTHY', 'EXPIRING_SOON')
    OR (
      token_client_binding_state = 'BOUND'
      AND delegation_state IN ('NOT_REQUIRED', 'SATISFIED')
      AND authority_link_state = 'AUTHORISED_ACTIVE'
      AND jsonb_array_length(blocked_reason_codes) = 0
    )
  ),
  CHECK (
    binding_health IN ('HEALTHY', 'EXPIRING_SOON')
    OR jsonb_array_length(blocked_reason_codes) > 0
  ),
  CHECK (
    binding_health <> 'CLIENT_BINDING_MISMATCH'
    OR token_client_binding_state = 'MISMATCH'
  ),
  CHECK (
    acting_party_ref <> subject_ref
    OR (delegation_grant_ref IS NULL AND delegation_state = 'NOT_REQUIRED')
  ),
  CHECK (
    acting_party_ref = subject_ref
    OR delegation_grant_ref IS NOT NULL
  ),
  CHECK (
    step_up_state = 'SATISFIED'
    OR step_up_evidence_ref IS NULL
  ),
  CHECK (
    step_up_state <> 'SATISFIED'
    OR step_up_evidence_ref IS NOT NULL
  ),
  CHECK (
    approval_state = 'SATISFIED'
    OR approval_ref IS NULL
  ),
  CHECK (
    approval_state <> 'SATISFIED'
    OR approval_ref IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS authority_bindings_client_idx
  ON authority_bindings (tenant_id, client_id, authority_scope, provider_environment);

CREATE INDEX IF NOT EXISTS authority_bindings_token_idx
  ON authority_bindings (token_binding_ref, token_version_ref);

CREATE TABLE IF NOT EXISTS authority_request_envelopes (
  request_id text PRIMARY KEY,
  request_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  manifest_id text NOT NULL,
  operation_id text NOT NULL,
  operation_family text NOT NULL,
  authority_binding_ref text NOT NULL,
  authority_link_ref text NOT NULL,
  delegation_grant_ref text,
  binding_lineage_ref text NOT NULL,
  token_binding_ref text NOT NULL,
  subject_ref text NOT NULL,
  acting_party_ref text NOT NULL,
  canonical_path text NOT NULL,
  canonical_query text NOT NULL,
  header_profile_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload_ref text,
  request_body_hash text NOT NULL,
  identity_namespace_hash text NOT NULL,
  duplicate_meaning_key text NOT NULL UNIQUE,
  request_hash text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  business_partition_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  obligation_ref text,
  basis_type text,
  normalized_obligation_ref text NOT NULL,
  normalized_basis_type text NOT NULL,
  request_identity_contract jsonb NOT NULL,
  authority_layer_boundary jsonb NOT NULL,
  fraud_header_profile_ref text,
  fraud_header_capture_ref text,
  fraud_header_validation_ref text,
  fraud_header_exemption_reason text,
  transmit_policy_ref text NOT NULL,
  content_fingerprint text NOT NULL,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(header_profile_refs) = 'array'),
  CHECK (jsonb_typeof(business_partition_refs) = 'array'),
  CHECK (jsonb_typeof(request_identity_contract) = 'object'),
  CHECK (jsonb_typeof(authority_layer_boundary) = 'object'),
  CHECK ((payload_ref IS NULL AND request_body_hash = '<NONE>') OR (payload_ref IS NOT NULL AND request_body_hash <> '<NONE>')),
  CHECK ((obligation_ref IS NULL AND normalized_obligation_ref = '<NONE>') OR (obligation_ref IS NOT NULL AND normalized_obligation_ref <> '<NONE>')),
  CHECK ((basis_type IS NULL AND normalized_basis_type = '<NONE>') OR (basis_type IS NOT NULL AND normalized_basis_type <> '<NONE>')),
  CHECK (
    operation_family NOT IN (
      'AUTH_CREATE_OR_AMEND_DATA',
      'AUTH_DELETE_DATA',
      'AUTH_TRIGGER_CALCULATION',
      'AUTH_SUBMIT_FINAL_DECLARATION',
      'AUTH_SUBMIT_PERIODIC_UPDATE',
      'AUTH_SUBMIT_POST_FINALISATION_AMENDMENT'
    )
    OR jsonb_array_length(business_partition_refs) > 0
  ),
  CHECK (
    fraud_header_profile_ref IS NOT NULL
    OR (
      fraud_header_capture_ref IS NULL
      AND fraud_header_validation_ref IS NULL
      AND fraud_header_exemption_reason IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS authority_request_envelopes_manifest_idx
  ON authority_request_envelopes (tenant_id, manifest_id, operation_family);

CREATE INDEX IF NOT EXISTS authority_request_envelopes_binding_idx
  ON authority_request_envelopes (authority_binding_ref, inserted_at DESC);

CREATE TABLE IF NOT EXISTS authority_response_envelopes (
  response_id text PRIMARY KEY,
  response_ref text NOT NULL UNIQUE,
  request_id text NOT NULL,
  received_at timestamptz NOT NULL,
  provider_received_at timestamptz,
  http_status integer CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  response_headers_ref text,
  response_body_ref text,
  response_body_hash text NOT NULL,
  authority_reference text,
  response_source text NOT NULL,
  provider_delivery_ref text UNIQUE,
  inbox_receipt_ref text,
  ingress_receipt_ref text,
  authority_ingress_proof_contract jsonb,
  derivation_posture text NOT NULL,
  legal_effect_posture text NOT NULL,
  supersedes_response_id text,
  corroborates_response_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  conflicting_response_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  recovery_basis_response_id text,
  correlation_status text NOT NULL,
  response_class text NOT NULL,
  retry_class text NOT NULL,
  content_fingerprint text NOT NULL,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_received_at IS NULL OR provider_received_at <= received_at),
  CHECK (jsonb_typeof(corroborates_response_ids) = 'array'),
  CHECK (jsonb_typeof(conflicting_response_ids) = 'array'),
  CHECK ((response_body_ref IS NULL AND response_body_hash = '<NONE>') OR (response_body_ref IS NOT NULL AND response_body_hash <> '<NONE>')),
  CHECK (
    response_source NOT IN ('CALLBACK', 'POLL', 'RECOVERY_READ')
    OR (
      provider_delivery_ref IS NOT NULL
      AND inbox_receipt_ref IS NOT NULL
      AND ingress_receipt_ref IS NOT NULL
      AND authority_ingress_proof_contract IS NOT NULL
    )
  ),
  CHECK (
    response_source NOT IN ('INLINE_HTTP', 'TRANSPORT_TIMEOUT')
    OR authority_ingress_proof_contract IS NULL
  ),
  CHECK (
    response_source <> 'TRANSPORT_TIMEOUT'
    OR (
      provider_received_at IS NULL
      AND http_status IS NULL
      AND response_headers_ref IS NULL
      AND response_body_ref IS NULL
      AND response_body_hash = '<NONE>'
      AND authority_reference IS NULL
      AND provider_delivery_ref IS NULL
      AND inbox_receipt_ref IS NULL
      AND ingress_receipt_ref IS NULL
      AND derivation_posture = 'TIMEOUT_PLACEHOLDER'
      AND legal_effect_posture = 'PROVISIONAL_STATE_MUTATION'
      AND response_class = 'ACK_TIMEOUT_OR_NO_RESOLUTION'
    )
  )
);

CREATE INDEX IF NOT EXISTS authority_response_envelopes_request_idx
  ON authority_response_envelopes (request_id, received_at, response_id);
