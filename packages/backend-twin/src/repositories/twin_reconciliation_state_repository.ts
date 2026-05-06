import { cloneRecord, stableEqual, TwinModelError } from "../models/twin_common.ts";
import {
  cloneTwinReconciliationStateRecord,
  deriveTwinReconciliationDedupeKey,
  isActiveTwinReconciliationState,
  normalizeTwinReconciliationStateRecord,
  twinReconciliationStateRef,
  type TwinReconciliationStateRecord,
} from "../models/twin_reconciliation_state.ts";

export type StoredTwinReconciliationStateRecord = {
  lifecycle_state: string;
  reconciliation_dedupe_key: string | null;
  record: TwinReconciliationStateRecord;
  twin_id: string;
  twin_reconciliation_state_id: string;
  twin_reconciliation_state_ref: string;
  twin_reconciliation_state_row_version: number;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function cloneStored(record: StoredTwinReconciliationStateRecord) {
  return cloneRecord(record);
}

function sortStored(left: StoredTwinReconciliationStateRecord, right: StoredTwinReconciliationStateRecord) {
  return (
    left.twin_id.localeCompare(right.twin_id) ||
    left.record.generated_at.localeCompare(right.record.generated_at) ||
    left.twin_reconciliation_state_id.localeCompare(right.twin_reconciliation_state_id)
  );
}

export class TwinReconciliationStateRepository {
  private readonly activeIdByDedupeKey = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByTwin = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTwinReconciliationStateRecord>();

  private rebuildIndexes() {
    this.activeIdByDedupeKey.clear();
    this.idByRef.clear();
    this.idsByTwin.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.twin_reconciliation_state_ref, stored.twin_reconciliation_state_id);
      pushIndex(this.idsByTwin, stored.twin_id, stored.twin_reconciliation_state_id);
      if (stored.reconciliation_dedupe_key !== null && isActiveTwinReconciliationState(stored.record)) {
        const currentOwner = this.activeIdByDedupeKey.get(stored.reconciliation_dedupe_key);
        if (currentOwner !== undefined && currentOwner !== stored.twin_reconciliation_state_id) {
          throw new TwinModelError(
            "TWIN_REPOSITORY_INVALID",
            `active reconciliation dedupe key ${stored.reconciliation_dedupe_key} already belongs to ${currentOwner}`,
          );
        }
        this.activeIdByDedupeKey.set(stored.reconciliation_dedupe_key, stored.twin_reconciliation_state_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTwinReconciliationStateRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistTwinReconciliationState(input: { reconciliation_state: TwinReconciliationStateRecord }) {
    const reconciliationState = normalizeTwinReconciliationStateRecord(input.reconciliation_state);
    const reconciliationDedupeKey = isActiveTwinReconciliationState(reconciliationState)
      ? deriveTwinReconciliationDedupeKey({
          target_mismatch_refs: reconciliationState.target_mismatch_refs,
          twin_id: reconciliationState.twin_id,
        })
      : null;
    const existingActiveOwner = reconciliationDedupeKey
      ? this.activeIdByDedupeKey.get(reconciliationDedupeKey)
      : undefined;
    if (
      existingActiveOwner !== undefined &&
      existingActiveOwner !== reconciliationState.twin_reconciliation_state_id
    ) {
      const existing = this.records.get(existingActiveOwner);
      if (existing && stableEqual(existing.record, reconciliationState)) {
        return cloneStored(existing);
      }
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `active reconciliation dedupe key ${reconciliationDedupeKey} already belongs to ${existingActiveOwner}`,
      );
    }
    const existing = this.records.get(reconciliationState.twin_reconciliation_state_id);
    const stored: StoredTwinReconciliationStateRecord = {
      lifecycle_state: reconciliationState.lifecycle_state,
      reconciliation_dedupe_key: reconciliationDedupeKey,
      record: cloneTwinReconciliationStateRecord(reconciliationState),
      twin_id: reconciliationState.twin_id,
      twin_reconciliation_state_id: reconciliationState.twin_reconciliation_state_id,
      twin_reconciliation_state_ref: twinReconciliationStateRef(reconciliationState),
      twin_reconciliation_state_row_version: (existing?.twin_reconciliation_state_row_version ?? 0) + 1,
    };
    if (existing && stableEqual(existing.record, reconciliationState)) {
      return cloneStored(existing);
    }
    const refOwner = this.idByRef.get(stored.twin_reconciliation_state_ref);
    if (refOwner !== undefined && refOwner !== stored.twin_reconciliation_state_id) {
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `reconciliation ref ${stored.twin_reconciliation_state_ref} already belongs to ${refOwner}`,
      );
    }
    this.records.set(stored.twin_reconciliation_state_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async findActiveTwinReconciliationStateByDedupeKey(input: {
    target_mismatch_refs: readonly string[];
    twin_id: string;
  }) {
    const dedupeKey = deriveTwinReconciliationDedupeKey(input);
    const id = this.activeIdByDedupeKey.get(dedupeKey);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async getTwinReconciliationStateById(reconciliationStateId: string) {
    const stored = this.records.get(reconciliationStateId);
    return stored ? cloneStored(stored) : null;
  }

  async listTwinReconciliationStatesByTwinId(twinId: string) {
    return this.listByIds(this.idsByTwin.get(twinId) ?? []);
  }
}
