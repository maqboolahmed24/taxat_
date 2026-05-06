import {
  cloneCollectionBoundaryRecord,
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
} from "../models/collection_boundary.ts";

export type StoredCollectionBoundaryRecord = {
  collection_boundary: CollectionBoundaryRecord;
  collection_boundary_hash: string;
  collection_boundary_id: string;
  collection_boundary_ref: string;
  collection_boundary_row_version: number;
  manifest_id: string;
  persisted_at: string;
  source_plan_ref: string;
  source_window_id: string;
};

export type CollectionBoundaryRepositoryErrorCode =
  | "COLLECTION_BOUNDARY_DUPLICATE"
  | "COLLECTION_BOUNDARY_NOT_FOUND";

export class CollectionBoundaryRepositoryError extends Error {
  readonly code: CollectionBoundaryRepositoryErrorCode;

  constructor(code: CollectionBoundaryRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CollectionBoundaryRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredCollectionBoundaryRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class CollectionBoundaryRepository {
  private readonly boundaries = new Map<string, StoredCollectionBoundaryRecord>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsBySourcePlanRef = new Map<string, string[]>();
  private readonly idsBySourceWindowId = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.boundaries.get(id))
      .filter((record): record is StoredCollectionBoundaryRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistCollectionBoundary(input: {
    collection_boundary: CollectionBoundaryRecord;
    persisted_at: string;
  }) {
    const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
    const existing = this.boundaries.get(boundary.collection_boundary_id);
    if (existing) {
      if (JSON.stringify(existing.collection_boundary) !== JSON.stringify(boundary)) {
        throw new CollectionBoundaryRepositoryError(
          "COLLECTION_BOUNDARY_DUPLICATE",
          `collection boundary ${boundary.collection_boundary_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = collectionBoundaryRef(boundary);
    const stored: StoredCollectionBoundaryRecord = {
      collection_boundary: cloneCollectionBoundaryRecord(boundary),
      collection_boundary_hash: boundary.collection_boundary_hash,
      collection_boundary_id: boundary.collection_boundary_id,
      collection_boundary_ref: ref,
      collection_boundary_row_version: 1,
      manifest_id: boundary.manifest_id,
      persisted_at: input.persisted_at,
      source_plan_ref: boundary.source_plan_ref,
      source_window_id: boundary.source_window_id,
    };
    this.boundaries.set(stored.collection_boundary_id, cloneStored(stored));
    this.idByRef.set(stored.collection_boundary_ref, stored.collection_boundary_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.collection_boundary_id);
    pushIndex(this.idsBySourcePlanRef, stored.source_plan_ref, stored.collection_boundary_id);
    pushIndex(this.idsBySourceWindowId, stored.source_window_id, stored.collection_boundary_id);
    return cloneStored(stored);
  }

  async getCollectionBoundaryById(collectionBoundaryId: string) {
    const stored = this.boundaries.get(collectionBoundaryId);
    return stored ? cloneStored(stored) : null;
  }

  async getCollectionBoundaryByRef(collectionBoundaryRefValue: string) {
    const id = this.idByRef.get(collectionBoundaryRefValue);
    return id ? this.getCollectionBoundaryById(id) : null;
  }

  async requireCollectionBoundaryById(collectionBoundaryId: string) {
    const stored = await this.getCollectionBoundaryById(collectionBoundaryId);
    if (!stored) {
      throw new CollectionBoundaryRepositoryError(
        "COLLECTION_BOUNDARY_NOT_FOUND",
        `collection boundary ${collectionBoundaryId} does not exist`,
      );
    }
    return stored;
  }

  async listCollectionBoundariesByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listCollectionBoundariesBySourcePlanRef(sourcePlanRef: string) {
    return this.listByIds(this.idsBySourcePlanRef.get(sourcePlanRef) ?? []);
  }

  async listCollectionBoundariesBySourceWindowId(sourceWindowId: string) {
    return this.listByIds(this.idsBySourceWindowId.get(sourceWindowId) ?? []);
  }
}
