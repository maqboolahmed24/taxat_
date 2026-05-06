import {
  assertDeterministicGoldenPackHash,
  cloneDeterministicGoldenPackRecord,
  deterministicGoldenPackRef,
  type DeterministicGoldenPackRecord,
} from "../models/deterministic_golden_pack.ts";

export type StoredDeterministicGoldenPackRecord = {
  golden_pack_id: string;
  golden_pack_ref: string;
  golden_pack_hash: string;
  candidate_identity_hash: string;
  schema_bundle_hash: string;
  config_bundle_hash: string;
  persisted_at: string;
  deterministic_golden_pack: DeterministicGoldenPackRecord;
};

export type DeterministicGoldenPackRepositoryErrorCode =
  | "DETERMINISTIC_GOLDEN_PACK_DUPLICATE"
  | "DETERMINISTIC_GOLDEN_PACK_HASH_COLLISION"
  | "DETERMINISTIC_GOLDEN_PACK_NOT_FOUND"
  | "DETERMINISTIC_GOLDEN_PACK_REF_COLLISION";

export class DeterministicGoldenPackRepositoryError extends Error {
  readonly code: DeterministicGoldenPackRepositoryErrorCode;

  constructor(code: DeterministicGoldenPackRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DeterministicGoldenPackRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredDeterministicGoldenPackRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, goldenPackId: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(goldenPackId)) {
    current.push(goldenPackId);
    index.set(key, current);
  }
}

function sortStored(
  left: StoredDeterministicGoldenPackRecord,
  right: StoredDeterministicGoldenPackRecord,
) {
  if (left.persisted_at !== right.persisted_at) {
    return left.persisted_at < right.persisted_at ? -1 : 1;
  }
  if (left.golden_pack_id !== right.golden_pack_id) {
    return left.golden_pack_id < right.golden_pack_id ? -1 : 1;
  }
  return 0;
}

export class DeterministicGoldenPackRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idByHash = new Map<string, string>();
  private readonly idsByCandidateIdentityHash = new Map<string, string[]>();
  private readonly records = new Map<string, StoredDeterministicGoldenPackRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idByHash.clear();
    this.idsByCandidateIdentityHash.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.golden_pack_ref, stored.golden_pack_id);
      this.idByHash.set(stored.golden_pack_hash, stored.golden_pack_id);
      pushIndex(
        this.idsByCandidateIdentityHash,
        stored.candidate_identity_hash,
        stored.golden_pack_id,
      );
    }
  }

  async persistDeterministicGoldenPack(input: {
    golden_pack: DeterministicGoldenPackRecord;
    persisted_at: string;
  }) {
    const goldenPack = assertDeterministicGoldenPackHash(input.golden_pack);
    const stored: StoredDeterministicGoldenPackRecord = {
      golden_pack_id: goldenPack.golden_pack_id,
      golden_pack_ref: deterministicGoldenPackRef(goldenPack),
      golden_pack_hash: goldenPack.golden_pack_hash,
      candidate_identity_hash: goldenPack.candidate_identity_hash,
      schema_bundle_hash: goldenPack.schema_bundle_hash,
      config_bundle_hash: goldenPack.config_bundle_hash,
      persisted_at: input.persisted_at,
      deterministic_golden_pack: cloneDeterministicGoldenPackRecord(goldenPack),
    };
    const existing = this.records.get(stored.golden_pack_id);
    if (existing) {
      if (
        JSON.stringify(existing.deterministic_golden_pack) !==
        JSON.stringify(stored.deterministic_golden_pack)
      ) {
        throw new DeterministicGoldenPackRepositoryError(
          "DETERMINISTIC_GOLDEN_PACK_DUPLICATE",
          `golden pack ${stored.golden_pack_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const refOwner = this.idByRef.get(stored.golden_pack_ref);
    if (refOwner !== undefined) {
      throw new DeterministicGoldenPackRepositoryError(
        "DETERMINISTIC_GOLDEN_PACK_REF_COLLISION",
        `golden pack ref ${stored.golden_pack_ref} already belongs to ${refOwner}`,
      );
    }
    const hashOwner = this.idByHash.get(stored.golden_pack_hash);
    if (hashOwner !== undefined && hashOwner !== stored.golden_pack_id) {
      throw new DeterministicGoldenPackRepositoryError(
        "DETERMINISTIC_GOLDEN_PACK_HASH_COLLISION",
        `golden pack hash ${stored.golden_pack_hash} already belongs to ${hashOwner}`,
      );
    }
    this.records.set(stored.golden_pack_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getDeterministicGoldenPackById(goldenPackId: string) {
    const stored = this.records.get(goldenPackId);
    if (!stored) {
      throw new DeterministicGoldenPackRepositoryError(
        "DETERMINISTIC_GOLDEN_PACK_NOT_FOUND",
        `golden pack ${goldenPackId} does not exist`,
      );
    }
    return cloneStored(stored);
  }

  async findDeterministicGoldenPackByRef(goldenPackRef: string) {
    const id = this.idByRef.get(goldenPackRef);
    return id === undefined ? null : cloneStored(this.records.get(id)!);
  }

  async listDeterministicGoldenPacksByCandidateIdentityHash(candidateIdentityHash: string) {
    return (this.idsByCandidateIdentityHash.get(candidateIdentityHash) ?? [])
      .map((id) => this.records.get(id))
      .filter((record): record is StoredDeterministicGoldenPackRecord => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneStored(record));
  }
}
