import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  authorityBindingContentFingerprint,
  authorityBindingRef,
  cloneAuthorityBinding,
  normalizeAuthorityBinding,
  type AuthorityBinding,
} from "../models/authority_binding.ts";

export type StoredAuthorityBinding = {
  authority_binding_id: string;
  authority_binding_ref: string;
  binding_health: string;
  binding_lineage_ref: string;
  client_id: string;
  content_fingerprint: string;
  manifest_id: string;
  record: AuthorityBinding;
  row_version: number;
  tenant_id: string;
  token_binding_ref: string;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredAuthorityBinding, right: StoredAuthorityBinding) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    left.binding_lineage_ref.localeCompare(right.binding_lineage_ref) ||
    left.authority_binding_id.localeCompare(right.authority_binding_id)
  );
}

export class AuthorityBindingRepository {
  private readonly idByLineage = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByClient = new Map<string, string[]>();
  private readonly idsByTokenBinding = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityBinding>();

  private rebuildIndexes() {
    this.idByLineage.clear();
    this.idByRef.clear();
    this.idsByClient.clear();
    this.idsByTokenBinding.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.authority_binding_ref, stored.authority_binding_id);
      this.idByLineage.set(stored.binding_lineage_ref, stored.authority_binding_id);
      pushIndex(this.idsByClient, `${stored.tenant_id}:${stored.client_id}`, stored.authority_binding_id);
      pushIndex(this.idsByTokenBinding, stored.token_binding_ref, stored.authority_binding_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityBinding => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneRecord(record));
  }

  async persistAuthorityBinding(input: { binding: AuthorityBinding }) {
    const binding = normalizeAuthorityBinding(input.binding);
    const existing = this.records.get(binding.authority_binding_id);
    if (existing && !stableEqual(existing.record, binding)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority binding ${binding.authority_binding_id} is sealed and cannot mutate in place`,
      );
    }
    const ref = authorityBindingRef(binding);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== binding.authority_binding_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority binding ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const lineageOwner = this.idByLineage.get(binding.binding_lineage_ref);
    if (lineageOwner !== undefined && lineageOwner !== binding.authority_binding_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `binding lineage ${binding.binding_lineage_ref} already belongs to ${lineageOwner}`,
      );
    }
    if (existing) {
      return cloneRecord(existing);
    }
    const stored: StoredAuthorityBinding = {
      authority_binding_id: binding.authority_binding_id,
      authority_binding_ref: ref,
      binding_health: binding.binding_health,
      binding_lineage_ref: binding.binding_lineage_ref,
      client_id: binding.client_id,
      content_fingerprint: authorityBindingContentFingerprint(binding),
      manifest_id: binding.manifest_id,
      record: cloneAuthorityBinding(binding),
      row_version: 1,
      tenant_id: binding.tenant_id,
      token_binding_ref: binding.token_binding_ref,
    };
    this.records.set(stored.authority_binding_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getAuthorityBindingById(authorityBindingId: string) {
    const stored = this.records.get(authorityBindingId);
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityBindingByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityBindingByLineageRef(bindingLineageRef: string) {
    const id = this.idByLineage.get(bindingLineageRef);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async listAuthorityBindingsByClient(input: { tenant_id: string; client_id: string }) {
    return this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }

  async listAuthorityBindingsByTokenBindingRef(tokenBindingRef: string) {
    return this.listByIds(this.idsByTokenBinding.get(tokenBindingRef) ?? []);
  }
}
