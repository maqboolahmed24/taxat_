import { CandidateFactSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";
import type {
  CandidateAdjustmentBindingRecord,
  CandidateFactExecutionMode,
  CandidateFactFamily,
  CandidateFactPromotionReadinessRecord,
  CandidateFactPromotionState,
} from "../types/candidate_fact_draft.ts";
import { CANDIDATE_FACT_FAMILIES } from "../types/candidate_fact_draft.ts";
import type {
  SourceStrengthTier,
} from "./source_record.ts";

export type CandidateFactRecord = {
  adjustment_binding: CandidateAdjustmentBindingRecord | null;
  analysis_only: boolean;
  candidate_fact_id: string;
  candidate_identity_hash: string;
  collection_boundary_ref: string;
  confidence: number;
  conflict_membership_refs: string[];
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string | null;
  dedupe_key: string;
  evidence_lineage_hash: string;
  execution_mode: CandidateFactExecutionMode;
  fact_family: CandidateFactFamily;
  manifest_id: string;
  non_compliance_config_refs: string[];
  normalization_context_ref: string;
  partition_isolation_state: "EXACT_SINGLE_PARTITION";
  partition_scope: string;
  partition_scope_refs: string[];
  promotion_readiness: CandidateFactPromotionReadinessRecord;
  promotion_state: CandidateFactPromotionState;
  source_record_lineage_hash: string;
  source_record_refs: string[];
  source_strength_tier: SourceStrengthTier;
  supporting_evidence_refs: string[];
  value_payload_ref: string;
  visibility_basis: "UNMASKED_AUTHORITATIVE_ONLY";
  artifact_type: "CandidateFact";
};

export type CandidateFactRecordDraft = Omit<CandidateFactRecord, "candidate_fact_id" | "contract">;

export type CandidateFactModelErrorCode =
  | "CANDIDATE_FACT_ADJUSTMENT_BINDING_INVALID"
  | "CANDIDATE_FACT_ANALYSIS_POSTURE_INVALID"
  | "CANDIDATE_FACT_ARTIFACT_TYPE_INVALID"
  | "CANDIDATE_FACT_CONFIDENCE_INVALID"
  | "CANDIDATE_FACT_CONSTANT_INVALID"
  | "CANDIDATE_FACT_LINEAGE_REQUIRED"
  | "CANDIDATE_FACT_PARTITION_INVALID"
  | "CANDIDATE_FACT_VISIBILITY_INVALID";

export class CandidateFactModelError extends Error {
  readonly code: CandidateFactModelErrorCode;

  constructor(code: CandidateFactModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CandidateFactModelError";
    this.code = code;
  }
}

const PROMOTION_STATES = new Set<CandidateFactPromotionState>([
  "CANDIDATE",
  "PROVISIONAL",
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

function normalizeFactFamily(value: unknown): CandidateFactFamily {
  const normalized = normalizeCollectionString("candidate_fact.fact_family", value);
  if (!CANDIDATE_FACT_FAMILIES.includes(normalized as CandidateFactFamily)) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_CONSTANT_INVALID",
      "fact_family must be canonical",
    );
  }
  return normalized as CandidateFactFamily;
}

function normalizeExecutionMode(value: unknown): CandidateFactExecutionMode {
  const normalized = normalizeCollectionString("candidate_fact.execution_mode", value);
  if (normalized !== "COMPLIANCE" && normalized !== "ANALYSIS") {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_CONSTANT_INVALID",
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
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_ADJUSTMENT_BINDING_INVALID",
      "ADJUSTMENT_FACT requires an adjustment_binding",
    );
  }
  if (factFamily !== "ADJUSTMENT_FACT" && binding !== null) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_ADJUSTMENT_BINDING_INVALID",
      "non-adjustment candidate facts must not carry adjustment_binding",
    );
  }
  return binding === null
    ? null
    : {
        analysis_mode_treatment: binding.analysis_mode_treatment,
        applicable_reporting_scopes: normalizeCollectionStringSet(
          "candidate_fact.adjustment_binding.applicable_reporting_scopes",
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

export function candidateFactRef(record: Pick<CandidateFactRecord, "candidate_fact_id">) {
  return `candidate-fact://${record.candidate_fact_id}`;
}

export function deriveCandidateFactContentHash(record: Omit<CandidateFactRecord, "contract">) {
  return `candidate-fact-content-hash://${deriveCollectionControlHash({
    artifact_family: "CANDIDATE_FACT_CONTENT",
    payload: record,
  })}`;
}

export function buildCandidateFactContract(input: {
  candidate_fact_content_hash: string;
  candidate_fact_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.candidate_fact_content_hash,
    artifact_id: candidateFactRef({ candidate_fact_id: input.candidate_fact_id }),
    artifact_type: "CandidateFact",
    ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: CandidateFactSchemaLineage.schemaId,
    schema_source_hash: CandidateFactSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0114",
  });
}

export function normalizeCandidateFactRecord(input: CandidateFactRecord): CandidateFactRecord {
  if (input.artifact_type !== "CandidateFact") {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_ARTIFACT_TYPE_INVALID",
      "candidate facts must carry artifact_type CandidateFact",
    );
  }
  if (input.confidence < 0 || input.confidence > 1) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_CONFIDENCE_INVALID",
      "confidence must be between 0 and 1",
    );
  }

  const executionMode = normalizeExecutionMode(input.execution_mode);
  const nonComplianceConfigRefs = normalizeCollectionStringSet(
    "candidate_fact.non_compliance_config_refs",
    input.non_compliance_config_refs,
  );
  if (
    executionMode === "COMPLIANCE" &&
    (input.analysis_only ||
      input.counterfactual_basis !== null ||
      nonComplianceConfigRefs.length > 0)
  ) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_ANALYSIS_POSTURE_INVALID",
      "COMPLIANCE candidates cannot carry analysis-only posture",
    );
  }
  if (executionMode === "ANALYSIS" && (!input.analysis_only || input.counterfactual_basis === null)) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_ANALYSIS_POSTURE_INVALID",
      "ANALYSIS candidates require analysis_only and counterfactual_basis",
    );
  }

  const sourceRecordRefs = normalizeCollectionStringSet(
    "candidate_fact.source_record_refs",
    input.source_record_refs,
    { minItems: 1 },
  );
  const supportingEvidenceRefs = normalizeCollectionStringSet(
    "candidate_fact.supporting_evidence_refs",
    input.supporting_evidence_refs,
    { minItems: 1 },
  );
  const partitionScopeRefs = normalizeCollectionStringSet(
    "candidate_fact.partition_scope_refs",
    input.partition_scope_refs,
    { minItems: 1 },
  );
  if (partitionScopeRefs.length !== 1 || partitionScopeRefs[0] !== input.partition_scope) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_PARTITION_INVALID",
      "partition_scope_refs must contain exactly partition_scope",
    );
  }
  if (
    input.partition_isolation_state !== "EXACT_SINGLE_PARTITION" ||
    input.visibility_basis !== "UNMASKED_AUTHORITATIVE_ONLY"
  ) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_VISIBILITY_INVALID",
      "candidate facts must preserve exact partition and unmasked authoritative visibility",
    );
  }
  if (!PROMOTION_STATES.has(input.promotion_state)) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_CONSTANT_INVALID",
      "promotion_state must be canonical",
    );
  }
  if (!SOURCE_STRENGTH_TIERS.has(input.source_strength_tier)) {
    throw new CandidateFactModelError(
      "CANDIDATE_FACT_CONSTANT_INVALID",
      "source_strength_tier must be canonical",
    );
  }

  const factFamily = normalizeFactFamily(input.fact_family);
  const adjustmentBinding = normalizeAdjustmentBinding(factFamily, input.adjustment_binding);

  return {
    adjustment_binding: adjustmentBinding,
    analysis_only: input.analysis_only,
    artifact_type: "CandidateFact",
    candidate_fact_id: normalizeCollectionString(
      "candidate_fact.candidate_fact_id",
      input.candidate_fact_id,
    ),
    candidate_identity_hash: normalizeCollectionString(
      "candidate_fact.candidate_identity_hash",
      input.candidate_identity_hash,
    ),
    collection_boundary_ref: normalizeCollectionString(
      "candidate_fact.collection_boundary_ref",
      input.collection_boundary_ref,
    ),
    confidence: input.confidence,
    conflict_membership_refs: normalizeCollectionStringSet(
      "candidate_fact.conflict_membership_refs",
      input.conflict_membership_refs,
    ),
    contract: structuredClone(input.contract),
    counterfactual_basis:
      input.counterfactual_basis === null
        ? null
        : normalizeCollectionString("candidate_fact.counterfactual_basis", input.counterfactual_basis),
    dedupe_key: normalizeCollectionString("candidate_fact.dedupe_key", input.dedupe_key),
    evidence_lineage_hash: normalizeCollectionString(
      "candidate_fact.evidence_lineage_hash",
      input.evidence_lineage_hash,
    ),
    execution_mode: executionMode,
    fact_family: factFamily,
    manifest_id: normalizeCollectionString("candidate_fact.manifest_id", input.manifest_id),
    non_compliance_config_refs: nonComplianceConfigRefs,
    normalization_context_ref: normalizeCollectionString(
      "candidate_fact.normalization_context_ref",
      input.normalization_context_ref,
    ),
    partition_isolation_state: "EXACT_SINGLE_PARTITION",
    partition_scope: normalizeCollectionString("candidate_fact.partition_scope", input.partition_scope),
    partition_scope_refs: partitionScopeRefs,
    promotion_readiness: structuredClone(input.promotion_readiness),
    promotion_state: input.promotion_state,
    source_record_lineage_hash: normalizeCollectionString(
      "candidate_fact.source_record_lineage_hash",
      input.source_record_lineage_hash,
    ),
    source_record_refs: sourceRecordRefs,
    source_strength_tier: input.source_strength_tier,
    supporting_evidence_refs: supportingEvidenceRefs,
    value_payload_ref: normalizeCollectionString(
      "candidate_fact.value_payload_ref",
      input.value_payload_ref,
    ),
    visibility_basis: "UNMASKED_AUTHORITATIVE_ONLY",
  };
}

export function cloneCandidateFactRecord(record: CandidateFactRecord) {
  return structuredClone(record);
}
