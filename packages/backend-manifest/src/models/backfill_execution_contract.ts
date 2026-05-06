import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type BackfillExecutionRequirement =
  | "NO_BACKFILL_REQUIRED"
  | "IDEMPOTENT_BACKFILL_REQUIRED";
export type BackfillExecutionState =
  | "NOT_APPLICABLE"
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "HALTED"
  | "FAILED";

export type BackfillExecutionContractRecord = {
  contract_version: "BACKFILL_EXECUTION_CONTRACT_V1";
  migration_id: string;
  target_version: string;
  target_schema_bundle_hash: string;
  execution_requirement: BackfillExecutionRequirement;
  execution_state: BackfillExecutionState;
  idempotency_policy: "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY";
  meaning_preservation_policy: "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY";
  lineage_recording_policy: "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE";
  retry_safety_policy: "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE";
  affected_artifact_types: string[];
  backfill_audit_refs: string[];
};

export const BACKFILL_EXECUTION_CONTRACT_VERSION = "BACKFILL_EXECUTION_CONTRACT_V1";
export const BACKFILL_EXECUTION_SCHEMA_ID =
  "https://taxat.dev/schemas/backfill_execution_contract.schema.json";

type BackfillExecutionErrorCode =
  | "BACKFILL_EXECUTION_FIELD_REQUIRED"
  | "BACKFILL_EXECUTION_POLICY_INVALID"
  | "BACKFILL_EXECUTION_STATE_INVALID";

export class BackfillExecutionContractModelError extends Error {
  readonly code: BackfillExecutionErrorCode;

  constructor(code: BackfillExecutionErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BackfillExecutionContractModelError";
    this.code = code;
  }
}

function assertBackfill(
  condition: unknown,
  code: BackfillExecutionErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new BackfillExecutionContractModelError(code, detail);
  }
}

function normalizeUniqueStrings(label: string, values: readonly string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const candidate = requireTrimmedString(label, value);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      normalized.push(candidate);
    }
  }
  return normalized.sort();
}

export function buildBackfillExecutionContract(input: {
  affected_artifact_types?: string[];
  backfill_audit_refs?: string[];
  execution_requirement: BackfillExecutionRequirement;
  execution_state?: BackfillExecutionState;
  migration_id: string;
  target_schema_bundle_hash: string;
  target_version: string;
}): BackfillExecutionContractRecord {
  return normalizeBackfillExecutionContract({
    contract_version: BACKFILL_EXECUTION_CONTRACT_VERSION,
    migration_id: input.migration_id,
    target_version: input.target_version,
    target_schema_bundle_hash: input.target_schema_bundle_hash,
    execution_requirement: input.execution_requirement,
    execution_state:
      input.execution_state ??
      (input.execution_requirement === "NO_BACKFILL_REQUIRED"
        ? "NOT_APPLICABLE"
        : "PLANNED"),
    idempotency_policy: "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY",
    meaning_preservation_policy: "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY",
    lineage_recording_policy: "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE",
    retry_safety_policy: "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE",
    affected_artifact_types: input.affected_artifact_types ?? [],
    backfill_audit_refs: input.backfill_audit_refs ?? [],
  });
}

export function normalizeBackfillExecutionContract(
  contract: BackfillExecutionContractRecord,
): BackfillExecutionContractRecord {
  assertBackfill(
    contract.contract_version === BACKFILL_EXECUTION_CONTRACT_VERSION &&
      contract.idempotency_policy === "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY" &&
      contract.meaning_preservation_policy ===
        "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY" &&
      contract.lineage_recording_policy ===
        "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE" &&
      contract.retry_safety_policy === "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE",
    "BACKFILL_EXECUTION_POLICY_INVALID",
    "backfill execution policies must match BACKFILL_EXECUTION_CONTRACT_V1",
  );
  const normalized: BackfillExecutionContractRecord = {
    ...structuredClone(contract),
    contract_version: BACKFILL_EXECUTION_CONTRACT_VERSION,
    migration_id: requireTrimmedString("backfill_execution.migration_id", contract.migration_id),
    target_version: requireTrimmedString("backfill_execution.target_version", contract.target_version),
    target_schema_bundle_hash: requireTrimmedString(
      "backfill_execution.target_schema_bundle_hash",
      contract.target_schema_bundle_hash,
    ),
    idempotency_policy: "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY",
    meaning_preservation_policy: "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY",
    lineage_recording_policy: "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE",
    retry_safety_policy: "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE",
    affected_artifact_types: normalizeUniqueStrings(
      "backfill_execution.affected_artifact_types",
      contract.affected_artifact_types,
    ),
    backfill_audit_refs: normalizeUniqueStrings(
      "backfill_execution.backfill_audit_refs",
      contract.backfill_audit_refs,
    ),
  };

  if (normalized.execution_requirement === "NO_BACKFILL_REQUIRED") {
    assertBackfill(
      normalized.execution_state === "NOT_APPLICABLE" &&
        normalized.affected_artifact_types.length === 0 &&
        normalized.backfill_audit_refs.length === 0,
      "BACKFILL_EXECUTION_STATE_INVALID",
      "NO_BACKFILL_REQUIRED must keep NOT_APPLICABLE state and empty artifact/audit lists",
    );
    return normalized;
  }

  assertBackfill(
    normalized.execution_state !== "NOT_APPLICABLE" &&
      normalized.affected_artifact_types.length > 0,
    "BACKFILL_EXECUTION_STATE_INVALID",
    "IDEMPOTENT_BACKFILL_REQUIRED requires a runnable state and affected artifact types",
  );
  if (["COMPLETE", "HALTED", "FAILED"].includes(normalized.execution_state)) {
    assertBackfill(
      normalized.backfill_audit_refs.length > 0,
      "BACKFILL_EXECUTION_FIELD_REQUIRED",
      "terminal backfill execution states require audit refs",
    );
  }
  return normalized;
}

export function cloneBackfillExecutionContract(contract: BackfillExecutionContractRecord) {
  return structuredClone(contract);
}
