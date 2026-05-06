import type { RoleTemplateMatrixRecord } from "../read_models/role_template_matrix.ts";

export type StoredRoleTemplateMatrixRecord = {
  material_config_hashes: Record<string, string>;
  persisted_at: string;
  role_matrix: RoleTemplateMatrixRecord;
  source_config_refs: string[];
};

type RoleTemplateMatrixRepositoryErrorCode =
  | "ROLE_TEMPLATE_MATRIX_DUPLICATE"
  | "ROLE_TEMPLATE_MATRIX_NOT_FOUND";

export class RoleTemplateMatrixRepositoryError extends Error {
  readonly code: RoleTemplateMatrixRepositoryErrorCode;

  constructor(code: RoleTemplateMatrixRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RoleTemplateMatrixRepositoryError";
    this.code = code;
  }
}

function cloneRecord(record: StoredRoleTemplateMatrixRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export class RoleTemplateMatrixRepository {
  private readonly matricesByVersion = new Map<
    string,
    StoredRoleTemplateMatrixRecord
  >();
  private readonly matrixVersionByTenantRole = new Map<string, string[]>();
  private readonly matrixVersionByPolicyHashRole = new Map<string, string[]>();

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(value)) {
      current.push(value);
      index.set(key, current);
    }
  }

  async storeRoleMatrix(input: {
    material_config_hashes?: Record<string, string>;
    persisted_at: string;
    role_matrix: RoleTemplateMatrixRecord;
    source_config_refs?: string[];
  }) {
    const record: StoredRoleTemplateMatrixRecord = {
      persisted_at: input.persisted_at,
      role_matrix: structuredClone(input.role_matrix),
      source_config_refs: [...(input.source_config_refs ?? [])].sort((left, right) =>
        left.localeCompare(right),
      ),
      material_config_hashes: Object.fromEntries(
        Object.entries(input.material_config_hashes ?? {}).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    };
    const existing = this.matricesByVersion.get(record.role_matrix.version_hash);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new RoleTemplateMatrixRepositoryError(
          "ROLE_TEMPLATE_MATRIX_DUPLICATE",
          `version ${record.role_matrix.version_hash} already exists with different persisted lineage`,
        );
      }
      return cloneRecord(existing);
    }

    this.matricesByVersion.set(
      record.role_matrix.version_hash,
      cloneRecord(record),
    );
    this.pushIndex(
      this.matrixVersionByTenantRole,
      compositeKey(record.role_matrix.tenant_id, record.role_matrix.role_id),
      record.role_matrix.version_hash,
    );
    this.pushIndex(
      this.matrixVersionByPolicyHashRole,
      compositeKey(
        record.role_matrix.tenant_id,
        record.role_matrix.policy_snapshot_hash,
        record.role_matrix.role_id,
      ),
      record.role_matrix.version_hash,
    );
    return cloneRecord(record);
  }

  async getRoleMatrixByVersionHash(versionHash: string) {
    const record = this.matricesByVersion.get(versionHash);
    return record ? cloneRecord(record) : null;
  }

  async requireRoleMatrixByVersionHash(versionHash: string) {
    const record = await this.getRoleMatrixByVersionHash(versionHash);
    if (!record) {
      throw new RoleTemplateMatrixRepositoryError(
        "ROLE_TEMPLATE_MATRIX_NOT_FOUND",
        `version ${versionHash} does not exist`,
      );
    }
    return record;
  }

  async listRoleMatricesByTenantAndRole(tenantId: string, roleId: string) {
    return (this.matrixVersionByTenantRole.get(compositeKey(tenantId, roleId)) ?? [])
      .map((versionHash) => this.matricesByVersion.get(versionHash))
      .filter(
        (record): record is StoredRoleTemplateMatrixRecord => record !== undefined,
      )
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneRecord(record));
  }

  async getLatestRoleMatrixByTenantAndRole(tenantId: string, roleId: string) {
    return (await this.listRoleMatricesByTenantAndRole(tenantId, roleId)).at(-1) ?? null;
  }

  async listRoleMatricesByPolicySnapshotHash(
    tenantId: string,
    policySnapshotHash: string,
    roleId: string,
  ) {
    return (
      this.matrixVersionByPolicyHashRole.get(
        compositeKey(tenantId, policySnapshotHash, roleId),
      ) ?? []
    )
      .map((versionHash) => this.matricesByVersion.get(versionHash))
      .filter(
        (record): record is StoredRoleTemplateMatrixRecord => record !== undefined,
      )
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneRecord(record));
  }
}
