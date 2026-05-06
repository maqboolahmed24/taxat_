import {
  cloneTwinStateSnapshotRecord,
  normalizeTwinStateSnapshotRecord,
  twinStateSnapshotRef,
  type TwinStateSnapshotRecord,
} from "../models/twin_state_snapshot.ts";
import { stableEqual, TwinModelError } from "../models/twin_common.ts";

export type StoredTwinStateSnapshotRecord = {
  assembly_state: string;
  generated_at: string;
  lane_code: string;
  record: TwinStateSnapshotRecord;
  twin_id: string;
  twin_state_snapshot_id: string;
  twin_state_snapshot_ref: string;
  twin_state_snapshot_row_version: 1;
};

function cloneStored(record: StoredTwinStateSnapshotRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredTwinStateSnapshotRecord, right: StoredTwinStateSnapshotRecord) {
  return (
    left.twin_id.localeCompare(right.twin_id) ||
    left.lane_code.localeCompare(right.lane_code) ||
    left.generated_at.localeCompare(right.generated_at) ||
    left.twin_state_snapshot_id.localeCompare(right.twin_state_snapshot_id)
  );
}

export class TwinStateSnapshotRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByTwin = new Map<string, string[]>();
  private readonly idsByTwinLane = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTwinStateSnapshotRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByTwin.clear();
    this.idsByTwinLane.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.twin_state_snapshot_ref, stored.twin_state_snapshot_id);
      pushIndex(this.idsByTwin, stored.twin_id, stored.twin_state_snapshot_id);
      pushIndex(this.idsByTwinLane, `${stored.twin_id}:${stored.lane_code}`, stored.twin_state_snapshot_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTwinStateSnapshotRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistTwinStateSnapshot(input: { snapshot: TwinStateSnapshotRecord }) {
    const snapshot = normalizeTwinStateSnapshotRecord(input.snapshot);
    const stored: StoredTwinStateSnapshotRecord = {
      assembly_state: snapshot.assembly_state,
      generated_at: snapshot.generated_at,
      lane_code: snapshot.lane_code,
      record: cloneTwinStateSnapshotRecord(snapshot),
      twin_id: snapshot.twin_id,
      twin_state_snapshot_id: snapshot.twin_state_snapshot_id,
      twin_state_snapshot_ref: twinStateSnapshotRef(snapshot),
      twin_state_snapshot_row_version: 1,
    };
    const existing = this.records.get(stored.twin_state_snapshot_id);
    if (existing) {
      if (!stableEqual(existing.record, snapshot)) {
        throw new TwinModelError(
          "TWIN_REPOSITORY_INVALID",
          `snapshot ${stored.twin_state_snapshot_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.twin_state_snapshot_ref);
    if (existingRefOwner !== undefined) {
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `snapshot ref ${stored.twin_state_snapshot_ref} already belongs to ${existingRefOwner}`,
      );
    }
    this.records.set(stored.twin_state_snapshot_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getTwinStateSnapshotById(snapshotId: string) {
    const stored = this.records.get(snapshotId);
    return stored ? cloneStored(stored) : null;
  }

  async requireTwinStateSnapshotById(snapshotId: string) {
    const stored = await this.getTwinStateSnapshotById(snapshotId);
    if (!stored) {
      throw new TwinModelError("TWIN_REPOSITORY_INVALID", `snapshot ${snapshotId} does not exist`);
    }
    return stored;
  }

  async listTwinStateSnapshotsByTwinId(twinId: string) {
    return this.listByIds(this.idsByTwin.get(twinId) ?? []);
  }

  async listTwinStateSnapshotsByTwinLane(twinId: string, laneCode: string) {
    return this.listByIds(this.idsByTwinLane.get(`${twinId}:${laneCode}`) ?? []);
  }
}
