import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  calculationBasisContentFingerprint,
  calculationBasisRef,
  cloneCalculationBasis,
  normalizeCalculationBasis,
  type CalculationBasisRecord,
} from "../models/calculation_basis.ts";

export type StoredCalculationBasis = {
  basis_status: CalculationBasisRecord["basis_status"];
  calculation_basis_id: string;
  calculation_basis_ref: string;
  calculation_id: string;
  calculation_request_ref: string;
  content_fingerprint: string;
  manifest_id: string;
  record: CalculationBasisRecord;
  row_version: number;
};

function cloneStored(record: StoredCalculationBasis) {
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

function sortStored(left: StoredCalculationBasis, right: StoredCalculationBasis) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.record.captured_at.localeCompare(right.record.captured_at) ||
    left.calculation_basis_id.localeCompare(right.calculation_basis_id)
  );
}

export class CalculationBasisRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByCalculation = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByRequest = new Map<string, string[]>();
  private readonly idsByStatus = new Map<string, string[]>();
  private readonly records = new Map<string, StoredCalculationBasis>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByCalculation.clear();
    this.idsByManifest.clear();
    this.idsByRequest.clear();
    this.idsByStatus.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.calculation_basis_ref, stored.calculation_basis_id);
      pushIndex(this.idsByCalculation, stored.calculation_id, stored.calculation_basis_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.calculation_basis_id);
      pushIndex(this.idsByRequest, stored.calculation_request_ref, stored.calculation_basis_id);
      pushIndex(this.idsByStatus, stored.basis_status, stored.calculation_basis_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredCalculationBasis => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistCalculationBasis(input: { basis: CalculationBasisRecord }) {
    const basis = normalizeCalculationBasis(input.basis);
    const existing = this.records.get(basis.calculation_basis_id);
    const basisRef = calculationBasisRef(basis);
    const refOwner = this.idByRef.get(basisRef);
    if (refOwner !== undefined && refOwner !== basis.calculation_basis_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `calculation basis ref ${basisRef} already belongs to ${refOwner}`,
      );
    }
    if (existing && stableEqual(existing.record, basis)) {
      return cloneStored(existing);
    }
    const stored: StoredCalculationBasis = {
      basis_status: basis.basis_status,
      calculation_basis_id: basis.calculation_basis_id,
      calculation_basis_ref: basisRef,
      calculation_id: basis.calculation_id,
      calculation_request_ref: basis.calculation_request_ref,
      content_fingerprint: calculationBasisContentFingerprint(basis),
      manifest_id: basis.manifest_id,
      record: cloneCalculationBasis(basis),
      row_version: (existing?.row_version ?? 0) + 1,
    };
    this.records.set(stored.calculation_basis_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCalculationBasisById(calculationBasisId: string) {
    const stored = this.records.get(calculationBasisId);
    return stored ? cloneStored(stored) : null;
  }

  async getCalculationBasisByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listCalculationBasesByCalculation(calculationId: string) {
    return this.listByIds(this.idsByCalculation.get(calculationId) ?? []);
  }

  async listCalculationBasesByRequest(calculationRequestRef: string) {
    return this.listByIds(this.idsByRequest.get(calculationRequestRef) ?? []);
  }

  async listCalculationBasesByStatus(status: CalculationBasisRecord["basis_status"]) {
    return this.listByIds(this.idsByStatus.get(status) ?? []);
  }
}
