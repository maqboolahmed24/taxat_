import {
  buildCandidateFactContract,
  deriveCandidateFactContentHash,
  normalizeCandidateFactRecord,
  type CandidateFactRecord,
  type CandidateFactRecordDraft,
} from "../models/candidate_fact.ts";
import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import { evidenceItemRef, normalizeEvidenceItemRecord, type EvidenceItemRecord } from "../models/evidence_item.ts";
import { normalizationContextRef, normalizeNormalizationContextRecord, type NormalizationContextRecord } from "../models/normalization_context.ts";
import {
  normalizeSourceRecordRecord,
  sourceRecordRef,
  type SourceRecordRecord,
  type SourceStrengthTier,
} from "../models/source_record.ts";
import type {
  CandidateAdjustmentBindingRecord,
  CandidateConflictFrontierInput,
  CandidateFactExecutionMode,
  CandidateFactExtractionDraft,
  CandidateFactExtractionOverride,
  CandidateFactFamily,
  CandidateFactPromotionReadinessRecord,
} from "../types/candidate_fact_draft.ts";
import { allocateCandidateValuePayloadRef, candidateFactIdFromIdentity, deriveCandidateDedupeKey, deriveCandidateIdentityHash } from "./candidate_identity_hash.ts";
import { deriveEvidenceLineageHash } from "./evidence_lineage_hash.ts";
import { classifyFactFamily } from "./fact_family_classifier.ts";
import { deriveSourceRecordLineageHash } from "./source_record_lineage_hash.ts";
import { validateCandidatePartitionScope } from "./validate_candidate_partition_scope.ts";

export type ExtractCandidateFactsErrorCode =
  | "CANDIDATE_FACT_ANALYSIS_BASIS_REQUIRED"
  | "CANDIDATE_FACT_COMPLIANCE_CONFIG_INVALID"
  | "CANDIDATE_FACT_EVIDENCE_SOURCE_MISSING"
  | "CANDIDATE_FACT_SUPPORT_REQUIRED";

export class ExtractCandidateFactsError extends Error {
  readonly code: ExtractCandidateFactsErrorCode;

  constructor(code: ExtractCandidateFactsErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ExtractCandidateFactsError";
    this.code = code;
  }
}

type CandidateSupportGroup = {
  adjustment_binding: CandidateAdjustmentBindingRecord | null;
  collection_boundary_ref: string;
  confidence: number;
  evidence_items: EvidenceItemRecord[];
  fact_family: CandidateFactFamily;
  source_records: SourceRecordRecord[];
  value_payload_ref: string;
};

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

function buildPromotionReadiness(input: {
  conflict_frontier?: CandidateConflictFrontierInput;
  manifest_id: string;
  promotion_rule_ref: string;
}): CandidateFactPromotionReadinessRecord {
  const blockingConflictIds = normalizeCollectionStringSet(
    "candidate_fact.promotion_readiness.blocking_conflict_ids",
    input.conflict_frontier?.blocking_conflict_ids ?? [],
  );
  const blocking = blockingConflictIds.length > 0;
  return {
    approved_override_ref_or_null: input.conflict_frontier?.approved_override_ref_or_null ?? null,
    blocking_conflict_count: blockingConflictIds.length,
    blocking_conflict_ids: blockingConflictIds,
    conflict_set_ref:
      input.conflict_frontier?.conflict_set_ref ??
      `conflict-set://bootstrap/${normalizeCollectionString("candidate_fact.manifest_id", input.manifest_id)}`,
    evidence_lineage_complete: true,
    frozen_collection_boundary_required: true,
    promotion_rule_ref: input.conflict_frontier?.promotion_rule_ref ?? input.promotion_rule_ref,
    readiness_state:
      input.conflict_frontier?.readiness_state ??
      (blocking ? "CONFLICT_BLOCKED" : "CANDIDATE_ONLY"),
    resolution_frontier:
      input.conflict_frontier?.resolution_frontier ?? (blocking ? "BLOCKING_PRESENT" : "CLEAR"),
    visibility_safe_for_authority: true,
  };
}

function assertExecutionMode(input: {
  counterfactual_basis?: string | null;
  execution_mode: CandidateFactExecutionMode;
  non_compliance_config_refs?: readonly string[];
}) {
  const nonComplianceConfigRefs = normalizeCollectionStringSet(
    "candidate_fact.non_compliance_config_refs",
    input.non_compliance_config_refs ?? [],
  );
  if (input.execution_mode === "COMPLIANCE") {
    if (nonComplianceConfigRefs.length > 0 || input.counterfactual_basis !== undefined && input.counterfactual_basis !== null) {
      throw new ExtractCandidateFactsError(
        "CANDIDATE_FACT_COMPLIANCE_CONFIG_INVALID",
        "COMPLIANCE candidates cannot carry non-compliance refs or counterfactual basis",
      );
    }
    return {
      analysis_only: false,
      counterfactual_basis: null,
      non_compliance_config_refs: [] as string[],
    };
  }
  if (input.counterfactual_basis === undefined || input.counterfactual_basis === null) {
    throw new ExtractCandidateFactsError(
      "CANDIDATE_FACT_ANALYSIS_BASIS_REQUIRED",
      "ANALYSIS candidates require counterfactual_basis",
    );
  }
  return {
    analysis_only: true,
    counterfactual_basis: normalizeCollectionString(
      "candidate_fact.counterfactual_basis",
      input.counterfactual_basis,
    ),
    non_compliance_config_refs: nonComplianceConfigRefs,
  };
}

function overrideByEvidenceId(overrides: readonly CandidateFactExtractionOverride[] | undefined) {
  return new Map((overrides ?? []).map((override) => [override.evidence_item_id, override] as const));
}

export function extractCandidateFacts(input: {
  conflict_frontier?: CandidateConflictFrontierInput;
  counterfactual_basis?: string | null;
  evidence_items: readonly EvidenceItemRecord[];
  execution_mode?: CandidateFactExecutionMode;
  expected_partition_scope?: string;
  extraction_overrides?: readonly CandidateFactExtractionOverride[];
  non_compliance_config_refs?: readonly string[];
  normalization_context: NormalizationContextRecord;
  schema_bundle_hash?: string;
  source_records: readonly SourceRecordRecord[];
  writer_build_id?: string;
}): CandidateFactRecord[] {
  const normalizationContext = normalizeNormalizationContextRecord(input.normalization_context);
  const executionMode = input.execution_mode ?? "COMPLIANCE";
  const executionPosture = assertExecutionMode({
    execution_mode: executionMode,
    ...(input.counterfactual_basis === undefined
      ? {}
      : { counterfactual_basis: input.counterfactual_basis }),
    ...(input.non_compliance_config_refs === undefined
      ? {}
      : { non_compliance_config_refs: input.non_compliance_config_refs }),
  });
  const sourceRecordsById = new Map(
    input.source_records.map((sourceRecord) => {
      const normalized = normalizeSourceRecordRecord(sourceRecord);
      return [normalized.source_record_id, normalized] as const;
    }),
  );
  const overrides = overrideByEvidenceId(input.extraction_overrides);
  const groups = new Map<string, CandidateSupportGroup>();

  for (const evidenceItemInput of input.evidence_items) {
    const evidenceItem = normalizeEvidenceItemRecord(evidenceItemInput);
    const sourceRecord = sourceRecordsById.get(evidenceItem.source_record_id);
    if (!sourceRecord) {
      throw new ExtractCandidateFactsError(
        "CANDIDATE_FACT_EVIDENCE_SOURCE_MISSING",
        `evidence item ${evidenceItem.evidence_item_id} references an unavailable source record`,
      );
    }
    const partition = validateCandidatePartitionScope({
      evidence_items: [evidenceItem],
      ...(input.expected_partition_scope === undefined
        ? {}
        : { expected_partition_scope: input.expected_partition_scope }),
      source_records: [sourceRecord],
    });
    const override = overrides.get(evidenceItem.evidence_item_id);
    const classification = classifyFactFamily({
      evidence_kind: evidenceItem.evidence_kind,
      ...(override?.fact_family === undefined ? {} : { fact_family_hint: override.fact_family }),
      source_class: sourceRecord.source_class,
      ...(override?.value_payload_ref === undefined
        ? {}
        : { value_payload_ref: override.value_payload_ref }),
    });
    const factFamily = classification.fact_family;
    const adjustmentBinding = override?.adjustment_binding ?? null;
    if (factFamily === "ADJUSTMENT_FACT" && adjustmentBinding === null) {
      throw new ExtractCandidateFactsError(
        "CANDIDATE_FACT_SUPPORT_REQUIRED",
        "ADJUSTMENT_FACT extraction requires adjustment_binding",
      );
    }
    const valuePayloadRef =
      override?.value_payload_ref ??
      allocateCandidateValuePayloadRef({
        evidence_content_ref: evidenceItem.content_ref,
        fact_family: factFamily,
        normalization_context_hash: normalizationContext.normalization_context_hash,
      });
      const logical = {
        adjustment_binding: adjustmentBinding,
        collection_boundary_ref: sourceRecord.collection_boundary_ref,
        execution_mode: executionMode,
        fact_family: factFamily,
      manifest_id: sourceRecord.manifest_id,
      normalization_context_ref: normalizationContextRef(normalizationContext),
      partition_scope: partition.partition_scope,
      value_payload_ref: valuePayloadRef,
    };
    const dedupeKey = deriveCandidateDedupeKey(logical);
    const group = groups.get(dedupeKey);
    if (group) {
      group.confidence = Math.max(group.confidence, override?.confidence ?? evidenceItem.extraction_confidence);
      group.evidence_items.push(evidenceItem);
      group.source_records.push(sourceRecord);
      continue;
    }
    groups.set(dedupeKey, {
      adjustment_binding: adjustmentBinding,
      collection_boundary_ref: sourceRecord.collection_boundary_ref,
      confidence: override?.confidence ?? evidenceItem.extraction_confidence,
      evidence_items: [evidenceItem],
      fact_family: factFamily,
      source_records: [sourceRecord],
      value_payload_ref: valuePayloadRef,
    });
  }

  return [...groups.entries()]
    .map(([dedupeKey, group]) => {
      if (group.evidence_items.length === 0 || group.source_records.length === 0) {
        throw new ExtractCandidateFactsError(
          "CANDIDATE_FACT_SUPPORT_REQUIRED",
          "candidate extraction requires source and evidence support",
        );
      }
      const partition = validateCandidatePartitionScope({
        evidence_items: group.evidence_items,
        ...(input.expected_partition_scope === undefined
          ? {}
          : { expected_partition_scope: input.expected_partition_scope }),
        source_records: group.source_records,
      });
      const sourceRecordRefs = normalizeCollectionStringSet(
        "candidate_fact.source_record_refs",
        group.source_records.map((sourceRecord) => sourceRecordRef(sourceRecord)),
        { minItems: 1 },
      );
      const evidenceRefs = normalizeCollectionStringSet(
        "candidate_fact.supporting_evidence_refs",
        group.evidence_items.map((evidenceItem) => evidenceItemRef(evidenceItem)),
        { minItems: 1 },
      );
      const sourceRecordLineageHash = deriveSourceRecordLineageHash(sourceRecordRefs);
      const evidenceLineageHash = deriveEvidenceLineageHash(evidenceRefs);
      const candidateIdentityHash = deriveCandidateIdentityHash({
        adjustment_binding: group.adjustment_binding,
        collection_boundary_ref: group.collection_boundary_ref,
        evidence_lineage_hash: evidenceLineageHash,
        execution_mode: executionMode,
        fact_family: group.fact_family,
        manifest_id: group.source_records[0]!.manifest_id,
        normalization_context_ref: normalizationContextRef(normalizationContext),
        partition_scope: partition.partition_scope,
        source_record_lineage_hash: sourceRecordLineageHash,
        value_payload_ref: group.value_payload_ref,
      });
      const promotionReadiness = buildPromotionReadiness({
        manifest_id: group.source_records[0]!.manifest_id,
        promotion_rule_ref: normalizationContext.promotion_rules_ref,
        ...(input.conflict_frontier === undefined ? {} : { conflict_frontier: input.conflict_frontier }),
      });
      const draft: CandidateFactRecordDraft = {
        adjustment_binding: group.adjustment_binding,
        analysis_only: executionPosture.analysis_only,
        artifact_type: "CandidateFact",
        candidate_identity_hash: candidateIdentityHash,
        collection_boundary_ref: group.collection_boundary_ref,
        confidence: group.confidence,
        conflict_membership_refs: promotionReadiness.blocking_conflict_ids.map(
          (id) => `conflict://${id}`,
        ),
        counterfactual_basis: executionPosture.counterfactual_basis,
        dedupe_key: dedupeKey,
        evidence_lineage_hash: evidenceLineageHash,
        execution_mode: executionMode,
        fact_family: group.fact_family,
        manifest_id: group.source_records[0]!.manifest_id,
        non_compliance_config_refs: executionPosture.non_compliance_config_refs,
        normalization_context_ref: normalizationContextRef(normalizationContext),
        partition_isolation_state: "EXACT_SINGLE_PARTITION",
        partition_scope: partition.partition_scope,
        partition_scope_refs: partition.partition_scope_refs,
        promotion_readiness: promotionReadiness,
        promotion_state: promotionReadiness.blocking_conflict_count > 0 ? "CONTESTED" : "CANDIDATE",
        source_record_lineage_hash: sourceRecordLineageHash,
        source_record_refs: sourceRecordRefs,
        source_strength_tier: strongestTier(
          group.source_records.map((sourceRecord) => sourceRecord.source_strength_tier),
        ),
        supporting_evidence_refs: evidenceRefs,
        value_payload_ref: group.value_payload_ref,
        visibility_basis: "UNMASKED_AUTHORITATIVE_ONLY",
      };
      const candidateFactId = candidateFactIdFromIdentity(candidateIdentityHash);
      const candidateFactContentHash = deriveCandidateFactContentHash({
        ...draft,
        candidate_fact_id: candidateFactId,
      });
      return normalizeCandidateFactRecord({
        ...draft,
        candidate_fact_id: candidateFactId,
        contract: buildCandidateFactContract({
          candidate_fact_content_hash: candidateFactContentHash,
          candidate_fact_id: candidateFactId,
          ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
          ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
        }),
      });
    })
    .sort((left, right) => left.dedupe_key.localeCompare(right.dedupe_key));
}

export type ExtractedCandidateFactDraft = CandidateFactExtractionDraft;
