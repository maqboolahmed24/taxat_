import type { SchemaBundleCompatibilityGateContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  buildSchemaBundleCompatibilityGateContract,
  deriveSchemaBundleCompatibilityGateHash,
  normalizeSchemaBundleCompatibilityGateContract,
  rollbackBoundaryForReaderWindow,
} from "./deployment_release.ts";

export type SchemaBundleCompatibilityGateContractRecord =
  SchemaBundleCompatibilityGateContract;

export const SCHEMA_BUNDLE_COMPATIBILITY_GATE_CONTRACT_VERSION =
  "SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1";
export const SCHEMA_BUNDLE_COMPATIBILITY_GATE_SCHEMA_ID =
  "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json";

export type SchemaBundleCompatibilityGateModelErrorCode =
  | "SCHEMA_BUNDLE_COMPATIBILITY_GATE_FIELD_INVALID"
  | "SCHEMA_BUNDLE_COMPATIBILITY_GATE_POLICY_INVALID";

export class SchemaBundleCompatibilityGateModelError extends Error {
  readonly code: SchemaBundleCompatibilityGateModelErrorCode;

  constructor(code: SchemaBundleCompatibilityGateModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaBundleCompatibilityGateModelError";
    this.code = code;
  }
}

function assertGate(
  condition: unknown,
  code: SchemaBundleCompatibilityGateModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new SchemaBundleCompatibilityGateModelError(code, detail);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireTrimmedString(label: string, value: unknown) {
  assertGate(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "SCHEMA_BUNDLE_COMPATIBILITY_GATE_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireNullableTrimmedString(label: string, value: unknown) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  return requireTrimmedString(label, value);
}

export {
  buildSchemaBundleCompatibilityGateContract,
  deriveSchemaBundleCompatibilityGateHash,
  normalizeSchemaBundleCompatibilityGateContract,
};

export function assertSchemaBundleCompatibilityGateContract(
  input: unknown,
): SchemaBundleCompatibilityGateContractRecord {
  assertGate(
    isPlainObject(input),
    "SCHEMA_BUNDLE_COMPATIBILITY_GATE_FIELD_INVALID",
    "schema_bundle_compatibility_gate_contract must be an object",
  );
  assertGate(
    isPlainObject(input.schema_reader_window_contract),
    "SCHEMA_BUNDLE_COMPATIBILITY_GATE_FIELD_INVALID",
    "schema_reader_window_contract must be an object",
  );
  const readerWindowState = input.schema_reader_window_contract.window_state;
  assertGate(
    readerWindowState === "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED" ||
      readerWindowState === "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED" ||
      readerWindowState === "VERIFIED_PREVIOUS_READERS_SUPPORTED" ||
      readerWindowState === "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
    "SCHEMA_BUNDLE_COMPATIBILITY_GATE_FIELD_INVALID",
    "schema_reader_window_contract.window_state must be a governed reader-window state",
  );
  return normalizeSchemaBundleCompatibilityGateContract(input, {
    candidate_identity_hash: requireTrimmedString(
      "schema_bundle_compatibility_gate_contract.candidate_identity_hash",
      input.candidate_identity_hash,
    ),
    schema_bundle_hash: requireTrimmedString(
      "schema_bundle_compatibility_gate_contract.schema_bundle_hash",
      input.schema_bundle_hash,
    ),
    migration_plan_ref_or_null: requireNullableTrimmedString(
      "schema_bundle_compatibility_gate_contract.migration_plan_ref_or_null",
      input.migration_plan_ref_or_null,
    ),
    supported_client_window_ref_or_null: requireNullableTrimmedString(
      "schema_bundle_compatibility_gate_contract.supported_client_window_ref_or_null",
      input.supported_client_window_ref_or_null,
    ),
    compatibility_window_ref: requireTrimmedString(
      "schema_reader_window_contract.compatibility_window_ref",
      input.schema_reader_window_contract.compatibility_window_ref,
    ),
    reader_window_state: readerWindowState,
    rollback_boundary_state: rollbackBoundaryForReaderWindow(readerWindowState),
  });
}

export function cloneSchemaBundleCompatibilityGateContract(
  contract: SchemaBundleCompatibilityGateContractRecord,
) {
  return structuredClone(assertSchemaBundleCompatibilityGateContract(contract));
}
