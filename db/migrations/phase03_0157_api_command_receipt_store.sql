-- phase03_0157_api_command_receipt_store.sql
-- Durable northbound command receipts for POST /v1/commands.

CREATE TABLE IF NOT EXISTS api_command_receipts (
  receipt_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  principal_ref text NOT NULL,
  session_ref text NOT NULL,
  command_id text NOT NULL,
  command_type text NOT NULL,
  target_scope_class text NOT NULL CHECK (target_scope_class IN ('MANIFEST', 'WORK_ITEM', 'GOVERNANCE')),
  manifest_id text,
  work_item_id text,
  governance_target_ref text,
  request_hash text NOT NULL,
  dependency_topology_hash text,
  simulation_basis_hash text,
  idempotency_key text NOT NULL,
  acceptance_state text NOT NULL CHECK (
    acceptance_state IN (
      'ACCEPTED',
      'DUPLICATE_REPLAY',
      'REJECTED_STALE_VIEW',
      'REJECTED_POLICY',
      'REJECTED_INVALID',
      'EXPIRED'
    )
  ),
  original_acceptance_state text,
  duplicate_of_receipt_id text REFERENCES api_command_receipts(receipt_id),
  projection_stream_class text NOT NULL CHECK (
    projection_stream_class IN ('MANIFEST_EXPERIENCE', 'WORKSPACE', 'NONE')
  ),
  latest_projection_sequence bigint,
  latest_projection_ref text,
  semantic_action_id text,
  result_ref text,
  stale_guard_family text,
  latest_stale_guard_value jsonb,
  latest_mutation_basis_contract jsonb,
  latest_stability_contract jsonb,
  truth_boundary_contract jsonb NOT NULL,
  mutation_precondition_binding jsonb NOT NULL,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_event_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  notification_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  command_envelope jsonb NOT NULL,
  receipt_payload jsonb NOT NULL,
  accepted_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  persisted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > accepted_at),
  CHECK (
    duplicate_of_receipt_id IS NULL OR duplicate_of_receipt_id <> receipt_id
  ),
  CHECK (
    (target_scope_class = 'MANIFEST' AND manifest_id IS NOT NULL AND work_item_id IS NULL AND governance_target_ref IS NULL)
    OR (target_scope_class = 'WORK_ITEM' AND manifest_id IS NULL AND work_item_id IS NOT NULL AND governance_target_ref IS NULL)
    OR (target_scope_class = 'GOVERNANCE' AND manifest_id IS NULL AND work_item_id IS NULL AND governance_target_ref IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS api_command_receipts_exact_acceptance_uq
  ON api_command_receipts (
    tenant_id,
    principal_ref,
    session_ref,
    command_id,
    idempotency_key,
    request_hash
  )
  WHERE acceptance_state = 'ACCEPTED';

CREATE INDEX IF NOT EXISTS api_command_receipts_command_lookup_idx
  ON api_command_receipts (tenant_id, command_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS api_command_receipts_visible_command_lookup_idx
  ON api_command_receipts (
    tenant_id,
    principal_ref,
    client_id,
    target_scope_class,
    command_id,
    accepted_at DESC
  );

CREATE INDEX IF NOT EXISTS api_command_receipts_idempotency_lookup_idx
  ON api_command_receipts (
    tenant_id,
    principal_ref,
    session_ref,
    idempotency_key,
    accepted_at DESC
  );

CREATE INDEX IF NOT EXISTS api_command_receipts_expiry_idx
  ON api_command_receipts (expires_at);
