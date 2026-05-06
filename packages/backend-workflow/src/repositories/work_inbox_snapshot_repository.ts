import {
  validateWorkInboxSnapshot,
  workInboxSnapshotContentFingerprint,
  workInboxSnapshotRef,
  type WorkInboxSnapshot,
} from "../projectors/build_work_inbox_snapshot.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredWorkInboxSnapshot = {
  access_binding_hash: string;
  content_fingerprint: string;
  inbox_route_key: string;
  inbox_version: number;
  record: WorkInboxSnapshot;
  snapshot_ref: string;
  tenant_id: string;
  visibility_cache_partition_key: string;
};

function cloneStored(stored: StoredWorkInboxSnapshot) {
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

function sortStored(left: StoredWorkInboxSnapshot, right: StoredWorkInboxSnapshot) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.inbox_route_key.localeCompare(right.inbox_route_key) ||
    right.inbox_version - left.inbox_version ||
    left.snapshot_ref.localeCompare(right.snapshot_ref)
  );
}

export class WorkInboxSnapshotRepository {
  private readonly idsByRoute = new Map<string, string[]>();
  private readonly idsByTenant = new Map<string, string[]>();
  private readonly records = new Map<string, StoredWorkInboxSnapshot>();

  private rebuildIndexes() {
    this.idsByRoute.clear();
    this.idsByTenant.clear();
    for (const stored of this.records.values()) {
      pushIndex(this.idsByTenant, stored.tenant_id, stored.snapshot_ref);
      pushIndex(this.idsByRoute, `${stored.tenant_id}:${stored.inbox_route_key}`, stored.snapshot_ref);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredWorkInboxSnapshot => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistWorkInboxSnapshot(input: { snapshot: WorkInboxSnapshot }) {
    validateWorkInboxSnapshot(input.snapshot);
    const snapshotRef = workInboxSnapshotRef(input.snapshot);
    const existing = this.records.get(snapshotRef);
    if (existing !== undefined) {
      if (!workflowStableEqual(existing.record, input.snapshot)) {
        throw new WorkflowModelError("WORKFLOW_ITEM_IMMUTABLE", "work inbox snapshots are immutable by ref");
      }
      return cloneStored(existing);
    }
    const stored: StoredWorkInboxSnapshot = {
      access_binding_hash: input.snapshot.access_binding_hash,
      content_fingerprint: workInboxSnapshotContentFingerprint(input.snapshot),
      inbox_route_key: input.snapshot.inbox_route_key,
      inbox_version: input.snapshot.inbox_version,
      record: cloneWorkflowRecord(input.snapshot),
      snapshot_ref: snapshotRef,
      tenant_id: input.snapshot.tenant_id,
      visibility_cache_partition_key: input.snapshot.visibility_partition.cache_partition_key,
    };
    this.records.set(stored.snapshot_ref, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getWorkInboxSnapshotByRef(snapshotRef: string) {
    const stored = this.records.get(snapshotRef);
    return stored ? cloneStored(stored) : null;
  }

  async getLatestWorkInboxSnapshotForRoute(input: { inbox_route_key: string; tenant_id: string }) {
    const snapshots = this.listByIds(this.idsByRoute.get(`${input.tenant_id}:${input.inbox_route_key}`) ?? []);
    return snapshots[0] ?? null;
  }

  async listWorkInboxSnapshotsByRoute(input: { inbox_route_key: string; tenant_id: string }) {
    return this.listByIds(this.idsByRoute.get(`${input.tenant_id}:${input.inbox_route_key}`) ?? []);
  }

  async listWorkInboxSnapshotsByTenant(tenantId: string) {
    return this.listByIds(this.idsByTenant.get(tenantId) ?? []);
  }
}
