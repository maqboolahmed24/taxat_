-- Phase-03 durable principal-context and authorization-decision persistence.
-- These frozen control objects remain queryable in the control store so northbound command
-- admission, replay, governance simulation, and revocation propagation do not reconstruct
-- authorization posture from framework-local request adapters.

CREATE TABLE IF NOT EXISTS control_access.principal_context_register (
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  principal_id text NOT NULL,
  principal_type text NOT NULL CHECK (principal_type IN ('HUMAN', 'SERVICE', 'EXTERNAL')),
  effective_role_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  session_id text NOT NULL REFERENCES control_access.actor_session_register (session_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  client_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  partition_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  authn_level text NOT NULL CHECK (authn_level IN ('BASIC', 'MFA', 'STEP_UP')),
  subject_identity_assurance_level text NOT NULL CHECK (subject_identity_assurance_level IN ('UNVERIFIED', 'VERIFIED', 'STEP_UP_VERIFIED')),
  service_identity_ref text,
  delegation_basis text NOT NULL CHECK (delegation_basis IN ('SELF_ACTING', 'CLIENT_GRANTED', 'SELF_ASSESSMENT_IMPORTED', 'DIGITAL_HANDSHAKE', 'TENANT_INTERNAL', 'SYSTEM_ASSIGNED')),
  authorization_evaluated_at timestamptz NOT NULL,
  policy_snapshot_hash text NOT NULL,
  access_binding_hash text NOT NULL,
  delegation_snapshot_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_link_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_link_snapshot_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  masking_scope text NOT NULL,
  approval_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_portal_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  run_kind_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, access_binding_hash),
  CHECK (jsonb_typeof(effective_role_set) = 'array' AND jsonb_array_length(effective_role_set) >= 1),
  CHECK (jsonb_typeof(client_scope) = 'array'),
  CHECK (jsonb_typeof(requested_scope) = 'array' AND jsonb_array_length(requested_scope) >= 1),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(delegation_snapshot_refs) = 'array'),
  CHECK (jsonb_typeof(authority_link_refs) = 'array'),
  CHECK (jsonb_typeof(authority_link_snapshot_refs) = 'array'),
  CHECK (jsonb_typeof(approval_capabilities) = 'array'),
  CHECK (jsonb_typeof(client_portal_capabilities) = 'array'),
  CHECK (jsonb_typeof(run_kind_capabilities) = 'array'),
  CHECK (
    (principal_type = 'SERVICE' AND service_identity_ref IS NOT NULL) OR
    (principal_type <> 'SERVICE' AND service_identity_ref IS NULL)
  ),
  CHECK (
    (authn_level = 'STEP_UP' AND subject_identity_assurance_level = 'STEP_UP_VERIFIED') OR
    (authn_level <> 'STEP_UP' AND subject_identity_assurance_level <> 'STEP_UP_VERIFIED')
  ),
  CHECK (
    principal_type <> 'SERVICE' OR
    (
      authn_level = 'BASIC' AND
      subject_identity_assurance_level = 'UNVERIFIED' AND
      delegation_basis IN ('TENANT_INTERNAL', 'SYSTEM_ASSIGNED') AND
      jsonb_array_length(approval_capabilities) = 0 AND
      jsonb_array_length(client_portal_capabilities) = 0 AND
      jsonb_array_length(delegation_snapshot_refs) = 0
    )
  ),
  CHECK (
    delegation_basis NOT IN ('SELF_ACTING', 'CLIENT_GRANTED', 'SELF_ASSESSMENT_IMPORTED', 'DIGITAL_HANDSHAKE') OR
    jsonb_array_length(client_scope) > 0
  ),
  CHECK (
    jsonb_array_length(authority_link_refs) = 0 OR
    jsonb_array_length(authority_link_snapshot_refs) > 0
  )
);

CREATE TABLE IF NOT EXISTS control_access.authorization_decision_register (
  decision_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  principal_id text NOT NULL,
  session_id text NOT NULL REFERENCES control_access.actor_session_register (session_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  principal_context_ref text NOT NULL,
  principal_context_access_binding_hash text NOT NULL,
  resource_class text NOT NULL,
  action_family text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('ALLOW', 'ALLOW_MASKED', 'REQUIRE_STEP_UP', 'REQUIRE_APPROVAL', 'DENY')),
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_partition_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  masking_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_authn_level text CHECK (required_authn_level IN ('BASIC', 'MFA', 'STEP_UP') OR required_authn_level IS NULL),
  policy_snapshot_hash text NOT NULL,
  access_binding_hash text NOT NULL,
  dependency_topology_hash text,
  simulation_basis_hash text,
  delegation_snapshot_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_link_snapshot_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_layer_boundary jsonb NOT NULL,
  bounded_safe_mutation smallint CHECK (bounded_safe_mutation IN (0, 1) OR bounded_safe_mutation IS NULL),
  approval_requirement text CHECK (approval_requirement IN ('NOT_REQUIRED', 'SINGLE_APPROVER', 'DUAL_APPROVER', 'SECURITY_REVIEW', 'CHANGE_ADVISORY_QUORUM') OR approval_requirement IS NULL),
  evaluated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, principal_context_access_binding_hash)
    REFERENCES control_access.principal_context_register (tenant_id, access_binding_hash)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CHECK (jsonb_typeof(reason_codes) = 'array' AND jsonb_array_length(reason_codes) >= 1),
  CHECK (jsonb_typeof(effective_scope) = 'array'),
  CHECK (jsonb_typeof(effective_partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(masking_rules) = 'array'),
  CHECK (jsonb_typeof(required_approvals) = 'array'),
  CHECK (jsonb_typeof(delegation_snapshot_refs) = 'array'),
  CHECK (jsonb_typeof(authority_link_snapshot_refs) = 'array'),
  CHECK (jsonb_typeof(authority_layer_boundary) = 'object'),
  CHECK ((decision = 'DENY' AND jsonb_array_length(effective_scope) = 0) OR (decision <> 'DENY' AND jsonb_array_length(effective_scope) > 0)),
  CHECK (decision <> 'ALLOW' OR jsonb_array_length(masking_rules) = 0),
  CHECK (decision <> 'ALLOW_MASKED' OR jsonb_array_length(masking_rules) > 0),
  CHECK (required_authn_level IS NULL OR decision = 'REQUIRE_STEP_UP'),
  CHECK (decision <> 'REQUIRE_APPROVAL' OR jsonb_array_length(required_approvals) > 0),
  CHECK (
    (dependency_topology_hash IS NULL AND simulation_basis_hash IS NULL) OR
    (dependency_topology_hash IS NOT NULL AND simulation_basis_hash IS NOT NULL)
  ),
  CHECK (
    (bounded_safe_mutation IS NULL AND approval_requirement IS NULL AND dependency_topology_hash IS NULL AND simulation_basis_hash IS NULL) OR
    (bounded_safe_mutation = 1 AND approval_requirement = 'NOT_REQUIRED' AND dependency_topology_hash IS NOT NULL AND simulation_basis_hash IS NOT NULL) OR
    (bounded_safe_mutation = 0 AND approval_requirement IN ('SINGLE_APPROVER', 'DUAL_APPROVER', 'SECURITY_REVIEW', 'CHANGE_ADVISORY_QUORUM') AND dependency_topology_hash IS NOT NULL AND simulation_basis_hash IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS principal_context_access_binding_lookup
  ON control_access.principal_context_register (tenant_id, access_binding_hash);

CREATE INDEX IF NOT EXISTS principal_context_session_lookup
  ON control_access.principal_context_register (tenant_id, session_id, authorization_evaluated_at DESC);

CREATE INDEX IF NOT EXISTS principal_context_principal_lookup
  ON control_access.principal_context_register (tenant_id, principal_id, authorization_evaluated_at DESC);

CREATE INDEX IF NOT EXISTS principal_context_policy_snapshot_lookup
  ON control_access.principal_context_register (tenant_id, policy_snapshot_hash, authorization_evaluated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS authorization_decision_access_binding_lookup
  ON control_access.authorization_decision_register (tenant_id, access_binding_hash);

CREATE INDEX IF NOT EXISTS authorization_decision_context_lookup
  ON control_access.authorization_decision_register (tenant_id, principal_context_access_binding_hash, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS authorization_decision_policy_snapshot_lookup
  ON control_access.authorization_decision_register (tenant_id, policy_snapshot_hash, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS authorization_decision_session_lookup
  ON control_access.authorization_decision_register (tenant_id, session_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS authorization_decision_simulation_lookup
  ON control_access.authorization_decision_register (tenant_id, simulation_basis_hash, dependency_topology_hash, evaluated_at DESC)
  WHERE simulation_basis_hash IS NOT NULL;

ALTER TABLE control_access.principal_context_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.authorization_decision_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY principal_context_register_tenant_scope ON control_access.principal_context_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY authorization_decision_register_tenant_scope ON control_access.authorization_decision_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

COMMENT ON TABLE control_access.principal_context_register IS
  'Frozen PrincipalContext records keyed by tenant and access-binding hash so request/session adapters do not improvise authorization posture from partial transport claims.';

COMMENT ON TABLE control_access.authorization_decision_register IS
  'Frozen AuthorizationDecision records keyed by tenant and access-binding hash so governance mutation basis, masking posture, approval posture, and step-up posture remain queryable and replay-safe.';
