-- phase03_0153_failure_companion_models.sql
-- Durable failure companion artifacts for remediation tasks, compensation records,
-- and bounded accepted-risk approvals.

CREATE TABLE IF NOT EXISTS remediation_tasks (
  task_id TEXT PRIMARY KEY,
  task_ref TEXT NOT NULL UNIQUE,
  error_id TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  root_manifest_id TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (
    task_type IN (
      'FIX_DATA',
      'RESOLVE_CONFLICT',
      'REVIEW_PARITY',
      'APPROVE_OVERRIDE',
      'RELINK_AUTHORITY',
      'RETRY_AUTHORITY_OPERATION',
      'RECONCILE_SUBMISSION_STATE',
      'REQUEST_SUPPORTING_EVIDENCE',
      'CHECK_RETENTION_HOLD',
      'REPLAY_RUN',
      'ESCALATE_SECURITY_ISSUE',
      'OPEN_FAILURE_INVESTIGATION'
    )
  ),
  owner_type TEXT NOT NULL CHECK (
    owner_type IN ('SYSTEM', 'SERVICE_OPERATOR', 'REVIEWER', 'APPROVER', 'CLIENT', 'TENANT_ADMIN', 'SECURITY_OPERATOR')
  ),
  owner_ref TEXT,
  failure_resolution_contract JSONB NOT NULL,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  task_state TEXT NOT NULL CHECK (
    task_state IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED', 'SUPERSEDED')
  ),
  remediation_steps_ref TEXT NOT NULL,
  blocking_class TEXT NOT NULL CHECK (
    blocking_class IN (
      'NON_BLOCKING',
      'BLOCKS_AUTOMATION',
      'BLOCKS_REVIEW_PROGRESS',
      'BLOCKS_FILING',
      'BLOCKS_AMENDMENT',
      'BLOCKS_ERASURE',
      'BLOCKS_RUN',
      'BLOCKS_AUTHORITY_CALL'
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
  superseded_by_task_id TEXT,
  closure_outcome TEXT CHECK (
    closure_outcome IS NULL
    OR closure_outcome IN (
      'FIX_APPLIED',
      'CONFLICT_RESOLVED',
      'PARITY_REVIEW_COMPLETED',
      'OVERRIDE_APPROVED',
      'AUTHORITY_RELINKED',
      'AUTHORITY_RETRIED',
      'SUBMISSION_RECONCILED',
      'EVIDENCE_REQUESTED',
      'HOLD_CONFIRMED',
      'RUN_REPLAYED',
      'SECURITY_ESCALATED',
      'INVESTIGATION_OPENED',
      'ACCEPTED_RISK',
      'CANCELLED',
      'SUPERSEDED'
    )
  ),
  resolution_basis_ref TEXT,
  closure_evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_resolution_effect TEXT NOT NULL CHECK (
    error_resolution_effect IN (
      'ERROR_REMAINS_OPEN',
      'ERROR_MOVES_TO_IN_PROGRESS',
      'ERROR_MOVES_TO_MONITORING',
      'ERROR_MOVES_TO_RESOLVED',
      'ERROR_MOVES_TO_ACCEPTED_RISK',
      'ERROR_MOVES_TO_SUPERSEDED',
      'ERROR_MOVES_TO_CANCELLED'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  accepted_risk_approval_ref TEXT,
  investigation_ref TEXT,
  audit_refs JSONB NOT NULL,
  provenance_refs JSONB NOT NULL,
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (task_ref = 'remediation-task://' || task_id),
  CHECK (jsonb_typeof(failure_resolution_contract) = 'object'),
  CHECK (failure_resolution_contract->>'contract_version' = 'FAILURE_RESOLUTION_V1'),
  CHECK (failure_resolution_contract->>'lifecycle_role' = 'REMEDIATION_TASK'),
  CHECK (failure_resolution_contract->>'role_specific_binding_policy' = 'TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR'),
  CHECK (jsonb_typeof(closure_evidence_refs) = 'array'),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) >= 1),
  CHECK (jsonb_typeof(provenance_refs) = 'array' AND jsonb_array_length(provenance_refs) >= 1),
  CHECK ((owner_type = 'SYSTEM' AND owner_ref IS NULL) OR (owner_type <> 'SYSTEM' AND owner_ref IS NOT NULL)),
  CHECK ((retention_class IS NULL AND artifact_retention_ref IS NULL) OR (retention_class IS NOT NULL AND artifact_retention_ref IS NOT NULL)),
  CHECK (due_at IS NULL OR due_at >= created_at),
  CHECK (started_at IS NULL OR started_at >= created_at),
  CHECK (completed_at IS NULL OR completed_at >= created_at),
  CHECK (started_at IS NULL OR completed_at IS NULL OR completed_at >= started_at),
  CHECK (superseded_by_task_id IS NULL OR superseded_by_task_id <> task_id),
  CHECK (
    task_state NOT IN ('OPEN', 'ASSIGNED')
    OR (
      started_at IS NULL
      AND completed_at IS NULL
      AND closure_outcome IS NULL
      AND resolution_basis_ref IS NULL
      AND jsonb_array_length(closure_evidence_refs) = 0
      AND accepted_risk_approval_ref IS NULL
      AND error_resolution_effect = 'ERROR_REMAINS_OPEN'
    )
  ),
  CHECK (
    task_state NOT IN ('IN_PROGRESS', 'WAITING')
    OR (
      started_at IS NOT NULL
      AND completed_at IS NULL
      AND closure_outcome IS NULL
      AND resolution_basis_ref IS NULL
      AND jsonb_array_length(closure_evidence_refs) = 0
      AND accepted_risk_approval_ref IS NULL
      AND error_resolution_effect IN ('ERROR_REMAINS_OPEN', 'ERROR_MOVES_TO_IN_PROGRESS')
    )
  ),
  CHECK (
    task_state <> 'COMPLETED'
    OR (
      started_at IS NOT NULL
      AND completed_at IS NOT NULL
      AND closure_outcome IS NOT NULL
      AND closure_outcome NOT IN ('CANCELLED', 'SUPERSEDED')
      AND resolution_basis_ref IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
      AND error_resolution_effect IN (
        'ERROR_REMAINS_OPEN',
        'ERROR_MOVES_TO_IN_PROGRESS',
        'ERROR_MOVES_TO_MONITORING',
        'ERROR_MOVES_TO_RESOLVED',
        'ERROR_MOVES_TO_ACCEPTED_RISK'
      )
      AND superseded_by_task_id IS NULL
    )
  ),
  CHECK (
    task_state <> 'CANCELLED'
    OR (
      completed_at IS NOT NULL
      AND closure_outcome = 'CANCELLED'
      AND resolution_basis_ref IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
      AND error_resolution_effect IN ('ERROR_REMAINS_OPEN', 'ERROR_MOVES_TO_CANCELLED')
      AND accepted_risk_approval_ref IS NULL
      AND superseded_by_task_id IS NULL
    )
  ),
  CHECK (
    task_state <> 'SUPERSEDED'
    OR (
      completed_at IS NOT NULL
      AND closure_outcome = 'SUPERSEDED'
      AND resolution_basis_ref IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
      AND error_resolution_effect IN ('ERROR_REMAINS_OPEN', 'ERROR_MOVES_TO_SUPERSEDED')
      AND accepted_risk_approval_ref IS NULL
      AND superseded_by_task_id IS NOT NULL
    )
  ),
  CHECK (
    accepted_risk_approval_ref IS NULL
    OR (task_state = 'COMPLETED' AND closure_outcome = 'ACCEPTED_RISK' AND error_resolution_effect = 'ERROR_MOVES_TO_ACCEPTED_RISK')
  ),
  CHECK (closure_outcome <> 'ACCEPTED_RISK' OR accepted_risk_approval_ref IS NOT NULL),
  CHECK (closure_outcome <> 'INVESTIGATION_OPENED' OR investigation_ref IS NOT NULL),
  CHECK (
    task_type <> 'CHECK_RETENTION_HOLD'
    OR (
      blocking_class = 'BLOCKS_ERASURE'
      AND retention_class IS NOT NULL
      AND artifact_retention_ref IS NOT NULL
      AND workflow_item_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_remediation_tasks_error
  ON remediation_tasks (error_id, created_at, task_id);

CREATE INDEX IF NOT EXISTS idx_remediation_tasks_workflow
  ON remediation_tasks (workflow_item_id, task_state, task_id)
  WHERE workflow_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_remediation_tasks_state
  ON remediation_tasks (task_state, due_at, task_id);

CREATE TABLE IF NOT EXISTS compensation_records (
  compensation_id TEXT PRIMARY KEY,
  compensation_ref TEXT NOT NULL UNIQUE,
  error_id TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  root_manifest_id TEXT NOT NULL,
  failure_resolution_contract JSONB NOT NULL,
  owner_type TEXT NOT NULL CHECK (
    owner_type IN ('SYSTEM', 'SERVICE_OPERATOR', 'REVIEWER', 'APPROVER', 'TENANT_ADMIN', 'SECURITY_OPERATOR')
  ),
  owner_ref TEXT,
  compensation_mode TEXT NOT NULL CHECK (
    compensation_mode IN (
      'NONE',
      'MARK_AS_VOID',
      'MARK_AS_SUPERSEDED',
      'REVERT_DERIVED_ONLY',
      'OPEN_RECONCILIATION',
      'PRESERVE_AND_LIMIT',
      'REQUIRE_MANUAL_SETTLEMENT'
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
  target_object_refs JSONB NOT NULL,
  compensation_status TEXT NOT NULL CHECK (
    compensation_status IN ('PLANNED', 'IN_PROGRESS', 'APPLIED', 'VERIFIED', 'FAILED', 'CANCELLED', 'SUPERSEDED')
  ),
  compensation_steps_ref TEXT NOT NULL,
  compensated_at TIMESTAMPTZ,
  verification_ref TEXT,
  resolution_basis_ref TEXT,
  closure_evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  superseded_by_compensation_id TEXT,
  audit_refs JSONB NOT NULL,
  provenance_refs JSONB NOT NULL,
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (compensation_ref = 'compensation-record://' || compensation_id),
  CHECK (jsonb_typeof(failure_resolution_contract) = 'object'),
  CHECK (failure_resolution_contract->>'contract_version' = 'FAILURE_RESOLUTION_V1'),
  CHECK (failure_resolution_contract->>'lifecycle_role' = 'COMPENSATION_RECORD'),
  CHECK (failure_resolution_contract->>'role_specific_binding_policy' = 'COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE'),
  CHECK (jsonb_typeof(target_object_refs) = 'array' AND jsonb_array_length(target_object_refs) >= 1),
  CHECK (jsonb_typeof(closure_evidence_refs) = 'array'),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) >= 1),
  CHECK (jsonb_typeof(provenance_refs) = 'array' AND jsonb_array_length(provenance_refs) >= 1),
  CHECK ((owner_type = 'SYSTEM' AND owner_ref IS NULL) OR (owner_type <> 'SYSTEM' AND owner_ref IS NOT NULL)),
  CHECK ((retention_class IS NULL AND artifact_retention_ref IS NULL) OR (retention_class IS NOT NULL AND artifact_retention_ref IS NOT NULL)),
  CHECK (compensated_at IS NULL OR compensated_at >= created_at),
  CHECK (superseded_by_compensation_id IS NULL OR superseded_by_compensation_id <> compensation_id),
  CHECK (
    compensation_status NOT IN ('PLANNED', 'IN_PROGRESS')
    OR (
      compensated_at IS NULL
      AND verification_ref IS NULL
      AND resolution_basis_ref IS NULL
      AND jsonb_array_length(closure_evidence_refs) = 0
      AND superseded_by_compensation_id IS NULL
    )
  ),
  CHECK (
    compensation_status NOT IN ('FAILED', 'CANCELLED')
    OR (
      compensated_at IS NULL
      AND verification_ref IS NULL
      AND resolution_basis_ref IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
      AND superseded_by_compensation_id IS NULL
    )
  ),
  CHECK (
    compensation_status <> 'APPLIED'
    OR (
      compensated_at IS NOT NULL
      AND verification_ref IS NULL
      AND resolution_basis_ref IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
      AND superseded_by_compensation_id IS NULL
    )
  ),
  CHECK (
    compensation_status <> 'VERIFIED'
    OR (
      compensated_at IS NOT NULL
      AND verification_ref IS NOT NULL
      AND resolution_basis_ref IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
      AND superseded_by_compensation_id IS NULL
    )
  ),
  CHECK (
    compensation_status <> 'SUPERSEDED'
    OR (
      verification_ref IS NULL
      AND resolution_basis_ref IS NOT NULL
      AND jsonb_array_length(closure_evidence_refs) >= 1
      AND superseded_by_compensation_id IS NOT NULL
    )
  ),
  CHECK (verification_ref IS NULL OR compensation_status = 'VERIFIED'),
  CHECK (superseded_by_compensation_id IS NULL OR compensation_status = 'SUPERSEDED'),
  CHECK (compensation_mode <> 'NONE' OR compensation_status IN ('APPLIED', 'VERIFIED')),
  CHECK (
    compensation_mode <> 'PRESERVE_AND_LIMIT'
    OR (retention_class IS NOT NULL AND artifact_retention_ref IS NOT NULL)
  ),
  CHECK (
    compensation_mode NOT IN ('OPEN_RECONCILIATION', 'REQUIRE_MANUAL_SETTLEMENT')
    OR workflow_item_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_compensation_records_error
  ON compensation_records (error_id, created_at, compensation_id);

CREATE INDEX IF NOT EXISTS idx_compensation_records_workflow
  ON compensation_records (workflow_item_id, compensation_status, compensation_id)
  WHERE workflow_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compensation_records_status
  ON compensation_records (compensation_status, created_at, compensation_id);

CREATE TABLE IF NOT EXISTS accepted_risk_approvals (
  accepted_risk_approval_id TEXT PRIMARY KEY,
  accepted_risk_approval_ref TEXT NOT NULL UNIQUE,
  error_id TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  root_manifest_id TEXT NOT NULL,
  failure_resolution_contract JSONB NOT NULL,
  decision_basis TEXT NOT NULL CHECK (decision_basis IN ('EXPLICIT_APPROVAL', 'POLICY_BASIS')),
  approval_state TEXT NOT NULL CHECK (approval_state IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUPERSEDED')),
  approver_type TEXT NOT NULL CHECK (
    approver_type IN ('APPROVER', 'TENANT_ADMIN', 'SECURITY_OPERATOR', 'SYSTEM_POLICY')
  ),
  approver_ref TEXT,
  policy_basis_ref TEXT,
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
  rationale_ref TEXT NOT NULL,
  bounded_scope_refs JSONB NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  superseded_by_approval_id TEXT,
  audit_refs JSONB NOT NULL,
  provenance_refs JSONB NOT NULL,
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (accepted_risk_approval_ref = 'accepted-risk-approval://' || accepted_risk_approval_id),
  CHECK (jsonb_typeof(failure_resolution_contract) = 'object'),
  CHECK (failure_resolution_contract->>'contract_version' = 'FAILURE_RESOLUTION_V1'),
  CHECK (failure_resolution_contract->>'lifecycle_role' = 'ACCEPTED_RISK_APPROVAL'),
  CHECK (failure_resolution_contract->>'role_specific_binding_policy' = 'APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS'),
  CHECK (jsonb_typeof(bounded_scope_refs) = 'array' AND jsonb_array_length(bounded_scope_refs) >= 1),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) >= 1),
  CHECK (jsonb_typeof(provenance_refs) = 'array' AND jsonb_array_length(provenance_refs) >= 1),
  CHECK ((retention_class IS NULL AND artifact_retention_ref IS NULL) OR (retention_class IS NOT NULL AND artifact_retention_ref IS NOT NULL)),
  CHECK (expires_at > approved_at),
  CHECK (revoked_at IS NULL OR revoked_at >= approved_at),
  CHECK (superseded_by_approval_id IS NULL OR superseded_by_approval_id <> accepted_risk_approval_id),
  CHECK (
    (decision_basis = 'EXPLICIT_APPROVAL' AND approver_type IN ('APPROVER', 'TENANT_ADMIN', 'SECURITY_OPERATOR') AND approver_ref IS NOT NULL AND policy_basis_ref IS NULL)
    OR (decision_basis = 'POLICY_BASIS' AND approver_type = 'SYSTEM_POLICY' AND approver_ref IS NULL AND policy_basis_ref IS NOT NULL)
  ),
  CHECK (
    approval_state NOT IN ('ACTIVE', 'EXPIRED')
    OR (revoked_at IS NULL AND superseded_by_approval_id IS NULL)
  ),
  CHECK (
    approval_state <> 'REVOKED'
    OR (revoked_at IS NOT NULL AND superseded_by_approval_id IS NULL)
  ),
  CHECK (
    approval_state <> 'SUPERSEDED'
    OR (revoked_at IS NULL AND superseded_by_approval_id IS NOT NULL)
  ),
  CHECK (revoked_at IS NULL OR approval_state = 'REVOKED'),
  CHECK (superseded_by_approval_id IS NULL OR approval_state = 'SUPERSEDED')
);

CREATE INDEX IF NOT EXISTS idx_accepted_risk_approvals_error
  ON accepted_risk_approvals (error_id, approved_at, accepted_risk_approval_id);

CREATE INDEX IF NOT EXISTS idx_accepted_risk_approvals_workflow
  ON accepted_risk_approvals (workflow_item_id, approval_state, accepted_risk_approval_id)
  WHERE workflow_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accepted_risk_approvals_state
  ON accepted_risk_approvals (approval_state, expires_at, accepted_risk_approval_id);

COMMENT ON TABLE remediation_tasks IS
  'Typed remediation tasks with explicit owner, closure basis, evidence, error effect, and failure-resolution contract.';

COMMENT ON TABLE compensation_records IS
  'Auditable compensation records for already-progressed state that must be preserved, limited, reconciled, verified, or superseded.';

COMMENT ON TABLE accepted_risk_approvals IS
  'Bounded accepted-risk approvals with explicit authorization basis, accountable scope, expiry, revocation, and supersession posture.';
