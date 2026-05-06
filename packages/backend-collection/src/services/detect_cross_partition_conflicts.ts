import {
  candidateFactRef,
  normalizeCandidateFactRecord,
  type CandidateFactRecord,
} from "../models/candidate_fact.ts";
import {
  buildConflictRecord,
  type ConflictRecordDraft,
  type ConflictRecordRecord,
} from "../models/conflict_record.ts";
import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type { CandidateConflictSemanticProjection } from "./detect_conflicts.ts";

export type DetectCrossPartitionConflictsErrorCode = "CROSS_PARTITION_CONFLICT_MANIFEST_MISMATCH";

export class DetectCrossPartitionConflictsError extends Error {
  readonly code: DetectCrossPartitionConflictsErrorCode;

  constructor(code: DetectCrossPartitionConflictsErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DetectCrossPartitionConflictsError";
    this.code = code;
  }
}

const DEFAULT_POLICY_REF = "conflict-policy://collection/default-v1";

function candidateRef(record: CandidateFactRecord) {
  return candidateFactRef(record);
}

function semanticMap(projections: readonly CandidateConflictSemanticProjection[] | undefined) {
  const map = new Map<string, CandidateConflictSemanticProjection>();
  for (const projection of projections ?? []) {
    if (projection.candidate_fact_ref !== undefined) {
      map.set(projection.candidate_fact_ref, projection);
    }
    if (projection.candidate_fact_id !== undefined) {
      map.set(`candidate-fact://${projection.candidate_fact_id}`, projection);
    }
  }
  return map;
}

function pushGroup(groups: Map<string, CandidateFactRecord[]>, key: string, candidate: CandidateFactRecord) {
  const current = groups.get(key) ?? [];
  current.push(candidate);
  groups.set(key, current);
}

function addCrossPartitionGroup(
  conflicts: Map<string, ConflictRecordRecord>,
  input: {
    candidates: readonly CandidateFactRecord[];
    conflict_detection_policy_ref: string;
    manifest_id: string;
    reason_code: string;
    schema_bundle_hash?: string;
    writer_build_id?: string;
  },
) {
  const partitions = new Set(input.candidates.map((candidate) => candidate.partition_scope));
  if (partitions.size < 2 || input.candidates.length < 2) {
    return;
  }
  const involvedFactRefs = normalizeCollectionStringSet(
    "cross_partition_conflict.involved_fact_refs",
    input.candidates.map((candidate) => candidateRef(candidate)),
    { minItems: 2 },
  );
  const key = involvedFactRefs.join("::");
  const existing = conflicts.get(key);
  if (existing) {
    const reasonCodes = normalizeCollectionStringSet(
      "cross_partition_conflict.reason_codes",
      [...existing.reason_codes, input.reason_code],
      { minItems: 1 },
    );
    const mergedDraft: ConflictRecordDraft = {
      artifact_type: "ConflictRecord",
      authority_position_refs: existing.authority_position_refs,
      blocking_class: existing.blocking_class,
      conflict_type: existing.conflict_type,
      contradiction_class: existing.contradiction_class,
      decisive_target_refs: existing.decisive_target_refs,
      evidence_refs: existing.evidence_refs,
      involved_fact_refs: existing.involved_fact_refs,
      manifest_id: existing.manifest_id,
      reason_codes: reasonCodes,
      resolution_state: existing.resolution_state,
      severity: existing.severity,
      supersedes_conflict_id: existing.supersedes_conflict_id,
    };
    conflicts.set(
      key,
      buildConflictRecord({
        conflict_detection_policy_ref: input.conflict_detection_policy_ref,
        draft: mergedDraft,
        ...(input.schema_bundle_hash === undefined
          ? {}
          : { schema_bundle_hash: input.schema_bundle_hash }),
        ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
      }),
    );
    return;
  }
  const record = buildConflictRecord({
    conflict_detection_policy_ref: input.conflict_detection_policy_ref,
    draft: {
      artifact_type: "ConflictRecord",
      authority_position_refs: [],
      blocking_class: "BLOCKS_RUN",
      conflict_type: "BUSINESS_PARTITION_CONFLICT",
      contradiction_class: "DECISIVE_CONTRADICTION",
      decisive_target_refs: involvedFactRefs,
      evidence_refs: normalizeCollectionStringSet(
        "cross_partition_conflict.evidence_refs",
        input.candidates.flatMap((candidate) => candidate.supporting_evidence_refs),
      ),
      involved_fact_refs: involvedFactRefs,
      manifest_id: input.manifest_id,
      reason_codes: [input.reason_code],
      resolution_state: "OPEN",
      severity: "CRITICAL",
      supersedes_conflict_id: null,
    },
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  conflicts.set(key, record);
}

export function detectCrossPartitionConflicts(input: {
  candidate_facts: readonly CandidateFactRecord[];
  conflict_detection_policy_ref?: string;
  schema_bundle_hash?: string;
  semantic_projections?: readonly CandidateConflictSemanticProjection[];
  writer_build_id?: string;
}): ConflictRecordRecord[] {
  const candidates = input.candidate_facts
    .map((candidate) => normalizeCandidateFactRecord(candidate))
    .sort((left, right) => candidateRef(left).localeCompare(candidateRef(right)));
  if (candidates.length === 0) {
    return [];
  }
  const manifestId = candidates[0]!.manifest_id;
  for (const candidate of candidates) {
    if (candidate.manifest_id !== manifestId) {
      throw new DetectCrossPartitionConflictsError(
        "CROSS_PARTITION_CONFLICT_MANIFEST_MISMATCH",
        "cross-partition detection is manifest-scoped",
      );
    }
  }
  const policyRef = normalizeCollectionString(
    "cross_partition_conflict.policy_ref",
    input.conflict_detection_policy_ref ?? DEFAULT_POLICY_REF,
  );
  const projections = semanticMap(input.semantic_projections);
  const groups = new Map<string, CandidateFactRecord[]>();

  for (const candidate of candidates) {
    pushGroup(
      groups,
      `source-lineage::${candidate.source_record_lineage_hash}`,
      candidate,
    );
    pushGroup(groups, `evidence-lineage::${candidate.evidence_lineage_hash}`, candidate);
    pushGroup(
      groups,
      `value-payload::${candidate.fact_family}::${candidate.normalization_context_ref}::${candidate.value_payload_ref}`,
      candidate,
    );
    const projection = projections.get(candidateRef(candidate));
    if (projection?.cross_partition_group_ref !== undefined) {
      pushGroup(groups, `semantic::${projection.cross_partition_group_ref}`, candidate);
    }
  }

  const conflicts = new Map<string, ConflictRecordRecord>();
  for (const [key, group] of groups.entries()) {
    const reasonCode = key.startsWith("source-lineage::")
      ? "CROSS_PARTITION_SOURCE_LINEAGE_REUSED"
      : key.startsWith("evidence-lineage::")
        ? "CROSS_PARTITION_EVIDENCE_LINEAGE_REUSED"
        : key.startsWith("value-payload::")
          ? "CROSS_PARTITION_VALUE_PAYLOAD_REUSED"
          : "CROSS_PARTITION_SEMANTIC_GROUP_REUSED";
    addCrossPartitionGroup(conflicts, {
      candidates: group,
      conflict_detection_policy_ref: policyRef,
      manifest_id: manifestId,
      reason_code: reasonCode,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    });
  }

  return [...conflicts.values()].sort((left, right) =>
    left.conflict_id.localeCompare(right.conflict_id),
  );
}
