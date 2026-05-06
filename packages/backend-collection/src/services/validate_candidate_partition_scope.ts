import { normalizeCollectionString } from "../models/collection_control_common.ts";
import type { EvidenceItemRecord } from "../models/evidence_item.ts";
import type { SourceRecordRecord } from "../models/source_record.ts";

export type CandidatePartitionValidationErrorCode =
  | "CANDIDATE_PARTITION_SCOPE_MISMATCH"
  | "CANDIDATE_PARTITION_SCOPE_WIDENED";

export class CandidatePartitionValidationError extends Error {
  readonly code: CandidatePartitionValidationErrorCode;

  constructor(code: CandidatePartitionValidationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CandidatePartitionValidationError";
    this.code = code;
  }
}

export function validateCandidatePartitionScope(input: {
  evidence_items: readonly EvidenceItemRecord[];
  expected_partition_scope?: string;
  source_records: readonly SourceRecordRecord[];
}) {
  const partitions = new Set<string>();
  for (const sourceRecord of input.source_records) {
    partitions.add(normalizeCollectionString("candidate_fact.source_partition", sourceRecord.business_partition));
  }
  for (const evidenceItem of input.evidence_items) {
    partitions.add(normalizeCollectionString("candidate_fact.evidence_partition", evidenceItem.business_partition));
  }
  if (partitions.size !== 1) {
    throw new CandidatePartitionValidationError(
      "CANDIDATE_PARTITION_SCOPE_WIDENED",
      "candidate extraction cannot combine source or evidence from multiple partitions",
    );
  }
  const partitionScope = [...partitions][0]!;
  if (
    input.expected_partition_scope !== undefined &&
    partitionScope !== normalizeCollectionString("candidate_fact.expected_partition_scope", input.expected_partition_scope)
  ) {
    throw new CandidatePartitionValidationError(
      "CANDIDATE_PARTITION_SCOPE_MISMATCH",
      "candidate partition must match expected extraction partition",
    );
  }
  return {
    partition_scope: partitionScope,
    partition_scope_refs: [partitionScope],
  };
}
