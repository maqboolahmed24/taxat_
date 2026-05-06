import {
  collaborationThreadContentFingerprint,
  normalizeCollaborationThread,
  type CollaborationThread,
  type CollaborationVisibilityClass,
} from "../models/collaboration_thread.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredCollaborationThread = {
  content_fingerprint: string;
  head_sequence: number;
  item_id: string;
  record: CollaborationThread;
  row_version: number;
  thread_id: string;
  visibility_class: CollaborationVisibilityClass;
};

function cloneStored(stored: StoredCollaborationThread) {
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

function sortStored(left: StoredCollaborationThread, right: StoredCollaborationThread) {
  return (
    left.item_id.localeCompare(right.item_id) ||
    left.visibility_class.localeCompare(right.visibility_class) ||
    left.thread_id.localeCompare(right.thread_id)
  );
}

export class CollaborationThreadRepository {
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByItemVisibility = new Map<string, string>();
  private readonly records = new Map<string, StoredCollaborationThread>();

  private rebuildIndexes() {
    this.idsByItem.clear();
    this.idsByItemVisibility.clear();
    for (const stored of this.records.values()) {
      pushIndex(this.idsByItem, stored.item_id, stored.thread_id);
      const visibilityKey = `${stored.item_id}:${stored.visibility_class}`;
      const owner = this.idsByItemVisibility.get(visibilityKey);
      if (owner !== undefined && owner !== stored.thread_id) {
        throw new WorkflowModelError(
          "WORKFLOW_CONTRACT_INVALID",
          `collaboration thread visibility ${visibilityKey} already belongs to ${owner}`,
        );
      }
      this.idsByItemVisibility.set(visibilityKey, stored.thread_id);
    }
  }

  async persistCollaborationThread(input: {
    expected_head_sequence?: number | undefined;
    thread: CollaborationThread;
  }) {
    const thread = normalizeCollaborationThread(input.thread);
    const existing = this.records.get(thread.thread_id);
    if (
      input.expected_head_sequence !== undefined &&
      existing?.record.head_sequence !== input.expected_head_sequence
    ) {
      throw new WorkflowModelError("WORKFLOW_STALE_VERSION", "collaboration thread head sequence is stale");
    }
    const visibilityKey = `${thread.item_id}:${thread.visibility_class}`;
    const visibilityOwner = this.idsByItemVisibility.get(visibilityKey);
    if (visibilityOwner !== undefined && visibilityOwner !== thread.thread_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `item ${thread.item_id} already has ${thread.visibility_class} thread ${visibilityOwner}`,
      );
    }
    if (existing !== undefined && workflowStableEqual(existing.record, thread)) {
      return cloneStored(existing);
    }

    const stored: StoredCollaborationThread = {
      content_fingerprint: collaborationThreadContentFingerprint(thread),
      head_sequence: thread.head_sequence,
      item_id: thread.item_id,
      record: cloneWorkflowRecord(thread),
      row_version: (existing?.row_version ?? 0) + 1,
      thread_id: thread.thread_id,
      visibility_class: thread.visibility_class,
    };
    this.records.set(stored.thread_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCollaborationThreadById(threadId: string) {
    const stored = this.records.get(threadId);
    return stored ? cloneStored(stored) : null;
  }

  async getCollaborationThreadForItem(input: {
    item_id: string;
    visibility_class: CollaborationVisibilityClass;
  }) {
    const id = this.idsByItemVisibility.get(`${input.item_id}:${input.visibility_class}`);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listCollaborationThreadsByItem(itemId: string) {
    return (this.idsByItem.get(itemId) ?? [])
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredCollaborationThread => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }
}
