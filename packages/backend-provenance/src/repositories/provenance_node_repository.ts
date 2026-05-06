import {
  cloneProvenanceNodeRecord,
  deriveProvenanceNodeContentHash,
  normalizeProvenanceNodeRecord,
  provenanceNodeRef,
  type ProvenanceNodeRecord,
} from "../models/provenance_node.ts";
import { stableEqual } from "../models/provenance_common.ts";

export type StoredProvenanceNodeRecord = {
  node_hash: string;
  node_id: string;
  node_ref: string;
  node_row_version: 1;
  graph_id: string;
  manifest_id: string;
  object_ref: string;
  record: ProvenanceNodeRecord;
};

export class ProvenanceNodeRepositoryError extends Error {
  readonly code: "PROVENANCE_NODE_DUPLICATE" | "PROVENANCE_NODE_HASH_COLLISION" | "PROVENANCE_NODE_NOT_FOUND" | "PROVENANCE_NODE_REF_COLLISION";

  constructor(code: ProvenanceNodeRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ProvenanceNodeRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredProvenanceNodeRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ProvenanceNodeRepository {
  private readonly idByHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByGraph = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredProvenanceNodeRecord>();

  private rebuildIndexes() {
    this.idByHash.clear();
    this.idByRef.clear();
    this.idsByGraph.clear();
    this.idsByManifest.clear();
    for (const stored of this.records.values()) {
      this.idByHash.set(stored.node_hash, stored.node_id);
      this.idByRef.set(stored.node_ref, stored.node_id);
      pushIndex(this.idsByGraph, stored.graph_id, stored.node_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.node_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredProvenanceNodeRecord => record !== undefined)
      .sort((left, right) => left.node_id.localeCompare(right.node_id))
      .map((record) => cloneStored(record));
  }

  async persistProvenanceNode(input: { node: ProvenanceNodeRecord; node_hash?: string | null }) {
    const node = normalizeProvenanceNodeRecord(input.node);
    const stored: StoredProvenanceNodeRecord = {
      graph_id: node.graph_id,
      manifest_id: node.manifest_id,
      node_hash: input.node_hash ?? deriveProvenanceNodeContentHash(node),
      node_id: node.node_id,
      node_ref: provenanceNodeRef(node),
      node_row_version: 1,
      object_ref: node.object_ref,
      record: cloneProvenanceNodeRecord(node),
    };
    const existing = this.records.get(stored.node_id);
    if (existing) {
      if (!stableEqual(existing.record, node)) {
        throw new ProvenanceNodeRepositoryError(
          "PROVENANCE_NODE_DUPLICATE",
          `provenance node ${stored.node_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.node_ref);
    if (existingRefOwner !== undefined) {
      throw new ProvenanceNodeRepositoryError(
        "PROVENANCE_NODE_REF_COLLISION",
        `provenance node ref ${stored.node_ref} already belongs to ${existingRefOwner}`,
      );
    }
    const existingHashOwner = this.idByHash.get(stored.node_hash);
    if (existingHashOwner !== undefined) {
      const hashOwner = this.records.get(existingHashOwner);
      if (hashOwner && stableEqual(hashOwner.record, node)) {
        return cloneStored(hashOwner);
      }
      throw new ProvenanceNodeRepositoryError(
        "PROVENANCE_NODE_HASH_COLLISION",
        `provenance node hash ${stored.node_hash} already belongs to ${existingHashOwner}`,
      );
    }
    this.records.set(stored.node_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getProvenanceNodeById(nodeId: string) {
    const stored = this.records.get(nodeId);
    return stored ? cloneStored(stored) : null;
  }

  async requireProvenanceNodeById(nodeId: string) {
    const stored = await this.getProvenanceNodeById(nodeId);
    if (!stored) {
      throw new ProvenanceNodeRepositoryError("PROVENANCE_NODE_NOT_FOUND", `provenance node ${nodeId} does not exist`);
    }
    return stored;
  }

  async listProvenanceNodesByGraphId(graphId: string) {
    return this.listByIds(this.idsByGraph.get(graphId) ?? []);
  }

  async listProvenanceNodesByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }
}
