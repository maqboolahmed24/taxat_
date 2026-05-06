import type { SchemaReaderWindowContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

export type SchemaReaderWindowContractRecord = SchemaReaderWindowContract;
export type SchemaReaderWindowState =
  SchemaReaderWindowContractRecord["window_state"];

export const SCHEMA_READER_WINDOW_CONTRACT_VERSION =
  "SCHEMA_READER_WINDOW_CONTRACT_V1";
export const SCHEMA_READER_WINDOW_SCHEMA_ID =
  "https://taxat.dev/schemas/schema_reader_window_contract.schema.json";

export const SCHEMA_READER_WINDOW_STATES = [
  "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
  "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
  "VERIFIED_PREVIOUS_READERS_SUPPORTED",
  "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
] as const satisfies readonly SchemaReaderWindowState[];

export type SchemaReaderWindowModelErrorCode =
  | "SCHEMA_READER_WINDOW_FIELD_INVALID"
  | "SCHEMA_READER_WINDOW_POLICY_INVALID";

export class SchemaReaderWindowModelError extends Error {
  readonly code: SchemaReaderWindowModelErrorCode;

  constructor(code: SchemaReaderWindowModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaReaderWindowModelError";
    this.code = code;
  }
}

const readerWindowStateSet = new Set<SchemaReaderWindowState>(
  SCHEMA_READER_WINDOW_STATES,
);

function assertReaderWindow(
  condition: unknown,
  code: SchemaReaderWindowModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new SchemaReaderWindowModelError(code, detail);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireTrimmedString(label: string, value: unknown) {
  assertReaderWindow(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "SCHEMA_READER_WINDOW_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireWindowState(value: unknown): SchemaReaderWindowState {
  assertReaderWindow(
    typeof value === "string" && readerWindowStateSet.has(value as SchemaReaderWindowState),
    "SCHEMA_READER_WINDOW_FIELD_INVALID",
    "window_state must be a governed schema-reader window state",
  );
  return value as SchemaReaderWindowState;
}

function requireStringArray(label: string, values: unknown, allowEmpty = true) {
  assertReaderWindow(
    Array.isArray(values),
    "SCHEMA_READER_WINDOW_FIELD_INVALID",
    `${label} must be an array`,
  );
  const normalized = values.map((value, index) =>
    requireTrimmedString(`${label}[${index}]`, value),
  );
  assertReaderWindow(
    allowEmpty || normalized.length > 0,
    "SCHEMA_READER_WINDOW_FIELD_INVALID",
    `${label} must contain at least one entry`,
  );
  const unique = new Set(normalized);
  assertReaderWindow(
    unique.size === normalized.length,
    "SCHEMA_READER_WINDOW_POLICY_INVALID",
    `${label} must not contain duplicate refs`,
  );
  return [...unique].sort();
}

function requirePolicyLiteral<T extends string>(
  label: string,
  actual: unknown,
  expected: T,
) {
  assertReaderWindow(
    actual === expected,
    "SCHEMA_READER_WINDOW_POLICY_INVALID",
    `${label} must be ${expected}`,
  );
  return expected;
}

export function buildSchemaReaderWindowContract(input: {
  compatibility_window_ref: unknown;
  writer_schema_bundle_hash: unknown;
  supported_reader_schema_bundle_hashes?: unknown;
  protected_historical_schema_bundle_hashes?: unknown;
  window_state: unknown;
}): SchemaReaderWindowContractRecord {
  const writerHash = requireTrimmedString(
    "schema_reader_window_contract.writer_schema_bundle_hash",
    input.writer_schema_bundle_hash,
  );
  return normalizeSchemaReaderWindowContract({
    contract_version: SCHEMA_READER_WINDOW_CONTRACT_VERSION,
    compatibility_window_ref: input.compatibility_window_ref,
    writer_schema_bundle_hash: writerHash,
    supported_reader_schema_bundle_hashes:
      input.supported_reader_schema_bundle_hashes ?? [writerHash],
    protected_historical_schema_bundle_hashes:
      input.protected_historical_schema_bundle_hashes ?? [],
    window_state: input.window_state,
    historical_manifest_policy:
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    rollback_boundary_policy:
      "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    fail_forward_policy:
      "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
  });
}

export function normalizeSchemaReaderWindowContract(
  input: unknown,
): SchemaReaderWindowContractRecord {
  assertReaderWindow(
    isPlainObject(input),
    "SCHEMA_READER_WINDOW_FIELD_INVALID",
    "schema_reader_window_contract must be an object",
  );
  requirePolicyLiteral(
    "schema_reader_window_contract.contract_version",
    input.contract_version,
    SCHEMA_READER_WINDOW_CONTRACT_VERSION,
  );
  const writerHash = requireTrimmedString(
    "schema_reader_window_contract.writer_schema_bundle_hash",
    input.writer_schema_bundle_hash,
  );
  const supportedReaders = requireStringArray(
    "schema_reader_window_contract.supported_reader_schema_bundle_hashes",
    input.supported_reader_schema_bundle_hashes,
    false,
  );
  const protectedHistorical = requireStringArray(
    "schema_reader_window_contract.protected_historical_schema_bundle_hashes",
    input.protected_historical_schema_bundle_hashes,
  );

  assertReaderWindow(
    supportedReaders.includes(writerHash),
    "SCHEMA_READER_WINDOW_POLICY_INVALID",
    "supported_reader_schema_bundle_hashes must include writer_schema_bundle_hash",
  );
  assertReaderWindow(
    !protectedHistorical.includes(writerHash),
    "SCHEMA_READER_WINDOW_POLICY_INVALID",
    "protected_historical_schema_bundle_hashes must exclude the current writer bundle",
  );
  const unsupportedHistorical = protectedHistorical.filter(
    (hash) => !supportedReaders.includes(hash),
  );
  assertReaderWindow(
    unsupportedHistorical.length === 0,
    "SCHEMA_READER_WINDOW_POLICY_INVALID",
    `protected_historical_schema_bundle_hashes must be a subset of supported readers; unsupported ${unsupportedHistorical.join(", ")}`,
  );

  return {
    contract_version: SCHEMA_READER_WINDOW_CONTRACT_VERSION,
    compatibility_window_ref: requireTrimmedString(
      "schema_reader_window_contract.compatibility_window_ref",
      input.compatibility_window_ref,
    ),
    writer_schema_bundle_hash: writerHash,
    supported_reader_schema_bundle_hashes: supportedReaders,
    protected_historical_schema_bundle_hashes: protectedHistorical,
    window_state: requireWindowState(input.window_state),
    historical_manifest_policy: requirePolicyLiteral(
      "schema_reader_window_contract.historical_manifest_policy",
      input.historical_manifest_policy,
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    ),
    destructive_change_policy: requirePolicyLiteral(
      "schema_reader_window_contract.destructive_change_policy",
      input.destructive_change_policy,
      "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    ),
    rollback_boundary_policy: requirePolicyLiteral(
      "schema_reader_window_contract.rollback_boundary_policy",
      input.rollback_boundary_policy,
      "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    ),
    fail_forward_policy: requirePolicyLiteral(
      "schema_reader_window_contract.fail_forward_policy",
      input.fail_forward_policy,
      "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    ),
    replay_restore_policy: requirePolicyLiteral(
      "schema_reader_window_contract.replay_restore_policy",
      input.replay_restore_policy,
      "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
    ),
  };
}

export function assertSchemaReaderWindowContract(
  input: unknown,
): SchemaReaderWindowContractRecord {
  return normalizeSchemaReaderWindowContract(input);
}

export function cloneSchemaReaderWindowContract(
  contract: SchemaReaderWindowContractRecord,
) {
  return structuredClone(normalizeSchemaReaderWindowContract(contract));
}

export function readerWindowRequiresFailForward(
  contract: SchemaReaderWindowContractRecord,
) {
  return (
    normalizeSchemaReaderWindowContract(contract).window_state ===
    "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
  );
}
