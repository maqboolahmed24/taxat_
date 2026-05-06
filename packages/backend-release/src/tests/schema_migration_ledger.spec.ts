import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  BackfillExecutionContractModelError,
  buildBackfillExecutionContract,
  buildSchemaMigrationLedgerRecord,
  buildSchemaReaderWindowContract,
  SchemaMigrationLedgerModelError,
  SchemaMigrationLedgerRepository,
  type BackfillExecutionContractRecord,
  type SchemaMigrationLedgerPhaseState,
  type SchemaMigrationLedgerRecord,
  type SchemaMigrationLedgerTransitionEventCode,
  type SchemaReaderWindowState,
} from "../index.ts";

const migrationId = "migration://pc0221/schema-ledger/0001";
const datastoreRef = "datastore://control-plane/pc0221";
const targetVersion = "2026.05.05.pc0221";
const targetHash = "schema-bundle-hash.pc0221.target";
const previousHash = "schema-bundle-hash.pc0221.previous";
const historicalHash = "schema-bundle-hash.pc0221.historical";
const compatibilityWindowRef = "compat-window://pc0221/schema-ledger";

function readerWindow(
  windowState: SchemaReaderWindowState,
  writerHash = targetHash,
) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: compatibilityWindowRef,
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

function noBackfill() {
  return buildBackfillExecutionContract({
    migration_id: migrationId,
    target_version: targetVersion,
    target_schema_bundle_hash: targetHash,
    execution_requirement: "NO_BACKFILL_REQUIRED",
  });
}

function idempotentBackfill(
  executionState: BackfillExecutionContractRecord["execution_state"],
) {
  return buildBackfillExecutionContract({
    migration_id: migrationId,
    target_version: targetVersion,
    target_schema_bundle_hash: targetHash,
    execution_requirement: "IDEMPOTENT_BACKFILL_REQUIRED",
    execution_state: executionState,
    affected_artifact_types: [
      "control_manifest.request_projection",
      "run_manifest.schema_projection",
    ],
    backfill_audit_refs:
      executionState === "COMPLETE"
        ? ["audit://pc0221/backfill/complete"]
        : [],
  });
}

function transitionForPhase(phaseState: SchemaMigrationLedgerPhaseState): {
  previous_state_or_null: SchemaMigrationLedgerPhaseState | null;
  transition_event_code: SchemaMigrationLedgerTransitionEventCode;
} {
  switch (phaseState) {
    case "PLANNED":
      return {
        previous_state_or_null: null,
        transition_event_code: "migration_planned",
      };
    case "APPLYING":
      return { previous_state_or_null: "PLANNED", transition_event_code: "start_apply" };
    case "APPLIED":
      return { previous_state_or_null: "APPLYING", transition_event_code: "apply_complete" };
    case "VERIFYING":
      return { previous_state_or_null: "APPLIED", transition_event_code: "start_verify" };
    case "VERIFIED":
      return { previous_state_or_null: "VERIFYING", transition_event_code: "verify_success" };
    case "CONTRACTING":
      return { previous_state_or_null: "VERIFIED", transition_event_code: "start_contract" };
    case "CONTRACTED":
      return {
        previous_state_or_null: "CONTRACTING",
        transition_event_code: "contract_complete",
      };
    case "HALTED":
      return { previous_state_or_null: "APPLYING", transition_event_code: "halt" };
    case "FAILED":
      return { previous_state_or_null: "APPLYING", transition_event_code: "fail" };
    case "SUPERSEDED":
      return { previous_state_or_null: "CONTRACTED", transition_event_code: "supersede" };
  }
}

function defaultWindowState(
  phaseState: SchemaMigrationLedgerPhaseState,
  backfill: BackfillExecutionContractRecord,
): SchemaReaderWindowState {
  if (phaseState === "VERIFIED") {
    return "VERIFIED_PREVIOUS_READERS_SUPPORTED";
  }
  if (["CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(phaseState)) {
    return "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
  }
  if (
    backfill.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED" &&
    backfill.execution_state !== "COMPLETE"
  ) {
    return "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED";
  }
  return "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED";
}

function ledgerFixture(
  overrides: Partial<SchemaMigrationLedgerRecord> & {
    phase_state?: SchemaMigrationLedgerPhaseState;
    backfill_execution_contract?: BackfillExecutionContractRecord;
  } = {},
) {
  const phaseState = overrides.phase_state ?? "PLANNED";
  const transition = transitionForPhase(phaseState);
  const backfill = overrides.backfill_execution_contract ?? noBackfill();
  const verificationStarted = [
    "VERIFYING",
    "VERIFIED",
    "CONTRACTING",
    "CONTRACTED",
    "SUPERSEDED",
  ].includes(phaseState);
  const verified = ["VERIFIED", "CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(
    phaseState,
  );
  const closedPhase = ["CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(
    phaseState,
  );

  return buildSchemaMigrationLedgerRecord({
    migration_id: migrationId,
    datastore_ref: datastoreRef,
    target_version: targetVersion,
    target_schema_bundle_hash: targetHash,
    compatibility_window_ref: compatibilityWindowRef,
    contract_phase_required:
      overrides.contract_phase_required ?? ["CONTRACTING", "CONTRACTED"].includes(phaseState),
    phase_state: phaseState,
    previous_state_or_null: transition.previous_state_or_null,
    transition_event_code: transition.transition_event_code,
    transition_applied_at: "2026-05-05T14:00:00Z",
    transition_audit_ref: `audit://pc0221/migration/${phaseState.toLowerCase()}`,
    schema_reader_window_contract:
      overrides.schema_reader_window_contract ??
      readerWindow(defaultWindowState(phaseState, backfill)),
    backfill_execution_contract: backfill,
    applied_at: phaseState === "PLANNED" ? null : "2026-05-05T14:00:00Z",
    verified_at: verified ? "2026-05-05T14:30:00Z" : null,
    rollback_class: closedPhase ? "FAIL_FORWARD_ONLY" : "ROLLBACK_SAFE",
    verification_ref: verificationStarted
      ? "verification://pc0221/schema-ledger"
      : null,
    halted_subphase:
      phaseState === "HALTED" ? overrides.halted_subphase ?? "APPLYING" : null,
    compatibility_window_closed_at:
      phaseState === "CONTRACTING" || phaseState === "CONTRACTED"
        ? "2026-05-05T14:45:00Z"
        : null,
    failure_ref:
      phaseState === "HALTED" || phaseState === "FAILED"
        ? "failure://pc0221/schema-ledger"
        : null,
    ...overrides,
  });
}

function repositoryFixture() {
  return new SchemaMigrationLedgerRepository({
    validate_contract_schema: validateContractSchema,
  });
}

test("persists schema ledgers through legal apply and verify transitions", async () => {
  const repository = repositoryFixture();
  const planned = await repository.persistSchemaMigrationLedger({
    schema_migration_ledger: ledgerFixture(),
    persisted_at: "2026-05-05T14:00:00Z",
  });
  const applying = await repository.advanceSchemaMigrationPhase({
    migration_id: planned.migration_id,
    expected_row_version: planned.schema_migration_ledger_row_version,
    transition_event_code: "start_apply",
    transition_applied_at: "2026-05-05T14:05:00Z",
    transition_audit_ref: "audit://pc0221/migration/start-apply",
  });
  const applied = await repository.advanceSchemaMigrationPhase({
    migration_id: planned.migration_id,
    expected_row_version: applying.schema_migration_ledger_row_version,
    transition_event_code: "apply_complete",
    transition_applied_at: "2026-05-05T14:10:00Z",
    transition_audit_ref: "audit://pc0221/migration/apply-complete",
  });
  const verifying = await repository.advanceSchemaMigrationPhase({
    migration_id: planned.migration_id,
    expected_row_version: applied.schema_migration_ledger_row_version,
    transition_event_code: "start_verify",
    transition_applied_at: "2026-05-05T14:20:00Z",
    transition_audit_ref: "audit://pc0221/migration/start-verify",
    verification_ref: "verification://pc0221/schema-ledger",
  });
  const verified = await repository.advanceSchemaMigrationPhase({
    migration_id: planned.migration_id,
    expected_row_version: verifying.schema_migration_ledger_row_version,
    transition_event_code: "verify_success",
    transition_applied_at: "2026-05-05T14:30:00Z",
    transition_audit_ref: "audit://pc0221/migration/verify-success",
    schema_reader_window_contract: readerWindow(
      "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    ),
  });
  const retriedVerify = await repository.advanceSchemaMigrationPhase({
    migration_id: planned.migration_id,
    expected_row_version: verifying.schema_migration_ledger_row_version,
    transition_event_code: "verify_success",
    transition_applied_at: "2026-05-05T14:30:00Z",
    transition_audit_ref: "audit://pc0221/migration/verify-success",
    schema_reader_window_contract: readerWindow(
      "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    ),
  });

  expect(verified.schema_migration_ledger.phase_state).toBe("VERIFIED");
  expect(verified.schema_migration_ledger.state_transition_contract).toMatchObject({
    previous_state_or_null: "VERIFYING",
    current_state: "VERIFIED",
    transition_event_code: "verify_success",
  });
  expect(retriedVerify.schema_migration_ledger_row_version).toBe(
    verified.schema_migration_ledger_row_version,
  );
  await validateContractSchema(
    "schema_migration_ledger",
    verified.schema_migration_ledger,
  );
});

test("blocks verification while required backfill is incomplete and records affected artifacts", () => {
  expect(() =>
    buildBackfillExecutionContract({
      migration_id: migrationId,
      target_version: targetVersion,
      target_schema_bundle_hash: targetHash,
      execution_requirement: "IDEMPOTENT_BACKFILL_REQUIRED",
      execution_state: "IN_PROGRESS",
      affected_artifact_types: [],
    }),
  ).toThrow(BackfillExecutionContractModelError);

  expect(() =>
    ledgerFixture({
      phase_state: "VERIFYING",
      backfill_execution_contract: idempotentBackfill("IN_PROGRESS"),
      schema_reader_window_contract: readerWindow(
        "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
      ),
    }),
  ).toThrow(/complete backfill/);
});

test("blocks destructive contract until reader window is closed and then forces fail-forward", async () => {
  const repository = repositoryFixture();
  const verified = await repository.persistSchemaMigrationLedger({
    schema_migration_ledger: ledgerFixture({
      phase_state: "VERIFIED",
      contract_phase_required: true,
      backfill_execution_contract: idempotentBackfill("COMPLETE"),
    }),
    persisted_at: "2026-05-05T15:00:00Z",
  });

  await expect(
    repository.advanceSchemaMigrationPhase({
      migration_id: verified.migration_id,
      expected_row_version: verified.schema_migration_ledger_row_version,
      transition_event_code: "start_contract",
      transition_applied_at: "2026-05-05T15:10:00Z",
      transition_audit_ref: "audit://pc0221/migration/start-contract-open",
    }),
  ).rejects.toThrow(/CONTRACT_ELIGIBLE_WINDOW_CLOSED/);

  const contracting = await repository.advanceSchemaMigrationPhase({
    migration_id: verified.migration_id,
    expected_row_version: verified.schema_migration_ledger_row_version,
    transition_event_code: "start_contract",
    transition_applied_at: "2026-05-05T15:15:00Z",
    transition_audit_ref: "audit://pc0221/migration/start-contract",
    schema_reader_window_contract: readerWindow("CONTRACT_ELIGIBLE_WINDOW_CLOSED"),
    compatibility_window_closed_at: "2026-05-05T15:15:00Z",
  });

  expect(contracting.schema_migration_ledger).toMatchObject({
    phase_state: "CONTRACTING",
    rollback_class: "FAIL_FORWARD_ONLY",
    compatibility_window_closed_at: "2026-05-05T15:15:00Z",
  });
  await validateContractSchema(
    "schema_migration_ledger",
    contracting.schema_migration_ledger,
  );
});

test("rejects optional contract phases and state-transition mirror drift", async () => {
  expect(() =>
    ledgerFixture({
      phase_state: "CONTRACTING",
      contract_phase_required: false,
      schema_reader_window_contract: readerWindow("CONTRACT_ELIGIBLE_WINDOW_CLOSED"),
    }),
  ).toThrow(SchemaMigrationLedgerModelError);

  const planned = ledgerFixture();
  await expect(
    validateContractSchema("schema_migration_ledger", {
      ...planned,
      state_transition_contract: {
        ...planned.state_transition_contract,
        current_state: "APPLYING",
      },
    }),
  ).rejects.toThrow("current_state must mirror");
});
