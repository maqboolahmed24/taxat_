import { expect, test } from "@playwright/test";

import {
  ActorSessionModelError,
  applyLastSeenObservation,
  completeActorSessionStepUp,
  deriveActorSessionLifecycleState,
  normalizeActorSessionRecord,
} from "../../../packages/backend-access/src/models/actor_session.ts";

test("browser session creation fails without anti-CSRF binding", async () => {
  expect(() =>
    normalizeActorSessionRecord({
      artifact_type: "ActorSession",
      session_id: "session.browser.001",
      tenant_id: "tenant.taxat",
      principal_ref: "user.operator.001",
      principal_user_id_or_null: "user.operator.001",
      principal_class: "HUMAN",
      session_client_class: "BROWSER",
      authn_level: "MFA",
      step_up_state: "NOT_REQUIRED",
      session_binding_hash: "hash.binding.browser.001",
      csrf_ref: null,
      device_binding_state: "NOT_APPLICABLE",
      issued_at: "2026-04-23T08:00:00Z",
      expires_at: "2026-04-23T16:00:00Z",
      revoked_at: null,
      revocation_reason: null,
      step_up_completed_at: null,
      last_seen_at: null,
      lifecycle_state: "ISSUED",
    }),
  ).toThrowError(ActorSessionModelError);
});

test("step-up completion rotates the binding hash and preserves stepped-up posture", async () => {
  const issued = normalizeActorSessionRecord({
    artifact_type: "ActorSession",
    session_id: "session.browser.002",
    tenant_id: "tenant.taxat",
    principal_ref: "user.operator.001",
    principal_user_id_or_null: "user.operator.001",
    principal_class: "HUMAN",
    session_client_class: "BROWSER",
    authn_level: "MFA",
    step_up_state: "REQUIRED_PENDING",
    session_binding_hash: "hash.binding.before-step-up",
    csrf_ref: "csrf.binding.002",
    device_binding_state: "NOT_APPLICABLE",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
    revoked_at: null,
    revocation_reason: null,
    step_up_completed_at: null,
    last_seen_at: "2026-04-23T08:05:00Z",
    lifecycle_state: "ACTIVE",
  });

  const completed = completeActorSessionStepUp(
    issued,
    "2026-04-23T08:06:00Z",
    "hash.binding.after-step-up",
  );

  expect(completed.authn_level).toBe("STEP_UP");
  expect(completed.step_up_state).toBe("SATISFIED");
  expect(completed.lifecycle_state).toBe("STEPPED_UP");
  expect(completed.session_binding_hash).toBe("hash.binding.after-step-up");
  expect(completed.session_binding_hash).not.toBe(issued.session_binding_hash);
});

test("native invalidated device binding surfaces as revoked lifecycle", async () => {
  const invalidated = normalizeActorSessionRecord({
    artifact_type: "ActorSession",
    session_id: "session.native.001",
    tenant_id: "tenant.taxat",
    principal_ref: "user.operator.001",
    principal_user_id_or_null: "user.operator.001",
    principal_class: "HUMAN",
    session_client_class: "NATIVE",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.native.001",
    csrf_ref: null,
    device_binding_state: "INVALIDATED",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
    revoked_at: "2026-04-23T08:10:00Z",
    revocation_reason: "DEVICE_BINDING_INVALIDATED",
    step_up_completed_at: null,
    last_seen_at: "2026-04-23T08:09:00Z",
    lifecycle_state: "DEVICE_INVALIDATED",
  });

  expect(deriveActorSessionLifecycleState(invalidated, "2026-04-23T08:11:00Z")).toBe(
    "DEVICE_INVALIDATED",
  );
});

test("last_seen_at updates stay monotonic under out-of-order observations", async () => {
  const session = normalizeActorSessionRecord({
    artifact_type: "ActorSession",
    session_id: "session.browser.003",
    tenant_id: "tenant.taxat",
    principal_ref: "user.operator.001",
    principal_user_id_or_null: "user.operator.001",
    principal_class: "HUMAN",
    session_client_class: "BROWSER",
    authn_level: "MFA",
    step_up_state: "NOT_REQUIRED",
    session_binding_hash: "hash.binding.browser.003",
    csrf_ref: "csrf.binding.003",
    device_binding_state: "NOT_APPLICABLE",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
    revoked_at: null,
    revocation_reason: null,
    step_up_completed_at: null,
    last_seen_at: "2026-04-23T08:10:00Z",
    lifecycle_state: "ACTIVE",
  });

  const stale = applyLastSeenObservation(session, "2026-04-23T08:09:00Z");
  const fresh = applyLastSeenObservation(session, "2026-04-23T08:11:00Z");

  expect(stale.last_seen_at).toBe("2026-04-23T08:10:00Z");
  expect(fresh.last_seen_at).toBe("2026-04-23T08:11:00Z");
});

test("raw provider refresh token material is rejected before persistence", async () => {
  expect(() =>
    normalizeActorSessionRecord({
      artifact_type: "ActorSession",
      session_id: "session.browser.004",
      tenant_id: "tenant.taxat",
      principal_ref: "user.operator.001",
      principal_user_id_or_null: "user.operator.001",
      principal_class: "HUMAN",
      session_client_class: "BROWSER",
      authn_level: "MFA",
      step_up_state: "NOT_REQUIRED",
      session_binding_hash: "hash.binding.browser.004",
      csrf_ref: "csrf.binding.004",
      device_binding_state: "NOT_APPLICABLE",
      issued_at: "2026-04-23T08:00:00Z",
      expires_at: "2026-04-23T16:00:00Z",
      revoked_at: null,
      revocation_reason: null,
      step_up_completed_at: null,
      last_seen_at: null,
      lifecycle_state: "ISSUED",
      provider_refresh_token: "raw-secret-should-never-persist",
    } as never),
  ).toThrowError(ActorSessionModelError);
});
