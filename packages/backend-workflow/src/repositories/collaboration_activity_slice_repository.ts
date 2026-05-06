import {
  collaborationActivitySliceContentFingerprint,
  collaborationActivitySliceRef,
  validateCollaborationActivitySlice,
  type CollaborationActivitySlice,
} from "../projectors/build_collaboration_activity_slice.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredCollaborationActivitySlice = {
  access_binding_hash: string;
  content_fingerprint: string;
  item_id: string;
  record: CollaborationActivitySlice;
  slice_ref: string;
  thread_visibility_class: CollaborationActivitySlice["thread_visibility_class"];
  viewer_scope: CollaborationActivitySlice["viewer_scope"];
  workspace_route_key: string;
  workspace_version: number;
};

function cloneStored(stored: StoredCollaborationActivitySlice) {
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

function sortStored(left: StoredCollaborationActivitySlice, right: StoredCollaborationActivitySlice) {
  return (
    left.item_id.localeCompare(right.item_id) ||
    left.viewer_scope.localeCompare(right.viewer_scope) ||
    left.thread_visibility_class.localeCompare(right.thread_visibility_class) ||
    right.workspace_version - left.workspace_version ||
    left.slice_ref.localeCompare(right.slice_ref)
  );
}

export class CollaborationActivitySliceRepository {
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByItemViewer = new Map<string, string[]>();
  private readonly records = new Map<string, StoredCollaborationActivitySlice>();

  private rebuildIndexes() {
    this.idsByItem.clear();
    this.idsByItemViewer.clear();
    for (const stored of this.records.values()) {
      pushIndex(this.idsByItem, stored.item_id, stored.slice_ref);
      pushIndex(
        this.idsByItemViewer,
        `${stored.item_id}:${stored.viewer_scope}:${stored.thread_visibility_class}`,
        stored.slice_ref,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredCollaborationActivitySlice => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistCollaborationActivitySlice(input: { slice: CollaborationActivitySlice }) {
    validateCollaborationActivitySlice(input.slice);
    const sliceRef = collaborationActivitySliceRef(input.slice);
    const existing = this.records.get(sliceRef);
    if (existing !== undefined) {
      if (!workflowStableEqual(existing.record, input.slice)) {
        throw new WorkflowModelError("WORKFLOW_ITEM_IMMUTABLE", "activity slices are immutable by ref");
      }
      return cloneStored(existing);
    }
    const stored: StoredCollaborationActivitySlice = {
      access_binding_hash: input.slice.access_binding_hash,
      content_fingerprint: collaborationActivitySliceContentFingerprint(input.slice),
      item_id: input.slice.item_id,
      record: cloneWorkflowRecord(input.slice),
      slice_ref: sliceRef,
      thread_visibility_class: input.slice.thread_visibility_class,
      viewer_scope: input.slice.viewer_scope,
      workspace_route_key: input.slice.workspace_route_key,
      workspace_version: input.slice.workspace_version,
    };
    this.records.set(stored.slice_ref, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCollaborationActivitySliceByRef(sliceRef: string) {
    const stored = this.records.get(sliceRef);
    return stored ? cloneStored(stored) : null;
  }

  async getLatestCollaborationActivitySliceForItem(input: {
    item_id: string;
    thread_visibility_class: CollaborationActivitySlice["thread_visibility_class"];
    viewer_scope: CollaborationActivitySlice["viewer_scope"];
  }) {
    const slices = this.listByIds(
      this.idsByItemViewer.get(`${input.item_id}:${input.viewer_scope}:${input.thread_visibility_class}`) ?? [],
    );
    return slices[0] ?? null;
  }

  async listCollaborationActivitySlicesByItem(itemId: string) {
    return this.listByIds(this.idsByItem.get(itemId) ?? []);
  }
}
