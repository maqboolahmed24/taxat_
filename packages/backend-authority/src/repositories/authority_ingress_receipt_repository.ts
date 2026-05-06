import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  type AuthorityIngressReceipt,
  authorityIngressReceiptContentFingerprint,
  authorityIngressReceiptRef,
  cloneAuthorityIngressReceipt,
  normalizeAuthorityIngressReceipt,
} from "../models/authority_ingress_receipt.ts";

export type StoredAuthorityIngressReceipt = {
  bound_interaction_ref: string | null;
  content_fingerprint: string;
  correlation_status: string;
  delivery_dedupe_key: string;
  duplicate_meaning_key: string | null;
  idempotency_key: string | null;
  identity_namespace_hash: string | null;
  ingress_channel_metadata_hash: string;
  ingress_receipt_id: string;
  ingress_receipt_ref: string;
  persisted_at: string;
  provider_delivery_ref: string;
  provider_environment: string;
  receipt_state: string;
  record: AuthorityIngressReceipt;
  request_hash: string | null;
  response_body_hash: string;
  row_version: number;
};

function pushIndex(index: Map<string, string[]>, key: string | null, value: string) {
  if (key === null) {
    return;
  }
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredAuthorityIngressReceipt, right: StoredAuthorityIngressReceipt) {
  return (
    left.persisted_at.localeCompare(right.persisted_at) ||
    left.ingress_receipt_id.localeCompare(right.ingress_receipt_id)
  );
}

function cloneStored(record: StoredAuthorityIngressReceipt) {
  return cloneRecord(record);
}

function assertOnlyNormalizationChanged(existing: AuthorityIngressReceipt, next: AuthorityIngressReceipt) {
  const existingComparable = {
    ...existing,
    authority_ingress_proof_contract: {
      ...existing.authority_ingress_proof_contract,
      mutation_gate_state: next.authority_ingress_proof_contract.mutation_gate_state,
      normalized_response_ref_or_null: next.authority_ingress_proof_contract.normalized_response_ref_or_null,
    },
    normalized_response_ref: next.normalized_response_ref,
    receipt_state: next.receipt_state,
  };
  if (
    existing.receipt_state !== "PERSISTED" ||
    next.receipt_state !== "NORMALIZED" ||
    existing.normalized_response_ref !== null ||
    next.normalized_response_ref === null ||
    !stableEqual(existingComparable, next)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_REPOSITORY_INVALID",
      `authority ingress receipt ${next.ingress_receipt_id} can only move from PERSISTED to NORMALIZED in place`,
    );
  }
}

export class AuthorityIngressReceiptRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBoundInteractionRef = new Map<string, string[]>();
  private readonly idsByCorrelationStatus = new Map<string, string[]>();
  private readonly idsByDeliveryDedupeKey = new Map<string, string[]>();
  private readonly idsByDuplicateMeaningKey = new Map<string, string[]>();
  private readonly idsByIdempotencyKey = new Map<string, string[]>();
  private readonly idsByIdentityNamespaceHash = new Map<string, string[]>();
  private readonly idsByIngressChannelMetadataHash = new Map<string, string[]>();
  private readonly idsByProviderDeliveryRef = new Map<string, string[]>();
  private readonly idsByProviderEnvironment = new Map<string, string[]>();
  private readonly idsByReceiptState = new Map<string, string[]>();
  private readonly idsByRequestHash = new Map<string, string[]>();
  private readonly idsByResponseBodyHash = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityIngressReceipt>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByBoundInteractionRef.clear();
    this.idsByCorrelationStatus.clear();
    this.idsByDeliveryDedupeKey.clear();
    this.idsByDuplicateMeaningKey.clear();
    this.idsByIdempotencyKey.clear();
    this.idsByIdentityNamespaceHash.clear();
    this.idsByIngressChannelMetadataHash.clear();
    this.idsByProviderDeliveryRef.clear();
    this.idsByProviderEnvironment.clear();
    this.idsByReceiptState.clear();
    this.idsByRequestHash.clear();
    this.idsByResponseBodyHash.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.ingress_receipt_ref, stored.ingress_receipt_id);
      pushIndex(this.idsByBoundInteractionRef, stored.bound_interaction_ref, stored.ingress_receipt_id);
      pushIndex(this.idsByCorrelationStatus, stored.correlation_status, stored.ingress_receipt_id);
      pushIndex(this.idsByDeliveryDedupeKey, stored.delivery_dedupe_key, stored.ingress_receipt_id);
      pushIndex(this.idsByDuplicateMeaningKey, stored.duplicate_meaning_key, stored.ingress_receipt_id);
      pushIndex(this.idsByIdempotencyKey, stored.idempotency_key, stored.ingress_receipt_id);
      pushIndex(this.idsByIdentityNamespaceHash, stored.identity_namespace_hash, stored.ingress_receipt_id);
      pushIndex(this.idsByIngressChannelMetadataHash, stored.ingress_channel_metadata_hash, stored.ingress_receipt_id);
      pushIndex(this.idsByProviderDeliveryRef, stored.provider_delivery_ref, stored.ingress_receipt_id);
      pushIndex(this.idsByProviderEnvironment, stored.provider_environment, stored.ingress_receipt_id);
      pushIndex(this.idsByReceiptState, stored.receipt_state, stored.ingress_receipt_id);
      pushIndex(this.idsByRequestHash, stored.request_hash, stored.ingress_receipt_id);
      pushIndex(this.idsByResponseBodyHash, stored.response_body_hash, stored.ingress_receipt_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityIngressReceipt => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistAuthorityIngressReceipt(input: { receipt: AuthorityIngressReceipt }) {
    const receipt = normalizeAuthorityIngressReceipt(input.receipt);
    const existing = this.records.get(receipt.ingress_receipt_id);
    const ref = authorityIngressReceiptRef(receipt);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== receipt.ingress_receipt_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority ingress receipt ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && !stableEqual(existing.record, receipt)) {
      assertOnlyNormalizationChanged(existing.record, receipt);
    }
    if (existing !== undefined && stableEqual(existing.record, receipt)) {
      return cloneStored(existing);
    }
    const stored: StoredAuthorityIngressReceipt = {
      bound_interaction_ref: receipt.bound_interaction_ref,
      content_fingerprint: authorityIngressReceiptContentFingerprint(receipt),
      correlation_status: receipt.correlation_status,
      delivery_dedupe_key: receipt.delivery_dedupe_key,
      duplicate_meaning_key: receipt.duplicate_meaning_key,
      idempotency_key: receipt.idempotency_key,
      identity_namespace_hash: receipt.identity_namespace_hash,
      ingress_channel_metadata_hash: receipt.ingress_channel_metadata_hash,
      ingress_receipt_id: receipt.ingress_receipt_id,
      ingress_receipt_ref: ref,
      persisted_at: receipt.persisted_at,
      provider_delivery_ref: receipt.provider_delivery_ref,
      provider_environment: receipt.provider_environment,
      receipt_state: receipt.receipt_state,
      record: cloneAuthorityIngressReceipt(receipt),
      request_hash: receipt.request_hash,
      response_body_hash: receipt.response_body_hash,
      row_version: (existing?.row_version ?? 0) + 1,
    };
    this.records.set(stored.ingress_receipt_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async markAuthorityIngressReceiptNormalized(input: {
    ingress_receipt_id: string;
    normalized_response_ref: string;
    normalized_response_ref_in_proof?: string;
  }) {
    const stored = this.records.get(input.ingress_receipt_id);
    if (stored === undefined) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority ingress receipt ${input.ingress_receipt_id} does not exist`,
      );
    }
    const receipt = cloneAuthorityIngressReceipt(stored.record);
    const normalizedResponseRef = input.normalized_response_ref;
    const next = normalizeAuthorityIngressReceipt({
      ...receipt,
      authority_ingress_proof_contract: {
        ...receipt.authority_ingress_proof_contract,
        mutation_gate_state: "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT",
        normalized_response_ref_or_null: input.normalized_response_ref_in_proof ?? normalizedResponseRef,
      },
      normalized_response_ref: normalizedResponseRef,
      receipt_state: "NORMALIZED",
    });
    return this.persistAuthorityIngressReceipt({ receipt: next });
  }

  async getAuthorityIngressReceiptById(ingressReceiptId: string) {
    const stored = this.records.get(ingressReceiptId);
    return stored ? cloneStored(stored) : null;
  }

  async getAuthorityIngressReceiptByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listAuthorityIngressReceiptsByDeliveryDedupeKey(deliveryDedupeKey: string) {
    return this.listByIds(this.idsByDeliveryDedupeKey.get(deliveryDedupeKey) ?? []);
  }

  async getCanonicalAuthorityIngressReceiptByDeliveryDedupeKey(deliveryDedupeKey: string) {
    const receipts = await this.listAuthorityIngressReceiptsByDeliveryDedupeKey(deliveryDedupeKey);
    return receipts.find((stored) => stored.record.receipt_state !== "DUPLICATE_SUPPRESSED") ?? receipts[0] ?? null;
  }

  async listAuthorityIngressReceiptsByRequestHash(requestHash: string) {
    return this.listByIds(this.idsByRequestHash.get(requestHash) ?? []);
  }

  async listAuthorityIngressReceiptsByIdempotencyKey(idempotencyKey: string) {
    return this.listByIds(this.idsByIdempotencyKey.get(idempotencyKey) ?? []);
  }

  async listAuthorityIngressReceiptsByIdentityNamespaceHash(identityNamespaceHash: string) {
    return this.listByIds(this.idsByIdentityNamespaceHash.get(identityNamespaceHash) ?? []);
  }

  async listAuthorityIngressReceiptsByDuplicateMeaningKey(duplicateMeaningKey: string) {
    return this.listByIds(this.idsByDuplicateMeaningKey.get(duplicateMeaningKey) ?? []);
  }

  async listAuthorityIngressReceiptsByCorrelationStatus(correlationStatus: string) {
    return this.listByIds(this.idsByCorrelationStatus.get(correlationStatus) ?? []);
  }

  async listAuthorityIngressReceiptsByProviderDeliveryRef(providerDeliveryRef: string) {
    return this.listByIds(this.idsByProviderDeliveryRef.get(providerDeliveryRef) ?? []);
  }

  async listAuthorityIngressReceiptsByResponseBodyHash(responseBodyHash: string) {
    return this.listByIds(this.idsByResponseBodyHash.get(responseBodyHash) ?? []);
  }

  async listAuthorityIngressReceiptsByIngressChannelMetadataHash(ingressChannelMetadataHash: string) {
    return this.listByIds(this.idsByIngressChannelMetadataHash.get(ingressChannelMetadataHash) ?? []);
  }
}

