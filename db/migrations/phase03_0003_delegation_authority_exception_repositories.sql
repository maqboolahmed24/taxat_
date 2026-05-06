-- Phase-03 durable delegation, authority-link, and exceptional-authority persistence.
-- These tables preserve explicit client delegation, authority-of-record readiness, and
-- bounded internal exception lineage instead of hiding them inside connector-local state.

CREATE TABLE IF NOT EXISTS control_access.delegation_grant_register (
  delegation_grant_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  reporting_subject_ref text NOT NULL,
  delegate_ref text,
  delegate_class text CHECK (delegate_class IN ('HUMAN', 'EXTERNAL', 'ROLE_GROUP', 'SERVICE') OR delegate_class IS NULL),
  authority_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  partition_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  basis_type text NOT NULL CHECK (basis_type IN ('CLIENT_GRANTED', 'SELF_ASSESSMENT_IMPORTED', 'DIGITAL_HANDSHAKE')),
  basis_evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_from timestamptz NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  superseded_by_grant_id text,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('PENDING_VALIDATION', 'ACTIVE', 'LIMITED_SCOPE', 'REVOKED', 'EXPIRED', 'SUPERSEDED')),
  last_validated_at timestamptz,
  imported_evidence_fresh_until timestamptz,
  limitation_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  lineage_key text NOT NULL,
  current_snapshot_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, delegation_grant_id),
  CHECK (delegate_ref IS NOT NULL OR delegate_class IS NOT NULL),
  CHECK (jsonb_typeof(authority_scope_refs) = 'array' AND jsonb_array_length(authority_scope_refs) >= 1),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(basis_evidence_refs) = 'array' AND jsonb_array_length(basis_evidence_refs) >= 1),
  CHECK (jsonb_typeof(limitation_reason_codes) = 'array'),
  CHECK (updated_at >= created_at),
  CHECK (expires_at IS NULL OR expires_at >= effective_from),
  CHECK (revoked_at IS NULL OR revoked_at >= effective_from),
  CHECK (
    imported_evidence_fresh_until IS NULL OR
    imported_evidence_fresh_until >= effective_from
  ),
  CHECK (
    basis_type <> 'CLIENT_GRANTED' OR
    (delegate_ref IS NOT NULL AND imported_evidence_fresh_until IS NULL)
  ),
  CHECK (
    basis_type IN ('SELF_ASSESSMENT_IMPORTED', 'DIGITAL_HANDSHAKE') OR
    imported_evidence_fresh_until IS NULL
  ),
  CHECK (
    lifecycle_state NOT IN ('ACTIVE', 'LIMITED_SCOPE') OR
    (last_validated_at IS NOT NULL AND revoked_at IS NULL AND superseded_by_grant_id IS NULL)
  ),
  CHECK (
    lifecycle_state <> 'ACTIVE' OR
    jsonb_array_length(limitation_reason_codes) = 0
  ),
  CHECK (
    lifecycle_state <> 'LIMITED_SCOPE' OR
    jsonb_array_length(limitation_reason_codes) > 0
  ),
  CHECK (
    lifecycle_state <> 'PENDING_VALIDATION' OR
    last_validated_at IS NULL
  ),
  CHECK (
    lifecycle_state <> 'REVOKED' OR
    revoked_at IS NOT NULL
  ),
  CHECK (
    lifecycle_state <> 'EXPIRED' OR
    expires_at IS NOT NULL
  ),
  CHECK (
    lifecycle_state <> 'SUPERSEDED' OR
    superseded_by_grant_id IS NOT NULL
  ),
  CHECK (
    basis_type = 'CLIENT_GRANTED' OR
    lifecycle_state = 'PENDING_VALIDATION' OR
    (imported_evidence_fresh_until IS NOT NULL AND last_validated_at IS NOT NULL AND last_validated_at <= imported_evidence_fresh_until)
  )
);

CREATE TABLE IF NOT EXISTS control_access.delegation_grant_snapshot_register (
  snapshot_ref text PRIMARY KEY,
  delegation_grant_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  lineage_key text NOT NULL,
  frozen_record jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(frozen_record) = 'object')
);

CREATE TABLE IF NOT EXISTS control_access.delegation_grant_transition_log (
  transition_id text PRIMARY KEY,
  delegation_grant_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  from_lifecycle_state text CHECK (from_lifecycle_state IN ('PENDING_VALIDATION', 'ACTIVE', 'LIMITED_SCOPE', 'REVOKED', 'EXPIRED', 'SUPERSEDED') OR from_lifecycle_state IS NULL),
  to_lifecycle_state text NOT NULL CHECK (to_lifecycle_state IN ('PENDING_VALIDATION', 'ACTIVE', 'LIMITED_SCOPE', 'REVOKED', 'EXPIRED', 'SUPERSEDED')),
  reason_code text NOT NULL,
  source_ref text,
  snapshot_ref text NOT NULL,
  transition_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS control_access.authority_link_register (
  authority_link_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  client_id text NOT NULL,
  reporting_subject_ref text NOT NULL,
  authority_name text NOT NULL,
  authority_scope text NOT NULL,
  provider_environment text NOT NULL,
  provider_api_version text NOT NULL,
  authorised_party_ref text NOT NULL,
  delegation_grant_ref text,
  partition_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  token_binding_profile_ref text,
  validated_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  superseded_by_link_id text,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('UNLINKED', 'LINK_INITIATED', 'AUTHORISED_ACTIVE', 'AUTHORISED_LIMITED', 'TOKEN_INVALID', 'REVOKED', 'EXPIRED', 'SUPERSEDED')),
  binding_health text NOT NULL CHECK (binding_health IN ('HEALTHY', 'LIMITED_SCOPE', 'EXPIRING_SOON', 'TOKEN_INVALID', 'CLIENT_BINDING_MISMATCH', 'DELEGATION_GAP', 'ENVIRONMENT_DRIFT', 'REVOKED', 'EXPIRED', 'UNLINKED', 'UNKNOWN')),
  delegation_state text NOT NULL CHECK (delegation_state IN ('NOT_REQUIRED', 'SATISFIED', 'LIMITED', 'MISSING', 'EXPIRED', 'UNKNOWN')),
  token_client_binding_state text NOT NULL CHECK (token_client_binding_state IN ('BOUND', 'MISMATCH', 'UNVERIFIED')),
  source_evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_binding_check_at timestamptz,
  lineage_key text NOT NULL,
  current_snapshot_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, delegation_grant_ref)
    REFERENCES control_access.delegation_grant_register (tenant_id, delegation_grant_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  UNIQUE (tenant_id, authority_link_id),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(source_evidence_refs) = 'array' AND jsonb_array_length(source_evidence_refs) >= 1),
  CHECK (jsonb_typeof(blocked_reason_codes) = 'array'),
  CHECK (updated_at >= created_at),
  CHECK (validated_at IS NULL OR last_binding_check_at IS NULL OR last_binding_check_at >= validated_at),
  CHECK (
    token_client_binding_state <> 'MISMATCH' OR
    binding_health = 'CLIENT_BINDING_MISMATCH'
  ),
  CHECK (
    binding_health <> 'CLIENT_BINDING_MISMATCH' OR
    token_client_binding_state = 'MISMATCH'
  ),
  CHECK (
    binding_health <> 'DELEGATION_GAP' OR
    delegation_state IN ('MISSING', 'EXPIRED')
  ),
  CHECK (
    delegation_state <> 'LIMITED' OR
    (binding_health = 'LIMITED_SCOPE' AND lifecycle_state = 'AUTHORISED_LIMITED')
  ),
  CHECK (
    delegation_state <> 'NOT_REQUIRED' OR
    delegation_grant_ref IS NULL
  ),
  CHECK (
    authorised_party_ref = reporting_subject_ref OR
    (delegation_grant_ref IS NOT NULL AND delegation_state <> 'NOT_REQUIRED')
  ),
  CHECK (
    authorised_party_ref <> reporting_subject_ref OR
    delegation_state = 'NOT_REQUIRED'
  ),
  CHECK (
    lifecycle_state <> 'UNLINKED' OR
    (binding_health = 'UNLINKED' AND token_binding_profile_ref IS NULL AND validated_at IS NULL AND last_binding_check_at IS NULL)
  ),
  CHECK (
    lifecycle_state <> 'LINK_INITIATED' OR
    (validated_at IS NULL AND last_binding_check_at IS NULL)
  ),
  CHECK (
    lifecycle_state <> 'AUTHORISED_LIMITED' OR
    (token_binding_profile_ref IS NOT NULL AND validated_at IS NOT NULL AND last_binding_check_at IS NOT NULL AND jsonb_array_length(blocked_reason_codes) > 0)
  ),
  CHECK (
    lifecycle_state <> 'TOKEN_INVALID' OR
    (binding_health = 'TOKEN_INVALID' AND token_binding_profile_ref IS NOT NULL)
  ),
  CHECK (
    lifecycle_state <> 'REVOKED' OR
    (binding_health = 'REVOKED' AND revoked_at IS NOT NULL)
  ),
  CHECK (
    lifecycle_state <> 'EXPIRED' OR
    (binding_health = 'EXPIRED' AND expires_at IS NOT NULL)
  ),
  CHECK (
    lifecycle_state <> 'SUPERSEDED' OR
    superseded_by_link_id IS NOT NULL
  ),
  CHECK (
    binding_health NOT IN ('HEALTHY', 'EXPIRING_SOON') OR
    (
      lifecycle_state = 'AUTHORISED_ACTIVE' AND
      token_client_binding_state = 'BOUND' AND
      delegation_state IN ('NOT_REQUIRED', 'SATISFIED') AND
      token_binding_profile_ref IS NOT NULL AND
      validated_at IS NOT NULL AND
      last_binding_check_at IS NOT NULL AND
      jsonb_array_length(blocked_reason_codes) = 0
    )
  ),
  CHECK (
    binding_health IN ('HEALTHY', 'EXPIRING_SOON') OR
    jsonb_array_length(blocked_reason_codes) > 0
  )
);

CREATE TABLE IF NOT EXISTS control_access.authority_link_snapshot_register (
  snapshot_ref text PRIMARY KEY,
  authority_link_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  lineage_key text NOT NULL,
  frozen_record jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(frozen_record) = 'object')
);

CREATE TABLE IF NOT EXISTS control_access.authority_link_transition_log (
  transition_id text PRIMARY KEY,
  authority_link_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  from_lifecycle_state text CHECK (from_lifecycle_state IN ('UNLINKED', 'LINK_INITIATED', 'AUTHORISED_ACTIVE', 'AUTHORISED_LIMITED', 'TOKEN_INVALID', 'REVOKED', 'EXPIRED', 'SUPERSEDED') OR from_lifecycle_state IS NULL),
  to_lifecycle_state text NOT NULL CHECK (to_lifecycle_state IN ('UNLINKED', 'LINK_INITIATED', 'AUTHORISED_ACTIVE', 'AUTHORISED_LIMITED', 'TOKEN_INVALID', 'REVOKED', 'EXPIRED', 'SUPERSEDED')),
  reason_code text NOT NULL,
  source_ref text,
  snapshot_ref text NOT NULL,
  transition_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS control_access.exceptional_authority_grant_register (
  exceptional_grant_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  incident_ref text NOT NULL,
  target_action_family text NOT NULL,
  client_id text NOT NULL,
  partition_scope_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  requesting_principal_ref text NOT NULL,
  requesting_principal_class text NOT NULL CHECK (requesting_principal_class IN ('HUMAN', 'EXTERNAL')),
  approving_principal_ref text NOT NULL,
  approving_principal_class text NOT NULL CHECK (approving_principal_class = 'HUMAN'),
  activated_at timestamptz,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  usage_limit integer NOT NULL CHECK (usage_limit >= 1),
  remaining_uses integer NOT NULL CHECK (remaining_uses >= 0),
  rationale text NOT NULL,
  compensating_control_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('PENDING_APPROVAL', 'ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED')),
  approval_step_up_state text NOT NULL CHECK (approval_step_up_state = 'SATISFIED'),
  approval_step_up_evidence_ref text NOT NULL,
  self_approved boolean NOT NULL DEFAULT false CHECK (self_approved = false),
  authority_acknowledgement_override_permitted boolean NOT NULL DEFAULT false CHECK (authority_acknowledgement_override_permitted = false),
  delegation_substitution_permitted boolean NOT NULL DEFAULT false CHECK (delegation_substitution_permitted = false),
  silent_client_widening_permitted boolean NOT NULL DEFAULT false CHECK (silent_client_widening_permitted = false),
  declaration_sign_without_signatory_basis_permitted boolean NOT NULL DEFAULT false CHECK (declaration_sign_without_signatory_basis_permitted = false),
  truth_confirmation_override_permitted boolean NOT NULL DEFAULT false CHECK (truth_confirmation_override_permitted = false),
  silent_partition_widening_permitted boolean NOT NULL DEFAULT false CHECK (silent_partition_widening_permitted = false),
  lineage_key text NOT NULL,
  current_snapshot_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, exceptional_grant_id),
  CHECK (jsonb_typeof(partition_scope_refs) = 'array'),
  CHECK (jsonb_typeof(compensating_control_refs) = 'array' AND jsonb_array_length(compensating_control_refs) >= 1),
  CHECK (updated_at >= created_at),
  CHECK (requesting_principal_ref <> approving_principal_ref),
  CHECK (remaining_uses <= usage_limit),
  CHECK (activated_at IS NULL OR expires_at >= activated_at),
  CHECK (activated_at IS NULL OR revoked_at IS NULL OR revoked_at >= activated_at),
  CHECK (
    lifecycle_state <> 'PENDING_APPROVAL' OR
    (activated_at IS NULL AND revoked_at IS NULL AND remaining_uses = 0)
  ),
  CHECK (
    lifecycle_state <> 'ACTIVE' OR
    (activated_at IS NOT NULL AND revoked_at IS NULL AND remaining_uses >= 1)
  ),
  CHECK (
    lifecycle_state <> 'EXHAUSTED' OR
    (activated_at IS NOT NULL AND revoked_at IS NULL AND remaining_uses = 0)
  ),
  CHECK (
    lifecycle_state <> 'REVOKED' OR
    (activated_at IS NOT NULL AND revoked_at IS NOT NULL)
  ),
  CHECK (
    lifecycle_state <> 'EXPIRED' OR
    (activated_at IS NOT NULL AND revoked_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS control_access.exceptional_authority_grant_snapshot_register (
  snapshot_ref text PRIMARY KEY,
  exceptional_grant_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  lineage_key text NOT NULL,
  frozen_record jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(frozen_record) = 'object')
);

CREATE TABLE IF NOT EXISTS control_access.exceptional_authority_transition_log (
  transition_id text PRIMARY KEY,
  exceptional_grant_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  from_lifecycle_state text CHECK (from_lifecycle_state IN ('PENDING_APPROVAL', 'ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED') OR from_lifecycle_state IS NULL),
  to_lifecycle_state text NOT NULL CHECK (to_lifecycle_state IN ('PENDING_APPROVAL', 'ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED')),
  reason_code text NOT NULL,
  source_ref text,
  snapshot_ref text NOT NULL,
  transition_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS control_access.exceptional_authority_usage_log (
  ledger_entry_id text PRIMARY KEY,
  exceptional_grant_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES control_access.tenant_register (tenant_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  used_at timestamptz NOT NULL,
  remaining_uses_before integer NOT NULL CHECK (remaining_uses_before >= 0),
  remaining_uses_after integer NOT NULL CHECK (remaining_uses_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, exceptional_grant_id)
    REFERENCES control_access.exceptional_authority_grant_register (tenant_id, exceptional_grant_id)
    ON UPDATE RESTRICT
    ON DELETE CASCADE,
  CHECK (remaining_uses_after <= remaining_uses_before)
);

CREATE UNIQUE INDEX IF NOT EXISTS delegation_grant_lineage_lookup
  ON control_access.delegation_grant_register (tenant_id, lineage_key);

CREATE INDEX IF NOT EXISTS delegation_grant_reporting_subject_lookup
  ON control_access.delegation_grant_register (tenant_id, reporting_subject_ref, effective_from DESC);

CREATE INDEX IF NOT EXISTS delegation_grant_delegate_lookup
  ON control_access.delegation_grant_register (tenant_id, delegate_ref, effective_from DESC)
  WHERE delegate_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS delegation_grant_freshness_lookup
  ON control_access.delegation_grant_register (tenant_id, basis_type, lifecycle_state, imported_evidence_fresh_until, last_validated_at DESC);

CREATE INDEX IF NOT EXISTS delegation_grant_snapshot_lineage_lookup
  ON control_access.delegation_grant_snapshot_register (tenant_id, lineage_key, captured_at DESC);

CREATE INDEX IF NOT EXISTS delegation_grant_transition_lookup
  ON control_access.delegation_grant_transition_log (tenant_id, delegation_grant_id, transition_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS authority_link_lineage_lookup
  ON control_access.authority_link_register (tenant_id, lineage_key);

CREATE INDEX IF NOT EXISTS authority_link_client_lookup
  ON control_access.authority_link_register (tenant_id, client_id, authority_name, authority_scope, last_binding_check_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS authority_link_reporting_authorised_lookup
  ON control_access.authority_link_register (tenant_id, reporting_subject_ref, authorised_party_ref, last_binding_check_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS authority_link_binding_profile_lookup
  ON control_access.authority_link_register (tenant_id, token_binding_profile_ref, last_binding_check_at DESC NULLS LAST)
  WHERE token_binding_profile_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS authority_link_delegation_lookup
  ON control_access.authority_link_register (tenant_id, delegation_grant_ref, lifecycle_state, last_binding_check_at DESC NULLS LAST)
  WHERE delegation_grant_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS authority_link_health_lookup
  ON control_access.authority_link_register (tenant_id, binding_health, lifecycle_state, expires_at ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS authority_link_snapshot_lineage_lookup
  ON control_access.authority_link_snapshot_register (tenant_id, lineage_key, captured_at DESC);

CREATE INDEX IF NOT EXISTS authority_link_transition_lookup
  ON control_access.authority_link_transition_log (tenant_id, authority_link_id, transition_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS exceptional_authority_lineage_lookup
  ON control_access.exceptional_authority_grant_register (tenant_id, lineage_key);

CREATE INDEX IF NOT EXISTS exceptional_authority_client_action_lookup
  ON control_access.exceptional_authority_grant_register (tenant_id, client_id, target_action_family, lifecycle_state, expires_at ASC);

CREATE INDEX IF NOT EXISTS exceptional_authority_incident_lookup
  ON control_access.exceptional_authority_grant_register (tenant_id, incident_ref, activated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS exceptional_authority_requester_approver_lookup
  ON control_access.exceptional_authority_grant_register (tenant_id, requesting_principal_ref, approving_principal_ref, expires_at ASC);

CREATE INDEX IF NOT EXISTS exceptional_authority_snapshot_lineage_lookup
  ON control_access.exceptional_authority_grant_snapshot_register (tenant_id, lineage_key, captured_at DESC);

CREATE INDEX IF NOT EXISTS exceptional_authority_transition_lookup
  ON control_access.exceptional_authority_transition_log (tenant_id, exceptional_grant_id, transition_at DESC);

CREATE INDEX IF NOT EXISTS exceptional_authority_usage_lookup
  ON control_access.exceptional_authority_usage_log (tenant_id, exceptional_grant_id, used_at DESC);

ALTER TABLE control_access.delegation_grant_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.delegation_grant_snapshot_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.delegation_grant_transition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.authority_link_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.authority_link_snapshot_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.authority_link_transition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.exceptional_authority_grant_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.exceptional_authority_grant_snapshot_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.exceptional_authority_transition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_access.exceptional_authority_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY delegation_grant_register_tenant_scope ON control_access.delegation_grant_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY delegation_grant_snapshot_register_tenant_scope ON control_access.delegation_grant_snapshot_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY delegation_grant_transition_log_tenant_scope ON control_access.delegation_grant_transition_log
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY authority_link_register_tenant_scope ON control_access.authority_link_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY authority_link_snapshot_register_tenant_scope ON control_access.authority_link_snapshot_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY authority_link_transition_log_tenant_scope ON control_access.authority_link_transition_log
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY exceptional_authority_grant_register_tenant_scope ON control_access.exceptional_authority_grant_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY exceptional_authority_grant_snapshot_register_tenant_scope ON control_access.exceptional_authority_grant_snapshot_register
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY exceptional_authority_transition_log_tenant_scope ON control_access.exceptional_authority_transition_log
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

CREATE POLICY exceptional_authority_usage_log_tenant_scope ON control_access.exceptional_authority_usage_log
  USING (tenant_id = control_support.require_tenant_context())
  WITH CHECK (tenant_id = control_support.require_tenant_context());

COMMENT ON TABLE control_access.delegation_grant_register IS
  'Current durable delegation-grant truth keyed by tenant and grant id, with explicit freshness posture, lineage, supersession, and partition coverage.';

COMMENT ON TABLE control_access.delegation_grant_snapshot_register IS
  'Immutable delegation-grant snapshots referenced by frozen PrincipalContext and AuthorizationDecision artifacts.';

COMMENT ON TABLE control_access.authority_link_register IS
  'Current durable authority-link truth keyed by tenant and link id, including token-binding health, delegation posture, provider tuple, and connector lineage without raw secrets.';

COMMENT ON TABLE control_access.authority_link_snapshot_register IS
  'Immutable authority-link snapshots so frozen decisions can safely reference prior bindings after refresh, expiry, revocation, or supersession.';

COMMENT ON TABLE control_access.exceptional_authority_grant_register IS
  'Current durable exceptional-authority truth keyed by tenant and grant id, with distinct requester and approver identities, bounded usage, and incident linkage.';

COMMENT ON TABLE control_access.exceptional_authority_grant_snapshot_register IS
  'Immutable exceptional-authority snapshots referenced by frozen authority and approval decisions.';

COMMENT ON TABLE control_access.exceptional_authority_usage_log IS
  'Append-only bounded-use ledger for exceptional-authority consumption so compare-and-swap failures and exhaustion remain auditable.';
