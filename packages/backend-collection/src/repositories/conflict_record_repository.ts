import {
  cloneConflictRecordRecord,
  conflictRecordRef,
  normalizeConflictRecordRecord,
  type ConflictRecordRecord,
} from "../models/conflict_record.ts";
import { deriveConflictIdentityHash } from "../services/conflict_identity_hash.ts";

export type StoredConflictRecordRecord = {
  blocking_class: string;
  conflict_id: string;
  conflict_record: ConflictRecordRecord;
  conflict_record_ref: string;
  conflict_record_row_version: number;
  conflict_type: string;
  manifest_id: string;
  persisted_at: string;
  resolution_state: string;
};

export type ConflictRecordRepositoryErrorCode =
  | "CONFLICT_RECORD_DUPLICATE"
  | "CONFLICT_RECORD_NOT_FOUND";

export class ConflictRecordRepositoryError extends Error {
  readonly code: ConflictRecordRepositoryErrorCode;

  constructor(code: ConflictRecordRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConflictRecordRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredConflictRecordRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ConflictRecordRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBlockingClass = new Map<string, string[]>();
  private readonly idsByConflictType = new Map<string, string[]>();
  private readonly idsByInvolvedRef = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByResolutionState = new Map<string, string[]>();
  private readonly records = new Map<string, StoredConflictRecordRecord>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredConflictRecordRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistConflictRecord(input: {
    conflict_record: ConflictRecordRecord;
    persisted_at: string;
  }) {
    const conflictRecord = normalizeConflictRecordRecord(input.conflict_record);
    const existing = this.records.get(conflictRecord.conflict_id);
    if (existing) {
      if (JSON.stringify(existing.conflict_record) !== JSON.stringify(conflictRecord)) {
        throw new ConflictRecordRepositoryError(
          "CONFLICT_RECORD_DUPLICATE",
          `conflict record ${conflictRecord.conflict_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = conflictRecordRef(conflictRecord);
    const stored: StoredConflictRecordRecord = {
      blocking_class: conflictRecord.blocking_class,
      conflict_id: conflictRecord.conflict_id,
      conflict_record: cloneConflictRecordRecord(conflictRecord),
      conflict_record_ref: ref,
      conflict_record_row_version: 1,
      conflict_type: conflictRecord.conflict_type,
      manifest_id: conflictRecord.manifest_id,
      persisted_at: input.persisted_at,
      resolution_state: conflictRecord.resolution_state,
    };
    this.records.set(stored.conflict_id, cloneStored(stored));
    this.idByRef.set(stored.conflict_record_ref, stored.conflict_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.conflict_id);
    pushIndex(
      this.idsByConflictType,
      `${stored.manifest_id}::${stored.conflict_type}`,
      stored.conflict_id,
    );
    pushIndex(
      this.idsByBlockingClass,
      `${stored.manifest_id}::${stored.blocking_class}`,
      stored.conflict_id,
    );
    pushIndex(
      this.idsByResolutionState,
      `${stored.manifest_id}::${stored.resolution_state}`,
      stored.conflict_id,
    );
    for (const involvedRef of conflictRecord.involved_fact_refs) {
      pushIndex(this.idsByInvolvedRef, `${stored.manifest_id}::${involvedRef}`, stored.conflict_id);
    }
    return cloneStored(stored);
  }

  async getConflictRecordById(conflictId: string) {
    const stored = this.records.get(conflictId);
    return stored ? cloneStored(stored) : null;
  }

  async getConflictRecordByRef(conflictRef: string) {
    const id = this.idByRef.get(conflictRef);
    return id ? this.getConflictRecordById(id) : null;
  }

  async requireConflictRecordById(conflictId: string) {
    const stored = await this.getConflictRecordById(conflictId);
    if (!stored) {
      throw new ConflictRecordRepositoryError(
        "CONFLICT_RECORD_NOT_FOUND",
        `conflict record ${conflictId} does not exist`,
      );
    }
    return stored;
  }

  async listConflictRecordsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listConflictRecordsByType(manifestId: string, conflictType: string) {
    return this.listByIds(this.idsByConflictType.get(`${manifestId}::${conflictType}`) ?? []);
  }

  async listConflictRecordsByBlockingClass(manifestId: string, blockingClass: string) {
    return this.listByIds(
      this.idsByBlockingClass.get(`${manifestId}::${blockingClass}`) ?? [],
    );
  }

  async listConflictRecordsByResolutionState(manifestId: string, resolutionState: string) {
    return this.listByIds(
      this.idsByResolutionState.get(`${manifestId}::${resolutionState}`) ?? [],
    );
  }

  async listConflictRecordsByInvolvedRef(manifestId: string, involvedRef: string) {
    return this.listByIds(this.idsByInvolvedRef.get(`${manifestId}::${involvedRef}`) ?? []);
  }
}

export { deriveConflictIdentityHash };
