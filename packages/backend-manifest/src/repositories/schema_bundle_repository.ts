import {
  cloneSchemaBundleRecord,
  normalizeSchemaBundleRecord,
  type SchemaBundleRecord,
} from "../models/schema_bundle.ts";

export type StoredSchemaBundleRecord = {
  compatibility_profile_ref: string;
  entry_count: number;
  persisted_at: string;
  published_at: string | null;
  schema_bundle: SchemaBundleRecord;
  schema_bundle_hash: string;
  window_state: SchemaBundleRecord["schema_reader_window_contract"]["window_state"];
};

export type SchemaBundleRepositoryErrorCode =
  | "SCHEMA_BUNDLE_DUPLICATE"
  | "SCHEMA_BUNDLE_NOT_FOUND";

export class SchemaBundleRepositoryError extends Error {
  readonly code: SchemaBundleRepositoryErrorCode;

  constructor(code: SchemaBundleRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SchemaBundleRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSchemaBundleRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class SchemaBundleRepository {
  private readonly bundles = new Map<string, StoredSchemaBundleRecord>();
  private readonly idsByArtifactType = new Map<string, string[]>();
  private readonly idsByWindowState = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.bundles.get(id))
      .filter((record): record is StoredSchemaBundleRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  private indexBundle(stored: StoredSchemaBundleRecord) {
    pushIndex(this.idsByWindowState, stored.window_state, stored.schema_bundle_hash);
    for (const entry of stored.schema_bundle.entries) {
      pushIndex(this.idsByArtifactType, entry.artifact_type, stored.schema_bundle_hash);
    }
  }

  async persistBundle(input: { persisted_at: string; schema_bundle: SchemaBundleRecord }) {
    const schemaBundle = normalizeSchemaBundleRecord(input.schema_bundle);
    const existing = this.bundles.get(schemaBundle.schema_bundle_hash);
    if (existing) {
      if (JSON.stringify(existing.schema_bundle) !== JSON.stringify(schemaBundle)) {
        throw new SchemaBundleRepositoryError(
          "SCHEMA_BUNDLE_DUPLICATE",
          `schema bundle ${schemaBundle.schema_bundle_hash} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const stored: StoredSchemaBundleRecord = {
      schema_bundle_hash: schemaBundle.schema_bundle_hash,
      compatibility_profile_ref: schemaBundle.compatibility_profile_ref,
      entry_count: schemaBundle.entries.length,
      published_at: schemaBundle.published_at ?? null,
      persisted_at: input.persisted_at,
      window_state: schemaBundle.schema_reader_window_contract.window_state,
      schema_bundle: cloneSchemaBundleRecord(schemaBundle),
    };
    this.bundles.set(stored.schema_bundle_hash, cloneStored(stored));
    this.indexBundle(stored);
    return cloneStored(stored);
  }

  async getBundleByHash(schemaBundleHash: string) {
    const stored = this.bundles.get(schemaBundleHash);
    return stored ? cloneStored(stored) : null;
  }

  async requireBundleByHash(schemaBundleHash: string) {
    const stored = await this.getBundleByHash(schemaBundleHash);
    if (!stored) {
      throw new SchemaBundleRepositoryError(
        "SCHEMA_BUNDLE_NOT_FOUND",
        `schema bundle ${schemaBundleHash} does not exist`,
      );
    }
    return stored;
  }

  async listBundlesByArtifactType(artifactType: string) {
    return this.listByIds(this.idsByArtifactType.get(artifactType) ?? []);
  }

  async listBundlesByWindowState(
    windowState: SchemaBundleRecord["schema_reader_window_contract"]["window_state"],
  ) {
    return this.listByIds(this.idsByWindowState.get(windowState) ?? []);
  }
}
