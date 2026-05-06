import type { ComputeResultRecord } from "../models/compute_result.ts";

export type ForecastExecutionBoundary = {
  counterfactual_basis: string;
  non_compliance_config_refs: string[];
};

export class ForecastExecutionBoundaryError extends Error {
  readonly code:
    | "FORECAST_COMPLIANCE_MODE_REJECTED"
    | "FORECAST_COUNTERFACTUAL_BASIS_REQUIRED"
    | "FORECAST_COMPUTE_BASIS_INVALID";

  constructor(code: ForecastExecutionBoundaryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ForecastExecutionBoundaryError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ForecastExecutionBoundaryError(
      "FORECAST_COUNTERFACTUAL_BASIS_REQUIRED",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

export function enforceForecastExecutionBoundary(input: {
  baseline_compute_result: ComputeResultRecord;
  counterfactual_basis?: string | null;
  execution_mode: "COMPLIANCE" | "ANALYSIS";
  non_compliance_config_refs?: readonly string[];
}): ForecastExecutionBoundary {
  if (input.execution_mode !== "ANALYSIS") {
    throw new ForecastExecutionBoundaryError(
      "FORECAST_COMPLIANCE_MODE_REJECTED",
      "forecast generation is analysis-only and cannot emit compliance artifacts",
    );
  }
  if (
    input.baseline_compute_result.lifecycle_state !== "COMPUTED" &&
    input.baseline_compute_result.lifecycle_state !== "SUPERSEDED"
  ) {
    throw new ForecastExecutionBoundaryError(
      "FORECAST_COMPUTE_BASIS_INVALID",
      "forecast baseline compute result must be a completed frozen compute artifact",
    );
  }

  const counterfactualBasis =
    input.counterfactual_basis ?? input.baseline_compute_result.counterfactual_basis;
  return {
    counterfactual_basis: requireString("forecast.counterfactual_basis", counterfactualBasis),
    non_compliance_config_refs: [
      ...new Set([
        ...input.baseline_compute_result.non_compliance_config_refs,
        ...(input.non_compliance_config_refs ?? []),
      ]),
    ].sort(),
  };
}
