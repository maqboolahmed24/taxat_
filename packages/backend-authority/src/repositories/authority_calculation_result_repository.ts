import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  authorityCalculationRef,
  authorityCalculationResultContentFingerprint,
  cloneAuthorityCalculationResult,
  normalizeAuthorityCalculationResult,
  type AuthorityCalculationResultRecord,
} from "../models/authority_calculation_result.ts";

export type StoredAuthorityCalculationResult = {
  calculation_id: string;
  calculation_ref: string;
  calculation_request_ref: string;
  content_fingerprint: string;
  manifest_id: string;
  record: AuthorityCalculationResultRecord;
  result_state: AuthorityCalculationResultRecord["result_state"];
  row_version: number;
};

function cloneStored(record: StoredAuthorityCalculationResult) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredAuthorityCalculationResult, right: StoredAuthorityCalculationResult) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    (left.record.retrieved_at ?? "").localeCompare(right.record.retrieved_at ?? "") ||
    left.calculation_id.localeCompare(right.calculation_id)
  );
}

export class AuthorityCalculationResultRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByRequest = new Map<string, string[]>();
  private readonly idsByState = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityCalculationResult>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByManifest.clear();
    this.idsByRequest.clear();
    this.idsByState.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.calculation_ref, stored.calculation_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.calculation_id);
      pushIndex(this.idsByRequest, stored.calculation_request_ref, stored.calculation_id);
      pushIndex(this.idsByState, stored.result_state, stored.calculation_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityCalculationResult => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistAuthorityCalculationResult(input: { result: AuthorityCalculationResultRecord }) {
    const result = normalizeAuthorityCalculationResult(input.result);
    const existing = this.records.get(result.calculation_id);
    const resultRef = authorityCalculationRef(result);
    const refOwner = this.idByRef.get(resultRef);
    if (refOwner !== undefined && refOwner !== result.calculation_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority calculation ref ${resultRef} already belongs to ${refOwner}`,
      );
    }
    if (existing && stableEqual(existing.record, result)) {
      return cloneStored(existing);
    }
    const stored: StoredAuthorityCalculationResult = {
      calculation_id: result.calculation_id,
      calculation_ref: resultRef,
      calculation_request_ref: result.calculation_request_ref,
      content_fingerprint: authorityCalculationResultContentFingerprint(result),
      manifest_id: result.manifest_id,
      record: cloneAuthorityCalculationResult(result),
      result_state: result.result_state,
      row_version: (existing?.row_version ?? 0) + 1,
    };
    this.records.set(stored.calculation_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getAuthorityCalculationResultById(calculationId: string) {
    const stored = this.records.get(calculationId);
    return stored ? cloneStored(stored) : null;
  }

  async getAuthorityCalculationResultByRef(calculationRef: string) {
    const id = this.idByRef.get(calculationRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listAuthorityCalculationResultsByRequest(calculationRequestRef: string) {
    return this.listByIds(this.idsByRequest.get(calculationRequestRef) ?? []);
  }

  async listAuthorityCalculationResultsByManifest(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listAuthorityCalculationResultsByState(
    resultState: AuthorityCalculationResultRecord["result_state"],
  ) {
    return this.listByIds(this.idsByState.get(resultState) ?? []);
  }
}
