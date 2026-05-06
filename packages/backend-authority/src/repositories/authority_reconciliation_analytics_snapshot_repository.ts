import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  type AuthorityReconciliationAnalyticsSnapshot,
  authorityReconciliationAnalyticsSnapshotContentFingerprint,
  authorityReconciliationAnalyticsSnapshotRef,
  cloneAuthorityReconciliationAnalyticsSnapshot,
  normalizeAuthorityReconciliationAnalyticsSnapshot,
} from "../models/authority_reconciliation_analytics_snapshot.ts";

export type StoredAuthorityReconciliationAnalyticsSnapshot = {
  authority_operation_profile_ref: string;
  content_fingerprint: string;
  operation_family: string;
  provider_environment: string;
  record: AuthorityReconciliationAnalyticsSnapshot;
  row_version: number;
  snapshot_id: string;
  snapshot_ref: string;
  window_ended_at: string;
  window_started_at: string;
};

export type AuthorityReconciliationSnapshotQuery = {
  ambiguity_heavy?: boolean;
  ambiguity_ratio_at_least?: number;
  authority_operation_profile_ref?: string;
  escalation_only?: boolean;
  operation_family?: string;
  provider_environment?: string;
  resume_heavy?: boolean;
  resume_ratio_at_least?: number;
  unresolved_only?: boolean;
  window_ended_at_or_before?: string;
  window_started_at_or_after?: string;
};

function cloneStored(stored: StoredAuthorityReconciliationAnalyticsSnapshot) {
  return cloneRecord(stored);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(
  left: StoredAuthorityReconciliationAnalyticsSnapshot,
  right: StoredAuthorityReconciliationAnalyticsSnapshot,
) {
  return (
    left.provider_environment.localeCompare(right.provider_environment) ||
    left.operation_family.localeCompare(right.operation_family) ||
    left.authority_operation_profile_ref.localeCompare(right.authority_operation_profile_ref) ||
    left.window_started_at.localeCompare(right.window_started_at) ||
    left.window_ended_at.localeCompare(right.window_ended_at) ||
    left.snapshot_id.localeCompare(right.snapshot_id)
  );
}

function outcomeCount(snapshot: AuthorityReconciliationAnalyticsSnapshot, code: string) {
  return snapshot.outcome_class_counts.find((entry) => entry.code === code)?.count ?? 0;
}

function matchesQuery(
  snapshot: AuthorityReconciliationAnalyticsSnapshot,
  query: AuthorityReconciliationSnapshotQuery,
) {
  if (
    query.authority_operation_profile_ref !== undefined &&
    snapshot.authority_operation_profile_ref !== query.authority_operation_profile_ref
  ) {
    return false;
  }
  if (
    query.provider_environment !== undefined &&
    snapshot.provider_environment !== query.provider_environment
  ) {
    return false;
  }
  if (query.operation_family !== undefined && snapshot.operation_family !== query.operation_family) {
    return false;
  }
  if (
    query.window_started_at_or_after !== undefined &&
    snapshot.window_started_at < query.window_started_at_or_after
  ) {
    return false;
  }
  if (
    query.window_ended_at_or_before !== undefined &&
    snapshot.window_ended_at > query.window_ended_at_or_before
  ) {
    return false;
  }
  if (
    query.unresolved_only === true &&
    snapshot.unresolved_ambiguity_count === 0 &&
    outcomeCount(snapshot, "AMBIGUOUS") === 0 &&
    outcomeCount(snapshot, "UNKNOWN") === 0 &&
    outcomeCount(snapshot, "PENDING_ACK") === 0
  ) {
    return false;
  }
  if (query.escalation_only === true && snapshot.escalated_count === 0) {
    return false;
  }
  if (query.resume_heavy === true) {
    const ratio =
      snapshot.total_interaction_count === 0
        ? 0
        : snapshot.replay_resume_count / snapshot.total_interaction_count;
    if (ratio < (query.resume_ratio_at_least ?? 0.25)) {
      return false;
    }
  }
  if (query.ambiguity_heavy === true) {
    const ratio =
      snapshot.total_interaction_count === 0
        ? 0
        : snapshot.unresolved_ambiguity_count / snapshot.total_interaction_count;
    if (ratio < (query.ambiguity_ratio_at_least ?? 0.2)) {
      return false;
    }
  }
  return true;
}

export class AuthorityReconciliationAnalyticsSnapshotRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByOperationFamily = new Map<string, string[]>();
  private readonly idsByProfile = new Map<string, string[]>();
  private readonly idsByProviderEnvironment = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityReconciliationAnalyticsSnapshot>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByOperationFamily.clear();
    this.idsByProfile.clear();
    this.idsByProviderEnvironment.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.snapshot_ref, stored.snapshot_id);
      pushIndex(
        this.idsByOperationFamily,
        stored.operation_family,
        stored.snapshot_id,
      );
      pushIndex(
        this.idsByProfile,
        stored.authority_operation_profile_ref,
        stored.snapshot_id,
      );
      pushIndex(
        this.idsByProviderEnvironment,
        stored.provider_environment,
        stored.snapshot_id,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredAuthorityReconciliationAnalyticsSnapshot => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistAuthorityReconciliationAnalyticsSnapshot(input: {
    snapshot: AuthorityReconciliationAnalyticsSnapshot;
  }) {
    const snapshot = normalizeAuthorityReconciliationAnalyticsSnapshot(input.snapshot);
    const existing = this.records.get(snapshot.snapshot_id);
    const snapshotRef = authorityReconciliationAnalyticsSnapshotRef(snapshot);
    const refOwner = this.idByRef.get(snapshotRef);
    if (refOwner !== undefined && refOwner !== snapshot.snapshot_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority reconciliation analytics snapshot ref ${snapshotRef} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && !stableEqual(existing.record, snapshot)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        "AuthorityReconciliationAnalyticsSnapshot is replay-safe and cannot mutate in place",
      );
    }
    if (existing !== undefined) {
      return cloneStored(existing);
    }

    const stored: StoredAuthorityReconciliationAnalyticsSnapshot = {
      authority_operation_profile_ref: snapshot.authority_operation_profile_ref,
      content_fingerprint: authorityReconciliationAnalyticsSnapshotContentFingerprint(snapshot),
      operation_family: snapshot.operation_family,
      provider_environment: snapshot.provider_environment,
      record: cloneAuthorityReconciliationAnalyticsSnapshot(snapshot),
      row_version: 1,
      snapshot_id: snapshot.snapshot_id,
      snapshot_ref: snapshotRef,
      window_ended_at: snapshot.window_ended_at,
      window_started_at: snapshot.window_started_at,
    };
    this.records.set(stored.snapshot_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getAuthorityReconciliationAnalyticsSnapshotById(snapshotId: string) {
    const stored = this.records.get(snapshotId);
    return stored ? cloneStored(stored) : null;
  }

  async getAuthorityReconciliationAnalyticsSnapshotByRef(snapshotRef: string) {
    const id = this.idByRef.get(snapshotRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listAuthorityReconciliationAnalyticsSnapshotsByProfile(
    authorityOperationProfileRef: string,
  ) {
    return this.listByIds(this.idsByProfile.get(authorityOperationProfileRef) ?? []);
  }

  async listAuthorityReconciliationAnalyticsSnapshotsByProviderEnvironment(
    providerEnvironment: string,
  ) {
    return this.listByIds(this.idsByProviderEnvironment.get(providerEnvironment) ?? []);
  }

  async listAuthorityReconciliationAnalyticsSnapshotsByOperationFamily(
    operationFamily: string,
  ) {
    return this.listByIds(this.idsByOperationFamily.get(operationFamily) ?? []);
  }

  async queryAuthorityReconciliationAnalyticsSnapshots(
    query: AuthorityReconciliationSnapshotQuery = {},
  ) {
    return [...this.records.values()]
      .filter((stored) => matchesQuery(stored.record, query))
      .sort(sortStored)
      .map(cloneStored);
  }
}
