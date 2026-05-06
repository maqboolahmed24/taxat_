import {
  cloneTwinReadinessStateRecord,
  normalizeTwinReadinessStateRecord,
  twinReadinessStateRef,
  type TwinReadinessStateRecord,
} from "../models/twin_readiness_state.ts";
import { stableEqual, TwinModelError } from "../models/twin_common.ts";

export type StoredTwinReadinessStateRecord = {
  last_evaluated_at: string;
  readiness_row_version: 1;
  record: TwinReadinessStateRecord;
  safe_action_state: string;
  twin_id: string;
  twin_readiness_class: string;
  twin_readiness_id: string;
  twin_readiness_ref: string;
};

function cloneStored(record: StoredTwinReadinessStateRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredTwinReadinessStateRecord, right: StoredTwinReadinessStateRecord) {
  return (
    left.twin_id.localeCompare(right.twin_id) ||
    left.last_evaluated_at.localeCompare(right.last_evaluated_at) ||
    left.twin_readiness_id.localeCompare(right.twin_readiness_id)
  );
}

export class TwinReadinessStateRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByTwin = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTwinReadinessStateRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByTwin.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.twin_readiness_ref, stored.twin_readiness_id);
      pushIndex(this.idsByTwin, stored.twin_id, stored.twin_readiness_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTwinReadinessStateRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistTwinReadinessState(input: { readiness: TwinReadinessStateRecord }) {
    const readiness = normalizeTwinReadinessStateRecord(input.readiness);
    const stored: StoredTwinReadinessStateRecord = {
      last_evaluated_at: readiness.last_evaluated_at,
      readiness_row_version: 1,
      record: cloneTwinReadinessStateRecord(readiness),
      safe_action_state: readiness.safe_action_state,
      twin_id: readiness.twin_id,
      twin_readiness_class: readiness.twin_readiness_class,
      twin_readiness_id: readiness.twin_readiness_id,
      twin_readiness_ref: twinReadinessStateRef(readiness),
    };
    const existing = this.records.get(stored.twin_readiness_id);
    if (existing) {
      if (!stableEqual(existing.record, readiness)) {
        throw new TwinModelError(
          "TWIN_REPOSITORY_INVALID",
          `readiness state ${stored.twin_readiness_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.twin_readiness_ref);
    if (existingRefOwner !== undefined) {
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `readiness ref ${stored.twin_readiness_ref} already belongs to ${existingRefOwner}`,
      );
    }
    this.records.set(stored.twin_readiness_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getTwinReadinessStateById(readinessId: string) {
    const stored = this.records.get(readinessId);
    return stored ? cloneStored(stored) : null;
  }

  async listTwinReadinessStatesByTwinId(twinId: string) {
    return this.listByIds(this.idsByTwin.get(twinId) ?? []);
  }
}
