import {
  cloneSnapshotRecord,
  normalizeSnapshotRecord,
  snapshotRef,
  type SnapshotLifecycleState,
  type SnapshotRecord,
  type SnapshotTransitionEventCode,
} from "../models/snapshot.ts";

export type StoredSnapshotRecord = {
  candidate_fact_set_hash: string;
  canonical_fact_set_hash: string;
  conflict_set_hash: string;
  evidence_item_set_hash: string;
  lifecycle_state: SnapshotLifecycleState;
  manifest_id: string;
  persisted_at: string;
  snapshot: SnapshotRecord;
  snapshot_id: string;
  snapshot_ref: string;
  snapshot_row_version: number;
  source_record_set_hash: string;
  updated_at: string;
};

export type SnapshotTransitionLogRecord = {
  event_code: SnapshotTransitionEventCode;
  from_lifecycle_state: SnapshotLifecycleState | null;
  snapshot_id: string;
  snapshot_row_version: number;
  to_lifecycle_state: SnapshotLifecycleState;
  transition_audit_ref: string;
  transition_id: string;
  transitioned_at: string;
};

export type SnapshotRepositoryErrorCode =
  | "SNAPSHOT_COMPARE_AND_SWAP_CONFLICT"
  | "SNAPSHOT_CURRENT_COLLISION"
  | "SNAPSHOT_DUPLICATE"
  | "SNAPSHOT_IMMUTABLE_FIELD_CHANGED"
  | "SNAPSHOT_NOT_FOUND"
  | "SNAPSHOT_REF_COLLISION";

export class SnapshotRepositoryError extends Error {
  readonly code: SnapshotRepositoryErrorCode;

  constructor(code: SnapshotRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SnapshotRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSnapshotRecord) {
  return structuredClone(record);
}

function cloneTransitionRecord(record: SnapshotTransitionLogRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function removeIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  const next = current.filter((entry) => entry !== value);
  if (next.length === 0) {
    index.delete(key);
    return;
  }
  index.set(key, next);
}

function stableTransitionId(input: {
  event_code: SnapshotTransitionEventCode;
  row_version: number;
  snapshot_id: string;
  transitioned_at: string;
}) {
  return [
    "snapshot-transition",
    input.snapshot_id,
    input.row_version,
    input.event_code,
    input.transitioned_at,
  ].join(".");
}

function assertImmutableAssembly(
  previous: StoredSnapshotRecord,
  next: StoredSnapshotRecord,
) {
  const previousSnapshot = previous.snapshot;
  const nextSnapshot = next.snapshot;
  const immutableKeys = [
    "analysis_only",
    "candidate_fact_set_hash",
    "candidate_fact_set_ref",
    "canonical_fact_set_hash",
    "canonical_fact_set_ref",
    "completeness",
    "conflict_set_hash",
    "conflict_set_ref",
    "counterfactual_basis",
    "created_at",
    "evidence_item_set_hash",
    "evidence_item_set_ref",
    "execution_mode",
    "manifest_id",
    "non_compliance_config_refs",
    "quality",
    "source_record_set_hash",
    "source_record_set_ref",
  ] as const;

  for (const key of immutableKeys) {
    if (JSON.stringify(previousSnapshot[key]) !== JSON.stringify(nextSnapshot[key])) {
      throw new SnapshotRepositoryError(
        "SNAPSHOT_IMMUTABLE_FIELD_CHANGED",
        `${key} cannot change after snapshot assembly`,
      );
    }
  }
}

function isCurrentSnapshotState(state: SnapshotLifecycleState) {
  return state === "VALID" || state === "WARNED";
}

export class SnapshotRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByLifecycle = new Map<SnapshotLifecycleState, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly snapshots = new Map<string, StoredSnapshotRecord>();
  private readonly transitions = new Map<string, SnapshotTransitionLogRecord[]>();
  private readonly versions = new Map<string, StoredSnapshotRecord[]>();

  private buildStoredRecord(input: {
    persisted_at: string;
    snapshot: SnapshotRecord;
    snapshot_row_version: number;
  }): StoredSnapshotRecord {
    return {
      candidate_fact_set_hash: input.snapshot.candidate_fact_set_hash,
      canonical_fact_set_hash: input.snapshot.canonical_fact_set_hash,
      conflict_set_hash: input.snapshot.conflict_set_hash,
      evidence_item_set_hash: input.snapshot.evidence_item_set_hash,
      lifecycle_state: input.snapshot.lifecycle_state,
      manifest_id: input.snapshot.manifest_id,
      persisted_at: input.persisted_at,
      snapshot: cloneSnapshotRecord(input.snapshot),
      snapshot_id: input.snapshot.snapshot_id,
      snapshot_ref: snapshotRef(input.snapshot),
      snapshot_row_version: input.snapshot_row_version,
      source_record_set_hash: input.snapshot.source_record_set_hash,
      updated_at: input.persisted_at,
    };
  }

  private replaceIndexes(
    previous: StoredSnapshotRecord | null,
    next: StoredSnapshotRecord,
  ) {
    if (!previous) {
      pushIndex(this.idsByManifest, next.manifest_id, next.snapshot_id);
      pushIndex(this.idsByLifecycle, next.lifecycle_state, next.snapshot_id);
      this.idByRef.set(next.snapshot_ref, next.snapshot_id);
      return;
    }

    if (previous.manifest_id !== next.manifest_id || previous.snapshot_ref !== next.snapshot_ref) {
      throw new SnapshotRepositoryError(
        "SNAPSHOT_IMMUTABLE_FIELD_CHANGED",
        "manifest_id and snapshot_ref are immutable after snapshot creation",
      );
    }
    assertImmutableAssembly(previous, next);
    if (previous.lifecycle_state !== next.lifecycle_state) {
      removeIndex(this.idsByLifecycle, previous.lifecycle_state, next.snapshot_id);
      pushIndex(this.idsByLifecycle, next.lifecycle_state, next.snapshot_id);
    }
  }

  private assertNoCurrentCollision(next: StoredSnapshotRecord) {
    if (!isCurrentSnapshotState(next.lifecycle_state)) {
      return;
    }
    const currentCollision = (this.idsByManifest.get(next.manifest_id) ?? [])
      .map((id) => this.snapshots.get(id))
      .find(
        (record): record is StoredSnapshotRecord =>
          record !== undefined &&
          record.snapshot_id !== next.snapshot_id &&
          isCurrentSnapshotState(record.lifecycle_state),
      );
    if (currentCollision) {
      throw new SnapshotRepositoryError(
        "SNAPSHOT_CURRENT_COLLISION",
        `manifest ${next.manifest_id} already has current snapshot ${currentCollision.snapshot_id}; supersede it before validating another current snapshot`,
      );
    }
  }

  private appendVersion(record: StoredSnapshotRecord) {
    const current = this.versions.get(record.snapshot_id) ?? [];
    current.push(cloneStored(record));
    this.versions.set(record.snapshot_id, current);
  }

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.snapshots.get(id))
      .filter((record): record is StoredSnapshotRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistSnapshot(input: { persisted_at: string; snapshot: SnapshotRecord }) {
    const snapshot = normalizeSnapshotRecord(input.snapshot);
    const existing = this.snapshots.get(snapshot.snapshot_id);
    if (existing) {
      if (JSON.stringify(existing.snapshot) !== JSON.stringify(snapshot)) {
        throw new SnapshotRepositoryError(
          "SNAPSHOT_DUPLICATE",
          `snapshot ${snapshot.snapshot_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = snapshotRef(snapshot);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined) {
      throw new SnapshotRepositoryError(
        "SNAPSHOT_REF_COLLISION",
        `snapshot ref ${ref} already belongs to ${refOwner}`,
      );
    }

    const stored = this.buildStoredRecord({
      persisted_at: input.persisted_at,
      snapshot,
      snapshot_row_version: 1,
    });
    this.assertNoCurrentCollision(stored);
    this.snapshots.set(stored.snapshot_id, cloneStored(stored));
    this.replaceIndexes(null, stored);
    this.appendVersion(stored);
    return cloneStored(stored);
  }

  async getSnapshotById(snapshotId: string) {
    const stored = this.snapshots.get(snapshotId);
    return stored ? cloneStored(stored) : null;
  }

  async getSnapshotByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id ? this.getSnapshotById(id) : null;
  }

  async requireSnapshotById(snapshotId: string) {
    const stored = await this.getSnapshotById(snapshotId);
    if (!stored) {
      throw new SnapshotRepositoryError(
        "SNAPSHOT_NOT_FOUND",
        `snapshot ${snapshotId} does not exist`,
      );
    }
    return stored;
  }

  async listSnapshotsByLifecycleState(lifecycleState: SnapshotLifecycleState) {
    return this.listByIds(this.idsByLifecycle.get(lifecycleState) ?? []);
  }

  async listSnapshotsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async compareAndSwapSnapshot(input: {
    expected_snapshot_row_version: number;
    next_snapshot: SnapshotRecord;
    persisted_at: string;
    transition?: {
      event_code: SnapshotTransitionEventCode;
      from_lifecycle_state: SnapshotLifecycleState | null;
      to_lifecycle_state: SnapshotLifecycleState;
      transition_audit_ref: string;
      transitioned_at: string;
    };
  }) {
    const existing = this.snapshots.get(input.next_snapshot.snapshot_id);
    if (!existing) {
      throw new SnapshotRepositoryError(
        "SNAPSHOT_NOT_FOUND",
        `snapshot ${input.next_snapshot.snapshot_id} does not exist`,
      );
    }
    if (existing.snapshot_row_version !== input.expected_snapshot_row_version) {
      throw new SnapshotRepositoryError(
        "SNAPSHOT_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_snapshot_row_version} but found ${existing.snapshot_row_version}`,
      );
    }

    const snapshot = normalizeSnapshotRecord(input.next_snapshot);
    const next = this.buildStoredRecord({
      persisted_at: input.persisted_at,
      snapshot,
      snapshot_row_version: existing.snapshot_row_version + 1,
    });
    this.assertNoCurrentCollision(next);
    this.replaceIndexes(existing, next);
    this.snapshots.set(next.snapshot_id, cloneStored(next));
    this.appendVersion(next);

    if (input.transition) {
      const transition: SnapshotTransitionLogRecord = {
        event_code: input.transition.event_code,
        from_lifecycle_state: input.transition.from_lifecycle_state,
        snapshot_id: next.snapshot_id,
        snapshot_row_version: next.snapshot_row_version,
        to_lifecycle_state: input.transition.to_lifecycle_state,
        transition_audit_ref: input.transition.transition_audit_ref,
        transition_id: stableTransitionId({
          event_code: input.transition.event_code,
          row_version: next.snapshot_row_version,
          snapshot_id: next.snapshot_id,
          transitioned_at: input.transition.transitioned_at,
        }),
        transitioned_at: input.transition.transitioned_at,
      };
      const current = this.transitions.get(next.snapshot_id) ?? [];
      current.push(transition);
      current.sort((left, right) => left.transitioned_at.localeCompare(right.transitioned_at));
      this.transitions.set(next.snapshot_id, current);
    }

    return cloneStored(next);
  }

  async listSnapshotVersions(snapshotId: string) {
    return (this.versions.get(snapshotId) ?? []).map((record) => cloneStored(record));
  }

  async listTransitions(snapshotId: string) {
    return (this.transitions.get(snapshotId) ?? []).map((record) =>
      cloneTransitionRecord(record),
    );
  }
}
