-- pc_0133: authority-domain obligation mirror, filing case, and filing packet foundation.
-- These tables persist first authority-domain lifecycle records while keeping submission settlement
-- lifecycle ownership out of this migration.

CREATE TABLE IF NOT EXISTS obligation_mirrors (
  obligation_mirror_id text PRIMARY KEY,
  obligation_mirror_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  income_source_partition text NOT NULL,
  period text NOT NULL,
  lifecycle_state text NOT NULL CHECK (
    lifecycle_state IN (
      'NOT_YET_OPEN',
      'OPEN',
      'DUE_SOON',
      'READY_TO_FILE',
      'SUBMITTED_PENDING',
      'MET_CONFIRMED',
      'LATE_UNMET',
      'NO_LONGER_RELEVANT'
    )
  ),
  authority_truth_state text NOT NULL CHECK (
    authority_truth_state IN (
      'NOT_APPLICABLE',
      'NOT_REQUESTED',
      'UNKNOWN',
      'PENDING_ACK',
      'PARTIAL_ACK',
      'CONFIRMED',
      'REJECTED',
      'OUT_OF_BAND'
    )
  ),
  authority_refs jsonb NOT NULL,
  due_at timestamptz,
  current_submission_ref text,
  last_confirmed_submission_ref text,
  ready_manifest_ref text,
  blocked_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_authority_sync_at timestamptz,
  authority_status_ref text,
  authority_truth_contract jsonb NOT NULL,
  authority_ingress_proof_contract jsonb,
  reconciliation_control_contract jsonb,
  record jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(authority_refs) = 'array' AND jsonb_array_length(authority_refs) > 0),
  CHECK (jsonb_typeof(blocked_reason_codes) = 'array'),
  CHECK (
    (lifecycle_state = 'READY_TO_FILE'
      AND ready_manifest_ref IS NOT NULL
      AND current_submission_ref IS NULL
      AND last_confirmed_submission_ref IS NULL
      AND authority_truth_state = 'NOT_REQUESTED'
      AND jsonb_array_length(blocked_reason_codes) = 0)
    OR lifecycle_state <> 'READY_TO_FILE'
  ),
  CHECK (
    (lifecycle_state = 'SUBMITTED_PENDING'
      AND current_submission_ref IS NOT NULL
      AND last_confirmed_submission_ref IS NULL
      AND ready_manifest_ref IS NULL
      AND authority_truth_state = 'PENDING_ACK'
      AND jsonb_array_length(blocked_reason_codes) = 0)
    OR lifecycle_state <> 'SUBMITTED_PENDING'
  ),
  CHECK (
    (lifecycle_state = 'MET_CONFIRMED'
      AND current_submission_ref IS NULL
      AND last_confirmed_submission_ref IS NOT NULL
      AND ready_manifest_ref IS NULL
      AND authority_truth_state = 'CONFIRMED'
      AND last_authority_sync_at IS NOT NULL
      AND authority_status_ref IS NOT NULL
      AND jsonb_array_length(blocked_reason_codes) = 0)
    OR lifecycle_state <> 'MET_CONFIRMED'
  ),
  CHECK (
    (lifecycle_state = 'LATE_UNMET'
      AND ready_manifest_ref IS NULL
      AND jsonb_array_length(blocked_reason_codes) > 0)
    OR lifecycle_state <> 'LATE_UNMET'
  )
);

CREATE TABLE IF NOT EXISTS filing_cases (
  filing_case_id text PRIMARY KEY,
  filing_case_ref text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  period text NOT NULL,
  lifecycle_state text NOT NULL CHECK (
    lifecycle_state IN (
      'NOT_STARTED',
      'PREPARING',
      'READY_REVIEW',
      'READY_TO_SUBMIT',
      'SUBMITTED_PENDING',
      'FILED_CONFIRMED',
      'FILED_UNKNOWN',
      'REJECTED',
      'AMENDMENT_ELIGIBLE',
      'AMENDMENT_IN_PROGRESS',
      'AMENDED_CONFIRMED',
      'CLOSED'
    )
  ),
  current_manifest_ref text,
  current_trust_ref text,
  current_parity_ref text,
  current_submission_ref text,
  current_submission_state text,
  current_packet_ref text,
  packet_state text,
  trust_currency_state text,
  trust_invalidated_at timestamptz,
  trust_invalidation_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  trust_invalidation_dependency_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  temporal_propagation_event_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  readiness_context_ref text,
  controlling_proof_bundle_ref text,
  proof_closure_state text NOT NULL CHECK (proof_closure_state IN ('NOT_APPLICABLE', 'CLOSED', 'OPEN')),
  state_transition_contract jsonb NOT NULL,
  execution_mode_boundary_contract jsonb NOT NULL,
  record jsonb NOT NULL,
  last_transition_at timestamptz NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(trust_invalidation_reason_codes) = 'array'),
  CHECK (jsonb_typeof(trust_invalidation_dependency_refs) = 'array'),
  CHECK (jsonb_typeof(temporal_propagation_event_refs) = 'array'),
  CHECK (
    (lifecycle_state = 'NOT_STARTED'
      AND current_manifest_ref IS NULL
      AND current_submission_ref IS NULL
      AND current_packet_ref IS NULL
      AND proof_closure_state = 'NOT_APPLICABLE')
    OR lifecycle_state <> 'NOT_STARTED'
  ),
  CHECK (
    (lifecycle_state = 'READY_TO_SUBMIT'
      AND current_packet_ref IS NOT NULL
      AND packet_state = 'APPROVED_TO_SUBMIT'
      AND current_submission_ref IS NULL
      AND trust_currency_state = 'CURRENT'
      AND controlling_proof_bundle_ref IS NOT NULL
      AND proof_closure_state = 'CLOSED')
    OR lifecycle_state <> 'READY_TO_SUBMIT'
  ),
  CHECK (
    (lifecycle_state IN ('SUBMITTED_PENDING', 'FILED_CONFIRMED', 'FILED_UNKNOWN', 'REJECTED', 'AMENDED_CONFIRMED', 'CLOSED')
      AND current_submission_ref IS NOT NULL
      AND current_packet_ref IS NOT NULL
      AND packet_state = 'SUBMITTED'
      AND controlling_proof_bundle_ref IS NOT NULL
      AND proof_closure_state = 'CLOSED')
    OR lifecycle_state NOT IN ('SUBMITTED_PENDING', 'FILED_CONFIRMED', 'FILED_UNKNOWN', 'REJECTED', 'AMENDED_CONFIRMED', 'CLOSED')
  )
);

CREATE TABLE IF NOT EXISTS filing_packets (
  packet_id text PRIMARY KEY,
  packet_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  lifecycle_state text NOT NULL CHECK (
    lifecycle_state IN ('DRAFT', 'PREPARED', 'APPROVED_TO_SUBMIT', 'SUBMITTED', 'VOID', 'SUPERSEDED')
  ),
  payload_ref text NOT NULL,
  payload_hash text NOT NULL,
  manifest_binding_hash text NOT NULL,
  declared_basis text NOT NULL,
  disclaimers jsonb NOT NULL DEFAULT '[]'::jsonb,
  approval_state text,
  declared_basis_ack_state text,
  notice_step_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  notice_resolution_ref text,
  filing_gate_ref text,
  controlling_proof_bundle_ref text,
  proof_closure_state text NOT NULL CHECK (proof_closure_state IN ('NOT_APPLICABLE', 'OPEN', 'CLOSED')),
  state_transition_contract jsonb NOT NULL,
  execution_mode_boundary_contract jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  record jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  approved_at timestamptz,
  submitted_at timestamptz,
  voided_at timestamptz,
  superseded_at timestamptz,
  state_changed_at timestamptz NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(disclaimers) = 'array'),
  CHECK (jsonb_typeof(notice_step_refs) = 'array'),
  CHECK (
    (lifecycle_state = 'DRAFT'
      AND approval_state IS NULL
      AND declared_basis_ack_state IS NULL
      AND jsonb_array_length(notice_step_refs) = 0
      AND filing_gate_ref IS NULL
      AND controlling_proof_bundle_ref IS NULL
      AND proof_closure_state = 'NOT_APPLICABLE')
    OR lifecycle_state <> 'DRAFT'
  ),
  CHECK (
    (lifecycle_state = 'APPROVED_TO_SUBMIT'
      AND approval_state IN ('NOT_REQUIRED', 'SATISFIED')
      AND declared_basis_ack_state IN ('NOT_REQUIRED', 'SATISFIED')
      AND filing_gate_ref IS NOT NULL
      AND controlling_proof_bundle_ref IS NOT NULL
      AND proof_closure_state = 'CLOSED'
      AND approved_at IS NOT NULL
      AND submitted_at IS NULL)
    OR lifecycle_state <> 'APPROVED_TO_SUBMIT'
  ),
  CHECK (
    (lifecycle_state = 'SUBMITTED'
      AND approval_state IN ('NOT_REQUIRED', 'SATISFIED')
      AND declared_basis_ack_state IN ('NOT_REQUIRED', 'SATISFIED')
      AND filing_gate_ref IS NOT NULL
      AND controlling_proof_bundle_ref IS NOT NULL
      AND proof_closure_state = 'CLOSED'
      AND approved_at IS NOT NULL
      AND submitted_at IS NOT NULL)
    OR lifecycle_state <> 'SUBMITTED'
  )
);
