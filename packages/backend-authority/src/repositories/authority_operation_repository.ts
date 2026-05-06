import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  authorityOperationContentFingerprint,
  authorityOperationRef,
  cloneAuthorityOperation,
  normalizeAuthorityOperation,
  type AuthorityOperation,
} from "../models/authority_operation.ts";

export type StoredAuthorityOperation = {
  authority_binding_ref: string;
  client_id: string;
  content_fingerprint: string;
  manifest_id: string;
  operation_family: string;
  operation_id: string;
  operation_ref: string;
  record: AuthorityOperation;
  row_version: number;
  tenant_id: string;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredAuthorityOperation, right: StoredAuthorityOperation) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.operation_id.localeCompare(right.operation_id)
  );
}

export class AuthorityOperationRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBinding = new Map<string, string[]>();
  private readonly idsByClient = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityOperation>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByBinding.clear();
    this.idsByClient.clear();
    this.idsByManifest.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.operation_ref, stored.operation_id);
      pushIndex(this.idsByBinding, stored.authority_binding_ref, stored.operation_id);
      pushIndex(this.idsByClient, `${stored.tenant_id}:${stored.client_id}`, stored.operation_id);
      pushIndex(this.idsByManifest, `${stored.tenant_id}:${stored.manifest_id}`, stored.operation_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityOperation => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneRecord(record));
  }

  async persistAuthorityOperation(input: { operation: AuthorityOperation }) {
    const operation = normalizeAuthorityOperation(input.operation);
    const existing = this.records.get(operation.operation_id);
    if (existing && !stableEqual(existing.record, operation)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority operation ${operation.operation_id} is frozen and cannot mutate in place`,
      );
    }
    const ref = authorityOperationRef(operation);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== operation.operation_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority operation ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing) {
      return cloneRecord(existing);
    }
    const stored: StoredAuthorityOperation = {
      authority_binding_ref: operation.authority_binding_ref,
      client_id: operation.client_id,
      content_fingerprint: authorityOperationContentFingerprint(operation),
      manifest_id: operation.manifest_id,
      operation_family: operation.operation_family,
      operation_id: operation.operation_id,
      operation_ref: ref,
      record: cloneAuthorityOperation(operation),
      row_version: 1,
      tenant_id: operation.tenant_id,
    };
    this.records.set(stored.operation_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getAuthorityOperationById(operationId: string) {
    const stored = this.records.get(operationId);
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityOperationByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async listAuthorityOperationsByBindingRef(authorityBindingRef: string) {
    return this.listByIds(this.idsByBinding.get(authorityBindingRef) ?? []);
  }

  async listAuthorityOperationsByClient(input: { tenant_id: string; client_id: string }) {
    return this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }

  async listAuthorityOperationsByManifest(input: { tenant_id: string; manifest_id: string }) {
    return this.listByIds(this.idsByManifest.get(`${input.tenant_id}:${input.manifest_id}`) ?? []);
  }
}
