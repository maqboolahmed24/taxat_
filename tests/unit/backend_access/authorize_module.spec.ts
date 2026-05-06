import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  AuthorityLinkRepository,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  PrincipalContextBuilder,
  PrincipalContextRepository,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
} from "../../../packages/backend-access/src/index.ts";

async function buildHumanFixture(options?: {
  authn_level?: "BASIC" | "MFA" | "STEP_UP";
  client_portal_capabilities?: string[];
  role_id?: string;
  session_id?: string;
  user_id?: string;
}) {
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
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
    principalContextRepository,
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
  await userRepository.create({
    artifact_type: "User",
    user_id: options?.user_id ?? "user.operator.001",
    tenant_id: "tenant.taxat",
    roles: [options?.role_id ?? "TENANT_ADMIN"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state:
      (options?.authn_level ?? "MFA") === "STEP_UP" ? "SATISFIED" : "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: options?.user_id ?? "user.operator.001",
    session_id: options?.session_id ?? "session.browser.901",
    authn_level: options?.authn_level ?? "MFA",
    step_up_state:
      (options?.authn_level ?? "MFA") === "STEP_UP" ? "SATISFIED" : "NOT_REQUIRED",
    session_binding_hash: "hash.binding.901",
    csrf_ref: "csrf.901",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  return {
    authorizeService,
    delegationGrantRepository,
    authorityLinkRepository,
    principalContextBuilder,
  };
}

async function buildServiceFixture() {
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
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
    principalContextRepository,
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
  await sessionLifecycleService.issueAutomationSession({
    tenant_id: "tenant.taxat",
    principal_ref: "service.identity.001",
    principal_class: "SERVICE",
    session_id: "session.automation.901",
    session_binding_hash: "hash.binding.automation.901",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T12:00:00Z",
  });

  return {
    authorizeService,
    principalContextBuilder,
  };
}

test("step-up precedence wins over approval while blocked responses retain pending approvals", async () => {
  const { authorizeService, principalContextBuilder } = await buildHumanFixture({
    authn_level: "MFA",
  });
  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.901",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: ["client.taxpayer.900"],
    requested_scope: ["year_end", "amendment_intent"],
    partition_scope_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    evaluated_at: "2026-04-23T09:05:00Z",
    persist: false,
  });

  expect(result.authorization_decision.decision).toBe("REQUIRE_STEP_UP");
  expect(result.authorization_decision.required_authn_level).toBe("STEP_UP");
  expect(result.authorization_decision.required_approvals).toEqual([]);
  expect(result.authorization_decision.reason_codes).toEqual(
    expect.arrayContaining([
      "STEP_UP_REQUIRED_FOR_AUTHORITY_LINK",
      "APPROVAL_REQUIRED_FOR_AUTHORITY_LINK",
    ]),
  );
  expect(result.authorization_decision.authority_layer_boundary.human_gate_requirement).toBe(
    "REQUIRE_STEP_UP_AND_APPROVAL",
  );
  expect(result.blocked_response?.required_approvals).toEqual([
    "approval.connector-link.single-approver",
  ]);
});

test("atomic live requests fail closed when delegation only covers a narrowed partition subset", async () => {
  const { authorizeService, delegationGrantRepository, principalContextBuilder } =
    await buildHumanFixture({ authn_level: "STEP_UP" });

  await delegationGrantRepository.create({
    delegation_grant_id: "delegation-grant.dg-901",
    tenant_id: "tenant.taxat",
    reporting_subject_ref: "reporting-subject.client-901",
    delegate_ref: "delegate.agent-901",
    delegate_class: "HUMAN",
    authority_scope_refs: ["submit_returns"],
    partition_scope_refs: ["partition.uk.vat"],
    basis_type: "CLIENT_GRANTED",
    basis_evidence_refs: ["evidence.client-delegation.901"],
    effective_from: "2026-04-23T08:00:00Z",
    expires_at: null,
    revoked_at: null,
    superseded_by_grant_id: null,
    lifecycle_state: "ACTIVE",
    last_validated_at: "2026-04-23T08:30:00Z",
    imported_evidence_fresh_until: null,
    limitation_reason_codes: [],
  });

  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.901",
    delegation_basis: "CLIENT_GRANTED",
    client_scope: ["client.taxpayer.901"],
    requested_scope: ["year_end", "prepare_submission"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "SubmissionRecord",
    action_family: "PREPARE_FILING",
    evaluated_at: "2026-04-23T09:10:00Z",
    persist: false,
    operation_target: {
      reporting_subject_ref: "reporting-subject.client-901",
      authorised_party_ref: "delegate.agent-901",
      authority_scope: "submit_returns",
    },
  });

  expect(result.authorization_decision.decision).toBe("DENY");
  expect(result.authorization_decision.effective_scope).toEqual([]);
  expect(result.authorization_decision.reason_codes).toContain(
    "CLIENT_DELEGATION_REQUIRED",
  );
});

test("missing authority links deny integrated actions without fabricating snapshot lineage", async () => {
  const {
    authorizeService,
    delegationGrantRepository,
    principalContextBuilder,
  } = await buildHumanFixture({ authn_level: "STEP_UP" });

  await delegationGrantRepository.create({
    delegation_grant_id: "delegation-grant.dg-902",
    tenant_id: "tenant.taxat",
    reporting_subject_ref: "reporting-subject.client-902",
    delegate_ref: "delegate.agent-902",
    delegate_class: "HUMAN",
    authority_scope_refs: ["submit_returns"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    basis_type: "CLIENT_GRANTED",
    basis_evidence_refs: ["evidence.client-delegation.902"],
    effective_from: "2026-04-23T08:00:00Z",
    expires_at: null,
    revoked_at: null,
    superseded_by_grant_id: null,
    lifecycle_state: "ACTIVE",
    last_validated_at: "2026-04-23T08:30:00Z",
    imported_evidence_fresh_until: null,
    limitation_reason_codes: [],
  });

  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.901",
    delegation_basis: "CLIENT_GRANTED",
    client_scope: ["client.taxpayer.902"],
    requested_scope: ["year_end", "prepare_submission", "submit"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "SubmissionRecord",
    action_family: "SUBMIT_TO_AUTHORITY",
    evaluated_at: "2026-04-23T09:15:00Z",
    persist: false,
    operation_target: {
      client_id: "client.taxpayer.902",
      reporting_subject_ref: "reporting-subject.client-902",
      authorised_party_ref: "delegate.agent-902",
      authority_name: "HMRC-MTD",
      authority_scope: "submit_returns",
      provider_environment: "sandbox",
      provider_api_version: "v1",
    },
  });

  expect(result.authorization_decision.decision).toBe("DENY");
  expect(result.authorization_decision.reason_codes).toContain("AUTHORITY_LINK_REQUIRED");
  expect(result.authorization_decision.authority_layer_boundary.integration_capability).toBe(
    "AUTHORITY_INTEGRATED",
  );
  expect(result.authorization_decision.authority_layer_boundary.authority_link_state).toBe(
    "UNLINKED",
  );
  expect(result.authorization_decision.authority_link_snapshot_refs).toEqual([]);
});

test("service principals remain blocked from human-only action families", async () => {
  const { authorizeService, principalContextBuilder } = await buildServiceFixture();
  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.automation.901",
    effective_role_set: ["SUPPORT_OPERATOR"],
    delegation_basis: "SYSTEM_ASSIGNED",
    client_scope: ["client.taxpayer.903"],
    requested_scope: ["year_end", "prepare_submission"],
    partition_scope_refs: [],
    masking_scope: "SUPPORT_OPERATOR_MASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    service_identity_ref: "service.identity.001",
    policy_context_override: {
      client_portal_capabilities: [],
    },
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "Client",
    action_family: "REQUEST_CLIENT_INFO",
    evaluated_at: "2026-04-23T09:20:00Z",
    persist: false,
  });

  expect(result.authorization_decision.decision).toBe("DENY");
  expect(result.authorization_decision.reason_codes).toContain(
    "SERVICE_PRINCIPAL_HUMAN_ACTION_BLOCKED",
  );
});

test("client-portal actions fail closed when the frozen capability is absent", async () => {
  const { authorizeService, principalContextBuilder } = await buildHumanFixture({
    authn_level: "STEP_UP",
  });
  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.901",
    delegation_basis: "SELF_ACTING",
    client_scope: ["client.taxpayer.904"],
    requested_scope: ["year_end", "prepare_submission"],
    partition_scope_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    policy_context_override: {
      client_portal_capabilities: [],
    },
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "Client",
    action_family: "VIEW_CLIENT_PORTAL_STATUS",
    evaluated_at: "2026-04-23T09:25:00Z",
    persist: false,
  });

  expect(result.authorization_decision.decision).toBe("DENY");
  expect(result.authorization_decision.reason_codes).toContain(
    "CLIENT_PORTAL_CAPABILITY_REQUIRED",
  );
});

test("masked reads stay explicit and projection-only", async () => {
  const { authorizeService, principalContextBuilder } = await buildHumanFixture({
    authn_level: "STEP_UP",
    role_id: "AUDITOR",
    user_id: "user.auditor.001",
    session_id: "session.browser.902",
  });
  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.902",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: [],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "AUDITOR_MASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "Client",
    action_family: "VIEW_MASKED",
    evaluated_at: "2026-04-23T09:30:00Z",
    persist: false,
  });

  expect(result.authorization_decision.decision).toBe("ALLOW_MASKED");
  expect(result.authorization_decision.masking_rules).toContain(
    "mask.client_personal_fields",
  );
  expect(result.blocked_response).toBeNull();
});
