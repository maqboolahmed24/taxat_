import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { ForecastSetSchemaLineage } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  canonicalMoneyString,
  normalizeMoneyProfile,
  type ComputeMoneyProfile,
  type ComputeMoneyValue,
} from "../services/exact_decimal.ts";

export type ForecastScenarioMode = "POINT_ONLY" | "MONTE_CARLO";

export type ForecastPointRecord = {
  annualized_growth_rate: number;
  baseline_steps: number;
  category_code: string;
  horizon_code: string;
  normalized_seasonality: number;
  point_value: ComputeMoneyValue;
};

export type ForecastScenarioValueRecord = {
  category_code: string;
  horizon_code: string;
  simulated_value: ComputeMoneyValue;
};

export type ForecastScenarioRecord = {
  scenario_id: string;
  seed_ref: string;
  values: ForecastScenarioValueRecord[];
};

export type ForecastScenarioSeedRecord = {
  scenario_id: string;
  seed: string;
};

export type ForecastSetRecord = {
  analysis_only: true;
  artifact_type: "ForecastSet";
  baseline_compute_ref: string;
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string;
  created_at: string;
  execution_mode: "ANALYSIS";
  forecast_id: string;
  forecast_profile_ref: string;
  manifest_id: string;
  money_profile: ComputeMoneyProfile;
  non_compliance_config_refs: string[];
  point_forecasts: ForecastPointRecord[];
  scenario_mode: ForecastScenarioMode;
  scenarios: ForecastScenarioRecord[];
  seeds: ForecastScenarioSeedRecord[];
};

export type ForecastSetContractBuildInput = {
  forecast_content_hash: string;
  forecast_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
};

export class ForecastSetModelError extends Error {
  readonly code:
    | "FORECAST_SET_ARTIFACT_TYPE_INVALID"
    | "FORECAST_SET_BOUNDARY_INVALID"
    | "FORECAST_SET_CONTRACT_INVALID"
    | "FORECAST_SET_FIELD_REQUIRED"
    | "FORECAST_SET_SCENARIO_MODE_INVALID";

  constructor(code: ForecastSetModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ForecastSetModelError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ForecastSetModelError(
      "FORECAST_SET_FIELD_REQUIRED",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

function normalizeStringSet(label: string, values: readonly string[]) {
  return [...new Set(values.map((value) => requireString(label, value)))].sort();
}

function normalizeScenarioMode(value: unknown): ForecastScenarioMode {
  const normalized = requireString("forecast_set.scenario_mode", value);
  if (normalized !== "POINT_ONLY" && normalized !== "MONTE_CARLO") {
    throw new ForecastSetModelError(
      "FORECAST_SET_SCENARIO_MODE_INVALID",
      "scenario_mode must be POINT_ONLY or MONTE_CARLO",
    );
  }
  return normalized;
}

function normalizePointForecasts(
  forecasts: readonly ForecastPointRecord[],
  moneyProfile: ComputeMoneyProfile,
) {
  if (forecasts.length === 0) {
    throw new ForecastSetModelError(
      "FORECAST_SET_FIELD_REQUIRED",
      "ForecastSet requires at least one point forecast",
    );
  }
  return forecasts
    .map((forecast) => ({
      annualized_growth_rate: forecast.annualized_growth_rate,
      baseline_steps: forecast.baseline_steps,
      category_code: requireString("forecast_set.point.category_code", forecast.category_code),
      horizon_code: requireString("forecast_set.point.horizon_code", forecast.horizon_code),
      normalized_seasonality: forecast.normalized_seasonality,
      point_value: canonicalMoneyString({
        money_profile: moneyProfile,
        value: forecast.point_value,
      }),
    }))
    .sort(
      (left, right) =>
        left.horizon_code.localeCompare(right.horizon_code) ||
        left.category_code.localeCompare(right.category_code),
    );
}

function normalizeScenarios(
  scenarios: readonly ForecastScenarioRecord[],
  moneyProfile: ComputeMoneyProfile,
) {
  return scenarios
    .map((scenario) => ({
      scenario_id: requireString("forecast_set.scenario_id", scenario.scenario_id),
      seed_ref: requireString("forecast_set.seed_ref", scenario.seed_ref),
      values: scenario.values
        .map((value) => ({
          category_code: requireString(
            "forecast_set.scenario_value.category_code",
            value.category_code,
          ),
          horizon_code: requireString(
            "forecast_set.scenario_value.horizon_code",
            value.horizon_code,
          ),
          simulated_value: canonicalMoneyString({
            money_profile: moneyProfile,
            value: value.simulated_value,
          }),
        }))
        .sort(
          (left, right) =>
            left.horizon_code.localeCompare(right.horizon_code) ||
            left.category_code.localeCompare(right.category_code),
        ),
    }))
    .sort((left, right) => left.scenario_id.localeCompare(right.scenario_id));
}

function normalizeSeeds(seeds: readonly ForecastScenarioSeedRecord[]) {
  return seeds
    .map((seed) => ({
      scenario_id: requireString("forecast_set.seed.scenario_id", seed.scenario_id),
      seed: requireString("forecast_set.seed", seed.seed),
    }))
    .sort((left, right) => left.scenario_id.localeCompare(right.scenario_id));
}

export function forecastSetRef(record: Pick<ForecastSetRecord, "forecast_id">) {
  return `forecast-set://${record.forecast_id}`;
}

export function deriveForecastSetContentHash(record: Omit<ForecastSetRecord, "contract">) {
  return `forecast-set-content-hash://${stableJsonHash({
    artifact_family: "FORECAST_SET_CONTENT",
    payload: record,
  })}`;
}

export function buildForecastSetContract(
  input: ForecastSetContractBuildInput,
): SchemaBundleArtifactContract {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_content_hash: requireString(
      "forecast_set.contract.artifact_content_hash",
      input.forecast_content_hash,
    ),
    artifact_id: forecastSetRef({ forecast_id: input.forecast_id }),
    artifact_type: "ForecastSet",
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: ForecastSetSchemaLineage.sourceHash,
    dialect_ref: "json-schema-draft-2020-12",
    schema_bundle_hash: requireString(
      "forecast_set.contract.schema_bundle_hash",
      input.schema_bundle_hash ?? "schema.bundle.hash.compute.default",
    ),
    schema_id: ForecastSetSchemaLineage.schemaId,
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_build_id: requireString(
      "forecast_set.contract.writer_build_id",
      input.writer_build_id ?? "build.taxat.compute.0122",
    ),
    writer_min_reader_version: "1.0.0",
  };
}

export function normalizeForecastSetRecord(input: ForecastSetRecord): ForecastSetRecord {
  if (input.artifact_type !== "ForecastSet") {
    throw new ForecastSetModelError(
      "FORECAST_SET_ARTIFACT_TYPE_INVALID",
      "artifact_type must be ForecastSet",
    );
  }
  if (input.execution_mode !== "ANALYSIS" || input.analysis_only !== true) {
    throw new ForecastSetModelError(
      "FORECAST_SET_BOUNDARY_INVALID",
      "ForecastSet is analysis-only",
    );
  }
  const moneyProfile = normalizeMoneyProfile(input.money_profile);
  const scenarioMode = normalizeScenarioMode(input.scenario_mode);
  const scenarios = normalizeScenarios(input.scenarios, moneyProfile);
  const seeds = normalizeSeeds(input.seeds);
  if (scenarioMode === "POINT_ONLY" && (scenarios.length > 0 || seeds.length > 0)) {
    throw new ForecastSetModelError(
      "FORECAST_SET_SCENARIO_MODE_INVALID",
      "POINT_ONLY forecasts must not carry scenarios or seeds",
    );
  }
  if (scenarioMode === "MONTE_CARLO" && (scenarios.length === 0 || seeds.length === 0)) {
    throw new ForecastSetModelError(
      "FORECAST_SET_SCENARIO_MODE_INVALID",
      "MONTE_CARLO forecasts require scenarios and seeds",
    );
  }
  const normalized: ForecastSetRecord = {
    analysis_only: true,
    artifact_type: "ForecastSet",
    baseline_compute_ref: requireString(
      "forecast_set.baseline_compute_ref",
      input.baseline_compute_ref,
    ),
    contract: structuredClone(input.contract),
    counterfactual_basis: requireString(
      "forecast_set.counterfactual_basis",
      input.counterfactual_basis,
    ),
    created_at: normalizeUtcInstantString(input.created_at),
    execution_mode: "ANALYSIS",
    forecast_id: requireString("forecast_set.forecast_id", input.forecast_id),
    forecast_profile_ref: requireString(
      "forecast_set.forecast_profile_ref",
      input.forecast_profile_ref,
    ),
    manifest_id: requireString("forecast_set.manifest_id", input.manifest_id),
    money_profile: moneyProfile,
    non_compliance_config_refs: normalizeStringSet(
      "forecast_set.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    point_forecasts: normalizePointForecasts(input.point_forecasts, moneyProfile),
    scenario_mode: scenarioMode,
    scenarios,
    seeds,
  };
  if (
    normalized.contract.artifact_id !== forecastSetRef(normalized) ||
    normalized.contract.artifact_type !== "ForecastSet" ||
    normalized.contract.schema_id !== ForecastSetSchemaLineage.schemaId
  ) {
    throw new ForecastSetModelError(
      "FORECAST_SET_CONTRACT_INVALID",
      "contract must bind the ForecastSet artifact",
    );
  }
  return normalized;
}

export function withRefreshedForecastSetContract(input: {
  forecast_set: Omit<ForecastSetRecord, "contract">;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  const contentHash = deriveForecastSetContentHash(input.forecast_set);
  return normalizeForecastSetRecord({
    ...input.forecast_set,
    contract: buildForecastSetContract({
      forecast_content_hash: contentHash,
      forecast_id: input.forecast_set.forecast_id,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
  });
}

export function cloneForecastSetRecord(record: ForecastSetRecord) {
  return structuredClone(record);
}
