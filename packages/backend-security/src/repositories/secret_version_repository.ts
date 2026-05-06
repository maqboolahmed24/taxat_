import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  assertSecretVersion,
  cloneSecretVersion,
  normalizeSecretVersion,
  secretVersionContentHash,
  type SecretVersionRecord,
  SecretVersionModelError,
  type SecretVersionRotationState,
} from "../models/secret_version.ts";

export type StoredSecretVersion = {
  content_fingerprint: string;
  key_version_ref: string;
  lineage_ref: string;
  policy_profile_ref: string;
  record: SecretVersionRecord;
  rotation_state: SecretVersionRotationState;
  row_version: number;
  secret_class: string;
  secret_version_id: string;
  store_ref: string;
};

const LEGAL_SECRET_VERSION_TRANSITIONS: Record<
  SecretVersionRotationState,
  readonly SecretVersionRotationState[]
> = {
  ISSUED: ["ATTESTED", "REVOKED"],
  ATTESTED: ["ACTIVE", "REVOKED"],
  ACTIVE: ["ROTATING", "REVOKED"],
  ROTATING: ["RETIRED", "REVOKED"],
  RETIRED: ["REVOKED"],
  REVOKED: [],
};

function cloneStored(record: StoredSecretVersion): StoredSecretVersion {
  return {
    ...record,
    record: cloneSecretVersion(record.record),
  };
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStoredSecretVersions(left: StoredSecretVersion, right: StoredSecretVersion) {
  return (
    left.lineage_ref.localeCompare(right.lineage_ref) ||
    left.policy_profile_ref.localeCompare(right.policy_profile_ref) ||
    left.secret_class.localeCompare(right.secret_class) ||
    left.secret_version_id.localeCompare(right.secret_version_id)
  );
}

function immutableIdentity(record: SecretVersionRecord) {
  return {
    expires_at: record.expires_at,
    issued_at: record.issued_at,
    key_version_ref: record.key_version_ref,
    lineage_ref: record.lineage_ref,
    policy_profile_ref: record.policy_profile_ref,
    secret_class: record.secret_class,
    secret_version_id: record.secret_version_id,
    store_ref: record.store_ref,
  };
}

function stableEqual(left: unknown, right: unknown) {
  return stableJsonHash(left) === stableJsonHash(right);
}

function assertTransition(previous: SecretVersionRecord, next: SecretVersionRecord) {
  assertSecretVersion(
    stableEqual(immutableIdentity(previous), immutableIdentity(next)),
    "SECRET_VERSION_REPOSITORY_INVALID",
    `secret version ${previous.secret_version_id} immutable identity fields cannot change`,
  );
  if (previous.rotation_state === next.rotation_state) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_REPOSITORY_INVALID",
      `secret version ${previous.secret_version_id} state ${next.rotation_state} cannot be rewritten with different content`,
    );
  }
  assertSecretVersion(
    LEGAL_SECRET_VERSION_TRANSITIONS[previous.rotation_state].includes(next.rotation_state),
    "SECRET_VERSION_STATE_INVALID",
    `illegal SecretVersion transition ${previous.rotation_state}->${next.rotation_state}`,
  );
}

export class SecretVersionRepository {
  private readonly historyById = new Map<string, StoredSecretVersion[]>();
  private readonly idsByLineage = new Map<string, string[]>();
  private readonly records = new Map<string, StoredSecretVersion>();

  private rebuildIndexes() {
    this.idsByLineage.clear();
    for (const stored of this.records.values()) {
      pushIndex(this.idsByLineage, stored.lineage_ref, stored.secret_version_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredSecretVersion => record !== undefined)
      .sort(sortStoredSecretVersions)
      .map((record) => cloneStored(record));
  }

  private assertNoAmbiguousActiveVersion(candidate: SecretVersionRecord) {
    if (candidate.rotation_state !== "ACTIVE") {
      return;
    }
    for (const stored of this.records.values()) {
      if (stored.secret_version_id === candidate.secret_version_id) {
        continue;
      }
      if (
        stored.rotation_state === "ACTIVE" &&
        stored.lineage_ref === candidate.lineage_ref &&
        stored.policy_profile_ref === candidate.policy_profile_ref &&
        stored.secret_class === candidate.secret_class
      ) {
        throw new SecretVersionModelError(
          "SECRET_VERSION_REPOSITORY_INVALID",
          `active SecretVersion is ambiguous for lineage ${candidate.lineage_ref}`,
        );
      }
    }
  }

  private assertSupersessionTarget(candidate: SecretVersionRecord) {
    if (candidate.superseded_by_secret_version_id === null) {
      return;
    }
    const successor = this.records.get(candidate.superseded_by_secret_version_id);
    assertSecretVersion(
      successor !== undefined,
      "SECRET_VERSION_LINEAGE_INVALID",
      `superseded_by_secret_version_id ${candidate.superseded_by_secret_version_id} must already exist`,
    );
    assertSecretVersion(
      successor.lineage_ref === candidate.lineage_ref &&
        successor.policy_profile_ref === candidate.policy_profile_ref &&
        successor.secret_class === candidate.secret_class,
      "SECRET_VERSION_LINEAGE_INVALID",
      "supersession target must remain inside the same lineage, policy profile, and secret class",
    );
  }

  private assertNoCyclicalSupersession(candidate: SecretVersionRecord) {
    const seen = new Set<string>([candidate.secret_version_id]);
    let nextId = candidate.superseded_by_secret_version_id;
    while (nextId !== null) {
      assertSecretVersion(
        !seen.has(nextId),
        "SECRET_VERSION_LINEAGE_INVALID",
        `SecretVersion lineage creates a supersession cycle at ${nextId}`,
      );
      seen.add(nextId);
      const next = this.records.get(nextId)?.record;
      nextId = next?.superseded_by_secret_version_id ?? null;
    }
  }

  async persistSecretVersion(input: { secret_version: SecretVersionRecord }) {
    const secretVersion = normalizeSecretVersion(input.secret_version);
    this.assertNoAmbiguousActiveVersion(secretVersion);
    this.assertSupersessionTarget(secretVersion);
    this.assertNoCyclicalSupersession(secretVersion);

    const existing = this.records.get(secretVersion.secret_version_id);
    if (existing !== undefined) {
      if (stableEqual(existing.record, secretVersion)) {
        return cloneStored(existing);
      }
      assertTransition(existing.record, secretVersion);
    }

    const stored: StoredSecretVersion = {
      content_fingerprint: secretVersionContentHash(secretVersion),
      key_version_ref: secretVersion.key_version_ref,
      lineage_ref: secretVersion.lineage_ref,
      policy_profile_ref: secretVersion.policy_profile_ref,
      record: cloneSecretVersion(secretVersion),
      rotation_state: secretVersion.rotation_state,
      row_version: existing === undefined ? 1 : existing.row_version + 1,
      secret_class: secretVersion.secret_class,
      secret_version_id: secretVersion.secret_version_id,
      store_ref: secretVersion.store_ref,
    };
    this.records.set(stored.secret_version_id, cloneStored(stored));
    this.historyById.set(stored.secret_version_id, [
      ...(this.historyById.get(stored.secret_version_id) ?? []),
      cloneStored(stored),
    ]);
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getSecretVersionById(secretVersionId: string) {
    const stored = this.records.get(secretVersionId);
    return stored ? cloneStored(stored) : null;
  }

  async listSecretVersionHistory(secretVersionId: string) {
    return (this.historyById.get(secretVersionId) ?? []).map((record) => cloneStored(record));
  }

  async listSecretVersionsByLineageRef(lineageRef: string) {
    return this.listByIds(this.idsByLineage.get(lineageRef) ?? []);
  }

  async listSecretVersionsByPolicy(input: {
    lineage_ref: string;
    policy_profile_ref: string;
    secret_class?: string;
  }) {
    return (await this.listSecretVersionsByLineageRef(input.lineage_ref)).filter(
      (stored) =>
        stored.policy_profile_ref === input.policy_profile_ref &&
        (input.secret_class === undefined || stored.secret_class === input.secret_class),
    );
  }
}
