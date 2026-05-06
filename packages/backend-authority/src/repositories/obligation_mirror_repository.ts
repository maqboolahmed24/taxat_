import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneObligationMirrorRecord,
  normalizeObligationMirrorRecord,
  obligationMirrorRef,
  type ObligationMirrorRecord,
} from "../models/obligation_mirror.ts";

export type StoredObligationMirrorRecord = {
  authority_truth_state: string;
  client_id: string;
  lifecycle_state: string;
  obligation_mirror_id: string;
  obligation_mirror_ref: string;
  record: ObligationMirrorRecord;
  row_version: number;
  tenant_id: string;
};

function cloneStored(record: StoredObligationMirrorRecord) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredObligationMirrorRecord, right: StoredObligationMirrorRecord) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    left.record.period.localeCompare(right.record.period) ||
    left.obligation_mirror_id.localeCompare(right.obligation_mirror_id)
  );
}

export class ObligationMirrorRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByClient = new Map<string, string[]>();
  private readonly records = new Map<string, StoredObligationMirrorRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByClient.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.obligation_mirror_ref, stored.obligation_mirror_id);
      pushIndex(this.idsByClient, `${stored.tenant_id}:${stored.client_id}`, stored.obligation_mirror_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredObligationMirrorRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistObligationMirror(input: { mirror: ObligationMirrorRecord }) {
    const mirror = normalizeObligationMirrorRecord(input.mirror);
    const existing = this.records.get(mirror.obligation_mirror_id);
    const mirrorRef = obligationMirrorRef(mirror);
    const refOwner = this.idByRef.get(mirrorRef);
    if (refOwner !== undefined && refOwner !== mirror.obligation_mirror_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `obligation mirror ref ${mirrorRef} already belongs to ${refOwner}`,
      );
    }
    if (existing && stableEqual(existing.record, mirror)) {
      return cloneStored(existing);
    }
    const stored: StoredObligationMirrorRecord = {
      authority_truth_state: mirror.authority_truth_state,
      client_id: mirror.client_id,
      lifecycle_state: mirror.lifecycle_state,
      obligation_mirror_id: mirror.obligation_mirror_id,
      obligation_mirror_ref: mirrorRef,
      record: cloneObligationMirrorRecord(mirror),
      row_version: (existing?.row_version ?? 0) + 1,
      tenant_id: mirror.tenant_id,
    };
    this.records.set(stored.obligation_mirror_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getObligationMirrorById(obligationMirrorId: string) {
    const stored = this.records.get(obligationMirrorId);
    return stored ? cloneStored(stored) : null;
  }

  async getObligationMirrorByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listObligationMirrorsByClient(input: { client_id: string; tenant_id: string }) {
    return this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }
}
