import {
  cloneSourceCollectionRunRecord,
  normalizeSourceCollectionRunRecord,
  type SourceCollectionRunLifecycleState,
  type SourceCollectionRunRecord,
  type SourceCollectionRunTransitionEventCode,
} from "../models/source_collection_run.ts";

export type StoredSourceCollectionRunRecord = {
  collection_run: SourceCollectionRunRecord;
  collection_run_id: string;
  fetch_audit_refs: string[];
  lifecycle_state: SourceCollectionRunLifecycleState;
  manifest_id: string;
  partial_gap_refs: string[];
  persisted_at: string;
  source_collection_run_row_version: number;
  source_window_ref: string;
  updated_at: string;
};

export type SourceCollectionRunTransitionLogRecord = {
  collection_run_id: string;
  event_code: SourceCollectionRunTransitionEventCode;
  from_lifecycle_state: SourceCollectionRunLifecycleState | null;
  source_collection_run_row_version: number;
  to_lifecycle_state: SourceCollectionRunLifecycleState;
  transition_audit_ref: string;
  transition_id: string;
  transitioned_at: string;
};

export type SourceCollectionRunRepositoryErrorCode =
  | "SOURCE_COLLECTION_RUN_COMPARE_AND_SWAP_CONFLICT"
  | "SOURCE_COLLECTION_RUN_DUPLICATE"
  | "SOURCE_COLLECTION_RUN_IMMUTABLE_FIELD_CHANGED"
  | "SOURCE_COLLECTION_RUN_MANIFEST_COLLISION"
  | "SOURCE_COLLECTION_RUN_NOT_FOUND"
  | "SOURCE_COLLECTION_RUN_SOURCE_WINDOW_REF_COLLISION";

export class SourceCollectionRunRepositoryError extends Error {
  readonly code: SourceCollectionRunRepositoryErrorCode;

  constructor(code: SourceCollectionRunRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceCollectionRunRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSourceCollectionRunRecord) {
  return structuredClone(record);
}

function cloneTransitionRecord(record: SourceCollectionRunTransitionLogRecord) {
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
  collection_run_id: string;
  event_code: SourceCollectionRunTransitionEventCode;
  row_version: number;
  transitioned_at: string;
}) {
  return [
    "source-collection-run-transition",
    input.collection_run_id,
    input.row_version,
    input.event_code,
    input.transitioned_at,
  ].join(".");
}

export class SourceCollectionRunRepository {
  private readonly idBySourceWindowRef = new Map<string, string>();
  private readonly idsByLifecycle = new Map<SourceCollectionRunLifecycleState, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly runs = new Map<string, StoredSourceCollectionRunRecord>();
  private readonly transitions = new Map<string, SourceCollectionRunTransitionLogRecord[]>();

  private buildStoredRecord(input: {
    collection_run: SourceCollectionRunRecord;
    persisted_at: string;
    source_collection_run_row_version: number;
  }): StoredSourceCollectionRunRecord {
    return {
      collection_run: cloneSourceCollectionRunRecord(input.collection_run),
      collection_run_id: input.collection_run.collection_run_id,
      fetch_audit_refs: [...input.collection_run.fetch_audit_refs],
      lifecycle_state: input.collection_run.lifecycle_state,
      manifest_id: input.collection_run.manifest_id,
      partial_gap_refs: [...input.collection_run.partial_gap_refs],
      persisted_at: input.persisted_at,
      source_collection_run_row_version: input.source_collection_run_row_version,
      source_window_ref: input.collection_run.source_window_ref,
      updated_at: input.persisted_at,
    };
  }

  private replaceIndexes(
    previous: StoredSourceCollectionRunRecord | null,
    next: StoredSourceCollectionRunRecord,
  ) {
    if (!previous) {
      pushIndex(this.idsByManifest, next.manifest_id, next.collection_run_id);
      pushIndex(this.idsByLifecycle, next.lifecycle_state, next.collection_run_id);
      this.idBySourceWindowRef.set(next.source_window_ref, next.collection_run_id);
      return;
    }

    if (
      previous.manifest_id !== next.manifest_id ||
      previous.source_window_ref !== next.source_window_ref
    ) {
      throw new SourceCollectionRunRepositoryError(
        "SOURCE_COLLECTION_RUN_IMMUTABLE_FIELD_CHANGED",
        "manifest_id and source_window_ref are immutable after collection-run creation",
      );
    }

    if (previous.lifecycle_state !== next.lifecycle_state) {
      removeIndex(this.idsByLifecycle, previous.lifecycle_state, next.collection_run_id);
      pushIndex(this.idsByLifecycle, next.lifecycle_state, next.collection_run_id);
    }
  }

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.runs.get(id))
      .filter((record): record is StoredSourceCollectionRunRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async createSourceCollectionRun(input: {
    collection_run: SourceCollectionRunRecord;
    persisted_at: string;
  }) {
    const collectionRun = normalizeSourceCollectionRunRecord(input.collection_run);
    const existing = this.runs.get(collectionRun.collection_run_id);
    if (existing) {
      if (JSON.stringify(existing.collection_run) !== JSON.stringify(collectionRun)) {
        throw new SourceCollectionRunRepositoryError(
          "SOURCE_COLLECTION_RUN_DUPLICATE",
          `collection run ${collectionRun.collection_run_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const manifestCollision = (this.idsByManifest.get(collectionRun.manifest_id) ?? [])
      .map((id) => this.runs.get(id))
      .find((record): record is StoredSourceCollectionRunRecord => record !== undefined);
    if (manifestCollision) {
      throw new SourceCollectionRunRepositoryError(
        "SOURCE_COLLECTION_RUN_MANIFEST_COLLISION",
        `manifest ${collectionRun.manifest_id} already has collection run ${manifestCollision.collection_run_id}`,
      );
    }

    const sourceWindowRefCollision = this.idBySourceWindowRef.get(collectionRun.source_window_ref);
    if (sourceWindowRefCollision) {
      throw new SourceCollectionRunRepositoryError(
        "SOURCE_COLLECTION_RUN_SOURCE_WINDOW_REF_COLLISION",
        `source window ref ${collectionRun.source_window_ref} already belongs to ${sourceWindowRefCollision}`,
      );
    }

    const stored = this.buildStoredRecord({
      collection_run: collectionRun,
      persisted_at: input.persisted_at,
      source_collection_run_row_version: 1,
    });
    this.runs.set(stored.collection_run_id, cloneStored(stored));
    this.replaceIndexes(null, stored);
    return cloneStored(stored);
  }

  async getSourceCollectionRunById(collectionRunId: string) {
    const stored = this.runs.get(collectionRunId);
    return stored ? cloneStored(stored) : null;
  }

  async getSourceCollectionRunByManifestId(manifestId: string) {
    const records = this.listByIds(this.idsByManifest.get(manifestId) ?? []);
    return records.at(-1) ?? null;
  }

  async getSourceCollectionRunBySourceWindowRef(sourceWindowRef: string) {
    const id = this.idBySourceWindowRef.get(sourceWindowRef);
    return id ? this.getSourceCollectionRunById(id) : null;
  }

  async requireSourceCollectionRunById(collectionRunId: string) {
    const stored = await this.getSourceCollectionRunById(collectionRunId);
    if (!stored) {
      throw new SourceCollectionRunRepositoryError(
        "SOURCE_COLLECTION_RUN_NOT_FOUND",
        `source collection run ${collectionRunId} does not exist`,
      );
    }
    return stored;
  }

  async listSourceCollectionRunsByLifecycleState(
    lifecycleState: SourceCollectionRunLifecycleState,
  ) {
    return this.listByIds(this.idsByLifecycle.get(lifecycleState) ?? []);
  }

  async compareAndSwapSourceCollectionRun(input: {
    expected_source_collection_run_row_version: number;
    next_collection_run: SourceCollectionRunRecord;
    persisted_at: string;
    transition?: {
      event_code: SourceCollectionRunTransitionEventCode;
      from_lifecycle_state: SourceCollectionRunLifecycleState | null;
      to_lifecycle_state: SourceCollectionRunLifecycleState;
      transition_audit_ref: string;
      transitioned_at: string;
    };
  }) {
    const existing = this.runs.get(input.next_collection_run.collection_run_id);
    if (!existing) {
      throw new SourceCollectionRunRepositoryError(
        "SOURCE_COLLECTION_RUN_NOT_FOUND",
        `source collection run ${input.next_collection_run.collection_run_id} does not exist`,
      );
    }
    if (
      existing.source_collection_run_row_version !==
      input.expected_source_collection_run_row_version
    ) {
      throw new SourceCollectionRunRepositoryError(
        "SOURCE_COLLECTION_RUN_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_source_collection_run_row_version} but found ${existing.source_collection_run_row_version}`,
      );
    }

    const collectionRun = normalizeSourceCollectionRunRecord(input.next_collection_run);
    const next = this.buildStoredRecord({
      collection_run: collectionRun,
      persisted_at: input.persisted_at,
      source_collection_run_row_version: existing.source_collection_run_row_version + 1,
    });
    this.replaceIndexes(existing, next);
    this.runs.set(next.collection_run_id, cloneStored(next));

    if (input.transition) {
      const transition: SourceCollectionRunTransitionLogRecord = {
        collection_run_id: next.collection_run_id,
        event_code: input.transition.event_code,
        from_lifecycle_state: input.transition.from_lifecycle_state,
        source_collection_run_row_version: next.source_collection_run_row_version,
        to_lifecycle_state: input.transition.to_lifecycle_state,
        transition_audit_ref: input.transition.transition_audit_ref,
        transition_id: stableTransitionId({
          collection_run_id: next.collection_run_id,
          event_code: input.transition.event_code,
          row_version: next.source_collection_run_row_version,
          transitioned_at: input.transition.transitioned_at,
        }),
        transitioned_at: input.transition.transitioned_at,
      };
      const current = this.transitions.get(next.collection_run_id) ?? [];
      current.push(transition);
      current.sort((left, right) => left.transitioned_at.localeCompare(right.transitioned_at));
      this.transitions.set(next.collection_run_id, current);
    }

    return cloneStored(next);
  }

  async listTransitions(collectionRunId: string) {
    return (this.transitions.get(collectionRunId) ?? []).map((record) =>
      cloneTransitionRecord(record),
    );
  }
}
