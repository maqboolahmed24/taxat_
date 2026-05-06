import {
  cloneFailureLifecycleDashboard,
  failureLifecycleDashboardContentFingerprint,
  normalizeFailureLifecycleDashboard,
  type FailureLifecycleDashboard,
  type FailureLineageState,
} from "../models/failure_lifecycle_dashboard.ts";
import { failureCompanionStableEqual } from "../models/failure_companion_common.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type StoredFailureLifecycleDashboard = {
  content_fingerprint: string;
  current_error_ref: string;
  current_lineage_state: FailureLineageState;
  dashboard_id: string;
  manifest_id: string;
  record: FailureLifecycleDashboard;
  root_error_ref: string;
  root_manifest_id: string;
  row_version: number;
  updated_at: string;
};

export type FailureLifecycleDashboardQuery = {
  current_error_ref?: string | undefined;
  current_lineage_state?: FailureLineageState | undefined;
  manifest_id?: string | undefined;
  root_error_ref?: string | undefined;
  root_manifest_id?: string | undefined;
};

function cloneStored(stored: StoredFailureLifecycleDashboard) {
  return JSON.parse(JSON.stringify(stored)) as StoredFailureLifecycleDashboard;
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
  left: StoredFailureLifecycleDashboard,
  right: StoredFailureLifecycleDashboard,
) {
  return (
    left.root_error_ref.localeCompare(right.root_error_ref) ||
    left.current_error_ref.localeCompare(right.current_error_ref) ||
    left.dashboard_id.localeCompare(right.dashboard_id)
  );
}

function assertImmutableIdentity(
  existing: FailureLifecycleDashboard,
  next: FailureLifecycleDashboard,
) {
  const fields = ["dashboard_id", "root_error_ref"] as const;
  for (const field of fields) {
    if (existing[field] !== next[field]) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `failure lifecycle dashboard ${field} is immutable`,
      );
    }
  }
}

function matchesQuery(
  stored: StoredFailureLifecycleDashboard,
  query: FailureLifecycleDashboardQuery,
) {
  if (query.current_error_ref !== undefined && stored.current_error_ref !== query.current_error_ref) {
    return false;
  }
  if (query.root_error_ref !== undefined && stored.root_error_ref !== query.root_error_ref) {
    return false;
  }
  if (query.manifest_id !== undefined && stored.manifest_id !== query.manifest_id) {
    return false;
  }
  if (query.root_manifest_id !== undefined && stored.root_manifest_id !== query.root_manifest_id) {
    return false;
  }
  if (
    query.current_lineage_state !== undefined &&
    stored.current_lineage_state !== query.current_lineage_state
  ) {
    return false;
  }
  return true;
}

export class FailureLifecycleDashboardRepository {
  private readonly idsByCurrentError = new Map<string, string[]>();
  private readonly idsByLineageState = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByRootError = new Map<string, string[]>();
  private readonly idsByRootManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFailureLifecycleDashboard>();

  private rebuildIndexes() {
    this.idsByCurrentError.clear();
    this.idsByLineageState.clear();
    this.idsByManifest.clear();
    this.idsByRootError.clear();
    this.idsByRootManifest.clear();

    for (const stored of this.records.values()) {
      pushIndex(this.idsByCurrentError, stored.current_error_ref, stored.dashboard_id);
      pushIndex(this.idsByRootError, stored.root_error_ref, stored.dashboard_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.dashboard_id);
      pushIndex(this.idsByRootManifest, stored.root_manifest_id, stored.dashboard_id);
      pushIndex(this.idsByLineageState, stored.current_lineage_state, stored.dashboard_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredFailureLifecycleDashboard => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistFailureLifecycleDashboard(input: { dashboard: FailureLifecycleDashboard }) {
    const dashboard = normalizeFailureLifecycleDashboard(input.dashboard);
    const existing = this.records.get(dashboard.dashboard_id);
    if (existing !== undefined && failureCompanionStableEqual(existing.record, dashboard)) {
      return cloneStored(existing);
    }
    if (existing !== undefined) {
      assertImmutableIdentity(existing.record, dashboard);
    }

    const stored: StoredFailureLifecycleDashboard = {
      content_fingerprint: failureLifecycleDashboardContentFingerprint(dashboard),
      current_error_ref: dashboard.current_error_ref,
      current_lineage_state: dashboard.current_lineage_state,
      dashboard_id: dashboard.dashboard_id,
      manifest_id: dashboard.manifest_id,
      record: cloneFailureLifecycleDashboard(dashboard),
      root_error_ref: dashboard.root_error_ref,
      root_manifest_id: dashboard.root_manifest_id,
      row_version: (existing?.row_version ?? 0) + 1,
      updated_at: dashboard.updated_at,
    };
    this.records.set(stored.dashboard_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getFailureLifecycleDashboardById(dashboardId: string) {
    const stored = this.records.get(dashboardId);
    return stored ? cloneStored(stored) : null;
  }

  async listFailureLifecycleDashboardsByCurrentError(currentErrorRef: string) {
    return this.listByIds(this.idsByCurrentError.get(currentErrorRef) ?? []);
  }

  async listFailureLifecycleDashboardsByRootError(rootErrorRef: string) {
    return this.listByIds(this.idsByRootError.get(rootErrorRef) ?? []);
  }

  async listFailureLifecycleDashboardsByState(state: FailureLineageState) {
    return this.listByIds(this.idsByLineageState.get(state) ?? []);
  }

  async queryFailureLifecycleDashboards(query: FailureLifecycleDashboardQuery) {
    return [...this.records.values()]
      .filter((stored) => matchesQuery(stored, query))
      .sort(sortStored)
      .map(cloneStored);
  }
}
