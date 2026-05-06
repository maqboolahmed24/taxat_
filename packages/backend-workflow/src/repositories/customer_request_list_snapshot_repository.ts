import {
  customerRequestListSnapshotContentFingerprint,
  customerRequestListSnapshotRef,
  validateCustomerRequestListSnapshot,
  type CustomerRequestListSnapshot,
} from "../projectors/build_customer_request_list_snapshot.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredCustomerRequestListSnapshot = {
  access_binding_hash: string;
  client_id: string;
  content_fingerprint: string;
  list_version: number;
  record: CustomerRequestListSnapshot;
  request_list_route_key: string;
  snapshot_ref: string;
  tenant_id: string;
  visibility_cache_partition_key: string;
};

function cloneStored(stored: StoredCustomerRequestListSnapshot) {
  return cloneWorkflowRecord(stored);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredCustomerRequestListSnapshot, right: StoredCustomerRequestListSnapshot) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    right.list_version - left.list_version ||
    left.snapshot_ref.localeCompare(right.snapshot_ref)
  );
}

export class CustomerRequestListSnapshotRepository {
  private readonly idsByClient = new Map<string, string[]>();
  private readonly idsByTenant = new Map<string, string[]>();
  private readonly records = new Map<string, StoredCustomerRequestListSnapshot>();

  private rebuildIndexes() {
    this.idsByClient.clear();
    this.idsByTenant.clear();
    for (const stored of this.records.values()) {
      pushIndex(this.idsByClient, `${stored.tenant_id}:${stored.client_id}`, stored.snapshot_ref);
      pushIndex(this.idsByTenant, stored.tenant_id, stored.snapshot_ref);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredCustomerRequestListSnapshot => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistCustomerRequestListSnapshot(input: { snapshot: CustomerRequestListSnapshot }) {
    validateCustomerRequestListSnapshot(input.snapshot);
    const snapshotRef = customerRequestListSnapshotRef(input.snapshot);
    const existing = this.records.get(snapshotRef);
    if (existing !== undefined) {
      if (!workflowStableEqual(existing.record, input.snapshot)) {
        throw new WorkflowModelError("WORKFLOW_ITEM_IMMUTABLE", "customer request list snapshots are immutable by ref");
      }
      return cloneStored(existing);
    }
    const stored: StoredCustomerRequestListSnapshot = {
      access_binding_hash: input.snapshot.access_binding_hash,
      client_id: input.snapshot.client_id,
      content_fingerprint: customerRequestListSnapshotContentFingerprint(input.snapshot),
      list_version: input.snapshot.list_version,
      record: cloneWorkflowRecord(input.snapshot),
      request_list_route_key: input.snapshot.request_list_route_key,
      snapshot_ref: snapshotRef,
      tenant_id: input.snapshot.tenant_id,
      visibility_cache_partition_key: input.snapshot.visibility_partition.cache_partition_key,
    };
    this.records.set(stored.snapshot_ref, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCustomerRequestListSnapshotByRef(snapshotRef: string) {
    const stored = this.records.get(snapshotRef);
    return stored ? cloneStored(stored) : null;
  }

  async getLatestCustomerRequestListSnapshotForClient(input: { client_id: string; tenant_id: string }) {
    const snapshots = this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
    return snapshots[0] ?? null;
  }

  async listCustomerRequestListSnapshotsByClient(input: { client_id: string; tenant_id: string }) {
    return this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }

  async listCustomerRequestListSnapshotsByTenant(tenantId: string) {
    return this.listByIds(this.idsByTenant.get(tenantId) ?? []);
  }
}
