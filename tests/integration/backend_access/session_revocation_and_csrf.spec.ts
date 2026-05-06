import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  BrowserSessionGuard,
  CsrfTokenService,
  DeviceBindingService,
  RevocationPropagationService,
  SessionLifecycleService,
  SessionRevocationService,
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
    user_id: "user.operator.501",
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
    sessionLifecycleService,
    sessionRevocationService,
  };
}

test("browser revocation invalidates continuation artifacts and fails closed even with a previously valid csrf token", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.501",
    session_id: "session.browser.501",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.501",
    csrf_ref: "csrf.binding.501",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });
  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.501",
    session_id: "session.browser.502",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.502",
    csrf_ref: "csrf.binding.502",
    issued_at: "2026-04-23T08:00:30Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const token501 = await fixture.csrfTokenService.issueToken({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.501",
    issued_at: "2026-04-23T08:01:00Z",
  });
  const token502 = await fixture.csrfTokenService.issueToken({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.502",
    issued_at: "2026-04-23T08:01:30Z",
  });

  await fixture.revocationPropagationService.registerArtifact({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.501",
    artifact_kind: "COMMAND_TOKEN",
    artifact_ref: "command.501",
    issued_at: "2026-04-23T08:02:00Z",
  });
  await fixture.revocationPropagationService.registerArtifact({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.501",
    artifact_kind: "RESUME_TOKEN",
    artifact_ref: "resume.501",
    issued_at: "2026-04-23T08:02:01Z",
  });
  await fixture.revocationPropagationService.registerArtifact({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.501",
    artifact_kind: "STREAM_RESUME",
    artifact_ref: "stream.501",
    issued_at: "2026-04-23T08:02:02Z",
  });
  await fixture.revocationPropagationService.registerArtifact({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.501",
    artifact_kind: "UPLOAD_CONTROL",
    artifact_ref: "upload.501",
    issued_at: "2026-04-23T08:02:03Z",
  });

  const beforeRevocation = await fixture.browserSessionGuard.guard({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.501",
    as_of: "2026-04-23T08:03:00Z",
    http_method: "POST",
    presented_session_binding_hash: "hash.binding.browser.501",
    presented_csrf_token: token501.client_token,
  });
  expect(beforeRevocation.csrf_validation?.allowed).toBe(true);

  const revoked = await fixture.sessionRevocationService.revokeSession({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.501",
    revoked_at: "2026-04-23T08:04:00Z",
    reason_code: "ADMIN_REVOKED",
  });
  expect(revoked.invalidated_artifact_refs).toEqual([
    "command.501",
    "resume.501",
    "stream.501",
    "upload.501",
  ]);
  expect(revoked.invalidated_csrf_token_count).toBe(1);

  await expect(
    fixture.browserSessionGuard.guard({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.501",
      as_of: "2026-04-23T08:05:00Z",
      http_method: "POST",
      presented_session_binding_hash: "hash.binding.browser.501",
      presented_csrf_token: token501.client_token,
    }),
  ).rejects.toMatchObject({
    code: "BROWSER_SESSION_NOT_USABLE",
    reason_codes: ["ADMIN_REVOKED", "SESSION_COMMAND_REJECTED"],
  });

  await expect(
    fixture.revocationPropagationService.assertArtifactActive({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.501",
      artifact_ref: "resume.501",
      as_of: "2026-04-23T08:05:00Z",
    }),
  ).rejects.toMatchObject({
    code: "SESSION_BOUND_ARTIFACT_INVALIDATED",
    reason_codes: ["ADMIN_REVOKED"],
  });

  const unaffected = await fixture.browserSessionGuard.guard({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.502",
    as_of: "2026-04-23T08:05:30Z",
    http_method: "POST",
    presented_session_binding_hash: "hash.binding.browser.502",
    presented_csrf_token: token502.client_token,
  });
  expect(unaffected.csrf_validation?.allowed).toBe(true);
});

test("browser write admission fails closed without csrf proof even when the cookie-backed session is current", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.501",
    session_id: "session.browser.503",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.503",
    csrf_ref: "csrf.binding.503",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  await expect(
    fixture.browserSessionGuard.guard({
      tenant_id: "tenant.taxat",
      session_id: "session.browser.503",
      as_of: "2026-04-23T08:01:00Z",
      http_method: "POST",
      presented_session_binding_hash: "hash.binding.browser.503",
    }),
  ).rejects.toMatchObject({
    code: "BROWSER_SESSION_CSRF_REJECTED",
    reason_codes: ["BROWSER_CSRF_REQUIRED"],
  });
});

test("invalidated native device bindings surface as unusable sessions immediately", async () => {
  const fixture = await buildFixture();

  await fixture.sessionLifecycleService.issueNativeSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.501",
    session_id: "session.native.503",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.native.503",
    device_binding_state: "BOUND",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const beforeInvalidation = await fixture.deviceBindingService.evaluateSessionBinding({
    tenant_id: "tenant.taxat",
    session_id: "session.native.503",
    as_of: "2026-04-23T08:02:00Z",
    enforce_binding_proof: true,
    presented_session_binding_hash: "hash.binding.native.503",
  });
  expect(beforeInvalidation.allowed).toBe(true);

  const invalidated = await fixture.sessionRevocationService.invalidateDeviceBinding({
    tenant_id: "tenant.taxat",
    session_id: "session.native.503",
    invalidated_at: "2026-04-23T08:03:00Z",
  });
  expect(invalidated.reason_codes).toEqual(["DEVICE_BINDING_INVALIDATED"]);

  await expect(
    fixture.sessionRevocationService.assertSessionAccepted({
      tenant_id: "tenant.taxat",
      session_id: "session.native.503",
      as_of: "2026-04-23T08:04:00Z",
      presented_session_binding_hash: "hash.binding.native.503",
    }),
  ).rejects.toMatchObject({
    code: "SESSION_NOT_USABLE",
    reason_codes: ["DEVICE_BINDING_INVALIDATED", "SESSION_COMMAND_REJECTED"],
  });

  const afterInvalidation = await fixture.deviceBindingService.evaluateSessionBinding({
    tenant_id: "tenant.taxat",
    session_id: "session.native.503",
    as_of: "2026-04-23T08:04:00Z",
    enforce_binding_proof: true,
    presented_session_binding_hash: "hash.binding.native.503",
  });
  expect(afterInvalidation.allowed).toBe(false);
  expect(afterInvalidation.reason_codes).toEqual(["DEVICE_BINDING_INVALIDATED"]);
});
