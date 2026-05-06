import {
  cloneSourceRecordRecord,
  normalizeSourceRecordRecord,
  sourceRecordRef,
  type SourceRecordRecord,
} from "../models/source_record.ts";

export type StoredSourceRecordRecord = {
  business_partition: string;
  collection_boundary_ref: string;
  manifest_id: string;
  provider_account_ref: string;
  raw_hash: string;
  raw_payload_ref: string;
  source_class: string;
  source_record: SourceRecordRecord;
  source_record_id: string;
  source_record_ref: string;
  source_record_row_version: number;
  stored_at: string;
};

export type SourceRecordRepositoryErrorCode =
  | "SOURCE_RECORD_DUPLICATE"
  | "SOURCE_RECORD_NOT_FOUND";

export class SourceRecordRepositoryError extends Error {
  readonly code: SourceRecordRepositoryErrorCode;

  constructor(code: SourceRecordRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceRecordRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSourceRecordRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class SourceRecordRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBoundary = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByPartition = new Map<string, string[]>();
  private readonly idsBySourceClass = new Map<string, string[]>();
  private readonly records = new Map<string, StoredSourceRecordRecord>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredSourceRecordRecord => record !== undefined)
      .sort((left, right) => left.stored_at.localeCompare(right.stored_at))
      .map((record) => cloneStored(record));
  }

  async persistSourceRecord(input: { source_record: SourceRecordRecord; stored_at: string }) {
    const sourceRecord = normalizeSourceRecordRecord(input.source_record);
    const existing = this.records.get(sourceRecord.source_record_id);
    if (existing) {
      if (JSON.stringify(existing.source_record) !== JSON.stringify(sourceRecord)) {
        throw new SourceRecordRepositoryError(
          "SOURCE_RECORD_DUPLICATE",
          `source record ${sourceRecord.source_record_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = sourceRecordRef(sourceRecord);
    const stored: StoredSourceRecordRecord = {
      business_partition: sourceRecord.business_partition,
      collection_boundary_ref: sourceRecord.collection_boundary_ref,
      manifest_id: sourceRecord.manifest_id,
      provider_account_ref: sourceRecord.provider_account_ref,
      raw_hash: sourceRecord.raw_hash,
      raw_payload_ref: sourceRecord.raw_payload_ref,
      source_class: sourceRecord.source_class,
      source_record: cloneSourceRecordRecord(sourceRecord),
      source_record_id: sourceRecord.source_record_id,
      source_record_ref: ref,
      source_record_row_version: 1,
      stored_at: input.stored_at,
    };
    this.records.set(stored.source_record_id, cloneStored(stored));
    this.idByRef.set(stored.source_record_ref, stored.source_record_id);
    pushIndex(this.idsByBoundary, stored.collection_boundary_ref, stored.source_record_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.source_record_id);
    pushIndex(
      this.idsByPartition,
      `${stored.manifest_id}::${stored.business_partition}`,
      stored.source_record_id,
    );
    pushIndex(
      this.idsBySourceClass,
      `${stored.manifest_id}::${stored.source_class}`,
      stored.source_record_id,
    );
    return cloneStored(stored);
  }

  async getSourceRecordById(sourceRecordId: string) {
    const stored = this.records.get(sourceRecordId);
    return stored ? cloneStored(stored) : null;
  }

  async getSourceRecordByRef(sourceRecordRefValue: string) {
    const id = this.idByRef.get(sourceRecordRefValue);
    return id ? this.getSourceRecordById(id) : null;
  }

  async listSourceRecordsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listSourceRecordsByCollectionBoundaryRef(collectionBoundaryRef: string) {
    return this.listByIds(this.idsByBoundary.get(collectionBoundaryRef) ?? []);
  }

  async listSourceRecordsByPartition(manifestId: string, businessPartition: string) {
    return this.listByIds(
      this.idsByPartition.get(`${manifestId}::${businessPartition}`) ?? [],
    );
  }

  async listSourceRecordsBySourceClass(manifestId: string, sourceClass: string) {
    return this.listByIds(this.idsBySourceClass.get(`${manifestId}::${sourceClass}`) ?? []);
  }
}
