import type {
  SchemaMigrationLedger,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  normalizeBackfillExecutionContract,
  type BackfillExecutionContractRecord,
} from "./backfill_execution_contract.ts";
import {
  normalizeSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
} from "./schema_reader_window_contract.ts";

export type SchemaMigrationLedgerPhaseState =
  SchemaMigrationLedger["phase_state"];
export type SchemaMigrationRollbackClass = SchemaMigrationLedger["rollback_class"];
export type SchemaMigrationHaltedSubphase = NonNullable<
  SchemaMigrationLedger["halted_subphase"]
>;
export type SchemaMigrationLedgerTransitionEventCode =
  | "migration_planned"
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

export type SchemaMigrationLedgerStateTransitionContract =
  StateTransitionContract & {
    object_family: "SCHEMA_MIGRATION_LEDGER";
    machine_code: "SCHEMA_MIGRATION_LEDGER_PHASE_V1";
    state_field_name: "phase_state";
    current_state: SchemaMigrationLedgerPhaseState;
    previous_state_or_null: SchemaMigrationLedgerPhaseState | null;
    transition_event_code: SchemaMigrationLedgerTransitionEventCode;
  };

export type SchemaMigrationLedgerRecord = Omit<
  SchemaMigrationLedger,
  | "state_transition_contract"
  | "schema_reader_window_contract"
  | "backfill_execution_contract"
  | "applied_at"
  | "verified_at"
  | "compatibility_window_closed_at"
> & {
  state_transition_contract: SchemaMigrationLedgerStateTransitionContract;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  backfill_execution_contract: BackfillExecutionContractRecord;
  applied_at: string | null;
  verified_at: string | null;
  compatibility_window_closed_at: string | null;
};

export type BuildSchemaMigrationLedgerRecordInput = {
  migration_id: unknown;
  datastore_ref: unknown;
  target_version: unknown;
  target_schema_bundle_hash: unknown;
  compatibility_window_ref: unknown;
  contract_phase_required: unknown;
  phase_state: unknown;
  state_transition_contract?: unknown;
  previous_state_or_null?: unknown;
  transition_event_code?: unknown;
  transition_applied_at: unknown;
  transition_audit_ref: unknown;
  schema_reader_window_contract: unknown;
  backfill_execution_contract: unknown;
  applied_at?: unknown;
  verified_at?: unknown;
  rollback_class?: unknown;
  verification_ref?: unknown;
  halted_subphase?: unknown;
  compatibility_window_closed_at?: unknown;
  failure_ref?: unknown;
};

export const SCHEMA_MIGRATION_LEDGER_SCHEMA_ID =
  "https://taxat.dev/schemas/schema_migration_ledger.schema.json";
export const SCHEMA_MIGRATION_LEDGER_MACHINE_CODE =
  "SCHEMA_MIGRATION_LEDGER_PHASE_V1";
export const SCHEMA_MIGRATION_LEDGER_STATE_FIELD = "phase_state";

export const SCHEMA_MIGRATION_LEDGER_PHASE_STATES = [
  "PLANNED",
  "APPLYING",
  "APPLIED",
  "VERIFYING",
  "VERIFIED",
  "CONTRACTING",
  "CONTRACTED",
  "HALTED",
  "FAILED",
  "SUPERSEDED",
] as const satisfies readonly SchemaMigrationLedgerPhaseState[];

export const SCHEMA_MIGRATION_LEDGER_TRANSITION_EVENTS = [
  "migration_planned",
  "start_apply",
  "apply_complete",
  "start_verify",
  "verify_success",
  "start_contract",
  "contract_complete",
  "halt",
  "fail",
  "resume_apply",
  "resume_verify",
  "resume_contract",
  "supersede",
] as const satisfies readonly SchemaMigrationLedgerTransitionEventCode[];

export const SCHEMA_MIGRATION_LEDGER_ALLOWED_TRANSITIONS = [
  ["PLANNED", "start_apply", "APPLYING"],
  ["APPLYING", "apply_complete", "APPLIED"],
  ["APPLYING", "halt", "HALTED"],
  ["APPLYING", "fail", "FAILED"],
  ["APPLIED", "start_verify", "VERIFYING"],
  ["VERIFYING", "verify_success", "VERIFIED"],
  ["VERIFYING", "halt", "HALTED"],
  ["VERIFYING", "fail", "FAILED"],
  ["VERIFIED", "start_contract", "CONTRACTING"],
  ["CONTRACTING", "contract_complete", "CONTRACTED"],
  ["CONTRACTING", "halt", "HALTED"],
  ["CONTRACTING", "fail", "FAILED"],
  ["HALTED", "resume_apply", "APPLYING"],
  ["HALTED", "resume_verify", "VERIFYING"],
  ["HALTED", "resume_contract", "CONTRACTING"],
  ["VERIFIED", "supersede", "SUPERSEDED"],
  ["CONTRACTED", "supersede", "SUPERSEDED"],
] as const satisfies readonly [
  SchemaMigrationLedgerPhaseState,
  SchemaMigrationLedgerTransitionEventCode,
  SchemaMigrationLedgerPhaseState,
][];

export type SchemaMigrationLedgerModelErrorCode =
  | "SCHEMA_MIGRATION_FIELD_INVALID"
  | "SCHEMA_MIGRATION_STATE_CONTRACT_INVALID"
  | "SCHEMA_MIGRATION_ILLEGAL_TRANSITION"
  | "SCHEMA_MIGRATION_CHRONOLOGY_INVALID"
  | "SCHEMA_MIGRATION_READER_WINDOW_INVALID"
  | "SCHEMA_MIGRATION_BACKFILL_INVALID";

export class SchemaMigrationLedgerModelError extends Error {
  readonly code: SchemaMigrationLedgerModelErrorCode;

  constructor(code: SchemaMigrationLedgerModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaMigrationLedgerModelError";
    this.code = code;
  }
}

export class SchemaMigrationLedgerLifecycleError extends SchemaMigrationLedgerModelError {
  readonly current_state: SchemaMigrationLedgerPhaseState;
  readonly event_code: SchemaMigrationLedgerTransitionEventCode;

  constructor(
    currentState: SchemaMigrationLedgerPhaseState,
    eventCode: SchemaMigrationLedgerTransitionEventCode,
  ) {
    super(
      "SCHEMA_MIGRATION_ILLEGAL_TRANSITION",
      `cannot apply ${eventCode} from phase_state=${currentState}`,
    );
    this.name = "SchemaMigrationLedgerLifecycleError";
    this.current_state = currentState;
    this.event_code = eventCode;
  }
}

const phaseStateSet = new Set<SchemaMigrationLedgerPhaseState>(
  SCHEMA_MIGRATION_LEDGER_PHASE_STATES,
);
const eventCodeSet = new Set<SchemaMigrationLedgerTransitionEventCode>(
  SCHEMA_MIGRATION_LEDGER_TRANSITION_EVENTS,
);
const postPlannedStates = new Set<SchemaMigrationLedgerPhaseState>([
  "APPLYING",
  "APPLIED",
  "VERIFYING",
  "VERIFIED",
  "CONTRACTING",
  "CONTRACTED",
  "HALTED",
  "FAILED",
  "SUPERSEDED",
]);
const verificationRequiredStates = new Set<SchemaMigrationLedgerPhaseState>([
  "VERIFYING",
  "VERIFIED",
  "CONTRACTING",
  "CONTRACTED",
  "SUPERSEDED",
]);
const verifiedAtRequiredStates = new Set<SchemaMigrationLedgerPhaseState>([
  "VERIFIED",
  "CONTRACTING",
  "CONTRACTED",
  "SUPERSEDED",
]);
const closedWindowStates = new Set<SchemaMigrationLedgerPhaseState>([
  "CONTRACTING",
  "CONTRACTED",
  "SUPERSEDED",
]);

function assertLedger(
  condition: unknown,
  code: SchemaMigrationLedgerModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new SchemaMigrationLedgerModelError(code, detail);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireTrimmedString(label: string, value: unknown) {
  assertLedger(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "SCHEMA_MIGRATION_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireBoolean(label: string, value: unknown) {
  assertLedger(
    typeof value === "boolean",
    "SCHEMA_MIGRATION_FIELD_INVALID",
    `${label} must be a boolean`,
  );
  return value;
}

function requireNullableTrimmedString(label: string, value: unknown) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  return requireTrimmedString(label, value);
}

function requireNullableInstant(label: string, value: unknown) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new SchemaMigrationLedgerModelError(
      "SCHEMA_MIGRATION_FIELD_INVALID",
      `${label} must be a valid UTC-normalizable instant: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function requirePhaseState(value: unknown): SchemaMigrationLedgerPhaseState {
  assertLedger(
    typeof value === "string" && phaseStateSet.has(value as SchemaMigrationLedgerPhaseState),
    "SCHEMA_MIGRATION_FIELD_INVALID",
    "phase_state must be a governed schema migration phase",
  );
  return value as SchemaMigrationLedgerPhaseState;
}

function requireTransitionEventCode(
  value: unknown,
): SchemaMigrationLedgerTransitionEventCode {
  assertLedger(
    typeof value === "string" && eventCodeSet.has(value as SchemaMigrationLedgerTransitionEventCode),
    "SCHEMA_MIGRATION_STATE_CONTRACT_INVALID",
    "transition_event_code must be a governed schema migration event code",
  );
  return value as SchemaMigrationLedgerTransitionEventCode;
}

function requireRollbackClass(value: unknown): SchemaMigrationRollbackClass {
  assertLedger(
    value === "ROLLBACK_SAFE" || value === "FAIL_FORWARD_ONLY",
    "SCHEMA_MIGRATION_FIELD_INVALID",
    "rollback_class must be ROLLBACK_SAFE or FAIL_FORWARD_ONLY",
  );
  return value;
}

function requireNullableHaltedSubphase(value: unknown) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  assertLedger(
    value === "APPLYING" || value === "VERIFYING" || value === "CONTRACTING",
    "SCHEMA_MIGRATION_FIELD_INVALID",
    "halted_subphase must be APPLYING, VERIFYING, CONTRACTING, or null",
  );
  return value;
}

function requirePolicyLiteral<T extends string>(
  label: string,
  actual: unknown,
  expected: T,
) {
  assertLedger(
    actual === expected,
    "SCHEMA_MIGRATION_STATE_CONTRACT_INVALID",
    `${label} must be ${expected}`,
  );
  return expected;
}

function targetStateForTransition(
  from: SchemaMigrationLedgerPhaseState,
  eventCode: SchemaMigrationLedgerTransitionEventCode,
) {
  const transition = SCHEMA_MIGRATION_LEDGER_ALLOWED_TRANSITIONS.find(
    ([previousState, event]) => previousState === from && event === eventCode,
  );
  return transition?.[2];
}

function isLegalSchemaMigrationTransition(input: {
  current_state: SchemaMigrationLedgerPhaseState;
  previous_state_or_null: SchemaMigrationLedgerPhaseState | null;
  transition_event_code: SchemaMigrationLedgerTransitionEventCode;
}) {
  return (
    (input.previous_state_or_null === null &&
      input.current_state === "PLANNED" &&
      input.transition_event_code === "migration_planned") ||
    SCHEMA_MIGRATION_LEDGER_ALLOWED_TRANSITIONS.some(
      ([previousState, event, nextState]) =>
        input.previous_state_or_null === previousState &&
        input.transition_event_code === event &&
        input.current_state === nextState,
    )
  );
}

export function getNextSchemaMigrationLedgerPhaseState(
  currentState: SchemaMigrationLedgerPhaseState,
  eventCode: SchemaMigrationLedgerTransitionEventCode,
  haltedSubphase?: SchemaMigrationHaltedSubphase | null,
) {
  if (eventCode === "migration_planned") {
    throw new SchemaMigrationLedgerLifecycleError(currentState, eventCode);
  }
  const target = targetStateForTransition(currentState, eventCode);
  if (!target) {
    throw new SchemaMigrationLedgerLifecycleError(currentState, eventCode);
  }
  if (currentState === "HALTED" && haltedSubphase) {
    const expectedResumeEvent = {
      APPLYING: "resume_apply",
      VERIFYING: "resume_verify",
      CONTRACTING: "resume_contract",
    } as const;
    if (expectedResumeEvent[haltedSubphase] !== eventCode) {
      throw new SchemaMigrationLedgerLifecycleError(currentState, eventCode);
    }
  }
  return target;
}

export function buildSchemaMigrationLedgerStateTransitionContract(input: {
  current_state: unknown;
  previous_state_or_null: unknown;
  transition_event_code: unknown;
  transition_applied_at: unknown;
  transition_audit_ref: unknown;
}): SchemaMigrationLedgerStateTransitionContract {
  const currentState = requirePhaseState(input.current_state);
  const previousState =
    input.previous_state_or_null === null
      ? null
      : requirePhaseState(input.previous_state_or_null);
  const eventCode = requireTransitionEventCode(input.transition_event_code);
  assertLedger(
    previousState !== currentState,
    "SCHEMA_MIGRATION_STATE_CONTRACT_INVALID",
    "state_transition_contract.previous_state_or_null must not equal current_state",
  );
  assertLedger(
    isLegalSchemaMigrationTransition({
      current_state: currentState,
      previous_state_or_null: previousState,
      transition_event_code: eventCode,
    }),
    "SCHEMA_MIGRATION_ILLEGAL_TRANSITION",
    "state_transition_contract must encode the legal initial migration event or a legal named phase transition",
  );
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "SCHEMA_MIGRATION_LEDGER",
    machine_code: SCHEMA_MIGRATION_LEDGER_MACHINE_CODE,
    state_field_name: SCHEMA_MIGRATION_LEDGER_STATE_FIELD,
    current_state: currentState,
    previous_state_or_null: previousState,
    transition_event_code: eventCode,
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "state_transition_contract.transition_audit_ref",
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

export function normalizeSchemaMigrationLedgerStateTransitionContract(
  input: unknown,
  currentState: SchemaMigrationLedgerPhaseState,
): SchemaMigrationLedgerStateTransitionContract {
  assertLedger(
    isPlainObject(input),
    "SCHEMA_MIGRATION_STATE_CONTRACT_INVALID",
    "state_transition_contract must be an object",
  );
  requirePolicyLiteral(
    "state_transition_contract.contract_version",
    input.contract_version,
    "STATE_TRANSITION_CONTRACT_V1",
  );
  requirePolicyLiteral(
    "state_transition_contract.object_family",
    input.object_family,
    "SCHEMA_MIGRATION_LEDGER",
  );
  requirePolicyLiteral(
    "state_transition_contract.machine_code",
    input.machine_code,
    SCHEMA_MIGRATION_LEDGER_MACHINE_CODE,
  );
  requirePolicyLiteral(
    "state_transition_contract.state_field_name",
    input.state_field_name,
    SCHEMA_MIGRATION_LEDGER_STATE_FIELD,
  );
  const transitionCurrentState = requirePhaseState(input.current_state);
  assertLedger(
    transitionCurrentState === currentState,
    "SCHEMA_MIGRATION_STATE_CONTRACT_INVALID",
    "state_transition_contract.current_state must mirror phase_state",
  );
  for (const [field, expectedValue] of Object.entries({
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  })) {
    requirePolicyLiteral(`state_transition_contract.${field}`, input[field], expectedValue);
  }
  return buildSchemaMigrationLedgerStateTransitionContract({
    current_state: transitionCurrentState,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
  });
}

export function buildSchemaMigrationLedgerRecord(
  input: BuildSchemaMigrationLedgerRecordInput,
): SchemaMigrationLedgerRecord {
  const phaseState = requirePhaseState(input.phase_state);
  const stateTransitionContract =
    input.state_transition_contract ??
    buildSchemaMigrationLedgerStateTransitionContract({
      current_state: phaseState,
      previous_state_or_null:
        typeof input.previous_state_or_null === "undefined"
          ? null
          : input.previous_state_or_null,
      transition_event_code:
        input.transition_event_code ??
        (phaseState === "PLANNED" ? "migration_planned" : undefined),
      transition_applied_at: input.transition_applied_at,
      transition_audit_ref: input.transition_audit_ref,
    });
  return normalizeSchemaMigrationLedgerRecord({
    migration_id: input.migration_id,
    datastore_ref: input.datastore_ref,
    target_version: input.target_version,
    target_schema_bundle_hash: input.target_schema_bundle_hash,
    compatibility_window_ref: input.compatibility_window_ref,
    contract_phase_required: input.contract_phase_required,
    phase_state: phaseState,
    state_transition_contract: stateTransitionContract,
    schema_reader_window_contract: input.schema_reader_window_contract,
    backfill_execution_contract: input.backfill_execution_contract,
    applied_at: input.applied_at,
    verified_at: input.verified_at,
    rollback_class: input.rollback_class ?? "ROLLBACK_SAFE",
    verification_ref: input.verification_ref,
    halted_subphase: input.halted_subphase,
    compatibility_window_closed_at: input.compatibility_window_closed_at,
    failure_ref: input.failure_ref,
  });
}

function assertChronology(ledger: SchemaMigrationLedgerRecord) {
  assertLedger(
    (ledger.phase_state === "PLANNED" && ledger.applied_at === null) ||
      (postPlannedStates.has(ledger.phase_state) && ledger.applied_at !== null),
    "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
    "applied_at is null only for PLANNED and required after apply starts",
  );
  if (ledger.phase_state === "PLANNED") {
    assertLedger(
      ledger.verified_at === null &&
        ledger.verification_ref === null &&
        ledger.halted_subphase === null &&
        ledger.compatibility_window_closed_at === null &&
        ledger.failure_ref === null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "PLANNED migrations cannot retain verification, halt, closure, or failure posture",
    );
  }

  assertLedger(
    !verificationRequiredStates.has(ledger.phase_state) ||
      ledger.verification_ref !== null,
    "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
    `${ledger.phase_state} migrations require verification_ref`,
  );
  assertLedger(
    !verifiedAtRequiredStates.has(ledger.phase_state) || ledger.verified_at !== null,
    "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
    `${ledger.phase_state} migrations require verified_at`,
  );
  if (ledger.verified_at !== null) {
    assertLedger(
      verifiedAtRequiredStates.has(ledger.phase_state),
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "verified_at can appear only in verified or later phases",
    );
  }
  if (ledger.applied_at !== null && ledger.verified_at !== null) {
    assertLedger(
      new Date(ledger.verified_at).getTime() >= new Date(ledger.applied_at).getTime(),
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "verified_at must not be earlier than applied_at",
    );
  }
  if (ledger.phase_state === "APPLIED") {
    assertLedger(
      ledger.verification_ref === null && ledger.verified_at === null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "APPLIED migrations cannot retain verification_ref or verified_at",
    );
  }
  if (ledger.phase_state === "VERIFYING") {
    assertLedger(
      ledger.verified_at === null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "VERIFYING migrations must keep verified_at null",
    );
  }
  if (ledger.halted_subphase !== null) {
    assertLedger(
      ledger.phase_state === "HALTED",
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "non-null halted_subphase must force phase_state=HALTED",
    );
  }
  if (ledger.failure_ref !== null) {
    assertLedger(
      ledger.phase_state === "HALTED" || ledger.phase_state === "FAILED",
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "non-null failure_ref is limited to HALTED or FAILED",
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
  if (ledger.compatibility_window_closed_at !== null) {
    assertLedger(
      verifiedAtRequiredStates.has(ledger.phase_state),
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "compatibility_window_closed_at can appear only in post-verification phases",
    );
  }
}

function assertReaderWindowAndBackfill(ledger: SchemaMigrationLedgerRecord) {
  assertLedger(
    ledger.schema_reader_window_contract.writer_schema_bundle_hash ===
      ledger.target_schema_bundle_hash &&
      ledger.schema_reader_window_contract.compatibility_window_ref ===
        ledger.compatibility_window_ref,
    "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
    "schema_reader_window_contract must mirror target_schema_bundle_hash and compatibility_window_ref",
  );
  assertLedger(
    ledger.backfill_execution_contract.migration_id === ledger.migration_id &&
      ledger.backfill_execution_contract.target_version === ledger.target_version &&
      ledger.backfill_execution_contract.target_schema_bundle_hash ===
        ledger.target_schema_bundle_hash,
    "SCHEMA_MIGRATION_BACKFILL_INVALID",
    "backfill_execution_contract must mirror migration_id, target_version, and target_schema_bundle_hash",
  );

  if (
    ledger.backfill_execution_contract.execution_requirement === "NO_BACKFILL_REQUIRED" &&
    ["PLANNED", "APPLYING", "APPLIED"].includes(ledger.phase_state)
  ) {
    assertLedger(
      ledger.schema_reader_window_contract.window_state ===
        "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "pre-verification no-backfill migrations must remain expand-only",
    );
  }
  if (
    ledger.backfill_execution_contract.execution_requirement ===
      "IDEMPOTENT_BACKFILL_REQUIRED" &&
    ["PLANNED", "IN_PROGRESS", "HALTED", "FAILED"].includes(
      ledger.backfill_execution_contract.execution_state,
    )
  ) {
    assertLedger(
      ledger.schema_reader_window_contract.window_state ===
        "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "outstanding idempotent backfill requires the backfill reader-window posture",
    );
  }
  if (
    ledger.backfill_execution_contract.execution_requirement ===
      "IDEMPOTENT_BACKFILL_REQUIRED" &&
    verificationRequiredStates.has(ledger.phase_state)
  ) {
    assertLedger(
      ledger.backfill_execution_contract.execution_state === "COMPLETE",
      "SCHEMA_MIGRATION_BACKFILL_INVALID",
      "backfill-required migrations must complete backfill before verification or contract phases",
    );
  }
  if (ledger.phase_state === "VERIFIED") {
    assertLedger(
      ledger.schema_reader_window_contract.window_state ===
        "VERIFIED_PREVIOUS_READERS_SUPPORTED",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "VERIFIED migrations must keep VERIFIED_PREVIOUS_READERS_SUPPORTED",
    );
  }
  if (
    closedWindowStates.has(ledger.phase_state) ||
    ledger.compatibility_window_closed_at !== null ||
    ledger.schema_reader_window_contract.window_state ===
      "CONTRACT_ELIGIBLE_WINDOW_CLOSED"
  ) {
    assertLedger(
      ledger.schema_reader_window_contract.window_state ===
        "CONTRACT_ELIGIBLE_WINDOW_CLOSED" &&
        ledger.rollback_class === "FAIL_FORWARD_ONLY",
      "SCHEMA_MIGRATION_READER_WINDOW_INVALID",
      "closed schema-reader windows require CONTRACT_ELIGIBLE_WINDOW_CLOSED and FAIL_FORWARD_ONLY",
    );
  }
  if (["CONTRACTING", "CONTRACTED"].includes(ledger.phase_state)) {
    assertLedger(
      ledger.contract_phase_required &&
        ledger.compatibility_window_closed_at !== null,
      "SCHEMA_MIGRATION_CHRONOLOGY_INVALID",
      "contract phases require contract_phase_required=true and explicit compatibility window closure",
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
  input: unknown,
): SchemaMigrationLedgerRecord {
  assertLedger(
    isPlainObject(input),
    "SCHEMA_MIGRATION_FIELD_INVALID",
    "schema_migration_ledger must be an object",
  );
  const phaseState = requirePhaseState(input.phase_state);
  const normalized: SchemaMigrationLedgerRecord = {
    migration_id: requireTrimmedString(
      "schema_migration_ledger.migration_id",
      input.migration_id,
    ),
    datastore_ref: requireTrimmedString(
      "schema_migration_ledger.datastore_ref",
      input.datastore_ref,
    ),
    target_version: requireTrimmedString(
      "schema_migration_ledger.target_version",
      input.target_version,
    ),
    target_schema_bundle_hash: requireTrimmedString(
      "schema_migration_ledger.target_schema_bundle_hash",
      input.target_schema_bundle_hash,
    ),
    compatibility_window_ref: requireTrimmedString(
      "schema_migration_ledger.compatibility_window_ref",
      input.compatibility_window_ref,
    ),
    contract_phase_required: requireBoolean(
      "schema_migration_ledger.contract_phase_required",
      input.contract_phase_required,
    ),
    phase_state: phaseState,
    state_transition_contract: normalizeSchemaMigrationLedgerStateTransitionContract(
      input.state_transition_contract,
      phaseState,
    ),
    schema_reader_window_contract: normalizeSchemaReaderWindowContract(
      input.schema_reader_window_contract,
    ),
    backfill_execution_contract: normalizeBackfillExecutionContract(
      input.backfill_execution_contract,
    ),
    applied_at: requireNullableInstant(
      "schema_migration_ledger.applied_at",
      input.applied_at,
    ),
    verified_at: requireNullableInstant(
      "schema_migration_ledger.verified_at",
      input.verified_at,
    ),
    rollback_class: requireRollbackClass(input.rollback_class),
    verification_ref: requireNullableTrimmedString(
      "schema_migration_ledger.verification_ref",
      input.verification_ref,
    ),
    halted_subphase: requireNullableHaltedSubphase(input.halted_subphase),
    compatibility_window_closed_at: requireNullableInstant(
      "schema_migration_ledger.compatibility_window_closed_at",
      input.compatibility_window_closed_at,
    ),
    failure_ref: requireNullableTrimmedString(
      "schema_migration_ledger.failure_ref",
      input.failure_ref,
    ),
  };
  assertChronology(normalized);
  assertReaderWindowAndBackfill(normalized);
  return normalized;
}

export function assertSchemaMigrationLedgerRecord(
  input: unknown,
): SchemaMigrationLedgerRecord {
  return normalizeSchemaMigrationLedgerRecord(input);
}

export function cloneSchemaMigrationLedgerRecord(record: SchemaMigrationLedgerRecord) {
  return structuredClone(normalizeSchemaMigrationLedgerRecord(record));
}

export function schemaMigrationLedgerRef(record: Pick<SchemaMigrationLedgerRecord, "migration_id">) {
  return record.migration_id;
}
