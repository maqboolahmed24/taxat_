import {
  assertConfigFreezeUsageAllowed,
  cloneConfigFreezeRecord,
  normalizeConfigFreezeRecord,
  type ConfigFreezeRecord,
  type ConfigFreezeRunKind,
  type ConfigFreezeUsageMode,
} from "../models/config_freeze.ts";

export type StoredConfigFreezeRecord = {
  config_freeze_hash: string;
  config_freeze_id: string;
  config_resolution_basis: ConfigFreezeRecord["config_resolution_basis"];
  config_surface_hash: string;
  freeze: ConfigFreezeRecord;
  manifest_id: string;
  persisted_at: string;
  tenant_id: string;
};

export type ConfigFreezeRepositoryErrorCode =
  | "CONFIG_FREEZE_DUPLICATE"
  | "CONFIG_FREEZE_NOT_FOUND";

export class ConfigFreezeRepositoryError extends Error {
  readonly code: ConfigFreezeRepositoryErrorCode;

  constructor(code: ConfigFreezeRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigFreezeRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredConfigFreezeRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ConfigFreezeRepository {
  private readonly freezes = new Map<string, StoredConfigFreezeRecord>();
  private readonly idsByFreezeHash = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByResolutionBasis = new Map<string, string[]>();
  private readonly idsBySurfaceHash = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.freezes.get(id))
      .filter((record): record is StoredConfigFreezeRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  private indexStored(stored: StoredConfigFreezeRecord) {
    pushIndex(
      this.idsByManifest,
      compositeKey(stored.tenant_id, stored.manifest_id),
      stored.config_freeze_id,
    );
    pushIndex(
      this.idsByFreezeHash,
      compositeKey(stored.tenant_id, stored.config_freeze_hash),
      stored.config_freeze_id,
    );
    pushIndex(
      this.idsBySurfaceHash,
      compositeKey(stored.tenant_id, stored.config_surface_hash),
      stored.config_freeze_id,
    );
    pushIndex(
      this.idsByResolutionBasis,
      compositeKey(stored.tenant_id, stored.config_resolution_basis),
      stored.config_freeze_id,
    );
  }

  async persistFreeze(input: {
    freeze: ConfigFreezeRecord;
    persisted_at: string;
    tenant_id: string;
    usage?: { mode: ConfigFreezeUsageMode; run_kind: ConfigFreezeRunKind };
  }) {
    const freeze = input.usage
      ? assertConfigFreezeUsageAllowed(input.freeze, input.usage)
      : normalizeConfigFreezeRecord(input.freeze);
    const existing = this.freezes.get(freeze.config_freeze_id);
    if (existing) {
      if (JSON.stringify(existing.freeze) !== JSON.stringify(freeze)) {
        throw new ConfigFreezeRepositoryError(
          "CONFIG_FREEZE_DUPLICATE",
          `config freeze ${freeze.config_freeze_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const stored: StoredConfigFreezeRecord = {
      tenant_id: input.tenant_id,
      config_freeze_id: freeze.config_freeze_id,
      manifest_id: freeze.manifest_id,
      config_freeze_hash: freeze.config_freeze_hash,
      config_surface_hash: freeze.config_surface_hash,
      config_resolution_basis: freeze.config_resolution_basis,
      persisted_at: input.persisted_at,
      freeze: cloneConfigFreezeRecord(freeze),
    };
    this.freezes.set(stored.config_freeze_id, cloneStored(stored));
    this.indexStored(stored);
    return cloneStored(stored);
  }

  async getFreezeById(tenantId: string, configFreezeId: string) {
    const stored = this.freezes.get(configFreezeId);
    if (!stored || stored.tenant_id !== tenantId) {
      return null;
    }
    return cloneStored(stored);
  }

  async requireFreezeById(tenantId: string, configFreezeId: string) {
    const stored = await this.getFreezeById(tenantId, configFreezeId);
    if (!stored) {
      throw new ConfigFreezeRepositoryError(
        "CONFIG_FREEZE_NOT_FOUND",
        `config freeze ${configFreezeId} does not exist in tenant ${tenantId}`,
      );
    }
    return stored;
  }

  async listFreezesByManifestId(tenantId: string, manifestId: string) {
    return this.listByIds(this.idsByManifest.get(compositeKey(tenantId, manifestId)) ?? []);
  }

  async listFreezesByHash(tenantId: string, configFreezeHash: string) {
    return this.listByIds(
      this.idsByFreezeHash.get(compositeKey(tenantId, configFreezeHash)) ?? [],
    );
  }

  async listFreezesBySurfaceHash(tenantId: string, configSurfaceHash: string) {
    return this.listByIds(
      this.idsBySurfaceHash.get(compositeKey(tenantId, configSurfaceHash)) ?? [],
    );
  }

  async listFreezesByResolutionBasis(
    tenantId: string,
    basis: ConfigFreezeRecord["config_resolution_basis"],
  ) {
    return this.listByIds(this.idsByResolutionBasis.get(compositeKey(tenantId, basis)) ?? []);
  }
}
