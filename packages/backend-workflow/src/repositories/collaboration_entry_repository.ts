import {
  collaborationEntryContentFingerprint,
  normalizeCollaborationEntry,
  type CollaborationEntry,
} from "../models/collaboration_entry.ts";
import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredCollaborationEntry = {
  actor_ref: string;
  command_id: string;
  content_fingerprint: string;
  entry_id: string;
  item_id: string;
  record: CollaborationEntry;
  request_info_ref: string | null;
  thread_id: string;
  thread_sequence: number;
  visibility_class: CollaborationVisibilityClass;
};

function cloneStored(stored: StoredCollaborationEntry) {
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

function sortStored(left: StoredCollaborationEntry, right: StoredCollaborationEntry) {
  return (
    left.thread_id.localeCompare(right.thread_id) ||
    left.thread_sequence - right.thread_sequence ||
    left.entry_id.localeCompare(right.entry_id)
  );
}

export class CollaborationEntryRepository {
  private readonly idByCommand = new Map<string, string>();
  private readonly idByThreadSequence = new Map<string, string>();
  private readonly idsByActor = new Map<string, string[]>();
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByRequestInfo = new Map<string, string[]>();
  private readonly idsByThread = new Map<string, string[]>();
  private readonly records = new Map<string, StoredCollaborationEntry>();

  private rebuildIndexes() {
    this.idByCommand.clear();
    this.idByThreadSequence.clear();
    this.idsByActor.clear();
    this.idsByItem.clear();
    this.idsByRequestInfo.clear();
    this.idsByThread.clear();

    for (const stored of this.records.values()) {
      const commandOwner = this.idByCommand.get(stored.command_id);
      if (commandOwner !== undefined && commandOwner !== stored.entry_id) {
        throw new WorkflowModelError(
          "WORKFLOW_CONTRACT_INVALID",
          `collaboration command ${stored.command_id} already emitted entry ${commandOwner}`,
        );
      }
      this.idByCommand.set(stored.command_id, stored.entry_id);

      const sequenceKey = `${stored.thread_id}:${stored.thread_sequence}`;
      const sequenceOwner = this.idByThreadSequence.get(sequenceKey);
      if (sequenceOwner !== undefined && sequenceOwner !== stored.entry_id) {
        throw new WorkflowModelError(
          "WORKFLOW_CONTRACT_INVALID",
          `collaboration thread sequence ${sequenceKey} already emitted entry ${sequenceOwner}`,
        );
      }
      this.idByThreadSequence.set(sequenceKey, stored.entry_id);
      pushIndex(this.idsByItem, stored.item_id, stored.entry_id);
      pushIndex(this.idsByThread, stored.thread_id, stored.entry_id);
      pushIndex(this.idsByActor, stored.actor_ref, stored.entry_id);
      if (stored.request_info_ref !== null) {
        pushIndex(this.idsByRequestInfo, stored.request_info_ref, stored.entry_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredCollaborationEntry => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistCollaborationEntry(input: { entry: CollaborationEntry }) {
    const entry = normalizeCollaborationEntry(input.entry);
    const existing = this.records.get(entry.entry_id);
    if (existing !== undefined) {
      if (!workflowStableEqual(existing.record, entry)) {
        throw new WorkflowModelError("WORKFLOW_ITEM_IMMUTABLE", "collaboration entries are append-only");
      }
      return cloneStored(existing);
    }

    const commandOwner = this.idByCommand.get(entry.command_id);
    if (commandOwner !== undefined) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `collaboration command ${entry.command_id} already emitted entry ${commandOwner}`,
      );
    }
    const sequenceOwner = this.idByThreadSequence.get(`${entry.thread_id}:${entry.thread_sequence}`);
    if (sequenceOwner !== undefined) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `collaboration thread ${entry.thread_id} already has sequence ${entry.thread_sequence}`,
      );
    }

    const stored: StoredCollaborationEntry = {
      actor_ref: entry.actor_ref,
      command_id: entry.command_id,
      content_fingerprint: collaborationEntryContentFingerprint(entry),
      entry_id: entry.entry_id,
      item_id: entry.item_id,
      record: cloneWorkflowRecord(entry),
      request_info_ref: entry.request_info_ref,
      thread_id: entry.thread_id,
      thread_sequence: entry.thread_sequence,
      visibility_class: entry.visibility_class,
    };
    this.records.set(stored.entry_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCollaborationEntryById(entryId: string) {
    const stored = this.records.get(entryId);
    return stored ? cloneStored(stored) : null;
  }

  async findCollaborationEntryByCommandId(commandId: string) {
    const id = this.idByCommand.get(commandId);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async getCollaborationEntryByThreadSequence(input: { thread_id: string; thread_sequence: number }) {
    const id = this.idByThreadSequence.get(`${input.thread_id}:${input.thread_sequence}`);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listCollaborationEntriesByThread(threadId: string) {
    return this.listByIds(this.idsByThread.get(threadId) ?? []);
  }

  async listCollaborationEntriesByItem(itemId: string) {
    return this.listByIds(this.idsByItem.get(itemId) ?? []);
  }

  async listCollaborationEntriesByActor(actorRef: string) {
    return this.listByIds(this.idsByActor.get(actorRef) ?? []);
  }

  async listCollaborationEntriesByRequestInfo(requestInfoRef: string) {
    return this.listByIds(this.idsByRequestInfo.get(requestInfoRef) ?? []);
  }
}
