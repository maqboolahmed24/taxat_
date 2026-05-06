import {
  deriveCollectionControlHash,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";

export function deriveSourceRecordLineageHash(sourceRecordRefs: readonly string[]) {
  const refs = normalizeCollectionStringSet(
    "candidate_fact.source_record_refs",
    sourceRecordRefs,
    { minItems: 1 },
  );
  return `source-record-lineage-hash://${deriveCollectionControlHash({
    artifact_family: "SOURCE_RECORD_LINEAGE",
    payload: refs,
  })}`;
}
