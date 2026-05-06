import {
  cloneEvidenceGraphRecord,
  deriveEvidenceGraphContentHash,
  evidenceGraphRef,
  normalizeEvidenceGraphRecord,
  type EvidenceGraphLifecycleState,
  type EvidenceGraphRecord,
} from "../models/evidence_graph.ts";
import { stableEqual } from "../models/provenance_common.ts";

export type StoredEvidenceGraphRecord = {
  graph_hash: string;
  graph_id: string;
  graph_ref: string;
  graph_row_version: 1;
  lifecycle_state: EvidenceGraphLifecycleState;
  manifest_id: string;
  record: EvidenceGraphRecord;
};

export class EvidenceGraphRepositoryError extends Error {
  readonly code: "EVIDENCE_GRAPH_DUPLICATE" | "EVIDENCE_GRAPH_HASH_COLLISION" | "EVIDENCE_GRAPH_NOT_FOUND" | "EVIDENCE_GRAPH_REF_COLLISION";

  constructor(code: EvidenceGraphRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "EvidenceGraphRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredEvidenceGraphRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class EvidenceGraphRepository {
  private readonly idByHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredEvidenceGraphRecord>();

  private rebuildIndexes() {
    this.idByHash.clear();
    this.idByRef.clear();
    this.idsByManifest.clear();
    for (const stored of this.records.values()) {
      this.idByHash.set(stored.graph_hash, stored.graph_id);
      this.idByRef.set(stored.graph_ref, stored.graph_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.graph_id);
    }
  }

  async persistEvidenceGraph(input: { graph: EvidenceGraphRecord; graph_hash?: string | null }) {
    const graph = normalizeEvidenceGraphRecord(input.graph);
    const stored: StoredEvidenceGraphRecord = {
      graph_hash: input.graph_hash ?? graph.graph_hash ?? deriveEvidenceGraphContentHash(graph),
      graph_id: graph.graph_id,
      graph_ref: evidenceGraphRef(graph),
      graph_row_version: 1,
      lifecycle_state: graph.lifecycle_state,
      manifest_id: graph.manifest_id,
      record: cloneEvidenceGraphRecord(graph),
    };
    const existing = this.records.get(stored.graph_id);
    if (existing) {
      if (!stableEqual(existing.record, graph)) {
        throw new EvidenceGraphRepositoryError(
          "EVIDENCE_GRAPH_DUPLICATE",
          `evidence graph ${stored.graph_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.graph_ref);
    if (existingRefOwner !== undefined) {
      throw new EvidenceGraphRepositoryError(
        "EVIDENCE_GRAPH_REF_COLLISION",
        `evidence graph ref ${stored.graph_ref} already belongs to ${existingRefOwner}`,
      );
    }
    const existingHashOwner = this.idByHash.get(stored.graph_hash);
    if (existingHashOwner !== undefined) {
      const hashOwner = this.records.get(existingHashOwner);
      if (hashOwner && stableEqual(hashOwner.record, graph)) {
        return cloneStored(hashOwner);
      }
      throw new EvidenceGraphRepositoryError(
        "EVIDENCE_GRAPH_HASH_COLLISION",
        `evidence graph hash ${stored.graph_hash} already belongs to ${existingHashOwner}`,
      );
    }
    this.records.set(stored.graph_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getEvidenceGraphById(graphId: string) {
    const stored = this.records.get(graphId);
    return stored ? cloneStored(stored) : null;
  }

  async requireEvidenceGraphById(graphId: string) {
    const stored = await this.getEvidenceGraphById(graphId);
    if (!stored) {
      throw new EvidenceGraphRepositoryError("EVIDENCE_GRAPH_NOT_FOUND", `evidence graph ${graphId} does not exist`);
    }
    return stored;
  }

  async listEvidenceGraphsByManifestId(manifestId: string) {
    return (this.idsByManifest.get(manifestId) ?? [])
      .map((id) => this.records.get(id))
      .filter((record): record is StoredEvidenceGraphRecord => record !== undefined)
      .sort((left, right) => left.graph_id.localeCompare(right.graph_id))
      .map((record) => cloneStored(record));
  }
}
