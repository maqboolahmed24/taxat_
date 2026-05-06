import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  PrincipalContextBuilder,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
} from "../../../packages/backend-access/src/index.ts";

async function buildDependencies() {
  const tenantRepository = new TenantRepository();
  const userRepository = new UserRepository({ tenantRepository });
  const actorSessionRepository = new ActorSessionRepository({
    tenantRepository,
    userRepository,
  });
  const sessionLifecycle = new SessionLifecycleService({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const principalContextBuilder = new PrincipalContextBuilder({
    actorSessionRepository,
    tenantRepository,
    userRepository,
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
    user_id: "user.operator.001",
    tenant_id: "tenant.taxat",
    roles: ["TENANT_ADMIN", "REVIEWER"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  return {
    actorSessionRepository,
    principalContextBuilder,
    sessionLifecycle,
    tenantRepository,
    userRepository,
  };
}

test("builder canonicalizes scope and capability inputs without dropping unknown roles", async () => {
  const { principalContextBuilder, sessionLifecycle } = await buildDependencies();

  await sessionLifecycle.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.001",
    session_id: "session.browser.201",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.browser.201",
    csrf_ref: "csrf.binding.201",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
  });

  const first = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.201",
    delegation_basis: "CLIENT_GRANTED",
    client_scope: ["client.taxpayer.001", "client.taxpayer.001"],
    requested_scope: ["submit", "year_end", "prepare_submission", "submit"],
    partition_scope_refs: ["period.2026-Q1", "partition.uk.vat", "period.2026-Q1"],
    delegation_snapshot_refs: ["delegation.snapshot.002", "delegation.snapshot.001"],
    authority_link_refs: ["authority.link.001"],
    authority_link_snapshot_refs: ["authority.snapshot.001"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T08:05:00Z",
  });

  const reordered = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.201",
    delegation_basis: "CLIENT_GRANTED",
    client_scope: ["client.taxpayer.001"],
    requested_scope: ["prepare_submission", "submit", "year_end"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    delegation_snapshot_refs: ["delegation.snapshot.001", "delegation.snapshot.002"],
    authority_link_refs: ["authority.link.001"],
    authority_link_snapshot_refs: ["authority.snapshot.001"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T08:05:00Z",
  });

  expect(first.effective_role_set).toEqual(["REVIEWER", "TENANT_ADMIN"]);
  expect(first.requested_scope).toEqual(["year_end", "prepare_submission", "submit"]);
  expect(first.partition_scope_refs).toEqual(["partition.uk.vat", "period.2026-Q1"]);
  expect(first.delegation_snapshot_refs).toEqual([
    "delegation.snapshot.001",
    "delegation.snapshot.002",
  ]);
  expect(first.approval_capabilities).toEqual(["SINGLE_APPROVER"]);
  expect(first.client_portal_capabilities).toEqual(["REQUEST_ASSISTANCE_ON_BEHALF"]);
  expect(first.run_kind_capabilities).toEqual([
    "GOVERNANCE_SIMULATION",
    "TENANT_MUTATION_PREVIEW",
  ]);
  expect(first.access_binding_hash).toBe(reordered.access_binding_hash);
});

test("service principals fail when policy overrides inject human capabilities", async () => {
  const { principalContextBuilder, sessionLifecycle } = await buildDependencies();

  await sessionLifecycle.issueAutomationSession({
    tenant_id: "tenant.taxat",
    principal_ref: "service.scheduler.001",
    principal_class: "SERVICE",
    session_id: "session.automation.201",
    session_binding_hash: "hash.binding.automation.201",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T09:00:00Z",
  });

  await expect(
    principalContextBuilder.build({
      tenant_id: "tenant.taxat",
      session_id: "session.automation.201",
      delegation_basis: "TENANT_INTERNAL",
      requested_scope: ["year_end"],
      masking_scope: "SERVICE_SUPPORT_MASKING",
      authorization_evaluated_at: "2026-04-23T08:10:00Z",
      policy_context_override: {
        approval_capabilities: ["SINGLE_APPROVER"],
      },
    }),
  ).rejects.toThrow(/PRINCIPAL_CONTEXT_INVALID_PRINCIPAL_POSTURE/);
});

test("client-acting delegation bases fail without client_scope", async () => {
  const { principalContextBuilder, sessionLifecycle } = await buildDependencies();

  await sessionLifecycle.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.001",
    session_id: "session.browser.202",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.202",
    csrf_ref: "csrf.binding.202",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
  });

  await expect(
    principalContextBuilder.build({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.202",
      delegation_basis: "CLIENT_GRANTED",
      client_scope: [],
      requested_scope: ["year_end", "prepare_submission"],
      masking_scope: "TENANT_ADMIN_UNMASKED",
      authorization_evaluated_at: "2026-04-23T08:05:00Z",
    }),
  ).rejects.toThrow(/PRINCIPAL_CONTEXT_INVALID_SCOPE_BINDING/);
});

test("authority-link refs require matching authority-link snapshot refs", async () => {
  const { principalContextBuilder, sessionLifecycle } = await buildDependencies();

  await sessionLifecycle.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.001",
    session_id: "session.browser.203",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.203",
    csrf_ref: "csrf.binding.203",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
  });

  await expect(
    principalContextBuilder.build({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.203",
      delegation_basis: "CLIENT_GRANTED",
      client_scope: ["client.taxpayer.001"],
      requested_scope: ["year_end", "submit"],
      authority_link_refs: ["authority.link.001"],
      authority_link_snapshot_refs: [],
      masking_scope: "TENANT_ADMIN_UNMASKED",
      authorization_evaluated_at: "2026-04-23T08:05:00Z",
    }),
  ).rejects.toThrow(/authority_link_refs require matching frozen authority_link_snapshot_refs/);
});

test("revoked sessions cannot be used to build new principal contexts", async () => {
  const { principalContextBuilder, sessionLifecycle } = await buildDependencies();

  await sessionLifecycle.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.001",
    session_id: "session.browser.204",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.204",
    csrf_ref: "csrf.binding.204",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
  });
  await sessionLifecycle.revokeSession({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.204",
    revoked_at: "2026-04-23T08:06:00Z",
    reason_code: "ADMIN_REVOKED",
  });

  await expect(
    principalContextBuilder.build({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.204",
      delegation_basis: "SELF_ACTING",
      client_scope: ["client.taxpayer.001"],
      requested_scope: ["year_end"],
      masking_scope: "TENANT_ADMIN_UNMASKED",
      authorization_evaluated_at: "2026-04-23T08:07:00Z",
    }),
  ).rejects.toThrow(/PRINCIPAL_CONTEXT_SESSION_UNUSABLE/);
});
