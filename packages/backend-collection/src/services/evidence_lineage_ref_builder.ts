import {
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import { sourceRecordRef, type SourceRecordRecord } from "../models/source_record.ts";

export function buildEvidenceLineageRefs(input: {
  additional_lineage_refs?: readonly string[];
  source_record: SourceRecordRecord;
}) {
  return normalizeCollectionStringSet(
    "evidence_item.lineage_refs",
    [
      sourceRecordRef(input.source_record),
      input.source_record.raw_payload_ref,
      input.source_record.ingestion_run_ref,
      ...(input.additional_lineage_refs ?? []),
    ],
    { minItems: 1 },
  );
}
