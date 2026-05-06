import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  authorityResponseEnvelopeContentFingerprint,
  authorityResponseEnvelopeRef,
  cloneAuthorityResponseEnvelope,
  normalizeAuthorityResponseEnvelope,
  type AuthorityResponseEnvelope,
} from "../models/authority_response_envelope.ts";

export type StoredAuthorityResponseEnvelope = {
  content_fingerprint: string;
  provider_delivery_ref: string | null;
  received_at: string;
  record: AuthorityResponseEnvelope;
  request_id: string;
  response_id: string;
  response_ref: string;
  response_source: string;
  row_version: number;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredAuthorityResponseEnvelope, right: StoredAuthorityResponseEnvelope) {
  return (
    left.request_id.localeCompare(right.request_id) ||
    left.received_at.localeCompare(right.received_at) ||
    left.response_id.localeCompare(right.response_id)
  );
}

export class AuthorityResponseEnvelopeRepository {
  private readonly idByProviderDeliveryRef = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByRequest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityResponseEnvelope>();

  private rebuildIndexes() {
    this.idByProviderDeliveryRef.clear();
    this.idByRef.clear();
    this.idsByRequest.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.response_ref, stored.response_id);
      if (stored.provider_delivery_ref !== null) {
        this.idByProviderDeliveryRef.set(stored.provider_delivery_ref, stored.response_id);
      }
      pushIndex(this.idsByRequest, stored.request_id, stored.response_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityResponseEnvelope => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneRecord(record));
  }

  private assertKnownLineage(response: AuthorityResponseEnvelope) {
    const priorIds = new Set(this.idsByRequest.get(response.request_id) ?? []);
    for (const ref of [
      response.supersedes_response_id,
      response.recovery_basis_response_id,
      ...response.corroborates_response_ids,
      ...response.conflicting_response_ids,
    ]) {
      if (ref !== null && ref !== undefined && !priorIds.has(ref)) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `response lineage ref ${ref} must already exist for request ${response.request_id}`,
        );
      }
    }
  }

  async persistAuthorityResponseEnvelope(input: { response: AuthorityResponseEnvelope }) {
    const response = normalizeAuthorityResponseEnvelope(input.response);
    const existing = this.records.get(response.response_id);
    if (existing && !stableEqual(existing.record, response)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority response envelope ${response.response_id} is append-only and cannot mutate in place`,
      );
    }
    const ref = authorityResponseEnvelopeRef(response);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== response.response_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority response envelope ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (response.provider_delivery_ref !== null) {
      const deliveryOwner = this.idByProviderDeliveryRef.get(response.provider_delivery_ref);
      if (deliveryOwner !== undefined && deliveryOwner !== response.response_id) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `provider delivery ref ${response.provider_delivery_ref} already belongs to ${deliveryOwner}`,
        );
      }
    }
    this.assertKnownLineage(response);
    if (existing) {
      return cloneRecord(existing);
    }
    const stored: StoredAuthorityResponseEnvelope = {
      content_fingerprint: authorityResponseEnvelopeContentFingerprint(response),
      provider_delivery_ref: response.provider_delivery_ref,
      received_at: response.received_at,
      record: cloneAuthorityResponseEnvelope(response),
      request_id: response.request_id,
      response_id: response.response_id,
      response_ref: ref,
      response_source: response.response_source,
      row_version: 1,
    };
    this.records.set(stored.response_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getAuthorityResponseEnvelopeById(responseId: string) {
    const stored = this.records.get(responseId);
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityResponseEnvelopeByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityResponseEnvelopeByProviderDeliveryRef(providerDeliveryRef: string) {
    const id = this.idByProviderDeliveryRef.get(providerDeliveryRef);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async listAuthorityResponseEnvelopesByRequestId(requestId: string) {
    return this.listByIds(this.idsByRequest.get(requestId) ?? []);
  }

  async getLatestAuthorityResponseEnvelopeByRequestId(requestId: string) {
    const responses = await this.listAuthorityResponseEnvelopesByRequestId(requestId);
    return responses.at(-1) ?? null;
  }
}
