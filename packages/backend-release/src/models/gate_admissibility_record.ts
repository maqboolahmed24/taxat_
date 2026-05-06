import type { GateAdmissibilityRecord } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import {
  assertReleaseCandidateIdentityContract,
  cloneReleaseCandidateIdentityContract,
  type ReleaseCandidateIdentityContractRecord,
} from "./release_candidate_identity_contract.ts";
import {
  assertSchemaBundleCompatibilityGateContract,
  cloneSchemaBundleCompatibilityGateContract,
  type SchemaBundleCompatibilityGateContractRecord,
} from "./schema_bundle_compatibility_gate_contract.ts";
import {
  assertSchemaReaderWindowContract,
  cloneSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
} from "./schema_reader_window_contract.ts";
import {
  authoritySandboxCoverageHash,
  canonicalizeVerificationSuiteStringSet,
  cloneUnknownRecord,
  isPlainRecord,
  requireBoolean,
  requireQuarantineState,
  requireUtcInstant,
  requireVerificationSuiteFamily,
  requireVerificationSuiteNullableString,
  requireVerificationSuiteString,
  type GateAdmissibilityQuarantineState,
  type VerificationSuiteFamily,
} from "../services/canonicalize_verification_suite_scope.ts";
import {
  type VerificationSuiteResultRecord,
  verificationSuiteResultRef,
} from "./verification_suite_result.ts";

export type GateAdmissibilityRecordRecord = GateAdmissibilityRecord;
export type GateAdmissibilityState =
  GateAdmissibilityRecordRecord["admissibility_state"];

export const GATE_ADMISSIBILITY_RECORD_SCHEMA_ID =
  "https://taxat.dev/schemas/gate_admissibility_record.schema.json";

export type GateAdmissibilityRecordModelErrorCode =
  | "GATE_ADMISSIBILITY_FIELD_INVALID"
  | "GATE_ADMISSIBILITY_CANDIDATE_DRIFT"
  | "GATE_ADMISSIBILITY_WINDOW_DRIFT"
  | "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID"
  | "GATE_ADMISSIBILITY_POLICY_INVALID";

export class GateAdmissibilityRecordModelError extends Error {
  readonly code: GateAdmissibilityRecordModelErrorCode;

  constructor(code: GateAdmissibilityRecordModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GateAdmissibilityRecordModelError";
    this.code = code;
  }
}

function assertGateAdmissibility(
  condition: unknown,
  code: GateAdmissibilityRecordModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new GateAdmissibilityRecordModelError(code, detail);
  }
}

function modelErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function assertGateCandidateIdentityContract(
  value: unknown,
  expectedMirrors?: Parameters<typeof assertReleaseCandidateIdentityContract>[1],
) {
  try {
    return assertReleaseCandidateIdentityContract(value, expectedMirrors);
  } catch (error) {
    throw new GateAdmissibilityRecordModelError(
      "GATE_ADMISSIBILITY_CANDIDATE_DRIFT",
      `candidate_identity_contract must mirror admissibility scope: ${modelErrorDetail(error)}`,
    );
  }
}

function requireAdmissibilityState(value: unknown): GateAdmissibilityState {
  assertGateAdmissibility(
    value === "ADMISSIBLE" || value === "INADMISSIBLE",
    "GATE_ADMISSIBILITY_FIELD_INVALID",
    "admissibility_state must be ADMISSIBLE or INADMISSIBLE",
  );
  return value;
}

function normalizeCoverageContract(
  suiteFamily: VerificationSuiteFamily,
  value: unknown,
  expected: {
    candidate_identity_hash: string;
    schema_bundle_hash: string;
    compatibility_gate_hash: string;
    migration_plan_ref_or_null: string | null;
    supported_client_window_ref_or_null: string | null;
    reader_window_state: SchemaReaderWindowContractRecord["window_state"];
  },
) {
  if (suiteFamily !== "AUTHORITY_SANDBOX") {
    assertGateAdmissibility(
      value === null || typeof value === "undefined",
      "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
      "authority_sandbox_coverage_contract_or_null must stay null outside AUTHORITY_SANDBOX",
    );
    return null;
  }
  assertGateAdmissibility(
    isPlainRecord(value),
    "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
    "AUTHORITY_SANDBOX admissibility records require authority_sandbox_coverage_contract_or_null",
  );
  assertGateAdmissibility(
    authoritySandboxCoverageHash(value) !== null,
    "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
    "authority_sandbox_coverage_contract_or_null.coverage_hash must be non-empty",
  );
  const mirrorChecks: Array<[string, unknown, unknown]> = [
    ["candidate_identity_hash", value.candidate_identity_hash, expected.candidate_identity_hash],
    ["schema_bundle_hash", value.schema_bundle_hash, expected.schema_bundle_hash],
    ["compatibility_gate_hash", value.compatibility_gate_hash, expected.compatibility_gate_hash],
    [
      "migration_plan_ref_or_null",
      value.migration_plan_ref_or_null,
      expected.migration_plan_ref_or_null,
    ],
    [
      "supported_client_window_ref_or_null",
      value.supported_client_window_ref_or_null,
      expected.supported_client_window_ref_or_null,
    ],
    ["reader_window_state", value.reader_window_state, expected.reader_window_state],
  ];
  for (const [field, actual, expectedValue] of mirrorChecks) {
    assertGateAdmissibility(
      actual === expectedValue,
      "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
      `authority_sandbox_coverage_contract_or_null.${field} must mirror admissibility scope`,
    );
  }
  return cloneUnknownRecord(value);
}

function assertSuiteSpecificDimensions(input: {
  suiteFamily: VerificationSuiteFamily;
  migrationPlanRef: string | null;
  supportedClientWindowRef: string | null;
  restoreDrillRef: string | null;
  restoreCheckpointRef: string | null;
  deterministicGoldenPackRef: string | null;
}) {
  assertGateAdmissibility(
    input.suiteFamily !== "MIGRATION_VERIFICATION" ||
      input.migrationPlanRef !== null,
    "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
    "MIGRATION_VERIFICATION admissibility records require migration_plan_ref",
  );
  assertGateAdmissibility(
    input.suiteFamily !== "OPERATOR_CLIENT" ||
      input.supportedClientWindowRef !== null,
    "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
    "OPERATOR_CLIENT admissibility records require supported_client_window_ref",
  );
  assertGateAdmissibility(
    (input.restoreDrillRef === null) === (input.restoreCheckpointRef === null),
    "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
    "restore_drill_ref and restore_checkpoint_ref must be populated or cleared together",
  );
  assertGateAdmissibility(
    input.suiteFamily === "RESTORE_DRILL"
      ? input.restoreDrillRef !== null && input.restoreCheckpointRef !== null
      : input.restoreDrillRef === null && input.restoreCheckpointRef === null,
    "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
    "restore drill refs must stay limited to RESTORE_DRILL admissibility records",
  );
  assertGateAdmissibility(
    input.suiteFamily === "DETERMINISTIC_AND_STATE_MACHINE"
      ? input.deterministicGoldenPackRef !== null
      : input.deterministicGoldenPackRef === null,
    "GATE_ADMISSIBILITY_SUITE_DIMENSION_INVALID",
    "deterministic_golden_pack_ref must stay limited to DETERMINISTIC_AND_STATE_MACHINE admissibility records",
  );
}

function assertAdmissibilityPolicy(input: {
  suiteFamily: VerificationSuiteFamily;
  state: GateAdmissibilityState;
  quarantineState: GateAdmissibilityQuarantineState;
  reasonCodes: readonly string[];
  candidateIdentityMatch: boolean;
  freshnessVerified: boolean;
  contractWindowConsistent: boolean;
  rerunScopePreserved: boolean;
  compatibilityGate: SchemaBundleCompatibilityGateContractRecord;
}) {
  const allGreen =
    input.candidateIdentityMatch &&
    input.freshnessVerified &&
    input.contractWindowConsistent &&
    input.rerunScopePreserved &&
    input.quarantineState === "NONE" &&
    input.reasonCodes.length === 0;
  if (input.state === "ADMISSIBLE") {
    assertGateAdmissibility(
      allGreen,
      "GATE_ADMISSIBILITY_POLICY_INVALID",
      "ADMISSIBLE records require candidate match, freshness, contract-window consistency, rerun-scope preservation, no quarantine, and no reason codes",
    );
  } else {
    assertGateAdmissibility(
      !allGreen,
      "GATE_ADMISSIBILITY_POLICY_INVALID",
      "INADMISSIBLE records require a failed dimension, quarantine, or reason code",
    );
  }
  assertGateAdmissibility(
    input.quarantineState === "NONE" || input.state === "INADMISSIBLE",
    "GATE_ADMISSIBILITY_POLICY_INVALID",
    "quarantine, mute, and manual-waiver posture must force INADMISSIBLE",
  );
  const failedDimension =
    !input.candidateIdentityMatch ||
    !input.freshnessVerified ||
    !input.contractWindowConsistent ||
    !input.rerunScopePreserved ||
    input.quarantineState !== "NONE";
  assertGateAdmissibility(
    !failedDimension || input.reasonCodes.length > 0,
    "GATE_ADMISSIBILITY_POLICY_INVALID",
    "failed admissibility dimensions require reason_codes",
  );
  assertGateAdmissibility(
    input.reasonCodes.length === 0 || input.state === "INADMISSIBLE",
    "GATE_ADMISSIBILITY_POLICY_INVALID",
    "non-empty reason_codes must force INADMISSIBLE",
  );
  if (input.state !== "ADMISSIBLE") {
    return;
  }
  if (input.suiteFamily === "SCHEMA_COMPATIBILITY") {
    assertGateAdmissibility(
      input.compatibilityGate.historical_manifest_guard_state === "PROTECTED" &&
        input.compatibilityGate.replay_restore_guard_state === "PROTECTED",
      "GATE_ADMISSIBILITY_POLICY_INVALID",
      "admissible SCHEMA_COMPATIBILITY records require protected historical-manifest and replay/restore guards",
    );
  }
  if (input.suiteFamily === "MIGRATION_VERIFICATION") {
    assertGateAdmissibility(
      input.compatibilityGate.migration_chronology_state !== "NOT_REQUIRED",
      "GATE_ADMISSIBILITY_POLICY_INVALID",
      "admissible MIGRATION_VERIFICATION records require migration chronology evidence",
    );
  }
  if (input.suiteFamily === "OPERATOR_CLIENT") {
    assertGateAdmissibility(
      input.compatibilityGate.native_client_window_state === "VERIFIED_COMPATIBLE",
      "GATE_ADMISSIBILITY_POLICY_INVALID",
      "admissible OPERATOR_CLIENT records require verified native-client compatibility",
    );
  }
}

export function normalizeGateAdmissibilityRecord(
  input: unknown,
): GateAdmissibilityRecordRecord {
  assertGateAdmissibility(
    isPlainRecord(input),
    "GATE_ADMISSIBILITY_FIELD_INVALID",
    "gate_admissibility_record must be an object",
  );
  const suiteFamily = requireVerificationSuiteFamily(input.suite_family);
  const migrationPlanRef = requireVerificationSuiteNullableString(
    "gate_admissibility_record.migration_plan_ref",
    input.migration_plan_ref,
  );
  const supportedClientWindowRef = requireVerificationSuiteNullableString(
    "gate_admissibility_record.supported_client_window_ref",
    input.supported_client_window_ref,
  );
  const candidateIdentityHash = requireVerificationSuiteString(
    "gate_admissibility_record.candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const schemaBundleHash = requireVerificationSuiteString(
    "gate_admissibility_record.schema_bundle_hash",
    input.schema_bundle_hash,
  );
  const candidateIdentityContract = assertGateCandidateIdentityContract(
    input.candidate_identity_contract,
    {
      candidate_environment_ref: requireVerificationSuiteString(
        "gate_admissibility_record.candidate_environment_ref",
        input.candidate_environment_ref,
      ),
      artifact_digest: requireVerificationSuiteString(
        "gate_admissibility_record.artifact_digest",
        input.artifact_digest,
      ),
      candidate_identity_hash: candidateIdentityHash,
      schema_bundle_hash: schemaBundleHash,
      migration_plan_ref_or_null: migrationPlanRef,
      supported_client_window_ref_or_null: supportedClientWindowRef,
    },
  );
  const schemaReaderWindowContract = assertSchemaReaderWindowContract(
    input.schema_reader_window_contract,
  );
  assertGateAdmissibility(
    schemaReaderWindowContract.writer_schema_bundle_hash === schemaBundleHash,
    "GATE_ADMISSIBILITY_WINDOW_DRIFT",
    "schema_reader_window_contract.writer_schema_bundle_hash must mirror schema_bundle_hash",
  );
  const compatibilityGate = assertSchemaBundleCompatibilityGateContract(
    input.schema_bundle_compatibility_gate_contract,
  );
  assertGateAdmissibility(
    compatibilityGate.candidate_identity_hash === candidateIdentityHash &&
      compatibilityGate.schema_bundle_hash === schemaBundleHash &&
      compatibilityGate.migration_plan_ref_or_null === migrationPlanRef &&
      compatibilityGate.supported_client_window_ref_or_null ===
        supportedClientWindowRef &&
      compatibilityGate.compatibility_window_ref ===
        schemaReaderWindowContract.compatibility_window_ref &&
      compatibilityGate.reader_window_state ===
        schemaReaderWindowContract.window_state,
    "GATE_ADMISSIBILITY_WINDOW_DRIFT",
    "schema_bundle_compatibility_gate_contract must mirror candidate, migration, client, and reader-window scope",
  );
  const restoreDrillRef = requireVerificationSuiteNullableString(
    "gate_admissibility_record.restore_drill_ref",
    input.restore_drill_ref,
  );
  const restoreCheckpointRef = requireVerificationSuiteNullableString(
    "gate_admissibility_record.restore_checkpoint_ref",
    input.restore_checkpoint_ref,
  );
  const deterministicGoldenPackRef = requireVerificationSuiteNullableString(
    "gate_admissibility_record.deterministic_golden_pack_ref",
    input.deterministic_golden_pack_ref,
  );
  assertSuiteSpecificDimensions({
    deterministicGoldenPackRef,
    migrationPlanRef,
    restoreCheckpointRef,
    restoreDrillRef,
    suiteFamily,
    supportedClientWindowRef,
  });
  const coverageContract = normalizeCoverageContract(
    suiteFamily,
    input.authority_sandbox_coverage_contract_or_null,
    {
      candidate_identity_hash: candidateIdentityHash,
      compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
      migration_plan_ref_or_null: migrationPlanRef,
      reader_window_state: schemaReaderWindowContract.window_state,
      schema_bundle_hash: schemaBundleHash,
      supported_client_window_ref_or_null: supportedClientWindowRef,
    },
  );
  const candidateIdentityMatch = requireBoolean(
    "gate_admissibility_record.candidate_identity_match",
    input.candidate_identity_match,
  );
  const freshnessVerified = requireBoolean(
    "gate_admissibility_record.freshness_verified",
    input.freshness_verified,
  );
  const contractWindowConsistent = requireBoolean(
    "gate_admissibility_record.contract_window_consistent",
    input.contract_window_consistent,
  );
  const rerunScopePreserved = requireBoolean(
    "gate_admissibility_record.rerun_scope_preserved",
    input.rerun_scope_preserved,
  );
  const quarantineState = requireQuarantineState(input.quarantine_state);
  const admissibilityState = requireAdmissibilityState(input.admissibility_state);
  const reasonCodes = canonicalizeVerificationSuiteStringSet(
    "gate_admissibility_record.reason_codes",
    input.reason_codes,
  );
  assertAdmissibilityPolicy({
    candidateIdentityMatch,
    compatibilityGate,
    contractWindowConsistent,
    freshnessVerified,
    quarantineState,
    reasonCodes,
    rerunScopePreserved,
    state: admissibilityState,
    suiteFamily,
  });

  return {
    admissibility_id: requireVerificationSuiteString(
      "gate_admissibility_record.admissibility_id",
      input.admissibility_id,
    ),
    suite_result_ref: requireVerificationSuiteString(
      "gate_admissibility_record.suite_result_ref",
      input.suite_result_ref,
    ),
    suite_family: suiteFamily,
    candidate_environment_ref: candidateIdentityContract.candidate_environment_ref,
    artifact_digest: candidateIdentityContract.artifact_digest,
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_contract: cloneReleaseCandidateIdentityContract(
      candidateIdentityContract,
    ),
    schema_bundle_hash: schemaBundleHash,
    schema_reader_window_contract: cloneSchemaReaderWindowContract(
      schemaReaderWindowContract,
    ),
    schema_bundle_compatibility_gate_contract:
      cloneSchemaBundleCompatibilityGateContract(compatibilityGate),
    migration_plan_ref: migrationPlanRef,
    authority_sandbox_coverage_contract_or_null:
      coverageContract as GateAdmissibilityRecordRecord["authority_sandbox_coverage_contract_or_null"],
    supported_client_window_ref: supportedClientWindowRef,
    restore_drill_ref: restoreDrillRef,
    restore_checkpoint_ref: restoreCheckpointRef,
    deterministic_golden_pack_ref: deterministicGoldenPackRef,
    candidate_identity_match: candidateIdentityMatch,
    freshness_verified: freshnessVerified,
    contract_window_consistent: contractWindowConsistent,
    rerun_scope_preserved: rerunScopePreserved,
    quarantine_state: quarantineState,
    admissibility_state: admissibilityState,
    evaluated_at: requireUtcInstant(
      "gate_admissibility_record.evaluated_at",
      input.evaluated_at,
    ),
    reason_codes: reasonCodes,
  };
}

export type BuildGateAdmissibilityRecordInput = {
  admissibility_id: unknown;
  suite_result_ref: unknown;
  suite_family: unknown;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
  migration_plan_ref?: unknown;
  authority_sandbox_coverage_contract_or_null?: unknown;
  supported_client_window_ref?: unknown;
  restore_drill_ref?: unknown;
  restore_checkpoint_ref?: unknown;
  deterministic_golden_pack_ref?: unknown;
  candidate_identity_match: unknown;
  freshness_verified: unknown;
  contract_window_consistent: unknown;
  rerun_scope_preserved: unknown;
  quarantine_state: unknown;
  admissibility_state: unknown;
  evaluated_at: unknown;
  reason_codes?: unknown;
};

export function buildGateAdmissibilityRecord(
  input: BuildGateAdmissibilityRecordInput,
): GateAdmissibilityRecordRecord {
  const candidate = assertGateCandidateIdentityContract(
    input.candidate_identity_contract,
  );
  return normalizeGateAdmissibilityRecord({
    admissibility_id: input.admissibility_id,
    suite_result_ref: input.suite_result_ref,
    suite_family: input.suite_family,
    candidate_environment_ref: candidate.candidate_environment_ref,
    artifact_digest: candidate.artifact_digest,
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    schema_bundle_hash: candidate.schema_bundle_hash,
    schema_reader_window_contract: input.schema_reader_window_contract,
    schema_bundle_compatibility_gate_contract:
      input.schema_bundle_compatibility_gate_contract,
    migration_plan_ref:
      typeof input.migration_plan_ref === "undefined"
        ? candidate.migration_plan_ref_or_null
        : input.migration_plan_ref,
    authority_sandbox_coverage_contract_or_null:
      input.authority_sandbox_coverage_contract_or_null ?? null,
    supported_client_window_ref:
      typeof input.supported_client_window_ref === "undefined"
        ? candidate.supported_client_window_ref_or_null
        : input.supported_client_window_ref,
    restore_drill_ref: input.restore_drill_ref ?? null,
    restore_checkpoint_ref: input.restore_checkpoint_ref ?? null,
    deterministic_golden_pack_ref: input.deterministic_golden_pack_ref ?? null,
    candidate_identity_match: input.candidate_identity_match,
    freshness_verified: input.freshness_verified,
    contract_window_consistent: input.contract_window_consistent,
    rerun_scope_preserved: input.rerun_scope_preserved,
    quarantine_state: input.quarantine_state,
    admissibility_state: input.admissibility_state,
    evaluated_at: input.evaluated_at,
    reason_codes: input.reason_codes ?? [],
  });
}

export type BuildGateAdmissibilityRecordFromSuiteResultInput = {
  admissibility_id: unknown;
  suite_result: VerificationSuiteResultRecord;
  candidate_identity_match: boolean;
  freshness_verified: boolean;
  contract_window_consistent: boolean;
  rerun_scope_preserved: boolean;
  quarantine_state: GateAdmissibilityQuarantineState;
  admissibility_state: GateAdmissibilityState;
  evaluated_at: unknown;
  reason_codes?: unknown;
};

export function buildGateAdmissibilityRecordFromSuiteResult(
  input: BuildGateAdmissibilityRecordFromSuiteResultInput,
): GateAdmissibilityRecordRecord {
  return normalizeGateAdmissibilityRecord({
    admissibility_id: input.admissibility_id,
    suite_result_ref: verificationSuiteResultRef(input.suite_result),
    suite_family: input.suite_result.suite_family,
    candidate_environment_ref: input.suite_result.candidate_environment_ref,
    artifact_digest: input.suite_result.artifact_digest,
    candidate_identity_hash: input.suite_result.candidate_identity_hash,
    candidate_identity_contract: input.suite_result.candidate_identity_contract,
    schema_bundle_hash: input.suite_result.schema_bundle_hash,
    schema_reader_window_contract: input.suite_result.schema_reader_window_contract,
    schema_bundle_compatibility_gate_contract:
      input.suite_result.schema_bundle_compatibility_gate_contract,
    migration_plan_ref: input.suite_result.migration_plan_ref,
    authority_sandbox_coverage_contract_or_null:
      input.suite_result.authority_sandbox_coverage_contract_or_null,
    supported_client_window_ref: input.suite_result.supported_client_window_ref,
    restore_drill_ref: input.suite_result.restore_drill_ref,
    restore_checkpoint_ref: input.suite_result.restore_checkpoint_ref,
    deterministic_golden_pack_ref: input.suite_result.deterministic_golden_pack_ref,
    candidate_identity_match: input.candidate_identity_match,
    freshness_verified: input.freshness_verified,
    contract_window_consistent: input.contract_window_consistent,
    rerun_scope_preserved: input.rerun_scope_preserved,
    quarantine_state: input.quarantine_state,
    admissibility_state: input.admissibility_state,
    evaluated_at: input.evaluated_at,
    reason_codes: input.reason_codes ?? [],
  });
}

export function assertGateAdmissibilityRecord(input: unknown) {
  return normalizeGateAdmissibilityRecord(input);
}

export function cloneGateAdmissibilityRecord(record: GateAdmissibilityRecordRecord) {
  return structuredClone(normalizeGateAdmissibilityRecord(record));
}

export function gateAdmissibilityRecordRef(
  record: Pick<GateAdmissibilityRecordRecord, "admissibility_id">,
) {
  return record.admissibility_id;
}
