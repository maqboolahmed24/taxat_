import {
  cloneProvenancePathRecord,
  deriveProvenancePathContentHash,
  normalizeProvenancePathRecord,
  provenancePathRef,
  type ProvenancePathRecord,
} from "../models/provenance_path.ts";
import { stableEqual } from "../models/provenance_common.ts";

export type StoredProvenancePathRecord = {
  path_hash: string;
  path_id: string;
  path_ref: string;
  path_row_version: 1;
  graph_id: string;
  manifest_id: string;
  target_ref: string;
  record: ProvenancePathRecord;
};

export class ProvenancePathRepositoryError extends Error {
  readonly code: "PROVENANCE_PATH_DUPLICATE" | "PROVENANCE_PATH_HASH_COLLISION" | "PROVENANCE_PATH_NOT_FOUND" | "PROVENANCE_PATH_REF_COLLISION";

  constructor(code: ProvenancePathRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ProvenancePathRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredProvenancePathRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ProvenancePathRepository {
  private readonly idByHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByGraph = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByTarget = new Map<string, string[]>();
  private readonly records = new Map<string, StoredProvenancePathRecord>();

  private rebuildIndexes() {
    this.idByHash.clear();
    this.idByRef.clear();
    this.idsByGraph.clear();
    this.idsByManifest.clear();
    this.idsByTarget.clear();
    for (const stored of this.records.values()) {
      this.idByHash.set(stored.path_hash, stored.path_id);
      this.idByRef.set(stored.path_ref, stored.path_id);
      pushIndex(this.idsByGraph, stored.graph_id, stored.path_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.path_id);
      pushIndex(this.idsByTarget, `${stored.graph_id}:${stored.target_ref}`, stored.path_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredProvenancePathRecord => record !== undefined)
      .sort((left, right) => {
        const leftRecord = left.record;
        const rightRecord = right.record;
        return (
          leftRecord.path_role.localeCompare(rightRecord.path_role) ||
          leftRecord.hop_count - rightRecord.hop_count ||
          rightRecord.weakest_support_confidence - leftRecord.weakest_support_confidence ||
          left.path_id.localeCompare(right.path_id)
        );
      })
      .map((record) => cloneStored(record));
  }

  async persistProvenancePath(input: { path: ProvenancePathRecord; path_hash?: string | null }) {
    const path = normalizeProvenancePathRecord(input.path);
    const stored: StoredProvenancePathRecord = {
      graph_id: path.graph_id,
      manifest_id: path.manifest_id,
      path_hash: input.path_hash ?? path.path_hash ?? deriveProvenancePathContentHash(path),
      path_id: path.path_id,
      path_ref: provenancePathRef(path),
      path_row_version: 1,
      record: cloneProvenancePathRecord(path),
      target_ref: path.target_ref,
    };
    const existing = this.records.get(stored.path_id);
    if (existing) {
      if (!stableEqual(existing.record, path)) {
        throw new ProvenancePathRepositoryError(
          "PROVENANCE_PATH_DUPLICATE",
          `provenance path ${stored.path_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.path_ref);
    if (existingRefOwner !== undefined) {
      throw new ProvenancePathRepositoryError(
        "PROVENANCE_PATH_REF_COLLISION",
        `provenance path ref ${stored.path_ref} already belongs to ${existingRefOwner}`,
      );
    }
    const existingHashOwner = this.idByHash.get(stored.path_hash);
    if (existingHashOwner !== undefined) {
      const hashOwner = this.records.get(existingHashOwner);
      if (hashOwner && stableEqual(hashOwner.record, path)) {
        return cloneStored(hashOwner);
      }
      throw new ProvenancePathRepositoryError(
        "PROVENANCE_PATH_HASH_COLLISION",
        `provenance path hash ${stored.path_hash} already belongs to ${existingHashOwner}`,
      );
    }
    this.records.set(stored.path_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getProvenancePathById(pathId: string) {
    const stored = this.records.get(pathId);
    return stored ? cloneStored(stored) : null;
  }

  async requireProvenancePathById(pathId: string) {
    const stored = await this.getProvenancePathById(pathId);
    if (!stored) {
      throw new ProvenancePathRepositoryError("PROVENANCE_PATH_NOT_FOUND", `provenance path ${pathId} does not exist`);
    }
    return stored;
  }

  async listProvenancePathsByGraphId(graphId: string) {
    return this.listByIds(this.idsByGraph.get(graphId) ?? []);
  }

  async listProvenancePathsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listProvenancePathsByTarget(graphId: string, targetRef: string) {
    return this.listByIds(this.idsByTarget.get(`${graphId}:${targetRef}`) ?? []);
  }
}
