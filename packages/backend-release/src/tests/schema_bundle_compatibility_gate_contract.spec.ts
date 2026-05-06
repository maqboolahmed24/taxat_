import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assembleSchemaBundleCompatibilityGateContract,
  buildSchemaReaderWindowContract,
  deriveCandidateIdentityContract,
  deriveSchemaBundleCompatibilityGateHash,
  ReleaseVerificationManifestAssemblyRepository,
  type SchemaReaderWindowState,
} from "../index.ts";

const candidateIdentity = deriveCandidateIdentityContract({
  artifact_digest:
    "sha256:pc0222b8a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
  build_artifact_ref: "build://pc0222/release-candidate",
  candidate_environment_ref: "candidate-env://pc0222/preproduction",
  config_bundle_hash: "config-bundle-hash.pc0222",
  enabled_provider_profile_refs: ["provider.hmrc.vat", "provider.hmrc.it"],
  migration_plan_ref_or_null: null,
  schema_bundle_hash: "schema-bundle-hash.pc0222.writer",
  supported_client_window_ref_or_null: "client-window://operator/pc0222/stable",
});

const previousReaderHash = "schema-bundle-hash.pc0222.previous";
const protectedHistoricalHash = "schema-bundle-hash.pc0222.historical";

function readerWindow(windowState: SchemaReaderWindowState) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://pc0222/schema-reader",
    writer_schema_bundle_hash: candidateIdentity.schema_bundle_hash,
    supported_reader_schema_bundle_hashes: [
      candidateIdentity.schema_bundle_hash,
      previousReaderHash,
      protectedHistoricalHash,
    ],
    protected_historical_schema_bundle_hashes: [protectedHistoricalHash],
    window_state: windowState,
  });
}

test("derives schema-valid compatibility gates from the exact candidate and reader-window boundary", async () => {
  const contract = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidateIdentity,
    schema_reader_window_contract: readerWindow(
      "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    ),
  });

  expect(contract.candidate_identity_hash).toBe(
    candidateIdentity.candidate_identity_hash,
  );
  expect(contract.compatibility_gate_hash).toBe(
    deriveSchemaBundleCompatibilityGateHash(contract),
  );
  expect(contract.schema_reader_window_contract.window_state).toBe(
    "VERIFIED_PREVIOUS_READERS_SUPPORTED",
  );
  await validateContractSchema("schema_bundle_compatibility_gate_contract", contract);
});

test("changes compatibility_gate_hash when the reader window narrows for the same candidate tuple", () => {
  const openWindow = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidateIdentity,
    schema_reader_window_contract: readerWindow(
      "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    ),
  });
  const closedWindow = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidateIdentity,
    schema_reader_window_contract: readerWindow("CONTRACT_ELIGIBLE_WINDOW_CLOSED"),
  });

  expect(closedWindow.candidate_identity_hash).toBe(
    openWindow.candidate_identity_hash,
  );
  expect(closedWindow.compatibility_gate_hash).not.toBe(
    openWindow.compatibility_gate_hash,
  );
  expect(closedWindow.destructive_contract_state).toBe(
    "ELIGIBLE_AFTER_WINDOW_CLOSE",
  );
  expect(closedWindow.rollback_boundary_state).toBe("FAIL_FORWARD_ONLY");
});

test("keeps blocked native-client posture explicit and requires reason codes", async () => {
  const blockedNative = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidateIdentity,
    schema_reader_window_contract: readerWindow(
      "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
    ),
    native_client_window_state: "BLOCKED",
    reason_codes: ["NATIVE_CLIENT_WINDOW_BLOCKED"],
  });

  expect(blockedNative.native_client_window_state).toBe("BLOCKED");
  expect(blockedNative.reason_codes).toEqual(["NATIVE_CLIENT_WINDOW_BLOCKED"]);
  await validateContractSchema(
    "schema_bundle_compatibility_gate_contract",
    blockedNative,
  );
  expect(() =>
    assembleSchemaBundleCompatibilityGateContract({
      candidate_identity_contract: candidateIdentity,
      schema_reader_window_contract: readerWindow(
        "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
      ),
      native_client_window_state: "BLOCKED",
    }),
  ).toThrow(/reason_codes/);
});

test("requires migration-ledger lineage when the candidate has a migration plan", async () => {
  const migratoryCandidate = deriveCandidateIdentityContract({
    ...candidateIdentity,
    build_artifact_ref: "build://pc0222/release-candidate-migration",
    migration_plan_ref_or_null: "migration-plan://pc0222/schema-expand",
  });

  const contract = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: migratoryCandidate,
    migration_ledger_refs: ["schema-migration-ledger://pc0222/schema-expand"],
    schema_reader_window_contract: buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://pc0222/schema-reader-migration",
      writer_schema_bundle_hash: migratoryCandidate.schema_bundle_hash,
      supported_reader_schema_bundle_hashes: [
        migratoryCandidate.schema_bundle_hash,
        previousReaderHash,
      ],
      protected_historical_schema_bundle_hashes: [],
      window_state: "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
    }),
  });

  expect(contract.migration_plan_ref_or_null).toBe(
    "migration-plan://pc0222/schema-expand",
  );
  expect(contract.migration_ledger_refs).toEqual([
    "schema-migration-ledger://pc0222/schema-expand",
  ]);
  expect(contract.migration_chronology_state).toBe("BACKFILL_IN_PROGRESS");
  await validateContractSchema("schema_bundle_compatibility_gate_contract", contract);
});

test("persists immutable schema-bundle compatibility gates by compatibility hash", async () => {
  const repository = new ReleaseVerificationManifestAssemblyRepository({
    validate_contract_schema: validateContractSchema,
  });
  const contract = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidateIdentity,
    schema_reader_window_contract: readerWindow(
      "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    ),
  });

  const stored = await repository.persistSchemaBundleCompatibilityGateContract({
    schema_bundle_compatibility_gate_contract: contract,
    persisted_at: "2026-05-05T15:00:00Z",
  });
  const idempotent = await repository.persistSchemaBundleCompatibilityGateContract({
    schema_bundle_compatibility_gate_contract: contract,
    persisted_at: "2026-05-05T15:05:00Z",
  });

  expect(stored.compatibility_gate_hash).toBe(contract.compatibility_gate_hash);
  expect(idempotent.persisted_at).toBe(stored.persisted_at);
  await expect(
    repository.getSchemaBundleCompatibilityGateContractByHash(
      contract.compatibility_gate_hash,
    ),
  ).resolves.toMatchObject({
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    reader_window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
  });
  await expect(
    repository.listSchemaBundleCompatibilityGateContracts({
      candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    }),
  ).resolves.toHaveLength(1);
});
