import {
  cloneDecisionBundleRecord,
  decisionBundleRef,
  deriveDecisionBundleContentHash,
  normalizeDecisionBundleRecord,
  type DecisionBundleDecisionStatus,
  type DecisionBundleOutcomeClass,
  type DecisionBundleRecord,
} from "../models/decision_bundle.ts";

export type StoredDecisionBundleRecord = {
  decision_bundle_hash: string;
  decision_bundle_id: string;
  decision_bundle_ref: string;
  decision_bundle_row_version: 1;
  decision_status: DecisionBundleDecisionStatus;
  manifest_id: string;
  outcome_class: DecisionBundleOutcomeClass;
  persisted_at: string;
  record: DecisionBundleRecord;
};

export class DecisionBundleRepositoryError extends Error {
  readonly code:
    | "DECISION_BUNDLE_DUPLICATE"
    | "DECISION_BUNDLE_HASH_COLLISION"
    | "DECISION_BUNDLE_NOT_FOUND"
    | "DECISION_BUNDLE_REF_COLLISION";

  constructor(code: DecisionBundleRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DecisionBundleRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredDecisionBundleRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class DecisionBundleRepository {
  private readonly idByHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredDecisionBundleRecord>();

  private buildStored(input: {
    decision_bundle: DecisionBundleRecord;
    decision_bundle_hash?: string | null;
    persisted_at?: string | null;
  }): StoredDecisionBundleRecord {
    const decisionBundleHash =
      input.decision_bundle_hash ??
      input.decision_bundle.contract.artifact_content_hash ??
      deriveDecisionBundleContentHash(input.decision_bundle);
    return {
      decision_bundle_hash: decisionBundleHash,
      decision_bundle_id: input.decision_bundle.decision_bundle_id,
      decision_bundle_ref: decisionBundleRef(input.decision_bundle),
      decision_bundle_row_version: 1,
      decision_status: input.decision_bundle.decision_status,
      manifest_id: input.decision_bundle.manifest_id,
      outcome_class: input.decision_bundle.outcome_class,
      persisted_at: input.persisted_at ?? input.decision_bundle.persisted_at,
      record: cloneDecisionBundleRecord(input.decision_bundle),
    };
  }

  private rebuildIndexes() {
    this.idByHash.clear();
    this.idByRef.clear();
    this.idsByManifest.clear();
    for (const stored of this.records.values()) {
      this.idByHash.set(stored.decision_bundle_hash, stored.decision_bundle_id);
      this.idByRef.set(stored.decision_bundle_ref, stored.decision_bundle_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.decision_bundle_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredDecisionBundleRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistDecisionBundle(input: {
    decision_bundle: DecisionBundleRecord;
    decision_bundle_hash?: string | null;
    persisted_at?: string | null;
  }) {
    const decisionBundle = normalizeDecisionBundleRecord(input.decision_bundle);
    const stored = this.buildStored({
      decision_bundle: decisionBundle,
      decision_bundle_hash: input.decision_bundle_hash,
      persisted_at: input.persisted_at,
    });
    const existing = this.records.get(stored.decision_bundle_id);
    if (existing) {
      if (JSON.stringify(existing.record) !== JSON.stringify(decisionBundle)) {
        throw new DecisionBundleRepositoryError(
          "DECISION_BUNDLE_DUPLICATE",
          `decision bundle ${stored.decision_bundle_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.decision_bundle_ref);
    if (existingRefOwner !== undefined) {
      throw new DecisionBundleRepositoryError(
        "DECISION_BUNDLE_REF_COLLISION",
        `decision bundle ref ${stored.decision_bundle_ref} already belongs to ${existingRefOwner}`,
      );
    }
    const existingHashOwner = this.idByHash.get(stored.decision_bundle_hash);
    if (existingHashOwner !== undefined) {
      const hashOwner = this.records.get(existingHashOwner);
      if (hashOwner && JSON.stringify(hashOwner.record) === JSON.stringify(decisionBundle)) {
        return cloneStored(hashOwner);
      }
      throw new DecisionBundleRepositoryError(
        "DECISION_BUNDLE_HASH_COLLISION",
        `decision bundle hash ${stored.decision_bundle_hash} already belongs to ${existingHashOwner}`,
      );
    }
    this.records.set(stored.decision_bundle_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getDecisionBundleById(decisionBundleId: string) {
    const stored = this.records.get(decisionBundleId);
    return stored ? cloneStored(stored) : null;
  }

  async getDecisionBundleByHash(decisionBundleHash: string) {
    const id = this.idByHash.get(decisionBundleHash);
    return id === undefined ? null : this.getDecisionBundleById(id);
  }

  async getDecisionBundleByRef(decisionBundleRefValue: string) {
    const id = this.idByRef.get(decisionBundleRefValue);
    return id === undefined ? null : this.getDecisionBundleById(id);
  }

  async requireDecisionBundleById(decisionBundleId: string) {
    const stored = await this.getDecisionBundleById(decisionBundleId);
    if (!stored) {
      throw new DecisionBundleRepositoryError(
        "DECISION_BUNDLE_NOT_FOUND",
        `decision bundle ${decisionBundleId} does not exist`,
      );
    }
    return stored;
  }

  async requireDecisionBundleByHash(decisionBundleHash: string) {
    const stored = await this.getDecisionBundleByHash(decisionBundleHash);
    if (!stored) {
      throw new DecisionBundleRepositoryError(
        "DECISION_BUNDLE_NOT_FOUND",
        `decision bundle hash ${decisionBundleHash} does not exist`,
      );
    }
    return stored;
  }

  async listDecisionBundlesByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }
}
