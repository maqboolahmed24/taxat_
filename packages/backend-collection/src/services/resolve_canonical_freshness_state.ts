import type { CandidateFactRecord } from "../models/candidate_fact.ts";
import type { EvidenceItemRecord } from "../models/evidence_item.ts";
import type { SourceFreshnessState, SourceRecordRecord } from "../models/source_record.ts";
import { sourceRecordRef } from "../models/source_record.ts";
import { evidenceItemRef } from "../models/evidence_item.ts";

const FRESHNESS_RANK: Record<SourceFreshnessState, number> = {
  CURRENT: 1,
  UNKNOWN: 2,
  STALE: 3,
  EXPIRED: 4,
  SUPERSEDED: 5,
};

export function resolveCanonicalFreshnessState(input: {
  candidate: CandidateFactRecord;
  evidence_items?: readonly EvidenceItemRecord[];
  source_records?: readonly SourceRecordRecord[];
}) {
  const states: SourceFreshnessState[] = [];
  const sourceByRef = new Map(
    (input.source_records ?? []).map((sourceRecord) => [
      sourceRecordRef(sourceRecord),
      sourceRecord,
    ]),
  );
  const evidenceByRef = new Map(
    (input.evidence_items ?? []).map((evidenceItem) => [evidenceItemRef(evidenceItem), evidenceItem]),
  );
  for (const ref of input.candidate.source_record_refs) {
    const sourceRecord = sourceByRef.get(ref);
    if (sourceRecord !== undefined) {
      states.push(sourceRecord.freshness_state);
    }
  }
  for (const ref of input.candidate.supporting_evidence_refs) {
    const evidenceItem = evidenceByRef.get(ref);
    if (evidenceItem !== undefined) {
      states.push(evidenceItem.freshness_state);
    }
  }
  if (states.length === 0) {
    return "UNKNOWN" as const;
  }
  return states.sort((left, right) => FRESHNESS_RANK[right] - FRESHNESS_RANK[left])[0]!;
}
