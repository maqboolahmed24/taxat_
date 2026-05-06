import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  canonicalDecimalFactor,
  compareMoneyValues,
  multiplyMoneyByFactor,
  sumMoney,
  type ComputeMoneyProfile,
  type ComputeMoneyValue,
} from "./exact_decimal.ts";
import {
  deriveForecastSeed,
  forecastSeedRef,
} from "./forecast_seed_deriver.ts";
import type {
  ForecastCategoryProfile,
  ForecastProfile,
} from "./forecast_baseline_series_builder.ts";
import type {
  ForecastPointRecord,
  ForecastScenarioRecord,
  ForecastScenarioSeedRecord,
} from "../models/forecast_set.ts";

export type ForecastScenarioGenerationResult = {
  scenarios: ForecastScenarioRecord[];
  seeds: ForecastScenarioSeedRecord[];
};

function scenarioId(index: number) {
  return `scenario-${String(index + 1).padStart(4, "0")}`;
}

function rawUnit(seed: string, point: ForecastPointRecord) {
  const hash = stableJsonHash({
    category_code: point.category_code,
    horizon_code: point.horizon_code,
    seed,
  });
  const numerator = Number.parseInt(hash.slice(0, 12), 16);
  return numerator / 0xffffffffffff;
}

function standardizedEpsilons(input: {
  points: readonly ForecastPointRecord[];
  seeds: readonly ForecastScenarioSeedRecord[];
}) {
  const byPoint = new Map<string, number[]>();
  for (const point of input.points) {
    const key = `${point.horizon_code}\u001e${point.category_code}`;
    byPoint.set(
      key,
      input.seeds.map((seed) => rawUnit(seed.seed, point) * 2 - 1),
    );
  }

  const result = new Map<string, number[]>();
  for (const [key, values] of byPoint) {
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    const variance =
      values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
    const scale = Math.sqrt(variance);
    result.set(
      key,
      scale === 0 ? values.map(() => 0) : values.map((value) => (value - mean) / scale),
    );
  }
  return result;
}

function categoryProfileFor(
  profiles: readonly ForecastCategoryProfile[],
  categoryCode: string,
) {
  return profiles.find((profile) => profile.category_code === categoryCode);
}

function clampMoney(input: {
  cap?: ComputeMoneyValue | null;
  floor?: ComputeMoneyValue | null;
  value: ComputeMoneyValue;
}) {
  if (input.floor !== undefined && input.floor !== null && compareMoneyValues(input.value, input.floor) < 0) {
    return input.floor;
  }
  if (input.cap !== undefined && input.cap !== null && compareMoneyValues(input.value, input.cap) > 0) {
    return input.cap;
  }
  return input.value;
}

export function generateForecastScenarios(input: {
  forecast_profile: ForecastProfile;
  money_profile: ComputeMoneyProfile;
  point_forecasts: readonly ForecastPointRecord[];
}) {
  if (input.forecast_profile.scenario_mode === "POINT_ONLY") {
    return { scenarios: [], seeds: [] } satisfies ForecastScenarioGenerationResult;
  }
  const scenarioCount = input.forecast_profile.scenario_count ?? 1;
  if (!Number.isInteger(scenarioCount) || scenarioCount < 1 || scenarioCount > 500) {
    throw new Error("MONTE_CARLO scenario_count must be between 1 and 500");
  }
  const seeds = Array.from({ length: scenarioCount }, (_, index) => {
    const id = scenarioId(index);
    return {
      scenario_id: id,
      seed: deriveForecastSeed({
        deterministic_seed: input.forecast_profile.deterministic_seed,
        forecast_profile: input.forecast_profile,
        scenario_id: id,
      }),
    };
  });
  const epsilons = standardizedEpsilons({
    points: input.point_forecasts,
    seeds,
  });
  const scenarios = seeds.map((seed, seedIndex) => ({
    scenario_id: seed.scenario_id,
    seed_ref: forecastSeedRef(seed.seed),
    values: input.point_forecasts.map((point) => {
      const categoryProfile = categoryProfileFor(input.forecast_profile.categories, point.category_code);
      const residualScale = categoryProfile?.residual_scale ?? "0.00";
      const epsilon =
        epsilons.get(`${point.horizon_code}\u001e${point.category_code}`)?.[seedIndex] ?? 0;
      const residual = multiplyMoneyByFactor({
        factor: Number(canonicalDecimalFactor(epsilon)),
        money_profile: input.money_profile,
        value: residualScale,
      });
      const simulated = sumMoney({
        money_profile: input.money_profile,
        values: [point.point_value, residual],
      });
      const clampInput = {
        ...(categoryProfile?.forecast_cap === undefined
          ? {}
          : { cap: categoryProfile.forecast_cap }),
        floor: categoryProfile?.forecast_floor ?? "0.00",
        value: simulated,
      };
      return {
        category_code: point.category_code,
        horizon_code: point.horizon_code,
        simulated_value: clampMoney(clampInput),
      };
    }),
  }));

  return { scenarios, seeds } satisfies ForecastScenarioGenerationResult;
}
