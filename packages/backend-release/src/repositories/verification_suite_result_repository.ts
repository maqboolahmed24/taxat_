import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertVerificationSuiteResultRecord,
  cloneVerificationSuiteResultRecord,
  type VerificationSuiteResultRecord,
} from "../models/verification_suite_result.ts";
import type { VerificationSuiteFamily } from "../services/canonicalize_verification_suite_scope.ts";

export type VerificationSuiteResultContractSchemaKind = "verification_suite_result";

export type VerificationSuiteResultContractSchemaValidator = (
  kind: VerificationSuiteResultContractSchemaKind,
  payload: unknown,
) => Promise<void> | void;

export type VerificationSuiteResultRepositoryInput = {
  validate_contract_schema: VerificationSuiteResultContractSchemaValidator;
};

export type StoredVerificationSuiteResultRecord = {
  suite_result_id: string;
  suite_family: VerificationSuiteFamily;
  candidate_identity_hash: string;
  candidate_environment_ref: string;
  build_artifact_ref: string;
  result_state: VerificationSuiteResultRecord["result_state"];
  executed_at: string;
  verification_suite_result_row_version: number;
  persisted_at: string;
  verification_suite_result: VerificationSuiteResultRecord;
};

export type VerificationSuiteResultListQuery = {
  candidate_identity_hash?: string;
  suite_family?: VerificationSuiteFamily;
  result_state?: VerificationSuiteResultRecord["result_state"];
  build_artifact_ref?: string;
};

export type VerificationSuiteResultRepositoryErrorCode =
  | "VERIFICATION_SUITE_RESULT_DUPLICATE"
  | "VERIFICATION_SUITE_RESULT_NOT_FOUND";

export class VerificationSuiteResultRepositoryError extends Error {
  readonly code: VerificationSuiteResultRepositoryErrorCode;

  constructor(code: VerificationSuiteResultRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "VerificationSuiteResultRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredVerificationSuiteResultRecord) {
  return structuredClone(record);
}

function sortStoredVerificationSuiteResults(
  left: StoredVerificationSuiteResultRecord,
  right: StoredVerificationSuiteResultRecord,
) {
  return (
    left.candidate_identity_hash.localeCompare(right.candidate_identity_hash) ||
    left.suite_family.localeCompare(right.suite_family) ||
    left.executed_at.localeCompare(right.executed_at) ||
    left.suite_result_id.localeCompare(right.suite_result_id)
  );
}

function pushIndex(index: Map<string, string[]>, key: string, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

export class VerificationSuiteResultRepository {
  private readonly validateContractSchema: VerificationSuiteResultContractSchemaValidator;
  private readonly suiteResults = new Map<string, StoredVerificationSuiteResultRecord>();
  private readonly resultIdsByCandidateHash = new Map<string, string[]>();
  private readonly resultIdsBySuiteFamily = new Map<string, string[]>();
  private readonly resultIdsByBuildArtifactRef = new Map<string, string[]>();

  constructor(input: VerificationSuiteResultRepositoryInput) {
    this.validateContractSchema = input.validate_contract_schema;
  }

  private async validateSuiteResult(record: VerificationSuiteResultRecord) {
    const normalized = assertVerificationSuiteResultRecord(record);
    await this.validateContractSchema("verification_suite_result", normalized);
    return normalized;
  }

  private stored(input: {
    verification_suite_result: VerificationSuiteResultRecord;
    persisted_at: string;
  }): StoredVerificationSuiteResultRecord {
    const suiteResult = assertVerificationSuiteResultRecord(
      input.verification_suite_result,
    );
    return {
      suite_result_id: suiteResult.suite_result_id,
      suite_family: suiteResult.suite_family,
      candidate_identity_hash: suiteResult.candidate_identity_hash,
      candidate_environment_ref: suiteResult.candidate_environment_ref,
      build_artifact_ref: suiteResult.build_artifact_ref,
      result_state: suiteResult.result_state,
      executed_at: suiteResult.executed_at,
      verification_suite_result_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      verification_suite_result: cloneVerificationSuiteResultRecord(suiteResult),
    };
  }

  private rebuildIndexes() {
    this.resultIdsByCandidateHash.clear();
    this.resultIdsBySuiteFamily.clear();
    this.resultIdsByBuildArtifactRef.clear();
    for (const stored of this.suiteResults.values()) {
      pushIndex(
        this.resultIdsByCandidateHash,
        stored.candidate_identity_hash,
        stored.suite_result_id,
      );
      pushIndex(this.resultIdsBySuiteFamily, stored.suite_family, stored.suite_result_id);
      pushIndex(
        this.resultIdsByBuildArtifactRef,
        stored.build_artifact_ref,
        stored.suite_result_id,
      );
    }
  }

  async persistVerificationSuiteResult(input: {
    verification_suite_result: VerificationSuiteResultRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateSuiteResult(
      input.verification_suite_result,
    );
    const stored = this.stored({
      persisted_at: input.persisted_at,
      verification_suite_result: normalized,
    });
    const existing = this.suiteResults.get(stored.suite_result_id);
    if (existing) {
      if (
        stableJsonHash(existing.verification_suite_result) !==
        stableJsonHash(stored.verification_suite_result)
      ) {
        throw new VerificationSuiteResultRepositoryError(
          "VERIFICATION_SUITE_RESULT_DUPLICATE",
          `verification suite result ${stored.suite_result_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    this.suiteResults.set(stored.suite_result_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getVerificationSuiteResultById(suiteResultId: string) {
    const stored = this.suiteResults.get(suiteResultId);
    if (!stored) {
      throw new VerificationSuiteResultRepositoryError(
        "VERIFICATION_SUITE_RESULT_NOT_FOUND",
        `verification suite result ${suiteResultId} does not exist`,
      );
    }
    return cloneStored(stored);
  }

  async listVerificationSuiteResults(
    query: VerificationSuiteResultListQuery = {},
  ) {
    let records = [...this.suiteResults.values()];
    if (query.candidate_identity_hash) {
      const ids = new Set(
        this.resultIdsByCandidateHash.get(query.candidate_identity_hash) ?? [],
      );
      records = records.filter((record) => ids.has(record.suite_result_id));
    }
    if (query.suite_family) {
      const ids = new Set(this.resultIdsBySuiteFamily.get(query.suite_family) ?? []);
      records = records.filter((record) => ids.has(record.suite_result_id));
    }
    if (query.build_artifact_ref) {
      const ids = new Set(
        this.resultIdsByBuildArtifactRef.get(query.build_artifact_ref) ?? [],
      );
      records = records.filter((record) => ids.has(record.suite_result_id));
    }
    if (query.result_state) {
      records = records.filter((record) => record.result_state === query.result_state);
    }
    return records.sort(sortStoredVerificationSuiteResults).map(cloneStored);
  }
}
