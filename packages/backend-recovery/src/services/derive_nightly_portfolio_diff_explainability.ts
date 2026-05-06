import {
  NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON,
  type NightlyPortfolioWhatIfOutcomeBucket,
  type NightlyPortfolioWhatIfSimulationHighlightDiffRecord,
} from "../models/nightly_portfolio_what_if_simulation.ts";
import type { NightlyBatchRunPriorityTupleRecord } from "../models/nightly_batch_run.ts";

export type NightlyPortfolioHighlightProjection = {
  selection_entry_ref: string;
  highlight_rank: number;
  entry_loss_score: number;
};

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function uniqueSorted(values: readonly string[]) {
  const sorted = sortStrings([...new Set(values)]);
  if (sorted.length === 0) {
    return [NIGHTLY_PORTFOLIO_WHAT_IF_UNCHANGED_REASON];
  }
  return sorted;
}

export function deriveNightlyPortfolioEntryLossScore(input: {
  outcome_bucket: NightlyPortfolioWhatIfOutcomeBucket;
  priority_tuple: NightlyBatchRunPriorityTupleRecord;
}) {
  const blockingWeight =
    input.outcome_bucket === "REVIEW_REQUIRED" ||
    input.outcome_bucket === "BLOCKED_INTERNAL" ||
    input.outcome_bucket === "FAILED_NON_RETRYABLE"
      ? 2
      : 0;
  const authorityWeight = input.outcome_bucket === "WAITING_ON_AUTHORITY" ? 1 : 0;
  const lateOrDeferredWeight =
    input.outcome_bucket === "WAITING_ON_LATE_DATA" || input.outcome_bucket === "DEFERRED"
      ? 0.75
      : 0;
  const failureWeight =
    input.outcome_bucket === "FAILED_RETRYABLE" ||
    input.outcome_bucket === "FAILED_NON_RETRYABLE"
      ? 1.5
      : 0;
  return Number(
    (
      (input.priority_tuple.deadline_pressure ?? 0) * 3 +
      (input.priority_tuple.risk_pressure ?? 0) * 3 +
      blockingWeight +
      authorityWeight +
      lateOrDeferredWeight +
      failureWeight +
      (input.priority_tuple.priority_score ?? 0) / 100
    ).toFixed(6),
  );
}

function diffState(input: {
  baseline?: NightlyPortfolioHighlightProjection;
  simulated?: NightlyPortfolioHighlightProjection;
}) {
  if (!input.baseline && input.simulated) {
    return "ADDED" as const;
  }
  if (input.baseline && !input.simulated) {
    return "REMOVED" as const;
  }
  if (!input.baseline || !input.simulated) {
    return "UNCHANGED" as const;
  }
  if (input.simulated.highlight_rank < input.baseline.highlight_rank) {
    return "RANK_RAISED" as const;
  }
  if (input.simulated.highlight_rank > input.baseline.highlight_rank) {
    return "RANK_LOWERED" as const;
  }
  if (input.simulated.entry_loss_score !== input.baseline.entry_loss_score) {
    return "SCORE_CHANGED" as const;
  }
  return "UNCHANGED" as const;
}

export function deriveNightlyPortfolioDiffExplainability(input: {
  baseline_highlights: readonly NightlyPortfolioHighlightProjection[];
  simulated_highlights: readonly NightlyPortfolioHighlightProjection[];
  movement_reason_codes_by_entry_ref: ReadonlyMap<string, readonly string[]>;
}): NightlyPortfolioWhatIfSimulationHighlightDiffRecord[] {
  const baselineByEntryRef = new Map(
    input.baseline_highlights.map((highlight) => [highlight.selection_entry_ref, highlight]),
  );
  const simulatedByEntryRef = new Map(
    input.simulated_highlights.map((highlight) => [highlight.selection_entry_ref, highlight]),
  );
  return sortStrings([
    ...new Set([...baselineByEntryRef.keys(), ...simulatedByEntryRef.keys()]),
  ]).map((selectionEntryRef) => {
    const baseline = baselineByEntryRef.get(selectionEntryRef);
    const simulated = simulatedByEntryRef.get(selectionEntryRef);
    return {
      selection_entry_ref: selectionEntryRef,
      diff_state: diffState({ baseline, simulated }),
      baseline_highlight_rank_or_null: baseline?.highlight_rank ?? null,
      simulated_highlight_rank_or_null: simulated?.highlight_rank ?? null,
      baseline_entry_loss_score_or_null: baseline?.entry_loss_score ?? null,
      simulated_entry_loss_score_or_null: simulated?.entry_loss_score ?? null,
      reason_codes: uniqueSorted(
        input.movement_reason_codes_by_entry_ref.get(selectionEntryRef) ?? [],
      ),
    };
  });
}
