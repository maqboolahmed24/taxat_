import {
  candidateFactRef,
  cloneCandidateFactRecord,
  normalizeCandidateFactRecord,
  type CandidateFactRecord,
} from "../models/candidate_fact.ts";

export type StoredCandidateFactRecord = {
  candidate_fact: CandidateFactRecord;
  candidate_fact_id: string;
  candidate_fact_ref: string;
  candidate_fact_row_version: number;
  candidate_identity_hash: string;
  dedupe_key: string;
  fact_family: string;
  manifest_id: string;
  partition_scope: string;
  persisted_at: string;
};

export type CandidateFactRepositoryErrorCode =
  | "CANDIDATE_FACT_DEDUPE_COLLISION"
  | "CANDIDATE_FACT_DUPLICATE"
  | "CANDIDATE_FACT_NOT_FOUND";

export class CandidateFactRepositoryError extends Error {
  readonly code: CandidateFactRepositoryErrorCode;

  constructor(code: CandidateFactRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CandidateFactRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredCandidateFactRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class CandidateFactRepository {
  private readonly facts = new Map<string, StoredCandidateFactRecord>();
  private readonly idByDedupeKey = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByFactFamily = new Map<string, string[]>();
  private readonly idsByIdentityHash = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByPartition = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.facts.get(id))
      .filter((record): record is StoredCandidateFactRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistCandidateFact(input: {
    candidate_fact: CandidateFactRecord;
    persisted_at: string;
  }) {
    const candidateFact = normalizeCandidateFactRecord(input.candidate_fact);
    const existing = this.facts.get(candidateFact.candidate_fact_id);
    if (existing) {
      if (JSON.stringify(existing.candidate_fact) !== JSON.stringify(candidateFact)) {
        throw new CandidateFactRepositoryError(
          "CANDIDATE_FACT_DUPLICATE",
          `candidate fact ${candidateFact.candidate_fact_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const dedupeCollision = this.idByDedupeKey.get(candidateFact.dedupe_key);
    if (dedupeCollision !== undefined) {
      throw new CandidateFactRepositoryError(
        "CANDIDATE_FACT_DEDUPE_COLLISION",
        `candidate dedupe key already belongs to ${dedupeCollision}`,
      );
    }

    const ref = candidateFactRef(candidateFact);
    const stored: StoredCandidateFactRecord = {
      candidate_fact: cloneCandidateFactRecord(candidateFact),
      candidate_fact_id: candidateFact.candidate_fact_id,
      candidate_fact_ref: ref,
      candidate_fact_row_version: 1,
      candidate_identity_hash: candidateFact.candidate_identity_hash,
      dedupe_key: candidateFact.dedupe_key,
      fact_family: candidateFact.fact_family,
      manifest_id: candidateFact.manifest_id,
      partition_scope: candidateFact.partition_scope,
      persisted_at: input.persisted_at,
    };
    this.facts.set(stored.candidate_fact_id, cloneStored(stored));
    this.idByDedupeKey.set(stored.dedupe_key, stored.candidate_fact_id);
    this.idByRef.set(stored.candidate_fact_ref, stored.candidate_fact_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.candidate_fact_id);
    pushIndex(
      this.idsByPartition,
      `${stored.manifest_id}::${stored.partition_scope}`,
      stored.candidate_fact_id,
    );
    pushIndex(
      this.idsByFactFamily,
      `${stored.manifest_id}::${stored.fact_family}`,
      stored.candidate_fact_id,
    );
    pushIndex(this.idsByIdentityHash, stored.candidate_identity_hash, stored.candidate_fact_id);
    return cloneStored(stored);
  }

  async getCandidateFactById(candidateFactId: string) {
    const stored = this.facts.get(candidateFactId);
    return stored ? cloneStored(stored) : null;
  }

  async getCandidateFactByRef(candidateFactRefValue: string) {
    const id = this.idByRef.get(candidateFactRefValue);
    return id ? this.getCandidateFactById(id) : null;
  }

  async requireCandidateFactById(candidateFactId: string) {
    const stored = await this.getCandidateFactById(candidateFactId);
    if (!stored) {
      throw new CandidateFactRepositoryError(
        "CANDIDATE_FACT_NOT_FOUND",
        `candidate fact ${candidateFactId} does not exist`,
      );
    }
    return stored;
  }

  async listCandidateFactsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listCandidateFactsByPartition(manifestId: string, partitionScope: string) {
    return this.listByIds(this.idsByPartition.get(`${manifestId}::${partitionScope}`) ?? []);
  }

  async listCandidateFactsByFactFamily(manifestId: string, factFamily: string) {
    return this.listByIds(this.idsByFactFamily.get(`${manifestId}::${factFamily}`) ?? []);
  }

  async listCandidateFactsByIdentityHash(candidateIdentityHash: string) {
    return this.listByIds(this.idsByIdentityHash.get(candidateIdentityHash) ?? []);
  }
}
