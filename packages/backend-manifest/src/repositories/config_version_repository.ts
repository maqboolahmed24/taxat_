import {
  cloneConfigVersionRecord,
  normalizeConfigVersionRecord,
  type ConfigVersionLifecycleState,
  type ConfigVersionRecord,
} from "../models/config_version.ts";

export type StoredConfigVersionRecord = {
  config_type: ConfigVersionRecord["config_type"];
  content_hash: string;
  lifecycle_state: ConfigVersionLifecycleState;
  persisted_at: string;
  updated_at: string;
  version: ConfigVersionRecord;
  version_id: string;
  version_row_version: number;
};

export type ConfigVersionRepositoryErrorCode =
  | "CONFIG_VERSION_COMPARE_AND_SWAP_CONFLICT"
  | "CONFIG_VERSION_DUPLICATE"
  | "CONFIG_VERSION_NOT_FOUND";

export class ConfigVersionRepositoryError extends Error {
  readonly code: ConfigVersionRepositoryErrorCode;

  constructor(code: ConfigVersionRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigVersionRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredConfigVersionRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function removeIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  const next = current.filter((entry) => entry !== value);
  if (next.length === 0) {
    index.delete(key);
    return;
  }
  index.set(key, next);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export class ConfigVersionRepository {
  private readonly versions = new Map<string, StoredConfigVersionRecord>();
  private readonly idsByConfigType = new Map<string, string[]>();
  private readonly idsByContentHash = new Map<string, string[]>();
  private readonly idsByLifecycle = new Map<string, string[]>();

  private buildStoredRecord(input: {
    persisted_at: string;
    version: ConfigVersionRecord;
    version_row_version: number;
  }): StoredConfigVersionRecord {
    return {
      version_id: input.version.version_id,
      config_type: input.version.config_type,
      content_hash: input.version.content_hash,
      lifecycle_state: input.version.lifecycle_state,
      version_row_version: input.version_row_version,
      persisted_at: input.persisted_at,
      updated_at: input.persisted_at,
      version: cloneConfigVersionRecord(input.version),
    };
  }

  private replaceIndexes(previous: StoredConfigVersionRecord | null, next: StoredConfigVersionRecord) {
    if (previous) {
      if (
        previous.config_type !== next.config_type ||
        previous.content_hash !== next.content_hash
      ) {
        throw new ConfigVersionRepositoryError(
          "CONFIG_VERSION_COMPARE_AND_SWAP_CONFLICT",
          "config_type and content_hash are immutable after version creation",
        );
      }
      if (previous.lifecycle_state !== next.lifecycle_state) {
        removeIndex(
          this.idsByLifecycle,
          compositeKey(previous.config_type, previous.lifecycle_state),
          previous.version_id,
        );
      }
    } else {
      pushIndex(this.idsByConfigType, next.config_type, next.version_id);
      pushIndex(
        this.idsByContentHash,
        compositeKey(next.config_type, next.content_hash),
        next.version_id,
      );
    }
    pushIndex(
      this.idsByLifecycle,
      compositeKey(next.config_type, next.lifecycle_state),
      next.version_id,
    );
  }

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.versions.get(id))
      .filter((record): record is StoredConfigVersionRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async createVersion(input: { persisted_at: string; version: ConfigVersionRecord }) {
    const version = normalizeConfigVersionRecord(input.version);
    const existing = this.versions.get(version.version_id);
    if (existing) {
      if (JSON.stringify(existing.version) !== JSON.stringify(version)) {
        throw new ConfigVersionRepositoryError(
          "CONFIG_VERSION_DUPLICATE",
          `config version ${version.version_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const stored = this.buildStoredRecord({
      persisted_at: input.persisted_at,
      version,
      version_row_version: 1,
    });
    this.versions.set(stored.version_id, cloneStored(stored));
    this.replaceIndexes(null, stored);
    return cloneStored(stored);
  }

  async getVersionById(versionId: string) {
    const stored = this.versions.get(versionId);
    if (!stored) {
      return null;
    }
    return cloneStored(stored);
  }

  async requireVersionById(versionId: string) {
    const stored = await this.getVersionById(versionId);
    if (!stored) {
      throw new ConfigVersionRepositoryError(
        "CONFIG_VERSION_NOT_FOUND",
        `config version ${versionId} does not exist`,
      );
    }
    return stored;
  }

  async listVersionsByConfigType(configType: ConfigVersionRecord["config_type"]) {
    return this.listByIds(this.idsByConfigType.get(configType) ?? []);
  }

  async listVersionsByContentHash(
    configType: ConfigVersionRecord["config_type"],
    contentHash: string,
  ) {
    return this.listByIds(this.idsByContentHash.get(compositeKey(configType, contentHash)) ?? []);
  }

  async listVersionsByLifecycleState(
    configType: ConfigVersionRecord["config_type"],
    lifecycleState: ConfigVersionLifecycleState,
  ) {
    return this.listByIds(
      this.idsByLifecycle.get(compositeKey(configType, lifecycleState)) ?? [],
    );
  }

  async compareAndSwapVersion(input: {
    expected_version_row_version: number;
    next_version: ConfigVersionRecord;
    persisted_at: string;
  }) {
    const existing = this.versions.get(input.next_version.version_id);
    if (!existing) {
      throw new ConfigVersionRepositoryError(
        "CONFIG_VERSION_NOT_FOUND",
        `config version ${input.next_version.version_id} does not exist`,
      );
    }
    if (existing.version_row_version !== input.expected_version_row_version) {
      throw new ConfigVersionRepositoryError(
        "CONFIG_VERSION_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_version_row_version} but found ${existing.version_row_version}`,
      );
    }

    const nextVersion = normalizeConfigVersionRecord(input.next_version);
    const next = this.buildStoredRecord({
      persisted_at: input.persisted_at,
      version: nextVersion,
      version_row_version: existing.version_row_version + 1,
    });
    this.replaceIndexes(existing, next);
    this.versions.set(next.version_id, cloneStored(next));
    return cloneStored(next);
  }
}
