import type { EvidenceItemKind } from "../models/evidence_item.ts";
import type { SourceStrengthTier } from "../models/source_record.ts";

export const CANDIDATE_FACT_FAMILIES = [
  "TRANSACTION_FACT",
  "RECORD_FACT",
  "CATEGORY_TOTAL_FACT",
  "ADJUSTMENT_FACT",
  "PROFILE_FACT",
  "OBLIGATION_FACT",
  "SUBMISSION_STATE_FACT",
  "AUTHORITY_COMPARISON_FACT",
  "RISK_FEATURE_FACT",
  "WORKFLOW_CONTEXT_FACT",
] as const;

export type CandidateFactFamily = (typeof CANDIDATE_FACT_FAMILIES)[number];
export type CandidateFactExecutionMode = "COMPLIANCE" | "ANALYSIS";
export type CandidateFactPromotionState =
  | "CANDIDATE"
  | "PROVISIONAL"
  | "CONTESTED"
  | "SUPERSEDED"
  | "RETIRED";
export type CandidateReadinessState =
  | "CANDIDATE_ONLY"
  | "PROVISIONAL_ALLOWED"
  | "READY_FOR_CANONICAL"
  | "CONFLICT_BLOCKED";
export type CandidateResolutionFrontier = "CLEAR" | "MONITORING_ONLY" | "BLOCKING_PRESENT";

export type CandidateFactPromotionReadinessRecord = {
  approved_override_ref_or_null: string | null;
  blocking_conflict_count: number;
  blocking_conflict_ids: string[];
  conflict_set_ref: string;
  evidence_lineage_complete: true;
  frozen_collection_boundary_required: true;
  promotion_rule_ref: string;
  readiness_state: CandidateReadinessState;
  resolution_frontier: CandidateResolutionFrontier;
  visibility_safe_for_authority: true;
};

export type CandidateAdjustmentBindingRecord = {
  analysis_mode_treatment: "MATCH_COMPLIANCE_BASIS" | "COUNTERFACTUAL_ONLY";
  applicable_reporting_scopes: Array<"year_end" | "quarterly_update" | "estimate_only">;
  partition_application: "EXACT_PARTITION_ONLY";
  quarterly_basis_profile: "NOT_APPLICABLE" | "PERIODIC" | "CUMULATIVE";
  time_window_basis:
    | "FULL_TAX_YEAR"
    | "CURRENT_QUARTER_ONLY"
    | "TAX_YEAR_TO_DATE"
    | "EXPLICIT_WINDOW";
  window_end_date_or_null: string | null;
  window_start_date_or_null: string | null;
};

export type CandidateConflictFrontierInput = {
  approved_override_ref_or_null?: string | null;
  blocking_conflict_ids?: readonly string[];
  conflict_set_ref?: string;
  promotion_rule_ref?: string;
  readiness_state?: CandidateReadinessState;
  resolution_frontier?: CandidateResolutionFrontier;
};

export type CandidateFactExtractionOverride = {
  adjustment_binding?: CandidateAdjustmentBindingRecord | null;
  confidence?: number;
  evidence_item_id: string;
  fact_family?: CandidateFactFamily;
  value_payload_ref?: string;
};

export type CandidateFactExtractionDraft = {
  adjustment_binding: CandidateAdjustmentBindingRecord | null;
  analysis_only: boolean;
  collection_boundary_ref: string;
  confidence: number;
  conflict_membership_refs: string[];
  counterfactual_basis: string | null;
  dedupe_key: string;
  evidence_item_ids: string[];
  evidence_lineage_hash: string;
  execution_mode: CandidateFactExecutionMode;
  fact_family: CandidateFactFamily;
  manifest_id: string;
  non_compliance_config_refs: string[];
  normalization_context_ref: string;
  partition_scope: string;
  partition_scope_refs: string[];
  promotion_readiness: CandidateFactPromotionReadinessRecord;
  promotion_state: CandidateFactPromotionState;
  source_record_ids: string[];
  source_record_lineage_hash: string;
  source_strength_tier: SourceStrengthTier;
  supporting_evidence_refs: string[];
  source_record_refs: string[];
  value_payload_ref: string;
  visibility_basis: "UNMASKED_AUTHORITATIVE_ONLY";
};

export type FactFamilyClassificationInput = {
  evidence_kind: EvidenceItemKind;
  fact_family_hint?: CandidateFactFamily;
  source_class: string;
  value_payload_ref?: string;
};
