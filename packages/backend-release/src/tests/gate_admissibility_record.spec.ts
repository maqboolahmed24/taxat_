import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertGateAdmissibilityRecord,
  buildVerificationSuiteResult,
  buildSchemaReaderWindowContract,
  assembleSchemaBundleCompatibilityGateContract,
  deriveCandidateIdentityContract,
  evaluateGateAdmissibilityRecord,
  GateAdmissibilityRecordModelError,
  GateAdmissibilityRecordRepository,
  type ReleaseCandidateIdentityContractRecord,
  type VerificationSuiteFamily,
} from "../index.ts";

function candidate(input: {
  id: string;
  supported_client_window_ref_or_null?: string | null;
}) {
  return deriveCandidateIdentityContract({
    artifact_digest: `sha256:pc0223adm${input.id.padEnd(55, "1")}`,
    build_artifact_ref: `build://pc0223/admissibility/${input.id}`,
    candidate_environment_ref: `candidate-env://pc0223/admissibility/${input.id}`,
    config_bundle_hash: `config-bundle-hash.pc0223.admissibility.${input.id}`,
    enabled_provider_profile_refs: [],
    migration_plan_ref_or_null: null,
    schema_bundle_hash: `schema-bundle-hash.pc0223.admissibility.${input.id}`,
    supported_client_window_ref_or_null:
      input.supported_client_window_ref_or_null ?? null,
  });
}

function suite(input: {
  candidate_identity_contract?: ReleaseCandidateIdentityContractRecord;
  suite_family?: VerificationSuiteFamily;
  result_state?: "PASSED" | "FAILED" | "ERROR";
  restore?: boolean;
  deterministic?: boolean;
}) {
  const candidateIdentity = input.candidate_identity_contract ?? candidate({ id: "base" });
  const window = buildSchemaReaderWindowContract({
    compatibility_window_ref: `compat-window://pc0223/admissibility/${candidateIdentity.build_artifact_ref}`,
    writer_schema_bundle_hash: candidateIdentity.schema_bundle_hash,
    supported_reader_schema_bundle_hashes: [candidateIdentity.schema_bundle_hash],
    protected_historical_schema_bundle_hashes: [],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
  });
  const gate = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidateIdentity,
    schema_reader_window_contract: window,
  });
  return buildVerificationSuiteResult({
    candidate_identity_contract: candidateIdentity,
    deterministic_golden_pack_ref: input.deterministic
      ? "deterministic-golden-pack://pc0223/admissibility"
      : null,
    executed_at: "2026-05-05T16:20:00Z",
    restore_checkpoint_ref: input.restore
      ? "recovery-checkpoint://pc0223/admissibility"
      : null,
    restore_drill_ref: input.restore
      ? "restore-drill://pc0223/admissibility"
      : null,
    result_state: input.result_state ?? "PASSED",
    result_summary_ref: "suite-summary://pc0223/admissibility",
    schema_bundle_compatibility_gate_contract: gate,
    schema_reader_window_contract: window,
    suite_family: input.suite_family ?? "SCHEMA_COMPATIBILITY",
    suite_result_id: `suite-result://pc0223/admissibility/${input.suite_family ?? "schema"}`,
    test_run_identifiers: ["run://pc0223/admissibility"],
  });
}

test("derives schema-valid admissible records from passed first-class suite results", async () => {
  const result = suite({});
  const record = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/schema",
    evaluated_at: "2026-05-05T16:25:00Z",
    suite_result: result,
  });

  expect(record.admissibility_state).toBe("ADMISSIBLE");
  expect(record.reason_codes).toEqual([]);
  await validateContractSchema("gate_admissibility_record", record);
});

test("manual waiver and stale evidence force inadmissible posture with canonical reason codes", async () => {
  const result = suite({});
  const record = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/waived",
    evaluated_at: "2026-05-05T16:30:00Z",
    freshness_verified: false,
    quarantine_state: "MANUAL_WAIVER",
    reason_codes: ["Z_CUSTOM", "A_CUSTOM"],
    suite_result: result,
  });

  expect(record.admissibility_state).toBe("INADMISSIBLE");
  expect(record.reason_codes).toEqual([
    "A_CUSTOM",
    "MANUAL_WAIVER",
    "STALE_EVIDENCE",
    "Z_CUSTOM",
  ]);
  await validateContractSchema("gate_admissibility_record", record);
});

test("candidate drift, contract-window drift, and rerun drift force inadmissible reasons", async () => {
  const result = suite({});
  const record = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/drift",
    candidate_identity_match: false,
    contract_window_consistent: false,
    evaluated_at: "2026-05-05T16:32:00Z",
    quarantine_state: "FLAKE_QUARANTINED",
    rerun_scope_preserved: false,
    suite_result: result,
  });

  expect(record.admissibility_state).toBe("INADMISSIBLE");
  expect(record.reason_codes).toEqual([
    "CANDIDATE_IDENTITY_MISMATCH",
    "CONTRACT_WINDOW_DRIFT",
    "FLAKE_QUARANTINED",
    "RERUN_SCOPE_NOT_PRESERVED",
  ]);
  await validateContractSchema("gate_admissibility_record", record);
});

test("non-passed suite results cannot become admissible release evidence", () => {
  const result = suite({ result_state: "FAILED" });
  const record = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/failed",
    evaluated_at: "2026-05-05T16:35:00Z",
    suite_result: result,
  });

  expect(record.admissibility_state).toBe("INADMISSIBLE");
  expect(record.reason_codes).toEqual(["SUITE_RESULT_NOT_PASSED"]);
});

test("enforces restore, deterministic, and operator-client admissibility dimensions", async () => {
  const restoreRecord = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/restore",
    evaluated_at: "2026-05-05T16:40:00Z",
    suite_result: suite({ restore: true, suite_family: "RESTORE_DRILL" }),
  });
  await validateContractSchema("gate_admissibility_record", restoreRecord);

  const deterministicRecord = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/deterministic",
    evaluated_at: "2026-05-05T16:45:00Z",
    suite_result: suite({
      deterministic: true,
      suite_family: "DETERMINISTIC_AND_STATE_MACHINE",
    }),
  });
  await validateContractSchema("gate_admissibility_record", deterministicRecord);

  const operatorCandidate = candidate({
    id: "operator",
    supported_client_window_ref_or_null: "client-window://pc0223/admissibility",
  });
  const operatorRecord = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/operator",
    evaluated_at: "2026-05-05T16:50:00Z",
    suite_result: suite({
      candidate_identity_contract: operatorCandidate,
      suite_family: "OPERATOR_CLIENT",
    }),
  });
  await validateContractSchema("gate_admissibility_record", operatorRecord);
});

test("rejects impossible admissible records and authority-sandbox records without coverage", () => {
  const result = suite({});
  const admissible = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/impossible",
    evaluated_at: "2026-05-05T16:55:00Z",
    suite_result: result,
  });

  expect(() =>
    assertGateAdmissibilityRecord({
      ...admissible,
      candidate_identity_match: false,
    }),
  ).toThrow(GateAdmissibilityRecordModelError);

  expect(() =>
    evaluateGateAdmissibilityRecord({
      admissibility_id: "gate-admissibility://pc0223/authority",
      evaluated_at: "2026-05-05T17:00:00Z",
      suite_result: suite({ suite_family: "AUTHORITY_SANDBOX" }),
    }),
  ).toThrow(/AUTHORITY_SANDBOX/);
});

test("repository persists immutable admissibility records by admissibility_id", async () => {
  const repository = new GateAdmissibilityRecordRepository({
    validate_contract_schema: validateContractSchema,
  });
  const result = suite({});
  const record = evaluateGateAdmissibilityRecord({
    admissibility_id: "gate-admissibility://pc0223/repository",
    evaluated_at: "2026-05-05T17:05:00Z",
    suite_result: result,
  });

  const stored = await repository.persistGateAdmissibilityRecord({
    gate_admissibility_record: record,
    persisted_at: "2026-05-05T17:06:00Z",
  });
  const idempotent = await repository.persistGateAdmissibilityRecord({
    gate_admissibility_record: record,
    persisted_at: "2026-05-05T17:07:00Z",
  });

  expect(stored.admissibility_id).toBe(record.admissibility_id);
  expect(idempotent.persisted_at).toBe(stored.persisted_at);
  await expect(
    repository.listGateAdmissibilityRecords({
      admissibility_state: "ADMISSIBLE",
      suite_result_ref: result.suite_result_id,
    }),
  ).resolves.toHaveLength(1);
});
