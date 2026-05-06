import {
  assertNonNegativeInteger,
  cloneRecord,
  normalizeOrderedStringSet,
  normalizeTimestamp,
  requireString,
  TwinModelError,
} from "./twin_common.ts";

export type TwinPortfolioSummaryRecord = {
  artifact_type: "TwinPortfolioSummary";
  blocked_count: number;
  generated_at: string;
  highest_attention_rank: number;
  out_of_band_twin_count: number;
  ready_count: number;
  reconciliation_required_count: number;
  review_required_count: number;
  scope_ref: string;
  stale_twin_count: number;
  tenant_id: string;
  top_mismatch_refs: string[];
  top_twin_refs: string[];
  total_twin_count: number;
  twin_portfolio_summary_id: string;
  waiting_on_authority_count: number;
};

export type TwinPortfolioSummaryBuildInput = Partial<
  Omit<
    TwinPortfolioSummaryRecord,
    | "artifact_type"
    | "generated_at"
    | "scope_ref"
    | "tenant_id"
    | "top_mismatch_refs"
    | "top_twin_refs"
  >
> & {
  generated_at: string;
  scope_ref: string;
  tenant_id: string;
  top_mismatch_refs?: readonly string[];
  top_twin_refs?: readonly string[];
};

export function twinPortfolioSummaryRef(
  summary: Pick<TwinPortfolioSummaryRecord, "twin_portfolio_summary_id"> | string,
) {
  return `twin-portfolio-summary://${
    typeof summary === "string"
      ? requireString("twin_portfolio_summary_id", summary)
      : summary.twin_portfolio_summary_id
  }`;
}

export function buildTwinPortfolioSummaryRecord(
  input: TwinPortfolioSummaryBuildInput,
): TwinPortfolioSummaryRecord {
  const record: TwinPortfolioSummaryRecord = {
    artifact_type: "TwinPortfolioSummary",
    blocked_count: assertNonNegativeInteger("blocked_count", input.blocked_count ?? 0),
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    highest_attention_rank: assertNonNegativeInteger(
      "highest_attention_rank",
      input.highest_attention_rank ?? 0,
    ),
    out_of_band_twin_count: assertNonNegativeInteger(
      "out_of_band_twin_count",
      input.out_of_band_twin_count ?? 0,
    ),
    ready_count: assertNonNegativeInteger("ready_count", input.ready_count ?? 0),
    reconciliation_required_count: assertNonNegativeInteger(
      "reconciliation_required_count",
      input.reconciliation_required_count ?? 0,
    ),
    review_required_count: assertNonNegativeInteger("review_required_count", input.review_required_count ?? 0),
    scope_ref: requireString("scope_ref", input.scope_ref),
    stale_twin_count: assertNonNegativeInteger("stale_twin_count", input.stale_twin_count ?? 0),
    tenant_id: requireString("tenant_id", input.tenant_id),
    top_mismatch_refs: normalizeOrderedStringSet("top_mismatch_refs", input.top_mismatch_refs ?? []),
    top_twin_refs: normalizeOrderedStringSet("top_twin_refs", input.top_twin_refs ?? []),
    total_twin_count: assertNonNegativeInteger("total_twin_count", input.total_twin_count ?? 0),
    twin_portfolio_summary_id:
      input.twin_portfolio_summary_id ??
      `twin-portfolio-summary.${input.tenant_id}.${encodeURIComponent(input.scope_ref)}`,
    waiting_on_authority_count: assertNonNegativeInteger(
      "waiting_on_authority_count",
      input.waiting_on_authority_count ?? 0,
    ),
  };
  return normalizeTwinPortfolioSummaryRecord(record);
}

export function normalizeTwinPortfolioSummaryRecord(
  input: TwinPortfolioSummaryRecord,
): TwinPortfolioSummaryRecord {
  const record: TwinPortfolioSummaryRecord = {
    ...input,
    artifact_type: "TwinPortfolioSummary",
    blocked_count: assertNonNegativeInteger("blocked_count", input.blocked_count),
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    highest_attention_rank: assertNonNegativeInteger("highest_attention_rank", input.highest_attention_rank),
    out_of_band_twin_count: assertNonNegativeInteger("out_of_band_twin_count", input.out_of_band_twin_count),
    ready_count: assertNonNegativeInteger("ready_count", input.ready_count),
    reconciliation_required_count: assertNonNegativeInteger(
      "reconciliation_required_count",
      input.reconciliation_required_count,
    ),
    review_required_count: assertNonNegativeInteger("review_required_count", input.review_required_count),
    scope_ref: requireString("scope_ref", input.scope_ref),
    stale_twin_count: assertNonNegativeInteger("stale_twin_count", input.stale_twin_count),
    tenant_id: requireString("tenant_id", input.tenant_id),
    top_mismatch_refs: normalizeOrderedStringSet("top_mismatch_refs", input.top_mismatch_refs),
    top_twin_refs: normalizeOrderedStringSet("top_twin_refs", input.top_twin_refs),
    total_twin_count: assertNonNegativeInteger("total_twin_count", input.total_twin_count),
    twin_portfolio_summary_id: requireString(
      "twin_portfolio_summary_id",
      input.twin_portfolio_summary_id,
    ),
    waiting_on_authority_count: assertNonNegativeInteger(
      "waiting_on_authority_count",
      input.waiting_on_authority_count,
    ),
  };
  const bucketSum =
    record.ready_count +
    record.review_required_count +
    record.waiting_on_authority_count +
    record.reconciliation_required_count +
    record.blocked_count;
  if (bucketSum !== record.total_twin_count) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "total_twin_count must equal readiness bucket sum");
  }
  if (record.total_twin_count === 0) {
    if (
      record.highest_attention_rank !== 0 ||
      record.top_twin_refs.length > 0 ||
      record.top_mismatch_refs.length > 0 ||
      record.stale_twin_count !== 0 ||
      record.out_of_band_twin_count !== 0
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "empty portfolio summaries must clear rank and top refs");
    }
  } else {
    if (record.highest_attention_rank < 1 || record.top_twin_refs.length === 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "non-empty portfolios require top twins and positive rank");
    }
    if (record.top_twin_refs.length > record.total_twin_count) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "top_twin_refs must not exceed total_twin_count");
    }
  }
  return record;
}

export function cloneTwinPortfolioSummaryRecord(record: TwinPortfolioSummaryRecord) {
  return cloneRecord(record);
}
