import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertGateAdmissibilityRecord,
  cloneGateAdmissibilityRecord,
  type GateAdmissibilityRecordRecord,
  type GateAdmissibilityState,
} from "../models/gate_admissibility_record.ts";
import type { VerificationSuiteFamily } from "../services/canonicalize_verification_suite_scope.ts";

export type GateAdmissibilityRecordContractSchemaKind = "gate_admissibility_record";

export type GateAdmissibilityRecordContractSchemaValidator = (
  kind: GateAdmissibilityRecordContractSchemaKind,
  payload: unknown,
) => Promise<void> | void;

export type GateAdmissibilityRecordRepositoryInput = {
  validate_contract_schema: GateAdmissibilityRecordContractSchemaValidator;
};

export type StoredGateAdmissibilityRecord = {
  admissibility_id: string;
  suite_result_ref: string;
  suite_family: VerificationSuiteFamily;
  candidate_identity_hash: string;
  admissibility_state: GateAdmissibilityState;
  quarantine_state: GateAdmissibilityRecordRecord["quarantine_state"];
  evaluated_at: string;
  gate_admissibility_record_row_version: number;
  persisted_at: string;
  gate_admissibility_record: GateAdmissibilityRecordRecord;
};

export type GateAdmissibilityRecordListQuery = {
  candidate_identity_hash?: string;
  suite_result_ref?: string;
  suite_family?: VerificationSuiteFamily;
  admissibility_state?: GateAdmissibilityState;
};

export type GateAdmissibilityRecordRepositoryErrorCode =
  | "GATE_ADMISSIBILITY_RECORD_DUPLICATE"
  | "GATE_ADMISSIBILITY_RECORD_NOT_FOUND";

export class GateAdmissibilityRecordRepositoryError extends Error {
  readonly code: GateAdmissibilityRecordRepositoryErrorCode;

  constructor(
    code: GateAdmissibilityRecordRepositoryErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "GateAdmissibilityRecordRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredGateAdmissibilityRecord) {
  return structuredClone(record);
}

function sortStoredGateAdmissibilityRecords(
  left: StoredGateAdmissibilityRecord,
  right: StoredGateAdmissibilityRecord,
) {
  return (
    left.candidate_identity_hash.localeCompare(right.candidate_identity_hash) ||
    left.suite_family.localeCompare(right.suite_family) ||
    left.evaluated_at.localeCompare(right.evaluated_at) ||
    left.admissibility_id.localeCompare(right.admissibility_id)
  );
}

function pushIndex(index: Map<string, string[]>, key: string, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

export class GateAdmissibilityRecordRepository {
  private readonly validateContractSchema: GateAdmissibilityRecordContractSchemaValidator;
  private readonly records = new Map<string, StoredGateAdmissibilityRecord>();
  private readonly recordIdsByCandidateHash = new Map<string, string[]>();
  private readonly recordIdsBySuiteResultRef = new Map<string, string[]>();
  private readonly recordIdsBySuiteFamily = new Map<string, string[]>();

  constructor(input: GateAdmissibilityRecordRepositoryInput) {
    this.validateContractSchema = input.validate_contract_schema;
  }

  private async validateRecord(record: GateAdmissibilityRecordRecord) {
    const normalized = assertGateAdmissibilityRecord(record);
    await this.validateContractSchema("gate_admissibility_record", normalized);
    return normalized;
  }

  private stored(input: {
    gate_admissibility_record: GateAdmissibilityRecordRecord;
    persisted_at: string;
  }): StoredGateAdmissibilityRecord {
    const record = assertGateAdmissibilityRecord(input.gate_admissibility_record);
    return {
      admissibility_id: record.admissibility_id,
      suite_result_ref: record.suite_result_ref,
      suite_family: record.suite_family,
      candidate_identity_hash: record.candidate_identity_hash,
      admissibility_state: record.admissibility_state,
      quarantine_state: record.quarantine_state,
      evaluated_at: record.evaluated_at,
      gate_admissibility_record_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      gate_admissibility_record: cloneGateAdmissibilityRecord(record),
    };
  }

  private rebuildIndexes() {
    this.recordIdsByCandidateHash.clear();
    this.recordIdsBySuiteResultRef.clear();
    this.recordIdsBySuiteFamily.clear();
    for (const stored of this.records.values()) {
      pushIndex(
        this.recordIdsByCandidateHash,
        stored.candidate_identity_hash,
        stored.admissibility_id,
      );
      pushIndex(
        this.recordIdsBySuiteResultRef,
        stored.suite_result_ref,
        stored.admissibility_id,
      );
      pushIndex(this.recordIdsBySuiteFamily, stored.suite_family, stored.admissibility_id);
    }
  }

  async persistGateAdmissibilityRecord(input: {
    gate_admissibility_record: GateAdmissibilityRecordRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateRecord(input.gate_admissibility_record);
    const stored = this.stored({
      gate_admissibility_record: normalized,
      persisted_at: input.persisted_at,
    });
    const existing = this.records.get(stored.admissibility_id);
    if (existing) {
      if (
        stableJsonHash(existing.gate_admissibility_record) !==
        stableJsonHash(stored.gate_admissibility_record)
      ) {
        throw new GateAdmissibilityRecordRepositoryError(
          "GATE_ADMISSIBILITY_RECORD_DUPLICATE",
          `gate admissibility record ${stored.admissibility_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    this.records.set(stored.admissibility_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getGateAdmissibilityRecordById(admissibilityId: string) {
    const stored = this.records.get(admissibilityId);
    if (!stored) {
      throw new GateAdmissibilityRecordRepositoryError(
        "GATE_ADMISSIBILITY_RECORD_NOT_FOUND",
        `gate admissibility record ${admissibilityId} does not exist`,
      );
    }
    return cloneStored(stored);
  }

  async listGateAdmissibilityRecords(
    query: GateAdmissibilityRecordListQuery = {},
  ) {
    let records = [...this.records.values()];
    if (query.candidate_identity_hash) {
      const ids = new Set(
        this.recordIdsByCandidateHash.get(query.candidate_identity_hash) ?? [],
      );
      records = records.filter((record) => ids.has(record.admissibility_id));
    }
    if (query.suite_result_ref) {
      const ids = new Set(
        this.recordIdsBySuiteResultRef.get(query.suite_result_ref) ?? [],
      );
      records = records.filter((record) => ids.has(record.admissibility_id));
    }
    if (query.suite_family) {
      const ids = new Set(this.recordIdsBySuiteFamily.get(query.suite_family) ?? []);
      records = records.filter((record) => ids.has(record.admissibility_id));
    }
    if (query.admissibility_state) {
      records = records.filter(
        (record) => record.admissibility_state === query.admissibility_state,
      );
    }
    return records.sort(sortStoredGateAdmissibilityRecords).map(cloneStored);
  }
}
