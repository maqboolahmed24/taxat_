import {
  cloneProvenanceEdgeRecord,
  deriveProvenanceEdgeContentHash,
  normalizeProvenanceEdgeRecord,
  provenanceEdgeRef,
  type ProvenanceEdgeRecord,
} from "../models/provenance_edge.ts";
import { stableEqual } from "../models/provenance_common.ts";

export type StoredProvenanceEdgeRecord = {
  edge_hash: string;
  edge_id: string;
  edge_ref: string;
  edge_row_version: 1;
  graph_id: string;
  manifest_id: string;
  from_node_id: string;
  to_node_id: string;
  record: ProvenanceEdgeRecord;
};

export class ProvenanceEdgeRepositoryError extends Error {
  readonly code: "PROVENANCE_EDGE_DUPLICATE" | "PROVENANCE_EDGE_HASH_COLLISION" | "PROVENANCE_EDGE_NOT_FOUND" | "PROVENANCE_EDGE_REF_COLLISION";

  constructor(code: ProvenanceEdgeRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ProvenanceEdgeRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredProvenanceEdgeRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ProvenanceEdgeRepository {
  private readonly idByHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByGraph = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredProvenanceEdgeRecord>();

  private rebuildIndexes() {
    this.idByHash.clear();
    this.idByRef.clear();
    this.idsByGraph.clear();
    this.idsByManifest.clear();
    for (const stored of this.records.values()) {
      this.idByHash.set(stored.edge_hash, stored.edge_id);
      this.idByRef.set(stored.edge_ref, stored.edge_id);
      pushIndex(this.idsByGraph, stored.graph_id, stored.edge_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.edge_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredProvenanceEdgeRecord => record !== undefined)
      .sort((left, right) => left.edge_id.localeCompare(right.edge_id))
      .map((record) => cloneStored(record));
  }

  async persistProvenanceEdge(input: { edge: ProvenanceEdgeRecord; edge_hash?: string | null }) {
    const edge = normalizeProvenanceEdgeRecord(input.edge);
    const stored: StoredProvenanceEdgeRecord = {
      edge_hash: input.edge_hash ?? deriveProvenanceEdgeContentHash(edge),
      edge_id: edge.edge_id,
      edge_ref: provenanceEdgeRef(edge),
      edge_row_version: 1,
      from_node_id: edge.from_node_id,
      graph_id: edge.graph_id,
      manifest_id: edge.manifest_id,
      record: cloneProvenanceEdgeRecord(edge),
      to_node_id: edge.to_node_id,
    };
    const existing = this.records.get(stored.edge_id);
    if (existing) {
      if (!stableEqual(existing.record, edge)) {
        throw new ProvenanceEdgeRepositoryError(
          "PROVENANCE_EDGE_DUPLICATE",
          `provenance edge ${stored.edge_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.edge_ref);
    if (existingRefOwner !== undefined) {
      throw new ProvenanceEdgeRepositoryError(
        "PROVENANCE_EDGE_REF_COLLISION",
        `provenance edge ref ${stored.edge_ref} already belongs to ${existingRefOwner}`,
      );
    }
    const existingHashOwner = this.idByHash.get(stored.edge_hash);
    if (existingHashOwner !== undefined) {
      const hashOwner = this.records.get(existingHashOwner);
      if (hashOwner && stableEqual(hashOwner.record, edge)) {
        return cloneStored(hashOwner);
      }
      throw new ProvenanceEdgeRepositoryError(
        "PROVENANCE_EDGE_HASH_COLLISION",
        `provenance edge hash ${stored.edge_hash} already belongs to ${existingHashOwner}`,
      );
    }
    this.records.set(stored.edge_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getProvenanceEdgeById(edgeId: string) {
    const stored = this.records.get(edgeId);
    return stored ? cloneStored(stored) : null;
  }

  async requireProvenanceEdgeById(edgeId: string) {
    const stored = await this.getProvenanceEdgeById(edgeId);
    if (!stored) {
      throw new ProvenanceEdgeRepositoryError("PROVENANCE_EDGE_NOT_FOUND", `provenance edge ${edgeId} does not exist`);
    }
    return stored;
  }

  async listProvenanceEdgesByGraphId(graphId: string) {
    return this.listByIds(this.idsByGraph.get(graphId) ?? []);
  }

  async listProvenanceEdgesByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }
}
