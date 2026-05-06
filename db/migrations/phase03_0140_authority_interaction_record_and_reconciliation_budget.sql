-- phase03_0140_authority_interaction_record_and_reconciliation_budget
-- Durable authority runtime ledger plus persisted reconciliation-control budget packet.

CREATE TABLE IF NOT EXISTS authority_interaction_records (
  interaction_id text PRIMARY KEY,
  interaction_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  operation_id text NOT NULL,
  request_id text NOT NULL,
  authority_operation_profile_ref text NOT NULL,
  request_hash text NOT NULL,
  idempotency_key text NOT NULL,
  identity_namespace_hash text NOT NULL,
  duplicate_meaning_key text NOT NULL,
  authority_binding_ref text NOT NULL,
  authority_link_ref text NOT NULL,
  binding_lineage_ref text NOT NULL,
  access_binding_hash text NOT NULL,
  policy_snapshot_hash text NOT NULL,
  lifecycle_state text NOT NULL CHECK (
    lifecycle_state IN (
      'REQUEST_REGISTERED',
      'DISPATCH_READY',
      'TRANSMIT_IN_FLIGHT',
      'RESPONSE_CAPTURED',
      'RECONCILING',
      'RESOLVED',
      'ABANDONED'
    )
  ),
  created_at timestamptz NOT NULL,
  last_status_at timestamptz NOT NULL,
  active_response_id text,
  response_history_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  meaning_resolution_state text NOT NULL CHECK (
    meaning_resolution_state IN (
      'NO_RESPONSE',
      'PROVISIONAL_TIMEOUT',
      'ACTIVE_DIRECT',
      'ACTIVE_CORROBORATED',
      'RECONCILIATION_REQUIRED',
      'RECONCILIATION_RESOLVED'
    )
  ),
  submission_record_ref text,
  dispatch_ref text NOT NULL,
  send_revalidation_state text NOT NULL CHECK (
    send_revalidation_state IN ('NOT_PERFORMED', 'CLEAR_TO_SEND', 'BLOCKED')
  ),
  send_revalidated_at timestamptz,
  send_authorized_token_version_ref text,
  send_revalidation_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  reconciliation_method text NOT NULL CHECK (
    reconciliation_method IN ('NONE', 'READ_AFTER_WRITE', 'POLL_STATUS', 'POLL_OBLIGATIONS', 'MANUAL_ONLY')
  ),
  max_auto_reconciliation_attempts integer NOT NULL CHECK (max_auto_reconciliation_attempts >= 0),
  reconciliation_cadence_seconds integer CHECK (reconciliation_cadence_seconds >= 1),
  reconciliation_budget_state text NOT NULL CHECK (
    reconciliation_budget_state IN ('NOT_OPENED', 'ACTIVE', 'EXHAUSTED', 'ESCALATED', 'CLOSED')
  ),
  next_reconciliation_at timestamptz,
  reconciliation_attempt_count integer NOT NULL CHECK (reconciliation_attempt_count >= 0),
  reconciliation_deadline_at timestamptz,
  reconciliation_escalated_at timestamptz,
  reconciliation_workflow_item_ref text,
  resend_legality_state text NOT NULL CHECK (
    resend_legality_state IN (
      'UNASSESSED',
      'IDEMPOTENT_RECOVERY_ONLY',
      'FOLLOW_UP_READ_ONLY',
      'BLOCKED_BY_RECONCILIATION',
      'BLOCKED_BY_ESCALATION',
      'CLOSED_NO_RESEND'
    )
  ),
  resend_control_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolution_basis text CHECK (resolution_basis IN ('TERMINAL_RESPONSE', 'RECONCILIATION_RESULT')),
  abandonment_reason_code text,
  request_identity_contract jsonb NOT NULL,
  binding_drift_sentinel_contract jsonb NOT NULL,
  authority_ingress_proof_contract jsonb,
  truth_boundary_contract jsonb NOT NULL,
  authority_truth_contract jsonb NOT NULL,
  reconciliation_control_contract jsonb NOT NULL,
  audit_refs jsonb NOT NULL,
  provenance_refs jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(response_history_ids) = 'array'),
  CHECK (jsonb_typeof(send_revalidation_reason_codes) = 'array'),
  CHECK (jsonb_typeof(resend_control_reason_codes) = 'array'),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) > 0),
  CHECK (jsonb_typeof(provenance_refs) = 'array' AND jsonb_array_length(provenance_refs) > 0),
  CHECK (last_status_at >= created_at),
  CHECK (
    (send_revalidation_state = 'NOT_PERFORMED'
      AND send_revalidated_at IS NULL
      AND send_authorized_token_version_ref IS NULL
      AND jsonb_array_length(send_revalidation_reason_codes) = 0)
    OR
    (send_revalidation_state = 'CLEAR_TO_SEND'
      AND send_revalidated_at IS NOT NULL
      AND send_authorized_token_version_ref IS NOT NULL
      AND jsonb_array_length(send_revalidation_reason_codes) = 1)
    OR
    (send_revalidation_state = 'BLOCKED'
      AND send_revalidated_at IS NOT NULL
      AND send_authorized_token_version_ref IS NULL
      AND jsonb_array_length(send_revalidation_reason_codes) > 0)
  ),
  CHECK (
    lifecycle_state NOT IN ('REQUEST_REGISTERED', 'DISPATCH_READY')
    OR (
      active_response_id IS NULL
      AND jsonb_array_length(response_history_ids) = 0
      AND meaning_resolution_state = 'NO_RESPONSE'
      AND reconciliation_budget_state = 'NOT_OPENED'
      AND next_reconciliation_at IS NULL
      AND reconciliation_deadline_at IS NULL
      AND reconciliation_escalated_at IS NULL
      AND reconciliation_workflow_item_ref IS NULL
      AND reconciliation_attempt_count = 0
      AND resend_legality_state = 'UNASSESSED'
      AND jsonb_array_length(resend_control_reason_codes) = 0
      AND resolution_basis IS NULL
      AND abandonment_reason_code IS NULL
      AND send_revalidation_state = 'NOT_PERFORMED'
    )
  ),
  CHECK (
    lifecycle_state <> 'TRANSMIT_IN_FLIGHT'
    OR (
      active_response_id IS NULL
      AND jsonb_array_length(response_history_ids) = 0
      AND meaning_resolution_state = 'NO_RESPONSE'
      AND reconciliation_budget_state = 'NOT_OPENED'
      AND next_reconciliation_at IS NULL
      AND reconciliation_deadline_at IS NULL
      AND reconciliation_attempt_count = 0
      AND resend_legality_state = 'IDEMPOTENT_RECOVERY_ONLY'
      AND jsonb_array_length(resend_control_reason_codes) > 0
      AND resolution_basis IS NULL
      AND abandonment_reason_code IS NULL
      AND send_revalidation_state = 'CLEAR_TO_SEND'
    )
  ),
  CHECK (
    lifecycle_state NOT IN ('RESPONSE_CAPTURED', 'RECONCILING', 'RESOLVED')
    OR (
      active_response_id IS NOT NULL
      AND jsonb_array_length(response_history_ids) > 0
      AND send_revalidation_state = 'CLEAR_TO_SEND'
      AND abandonment_reason_code IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'RESPONSE_CAPTURED'
    OR (
      resolution_basis IS NULL
      AND reconciliation_attempt_count = 0
      AND meaning_resolution_state IN (
        'PROVISIONAL_TIMEOUT',
        'ACTIVE_DIRECT',
        'ACTIVE_CORROBORATED',
        'RECONCILIATION_REQUIRED'
      )
    )
  ),
  CHECK (
    lifecycle_state <> 'RECONCILING'
    OR (
      meaning_resolution_state = 'RECONCILIATION_REQUIRED'
      AND reconciliation_attempt_count > 0
      AND reconciliation_deadline_at IS NOT NULL
      AND resolution_basis IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'RESOLVED'
    OR (
      resolution_basis IS NOT NULL
      AND reconciliation_budget_state = 'CLOSED'
      AND next_reconciliation_at IS NULL
      AND reconciliation_deadline_at IS NULL
      AND resend_legality_state = 'CLOSED_NO_RESEND'
      AND jsonb_array_length(resend_control_reason_codes) > 0
    )
  ),
  CHECK (
    lifecycle_state <> 'ABANDONED'
    OR (
      active_response_id IS NULL
      AND jsonb_array_length(response_history_ids) = 0
      AND meaning_resolution_state = 'NO_RESPONSE'
      AND reconciliation_budget_state = 'NOT_OPENED'
      AND next_reconciliation_at IS NULL
      AND reconciliation_deadline_at IS NULL
      AND reconciliation_attempt_count = 0
      AND resend_legality_state = 'CLOSED_NO_RESEND'
      AND jsonb_array_length(resend_control_reason_codes) > 0
      AND resolution_basis IS NULL
      AND abandonment_reason_code IS NOT NULL
      AND send_revalidation_state IN ('CLEAR_TO_SEND', 'BLOCKED')
    )
  ),
  CHECK ((next_reconciliation_at IS NULL) OR (reconciliation_budget_state = 'ACTIVE')),
  CHECK (
    (resend_legality_state <> 'FOLLOW_UP_READ_ONLY') OR (reconciliation_budget_state = 'ACTIVE')
  ),
  CHECK (
    (resend_legality_state <> 'BLOCKED_BY_RECONCILIATION') OR (reconciliation_budget_state = 'EXHAUSTED')
  ),
  CHECK (
    (resend_legality_state <> 'BLOCKED_BY_ESCALATION')
    OR (
      reconciliation_budget_state = 'ESCALATED'
      AND reconciliation_escalated_at IS NOT NULL
      AND reconciliation_workflow_item_ref IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_authority_interaction_records_request_hash
  ON authority_interaction_records (request_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_authority_interaction_records_duplicate_meaning
  ON authority_interaction_records (duplicate_meaning_key, created_at);

CREATE INDEX IF NOT EXISTS idx_authority_interaction_records_manifest
  ON authority_interaction_records (manifest_id, created_at);

CREATE INDEX IF NOT EXISTS idx_authority_interaction_records_lifecycle
  ON authority_interaction_records (lifecycle_state, last_status_at);

CREATE INDEX IF NOT EXISTS idx_authority_interaction_records_budget
  ON authority_interaction_records (reconciliation_budget_state, last_status_at);

CREATE INDEX IF NOT EXISTS idx_authority_interaction_records_next_reconciliation
  ON authority_interaction_records (next_reconciliation_at)
  WHERE next_reconciliation_at IS NOT NULL;
