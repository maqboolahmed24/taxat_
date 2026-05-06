import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  BrowserSessionGuard,
  CsrfTokenService,
  DeviceBindingService,
  RevocationPropagationService,
  SessionChallengeRotationService,
  SessionLifecycleService,
  SessionRevocationService,
  TenantRepository,
  UserRepository,
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
  const csrfTokenService = new CsrfTokenService({
    sessionLifecycleService,
    tokenGenerator: ({ session, issued_at }) => `csrf-token.${session.session_id}.${issued_at}`,
  });
  const deviceBindingService = new DeviceBindingService({
    sessionLifecycleService,
  });
  const revocationPropagationService = new RevocationPropagationService({
    actorSessionRepository,
    sessionLifecycleService,
  });
  const sessionRevocationService = new SessionRevocationService({
    actorSessionRepository,
    csrfTokenService,
    revocationPropagationService,
    sessionLifecycleService,
  });
  const browserSessionGuard = new BrowserSessionGuard({
    csrfTokenService,
    deviceBindingService,
    sessionRevocationService,
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
    user_id: "user.operator.401",
    tenant_id: "tenant.taxat",
    roles: ["TENANT_ADMIN"],
    attributes: {
      locale: "en-GB",
      timezone: "Europe/London",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  return {
    actorSessionRepository,
    browserSessionGuard,
    csrfTokenService,
    deviceBindingService,
    revocationPropagationService,
    sessionChallengeRotationService,
    sessionLifecycleService,
    sessionRevocationService,
  };
}

test("csrf issuance stores only hashes and old browser tokens fail after step-up rotation", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.401",
    session_id: "session.browser.401",
    authn_level: "MFA",
    step_up_state: "REQUIRED_PENDING",
    session_binding_hash: "hash.binding.browser.401",
    csrf_ref: "csrf.binding.401",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const issued = await fixture.csrfTokenService.issueToken({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.401",
    issued_at: "2026-04-23T08:01:00Z",
  });
  const stored = await fixture.csrfTokenService.listTokensForSession(
    "tenant.taxat",
    "session.browser.401",
  );

  expect(stored).toHaveLength(1);
  const [storedToken] = stored;
  expect(storedToken).toBeDefined();
  expect(storedToken!.token_fingerprint_hash).not.toBe(issued.client_token);
  expect(Object.values(storedToken!)).not.toContain(issued.client_token);

  const validBeforeRotation = await fixture.csrfTokenService.validateToken({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.401",
    as_of: "2026-04-23T08:02:00Z",
    presented_token: issued.client_token,
    presented_session_binding_hash: "hash.binding.browser.401",
  });
  expect(validBeforeRotation.allowed).toBe(true);

  await fixture.sessionChallengeRotationService.completeStepUp({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.401",
    completed_at: "2026-04-23T08:03:00Z",
    rotated_session_binding_hash: "hash.binding.browser.401.rotated",
  });

  const staleAfterRotation = await fixture.csrfTokenService.validateToken({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.401",
    as_of: "2026-04-23T08:04:00Z",
    presented_token: issued.client_token,
    presented_session_binding_hash: "hash.binding.browser.401.rotated",
  });
  expect(staleAfterRotation.allowed).toBe(false);
  expect(staleAfterRotation.state).toBe("SESSION_BINDING_STALE");
  expect(staleAfterRotation.reason_codes).toEqual(["BROWSER_CSRF_BINDING_STALE"]);
});

test("browser writes fail closed without csrf proof even when the session is otherwise current", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.401",
    session_id: "session.browser.402",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.402",
    csrf_ref: "csrf.binding.402",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  await expect(
    fixture.browserSessionGuard.guard({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.402",
      as_of: "2026-04-23T08:02:00Z",
      http_method: "POST",
      presented_session_binding_hash: "hash.binding.browser.402",
    }),
  ).rejects.toMatchObject({
    code: "BROWSER_SESSION_CSRF_REJECTED",
    reason_codes: ["BROWSER_CSRF_REQUIRED"],
  });
});

test("native heuristic drift becomes a typed challenge instead of silent trust widening", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueNativeSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.401",
    session_id: "session.native.401",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.native.401",
    device_binding_state: "BOUND",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const first = await fixture.deviceBindingService.evaluateSessionBinding({
    tenant_id: "tenant.taxat",
    session_id: "session.native.401",
    as_of: "2026-04-23T08:01:00Z",
    presented_session_binding_hash: "hash.binding.native.401",
    enforce_binding_proof: true,
    heuristic_signals: {
      network_fingerprint: "network.eu-west",
      user_agent_family: "native/1.0",
      timezone: "Europe/London",
      client_instance_ref: "device.taxat.401",
    },
  });
  expect(first.allowed).toBe(true);
  expect(first.disposition).toBe("ALLOW");

  const drifted = await fixture.deviceBindingService.evaluateSessionBinding({
    tenant_id: "tenant.taxat",
    session_id: "session.native.401",
    as_of: "2026-04-23T08:10:00Z",
    presented_session_binding_hash: "hash.binding.native.401",
    enforce_binding_proof: true,
    heuristic_signals: {
      network_fingerprint: "network.us-east",
      user_agent_family: "native/2.0",
      timezone: "Europe/London",
      client_instance_ref: "device.taxat.401",
    },
  });
  expect(drifted.allowed).toBe(false);
  expect(drifted.disposition).toBe("CHALLENGE_REQUIRED");
  expect(drifted.heuristic_drift_fields).toEqual([
    "network_fingerprint",
    "user_agent_family",
  ]);
  expect(drifted.reason_codes).toEqual(["DEVICE_ENVIRONMENT_CHANGE_CHALLENGE"]);
});

test("session revocation is idempotent, invalidates only the targeted session, and last_seen does not resurrect it", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.401",
    session_id: "session.browser.403",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.403",
    csrf_ref: "csrf.binding.403",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });
  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.401",
    session_id: "session.browser.404",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.404",
    csrf_ref: "csrf.binding.404",
    issued_at: "2026-04-23T08:01:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  await fixture.csrfTokenService.issueToken({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.403",
    issued_at: "2026-04-23T08:02:00Z",
  });
  const otherToken = await fixture.csrfTokenService.issueToken({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.404",
    issued_at: "2026-04-23T08:02:30Z",
  });
  await fixture.revocationPropagationService.registerArtifact({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.403",
    artifact_kind: "RESUME_TOKEN",
    artifact_ref: "resume.browser.403",
    issued_at: "2026-04-23T08:02:00Z",
  });

  const firstRevocation = await fixture.sessionRevocationService.revokeSession({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.403",
    revoked_at: "2026-04-23T08:05:00Z",
    reason_code: "ADMIN_REVOKED",
  });
  expect(firstRevocation.already_revoked).toBe(false);
  expect(firstRevocation.invalidated_artifact_refs).toEqual(["resume.browser.403"]);
  expect(firstRevocation.invalidated_csrf_token_count).toBe(1);

  const secondRevocation = await fixture.sessionRevocationService.revokeSession({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.403",
    revoked_at: "2026-04-23T08:06:00Z",
    reason_code: "ADMIN_REVOKED",
  });
  expect(secondRevocation.already_revoked).toBe(true);
  expect(secondRevocation.invalidated_artifact_refs).toEqual([]);
  expect(secondRevocation.invalidated_csrf_token_count).toBe(0);

  await fixture.sessionLifecycleService.recordLastSeen({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.403",
    observed_at: "2026-04-23T08:07:00Z",
  });
  const revokedSession = await fixture.actorSessionRepository.requireBySessionId(
    "tenant.taxat",
    "session.browser.403",
  );
  expect(revokedSession.revoked_at).toBe("2026-04-23T08:05:00Z");
  expect(revokedSession.last_seen_at).toBeNull();

  const otherGuard = await fixture.browserSessionGuard.guard({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.404",
    as_of: "2026-04-23T08:08:00Z",
    http_method: "POST",
    presented_session_binding_hash: "hash.binding.browser.404",
    presented_csrf_token: otherToken.client_token,
  });
  expect(otherGuard.state_changing_request).toBe(true);
  expect(otherGuard.csrf_validation?.allowed).toBe(true);
});
