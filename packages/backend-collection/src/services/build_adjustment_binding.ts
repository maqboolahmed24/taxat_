import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type {
  CandidateAdjustmentBindingRecord,
  CandidateFactExecutionMode,
} from "../types/candidate_fact_draft.ts";

export type BuildAdjustmentBindingInput = {
  applicable_reporting_scopes?: ReadonlyArray<"year_end" | "quarterly_update" | "estimate_only">;
  execution_mode: CandidateFactExecutionMode;
  quarterly_basis_profile?: "NOT_APPLICABLE" | "PERIODIC" | "CUMULATIVE";
  time_window_basis?: "FULL_TAX_YEAR" | "CURRENT_QUARTER_ONLY" | "TAX_YEAR_TO_DATE" | "EXPLICIT_WINDOW";
  window_end_date_or_null?: string | null;
  window_start_date_or_null?: string | null;
};

export type AdjustmentBindingErrorCode =
  | "ADJUSTMENT_BINDING_QUARTERLY_PROFILE_INVALID"
  | "ADJUSTMENT_BINDING_WINDOW_INVALID";

export class AdjustmentBindingError extends Error {
  readonly code: AdjustmentBindingErrorCode;

  constructor(code: AdjustmentBindingErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AdjustmentBindingError";
    this.code = code;
  }
}

function normalizeDateOrNull(label: string, value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AdjustmentBindingError("ADJUSTMENT_BINDING_WINDOW_INVALID", `${label} must be YYYY-MM-DD`);
  }
  return value;
}

export function buildAdjustmentBinding(input: BuildAdjustmentBindingInput): CandidateAdjustmentBindingRecord {
  const scopes = normalizeCollectionStringSet(
    "candidate_fact.adjustment_binding.applicable_reporting_scopes",
    input.applicable_reporting_scopes ?? ["year_end"],
    { minItems: 1 },
  ) as CandidateAdjustmentBindingRecord["applicable_reporting_scopes"];
  const timeWindowBasis = input.time_window_basis ?? "FULL_TAX_YEAR";
  const windowStart = normalizeDateOrNull(
    "candidate_fact.adjustment_binding.window_start_date_or_null",
    input.window_start_date_or_null,
  );
  const windowEnd = normalizeDateOrNull(
    "candidate_fact.adjustment_binding.window_end_date_or_null",
    input.window_end_date_or_null,
  );
  if (timeWindowBasis === "EXPLICIT_WINDOW" && (windowStart === null || windowEnd === null)) {
    throw new AdjustmentBindingError(
      "ADJUSTMENT_BINDING_WINDOW_INVALID",
      "EXPLICIT_WINDOW adjustment binding requires start and end dates",
    );
  }
  if (timeWindowBasis !== "EXPLICIT_WINDOW" && (windowStart !== null || windowEnd !== null)) {
    throw new AdjustmentBindingError(
      "ADJUSTMENT_BINDING_WINDOW_INVALID",
      "non-explicit adjustment windows must not carry start or end dates",
    );
  }

  const includesQuarterly = scopes.includes("quarterly_update");
  const quarterlyBasisProfile =
    input.quarterly_basis_profile ?? (includesQuarterly ? "PERIODIC" : "NOT_APPLICABLE");
  if (!includesQuarterly && quarterlyBasisProfile !== "NOT_APPLICABLE") {
    throw new AdjustmentBindingError(
      "ADJUSTMENT_BINDING_QUARTERLY_PROFILE_INVALID",
      "quarterly_basis_profile must be NOT_APPLICABLE without quarterly_update scope",
    );
  }
  if (includesQuarterly && quarterlyBasisProfile === "NOT_APPLICABLE") {
    throw new AdjustmentBindingError(
      "ADJUSTMENT_BINDING_QUARTERLY_PROFILE_INVALID",
      "quarterly_update scope requires PERIODIC or CUMULATIVE quarterly basis",
    );
  }

  return {
    analysis_mode_treatment:
      input.execution_mode === "COMPLIANCE" ? "MATCH_COMPLIANCE_BASIS" : "COUNTERFACTUAL_ONLY",
    applicable_reporting_scopes: scopes,
    partition_application: "EXACT_PARTITION_ONLY",
    quarterly_basis_profile: quarterlyBasisProfile,
    time_window_basis: timeWindowBasis,
    window_end_date_or_null: windowEnd,
    window_start_date_or_null: windowStart,
  };
}
