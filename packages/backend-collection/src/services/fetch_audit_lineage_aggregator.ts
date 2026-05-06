import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type { SourceCollectionFetchOutcome } from "../types/source_collection_outcome.ts";

export function aggregateFetchAuditLineage(input: {
  existing_fetch_audit_refs?: readonly string[];
  results: readonly SourceCollectionFetchOutcome[];
}) {
  return normalizeCollectionStringSet(
    "source_collection_run.fetch_audit_refs",
    [
      ...(input.existing_fetch_audit_refs ?? []),
      ...input.results.flatMap((result) => [
        ...(result.fetch_audit_refs ?? []),
        ...(result.page_audit_refs ?? []),
      ]),
    ],
  );
}
