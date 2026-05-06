import {
  cloneConflictSetRecord,
  conflictSetRef,
  normalizeConflictSetRecord,
  type ConflictSetRecord,
} from "../models/conflict_set.ts";

export type StoredConflictSetRecord = {
  blocking_conflict_count: number;
  conflict_detection_policy_ref: string;
  conflict_set: ConflictSetRecord;
  conflict_set_ref: string;
  conflict_set_row_version: number;
  manifest_id: string;
  open_conflict_count: number;
  persisted_at: string;
  resolution_frontier: string;
  set_hash: string;
  set_id: string;
  unresolved_conflict_hash: string;
};

export type ConflictSetRepositoryErrorCode =
  | "CONFLICT_SET_DUPLICATE"
  | "CONFLICT_SET_NOT_FOUND";

export class ConflictSetRepositoryError extends Error {
  readonly code: ConflictSetRepositoryErrorCode;

  constructor(code: ConflictSetRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConflictSetRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredConflictSetRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ConflictSetRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByFrontier = new Map<string, string[]>();
  private readonly idsByHash = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly sets = new Map<string, StoredConflictSetRecord>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.sets.get(id))
      .filter((record): record is StoredConflictSetRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistConflictSet(input: {
    conflict_set: ConflictSetRecord;
    persisted_at: string;
  }) {
    const conflictSet = normalizeConflictSetRecord(input.conflict_set);
    const existing = this.sets.get(conflictSet.set_id);
    if (existing) {
      if (JSON.stringify(existing.conflict_set) !== JSON.stringify(conflictSet)) {
        throw new ConflictSetRepositoryError(
          "CONFLICT_SET_DUPLICATE",
          `conflict set ${conflictSet.set_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = conflictSetRef(conflictSet);
    const stored: StoredConflictSetRecord = {
      blocking_conflict_count: conflictSet.blocking_conflict_count,
      conflict_detection_policy_ref: conflictSet.conflict_detection_policy_ref,
      conflict_set: cloneConflictSetRecord(conflictSet),
      conflict_set_ref: ref,
      conflict_set_row_version: 1,
      manifest_id: conflictSet.manifest_id,
      open_conflict_count: conflictSet.open_conflict_count,
      persisted_at: input.persisted_at,
      resolution_frontier: conflictSet.resolution_frontier,
      set_hash: conflictSet.set_hash,
      set_id: conflictSet.set_id,
      unresolved_conflict_hash: conflictSet.unresolved_conflict_hash,
    };
    this.sets.set(stored.set_id, cloneStored(stored));
    this.idByRef.set(stored.conflict_set_ref, stored.set_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.set_id);
    pushIndex(this.idsByHash, stored.set_hash, stored.set_id);
    pushIndex(
      this.idsByFrontier,
      `${stored.manifest_id}::${stored.resolution_frontier}`,
      stored.set_id,
    );
    return cloneStored(stored);
  }

  async getConflictSetById(setId: string) {
    const stored = this.sets.get(setId);
    return stored ? cloneStored(stored) : null;
  }

  async getConflictSetByRef(conflictSetRefValue: string) {
    const id = this.idByRef.get(conflictSetRefValue);
    return id ? this.getConflictSetById(id) : null;
  }

  async requireConflictSetById(setId: string) {
    const stored = await this.getConflictSetById(setId);
    if (!stored) {
      throw new ConflictSetRepositoryError(
        "CONFLICT_SET_NOT_FOUND",
        `conflict set ${setId} does not exist`,
      );
    }
    return stored;
  }

  async listConflictSetsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listConflictSetsByResolutionFrontier(manifestId: string, resolutionFrontier: string) {
    return this.listByIds(
      this.idsByFrontier.get(`${manifestId}::${resolutionFrontier}`) ?? [],
    );
  }

  async listConflictSetsBySetHash(setHash: string) {
    return this.listByIds(this.idsByHash.get(setHash) ?? []);
  }
}
