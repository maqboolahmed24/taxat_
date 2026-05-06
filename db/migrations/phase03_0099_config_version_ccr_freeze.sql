-- Phase-03 governed config version, CCR, and ConfigFreeze control objects.
-- Storage strategy:
--   1. `control_manifest.config_version_register` persists immutable governed config-release
--      artifacts with scalar lifecycle, approval, supersession, and content-hash lookup columns.
--   2. `control_manifest.config_change_request_register` persists the tenant-scoped mutation lane
--      that drives config delivery through review, test, approval, implementation, and rollback.
--   3. `control_manifest.config_freeze_register` stores one manifest-bound frozen config surface
--      with hash/source-lineage mirrors; `config_freeze_entry_register` preserves the canonical
--      required config-type order without forcing consumers to unpack JSONB.

CREATE TABLE IF NOT EXISTS control_manifest.config_version_register (
  version_id text PRIMARY KEY,
  config_type text NOT NULL CHECK (config_type IN (
    'COMPUTATION_RULES',
    'PARITY_THRESHOLDS',
    'TRUST_THRESHOLDS',
    'RISK_THRESHOLDS',
    'WORKFLOW_POLICY',
    'OVERRIDE_POLICY',
    'RETENTION_POLICY',
    'EVIDENCE_CONFIDENCE_POLICY',
    'CANONICALIZATION_RULES',
    'CONNECTOR_MAPPING_RULES',
    'PROVIDER_CONTRACT_PROFILE',
    'MATERIALITY_PROFILE',
    'AMENDMENT_MATERIALITY_PROFILE',
    'MASKING_EXPORT_POLICY'
  )),
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('DRAFT', 'CANDIDATE', 'VERIFIED', 'APPROVED', 'DEPRECATED', 'REVOKED', 'RETIRED')),
  content_hash text NOT NULL,
  effective_scope jsonb NOT NULL,
  approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_evidence_ref text,
  approved_at timestamptz,
  superseded_by_version_id text REFERENCES control_manifest.config_version_register (version_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  revocation_reason_code text,
  retired_at timestamptz,
  state_changed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  state_transition_contract jsonb NOT NULL,
  audit_refs jsonb NOT NULL,
  provenance_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  version_payload jsonb NOT NULL,
  version_row_version integer NOT NULL DEFAULT 1 CHECK (version_row_version >= 1),
  persisted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(effective_scope) = 'array' AND jsonb_array_length(effective_scope) > 0),
  CHECK (jsonb_typeof(approvals) = 'array'),
  CHECK (jsonb_typeof(state_transition_contract) = 'object'),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) > 0),
  CHECK (jsonb_typeof(provenance_refs) = 'array'),
  CHECK (jsonb_typeof(version_payload) = 'object'),
  CHECK (
    (lifecycle_state IN ('DRAFT', 'CANDIDATE') AND jsonb_array_length(approvals) = 0 AND verification_evidence_ref IS NULL AND approved_at IS NULL AND superseded_by_version_id IS NULL AND revocation_reason_code IS NULL AND retired_at IS NULL) OR
    (lifecycle_state = 'VERIFIED' AND verification_evidence_ref IS NOT NULL AND approved_at IS NULL AND superseded_by_version_id IS NULL AND revocation_reason_code IS NULL AND retired_at IS NULL) OR
    (lifecycle_state = 'APPROVED' AND jsonb_array_length(approvals) > 0 AND verification_evidence_ref IS NOT NULL AND approved_at IS NOT NULL AND superseded_by_version_id IS NULL AND revocation_reason_code IS NULL AND retired_at IS NULL) OR
    (lifecycle_state = 'DEPRECATED' AND jsonb_array_length(approvals) > 0 AND verification_evidence_ref IS NOT NULL AND approved_at IS NOT NULL AND superseded_by_version_id IS NOT NULL AND revocation_reason_code IS NULL) OR
    (lifecycle_state = 'REVOKED' AND jsonb_array_length(approvals) > 0 AND verification_evidence_ref IS NOT NULL AND approved_at IS NOT NULL AND superseded_by_version_id IS NULL AND revocation_reason_code IS NOT NULL) OR
    (lifecycle_state = 'RETIRED' AND retired_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS control_manifest.config_version_transition_log (
  transition_id text PRIMARY KEY,
  version_id text NOT NULL REFERENCES control_manifest.config_version_register (version_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  version_row_version integer NOT NULL CHECK (version_row_version >= 1),
  from_lifecycle_state text,
  to_lifecycle_state text NOT NULL CHECK (to_lifecycle_state IN ('DRAFT', 'CANDIDATE', 'VERIFIED', 'APPROVED', 'DEPRECATED', 'REVOKED', 'RETIRED')),
  transition_event_code text NOT NULL CHECK (transition_event_code IN ('submit_for_test', 'verification_pass', 'approval_granted', 'replacement_approved', 'urgent_withdrawal', 'retired')),
  transition_reason_code text NOT NULL,
  transition_audit_ref text NOT NULL,
  transitioned_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS control_manifest.config_change_request_register (
  ccr_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('OPEN', 'UNDER_REVIEW', 'TESTING', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'ROLLED_BACK')),
  diff_ref text NOT NULL,
  risk_assessment_ref text NOT NULL,
  approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_reason_code text,
  implemented_release_ref text,
  rolled_back_release_ref text,
  state_changed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  state_transition_contract jsonb NOT NULL,
  audit_refs jsonb NOT NULL,
  provenance_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ccr_payload jsonb NOT NULL,
  ccr_row_version integer NOT NULL DEFAULT 1 CHECK (ccr_row_version >= 1),
  persisted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(approvals) = 'array'),
  CHECK (jsonb_typeof(state_transition_contract) = 'object'),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) > 0),
  CHECK (jsonb_typeof(provenance_refs) = 'array'),
  CHECK (jsonb_typeof(ccr_payload) = 'object'),
  CHECK (
    (lifecycle_state IN ('OPEN', 'UNDER_REVIEW', 'TESTING') AND jsonb_array_length(approvals) = 0 AND rejected_reason_code IS NULL AND implemented_release_ref IS NULL AND rolled_back_release_ref IS NULL) OR
    (lifecycle_state = 'APPROVED' AND jsonb_array_length(approvals) > 0 AND rejected_reason_code IS NULL AND implemented_release_ref IS NULL AND rolled_back_release_ref IS NULL) OR
    (lifecycle_state = 'REJECTED' AND rejected_reason_code IS NOT NULL AND implemented_release_ref IS NULL AND rolled_back_release_ref IS NULL) OR
    (lifecycle_state = 'IMPLEMENTED' AND jsonb_array_length(approvals) > 0 AND rejected_reason_code IS NULL AND implemented_release_ref IS NOT NULL AND rolled_back_release_ref IS NULL) OR
    (lifecycle_state = 'ROLLED_BACK' AND jsonb_array_length(approvals) > 0 AND rejected_reason_code IS NULL AND implemented_release_ref IS NOT NULL AND rolled_back_release_ref IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS control_manifest.config_change_request_transition_log (
  transition_id text PRIMARY KEY,
  ccr_id text NOT NULL REFERENCES control_manifest.config_change_request_register (ccr_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ccr_row_version integer NOT NULL CHECK (ccr_row_version >= 1),
  from_lifecycle_state text,
  to_lifecycle_state text NOT NULL CHECK (to_lifecycle_state IN ('OPEN', 'UNDER_REVIEW', 'TESTING', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'ROLLED_BACK')),
  transition_event_code text NOT NULL CHECK (transition_event_code IN ('assigned', 'sent_to_test', 'pass', 'fail', 'deployed', 'rollback')),
  transition_reason_code text NOT NULL,
  transition_audit_ref text NOT NULL,
  transitioned_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS control_manifest.config_freeze_register (
  config_freeze_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  manifest_id text NOT NULL REFERENCES control_manifest.run_manifest_register (manifest_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  config_freeze_hash text NOT NULL,
  config_surface_hash text NOT NULL,
  schema_bundle_hash text NOT NULL,
  feature_flag_snapshot_hash text,
  config_completeness_state text NOT NULL CHECK (config_completeness_state = 'COMPLETE_REQUIRED_CONFIG_SET'),
  config_resolution_basis text NOT NULL CHECK (config_resolution_basis IN ('DIRECT_REQUEST_RESOLUTION', 'REPLAY_EXACT_REUSE', 'RECOVERY_EXACT_REUSE', 'HISTORICAL_EXPLICIT_REUSE')),
  source_config_freeze_ref text,
  source_config_freeze_hash text,
  source_config_surface_hash text,
  config_consumption_mode text NOT NULL CHECK (config_consumption_mode = 'FROZEN_CONFIG_ONLY'),
  approval_snapshot_ref text NOT NULL,
  materiality_profile_ref text NOT NULL,
  amendment_materiality_profile_ref text NOT NULL,
  retention_profile_ref text NOT NULL,
  provider_contract_profile_ref text NOT NULL,
  workflow_policy_ref text NOT NULL,
  override_policy_ref text NOT NULL,
  masking_export_policy_ref text NOT NULL,
  canonicalization_rules_ref text NOT NULL,
  connector_mapping_rules_ref text NOT NULL,
  parity_threshold_profile_ref text NOT NULL,
  trust_threshold_profile_ref text NOT NULL,
  risk_threshold_profile_ref text NOT NULL,
  evidence_confidence_policy_ref text NOT NULL,
  computation_rules_ref text NOT NULL,
  required_config_types_present jsonb NOT NULL,
  freeze_payload jsonb NOT NULL,
  persisted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(required_config_types_present) = 'array' AND jsonb_array_length(required_config_types_present) = 14),
  CHECK (jsonb_typeof(freeze_payload) = 'object'),
  CHECK (
    (config_resolution_basis = 'DIRECT_REQUEST_RESOLUTION' AND source_config_freeze_ref IS NULL AND source_config_freeze_hash IS NULL AND source_config_surface_hash IS NULL) OR
    (config_resolution_basis IN ('REPLAY_EXACT_REUSE', 'RECOVERY_EXACT_REUSE', 'HISTORICAL_EXPLICIT_REUSE') AND source_config_freeze_ref IS NOT NULL AND source_config_freeze_hash = config_freeze_hash AND source_config_surface_hash = config_surface_hash)
  )
);

CREATE TABLE IF NOT EXISTS control_manifest.config_freeze_entry_register (
  config_freeze_id text NOT NULL REFERENCES control_manifest.config_freeze_register (config_freeze_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  entry_order integer NOT NULL CHECK (entry_order BETWEEN 1 AND 14),
  config_type text NOT NULL CHECK (config_type IN (
    'COMPUTATION_RULES',
    'PARITY_THRESHOLDS',
    'TRUST_THRESHOLDS',
    'RISK_THRESHOLDS',
    'WORKFLOW_POLICY',
    'OVERRIDE_POLICY',
    'RETENTION_POLICY',
    'EVIDENCE_CONFIDENCE_POLICY',
    'CANONICALIZATION_RULES',
    'CONNECTOR_MAPPING_RULES',
    'PROVIDER_CONTRACT_PROFILE',
    'MATERIALITY_PROFILE',
    'AMENDMENT_MATERIALITY_PROFILE',
    'MASKING_EXPORT_POLICY'
  )),
  version_id text NOT NULL REFERENCES control_manifest.config_version_register (version_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  content_hash text NOT NULL,
  status_at_freeze text NOT NULL CHECK (status_at_freeze IN ('DRAFT', 'CANDIDATE', 'VERIFIED', 'APPROVED', 'DEPRECATED', 'REVOKED')),
  effective_scope text,
  effective_from timestamptz,
  effective_to timestamptz,
  ccr_id text REFERENCES control_manifest.config_change_request_register (ccr_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  test_suite_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_api_version text,
  provider_schema_version text,
  environment_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  compatibility_class text,
  superseded_by_version_id text,
  entry_payload jsonb NOT NULL,
  PRIMARY KEY (config_freeze_id, entry_order),
  UNIQUE (config_freeze_id, config_type),
  CHECK (jsonb_typeof(test_suite_refs) = 'array'),
  CHECK (jsonb_typeof(environment_allowlist) = 'array'),
  CHECK (jsonb_typeof(entry_payload) = 'object'),
  CHECK (
    (provider_api_version IS NULL AND provider_schema_version IS NULL) OR
    (provider_api_version IS NOT NULL AND provider_schema_version IS NOT NULL AND jsonb_array_length(environment_allowlist) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS config_version_config_type_content_unique
  ON control_manifest.config_version_register (config_type, content_hash, version_id);

CREATE INDEX IF NOT EXISTS config_version_lifecycle_lookup
  ON control_manifest.config_version_register (config_type, lifecycle_state, created_at DESC);

CREATE INDEX IF NOT EXISTS config_version_content_hash_lookup
  ON control_manifest.config_version_register (config_type, content_hash);

CREATE INDEX IF NOT EXISTS config_version_transition_log_lookup
  ON control_manifest.config_version_transition_log (version_id, transitioned_at DESC);

CREATE INDEX IF NOT EXISTS config_change_request_tenant_lifecycle_lookup
  ON control_manifest.config_change_request_register (tenant_id, lifecycle_state, created_at DESC);

CREATE INDEX IF NOT EXISTS config_change_request_release_lookup
  ON control_manifest.config_change_request_register (tenant_id, implemented_release_ref, rolled_back_release_ref);

CREATE INDEX IF NOT EXISTS config_change_request_transition_log_lookup
  ON control_manifest.config_change_request_transition_log (tenant_id, ccr_id, transitioned_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS config_freeze_manifest_unique
  ON control_manifest.config_freeze_register (tenant_id, manifest_id, config_freeze_id);

CREATE INDEX IF NOT EXISTS config_freeze_hash_lookup
  ON control_manifest.config_freeze_register (tenant_id, config_freeze_hash, persisted_at DESC);

CREATE INDEX IF NOT EXISTS config_freeze_surface_hash_lookup
  ON control_manifest.config_freeze_register (tenant_id, config_surface_hash, persisted_at DESC);

CREATE INDEX IF NOT EXISTS config_freeze_resolution_basis_lookup
  ON control_manifest.config_freeze_register (tenant_id, config_resolution_basis, persisted_at DESC);

CREATE INDEX IF NOT EXISTS config_freeze_entry_version_lookup
  ON control_manifest.config_freeze_entry_register (version_id, status_at_freeze);

ALTER TABLE control_manifest.config_change_request_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_manifest.config_change_request_transition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_manifest.config_freeze_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_manifest.config_freeze_entry_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_change_request_register_tenant_scope
  ON control_manifest.config_change_request_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY config_change_request_transition_log_tenant_scope
  ON control_manifest.config_change_request_transition_log
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY config_freeze_register_tenant_scope
  ON control_manifest.config_freeze_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY config_freeze_entry_register_tenant_scope
  ON control_manifest.config_freeze_entry_register
  USING (
    EXISTS (
      SELECT 1
      FROM control_manifest.config_freeze_register freeze
      WHERE freeze.config_freeze_id = config_freeze_entry_register.config_freeze_id
        AND freeze.tenant_id = control_support.require_tenant_context()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM control_manifest.config_freeze_register freeze
      WHERE freeze.config_freeze_id = config_freeze_entry_register.config_freeze_id
        AND freeze.tenant_id = control_support.require_tenant_context()
    )
  );

COMMENT ON TABLE control_manifest.config_version_register IS
  'Immutable governed ConfigVersion artifacts with lifecycle, approval, verification, supersession, revocation, and content-hash lookup columns.';

COMMENT ON TABLE control_manifest.config_change_request_register IS
  'Tenant-scoped governed ConfigChangeRequest lane for review, testing, approval, implementation, and rollback lineage.';

COMMENT ON TABLE control_manifest.config_freeze_register IS
  'Manifest-bound complete ConfigFreeze artifact with exact config/source lineage hashes and top-level frozen policy refs.';

COMMENT ON TABLE control_manifest.config_freeze_entry_register IS
  'Canonical ordered ConfigFreeze entries, exactly one per required governed config type.';
