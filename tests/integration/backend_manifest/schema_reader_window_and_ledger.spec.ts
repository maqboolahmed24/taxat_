import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildBackfillExecutionContract,
  buildSchemaBundleRecord,
  buildSchemaMigrationLedgerStateTransitionContract,
  buildSchemaReaderWindowContract,
  evaluateSchemaReaderWindowGuard,
  SchemaBundleLoader,
  SchemaBundleRepository,
  SchemaMigrationLedgerRepository,
  normalizeSchemaMigrationLedgerRecord,
  type SchemaBundleEntryRecord,
  type SchemaMigrationLedgerRecord,
} from "../../../packages/backend-manifest/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0100_schema_bundle_and_migration_ledger.sql",
);

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

function entries(): SchemaBundleEntryRecord[] {
  return [
    {
      schema_id: "https://taxat.dev/schemas/run_manifest.schema.json",
      artifact_type: "RunManifest",
      semantic_version: "1.0.0",
      content_hash: "schema-content-hash://run-manifest.integration",
      dialect_ref: "json-schema-draft-2020-12",
      compatibility_class: "BACKWARD_COMPATIBLE",
      supersedes_schema_id: null,
      writer_min_reader_version: "1.0.0",
      allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    },
    {
      schema_id: "https://taxat.dev/schemas/config_freeze.schema.json",
      artifact_type: "ConfigFreeze",
      semantic_version: "1.0.0",
      content_hash: "schema-content-hash://config-freeze.integration",
      dialect_ref: "json-schema-draft-2020-12",
      compatibility_class: "BACKWARD_COMPATIBLE",
      supersedes_schema_id: null,
      writer_min_reader_version: "1.0.0",
      allowed_upgrade_kinds: ["PATCH_BACKWARD"],
    },
  ];
}

function buildBundle() {
  const provisional = buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://integration",
    writer_schema_bundle_hash: "schema-bundle-hash://provisional",
    supported_reader_schema_bundle_hashes: ["schema-bundle-hash://provisional"],
    protected_historical_schema_bundle_hashes: ["schema-bundle-hash://historical"],
    window_state: "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
  });
  return buildSchemaBundleRecord({
    compatibility_profile_ref: "compat-profile://integration",
    entries: entries(),
    published_at: "2026-04-23T10:00:00Z",
    schema_reader_window_contract: provisional,
  });
}

function buildVerifiedLedger(targetSchemaBundleHash: string): SchemaMigrationLedgerRecord {
  const backfill = buildBackfillExecutionContract({
    execution_requirement: "IDEMPOTENT_BACKFILL_REQUIRED",
    execution_state: "COMPLETE",
    migration_id: "migration://schema/integration",
    target_schema_bundle_hash: targetSchemaBundleHash,
    target_version: "2026.04.23",
    affected_artifact_types: ["ConfigFreeze", "RunManifest"],
    backfill_audit_refs: ["audit://backfill/integration/complete"],
  });
  return normalizeSchemaMigrationLedgerRecord({
    migration_id: "migration://schema/integration",
    datastore_ref: "datastore://control_manifest",
    target_version: "2026.04.23",
    target_schema_bundle_hash: targetSchemaBundleHash,
    compatibility_window_ref: "compat-window://integration",
    contract_phase_required: true,
    phase_state: "VERIFIED",
    state_transition_contract: buildSchemaMigrationLedgerStateTransitionContract({
      current_state: "VERIFIED",
      previous_state_or_null: "VERIFYING",
      transition_event_code: "verify_success",
      transition_applied_at: "2026-04-23T11:00:00Z",
      transition_audit_ref: "audit://schema-migration/verified",
    }),
    schema_reader_window_contract: buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://integration",
      writer_schema_bundle_hash: targetSchemaBundleHash,
      supported_reader_schema_bundle_hashes: [
        targetSchemaBundleHash,
        "schema-bundle-hash://previous",
      ],
      protected_historical_schema_bundle_hashes: ["schema-bundle-hash://historical"],
      window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    }),
    backfill_execution_contract: backfill,
    applied_at: "2026-04-23T10:10:00Z",
    verified_at: "2026-04-23T11:00:00Z",
    rollback_class: "ROLLBACK_SAFE",
    verification_ref: "verification://schema-migration/integration",
    halted_subphase: null,
    compatibility_window_closed_at: null,
    failure_ref: null,
  });
}

function buildClosedLedger(targetSchemaBundleHash: string) {
  const verified = buildVerifiedLedger(targetSchemaBundleHash);
  return normalizeSchemaMigrationLedgerRecord({
    ...verified,
    phase_state: "CONTRACTING",
    state_transition_contract: buildSchemaMigrationLedgerStateTransitionContract({
      current_state: "CONTRACTING",
      previous_state_or_null: "VERIFIED",
      transition_event_code: "start_contract",
      transition_applied_at: "2026-04-23T12:00:00Z",
      transition_audit_ref: "audit://schema-migration/start-contract",
    }),
    schema_reader_window_contract: buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://integration",
      writer_schema_bundle_hash: targetSchemaBundleHash,
      supported_reader_schema_bundle_hashes: [targetSchemaBundleHash],
      protected_historical_schema_bundle_hashes: ["schema-bundle-hash://historical"],
      window_state: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
    }),
    rollback_class: "FAIL_FORWARD_ONLY",
    compatibility_window_closed_at: "2026-04-23T12:00:00Z",
  });
}

test("migration defines schema bundle, entry, ledger, and transition-log storage", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_manifest.schema_bundle_register");
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.schema_bundle_entry_register",
  );
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.schema_migration_ledger_register",
  );
  expect(sql).toContain("schema_migration_target_bundle_lookup");
  expect(sql).toContain("compatibility_window_closed_at IS NOT NULL");
  expect(sql).toContain("FAIL_FORWARD_ONLY");
});

test("repositories and loader preserve schema-window truth for manifest consumers", async () => {
  const bundleRepository = new SchemaBundleRepository();
  const ledgerRepository = new SchemaMigrationLedgerRepository();
  const loader = new SchemaBundleLoader({
    schemaBundleRepository: bundleRepository,
    schemaMigrationLedgerRepository: ledgerRepository,
  });

  const schemaBundle = buildBundle();
  const storedBundle = await bundleRepository.persistBundle({
    schema_bundle: schemaBundle,
    persisted_at: "2026-04-23T10:00:00Z",
  });
  await validatePayloadAgainstSchema("schema_bundle.schema.json", storedBundle.schema_bundle);

  const verifiedLedger = buildVerifiedLedger(schemaBundle.schema_bundle_hash);
  const storedLedger = await ledgerRepository.createLedger({
    ledger: verifiedLedger,
    persisted_at: "2026-04-23T11:00:00Z",
  });
  await validatePayloadAgainstSchema(
    "schema_migration_ledger.schema.json",
    storedLedger.ledger,
  );
  await validatePayloadAgainstSchema(
    "backfill_execution_contract.schema.json",
    storedLedger.ledger.backfill_execution_contract,
  );

  const context = await loader.requireBundleContext(schemaBundle.schema_bundle_hash);
  expect(context.schema_bundle.entries.map((entry) => entry.artifact_type)).toEqual([
    "ConfigFreeze",
    "RunManifest",
  ]);
  expect(context.migration_ledgers).toHaveLength(1);

  const guard = evaluateSchemaReaderWindowGuard({
    contract: storedLedger.ledger.schema_reader_window_contract,
    historical_schema_bundle_hash_or_null: "schema-bundle-hash://historical",
    replay_reader_schema_bundle_hash_or_null: "schema-bundle-hash://previous",
  });
  expect(guard.historical_manifest_guard_state).toBe("PROTECTED");
  expect(guard.replay_restore_guard_state).toBe("PROTECTED");
  expect(guard.destructive_contract_state).toBe("BLOCKED_UNTIL_WINDOW_CLOSE");
});

test("closed windows persist fail-forward posture and native-client blocks remain explicit", async () => {
  const bundleRepository = new SchemaBundleRepository();
  const ledgerRepository = new SchemaMigrationLedgerRepository();
  const schemaBundle = buildBundle();
  await bundleRepository.persistBundle({
    schema_bundle: schemaBundle,
    persisted_at: "2026-04-23T10:00:00Z",
  });

  const verified = await ledgerRepository.createLedger({
    ledger: buildVerifiedLedger(schemaBundle.schema_bundle_hash),
    persisted_at: "2026-04-23T11:00:00Z",
  });
  const closed = await ledgerRepository.compareAndSwapLedger({
    expected_ledger_row_version: verified.ledger_row_version,
    next_ledger: buildClosedLedger(schemaBundle.schema_bundle_hash),
    persisted_at: "2026-04-23T12:00:00Z",
  });
  await validatePayloadAgainstSchema("schema_migration_ledger.schema.json", closed.ledger);

  const guard = evaluateSchemaReaderWindowGuard({
    contract: closed.ledger.schema_reader_window_contract,
    native_client_window_state: "BLOCKED",
    replay_reader_schema_bundle_hash_or_null: "schema-bundle-hash://not-supported",
  });
  expect(closed.ledger.rollback_class).toBe("FAIL_FORWARD_ONLY");
  expect(guard.destructive_contract_state).toBe("ELIGIBLE_AFTER_WINDOW_CLOSE");
  expect(guard.rollback_boundary_state).toBe("FAIL_FORWARD_ONLY");
  expect(guard.overall_state).toBe("BLOCKED");
  expect(guard.reason_codes).toEqual(
    expect.arrayContaining([
      "NATIVE_CLIENT_WINDOW_BLOCKED",
      "REPLAY_RESTORE_SCHEMA_READER_INCOMPATIBLE",
    ]),
  );
});
