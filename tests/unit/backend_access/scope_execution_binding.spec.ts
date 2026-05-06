import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  AuthorityLinkRepository,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  PrincipalContextBuilder,
  PrincipalContextRepository,
  RuntimeScopeGuard,
  ScopeExecutionBindingRepository,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
  validateEffectiveScopeBinding,
} from "../../../packages/backend-access/src/index.ts";

async function buildFixture() {
  const tenantRepository = new TenantRepository();
  const userRepository = new UserRepository({ tenantRepository });
  const actorSessionRepository = new ActorSessionRepository({
    tenantRepository,
    userRepository,
  });
  const sessionLifecycleService = new SessionLifecycleService({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const principalContextBuilder = new PrincipalContextBuilder({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const principalContextRepository = new PrincipalContextRepository();
  const delegationGrantRepository = new DelegationGrantRepository({ tenantRepository });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const exceptionalAuthorityGrantRepository = new ExceptionalAuthorityGrantRepository({
    tenantRepository,
  });
  const scopeExecutionBindingRepository = new ScopeExecutionBindingRepository();
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
    principalContextRepository,
  });
  const runtimeScopeGuard = new RuntimeScopeGuard({
    scopeExecutionBindingRepository,
  });

  await tenantRepository.create({
    artifact_type: "Tenant",
    tenant_id: "tenant.taxat",
    name: "Taxat Sandbox",
    policy_profile_id: "policy.default",
    default_retention_profile_id: "retention.default",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  return {
    actorSessionRepository,
    authorityLinkRepository,
    authorizeService,
    delegationGrantRepository,
    principalContextBuilder,
    runtimeScopeGuard,
    scopeExecutionBindingRepository,
    sessionLifecycleService,
    tenantRepository,
    userRepository,
  };
}

async function issueHumanPrincipalContext(
  fixture: Awaited<ReturnType<typeof buildFixture>>,
  input: {
    authn_level: "BASIC" | "MFA" | "STEP_UP";
    authorization_evaluated_at: string;
    client_scope?: string[];
    delegation_basis:
      | "SELF_ACTING"
      | "CLIENT_GRANTED"
      | "SELF_ASSESSMENT_IMPORTED"
      | "DIGITAL_HANDSHAKE"
      | "TENANT_INTERNAL"
      | "SYSTEM_ASSIGNED";
    masking_scope: string;
    partition_scope_refs?: string[];
    requested_scope: string[];
    role_id: string;
    session_id: string;
    step_up_state?: "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED";
    user_id: string;
  },
) {
  await fixture.userRepository.create({
    artifact_type: "User",
    user_id: input.user_id,
    tenant_id: "tenant.taxat",
    roles: [input.role_id],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: input.user_id,
    session_id: input.session_id,
    authn_level: input.authn_level,
    step_up_state: input.step_up_state ?? (input.authn_level === "STEP_UP" ? "SATISFIED" : "NOT_REQUIRED"),
    session_binding_hash: `hash.binding.${input.session_id}`,
    csrf_ref: `csrf.${input.session_id}`,
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  return fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: input.session_id,
    delegation_basis: input.delegation_basis,
    client_scope: input.client_scope ?? [],
    requested_scope: input.requested_scope,
    partition_scope_refs: input.partition_scope_refs ?? [],
    masking_scope: input.masking_scope,
    authorization_evaluated_at: input.authorization_evaluated_at,
  });
}

async function issueServicePrincipalContext(
  fixture: Awaited<ReturnType<typeof buildFixture>>,
  input: {
    authorization_evaluated_at: string;
    masking_scope: string;
    requested_scope: string[];
    session_id: string;
    service_identity_ref: string;
  },
) {
  await fixture.sessionLifecycleService.issueAutomationSession({
    tenant_id: "tenant.taxat",
    principal_ref: input.service_identity_ref,
    principal_class: "SERVICE",
    session_id: input.session_id,
    session_binding_hash: `hash.binding.${input.session_id}`,
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T12:00:00Z",
  });

  return fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: input.session_id,
    effective_role_set: ["SUPPORT_OPERATOR"],
    delegation_basis: "SYSTEM_ASSIGNED",
    client_scope: [],
    requested_scope: input.requested_scope,
    partition_scope_refs: [],
    masking_scope: input.masking_scope,
    authorization_evaluated_at: input.authorization_evaluated_at,
    service_identity_ref: input.service_identity_ref,
    policy_context_override: {
      client_portal_capabilities: [],
    },
  });
}

async function authorizeMaskedRead(
  fixture: Awaited<ReturnType<typeof buildFixture>>,
) {
  const principal_context = await issueHumanPrincipalContext(fixture, {
    authn_level: "STEP_UP",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    delegation_basis: "TENANT_INTERNAL",
    masking_scope: "AUDITOR_MASKED",
    requested_scope: ["year_end"],
    role_id: "AUDITOR",
    session_id: "session.browser.auditor",
    user_id: "user.auditor.001",
  });

  const result = await fixture.authorizeService.authorize({
    principal_context,
    resource_class: "Client",
    action_family: "VIEW_MASKED",
    evaluated_at: "2026-04-23T09:05:00Z",
    persist: false,
  });

  return {
    authorization_decision: result.authorization_decision,
    principal_context,
  };
}

async function authorizeSubmission(
  fixture: Awaited<ReturnType<typeof buildFixture>>,
) {
  await fixture.delegationGrantRepository.create({
    delegation_grant_id: "delegation-grant.dg-200",
    tenant_id: "tenant.taxat",
    reporting_subject_ref: "reporting-subject.client-200",
    delegate_ref: "delegate.agent-200",
    delegate_class: "HUMAN",
    authority_scope_refs: ["submit_returns"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    basis_type: "CLIENT_GRANTED",
    basis_evidence_refs: ["evidence.client-delegation.200"],
    effective_from: "2026-04-23T08:00:00Z",
    expires_at: null,
    revoked_at: null,
    superseded_by_grant_id: null,
    lifecycle_state: "ACTIVE",
    last_validated_at: "2026-04-23T08:30:00Z",
    imported_evidence_fresh_until: null,
    limitation_reason_codes: [],
  });

  await fixture.authorityLinkRepository.create({
    authority_link_id: "authority-link.al-200",
    tenant_id: "tenant.taxat",
    client_id: "client.taxpayer.200",
    reporting_subject_ref: "reporting-subject.client-200",
    authority_name: "HMRC-MTD",
    authority_scope: "submit_returns",
    provider_environment: "sandbox",
    provider_api_version: "v1",
    authorised_party_ref: "delegate.agent-200",
    delegation_grant_ref: "delegation-grant.dg-200",
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    token_binding_profile_ref: "token-binding-profile.200",
    validated_at: "2026-04-23T08:30:00Z",
    expires_at: "2026-05-23T08:30:00Z",
    revoked_at: null,
    superseded_by_link_id: null,
    lifecycle_state: "AUTHORISED_ACTIVE",
    binding_health: "HEALTHY",
    delegation_state: "SATISFIED",
    token_client_binding_state: "BOUND",
    source_evidence_refs: ["evidence.authority-link.200"],
    blocked_reason_codes: [],
    last_binding_check_at: "2026-04-23T09:00:00Z",
  });

  const principal_context = await issueHumanPrincipalContext(fixture, {
    authn_level: "STEP_UP",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    client_scope: ["client.taxpayer.200"],
    delegation_basis: "CLIENT_GRANTED",
    masking_scope: "TENANT_ADMIN_UNMASKED",
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    requested_scope: ["year_end", "prepare_submission", "submit"],
    role_id: "TENANT_ADMIN",
    session_id: "session.browser.operator",
    user_id: "user.operator.200",
  });

  const result = await fixture.authorizeService.authorize({
    principal_context,
    resource_class: "SubmissionRecord",
    action_family: "SUBMIT_TO_AUTHORITY",
    evaluated_at: "2026-04-23T09:10:00Z",
    persist: false,
    operation_target: {
      client_id: "client.taxpayer.200",
      reporting_subject_ref: "reporting-subject.client-200",
      authorised_party_ref: "delegate.agent-200",
      authority_name: "HMRC-MTD",
      authority_scope: "submit_returns",
      provider_environment: "sandbox",
      provider_api_version: "v1",
    },
  });

  return {
    authorization_decision: result.authorization_decision,
    principal_context,
  };
}

test("empty runtime scope fails with the governed runtime scope family", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeMaskedRead(fixture);

  const validation = await validateEffectiveScopeBinding({
    requested_scope: principal_context.requested_scope,
    requested_partition_scope_refs: principal_context.partition_scope_refs,
    access_decision: {
      decision: authorization_decision.decision,
      effective_scope: authorization_decision.effective_scope,
      effective_partition_scope_refs:
        authorization_decision.effective_partition_scope_refs,
      masking_rules: authorization_decision.masking_rules,
    },
    runtime_scope: [],
    runtime_partition_scope_refs: [],
    execution_mode_or_null: "ANALYSIS",
  });

  expect(validation).toMatchObject({
    status: "INVALID",
    reason_code: "RUNTIME_SCOPE_EMPTY",
  });
});

test("analysis-mode execution rejects live-capable runtime scope", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeSubmission(fixture);

  await expect(
    fixture.runtimeScopeGuard.enforce({
      authorization_decision,
      principal_context,
      binding_scope_class: "FROZEN_EXECUTION_BINDING",
      execution_mode_or_null: "ANALYSIS",
      persist: false,
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_SCOPE_ANALYSIS_REQUIRES_READ_ONLY",
  });
});

test("ALLOW decisions fail closed when masking rules leak into runtime materialization", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeMaskedRead(fixture);

  await expect(
    fixture.runtimeScopeGuard.enforce({
      authorization_decision: {
        ...authorization_decision,
        decision: "ALLOW",
      },
      principal_context,
      binding_scope_class: "FROZEN_EXECUTION_BINDING",
      execution_mode_or_null: "ANALYSIS",
      persist: false,
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_SCOPE_MASKING_POSTURE_INVALID",
  });
});

test("ALLOW_MASKED decisions fail closed when masking rules are missing", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeMaskedRead(fixture);

  await expect(
    fixture.runtimeScopeGuard.enforce({
      authorization_decision: {
        ...authorization_decision,
        masking_rules: [],
      },
      principal_context,
      binding_scope_class: "FROZEN_EXECUTION_BINDING",
      execution_mode_or_null: "ANALYSIS",
      persist: false,
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_SCOPE_MASKING_POSTURE_INVALID",
  });
});

test("atomic live-capable bindings reject hidden authorization narrowing", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeSubmission(fixture);

  await expect(
    fixture.runtimeScopeGuard.enforce({
      authorization_decision,
      principal_context,
      binding_scope_class: "FROZEN_EXECUTION_BINDING",
      execution_mode_or_null: "COMPLIANCE",
      executable_scope: ["year_end", "prepare_submission"],
      executable_partition_scope_refs: authorization_decision.effective_partition_scope_refs,
      persist: false,
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_SCOPE_ATOMIC_REDUCTION_FORBIDDEN",
  });
});

test("projection-only masking context is materialized and stored alongside the binding", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeMaskedRead(fixture);

  const enforced = await fixture.runtimeScopeGuard.enforce({
    authorization_decision,
    principal_context,
    binding_scope_class: "FROZEN_EXECUTION_BINDING",
    execution_mode_or_null: "ANALYSIS",
    persist: true,
  });

  expect(enforced.runtime_scope).toEqual(["year_end"]);
  expect(enforced.scope_execution_binding.access_decision).toBe("ALLOW_MASKED");
  expect(enforced.masking_context).toMatchObject({
    masking_active: true,
    masking_scope: "AUDITOR_MASKED",
    projection_policy: "PROJECTION_ONLY",
    apply_to_surfaces: ["API_PROJECTION", "EXPORT", "HUMAN_READ_MODEL"],
    ignore_for_layers: [
      "AUTHORITY_PACKET",
      "CANONICAL_FACTS",
      "COMPUTE",
      "REQUEST_HASH",
    ],
  });

  const stored = await fixture.scopeExecutionBindingRepository.listScopeExecutionBindingsByPrincipalContextAccessBindingHash(
    "tenant.taxat",
    principal_context.access_binding_hash,
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]?.scope_execution_binding.access_binding_hash).toBe(
    enforced.scope_execution_binding.access_binding_hash,
  );
});

test("replay partition widening fails closed against the frozen execution binding", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeSubmission(fixture);
  const enforced = await fixture.runtimeScopeGuard.enforce({
    authorization_decision,
    principal_context,
    binding_scope_class: "FROZEN_EXECUTION_BINDING",
    execution_mode_or_null: "COMPLIANCE",
    persist: true,
  });

  await expect(
    fixture.runtimeScopeGuard.guardStoredBinding({
      access_binding_hash: enforced.scope_execution_binding.access_binding_hash,
      current_principal_context: principal_context,
      requested_partition_scope_refs: [
        "partition.uk.vat",
        "period.2026-Q1",
        "period.2026-Q2",
      ],
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_SCOPE_PARTITION_WIDENED",
  });
});

test("service principals may not reuse client-acting frozen bindings", async () => {
  const fixture = await buildFixture();
  const { authorization_decision, principal_context } = await authorizeSubmission(fixture);
  const enforced = await fixture.runtimeScopeGuard.enforce({
    authorization_decision,
    principal_context,
    binding_scope_class: "FROZEN_EXECUTION_BINDING",
    execution_mode_or_null: "COMPLIANCE",
    persist: true,
  });
  const servicePrincipalContext = await issueServicePrincipalContext(fixture, {
    authorization_evaluated_at: "2026-04-23T09:30:00Z",
    masking_scope: "SUPPORT_OPERATOR_MASKED",
    requested_scope: ["year_end"],
    session_id: "session.automation.200",
    service_identity_ref: "service.identity.200",
  });

  await expect(
    fixture.runtimeScopeGuard.guardStoredBinding({
      access_binding_hash: enforced.scope_execution_binding.access_binding_hash,
      current_principal_context: servicePrincipalContext,
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_SCOPE_SERVICE_PRINCIPAL_REUSE_FOR_CLIENT_ACTING",
  });
});
