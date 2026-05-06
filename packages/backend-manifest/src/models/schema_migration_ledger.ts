import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  normalizeBackfillExecutionContract,
  type BackfillExecutionContractRecord,
} from "./backfill_execution_contract.ts";
import {
  normalizeSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
} from "./schema_reader_window_contract.ts";

export type SchemaMigrationLedgerPhaseState =
  | "PLANNED"
  | "APPLYING"
  | "APPLIED"
  | "VERIFYING"
  | "VERIFIED"
  | "CONTRACTING"
  | "CONTRACTED"
  | "HALTED"
  | "FAILED"
  | "SUPERSEDED";

export type SchemaMigrationLedgerTransitionEventCode =
  | "start_apply"
  | "apply_complete"
  | "start_verify"
  | "verify_success"
  | "start_contract"
  | "contract_complete"
  | "halt"
  | "fail"
  | "resume_apply"
  | "resume_verify"
  | "resume_contract"
  | "supersede";

export type SchemaMigrationLedgerStateTransitionContract = {
  contract_version: "STATE_TRANSITION_CONTRACT_V1";
  object_family: "SCHEMA_MIGRATION_LEDGER";
  machine_code: "SCHEMA_MIGRATION_LEDGER_PHASE_V1";
  state_field_name: "phase_state";
  current_state: SchemaMigrationLedgerPhaseState;
  previous_state_or_null: SchemaMigrationLedgerPhaseState | null;
  transition_event_code: SchemaMigrationLedgerTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_application_policy: "NAMED_EVENT_ONLY";
  illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE";
  concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE";
  terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE";
  recovery_supersession_policy: "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE";
  audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF";
  typed_rejection_family: "ILLEGAL_STATE_TRANSITION";
};

export type SchemaMigrationLedgerRecord = {
  migration_id: string;
  datastore_ref: string;
  target_version: string;
  target_schema_bundle_hash: string;
  compatibility_window_ref: string;
  contract_phase_required: boolean;
  phase_state: SchemaMigrationLedgerPhaseState;
  state_transition_contract: SchemaMigrationLedgerStateTransitionContract;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  backfill_execution_contract: BackfillExecutionContractRecord;
  applied_at: string | null;
  verified_at: string | null;
  rollback_class: "ROLLBACK_SAFE" | "FAIL_FORWARD_ONLY";
  verification_ref: string | null;
  halted_subphase: "APPLYING" | "VERIFYING" | "CONTRACTING" | null;
  compatibility_window_closed_at: string | null;
  failure_ref: string | null;
};

export const SCHEMA_MIGRATION_LEDGER_MACHINE_CODE = "SCHEMA_MIGRATION_LEDGER_PHASE_V1";
export const SCHEMA_MIGRATION_LEDGER_STATE_FIELD = "phase_state";
export const SCHEMA_MIGRATION_LEDGER_SCHEMA_ID =
  "https://taxat.dev/schemas/schema_migration_ledger.schema.json";

export const SCHEMA_MIGRATION_LEDGER_ALLOWED_TRANSITIONS = {
  PLANNED: {
    start_apply: "APPLYING",
  },
  APPLYING: {
    apply_complete: "APPLIED",
    halt: "HALTED",
    fail: "FAILED",
  },
  APPLIED: {
    start_verify: "VERIFYING",
  },
  VERIFYING: {
    verify_success: "VERIFIED",
    halt: "HALTED",
    fail: "FAILED",
  },
  VERIFIED: {
    start_contract: "CONTRACTING",
    supersede: "SUPERSEDED",
  },
  CONTRACTING: {
    contract_complete: "CONTRACTED",
    halt: "HALTED",
    fail: "FAILED",
  },
  CONTRACTED: {
    supersede: "SUPERSEDED",
  },
  HALTED: {
    resume_apply: "APPLYING",
    resume_verify: "VERIFYING",
    resume_contract: "CONTRACTING",
  },
  FAILED: {},
  SUPERSEDED: {},
} as const satisfies Record<
  SchemaMigrationLedgerPhaseState,
  Partial<Record<SchemaMigrationLedgerTransitionEventCode, SchemaMigrationLedgerPhaseState>>
>;

type SchemaMigrationLedgerErrorCode =
  | "SCHEMA_MIGRATION_BACKFILL_REQUIRED"
  | "SCHEMA_MIGRATION_CHRONOLOGY_INVALID"
  | "SCHEMA_MIGRATION_ILLEGAL_TRANSITION"
  | "SCHEMA_MIGRATION_READER_WINDOW_INVALID"
  | "SCHEMA_MIGRATION_STATE_CONTRACT_MISMATCH";

export class SchemaMigrationLedgerModelError extends Error {
  readonly code: SchemaMigrationLedgerErrorCode;

  constructor(code: SchemaMigrationLedgerErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaMigrationLedgerModelError";
    this.code = code;
  }
}

export class SchemaMigrationLedgerLifecycleError extends Error {
  readonly code = "SCHEMA_MIGRATION_ILLEGAL_TRANSITION" as const;
  readonly current_state: SchemaMigrationLedgerPhaseState;
  readonly event_code: SchemaMigrationLedgerTransitionEventCode;

  constructor(
    currentState: SchemaMigrationLedgerPhaseState,
    eventCode: SchemaMigrationLedgerTransitionEventCode,
  ) {
    super(`SCHEMA_MIGRATION_ILLEGAL_TRANSITION: ${currentState} cannot handle ${eventCode}`);
    this.name = "SchemaMigrationLedgerLifecycleError";
    this.current_state = currentState;
    this.event_code = eventCode;
  }
}

function assertLedger(
  condition: unknown,
  code: SchemaMigrationLedgerErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new SchemaMigrationLedgerModelError(code, detail);
  }
}

function normalizeOptionalString(label: string, value: string | null) {
  return value === null ? null : requireTrimmedString(label, value);
}

function normalizeOptionalInstant(label: string, value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

export function getNextSchemaMigrationLedgerPhaseState(
  currentState: SchemaMigrationLedgerPhaseState,
  eventCode: SchemaMigrationLedgerTransitionEventCode,
  haltedSubphase?: SchemaMigrationLedgerRecord["halted_subphase"],
) {
  const nextState = SCHEMA_MIGRATION_LEDGER_ALLOWED_TRANSITIONS[currentState]?.[eventCode];
  if (!nextState) {
    throw new SchemaMigrationLedgerLifecycleError(currentState, eventCode);
  }
  if (currentState === "HALTED") {
    const eventBySubphase = {
      APPLYING: "resume_apply",
      VERIFYING: "resume_verify",
      CONTRACTING: "resume_contract",
    } as const;
    if (haltedSubphase && eventBySubphase[haltedSubphase] !== eventCode) {
      throw new SchemaMigrationLedgerLifecycleError(currentState, eventCode);
    }
  }
  return nextState;
}

export function buildSchemaMigrationLedgerStateTransitionContract(input: {
  current_state: SchemaMigrationLedgerPhaseState;
  previous_state_or_null: SchemaMigrationLedgerPhaseState | null;
  transition_event_code: SchemaMigrationLedgerTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
}): SchemaMigrationLedgerStateTransitionContract {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "SCHEMA_MIGRATION_LEDGER",
    machine_code: SCHEMA_MIGRATION_LEDGER_MACHINE_CODE,
    state_field_name: SCHEMA_MIGRATION_LEDGER_STATE_FIELD,
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "schema_migration_ledger.transition_audit_ref",
      input.transition_audit_ref,
    ),
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

function normalizeStateTransitionContract(
  contract: SchemaMigrationLedgerStateTransitionContract,
  state: SchemaMigrationLedgerPhaseState,
): SchemaMigrationLedgerStateTransitionContract {
  assertLedger(
    contract.object_family === "SCHEMA_MIGRATION_LEDGER" &&
      contract.machine_code === SCHEMA_MIGRATION_LEDGER_MACHINE_CODE &&
      contract.state_field_name === SCHEMA_MIGRATION_LEDGER_STATE_FIELD &&
      contract.current_state === state,
    "SCHEMA_MIGRATION_STATE_CONTRACT_MISMATCH",
    "state_transition_contract must bind SCHEMA_MIGRATION_LEDGER_PHASE_V1.phase_state",
  );
  return {
    ...structuredClone(contract),
    object_family: "SCHEMA_MIGRATION_LEDGER",
    machine_code: SCHEMA_MIGRATION_LEDGER_MACHINE_CODE,
    state_field_name: SCHEMA_MIGRATION_LEDGER_STATE_FIELD,
    transition_applied_at: normalizeUtcInstantString(contract.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "schema_migration_ledger.state_transition_contract.transition_audit_ref",
      contract.transition_audit_ref,
    ),
  };
}

function assertChronology(ledger: SchemaMigrationLedgerRecord) {
  const afterPlanned = [
    "APPLYING",
    "APPLIED",
    "VERIFYING",
    "VERIFIED",
    "CONTRACTING",
    "CONTRACTED",
    "HALTED",
    "FAILED",
    "SUPERSEDED",
  ].includes(ledger.phase_state);
  assertLedger(
    (ledger.phase_state === "PLANNED" && ledger.applied_at === null) ||
      (afterPlanned && ledger.applied_at !== null),
    "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
    "applied_at is null only for PLANNED migrations and required after apply starts",
  );
  if (ledger.phase_state === "PLANNED") {
    assertLedger(
      ledger.verified_at === null &&
        ledger.verification_ref === null &&
        ledger.halted_subphase === null &&
        ledger.compatibility_window_closed_at === null &&
        ledger.failure_ref === null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "PLANNED migrations cannot carry verification, halt, closure, or failure posture",
    );
  }

  const verificationRequired = [
    "VERIFYING",
    "VERIFIED",
    "CONTRACTING",
    "CONTRACTED",
    "SUPERSEDED",
  ].includes(ledger.phase_state);
  assertLedger(
    !verificationRequired || ledger.verification_ref !== null,
    "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
    `${ledger.phase_state} migrations require verification_ref`,
  );
  const verifiedAtRequired = ["VERIFIED", "CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(
    ledger.phase_state,
  );
  assertLedger(
    !verifiedAtRequired || ledger.verified_at !== null,
    "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
    `${ledger.phase_state} migrations require verified_at`,
  );
  if (ledger.verified_at !== null) {
    assertLedger(
      verifiedAtRequired,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "verified_at can appear only in verified or later phases",
    );
  }
  if (ledger.phase_state === "HALTED") {
    assertLedger(
      ledger.halted_subphase !== null && ledger.failure_ref !== null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "HALTED migrations require halted_subphase and failure_ref",
    );
  }
  if (ledger.phase_state === "FAILED") {
    assertLedger(
      ledger.failure_ref !== null && ledger.halted_subphase === null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "FAILED migrations require failure_ref and no halted_subphase",
    );
  }
}

function assertWindowAndBackfill(ledger: SchemaMigrationLedgerRecord) {
  assertLedger(
    ledger.schema_reader_window_contract.writer_schema_bundle_hash ===
      ledger.target_schema_bundle_hash &&
      ledger.schema_reader_window_contract.compatibility_window_ref ===
        ledger.compatibility_window_ref,
    "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
    "ledger target bundle and compatibility window must mirror the reader-window contract",
  );
  assertLedger(
    ledger.backfill_execution_contract.migration_id === ledger.migration_id &&
      ledger.backfill_execution_contract.target_schema_bundle_hash ===
        ledger.target_schema_bundle_hash &&
      ledger.backfill_execution_contract.target_version === ledger.target_version,
    "SCHEMA_MIGRATION_BACKFILL_REQUIRED",
    "backfill execution contract must be bound to the same migration, target version, and target schema bundle",
  );

  if (
    ledger.backfill_execution_contract.execution_requirement === "NO_BACKFILL_REQUIRED" &&
    ["PLANNED", "APPLYING", "APPLIED"].includes(ledger.phase_state)
  ) {
    assertLedger(
      ledger.schema_reader_window_contract.window_state ===
        "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "pre-verify no-backfill migrations must remain in expand-only reader-window posture",
    );
  }

  if (
    ledger.backfill_execution_contract.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED" &&
    ["PLANNED", "IN_PROGRESS", "HALTED", "FAILED"].includes(
      ledger.backfill_execution_contract.execution_state,
    )
  ) {
    assertLedger(
      ledger.schema_reader_window_contract.window_state ===
        "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "incomplete backfill requires BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
    );
  }

  if (
    ledger.backfill_execution_contract.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED" &&
    ["VERIFYING", "VERIFIED", "CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(
      ledger.phase_state,
    )
  ) {
    assertLedger(
      ledger.backfill_execution_contract.execution_state === "COMPLETE",
      "SCHEMA_MIGRATION_BACKFILL_REQUIRED",
      "backfill-required migrations must complete backfill before verification or contract phases",
    );
  }

  if (ledger.phase_state === "VERIFIED") {
    assertLedger(
      ledger.schema_reader_window_contract.window_state ===
        "VERIFIED_PREVIOUS_READERS_SUPPORTED",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "VERIFIED migration ledgers require VERIFIED_PREVIOUS_READERS_SUPPORTED",
    );
  }

  const closedPhase = ["CONTRACTING", "CONTRACTED", "SUPERSEDED"].includes(ledger.phase_state);
  if (closedPhase || ledger.compatibility_window_closed_at !== null) {
    assertLedger(
      ledger.rollback_class === "FAIL_FORWARD_ONLY" &&
        ledger.schema_reader_window_contract.window_state ===
          "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "closed schema windows require CONTRACT_ELIGIBLE_WINDOW_CLOSED and FAIL_FORWARD_ONLY",
    );
  }
  if (["CONTRACTING", "CONTRACTED"].includes(ledger.phase_state)) {
    assertLedger(
      ledger.contract_phase_required && ledger.compatibility_window_closed_at !== null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "contract phases require explicit contract phase and compatibility window closure",
    );
  }
  if (!ledger.contract_phase_required) {
    assertLedger(
      !["CONTRACTING", "CONTRACTED"].includes(ledger.phase_state),
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "migrations without a contract phase cannot enter CONTRACTING or CONTRACTED",
    );
  }
}

export function normalizeSchemaMigrationLedgerRecord(
  record: SchemaMigrationLedgerRecord,
): SchemaMigrationLedgerRecord {
  assertLedger(
    record.backfill_execution_contract !== undefined && record.backfill_execution_contract !== null,
    "SCHEMA_MIGRATION_BACKFILL_REQUIRED",
    "SchemaMigrationLedger requires a backfill_execution_contract",
  );
  const phaseState = record.phase_state;
  const normalized: SchemaMigrationLedgerRecord = {
    migration_id: requireTrimmedString("schema_migration_ledger.migration_id", record.migration_id),
    datastore_ref: requireTrimmedString("schema_migration_ledger.datastore_ref", record.datastore_ref),
    target_version: requireTrimmedString(
      "schema_migration_ledger.target_version",
      record.target_version,
    ),
    target_schema_bundle_hash: requireTrimmedString(
      "schema_migration_ledger.target_schema_bundle_hash",
      record.target_schema_bundle_hash,
    ),
    compatibility_window_ref: requireTrimmedString(
      "schema_migration_ledger.compatibility_window_ref",
      record.compatibility_window_ref,
    ),
    contract_phase_required: record.contract_phase_required,
    phase_state: phaseState,
    state_transition_contract: normalizeStateTransitionContract(
      record.state_transition_contract,
      phaseState,
    ),
    schema_reader_window_contract: normalizeSchemaReaderWindowContract(
      record.schema_reader_window_contract,
    ),
    backfill_execution_contract: normalizeBackfillExecutionContract(
      record.backfill_execution_contract,
    ),
    applied_at: normalizeOptionalInstant("schema_migration_ledger.applied_at", record.applied_at),
    verified_at: normalizeOptionalInstant(
      "schema_migration_ledger.verified_at",
      record.verified_at,
    ),
    rollback_class: record.rollback_class,
    verification_ref: normalizeOptionalString(
      "schema_migration_ledger.verification_ref",
      record.verification_ref,
    ),
    halted_subphase: record.halted_subphase,
    compatibility_window_closed_at: normalizeOptionalInstant(
      "schema_migration_ledger.compatibility_window_closed_at",
      record.compatibility_window_closed_at,
    ),
    failure_ref: normalizeOptionalString(
      "schema_migration_ledger.failure_ref",
      record.failure_ref,
    ),
  };
  assertChronology(normalized);
  assertWindowAndBackfill(normalized);
  return normalized;
}

export function cloneSchemaMigrationLedgerRecord(record: SchemaMigrationLedgerRecord) {
  return structuredClone(record);
}
