import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  authorityRequestEnvelopeContentFingerprint,
  authorityRequestEnvelopeRef,
  cloneAuthorityRequestEnvelope,
  normalizeAuthorityRequestEnvelope,
  type AuthorityRequestEnvelope,
} from "../models/authority_request_envelope.ts";

export type StoredAuthorityRequestEnvelope = {
  authority_binding_ref: string;
  client_id: string;
  content_fingerprint: string;
  duplicate_meaning_key: string;
  idempotency_key: string;
  manifest_id: string;
  record: AuthorityRequestEnvelope;
  request_hash: string;
  request_id: string;
  request_ref: string;
  row_version: number;
  tenant_id: string;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredAuthorityRequestEnvelope, right: StoredAuthorityRequestEnvelope) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.request_id.localeCompare(right.request_id)
  );
}

export class AuthorityRequestEnvelopeRepository {
  private readonly idByDuplicateMeaning = new Map<string, string>();
  private readonly idByIdempotencyKey = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idByRequestHash = new Map<string, string>();
  private readonly idsByBinding = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityRequestEnvelope>();

  private rebuildIndexes() {
    this.idByDuplicateMeaning.clear();
    this.idByIdempotencyKey.clear();
    this.idByRef.clear();
    this.idByRequestHash.clear();
    this.idsByBinding.clear();
    this.idsByManifest.clear();
    for (const stored of this.records.values()) {
      this.idByDuplicateMeaning.set(stored.duplicate_meaning_key, stored.request_id);
      this.idByIdempotencyKey.set(stored.idempotency_key, stored.request_id);
      this.idByRef.set(stored.request_ref, stored.request_id);
      this.idByRequestHash.set(stored.request_hash, stored.request_id);
      pushIndex(this.idsByBinding, stored.authority_binding_ref, stored.request_id);
      pushIndex(this.idsByManifest, `${stored.tenant_id}:${stored.manifest_id}`, stored.request_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityRequestEnvelope => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneRecord(record));
  }

  private assertUniqueIdentity(envelope: AuthorityRequestEnvelope) {
    for (const [label, index, value] of [
      ["duplicate_meaning_key", this.idByDuplicateMeaning, envelope.duplicate_meaning_key],
      ["request_hash", this.idByRequestHash, envelope.request_hash],
      ["idempotency_key", this.idByIdempotencyKey, envelope.idempotency_key],
    ] as const) {
      const owner = index.get(value);
      if (owner !== undefined && owner !== envelope.request_id) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `${label} ${value} already belongs to authority request ${owner}`,
        );
      }
    }
  }

  async persistAuthorityRequestEnvelope(input: { envelope: AuthorityRequestEnvelope }) {
    const envelope = normalizeAuthorityRequestEnvelope(input.envelope);
    const existing = this.records.get(envelope.request_id);
    if (existing && !stableEqual(existing.record, envelope)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority request envelope ${envelope.request_id} is sealed and cannot mutate in place`,
      );
    }
    const ref = authorityRequestEnvelopeRef(envelope);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== envelope.request_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority request envelope ref ${ref} already belongs to ${refOwner}`,
      );
    }
    this.assertUniqueIdentity(envelope);
    if (existing) {
      return cloneRecord(existing);
    }
    const stored: StoredAuthorityRequestEnvelope = {
      authority_binding_ref: envelope.authority_binding_ref,
      client_id: envelope.client_id,
      content_fingerprint: authorityRequestEnvelopeContentFingerprint(envelope),
      duplicate_meaning_key: envelope.duplicate_meaning_key,
      idempotency_key: envelope.idempotency_key,
      manifest_id: envelope.manifest_id,
      record: cloneAuthorityRequestEnvelope(envelope),
      request_hash: envelope.request_hash,
      request_id: envelope.request_id,
      request_ref: ref,
      row_version: 1,
      tenant_id: envelope.tenant_id,
    };
    this.records.set(stored.request_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getAuthorityRequestEnvelopeById(requestId: string) {
    const stored = this.records.get(requestId);
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityRequestEnvelopeByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityRequestEnvelopeByRequestHash(requestHash: string) {
    const id = this.idByRequestHash.get(requestHash);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityRequestEnvelopeByDuplicateMeaningKey(duplicateMeaningKey: string) {
    const id = this.idByDuplicateMeaning.get(duplicateMeaningKey);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async getAuthorityRequestEnvelopeByIdempotencyKey(idempotencyKey: string) {
    const id = this.idByIdempotencyKey.get(idempotencyKey);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async listAuthorityRequestEnvelopesByBindingRef(authorityBindingRef: string) {
    return this.listByIds(this.idsByBinding.get(authorityBindingRef) ?? []);
  }

  async listAuthorityRequestEnvelopesByManifest(input: { tenant_id: string; manifest_id: string }) {
    return this.listByIds(this.idsByManifest.get(`${input.tenant_id}:${input.manifest_id}`) ?? []);
  }
}
