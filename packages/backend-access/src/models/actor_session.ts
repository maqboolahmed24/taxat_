import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  asTaxatHash,
  asTaxatId,
  asTaxatRef,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";
import {
  normalizeUtcInstantString,
  type ISO8601DateTimeString,
} from "../../../domain-kernel/src/primitives/time.ts";

export type GovernedActorSession = {
  artifact_type: "ActorSession";
  session_id: string;
  tenant_id: string;
  principal_ref: string;
  principal_class: "HUMAN" | "SERVICE" | "EXTERNAL";
  session_client_class: "BROWSER" | "NATIVE" | "AUTOMATION";
  authn_level: "BASIC" | "MFA" | "STEP_UP";
  step_up_state: "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED" | "EXPIRED";
  session_binding_hash: string;
  csrf_ref: string | null;
  device_binding_state: "NOT_APPLICABLE" | "BOUND" | "UNVERIFIED" | "INVALIDATED";
  issued_at: ISO8601DateTimeString;
  expires_at: ISO8601DateTimeString;
  revoked_at: ISO8601DateTimeString | null;
  revocation_reason: string | null;
  step_up_completed_at: ISO8601DateTimeString | null;
  last_seen_at: ISO8601DateTimeString | null;
};

export type ActorSessionLifecycleState =
  | "ISSUED"
  | "ACTIVE"
  | "STEPPED_UP"
  | "EXPIRED"
  | "REVOKED"
  | "DEVICE_INVALIDATED";

export type SessionRevocationClass =
  | "USER_INITIATED"
  | "ADMINISTRATIVE"
  | "COMPROMISE_RESPONSE"
  | "DEVICE_BINDING_INVALIDATED"
  | "TENANT_STATE"
  | "SESSION_EXPIRY";

export type ActorSessionRecord = GovernedActorSession & {
  anti_csrf_binding_required: boolean;
  created_at: ISO8601DateTimeString;
  lifecycle_state: ActorSessionLifecycleState;
  principal_user_id_or_null: string | null;
  session_row_version: number;
  updated_at: ISO8601DateTimeString;
};

export type CreateActorSessionInput = Omit<
  ActorSessionRecord,
  "anti_csrf_binding_required" | "created_at" | "session_row_version" | "updated_at"
> & {
  created_at?: ISO8601DateTimeString;
  session_row_version?: number;
  updated_at?: ISO8601DateTimeString;
};

type ActorSessionModelErrorCode =
  | "ACTOR_SESSION_BINDING_INVALID"
  | "ACTOR_SESSION_CREDENTIAL_MATERIAL_FORBIDDEN"
  | "ACTOR_SESSION_FIELD_REQUIRED"
  | "ACTOR_SESSION_INVALID_PRINCIPAL_BINDING"
  | "ACTOR_SESSION_INVALID_STATE"
  | "ACTOR_SESSION_INVALID_TIME_ORDER"
  | "ACTOR_SESSION_STEP_UP_INVALID";

export class ActorSessionModelError extends Error {
  readonly code: ActorSessionModelErrorCode;

  constructor(code: ActorSessionModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ActorSessionModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: ActorSessionModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ActorSessionModelError(code, detail);
  }
}

function requireTrimmed(label: string, value: unknown) {
  assertCondition(
    typeof value === "string" && value.trim().length > 0,
    "ACTOR_SESSION_FIELD_REQUIRED",
    `${label} must be a non-empty string`,
  );
  return value.trim();
}

const forbiddenCredentialKeyPatterns = [
  /raw[_-]?(refresh|access|id)?[_-]?token/i,
  /provider[_-]?refresh[_-]?token/i,
  /authority[_-]?(credential|access[_-]?token)/i,
  /opaque[_-]?refresh[_-]?secret/i,
  /id[_-]?token/i,
] as const;

export function assertNoCredentialMaterial(input: unknown, path = "session") {
  if (!input || typeof input !== "object") {
    return;
  }
  if (Array.isArray(input)) {
    input.forEach((entry, index) => assertNoCredentialMaterial(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    assertCondition(
      !forbiddenCredentialKeyPatterns.some((pattern) => pattern.test(key)),
      "ACTOR_SESSION_CREDENTIAL_MATERIAL_FORBIDDEN",
      `${path}.${key} looks like raw credential material and cannot be persisted inside ActorSession`,
    );
    assertNoCredentialMaterial(value, `${path}.${key}`);
  }
}

function maxInstant(values: Array<ISO8601DateTimeString | null | undefined>) {
  return values
    .filter((value): value is ISO8601DateTimeString => value !== null && value !== undefined)
    .sort()
    .at(-1);
}

function validateClientBinding(
  session_client_class: GovernedActorSession["session_client_class"],
  principal_class: GovernedActorSession["principal_class"],
  csrf_ref: string | null,
  device_binding_state: GovernedActorSession["device_binding_state"],
) {
  if (session_client_class === "BROWSER") {
    assertCondition(
      principal_class === "HUMAN",
      "ACTOR_SESSION_INVALID_PRINCIPAL_BINDING",
      "browser sessions must remain human scoped",
    );
    assertCondition(
      csrf_ref !== null,
      "ACTOR_SESSION_BINDING_INVALID",
      "browser sessions require anti-CSRF binding",
    );
    assertCondition(
      device_binding_state === "NOT_APPLICABLE",
      "ACTOR_SESSION_BINDING_INVALID",
      "browser sessions may not carry device binding state",
    );
    return true;
  }

  if (session_client_class === "NATIVE") {
    assertCondition(
      principal_class === "HUMAN",
      "ACTOR_SESSION_INVALID_PRINCIPAL_BINDING",
      "native interactive sessions must remain human scoped",
    );
    assertCondition(
      csrf_ref === null,
      "ACTOR_SESSION_BINDING_INVALID",
      "native sessions may not persist csrf_ref",
    );
    assertCondition(
      ["BOUND", "UNVERIFIED", "INVALIDATED"].includes(device_binding_state),
      "ACTOR_SESSION_BINDING_INVALID",
      "native sessions must keep durable device binding posture",
    );
    return true;
  }

  assertCondition(
    csrf_ref === null,
    "ACTOR_SESSION_BINDING_INVALID",
    "automation sessions may not persist csrf_ref",
  );
  assertCondition(
    device_binding_state === "NOT_APPLICABLE",
    "ACTOR_SESSION_BINDING_INVALID",
    "automation sessions may not persist device binding state",
  );
  return true;
}

export function normalizeActorSessionRecord(input: CreateActorSessionInput): ActorSessionRecord {
  assertNoCredentialMaterial(input);

  const session_id = unwrapIdentifier(asTaxatId(requireTrimmed("session_id", input.session_id), "actor_session"));
  const tenant_id = unwrapIdentifier(asTaxatId(requireTrimmed("tenant_id", input.tenant_id), "tenant"));
  const principal_ref = unwrapIdentifier(
    asTaxatRef(requireTrimmed("principal_ref", input.principal_ref), "principal"),
  );
  const principal_user_id_or_null =
    input.principal_user_id_or_null === null
      ? null
      : unwrapIdentifier(
          asTaxatId(requireTrimmed("principal_user_id_or_null", input.principal_user_id_or_null), "user"),
        );
  const session_binding_hash = unwrapIdentifier(
    asTaxatHash(requireTrimmed("session_binding_hash", input.session_binding_hash), "session_binding"),
  );
  const csrf_ref =
    input.csrf_ref === null ? null : unwrapIdentifier(asTaxatRef(requireTrimmed("csrf_ref", input.csrf_ref), "csrf"));
  const issued_at = normalizeUtcInstantString(input.issued_at);
  const expires_at = normalizeUtcInstantString(input.expires_at);
  const revoked_at = input.revoked_at === null ? null : normalizeUtcInstantString(input.revoked_at);
  const step_up_completed_at =
    input.step_up_completed_at === null ? null : normalizeUtcInstantString(input.step_up_completed_at);
  const last_seen_at = input.last_seen_at === null ? null : normalizeUtcInstantString(input.last_seen_at);
  const created_at = normalizeUtcInstantString(input.created_at ?? issued_at);
  const updated_at =
    normalizeUtcInstantString(
      input.updated_at ?? maxInstant([last_seen_at, step_up_completed_at, revoked_at, issued_at, created_at]) ?? created_at,
    );
  const session_row_version = input.session_row_version ?? 1;

  assertCondition(
    Number.isInteger(session_row_version) && session_row_version > 0,
    "ACTOR_SESSION_INVALID_STATE",
    "session_row_version must be a positive integer",
  );
  assertCondition(
    ["HUMAN", "SERVICE", "EXTERNAL"].includes(input.principal_class),
    "ACTOR_SESSION_FIELD_REQUIRED",
    "principal_class must be HUMAN, SERVICE, or EXTERNAL",
  );
  assertCondition(
    ["BROWSER", "NATIVE", "AUTOMATION"].includes(input.session_client_class),
    "ACTOR_SESSION_FIELD_REQUIRED",
    "session_client_class must be BROWSER, NATIVE, or AUTOMATION",
  );
  assertCondition(
    ["BASIC", "MFA", "STEP_UP"].includes(input.authn_level),
    "ACTOR_SESSION_FIELD_REQUIRED",
    "authn_level must be BASIC, MFA, or STEP_UP",
  );
  assertCondition(
    ["NOT_REQUIRED", "REQUIRED_PENDING", "SATISFIED", "EXPIRED"].includes(input.step_up_state),
    "ACTOR_SESSION_FIELD_REQUIRED",
    "step_up_state must be a supported session step-up state",
  );
  assertCondition(
    ["NOT_APPLICABLE", "BOUND", "UNVERIFIED", "INVALIDATED"].includes(input.device_binding_state),
    "ACTOR_SESSION_FIELD_REQUIRED",
    "device_binding_state must be a supported device binding state",
  );
  assertCondition(
    ["ISSUED", "ACTIVE", "STEPPED_UP", "EXPIRED", "REVOKED", "DEVICE_INVALIDATED"].includes(
      input.lifecycle_state,
    ),
    "ACTOR_SESSION_FIELD_REQUIRED",
    "lifecycle_state must be a supported session lifecycle",
  );
  validateClientBinding(
    input.session_client_class,
    input.principal_class,
    csrf_ref,
    input.device_binding_state,
  );
  if (input.principal_class === "HUMAN") {
    assertCondition(
      principal_user_id_or_null !== null && principal_user_id_or_null === principal_ref,
      "ACTOR_SESSION_INVALID_PRINCIPAL_BINDING",
      "human sessions must bind principal_ref to the durable user id",
    );
  } else {
    assertCondition(
      principal_user_id_or_null === null,
      "ACTOR_SESSION_INVALID_PRINCIPAL_BINDING",
      "service and external sessions must not carry principal_user_id_or_null",
    );
  }
  assertCondition(expires_at > issued_at, "ACTOR_SESSION_INVALID_TIME_ORDER", "expires_at must be later than issued_at");
  assertCondition(created_at <= issued_at, "ACTOR_SESSION_INVALID_TIME_ORDER", "created_at cannot postdate issued_at");
  assertCondition(updated_at >= created_at, "ACTOR_SESSION_INVALID_TIME_ORDER", "updated_at cannot predate created_at");
  if (last_seen_at !== null) {
    assertCondition(
      last_seen_at >= issued_at,
      "ACTOR_SESSION_INVALID_TIME_ORDER",
      "last_seen_at cannot predate session issue",
    );
    assertCondition(
      last_seen_at <= expires_at,
      "ACTOR_SESSION_INVALID_TIME_ORDER",
      "last_seen_at cannot postdate expires_at",
    );
  }
  if (revoked_at !== null) {
    assertCondition(
      input.revocation_reason !== null && input.revocation_reason.trim().length > 0,
      "ACTOR_SESSION_INVALID_STATE",
      "revoked sessions require a non-empty revocation_reason",
    );
    assertCondition(
      revoked_at >= issued_at,
      "ACTOR_SESSION_INVALID_TIME_ORDER",
      "revoked_at cannot predate session issue",
    );
    if (last_seen_at !== null) {
      assertCondition(
        last_seen_at <= revoked_at,
        "ACTOR_SESSION_INVALID_TIME_ORDER",
        "last_seen_at cannot postdate revoked_at",
      );
    }
    if (step_up_completed_at !== null) {
      assertCondition(
        step_up_completed_at <= revoked_at,
        "ACTOR_SESSION_INVALID_TIME_ORDER",
        "step_up_completed_at cannot postdate revoked_at",
      );
    }
  } else {
    assertCondition(
      input.revocation_reason === null,
      "ACTOR_SESSION_INVALID_STATE",
      "non-revoked sessions may not persist revocation_reason",
    );
  }
  if (step_up_completed_at !== null) {
    assertCondition(
      step_up_completed_at >= issued_at,
      "ACTOR_SESSION_INVALID_TIME_ORDER",
      "step_up_completed_at cannot predate session issue",
    );
    assertCondition(
      step_up_completed_at <= expires_at,
      "ACTOR_SESSION_INVALID_TIME_ORDER",
      "step_up_completed_at cannot postdate session expiry",
    );
    assertCondition(
      input.step_up_state === "SATISFIED" && input.authn_level === "STEP_UP",
      "ACTOR_SESSION_STEP_UP_INVALID",
      "completed step-up requires SATISFIED state and STEP_UP authn level",
    );
  } else {
    assertCondition(
      input.step_up_state !== "SATISFIED",
      "ACTOR_SESSION_STEP_UP_INVALID",
      "SATISFIED step-up state requires step_up_completed_at",
    );
  }

  if (input.lifecycle_state === "DEVICE_INVALIDATED") {
    assertCondition(
      input.device_binding_state === "INVALIDATED" && revoked_at !== null,
      "ACTOR_SESSION_INVALID_STATE",
      "device-invalidated lifecycle requires invalidated binding and revocation timestamps",
    );
  }
  if (input.lifecycle_state === "REVOKED") {
    assertCondition(revoked_at !== null, "ACTOR_SESSION_INVALID_STATE", "revoked lifecycle requires revoked_at");
    assertCondition(
      input.device_binding_state !== "INVALIDATED",
      "ACTOR_SESSION_INVALID_STATE",
      "device-invalidated sessions must use DEVICE_INVALIDATED lifecycle_state",
    );
  }
  if (input.lifecycle_state === "STEPPED_UP") {
    assertCondition(
      input.step_up_state === "SATISFIED" && step_up_completed_at !== null,
      "ACTOR_SESSION_STEP_UP_INVALID",
      "stepped-up lifecycle requires step-up satisfaction",
    );
  }

  return {
    artifact_type: "ActorSession",
    session_id,
    tenant_id,
    principal_ref,
    principal_class: input.principal_class,
    session_client_class: input.session_client_class,
    authn_level: input.authn_level,
    step_up_state: input.step_up_state,
    session_binding_hash,
    csrf_ref,
    device_binding_state: input.device_binding_state,
    issued_at,
    expires_at,
    revoked_at,
    revocation_reason: input.revocation_reason === null ? null : input.revocation_reason.trim(),
    step_up_completed_at,
    last_seen_at,
    principal_user_id_or_null,
    lifecycle_state: input.lifecycle_state,
    anti_csrf_binding_required: input.session_client_class === "BROWSER",
    created_at,
    updated_at,
    session_row_version,
  };
}

export function deriveActorSessionLifecycleState(
  session: ActorSessionRecord,
  asOf: ISO8601DateTimeString,
): ActorSessionLifecycleState {
  const normalizedAsOf = normalizeUtcInstantString(asOf);
  if (session.device_binding_state === "INVALIDATED" || session.lifecycle_state === "DEVICE_INVALIDATED") {
    return "DEVICE_INVALIDATED";
  }
  if (session.revoked_at !== null || session.lifecycle_state === "REVOKED") {
    return "REVOKED";
  }
  if (normalizedAsOf >= session.expires_at || session.lifecycle_state === "EXPIRED") {
    return "EXPIRED";
  }
  if (session.step_up_state === "SATISFIED") {
    return "STEPPED_UP";
  }
  if (session.last_seen_at !== null) {
    return "ACTIVE";
  }
  return "ISSUED";
}

export function actorSessionFingerprint(session: ActorSessionRecord) {
  return stableJsonHash({
    tenant_id: session.tenant_id,
    session_id: session.session_id,
    session_binding_hash: session.session_binding_hash,
    lifecycle_state: session.lifecycle_state,
    authn_level: session.authn_level,
    step_up_state: session.step_up_state,
    revoked_at: session.revoked_at,
    last_seen_at: session.last_seen_at,
  });
}

export function createActorSessionInputFromRecord(
  session: ActorSessionRecord,
): CreateActorSessionInput {
  return {
    artifact_type: session.artifact_type,
    session_id: session.session_id,
    tenant_id: session.tenant_id,
    principal_ref: session.principal_ref,
    principal_user_id_or_null: session.principal_user_id_or_null,
    principal_class: session.principal_class,
    session_client_class: session.session_client_class,
    authn_level: session.authn_level,
    step_up_state: session.step_up_state,
    session_binding_hash: session.session_binding_hash,
    csrf_ref: session.csrf_ref,
    device_binding_state: session.device_binding_state,
    issued_at: session.issued_at,
    expires_at: session.expires_at,
    revoked_at: session.revoked_at,
    revocation_reason: session.revocation_reason,
    step_up_completed_at: session.step_up_completed_at,
    last_seen_at: session.last_seen_at,
    lifecycle_state: session.lifecycle_state,
    created_at: session.created_at,
    updated_at: session.updated_at,
    session_row_version: session.session_row_version,
  };
}

export function applyLastSeenObservation(
  session: ActorSessionRecord,
  observedAt: ISO8601DateTimeString,
): ActorSessionRecord {
  const normalizedObservedAt = normalizeUtcInstantString(observedAt);
  if (session.last_seen_at !== null && normalizedObservedAt <= session.last_seen_at) {
    return session;
  }
  if (
    session.revoked_at !== null ||
    normalizedObservedAt > session.expires_at ||
    session.lifecycle_state === "EXPIRED" ||
    session.lifecycle_state === "REVOKED" ||
    session.lifecycle_state === "DEVICE_INVALIDATED"
  ) {
    return session;
  }
  return normalizeActorSessionRecord({
    ...session,
    last_seen_at: normalizedObservedAt,
    lifecycle_state: session.step_up_state === "SATISFIED" ? "STEPPED_UP" : "ACTIVE",
    session_row_version: session.session_row_version + 1,
    updated_at: normalizedObservedAt,
  });
}

export function completeActorSessionStepUp(
  session: ActorSessionRecord,
  completedAt: ISO8601DateTimeString,
  rotatedSessionBindingHash: string,
): ActorSessionRecord {
  const normalizedCompletedAt = normalizeUtcInstantString(completedAt);
  const normalizedRotatedBindingHash = unwrapIdentifier(
    asTaxatHash(requireTrimmed("rotatedSessionBindingHash", rotatedSessionBindingHash), "session_binding"),
  );

  if (
    session.lifecycle_state === "REVOKED" ||
    session.lifecycle_state === "DEVICE_INVALIDATED" ||
    session.lifecycle_state === "EXPIRED" ||
    session.revoked_at !== null ||
    normalizedCompletedAt > session.expires_at
  ) {
    throw new ActorSessionModelError(
      "ACTOR_SESSION_STEP_UP_INVALID",
      "step-up completion is invalid for expired or revoked sessions",
    );
  }
  if (session.step_up_state === "SATISFIED") {
    assertCondition(
      session.step_up_completed_at === normalizedCompletedAt &&
        session.session_binding_hash === normalizedRotatedBindingHash,
      "ACTOR_SESSION_STEP_UP_INVALID",
      "already-satisfied step-up may only be replayed idempotently with the same completion inputs",
    );
    return session;
  }
  assertCondition(
    session.step_up_state === "REQUIRED_PENDING",
    "ACTOR_SESSION_STEP_UP_INVALID",
    "step-up completion requires REQUIRED_PENDING posture",
  );
  assertCondition(
    normalizedRotatedBindingHash !== session.session_binding_hash,
    "ACTOR_SESSION_STEP_UP_INVALID",
    "step-up completion requires a rotated session_binding_hash",
  );
  return normalizeActorSessionRecord({
    ...session,
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    step_up_completed_at: normalizedCompletedAt,
    session_binding_hash: normalizedRotatedBindingHash,
    lifecycle_state: "STEPPED_UP",
    session_row_version: session.session_row_version + 1,
    updated_at: normalizedCompletedAt,
  });
}

export function revokeActorSession(
  session: ActorSessionRecord,
  input: {
    revokedAt: ISO8601DateTimeString;
    revocationReason: string;
    deviceBindingInvalidated?: boolean;
  },
): ActorSessionRecord {
  const normalizedRevokedAt = normalizeUtcInstantString(input.revokedAt);
  const revocationReason = requireTrimmed("revocationReason", input.revocationReason);
  if (session.revoked_at !== null) {
    return session;
  }
  if (normalizedRevokedAt > session.expires_at) {
    return normalizeActorSessionRecord({
      ...session,
      revoked_at: normalizedRevokedAt,
      revocation_reason: revocationReason,
      lifecycle_state: input.deviceBindingInvalidated ? "DEVICE_INVALIDATED" : "REVOKED",
      device_binding_state: input.deviceBindingInvalidated ? "INVALIDATED" : session.device_binding_state,
      session_row_version: session.session_row_version + 1,
      updated_at: normalizedRevokedAt,
    });
  }
  assertCondition(
    normalizedRevokedAt >= session.issued_at,
    "ACTOR_SESSION_INVALID_TIME_ORDER",
    "revokedAt cannot predate session issue",
  );
  if (session.last_seen_at !== null) {
    assertCondition(
      normalizedRevokedAt >= session.last_seen_at,
      "ACTOR_SESSION_INVALID_TIME_ORDER",
      "revokedAt cannot predate the most recent last_seen_at",
    );
  }
  if (session.step_up_completed_at !== null) {
    assertCondition(
      normalizedRevokedAt >= session.step_up_completed_at,
      "ACTOR_SESSION_INVALID_TIME_ORDER",
      "revokedAt cannot predate step-up completion",
    );
  }
  return normalizeActorSessionRecord({
    ...session,
    revoked_at: normalizedRevokedAt,
    revocation_reason: revocationReason,
    lifecycle_state: input.deviceBindingInvalidated ? "DEVICE_INVALIDATED" : "REVOKED",
    device_binding_state: input.deviceBindingInvalidated ? "INVALIDATED" : session.device_binding_state,
    session_row_version: session.session_row_version + 1,
    updated_at: normalizedRevokedAt,
  });
}

export function expireActorSession(
  session: ActorSessionRecord,
  evaluatedAt: ISO8601DateTimeString,
): ActorSessionRecord {
  const normalizedEvaluatedAt = normalizeUtcInstantString(evaluatedAt);
  if (session.revoked_at !== null || session.lifecycle_state === "DEVICE_INVALIDATED") {
    return session;
  }
  assertCondition(
    normalizedEvaluatedAt >= session.expires_at,
    "ACTOR_SESSION_INVALID_STATE",
    "session cannot transition to EXPIRED before expires_at",
  );
  if (session.lifecycle_state === "EXPIRED") {
    return session;
  }
  return normalizeActorSessionRecord({
    ...session,
    lifecycle_state: "EXPIRED",
    session_row_version: session.session_row_version + 1,
    updated_at: maxInstant([session.updated_at, normalizedEvaluatedAt]) ?? normalizedEvaluatedAt,
  });
}
