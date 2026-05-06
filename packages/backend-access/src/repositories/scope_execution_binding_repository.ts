import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import type { ScopeExecutionBindingRecord } from "../models/scope_execution_binding.ts";

export type StoredScopeExecutionBindingRecord = {
  action_family: string;
  authorization_decision_access_binding_hash: string;
  binding_recorded_at: string;
  delegation_basis: PrincipalContextRecord["delegation_basis"];
  principal_context_access_binding_hash: string;
  principal_id: string;
  principal_type: PrincipalContextRecord["principal_type"];
  resource_class: string;
  scope_execution_binding: ScopeExecutionBindingRecord;
  session_id: string;
  tenant_id: string;
};

type ScopeExecutionBindingRepositoryErrorCode =
  | "SCOPE_EXECUTION_BINDING_DUPLICATE"
  | "SCOPE_EXECUTION_BINDING_NOT_FOUND";

export class ScopeExecutionBindingRepositoryError extends Error {
  readonly code: ScopeExecutionBindingRepositoryErrorCode;

  constructor(code: ScopeExecutionBindingRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ScopeExecutionBindingRepositoryError";
    this.code = code;
  }
}

function cloneRecord(record: StoredScopeExecutionBindingRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export class ScopeExecutionBindingRepository {
  private readonly bindings = new Map<string, StoredScopeExecutionBindingRecord>();
  private readonly bindingsByDecisionAccessBindingHash = new Map<string, string[]>();
  private readonly bindingsByPrincipalContextAccessBindingHash = new Map<string, string[]>();
  private readonly bindingsBySession = new Map<string, string[]>();

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(value)) {
      current.push(value);
      index.set(key, current);
    }
  }

  async storeScopeExecutionBinding(input: {
    authorization_decision: AuthorizationDecisionRecord;
    binding_recorded_at: string;
    principal_context: PrincipalContextRecord;
    scope_execution_binding: ScopeExecutionBindingRecord;
  }) {
    const record: StoredScopeExecutionBindingRecord = {
      tenant_id: input.principal_context.tenant_id,
      session_id: input.principal_context.session_id,
      principal_id: input.principal_context.principal_id,
      principal_type: input.principal_context.principal_type,
      delegation_basis: input.principal_context.delegation_basis,
      principal_context_access_binding_hash: input.principal_context.access_binding_hash,
      authorization_decision_access_binding_hash:
        input.authorization_decision.access_binding_hash,
      resource_class: input.authorization_decision.resource_class,
      action_family: input.authorization_decision.action_family,
      binding_recorded_at: input.binding_recorded_at,
      scope_execution_binding: structuredClone(input.scope_execution_binding),
    };

    const key = compositeKey(record.tenant_id, record.scope_execution_binding.access_binding_hash);
    const existing = this.bindings.get(key);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new ScopeExecutionBindingRepositoryError(
          "SCOPE_EXECUTION_BINDING_DUPLICATE",
          `scope execution binding ${record.scope_execution_binding.access_binding_hash} already exists with a different frozen payload`,
        );
      }
      return cloneRecord(existing);
    }

    this.bindings.set(key, cloneRecord(record));
    this.pushIndex(
      this.bindingsByDecisionAccessBindingHash,
      compositeKey(record.tenant_id, record.authorization_decision_access_binding_hash),
      key,
    );
    this.pushIndex(
      this.bindingsByPrincipalContextAccessBindingHash,
      compositeKey(record.tenant_id, record.principal_context_access_binding_hash),
      key,
    );
    this.pushIndex(
      this.bindingsBySession,
      compositeKey(record.tenant_id, record.session_id),
      key,
    );
    return cloneRecord(record);
  }

  async getScopeExecutionBindingByAccessBindingHash(tenantId: string, accessBindingHash: string) {
    const record = this.bindings.get(compositeKey(tenantId, accessBindingHash));
    return record ? cloneRecord(record) : null;
  }

  async requireScopeExecutionBindingByAccessBindingHash(
    tenantId: string,
    accessBindingHash: string,
  ) {
    const record = await this.getScopeExecutionBindingByAccessBindingHash(
      tenantId,
      accessBindingHash,
    );
    if (!record) {
      throw new ScopeExecutionBindingRepositoryError(
        "SCOPE_EXECUTION_BINDING_NOT_FOUND",
        `scope execution binding ${accessBindingHash} does not exist in tenant ${tenantId}`,
      );
    }
    return record;
  }

  private listBindings(keys: string[]) {
    return keys
      .map((key) => this.bindings.get(key))
      .filter((record): record is StoredScopeExecutionBindingRecord => record !== undefined)
      .sort((left, right) => left.binding_recorded_at.localeCompare(right.binding_recorded_at))
      .map((record) => cloneRecord(record));
  }

  async listScopeExecutionBindingsByDecisionAccessBindingHash(
    tenantId: string,
    authorizationDecisionAccessBindingHash: string,
  ) {
    return this.listBindings(
      this.bindingsByDecisionAccessBindingHash.get(
        compositeKey(tenantId, authorizationDecisionAccessBindingHash),
      ) ?? [],
    );
  }

  async listScopeExecutionBindingsByPrincipalContextAccessBindingHash(
    tenantId: string,
    principalContextAccessBindingHash: string,
  ) {
    return this.listBindings(
      this.bindingsByPrincipalContextAccessBindingHash.get(
        compositeKey(tenantId, principalContextAccessBindingHash),
      ) ?? [],
    );
  }

  async listScopeExecutionBindingsBySessionId(tenantId: string, sessionId: string) {
    return this.listBindings(
      this.bindingsBySession.get(compositeKey(tenantId, sessionId)) ?? [],
    );
  }
}
