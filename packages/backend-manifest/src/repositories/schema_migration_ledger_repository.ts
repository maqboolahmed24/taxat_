import {
  cloneSchemaMigrationLedgerRecord,
  normalizeSchemaMigrationLedgerRecord,
  type SchemaMigrationLedgerPhaseState,
  type SchemaMigrationLedgerRecord,
} from "../models/schema_migration_ledger.ts";

export type StoredSchemaMigrationLedgerRecord = {
  compatibility_window_ref: string;
  ledger: SchemaMigrationLedgerRecord;
  ledger_row_version: number;
  migration_id: string;
  persisted_at: string;
  phase_state: SchemaMigrationLedgerPhaseState;
  rollback_class: SchemaMigrationLedgerRecord["rollback_class"];
  target_schema_bundle_hash: string;
  updated_at: string;
};

export type SchemaMigrationLedgerRepositoryErrorCode =
  | "SCHEMA_MIGRATION_LEDGER_COMPARE_AND_SWAP_CONFLICT"
  | "SCHEMA_MIGRATION_LEDGER_DUPLICATE"
  | "SCHEMA_MIGRATION_LEDGER_NOT_FOUND";

export class SchemaMigrationLedgerRepositoryError extends Error {
  readonly code: SchemaMigrationLedgerRepositoryErrorCode;

  constructor(code: SchemaMigrationLedgerRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaMigrationLedgerRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSchemaMigrationLedgerRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function removeIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  const next = current.filter((entry) => entry !== value);
  if (next.length === 0) {
    index.delete(key);
    return;
  }
  index.set(key, next);
}

export class SchemaMigrationLedgerRepository {
  private readonly ledgers = new Map<string, StoredSchemaMigrationLedgerRecord>();
  private readonly idsByPhase = new Map<string, string[]>();
  private readonly idsByTargetBundle = new Map<string, string[]>();
  private readonly idsByWindow = new Map<string, string[]>();

  private buildStored(input: {
    ledger: SchemaMigrationLedgerRecord;
    ledger_row_version: number;
    persisted_at: string;
  }): StoredSchemaMigrationLedgerRecord {
    return {
      migration_id: input.ledger.migration_id,
      target_schema_bundle_hash: input.ledger.target_schema_bundle_hash,
      compatibility_window_ref: input.ledger.compatibility_window_ref,
      phase_state: input.ledger.phase_state,
      rollback_class: input.ledger.rollback_class,
      ledger_row_version: input.ledger_row_version,
      persisted_at: input.persisted_at,
      updated_at: input.persisted_at,
      ledger: cloneSchemaMigrationLedgerRecord(input.ledger),
    };
  }

  private replaceIndexes(
    previous: StoredSchemaMigrationLedgerRecord | null,
    next: StoredSchemaMigrationLedgerRecord,
  ) {
    if (previous) {
      if (
        previous.target_schema_bundle_hash !== next.target_schema_bundle_hash ||
        previous.compatibility_window_ref !== next.compatibility_window_ref
      ) {
        throw new SchemaMigrationLedgerRepositoryError(
          "SCHEMA_MIGRATION_LEDGER_COMPARE_AND_SWAP_CONFLICT",
          "target_schema_bundle_hash and compatibility_window_ref are immutable for a migration ledger",
        );
      }
      if (previous.phase_state !== next.phase_state) {
        removeIndex(this.idsByPhase, previous.phase_state, previous.migration_id);
      }
    } else {
      pushIndex(this.idsByTargetBundle, next.target_schema_bundle_hash, next.migration_id);
      pushIndex(this.idsByWindow, next.compatibility_window_ref, next.migration_id);
    }
    pushIndex(this.idsByPhase, next.phase_state, next.migration_id);
  }

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.ledgers.get(id))
      .filter((record): record is StoredSchemaMigrationLedgerRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async createLedger(input: { ledger: SchemaMigrationLedgerRecord; persisted_at: string }) {
    const ledger = normalizeSchemaMigrationLedgerRecord(input.ledger);
    const existing = this.ledgers.get(ledger.migration_id);
    if (existing) {
      if (JSON.stringify(existing.ledger) !== JSON.stringify(ledger)) {
        throw new SchemaMigrationLedgerRepositoryError(
          "SCHEMA_MIGRATION_LEDGER_DUPLICATE",
          `migration ledger ${ledger.migration_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const stored = this.buildStored({
      ledger,
      ledger_row_version: 1,
      persisted_at: input.persisted_at,
    });
    this.ledgers.set(stored.migration_id, cloneStored(stored));
    this.replaceIndexes(null, stored);
    return cloneStored(stored);
  }

  async getLedgerById(migrationId: string) {
    const stored = this.ledgers.get(migrationId);
    return stored ? cloneStored(stored) : null;
  }

  async requireLedgerById(migrationId: string) {
    const stored = await this.getLedgerById(migrationId);
    if (!stored) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_MIGRATION_LEDGER_NOT_FOUND",
        `schema migration ledger ${migrationId} does not exist`,
      );
    }
    return stored;
  }

  async listLedgersByTargetBundleHash(targetSchemaBundleHash: string) {
    return this.listByIds(this.idsByTargetBundle.get(targetSchemaBundleHash) ?? []);
  }

  async listLedgersByCompatibilityWindow(compatibilityWindowRef: string) {
    return this.listByIds(this.idsByWindow.get(compatibilityWindowRef) ?? []);
  }

  async listLedgersByPhaseState(phaseState: SchemaMigrationLedgerPhaseState) {
    return this.listByIds(this.idsByPhase.get(phaseState) ?? []);
  }

  async compareAndSwapLedger(input: {
    expected_ledger_row_version: number;
    next_ledger: SchemaMigrationLedgerRecord;
    persisted_at: string;
  }) {
    const existing = this.ledgers.get(input.next_ledger.migration_id);
    if (!existing) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_MIGRATION_LEDGER_NOT_FOUND",
        `schema migration ledger ${input.next_ledger.migration_id} does not exist`,
      );
    }
    if (existing.ledger_row_version !== input.expected_ledger_row_version) {
      throw new SchemaMigrationLedgerRepositoryError(
        "SCHEMA_MIGRATION_LEDGER_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_ledger_row_version} but found ${existing.ledger_row_version}`,
      );
    }
    const ledger = normalizeSchemaMigrationLedgerRecord(input.next_ledger);
    const next = this.buildStored({
      ledger,
      ledger_row_version: existing.ledger_row_version + 1,
      persisted_at: input.persisted_at,
    });
    this.replaceIndexes(existing, next);
    this.ledgers.set(next.migration_id, cloneStored(next));
    return cloneStored(next);
  }
}
