import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type {
  SourceCollectionFetchOutcome,
  SourceCollectionPartialGapCode,
} from "../types/source_collection_outcome.ts";

const DEFAULT_PARTIAL_GAP_CODE: SourceCollectionPartialGapCode = "PARTIAL_PROVIDER_RESPONSE";

function derivePartialGapRef(input: {
  partial_gap_code_or_null?: SourceCollectionPartialGapCode | null;
  source_domain: string;
}) {
  const sourceDomain = normalizeCollectionString(
    "source_collection_partial_gap.source_domain",
    input.source_domain,
  );
  return `partial-gap://${sourceDomain}/${
    input.partial_gap_code_or_null ?? DEFAULT_PARTIAL_GAP_CODE
  }`;
}

export function classifyPartialGaps(input: {
  existing_partial_gap_refs?: readonly string[];
  results: readonly SourceCollectionFetchOutcome[];
}) {
  const explicitOrDerivedRefs = input.results.flatMap((result) => {
    if (result.outcome_code !== "SOURCE_PARTIAL_GAP") {
      return [];
    }
    if ((result.partial_gap_refs ?? []).length > 0) {
      return [...(result.partial_gap_refs ?? [])];
    }
    return [derivePartialGapRef(result)];
  });

  return normalizeCollectionStringSet("source_collection_run.partial_gap_refs", [
    ...(input.existing_partial_gap_refs ?? []),
    ...explicitOrDerivedRefs,
  ]);
}
