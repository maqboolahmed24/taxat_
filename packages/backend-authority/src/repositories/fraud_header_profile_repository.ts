import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneFraudHeaderProfile,
  fraudHeaderProfileContentFingerprint,
  normalizeFraudHeaderProfile,
  type FraudHeaderProfile,
} from "../models/fraud_header_profile.ts";

export type StoredFraudHeaderProfile = {
  content_fingerprint: string;
  fraud_header_profile_ref: string;
  profile_hash: string;
  profile_id: string;
  record: FraudHeaderProfile;
  row_version: number;
};

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current.sort());
  }
}

export class FraudHeaderProfileRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByApplicability = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFraudHeaderProfile>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByApplicability.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.fraud_header_profile_ref, stored.profile_id);
      for (const environment of stored.record.provider_environments) {
        for (const product of stored.record.authority_product_profiles) {
          for (const family of stored.record.operation_families) {
            pushIndex(
              this.idsByApplicability,
              `${stored.record.authority_name}:${product}:${environment}:${family}`,
              stored.profile_id,
            );
          }
        }
      }
    }
  }

  async upsertFraudHeaderProfile(input: { profile: FraudHeaderProfile }) {
    const profile = normalizeFraudHeaderProfile(input.profile);
    const existing = this.records.get(profile.profile_id);
    if (existing && !stableEqual(existing.record, profile)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `fraud header profile ${profile.profile_id} is immutable and cannot mutate in place`,
      );
    }
    const refOwner = this.idByRef.get(profile.fraud_header_profile_ref);
    if (refOwner !== undefined && refOwner !== profile.profile_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `fraud header profile ref ${profile.fraud_header_profile_ref} already belongs to ${refOwner}`,
      );
    }
    if (existing) {
      return cloneRecord(existing);
    }
    const stored: StoredFraudHeaderProfile = {
      content_fingerprint: fraudHeaderProfileContentFingerprint(profile),
      fraud_header_profile_ref: profile.fraud_header_profile_ref,
      profile_hash: profile.profile_hash,
      profile_id: profile.profile_id,
      record: cloneFraudHeaderProfile(profile),
      row_version: 1,
    };
    this.records.set(stored.profile_id, cloneRecord(stored));
    this.rebuildIndexes();
    return cloneRecord(stored);
  }

  async getFraudHeaderProfileById(profileId: string) {
    const stored = this.records.get(profileId);
    return stored ? cloneRecord(stored) : null;
  }

  async getFraudHeaderProfileByRef(profileRef: string) {
    const id = this.idByRef.get(profileRef);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneRecord(stored) : null;
  }

  async listFraudHeaderProfilesForOperation(input: {
    authority_name: string;
    authority_product_profile: string;
    operation_family: string;
    provider_environment: string;
  }) {
    const key = `${input.authority_name}:${input.authority_product_profile}:${input.provider_environment}:${input.operation_family}`;
    return (this.idsByApplicability.get(key) ?? [])
      .map((id) => this.records.get(id))
      .filter((record): record is StoredFraudHeaderProfile => record !== undefined)
      .map((record) => cloneRecord(record));
  }
}
