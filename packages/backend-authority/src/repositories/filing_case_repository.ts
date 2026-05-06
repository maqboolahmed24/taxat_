import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneFilingCaseRecord,
  filingCaseRef,
  normalizeFilingCaseRecord,
  type FilingCaseRecord,
} from "../models/filing_case.ts";

export type StoredFilingCaseRecord = {
  client_id: string;
  filing_case_id: string;
  filing_case_ref: string;
  lifecycle_state: string;
  period: string;
  record: FilingCaseRecord;
  row_version: number;
  tenant_id: string;
};

function cloneStored(record: StoredFilingCaseRecord) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredFilingCaseRecord, right: StoredFilingCaseRecord) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    left.period.localeCompare(right.period) ||
    left.filing_case_id.localeCompare(right.filing_case_id)
  );
}

export class FilingCaseRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByClient = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFilingCaseRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByClient.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.filing_case_ref, stored.filing_case_id);
      pushIndex(this.idsByClient, `${stored.tenant_id}:${stored.client_id}`, stored.filing_case_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredFilingCaseRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistFilingCase(input: { filing_case: FilingCaseRecord }) {
    const filingCase = normalizeFilingCaseRecord(input.filing_case);
    const existing = this.records.get(filingCase.filing_case_id);
    const ref = filingCaseRef(filingCase);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== filingCase.filing_case_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `filing case ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing && stableEqual(existing.record, filingCase)) {
      return cloneStored(existing);
    }
    const stored: StoredFilingCaseRecord = {
      client_id: filingCase.client_id,
      filing_case_id: filingCase.filing_case_id,
      filing_case_ref: ref,
      lifecycle_state: filingCase.lifecycle_state,
      period: filingCase.period,
      record: cloneFilingCaseRecord(filingCase),
      row_version: (existing?.row_version ?? 0) + 1,
      tenant_id: filingCase.tenant_id,
    };
    this.records.set(stored.filing_case_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getFilingCaseById(filingCaseId: string) {
    const stored = this.records.get(filingCaseId);
    return stored ? cloneStored(stored) : null;
  }

  async getFilingCaseByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listFilingCasesByClient(input: { client_id: string; tenant_id: string }) {
    return this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }
}
