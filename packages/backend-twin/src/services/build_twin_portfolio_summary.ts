import {
  buildTwinPortfolioSummaryRecord,
  type TwinPortfolioSummaryRecord,
} from "../models/twin_portfolio_summary.ts";
import { TwinPortfolioSummaryRepository } from "../repositories/twin_portfolio_summary_repository.ts";
import { rankTwinAttention, type TwinAttentionInput } from "./rank_twin_attention.ts";

export type BuildTwinPortfolioSummaryInput = {
  generated_at: string;
  portfolio_repository?: TwinPortfolioSummaryRepository;
  scope_ref: string;
  tenant_id: string;
  top_limit?: number;
  twins: readonly TwinAttentionInput[];
};

export type BuildTwinPortfolioSummaryResult = {
  portfolio_summary: TwinPortfolioSummaryRecord;
  ranked_twins: ReturnType<typeof rankTwinAttention>;
  repository: TwinPortfolioSummaryRepository;
  stored: Awaited<ReturnType<TwinPortfolioSummaryRepository["persistTwinPortfolioSummary"]>>;
};

function uniqueOrdered(values: readonly (string | null)[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (value !== null && !seen.has(value)) {
      seen.add(value);
      ordered.push(value);
    }
  }
  return ordered;
}

export async function buildTwinPortfolioSummary(
  input: BuildTwinPortfolioSummaryInput,
): Promise<BuildTwinPortfolioSummaryResult> {
  const repository = input.portfolio_repository ?? new TwinPortfolioSummaryRepository();
  const rankedTwins = rankTwinAttention({ twins: input.twins });
  const topLimit = input.top_limit ?? 10;
  const portfolioSummary = buildTwinPortfolioSummaryRecord({
    blocked_count: input.twins.filter((twin) => twin.readiness.twin_readiness_class === "BLOCKED").length,
    generated_at: input.generated_at,
    highest_attention_rank: rankedTwins[0]?.attention_rank ?? 0,
    out_of_band_twin_count: rankedTwins.filter((twin) => twin.is_out_of_band).length,
    ready_count: input.twins.filter((twin) => twin.readiness.twin_readiness_class === "READY").length,
    reconciliation_required_count: input.twins.filter(
      (twin) => twin.readiness.twin_readiness_class === "RECONCILIATION_REQUIRED",
    ).length,
    review_required_count: input.twins.filter(
      (twin) => twin.readiness.twin_readiness_class === "REVIEW_REQUIRED",
    ).length,
    scope_ref: input.scope_ref,
    stale_twin_count: rankedTwins.filter((twin) => twin.is_stale).length,
    tenant_id: input.tenant_id,
    top_mismatch_refs: uniqueOrdered(rankedTwins.map((twin) => twin.top_mismatch_ref)).slice(0, topLimit),
    top_twin_refs: rankedTwins.map((twin) => twin.twin_ref).slice(0, topLimit),
    total_twin_count: input.twins.length,
    waiting_on_authority_count: input.twins.filter(
      (twin) => twin.readiness.twin_readiness_class === "WAITING_ON_AUTHORITY",
    ).length,
  });
  const stored = await repository.persistTwinPortfolioSummary({
    portfolio_summary: portfolioSummary,
  });
  return {
    portfolio_summary: portfolioSummary,
    ranked_twins: rankedTwins,
    repository,
    stored,
  };
}
