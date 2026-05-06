-- Phase-03 durable run-manifest control spine.
-- Storage strategy:
--   1. `control_manifest.run_manifest_register` keeps one authoritative root row with scalar identity,
--      lifecycle, lineage, and frozen-hash columns plus typed JSONB packets for nested contracts.
--   2. `control_manifest.run_manifest_output_link_register` preserves structured output-link rows so
--      downstream reload never degrades dependency identity refs into alias strings.
--   3. `control_manifest.run_manifest_transition_log` records every named lifecycle transition with
--      compare-and-swap lineage so later branch-selection and start-claim cards inherit one durable
--      machine history instead of ad hoc row rewrites.

CREATE TABLE IF NOT EXISTS control_manifest.run_manifest_register (
  manifest_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  root_manifest_id text,
  parent_manifest_id text,
  continuation_of_manifest_id text,
  replay_of_manifest_id text,
  supersedes_manifest_id text,
  manifest_generation integer NOT NULL CHECK (manifest_generation >= 0),
  manifest_schema_version text NOT NULL,
  client_id text NOT NULL,
  period text NOT NULL,
  requested_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  mode text NOT NULL CHECK (mode IN ('COMPLIANCE', 'ANALYSIS')),
  run_kind text NOT NULL CHECK (run_kind IN ('INTERACTIVE', 'NIGHTLY', 'BACKFILL', 'REPLAY', 'REMEDIATION', 'AMENDMENT', 'MIGRATION')),
  replay_class text,
  nightly_batch_run_ref text,
  nightly_window_key text,
  principal_context_ref text NOT NULL,
  access_binding_hash text NOT NULL,
  environment_ref text NOT NULL CHECK (environment_ref IN ('DEV', 'TEST', 'UAT', 'SANDBOX', 'PRODUCTION')),
  code_build_id text NOT NULL,
  code_commit_sha text NOT NULL,
  container_image_digest text NOT NULL,
  schema_bundle_hash text NOT NULL,
  feature_flag_snapshot_hash text,
  deterministic_seed text NOT NULL,
  idempotency_key text NOT NULL,
  continuation_basis text NOT NULL CHECK (continuation_basis IN ('NEW_MANIFEST', 'REPLAY_CHILD', 'RECOVERY_CHILD', 'CONTINUATION_CHILD', 'NEW_REQUEST_CHILD')),
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('ALLOCATED', 'FROZEN', 'SEALED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'FAILED', 'SUPERSEDED', 'REPLAY_ONLY', 'RETIRED')),
  manifest_row_version integer NOT NULL DEFAULT 1 CHECK (manifest_row_version >= 1),
  truth_boundary_contract jsonb NOT NULL,
  schema_reader_window_contract jsonb NOT NULL,
  invariant_enforcement_contract jsonb NOT NULL,
  state_transition_contract jsonb NOT NULL,
  manifest_branch_decision jsonb NOT NULL,
  continuation_set jsonb NOT NULL,
  manifest_lineage_trace_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  business_partitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  income_source_partitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_link_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  approval_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  override_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_environment_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  non_deterministic_module_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope_execution_binding jsonb NOT NULL,
  access_decision jsonb,
  config_freeze jsonb,
  input_freeze jsonb,
  hash_set jsonb,
  frozen_execution_binding jsonb,
  preseal_gate_evaluation jsonb,
  manifest_start_claim jsonb,
  append_only_outcome_projection jsonb,
  gating_decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  audit_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  submission_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  drift_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_bundle_hash text,
  deterministic_outcome_hash text,
  replay_attestation_ref text,
  created_at timestamptz NOT NULL,
  frozen_at timestamptz,
  sealed_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  superseded_at timestamptz,
  retired_at timestamptz,
  created_recorded_at timestamptz NOT NULL DEFAULT now(),
  updated_recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, access_binding_hash)
    REFERENCES control_access.principal_context_register (tenant_id, access_binding_hash)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CHECK (jsonb_typeof(requested_scope) = 'array'),
  CHECK (jsonb_typeof(manifest_lineage_trace_refs) = 'array'),
  CHECK (jsonb_typeof(business_partitions) = 'array'),
  CHECK (jsonb_typeof(income_source_partitions) = 'array'),
  CHECK (jsonb_typeof(authority_link_refs) = 'array'),
  CHECK (jsonb_typeof(approval_refs) = 'array'),
  CHECK (jsonb_typeof(override_refs) = 'array'),
  CHECK (jsonb_typeof(provider_environment_refs) = 'array'),
  CHECK (jsonb_typeof(non_deterministic_module_allowlist) = 'array'),
  CHECK (jsonb_typeof(gating_decisions) = 'array'),
  CHECK (jsonb_typeof(output_refs) = 'object'),
  CHECK (jsonb_typeof(audit_refs) = 'array'),
  CHECK (jsonb_typeof(submission_refs) = 'array'),
  CHECK (jsonb_typeof(drift_refs) = 'array'),
  CHECK (jsonb_typeof(truth_boundary_contract) = 'object'),
  CHECK (jsonb_typeof(schema_reader_window_contract) = 'object'),
  CHECK (jsonb_typeof(invariant_enforcement_contract) = 'object'),
  CHECK (jsonb_typeof(state_transition_contract) = 'object'),
  CHECK (jsonb_typeof(manifest_branch_decision) = 'object'),
  CHECK (jsonb_typeof(continuation_set) = 'object'),
  CHECK (jsonb_typeof(scope_execution_binding) = 'object'),
  CHECK (access_decision IS NULL OR jsonb_typeof(access_decision) = 'object'),
  CHECK (config_freeze IS NULL OR jsonb_typeof(config_freeze) = 'object'),
  CHECK (input_freeze IS NULL OR jsonb_typeof(input_freeze) = 'object'),
  CHECK (hash_set IS NULL OR jsonb_typeof(hash_set) = 'object'),
  CHECK (frozen_execution_binding IS NULL OR jsonb_typeof(frozen_execution_binding) = 'object'),
  CHECK (preseal_gate_evaluation IS NULL OR jsonb_typeof(preseal_gate_evaluation) = 'object'),
  CHECK (manifest_start_claim IS NULL OR jsonb_typeof(manifest_start_claim) = 'object'),
  CHECK (append_only_outcome_projection IS NULL OR jsonb_typeof(append_only_outcome_projection) = 'object'),
  CHECK (
    (run_kind = 'REPLAY' AND replay_class IN ('STANDARD_REPLAY', 'AUDIT_REPLAY', 'COUNTERFACTUAL_ANALYSIS')) OR
    (run_kind <> 'REPLAY' AND replay_class IS NULL)
  ),
  CHECK (
    (run_kind = 'NIGHTLY' AND nightly_window_key IS NOT NULL) OR
    (run_kind <> 'NIGHTLY' AND nightly_window_key IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS control_manifest.run_manifest_output_link_register (
  manifest_id text NOT NULL REFERENCES control_manifest.run_manifest_register (manifest_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  output_link_key text NOT NULL,
  linkage_role_code text NOT NULL,
  artifact_type text NOT NULL,
  artifact_ref text NOT NULL,
  artifact_hash_or_null text,
  produced_by_manifest_id text NOT NULL,
  dependency_identity_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (manifest_id, output_link_key),
  CHECK (jsonb_typeof(dependency_identity_refs) = 'array')
);

CREATE TABLE IF NOT EXISTS control_manifest.run_manifest_transition_log (
  transition_id text PRIMARY KEY,
  manifest_id text NOT NULL REFERENCES control_manifest.run_manifest_register (manifest_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  manifest_row_version integer NOT NULL CHECK (manifest_row_version >= 1),
  from_lifecycle_state text,
  to_lifecycle_state text NOT NULL CHECK (to_lifecycle_state IN ('ALLOCATED', 'FROZEN', 'SEALED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'FAILED', 'SUPERSEDED', 'REPLAY_ONLY', 'RETIRED')),
  transition_event_code text NOT NULL,
  transition_reason_code text NOT NULL,
  transition_audit_ref text NOT NULL,
  transitioned_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS run_manifest_tenant_idempotency_key
  ON control_manifest.run_manifest_register (tenant_id, idempotency_key, access_binding_hash);

CREATE INDEX IF NOT EXISTS run_manifest_root_lineage_lookup
  ON control_manifest.run_manifest_register (tenant_id, root_manifest_id, manifest_generation, created_at DESC);

CREATE INDEX IF NOT EXISTS run_manifest_parent_lineage_lookup
  ON control_manifest.run_manifest_register (tenant_id, parent_manifest_id, manifest_generation, created_at DESC)
  WHERE parent_manifest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS run_manifest_access_binding_lookup
  ON control_manifest.run_manifest_register (tenant_id, access_binding_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS run_manifest_lifecycle_lookup
  ON control_manifest.run_manifest_register (tenant_id, lifecycle_state, created_at DESC);

CREATE INDEX IF NOT EXISTS run_manifest_output_link_artifact_lookup
  ON control_manifest.run_manifest_output_link_register (artifact_ref, linkage_role_code);

CREATE INDEX IF NOT EXISTS run_manifest_transition_log_lookup
  ON control_manifest.run_manifest_transition_log (tenant_id, manifest_id, transitioned_at DESC);

ALTER TABLE control_manifest.run_manifest_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_manifest.run_manifest_output_link_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_manifest.run_manifest_transition_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY run_manifest_register_tenant_scope
  ON control_manifest.run_manifest_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY run_manifest_output_link_register_tenant_scope
  ON control_manifest.run_manifest_output_link_register
  USING (
    EXISTS (
      SELECT 1
      FROM control_manifest.run_manifest_register manifest
      WHERE manifest.manifest_id = run_manifest_output_link_register.manifest_id
        AND manifest.tenant_id = control_support.require_tenant_context()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM control_manifest.run_manifest_register manifest
      WHERE manifest.manifest_id = run_manifest_output_link_register.manifest_id
        AND manifest.tenant_id = control_support.require_tenant_context()
    )
  );

CREATE POLICY run_manifest_transition_log_tenant_scope
  ON control_manifest.run_manifest_transition_log
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

COMMENT ON TABLE control_manifest.run_manifest_register IS
  'Root run-manifest aggregate row with scalar lineage and lifecycle columns plus typed JSONB carriers for frozen execution basis, pre-seal provenance, start-claim posture, and append-only outcome projection.';

COMMENT ON TABLE control_manifest.run_manifest_output_link_register IS
  'Structured manifest output-link rows that preserve linkage role, artifact identity, and dependency identity refs without collapsing to alias strings.';

COMMENT ON TABLE control_manifest.run_manifest_transition_log IS
  'Append-only named transition history for RUN_MANIFEST_LIFECYCLE_V1 with row-version lineage for compare-and-swap enforcement.';
