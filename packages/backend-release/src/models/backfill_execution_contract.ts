import type { BackfillExecutionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

export type BackfillExecutionContractRecord = BackfillExecutionContract;
export type BackfillExecutionRequirement =
  BackfillExecutionContractRecord["execution_requirement"];
export type BackfillExecutionState =
  BackfillExecutionContractRecord["execution_state"];

export const BACKFILL_EXECUTION_CONTRACT_VERSION =
  "BACKFILL_EXECUTION_CONTRACT_V1";
export const BACKFILL_EXECUTION_SCHEMA_ID =
  "https://taxat.dev/schemas/backfill_execution_contract.schema.json";

export const BACKFILL_EXECUTION_REQUIREMENTS = [
  "NO_BACKFILL_REQUIRED",
  "IDEMPOTENT_BACKFILL_REQUIRED",
] as const satisfies readonly BackfillExecutionRequirement[];
export const BACKFILL_EXECUTION_STATES = [
  "NOT_APPLICABLE",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETE",
  "HALTED",
  "FAILED",
] as const satisfies readonly BackfillExecutionState[];

export type BackfillExecutionContractModelErrorCode =
  | "BACKFILL_EXECUTION_FIELD_INVALID"
  | "BACKFILL_EXECUTION_POLICY_INVALID"
  | "BACKFILL_EXECUTION_STATE_INVALID";

export class BackfillExecutionContractModelError extends Error {
  readonly code: BackfillExecutionContractModelErrorCode;

  constructor(code: BackfillExecutionContractModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BackfillExecutionContractModelError";
    this.code = code;
  }
}

const requirementSet = new Set<BackfillExecutionRequirement>(
  BACKFILL_EXECUTION_REQUIREMENTS,
);
const stateSet = new Set<BackfillExecutionState>(BACKFILL_EXECUTION_STATES);

function assertBackfill(
  condition: unknown,
  code: BackfillExecutionContractModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new BackfillExecutionContractModelError(code, detail);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireTrimmedString(label: string, value: unknown) {
  assertBackfill(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "BACKFILL_EXECUTION_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireRequirement(value: unknown): BackfillExecutionRequirement {
  assertBackfill(
    typeof value === "string" && requirementSet.has(value as BackfillExecutionRequirement),
    "BACKFILL_EXECUTION_FIELD_INVALID",
    "execution_requirement must be a governed backfill execution requirement",
  );
  return value as BackfillExecutionRequirement;
}

function requireExecutionState(value: unknown): BackfillExecutionState {
  assertBackfill(
    typeof value === "string" && stateSet.has(value as BackfillExecutionState),
    "BACKFILL_EXECUTION_FIELD_INVALID",
    "execution_state must be a governed backfill execution state",
  );
  return value as BackfillExecutionState;
}

function requireStringArray(label: string, values: unknown) {
  assertBackfill(
    Array.isArray(values),
    "BACKFILL_EXECUTION_FIELD_INVALID",
    `${label} must be an array`,
  );
  const normalized = values.map((value, index) =>
    requireTrimmedString(`${label}[${index}]`, value),
  );
  const unique = new Set(normalized);
  assertBackfill(
    unique.size === normalized.length,
    "BACKFILL_EXECUTION_POLICY_INVALID",
    `${label} must not contain duplicate refs`,
  );
  return [...unique].sort();
}

function requirePolicyLiteral<T extends string>(
  label: string,
  actual: unknown,
  expected: T,
) {
  assertBackfill(
    actual === expected,
    "BACKFILL_EXECUTION_POLICY_INVALID",
    `${label} must be ${expected}`,
  );
  return expected;
}

export function buildBackfillExecutionContract(input: {
  migration_id: unknown;
  target_version: unknown;
  target_schema_bundle_hash: unknown;
  execution_requirement: unknown;
  execution_state?: unknown;
  affected_artifact_types?: unknown;
  backfill_audit_refs?: unknown;
}): BackfillExecutionContractRecord {
  const requirement = requireRequirement(input.execution_requirement);
  return normalizeBackfillExecutionContract({
    contract_version: BACKFILL_EXECUTION_CONTRACT_VERSION,
    migration_id: input.migration_id,
    target_version: input.target_version,
    target_schema_bundle_hash: input.target_schema_bundle_hash,
    execution_requirement: requirement,
    execution_state:
      input.execution_state ??
      (requirement === "NO_BACKFILL_REQUIRED" ? "NOT_APPLICABLE" : "PLANNED"),
    idempotency_policy: "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY",
    meaning_preservation_policy:
      "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY",
    lineage_recording_policy:
      "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE",
    retry_safety_policy: "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE",
    affected_artifact_types: input.affected_artifact_types ?? [],
    backfill_audit_refs: input.backfill_audit_refs ?? [],
  });
}

export function normalizeBackfillExecutionContract(
  input: unknown,
): BackfillExecutionContractRecord {
  assertBackfill(
    isPlainObject(input),
    "BACKFILL_EXECUTION_FIELD_INVALID",
    "backfill_execution_contract must be an object",
  );
  requirePolicyLiteral(
    "backfill_execution_contract.contract_version",
    input.contract_version,
    BACKFILL_EXECUTION_CONTRACT_VERSION,
  );
  const normalized: BackfillExecutionContractRecord = {
    contract_version: BACKFILL_EXECUTION_CONTRACT_VERSION,
    migration_id: requireTrimmedString(
      "backfill_execution_contract.migration_id",
      input.migration_id,
    ),
    target_version: requireTrimmedString(
      "backfill_execution_contract.target_version",
      input.target_version,
    ),
    target_schema_bundle_hash: requireTrimmedString(
      "backfill_execution_contract.target_schema_bundle_hash",
      input.target_schema_bundle_hash,
    ),
    execution_requirement: requireRequirement(input.execution_requirement),
    execution_state: requireExecutionState(input.execution_state),
    idempotency_policy: requirePolicyLiteral(
      "backfill_execution_contract.idempotency_policy",
      input.idempotency_policy,
      "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY",
    ),
    meaning_preservation_policy: requirePolicyLiteral(
      "backfill_execution_contract.meaning_preservation_policy",
      input.meaning_preservation_policy,
      "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY",
    ),
    lineage_recording_policy: requirePolicyLiteral(
      "backfill_execution_contract.lineage_recording_policy",
      input.lineage_recording_policy,
      "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE",
    ),
    retry_safety_policy: requirePolicyLiteral(
      "backfill_execution_contract.retry_safety_policy",
      input.retry_safety_policy,
      "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE",
    ),
    affected_artifact_types: requireStringArray(
      "backfill_execution_contract.affected_artifact_types",
      input.affected_artifact_types,
    ),
    backfill_audit_refs: requireStringArray(
      "backfill_execution_contract.backfill_audit_refs",
      input.backfill_audit_refs,
    ),
  };

  if (normalized.execution_requirement === "NO_BACKFILL_REQUIRED") {
    assertBackfill(
      normalized.execution_state === "NOT_APPLICABLE" &&
        normalized.affected_artifact_types.length === 0 &&
        normalized.backfill_audit_refs.length === 0,
      "BACKFILL_EXECUTION_STATE_INVALID",
      "NO_BACKFILL_REQUIRED must force NOT_APPLICABLE and empty artifact/audit lists",
    );
    return normalized;
  }

  assertBackfill(
    normalized.execution_state !== "NOT_APPLICABLE" &&
      normalized.affected_artifact_types.length > 0,
    "BACKFILL_EXECUTION_STATE_INVALID",
    "IDEMPOTENT_BACKFILL_REQUIRED requires affected artifact types and a runnable state",
  );
  assertBackfill(
    normalized.backfill_audit_refs.length === 0 ||
      normalized.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED",
    "BACKFILL_EXECUTION_POLICY_INVALID",
    "backfill_audit_refs must stay empty unless an idempotent backfill is required",
  );
  if (["COMPLETE", "HALTED", "FAILED"].includes(normalized.execution_state)) {
    assertBackfill(
      normalized.backfill_audit_refs.length > 0,
      "BACKFILL_EXECUTION_STATE_INVALID",
      "terminal backfill execution states require audit refs",
    );
  }
  return normalized;
}

export function assertBackfillExecutionContract(
  input: unknown,
): BackfillExecutionContractRecord {
  return normalizeBackfillExecutionContract(input);
}

export function cloneBackfillExecutionContract(
  contract: BackfillExecutionContractRecord,
) {
  return structuredClone(normalizeBackfillExecutionContract(contract));
}
