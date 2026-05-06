import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export const VERIFICATION_SUITE_FAMILIES = [
  "SCHEMA_COMPATIBILITY",
  "DETERMINISTIC_AND_STATE_MACHINE",
  "NORTHBOUND_API",
  "AUTHORITY_SANDBOX",
  "OPERATOR_CLIENT",
  "SECURITY",
  "PERFORMANCE_AND_CANARY",
  "RESTORE_DRILL",
  "MIGRATION_VERIFICATION",
  "SUPPLY_CHAIN",
  "SUITE_ADMISSIBILITY",
] as const;

export type VerificationSuiteFamily = (typeof VERIFICATION_SUITE_FAMILIES)[number];

export const GATE_ADMISSIBILITY_QUARANTINE_STATES = [
  "NONE",
  "FLAKE_QUARANTINED",
  "MUTED",
  "MANUAL_WAIVER",
] as const;

export type GateAdmissibilityQuarantineState =
  (typeof GATE_ADMISSIBILITY_QUARANTINE_STATES)[number];

export const GATE_ADMISSIBILITY_BOOLEAN_FIELDS = [
  "candidate_identity_match",
  "freshness_verified",
  "contract_window_consistent",
  "rerun_scope_preserved",
] as const;

export type GateAdmissibilityBooleanField =
  (typeof GATE_ADMISSIBILITY_BOOLEAN_FIELDS)[number];

export type VerificationSuiteScopeErrorCode =
  | "VERIFICATION_SUITE_SCOPE_FIELD_INVALID"
  | "VERIFICATION_SUITE_SCOPE_POLICY_INVALID";

export class VerificationSuiteScopeError extends Error {
  readonly code: VerificationSuiteScopeErrorCode;

  constructor(code: VerificationSuiteScopeErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "VerificationSuiteScopeError";
    this.code = code;
  }
}

function assertScope(
  condition: unknown,
  code: VerificationSuiteScopeErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new VerificationSuiteScopeError(code, detail);
  }
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireVerificationSuiteString(label: string, value: unknown) {
  assertScope(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "VERIFICATION_SUITE_SCOPE_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

export function requireVerificationSuiteNullableString(
  label: string,
  value: unknown,
) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  return requireVerificationSuiteString(label, value);
}

export function canonicalizeVerificationSuiteStringSet(
  label: string,
  values: unknown,
  allowEmpty = true,
) {
  assertScope(
    Array.isArray(values),
    "VERIFICATION_SUITE_SCOPE_FIELD_INVALID",
    `${label} must be an array`,
  );
  const normalized = values.map((value, index) =>
    requireVerificationSuiteString(`${label}[${index}]`, value),
  );
  assertScope(
    allowEmpty || normalized.length > 0,
    "VERIFICATION_SUITE_SCOPE_FIELD_INVALID",
    `${label} must contain at least one entry`,
  );
  const unique = new Set(normalized);
  assertScope(
    unique.size === normalized.length,
    "VERIFICATION_SUITE_SCOPE_POLICY_INVALID",
    `${label} must not contain duplicate entries`,
  );
  return [...unique].sort();
}

export function requireVerificationSuiteFamily(
  value: unknown,
): VerificationSuiteFamily {
  assertScope(
    typeof value === "string" &&
      VERIFICATION_SUITE_FAMILIES.includes(value as VerificationSuiteFamily),
    "VERIFICATION_SUITE_SCOPE_FIELD_INVALID",
    "suite_family must be a governed release verification suite family",
  );
  return value as VerificationSuiteFamily;
}

export function requireUtcInstant(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new VerificationSuiteScopeError(
      "VERIFICATION_SUITE_SCOPE_FIELD_INVALID",
      `${label} must be a valid UTC-normalizable instant: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function requireBoolean(label: string, value: unknown) {
  assertScope(
    typeof value === "boolean",
    "VERIFICATION_SUITE_SCOPE_FIELD_INVALID",
    `${label} must be a boolean`,
  );
  return value;
}

export function requireQuarantineState(
  value: unknown,
): GateAdmissibilityQuarantineState {
  assertScope(
    typeof value === "string" &&
      GATE_ADMISSIBILITY_QUARANTINE_STATES.includes(
        value as GateAdmissibilityQuarantineState,
      ),
    "VERIFICATION_SUITE_SCOPE_FIELD_INVALID",
    "quarantine_state must be NONE, FLAKE_QUARANTINED, MUTED, or MANUAL_WAIVER",
  );
  return value as GateAdmissibilityQuarantineState;
}

export function authoritySandboxCoverageHash(input: unknown) {
  if (!isPlainRecord(input)) {
    return null;
  }
  const value = input.coverage_hash;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function cloneUnknownRecord<T>(value: T): T {
  return structuredClone(value);
}
