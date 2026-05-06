import type { BackfillExecutionContractRecord } from "../models/backfill_execution_contract.ts";
import {
  buildSchemaMigrationLedgerRecord,
  cloneSchemaMigrationLedgerRecord,
  getNextSchemaMigrationLedgerPhaseState,
  SchemaMigrationLedgerModelError,
  type SchemaMigrationHaltedSubphase,
  type SchemaMigrationLedgerRecord,
  type SchemaMigrationLedgerTransitionEventCode,
  type SchemaMigrationRollbackClass,
} from "../models/schema_migration_ledger.ts";
import type { SchemaReaderWindowContractRecord } from "../models/schema_reader_window_contract.ts";

export type AdvanceSchemaMigrationPhaseInput = {
  ledger: SchemaMigrationLedgerRecord;
  transition_event_code: SchemaMigrationLedgerTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
  schema_reader_window_contract?: SchemaReaderWindowContractRecord;
  backfill_execution_contract?: BackfillExecutionContractRecord;
  applied_at?: string | null;
  verified_at?: string | null;
  rollback_class?: SchemaMigrationRollbackClass;
  verification_ref?: string | null;
  halted_subphase?: SchemaMigrationHaltedSubphase | null;
  compatibility_window_closed_at?: string | null;
  failure_ref?: string | null;
};

function valueOrExisting<T>(value: T | undefined, existing: T) {
  return typeof value === "undefined" ? existing : value;
}

function requireNonNullString(label: string, value: string | null | undefined) {
  if (typeof value !== "string" || value.length === 0) {
    throw new SchemaMigrationLedgerModelError(
      "SCHEMA_MIGRATION_FIELD_INVALID",
      `${label} is required for this schema migration transition`,
    );
  }
  return value;
}

function requireHaltSubphase(
  value: SchemaMigrationHaltedSubphase | null | undefined,
  fallback: SchemaMigrationLedgerRecord["phase_state"],
) {
  if (value === "APPLYING" || value === "VERIFYING" || value === "CONTRACTING") {
    return value;
  }
  if (fallback === "APPLYING" || fallback === "VERIFYING" || fallback === "CONTRACTING") {
    return fallback;
  }
  throw new SchemaMigrationLedgerModelError(
    "SCHEMA_MIGRATION_FIELD_INVALID",
    "halt requires halted_subphase APPLYING, VERIFYING, or CONTRACTING",
  );
}

export function advanceSchemaMigrationPhase(
  input: AdvanceSchemaMigrationPhaseInput,
): SchemaMigrationLedgerRecord {
  const current = cloneSchemaMigrationLedgerRecord(input.ledger);
  const targetState = getNextSchemaMigrationLedgerPhaseState(
    current.phase_state,
    input.transition_event_code,
    current.halted_subphase,
  );

  let schemaReaderWindowContract = valueOrExisting(
    input.schema_reader_window_contract,
    current.schema_reader_window_contract,
  );
  let backfillExecutionContract = valueOrExisting(
    input.backfill_execution_contract,
    current.backfill_execution_contract,
  );
  let appliedAt = valueOrExisting(input.applied_at, current.applied_at);
  let verifiedAt = valueOrExisting(input.verified_at, current.verified_at);
  let rollbackClass: SchemaMigrationRollbackClass = valueOrExisting(
    input.rollback_class,
    current.rollback_class,
  );
  let verificationRef = valueOrExisting(input.verification_ref, current.verification_ref);
  let haltedSubphase = valueOrExisting(input.halted_subphase, current.halted_subphase);
  let compatibilityWindowClosedAt = valueOrExisting(
    input.compatibility_window_closed_at,
    current.compatibility_window_closed_at,
  );
  let failureRef = valueOrExisting(input.failure_ref, current.failure_ref);

  switch (input.transition_event_code) {
    case "start_apply":
      appliedAt = input.applied_at ?? input.transition_applied_at;
      verifiedAt = null;
      verificationRef = null;
      haltedSubphase = null;
      compatibilityWindowClosedAt = null;
      failureRef = null;
      rollbackClass = "ROLLBACK_SAFE";
      break;
    case "apply_complete":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verifiedAt = null;
      verificationRef = null;
      haltedSubphase = null;
      compatibilityWindowClosedAt = null;
      failureRef = null;
      rollbackClass = "ROLLBACK_SAFE";
      break;
    case "start_verify":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verificationRef = requireNonNullString("verification_ref", verificationRef);
      verifiedAt = null;
      haltedSubphase = null;
      failureRef = null;
      break;
    case "verify_success":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verificationRef = requireNonNullString("verification_ref", verificationRef);
      verifiedAt = input.verified_at ?? input.transition_applied_at;
      haltedSubphase = null;
      failureRef = null;
      compatibilityWindowClosedAt = null;
      rollbackClass =
        schemaReaderWindowContract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
          ? "FAIL_FORWARD_ONLY"
          : "ROLLBACK_SAFE";
      break;
    case "start_contract":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verifiedAt = requireNonNullString("verified_at", verifiedAt);
      verificationRef = requireNonNullString("verification_ref", verificationRef);
      compatibilityWindowClosedAt =
        input.compatibility_window_closed_at ?? input.transition_applied_at;
      haltedSubphase = null;
      failureRef = null;
      rollbackClass = "FAIL_FORWARD_ONLY";
      break;
    case "contract_complete":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verifiedAt = requireNonNullString("verified_at", verifiedAt);
      verificationRef = requireNonNullString("verification_ref", verificationRef);
      compatibilityWindowClosedAt = requireNonNullString(
        "compatibility_window_closed_at",
        compatibilityWindowClosedAt,
      );
      haltedSubphase = null;
      failureRef = null;
      rollbackClass = "FAIL_FORWARD_ONLY";
      break;
    case "halt":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      failureRef = requireNonNullString("failure_ref", failureRef);
      haltedSubphase = requireHaltSubphase(input.halted_subphase, current.phase_state);
      if (haltedSubphase === "APPLYING") {
        verificationRef = null;
      }
      verifiedAt = null;
      compatibilityWindowClosedAt = null;
      rollbackClass =
        schemaReaderWindowContract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
          ? "FAIL_FORWARD_ONLY"
          : rollbackClass;
      break;
    case "fail":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      failureRef = requireNonNullString("failure_ref", failureRef);
      haltedSubphase = null;
      verifiedAt = null;
      compatibilityWindowClosedAt = null;
      rollbackClass =
        schemaReaderWindowContract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
          ? "FAIL_FORWARD_ONLY"
          : rollbackClass;
      break;
    case "resume_apply":
      appliedAt = appliedAt ?? input.transition_applied_at;
      verifiedAt = null;
      verificationRef = null;
      haltedSubphase = null;
      compatibilityWindowClosedAt = null;
      failureRef = null;
      rollbackClass = "ROLLBACK_SAFE";
      break;
    case "resume_verify":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verificationRef = requireNonNullString("verification_ref", verificationRef);
      verifiedAt = null;
      haltedSubphase = null;
      failureRef = null;
      break;
    case "resume_contract":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verifiedAt = requireNonNullString("verified_at", verifiedAt);
      verificationRef = requireNonNullString("verification_ref", verificationRef);
      compatibilityWindowClosedAt =
        input.compatibility_window_closed_at ?? input.transition_applied_at;
      haltedSubphase = null;
      failureRef = null;
      rollbackClass = "FAIL_FORWARD_ONLY";
      break;
    case "supersede":
      appliedAt = requireNonNullString("applied_at", appliedAt);
      verifiedAt = requireNonNullString("verified_at", verifiedAt);
      verificationRef = requireNonNullString("verification_ref", verificationRef);
      rollbackClass =
        schemaReaderWindowContract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
          ? "FAIL_FORWARD_ONLY"
          : rollbackClass;
      break;
    case "migration_planned":
      throw new SchemaMigrationLedgerModelError(
        "SCHEMA_MIGRATION_ILLEGAL_TRANSITION",
        "migration_planned is only valid for initial ledger creation",
      );
  }

  return buildSchemaMigrationLedgerRecord({
    migration_id: current.migration_id,
    datastore_ref: current.datastore_ref,
    target_version: current.target_version,
    target_schema_bundle_hash: current.target_schema_bundle_hash,
    compatibility_window_ref: current.compatibility_window_ref,
    contract_phase_required: current.contract_phase_required,
    phase_state: targetState,
    previous_state_or_null: current.phase_state,
    transition_event_code: input.transition_event_code,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    schema_reader_window_contract: schemaReaderWindowContract,
    backfill_execution_contract: backfillExecutionContract,
    applied_at: appliedAt,
    verified_at: verifiedAt,
    rollback_class: rollbackClass,
    verification_ref: verificationRef,
    halted_subphase: haltedSubphase,
    compatibility_window_closed_at: compatibilityWindowClosedAt,
    failure_ref: failureRef,
  });
}
