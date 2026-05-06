import {
  disableTenant,
  isTenantActive,
  normalizeTenantRecord,
  type CreateTenantInput,
  type TenantRecord,
} from "../models/tenant.ts";

type TenantRepositoryErrorCode =
  | "TENANT_DISABLED"
  | "TENANT_DUPLICATE"
  | "TENANT_NOT_FOUND";

export class TenantRepositoryError extends Error {
  readonly code: TenantRepositoryErrorCode;

  constructor(code: TenantRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TenantRepositoryError";
    this.code = code;
  }
}

function cloneTenantRecord(tenant: TenantRecord) {
  return structuredClone(tenant);
}

export class TenantRepository {
  private readonly tenants = new Map<string, TenantRecord>();

  async create(input: CreateTenantInput) {
    const tenant = normalizeTenantRecord(input);
    if (this.tenants.has(tenant.tenant_id)) {
      throw new TenantRepositoryError(
        "TENANT_DUPLICATE",
        `tenant ${tenant.tenant_id} already exists`,
      );
    }
    this.tenants.set(tenant.tenant_id, cloneTenantRecord(tenant));
    return cloneTenantRecord(tenant);
  }

  async getById(tenantId: string) {
    const tenant = this.tenants.get(tenantId);
    return tenant ? cloneTenantRecord(tenant) : null;
  }

  async requireById(tenantId: string) {
    const tenant = await this.getById(tenantId);
    if (!tenant) {
      throw new TenantRepositoryError("TENANT_NOT_FOUND", `tenant ${tenantId} does not exist`);
    }
    return tenant;
  }

  async requireActiveTenant(tenantId: string) {
    const tenant = await this.requireById(tenantId);
    if (!isTenantActive(tenant)) {
      throw new TenantRepositoryError(
        "TENANT_DISABLED",
        `tenant ${tenantId} is disabled and cannot accept new sessions`,
      );
    }
    return tenant;
  }

  async disable(tenantId: string, disabledAt: string) {
    const current = await this.requireById(tenantId);
    if (!isTenantActive(current)) {
      return current;
    }
    const next = disableTenant(current, disabledAt);
    this.tenants.set(tenantId, cloneTenantRecord(next));
    return cloneTenantRecord(next);
  }

  async list() {
    return [...this.tenants.values()]
      .sort((left, right) => left.tenant_id.localeCompare(right.tenant_id))
      .map((tenant) => cloneTenantRecord(tenant));
  }
}
