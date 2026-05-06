import { cloneRecord, stableEqual, TwinModelError } from "../models/twin_common.ts";
import {
  cloneTwinPortfolioSummaryRecord,
  normalizeTwinPortfolioSummaryRecord,
  twinPortfolioSummaryRef,
  type TwinPortfolioSummaryRecord,
} from "../models/twin_portfolio_summary.ts";

export type StoredTwinPortfolioSummaryRecord = {
  generated_at: string;
  record: TwinPortfolioSummaryRecord;
  scope_ref: string;
  tenant_id: string;
  twin_portfolio_summary_id: string;
  twin_portfolio_summary_ref: string;
  twin_portfolio_summary_row_version: number;
};

function cloneStored(record: StoredTwinPortfolioSummaryRecord) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class TwinPortfolioSummaryRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByTenantScope = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTwinPortfolioSummaryRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByTenantScope.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.twin_portfolio_summary_ref, stored.twin_portfolio_summary_id);
      pushIndex(
        this.idsByTenantScope,
        `${stored.tenant_id}:${stored.scope_ref}`,
        stored.twin_portfolio_summary_id,
      );
    }
  }

  async persistTwinPortfolioSummary(input: { portfolio_summary: TwinPortfolioSummaryRecord }) {
    const portfolioSummary = normalizeTwinPortfolioSummaryRecord(input.portfolio_summary);
    const existing = this.records.get(portfolioSummary.twin_portfolio_summary_id);
    if (existing && stableEqual(existing.record, portfolioSummary)) {
      return cloneStored(existing);
    }
    const stored: StoredTwinPortfolioSummaryRecord = {
      generated_at: portfolioSummary.generated_at,
      record: cloneTwinPortfolioSummaryRecord(portfolioSummary),
      scope_ref: portfolioSummary.scope_ref,
      tenant_id: portfolioSummary.tenant_id,
      twin_portfolio_summary_id: portfolioSummary.twin_portfolio_summary_id,
      twin_portfolio_summary_ref: twinPortfolioSummaryRef(portfolioSummary),
      twin_portfolio_summary_row_version: (existing?.twin_portfolio_summary_row_version ?? 0) + 1,
    };
    const refOwner = this.idByRef.get(stored.twin_portfolio_summary_ref);
    if (refOwner !== undefined && refOwner !== stored.twin_portfolio_summary_id) {
      throw new TwinModelError(
        "TWIN_REPOSITORY_INVALID",
        `portfolio summary ref ${stored.twin_portfolio_summary_ref} already belongs to ${refOwner}`,
      );
    }
    this.records.set(stored.twin_portfolio_summary_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getTwinPortfolioSummaryById(portfolioSummaryId: string) {
    const stored = this.records.get(portfolioSummaryId);
    return stored ? cloneStored(stored) : null;
  }

  async listTwinPortfolioSummariesByTenantScope(tenantId: string, scopeRef: string) {
    return (this.idsByTenantScope.get(`${tenantId}:${scopeRef}`) ?? [])
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTwinPortfolioSummaryRecord => record !== undefined)
      .sort(
        (left, right) =>
          right.generated_at.localeCompare(left.generated_at) ||
          left.twin_portfolio_summary_id.localeCompare(right.twin_portfolio_summary_id),
      )
      .map(cloneStored);
  }
}
