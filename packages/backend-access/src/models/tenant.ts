import { asTaxatId, unwrapIdentifier } from "../../../domain-kernel/src/primitives/identifier.ts";
import {
  normalizeUtcInstantString,
  type ISO8601DateTimeString,
} from "../../../domain-kernel/src/primitives/time.ts";

export type TenantLifecycleState = "ACTIVE" | "DISABLED";

export type TenantRecord = {
  artifact_type: "Tenant";
  tenant_id: string;
  name: string;
  policy_profile_id: string;
  default_retention_profile_id: string;
  lifecycle_state: TenantLifecycleState;
  disabled_at: ISO8601DateTimeString | null;
  created_at: ISO8601DateTimeString;
  updated_at: ISO8601DateTimeString;
};

export type CreateTenantInput = Omit<TenantRecord, "artifact_type" | "updated_at"> & {
  artifact_type?: "Tenant";
  updated_at?: ISO8601DateTimeString;
};

type TenantModelErrorCode =
  | "TENANT_FIELD_REQUIRED"
  | "TENANT_INVALID_CHRONOLOGY"
  | "TENANT_INVALID_DISABLE_POSTURE";

export class TenantModelError extends Error {
  readonly code: TenantModelErrorCode;

  constructor(code: TenantModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TenantModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: TenantModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new TenantModelError(code, detail);
  }
}

function requireTrimmed(label: string, value: unknown) {
  assertCondition(typeof value === "string" && value.trim().length > 0, "TENANT_FIELD_REQUIRED", `${label} must be a non-empty string`);
  return value.trim();
}

export function normalizeTenantRecord(input: CreateTenantInput): TenantRecord {
  const tenant_id = unwrapIdentifier(asTaxatId(requireTrimmed("tenant_id", input.tenant_id), "tenant"));
  const name = requireTrimmed("name", input.name);
  const policy_profile_id = requireTrimmed("policy_profile_id", input.policy_profile_id);
  const default_retention_profile_id = requireTrimmed(
    "default_retention_profile_id",
    input.default_retention_profile_id,
  );
  const created_at = normalizeUtcInstantString(input.created_at);
  const disabled_at = input.disabled_at === null ? null : normalizeUtcInstantString(input.disabled_at);
  const updated_at = normalizeUtcInstantString(input.updated_at ?? disabled_at ?? created_at);
  const lifecycle_state = input.lifecycle_state;

  assertCondition(
    lifecycle_state === "ACTIVE" || lifecycle_state === "DISABLED",
    "TENANT_FIELD_REQUIRED",
    "lifecycle_state must be ACTIVE or DISABLED",
  );
  assertCondition(updated_at >= created_at, "TENANT_INVALID_CHRONOLOGY", "updated_at cannot predate created_at");
  if (lifecycle_state === "ACTIVE") {
    assertCondition(disabled_at === null, "TENANT_INVALID_DISABLE_POSTURE", "active tenants cannot carry disabled_at");
  } else {
    assertCondition(disabled_at !== null, "TENANT_INVALID_DISABLE_POSTURE", "disabled tenants must carry disabled_at");
    assertCondition(disabled_at >= created_at, "TENANT_INVALID_CHRONOLOGY", "disabled_at cannot predate created_at");
  }

  return {
    artifact_type: input.artifact_type ?? "Tenant",
    tenant_id,
    name,
    policy_profile_id,
    default_retention_profile_id,
    lifecycle_state,
    disabled_at,
    created_at,
    updated_at,
  };
}

export function disableTenant(
  tenant: TenantRecord,
  disabledAt: ISO8601DateTimeString,
): TenantRecord {
  const normalizedDisabledAt = normalizeUtcInstantString(disabledAt);
  assertCondition(
    normalizedDisabledAt >= tenant.created_at,
    "TENANT_INVALID_CHRONOLOGY",
    "disabledAt cannot predate tenant creation",
  );
  return normalizeTenantRecord({
    ...tenant,
    lifecycle_state: "DISABLED",
    disabled_at: normalizedDisabledAt,
    updated_at: normalizedDisabledAt,
  });
}

export function isTenantActive(tenant: TenantRecord) {
  return tenant.lifecycle_state === "ACTIVE";
}
