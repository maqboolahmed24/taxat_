import {
  cloneComputeResultRecord,
  computeResultRef,
  normalizeComputeResultRecord,
  type ComputeResultLifecycleState,
  type ComputeResultRecord,
} from "../models/compute_result.ts";
import {
  stableComputeTransitionId,
  type ComputeResultTransitionEventCode,
  type ComputeResultTransitionRecord,
} from "../services/transition_compute_result.ts";

export type StoredComputeResultRecord = {
  compute_id: string;
  compute_ref: string;
  compute_result: ComputeResultRecord;
  compute_result_row_version: number;
  lifecycle_state: ComputeResultLifecycleState;
  manifest_id: string;
  persisted_at: string;
  reporting_scope: string;
  rule_version_ref: string;
  updated_at: string;
};

export type ComputeResultRepositoryErrorCode =
  | "COMPUTE_RESULT_COMPARE_AND_SWAP_CONFLICT"
  | "COMPUTE_RESULT_DUPLICATE"
  | "COMPUTE_RESULT_NOT_FOUND"
  | "COMPUTE_RESULT_REF_COLLISION";

export class ComputeResultRepositoryError extends Error {
  readonly code: ComputeResultRepositoryErrorCode;

  constructor(code: ComputeResultRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ComputeResultRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredComputeResultRecord) {
  return structuredClone(record);
}

function cloneTransition(record: ComputeResultTransitionRecord) {
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

export class ComputeResultRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByLifecycle = new Map<ComputeResultLifecycleState, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByReportingScope = new Map<string, string[]>();
  private readonly records = new Map<string, StoredComputeResultRecord>();
  private readonly transitions = new Map<string, ComputeResultTransitionRecord[]>();
  private readonly versions = new Map<string, StoredComputeResultRecord[]>();

  private buildStored(input: {
    compute_result: ComputeResultRecord;
    compute_result_row_version: number;
    persisted_at: string;
  }): StoredComputeResultRecord {
    return {
      compute_id: input.compute_result.compute_id,
      compute_ref: computeResultRef(input.compute_result),
      compute_result: cloneComputeResultRecord(input.compute_result),
      compute_result_row_version: input.compute_result_row_version,
      lifecycle_state: input.compute_result.lifecycle_state,
      manifest_id: input.compute_result.manifest_id,
      persisted_at: input.persisted_at,
      reporting_scope: input.compute_result.reporting_scope,
      rule_version_ref: input.compute_result.rule_version_ref,
      updated_at: input.persisted_at,
    };
  }

  private replaceIndexes(
    previous: StoredComputeResultRecord | null,
    next: StoredComputeResultRecord,
  ) {
    if (!previous) {
      pushIndex(this.idsByManifest, next.manifest_id, next.compute_id);
      pushIndex(this.idsByLifecycle, next.lifecycle_state, next.compute_id);
      pushIndex(
        this.idsByReportingScope,
        `${next.manifest_id}::${next.reporting_scope}`,
        next.compute_id,
      );
      this.idByRef.set(next.compute_ref, next.compute_id);
      return;
    }
    if (previous.lifecycle_state !== next.lifecycle_state) {
      removeIndex(this.idsByLifecycle, previous.lifecycle_state, next.compute_id);
      pushIndex(this.idsByLifecycle, next.lifecycle_state, next.compute_id);
    }
  }

  private appendVersion(record: StoredComputeResultRecord) {
    const versions = this.versions.get(record.compute_id) ?? [];
    versions.push(cloneStored(record));
    this.versions.set(record.compute_id, versions);
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredComputeResultRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistComputeResult(input: {
    compute_result: ComputeResultRecord;
    persisted_at: string;
  }) {
    const computeResult = normalizeComputeResultRecord(input.compute_result);
    const existing = this.records.get(computeResult.compute_id);
    if (existing) {
      if (JSON.stringify(existing.compute_result) !== JSON.stringify(computeResult)) {
        throw new ComputeResultRepositoryError(
          "COMPUTE_RESULT_DUPLICATE",
          `compute result ${computeResult.compute_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const ref = computeResultRef(computeResult);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined) {
      throw new ComputeResultRepositoryError(
        "COMPUTE_RESULT_REF_COLLISION",
        `compute result ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const stored = this.buildStored({
      compute_result: computeResult,
      compute_result_row_version: 1,
      persisted_at: input.persisted_at,
    });
    this.records.set(stored.compute_id, cloneStored(stored));
    this.replaceIndexes(null, stored);
    this.appendVersion(stored);
    return cloneStored(stored);
  }

  async getComputeResultById(computeId: string) {
    const stored = this.records.get(computeId);
    return stored ? cloneStored(stored) : null;
  }

  async getComputeResultByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id === undefined ? null : this.getComputeResultById(id);
  }

  async requireComputeResultById(computeId: string) {
    const stored = await this.getComputeResultById(computeId);
    if (!stored) {
      throw new ComputeResultRepositoryError(
        "COMPUTE_RESULT_NOT_FOUND",
        `compute result ${computeId} does not exist`,
      );
    }
    return stored;
  }

  async listComputeResultsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listComputeResultsByLifecycleState(lifecycleState: ComputeResultLifecycleState) {
    return this.listByIds(this.idsByLifecycle.get(lifecycleState) ?? []);
  }

  async listComputeResultsByReportingScope(input: {
    manifest_id: string;
    reporting_scope: string;
  }) {
    return this.listByIds(
      this.idsByReportingScope.get(`${input.manifest_id}::${input.reporting_scope}`) ?? [],
    );
  }

  async compareAndSwapComputeResult(input: {
    expected_compute_result_row_version: number;
    next_compute_result: ComputeResultRecord;
    persisted_at: string;
    transition?: {
      event_code: ComputeResultTransitionEventCode;
      from_lifecycle_state: ComputeResultLifecycleState | null;
      to_lifecycle_state: ComputeResultLifecycleState;
      transition_audit_ref: string;
      transitioned_at: string;
    };
  }) {
    const existing = this.records.get(input.next_compute_result.compute_id);
    if (!existing) {
      throw new ComputeResultRepositoryError(
        "COMPUTE_RESULT_NOT_FOUND",
        `compute result ${input.next_compute_result.compute_id} does not exist`,
      );
    }
    if (existing.compute_result_row_version !== input.expected_compute_result_row_version) {
      throw new ComputeResultRepositoryError(
        "COMPUTE_RESULT_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_compute_result_row_version} but found ${existing.compute_result_row_version}`,
      );
    }
    const computeResult = normalizeComputeResultRecord(input.next_compute_result);
    const stored = this.buildStored({
      compute_result: computeResult,
      compute_result_row_version: existing.compute_result_row_version + 1,
      persisted_at: input.persisted_at,
    });
    this.records.set(stored.compute_id, cloneStored(stored));
    this.replaceIndexes(existing, stored);
    this.appendVersion(stored);

    if (input.transition) {
      const transition: ComputeResultTransitionRecord = {
        compute_id: stored.compute_id,
        compute_result_row_version: stored.compute_result_row_version,
        event_code: input.transition.event_code,
        from_lifecycle_state: input.transition.from_lifecycle_state,
        to_lifecycle_state: input.transition.to_lifecycle_state,
        transition_audit_ref: input.transition.transition_audit_ref,
        transition_id: stableComputeTransitionId({
          compute_id: stored.compute_id,
          event_code: input.transition.event_code,
          row_version: stored.compute_result_row_version,
          transitioned_at: input.transition.transitioned_at,
        }),
        transitioned_at: input.transition.transitioned_at,
      };
      const transitions = this.transitions.get(stored.compute_id) ?? [];
      transitions.push(transition);
      transitions.sort((left, right) => left.transitioned_at.localeCompare(right.transitioned_at));
      this.transitions.set(stored.compute_id, transitions);
    }

    return cloneStored(stored);
  }

  async listComputeResultVersions(computeId: string) {
    return (this.versions.get(computeId) ?? []).map((record) => cloneStored(record));
  }

  async listTransitions(computeId: string) {
    return (this.transitions.get(computeId) ?? []).map((record) => cloneTransition(record));
  }
}
