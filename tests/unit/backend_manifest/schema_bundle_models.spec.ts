import { expect, test } from "@playwright/test";

import {
  BackfillExecutionContractModelError,
  buildBackfillExecutionContract,
  buildSchemaBundleRecord,
  buildSchemaMigrationLedgerStateTransitionContract,
  buildSchemaReaderWindowContract,
  computeSchemaBundleHash,
  evaluateSchemaReaderWindowGuard,
  getNextSchemaMigrationLedgerPhaseState,
  normalizeSchemaMigrationLedgerRecord,
  SchemaMigrationLedgerLifecycleError,
  SchemaMigrationLedgerModelError,
  type BackfillExecutionContractRecord,
  type SchemaBundleEntryRecord,
  type SchemaMigrationLedgerRecord,
  type SchemaReaderWindowState,
} from "../../../packages/backend-manifest/src/index.ts";

function entries(): SchemaBundleEntryRecord[] {
  return [
    {
      schema_id: "https://taxat.dev/schemas/run_manifest.schema.json",
      artifact_type: "RunManifest",
      semantic_version: "1.0.0",
      content_hash: "schema-content-hash://run-manifest",
      dialect_ref: "json-schema-draft-2020-12",
      compatibility_class: "BACKWARD_COMPATIBLE",
      supersedes_schema_id: null,
      writer_min_reader_version: "1.0.0",
      allowed_upgrade_kinds: ["MINOR_BACKWARD", "PATCH_BACKWARD"],
    },
    {
      schema_id: "https://taxat.dev/schemas/config_freeze.schema.json",
      artifact_type: "ConfigFreeze",
      semantic_version: "1.0.0",
      content_hash: "schema-content-hash://config-freeze",
      dialect_ref: "json-schema-draft-2020-12",
      compatibility_class: "BACKWARD_COMPATIBLE",
      supersedes_schema_id: null,
      writer_min_reader_version: "1.0.0",
      allowed_upgrade_kinds: ["PATCH_BACKWARD"],
    },
  ];
}

function readerWindow(
  writerHash: string,
  windowState: SchemaReaderWindowState,
  supported = [writerHash, "schema-bundle-hash://previous"],
) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://unit",
    writer_schema_bundle_hash: writerHash,
    supported_reader_schema_bundle_hashes: supported,
    protected_historical_schema_bundle_hashes: ["schema-bundle-hash://historical"],
    window_state: windowState,
  });
}

function bundle(windowState: SchemaReaderWindowState = "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED") {
  const schemaBundleHash = computeSchemaBundleHash({
    compatibility_profile_ref: "compat-profile://unit",
    entries: entries(),
  });
  return buildSchemaBundleRecord({
    compatibility_profile_ref: "compat-profile://unit",
    entries: [...entries()].reverse(),
    published_at: "2026-04-22T10:00:00Z",
    schema_reader_window_contract: readerWindow(schemaBundleHash, windowState),
  });
}

function ledger(
  overrides?: Partial<SchemaMigrationLedgerRecord> & {
    backfill_execution_contract?: BackfillExecutionContractRecord | undefined;
  },
): SchemaMigrationLedgerRecord {
  const schemaBundle = bundle();
  const targetHash = schemaBundle.schema_bundle_hash;
  const phaseState = overrides?.phase_state ?? "PLANNED";
  const backfill =
    overrides?.backfill_execution_contract ??
    buildBackfillExecutionContract({
      execution_requirement: "NO_BACKFILL_REQUIRED",
      migration_id: "migration://unit",
      target_schema_bundle_hash: targetHash,
      target_version: "2026.04.22",
    });
  const windowState =
    phaseState === "VERIFIED"
      ? "VERIFIED_PREVIOUS_READERS_SUPPORTED"
      : phaseState === "CONTRACTING" || phaseState === "CONTRACTED"
        ? "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
        : backfill.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED" &&
            backfill.execution_state !== "COMPLETE"
          ? "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED"
          : "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED";

  return normalizeSchemaMigrationLedgerRecord({
    migration_id: "migration://unit",
    datastore_ref: "datastore://control",
    target_version: "2026.04.22",
    target_schema_bundle_hash: targetHash,
    compatibility_window_ref: "compat-window://unit",
    contract_phase_required: false,
    phase_state: phaseState,
    state_transition_contract: buildSchemaMigrationLedgerStateTransitionContract({
      current_state: phaseState,
      previous_state_or_null: null,
      transition_event_code: "start_apply",
      transition_applied_at: "2026-04-22T10:00:00Z",
      transition_audit_ref: "audit://migration/unit",
    }),
    schema_reader_window_contract: readerWindow(targetHash, windowState),
    backfill_execution_contract: backfill,
    applied_at: phaseState === "PLANNED" ? null : "2026-04-22T10:00:00Z",
    verified_at: ["VERIFIED", "CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(phaseState)
      ? "2026-04-22T11:00:00Z"
      : null,
    rollback_class:
      phaseState === "CONTRACTING" || phaseState === "CONTRACTED"
        ? "FAIL_FORWARD_ONLY"
        : "ROLLBACK_SAFE",
    verification_ref: ["VERIFYING", "VERIFIED", "CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(
      phaseState,
    )
      ? "verification://migration/unit"
      : null,
    halted_subphase: null,
    compatibility_window_closed_at:
      phaseState === "CONTRACTING" || phaseState === "CONTRACTED"
        ? "2026-04-22T12:00:00Z"
        : null,
    failure_ref: null,
    ...overrides,
  });
}

test("schema bundle hashing orders entries and rejects hash drift", () => {
  const first = bundle();
  const second = buildSchemaBundleRecord({
    compatibility_profile_ref: "compat-profile://unit",
    entries: entries(),
    published_at: "2026-04-22T10:00:00Z",
    schema_reader_window_contract: readerWindow(
      first.schema_bundle_hash,
      "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
    ),
  });

  expect(first.schema_bundle_hash).toBe(second.schema_bundle_hash);
  expect(first.entries.map((entry) => entry.artifact_type)).toEqual([
    "ConfigFreeze",
    "RunManifest",
  ]);
  expect(() =>
    buildSchemaBundleRecord({
      compatibility_profile_ref: "compat-profile://unit",
      entries: [],
      schema_reader_window_contract: readerWindow("hash://wrong", "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED"),
    }),
  ).toThrow(/schema bundles must contain at least one entry/);
});

test("reader-window guard classifies expand, backfill, closed, native, and replay blocks", () => {
  const expand = evaluateSchemaReaderWindowGuard({
    contract: bundle("EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED").schema_reader_window_contract,
    historical_schema_bundle_hash_or_null: "schema-bundle-hash://historical",
    replay_reader_schema_bundle_hash_or_null: "schema-bundle-hash://previous",
  });
  expect(expand.destructive_contract_state).toBe("BLOCKED_UNTIL_WINDOW_CLOSE");
  expect(expand.rollback_boundary_state).toBe("ROLLBACK_ALLOWED");
  expect(expand.historical_manifest_guard_state).toBe("PROTECTED");

  const backfill = evaluateSchemaReaderWindowGuard({
    contract: bundle("BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED")
      .schema_reader_window_contract,
    replay_reader_schema_bundle_hash_or_null: "schema-bundle-hash://unknown",
  });
  expect(backfill.replay_restore_guard_state).toBe("BLOCKED");
  expect(backfill.reason_codes).toContain("REPLAY_RESTORE_SCHEMA_READER_INCOMPATIBLE");

  const closed = evaluateSchemaReaderWindowGuard({
    contract: bundle("CONTRACT_ELIGIBLE_WINDOW_CLOSED").schema_reader_window_contract,
    native_client_window_state: "BLOCKED",
  });
  expect(closed.destructive_contract_state).toBe("ELIGIBLE_AFTER_WINDOW_CLOSE");
  expect(closed.rollback_boundary_state).toBe("FAIL_FORWARD_ONLY");
  expect(closed.overall_state).toBe("BLOCKED");
  expect(closed.reason_codes).toContain("NATIVE_CLIENT_WINDOW_BLOCKED");
});

test("migration lifecycle and chronology fail closed", () => {
  expect(getNextSchemaMigrationLedgerPhaseState("PLANNED", "start_apply")).toBe("APPLYING");
  expect(getNextSchemaMigrationLedgerPhaseState("VERIFYING", "verify_success")).toBe(
    "VERIFIED",
  );
  expect(() =>
    getNextSchemaMigrationLedgerPhaseState("PLANNED", "verify_success"),
  ).toThrow(SchemaMigrationLedgerLifecycleError);

  expect(() =>
    ledger({
      phase_state: "VERIFIED",
      verification_ref: null,
    }),
  ).toThrow(SchemaMigrationLedgerModelError);

  expect(() =>
    ledger({
      phase_state: "VERIFYING",
      backfill_execution_contract: buildBackfillExecutionContract({
        execution_requirement: "IDEMPOTENT_BACKFILL_REQUIRED",
        execution_state: "IN_PROGRESS",
        migration_id: "migration://unit",
        target_schema_bundle_hash: bundle().schema_bundle_hash,
        target_version: "2026.04.22",
        affected_artifact_types: ["RunManifest"],
      }),
    }),
  ).toThrow(/must complete backfill/);
});

test("backfill contract validates requirement-specific state", () => {
  expect(() =>
    buildBackfillExecutionContract({
      execution_requirement: "NO_BACKFILL_REQUIRED",
      execution_state: "PLANNED",
      migration_id: "migration://unit",
      target_schema_bundle_hash: bundle().schema_bundle_hash,
      target_version: "2026.04.22",
    }),
  ).toThrow(BackfillExecutionContractModelError);

  const complete = buildBackfillExecutionContract({
    execution_requirement: "IDEMPOTENT_BACKFILL_REQUIRED",
    execution_state: "COMPLETE",
    migration_id: "migration://unit",
    target_schema_bundle_hash: bundle().schema_bundle_hash,
    target_version: "2026.04.22",
    affected_artifact_types: ["RunManifest"],
    backfill_audit_refs: ["audit://backfill/complete"],
  });
  expect(complete.execution_state).toBe("COMPLETE");
});
