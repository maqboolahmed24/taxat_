import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneFraudHeaderCapture,
  fraudHeaderCaptureContentFingerprint,
  normalizeFraudHeaderCapture,
  type FraudHeaderCapture,
} from "../models/fraud_header_capture.ts";

export type StoredFraudHeaderCapture = {
  capture_fingerprint: string;
  capture_id: string;
  capture_ref: string;
  client_id: string;
  content_fingerprint: string;
  fraud_header_profile_ref: string;
  header_set_hash: string;
  provider_environment: string;
  record: FraudHeaderCapture;
  row_version: number;
  subject_ref: string;
  tenant_id: string;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current.sort());
  }
}

export class FraudHeaderCaptureRepository {
  private readonly idByFingerprint = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByHeaderSetHash = new Map<string, string[]>();
  private readonly idsByProfile = new Map<string, string[]>();
  private readonly idsByTuple = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFraudHeaderCapture>();

  private rebuildIndexes() {
    this.idByFingerprint.clear();
    this.idByRef.clear();
    this.idsByHeaderSetHash.clear();
    this.idsByProfile.clear();
    this.idsByTuple.clear();
    for (const stored of this.records.values()) {
      this.idByFingerprint.set(stored.capture_fingerprint, stored.capture_id);
      this.idByRef.set(stored.capture_ref, stored.capture_id);
      pushIndex(this.idsByHeaderSetHash, stored.header_set_hash, stored.capture_id);
      pushIndex(this.idsByProfile, stored.fraud_header_profile_ref, stored.capture_id);
      pushIndex(
        this.idsByTuple,
        `${stored.tenant_id}:${stored.client_id}:${stored.subject_ref}:${stored.provider_environment}`,
        stored.capture_id,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredFraudHeaderCapture => record !== undefined)
      .map((record) => cloneRecord(record));
  }

  async upsertFraudHeaderCapture(input: { capture: FraudHeaderCapture }) {
    const capture = normalizeFraudHeaderCapture(input.capture);
    const existing = this.records.get(capture.capture_id);
    if (existing && !stableEqual(existing.record, capture)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `fraud header capture ${capture.capture_id} is immutable and cannot mutate in place`,
      );
    }
    for (const [label, index, value] of [
      ["capture_ref", this.idByRef, capture.capture_ref],
      ["capture_fingerprint", this.idByFingerprint, capture.capture_fingerprint],
    ] as const) {
      const owner = index.get(value);
      if (owner !== undefined && owner !== capture.capture_id) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `${label} ${value} already belongs to fraud header capture ${owner}`,
        );
      }
    }
    if (existing) {
      return cloneRecord(existing);
    }
    const stored: StoredFraudHeaderCapture = {
      capture_fingerprint: capture.capture_fingerprint,
      capture_id: capture.capture_id,
      capture_ref: capture.capture_ref,
      client_id: capture.client_id,
      content_fingerprint: fraudHeaderCaptureContentFingerprint(capture),
      fraud_header_profile_ref: capture.fraud_header_profile_ref,
      header_set_hash: capture.header_set_hash,
      provider_environment: capture.provider_environment,
      record: cloneFraudHeaderCapture(capture),
      row_version: 1,
      subject_ref: capture.subject_ref,
      tenant_id: capture.tenant_id,
    };
    this.records.set(stored.capture_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getFraudHeaderCaptureById(captureId: string) {
    const stored = this.records.get(captureId);
    return stored ? cloneRecord(stored) : null;
  }

  async getFraudHeaderCaptureByRef(captureRef: string) {
    const id = this.idByRef.get(captureRef);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async getFraudHeaderCaptureByFingerprint(captureFingerprint: string) {
    const id = this.idByFingerprint.get(captureFingerprint);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async listFraudHeaderCapturesByHeaderSetHash(headerSetHash: string) {
    return this.listByIds(this.idsByHeaderSetHash.get(headerSetHash) ?? []);
  }

  async listFraudHeaderCapturesByProfile(profileRef: string) {
    return this.listByIds(this.idsByProfile.get(profileRef) ?? []);
  }

  async listFraudHeaderCapturesByTuple(input: {
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
