import {
  cloneTwinDeltaArcRecord,
  normalizeTwinDeltaArcRecord,
  twinDeltaArcRef,
  type TwinDeltaArcRecord,
} from "../models/twin_delta_arc.ts";
import { stableEqual, TwinModelError } from "../models/twin_common.ts";

export type StoredTwinDeltaArcRecord = {
  comparison_key: string;
  delta_arc_id: string;
  delta_arc_ref: string;
  delta_arc_row_version: 1;
  delta_class: string;
  priority_rank: number;
  record: TwinDeltaArcRecord;
  timeline_ref: string;
  twin_id: string;
};

function cloneStored(record: StoredTwinDeltaArcRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredTwinDeltaArcRecord, right: StoredTwinDeltaArcRecord) {
  return (
    right.priority_rank - left.priority_rank ||
    right.record.last_compared_at.localeCompare(left.record.last_compared_at) ||
    left.comparison_key.localeCompare(right.comparison_key)
  );
}

export class TwinDeltaArcRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByTimeline = new Map<string, string[]>();
  private readonly idsByTwin = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTwinDeltaArcRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByTimeline.clear();
    this.idsByTwin.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.delta_arc_ref, stored.delta_arc_id);
      pushIndex(this.idsByTimeline, stored.timeline_ref, stored.delta_arc_id);
      pushIndex(this.idsByTwin, stored.twin_id, stored.delta_arc_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTwinDeltaArcRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistTwinDeltaArc(input: { delta: TwinDeltaArcRecord }) {
    const delta = normalizeTwinDeltaArcRecord(input.delta);
    const stored: StoredTwinDeltaArcRecord = {
      comparison_key: delta.comparison_key,
      delta_arc_id: delta.delta_arc_id,
      delta_arc_ref: twinDeltaArcRef(delta),
      delta_arc_row_version: 1,
      delta_class: delta.delta_class,
      priority_rank: delta.priority_rank,
      record: cloneTwinDeltaArcRecord(delta),
      timeline_ref: delta.timeline_ref,
      twin_id: delta.twin_id,
    };
    const existing = this.records.get(stored.delta_arc_id);
    if (existing) {
      if (!stableEqual(existing.record, delta)) {
        throw new TwinModelError(
          "TWIN_REPOSITORY_INVALID",
          `delta arc ${stored.delta_arc_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.delta_arc_ref);
    if (existingRefOwner !== undefined) {
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `delta arc ref ${stored.delta_arc_ref} already belongs to ${existingRefOwner}`,
      );
    }
    this.records.set(stored.delta_arc_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async persistTwinDeltaSet(input: { deltas: readonly TwinDeltaArcRecord[] }) {
    const stored: StoredTwinDeltaArcRecord[] = [];
    for (const delta of input.deltas) {
      stored.push(await this.persistTwinDeltaArc({ delta }));
    }
    return stored.sort(sortStored);
  }

  async getTwinDeltaArcById(deltaArcId: string) {
    const stored = this.records.get(deltaArcId);
    return stored ? cloneStored(stored) : null;
  }

  async listTwinDeltaArcsByTwinId(twinId: string) {
    return this.listByIds(this.idsByTwin.get(twinId) ?? []);
  }

  async listTwinDeltaArcsByTimelineRef(timelineRef: string) {
    return this.listByIds(this.idsByTimeline.get(timelineRef) ?? []);
  }
}
