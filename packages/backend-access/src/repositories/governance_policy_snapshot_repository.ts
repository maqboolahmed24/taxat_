import type { GovernancePolicySnapshotRecord } from "../models/governance_policy_snapshot.ts";

export type StoredGovernancePolicySnapshotRecord = {
  material_config_hashes: Record<string, string>;
  persisted_at: string;
  snapshot: GovernancePolicySnapshotRecord;
  source_config_refs: string[];
};

type GovernancePolicySnapshotRepositoryErrorCode =
  | "GOVERNANCE_POLICY_SNAPSHOT_DUPLICATE"
  | "GOVERNANCE_POLICY_SNAPSHOT_NOT_FOUND";

export class GovernancePolicySnapshotRepositoryError extends Error {
  readonly code: GovernancePolicySnapshotRepositoryErrorCode;

  constructor(
    code: GovernancePolicySnapshotRepositoryErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "GovernancePolicySnapshotRepositoryError";
    this.code = code;
  }
}

function cloneRecord(record: StoredGovernancePolicySnapshotRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export class GovernancePolicySnapshotRepository {
  private readonly snapshotsById = new Map<
    string,
    StoredGovernancePolicySnapshotRecord
  >();
  private readonly snapshotIdsByTenant = new Map<string, string[]>();
  private readonly snapshotIdsByHash = new Map<string, string>();

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(value)) {
      current.push(value);
      index.set(key, current);
    }
  }

  async storeSnapshot(input: {
    material_config_hashes?: Record<string, string>;
    persisted_at: string;
    snapshot: GovernancePolicySnapshotRecord;
    source_config_refs?: string[];
  }) {
    const record: StoredGovernancePolicySnapshotRecord = {
      persisted_at: input.persisted_at,
      snapshot: structuredClone(input.snapshot),
      source_config_refs: [...(input.source_config_refs ?? [])].sort((left, right) =>
        left.localeCompare(right),
      ),
      material_config_hashes: Object.fromEntries(
        Object.entries(input.material_config_hashes ?? {}).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    };
    const existing = this.snapshotsById.get(record.snapshot.snapshot_id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new GovernancePolicySnapshotRepositoryError(
          "GOVERNANCE_POLICY_SNAPSHOT_DUPLICATE",
          `snapshot ${record.snapshot.snapshot_id} already exists with different persisted lineage`,
        );
      }
      return cloneRecord(existing);
    }

    this.snapshotsById.set(record.snapshot.snapshot_id, cloneRecord(record));
    this.pushIndex(
      this.snapshotIdsByTenant,
      record.snapshot.tenant_id,
      record.snapshot.snapshot_id,
    );
    this.snapshotIdsByHash.set(
      compositeKey(
        record.snapshot.tenant_id,
        record.snapshot.policy_snapshot_hash,
      ),
      record.snapshot.snapshot_id,
    );
    return cloneRecord(record);
  }

  async getSnapshotById(snapshotId: string) {
    const record = this.snapshotsById.get(snapshotId);
    return record ? cloneRecord(record) : null;
  }

  async requireSnapshotById(snapshotId: string) {
    const record = await this.getSnapshotById(snapshotId);
    if (!record) {
      throw new GovernancePolicySnapshotRepositoryError(
        "GOVERNANCE_POLICY_SNAPSHOT_NOT_FOUND",
        `snapshot ${snapshotId} does not exist`,
      );
    }
    return record;
  }

  async getSnapshotByPolicySnapshotHash(tenantId: string, policySnapshotHash: string) {
    const snapshotId = this.snapshotIdsByHash.get(
      compositeKey(tenantId, policySnapshotHash),
    );
    return snapshotId ? this.getSnapshotById(snapshotId) : null;
  }

  async requireSnapshotByPolicySnapshotHash(
    tenantId: string,
    policySnapshotHash: string,
  ) {
    const record = await this.getSnapshotByPolicySnapshotHash(
      tenantId,
      policySnapshotHash,
    );
    if (!record) {
      throw new GovernancePolicySnapshotRepositoryError(
        "GOVERNANCE_POLICY_SNAPSHOT_NOT_FOUND",
        `policy snapshot ${policySnapshotHash} does not exist for tenant ${tenantId}`,
      );
    }
    return record;
  }

  async listSnapshotsByTenantId(tenantId: string) {
    return (this.snapshotIdsByTenant.get(tenantId) ?? [])
      .map((snapshotId) => this.snapshotsById.get(snapshotId))
      .filter(
        (record): record is StoredGovernancePolicySnapshotRecord =>
          record !== undefined,
      )
      .sort((left, right) =>
        left.persisted_at.localeCompare(right.persisted_at),
      )
      .map((record) => cloneRecord(record));
  }

  async getLatestSnapshotByTenantId(tenantId: string) {
    return (await this.listSnapshotsByTenantId(tenantId)).at(-1) ?? null;
  }
}
