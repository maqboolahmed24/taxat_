-- Phase-03 backend-access foundation for tenant, user, and ActorSession persistence.
-- This migration assumes the control-store baseline from packages/control-plane-db has already
-- established the control_support helper functions and the pg_control_* role family.

CREATE SCHEMA IF NOT EXISTS control_access AUTHORIZATION pg_control_owner;

GRANT USAGE ON SCHEMA control_access TO
  pg_control_runtime_api,
  pg_control_orchestrator,
  pg_control_worker,
  pg_control_projector_ro,
  pg_control_backup_restore,
  pg_break_glass_operator;

GRANT CREATE ON SCHEMA control_access TO pg_control_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE pg_control_owner IN SCHEMA control_access
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
  pg_control_runtime_api,
  pg_control_orchestrator,
  pg_control_worker;

ALTER DEFAULT PRIVILEGES FOR ROLE pg_control_owner IN SCHEMA control_access
GRANT SELECT ON TABLES TO
  pg_control_projector_ro,
  pg_control_backup_restore,
  pg_break_glass_operator;

CREATE TABLE IF NOT EXISTS control_access.tenant_register (
  tenant_id text PRIMARY KEY,
  name text NOT NULL,
  policy_profile_id text NOT NULL,
  default_retention_profile_id text NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('ACTIVE', 'DISABLED')),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (updated_at >= created_at),
  CHECK (
    (lifecycle_state = 'ACTIVE' AND disabled_at IS NULL) OR
    (lifecycle_state = 'DISABLED' AND disabled_at IS NOT NULL AND disabled_at >= created_at)
  )
);

CREATE TABLE IF NOT EXISTS control_access.user_register (
  user_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  mfa_state text NOT NULL CHECK (mfa_state IN ('NOT_ENROLLED', 'ENROLLED', 'REQUIRED', 'SATISFIED', 'LOCKED')),
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('ACTIVE', 'DISABLED')),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (tenant_id, user_id),
  CHECK (jsonb_typeof(roles) = 'array'),
  CHECK (jsonb_typeof(attributes) = 'object'),
  CHECK (updated_at >= created_at),
  CHECK (
    (lifecycle_state = 'ACTIVE' AND disabled_at IS NULL) OR
    (lifecycle_state = 'DISABLED' AND disabled_at IS NOT NULL AND disabled_at >= created_at)
  )
);

CREATE TABLE IF NOT EXISTS control_access.actor_session_register (
  session_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  principal_user_id_or_null text,
  principal_ref text NOT NULL,
  principal_class text NOT NULL CHECK (principal_class IN ('HUMAN', 'SERVICE', 'EXTERNAL')),
  session_client_class text NOT NULL CHECK (session_client_class IN ('BROWSER', 'NATIVE', 'AUTOMATION')),
  authn_level text NOT NULL CHECK (authn_level IN ('BASIC', 'MFA', 'STEP_UP')),
  step_up_state text NOT NULL CHECK (step_up_state IN ('NOT_REQUIRED', 'REQUIRED_PENDING', 'SATISFIED', 'EXPIRED')),
  session_binding_hash text NOT NULL,
  csrf_ref text,
  device_binding_state text NOT NULL CHECK (device_binding_state IN ('NOT_APPLICABLE', 'BOUND', 'UNVERIFIED', 'INVALIDATED')),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revocation_reason text,
  step_up_completed_at timestamptz,
  last_seen_at timestamptz,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('ISSUED', 'ACTIVE', 'STEPPED_UP', 'EXPIRED', 'REVOKED', 'DEVICE_INVALIDATED')),
  anti_csrf_binding_required boolean NOT NULL,
  transition_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  FOREIGN KEY (tenant_id, principal_user_id_or_null) REFERENCES control_access.user_register (tenant_id, user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (jsonb_typeof(transition_reason_codes) = 'array'),
  CHECK (expires_at > issued_at),
  CHECK (created_at <= issued_at),
  CHECK (updated_at >= created_at),
  CHECK (last_seen_at IS NULL OR (last_seen_at >= issued_at AND last_seen_at <= expires_at)),
  CHECK (step_up_completed_at IS NULL OR (step_up_completed_at >= issued_at AND step_up_completed_at <= expires_at)),
  CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL) OR
    (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
  ),
  CHECK (
    principal_class <> 'HUMAN' OR
    (principal_user_id_or_null IS NOT NULL AND principal_ref = principal_user_id_or_null)
  ),
  CHECK (
    principal_class IN ('SERVICE', 'EXTERNAL') OR
    principal_user_id_or_null IS NOT NULL
  ),
  CHECK (
    session_client_class <> 'BROWSER' OR
    (principal_class = 'HUMAN' AND anti_csrf_binding_required = true AND csrf_ref IS NOT NULL AND device_binding_state = 'NOT_APPLICABLE')
  ),
  CHECK (
    session_client_class <> 'NATIVE' OR
    (principal_class = 'HUMAN' AND anti_csrf_binding_required = false AND csrf_ref IS NULL AND device_binding_state IN ('BOUND', 'UNVERIFIED', 'INVALIDATED'))
  ),
  CHECK (
    session_client_class <> 'AUTOMATION' OR
    (anti_csrf_binding_required = false AND csrf_ref IS NULL AND device_binding_state = 'NOT_APPLICABLE')
  ),
  CHECK (
    step_up_state <> 'SATISFIED' OR
    (step_up_completed_at IS NOT NULL AND authn_level = 'STEP_UP')
  ),
  CHECK (
    step_up_state = 'SATISFIED' OR
    step_up_completed_at IS NULL
  ),
  CHECK (
    lifecycle_state <> 'DEVICE_INVALIDATED' OR
    (device_binding_state = 'INVALIDATED' AND revoked_at IS NOT NULL)
  ),
  CHECK (
    lifecycle_state <> 'REVOKED' OR
    (revoked_at IS NOT NULL AND device_binding_state <> 'INVALIDATED')
  ),
  CHECK (
    lifecycle_state <> 'STEPPED_UP' OR
    (step_up_state = 'SATISFIED' AND step_up_completed_at IS NOT NULL)
  ),
  CHECK (
    revoked_at IS NULL OR last_seen_at IS NULL OR last_seen_at <= revoked_at
  ),
  CHECK (
    revoked_at IS NULL OR step_up_completed_at IS NULL OR step_up_completed_at <= revoked_at
  )
);

CREATE TABLE IF NOT EXISTS control_access.actor_session_transition_log (
  transition_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES control_access.actor_session_register (session_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  from_lifecycle_state text CHECK (from_lifecycle_state IN ('ISSUED', 'ACTIVE', 'STEPPED_UP', 'EXPIRED', 'REVOKED', 'DEVICE_INVALIDATED') OR from_lifecycle_state IS NULL),
  to_lifecycle_state text NOT NULL CHECK (to_lifecycle_state IN ('ISSUED', 'ACTIVE', 'STEPPED_UP', 'EXPIRED', 'REVOKED', 'DEVICE_INVALIDATED')),
  reason_code text NOT NULL,
  revocation_class text CHECK (revocation_class IN ('USER_INITIATED', 'ADMINISTRATIVE', 'COMPROMISE_RESPONSE', 'DEVICE_BINDING_INVALIDATED', 'TENANT_STATE', 'SESSION_EXPIRY') OR revocation_class IS NULL),
  source_ref text,
  transition_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_session_binding_hash_guard
  ON control_access.actor_session_register (tenant_id, session_binding_hash);

CREATE INDEX IF NOT EXISTS actor_session_tenant_user_lookup
  ON control_access.actor_session_register (tenant_id, principal_user_id_or_null, lifecycle_state);

CREATE INDEX IF NOT EXISTS actor_session_principal_lookup
  ON control_access.actor_session_register (tenant_id, principal_ref, issued_at DESC);

CREATE INDEX IF NOT EXISTS actor_session_expiry_sweep
  ON control_access.actor_session_register (expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS actor_session_revocation_lookup
  ON control_access.actor_session_register (tenant_id, revoked_at DESC)
  WHERE revoked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS actor_session_last_seen_lookup
  ON control_access.actor_session_register (tenant_id, last_seen_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS actor_session_transition_lookup
  ON control_access.actor_session_transition_log (tenant_id, session_id, transition_at DESC);

ALTER TABLE control_access.tenant_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.user_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.actor_session_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.actor_session_transition_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_register_tenant_scope ON control_access.tenant_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY user_register_tenant_scope ON control_access.user_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY actor_session_register_tenant_scope ON control_access.actor_session_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY actor_session_transition_log_tenant_scope ON control_access.actor_session_transition_log
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

COMMENT ON TABLE control_access.tenant_register IS
  'Durable tenant truth with explicit disable posture so session and access checks never infer tenant availability from runtime config only.';

COMMENT ON TABLE control_access.user_register IS
  'Tenant-scoped user truth with explicit role, attribute, and MFA posture for later PrincipalContext construction.';

COMMENT ON TABLE control_access.actor_session_register IS
  'Durable ActorSession truth. Browser anti-CSRF, native device binding, step-up rotation, revocation lineage, and last-seen posture stay queryable here instead of hiding in middleware state.';

COMMENT ON TABLE control_access.actor_session_transition_log IS
  'Audit-friendly lifecycle lineage for session issue, step-up, revocation, expiry, and device invalidation transitions.';
