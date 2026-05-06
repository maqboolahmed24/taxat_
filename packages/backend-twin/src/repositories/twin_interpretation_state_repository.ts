import { cloneRecord, stableEqual, TwinModelError } from "../models/twin_common.ts";
import {
  cloneTwinInterpretationStateRecord,
  normalizeTwinInterpretationStateRecord,
  twinInterpretationStateRef,
  type TwinInterpretationStateRecord,
} from "../models/twin_interpretation_state.ts";

export type StoredTwinInterpretationStateRecord = {
  dominant_attention_state: string;
  record: TwinInterpretationStateRecord;
  twin_id: string;
  twin_interpretation_state_id: string;
  twin_interpretation_state_ref: string;
  twin_interpretation_state_row_version: number;
};

function cloneStored(record: StoredTwinInterpretationStateRecord) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class TwinInterpretationStateRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByTwin = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTwinInterpretationStateRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByTwin.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.twin_interpretation_state_ref, stored.twin_interpretation_state_id);
      pushIndex(this.idsByTwin, stored.twin_id, stored.twin_interpretation_state_id);
    }
  }

  async persistTwinInterpretationState(input: { interpretation_state: TwinInterpretationStateRecord }) {
    const interpretationState = normalizeTwinInterpretationStateRecord(input.interpretation_state);
    const existing = this.records.get(interpretationState.twin_interpretation_state_id);
    if (existing && stableEqual(existing.record, interpretationState)) {
      return cloneStored(existing);
    }
    const stored: StoredTwinInterpretationStateRecord = {
      dominant_attention_state: interpretationState.dominant_attention_state,
      record: cloneTwinInterpretationStateRecord(interpretationState),
      twin_id: interpretationState.twin_id,
      twin_interpretation_state_id: interpretationState.twin_interpretation_state_id,
      twin_interpretation_state_ref: twinInterpretationStateRef(interpretationState),
      twin_interpretation_state_row_version: (existing?.twin_interpretation_state_row_version ?? 0) + 1,
    };
    const refOwner = this.idByRef.get(stored.twin_interpretation_state_ref);
    if (refOwner !== undefined && refOwner !== stored.twin_interpretation_state_id) {
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `interpretation ref ${stored.twin_interpretation_state_ref} already belongs to ${refOwner}`,
      );
    }
    this.records.set(stored.twin_interpretation_state_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getTwinInterpretationStateById(interpretationStateId: string) {
    const stored = this.records.get(interpretationStateId);
    return stored ? cloneStored(stored) : null;
  }

  async listTwinInterpretationStatesByTwinId(twinId: string) {
    return (this.idsByTwin.get(twinId) ?? [])
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTwinInterpretationStateRecord => record !== undefined)
      .sort((left, right) =>
        left.twin_interpretation_state_id.localeCompare(right.twin_interpretation_state_id),
      )
      .map(cloneStored);
  }
}
