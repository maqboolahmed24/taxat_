import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  contractImportBundle,
  schemaCatalog,
  validatorArtifacts,
} from "../../contracts-core/src/schemaCatalog.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const configDir = path.join(repoRoot, "config", "migrations");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "migration-window-atlas",
  "data",
  "migration-window-atlas.json",
);

const railStates = [
  "PLANNED",
  "APPLYING",
  "VERIFYING",
  "CONTRACTING",
  "HALTED",
  "FAILED",
] as const;

const phaseColumns = ["EXPAND", "BACKFILL", "VERIFY", "CONTRACT"] as const;

const catalogPath = path.join(configDir, "schema_bundle_version_catalog.json");
const readerWindowPath = path.join(configDir, "schema_reader_window_baseline.json");
const backfillPolicyPath = path.join(configDir, "backfill_execution_policy.json");

const migrationSqlPaths = {
  baseline: path.join(repoRoot, "packages", "control-plane-db", "src", "migrations", "000001_baseline.sql"),
  ledger: path.join(
    repoRoot,
    "packages",
    "control-plane-db",
    "src",
    "migrations",
    "schema_migration_ledger.sql",
  ),
};

const phaseEventMap = {
  APPLIED: ["start_verify"],
  APPLYING: ["apply_complete", "fail", "halt"],
  CONTRACTED: ["supersede"],
  CONTRACTING: ["contract_complete", "fail", "halt"],
  FAILED: [],
  HALTED: ["resume_apply", "resume_contract", "resume_verify"],
  PLANNED: ["start_apply"],
  SUPERSEDED: [],
  VERIFIED: ["start_contract", "supersede"],
  VERIFYING: ["fail", "halt", "verify_success"],
} as const satisfies Record<MigrationPhaseState, readonly string[]>;

export type MigrationPhaseState =
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

export type RollbackClass = "ROLLBACK_SAFE" | "FAIL_FORWARD_ONLY";

export type AtlasRailState = (typeof railStates)[number];

export type AdvisoryLockPosture = {
  engine: "POSTGRESQL";
  lockFunction: "pg_advisory_xact_lock";
  lockKeyRef: string;
  lockScope: "TRANSACTION_SCOPED";
  holdPolicy: "AUTO_RELEASE_ON_COMMIT";
  sessionLockPolicy: "SESSION_SCOPED_LOCKS_RESERVED_FOR_BREAK_GLASS_ONLY";
  documentationRefs: string[];
  notes: string[];
};

export type SchemaBundleVersionEntry = {
  advisoryLockKeyRef: string;
  contractPhaseRequired: boolean;
  datastoreEngine: "POSTGRESQL";
  datastoreRef: "PRIMARY_CONTROL_STORE";
  migrationFiles: string[];
  migrationId: string;
  notes: string[];
  releaseCandidateBindingPolicy: string;
  rollbackClass: RollbackClass;
  schemaBundleHash: string;
  state: "CURRENT_IMPORTED_BASELINE";
  targetVersion: string;
  verificationGateFamily: "MIGRATION_VERIFICATION";
};

export type SchemaBundleVersionCatalog = {
  basisStatement: string;
  catalogId: string;
  catalogVersion: "SCHEMA_BUNDLE_VERSION_CATALOG_V1";
  currentImportedSchemaBundleHash: string;
  entries: SchemaBundleVersionEntry[];
  importedSchemaBundleHashAlgorithm: string;
};

export type SchemaReaderWindowContract = {
  compatibility_window_ref: string;
  contract_version: "SCHEMA_READER_WINDOW_CONTRACT_V1";
  destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED";
  fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT";
  historical_manifest_policy: "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER";
  protected_historical_schema_bundle_hashes: string[];
  replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER";
  rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED";
  supported_reader_schema_bundle_hashes: string[];
  window_state:
    | "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED"
    | "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED"
    | "VERIFIED_PREVIOUS_READERS_SUPPORTED"
    | "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
  writer_schema_bundle_hash: string;
};

export type BackfillExecutionContract = {
  affected_artifact_types: string[];
  backfill_audit_refs: string[];
  contract_version: "BACKFILL_EXECUTION_CONTRACT_V1";
  execution_requirement: "NO_BACKFILL_REQUIRED" | "IDEMPOTENT_BACKFILL_REQUIRED";
  execution_state:
    | "NOT_APPLICABLE"
    | "PLANNED"
    | "IN_PROGRESS"
    | "COMPLETE"
    | "HALTED"
    | "FAILED";
  idempotency_policy: "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY";
  lineage_recording_policy: "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE";
  meaning_preservation_policy: "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY";
  migration_id: string;
  retry_safety_policy: "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE";
  target_schema_bundle_hash: string;
  target_version: string;
};

export type StateTransitionContract = {
  audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF";
  concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE";
  contract_version: "STATE_TRANSITION_CONTRACT_V1";
  current_state: MigrationPhaseState;
  illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE";
  machine_code: "SCHEMA_MIGRATION_LEDGER_PHASE_V1";
  object_family: "SCHEMA_MIGRATION_LEDGER";
  previous_state_or_null: MigrationPhaseState | null;
  recovery_supersession_policy: "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE";
  state_field_name: "phase_state";
  terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE";
  transition_applied_at: string;
  transition_application_policy: "NAMED_EVENT_ONLY";
  transition_audit_ref: string;
  transition_event_code:
    | "plan_seed"
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
  typed_rejection_family: "ILLEGAL_STATE_TRANSITION";
};

export type SchemaMigrationLedgerRecord = {
  applied_at: string | null;
  backfill_execution_contract: BackfillExecutionContract;
  compatibility_window_closed_at: string | null;
  compatibility_window_ref: string;
  contract_phase_required: boolean;
  failure_ref: string | null;
  halted_subphase: "APPLYING" | "VERIFYING" | "CONTRACTING" | null;
  migration_id: string;
  phase_state: MigrationPhaseState;
  rollback_class: RollbackClass;
  schema_reader_window_contract: SchemaReaderWindowContract;
  state_transition_contract: StateTransitionContract;
  target_schema_bundle_hash: string;
  target_version: string;
  verification_ref: string | null;
  verified_at: string | null;
  datastore_ref: string;
};

export type MigrationPlan = {
  advisoryLockPosture: AdvisoryLockPosture;
  basisStatement: string;
  candidateIdentityRefOrNull: string | null;
  contractPhaseRequired: boolean;
  currentPhaseState: MigrationPhaseState;
  datastoreEngine: "POSTGRESQL";
  datastoreRef: "PRIMARY_CONTROL_STORE";
  evidenceRefs: {
    backfillAuditRefs: string[];
    failureRef: string | null;
    verificationRef: string | null;
  };
  migrationFiles: string[];
  migrationId: string;
  notes: string[];
  readerWindowContract: SchemaReaderWindowContract;
  releaseCandidateBindingPolicy: string;
  rollbackClass: RollbackClass;
  schemaBundleHash: string;
  targetVersion: string;
  verificationGateFamily: "MIGRATION_VERIFICATION";
  backfillExecutionContract: BackfillExecutionContract;
};

export type MigrationSingletonExecutionLock = {
  acquiredAtOrNull: string | null;
  heldByRunIdOrNull: string | null;
  holdPosture: "AUTO_RELEASE_ON_COMMIT" | "SIMULATED_HELD_FOR_TEST";
  lockFunction: "pg_advisory_xact_lock";
  lockKeyRef: string;
  lockScope: "TRANSACTION_SCOPED";
  notes: string[];
};

export type MigrationSimulationState = {
  datastoreRef: "PRIMARY_CONTROL_STORE";
  ledgers: SchemaMigrationLedgerRecord[];
  lock: MigrationSingletonExecutionLock;
  simulationStateVersion: "CONTROL_PLANE_DB_MIGRATION_STATE_V1";
};

export type MigrationActionResult = {
  lock: MigrationSingletonExecutionLock;
  record: SchemaMigrationLedgerRecord;
  releasedAtOrNull: string | null;
};

export type BackfillAction = "start" | "resume" | "complete" | "halt" | "fail";

type MigrationPolicyBundle = {
  advisoryLockPosture: AdvisoryLockPosture;
  backfillPolicy: BackfillExecutionContract;
  catalog: SchemaBundleVersionCatalog;
  currentEntry: SchemaBundleVersionEntry;
  importedSchemaBundleHash: string;
  readerWindowBaseline: SchemaReaderWindowContract;
};

type AtlasTimelineRow = {
  accessibleLabel: string;
  backfillSummary: string;
  compatibilityBandLabel: string;
  evidenceRefs: string[];
  lockPosture: string;
  migrationId: string;
  phaseColumn: (typeof phaseColumns)[number];
  phaseState: AtlasRailState | "VERIFIED";
  readerWindowState: SchemaReaderWindowContract["window_state"];
  rollbackClass: RollbackClass;
  schemaBundleHash: string;
  summary: string;
  targetVersion: string;
};

export type MigrationAtlasPayload = {
  basisStatement: string;
  currentDatastoreBadge: string;
  currentSchemaBundleBadge: string;
  phaseColumns: (typeof phaseColumns)[number][];
  railStates: Array<{
    active: boolean;
    count: number;
    label: AtlasRailState;
    tone: "slate" | "fern" | "rust" | "danger";
  }>;
  routeId: "migration-window-atlas";
  selectedMigrationId: string;
  subtitle: string;
  title: string;
  timelineRows: AtlasTimelineRow[];
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(",")}}`;
}

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function relativeRepoPath(filePath: string) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function nowIso(explicitNow?: string) {
  return explicitNow ?? new Date().toISOString();
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function pathExists(filePath: string) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createStateTransitionContract(
  currentState: MigrationPhaseState,
  previousStateOrNull: MigrationPhaseState | null,
  event: StateTransitionContract["transition_event_code"],
  appliedAt: string,
  auditRef: string,
): StateTransitionContract {
  return {
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    current_state: currentState,
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    machine_code: "SCHEMA_MIGRATION_LEDGER_PHASE_V1",
    object_family: "SCHEMA_MIGRATION_LEDGER",
    previous_state_or_null: previousStateOrNull,
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    state_field_name: "phase_state",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    transition_applied_at: appliedAt,
    transition_application_policy: "NAMED_EVENT_ONLY",
    transition_audit_ref: auditRef,
    transition_event_code: event,
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

function buildAdvisoryLockPosture(lockKeyRef: string): AdvisoryLockPosture {
  return {
    documentationRefs: [
      "https://www.postgresql.org/docs/current/explicit-locking.html",
      "https://www.postgresql.org/docs/current/sql-altertable.html",
    ],
    engine: "POSTGRESQL",
    holdPolicy: "AUTO_RELEASE_ON_COMMIT",
    lockFunction: "pg_advisory_xact_lock",
    lockKeyRef,
    lockScope: "TRANSACTION_SCOPED",
    notes: [
      "Use pg_advisory_xact_lock so the singleton migration lease releases with the enclosing transaction rather than requiring a sticky session lease.",
      "Session-scoped advisory locks are reserved for break-glass maintenance and are not the default migration posture.",
      "ALTER TABLE and ledger writes stay in one transaction whenever the DDL shape permits it; no app startup path may apply schema mutations implicitly.",
    ],
    sessionLockPolicy: "SESSION_SCOPED_LOCKS_RESERVED_FOR_BREAK_GLASS_ONLY",
  };
}

export function computeImportedSchemaBundleHash() {
  const payload = {
    counts: contractImportBundle.counts,
    packagePath: contractImportBundle.packagePath,
    schemas: schemaCatalog.map((entry) => ({
      destinationHash: entry.destinationHash,
      schemaId: entry.schemaId,
      schemaName: entry.schemaName,
      sourceHash: entry.sourceHash,
    })),
    sourceBundleRoot: contractImportBundle.sourceBundleRoot,
    validators: validatorArtifacts.map((entry) => ({
      artifactRef: entry.artifactRef,
      destinationHash: entry.destinationHash,
      sourceHash: entry.sourceHash,
    })),
  };
  return sha256Hex(stableStringify(payload));
}

export function validateSchemaBundleVersionCatalog(
  catalog: SchemaBundleVersionCatalog,
  importedSchemaBundleHash: string,
) {
  invariant(
    catalog.catalogVersion === "SCHEMA_BUNDLE_VERSION_CATALOG_V1",
    "Schema bundle version catalog must declare SCHEMA_BUNDLE_VERSION_CATALOG_V1.",
  );
  invariant(
    catalog.importedSchemaBundleHashAlgorithm ===
      "SHA256_OF_IMPORTED_SCHEMA_AND_VALIDATOR_HASH_LINEAGE_V1",
    "Unexpected imported schema bundle hash algorithm.",
  );
  invariant(
    catalog.currentImportedSchemaBundleHash === importedSchemaBundleHash,
    "Schema bundle version catalog drift detected against the imported contracts-core bundle.",
  );
  invariant(catalog.entries.length >= 1, "Schema bundle version catalog must declare at least one entry.");

  const versions = new Set<string>();
  const hashes = new Set<string>();
  const currentEntries = catalog.entries.filter((entry) => entry.state === "CURRENT_IMPORTED_BASELINE");
  invariant(currentEntries.length === 1, "Exactly one schema bundle catalog entry must be CURRENT_IMPORTED_BASELINE.");

  for (const entry of catalog.entries) {
    invariant(/^\d{6}$/.test(entry.targetVersion), `Target version ${entry.targetVersion} must use six digits.`);
    invariant(!versions.has(entry.targetVersion), `Duplicate target version ${entry.targetVersion}.`);
    versions.add(entry.targetVersion);
    invariant(!hashes.has(entry.schemaBundleHash), `Duplicate schema bundle hash ${entry.schemaBundleHash}.`);
    hashes.add(entry.schemaBundleHash);
    invariant(
      entry.migrationFiles.every((filePath) =>
        /^packages\/control-plane-db\/src\/migrations\/(\d{6}_[a-z0-9_]+\.sql|schema_migration_ledger\.sql)$/.test(
          filePath,
        ),
      ),
      `Migration file list for ${entry.targetVersion} must reference immutable SQL under packages/control-plane-db/src/migrations.`,
    );
  }

  const currentEntry = currentEntries[0];
  invariant(
    currentEntry.schemaBundleHash === importedSchemaBundleHash,
    "CURRENT_IMPORTED_BASELINE entry must mirror the imported contracts-core schema bundle hash.",
  );

  return { currentEntry };
}

function validateReaderWindowBaseline(
  readerWindow: SchemaReaderWindowContract,
  expectedSchemaBundleHash: string,
) {
  invariant(
    readerWindow.contract_version === "SCHEMA_READER_WINDOW_CONTRACT_V1",
    "Reader window baseline must declare SCHEMA_READER_WINDOW_CONTRACT_V1.",
  );
  invariant(
    readerWindow.writer_schema_bundle_hash === expectedSchemaBundleHash,
    "Reader window baseline must mirror the current schema bundle hash.",
  );
  invariant(
    readerWindow.supported_reader_schema_bundle_hashes.includes(expectedSchemaBundleHash),
    "Reader window baseline must include the current writer bundle in supported readers.",
  );
  invariant(
    readerWindow.protected_historical_schema_bundle_hashes.every((hash) =>
      readerWindow.supported_reader_schema_bundle_hashes.includes(hash),
    ),
    "Protected historical bundle hashes must stay inside the supported reader set.",
  );
}

function validateBackfillPolicy(
  backfillPolicy: BackfillExecutionContract,
  expectedEntry: SchemaBundleVersionEntry,
) {
  invariant(
    backfillPolicy.contract_version === "BACKFILL_EXECUTION_CONTRACT_V1",
    "Backfill execution policy must declare BACKFILL_EXECUTION_CONTRACT_V1.",
  );
  invariant(
    backfillPolicy.migration_id === expectedEntry.migrationId,
    "Backfill execution policy must mirror the baseline migration id.",
  );
  invariant(
    backfillPolicy.target_version === expectedEntry.targetVersion,
    "Backfill execution policy must mirror the baseline target version.",
  );
  invariant(
    backfillPolicy.target_schema_bundle_hash === expectedEntry.schemaBundleHash,
    "Backfill execution policy must mirror the baseline schema bundle hash.",
  );
  if (backfillPolicy.execution_requirement === "NO_BACKFILL_REQUIRED") {
    invariant(
      backfillPolicy.execution_state === "NOT_APPLICABLE",
      "NO_BACKFILL_REQUIRED must keep execution_state NOT_APPLICABLE.",
    );
    invariant(
      backfillPolicy.affected_artifact_types.length === 0 &&
        backfillPolicy.backfill_audit_refs.length === 0,
      "NO_BACKFILL_REQUIRED must keep affected_artifact_types and backfill_audit_refs empty.",
    );
  }
}

export async function loadMigrationPolicyBundle() {
  const [catalog, readerWindowBaseline, backfillPolicy] = await Promise.all([
    readJson<SchemaBundleVersionCatalog>(catalogPath),
    readJson<SchemaReaderWindowContract>(readerWindowPath),
    readJson<BackfillExecutionContract>(backfillPolicyPath),
  ]);

  const importedSchemaBundleHash = computeImportedSchemaBundleHash();
  const { currentEntry } = validateSchemaBundleVersionCatalog(catalog, importedSchemaBundleHash);
  validateReaderWindowBaseline(readerWindowBaseline, currentEntry.schemaBundleHash);
  validateBackfillPolicy(backfillPolicy, currentEntry);

  for (const migrationFile of currentEntry.migrationFiles) {
    invariant(await pathExists(path.join(repoRoot, migrationFile)), `Missing migration artifact ${migrationFile}.`);
  }

  return {
    advisoryLockPosture: buildAdvisoryLockPosture(currentEntry.advisoryLockKeyRef),
    backfillPolicy,
    catalog,
    currentEntry,
    importedSchemaBundleHash,
    readerWindowBaseline,
  } satisfies MigrationPolicyBundle;
}

export function createPlannedLedgerRecord(
  policyBundle: MigrationPolicyBundle,
  options?: {
    currentState?: MigrationPhaseState;
    now?: string;
  },
) {
  const currentState = options?.currentState ?? "PLANNED";
  const at = nowIso(options?.now);
  const readerWindow = deepClone(policyBundle.readerWindowBaseline);
  const backfillPolicy = deepClone(policyBundle.backfillPolicy);

  return {
    applied_at: null,
    backfill_execution_contract: backfillPolicy,
    compatibility_window_closed_at: null,
    compatibility_window_ref: readerWindow.compatibility_window_ref,
    contract_phase_required: policyBundle.currentEntry.contractPhaseRequired,
    datastore_ref: policyBundle.currentEntry.datastoreRef,
    failure_ref: null,
    halted_subphase: null,
    migration_id: policyBundle.currentEntry.migrationId,
    phase_state: currentState,
    rollback_class: policyBundle.currentEntry.rollbackClass,
    schema_reader_window_contract: readerWindow,
    state_transition_contract: createStateTransitionContract(
      currentState,
      null,
      "plan_seed",
      at,
      `audit.meta_migration.plan_seed.${policyBundle.currentEntry.targetVersion}`,
    ),
    target_schema_bundle_hash: policyBundle.currentEntry.schemaBundleHash,
    target_version: policyBundle.currentEntry.targetVersion,
    verification_ref: null,
    verified_at: null,
  } satisfies SchemaMigrationLedgerRecord;
}

export function createMigrationPlan(
  policyBundle: MigrationPolicyBundle,
  record: SchemaMigrationLedgerRecord,
  candidateIdentityRefOrNull: string | null,
) {
  return {
    advisoryLockPosture: policyBundle.advisoryLockPosture,
    backfillExecutionContract: deepClone(record.backfill_execution_contract),
    basisStatement: policyBundle.catalog.basisStatement,
    candidateIdentityRefOrNull,
    contractPhaseRequired: record.contract_phase_required,
    currentPhaseState: record.phase_state,
    datastoreEngine: policyBundle.currentEntry.datastoreEngine,
    datastoreRef: policyBundle.currentEntry.datastoreRef,
    evidenceRefs: {
      backfillAuditRefs: [...record.backfill_execution_contract.backfill_audit_refs],
      failureRef: record.failure_ref,
      verificationRef: record.verification_ref,
    },
    migrationFiles: [...policyBundle.currentEntry.migrationFiles],
    migrationId: record.migration_id,
    notes: [
      "Release candidate identity must pin the same schema bundle hash and target datastore version recorded in this plan.",
      "Structural DDL application and ledger mutation run under one transaction-scoped advisory lock.",
      "Backfill execution is a separate resumable phase and never hides inside ORM startup code.",
    ],
    readerWindowContract: deepClone(record.schema_reader_window_contract),
    releaseCandidateBindingPolicy: policyBundle.currentEntry.releaseCandidateBindingPolicy,
    rollbackClass: record.rollback_class,
    schemaBundleHash: record.target_schema_bundle_hash,
    targetVersion: record.target_version,
    verificationGateFamily: policyBundle.currentEntry.verificationGateFamily,
  } satisfies MigrationPlan;
}

export function createSimulationState(policyBundle: MigrationPolicyBundle): MigrationSimulationState {
  return {
    datastoreRef: "PRIMARY_CONTROL_STORE",
    ledgers: [],
    lock: {
      acquiredAtOrNull: null,
      heldByRunIdOrNull: null,
      holdPosture: "AUTO_RELEASE_ON_COMMIT",
      lockFunction: "pg_advisory_xact_lock",
      lockKeyRef: policyBundle.currentEntry.advisoryLockKeyRef,
      lockScope: "TRANSACTION_SCOPED",
      notes: [
        "The simulation lock mirrors pg_advisory_xact_lock semantics unless a test intentionally holds it open.",
      ],
    },
    simulationStateVersion: "CONTROL_PLANE_DB_MIGRATION_STATE_V1",
  };
}

export async function loadSimulationState(
  filePath: string,
  policyBundle: MigrationPolicyBundle,
): Promise<MigrationSimulationState> {
  if (!(await pathExists(filePath))) {
    return createSimulationState(policyBundle);
  }
  const state = await readJson<MigrationSimulationState>(filePath);
  invariant(
    state.simulationStateVersion === "CONTROL_PLANE_DB_MIGRATION_STATE_V1",
    "Unexpected migration simulation state version.",
  );
  return state;
}

export async function saveSimulationState(filePath: string, state: MigrationSimulationState) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function acquireSingletonExecutionLock(
  state: MigrationSimulationState,
  runId: string,
  options?: { holdLock?: boolean; now?: string },
) {
  if (state.lock.heldByRunIdOrNull && state.lock.heldByRunIdOrNull !== runId) {
    throw new Error(
      `Lock already held by ${state.lock.heldByRunIdOrNull}; ${runId} must wait for the active transaction-scoped lease to release.`,
    );
  }
  state.lock.heldByRunIdOrNull = runId;
  state.lock.holdPosture = options?.holdLock ? "SIMULATED_HELD_FOR_TEST" : "AUTO_RELEASE_ON_COMMIT";
  state.lock.acquiredAtOrNull = nowIso(options?.now);
  return state.lock;
}

export function releaseSingletonExecutionLock(state: MigrationSimulationState, runId: string) {
  if (state.lock.heldByRunIdOrNull === runId) {
    state.lock.heldByRunIdOrNull = null;
    state.lock.acquiredAtOrNull = null;
    state.lock.holdPosture = "AUTO_RELEASE_ON_COMMIT";
  }
  return state.lock;
}

function indexOfLedger(state: MigrationSimulationState, targetVersion: string) {
  return state.ledgers.findIndex((entry) => entry.target_version === targetVersion);
}

function ensureLedgerRecord(
  state: MigrationSimulationState,
  policyBundle: MigrationPolicyBundle,
  targetVersion: string,
  now?: string,
) {
  const existingIndex = indexOfLedger(state, targetVersion);
  if (existingIndex >= 0) {
    return state.ledgers[existingIndex];
  }
  invariant(
    targetVersion === policyBundle.currentEntry.targetVersion,
    `Unknown target version ${targetVersion}; only the current imported baseline is authored in this card.`,
  );
  const record = createPlannedLedgerRecord(policyBundle, { now });
  state.ledgers.push(record);
  return record;
}

export function replaceLedgerRecord(
  state: MigrationSimulationState,
  nextRecord: SchemaMigrationLedgerRecord,
) {
  const entryIndex = indexOfLedger(state, nextRecord.target_version);
  if (entryIndex >= 0) {
    state.ledgers.splice(entryIndex, 1, nextRecord);
  } else {
    state.ledgers.push(nextRecord);
  }
  return nextRecord;
}

function setReaderWindowState(record: SchemaMigrationLedgerRecord) {
  if (
    record.phase_state === "CONTRACTING" ||
    record.phase_state === "CONTRACTED" ||
    record.phase_state === "SUPERSEDED" ||
    record.compatibility_window_closed_at
  ) {
    record.schema_reader_window_contract.window_state = "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
    record.rollback_class = "FAIL_FORWARD_ONLY";
    return;
  }
  if (record.phase_state === "VERIFIED") {
    record.schema_reader_window_contract.window_state = "VERIFIED_PREVIOUS_READERS_SUPPORTED";
    return;
  }
  if (record.backfill_execution_contract.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED") {
    record.schema_reader_window_contract.window_state = "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED";
    return;
  }
  record.schema_reader_window_contract.window_state = "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED";
}

function setBackfillState(
  record: SchemaMigrationLedgerRecord,
  executionState: BackfillExecutionContract["execution_state"],
  auditRef?: string,
) {
  record.backfill_execution_contract.execution_state = executionState;
  if (auditRef) {
    const refs = new Set(record.backfill_execution_contract.backfill_audit_refs);
    refs.add(auditRef);
    record.backfill_execution_contract.backfill_audit_refs = [...refs];
  }
  setReaderWindowState(record);
}

function assertEventAllowed(
  currentState: MigrationPhaseState,
  event: StateTransitionContract["transition_event_code"],
) {
  const allowed = phaseEventMap[currentState];
  invariant(
    allowed.includes(event),
    `Illegal migration transition ${currentState} -> ${event}; see SchemaMigrationLedger.phase_state.`,
  );
}

export function applyLedgerEvent(
  record: SchemaMigrationLedgerRecord,
  options: {
    auditRef: string;
    closeCompatibilityWindow?: boolean;
    event: StateTransitionContract["transition_event_code"];
    failureRef?: string;
    now?: string;
    verificationRef?: string;
  },
) {
  const previousState = record.phase_state;
  const at = nowIso(options.now);
  const next = deepClone(record);

  assertEventAllowed(previousState, options.event);

  switch (options.event) {
    case "start_apply":
      next.phase_state = "APPLYING";
      break;
    case "apply_complete":
      next.phase_state = "APPLIED";
      next.applied_at = next.applied_at ?? at;
      break;
    case "start_verify":
      invariant(
        next.backfill_execution_contract.execution_requirement === "NO_BACKFILL_REQUIRED" ||
          next.backfill_execution_contract.execution_state === "COMPLETE",
        "Verification cannot begin until required backfill work is COMPLETE.",
      );
      next.phase_state = "VERIFYING";
      next.verification_ref = null;
      next.verified_at = null;
      break;
    case "verify_success":
      invariant(options.verificationRef, "verify_success requires a verification reference.");
      next.phase_state = "VERIFIED";
      next.verification_ref = options.verificationRef;
      next.verified_at = at;
      break;
    case "start_contract":
      invariant(next.contract_phase_required, "This migration does not permit a contract phase.");
      if (options.closeCompatibilityWindow) {
        next.compatibility_window_closed_at = at;
        next.rollback_class = "FAIL_FORWARD_ONLY";
      }
      invariant(
        next.schema_reader_window_contract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED" ||
          next.compatibility_window_closed_at !== null,
        "Contract-phase cleanup is blocked until the reader compatibility window closes.",
      );
      invariant(
        next.backfill_execution_contract.execution_requirement === "NO_BACKFILL_REQUIRED" ||
          next.backfill_execution_contract.execution_state === "COMPLETE",
        "Contract-phase cleanup is blocked until required backfill work is COMPLETE.",
      );
      next.phase_state = "CONTRACTING";
      next.rollback_class = "FAIL_FORWARD_ONLY";
      break;
    case "contract_complete":
      next.phase_state = "CONTRACTED";
      next.rollback_class = "FAIL_FORWARD_ONLY";
      break;
    case "halt":
      invariant(
        previousState === "APPLYING" || previousState === "VERIFYING" || previousState === "CONTRACTING",
        "HALTED is only legal from APPLYING, VERIFYING, or CONTRACTING.",
      );
      next.phase_state = "HALTED";
      next.halted_subphase = previousState;
      next.failure_ref = options.failureRef ?? next.failure_ref;
      break;
    case "fail":
      invariant(options.failureRef, "fail requires a failure reference.");
      next.phase_state = "FAILED";
      next.failure_ref = options.failureRef;
      next.halted_subphase = null;
      break;
    case "resume_apply":
      invariant(previousState === "HALTED" && record.halted_subphase === "APPLYING", "resume_apply requires HALTED from APPLYING.");
      next.phase_state = "APPLYING";
      next.halted_subphase = null;
      next.failure_ref = null;
      break;
    case "resume_verify":
      invariant(previousState === "HALTED" && record.halted_subphase === "VERIFYING", "resume_verify requires HALTED from VERIFYING.");
      next.phase_state = "VERIFYING";
      next.halted_subphase = null;
      next.failure_ref = null;
      break;
    case "resume_contract":
      invariant(
        previousState === "HALTED" && record.halted_subphase === "CONTRACTING",
        "resume_contract requires HALTED from CONTRACTING.",
      );
      next.phase_state = "CONTRACTING";
      next.halted_subphase = null;
      next.failure_ref = null;
      break;
    case "supersede":
      next.phase_state = "SUPERSEDED";
      next.rollback_class = "FAIL_FORWARD_ONLY";
      next.compatibility_window_closed_at = next.compatibility_window_closed_at ?? at;
      break;
    case "plan_seed":
      break;
  }

  setReaderWindowState(next);
  next.state_transition_contract = createStateTransitionContract(
    next.phase_state,
    previousState === next.phase_state ? null : previousState,
    options.event,
    at,
    options.auditRef,
  );
  return next;
}

export function applyMigrationToSimulationState(options: {
  auditRef?: string;
  closeCompatibilityWindow?: boolean;
  event: StateTransitionContract["transition_event_code"];
  failureRef?: string;
  holdLock?: boolean;
  now?: string;
  policyBundle: MigrationPolicyBundle;
  runId: string;
  state: MigrationSimulationState;
  targetVersion: string;
  verificationRef?: string;
}) {
  const auditRef =
    options.auditRef ??
    `audit.meta_migration.${options.targetVersion}.${options.event}.${options.runId}`;
  acquireSingletonExecutionLock(options.state, options.runId, {
    holdLock: options.holdLock,
    now: options.now,
  });
  const record = ensureLedgerRecord(options.state, options.policyBundle, options.targetVersion, options.now);
  const nextRecord = applyLedgerEvent(record, {
    auditRef,
    closeCompatibilityWindow: options.closeCompatibilityWindow,
    event: options.event,
    failureRef: options.failureRef,
    now: options.now,
    verificationRef: options.verificationRef,
  });
  replaceLedgerRecord(options.state, nextRecord);
  const releasedAtOrNull = options.holdLock ? null : nowIso(options.now);
  if (!options.holdLock) {
    releaseSingletonExecutionLock(options.state, options.runId);
  }
  return {
    lock: deepClone(options.state.lock),
    record: nextRecord,
    releasedAtOrNull,
  } satisfies MigrationActionResult;
}

export function runBackfillInSimulationState(options: {
  action: BackfillAction;
  auditRef?: string;
  holdLock?: boolean;
  now?: string;
  policyBundle: MigrationPolicyBundle;
  runId: string;
  state: MigrationSimulationState;
  targetVersion: string;
}) {
  const auditRef =
    options.auditRef ??
    `audit.meta_migration.backfill.${options.targetVersion}.${options.action}.${options.runId}`;
  acquireSingletonExecutionLock(options.state, options.runId, {
    holdLock: options.holdLock,
    now: options.now,
  });
  const record = ensureLedgerRecord(options.state, options.policyBundle, options.targetVersion, options.now);
  const nextRecord = deepClone(record);

  invariant(
    nextRecord.backfill_execution_contract.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED",
    "Backfill runner is not applicable to a migration declared as NO_BACKFILL_REQUIRED.",
  );
  invariant(
    nextRecord.phase_state !== "PLANNED",
    "Backfill work cannot begin before structural migration application starts.",
  );

  switch (options.action) {
    case "start":
    case "resume":
      setBackfillState(nextRecord, "IN_PROGRESS");
      if (nextRecord.phase_state === "HALTED") {
        nextRecord.phase_state =
          record.halted_subphase === "VERIFYING" ? "VERIFYING" : "APPLIED";
        nextRecord.halted_subphase = null;
        nextRecord.failure_ref = null;
      }
      break;
    case "complete":
      setBackfillState(nextRecord, "COMPLETE", auditRef);
      break;
    case "halt":
      setBackfillState(nextRecord, "HALTED", auditRef);
      nextRecord.phase_state = "HALTED";
      nextRecord.halted_subphase = record.phase_state === "VERIFYING" ? "VERIFYING" : "APPLYING";
      break;
    case "fail":
      setBackfillState(nextRecord, "FAILED", auditRef);
      nextRecord.phase_state = "FAILED";
      nextRecord.failure_ref = auditRef;
      nextRecord.halted_subphase = null;
      break;
  }

  nextRecord.state_transition_contract = createStateTransitionContract(
    nextRecord.phase_state,
    record.phase_state,
    "plan_seed",
    nowIso(options.now),
    auditRef,
  );
  replaceLedgerRecord(options.state, nextRecord);

  const releasedAtOrNull = options.holdLock ? null : nowIso(options.now);
  if (!options.holdLock) {
    releaseSingletonExecutionLock(options.state, options.runId);
  }
  return {
    lock: deepClone(options.state.lock),
    record: nextRecord,
    releasedAtOrNull,
  } satisfies MigrationActionResult;
}

function atlasRowTone(phaseState: AtlasRailState | "VERIFIED") {
  switch (phaseState) {
    case "FAILED":
      return "danger";
    case "HALTED":
      return "rust";
    case "CONTRACTING":
      return "fern";
    default:
      return "slate";
  }
}

function createAtlasRows(policyBundle: MigrationPolicyBundle): AtlasTimelineRow[] {
  const currentHash = policyBundle.importedSchemaBundleHash;
  const syntheticHash = (seed: string) => sha256Hex(`taxat-migration-atlas:${seed}`);

  return [
    {
      accessibleLabel: "migration 000002 planned rollback safe",
      backfillSummary: "Backfill policy seeded but not yet started.",
      compatibilityBandLabel: "Window remains open while the new reader shape is only planned.",
      evidenceRefs: ["plan.migration.000002"],
      lockPosture: "pg_advisory_xact_lock / transaction scope",
      migrationId: "000002_expand_request_index",
      phaseColumn: "EXPAND",
      phaseState: "PLANNED",
      readerWindowState: "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
      rollbackClass: "ROLLBACK_SAFE",
      schemaBundleHash: syntheticHash("000002"),
      summary: "Next expand-only change is staged behind the singleton lock and release-candidate binding.",
      targetVersion: "000002",
    },
    {
      accessibleLabel: "migration 000003 applying rollback safe",
      backfillSummary: "DDL in progress under a transaction-scoped advisory lock.",
      compatibilityBandLabel: "Previous readers remain supported while structural writes are still applying.",
      evidenceRefs: ["audit.meta_migration.000003.start_apply"],
      lockPosture: "pg_advisory_xact_lock / transaction scope",
      migrationId: "000003_apply_projection_table",
      phaseColumn: "EXPAND",
      phaseState: "APPLYING",
      readerWindowState: "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
      rollbackClass: "ROLLBACK_SAFE",
      schemaBundleHash: syntheticHash("000003"),
      summary: "Structural change is underway but not yet verified, so release admission remains blocked.",
      targetVersion: "000003",
    },
    {
      accessibleLabel: "migration 000004 verifying rollback safe",
      backfillSummary: "Backfill complete and waiting on verification evidence.",
      compatibilityBandLabel: "Compatibility window stays open until replay and restore verification turn green.",
      evidenceRefs: ["verification.release-manifest.000004"],
      lockPosture: "pg_advisory_xact_lock / transaction scope",
      migrationId: "000004_verify_replay_window",
      phaseColumn: "VERIFY",
      phaseState: "VERIFYING",
      readerWindowState: "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
      rollbackClass: "ROLLBACK_SAFE",
      schemaBundleHash: syntheticHash("000004"),
      summary: "Verification is active and the platform is still within the rollback-safe reader window.",
      targetVersion: "000004",
    },
    {
      accessibleLabel: "migration 000005 contracting fail forward only",
      backfillSummary: "Backfill complete; destructive cleanup is now allowed.",
      compatibilityBandLabel: "Compatibility band closed after verification, so fail-forward posture is mandatory.",
      evidenceRefs: ["verification.release-manifest.000005", "audit.meta_migration.000005.start_contract"],
      lockPosture: "pg_advisory_xact_lock / transaction scope",
      migrationId: "000005_contract_legacy_columns",
      phaseColumn: "CONTRACT",
      phaseState: "CONTRACTING",
      readerWindowState: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
      rollbackClass: "FAIL_FORWARD_ONLY",
      schemaBundleHash: syntheticHash("000005"),
      summary: "Legacy shape removal began only after the compatibility window closed and fail-forward posture became explicit.",
      targetVersion: "000005",
    },
    {
      accessibleLabel: "migration 000006 halted rollback safe",
      backfillSummary: "Resumable backfill halted after partial progress; no destructive cleanup started.",
      compatibilityBandLabel: "Compatibility window remains open because historical readers still depend on the prior shape.",
      evidenceRefs: ["audit.meta_migration.backfill.000006.halt.ops-run-2", "failure.ref.partial-backfill"],
      lockPosture: "pg_advisory_xact_lock / transaction scope",
      migrationId: "000006_resume_customer_safe_backfill",
      phaseColumn: "BACKFILL",
      phaseState: "HALTED",
      readerWindowState: "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
      rollbackClass: "ROLLBACK_SAFE",
      schemaBundleHash: syntheticHash("000006"),
      summary: "The framework records halted posture explicitly so backfill can resume without mutating prior evidence.",
      targetVersion: "000006",
    },
    {
      accessibleLabel: "migration 000007 failed fail forward only",
      backfillSummary: "Backfill failed after the compatibility window closed.",
      compatibilityBandLabel: "Compatibility window already closed, so compensating release lineage is required.",
      evidenceRefs: ["failure.ref.contract-phase-cleanup"],
      lockPosture: "pg_advisory_xact_lock / transaction scope",
      migrationId: "000007_failed_contract_cleanup",
      phaseColumn: "CONTRACT",
      phaseState: "FAILED",
      readerWindowState: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
      rollbackClass: "FAIL_FORWARD_ONLY",
      schemaBundleHash: syntheticHash("000007"),
      summary: "Failure is queryable truth, and fail-forward ownership is no longer optional once the window closes.",
      targetVersion: "000007",
    },
    {
      accessibleLabel: "migration 000001 verified rollback safe",
      backfillSummary: "Baseline migration carries no backfill requirement.",
      compatibilityBandLabel: "The current baseline still exposes a compatible reader window for protected history.",
      evidenceRefs: ["verification.release-manifest.000001"],
      lockPosture: "pg_advisory_xact_lock / transaction scope",
      migrationId: policyBundle.currentEntry.migrationId,
      phaseColumn: "VERIFY",
      phaseState: "VERIFIED",
      readerWindowState: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
      rollbackClass: "ROLLBACK_SAFE",
      schemaBundleHash: currentHash,
      summary: "The imported contracts-core bundle is pinned to the current baseline target version.",
      targetVersion: policyBundle.currentEntry.targetVersion,
    },
  ];
}

export function createMigrationWindowAtlasPayload(policyBundle: MigrationPolicyBundle): MigrationAtlasPayload {
  const timelineRows = createAtlasRows(policyBundle);
  const selectedMigrationId = "000006_resume_customer_safe_backfill";
  const selectedRow = timelineRows.find((row) => row.migrationId === selectedMigrationId) ?? timelineRows[0];

  return {
    basisStatement: policyBundle.catalog.basisStatement,
    currentDatastoreBadge: `${policyBundle.currentEntry.datastoreRef} / ${policyBundle.currentEntry.datastoreEngine}`,
    currentSchemaBundleBadge: `${policyBundle.currentEntry.targetVersion} / ${policyBundle.importedSchemaBundleHash.slice(0, 12)}`,
    phaseColumns: [...phaseColumns],
    railStates: railStates.map((label) => ({
      active: label === selectedRow.phaseState,
      count: timelineRows.filter((row) => row.phaseState === label).length,
      label,
      tone: atlasRowTone(label),
    })),
    routeId: "migration-window-atlas",
    selectedMigrationId,
    subtitle:
      "Immutable migration numbering, PostgreSQL singleton locking, reader-window governance, and resumable backfill posture in one observatory.",
    timelineRows,
    title: "Taxat Migration Window Atlas",
  };
}

export async function emitMigrationWindowAtlasPayload(payload: MigrationAtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function checkMigrationWindowAtlasPayload(payload: MigrationAtlasPayload) {
  const existing = await readFile(atlasDataPath, "utf8");
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${relativeRepoPath(atlasDataPath)}`);
  }
}

export async function mainBuildAtlas() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : "check";
  const policyBundle = await loadMigrationPolicyBundle();
  const payload = createMigrationWindowAtlasPayload(policyBundle);
  if (mode === "emit") {
    await emitMigrationWindowAtlasPayload(payload);
  } else {
    await checkMigrationWindowAtlasPayload(payload);
  }
  console.log(
    `${mode === "emit" ? "wrote" : "verified"} migration observatory atlas: ${payload.timelineRows.length} rows`,
  );
  console.log(`atlas payload: ${relativeRepoPath(atlasDataPath)}`);
}
