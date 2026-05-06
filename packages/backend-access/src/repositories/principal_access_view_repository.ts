import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";

import type { PrincipalAccessViewRecord } from "../read_models/principal_access_view.ts";

export type StoredPrincipalAccessViewRecord = {
  cache_key: string;
  persisted_at: string;
  principal_context_access_binding_hash: string;
  source_refs: string[];
  view: PrincipalAccessViewRecord;
};

type PrincipalAccessViewRepositoryErrorCode =
  | "PRINCIPAL_ACCESS_VIEW_DUPLICATE"
  | "PRINCIPAL_ACCESS_VIEW_NOT_FOUND";

export class PrincipalAccessViewRepositoryError extends Error {
  readonly code: PrincipalAccessViewRepositoryErrorCode;

  constructor(code: PrincipalAccessViewRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PrincipalAccessViewRepositoryError";
    this.code = code;
  }
}

function cloneRecord(record: StoredPrincipalAccessViewRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export function buildPrincipalAccessViewCacheKey(view: PrincipalAccessViewRecord) {
  return stableJsonHash({
    tenant_id: view.tenant_id,
    principal_id: view.principal_id,
    focus_anchor_ref: view.focus_anchor_ref,
    settlement_state: view.settlement_state,
    recovery_posture: view.recovery_posture,
    workspace_mode: view.access_workspace.workspace_mode,
    selected_role_template_ref: view.access_workspace.selected_role_template_ref,
    selected_cell_ref: view.access_workspace.selected_cell_ref,
    latest_simulation_ref: view.access_workspace.latest_simulation_ref,
    principal_types: view.access_workspace.active_filters.principal_types,
    principal_states: view.access_workspace.active_filters.principal_states,
    role_refs: view.access_workspace.active_filters.role_refs,
    delegated_client_refs: view.access_workspace.active_filters.delegated_client_refs,
    recent_change_owner_refs: view.access_workspace.active_filters.recent_change_owner_refs,
    last_modified_at: view.last_modified_at,
  });
}

export class PrincipalAccessViewRepository {
  private readonly viewsByCacheKey = new Map<string, StoredPrincipalAccessViewRecord>();
  private readonly cacheKeysByPrincipalContext = new Map<string, string[]>();

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(value)) {
      current.push(value);
      index.set(key, current);
    }
  }

  async storeView(input: {
    persisted_at: string;
    principal_context_access_binding_hash: string;
    source_refs?: string[];
    view: PrincipalAccessViewRecord;
  }) {
    const cache_key = buildPrincipalAccessViewCacheKey(input.view);
    const record: StoredPrincipalAccessViewRecord = {
      cache_key,
      persisted_at: input.persisted_at,
      principal_context_access_binding_hash: input.principal_context_access_binding_hash,
      source_refs: [...(input.source_refs ?? [])].sort((left, right) =>
        left.localeCompare(right),
      ),
      view: structuredClone(input.view),
    };
    const existing = this.viewsByCacheKey.get(cache_key);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new PrincipalAccessViewRepositoryError(
          "PRINCIPAL_ACCESS_VIEW_DUPLICATE",
          `cache key ${cache_key} already exists with different persisted lineage`,
        );
      }
      return cloneRecord(existing);
    }

    this.viewsByCacheKey.set(cache_key, cloneRecord(record));
    this.pushIndex(
      this.cacheKeysByPrincipalContext,
      compositeKey(input.view.tenant_id, input.principal_context_access_binding_hash),
      cache_key,
    );
    return cloneRecord(record);
  }

  async getViewByCacheKey(cacheKey: string) {
    const record = this.viewsByCacheKey.get(cacheKey);
    return record ? cloneRecord(record) : null;
  }

  async requireViewByCacheKey(cacheKey: string) {
    const record = await this.getViewByCacheKey(cacheKey);
    if (!record) {
      throw new PrincipalAccessViewRepositoryError(
        "PRINCIPAL_ACCESS_VIEW_NOT_FOUND",
        `cache key ${cacheKey} does not exist`,
      );
    }
    return record;
  }

  async listViewsByPrincipalContextAccessBindingHash(
    tenantId: string,
    principalContextAccessBindingHash: string,
  ) {
    return (
      this.cacheKeysByPrincipalContext.get(
        compositeKey(tenantId, principalContextAccessBindingHash),
      ) ?? []
    )
      .map((cacheKey) => this.viewsByCacheKey.get(cacheKey))
      .filter(
        (record): record is StoredPrincipalAccessViewRecord => record !== undefined,
      )
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneRecord(record));
  }

  async getLatestViewByPrincipalContextAccessBindingHash(
    tenantId: string,
    principalContextAccessBindingHash: string,
  ) {
    return (
      await this.listViewsByPrincipalContextAccessBindingHash(
        tenantId,
        principalContextAccessBindingHash,
      )
    ).at(-1) ?? null;
  }
}
