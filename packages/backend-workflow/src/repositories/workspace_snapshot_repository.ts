import {
  validateWorkspaceSnapshot,
  workspaceSnapshotContentFingerprint,
  workspaceSnapshotRef,
  type WorkspaceSnapshot,
} from "../projectors/build_workspace_snapshot.ts";
import type { WorkspaceViewerScope } from "../projectors/projection_contract_helpers.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredWorkspaceSnapshot = {
  access_binding_hash: string;
  content_fingerprint: string;
  item_id: string;
  record: WorkspaceSnapshot;
  shell_stability_token: string;
  snapshot_ref: string;
  tenant_id: string;
  viewer_scope: WorkspaceViewerScope;
  visibility_cache_partition_key: string;
  workspace_route_key: string;
  workspace_version: number;
};

function cloneStored(stored: StoredWorkspaceSnapshot) {
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

function sortStored(left: StoredWorkspaceSnapshot, right: StoredWorkspaceSnapshot) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.item_id.localeCompare(right.item_id) ||
    left.viewer_scope.localeCompare(right.viewer_scope) ||
    right.workspace_version - left.workspace_version ||
    left.snapshot_ref.localeCompare(right.snapshot_ref)
  );
}

export class WorkspaceSnapshotRepository {
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByItemViewer = new Map<string, string[]>();
  private readonly idsByTenant = new Map<string, string[]>();
  private readonly records = new Map<string, StoredWorkspaceSnapshot>();

  private rebuildIndexes() {
    this.idsByItem.clear();
    this.idsByItemViewer.clear();
    this.idsByTenant.clear();
    for (const stored of this.records.values()) {
      pushIndex(this.idsByItem, stored.item_id, stored.snapshot_ref);
      pushIndex(this.idsByItemViewer, `${stored.item_id}:${stored.viewer_scope}`, stored.snapshot_ref);
      pushIndex(this.idsByTenant, stored.tenant_id, stored.snapshot_ref);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredWorkspaceSnapshot => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistWorkspaceSnapshot(input: { snapshot: WorkspaceSnapshot }) {
    validateWorkspaceSnapshot(input.snapshot);
    const snapshotRef = workspaceSnapshotRef(input.snapshot);
    const existing = this.records.get(snapshotRef);
    if (existing !== undefined) {
      if (!workflowStableEqual(existing.record, input.snapshot)) {
        throw new WorkflowModelError("WORKFLOW_ITEM_IMMUTABLE", "workspace snapshots are immutable by ref");
      }
      return cloneStored(existing);
    }
    const stored: StoredWorkspaceSnapshot = {
      access_binding_hash: input.snapshot.access_binding_hash,
      content_fingerprint: workspaceSnapshotContentFingerprint(input.snapshot),
      item_id: input.snapshot.item_id,
      record: cloneWorkflowRecord(input.snapshot),
      shell_stability_token: input.snapshot.shell_stability_token,
      snapshot_ref: snapshotRef,
      tenant_id: input.snapshot.tenant_id,
      viewer_scope: input.snapshot.viewer_scope,
      visibility_cache_partition_key: input.snapshot.visibility_partition.cache_partition_key,
      workspace_route_key: input.snapshot.workspace_route_key,
      workspace_version: input.snapshot.workspace_version,
    };
    this.records.set(stored.snapshot_ref, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getWorkspaceSnapshotByRef(snapshotRef: string) {
    const stored = this.records.get(snapshotRef);
    return stored ? cloneStored(stored) : null;
  }

  async getLatestWorkspaceSnapshotForItem(input: { item_id: string; viewer_scope: WorkspaceViewerScope }) {
    const snapshots = this.listByIds(this.idsByItemViewer.get(`${input.item_id}:${input.viewer_scope}`) ?? []);
    return snapshots[0] ?? null;
  }

  async listWorkspaceSnapshotsByItem(itemId: string) {
    return this.listByIds(this.idsByItem.get(itemId) ?? []);
  }

  async listWorkspaceSnapshotsByTenant(tenantId: string) {
    return this.listByIds(this.idsByTenant.get(tenantId) ?? []);
  }
}
