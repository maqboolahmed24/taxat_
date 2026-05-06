import { expect, test } from "@playwright/test";

import {
  computeOutcome,
  deriveForecastSeed,
  enforceForecastExecutionBoundary,
  generateForecastSet,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
  type ForecastProfile,
} from "../../../packages/backend-compute/src/index.ts";

const moneyProfile: ComputeMoneyProfile = {
  aggregation_boundary: "DECLARED_AGGREGATION_BOUNDARY_ONLY",
  currency_code: "GBP",
  rounding_mode: "HALF_UP",
  scale: 2,
  serialization_profile: "CANONICAL_DECIMAL_STRING_V1",
};

function fact(input: {
  amount: string;
  category: string;
  fact_id: string;
}): ComputeFactContribution {
  return {
    business_partition: "partition://self-employment/main",
    canonical_fact_id: input.fact_id,
    canonical_fact_ref: `canonical-fact://${input.fact_id}`,
    category: input.category,
    effective_date: "2026-04-01",
    fact_family: "RECORD_FACT",
    manifest_id: "manifest-0122-unit",
    partition_scope_refs: ["partition://self-employment/main"],
    promotion_state: "CANONICAL",
    signed_amount: input.amount,
  };
}

async function baselineCompute() {
  const result = await computeOutcome({
    canonical_facts: [
      fact({ amount: "120.00", category: "turnover", fact_id: "fact-turnover" }),
      fact({ amount: "30.00", category: "expenses", fact_id: "fact-expenses" }),
    ],
    computed_at: "2026-04-28T11:00:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0122-unit",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0122",
    runtime_scope: ["year_end"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  return result.compute_result;
}

const pointProfile: ForecastProfile = {
  categories: [
    {
      annualized_growth_rate: 0,
      baseline_steps: 4,
      category_code: "turnover",
      forecast_floor: "0.00",
      horizons: [
        { horizon_code: "h01", horizon_years: 1 / 12, seasonality_index: 1 },
        { horizon_code: "h02", horizon_years: 2 / 12, seasonality_index: 1 },
      ],
      residual_scale: "0.00",
    },
    {
      annualized_growth_rate: 0,
      baseline_steps: 0,
      category_code: "expenses",
      horizons: [{ horizon_code: "h01", horizon_years: 1 / 12, seasonality_index: 1 }],
    },
  ],
  deterministic_seed: "deterministic-seed://manifest-0122",
  forecast_profile_ref: "forecast-profile://point",
  scenario_mode: "POINT_ONLY",
};

test("point-only forecast omits zero-step categories and keeps scenarios empty", async () => {
  const compute = await baselineCompute();
  const result = await generateForecastSet({
    baseline_compute_result: compute,
    counterfactual_basis: "counterfactual://forecast/point",
    created_at: "2026-04-28T11:05:00Z",
    execution_mode: "ANALYSIS",
    forecast_profile: pointProfile,
  });

  expect(result.forecast_set.execution_mode).toBe("ANALYSIS");
  expect(result.forecast_set.analysis_only).toBe(true);
  expect(result.forecast_set.point_forecasts).toEqual([
    {
      annualized_growth_rate: 0,
      baseline_steps: 4,
      category_code: "turnover",
      horizon_code: "h01",
      normalized_seasonality: 1,
      point_value: "30.00",
    },
    {
      annualized_growth_rate: 0,
      baseline_steps: 4,
      category_code: "turnover",
      horizon_code: "h02",
      normalized_seasonality: 1,
      point_value: "30.00",
    },
  ]);
  expect(result.forecast_set.scenarios).toEqual([]);
  expect(result.forecast_set.seeds).toEqual([]);
});

test("monte carlo scenario generation has stable seeds, ordering, floors, and caps", async () => {
  const compute = await baselineCompute();
  const profile: ForecastProfile = {
    categories: [
      {
        annualized_growth_rate: 0,
        baseline_steps: 4,
        category_code: "turnover",
        forecast_cap: "31.00",
        forecast_floor: "29.00",
        horizons: [{ horizon_code: "h01", horizon_years: 1 / 12, seasonality_index: 1 }],
        residual_scale: "5.00",
      },
    ],
    deterministic_seed: "deterministic-seed://manifest-0122",
    forecast_profile_ref: "forecast-profile://monte-carlo",
    scenario_count: 3,
    scenario_mode: "MONTE_CARLO",
  };
  const first = await generateForecastSet({
    baseline_compute_result: compute,
    counterfactual_basis: "counterfactual://forecast/mc",
    created_at: "2026-04-28T11:06:00Z",
    execution_mode: "ANALYSIS",
    forecast_profile: profile,
  });
  const second = await generateForecastSet({
    baseline_compute_result: compute,
    counterfactual_basis: "counterfactual://forecast/mc",
    created_at: "2026-04-28T11:06:00Z",
    execution_mode: "ANALYSIS",
    forecast_profile: profile,
  });

  expect(second.forecast_set).toEqual(first.forecast_set);
  expect(first.forecast_set.seeds.map((seed) => seed.scenario_id)).toEqual([
    "scenario-0001",
    "scenario-0002",
    "scenario-0003",
  ]);
  expect(first.forecast_set.scenarios).toHaveLength(3);
  for (const scenario of first.forecast_set.scenarios) {
    expect(scenario.values[0]!.simulated_value >= "29.00").toBe(true);
    expect(scenario.values[0]!.simulated_value <= "31.00").toBe(true);
  }
});

test("seed derivation is canonical for identical frozen profile and scenario id", () => {
  expect(
    deriveForecastSeed({
      deterministic_seed: "seed://one",
      forecast_profile: pointProfile,
      scenario_id: "scenario-0001",
    }),
  ).toBe(
    deriveForecastSeed({
      deterministic_seed: "seed://one",
      forecast_profile: { ...pointProfile, categories: [...pointProfile.categories] },
      scenario_id: "scenario-0001",
    }),
  );
});

test("compliance forecast requests fail closed before artifact emission", async () => {
  const compute = await baselineCompute();
  expect(() =>
    enforceForecastExecutionBoundary({
      baseline_compute_result: compute,
      counterfactual_basis: "counterfactual://forecast/rejected",
      execution_mode: "COMPLIANCE",
    }),
  ).toThrow("FORECAST_COMPLIANCE_MODE_REJECTED");
  await expect(
    generateForecastSet({
      baseline_compute_result: compute,
      counterfactual_basis: "counterfactual://forecast/rejected",
      created_at: "2026-04-28T11:07:00Z",
      execution_mode: "COMPLIANCE",
      forecast_profile: pointProfile,
    }),
  ).rejects.toThrow("FORECAST_COMPLIANCE_MODE_REJECTED");
});

test("invalid seasonality and all-zero baseline steps fail closed", async () => {
  const compute = await baselineCompute();
  await expect(
    generateForecastSet({
      baseline_compute_result: compute,
      counterfactual_basis: "counterfactual://forecast/invalid",
      created_at: "2026-04-28T11:08:00Z",
      execution_mode: "ANALYSIS",
      forecast_profile: {
        ...pointProfile,
        categories: [
          {
            annualized_growth_rate: 0,
            baseline_steps: 4,
            category_code: "turnover",
            horizons: [{ horizon_code: "h01", horizon_years: 1 / 12, seasonality_index: 0 }],
          },
        ],
      },
    }),
  ).rejects.toThrow("FORECAST_SEASONALITY_INVALID");

  await expect(
    generateForecastSet({
      baseline_compute_result: compute,
      counterfactual_basis: "counterfactual://forecast/empty",
      created_at: "2026-04-28T11:09:00Z",
      execution_mode: "ANALYSIS",
      forecast_profile: {
        ...pointProfile,
        categories: [{ ...pointProfile.categories[0]!, baseline_steps: 0 }],
      },
    }),
  ).rejects.toThrow("FORECAST_EMPTY_BASELINE");
});
