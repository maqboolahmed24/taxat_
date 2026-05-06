import {
  normalizeFailureLifecycleDashboard,
  type FailureLifecycleDashboard,
  type FailureLifecycleDashboardQuery,
  type FailureLifecycleDashboardRepository,
} from "../../../backend-workflow/src/index.ts";

export type ListFailureLifecycleDashboardsInput = FailureLifecycleDashboardQuery & {
  cursor_offset?: number | undefined;
  limit?: number | undefined;
  repository: FailureLifecycleDashboardRepository;
};

export type FailureLifecycleDashboardListPage = {
  cursor_offset: number;
  limit: number;
  next_cursor_offset_or_null: number | null;
  total_count: number;
};

export type FailureLifecycleDashboardListResult = {
  dashboards: FailureLifecycleDashboard[];
  filters: FailureLifecycleDashboardQuery;
  page: FailureLifecycleDashboardListPage;
};

function normalizeNonNegativeInteger(label: string, value: number | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function normalizeLimit(value: number | undefined) {
  const limit = normalizeNonNegativeInteger("limit", value, 50);
  if (limit < 1 || limit > 250) {
    throw new Error("limit must be in [1, 250]");
  }
  return limit;
}

export async function listFailureLifecycleDashboards(
  input: ListFailureLifecycleDashboardsInput,
): Promise<FailureLifecycleDashboardListResult> {
  const {
    cursor_offset: cursorOffsetInput,
    limit: limitInput,
    repository,
    ...filters
  } = input;
  const cursorOffset = normalizeNonNegativeInteger(
    "cursor_offset",
    cursorOffsetInput,
    0,
  );
  const limit = normalizeLimit(limitInput);
  const stored = await repository.queryFailureLifecycleDashboards(filters);
  const pageItems = stored.slice(cursorOffset, cursorOffset + limit);
  const nextCursorOffset =
    cursorOffset + limit < stored.length ? cursorOffset + limit : null;
  return {
    dashboards: pageItems.map((entry) => normalizeFailureLifecycleDashboard(entry.record)),
    filters,
    page: {
      cursor_offset: cursorOffset,
      limit,
      next_cursor_offset_or_null: nextCursorOffset,
      total_count: stored.length,
    },
  };
}
