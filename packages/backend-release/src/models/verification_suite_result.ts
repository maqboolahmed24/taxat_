import type { VerificationSuiteResult } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
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
  requireUtcInstant,
  requireVerificationSuiteFamily,
  requireVerificationSuiteNullableString,
  requireVerificationSuiteString,
  type VerificationSuiteFamily,
} from "../services/canonicalize_verification_suite_scope.ts";

export type VerificationSuiteResultRecord = VerificationSuiteResult;
export type VerificationSuiteResultState =
  VerificationSuiteResultRecord["result_state"];

export const VERIFICATION_SUITE_RESULT_SCHEMA_ID =
  "https://taxat.dev/schemas/verification_suite_result.schema.json";

export type VerificationSuiteResultModelErrorCode =
  | "VERIFICATION_SUITE_RESULT_FIELD_INVALID"
  | "VERIFICATION_SUITE_RESULT_CANDIDATE_DRIFT"
  | "VERIFICATION_SUITE_RESULT_WINDOW_DRIFT"
  | "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID"
  | "VERIFICATION_SUITE_RESULT_PASSED_POSTURE_INVALID";

export class VerificationSuiteResultModelError extends Error {
  readonly code: VerificationSuiteResultModelErrorCode;

  constructor(code: VerificationSuiteResultModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "VerificationSuiteResultModelError";
    this.code = code;
  }
}

function assertSuiteResult(
  condition: unknown,
  code: VerificationSuiteResultModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new VerificationSuiteResultModelError(code, detail);
  }
}

function modelErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function assertSuiteCandidateIdentityContract(
  value: unknown,
  expectedMirrors?: Parameters<typeof assertReleaseCandidateIdentityContract>[1],
) {
  try {
    return assertReleaseCandidateIdentityContract(value, expectedMirrors);
  } catch (error) {
    throw new VerificationSuiteResultModelError(
      "VERIFICATION_SUITE_RESULT_CANDIDATE_DRIFT",
      `candidate_identity_contract must mirror suite result scope: ${modelErrorDetail(error)}`,
    );
  }
}

function requireResultState(value: unknown): VerificationSuiteResultState {
  assertSuiteResult(
    value === "PASSED" || value === "FAILED" || value === "ERROR",
    "VERIFICATION_SUITE_RESULT_FIELD_INVALID",
    "result_state must be PASSED, FAILED, or ERROR",
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
    enabled_provider_profile_refs: readonly string[];
  },
) {
  if (suiteFamily !== "AUTHORITY_SANDBOX") {
    assertSuiteResult(
      value === null || typeof value === "undefined",
      "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
      "authority_sandbox_coverage_contract_or_null must stay null outside AUTHORITY_SANDBOX",
    );
    return null;
  }
  assertSuiteResult(
    isPlainRecord(value),
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "AUTHORITY_SANDBOX suite results require authority_sandbox_coverage_contract_or_null",
  );
  assertSuiteResult(
    authoritySandboxCoverageHash(value) !== null,
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
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
    assertSuiteResult(
      actual === expectedValue,
      "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
      `authority_sandbox_coverage_contract_or_null.${field} must mirror suite scope`,
    );
  }
  const enabledProfiles = canonicalizeVerificationSuiteStringSet(
    "authority_sandbox_coverage_contract_or_null.enabled_provider_profile_refs",
    value.enabled_provider_profile_refs,
    false,
  );
  assertSuiteResult(
    enabledProfiles.length === expected.enabled_provider_profile_refs.length &&
      enabledProfiles.every(
        (entry, index) => entry === expected.enabled_provider_profile_refs[index],
      ),
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "authority sandbox coverage enabled provider profiles must mirror suite scope",
  );
  return cloneUnknownRecord(value);
}

function assertSuiteSpecificDimensions(input: {
  suiteFamily: VerificationSuiteFamily;
  migrationPlanRef: string | null;
  supportedClientWindowRef: string | null;
  restoreDrillRef: string | null;
  restoreCheckpointRef: string | null;
  deterministicGoldenPackRef: string | null;
  enabledProviderProfileRefs: readonly string[];
}) {
  const {
    suiteFamily,
    migrationPlanRef,
    supportedClientWindowRef,
    restoreDrillRef,
    restoreCheckpointRef,
    deterministicGoldenPackRef,
    enabledProviderProfileRefs,
  } = input;
  assertSuiteResult(
    suiteFamily !== "MIGRATION_VERIFICATION" || migrationPlanRef !== null,
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "MIGRATION_VERIFICATION suite results require migration_plan_ref",
  );
  assertSuiteResult(
    suiteFamily !== "AUTHORITY_SANDBOX" || enabledProviderProfileRefs.length > 0,
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "AUTHORITY_SANDBOX suite results require enabled_provider_profile_refs",
  );
  assertSuiteResult(
    suiteFamily !== "OPERATOR_CLIENT" || supportedClientWindowRef !== null,
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "OPERATOR_CLIENT suite results require supported_client_window_ref",
  );
  assertSuiteResult(
    (restoreDrillRef === null) === (restoreCheckpointRef === null),
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "restore_drill_ref and restore_checkpoint_ref must be populated or cleared together",
  );
  assertSuiteResult(
    suiteFamily === "RESTORE_DRILL"
      ? restoreDrillRef !== null && restoreCheckpointRef !== null
      : restoreDrillRef === null && restoreCheckpointRef === null,
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "restore drill refs must stay limited to RESTORE_DRILL suite results",
  );
  assertSuiteResult(
    suiteFamily === "DETERMINISTIC_AND_STATE_MACHINE"
      ? deterministicGoldenPackRef !== null
      : deterministicGoldenPackRef === null,
    "VERIFICATION_SUITE_RESULT_SUITE_DIMENSION_INVALID",
    "deterministic_golden_pack_ref must stay limited to DETERMINISTIC_AND_STATE_MACHINE suite results",
  );
}

function assertPassedCompatibilityPosture(input: {
  suiteFamily: VerificationSuiteFamily;
  resultState: VerificationSuiteResultState;
  compatibilityGate: SchemaBundleCompatibilityGateContractRecord;
}) {
  if (input.resultState !== "PASSED") {
    return;
  }
  if (input.suiteFamily === "SCHEMA_COMPATIBILITY") {
    assertSuiteResult(
      input.compatibilityGate.historical_manifest_guard_state === "PROTECTED" &&
        input.compatibilityGate.replay_restore_guard_state === "PROTECTED",
      "VERIFICATION_SUITE_RESULT_PASSED_POSTURE_INVALID",
      "passed SCHEMA_COMPATIBILITY results require protected historical-manifest and replay/restore guards",
    );
  }
  if (input.suiteFamily === "MIGRATION_VERIFICATION") {
    assertSuiteResult(
      input.compatibilityGate.migration_chronology_state !== "NOT_REQUIRED",
      "VERIFICATION_SUITE_RESULT_PASSED_POSTURE_INVALID",
      "passed MIGRATION_VERIFICATION results require migration chronology evidence",
    );
  }
  if (input.suiteFamily === "OPERATOR_CLIENT") {
    assertSuiteResult(
      input.compatibilityGate.native_client_window_state === "VERIFIED_COMPATIBLE",
      "VERIFICATION_SUITE_RESULT_PASSED_POSTURE_INVALID",
      "passed OPERATOR_CLIENT results require verified native-client compatibility",
    );
  }
}

export function normalizeVerificationSuiteResult(
  input: unknown,
): VerificationSuiteResultRecord {
  assertSuiteResult(
    isPlainRecord(input),
    "VERIFICATION_SUITE_RESULT_FIELD_INVALID",
    "verification_suite_result must be an object",
  );
  const suiteFamily = requireVerificationSuiteFamily(input.suite_family);
  const suiteResultId = requireVerificationSuiteString(
    "verification_suite_result.suite_result_id",
    input.suite_result_id,
  );
  const migrationPlanRef = requireVerificationSuiteNullableString(
    "verification_suite_result.migration_plan_ref",
    input.migration_plan_ref,
  );
  const supportedClientWindowRef = requireVerificationSuiteNullableString(
    "verification_suite_result.supported_client_window_ref",
    input.supported_client_window_ref,
  );
  const candidateIdentityHash = requireVerificationSuiteString(
    "verification_suite_result.candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const schemaBundleHash = requireVerificationSuiteString(
    "verification_suite_result.schema_bundle_hash",
    input.schema_bundle_hash,
  );
  const candidateIdentityContract = assertSuiteCandidateIdentityContract(
    input.candidate_identity_contract,
    {
      candidate_environment_ref: requireVerificationSuiteString(
        "verification_suite_result.candidate_environment_ref",
        input.candidate_environment_ref,
      ),
      build_artifact_ref: requireVerificationSuiteString(
        "verification_suite_result.build_artifact_ref",
        input.build_artifact_ref,
      ),
      artifact_digest: requireVerificationSuiteString(
        "verification_suite_result.artifact_digest",
        input.artifact_digest,
      ),
      candidate_identity_hash: candidateIdentityHash,
      schema_bundle_hash: schemaBundleHash,
      config_bundle_hash: requireVerificationSuiteString(
        "verification_suite_result.config_bundle_hash",
        input.config_bundle_hash,
      ),
      migration_plan_ref_or_null: migrationPlanRef,
      supported_client_window_ref_or_null: supportedClientWindowRef,
    },
  );
  const enabledProviderProfileRefs = canonicalizeVerificationSuiteStringSet(
    "verification_suite_result.enabled_provider_profile_refs",
    input.enabled_provider_profile_refs,
  );
  assertSuiteResult(
    enabledProviderProfileRefs.length ===
      candidateIdentityContract.enabled_provider_profile_refs.length &&
      enabledProviderProfileRefs.every(
        (entry, index) =>
          entry === candidateIdentityContract.enabled_provider_profile_refs[index],
      ),
    "VERIFICATION_SUITE_RESULT_CANDIDATE_DRIFT",
    "enabled_provider_profile_refs must mirror candidate_identity_contract",
  );
  const schemaReaderWindowContract = assertSchemaReaderWindowContract(
    input.schema_reader_window_contract,
  );
  assertSuiteResult(
    schemaReaderWindowContract.writer_schema_bundle_hash === schemaBundleHash,
    "VERIFICATION_SUITE_RESULT_WINDOW_DRIFT",
    "schema_reader_window_contract.writer_schema_bundle_hash must mirror schema_bundle_hash",
  );
  const compatibilityGate = assertSchemaBundleCompatibilityGateContract(
    input.schema_bundle_compatibility_gate_contract,
  );
  assertSuiteResult(
    compatibilityGate.candidate_identity_hash === candidateIdentityHash &&
      compatibilityGate.schema_bundle_hash === schemaBundleHash &&
      compatibilityGate.migration_plan_ref_or_null === migrationPlanRef &&
      compatibilityGate.supported_client_window_ref_or_null ===
        supportedClientWindowRef &&
      compatibilityGate.compatibility_window_ref ===
        schemaReaderWindowContract.compatibility_window_ref &&
      compatibilityGate.reader_window_state ===
        schemaReaderWindowContract.window_state,
    "VERIFICATION_SUITE_RESULT_WINDOW_DRIFT",
    "schema_bundle_compatibility_gate_contract must mirror candidate, migration, client, and reader-window scope",
  );
  const restoreDrillRef = requireVerificationSuiteNullableString(
    "verification_suite_result.restore_drill_ref",
    input.restore_drill_ref,
  );
  const restoreCheckpointRef = requireVerificationSuiteNullableString(
    "verification_suite_result.restore_checkpoint_ref",
    input.restore_checkpoint_ref,
  );
  const deterministicGoldenPackRef = requireVerificationSuiteNullableString(
    "verification_suite_result.deterministic_golden_pack_ref",
    input.deterministic_golden_pack_ref,
  );
  assertSuiteSpecificDimensions({
    deterministicGoldenPackRef,
    enabledProviderProfileRefs,
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
      enabled_provider_profile_refs: enabledProviderProfileRefs,
      migration_plan_ref_or_null: migrationPlanRef,
      reader_window_state: schemaReaderWindowContract.window_state,
      schema_bundle_hash: schemaBundleHash,
      supported_client_window_ref_or_null: supportedClientWindowRef,
    },
  );
  const resultState = requireResultState(input.result_state);
  assertPassedCompatibilityPosture({
    compatibilityGate,
    resultState,
    suiteFamily,
  });

  return {
    suite_result_id: suiteResultId,
    suite_family: suiteFamily,
    candidate_environment_ref: candidateIdentityContract.candidate_environment_ref,
    build_artifact_ref: candidateIdentityContract.build_artifact_ref,
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
    config_bundle_hash: candidateIdentityContract.config_bundle_hash,
    migration_plan_ref: migrationPlanRef,
    enabled_provider_profile_refs: enabledProviderProfileRefs,
    authority_sandbox_coverage_contract_or_null:
      coverageContract as VerificationSuiteResultRecord["authority_sandbox_coverage_contract_or_null"],
    supported_client_window_ref: supportedClientWindowRef,
    restore_drill_ref: restoreDrillRef,
    restore_checkpoint_ref: restoreCheckpointRef,
    deterministic_golden_pack_ref: deterministicGoldenPackRef,
    test_run_identifiers: canonicalizeVerificationSuiteStringSet(
      "verification_suite_result.test_run_identifiers",
      input.test_run_identifiers,
      false,
    ),
    result_state: resultState,
    result_summary_ref: requireVerificationSuiteString(
      "verification_suite_result.result_summary_ref",
      input.result_summary_ref,
    ),
    executed_at: requireUtcInstant(
      "verification_suite_result.executed_at",
      input.executed_at,
    ),
  };
}

export type BuildVerificationSuiteResultInput = {
  suite_result_id: unknown;
  suite_family: unknown;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
  authority_sandbox_coverage_contract_or_null?: unknown;
  restore_drill_ref?: unknown;
  restore_checkpoint_ref?: unknown;
  deterministic_golden_pack_ref?: unknown;
  test_run_identifiers: unknown;
  result_state: unknown;
  result_summary_ref: unknown;
  executed_at: unknown;
};

export function buildVerificationSuiteResult(
  input: BuildVerificationSuiteResultInput,
): VerificationSuiteResultRecord {
  const candidate = assertSuiteCandidateIdentityContract(
    input.candidate_identity_contract,
  );
  return normalizeVerificationSuiteResult({
    suite_result_id: input.suite_result_id,
    suite_family: input.suite_family,
    candidate_environment_ref: candidate.candidate_environment_ref,
    build_artifact_ref: candidate.build_artifact_ref,
    artifact_digest: candidate.artifact_digest,
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    schema_bundle_hash: candidate.schema_bundle_hash,
    schema_reader_window_contract: input.schema_reader_window_contract,
    schema_bundle_compatibility_gate_contract:
      input.schema_bundle_compatibility_gate_contract,
    config_bundle_hash: candidate.config_bundle_hash,
    migration_plan_ref: candidate.migration_plan_ref_or_null,
    enabled_provider_profile_refs: candidate.enabled_provider_profile_refs,
    authority_sandbox_coverage_contract_or_null:
      input.authority_sandbox_coverage_contract_or_null ?? null,
    supported_client_window_ref: candidate.supported_client_window_ref_or_null,
    restore_drill_ref: input.restore_drill_ref ?? null,
    restore_checkpoint_ref: input.restore_checkpoint_ref ?? null,
    deterministic_golden_pack_ref: input.deterministic_golden_pack_ref ?? null,
    test_run_identifiers: input.test_run_identifiers,
    result_state: input.result_state,
    result_summary_ref: input.result_summary_ref,
    executed_at: input.executed_at,
  });
}

export function assertVerificationSuiteResultRecord(input: unknown) {
  return normalizeVerificationSuiteResult(input);
}

export function cloneVerificationSuiteResultRecord(
  record: VerificationSuiteResultRecord,
) {
  return structuredClone(normalizeVerificationSuiteResult(record));
}

export function verificationSuiteResultRef(
  record: Pick<VerificationSuiteResultRecord, "suite_result_id">,
) {
  return record.suite_result_id;
}
