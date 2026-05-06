import { candidateFactRef, normalizeCandidateFactRecord, type CandidateFactRecord } from "../models/candidate_fact.ts";
import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import { evidenceItemRef, type EvidenceItemRecord } from "../models/evidence_item.ts";
import { sourceRecordRef, type SourceRecordRecord } from "../models/source_record.ts";

export type PartitionPromotionGuardErrorCode =
  | "CANONICAL_PROMOTION_LINEAGE_MISSING"
  | "CANONICAL_PROMOTION_PARTITION_WIDENED"
  | "CANONICAL_PROMOTION_VISIBILITY_INVALID";

export class PartitionPromotionGuardError extends Error {
  readonly code: PartitionPromotionGuardErrorCode;

  constructor(code: PartitionPromotionGuardErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PartitionPromotionGuardError";
    this.code = code;
  }
}

export function assertPartitionPromotionGuard(input: {
  candidate_facts: readonly CandidateFactRecord[];
  evidence_items?: readonly EvidenceItemRecord[];
  source_records?: readonly SourceRecordRecord[];
}) {
  const candidates = input.candidate_facts.map((candidate) => normalizeCandidateFactRecord(candidate));
  if (candidates.length === 0) {
    throw new PartitionPromotionGuardError(
      "CANONICAL_PROMOTION_LINEAGE_MISSING",
      "canonical promotion requires at least one candidate",
    );
  }
  const partitions = new Set<string>();
  for (const candidate of candidates) {
    if (
      candidate.visibility_basis !== "UNMASKED_AUTHORITATIVE_ONLY" ||
      candidate.partition_isolation_state !== "EXACT_SINGLE_PARTITION"
    ) {
      throw new PartitionPromotionGuardError(
        "CANONICAL_PROMOTION_VISIBILITY_INVALID",
        "canonical promotion requires exact partition and unmasked authoritative input",
      );
    }
    if (candidate.source_record_refs.length === 0 || candidate.supporting_evidence_refs.length === 0) {
      throw new PartitionPromotionGuardError(
        "CANONICAL_PROMOTION_LINEAGE_MISSING",
        `candidate ${candidateFactRef(candidate)} lacks source or evidence support`,
      );
    }
    const partitionScopeRefs = normalizeCollectionStringSet(
      "canonical_fact.partition_scope_refs",
      candidate.partition_scope_refs,
      { minItems: 1 },
    );
    if (partitionScopeRefs.length !== 1 || partitionScopeRefs[0] !== candidate.partition_scope) {
      throw new PartitionPromotionGuardError(
        "CANONICAL_PROMOTION_PARTITION_WIDENED",
        "candidate partition refs must contain exactly the scalar partition scope",
      );
    }
    partitions.add(normalizeCollectionString("canonical_fact.partition_scope", candidate.partition_scope));
  }

  const sourceByRef = new Map(
    (input.source_records ?? []).map((sourceRecord) => [sourceRecordRef(sourceRecord), sourceRecord]),
  );
  const evidenceByRef = new Map(
    (input.evidence_items ?? []).map((evidenceItem) => [evidenceItemRef(evidenceItem), evidenceItem]),
  );
  for (const candidate of candidates) {
    for (const sourceRef of candidate.source_record_refs) {
      const sourceRecord = sourceByRef.get(sourceRef);
      if (sourceRecord !== undefined) {
        partitions.add(sourceRecord.business_partition);
      }
    }
    for (const evidenceRef of candidate.supporting_evidence_refs) {
      const evidenceItem = evidenceByRef.get(evidenceRef);
      if (evidenceItem !== undefined) {
        partitions.add(evidenceItem.business_partition);
      }
    }
  }

  if (partitions.size !== 1) {
    throw new PartitionPromotionGuardError(
      "CANONICAL_PROMOTION_PARTITION_WIDENED",
      "canonical promotion cannot merge candidate, source, or evidence lineage across partitions",
    );
  }
  const partitionScope = [...partitions][0]!;
  return {
    partition_scope: partitionScope,
    partition_scope_refs: [partitionScope],
  };
}
