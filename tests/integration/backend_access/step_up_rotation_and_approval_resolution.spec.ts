import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  AuthorityLinkRepository,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  PrincipalContextBuilder,
  PrincipalContextRepository,
  SessionChallengeRotationService,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
} from "../../../packages/backend-access/src/index.ts";

test.describe.configure({ mode: "serial" });

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
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
    principalContextRepository,
  });
  const sessionChallengeRotationService = new SessionChallengeRotationService({
    actorSessionRepository,
    sessionLifecycleService,
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
    user_id: "user.operator.301",
    tenant_id: "tenant.taxat",
    roles: ["TENANT_ADMIN"],
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
    authorizeService,
    principalContextBuilder,
    sessionChallengeRotationService,
    sessionLifecycleService,
  };
}

test("step-up rotation invalidates pre-step-up artifacts and preserves frozen approval posture", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.301",
    session_id: "session.browser.301",
    authn_level: "MFA",
    step_up_state: "REQUIRED_PENDING",
    session_binding_hash: "hash.binding.browser.301",
    csrf_ref: "csrf.binding.301",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const principal_context_before = await fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.301",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: ["client.taxpayer.301"],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });
  const before = await fixture.authorizeService.authorize({
    principal_context: principal_context_before,
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    evaluated_at: "2026-04-23T09:05:00Z",
    persist: false,
  });

  expect(before.authorization_decision.decision).toBe("REQUIRE_STEP_UP");
  expect(before.authorization_decision.required_authn_level).toBe("STEP_UP");
  expect(before.pending_approval_requirement).toBe("SINGLE_APPROVER");
  expect(before.blocked_response?.required_approvals).toEqual([
    "approval.connector-link.single-approver",
  ]);

  await fixture.sessionChallengeRotationService.registerArtifact({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.301",
    artifact_kind: "COMMAND_TOKEN",
    artifact_ref: "command.token.301",
    issued_at: "2026-04-23T09:05:00Z",
  });

  const rotated = await fixture.sessionChallengeRotationService.completeStepUp({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.301",
    completed_at: "2026-04-23T09:06:00Z",
    rotated_session_binding_hash: "hash.binding.browser.301.rotated",
    source_ref: "step_up.flow.301",
  });

  expect(rotated.session.authn_level).toBe("STEP_UP");
  expect(rotated.session.session_binding_hash).toBe("hash.binding.browser.301.rotated");
  expect(rotated.invalidated_artifact_refs).toEqual(["command.token.301"]);

  await expect(
    fixture.sessionChallengeRotationService.assertArtifactActive({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.301",
      artifact_ref: "command.token.301",
    }),
  ).rejects.toMatchObject({
    code: "SESSION_CHALLENGE_ARTIFACT_INVALIDATED",
  });

  const principal_context_after = await fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.301",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: ["client.taxpayer.301"],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:07:00Z",
  });
  const after = await fixture.authorizeService.authorize({
    principal_context: principal_context_after,
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    evaluated_at: "2026-04-23T09:07:30Z",
    persist: false,
  });

  expect(after.authorization_decision.decision).toBe("REQUIRE_APPROVAL");
  expect(after.authorization_decision.required_authn_level).toBeNull();
  expect(after.authorization_decision.required_approvals).toEqual([
    "approval.connector-link.single-approver",
  ]);
  expect(after.blocked_response?.pending_approval_requirement).toBe(
    "SINGLE_APPROVER",
  );
  expect(after.authorization_decision.reason_codes).toEqual(
    expect.arrayContaining([
      "APPROVAL_REQUIRED_FOR_AUTHORITY_LINK",
      "STEP_UP_EVIDENCE_FROZEN",
    ]),
  );

  const transitions = await fixture.actorSessionRepository.listTransitions(
    "tenant.taxat",
    "session.browser.301",
  );
  expect(transitions.map((transition) => transition.reason_code)).toContain(
    "STEP_UP_SATISFIED",
  );
});

test("fresh-step-up execution checks fail after expiry and native device invalidation", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.301",
    session_id: "session.browser.302",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.browser.302",
    csrf_ref: "csrf.binding.302",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  await expect(
    fixture.sessionChallengeRotationService.assertFreshStepUp({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.302",
      required_authn_level: "STEP_UP",
      as_of: "2026-04-23T08:16:00Z",
    }),
  ).rejects.toMatchObject({
    code: "SESSION_CHALLENGE_STEP_UP_NOT_FRESH",
    reason_codes: ["STEP_UP_PROOF_EXPIRED"],
  });

  await fixture.sessionLifecycleService.issueNativeSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.301",
    session_id: "session.native.302",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.native.302",
    device_binding_state: "BOUND",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });
  await fixture.sessionLifecycleService.invalidateDeviceBinding({
    tenant_id: "tenant.taxat",
    session_id: "session.native.302",
    invalidated_at: "2026-04-23T08:11:00Z",
  });

  await expect(
    fixture.sessionChallengeRotationService.assertFreshStepUp({
      tenant_id: "tenant.taxat",
      session_id: "session.native.302",
      required_authn_level: "STEP_UP",
      as_of: "2026-04-23T08:12:00Z",
    }),
  ).rejects.toMatchObject({
    code: "SESSION_CHALLENGE_STEP_UP_NOT_FRESH",
    reason_codes: ["STEP_UP_PROOF_EXPIRED"],
  });
});

test("governance preview-only posture cannot be converted into approval-gated access", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.301",
    session_id: "session.browser.303",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.browser.303",
    csrf_ref: "csrf.binding.303",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const principal_context = await fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.303",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: ["client.taxpayer.303"],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const approval_only = await fixture.authorizeService.authorize({
    principal_context,
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    evaluated_at: "2026-04-23T09:01:00Z",
    persist: false,
  });
  expect(approval_only.authorization_decision.decision).toBe("REQUIRE_APPROVAL");

  const advisory_only = await fixture.authorizeService.authorize({
    principal_context,
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    evaluated_at: "2026-04-23T09:02:00Z",
    governance_basis: {
      approval_requirement: "SECURITY_REVIEW",
      bounded_safe_mutation: 0,
      commit_authority_posture: "PREVIEW_ONLY",
      dependency_topology_hash: "hash.dependency_topology.303",
      required_approvals: ["approval.governance.security-review"],
      simulation_basis_hash: "hash.simulation_basis.303",
    },
    persist: false,
  });

  expect(advisory_only.authorization_decision.decision).toBe("DENY");
  expect(advisory_only.authorization_decision.reason_codes).toEqual(
    expect.arrayContaining(["GOVERNANCE_MUTATION_ADVISORY_ONLY"]),
  );
  expect(advisory_only.blocked_response?.required_approvals).toEqual([]);
});
