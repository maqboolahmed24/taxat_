import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertRestoreDrillResultRecord,
  cloneRestoreDrillResultRecord,
  type RestoreDrillOutcome,
  type RestoreDrillResultRecord,
  type RestoreDrillScope,
} from "../models/restore_drill_result.ts";

export type RestoreDrillResultContractSchemaKind = "restore_drill_result";

export type RestoreDrillResultContractSchemaValidator = (
  kind: RestoreDrillResultContractSchemaKind,
  payload: unknown,
) => Promise<void> | void;

export type RestoreDrillResultRepositoryInput = {
  validate_contract_schema: RestoreDrillResultContractSchemaValidator;
};

export type StoredRestoreDrillResultRecord = {
  restore_drill_id: string;
  checkpoint_ref: string;
  candidate_identity_hash: string;
  build_artifact_ref: string;
  drill_scope: RestoreDrillScope;
  outcome: RestoreDrillOutcome;
  executed_at: string;
  restore_drill_result_row_version: number;
  persisted_at: string;
  restore_drill_result: RestoreDrillResultRecord;
};

export type RestoreDrillResultListQuery = {
  checkpoint_ref?: string;
  candidate_identity_hash?: string;
  build_artifact_ref?: string;
  drill_scope?: RestoreDrillScope;
  outcome?: RestoreDrillOutcome;
};

export type RestoreDrillResultRepositoryErrorCode =
  | "RESTORE_DRILL_RESULT_DUPLICATE"
  | "RESTORE_DRILL_RESULT_NOT_FOUND";

export class RestoreDrillResultRepositoryError extends Error {
  readonly code: RestoreDrillResultRepositoryErrorCode;

  constructor(code: RestoreDrillResultRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RestoreDrillResultRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredRestoreDrillResultRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

function sortStoredRestoreDrillResults(
  left: StoredRestoreDrillResultRecord,
  right: StoredRestoreDrillResultRecord,
) {
  return (
    left.candidate_identity_hash.localeCompare(right.candidate_identity_hash) ||
    left.checkpoint_ref.localeCompare(right.checkpoint_ref) ||
    left.executed_at.localeCompare(right.executed_at) ||
    left.restore_drill_id.localeCompare(right.restore_drill_id)
  );
}

export class RestoreDrillResultRepository {
  private readonly validateContractSchema: RestoreDrillResultContractSchemaValidator;
  private readonly restoreDrillResults = new Map<
    string,
    StoredRestoreDrillResultRecord
  >();
  private readonly resultIdsByCheckpointRef = new Map<string, string[]>();
  private readonly resultIdsByCandidateHash = new Map<string, string[]>();
  private readonly resultIdsByBuildArtifactRef = new Map<string, string[]>();

  constructor(input: RestoreDrillResultRepositoryInput) {
    this.validateContractSchema = input.validate_contract_schema;
  }

  private async validateRestoreDrillResult(record: RestoreDrillResultRecord) {
    const normalized = assertRestoreDrillResultRecord(record);
    await this.validateContractSchema("restore_drill_result", normalized);
    return normalized;
  }

  private stored(input: {
    restore_drill_result: RestoreDrillResultRecord;
    persisted_at: string;
  }): StoredRestoreDrillResultRecord {
    const result = assertRestoreDrillResultRecord(input.restore_drill_result);
    return {
      restore_drill_id: result.restore_drill_id,
      checkpoint_ref: result.checkpoint_ref,
      candidate_identity_hash: result.candidate_identity_hash,
      build_artifact_ref: result.build_artifact_ref,
      drill_scope: result.drill_scope,
      outcome: result.outcome,
      executed_at: result.executed_at,
      restore_drill_result_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      restore_drill_result: cloneRestoreDrillResultRecord(result),
    };
  }

  private rebuildIndexes() {
    this.resultIdsByCheckpointRef.clear();
    this.resultIdsByCandidateHash.clear();
    this.resultIdsByBuildArtifactRef.clear();
    for (const stored of this.restoreDrillResults.values()) {
      pushIndex(
        this.resultIdsByCheckpointRef,
        stored.checkpoint_ref,
        stored.restore_drill_id,
      );
      pushIndex(
        this.resultIdsByCandidateHash,
        stored.candidate_identity_hash,
        stored.restore_drill_id,
      );
      pushIndex(
        this.resultIdsByBuildArtifactRef,
        stored.build_artifact_ref,
        stored.restore_drill_id,
      );
    }
  }

  async persistRestoreDrillResult(input: {
    restore_drill_result: RestoreDrillResultRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateRestoreDrillResult(
      input.restore_drill_result,
    );
    const stored = this.stored({
      persisted_at: input.persisted_at,
      restore_drill_result: normalized,
    });
    const existing = this.restoreDrillResults.get(stored.restore_drill_id);
    if (existing) {
      if (
        stableJsonHash(existing.restore_drill_result) !==
        stableJsonHash(stored.restore_drill_result)
      ) {
        throw new RestoreDrillResultRepositoryError(
          "RESTORE_DRILL_RESULT_DUPLICATE",
          `restore drill result ${stored.restore_drill_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    this.restoreDrillResults.set(stored.restore_drill_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getRestoreDrillResultById(restoreDrillId: string) {
    const stored = this.restoreDrillResults.get(restoreDrillId);
    if (!stored) {
      throw new RestoreDrillResultRepositoryError(
        "RESTORE_DRILL_RESULT_NOT_FOUND",
        `restore drill result ${restoreDrillId} does not exist`,
      );
    }
    return cloneStored(stored);
  }

  async listRestoreDrillResults(query: RestoreDrillResultListQuery = {}) {
    let records = [...this.restoreDrillResults.values()];
    if (query.checkpoint_ref) {
      const ids = new Set(
        this.resultIdsByCheckpointRef.get(query.checkpoint_ref) ?? [],
      );
      records = records.filter((record) => ids.has(record.restore_drill_id));
    }
    if (query.candidate_identity_hash) {
      const ids = new Set(
        this.resultIdsByCandidateHash.get(query.candidate_identity_hash) ?? [],
      );
      records = records.filter((record) => ids.has(record.restore_drill_id));
    }
    if (query.build_artifact_ref) {
      const ids = new Set(
        this.resultIdsByBuildArtifactRef.get(query.build_artifact_ref) ?? [],
      );
      records = records.filter((record) => ids.has(record.restore_drill_id));
    }
    if (query.drill_scope) {
      records = records.filter((record) => record.drill_scope === query.drill_scope);
    }
    if (query.outcome) {
      records = records.filter((record) => record.outcome === query.outcome);
    }
    return records.sort(sortStoredRestoreDrillResults).map(cloneStored);
  }
}
