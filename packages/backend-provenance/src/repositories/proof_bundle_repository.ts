import {
  cloneProofBundleRecord,
  deriveProofBundleContentHash,
  normalizeProofBundleRecord,
  proofBundleRef,
  type ProofBundleRecord,
} from "../models/proof_bundle.ts";
import { stableEqual } from "../models/provenance_common.ts";

export type StoredProofBundleRecord = {
  bundle_hash: string;
  proof_bundle_id: string;
  proof_bundle_ref: string;
  proof_bundle_row_version: 1;
  graph_ref: string;
  manifest_id: string;
  target_ref: string;
  bundle_purpose: string;
  lifecycle_state: string;
  support_state: string;
  closure_state: string;
  primary_path_ref: string | null;
  generated_at: string;
  superseded_by_bundle_ref: string | null;
  record: ProofBundleRecord;
};

export class ProofBundleRepositoryError extends Error {
  readonly code:
    | "PROOF_BUNDLE_DUPLICATE"
    | "PROOF_BUNDLE_HASH_COLLISION"
    | "PROOF_BUNDLE_NOT_FOUND"
    | "PROOF_BUNDLE_REF_COLLISION";

  constructor(code: ProofBundleRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ProofBundleRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredProofBundleRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredProofBundleRecord, right: StoredProofBundleRecord) {
  return (
    left.target_ref.localeCompare(right.target_ref) ||
    left.bundle_purpose.localeCompare(right.bundle_purpose) ||
    left.generated_at.localeCompare(right.generated_at) ||
    left.proof_bundle_id.localeCompare(right.proof_bundle_id)
  );
}

export class ProofBundleRepository {
  private readonly idByHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByGraphTarget = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByTargetPurpose = new Map<string, string[]>();
  private readonly records = new Map<string, StoredProofBundleRecord>();

  private rebuildIndexes() {
    this.idByHash.clear();
    this.idByRef.clear();
    this.idsByGraphTarget.clear();
    this.idsByManifest.clear();
    this.idsByTargetPurpose.clear();
    for (const stored of this.records.values()) {
      this.idByHash.set(stored.bundle_hash, stored.proof_bundle_id);
      this.idByRef.set(stored.proof_bundle_ref, stored.proof_bundle_id);
      pushIndex(this.idsByGraphTarget, `${stored.graph_ref}:${stored.target_ref}`, stored.proof_bundle_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.proof_bundle_id);
      pushIndex(
        this.idsByTargetPurpose,
        `${stored.graph_ref}:${stored.target_ref}:${stored.bundle_purpose}`,
        stored.proof_bundle_id,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredProofBundleRecord => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneStored(record));
  }

  async persistProofBundle(input: { bundle: ProofBundleRecord; bundle_hash?: string | null }) {
    const bundle = normalizeProofBundleRecord(input.bundle);
    const stored: StoredProofBundleRecord = {
      bundle_hash: input.bundle_hash ?? bundle.bundle_hash ?? deriveProofBundleContentHash(bundle),
      bundle_purpose: bundle.bundle_purpose,
      closure_state: bundle.closure_state,
      generated_at: bundle.generated_at,
      graph_ref: bundle.graph_ref,
      lifecycle_state: bundle.lifecycle_state,
      manifest_id: bundle.manifest_id,
      primary_path_ref: bundle.primary_path_ref,
      proof_bundle_id: bundle.proof_bundle_id,
      proof_bundle_ref: proofBundleRef(bundle),
      proof_bundle_row_version: 1,
      record: cloneProofBundleRecord(bundle),
      superseded_by_bundle_ref: bundle.superseded_by_bundle_ref,
      support_state: bundle.support_state,
      target_ref: bundle.target_ref,
    };
    const existing = this.records.get(stored.proof_bundle_id);
    if (existing) {
      if (!stableEqual(existing.record, bundle)) {
        throw new ProofBundleRepositoryError(
          "PROOF_BUNDLE_DUPLICATE",
          `proof bundle ${stored.proof_bundle_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.proof_bundle_ref);
    if (existingRefOwner !== undefined) {
      throw new ProofBundleRepositoryError(
        "PROOF_BUNDLE_REF_COLLISION",
        `proof bundle ref ${stored.proof_bundle_ref} already belongs to ${existingRefOwner}`,
      );
    }
    const existingHashOwner = this.idByHash.get(stored.bundle_hash);
    if (existingHashOwner !== undefined) {
      const hashOwner = this.records.get(existingHashOwner);
      if (hashOwner && stableEqual(hashOwner.record, bundle)) {
        return cloneStored(hashOwner);
      }
      throw new ProofBundleRepositoryError(
        "PROOF_BUNDLE_HASH_COLLISION",
        `proof bundle hash ${stored.bundle_hash} already belongs to ${existingHashOwner}`,
      );
    }
    this.records.set(stored.proof_bundle_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async replaceProofBundle(input: { bundle: ProofBundleRecord }) {
    const bundle = normalizeProofBundleRecord(input.bundle);
    if (!this.records.has(bundle.proof_bundle_id)) {
      throw new ProofBundleRepositoryError(
        "PROOF_BUNDLE_NOT_FOUND",
        `proof bundle ${bundle.proof_bundle_id} does not exist`,
      );
    }
    const stored: StoredProofBundleRecord = {
      bundle_hash: bundle.bundle_hash,
      bundle_purpose: bundle.bundle_purpose,
      closure_state: bundle.closure_state,
      generated_at: bundle.generated_at,
      graph_ref: bundle.graph_ref,
      lifecycle_state: bundle.lifecycle_state,
      manifest_id: bundle.manifest_id,
      primary_path_ref: bundle.primary_path_ref,
      proof_bundle_id: bundle.proof_bundle_id,
      proof_bundle_ref: proofBundleRef(bundle),
      proof_bundle_row_version: 1,
      record: cloneProofBundleRecord(bundle),
      superseded_by_bundle_ref: bundle.superseded_by_bundle_ref,
      support_state: bundle.support_state,
      target_ref: bundle.target_ref,
    };
    this.records.set(stored.proof_bundle_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getProofBundleById(proofBundleId: string) {
    const stored = this.records.get(proofBundleId);
    return stored ? cloneStored(stored) : null;
  }

  async requireProofBundleById(proofBundleId: string) {
    const stored = await this.getProofBundleById(proofBundleId);
    if (!stored) {
      throw new ProofBundleRepositoryError("PROOF_BUNDLE_NOT_FOUND", `proof bundle ${proofBundleId} does not exist`);
    }
    return stored;
  }

  async listProofBundlesByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listProofBundlesByGraphTarget(graphRef: string, targetRef: string) {
    return this.listByIds(this.idsByGraphTarget.get(`${graphRef}:${targetRef}`) ?? []);
  }

  async listProofBundlesByTargetPurpose(graphRef: string, targetRef: string, bundlePurpose: string) {
    return this.listByIds(this.idsByTargetPurpose.get(`${graphRef}:${targetRef}:${bundlePurpose}`) ?? []);
  }
}
