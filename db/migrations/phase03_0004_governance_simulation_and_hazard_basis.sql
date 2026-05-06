-- Phase-03 durable governance mutation simulation persistence.
-- These tables preserve the simulation bundle that governance preview, approval, and
-- commit stale guards must compare directly instead of recomputing hazard or blast-radius
-- posture from browser-local state.

CREATE TABLE IF NOT EXISTS control_access.governance_mutation_hazard_contract_register (
  hazard_contract_hash text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  policy_snapshot_hash text NOT NULL,
  access_binding_hash text NOT NULL,
  dependency_topology_hash text NOT NULL,
  simulation_basis_hash text NOT NULL,
  commit_authority_posture text NOT NULL CHECK (commit_authority_posture IN ('PREVIEW_ONLY', 'APPROVAL_GATED', 'BOUNDED_SAFE')),
  approval_requirement text NOT NULL CHECK (approval_requirement IN ('NOT_REQUIRED', 'SINGLE_APPROVER', 'DUAL_APPROVER', 'SECURITY_REVIEW', 'CHANGE_ADVISORY_QUORUM')),
  bounded_safe_mutation smallint NOT NULL CHECK (bounded_safe_mutation IN (0, 1)),
  required_approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_driver_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  approval_trigger_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_limiter_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  bounded_safety_blocker_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  frozen_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, access_binding_hash)
    REFERENCES control_access.authorization_decision_register (tenant_id, access_binding_hash)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CHECK (jsonb_typeof(required_approvals) = 'array'),
  CHECK (jsonb_typeof(risk_driver_codes) = 'array'),
  CHECK (jsonb_typeof(approval_trigger_codes) = 'array'),
  CHECK (jsonb_typeof(confidence_limiter_codes) = 'array'),
  CHECK (jsonb_typeof(bounded_safety_blocker_codes) = 'array'),
  CHECK (jsonb_typeof(reason_codes) = 'array'),
  CHECK (jsonb_typeof(frozen_record) = 'object')
);

CREATE TABLE IF NOT EXISTS control_access.governance_mutation_basis_contract_register (
  basis_contract_hash text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  policy_snapshot_hash text NOT NULL,
  access_binding_hash text NOT NULL,
  dependency_topology_hash text NOT NULL,
  simulation_basis_hash text NOT NULL,
  hazard_contract_hash text NOT NULL REFERENCES control_access.governance_mutation_hazard_contract_register (hazard_contract_hash) ON UPDATE RESTRICT ON DELETE RESTRICT,
  commit_authority_posture text NOT NULL CHECK (commit_authority_posture IN ('PREVIEW_ONLY', 'APPROVAL_GATED', 'BOUNDED_SAFE')),
  approval_requirement text NOT NULL CHECK (approval_requirement IN ('NOT_REQUIRED', 'SINGLE_APPROVER', 'DUAL_APPROVER', 'SECURITY_REVIEW', 'CHANGE_ADVISORY_QUORUM')),
  bounded_safe_mutation smallint NOT NULL CHECK (bounded_safe_mutation IN (0, 1)),
  required_approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  simulation_confidence_score integer NOT NULL CHECK (simulation_confidence_score BETWEEN 0 AND 100),
  predictability_score integer NOT NULL CHECK (predictability_score BETWEEN 0 AND 100),
  frozen_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, access_binding_hash)
    REFERENCES control_access.authorization_decision_register (tenant_id, access_binding_hash)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CHECK (jsonb_typeof(required_approvals) = 'array'),
  CHECK (jsonb_typeof(frozen_record) = 'object'),
  CHECK (
    (bounded_safe_mutation = 1 AND approval_requirement = 'NOT_REQUIRED' AND jsonb_array_length(required_approvals) = 0) OR
    (bounded_safe_mutation = 0 AND approval_requirement IN ('SINGLE_APPROVER', 'DUAL_APPROVER', 'SECURITY_REVIEW', 'CHANGE_ADVISORY_QUORUM') AND jsonb_array_length(required_approvals) > 0)
  )
);

CREATE TABLE IF NOT EXISTS control_access.governance_access_simulation_register (
  simulation_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  principal_id text NOT NULL,
  session_id text NOT NULL REFERENCES control_access.actor_session_register (session_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  principal_context_access_binding_hash text NOT NULL,
  authorization_decision_access_binding_hash text NOT NULL,
  policy_snapshot_hash text NOT NULL,
  governance_target_ref text,
  resource_class text NOT NULL,
  action_family text NOT NULL,
  dependency_topology_hash text,
  simulation_basis_hash text,
  hazard_contract_hash text REFERENCES control_access.governance_mutation_hazard_contract_register (hazard_contract_hash) ON UPDATE RESTRICT ON DELETE RESTRICT,
  basis_contract_hash text REFERENCES control_access.governance_mutation_basis_contract_register (basis_contract_hash) ON UPDATE RESTRICT ON DELETE RESTRICT,
  simulator_posture text NOT NULL CHECK (simulator_posture IN ('READ_ONLY_DECISION', 'ADVISORY_ONLY', 'APPROVAL_GATED', 'BOUNDED_SAFE')),
  simulation_profile_ref text,
  inventory_slice_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_approver_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_diff_hash text,
  frozen_record jsonb NOT NULL,
  simulated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, principal_context_access_binding_hash)
    REFERENCES control_access.principal_context_register (tenant_id, access_binding_hash)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, authorization_decision_access_binding_hash)
    REFERENCES control_access.authorization_decision_register (tenant_id, access_binding_hash)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CHECK (jsonb_typeof(inventory_slice_refs) = 'array'),
  CHECK (jsonb_typeof(requested_approver_scope) = 'array'),
  CHECK (jsonb_typeof(frozen_record) = 'object'),
  CHECK (
    (dependency_topology_hash IS NULL AND simulation_basis_hash IS NULL AND hazard_contract_hash IS NULL AND basis_contract_hash IS NULL AND simulator_posture = 'READ_ONLY_DECISION') OR
    (dependency_topology_hash IS NOT NULL AND simulation_basis_hash IS NOT NULL AND hazard_contract_hash IS NOT NULL AND basis_contract_hash IS NOT NULL AND simulator_posture IN ('ADVISORY_ONLY', 'APPROVAL_GATED', 'BOUNDED_SAFE'))
  )
);

CREATE INDEX IF NOT EXISTS governance_mutation_hazard_policy_snapshot_lookup
  ON control_access.governance_mutation_hazard_contract_register (tenant_id, policy_snapshot_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS governance_mutation_hazard_simulation_lookup
  ON control_access.governance_mutation_hazard_contract_register (tenant_id, simulation_basis_hash, dependency_topology_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS governance_mutation_basis_policy_snapshot_lookup
  ON control_access.governance_mutation_basis_contract_register (tenant_id, policy_snapshot_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS governance_mutation_basis_simulation_lookup
  ON control_access.governance_mutation_basis_contract_register (tenant_id, simulation_basis_hash, dependency_topology_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS governance_access_simulation_policy_snapshot_lookup
  ON control_access.governance_access_simulation_register (tenant_id, policy_snapshot_hash, simulated_at DESC);

CREATE INDEX IF NOT EXISTS governance_access_simulation_decision_lookup
  ON control_access.governance_access_simulation_register (tenant_id, authorization_decision_access_binding_hash, simulated_at DESC);

CREATE INDEX IF NOT EXISTS governance_access_simulation_simulation_basis_lookup
  ON control_access.governance_access_simulation_register (tenant_id, simulation_basis_hash, dependency_topology_hash, simulated_at DESC)
  WHERE simulation_basis_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS governance_access_simulation_basis_contract_lookup
  ON control_access.governance_access_simulation_register (tenant_id, basis_contract_hash, simulated_at DESC)
  WHERE basis_contract_hash IS NOT NULL;

ALTER TABLE control_access.governance_mutation_hazard_contract_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.governance_mutation_basis_contract_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.governance_access_simulation_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY governance_mutation_hazard_contract_register_tenant_scope
  ON control_access.governance_mutation_hazard_contract_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY governance_mutation_basis_contract_register_tenant_scope
  ON control_access.governance_mutation_basis_contract_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY governance_access_simulation_register_tenant_scope
  ON control_access.governance_access_simulation_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

COMMENT ON TABLE control_access.governance_mutation_hazard_contract_register IS
  'Frozen governance mutation hazard packets keyed by hazard_contract_hash so blast-radius, risk-driver, and approval-trigger review stays replay-safe.';

COMMENT ON TABLE control_access.governance_mutation_basis_contract_register IS
  'Frozen governance simulation-to-commit continuity packets keyed by basis_contract_hash so approvals and commits compare the exact reviewed basis.';

COMMENT ON TABLE control_access.governance_access_simulation_register IS
  'Frozen GovernanceAccessSimulation records keyed by simulation_id so governance preview, stale-view rejection, and later commit admission share one queryable simulation bundle.';
