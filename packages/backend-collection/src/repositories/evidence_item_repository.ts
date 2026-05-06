import {
  cloneEvidenceItemRecord,
  evidenceItemRef,
  normalizeEvidenceItemRecord,
  type EvidenceItemRecord,
} from "../models/evidence_item.ts";

export type StoredEvidenceItemRecord = {
  business_partition: string;
  evidence_item: EvidenceItemRecord;
  evidence_item_id: string;
  evidence_item_ref: string;
  evidence_item_row_version: number;
  evidence_kind: string;
  manifest_id: string;
  period_partition: string;
  source_record_id: string;
  stored_at: string;
};

export type EvidenceItemRepositoryErrorCode =
  | "EVIDENCE_ITEM_DUPLICATE"
  | "EVIDENCE_ITEM_NOT_FOUND";

export class EvidenceItemRepositoryError extends Error {
  readonly code: EvidenceItemRepositoryErrorCode;

  constructor(code: EvidenceItemRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "EvidenceItemRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredEvidenceItemRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class EvidenceItemRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByKind = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByPartition = new Map<string, string[]>();
  private readonly idsBySourceRecord = new Map<string, string[]>();
  private readonly items = new Map<string, StoredEvidenceItemRecord>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.items.get(id))
      .filter((record): record is StoredEvidenceItemRecord => record !== undefined)
      .sort((left, right) => left.stored_at.localeCompare(right.stored_at))
      .map((record) => cloneStored(record));
  }

  async persistEvidenceItem(input: { evidence_item: EvidenceItemRecord; stored_at: string }) {
    const evidenceItem = normalizeEvidenceItemRecord(input.evidence_item);
    const existing = this.items.get(evidenceItem.evidence_item_id);
    if (existing) {
      if (JSON.stringify(existing.evidence_item) !== JSON.stringify(evidenceItem)) {
        throw new EvidenceItemRepositoryError(
          "EVIDENCE_ITEM_DUPLICATE",
          `evidence item ${evidenceItem.evidence_item_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = evidenceItemRef(evidenceItem);
    const stored: StoredEvidenceItemRecord = {
      business_partition: evidenceItem.business_partition,
      evidence_item: cloneEvidenceItemRecord(evidenceItem),
      evidence_item_id: evidenceItem.evidence_item_id,
      evidence_item_ref: ref,
      evidence_item_row_version: 1,
      evidence_kind: evidenceItem.evidence_kind,
      manifest_id: evidenceItem.manifest_id,
      period_partition: evidenceItem.period_partition,
      source_record_id: evidenceItem.source_record_id,
      stored_at: input.stored_at,
    };
    this.items.set(stored.evidence_item_id, cloneStored(stored));
    this.idByRef.set(stored.evidence_item_ref, stored.evidence_item_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.evidence_item_id);
    pushIndex(
      this.idsByPartition,
      `${stored.manifest_id}::${stored.business_partition}::${stored.period_partition}`,
      stored.evidence_item_id,
    );
    pushIndex(
      this.idsBySourceRecord,
      stored.source_record_id,
      stored.evidence_item_id,
    );
    pushIndex(this.idsByKind, `${stored.manifest_id}::${stored.evidence_kind}`, stored.evidence_item_id);
    return cloneStored(stored);
  }

  async getEvidenceItemById(evidenceItemId: string) {
    const stored = this.items.get(evidenceItemId);
    return stored ? cloneStored(stored) : null;
  }

  async getEvidenceItemByRef(evidenceItemRefValue: string) {
    const id = this.idByRef.get(evidenceItemRefValue);
    return id ? this.getEvidenceItemById(id) : null;
  }

  async listEvidenceItemsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listEvidenceItemsBySourceRecordId(sourceRecordId: string) {
    return this.listByIds(this.idsBySourceRecord.get(sourceRecordId) ?? []);
  }

  async listEvidenceItemsByPartition(
    manifestId: string,
    businessPartition: string,
    periodPartition: string,
  ) {
    return this.listByIds(
      this.idsByPartition.get(`${manifestId}::${businessPartition}::${periodPartition}`) ?? [],
    );
  }

  async listEvidenceItemsByKind(manifestId: string, evidenceKind: string) {
    return this.listByIds(this.idsByKind.get(`${manifestId}::${evidenceKind}`) ?? []);
  }
}
