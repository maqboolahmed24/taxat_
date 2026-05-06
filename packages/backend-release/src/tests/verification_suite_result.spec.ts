import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assembleSchemaBundleCompatibilityGateContract,
  assertVerificationSuiteResultRecord,
  buildSchemaReaderWindowContract,
  buildVerificationSuiteResult,
  deriveCandidateIdentityContract,
  VerificationSuiteResultModelError,
  VerificationSuiteResultRepository,
  type ReleaseCandidateIdentityContractRecord,
  type SchemaBundleCompatibilityGateContractRecord,
  type SchemaReaderWindowContractRecord,
  type VerificationSuiteFamily,
} from "../index.ts";

function candidate(input: {
  id: string;
  migration_plan_ref_or_null?: string | null;
  enabled_provider_profile_refs?: string[];
  supported_client_window_ref_or_null?: string | null;
}) {
  return deriveCandidateIdentityContract({
    artifact_digest: `sha256:pc0223${input.id.padEnd(58, "0")}`,
    build_artifact_ref: `build://pc0223/${input.id}`,
    candidate_environment_ref: `candidate-env://pc0223/${input.id}`,
    config_bundle_hash: `config-bundle-hash.pc0223.${input.id}`,
    enabled_provider_profile_refs: input.enabled_provider_profile_refs ?? [],
    migration_plan_ref_or_null: input.migration_plan_ref_or_null ?? null,
    schema_bundle_hash: `schema-bundle-hash.pc0223.${input.id}`,
    supported_client_window_ref_or_null:
      input.supported_client_window_ref_or_null ?? null,
  });
}

function readerWindow(candidateIdentity: ReleaseCandidateIdentityContractRecord) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: `compat-window://pc0223/${candidateIdentity.build_artifact_ref}`,
    writer_schema_bundle_hash: candidateIdentity.schema_bundle_hash,
    supported_reader_schema_bundle_hashes: [
      candidateIdentity.schema_bundle_hash,
      `${candidateIdentity.schema_bundle_hash}.previous`,
    ],
    protected_historical_schema_bundle_hashes: [],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
  });
}

function compatibilityGate(input: {
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
}) {
  return assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: input.candidate_identity_contract,
    migration_ledger_refs:
      input.candidate_identity_contract.migration_plan_ref_or_null === null
        ? []
        : [`schema-migration-ledger://pc0223/${input.candidate_identity_contract.build_artifact_ref}`],
    schema_reader_window_contract: input.schema_reader_window_contract,
  });
}

function suiteFixture(input: {
  suite_family?: VerificationSuiteFamily;
  candidate_identity_contract?: ReleaseCandidateIdentityContractRecord;
  schema_reader_window_contract?: SchemaReaderWindowContractRecord;
  schema_bundle_compatibility_gate_contract?: SchemaBundleCompatibilityGateContractRecord;
  deterministic_golden_pack_ref?: string | null;
  restore_drill_ref?: string | null;
  restore_checkpoint_ref?: string | null;
  authority_sandbox_coverage_contract_or_null?: unknown;
  test_run_identifiers?: string[];
}) {
  const candidateIdentity = input.candidate_identity_contract ?? candidate({ id: "base" });
  const window = input.schema_reader_window_contract ?? readerWindow(candidateIdentity);
  const gate =
    input.schema_bundle_compatibility_gate_contract ??
    compatibilityGate({
      candidate_identity_contract: candidateIdentity,
      schema_reader_window_contract: window,
    });
  return buildVerificationSuiteResult({
    authority_sandbox_coverage_contract_or_null:
      input.authority_sandbox_coverage_contract_or_null,
    candidate_identity_contract: candidateIdentity,
    deterministic_golden_pack_ref: input.deterministic_golden_pack_ref,
    executed_at: "2026-05-05T16:00:00Z",
    restore_checkpoint_ref: input.restore_checkpoint_ref,
    restore_drill_ref: input.restore_drill_ref,
    result_state: "PASSED",
    result_summary_ref: `suite-summary://pc0223/${input.suite_family ?? "SCHEMA_COMPATIBILITY"}`,
    schema_bundle_compatibility_gate_contract: gate,
    schema_reader_window_contract: window,
    suite_family: input.suite_family ?? "SCHEMA_COMPATIBILITY",
    suite_result_id: `suite-result://pc0223/${input.suite_family ?? "SCHEMA_COMPATIBILITY"}`,
    test_run_identifiers: input.test_run_identifiers ?? ["run://pc0223/2", "run://pc0223/1"],
  });
}

test("persists schema-valid suite results with canonical test-run and provider arrays", async () => {
  const result = suiteFixture({});

  expect(result.test_run_identifiers).toEqual([
    "run://pc0223/1",
    "run://pc0223/2",
  ]);
  expect(result.enabled_provider_profile_refs).toEqual([]);
  await validateContractSchema("verification_suite_result", result);
});

test("fails closed when nested candidate identity drifts from top-level suite fields", () => {
  const result = suiteFixture({});

  expect(() =>
    assertVerificationSuiteResultRecord({
      ...result,
      candidate_identity_contract: {
        ...result.candidate_identity_contract,
        schema_bundle_hash: "schema-bundle-hash.pc0223.drift",
      },
    }),
  ).toThrow(VerificationSuiteResultModelError);
});

test("enforces deterministic golden-pack and restore-drill pairing dimensions", async () => {
  const deterministicCandidate = candidate({ id: "deterministic" });
  const deterministic = suiteFixture({
    candidate_identity_contract: deterministicCandidate,
    deterministic_golden_pack_ref: "deterministic-golden-pack://pc0223/1",
    suite_family: "DETERMINISTIC_AND_STATE_MACHINE",
  });
  await validateContractSchema("verification_suite_result", deterministic);
  expect(() =>
    suiteFixture({
      candidate_identity_contract: deterministicCandidate,
      suite_family: "DETERMINISTIC_AND_STATE_MACHINE",
    }),
  ).toThrow(/deterministic_golden_pack_ref/);

  const restoreCandidate = candidate({ id: "restore" });
  const restore = suiteFixture({
    candidate_identity_contract: restoreCandidate,
    restore_checkpoint_ref: "recovery-checkpoint://pc0223/1",
    restore_drill_ref: "restore-drill://pc0223/1",
    suite_family: "RESTORE_DRILL",
  });
  await validateContractSchema("verification_suite_result", restore);
  expect(() =>
    suiteFixture({
      candidate_identity_contract: restoreCandidate,
      restore_drill_ref: "restore-drill://pc0223/1",
      suite_family: "RESTORE_DRILL",
    }),
  ).toThrow(/restore_drill_ref and restore_checkpoint_ref/);

  expect(() =>
    suiteFixture({
      deterministic_golden_pack_ref: "deterministic-golden-pack://pc0223/stale",
      suite_family: "SCHEMA_COMPATIBILITY",
    }),
  ).toThrow(/deterministic_golden_pack_ref/);
  expect(() =>
    suiteFixture({
      restore_checkpoint_ref: "recovery-checkpoint://pc0223/stale",
      restore_drill_ref: "restore-drill://pc0223/stale",
      suite_family: "SCHEMA_COMPATIBILITY",
    }),
  ).toThrow(/restore drill refs/);
});

test("enforces operator-client window and migration-plan suite dimensions", async () => {
  const operatorCandidate = candidate({
    id: "operator",
    supported_client_window_ref_or_null: "client-window://pc0223/operator",
  });
  const operator = suiteFixture({
    candidate_identity_contract: operatorCandidate,
    suite_family: "OPERATOR_CLIENT",
  });
  await validateContractSchema("verification_suite_result", operator);

  expect(() =>
    assertVerificationSuiteResultRecord({
      ...operator,
      supported_client_window_ref: "client-window://pc0223/stale",
    }),
  ).toThrow(/supported_client_window/);

  const migrationCandidate = candidate({
    id: "migration",
    migration_plan_ref_or_null: "migration-plan://pc0223/expand",
  });
  const migration = suiteFixture({
    candidate_identity_contract: migrationCandidate,
    suite_family: "MIGRATION_VERIFICATION",
  });
  await validateContractSchema("verification_suite_result", migration);
  expect(migration.migration_plan_ref).toBe("migration-plan://pc0223/expand");
});

test("requires authority sandbox coverage for authority suite results", () => {
  const authorityCandidate = candidate({
    enabled_provider_profile_refs: ["provider-a"],
    id: "authority",
  });
  const window = readerWindow(authorityCandidate);
  const gate = compatibilityGate({
    candidate_identity_contract: authorityCandidate,
    schema_reader_window_contract: window,
  });

  expect(() =>
    suiteFixture({
      candidate_identity_contract: authorityCandidate,
      schema_bundle_compatibility_gate_contract: gate,
      schema_reader_window_contract: window,
      suite_family: "AUTHORITY_SANDBOX",
    }),
  ).toThrow(/authority_sandbox_coverage_contract_or_null/);

  expect(
    suiteFixture({
      authority_sandbox_coverage_contract_or_null: {
        coverage_hash: "authority-sandbox-coverage-hash.pc0223",
        candidate_identity_hash: authorityCandidate.candidate_identity_hash,
        compatibility_gate_hash: gate.compatibility_gate_hash,
        enabled_provider_profile_refs: ["provider-a"],
        migration_plan_ref_or_null: null,
        reader_window_state: window.window_state,
        schema_bundle_hash: authorityCandidate.schema_bundle_hash,
        supported_client_window_ref_or_null: null,
      },
      candidate_identity_contract: authorityCandidate,
      schema_bundle_compatibility_gate_contract: gate,
      schema_reader_window_contract: window,
      suite_family: "AUTHORITY_SANDBOX",
    }).suite_family,
  ).toBe("AUTHORITY_SANDBOX");
});

test("repository persists immutable suite results by suite_result_id", async () => {
  const repository = new VerificationSuiteResultRepository({
    validate_contract_schema: validateContractSchema,
  });
  const result = suiteFixture({});

  const stored = await repository.persistVerificationSuiteResult({
    persisted_at: "2026-05-05T16:10:00Z",
    verification_suite_result: result,
  });
  const idempotent = await repository.persistVerificationSuiteResult({
    persisted_at: "2026-05-05T16:15:00Z",
    verification_suite_result: result,
  });

  expect(stored.suite_result_id).toBe(result.suite_result_id);
  expect(idempotent.persisted_at).toBe(stored.persisted_at);
  await expect(
    repository.listVerificationSuiteResults({
      candidate_identity_hash: result.candidate_identity_hash,
      suite_family: "SCHEMA_COMPATIBILITY",
    }),
  ).resolves.toHaveLength(1);
});
