import type {
  AuthorityReconciliationAnalyticsSnapshotRepository,
  AuthorityReconciliationSnapshotQuery,
  StoredAuthorityReconciliationAnalyticsSnapshot,
} from "../repositories/authority_reconciliation_analytics_snapshot_repository.ts";

export type QueryReconciliationSnapshotsByProfileInput = AuthorityReconciliationSnapshotQuery & {
  repository: AuthorityReconciliationAnalyticsSnapshotRepository;
};

export type QueryReconciliationSnapshotsByProfileResult = {
  filters: AuthorityReconciliationSnapshotQuery;
  snapshots: StoredAuthorityReconciliationAnalyticsSnapshot[];
};

export async function queryReconciliationSnapshotsByProfile(
  input: QueryReconciliationSnapshotsByProfileInput,
): Promise<QueryReconciliationSnapshotsByProfileResult> {
  const { repository, ...filters } = input;
  const snapshots = await repository.queryAuthorityReconciliationAnalyticsSnapshots(filters);
  return {
    filters,
    snapshots,
  };
}
