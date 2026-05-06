-- phase03_0154_failure_investigation_and_dashboard.sql
-- Durable forensic failure investigations and the authoritative persisted
-- failure-lineage dashboard read model.

CREATE TABLE IF NOT EXISTS failure_investigations (
  investigation_id TEXT PRIMARY KEY,
  investigation_ref TEXT NOT NULL UNIQUE,
  error_id TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  root_manifest_id TEXT NOT NULL,
  failure_resolution_contract JSONB NOT NULL,
  investigation_class TEXT NOT NULL CHECK (
    investigation_class IN (
      'AUTHORITY_STATE_AMBIGUITY',
      'AMENDMENT_READINESS',
      'RETENTION_PRIVACY_EXCEPTION',
      'AUDIT_PROVENANCE_DIVERGENCE',
      'SECURITY_ACCESS_ANOMALY',
      'SYSTEM_INVARIANT_BREACH',
      'MULTI_ERROR_CORRELATION'
    )
  ),
  retention_class TEXT CHECK (
    retention_class IS NULL
    OR retention_class IN (
      'regulated_record',
      'derived_artifact',
      'operational_log',
      'analytics_projection',
      'policy_governed_other'
    )
  ),
  artifact_retention_ref TEXT,
  workflow_item_id TEXT,
  owner_type TEXT NOT NULL CHECK (
    owner_type IN ('SERVICE_OPERATOR', 'REVIEWER', 'APPROVER', 'TENANT_ADMIN', 'SECURITY_OPERATOR')
  ),
  owner_ref TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  investigation_state TEXT NOT NULL CHECK (
    investigation_state IN (
      'OPEN',
      'EVIDENCE_GATHERING',
      'AWAITING_EXTERNAL_INPUT',
      'IN_REVIEW',
      'RESOLVED',
      'ACCEPTED_RISK',
      'SUPERSEDED',
      'CANCELLED'
    )
  ),
  investigation_steps_ref TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_basis_ref TEXT,
  outcome TEXT CHECK (
    outcome IS NULL
    OR outcome IN (
      'ROOT_CAUSE_CONFIRMED',
      'FALSE_POSITIVE',
      'RETRY_AUTHORIZED',
      'RECONCILIATION_REQUIRED',
      'REMEDIATION_SPAWNED',
      'ACCEPTED_RISK',
      'SUPERSEDED',
      'CANCELLED'
    )
  ),
  accepted_risk_approval_ref TEXT,
  superseded_by_investigation_id TEXT,
  closure_evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  remediation_task_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_refs JSONB NOT NULL,
  provenance_refs JSONB NOT NULL,
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (investigation_ref = 'failure-investigation://' || investigation_id),
  CHECK (jsonb_typeof(failure_resolution_contract) = 'object'),
  CHECK (failure_resolution_contract->>'contract_version' = 'FAILURE_RESOLUTION_V1'),
  CHECK (failure_resolution_contract->>'lifecycle_role' = 'FAILURE_INVESTIGATION'),
  CHECK (failure_resolution_contract->>'role_specific_binding_policy' = 'INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE'),
  CHECK (jsonb_typeof(closure_evidence_refs) = 'array'),
  CHECK (jsonb_typeof(remediation_task_refs) = 'array'),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) >= 1),
  CHECK (jsonb_typeof(provenance_refs) = 'array' AND jsonb_array_length(provenance_refs) >= 1),
  CHECK ((retention_class IS NULL AND artifact_retention_ref IS NULL) OR (retention_class IS NOT NULL AND artifact_retention_ref IS NOT NULL)),
  CHECK (investigation_class <> 'RETENTION_PRIVACY_EXCEPTION' OR (retention_class IS NOT NULL AND artifact_retention_ref IS NOT NULL)),
  CHECK (due_at IS NULL OR due_at >= opened_at),
  CHECK (last_activity_at >= opened_at),
  CHECK (resolved_at IS NULL OR resolved_at >= opened_at),
  CHECK (resolved_at IS NULL OR resolved_at >= last_activity_at),
  CHECK (superseded_by_investigation_id IS NULL OR superseded_by_investigation_id <> investigation_id),
  CHECK (
    investigation_state NOT IN ('OPEN', 'EVIDENCE_GATHERING', 'AWAITING_EXTERNAL_INPUT', 'IN_REVIEW')
    OR (
      resolved_at IS NULL
      AND resolution_basis_ref IS NULL
      AND outcome IS NULL
      AND accepted_risk_approval_ref IS NULL
      AND superseded_by_investigation_id IS NULL
      AND jsonb_array_length(closure_evidence_refs) = 0
    )
  ),
  CHECK (
    investigation_state <> 'RESOLVED'
    OR (
      resolved_at IS NOT NULL
      AND resolution_basis_ref IS NOT NULL
      AND outcome IN (
        'ROOT_CAUSE_CONFIRMED',
        'FALSE_POSITIVE',
        'RETRY_AUTHORIZED',
        'RECONCILIATION_REQUIRED',
        'REMEDIATION_SPAWNED'
      )
      AND accepted_risk_approval_ref IS NULL
      AND superseded_by_investigation_id IS NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
    )
  ),
  CHECK (
    investigation_state <> 'ACCEPTED_RISK'
    OR (
      resolved_at IS NOT NULL
      AND resolution_basis_ref IS NOT NULL
      AND outcome = 'ACCEPTED_RISK'
      AND accepted_risk_approval_ref IS NOT NULL
      AND superseded_by_investigation_id IS NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
    )
  ),
  CHECK (
    investigation_state <> 'SUPERSEDED'
    OR (
      resolved_at IS NOT NULL
      AND resolution_basis_ref IS NOT NULL
      AND outcome = 'SUPERSEDED'
      AND accepted_risk_approval_ref IS NULL
      AND superseded_by_investigation_id IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
    )
  ),
  CHECK (
    investigation_state <> 'CANCELLED'
    OR (
      resolved_at IS NOT NULL
      AND resolution_basis_ref IS NOT NULL
      AND outcome = 'CANCELLED'
      AND accepted_risk_approval_ref IS NULL
      AND superseded_by_investigation_id IS NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
    )
  ),
  CHECK (outcome <> 'REMEDIATION_SPAWNED' OR jsonb_array_length(remediation_task_refs) >= 1),
  CHECK (outcome <> 'RECONCILIATION_REQUIRED' OR jsonb_array_length(remediation_task_refs) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_failure_investigations_error
  ON failure_investigations (error_id, opened_at, investigation_id);

CREATE INDEX IF NOT EXISTS idx_failure_investigations_state
  ON failure_investigations (investigation_state, due_at, investigation_id);

CREATE INDEX IF NOT EXISTS idx_failure_investigations_workflow
  ON failure_investigations (workflow_item_id, investigation_state, investigation_id)
  WHERE workflow_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS failure_lifecycle_dashboards (
  dashboard_id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL DEFAULT 'FailureLifecycleDashboard'
    CHECK (artifact_type = 'FailureLifecycleDashboard'),
  manifest_id TEXT NOT NULL,
  root_manifest_id TEXT NOT NULL,
  root_error_ref TEXT NOT NULL,
  current_error_ref TEXT NOT NULL,
  lineage_error_refs_in_order JSONB NOT NULL,
  current_lineage_state TEXT NOT NULL CHECK (
    current_lineage_state IN (
      'OPEN_FAILURE',
      'RETRY_SCHEDULED',
      'REMEDIATION_ACTIVE',
      'INVESTIGATION_ACTIVE',
      'COMPENSATION_ACTIVE',
      'ACCEPTED_RISK_ACTIVE',
      'RESOLVED',
      'SUPERSEDED',
      'CANCELLED'
    )
  ),
  current_state_source JSONB NOT NULL,
  current_owner JSONB NOT NULL,
  next_legal_action JSONB NOT NULL,
  blocking_scope JSONB NOT NULL,
  first_opened_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL,
  remediation_summary JSONB NOT NULL,
  compensation_posture JSONB NOT NULL,
  investigation_posture JSONB NOT NULL,
  accepted_risk_posture JSONB NOT NULL,
  workflow_coordination JSONB NOT NULL,
  closure_posture JSONB NOT NULL,
  lineage_refs JSONB NOT NULL,
  underlying_error_visibility_policy TEXT NOT NULL
    DEFAULT 'UNDERLYING_ERROR_ALWAYS_VISIBLE'
    CHECK (underlying_error_visibility_policy = 'UNDERLYING_ERROR_ALWAYS_VISIBLE'),
  accepted_risk_owner_policy TEXT NOT NULL
    DEFAULT 'ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY'
    CHECK (accepted_risk_owner_policy = 'ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY'),
  data_source_policy TEXT NOT NULL
    DEFAULT 'PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY'
    CHECK (data_source_policy = 'PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY'),
  log_reconstruction_policy TEXT NOT NULL
    DEFAULT 'NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION'
    CHECK (log_reconstruction_policy = 'NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION'),
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  persisted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(lineage_error_refs_in_order) = 'array' AND jsonb_array_length(lineage_error_refs_in_order) >= 1),
  CHECK (lineage_error_refs_in_order->>0 = root_error_ref),
  CHECK (lineage_error_refs_in_order->>(jsonb_array_length(lineage_error_refs_in_order) - 1) = current_error_ref),
  CHECK (jsonb_typeof(current_state_source) = 'object'),
  CHECK (jsonb_typeof(current_owner) = 'object'),
  CHECK (jsonb_typeof(next_legal_action) = 'object'),
  CHECK (jsonb_typeof(blocking_scope) = 'object'),
  CHECK (jsonb_typeof(remediation_summary) = 'object'),
  CHECK (jsonb_typeof(compensation_posture) = 'object'),
  CHECK (jsonb_typeof(investigation_posture) = 'object'),
  CHECK (jsonb_typeof(accepted_risk_posture) = 'object'),
  CHECK (jsonb_typeof(workflow_coordination) = 'object'),
  CHECK (jsonb_typeof(closure_posture) = 'object'),
  CHECK (jsonb_typeof(lineage_refs) = 'object'),
  CHECK (last_activity_at >= first_opened_at),
  CHECK (updated_at >= last_activity_at),
  CHECK (
    current_lineage_state NOT IN ('RESOLVED', 'SUPERSEDED', 'CANCELLED')
    OR next_legal_action->>'action_state' = 'NO_FURTHER_ACTION'
  ),
  CHECK (
    current_lineage_state NOT IN (
      'OPEN_FAILURE',
      'RETRY_SCHEDULED',
      'REMEDIATION_ACTIVE',
      'INVESTIGATION_ACTIVE',
      'COMPENSATION_ACTIVE',
      'ACCEPTED_RISK_ACTIVE'
    )
    OR next_legal_action->>'action_state' <> 'NO_FURTHER_ACTION'
  ),
  CHECK (
    accepted_risk_posture->>'state' <> 'ACTIVE'
    OR (
      accepted_risk_posture->>'approval_ref_or_null' IS NOT NULL
      AND accepted_risk_posture->>'expires_at_or_null' IS NOT NULL
      AND (accepted_risk_posture->>'expires_at_or_null')::timestamptz > updated_at
      AND accepted_risk_posture->>'accountable_owner_type_or_null' IS NOT NULL
      AND accepted_risk_posture->>'accountable_owner_type_or_null' <> 'SYSTEM'
      AND accepted_risk_posture->>'accountable_owner_ref_or_null' IS NOT NULL
      AND current_owner->>'owner_type' = accepted_risk_posture->>'accountable_owner_type_or_null'
      AND current_owner->>'owner_ref_or_null' = accepted_risk_posture->>'accountable_owner_ref_or_null'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_failure_lifecycle_dashboards_current_error
  ON failure_lifecycle_dashboards (current_error_ref, updated_at DESC, dashboard_id);

CREATE INDEX IF NOT EXISTS idx_failure_lifecycle_dashboards_root_error
  ON failure_lifecycle_dashboards (root_error_ref, updated_at DESC, dashboard_id);

CREATE INDEX IF NOT EXISTS idx_failure_lifecycle_dashboards_state
  ON failure_lifecycle_dashboards (current_lineage_state, updated_at DESC, dashboard_id);
