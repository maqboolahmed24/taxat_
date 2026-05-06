import {
  cloneTwinMismatchSummaryRecord,
  normalizeTwinMismatchSummaryRecord,
  twinMismatchSummaryRef,
  type TwinMismatchSummaryRecord,
} from "../models/twin_mismatch_summary.ts";
import { stableEqual, TwinModelError } from "../models/twin_common.ts";

export type StoredTwinMismatchSummaryRecord = {
  generated_at: string;
  mismatch_count: number;
  mismatch_summary_id: string;
  mismatch_summary_ref: string;
  mismatch_summary_row_version: 1;
  record: TwinMismatchSummaryRecord;
  twin_id: string;
};

function cloneStored(record: StoredTwinMismatchSummaryRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredTwinMismatchSummaryRecord, right: StoredTwinMismatchSummaryRecord) {
  return (
    left.twin_id.localeCompare(right.twin_id) ||
    left.generated_at.localeCompare(right.generated_at) ||
    left.mismatch_summary_id.localeCompare(right.mismatch_summary_id)
  );
}

export class TwinMismatchSummaryRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByTwin = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTwinMismatchSummaryRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByTwin.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.mismatch_summary_ref, stored.mismatch_summary_id);
      pushIndex(this.idsByTwin, stored.twin_id, stored.mismatch_summary_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTwinMismatchSummaryRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistTwinMismatchSummary(input: { summary: TwinMismatchSummaryRecord }) {
    const summary = normalizeTwinMismatchSummaryRecord(input.summary);
    const stored: StoredTwinMismatchSummaryRecord = {
      generated_at: summary.generated_at,
      mismatch_count: summary.mismatch_count,
      mismatch_summary_id: summary.mismatch_summary_id,
      mismatch_summary_ref: twinMismatchSummaryRef(summary),
      mismatch_summary_row_version: 1,
      record: cloneTwinMismatchSummaryRecord(summary),
      twin_id: summary.twin_id,
    };
    const existing = this.records.get(stored.mismatch_summary_id);
    if (existing) {
      if (!stableEqual(existing.record, summary)) {
        throw new TwinModelError(
          "TWIN_REPOSITORY_INVALID",
          `mismatch summary ${stored.mismatch_summary_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.mismatch_summary_ref);
    if (existingRefOwner !== undefined) {
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `mismatch summary ref ${stored.mismatch_summary_ref} already belongs to ${existingRefOwner}`,
      );
    }
    this.records.set(stored.mismatch_summary_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getTwinMismatchSummaryById(summaryId: string) {
    const stored = this.records.get(summaryId);
    return stored ? cloneStored(stored) : null;
  }

  async listTwinMismatchSummariesByTwinId(twinId: string) {
    return this.listByIds(this.idsByTwin.get(twinId) ?? []);
  }
}
