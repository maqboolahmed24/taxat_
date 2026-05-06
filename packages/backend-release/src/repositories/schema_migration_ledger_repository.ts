import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertBackfillExecutionContract,
  cloneBackfillExecutionContract,
  type BackfillExecutionContractRecord,
} from "../models/backfill_execution_contract.ts";
import {
  assertSchemaMigrationLedgerRecord,
  cloneSchemaMigrationLedgerRecord,
  schemaMigrationLedgerRef,
  type SchemaMigrationLedgerRecord,
  type SchemaMigrationLedgerTransitionEventCode,
} from "../models/schema_migration_ledger.ts";
import {
  assertSchemaReaderWindowContract,
  cloneSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
} from "../models/schema_reader_window_contract.ts";
import {
  advanceSchemaMigrationPhase as advanceSchemaMigrationPhaseRecord,
  type AdvanceSchemaMigrationPhaseInput,
} from "../services/advance_schema_migration_phase.ts";

export type SchemaMigrationLedgerContractSchemaKind =
  | "schema_reader_window_contract"
  | "backfill_execution_contract"
  | "state_transition_contract"
  | "schema_migration_ledger";

export type SchemaMigrationLedgerContractSchemaValidator = (
  kind: SchemaMigrationLedgerContractSchemaKind,
  payload: unknown,
) => Promise<void> | void;

export type SchemaMigrationLedgerRepositoryInput = {
  validate_contract_schema: SchemaMigrationLedgerContractSchemaValidator;
};

export type StoredSchemaReaderWindowContractRecord = {
  schema_reader_window_contract_ref: string;
  compatibility_window_ref: string;
  writer_schema_bundle_hash: string;
  window_state: SchemaReaderWindowContractRecord["window_state"];
  schema_reader_window_contract_row_version: number;
  persisted_at: string;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
};

export type StoredBackfillExecutionContractRecord = {
  backfill_execution_contract_ref: string;
  migration_id: string;
  target_version: string;
  target_schema_bundle_hash: string;
  execution_requirement: BackfillExecutionContractRecord["execution_requirement"];
  execution_state: BackfillExecutionContractRecord["execution_state"];
  backfill_execution_contract_row_version: number;
  persisted_at: string;
  backfill_execution_contract: BackfillExecutionContractRecord;
};

export type StoredSchemaMigrationLedgerRecord = {
  migration_id: string;
  schema_migration_ledger_ref: string;
  datastore_ref: string;
  target_version: string;
  target_schema_bundle_hash: string;
  compatibility_window_ref: string;
  phase_state: SchemaMigrationLedgerRecord["phase_state"];
  rollback_class: SchemaMigrationLedgerRecord["rollback_class"];
  schema_migration_ledger_row_version: number;
  persisted_at: string;
  last_transition_audit_ref: string;
  schema_migration_ledger: SchemaMigrationLedgerRecord;
};

export type SchemaMigrationLedgerListQuery = {
  datastore_ref?: string;
  target_schema_bundle_hash?: string;
  phase_state?: SchemaMigrationLedgerRecord["phase_state"];
  compatibility_window_ref?: string;
};

export type AdvancePersistedSchemaMigrationPhaseInput = Omit<
  AdvanceSchemaMigrationPhaseInput,
  "ledger"
> & {
  migration_id: string;
  expected_row_version: number;
};

export type SchemaMigrationLedgerRepositoryErrorCode =
  | "SCHEMA_READER_WINDOW_CONTRACT_DUPLICATE"
  | "SCHEMA_READER_WINDOW_CONTRACT_NOT_FOUND"
  | "BACKFILL_EXECUTION_CONTRACT_DUPLICATE"
  | "BACKFILL_EXECUTION_CONTRACT_NOT_FOUND"
  | "SCHEMA_MIGRATION_LEDGER_DUPLICATE"
  | "SCHEMA_MIGRATION_LEDGER_NOT_FOUND"
  | "SCHEMA_MIGRATION_LEDGER_ROW_VERSION_MISMATCH";

export class SchemaMigrationLedgerRepositoryError extends Error {
  readonly code: SchemaMigrationLedgerRepositoryErrorCode;

  constructor(code: SchemaMigrationLedgerRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaMigrationLedgerRepositoryError";
    this.code = code;
  }
}

function schemaReaderWindowContractRef(contract: SchemaReaderWindowContractRecord) {
  return [
    contract.compatibility_window_ref,
    contract.writer_schema_bundle_hash,
    contract.window_state,
    stableJsonHash(contract),
  ].join("::");
}

function backfillExecutionContractRef(contract: BackfillExecutionContractRecord) {
  return [contract.migration_id, stableJsonHash(contract)].join("::");
}

function cloneStoredReaderWindow(record: StoredSchemaReaderWindowContractRecord) {
  return structuredClone(record);
}

function cloneStoredBackfill(record: StoredBackfillExecutionContractRecord) {
  return structuredClone(record);
}

function cloneStoredLedger(record: StoredSchemaMigrationLedgerRecord) {
  return structuredClone(record);
}

function sortStoredLedgers(
  left: StoredSchemaMigrationLedgerRecord,
  right: StoredSchemaMigrationLedgerRecord,
) {
  return (
    left.datastore_ref.localeCompare(right.datastore_ref) ||
    left.target_version.localeCompare(right.target_version) ||
    left.persisted_at.localeCompare(right.persisted_at) ||
    left.migration_id.localeCompare(right.migration_id)
  );
}

function pushIndex(index: Map<string, string[]>, key: string, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

export class SchemaMigrationLedgerRepository {
  private readonly validateContractSchema: SchemaMigrationLedgerContractSchemaValidator;
  private readonly readerWindowContracts = new Map<
    string,
    StoredSchemaReaderWindowContractRecord
  >();
  private readonly backfillExecutionContracts = new Map<
    string,
    StoredBackfillExecutionContractRecord
  >();
  private readonly ledgers = new Map<string, StoredSchemaMigrationLedgerRecord>();
  private readonly ledgerIdsByDatastoreRef = new Map<string, string[]>();
  private readonly ledgerIdsByTargetSchemaBundleHash = new Map<string, string[]>();
  private readonly ledgerIdsByCompatibilityWindowRef = new Map<string, string[]>();

  constructor(input: SchemaMigrationLedgerRepositoryInput) {
    this.validateContractSchema = input.validate_contract_schema;
  }

  private async validateReaderWindowContract(record: SchemaReaderWindowContractRecord) {
    const normalized = assertSchemaReaderWindowContract(record);
    await this.validateContractSchema("schema_reader_window_contract", normalized);
    return normalized;
  }

  private async validateBackfillExecutionContract(record: BackfillExecutionContractRecord) {
    const normalized = assertBackfillExecutionContract(record);
    await this.validateContractSchema("backfill_execution_contract", normalized);
    return normalized;
  }

  private async validateSchemaMigrationLedger(record: SchemaMigrationLedgerRecord) {
    const normalized = assertSchemaMigrationLedgerRecord(record);
    await this.validateContractSchema(
      "schema_reader_window_contract",
      normalized.schema_reader_window_contract,
    );
    await this.validateContractSchema(
      "backfill_execution_contract",
      normalized.backfill_execution_contract,
    );
    await this.validateContractSchema(
      "state_transition_contract",
      normalized.state_transition_contract,
    );
    await this.validateContractSchema("schema_migration_ledger", normalized);
    return normalized;
  }

  private storedReaderWindow(input: {
    schema_reader_window_contract: SchemaReaderWindowContractRecord;
    persisted_at: string;
    row_version?: number;
  }): StoredSchemaReaderWindowContractRecord {
    const contract = assertSchemaReaderWindowContract(
      input.schema_reader_window_contract,
    );
    return {
      schema_reader_window_contract_ref: schemaReaderWindowContractRef(contract),
      compatibility_window_ref: contract.compatibility_window_ref,
      writer_schema_bundle_hash: contract.writer_schema_bundle_hash,
      window_state: contract.window_state,
      schema_reader_window_contract_row_version: input.row_version ?? 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      schema_reader_window_contract: cloneSchemaReaderWindowContract(contract),
    };
  }

  private storedBackfill(input: {
    backfill_execution_contract: BackfillExecutionContractRecord;
    persisted_at: string;
    row_version?: number;
  }): StoredBackfillExecutionContractRecord {
    const contract = assertBackfillExecutionContract(input.backfill_execution_contract);
    return {
      backfill_execution_contract_ref: backfillExecutionContractRef(contract),
      migration_id: contract.migration_id,
      target_version: contract.target_version,
      target_schema_bundle_hash: contract.target_schema_bundle_hash,
      execution_requirement: contract.execution_requirement,
      execution_state: contract.execution_state,
      backfill_execution_contract_row_version: input.row_version ?? 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      backfill_execution_contract: cloneBackfillExecutionContract(contract),
    };
  }

  private storedLedger(input: {
    schema_migration_ledger: SchemaMigrationLedgerRecord;
    persisted_at: string;
    row_version: number;
  }): StoredSchemaMigrationLedgerRecord {
    const ledger = assertSchemaMigrationLedgerRecord(input.schema_migration_ledger);
    return {
      migration_id: ledger.migration_id,
      schema_migration_ledger_ref: schemaMigrationLedgerRef(ledger),
      datastore_ref: ledger.datastore_ref,
      target_version: ledger.target_version,
      target_schema_bundle_hash: ledger.target_schema_bundle_hash,
      compatibility_window_ref: ledger.compatibility_window_ref,
      phase_state: ledger.phase_state,
      rollback_class: ledger.rollback_class,
      schema_migration_ledger_row_version: input.row_version,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      last_transition_audit_ref:
        ledger.state_transition_contract.transition_audit_ref,
      schema_migration_ledger: cloneSchemaMigrationLedgerRecord(ledger),
    };
  }

  private rebuildLedgerIndexes() {
    this.ledgerIdsByDatastoreRef.clear();
    this.ledgerIdsByTargetSchemaBundleHash.clear();
    this.ledgerIdsByCompatibilityWindowRef.clear();
    for (const stored of this.ledgers.values()) {
      pushIndex(this.ledgerIdsByDatastoreRef, stored.datastore_ref, stored.migration_id);
      pushIndex(
        this.ledgerIdsByTargetSchemaBundleHash,
        stored.target_schema_bundle_hash,
        stored.migration_id,
      );
      pushIndex(
        this.ledgerIdsByCompatibilityWindowRef,
        stored.compatibility_window_ref,
        stored.migration_id,
      );
    }
  }

  private persistNormalizedReaderWindow(
    contract: SchemaReaderWindowContractRecord,
    persistedAt: string,
  ) {
    const stored = this.storedReaderWindow({
      schema_reader_window_contract: contract,
      persisted_at: persistedAt,
    });
    const existing = this.readerWindowContracts.get(
      stored.schema_reader_window_contract_ref,
    );
    if (
      existing &&
      stableJsonHash(existing.schema_reader_window_contract) !==
        stableJsonHash(stored.schema_reader_window_contract)
    ) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_READER_WINDOW_CONTRACT_DUPLICATE",
        `schema reader-window contract ${stored.schema_reader_window_contract_ref} already exists with a different payload`,
      );
    }
    if (!existing) {
      this.readerWindowContracts.set(
        stored.schema_reader_window_contract_ref,
        cloneStoredReaderWindow(stored),
      );
    }
    return cloneStoredReaderWindow(existing ?? stored);
  }

  private persistNormalizedBackfill(
    contract: BackfillExecutionContractRecord,
    persistedAt: string,
  ) {
    const stored = this.storedBackfill({
      backfill_execution_contract: contract,
      persisted_at: persistedAt,
    });
    const existing = this.backfillExecutionContracts.get(
      stored.backfill_execution_contract_ref,
    );
    if (
      existing &&
      stableJsonHash(existing.backfill_execution_contract) !==
        stableJsonHash(stored.backfill_execution_contract)
    ) {
      throw new SchemaMigrationLedgerRepositoryError(
        "BACKFILL_EXECUTION_CONTRACT_DUPLICATE",
        `backfill execution contract ${stored.backfill_execution_contract_ref} already exists with a different payload`,
      );
    }
    if (!existing) {
      this.backfillExecutionContracts.set(
        stored.backfill_execution_contract_ref,
        cloneStoredBackfill(stored),
      );
    }
    return cloneStoredBackfill(existing ?? stored);
  }

  async persistSchemaReaderWindowContract(input: {
    schema_reader_window_contract: SchemaReaderWindowContractRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateReaderWindowContract(
      input.schema_reader_window_contract,
    );
    return this.persistNormalizedReaderWindow(normalized, input.persisted_at);
  }

  async persistBackfillExecutionContract(input: {
    backfill_execution_contract: BackfillExecutionContractRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateBackfillExecutionContract(
      input.backfill_execution_contract,
    );
    return this.persistNormalizedBackfill(normalized, input.persisted_at);
  }

  async persistSchemaMigrationLedger(input: {
    schema_migration_ledger: SchemaMigrationLedgerRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateSchemaMigrationLedger(
      input.schema_migration_ledger,
    );
    this.persistNormalizedReaderWindow(
      normalized.schema_reader_window_contract,
      input.persisted_at,
    );
    this.persistNormalizedBackfill(
      normalized.backfill_execution_contract,
      input.persisted_at,
    );
    const stored = this.storedLedger({
      schema_migration_ledger: normalized,
      persisted_at: input.persisted_at,
      row_version: 1,
    });
    const existing = this.ledgers.get(stored.migration_id);
    if (existing) {
      if (
        stableJsonHash(existing.schema_migration_ledger) !==
        stableJsonHash(stored.schema_migration_ledger)
      ) {
        throw new SchemaMigrationLedgerRepositoryError(
          "SCHEMA_MIGRATION_LEDGER_DUPLICATE",
          `schema migration ledger ${stored.migration_id} already exists with a different payload`,
        );
      }
      return cloneStoredLedger(existing);
    }
    this.ledgers.set(stored.migration_id, cloneStoredLedger(stored));
    this.rebuildLedgerIndexes();
    return cloneStoredLedger(stored);
  }

  async advanceSchemaMigrationPhase(input: AdvancePersistedSchemaMigrationPhaseInput) {
    const existing = this.ledgers.get(input.migration_id);
    if (!existing) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_MIGRATION_LEDGER_NOT_FOUND",
        `schema migration ledger ${input.migration_id} does not exist`,
      );
    }
    if (
      existing.schema_migration_ledger_row_version !== input.expected_row_version &&
      existing.schema_migration_ledger.state_transition_contract.transition_event_code ===
        input.transition_event_code &&
      existing.schema_migration_ledger.state_transition_contract.transition_audit_ref ===
        input.transition_audit_ref
    ) {
      return cloneStoredLedger(existing);
    }
    if (existing.schema_migration_ledger_row_version !== input.expected_row_version) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_MIGRATION_LEDGER_ROW_VERSION_MISMATCH",
        `schema migration ledger ${input.migration_id} row version is ${existing.schema_migration_ledger_row_version}, not ${input.expected_row_version}`,
      );
    }

    const nextLedger = await this.validateSchemaMigrationLedger(
      advanceSchemaMigrationPhaseRecord({
        ...input,
        ledger: existing.schema_migration_ledger,
      }),
    );
    this.persistNormalizedReaderWindow(
      nextLedger.schema_reader_window_contract,
      input.transition_applied_at,
    );
    this.persistNormalizedBackfill(
      nextLedger.backfill_execution_contract,
      input.transition_applied_at,
    );
    const nextStored = this.storedLedger({
      schema_migration_ledger: nextLedger,
      persisted_at: input.transition_applied_at,
      row_version: existing.schema_migration_ledger_row_version + 1,
    });
    this.ledgers.set(nextStored.migration_id, cloneStoredLedger(nextStored));
    this.rebuildLedgerIndexes();
    return cloneStoredLedger(nextStored);
  }

  async getSchemaReaderWindowContractByRef(ref: string) {
    const stored = this.readerWindowContracts.get(ref);
    if (!stored) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_READER_WINDOW_CONTRACT_NOT_FOUND",
        `schema reader-window contract ${ref} does not exist`,
      );
    }
    return cloneStoredReaderWindow(stored);
  }

  async getBackfillExecutionContractByRef(ref: string) {
    const stored = this.backfillExecutionContracts.get(ref);
    if (!stored) {
      throw new SchemaMigrationLedgerRepositoryError(
        "BACKFILL_EXECUTION_CONTRACT_NOT_FOUND",
        `backfill execution contract ${ref} does not exist`,
      );
    }
    return cloneStoredBackfill(stored);
  }

  async getSchemaMigrationLedgerById(migrationId: string) {
    const stored = this.ledgers.get(migrationId);
    if (!stored) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_MIGRATION_LEDGER_NOT_FOUND",
        `schema migration ledger ${migrationId} does not exist`,
      );
    }
    return cloneStoredLedger(stored);
  }

  async listSchemaMigrationLedgers(query: SchemaMigrationLedgerListQuery = {}) {
    let records = [...this.ledgers.values()];
    if (query.datastore_ref) {
      const ids = new Set(
        this.ledgerIdsByDatastoreRef.get(query.datastore_ref) ?? [],
      );
      records = records.filter((record) => ids.has(record.migration_id));
    }
    if (query.target_schema_bundle_hash) {
      const ids = new Set(
        this.ledgerIdsByTargetSchemaBundleHash.get(
          query.target_schema_bundle_hash,
        ) ?? [],
      );
      records = records.filter((record) => ids.has(record.migration_id));
    }
    if (query.compatibility_window_ref) {
      const ids = new Set(
        this.ledgerIdsByCompatibilityWindowRef.get(
          query.compatibility_window_ref,
        ) ?? [],
      );
      records = records.filter((record) => ids.has(record.migration_id));
    }
    if (query.phase_state) {
      records = records.filter((record) => record.phase_state === query.phase_state);
    }
    return records.sort(sortStoredLedgers).map(cloneStoredLedger);
  }
}

export type SchemaMigrationPhaseTransitionEventCode =
  SchemaMigrationLedgerTransitionEventCode;
