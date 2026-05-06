import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type SchemaReaderWindowState =
  | "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED"
  | "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED"
  | "VERIFIED_PREVIOUS_READERS_SUPPORTED"
  | "CONTRACT_ELIGIBLE_WINDOW_CLOSED";

export type SchemaReaderWindowContractRecord = {
  contract_version: "SCHEMA_READER_WINDOW_CONTRACT_V1";
  compatibility_window_ref: string;
  writer_schema_bundle_hash: string;
  supported_reader_schema_bundle_hashes: string[];
  protected_historical_schema_bundle_hashes: string[];
  window_state: SchemaReaderWindowState;
  historical_manifest_policy: "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER";
  destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED";
  rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED";
  fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT";
  replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER";
};

export const SCHEMA_READER_WINDOW_CONTRACT_VERSION = "SCHEMA_READER_WINDOW_CONTRACT_V1";
export const SCHEMA_READER_WINDOW_SCHEMA_ID =
  "https://taxat.dev/schemas/schema_reader_window_contract.schema.json";

type SchemaReaderWindowErrorCode =
  | "SCHEMA_READER_WINDOW_FIELD_REQUIRED"
  | "SCHEMA_READER_WINDOW_POLICY_INVALID";

export class SchemaReaderWindowModelError extends Error {
  readonly code: SchemaReaderWindowErrorCode;

  constructor(code: SchemaReaderWindowErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaReaderWindowModelError";
    this.code = code;
  }
}

function assertWindow(
  condition: unknown,
  code: SchemaReaderWindowErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new SchemaReaderWindowModelError(code, detail);
  }
}

function normalizeUniqueStrings(label: string, values: readonly string[], minItems = 0) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const candidate = requireTrimmedString(label, value);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      normalized.push(candidate);
    }
  }
  assertWindow(
    normalized.length >= minItems,
    "SCHEMA_READER_WINDOW_FIELD_REQUIRED",
    `${label} must contain at least ${minItems} value(s)`,
  );
  return normalized.sort();
}

export function buildSchemaReaderWindowContract(input: {
  compatibility_window_ref: string;
  writer_schema_bundle_hash: string;
  supported_reader_schema_bundle_hashes?: string[];
  protected_historical_schema_bundle_hashes?: string[];
  window_state: SchemaReaderWindowState;
}): SchemaReaderWindowContractRecord {
  const writerHash = requireTrimmedString(
    "schema_reader_window.writer_schema_bundle_hash",
    input.writer_schema_bundle_hash,
  );
  return normalizeSchemaReaderWindowContract({
    contract_version: SCHEMA_READER_WINDOW_CONTRACT_VERSION,
    compatibility_window_ref: input.compatibility_window_ref,
    writer_schema_bundle_hash: writerHash,
    supported_reader_schema_bundle_hashes: input.supported_reader_schema_bundle_hashes ?? [
      writerHash,
    ],
    protected_historical_schema_bundle_hashes:
      input.protected_historical_schema_bundle_hashes ?? [],
    window_state: input.window_state,
    historical_manifest_policy: "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
  });
}

export function normalizeSchemaReaderWindowContract(
  contract: SchemaReaderWindowContractRecord,
): SchemaReaderWindowContractRecord {
  assertWindow(
    contract.contract_version === SCHEMA_READER_WINDOW_CONTRACT_VERSION &&
      contract.historical_manifest_policy ===
        "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER" &&
      contract.destructive_change_policy ===
        "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED" &&
      contract.rollback_boundary_policy ===
        "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED" &&
      contract.fail_forward_policy ===
        "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT" &&
      contract.replay_restore_policy === "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
    "SCHEMA_READER_WINDOW_POLICY_INVALID",
    "schema reader window policies must match SCHEMA_READER_WINDOW_CONTRACT_V1",
  );

  const writerHash = requireTrimmedString(
    "schema_reader_window.writer_schema_bundle_hash",
    contract.writer_schema_bundle_hash,
  );
  const supported = normalizeUniqueStrings(
    "schema_reader_window.supported_reader_schema_bundle_hashes",
    contract.supported_reader_schema_bundle_hashes,
    1,
  );
  assertWindow(
    supported.includes(writerHash),
    "SCHEMA_READER_WINDOW_POLICY_INVALID",
    "supported reader hashes must include the writer schema bundle hash",
  );

  return {
    ...structuredClone(contract),
    contract_version: SCHEMA_READER_WINDOW_CONTRACT_VERSION,
    compatibility_window_ref: requireTrimmedString(
      "schema_reader_window.compatibility_window_ref",
      contract.compatibility_window_ref,
    ),
    writer_schema_bundle_hash: writerHash,
    supported_reader_schema_bundle_hashes: supported,
    protected_historical_schema_bundle_hashes: normalizeUniqueStrings(
      "schema_reader_window.protected_historical_schema_bundle_hashes",
      contract.protected_historical_schema_bundle_hashes,
    ),
    historical_manifest_policy: "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
  };
}

export function cloneSchemaReaderWindowContract(contract: SchemaReaderWindowContractRecord) {
  return structuredClone(contract);
}
