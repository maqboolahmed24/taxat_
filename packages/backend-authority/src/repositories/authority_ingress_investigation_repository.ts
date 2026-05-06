import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  type AuthorityIngressInvestigationSnapshot,
  authorityIngressInvestigationSnapshotContentFingerprint,
  authorityIngressInvestigationSnapshotRef,
  cloneAuthorityIngressInvestigationSnapshot,
  normalizeAuthorityIngressInvestigationSnapshot,
} from "../models/authority_ingress_investigation_snapshot.ts";

export type StoredAuthorityIngressInvestigationSnapshot = {
  content_fingerprint: string;
  ingress_receipt_ref: string;
  investigation_id: string;
  investigation_ref: string;
  receipt_state: string;
  record: AuthorityIngressInvestigationSnapshot;
  row_version: number;
  updated_at: string;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(
  left: StoredAuthorityIngressInvestigationSnapshot,
  right: StoredAuthorityIngressInvestigationSnapshot,
) {
  return (
    left.ingress_receipt_ref.localeCompare(right.ingress_receipt_ref) ||
    left.updated_at.localeCompare(right.updated_at) ||
    left.investigation_id.localeCompare(right.investigation_id)
  );
}

function cloneStored(record: StoredAuthorityIngressInvestigationSnapshot) {
  return cloneRecord(record);
}

export class AuthorityIngressInvestigationRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByIngressReceiptRef = new Map<string, string[]>();
  private readonly idsByReceiptState = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityIngressInvestigationSnapshot>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByIngressReceiptRef.clear();
    this.idsByReceiptState.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.investigation_ref, stored.investigation_id);
      pushIndex(this.idsByIngressReceiptRef, stored.ingress_receipt_ref, stored.investigation_id);
      pushIndex(this.idsByReceiptState, stored.receipt_state, stored.investigation_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityIngressInvestigationSnapshot => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async upsertAuthorityIngressInvestigationSnapshot(input: {
    snapshot: AuthorityIngressInvestigationSnapshot;
  }) {
    const snapshot = normalizeAuthorityIngressInvestigationSnapshot(input.snapshot);
    const existing = this.records.get(snapshot.investigation_id);
    const ref = authorityIngressInvestigationSnapshotRef(snapshot);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== snapshot.investigation_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority ingress investigation ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && existing.ingress_receipt_ref !== snapshot.ingress_receipt_ref) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority ingress investigation ${snapshot.investigation_id} cannot change receipt`,
      );
    }
    if (existing !== undefined && stableEqual(existing.record, snapshot)) {
      return cloneStored(existing);
    }
    const stored: StoredAuthorityIngressInvestigationSnapshot = {
      content_fingerprint: authorityIngressInvestigationSnapshotContentFingerprint(snapshot),
      ingress_receipt_ref: snapshot.ingress_receipt_ref,
      investigation_id: snapshot.investigation_id,
      investigation_ref: ref,
      receipt_state: snapshot.receipt_state,
      record: cloneAuthorityIngressInvestigationSnapshot(snapshot),
      row_version: (existing?.row_version ?? 0) + 1,
      updated_at: snapshot.updated_at,
    };
    this.records.set(stored.investigation_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getAuthorityIngressInvestigationSnapshotById(investigationId: string) {
    const stored = this.records.get(investigationId);
    return stored ? cloneStored(stored) : null;
  }

  async getAuthorityIngressInvestigationSnapshotByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listAuthorityIngressInvestigationSnapshotsByReceiptRef(ingressReceiptRef: string) {
    return this.listByIds(this.idsByIngressReceiptRef.get(ingressReceiptRef) ?? []);
  }

  async listAuthorityIngressInvestigationSnapshotsByReceiptState(receiptState: string) {
    return this.listByIds(this.idsByReceiptState.get(receiptState) ?? []);
  }
}

