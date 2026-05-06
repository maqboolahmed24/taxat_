import {
  disableUser,
  isUserActive,
  normalizeUserRecord,
  type CreateUserInput,
  type UserRecord,
} from "../models/user.ts";
import type { TenantRepository } from "./tenant_repository.ts";

type UserRepositoryErrorCode =
  | "USER_DUPLICATE"
  | "USER_DISABLED"
  | "USER_NOT_FOUND";

export class UserRepositoryError extends Error {
  readonly code: UserRepositoryErrorCode;

  constructor(code: UserRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "UserRepositoryError";
    this.code = code;
  }
}

function scopedUserKey(tenantId: string, userId: string) {
  return `${tenantId}::${userId}`;
}

function cloneUserRecord(user: UserRecord) {
  return structuredClone(user);
}

export class UserRepository {
  private readonly users = new Map<string, UserRecord>();

  constructor(private readonly dependencies: { tenantRepository: TenantRepository }) {}

  async create(input: CreateUserInput) {
    const user = normalizeUserRecord(input);
    await this.dependencies.tenantRepository.requireById(user.tenant_id);

    const userKey = scopedUserKey(user.tenant_id, user.user_id);
    if (this.users.has(userKey)) {
      throw new UserRepositoryError(
        "USER_DUPLICATE",
        `user ${user.user_id} already exists in tenant ${user.tenant_id}`,
      );
    }
    this.users.set(userKey, cloneUserRecord(user));
    return cloneUserRecord(user);
  }

  async getById(tenantId: string, userId: string) {
    const user = this.users.get(scopedUserKey(tenantId, userId));
    return user ? cloneUserRecord(user) : null;
  }

  async requireById(tenantId: string, userId: string) {
    const user = await this.getById(tenantId, userId);
    if (!user) {
      throw new UserRepositoryError(
        "USER_NOT_FOUND",
        `user ${userId} does not exist in tenant ${tenantId}`,
      );
    }
    return user;
  }

  async requireActiveUser(tenantId: string, userId: string) {
    const user = await this.requireById(tenantId, userId);
    if (!isUserActive(user)) {
      throw new UserRepositoryError(
        "USER_DISABLED",
        `user ${userId} is disabled and cannot back an interactive session`,
      );
    }
    return user;
  }

  async disable(tenantId: string, userId: string, disabledAt: string) {
    const current = await this.requireById(tenantId, userId);
    if (!isUserActive(current)) {
      return current;
    }
    const next = disableUser(current, disabledAt);
    this.users.set(scopedUserKey(tenantId, userId), cloneUserRecord(next));
    return cloneUserRecord(next);
  }

  async listByTenant(tenantId: string) {
    return [...this.users.values()]
      .filter((user) => user.tenant_id === tenantId)
      .sort((left, right) => left.user_id.localeCompare(right.user_id))
      .map((user) => cloneUserRecord(user));
  }
}
