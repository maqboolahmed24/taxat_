import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneFraudHeaderValidation,
  fraudHeaderValidationContentFingerprint,
  normalizeFraudHeaderValidation,
  type FraudHeaderValidation,
} from "../models/fraud_header_validation.ts";

export type StoredFraudHeaderValidation = {
  capture_ref: string;
  client_id: string;
  content_fingerprint: string;
  fraud_header_profile_ref: string;
  header_set_hash: string;
  provider_environment: string;
  record: FraudHeaderValidation;
  result_code: string;
  row_version: number;
  subject_ref: string;
  tenant_id: string;
  validation_hash: string;
  validation_id: string;
  validation_ref: string;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current.sort());
  }
}

export class FraudHeaderValidationRepository {
  private readonly idByHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByCapture = new Map<string, string[]>();
  private readonly idsByHeaderSetHash = new Map<string, string[]>();
  private readonly idsByProfile = new Map<string, string[]>();
  private readonly idsByTuple = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFraudHeaderValidation>();

  private rebuildIndexes() {
    this.idByHash.clear();
    this.idByRef.clear();
    this.idsByCapture.clear();
    this.idsByHeaderSetHash.clear();
    this.idsByProfile.clear();
    this.idsByTuple.clear();
    for (const stored of this.records.values()) {
      this.idByHash.set(stored.validation_hash, stored.validation_id);
      this.idByRef.set(stored.validation_ref, stored.validation_id);
      pushIndex(this.idsByCapture, stored.capture_ref, stored.validation_id);
      pushIndex(this.idsByHeaderSetHash, stored.header_set_hash, stored.validation_id);
      pushIndex(this.idsByProfile, stored.fraud_header_profile_ref, stored.validation_id);
      pushIndex(
        this.idsByTuple,
        `${stored.tenant_id}:${stored.client_id}:${stored.subject_ref}:${stored.provider_environment}`,
        stored.validation_id,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredFraudHeaderValidation => record !== undefined)
      .map((record) => cloneRecord(record));
  }

  async upsertFraudHeaderValidation(input: { validation: FraudHeaderValidation }) {
    const validation = normalizeFraudHeaderValidation(input.validation);
    const existing = this.records.get(validation.validation_id);
    if (existing && !stableEqual(existing.record, validation)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `fraud header validation ${validation.validation_id} is immutable and cannot mutate in place`,
      );
    }
    for (const [label, index, value] of [
      ["validation_ref", this.idByRef, validation.validation_ref],
      ["validation_hash", this.idByHash, validation.validation_hash],
    ] as const) {
      const owner = index.get(value);
      if (owner !== undefined && owner !== validation.validation_id) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `${label} ${value} already belongs to fraud header validation ${owner}`,
        );
      }
    }
    if (existing) {
      return cloneRecord(existing);
    }
    const stored: StoredFraudHeaderValidation = {
      capture_ref: validation.capture_ref,
      client_id: validation.client_id,
      content_fingerprint: fraudHeaderValidationContentFingerprint(validation),
      fraud_header_profile_ref: validation.fraud_header_profile_ref,
      header_set_hash: validation.header_set_hash,
      provider_environment: validation.provider_environment,
      record: cloneFraudHeaderValidation(validation),
      result_code: validation.result_code,
      row_version: 1,
      subject_ref: validation.subject_ref,
      tenant_id: validation.tenant_id,
      validation_hash: validation.validation_hash,
      validation_id: validation.validation_id,
      validation_ref: validation.validation_ref,
    };
    this.records.set(stored.validation_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getFraudHeaderValidationById(validationId: string) {
    const stored = this.records.get(validationId);
    return stored ? cloneRecord(stored) : null;
  }

  async getFraudHeaderValidationByRef(validationRef: string) {
    const id = this.idByRef.get(validationRef);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async listFraudHeaderValidationsByCapture(captureRef: string) {
    return this.listByIds(this.idsByCapture.get(captureRef) ?? []);
  }

  async listFraudHeaderValidationsByProfile(profileRef: string) {
    return this.listByIds(this.idsByProfile.get(profileRef) ?? []);
  }

  async listFraudHeaderValidationsByHeaderSetHash(headerSetHash: string) {
    return this.listByIds(this.idsByHeaderSetHash.get(headerSetHash) ?? []);
  }

  async listFraudHeaderValidationsByTuple(input: {
    tenant_id: string;
    client_id: string;
    subject_ref: string;
    provider_environment: string;
  }) {
    return this.listByIds(
      this.idsByTuple.get(
        `${input.tenant_id}:${input.client_id}:${input.subject_ref}:${input.provider_environment}`,
      ) ?? [],
    );
  }
}
