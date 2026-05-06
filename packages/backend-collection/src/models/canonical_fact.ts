import { CanonicalFactSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";
import {
  normalizeCollectionRetentionTag,
  type CollectionErasureState,
  type CollectionRetentionTag,
  type SourceFreshnessState,
  type SourceStrengthTier,
} from "./source_record.ts";
import type {
  CandidateAdjustmentBindingRecord,
  CandidateFactExecutionMode,
  CandidateFactFamily,
} from "../types/candidate_fact_draft.ts";
import { CANDIDATE_FACT_FAMILIES } from "../types/candidate_fact_draft.ts";
import type { CanonicalPromotionRecord } from "../services/build_promotion_record.ts";
import type { CanonicalPromotionState } from "../services/select_promotion_state.ts";

export type CanonicalFactRecord = {
  adjustment_binding: CandidateAdjustmentBindingRecord | null;
  analysis_only: boolean;
  artifact_type: "CanonicalFact";
  canonical_fact_id: string;
  canonical_identity_hash: string;
  collection_boundary_ref: string;
  conflict_membership_refs: string[];
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string | null;
  dedupe_key: string;
  erasure_state: CollectionErasureState;
  evidence_lineage_hash: string;
  execution_mode: CandidateFactExecutionMode;
  fact_family: CandidateFactFamily;
  freshness_state: SourceFreshnessState;
  manifest_id: string;
  non_compliance_config_refs: string[];
  normalization_context_ref: string;
  partition_isolation_state: "EXACT_SINGLE_PARTITION";
  partition_scope: string;
  partition_scope_refs: string[];
  promoted_from_candidate_fact_refs: string[];
  promotion_record: CanonicalPromotionRecord;
  promotion_state: CanonicalPromotionState;
  retention_tag: CollectionRetentionTag;
  source_record_lineage_hash: string;
  source_record_refs: string[];
  source_strength_tier: SourceStrengthTier;
  supporting_evidence_refs: string[];
  value_payload_ref: string;
  visibility_basis: "UNMASKED_AUTHORITATIVE_ONLY";
};

export type CanonicalFactRecordDraft = Omit<CanonicalFactRecord, "canonical_fact_id" | "contract">;

export type CanonicalFactModelErrorCode =
  | "CANONICAL_FACT_ADJUSTMENT_BINDING_INVALID"
  | "CANONICAL_FACT_ANALYSIS_POSTURE_INVALID"
  | "CANONICAL_FACT_ARTIFACT_TYPE_INVALID"
  | "CANONICAL_FACT_CONSTANT_INVALID"
  | "CANONICAL_FACT_LINEAGE_REQUIRED"
  | "CANONICAL_FACT_PARTITION_INVALID"
  | "CANONICAL_FACT_PROMOTION_RECORD_INVALID"
  | "CANONICAL_FACT_VISIBILITY_INVALID";

export class CanonicalFactModelError extends Error {
  readonly code: CanonicalFactModelErrorCode;

  constructor(code: CanonicalFactModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CanonicalFactModelError";
    this.code = code;
  }
}

const PROMOTION_STATES = new Set<CanonicalPromotionState>([
  "PROVISIONAL",
  "CANONICAL",
  "CONTESTED",
  "SUPERSEDED",
  "RETIRED",
]);

const SOURCE_STRENGTH_TIERS = new Set<SourceStrengthTier>([
  "TIER_1_AUTHORITY_FINAL",
  "TIER_2_AUTHORITY_REFERENCE",
  "TIER_3_STRUCTURED_EXTERNAL",
  "TIER_4_STRUCTURED_INTERNAL",
  "TIER_5_DOCUMENT_SUPPORT",
  "TIER_6_DECLARED_ONLY",
  "TIER_7_INFERRED",
  "TIER_8_GOVERNANCE_ONLY",
]);

const FRESHNESS_STATES = new Set<SourceFreshnessState>([
  "CURRENT",
  "STALE",
  "EXPIRED",
  "UNKNOWN",
  "SUPERSEDED",
]);

const ERASURE_STATES = new Set<CollectionErasureState>([
  "ACTIVE",
  "LIMITED",
  "LEGAL_HOLD",
  "ERASURE_PENDING",
  "PSEUDONYMISED",
  "ERASED",
]);

function normalizeFactFamily(value: unknown): CandidateFactFamily {
  const normalized = normalizeCollectionString("canonical_fact.fact_family", value);
  if (!CANDIDATE_FACT_FAMILIES.includes(normalized as CandidateFactFamily)) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_CONSTANT_INVALID",
      "fact_family must be canonical",
    );
  }
  return normalized as CandidateFactFamily;
}

function normalizeExecutionMode(value: unknown): CandidateFactExecutionMode {
  const normalized = normalizeCollectionString("canonical_fact.execution_mode", value);
  if (normalized !== "COMPLIANCE" && normalized !== "ANALYSIS") {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_CONSTANT_INVALID",
      "execution_mode must be COMPLIANCE or ANALYSIS",
    );
  }
  return normalized;
}

function normalizeAdjustmentBinding(
  factFamily: CandidateFactFamily,
  binding: CandidateAdjustmentBindingRecord | null,
) {
  if (factFamily === "ADJUSTMENT_FACT" && binding === null) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_ADJUSTMENT_BINDING_INVALID",
      "ADJUSTMENT_FACT requires an adjustment_binding",
    );
  }
  if (factFamily !== "ADJUSTMENT_FACT" && binding !== null) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_ADJUSTMENT_BINDING_INVALID",
      "non-adjustment canonical facts must not carry adjustment_binding",
    );
  }
  return binding === null
    ? null
    : {
        analysis_mode_treatment: binding.analysis_mode_treatment,
        applicable_reporting_scopes: normalizeCollectionStringSet(
          "canonical_fact.adjustment_binding.applicable_reporting_scopes",
          binding.applicable_reporting_scopes,
          { minItems: 1 },
        ) as CandidateAdjustmentBindingRecord["applicable_reporting_scopes"],
        partition_application: "EXACT_PARTITION_ONLY" as const,
        quarterly_basis_profile: binding.quarterly_basis_profile,
        time_window_basis: binding.time_window_basis,
        window_end_date_or_null: binding.window_end_date_or_null,
        window_start_date_or_null: binding.window_start_date_or_null,
      };
}

function normalizePromotionRecord(record: CanonicalPromotionRecord): CanonicalPromotionRecord {
  const blockingConflictIds = normalizeCollectionStringSet(
    "canonical_fact.promotion_record.blocking_conflict_ids_at_promotion",
    record.blocking_conflict_ids_at_promotion,
  );
  if (
    (blockingConflictIds.length === 0 &&
      record.resolution_frontier_at_promotion === "BLOCKING_PRESENT") ||
    (blockingConflictIds.length > 0 &&
      record.resolution_frontier_at_promotion !== "BLOCKING_PRESENT")
  ) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_PROMOTION_RECORD_INVALID",
      "promotion record blocking fields must mirror the resolution frontier",
    );
  }
  return {
    approved_override_ref_or_null:
      record.approved_override_ref_or_null === null
        ? null
        : normalizeCollectionString(
            "canonical_fact.promotion_record.approved_override_ref_or_null",
            record.approved_override_ref_or_null,
          ),
    blocking_conflict_count_at_promotion: blockingConflictIds.length,
    blocking_conflict_ids_at_promotion: blockingConflictIds,
    conflict_set_ref: normalizeCollectionString(
      "canonical_fact.promotion_record.conflict_set_ref",
      record.conflict_set_ref,
    ),
    evidence_lineage_complete: true,
    frozen_collection_boundary_required: true,
    promoted_at: normalizeUtcInstantString(record.promoted_at),
    promotion_activity_ref: normalizeCollectionString(
      "canonical_fact.promotion_record.promotion_activity_ref",
      record.promotion_activity_ref,
    ),
    promotion_rule_ref: normalizeCollectionString(
      "canonical_fact.promotion_record.promotion_rule_ref",
      record.promotion_rule_ref,
    ),
    resolution_frontier_at_promotion: record.resolution_frontier_at_promotion,
    visibility_safe_for_authority: true,
  };
}

export function canonicalFactRef(record: Pick<CanonicalFactRecord, "canonical_fact_id">) {
  return `canonical-fact://${record.canonical_fact_id}`;
}

export function deriveCanonicalFactContentHash(record: Omit<CanonicalFactRecord, "contract">) {
  return `canonical-fact-content-hash://${deriveCollectionControlHash({
    artifact_family: "CANONICAL_FACT_CONTENT",
    payload: record,
  })}`;
}

export function buildCanonicalFactContract(input: {
  canonical_fact_content_hash: string;
  canonical_fact_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.canonical_fact_content_hash,
    artifact_id: canonicalFactRef({ canonical_fact_id: input.canonical_fact_id }),
    artifact_type: "CanonicalFact",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: CanonicalFactSchemaLineage.schemaId,
    schema_source_hash: CanonicalFactSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0116",
  });
}

export function normalizeCanonicalFactRecord(input: CanonicalFactRecord): CanonicalFactRecord {
  if (input.artifact_type !== "CanonicalFact") {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_ARTIFACT_TYPE_INVALID",
      "canonical facts must carry artifact_type CanonicalFact",
    );
  }

  const executionMode = normalizeExecutionMode(input.execution_mode);
  const nonComplianceConfigRefs = normalizeCollectionStringSet(
    "canonical_fact.non_compliance_config_refs",
    input.non_compliance_config_refs,
  );
  if (
    executionMode === "COMPLIANCE" &&
    (input.analysis_only ||
      input.counterfactual_basis !== null ||
      nonComplianceConfigRefs.length > 0)
  ) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_ANALYSIS_POSTURE_INVALID",
      "COMPLIANCE canonical facts cannot carry analysis-only posture",
    );
  }
  if (executionMode === "ANALYSIS" && (!input.analysis_only || input.counterfactual_basis === null)) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_ANALYSIS_POSTURE_INVALID",
      "ANALYSIS canonical facts require analysis_only and counterfactual_basis",
    );
  }

  const sourceRecordRefs = normalizeCollectionStringSet(
    "canonical_fact.source_record_refs",
    input.source_record_refs,
    { minItems: 1 },
  );
  const supportingEvidenceRefs = normalizeCollectionStringSet(
    "canonical_fact.supporting_evidence_refs",
    input.supporting_evidence_refs,
    { minItems: 1 },
  );
  const promotedFromRefs = normalizeCollectionStringSet(
    "canonical_fact.promoted_from_candidate_fact_refs",
    input.promoted_from_candidate_fact_refs,
    { minItems: 1 },
  );
  const partitionScopeRefs = normalizeCollectionStringSet(
    "canonical_fact.partition_scope_refs",
    input.partition_scope_refs,
    { minItems: 1 },
  );
  if (partitionScopeRefs.length !== 1 || partitionScopeRefs[0] !== input.partition_scope) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_PARTITION_INVALID",
      "partition_scope_refs must contain exactly partition_scope",
    );
  }
  if (
    input.partition_isolation_state !== "EXACT_SINGLE_PARTITION" ||
    input.visibility_basis !== "UNMASKED_AUTHORITATIVE_ONLY"
  ) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_VISIBILITY_INVALID",
      "canonical facts must preserve exact partition and unmasked authoritative visibility",
    );
  }
  if (!PROMOTION_STATES.has(input.promotion_state)) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_CONSTANT_INVALID",
      "promotion_state must be canonical",
    );
  }
  if (!SOURCE_STRENGTH_TIERS.has(input.source_strength_tier)) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_CONSTANT_INVALID",
      "source_strength_tier must be canonical",
    );
  }
  if (!FRESHNESS_STATES.has(input.freshness_state) || !ERASURE_STATES.has(input.erasure_state)) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_CONSTANT_INVALID",
      "freshness_state and erasure_state must be canonical",
    );
  }

  const factFamily = normalizeFactFamily(input.fact_family);
  const adjustmentBinding = normalizeAdjustmentBinding(factFamily, input.adjustment_binding);
  if (
    executionMode === "COMPLIANCE" &&
    factFamily === "ADJUSTMENT_FACT" &&
    adjustmentBinding?.analysis_mode_treatment !== "MATCH_COMPLIANCE_BASIS"
  ) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_ADJUSTMENT_BINDING_INVALID",
      "COMPLIANCE adjustment facts require MATCH_COMPLIANCE_BASIS",
    );
  }

  const promotionRecord = normalizePromotionRecord(input.promotion_record);
  if (
    input.promotion_state === "CANONICAL" &&
    (promotionRecord.blocking_conflict_count_at_promotion !== 0 ||
      promotionRecord.resolution_frontier_at_promotion === "BLOCKING_PRESENT")
  ) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_PROMOTION_RECORD_INVALID",
      "CANONICAL facts cannot carry blocking conflict posture",
    );
  }
  const conflictMembershipRefs = normalizeCollectionStringSet(
    "canonical_fact.conflict_membership_refs",
    input.conflict_membership_refs,
  );
  if (input.promotion_state === "CONTESTED" && conflictMembershipRefs.length === 0) {
    throw new CanonicalFactModelError(
      "CANONICAL_FACT_PROMOTION_RECORD_INVALID",
      "CONTESTED canonical facts require conflict membership refs",
    );
  }

  return {
    adjustment_binding: adjustmentBinding,
    analysis_only: input.analysis_only,
    artifact_type: "CanonicalFact",
    canonical_fact_id: normalizeCollectionString(
      "canonical_fact.canonical_fact_id",
      input.canonical_fact_id,
    ),
    canonical_identity_hash: normalizeCollectionString(
      "canonical_fact.canonical_identity_hash",
      input.canonical_identity_hash,
    ),
    collection_boundary_ref: normalizeCollectionString(
      "canonical_fact.collection_boundary_ref",
      input.collection_boundary_ref,
    ),
    conflict_membership_refs: conflictMembershipRefs,
    contract: structuredClone(input.contract),
    counterfactual_basis:
      input.counterfactual_basis === null
        ? null
        : normalizeCollectionString(
            "canonical_fact.counterfactual_basis",
            input.counterfactual_basis,
          ),
    dedupe_key: normalizeCollectionString("canonical_fact.dedupe_key", input.dedupe_key),
    erasure_state: input.erasure_state,
    evidence_lineage_hash: normalizeCollectionString(
      "canonical_fact.evidence_lineage_hash",
      input.evidence_lineage_hash,
    ),
    execution_mode: executionMode,
    fact_family: factFamily,
    freshness_state: input.freshness_state,
    manifest_id: normalizeCollectionString("canonical_fact.manifest_id", input.manifest_id),
    non_compliance_config_refs: nonComplianceConfigRefs,
    normalization_context_ref: normalizeCollectionString(
      "canonical_fact.normalization_context_ref",
      input.normalization_context_ref,
    ),
    partition_isolation_state: "EXACT_SINGLE_PARTITION",
    partition_scope: normalizeCollectionString("canonical_fact.partition_scope", input.partition_scope),
    partition_scope_refs: partitionScopeRefs,
    promoted_from_candidate_fact_refs: promotedFromRefs,
    promotion_record: promotionRecord,
    promotion_state: input.promotion_state,
    retention_tag: normalizeCollectionRetentionTag(input.retention_tag),
    source_record_lineage_hash: normalizeCollectionString(
      "canonical_fact.source_record_lineage_hash",
      input.source_record_lineage_hash,
    ),
    source_record_refs: sourceRecordRefs,
    source_strength_tier: input.source_strength_tier,
    supporting_evidence_refs: supportingEvidenceRefs,
    value_payload_ref: normalizeCollectionString(
      "canonical_fact.value_payload_ref",
      input.value_payload_ref,
    ),
    visibility_basis: "UNMASKED_AUTHORITATIVE_ONLY",
  };
}

export function cloneCanonicalFactRecord(record: CanonicalFactRecord) {
  return structuredClone(record);
}
