import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
} from "../../../packages/backend-access/src/index.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0001_tenant_user_actor_session.sql",
);
const tenantSchemaPath = path.join(repoRoot, "schemas", "tenant.schema.json");
const userSchemaPath = path.join(repoRoot, "schemas", "user.schema.json");

test.describe.configure({ mode: "serial" });

test("migration freezes tenant, user, session, transition, and hot-path index contracts", async () => {
  const [migrationSql, tenantSchemaRaw, userSchemaRaw] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile(tenantSchemaPath, "utf8"),
    readFile(userSchemaPath, "utf8"),
  ]);
  const tenantSchema = JSON.parse(tenantSchemaRaw) as {
    title: string;
    required: string[];
  };
  const userSchema = JSON.parse(userSchemaRaw) as {
    title: string;
    required: string[];
  };

  expect(migrationSql).toContain("CREATE SCHEMA IF NOT EXISTS control_access");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.tenant_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.user_register");
  expect(migrationSql).toContain(
    "CREATE TABLE IF NOT EXISTS control_access.actor_session_register",
  );
  expect(migrationSql).toContain(
    "CREATE TABLE IF NOT EXISTS control_access.actor_session_transition_log",
  );
  expect(migrationSql).toContain(
    "CREATE UNIQUE INDEX IF NOT EXISTS tenant_session_binding_hash_guard",
  );
  expect(migrationSql).toContain("CREATE INDEX IF NOT EXISTS actor_session_expiry_sweep");
  expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(migrationSql).toContain("control_support.require_tenant_context()");

  expect(tenantSchema.title).toBe("Tenant");
  expect(tenantSchema.required).toContain("tenant_id");
  expect(tenantSchema.required).toContain("policy_profile_id");

  expect(userSchema.title).toBe("User");
  expect(userSchema.required).toContain("roles");
  expect(userSchema.required).toContain("mfa_state");
});

test("tenant isolation, concurrent sessions, step-up rotation, revoke precedence, and disable posture stay explicit", async () => {
  const tenantRepository = new TenantRepository();
  const userRepository = new UserRepository({ tenantRepository });
  const actorSessionRepository = new ActorSessionRepository({
    tenantRepository,
    userRepository,
  });
  const lifecycle = new SessionLifecycleService({
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
  await tenantRepository.create({
    artifact_type: "Tenant",
    tenant_id: "tenant.other",
    name: "Other Sandbox",
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
      timezone: "Europe/London",
    },
    mfa_state: "ENROLLED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  const browserSession = await lifecycle.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.001",
    session_id: "session.browser.100",
    authn_level: "MFA",
    step_up_state: "REQUIRED_PENDING",
    session_binding_hash: "hash.binding.browser.100",
    csrf_ref: "csrf.binding.100",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
  });
  const nativeSession = await lifecycle.issueNativeSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.001",
    session_id: "session.native.100",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.native.100",
    device_binding_state: "BOUND",
    issued_at: "2026-04-23T08:02:00Z",
    expires_at: "2026-04-24T08:02:00Z",
  });

  expect(browserSession.csrf_ref).toBe("csrf.binding.100");
  expect(nativeSession.device_binding_state).toBe("BOUND");

  const sameUserSessions = await actorSessionRepository.listByUser(
    "tenant.taxat",
    "user.operator.001",
  );
  expect(sameUserSessions.map((session) => session.session_id)).toEqual([
    "session.browser.100",
    "session.native.100",
  ]);

  const steppedUp = await lifecycle.completeStepUp({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    completed_at: "2026-04-23T08:05:00Z",
    rotated_session_binding_hash: "hash.binding.browser.100.rotated",
  });
  expect(steppedUp.lifecycle_state).toBe("STEPPED_UP");
  expect(steppedUp.session_binding_hash).toBe("hash.binding.browser.100.rotated");

  const bindingLookup = await actorSessionRepository.getByBindingHash(
    "tenant.taxat",
    "hash.binding.browser.100.rotated",
  );
  expect(bindingLookup?.session_id).toBe("session.browser.100");

  await lifecycle.recordLastSeen({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    observed_at: "2026-04-23T08:06:00Z",
  });
  await lifecycle.recordLastSeen({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    observed_at: "2026-04-23T08:05:30Z",
  });
  const afterLastSeen = await actorSessionRepository.requireBySessionId(
    "tenant.taxat",
    "session.browser.100",
  );
  expect(afterLastSeen.last_seen_at).toBe("2026-04-23T08:06:00Z");

  await lifecycle.revokeSession({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    revoked_at: "2026-04-23T08:10:00Z",
    reason_code: "ADMIN_REVOKED",
  });
  const resolvedRevoked = await lifecycle.resolveSessionPosture({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    as_of: "2026-04-23T18:00:00Z",
  });
  expect(resolvedRevoked.effective_state).toBe("REVOKED");
  expect(resolvedRevoked.revoked).toBe(true);
  expect(resolvedRevoked.reason_codes).toEqual(["ADMIN_REVOKED"]);

  await lifecycle.invalidateDeviceBinding({
    tenant_id: "tenant.taxat",
    session_id: "session.native.100",
    invalidated_at: "2026-04-23T09:00:00Z",
  });
  const resolvedInvalidated = await lifecycle.resolveSessionPosture({
    tenant_id: "tenant.taxat",
    session_id: "session.native.100",
    as_of: "2026-04-23T09:01:00Z",
  });
  expect(resolvedInvalidated.effective_state).toBe("DEVICE_INVALIDATED");
  expect(resolvedInvalidated.revocation_class).toBe("DEVICE_BINDING_INVALIDATED");
  expect(resolvedInvalidated.revoked).toBe(true);

  expect(
    await actorSessionRepository.getBySessionId("tenant.other", "session.browser.100"),
  ).toBeNull();

  await tenantRepository.disable("tenant.taxat", "2026-04-23T09:30:00Z");
  const disabledTenantResolution = await lifecycle.resolveSessionPosture({
    tenant_id: "tenant.taxat",
    session_id: "session.native.100",
    as_of: "2026-04-23T09:31:00Z",
  });
  expect(disabledTenantResolution.tenant_resolution).toBe("DISABLED");
  expect(disabledTenantResolution.revocation_class).toBe("TENANT_STATE");
  expect(disabledTenantResolution.usable).toBe(false);

  const transitions = await actorSessionRepository.listTransitions(
    "tenant.taxat",
    "session.browser.100",
  );
  expect(transitions.map((transition) => transition.reason_code)).toContain(
    "SESSION_ISSUED_BROWSER",
  );
  expect(transitions.map((transition) => transition.reason_code)).toContain("STEP_UP_SATISFIED");
  expect(transitions.map((transition) => transition.reason_code)).toContain("ADMIN_REVOKED");
});
