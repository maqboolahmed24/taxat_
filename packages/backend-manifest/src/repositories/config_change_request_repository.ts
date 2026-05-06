import {
  cloneConfigChangeRequestRecord,
  normalizeConfigChangeRequestRecord,
  type ConfigChangeRequestLifecycleState,
  type ConfigChangeRequestRecord,
} from "../models/config_change_request.ts";

export type StoredConfigChangeRequestRecord = {
  ccr: ConfigChangeRequestRecord;
  ccr_id: string;
  ccr_row_version: number;
  lifecycle_state: ConfigChangeRequestLifecycleState;
  persisted_at: string;
  tenant_id: string;
  updated_at: string;
};

export type ConfigChangeRequestRepositoryErrorCode =
  | "CONFIG_CHANGE_REQUEST_COMPARE_AND_SWAP_CONFLICT"
  | "CONFIG_CHANGE_REQUEST_DUPLICATE"
  | "CONFIG_CHANGE_REQUEST_NOT_FOUND";

export class ConfigChangeRequestRepositoryError extends Error {
  readonly code: ConfigChangeRequestRepositoryErrorCode;

  constructor(code: ConfigChangeRequestRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigChangeRequestRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredConfigChangeRequestRecord) {
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

function removeIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  const next = current.filter((entry) => entry !== value);
  if (next.length === 0) {
    index.delete(key);
    return;
  }
  index.set(key, next);
}

export class ConfigChangeRequestRepository {
  private readonly requests = new Map<string, StoredConfigChangeRequestRecord>();
  private readonly idsByTenant = new Map<string, string[]>();
  private readonly idsByLifecycle = new Map<string, string[]>();

  private buildStoredRecord(input: {
    ccr: ConfigChangeRequestRecord;
    ccr_row_version: number;
    persisted_at: string;
  }): StoredConfigChangeRequestRecord {
    return {
      tenant_id: input.ccr.tenant_id,
      ccr_id: input.ccr.ccr_id,
      lifecycle_state: input.ccr.lifecycle_state,
      ccr_row_version: input.ccr_row_version,
      persisted_at: input.persisted_at,
      updated_at: input.persisted_at,
      ccr: cloneConfigChangeRequestRecord(input.ccr),
    };
  }

  private replaceIndexes(
    previous: StoredConfigChangeRequestRecord | null,
    next: StoredConfigChangeRequestRecord,
  ) {
    if (previous) {
      if (previous.tenant_id !== next.tenant_id) {
        throw new ConfigChangeRequestRepositoryError(
          "CONFIG_CHANGE_REQUEST_COMPARE_AND_SWAP_CONFLICT",
          "tenant_id is immutable after CCR creation",
        );
      }
      if (previous.lifecycle_state !== next.lifecycle_state) {
        removeIndex(
          this.idsByLifecycle,
          compositeKey(previous.tenant_id, previous.lifecycle_state),
          previous.ccr_id,
        );
      }
    } else {
      pushIndex(this.idsByTenant, next.tenant_id, next.ccr_id);
    }
    pushIndex(
      this.idsByLifecycle,
      compositeKey(next.tenant_id, next.lifecycle_state),
      next.ccr_id,
    );
  }

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.requests.get(id))
      .filter((record): record is StoredConfigChangeRequestRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async createChangeRequest(input: { ccr: ConfigChangeRequestRecord; persisted_at: string }) {
    const ccr = normalizeConfigChangeRequestRecord(input.ccr);
    const existing = this.requests.get(ccr.ccr_id);
    if (existing) {
      if (JSON.stringify(existing.ccr) !== JSON.stringify(ccr)) {
        throw new ConfigChangeRequestRepositoryError(
          "CONFIG_CHANGE_REQUEST_DUPLICATE",
          `config change request ${ccr.ccr_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const stored = this.buildStoredRecord({
      ccr,
      ccr_row_version: 1,
      persisted_at: input.persisted_at,
    });
    this.requests.set(stored.ccr_id, cloneStored(stored));
    this.replaceIndexes(null, stored);
    return cloneStored(stored);
  }

  async getChangeRequestById(tenantId: string, ccrId: string) {
    const stored = this.requests.get(ccrId);
    if (!stored || stored.tenant_id !== tenantId) {
      return null;
    }
    return cloneStored(stored);
  }

  async requireChangeRequestById(tenantId: string, ccrId: string) {
    const stored = await this.getChangeRequestById(tenantId, ccrId);
    if (!stored) {
      throw new ConfigChangeRequestRepositoryError(
        "CONFIG_CHANGE_REQUEST_NOT_FOUND",
        `config change request ${ccrId} does not exist in tenant ${tenantId}`,
      );
    }
    return stored;
  }

  async listChangeRequestsByTenant(tenantId: string) {
    return this.listByIds(this.idsByTenant.get(tenantId) ?? []);
  }

  async listChangeRequestsByLifecycleState(
    tenantId: string,
    lifecycleState: ConfigChangeRequestLifecycleState,
  ) {
    return this.listByIds(this.idsByLifecycle.get(compositeKey(tenantId, lifecycleState)) ?? []);
  }

  async compareAndSwapChangeRequest(input: {
    expected_ccr_row_version: number;
    next_ccr: ConfigChangeRequestRecord;
    persisted_at: string;
  }) {
    const existing = this.requests.get(input.next_ccr.ccr_id);
    if (!existing) {
      throw new ConfigChangeRequestRepositoryError(
        "CONFIG_CHANGE_REQUEST_NOT_FOUND",
        `config change request ${input.next_ccr.ccr_id} does not exist`,
      );
    }
    if (existing.ccr_row_version !== input.expected_ccr_row_version) {
      throw new ConfigChangeRequestRepositoryError(
        "CONFIG_CHANGE_REQUEST_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_ccr_row_version} but found ${existing.ccr_row_version}`,
      );
    }

    const ccr = normalizeConfigChangeRequestRecord(input.next_ccr);
    const next = this.buildStoredRecord({
      ccr,
      ccr_row_version: existing.ccr_row_version + 1,
      persisted_at: input.persisted_at,
    });
    this.replaceIndexes(existing, next);
    this.requests.set(next.ccr_id, cloneStored(next));
    return cloneStored(next);
  }
}
