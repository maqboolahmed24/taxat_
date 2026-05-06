import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { asTaxatId, unwrapIdentifier } from "../../../domain-kernel/src/primitives/identifier.ts";
import {
  normalizeUtcInstantString,
  type ISO8601DateTimeString,
} from "../../../domain-kernel/src/primitives/time.ts";

export type UserLifecycleState = "ACTIVE" | "DISABLED";
export type UserMfaState =
  | "NOT_ENROLLED"
  | "ENROLLED"
  | "REQUIRED"
  | "SATISFIED"
  | "LOCKED";

export type UserAttributePrimitive = string | number | boolean | null;
export type UserAttributeValue = UserAttributePrimitive | UserAttributePrimitive[];
export type UserAttributes = Record<string, UserAttributeValue>;

export type UserRecord = {
  artifact_type: "User";
  user_id: string;
  tenant_id: string;
  roles: string[];
  attributes: UserAttributes;
  mfa_state: UserMfaState;
  lifecycle_state: UserLifecycleState;
  disabled_at: ISO8601DateTimeString | null;
  created_at: ISO8601DateTimeString;
  updated_at: ISO8601DateTimeString;
};

export type CreateUserInput = Omit<UserRecord, "artifact_type" | "updated_at"> & {
  artifact_type?: "User";
  updated_at?: ISO8601DateTimeString;
};

type UserModelErrorCode =
  | "USER_ATTRIBUTE_INVALID"
  | "USER_FIELD_REQUIRED"
  | "USER_INVALID_CHRONOLOGY"
  | "USER_INVALID_DISABLE_POSTURE";

export class UserModelError extends Error {
  readonly code: UserModelErrorCode;

  constructor(code: UserModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "UserModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: UserModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new UserModelError(code, detail);
  }
}

function requireTrimmed(label: string, value: unknown) {
  assertCondition(typeof value === "string" && value.trim().length > 0, "USER_FIELD_REQUIRED", `${label} must be a non-empty string`);
  return value.trim();
}

function canonicalizeAttributeValue(label: string, value: unknown): UserAttributeValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  assertCondition(Array.isArray(value), "USER_ATTRIBUTE_INVALID", `${label} must be a primitive or array of primitives`);
  return value.map((entry, index) => {
    assertCondition(
      entry === null ||
        typeof entry === "string" ||
        typeof entry === "number" ||
        typeof entry === "boolean",
      "USER_ATTRIBUTE_INVALID",
      `${label}[${index}] must be a primitive`,
    );
    return entry;
  });
}

export function canonicalizeUserAttributes(input: UserAttributes): UserAttributes {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [requireTrimmed(`attributes.${key}`, key), canonicalizeAttributeValue(key, value)] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function normalizeUserRecord(input: CreateUserInput): UserRecord {
  const user_id = unwrapIdentifier(asTaxatId(requireTrimmed("user_id", input.user_id), "user"));
  const tenant_id = unwrapIdentifier(asTaxatId(requireTrimmed("tenant_id", input.tenant_id), "tenant"));
  const roles = sortSetLikeStrings(
    (input.roles ?? []).map((role) => requireTrimmed("roles", role)),
  );
  const created_at = normalizeUtcInstantString(input.created_at);
  const disabled_at = input.disabled_at === null ? null : normalizeUtcInstantString(input.disabled_at);
  const updated_at = normalizeUtcInstantString(input.updated_at ?? disabled_at ?? created_at);
  const mfa_state = input.mfa_state;
  const lifecycle_state = input.lifecycle_state;

  assertCondition(
    ["NOT_ENROLLED", "ENROLLED", "REQUIRED", "SATISFIED", "LOCKED"].includes(mfa_state),
    "USER_FIELD_REQUIRED",
    "mfa_state must be a supported user MFA posture",
  );
  assertCondition(
    lifecycle_state === "ACTIVE" || lifecycle_state === "DISABLED",
    "USER_FIELD_REQUIRED",
    "lifecycle_state must be ACTIVE or DISABLED",
  );
  assertCondition(updated_at >= created_at, "USER_INVALID_CHRONOLOGY", "updated_at cannot predate created_at");
  if (lifecycle_state === "ACTIVE") {
    assertCondition(disabled_at === null, "USER_INVALID_DISABLE_POSTURE", "active users cannot carry disabled_at");
  } else {
    assertCondition(disabled_at !== null, "USER_INVALID_DISABLE_POSTURE", "disabled users must carry disabled_at");
    assertCondition(disabled_at >= created_at, "USER_INVALID_CHRONOLOGY", "disabled_at cannot predate created_at");
  }

  return {
    artifact_type: input.artifact_type ?? "User",
    user_id,
    tenant_id,
    roles,
    attributes: canonicalizeUserAttributes(input.attributes ?? {}),
    mfa_state,
    lifecycle_state,
    disabled_at,
    created_at,
    updated_at,
  };
}

export function disableUser(user: UserRecord, disabledAt: ISO8601DateTimeString): UserRecord {
  const normalizedDisabledAt = normalizeUtcInstantString(disabledAt);
  assertCondition(
    normalizedDisabledAt >= user.created_at,
    "USER_INVALID_CHRONOLOGY",
    "disabledAt cannot predate user creation",
  );
  return normalizeUserRecord({
    ...user,
    lifecycle_state: "DISABLED",
    disabled_at: normalizedDisabledAt,
    updated_at: normalizedDisabledAt,
  });
}

export function isUserActive(user: UserRecord) {
  return user.lifecycle_state === "ACTIVE";
}
