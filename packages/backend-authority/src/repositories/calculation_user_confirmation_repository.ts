import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  calculationUserConfirmationContentFingerprint,
  calculationUserConfirmationRef,
  cloneCalculationUserConfirmation,
  normalizeCalculationUserConfirmation,
  type CalculationUserConfirmationRecord,
} from "../models/calculation_user_confirmation.ts";

export type StoredCalculationUserConfirmation = {
  calculation_basis_ref: string;
  calculation_id: string;
  confirmation_state: CalculationUserConfirmationRecord["confirmation_state"];
  content_fingerprint: string;
  manifest_id: string;
  record: CalculationUserConfirmationRecord;
  row_version: number;
  user_confirmation_id: string;
  user_confirmation_ref: string;
};

function cloneStored(record: StoredCalculationUserConfirmation) {
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

function sortStored(left: StoredCalculationUserConfirmation, right: StoredCalculationUserConfirmation) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    (left.record.confirmed_at ?? left.record.declined_at ?? "").localeCompare(
      right.record.confirmed_at ?? right.record.declined_at ?? "",
    ) ||
    left.user_confirmation_id.localeCompare(right.user_confirmation_id)
  );
}

export class CalculationUserConfirmationRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBasis = new Map<string, string[]>();
  private readonly idsByCalculation = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByState = new Map<string, string[]>();
  private readonly records = new Map<string, StoredCalculationUserConfirmation>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByBasis.clear();
    this.idsByCalculation.clear();
    this.idsByManifest.clear();
    this.idsByState.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.user_confirmation_ref, stored.user_confirmation_id);
      pushIndex(this.idsByBasis, stored.calculation_basis_ref, stored.user_confirmation_id);
      pushIndex(this.idsByCalculation, stored.calculation_id, stored.user_confirmation_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.user_confirmation_id);
      pushIndex(this.idsByState, stored.confirmation_state, stored.user_confirmation_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredCalculationUserConfirmation => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistCalculationUserConfirmation(input: {
    confirmation: CalculationUserConfirmationRecord;
  }) {
    const confirmation = normalizeCalculationUserConfirmation(input.confirmation);
    const existing = this.records.get(confirmation.user_confirmation_id);
    const confirmationRef = calculationUserConfirmationRef(confirmation);
    const refOwner = this.idByRef.get(confirmationRef);
    if (refOwner !== undefined && refOwner !== confirmation.user_confirmation_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `calculation user confirmation ref ${confirmationRef} already belongs to ${refOwner}`,
      );
    }
    if (existing && stableEqual(existing.record, confirmation)) {
      return cloneStored(existing);
    }
    const stored: StoredCalculationUserConfirmation = {
      calculation_basis_ref: confirmation.calculation_basis_ref,
      calculation_id: confirmation.calculation_id,
      confirmation_state: confirmation.confirmation_state,
      content_fingerprint: calculationUserConfirmationContentFingerprint(confirmation),
      manifest_id: confirmation.manifest_id,
      record: cloneCalculationUserConfirmation(confirmation),
      row_version: (existing?.row_version ?? 0) + 1,
      user_confirmation_id: confirmation.user_confirmation_id,
      user_confirmation_ref: confirmationRef,
    };
    this.records.set(stored.user_confirmation_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCalculationUserConfirmationById(userConfirmationId: string) {
    const stored = this.records.get(userConfirmationId);
    return stored ? cloneStored(stored) : null;
  }

  async getCalculationUserConfirmationByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listCalculationUserConfirmationsByBasis(calculationBasisRef: string) {
    return this.listByIds(this.idsByBasis.get(calculationBasisRef) ?? []);
  }

  async listCalculationUserConfirmationsByCalculation(calculationId: string) {
    return this.listByIds(this.idsByCalculation.get(calculationId) ?? []);
  }

  async listCalculationUserConfirmationsByState(
    state: CalculationUserConfirmationRecord["confirmation_state"],
  ) {
    return this.listByIds(this.idsByState.get(state) ?? []);
  }
}
