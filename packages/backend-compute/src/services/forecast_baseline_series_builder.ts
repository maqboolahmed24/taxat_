import type { ComputeResultRecord } from "../models/compute_result.ts";
import type { ForecastScenarioMode } from "../models/forecast_set.ts";
import { sumMoney, zeroMoney, type ComputeMoneyProfile, type ComputeMoneyValue } from "./exact_decimal.ts";

export type ForecastHorizonProfile = {
  horizon_code: string;
  horizon_years: number;
  seasonality_index: number;
};

export type ForecastCategoryProfile = {
  annualized_growth_rate: number;
  baseline_steps: number;
  category_code: string;
  forecast_cap?: ComputeMoneyValue | null;
  forecast_floor?: ComputeMoneyValue | null;
  horizons: readonly ForecastHorizonProfile[];
  residual_scale?: ComputeMoneyValue | null;
};

export type ForecastProfile = {
  categories: readonly ForecastCategoryProfile[];
  deterministic_seed: string;
  forecast_profile_ref: string;
  scenario_count?: number;
  scenario_mode: ForecastScenarioMode;
};

export type ForecastBaselineSeries = {
  baseline_steps: number;
  baseline_total: ComputeMoneyValue;
  category: ForecastCategoryProfile;
};

export class ForecastBaselineSeriesError extends Error {
  readonly code:
    | "FORECAST_BASELINE_TOTALS_MISSING"
    | "FORECAST_PROFILE_INVALID"
    | "FORECAST_SEASONALITY_INVALID";

  constructor(code: ForecastBaselineSeriesError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ForecastBaselineSeriesError";
    this.code = code;
  }
}

function parseCategoryFromComputeTotalKey(key: string) {
  const marker = "|category=";
  const index = key.lastIndexOf(marker);
  if (index >= 0) {
    return key.slice(index + marker.length);
  }
  return key;
}

function reportableTotals(computeResult: ComputeResultRecord): Record<string, ComputeMoneyValue> {
  const totals = computeResult.totals.reportable_totals;
  if (totals !== null && typeof totals === "object" && !Array.isArray(totals)) {
    return totals as Record<string, ComputeMoneyValue>;
  }
  const flat: Record<string, ComputeMoneyValue> = {};
  for (const [key, value] of Object.entries(computeResult.totals)) {
    if (typeof value === "string") {
      flat[key] = value;
    }
  }
  if (Object.keys(flat).length === 0) {
    throw new ForecastBaselineSeriesError(
      "FORECAST_BASELINE_TOTALS_MISSING",
      "baseline ComputeResult must expose reportable money totals",
    );
  }
  return flat;
}

function validateCategoryProfile(category: ForecastCategoryProfile) {
  if (!Number.isInteger(category.baseline_steps) || category.baseline_steps < 0) {
    throw new ForecastBaselineSeriesError(
      "FORECAST_PROFILE_INVALID",
      "forecast category baseline_steps must be a non-negative integer",
    );
  }
  if (!Number.isFinite(category.annualized_growth_rate)) {
    throw new ForecastBaselineSeriesError(
      "FORECAST_PROFILE_INVALID",
      "forecast category annualized_growth_rate must be finite",
    );
  }
  if (category.horizons.length === 0) {
    throw new ForecastBaselineSeriesError(
      "FORECAST_PROFILE_INVALID",
      "forecast category must define at least one horizon",
    );
  }
  const seasonalityMean =
    category.horizons.reduce((total, horizon) => {
      if (
        !Number.isFinite(horizon.seasonality_index) ||
        horizon.seasonality_index <= 0 ||
        !Number.isFinite(horizon.horizon_years)
      ) {
        throw new ForecastBaselineSeriesError(
          "FORECAST_SEASONALITY_INVALID",
          "forecast seasonality indices must be positive finite numbers",
        );
      }
      return total + horizon.seasonality_index;
    }, 0) / category.horizons.length;
  if (!Number.isFinite(seasonalityMean) || seasonalityMean <= 0) {
    throw new ForecastBaselineSeriesError(
      "FORECAST_SEASONALITY_INVALID",
      "forecast seasonality mean must be positive",
    );
  }
}

export function normalizedSeasonality(input: {
  category: ForecastCategoryProfile;
  horizon: ForecastHorizonProfile;
}) {
  validateCategoryProfile(input.category);
  const mean =
    input.category.horizons.reduce((total, horizon) => total + horizon.seasonality_index, 0) /
    input.category.horizons.length;
  return input.horizon.seasonality_index / mean;
}

export function buildForecastBaselineSeries(input: {
  baseline_compute_result: ComputeResultRecord;
  forecast_profile: ForecastProfile;
  money_profile?: ComputeMoneyProfile;
}) {
  const totalsByCategory = new Map<string, ComputeMoneyValue[]>();
  const moneyProfile = input.money_profile ?? input.baseline_compute_result.money_profile;
  for (const [key, value] of Object.entries(reportableTotals(input.baseline_compute_result))) {
    const category = parseCategoryFromComputeTotalKey(key);
    const values = totalsByCategory.get(category) ?? [];
    values.push(value);
    totalsByCategory.set(category, values);
  }

  return [...input.forecast_profile.categories]
    .sort((left, right) => left.category_code.localeCompare(right.category_code))
    .map((category): ForecastBaselineSeries => {
      validateCategoryProfile(category);
      const values = totalsByCategory.get(category.category_code) ?? [];
      return {
        baseline_steps: category.baseline_steps,
        baseline_total:
          values.length === 0
            ? zeroMoney(moneyProfile)
            : sumMoney({ money_profile: moneyProfile, values }),
        category: {
          ...category,
          horizons: [...category.horizons].sort((left, right) =>
            left.horizon_code.localeCompare(right.horizon_code),
          ),
        },
      };
    });
}
