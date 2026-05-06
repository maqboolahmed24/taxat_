import {
  candidateFactRef,
  normalizeCandidateFactRecord,
  type CandidateFactRecord,
} from "../models/candidate_fact.ts";
import {
  buildCanonicalFactContract,
  deriveCanonicalFactContentHash,
  normalizeCanonicalFactRecord,
  type CanonicalFactRecord,
  type CanonicalFactRecordDraft,
} from "../models/canonical_fact.ts";
import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import {
  conflictRecordRef,
  isBlockingConflict,
  isUnresolvedConflictState,
} from "../models/conflict_record.ts";
import { conflictSetRef, normalizeConflictSetRecord, type ConflictSetRecord } from "../models/conflict_set.ts";
import { evidenceItemRef, type EvidenceItemRecord } from "../models/evidence_item.ts";
import { sourceRecordRef, type SourceRecordRecord, type SourceStrengthTier } from "../models/source_record.ts";
import { allocateRetentionTag } from "./content_ref_allocator.ts";
import {
  canonicalFactIdFromIdentity,
  deriveCanonicalDedupeKey,
  deriveCanonicalIdentityHash,
} from "./canonical_identity_hash.ts";
import { buildPromotionRecord } from "./build_promotion_record.ts";
import { deriveEvidenceLineageHash } from "./evidence_lineage_hash.ts";
import { assertPartitionPromotionGuard } from "./partition_promotion_guard.ts";
import { resolveCanonicalFreshnessState } from "./resolve_canonical_freshness_state.ts";
import { selectPromotionState, type PromotionStatePolicy } from "./select_promotion_state.ts";
import { deriveSourceRecordLineageHash } from "./source_record_lineage_hash.ts";

export type CandidateToCanonicalMapperErrorCode =
  | "CANONICAL_PROMOTION_ADJUSTMENT_CONFLICT"
  | "CANONICAL_PROMOTION_GROUP_MISMATCH";

export class CandidateToCanonicalMapperError extends Error {
  readonly code: CandidateToCanonicalMapperErrorCode;

  constructor(code: CandidateToCanonicalMapperErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CandidateToCanonicalMapperError";
    this.code = code;
  }
}

const SOURCE_STRENGTH_RANK: Record<SourceStrengthTier, number> = {
  TIER_1_AUTHORITY_FINAL: 1,
  TIER_2_AUTHORITY_REFERENCE: 2,
  TIER_3_STRUCTURED_EXTERNAL: 3,
  TIER_4_STRUCTURED_INTERNAL: 4,
  TIER_5_DOCUMENT_SUPPORT: 5,
  TIER_6_DECLARED_ONLY: 6,
  TIER_7_INFERRED: 7,
  TIER_8_GOVERNANCE_ONLY: 8,
};

function strongestTier(tiers: readonly SourceStrengthTier[]) {
  return [...tiers].sort((left, right) => SOURCE_STRENGTH_RANK[left] - SOURCE_STRENGTH_RANK[right])[0]!;
}

function assertGroupCompatible(candidates: readonly CandidateFactRecord[]) {
  const first = candidates[0]!;
  for (const candidate of candidates.slice(1)) {
    const fields: Array<keyof CandidateFactRecord> = [
      "adjustment_binding",
      "analysis_only",
      "collection_boundary_ref",
      "counterfactual_basis",
      "execution_mode",
      "fact_family",
      "manifest_id",
      "normalization_context_ref",
      "partition_scope",
      "value_payload_ref",
      "visibility_basis",
    ];
    for (const field of fields) {
      if (JSON.stringify(candidate[field]) !== JSON.stringify(first[field])) {
        throw new CandidateToCanonicalMapperError(
          "CANONICAL_PROMOTION_GROUP_MISMATCH",
          `candidate group cannot merge incompatible ${String(field)}`,
        );
      }
    }
    if (
      JSON.stringify(candidate.non_compliance_config_refs) !==
      JSON.stringify(first.non_compliance_config_refs)
    ) {
      throw new CandidateToCanonicalMapperError(
        "CANONICAL_PROMOTION_GROUP_MISMATCH",
        "candidate group cannot merge different non-compliance config refs",
      );
    }
  }
}

function openConflictsForCandidates(input: {
  candidates: readonly CandidateFactRecord[];
  conflict_set: ConflictSetRecord;
}) {
  const candidateRefs = new Set(input.candidates.map((candidate) => candidateFactRef(candidate)));
  return input.conflict_set.items.filter(
    (conflict) =>
      isUnresolvedConflictState(conflict.resolution_state) &&
      conflict.involved_fact_refs.some((ref) => candidateRefs.has(ref)),
  );
}

function resolveGroupFreshness(input: {
  candidates: readonly CandidateFactRecord[];
  evidence_items?: readonly EvidenceItemRecord[];
  source_records?: readonly SourceRecordRecord[];
}) {
  const states = input.candidates.map((candidate) =>
    resolveCanonicalFreshnessState({
      candidate,
      ...(input.evidence_items === undefined ? {} : { evidence_items: input.evidence_items }),
      ...(input.source_records === undefined ? {} : { source_records: input.source_records }),
    }),
  );
  if (states.includes("SUPERSEDED")) {
    return "SUPERSEDED" as const;
  }
  if (states.includes("EXPIRED")) {
    return "EXPIRED" as const;
  }
  if (states.includes("STALE")) {
    return "STALE" as const;
  }
  if (states.includes("UNKNOWN")) {
    return "UNKNOWN" as const;
  }
  return "CURRENT" as const;
}

function resolveGroupErasureState(input: {
  candidates: readonly CandidateFactRecord[];
  evidence_items?: readonly EvidenceItemRecord[];
  source_records?: readonly SourceRecordRecord[];
}) {
  const sourceByRef = new Map(
    (input.source_records ?? []).map((sourceRecord) => [sourceRecordRef(sourceRecord), sourceRecord]),
  );
  const evidenceByRef = new Map(
    (input.evidence_items ?? []).map((evidenceItem) => [evidenceItemRef(evidenceItem), evidenceItem]),
  );
  const states = input.candidates.flatMap((candidate) => [
    ...candidate.source_record_refs
      .map((ref) => sourceByRef.get(ref)?.erasure_state)
      .filter((state): state is NonNullable<typeof state> => state !== undefined),
    ...candidate.supporting_evidence_refs
      .map((ref) => evidenceByRef.get(ref)?.erasure_state)
      .filter((state): state is NonNullable<typeof state> => state !== undefined),
  ]);
  if (states.includes("ERASED")) {
    return "ERASED" as const;
  }
  if (states.includes("ERASURE_PENDING")) {
    return "ERASURE_PENDING" as const;
  }
  if (states.includes("LEGAL_HOLD")) {
    return "LEGAL_HOLD" as const;
  }
  if (states.includes("LIMITED")) {
    return "LIMITED" as const;
  }
  if (states.includes("PSEUDONYMISED")) {
    return "PSEUDONYMISED" as const;
  }
  return "ACTIVE" as const;
}

export function mapCandidateGroupToCanonicalFact(input: {
  candidate_facts: readonly CandidateFactRecord[];
  conflict_set: ConflictSetRecord;
  evidence_items?: readonly EvidenceItemRecord[];
  promoted_at: string;
  promotion_policy?: PromotionStatePolicy;
  retention_basis_ref?: string;
  schema_bundle_hash?: string;
  source_records?: readonly SourceRecordRecord[];
  writer_build_id?: string;
}): CanonicalFactRecord {
  const candidates = input.candidate_facts
    .map((candidate) => normalizeCandidateFactRecord(candidate))
    .sort((left, right) => candidateFactRef(left).localeCompare(candidateFactRef(right)));
  assertGroupCompatible(candidates);
  const conflictSet = normalizeConflictSetRecord(input.conflict_set);
  const first = candidates[0]!;
  const partition = assertPartitionPromotionGuard({
    candidate_facts: candidates,
    ...(input.evidence_items === undefined ? {} : { evidence_items: input.evidence_items }),
    ...(input.source_records === undefined ? {} : { source_records: input.source_records }),
  });
  const sourceRecordRefs = normalizeCollectionStringSet(
    "canonical_fact.source_record_refs",
    candidates.flatMap((candidate) => candidate.source_record_refs),
    { minItems: 1 },
  );
  const supportingEvidenceRefs = normalizeCollectionStringSet(
    "canonical_fact.supporting_evidence_refs",
    candidates.flatMap((candidate) => candidate.supporting_evidence_refs),
    { minItems: 1 },
  );
  const promotedFromCandidateFactRefs = normalizeCollectionStringSet(
    "canonical_fact.promoted_from_candidate_fact_refs",
    candidates.map((candidate) => candidateFactRef(candidate)),
    { minItems: 1 },
  );
  const conflictMembershipRefs = normalizeCollectionStringSet(
    "canonical_fact.conflict_membership_refs",
    openConflictsForCandidates({ candidates, conflict_set: conflictSet }).map((conflict) =>
      conflictRecordRef(conflict),
    ),
  );
  const blockingConflictIds = normalizeCollectionStringSet(
    "canonical_fact.blocking_conflict_ids_at_promotion",
    openConflictsForCandidates({ candidates, conflict_set: conflictSet })
      .filter((conflict) => isBlockingConflict(conflict))
      .map((conflict) => conflict.conflict_id),
  );
  const resolutionFrontier =
    blockingConflictIds.length > 0
      ? "BLOCKING_PRESENT"
      : conflictMembershipRefs.length > 0
        ? "MONITORING_ONLY"
        : "CLEAR";
  const selectedState = selectPromotionState({
    blocking_conflict_count: blockingConflictIds.length,
    candidate: first,
    conflict_membership_refs: conflictMembershipRefs,
    ...(input.promotion_policy === undefined ? {} : { policy: input.promotion_policy }),
    resolution_frontier: resolutionFrontier,
  }).promotion_state;
  const sourceRecordLineageHash = deriveSourceRecordLineageHash(sourceRecordRefs);
  const evidenceLineageHash = deriveEvidenceLineageHash(supportingEvidenceRefs);
  const canonicalDedupeKey = deriveCanonicalDedupeKey({
    adjustment_binding: first.adjustment_binding,
    collection_boundary_ref: first.collection_boundary_ref,
    execution_mode: first.execution_mode,
    fact_family: first.fact_family,
    manifest_id: first.manifest_id,
    normalization_context_ref: first.normalization_context_ref,
    partition_scope: partition.partition_scope,
    value_payload_ref: first.value_payload_ref,
  });
  const canonicalIdentityHash = deriveCanonicalIdentityHash({
    adjustment_binding: first.adjustment_binding,
    collection_boundary_ref: first.collection_boundary_ref,
    evidence_lineage_hash: evidenceLineageHash,
    execution_mode: first.execution_mode,
    fact_family: first.fact_family,
    manifest_id: first.manifest_id,
    normalization_context_ref: first.normalization_context_ref,
    partition_scope: partition.partition_scope,
    promoted_from_candidate_fact_refs: promotedFromCandidateFactRefs,
    source_record_lineage_hash: sourceRecordLineageHash,
    value_payload_ref: first.value_payload_ref,
  });
  const canonicalFactId = canonicalFactIdFromIdentity(canonicalIdentityHash);
  const promotionRecord = buildPromotionRecord({
    approved_override_ref_or_null:
      first.promotion_readiness.approved_override_ref_or_null,
    blocking_conflict_ids_at_promotion: blockingConflictIds,
    conflict_set_ref: conflictSetRef(conflictSet),
    promoted_at: input.promoted_at,
    promoted_from_candidate_fact_refs: promotedFromCandidateFactRefs,
    promotion_rule_ref: first.promotion_readiness.promotion_rule_ref,
    resolution_frontier_at_promotion: resolutionFrontier,
  });
  const erasureState = resolveGroupErasureState({
    candidates,
    ...(input.evidence_items === undefined ? {} : { evidence_items: input.evidence_items }),
    ...(input.source_records === undefined ? {} : { source_records: input.source_records }),
  });
  const draft: CanonicalFactRecordDraft = {
    adjustment_binding: first.adjustment_binding,
    analysis_only: first.analysis_only,
    artifact_type: "CanonicalFact",
    canonical_identity_hash: canonicalIdentityHash,
    collection_boundary_ref: first.collection_boundary_ref,
    conflict_membership_refs: conflictMembershipRefs,
    counterfactual_basis: first.counterfactual_basis,
    dedupe_key: canonicalDedupeKey,
    erasure_state: erasureState,
    evidence_lineage_hash: evidenceLineageHash,
    execution_mode: first.execution_mode,
    fact_family: first.fact_family,
    freshness_state: resolveGroupFreshness({
      candidates,
      ...(input.evidence_items === undefined ? {} : { evidence_items: input.evidence_items }),
      ...(input.source_records === undefined ? {} : { source_records: input.source_records }),
    }),
    manifest_id: first.manifest_id,
    non_compliance_config_refs: first.non_compliance_config_refs,
    normalization_context_ref: first.normalization_context_ref,
    partition_isolation_state: "EXACT_SINGLE_PARTITION",
    partition_scope: partition.partition_scope,
    partition_scope_refs: partition.partition_scope_refs,
    promoted_from_candidate_fact_refs: promotedFromCandidateFactRefs,
    promotion_record: promotionRecord,
    promotion_state: selectedState,
    retention_tag: allocateRetentionTag({
      anchor_timestamp: input.promoted_at,
      artifact_ref_seed: canonicalFactId,
      basis_ref: input.retention_basis_ref ?? "retention-basis://canonical-fact/default",
      ...(erasureState === "ACTIVE" ? {} : { limited_reason_code: "CANONICAL_PROMOTION_LIMITED" }),
      retention_class: "derived_artifact",
    }),
    source_record_lineage_hash: sourceRecordLineageHash,
    source_record_refs: sourceRecordRefs,
    source_strength_tier: strongestTier(candidates.map((candidate) => candidate.source_strength_tier)),
    supporting_evidence_refs: supportingEvidenceRefs,
    value_payload_ref: first.value_payload_ref,
    visibility_basis: "UNMASKED_AUTHORITATIVE_ONLY",
  };
  const canonicalFactContentHash = deriveCanonicalFactContentHash({
    ...draft,
    canonical_fact_id: canonicalFactId,
  });
  return normalizeCanonicalFactRecord({
    ...draft,
    canonical_fact_id: canonicalFactId,
    contract: buildCanonicalFactContract({
      canonical_fact_content_hash: canonicalFactContentHash,
      canonical_fact_id: canonicalFactId,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
  });
}
