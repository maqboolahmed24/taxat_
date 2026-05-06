import { expect, test } from "@playwright/test";

import {
  applyLedgerEvent,
  computeImportedSchemaBundleHash,
  createPlannedLedgerRecord,
  loadMigrationPolicyBundle,
  validateSchemaBundleVersionCatalog,
} from "../../../packages/control-plane-db/src/index.ts";

test("schema bundle version catalog binds the imported contracts-core bundle to the baseline target version", async () => {
  const policyBundle = await loadMigrationPolicyBundle();

  expect(policyBundle.catalog.currentImportedSchemaBundleHash).toBe(computeImportedSchemaBundleHash());
  expect(policyBundle.currentEntry.targetVersion).toBe("000001");
  expect(policyBundle.currentEntry.migrationFiles).toEqual([
    "packages/control-plane-db/src/migrations/schema_migration_ledger.sql",
    "packages/control-plane-db/src/migrations/000001_baseline.sql",
  ]);
  expect(policyBundle.readerWindowBaseline.writer_schema_bundle_hash).toBe(
    policyBundle.currentEntry.schemaBundleHash,
  );
  expect(policyBundle.backfillPolicy.execution_state).toBe("NOT_APPLICABLE");
});

test("catalog validation rejects schema bundle hash drift against the imported schema mirror", async () => {
  const policyBundle = await loadMigrationPolicyBundle();
  const driftedCatalog = structuredClone(policyBundle.catalog);
  driftedCatalog.currentImportedSchemaBundleHash = "deadbeef".repeat(8);

  expect(() =>
    validateSchemaBundleVersionCatalog(
      driftedCatalog,
      computeImportedSchemaBundleHash(),
    ),
  ).toThrowError(/drift detected/i);
});

test("baseline migrations stay rollback safe until verification completes and cannot contract implicitly", async () => {
  const policyBundle = await loadMigrationPolicyBundle();
  let record = createPlannedLedgerRecord(policyBundle);

  record = applyLedgerEvent(record, {
    auditRef: "audit.meta_migration.000001.start_apply",
    event: "start_apply",
  });
  record = applyLedgerEvent(record, {
    auditRef: "audit.meta_migration.000001.apply_complete",
    event: "apply_complete",
  });
  record = applyLedgerEvent(record, {
    auditRef: "audit.meta_migration.000001.start_verify",
    event: "start_verify",
  });
  record = applyLedgerEvent(record, {
    auditRef: "audit.meta_migration.000001.verify_success",
    event: "verify_success",
    verificationRef: "verification.release-manifest.000001",
  });

  expect(record.phase_state).toBe("VERIFIED");
  expect(record.rollback_class).toBe("ROLLBACK_SAFE");
  expect(record.schema_reader_window_contract.window_state).toBe(
    "VERIFIED_PREVIOUS_READERS_SUPPORTED",
  );

  expect(() =>
    applyLedgerEvent(record, {
      auditRef: "audit.meta_migration.000001.start_contract",
      event: "start_contract",
    }),
  ).toThrowError(/does not permit a contract phase/i);
});

test("contract cleanup flips to fail-forward only once the reader window closes", async () => {
  const policyBundle = await loadMigrationPolicyBundle();
  const record = createPlannedLedgerRecord(policyBundle);

  record.contract_phase_required = true;
  record.phase_state = "VERIFIED";
  record.verified_at = "2026-04-23T09:00:00.000Z";
  record.verification_ref = "verification.release-manifest.000002";
  record.backfill_execution_contract.execution_requirement = "IDEMPOTENT_BACKFILL_REQUIRED";
  record.backfill_execution_contract.execution_state = "COMPLETE";
  record.backfill_execution_contract.affected_artifact_types = ["control_manifest.request_projection"];
  record.backfill_execution_contract.backfill_audit_refs = ["audit.backfill.complete.000002"];
  record.schema_reader_window_contract.window_state = "VERIFIED_PREVIOUS_READERS_SUPPORTED";

  const contracted = applyLedgerEvent(record, {
    auditRef: "audit.meta_migration.000002.start_contract",
    closeCompatibilityWindow: true,
    event: "start_contract",
  });

  expect(contracted.phase_state).toBe("CONTRACTING");
  expect(contracted.rollback_class).toBe("FAIL_FORWARD_ONLY");
  expect(contracted.compatibility_window_closed_at).not.toBeNull();
  expect(contracted.schema_reader_window_contract.window_state).toBe(
    "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
  );
});
