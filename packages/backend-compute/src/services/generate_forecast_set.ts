import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  computeResultRef,
  type ComputeResultRecord,
} from "../models/compute_result.ts";
import {
  withRefreshedForecastSetContract,
  type ForecastPointRecord,
  type ForecastSetRecord,
} from "../models/forecast_set.ts";
import type {
  ForecastSetRepository,
  StoredForecastSetRecord,
} from "../repositories/forecast_set_repository.ts";
import {
  canonicalMoneyString,
  divideMoneyByPositiveInteger,
  multiplyExactDecimalByFactor,
  normalizeMoneyProfile,
  type ComputeMoneyProfile,
} from "./exact_decimal.ts";
import { enforceForecastExecutionBoundary } from "./enforce_forecast_execution_boundary.ts";
import {
  buildForecastBaselineSeries,
  normalizedSeasonality,
  type ForecastProfile,
} from "./forecast_baseline_series_builder.ts";
import { generateForecastScenarios } from "./forecast_scenario_generator.ts";
import { canonicalForecastProfileHash } from "./forecast_seed_deriver.ts";

export type GenerateForecastSetInput = {
  baseline_compute_result: ComputeResultRecord;
  counterfactual_basis?: string | null;
  created_at: string;
  execution_mode: "COMPLIANCE" | "ANALYSIS";
  forecast_id?: string;
  forecast_profile: ForecastProfile;
  money_profile?: ComputeMoneyProfile;
  non_compliance_config_refs?: readonly string[];
  persisted_at?: string;
  repository?: ForecastSetRepository;
  schema_bundle_hash?: string;
  writer_build_id?: string;
};

export type GenerateForecastSetResult = {
  forecast_set: ForecastSetRecord;
  stored_forecast_set: StoredForecastSetRecord | null;
};

export class GenerateForecastSetError extends Error {
  readonly code: "FORECAST_EMPTY_BASELINE" | "FORECAST_PROFILE_INVALID";

  constructor(code: GenerateForecastSetError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GenerateForecastSetError";
    this.code = code;
  }
}

function deterministicForecastId(input: {
  baseline_compute_ref: string;
  forecast_profile: ForecastProfile;
  scenario_mode: string;
}) {
  return `forecast.${stableJsonHash({
    baseline_compute_ref: input.baseline_compute_ref,
    forecast_profile_hash: canonicalForecastProfileHash(input.forecast_profile),
    scenario_mode: input.scenario_mode,
  })}`;
}

function growthFactor(input: {
  annualized_growth_rate: number;
  horizon_years: number;
}) {
  if (
    !Number.isFinite(input.annualized_growth_rate) ||
    !Number.isFinite(input.horizon_years)
  ) {
    throw new GenerateForecastSetError(
      "FORECAST_PROFILE_INVALID",
      "growth rate and horizon years must be finite",
    );
  }
  return Math.exp(input.annualized_growth_rate * input.horizon_years);
}

function buildPointForecasts(input: {
  baseline_compute_result: ComputeResultRecord;
  forecast_profile: ForecastProfile;
  money_profile: ComputeMoneyProfile;
}) {
  const series = buildForecastBaselineSeries({
    baseline_compute_result: input.baseline_compute_result,
    forecast_profile: input.forecast_profile,
    money_profile: input.money_profile,
  });
  const points: ForecastPointRecord[] = [];
  for (const entry of series) {
    if (entry.baseline_steps === 0) {
      continue;
    }
    const baselineRunRate = divideMoneyByPositiveInteger({
      divisor: entry.baseline_steps,
      value: entry.baseline_total,
    });
    for (const horizon of entry.category.horizons) {
      const seasonality = normalizedSeasonality({
        category: entry.category,
        horizon,
      });
      const seasonalValue = multiplyExactDecimalByFactor({
        factor: seasonality,
        value: baselineRunRate,
      });
      const grownValue = multiplyExactDecimalByFactor({
        factor: growthFactor({
          annualized_growth_rate: entry.category.annualized_growth_rate,
          horizon_years: horizon.horizon_years,
        }),
        value: seasonalValue,
      });
      points.push({
        annualized_growth_rate: entry.category.annualized_growth_rate,
        baseline_steps: entry.baseline_steps,
        category_code: entry.category.category_code,
        horizon_code: horizon.horizon_code,
        normalized_seasonality: seasonality,
        point_value: canonicalMoneyString({
          money_profile: input.money_profile,
          value: grownValue,
        }),
      });
    }
  }
  if (points.length === 0) {
    throw new GenerateForecastSetError(
      "FORECAST_EMPTY_BASELINE",
      "forecast profile produced no point forecasts because all baseline_steps were zero",
    );
  }
  return points.sort(
    (left, right) =>
      left.horizon_code.localeCompare(right.horizon_code) ||
      left.category_code.localeCompare(right.category_code),
  );
}

export async function generateForecastSet(
  input: GenerateForecastSetInput,
): Promise<GenerateForecastSetResult> {
  const boundary = enforceForecastExecutionBoundary({
    baseline_compute_result: input.baseline_compute_result,
    execution_mode: input.execution_mode,
    ...(input.counterfactual_basis === undefined
      ? {}
      : { counterfactual_basis: input.counterfactual_basis }),
    ...(input.non_compliance_config_refs === undefined
      ? {}
      : { non_compliance_config_refs: input.non_compliance_config_refs }),
  });
  const moneyProfile = normalizeMoneyProfile(
    input.money_profile ?? input.baseline_compute_result.money_profile,
  );
  const baselineComputeRef = computeResultRef(input.baseline_compute_result);
  const pointForecasts = buildPointForecasts({
    baseline_compute_result: input.baseline_compute_result,
    forecast_profile: input.forecast_profile,
    money_profile: moneyProfile,
  });
  const scenarios = generateForecastScenarios({
    forecast_profile: input.forecast_profile,
    money_profile: moneyProfile,
    point_forecasts: pointForecasts,
  });
  const forecastId =
    input.forecast_id ??
    deterministicForecastId({
      baseline_compute_ref: baselineComputeRef,
      forecast_profile: input.forecast_profile,
      scenario_mode: input.forecast_profile.scenario_mode,
    });
  const forecastSet = withRefreshedForecastSetContract({
    forecast_set: {
      analysis_only: true,
      artifact_type: "ForecastSet",
      baseline_compute_ref: baselineComputeRef,
      counterfactual_basis: boundary.counterfactual_basis,
      created_at: normalizeUtcInstantString(input.created_at),
      execution_mode: "ANALYSIS",
      forecast_id: forecastId,
      forecast_profile_ref: input.forecast_profile.forecast_profile_ref,
      manifest_id: input.baseline_compute_result.manifest_id,
      money_profile: moneyProfile,
      non_compliance_config_refs: boundary.non_compliance_config_refs,
      point_forecasts: pointForecasts,
      scenario_mode: input.forecast_profile.scenario_mode,
      scenarios: scenarios.scenarios,
      seeds: scenarios.seeds,
    },
    ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  const stored = input.repository
    ? await input.repository.persistForecastSet({
        forecast_set: forecastSet,
        persisted_at: input.persisted_at ?? forecastSet.created_at,
      })
    : null;
  return { forecast_set: forecastSet, stored_forecast_set: stored };
}
