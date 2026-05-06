import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildSchemaReaderWindowContract,
  SchemaReaderWindowModelError,
  validateSchemaReaderWindowRules,
  type SchemaReaderWindowState,
} from "../index.ts";

const writerHash = "schema-bundle-hash.pc0221.writer";
const previousHash = "schema-bundle-hash.pc0221.previous";
const historicalHash = "schema-bundle-hash.pc0221.historical";

function readerWindow(
  windowState: SchemaReaderWindowState = "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://pc0221/reader-window",
    writer_schema_bundle_hash: writerHash,
    supported_reader_schema_bundle_hashes: [
      writerHash,
      previousHash,
      historicalHash,
    ],
    protected_historical_schema_bundle_hashes: [historicalHash],
    window_state: windowState,
  });
}

test("builds schema-valid reader-window contracts with writer and historical protection", async () => {
  const contract = readerWindow();

  expect(contract.supported_reader_schema_bundle_hashes).toEqual([
    historicalHash,
    previousHash,
    writerHash,
  ]);
  expect(contract.protected_historical_schema_bundle_hashes).toEqual([
    historicalHash,
  ]);
  expect(contract.supported_reader_schema_bundle_hashes).toContain(
    contract.writer_schema_bundle_hash,
  );
  await validateContractSchema("schema_reader_window_contract", contract);
});

test("rejects reader-window sets that lose writer or protected-historical subset semantics", () => {
  expect(() =>
    buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://pc0221/missing-writer",
      writer_schema_bundle_hash: writerHash,
      supported_reader_schema_bundle_hashes: [previousHash],
      protected_historical_schema_bundle_hashes: [],
      window_state: "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
    }),
  ).toThrow(SchemaReaderWindowModelError);

  expect(() =>
    buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://pc0221/writer-protected",
      writer_schema_bundle_hash: writerHash,
      supported_reader_schema_bundle_hashes: [writerHash, previousHash],
      protected_historical_schema_bundle_hashes: [writerHash],
      window_state: "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
    }),
  ).toThrow(/exclude the current writer/);

  expect(() =>
    buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://pc0221/unsupported-history",
      writer_schema_bundle_hash: writerHash,
      supported_reader_schema_bundle_hashes: [writerHash, previousHash],
      protected_historical_schema_bundle_hashes: [historicalHash],
      window_state: "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
    }),
  ).toThrow(/subset of supported readers/);
});

test("classifies destructive contract, rollback, historical manifest, and replay blocks", () => {
  const open = validateSchemaReaderWindowRules({
    contract: readerWindow("BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED"),
    historical_schema_bundle_hash_or_null: historicalHash,
    replay_reader_schema_bundle_hash_or_null: previousHash,
  });
  expect(open.destructive_contract_state).toBe("BLOCKED_UNTIL_WINDOW_CLOSE");
  expect(open.rollback_boundary_state).toBe("ROLLBACK_ALLOWED");
  expect(open.historical_manifest_guard_state).toBe("PROTECTED");
  expect(open.replay_restore_guard_state).toBe("PROTECTED");

  const replayBlocked = validateSchemaReaderWindowRules({
    contract: readerWindow("VERIFIED_PREVIOUS_READERS_SUPPORTED"),
    replay_reader_schema_bundle_hash_or_null: "schema-bundle-hash.pc0221.unknown",
  });
  expect(replayBlocked.overall_state).toBe("BLOCKED");
  expect(replayBlocked.reason_codes).toContain(
    "REPLAY_RESTORE_SCHEMA_READER_INCOMPATIBLE",
  );

  const closed = validateSchemaReaderWindowRules({
    contract: readerWindow("CONTRACT_ELIGIBLE_WINDOW_CLOSED"),
    native_client_window_state: "BLOCKED",
  });
  expect(closed.destructive_contract_state).toBe("ELIGIBLE_AFTER_WINDOW_CLOSE");
  expect(closed.rollback_boundary_state).toBe("FAIL_FORWARD_ONLY");
  expect(closed.fail_forward_required).toBe(true);
  expect(closed.overall_state).toBe("BLOCKED");
  expect(closed.reason_codes).toContain("NATIVE_CLIENT_WINDOW_BLOCKED");
});
