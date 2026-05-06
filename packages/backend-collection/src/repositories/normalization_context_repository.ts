import {
  cloneNormalizationContextRecord,
  normalizationContextRef,
  normalizeNormalizationContextRecord,
  type NormalizationContextRecord,
} from "../models/normalization_context.ts";

export type StoredNormalizationContextRecord = {
  manifest_id: string;
  normalization_context: NormalizationContextRecord;
  normalization_context_hash: string;
  normalization_context_id: string;
  normalization_context_ref: string;
  normalization_context_row_version: number;
  persisted_at: string;
};

export type NormalizationContextRepositoryErrorCode =
  | "NORMALIZATION_CONTEXT_DUPLICATE"
  | "NORMALIZATION_CONTEXT_MANIFEST_COLLISION"
  | "NORMALIZATION_CONTEXT_NOT_FOUND";

export class NormalizationContextRepositoryError extends Error {
  readonly code: NormalizationContextRepositoryErrorCode;

  constructor(code: NormalizationContextRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "NormalizationContextRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredNormalizationContextRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class NormalizationContextRepository {
  private readonly contexts = new Map<string, StoredNormalizationContextRecord>();
  private readonly idByManifest = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByHash = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.contexts.get(id))
      .filter((record): record is StoredNormalizationContextRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistNormalizationContext(input: {
    normalization_context: NormalizationContextRecord;
    persisted_at: string;
  }) {
    const context = normalizeNormalizationContextRecord(input.normalization_context);
    const existing = this.contexts.get(context.normalization_context_id);
    if (existing) {
      if (JSON.stringify(existing.normalization_context) !== JSON.stringify(context)) {
        throw new NormalizationContextRepositoryError(
          "NORMALIZATION_CONTEXT_DUPLICATE",
          `normalization context ${context.normalization_context_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const manifestCollision = this.idByManifest.get(context.manifest_id);
    if (manifestCollision !== undefined) {
      throw new NormalizationContextRepositoryError(
        "NORMALIZATION_CONTEXT_MANIFEST_COLLISION",
        `manifest ${context.manifest_id} already has normalization context ${manifestCollision}`,
      );
    }

    const ref = normalizationContextRef(context);
    const stored: StoredNormalizationContextRecord = {
      manifest_id: context.manifest_id,
      normalization_context: cloneNormalizationContextRecord(context),
      normalization_context_hash: context.normalization_context_hash,
      normalization_context_id: context.normalization_context_id,
      normalization_context_ref: ref,
      normalization_context_row_version: 1,
      persisted_at: input.persisted_at,
    };
    this.contexts.set(stored.normalization_context_id, cloneStored(stored));
    this.idByManifest.set(stored.manifest_id, stored.normalization_context_id);
    this.idByRef.set(stored.normalization_context_ref, stored.normalization_context_id);
    pushIndex(this.idsByHash, stored.normalization_context_hash, stored.normalization_context_id);
    return cloneStored(stored);
  }

  async getNormalizationContextById(normalizationContextId: string) {
    const stored = this.contexts.get(normalizationContextId);
    return stored ? cloneStored(stored) : null;
  }

  async getNormalizationContextByRef(normalizationContextRefValue: string) {
    const id = this.idByRef.get(normalizationContextRefValue);
    return id ? this.getNormalizationContextById(id) : null;
  }

  async getNormalizationContextByManifestId(manifestId: string) {
    const id = this.idByManifest.get(manifestId);
    return id ? this.getNormalizationContextById(id) : null;
  }

  async requireNormalizationContextByManifestId(manifestId: string) {
    const stored = await this.getNormalizationContextByManifestId(manifestId);
    if (!stored) {
      throw new NormalizationContextRepositoryError(
        "NORMALIZATION_CONTEXT_NOT_FOUND",
        `manifest ${manifestId} has no persisted normalization context`,
      );
    }
    return stored;
  }

  async listNormalizationContextsByHash(normalizationContextHash: string) {
    return this.listByIds(this.idsByHash.get(normalizationContextHash) ?? []);
  }
}
