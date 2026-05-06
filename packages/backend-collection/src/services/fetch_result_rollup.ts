import type {
  SourceCollectionFetchOutcome,
  SourceCollectionFetchResultRollup,
} from "../types/source_collection_outcome.ts";
import type { SourceCollectionRunFailureReasonCode } from "../models/source_collection_run.ts";
import { aggregateFetchAuditLineage } from "./fetch_audit_lineage_aggregator.ts";
import { classifyPartialGaps } from "./partial_gap_classifier.ts";

function pickFailureReason(results: readonly SourceCollectionFetchOutcome[]) {
  const explicitReason = results.find(
    (result) =>
      result.outcome_code === "SOURCE_FATAL_FAILURE" &&
      result.failure_reason_code_or_null !== null &&
      result.failure_reason_code_or_null !== undefined,
  )?.failure_reason_code_or_null;
  return (explicitReason ?? "FATAL_PROVIDER_FAILURE") as SourceCollectionRunFailureReasonCode;
}

export function rollupFetchResults(input: {
  existing_fetch_audit_refs?: readonly string[];
  existing_partial_gap_refs?: readonly string[];
  results: readonly SourceCollectionFetchOutcome[];
}): SourceCollectionFetchResultRollup {
  const fetchAuditRefs = aggregateFetchAuditLineage(
    input.existing_fetch_audit_refs === undefined
      ? { results: input.results }
      : {
          existing_fetch_audit_refs: input.existing_fetch_audit_refs,
          results: input.results,
        },
  );
  const partialGapRefs = classifyPartialGaps(
    input.existing_partial_gap_refs === undefined
      ? { results: input.results }
      : {
          existing_partial_gap_refs: input.existing_partial_gap_refs,
          results: input.results,
        },
  );

  if (input.results.length === 0) {
    return {
      failure_reason_code_or_null: "NO_FETCH_RESULTS",
      fetch_audit_refs: fetchAuditRefs,
      partial_gap_refs: [],
      terminal_state: "FAILED",
    };
  }

  if (input.results.some((result) => result.outcome_code === "SOURCE_FATAL_FAILURE")) {
    return {
      failure_reason_code_or_null: pickFailureReason(input.results),
      fetch_audit_refs: fetchAuditRefs,
      partial_gap_refs: [],
      terminal_state: "FAILED",
    };
  }

  if (partialGapRefs.length > 0) {
    return {
      failure_reason_code_or_null: null,
      fetch_audit_refs: fetchAuditRefs,
      partial_gap_refs: partialGapRefs,
      terminal_state: "PARTIAL",
    };
  }

  return {
    failure_reason_code_or_null: null,
    fetch_audit_refs: fetchAuditRefs,
    partial_gap_refs: [],
    terminal_state: "FETCHED",
  };
}
