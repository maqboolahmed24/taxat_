import type { CandidateAdjustmentBindingRecord } from "../../../backend-collection/src/types/candidate_fact_draft.ts";
import type { ComputeReportingScope } from "./reporting_scope_resolver.ts";

export type ComputeExecutionMode = "COMPLIANCE" | "ANALYSIS";
export type QuarterlyBasisProfile = "PERIODIC" | "CUMULATIVE";
export type ComputeAdjustmentInclusionPolicy = "RECORD_ONLY" | "APPLY_SCOPE_FILTERED_ADJUSTMENTS";
export type ComputeAdjustmentScopeSource =
  | "EXECUTABLE_REPORTING_SCOPE"
  | "COUNTERFACTUAL_ANALYSIS_SCOPE";

export type ComputeAnalysisPolicy = {
  allow_counterfactual_adjustments?: boolean;
  allow_provisional_facts?: boolean;
  non_compliance_config_refs?: readonly string[];
  policy_ref?: string;
};

export type AdjustmentInclusionResolution = {
  adjustment_inclusion_policy: ComputeAdjustmentInclusionPolicy;
  adjustment_scope_source: ComputeAdjustmentScopeSource;
  quarterly_basis_profile_or_null: QuarterlyBasisProfile | null;
};

export class AdjustmentInclusionPolicyError extends Error {
  readonly code:
    | "COMPUTE_ADJUSTMENT_POLICY_INVALID"
    | "COMPUTE_QUARTERLY_BASIS_INVALID"
    | "COMPUTE_QUARTERLY_BASIS_REQUIRED";

  constructor(code: AdjustmentInclusionPolicyError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AdjustmentInclusionPolicyError";
    this.code = code;
  }
}

function normalizeQuarterlyBasis(value: unknown): QuarterlyBasisProfile {
  if (value !== "PERIODIC" && value !== "CUMULATIVE") {
    throw new AdjustmentInclusionPolicyError(
      "COMPUTE_QUARTERLY_BASIS_REQUIRED",
      "quarterly_update compute requires PERIODIC or CUMULATIVE basis",
    );
  }
  return value;
}

export function resolveAdjustmentInclusionPolicy(input: {
  analysis_policy?: ComputeAnalysisPolicy;
  execution_mode: ComputeExecutionMode;
  quarterly_basis_profile?: QuarterlyBasisProfile | null;
  reporting_scope: ComputeReportingScope;
}): AdjustmentInclusionResolution {
  if (input.reporting_scope === "quarterly_update") {
    return {
      adjustment_inclusion_policy: "RECORD_ONLY",
      adjustment_scope_source:
        input.execution_mode === "ANALYSIS" &&
        input.analysis_policy?.allow_counterfactual_adjustments === true
          ? "COUNTERFACTUAL_ANALYSIS_SCOPE"
          : "EXECUTABLE_REPORTING_SCOPE",
      quarterly_basis_profile_or_null: normalizeQuarterlyBasis(input.quarterly_basis_profile),
    };
  }

  if (input.quarterly_basis_profile !== undefined && input.quarterly_basis_profile !== null) {
    throw new AdjustmentInclusionPolicyError(
      "COMPUTE_QUARTERLY_BASIS_INVALID",
      "quarterly_basis_profile must stay null outside quarterly_update reporting scope",
    );
  }

  return {
    adjustment_inclusion_policy: "APPLY_SCOPE_FILTERED_ADJUSTMENTS",
    adjustment_scope_source:
      input.execution_mode === "ANALYSIS" &&
      input.analysis_policy?.allow_counterfactual_adjustments === true
        ? "COUNTERFACTUAL_ANALYSIS_SCOPE"
        : "EXECUTABLE_REPORTING_SCOPE",
    quarterly_basis_profile_or_null: null,
  };
}

export function adjustmentAppliesToScope(input: {
  adjustment_binding: CandidateAdjustmentBindingRecord;
  adjustment_scope_source: ComputeAdjustmentScopeSource;
  execution_mode: ComputeExecutionMode;
  reporting_scope: ComputeReportingScope;
}) {
  if (input.adjustment_binding.partition_application !== "EXACT_PARTITION_ONLY") {
    return false;
  }
  if (!input.adjustment_binding.applicable_reporting_scopes.includes(input.reporting_scope)) {
    return false;
  }
  if (
    input.execution_mode === "COMPLIANCE" &&
    input.adjustment_binding.analysis_mode_treatment !== "MATCH_COMPLIANCE_BASIS"
  ) {
    return false;
  }
  if (
    input.adjustment_scope_source === "COUNTERFACTUAL_ANALYSIS_SCOPE" &&
    input.adjustment_binding.analysis_mode_treatment !== "COUNTERFACTUAL_ONLY"
  ) {
    return false;
  }
  if (
    input.adjustment_scope_source === "EXECUTABLE_REPORTING_SCOPE" &&
    input.adjustment_binding.analysis_mode_treatment === "COUNTERFACTUAL_ONLY"
  ) {
    return false;
  }
  return true;
}
