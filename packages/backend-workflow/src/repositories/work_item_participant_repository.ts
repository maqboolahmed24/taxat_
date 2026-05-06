import {
  normalizeWorkItemParticipant,
  workItemParticipantContentFingerprint,
  workItemParticipantKey,
  type WorkItemParticipant,
  type WorkItemParticipantWatchState,
} from "../models/work_item_participant.ts";
import { cloneWorkflowRecord, workflowStableEqual } from "../models/workflow_item.ts";

export type StoredWorkItemParticipant = {
  content_fingerprint: string;
  item_id: string;
  participant_key: string;
  participant_ref: string;
  record: WorkItemParticipant;
  watch_state: WorkItemParticipantWatchState;
};

function cloneStored(stored: StoredWorkItemParticipant) {
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

function sortStored(left: StoredWorkItemParticipant, right: StoredWorkItemParticipant) {
  return (
    left.item_id.localeCompare(right.item_id) ||
    left.watch_state.localeCompare(right.watch_state) ||
    left.participant_ref.localeCompare(right.participant_ref)
  );
}

export class WorkItemParticipantRepository {
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByParticipant = new Map<string, string[]>();
  private readonly idsByWatchState = new Map<string, string[]>();
  private readonly records = new Map<string, StoredWorkItemParticipant>();

  private rebuildIndexes() {
    this.idsByItem.clear();
    this.idsByParticipant.clear();
    this.idsByWatchState.clear();

    for (const stored of this.records.values()) {
      pushIndex(this.idsByItem, stored.item_id, stored.participant_key);
      pushIndex(this.idsByParticipant, stored.participant_ref, stored.participant_key);
      pushIndex(this.idsByWatchState, stored.watch_state, stored.participant_key);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredWorkItemParticipant => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async upsertWorkItemParticipant(input: { participant: WorkItemParticipant }) {
    const participant = normalizeWorkItemParticipant(input.participant);
    const participantKey = workItemParticipantKey(participant);
    const existing = this.records.get(participantKey);
    if (existing !== undefined && workflowStableEqual(existing.record, participant)) {
      return { changed: false, stored: cloneStored(existing) };
    }

    const stored: StoredWorkItemParticipant = {
      content_fingerprint: workItemParticipantContentFingerprint(participant),
      item_id: participant.item_id,
      participant_key: participantKey,
      participant_ref: participant.participant_ref,
      record: cloneWorkflowRecord(participant),
      watch_state: participant.watch_state,
    };
    this.records.set(participantKey, cloneStored(stored));
    this.rebuildIndexes();
    return { changed: true, stored: cloneStored(stored) };
  }

  async deleteWorkItemParticipant(input: { item_id: string; participant_ref: string }) {
    const participantKey = workItemParticipantKey(input);
    const deleted = this.records.delete(participantKey);
    if (deleted) {
      this.rebuildIndexes();
    }
    return deleted;
  }

  async getWorkItemParticipant(input: { item_id: string; participant_ref: string }) {
    const stored = this.records.get(workItemParticipantKey(input));
    return stored ? cloneStored(stored) : null;
  }

  async listWorkItemParticipantsByItem(itemId: string) {
    return this.listByIds(this.idsByItem.get(itemId) ?? []);
  }

  async listWorkItemParticipantsByParticipant(participantRef: string) {
    return this.listByIds(this.idsByParticipant.get(participantRef) ?? []);
  }

  async listWorkItemParticipantsByWatchState(watchState: WorkItemParticipantWatchState) {
    return this.listByIds(this.idsByWatchState.get(watchState) ?? []);
  }
}
