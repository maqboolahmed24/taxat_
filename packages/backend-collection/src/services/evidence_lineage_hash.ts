import {
  deriveCollectionControlHash,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";

export function deriveEvidenceLineageHash(evidenceRefs: readonly string[]) {
  const refs = normalizeCollectionStringSet("candidate_fact.supporting_evidence_refs", evidenceRefs, {
    minItems: 1,
  });
  return `evidence-lineage-hash://${deriveCollectionControlHash({
    artifact_family: "EVIDENCE_LINEAGE",
    payload: refs,
  })}`;
}
