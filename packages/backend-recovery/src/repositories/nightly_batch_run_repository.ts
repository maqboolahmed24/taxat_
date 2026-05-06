import {
  assertNightlyBatchRun,
  cloneNightlyBatchRun,
  nightlyBatchRunRef,
  type NightlyBatchRunLifecycleState,
  type NightlyBatchRunRecord,
} from "../models/nightly_batch_run.ts";

export type StoredNightlyBatchRunRecord = {
  batch_run_id: string;
  nightly_batch_run_ref: string;
  tenant_id: string;
  nightly_window_key: string;
  scheduler_dedupe_key: string;
  lifecycle_state: NightlyBatchRunLifecycleState;
  nightly_batch_run_row_version: number;
  persisted_at: string;
  updated_at: string;
  nightly_batch_run: NightlyBatchRunRecord;
};

export type NightlyBatchRunRepositoryErrorCode =
  | "NIGHTLY_BATCH_RUN_DUPLICATE"
  | "NIGHTLY_BATCH_RUN_IMMUTABLE_IDENTITY_DRIFT"
  | "NIGHTLY_BATCH_RUN_NOT_FOUND"
  | "NIGHTLY_BATCH_RUN_ROW_VERSION_CONFLICT"
  | "NIGHTLY_BATCH_RUN_REF_COLLISION"
  | "NIGHTLY_BATCH_RUN_SAME_WINDOW_ACTIVE_CONFLICT"
  | "NIGHTLY_BATCH_RUN_SCHEDULER_DEDUPE_COLLISION";

export class NightlyBatchRunRepositoryError extends Error {
  readonly code: NightlyBatchRunRepositoryErrorCode;

  constructor(code: NightlyBatchRunRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "NightlyBatchRunRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredNightlyBatchRunRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, batchRunId: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(batchRunId)) {
    current.push(batchRunId);
    index.set(key, current);
  }
}

function tenantWindowKey(batch: Pick<NightlyBatchRunRecord, "tenant_id" | "nightly_window_key">) {
  return `${batch.tenant_id}|${batch.nightly_window_key}`;
}

function isAbandoned(batch: NightlyBatchRunRecord) {
  return batch.lifecycle_state === "ABANDONED";
}

function sortStored(left: StoredNightlyBatchRunRecord, right: StoredNightlyBatchRunRecord) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.nightly_window_key.localeCompare(right.nightly_window_key) ||
    left.batch_run_id.localeCompare(right.batch_run_id)
  );
}

function immutableIdentityTuple(batch: NightlyBatchRunRecord) {
  return JSON.stringify({
    batch_run_id: batch.batch_run_id,
    tenant_id: batch.tenant_id,
    nightly_window_key: batch.nightly_window_key,
    trigger_class: batch.trigger_class,
    reclaimed_predecessor_batch_run_ref: batch.reclaimed_predecessor_batch_run_ref,
    scheduler_dedupe_key: batch.scheduler_dedupe_key,
    scheduled_for: batch.scheduled_for,
    trigger_observed_at: batch.trigger_observed_at,
    initiating_principal_context_ref: batch.initiating_principal_context_ref,
    policy_snapshot_hash: batch.policy_snapshot_hash,
    autopilot_policy_hash: batch.autopilot_policy_hash,
    release_verification_manifest_ref: batch.release_verification_manifest_ref,
    schema_bundle_hash: batch.schema_bundle_hash,
    code_build_id: batch.code_build_id,
    environment_ref: batch.environment_ref,
    selection_universe_hash: batch.selection_universe_hash,
    selection_universe_count: batch.selection_universe_count,
    recovery_resume_state: batch.recovery_resume_state,
    identity_contract_hash: batch.identity_contract.identity_contract_hash,
  });
}

export class NightlyBatchRunRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idBySchedulerDedupeKey = new Map<string, string>();
  private readonly idsByTenantWindow = new Map<string, string[]>();
  private readonly records = new Map<string, StoredNightlyBatchRunRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idBySchedulerDedupeKey.clear();
    this.idsByTenantWindow.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.nightly_batch_run_ref, stored.batch_run_id);
      this.idBySchedulerDedupeKey.set(stored.scheduler_dedupe_key, stored.batch_run_id);
      pushIndex(
        this.idsByTenantWindow,
        tenantWindowKey(stored.nightly_batch_run),
        stored.batch_run_id,
      );
    }
  }

  private buildStoredRecord(input: {
    batch_run: NightlyBatchRunRecord;
    persisted_at: string;
    row_version: number;
    previous_persisted_at?: string;
  }): StoredNightlyBatchRunRecord {
    const batch = cloneNightlyBatchRun(input.batch_run);
    return {
      batch_run_id: batch.batch_run_id,
      nightly_batch_run_ref: nightlyBatchRunRef(batch),
      tenant_id: batch.tenant_id,
      nightly_window_key: batch.nightly_window_key,
      scheduler_dedupe_key: batch.scheduler_dedupe_key,
      lifecycle_state: batch.lifecycle_state,
      nightly_batch_run_row_version: input.row_version,
      persisted_at: input.previous_persisted_at ?? input.persisted_at,
      updated_at: input.persisted_at,
      nightly_batch_run: batch,
    };
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredNightlyBatchRunRecord => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneStored(record));
  }

  private assertNoActiveWindowConflict(batch: NightlyBatchRunRecord) {
    if (isAbandoned(batch)) {
      return;
    }
    const ids = this.idsByTenantWindow.get(tenantWindowKey(batch)) ?? [];
    const conflicting = ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredNightlyBatchRunRecord => record !== undefined)
      .find(
        (record) =>
          record.batch_run_id !== batch.batch_run_id && !isAbandoned(record.nightly_batch_run),
      );
    if (conflicting) {
      throw new NightlyBatchRunRepositoryError(
        "NIGHTLY_BATCH_RUN_SAME_WINDOW_ACTIVE_CONFLICT",
        `tenant/window ${batch.tenant_id}/${batch.nightly_window_key} already has active batch ${conflicting.batch_run_id}`,
      );
    }
  }

  async persistNightlyBatchRun(input: {
    batch_run: NightlyBatchRunRecord;
    persisted_at: string;
  }) {
    const batch = assertNightlyBatchRun(input.batch_run);
    const existing = this.records.get(batch.batch_run_id);
    if (existing) {
      if (JSON.stringify(existing.nightly_batch_run) !== JSON.stringify(batch)) {
        throw new NightlyBatchRunRepositoryError(
          "NIGHTLY_BATCH_RUN_DUPLICATE",
          `batch ${batch.batch_run_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = nightlyBatchRunRef(batch);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== batch.batch_run_id) {
      throw new NightlyBatchRunRepositoryError(
        "NIGHTLY_BATCH_RUN_REF_COLLISION",
        `nightly batch ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const dedupeOwner = this.idBySchedulerDedupeKey.get(batch.scheduler_dedupe_key);
    if (dedupeOwner !== undefined && dedupeOwner !== batch.batch_run_id) {
      throw new NightlyBatchRunRepositoryError(
        "NIGHTLY_BATCH_RUN_SCHEDULER_DEDUPE_COLLISION",
        `scheduler dedupe key ${batch.scheduler_dedupe_key} already belongs to ${dedupeOwner}`,
      );
    }

    this.assertNoActiveWindowConflict(batch);
    const stored = this.buildStoredRecord({
      batch_run: batch,
      persisted_at: input.persisted_at,
      row_version: 1,
    });
    this.records.set(stored.batch_run_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async upsertNightlyBatchRun(input: {
    batch_run: NightlyBatchRunRecord;
    persisted_at: string;
  }) {
    const batch = assertNightlyBatchRun(input.batch_run);
    const existing = this.records.get(batch.batch_run_id);
    if (!existing) {
      return this.persistNightlyBatchRun(input);
    }
    if (immutableIdentityTuple(existing.nightly_batch_run) !== immutableIdentityTuple(batch)) {
      throw new NightlyBatchRunRepositoryError(
        "NIGHTLY_BATCH_RUN_IMMUTABLE_IDENTITY_DRIFT",
        `batch ${batch.batch_run_id} immutable identity fields changed`,
      );
    }
    this.assertNoActiveWindowConflict(batch);
    const stored = this.buildStoredRecord({
      batch_run: batch,
      persisted_at: input.persisted_at,
      previous_persisted_at: existing.persisted_at,
      row_version: existing.nightly_batch_run_row_version + 1,
    });
    this.records.set(stored.batch_run_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async upsertNightlyBatchRunIfRowVersion(input: {
    batch_run: NightlyBatchRunRecord;
    expected_row_version: number;
    persisted_at: string;
  }) {
    const existing = this.records.get(input.batch_run.batch_run_id);
    if (!existing) {
      throw new NightlyBatchRunRepositoryError(
        "NIGHTLY_BATCH_RUN_NOT_FOUND",
        `batch ${input.batch_run.batch_run_id} does not exist`,
      );
    }
    if (existing.nightly_batch_run_row_version !== input.expected_row_version) {
      throw new NightlyBatchRunRepositoryError(
        "NIGHTLY_BATCH_RUN_ROW_VERSION_CONFLICT",
        `batch ${input.batch_run.batch_run_id} row version ${existing.nightly_batch_run_row_version} did not match expected ${input.expected_row_version}`,
      );
    }
    return this.upsertNightlyBatchRun({
      batch_run: input.batch_run,
      persisted_at: input.persisted_at,
    });
  }

  async getNightlyBatchRunById(batchRunId: string) {
    const stored = this.records.get(batchRunId);
    if (!stored) {
      throw new NightlyBatchRunRepositoryError(
        "NIGHTLY_BATCH_RUN_NOT_FOUND",
        `batch ${batchRunId} does not exist`,
      );
    }
    return cloneStored(stored);
  }

  async findNightlyBatchRunById(batchRunId: string) {
    const stored = this.records.get(batchRunId);
    return stored ? cloneStored(stored) : null;
  }

  async findNightlyBatchRunByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id === undefined ? null : cloneStored(this.records.get(id)!);
  }

  async findNightlyBatchRunBySchedulerDedupeKey(schedulerDedupeKey: string) {
    const id = this.idBySchedulerDedupeKey.get(schedulerDedupeKey);
    return id === undefined ? null : cloneStored(this.records.get(id)!);
  }

  async listNightlyBatchRunsByTenantWindow(input: {
    tenant_id: string;
    nightly_window_key: string;
  }) {
    return this.listByIds(
      this.idsByTenantWindow.get(
        tenantWindowKey({
          tenant_id: input.tenant_id,
          nightly_window_key: input.nightly_window_key,
        }),
      ) ?? [],
    );
  }

  async countNightlyBatchRuns() {
    return this.records.size;
  }
}
