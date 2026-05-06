import type { OperatorMorningDigestRepository } from "./operator_morning_digest_repository.ts";
import {
  getOperatorMorningDigest,
  type OperatorMorningDigestQueryResult,
} from "./get_operator_morning_digest.ts";

export type ListOperatorMorningDigestsInput = {
  coverage_date?: string | undefined;
  cursor_offset?: number | undefined;
  include_superseded?: boolean | undefined;
  limit?: number | undefined;
  repository: OperatorMorningDigestRepository;
  tenant_id?: string | undefined;
};

export type OperatorMorningDigestListResult = {
  cache_key: string;
  digests: OperatorMorningDigestQueryResult[];
  filters: {
    coverage_date: string | null;
    include_superseded: boolean;
    tenant_id: string | null;
  };
  page: {
    cursor_offset: number;
    limit: number;
    next_cursor_offset_or_null: number | null;
    total_count: number;
  };
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

export async function listOperatorMorningDigests(
  input: ListOperatorMorningDigestsInput,
): Promise<OperatorMorningDigestListResult> {
  const includeSuperseded = input.include_superseded ?? false;
  const limit = normalizeLimit(input.limit);
  const cursorOffset = normalizeNonNegativeInteger("cursor_offset", input.cursor_offset, 0);
  const stored = await input.repository.listOperatorMorningDigests({
    coverage_date: input.coverage_date,
    include_superseded: includeSuperseded,
    tenant_id: input.tenant_id,
  });
  const pageItems = stored.slice(cursorOffset, cursorOffset + limit);
  const digests = await Promise.all(
    pageItems.map((item) =>
      getOperatorMorningDigest({
        coverage_date: item.coverage_date,
        digest_id: item.digest_id,
        repository: input.repository,
        tenant_id: item.tenant_id,
      }),
    ),
  );
  return {
    cache_key: [
      "operator_morning_digest_list",
      input.tenant_id ?? "*",
      input.coverage_date ?? "*",
      includeSuperseded ? "with_superseded" : "current_only",
      cursorOffset,
      limit,
    ].join(":"),
    digests,
    filters: {
      coverage_date: input.coverage_date ?? null,
      include_superseded: includeSuperseded,
      tenant_id: input.tenant_id ?? null,
    },
    page: {
      cursor_offset: cursorOffset,
      limit,
      next_cursor_offset_or_null:
        cursorOffset + limit < stored.length ? cursorOffset + limit : null,
      total_count: stored.length,
    },
  };
}
