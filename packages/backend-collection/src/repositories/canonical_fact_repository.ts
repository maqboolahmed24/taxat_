import {
  canonicalFactRef,
  cloneCanonicalFactRecord,
  normalizeCanonicalFactRecord,
  type CanonicalFactRecord,
} from "../models/canonical_fact.ts";

export type StoredCanonicalFactRecord = {
  canonical_fact: CanonicalFactRecord;
  canonical_fact_id: string;
  canonical_fact_ref: string;
  canonical_fact_row_version: number;
  canonical_identity_hash: string;
  dedupe_key: string;
  fact_family: string;
  manifest_id: string;
  partition_scope: string;
  persisted_at: string;
  promotion_state: string;
};

export type CanonicalFactRepositoryErrorCode =
  | "CANONICAL_FACT_DEDUPE_COLLISION"
  | "CANONICAL_FACT_DUPLICATE"
  | "CANONICAL_FACT_NOT_FOUND";

export class CanonicalFactRepositoryError extends Error {
  readonly code: CanonicalFactRepositoryErrorCode;

  constructor(code: CanonicalFactRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CanonicalFactRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredCanonicalFactRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class CanonicalFactRepository {
  private readonly facts = new Map<string, StoredCanonicalFactRecord>();
  private readonly idByDedupeKey = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByFactFamily = new Map<string, string[]>();
  private readonly idsByIdentityHash = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByPartition = new Map<string, string[]>();
  private readonly idsByPromotionState = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.facts.get(id))
      .filter((record): record is StoredCanonicalFactRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistCanonicalFact(input: {
    canonical_fact: CanonicalFactRecord;
    persisted_at: string;
  }) {
    const canonicalFact = normalizeCanonicalFactRecord(input.canonical_fact);
    const existing = this.facts.get(canonicalFact.canonical_fact_id);
    if (existing) {
      if (JSON.stringify(existing.canonical_fact) !== JSON.stringify(canonicalFact)) {
        throw new CanonicalFactRepositoryError(
          "CANONICAL_FACT_DUPLICATE",
          `canonical fact ${canonicalFact.canonical_fact_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const dedupeCollision = this.idByDedupeKey.get(canonicalFact.dedupe_key);
    if (dedupeCollision !== undefined) {
      throw new CanonicalFactRepositoryError(
        "CANONICAL_FACT_DEDUPE_COLLISION",
        `canonical dedupe key already belongs to ${dedupeCollision}`,
      );
    }

    const ref = canonicalFactRef(canonicalFact);
    const stored: StoredCanonicalFactRecord = {
      canonical_fact: cloneCanonicalFactRecord(canonicalFact),
      canonical_fact_id: canonicalFact.canonical_fact_id,
      canonical_fact_ref: ref,
      canonical_fact_row_version: 1,
      canonical_identity_hash: canonicalFact.canonical_identity_hash,
      dedupe_key: canonicalFact.dedupe_key,
      fact_family: canonicalFact.fact_family,
      manifest_id: canonicalFact.manifest_id,
      partition_scope: canonicalFact.partition_scope,
      persisted_at: input.persisted_at,
      promotion_state: canonicalFact.promotion_state,
    };
    this.facts.set(stored.canonical_fact_id, cloneStored(stored));
    this.idByDedupeKey.set(stored.dedupe_key, stored.canonical_fact_id);
    this.idByRef.set(stored.canonical_fact_ref, stored.canonical_fact_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.canonical_fact_id);
    pushIndex(
      this.idsByPartition,
      `${stored.manifest_id}::${stored.partition_scope}`,
      stored.canonical_fact_id,
    );
    pushIndex(
      this.idsByFactFamily,
      `${stored.manifest_id}::${stored.fact_family}`,
      stored.canonical_fact_id,
    );
    pushIndex(
      this.idsByPromotionState,
      `${stored.manifest_id}::${stored.promotion_state}`,
      stored.canonical_fact_id,
    );
    pushIndex(this.idsByIdentityHash, stored.canonical_identity_hash, stored.canonical_fact_id);
    return cloneStored(stored);
  }

  async getCanonicalFactById(canonicalFactId: string) {
    const stored = this.facts.get(canonicalFactId);
    return stored ? cloneStored(stored) : null;
  }

  async getCanonicalFactByRef(canonicalFactRefValue: string) {
    const id = this.idByRef.get(canonicalFactRefValue);
    return id ? this.getCanonicalFactById(id) : null;
  }

  async requireCanonicalFactById(canonicalFactId: string) {
    const stored = await this.getCanonicalFactById(canonicalFactId);
    if (!stored) {
      throw new CanonicalFactRepositoryError(
        "CANONICAL_FACT_NOT_FOUND",
        `canonical fact ${canonicalFactId} does not exist`,
      );
    }
    return stored;
  }

  async listCanonicalFactsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listCanonicalFactsByPartition(manifestId: string, partitionScope: string) {
    return this.listByIds(this.idsByPartition.get(`${manifestId}::${partitionScope}`) ?? []);
  }

  async listCanonicalFactsByFactFamily(manifestId: string, factFamily: string) {
    return this.listByIds(this.idsByFactFamily.get(`${manifestId}::${factFamily}`) ?? []);
  }

  async listCanonicalFactsByPromotionState(manifestId: string, promotionState: string) {
    return this.listByIds(this.idsByPromotionState.get(`${manifestId}::${promotionState}`) ?? []);
  }

  async listCanonicalFactsByIdentityHash(canonicalIdentityHash: string) {
    return this.listByIds(this.idsByIdentityHash.get(canonicalIdentityHash) ?? []);
  }
}
