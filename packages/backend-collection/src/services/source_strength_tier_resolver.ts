import type { CollectionSourceClass } from "../models/collection_control_common.ts";
import type { SourceFreshnessState, SourceStrengthTier } from "../models/source_record.ts";
import type { FetchDispatchResult } from "../types/fetch_dispatch_result.ts";

export function resolveSourceStrengthTier(sourceClass: CollectionSourceClass): SourceStrengthTier {
  switch (sourceClass) {
    case "AUTHORITY_ACKNOWLEDGEMENT":
      return "TIER_1_AUTHORITY_FINAL";
    case "AUTHORITY_REFERENCE":
      return "TIER_2_AUTHORITY_REFERENCE";
    case "INSTITUTIONAL_FEED":
      return "TIER_3_STRUCTURED_EXTERNAL";
    case "BOOKS_OF_ENTRY":
      return "TIER_4_STRUCTURED_INTERNAL";
    case "DOCUMENTARY_EVIDENCE":
      return "TIER_5_DOCUMENT_SUPPORT";
    case "DECLARED_ASSERTION":
      return "TIER_6_DECLARED_ONLY";
    case "DETERMINISTIC_DERIVATION":
      return "TIER_4_STRUCTURED_INTERNAL";
    case "PROBABILISTIC_INFERENCE":
      return "TIER_7_INFERRED";
    case "GOVERNANCE_ARTIFACT":
      return "TIER_8_GOVERNANCE_ONLY";
  }
}

export function resolveDefaultFreshnessState(input: {
  fetch_result?: FetchDispatchResult;
  source_class: CollectionSourceClass;
}): SourceFreshnessState {
  if (
    input.fetch_result?.fetch_gap_code_or_null === "SCHEMA_DRIFT" ||
    input.fetch_result?.fetch_gap_code_or_null === "REVISION_DRIFT"
  ) {
    return "STALE";
  }
  if (input.source_class === "PROBABILISTIC_INFERENCE") {
    return "UNKNOWN";
  }
  return "CURRENT";
}
