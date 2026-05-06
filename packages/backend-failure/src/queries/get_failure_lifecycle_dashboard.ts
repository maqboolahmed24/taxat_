import {
  normalizeFailureLifecycleDashboard,
  type FailureLifecycleDashboard,
  type FailureLifecycleDashboardQuery,
  type FailureLifecycleDashboardRepository,
} from "../../../backend-workflow/src/index.ts";

export class FailureLifecycleDashboardQueryError extends Error {
  readonly code:
    | "FAILURE_LIFECYCLE_DASHBOARD_QUERY_AMBIGUOUS"
    | "FAILURE_LIFECYCLE_DASHBOARD_QUERY_EMPTY";

  constructor(code: FailureLifecycleDashboardQueryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "FailureLifecycleDashboardQueryError";
    this.code = code;
  }
}

export type GetFailureLifecycleDashboardInput =
  | {
      dashboard_id: string;
      repository: FailureLifecycleDashboardRepository;
    }
  | ({
      dashboard_id?: undefined;
      repository: FailureLifecycleDashboardRepository;
    } & FailureLifecycleDashboardQuery);

export async function getFailureLifecycleDashboard(
  input: GetFailureLifecycleDashboardInput,
): Promise<FailureLifecycleDashboard | null> {
  if (input.dashboard_id !== undefined) {
    const stored = await input.repository.getFailureLifecycleDashboardById(
      input.dashboard_id,
    );
    return stored === null ? null : normalizeFailureLifecycleDashboard(stored.record);
  }

  const { dashboard_id: _dashboardId, repository, ...query } = input;
  const stored = await repository.queryFailureLifecycleDashboards(query);
  if (stored.length === 0) {
    return null;
  }
  if (stored.length > 1) {
    throw new FailureLifecycleDashboardQueryError(
      "FAILURE_LIFECYCLE_DASHBOARD_QUERY_AMBIGUOUS",
      "getFailureLifecycleDashboard requires a unique dashboard_id or a unique query result",
    );
  }
  const dashboard = stored[0];
  if (dashboard === undefined) {
    return null;
  }
  return normalizeFailureLifecycleDashboard(dashboard.record);
}

export async function requireFailureLifecycleDashboard(
  input: GetFailureLifecycleDashboardInput,
): Promise<FailureLifecycleDashboard> {
  const dashboard = await getFailureLifecycleDashboard(input);
  if (dashboard === null) {
    throw new FailureLifecycleDashboardQueryError(
      "FAILURE_LIFECYCLE_DASHBOARD_QUERY_EMPTY",
      "failure lifecycle dashboard was not found",
    );
  }
  return dashboard;
}
