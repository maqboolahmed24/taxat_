import {
  cloneRecoveryCheckpointRecord,
  normalizeRecoveryCheckpointInstant,
  normalizeRecoveryCheckpointRecord,
  recoveryCheckpointRef,
  type RecoveryCheckpointRecord,
  type RecoveryCheckpointState,
  type RecoveryCheckpointTransitionEventCode,
} from "../models/recovery_checkpoint.ts";

export type StoredRecoveryCheckpointRecord = {
  checkpoint_id: string;
  checkpoint_ref: string;
  datastore_ref: string;
  snapshot_time: string | null;
  checkpoint_state: RecoveryCheckpointState;
  rpo_class: RecoveryCheckpointRecord["rpo_class"];
  rto_class: RecoveryCheckpointRecord["rto_class"];
  recovery_tier_class: RecoveryCheckpointRecord["recovery_governance_contract"]["recovery_tier_class"];
  recovery_checkpoint_row_version: number;
  persisted_at: string;
  updated_at: string;
  recovery_checkpoint: RecoveryCheckpointRecord;
};

export type RecoveryCheckpointTransitionLogRecord = {
  checkpoint_id: string;
  checkpoint_ref: string;
  recovery_checkpoint_row_version: number;
  transition_id: string;
  event_code: RecoveryCheckpointTransitionEventCode;
  from_checkpoint_state: RecoveryCheckpointState | null;
  to_checkpoint_state: RecoveryCheckpointState;
  transition_audit_ref: string;
  transitioned_at: string;
};

export type RecoveryCheckpointRepositoryErrorCode =
  | "RECOVERY_CHECKPOINT_COMPARE_AND_SWAP_CONFLICT"
  | "RECOVERY_CHECKPOINT_DUPLICATE"
  | "RECOVERY_CHECKPOINT_NOT_FOUND"
  | "RECOVERY_CHECKPOINT_REF_COLLISION";

export class RecoveryCheckpointRepositoryError extends Error {
  readonly code: RecoveryCheckpointRepositoryErrorCode;

  constructor(code: RecoveryCheckpointRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RecoveryCheckpointRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredRecoveryCheckpointRecord) {
  return structuredClone(record);
}

function cloneTransition(record: RecoveryCheckpointTransitionLogRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, checkpointId: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(checkpointId)) {
    current.push(checkpointId);
    index.set(key, current);
  }
}

function snapshotKey(snapshotTime: string | null) {
  return snapshotTime ?? "<null>";
}

function sortStored(left: StoredRecoveryCheckpointRecord, right: StoredRecoveryCheckpointRecord) {
  return (
    snapshotKey(left.snapshot_time).localeCompare(snapshotKey(right.snapshot_time)) ||
    left.checkpoint_id.localeCompare(right.checkpoint_id)
  );
}

function stableTransitionId(input: {
  checkpoint_id: string;
  row_version: number;
  event_code: RecoveryCheckpointTransitionEventCode;
  transitioned_at: string;
}) {
  return `${input.checkpoint_id}.${input.row_version}.${input.event_code}.${input.transitioned_at}`;
}

function restoreEvidenceTuple(checkpoint: RecoveryCheckpointRecord) {
  return JSON.stringify({
    restore_drill_ref: checkpoint.restore_drill_ref,
    restore_tested_at: checkpoint.restore_tested_at,
    restore_verification_hash: checkpoint.restore_verification_hash,
  });
}

export class RecoveryCheckpointRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByDatastoreRef = new Map<string, string[]>();
  private readonly idsBySnapshotTime = new Map<string, string[]>();
  private readonly idsByCheckpointState = new Map<string, string[]>();
  private readonly records = new Map<string, StoredRecoveryCheckpointRecord>();
  private readonly transitions = new Map<string, RecoveryCheckpointTransitionLogRecord[]>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByDatastoreRef.clear();
    this.idsBySnapshotTime.clear();
    this.idsByCheckpointState.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.checkpoint_ref, stored.checkpoint_id);
      pushIndex(this.idsByDatastoreRef, stored.datastore_ref, stored.checkpoint_id);
      pushIndex(this.idsBySnapshotTime, snapshotKey(stored.snapshot_time), stored.checkpoint_id);
      pushIndex(this.idsByCheckpointState, stored.checkpoint_state, stored.checkpoint_id);
    }
  }

  private buildStoredRecord(input: {
    checkpoint: RecoveryCheckpointRecord;
    recovery_checkpoint_row_version: number;
    persisted_at: string;
    previous_persisted_at?: string;
  }): StoredRecoveryCheckpointRecord {
    const checkpoint = normalizeRecoveryCheckpointRecord(input.checkpoint);
    const persistedAt = normalizeRecoveryCheckpointInstant(input.persisted_at);
    return {
      checkpoint_id: checkpoint.checkpoint_id,
      checkpoint_ref: recoveryCheckpointRef(checkpoint),
      datastore_ref: checkpoint.datastore_ref,
      snapshot_time: checkpoint.snapshot_time,
      checkpoint_state: checkpoint.checkpoint_state,
      rpo_class: checkpoint.rpo_class,
      rto_class: checkpoint.rto_class,
      recovery_tier_class: checkpoint.recovery_governance_contract.recovery_tier_class,
      recovery_checkpoint_row_version: input.recovery_checkpoint_row_version,
      persisted_at: input.previous_persisted_at ?? persistedAt,
      updated_at: persistedAt,
      recovery_checkpoint: cloneRecoveryCheckpointRecord(checkpoint),
    };
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredRecoveryCheckpointRecord => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneStored(record));
  }

  async persistRecoveryCheckpoint(input: {
    checkpoint: RecoveryCheckpointRecord;
    persisted_at: string;
  }) {
    const checkpoint = normalizeRecoveryCheckpointRecord(input.checkpoint);
    const stored = this.buildStoredRecord({
      checkpoint,
      recovery_checkpoint_row_version: 1,
      persisted_at: input.persisted_at,
    });
    const existing = this.records.get(stored.checkpoint_id);
    if (existing) {
      if (JSON.stringify(existing.recovery_checkpoint) !== JSON.stringify(checkpoint)) {
        throw new RecoveryCheckpointRepositoryError(
          "RECOVERY_CHECKPOINT_DUPLICATE",
          `checkpoint ${stored.checkpoint_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingRefOwner = this.idByRef.get(stored.checkpoint_ref);
    if (existingRefOwner !== undefined) {
      throw new RecoveryCheckpointRepositoryError(
        "RECOVERY_CHECKPOINT_REF_COLLISION",
        `checkpoint ref ${stored.checkpoint_ref} already belongs to ${existingRefOwner}`,
      );
    }
    this.records.set(stored.checkpoint_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async compareAndSwapRecoveryCheckpoint(input: {
    checkpoint_id: string;
    expected_recovery_checkpoint_row_version: number;
    checkpoint: RecoveryCheckpointRecord;
    persisted_at: string;
  }) {
    const existing = this.records.get(input.checkpoint_id);
    if (!existing) {
      throw new RecoveryCheckpointRepositoryError(
        "RECOVERY_CHECKPOINT_NOT_FOUND",
        `checkpoint ${input.checkpoint_id} does not exist`,
      );
    }
    if (
      existing.recovery_checkpoint_row_version !==
      input.expected_recovery_checkpoint_row_version
    ) {
      throw new RecoveryCheckpointRepositoryError(
        "RECOVERY_CHECKPOINT_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_recovery_checkpoint_row_version} but found ${existing.recovery_checkpoint_row_version}`,
      );
    }
    const checkpoint = normalizeRecoveryCheckpointRecord(input.checkpoint);
    if (checkpoint.checkpoint_id !== input.checkpoint_id) {
      throw new RecoveryCheckpointRepositoryError(
        "RECOVERY_CHECKPOINT_COMPARE_AND_SWAP_CONFLICT",
        "checkpoint_id is immutable during compare-and-swap writes",
      );
    }
    if (
      checkpoint.state_transition_contract.previous_state_or_null !==
      existing.recovery_checkpoint.checkpoint_state
    ) {
      throw new RecoveryCheckpointRepositoryError(
        "RECOVERY_CHECKPOINT_COMPARE_AND_SWAP_CONFLICT",
        "state_transition_contract.previous_state_or_null must match the persisted checkpoint_state",
      );
    }
    for (const field of ["backup_ref", "checkpoint_inventory_ref", "snapshot_time"] as const) {
      const existingValue = existing.recovery_checkpoint[field];
      if (existingValue !== null && checkpoint[field] !== existingValue) {
        throw new RecoveryCheckpointRepositoryError(
          "RECOVERY_CHECKPOINT_COMPARE_AND_SWAP_CONFLICT",
          `${field} is immutable once checkpoint inventory has been established`,
        );
      }
    }
    if (
      restoreEvidenceTuple(existing.recovery_checkpoint) !==
        JSON.stringify({
          restore_drill_ref: null,
          restore_tested_at: null,
          restore_verification_hash: null,
        }) &&
      checkpoint.state_transition_contract.transition_event_code !==
        "remediation_and_redrill_passed" &&
      restoreEvidenceTuple(existing.recovery_checkpoint) !== restoreEvidenceTuple(checkpoint)
    ) {
      throw new RecoveryCheckpointRepositoryError(
        "RECOVERY_CHECKPOINT_COMPARE_AND_SWAP_CONFLICT",
        "bound restore-drill evidence is immutable except during remediation_and_redrill_passed",
      );
    }
    const next = this.buildStoredRecord({
      checkpoint,
      recovery_checkpoint_row_version: existing.recovery_checkpoint_row_version + 1,
      persisted_at: input.persisted_at,
      previous_persisted_at: existing.persisted_at,
    });
    this.records.set(next.checkpoint_id, cloneStored(next));
    this.rebuildIndexes();

    const transition = checkpoint.state_transition_contract;
    const transitionedAt = normalizeRecoveryCheckpointInstant(transition.transition_applied_at);
    const logRecord: RecoveryCheckpointTransitionLogRecord = {
      checkpoint_id: next.checkpoint_id,
      checkpoint_ref: next.checkpoint_ref,
      recovery_checkpoint_row_version: next.recovery_checkpoint_row_version,
      transition_id: stableTransitionId({
        checkpoint_id: next.checkpoint_id,
        row_version: next.recovery_checkpoint_row_version,
        event_code: transition.transition_event_code,
        transitioned_at: transitionedAt,
      }),
      event_code: transition.transition_event_code,
      from_checkpoint_state: transition.previous_state_or_null,
      to_checkpoint_state: transition.current_state,
      transition_audit_ref: transition.transition_audit_ref,
      transitioned_at: transitionedAt,
    };
    const currentTransitions = this.transitions.get(next.checkpoint_id) ?? [];
    currentTransitions.push(logRecord);
    currentTransitions.sort((left, right) => left.transitioned_at.localeCompare(right.transitioned_at));
    this.transitions.set(next.checkpoint_id, currentTransitions);
    return cloneStored(next);
  }

  async getRecoveryCheckpointById(checkpointId: string) {
    const stored = this.records.get(checkpointId);
    return stored ? cloneStored(stored) : null;
  }

  async requireRecoveryCheckpointById(checkpointId: string) {
    const stored = await this.getRecoveryCheckpointById(checkpointId);
    if (!stored) {
      throw new RecoveryCheckpointRepositoryError(
        "RECOVERY_CHECKPOINT_NOT_FOUND",
        `checkpoint ${checkpointId} does not exist`,
      );
    }
    return stored;
  }

  async getRecoveryCheckpointByRef(checkpointRef: string) {
    const checkpointId = this.idByRef.get(checkpointRef);
    return checkpointId ? this.getRecoveryCheckpointById(checkpointId) : null;
  }

  async listRecoveryCheckpointsByDatastoreRef(datastoreRef: string) {
    return this.listByIds(this.idsByDatastoreRef.get(datastoreRef) ?? []);
  }

  async listRecoveryCheckpointsBySnapshotTime(snapshotTime: string | null) {
    return this.listByIds(this.idsBySnapshotTime.get(snapshotKey(snapshotTime)) ?? []);
  }

  async listRecoveryCheckpointsByState(checkpointState: RecoveryCheckpointState) {
    return this.listByIds(this.idsByCheckpointState.get(checkpointState) ?? []);
  }

  async listRecoveryCheckpointTransitions(checkpointId: string) {
    return (this.transitions.get(checkpointId) ?? []).map((record) => cloneTransition(record));
  }
}
