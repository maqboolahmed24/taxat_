import {
  NIGHTLY_PORTFOLIO_WHAT_IF_EXECUTION_DISPOSITIONS,
  type NightlyPortfolioWhatIfOutcomeBucket,
} from "../models/nightly_portfolio_what_if_simulation.ts";
import type {
  NightlyBatchRunSelectionEntryRecord,
  NightlyBatchSelectionDisposition,
} from "../models/nightly_batch_run.ts";
import type { NightlySimulationSourceBatchSet } from "./load_nightly_simulation_source_batch_set.ts";

export type ReplayedNightlySelectionEntry = {
  entry: NightlyBatchRunSelectionEntryRecord;
  selection_entry_ref: string;
  candidate_identity_hash: string;
  baseline_selection_basis_hash: string;
  baseline_selection_disposition: NightlyBatchSelectionDisposition;
  baseline_outcome_bucket: NightlyPortfolioWhatIfOutcomeBucket;
  baseline_execution_rank_or_null: number | null;
  baseline_priority_score_or_null: number | null;
  baseline_reason_codes: string[];
};

function isExecutionDisposition(disposition: NightlyBatchSelectionDisposition) {
  return (NIGHTLY_PORTFOLIO_WHAT_IF_EXECUTION_DISPOSITIONS as readonly string[]).includes(
    disposition,
  );
}

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function nonEmptyReasonCodes(entry: NightlyBatchRunSelectionEntryRecord) {
  return sortStrings(
    entry.reason_codes.length ? [...new Set(entry.reason_codes)] : ["PERSISTED_SELECTION_TRUTH"],
  );
}

function executionRankMap(entries: readonly NightlyBatchRunSelectionEntryRecord[]) {
  const ranked = entries
    .filter((entry) => isExecutionDisposition(entry.selection_disposition))
    .sort(
      (left, right) =>
        (right.priority_tuple.priority_score ?? 0) -
          (left.priority_tuple.priority_score ?? 0) ||
        left.priority_tuple.stable_tie_break_key.localeCompare(
          right.priority_tuple.stable_tie_break_key,
        ) ||
        left.entry_id.localeCompare(right.entry_id),
    );
  return new Map(ranked.map((entry, index) => [entry.entry_id, index + 1]));
}

export function replayNightlySelectionEntries(input: {
  source_batch_set: NightlySimulationSourceBatchSet;
}): ReplayedNightlySelectionEntry[] {
  const rankByEntryRef = executionRankMap(input.source_batch_set.selection_entries);
  return input.source_batch_set.selection_entries
    .map((entry): ReplayedNightlySelectionEntry => {
      if (entry.outcome_bucket === null) {
        throw new Error(`selection entry ${entry.entry_id} is missing baseline outcome_bucket`);
      }
      const executionRank = rankByEntryRef.get(entry.entry_id) ?? null;
      return {
        entry: structuredClone(entry),
        selection_entry_ref: entry.entry_id,
        candidate_identity_hash: entry.candidate_identity_hash,
        baseline_selection_basis_hash: entry.selection_basis_hash,
        baseline_selection_disposition: entry.selection_disposition,
        baseline_outcome_bucket: entry.outcome_bucket,
        baseline_execution_rank_or_null: executionRank,
        baseline_priority_score_or_null:
          executionRank === null ? null : entry.priority_tuple.priority_score ?? 0,
        baseline_reason_codes: nonEmptyReasonCodes(entry),
      };
    })
    .sort((left, right) => left.selection_entry_ref.localeCompare(right.selection_entry_ref));
}
