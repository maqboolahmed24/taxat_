import type {
  FailureLifecycleDashboardQuery,
  FailureLifecycleDashboardRepository,
} from "../repositories/failure_lifecycle_dashboard_repository.ts";

export type QueryFailureLifecycleDashboardInput =
  | {
      dashboard_id: string;
      repository: FailureLifecycleDashboardRepository;
    }
  | ({
      dashboard_id?: undefined;
      repository: FailureLifecycleDashboardRepository;
    } & FailureLifecycleDashboardQuery);

export async function queryFailureLifecycleDashboard(
  input: QueryFailureLifecycleDashboardInput,
) {
  if (input.dashboard_id !== undefined) {
    const stored = await input.repository.getFailureLifecycleDashboardById(input.dashboard_id);
    return stored?.record ?? null;
  }
  const { dashboard_id: _dashboardId, repository, ...query } = input;
  const stored = await repository.queryFailureLifecycleDashboards(query);
  return stored.map((dashboard) => dashboard.record);
}
