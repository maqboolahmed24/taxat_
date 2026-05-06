import {
  cloneParityResultRecord,
  normalizeParityResultRecord,
  parityResultRef,
  type ParityClassification,
  type ParityLifecycleState,
  type ParityResultExecutionMode,
  type ParityResultRecord,
} from "../models/parity_result.ts";

export type StoredParityResultRecord = {
  comparison_basis_ref: string | null;
  execution_mode: ParityResultExecutionMode;
  lifecycle_state: ParityLifecycleState;
  manifest_id: string;
  parity_classification: ParityClassification | null;
  parity_id: string;
  parity_ref: string;
  parity_result: ParityResultRecord;
  parity_result_row_version: number;
  parity_threshold_profile_ref: string | null;
  persisted_at: string;
};

export class ParityResultRepositoryError extends Error {
  readonly code:
    | "PARITY_RESULT_DUPLICATE"
    | "PARITY_RESULT_NOT_FOUND"
    | "PARITY_RESULT_REF_COLLISION"
    | "PARITY_RESULT_STALE_WRITE";

  constructor(code: ParityResultRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ParityResultRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredParityResultRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string | null, value: string) {
  if (key === null) {
    return;
  }
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ParityResultRepository {
  private readonly idByRef = new Map<string, string>();
  private idsByBasis = new Map<string, string[]>();
  private idsByClassification = new Map<string, string[]>();
  private idsByExecutionMode = new Map<string, string[]>();
  private idsByLifecycle = new Map<string, string[]>();
  private idsByManifest = new Map<string, string[]>();
  private idsByProfile = new Map<string, string[]>();
  private readonly records = new Map<string, StoredParityResultRecord>();

  private buildStored(input: {
    parity_result: ParityResultRecord;
    parity_result_row_version: number;
    persisted_at: string;
  }): StoredParityResultRecord {
    return {
      comparison_basis_ref: input.parity_result.comparison_basis_ref,
      execution_mode: input.parity_result.execution_mode,
      lifecycle_state: input.parity_result.lifecycle_state,
      manifest_id: input.parity_result.manifest_id,
      parity_classification: input.parity_result.parity_classification,
      parity_id: input.parity_result.parity_id,
      parity_ref: parityResultRef(input.parity_result),
      parity_result: cloneParityResultRecord(input.parity_result),
      parity_result_row_version: input.parity_result_row_version,
      parity_threshold_profile_ref: input.parity_result.parity_threshold_profile_ref,
      persisted_at: input.persisted_at,
    };
  }

  private rebuildIndexes() {
    this.idsByBasis = new Map();
    this.idsByClassification = new Map();
    this.idsByExecutionMode = new Map();
    this.idsByLifecycle = new Map();
    this.idsByManifest = new Map();
    this.idsByProfile = new Map();
    this.idByRef.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.parity_ref, stored.parity_id);
      pushIndex(this.idsByBasis, stored.comparison_basis_ref, stored.parity_id);
      pushIndex(this.idsByClassification, stored.parity_classification, stored.parity_id);
      pushIndex(this.idsByExecutionMode, stored.execution_mode, stored.parity_id);
      pushIndex(this.idsByLifecycle, stored.lifecycle_state, stored.parity_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.parity_id);
      pushIndex(this.idsByProfile, stored.parity_threshold_profile_ref, stored.parity_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredParityResultRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistParityResult(input: {
    parity_result: ParityResultRecord;
    persisted_at: string;
  }) {
    const parityResult = normalizeParityResultRecord(input.parity_result);
    const existing = this.records.get(parityResult.parity_id);
    if (existing) {
      if (JSON.stringify(existing.parity_result) !== JSON.stringify(parityResult)) {
        throw new ParityResultRepositoryError(
          "PARITY_RESULT_DUPLICATE",
          `parity result ${parityResult.parity_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const ref = parityResultRef(parityResult);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined) {
      throw new ParityResultRepositoryError(
        "PARITY_RESULT_REF_COLLISION",
        `parity result ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const stored = this.buildStored({
      parity_result: parityResult,
      parity_result_row_version: 1,
      persisted_at: input.persisted_at,
    });
    this.records.set(stored.parity_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async compareAndSwapParityResult(input: {
    expected_row_version: number;
    parity_id: string;
    parity_result: ParityResultRecord;
    persisted_at: string;
  }) {
    const existing = this.records.get(input.parity_id);
    if (!existing) {
      throw new ParityResultRepositoryError(
        "PARITY_RESULT_NOT_FOUND",
        `parity result ${input.parity_id} does not exist`,
      );
    }
    if (existing.parity_result_row_version !== input.expected_row_version) {
      throw new ParityResultRepositoryError(
        "PARITY_RESULT_STALE_WRITE",
        `parity result ${input.parity_id} row version is ${existing.parity_result_row_version}`,
      );
    }
    const parityResult = normalizeParityResultRecord(input.parity_result);
    if (parityResult.parity_id !== input.parity_id) {
      throw new ParityResultRepositoryError(
        "PARITY_RESULT_REF_COLLISION",
        "compare-and-swap cannot replace a parity result with a different parity_id",
      );
    }
    const stored = this.buildStored({
      parity_result: parityResult,
      parity_result_row_version: existing.parity_result_row_version + 1,
      persisted_at: input.persisted_at,
    });
    this.records.set(stored.parity_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getParityResultById(parityId: string) {
    const stored = this.records.get(parityId);
    return stored ? cloneStored(stored) : null;
  }

  async getParityResultByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id === undefined ? null : this.getParityResultById(id);
  }

  async requireParityResultById(parityId: string) {
    const stored = await this.getParityResultById(parityId);
    if (!stored) {
      throw new ParityResultRepositoryError(
        "PARITY_RESULT_NOT_FOUND",
        `parity result ${parityId} does not exist`,
      );
    }
    return stored;
  }

  async listParityResultsByBasisRef(comparisonBasisRef: string) {
    return this.listByIds(this.idsByBasis.get(comparisonBasisRef) ?? []);
  }

  async listParityResultsByClassification(classification: ParityClassification) {
    return this.listByIds(this.idsByClassification.get(classification) ?? []);
  }

  async listParityResultsByExecutionMode(executionMode: ParityResultExecutionMode) {
    return this.listByIds(this.idsByExecutionMode.get(executionMode) ?? []);
  }

  async listParityResultsByLifecycleState(lifecycleState: ParityLifecycleState) {
    return this.listByIds(this.idsByLifecycle.get(lifecycleState) ?? []);
  }

  async listParityResultsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listParityResultsByProfileRef(profileRef: string) {
    return this.listByIds(this.idsByProfile.get(profileRef) ?? []);
  }
}
