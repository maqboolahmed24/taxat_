import {
  cloneLateDataIndicatorSetRecord,
  lateDataIndicatorSetRef,
  normalizeLateDataIndicatorSetRecord,
  type LateDataIndicatorSetRecord,
} from "../models/late_data_indicator_set.ts";

export type StoredLateDataIndicatorSetRecord = {
  item_identity_hash: string;
  late_data_indicator_set: LateDataIndicatorSetRecord;
  late_data_indicator_set_ref: string;
  manifest_id: string;
  persisted_at: string;
  row_version: number;
  set_hash: string;
  set_id: string;
};

export type LateDataIndicatorSetRepositoryErrorCode =
  | "LATE_DATA_INDICATOR_SET_DUPLICATE"
  | "LATE_DATA_INDICATOR_SET_NOT_FOUND";

export class LateDataIndicatorSetRepositoryError extends Error {
  readonly code: LateDataIndicatorSetRepositoryErrorCode;

  constructor(code: LateDataIndicatorSetRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataIndicatorSetRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredLateDataIndicatorSetRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class LateDataIndicatorSetRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByHash = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly sets = new Map<string, StoredLateDataIndicatorSetRecord>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.sets.get(id))
      .filter((record): record is StoredLateDataIndicatorSetRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistLateDataIndicatorSet(input: {
    late_data_indicator_set: LateDataIndicatorSetRecord;
    persisted_at: string;
  }) {
    const indicatorSet = normalizeLateDataIndicatorSetRecord(input.late_data_indicator_set);
    const existing = this.sets.get(indicatorSet.set_id);
    if (existing) {
      if (JSON.stringify(existing.late_data_indicator_set) !== JSON.stringify(indicatorSet)) {
        throw new LateDataIndicatorSetRepositoryError(
          "LATE_DATA_INDICATOR_SET_DUPLICATE",
          `late-data indicator set ${indicatorSet.set_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = lateDataIndicatorSetRef(indicatorSet);
    const stored: StoredLateDataIndicatorSetRecord = {
      item_identity_hash: indicatorSet.item_identity_hash,
      late_data_indicator_set: cloneLateDataIndicatorSetRecord(indicatorSet),
      late_data_indicator_set_ref: ref,
      manifest_id: indicatorSet.manifest_id,
      persisted_at: input.persisted_at,
      row_version: 1,
      set_hash: indicatorSet.set_hash,
      set_id: indicatorSet.set_id,
    };
    this.sets.set(stored.set_id, cloneStored(stored));
    this.idByRef.set(stored.late_data_indicator_set_ref, stored.set_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.set_id);
    pushIndex(this.idsByHash, stored.set_hash, stored.set_id);
    return cloneStored(stored);
  }

  async getLateDataIndicatorSetById(setId: string) {
    const stored = this.sets.get(setId);
    return stored ? cloneStored(stored) : null;
  }

  async getLateDataIndicatorSetByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id ? this.getLateDataIndicatorSetById(id) : null;
  }

  async requireLateDataIndicatorSetById(setId: string) {
    const stored = await this.getLateDataIndicatorSetById(setId);
    if (!stored) {
      throw new LateDataIndicatorSetRepositoryError(
        "LATE_DATA_INDICATOR_SET_NOT_FOUND",
        `late-data indicator set ${setId} does not exist`,
      );
    }
    return stored;
  }

  async listLateDataIndicatorSetsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listLateDataIndicatorSetsBySetHash(setHash: string) {
    return this.listByIds(this.idsByHash.get(setHash) ?? []);
  }
}
