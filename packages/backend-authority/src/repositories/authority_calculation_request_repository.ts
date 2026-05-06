import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  authorityCalculationRequestContentFingerprint,
  authorityCalculationRequestRef,
  cloneAuthorityCalculationRequest,
  normalizeAuthorityCalculationRequest,
  type AuthorityCalculationRequestRecord,
} from "../models/authority_calculation_request.ts";

export type StoredAuthorityCalculationRequest = {
  calculation_request_id: string;
  calculation_request_ref: string;
  client_id: string;
  content_fingerprint: string;
  manifest_id: string;
  record: AuthorityCalculationRequestRecord;
  request_state: AuthorityCalculationRequestRecord["request_state"];
  row_version: number;
  tenant_id: string;
};

function cloneStored(record: StoredAuthorityCalculationRequest) {
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

function sortStored(left: StoredAuthorityCalculationRequest, right: StoredAuthorityCalculationRequest) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.record.requested_at.localeCompare(right.record.requested_at) ||
    left.calculation_request_id.localeCompare(right.calculation_request_id)
  );
}

export class AuthorityCalculationRequestRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByClient = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByState = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityCalculationRequest>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByClient.clear();
    this.idsByManifest.clear();
    this.idsByState.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.calculation_request_ref, stored.calculation_request_id);
      pushIndex(this.idsByClient, `${stored.tenant_id}:${stored.client_id}`, stored.calculation_request_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.calculation_request_id);
      pushIndex(this.idsByState, stored.request_state, stored.calculation_request_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityCalculationRequest => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistAuthorityCalculationRequest(input: { request: AuthorityCalculationRequestRecord }) {
    const request = normalizeAuthorityCalculationRequest(input.request);
    const existing = this.records.get(request.calculation_request_id);
    const requestRef = authorityCalculationRequestRef(request);
    const refOwner = this.idByRef.get(requestRef);
    if (refOwner !== undefined && refOwner !== request.calculation_request_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority calculation request ref ${requestRef} already belongs to ${refOwner}`,
      );
    }
    if (existing && stableEqual(existing.record, request)) {
      return cloneStored(existing);
    }
    const stored: StoredAuthorityCalculationRequest = {
      calculation_request_id: request.calculation_request_id,
      calculation_request_ref: requestRef,
      client_id: request.client_id,
      content_fingerprint: authorityCalculationRequestContentFingerprint(request),
      manifest_id: request.manifest_id,
      record: cloneAuthorityCalculationRequest(request),
      request_state: request.request_state,
      row_version: (existing?.row_version ?? 0) + 1,
      tenant_id: request.tenant_id,
    };
    this.records.set(stored.calculation_request_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getAuthorityCalculationRequestById(calculationRequestId: string) {
    const stored = this.records.get(calculationRequestId);
    return stored ? cloneStored(stored) : null;
  }

  async getAuthorityCalculationRequestByRef(calculationRequestRef: string) {
    const id = this.idByRef.get(calculationRequestRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listAuthorityCalculationRequestsByClient(input: { client_id: string; tenant_id: string }) {
    return this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }

  async listAuthorityCalculationRequestsByManifest(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listAuthorityCalculationRequestsByState(
    requestState: AuthorityCalculationRequestRecord["request_state"],
  ) {
    return this.listByIds(this.idsByState.get(requestState) ?? []);
  }
}
