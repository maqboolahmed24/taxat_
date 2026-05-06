import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ForecastSetRepository,
  computeOutcome,
  forecastSetRef,
  generateForecastSet,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
  type ForecastProfile,
} from "../../../packages/backend-compute/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(repoRoot, "db", "migrations", "phase03_0122_forecast_set.sql");

const moneyProfile: ComputeMoneyProfile = {
  aggregation_boundary: "DECLARED_AGGREGATION_BOUNDARY_ONLY",
  currency_code: "GBP",
  rounding_mode: "HALF_UP",
  scale: 2,
  serialization_profile: "CANONICAL_DECIMAL_STRING_V1",
};

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json, validate_forecast_set  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
issues.extend(str(issue) for issue in validate_forecast_set(payload, schema_name))
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

function fact(): ComputeFactContribution {
  return {
    business_partition: "partition://self-employment/main",
    canonical_fact_id: "canonical-fact-forecast",
    canonical_fact_ref: "canonical-fact://canonical-fact-forecast",
    category: "turnover",
    effective_date: "2026-04-01",
    fact_family: "RECORD_FACT",
    lineage_refs: [
      "input-freeze://manifest-0122-integration",
      "snapshot://snapshot-0122-integration",
      "canonical-fact-set://manifest-0122-integration",
    ],
    manifest_id: "manifest-0122-integration",
    partition_scope_refs: ["partition://self-employment/main"],
    promotion_state: "CANONICAL",
    signed_amount: "120.00",
  };
}

const forecastProfile: ForecastProfile = {
  categories: [
    {
      annualized_growth_rate: 0.12,
      baseline_steps: 4,
      category_code: "turnover",
      forecast_floor: "0.00",
      horizons: [
        { horizon_code: "h01", horizon_years: 1 / 12, seasonality_index: 1 },
        { horizon_code: "h02", horizon_years: 2 / 12, seasonality_index: 1.25 },
      ],
      residual_scale: "2.50",
    },
  ],
  deterministic_seed: "deterministic-seed://manifest-0122-integration",
  forecast_profile_ref: "forecast-profile://integration/0122",
  scenario_count: 2,
  scenario_mode: "MONTE_CARLO",
};

test("migration defines forecast register, indexes, and analysis-only constraints", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.forecast_set_register");
  expect(sql).toContain("execution_mode text NOT NULL DEFAULT 'ANALYSIS'");
  expect(sql).toContain("analysis_only boolean NOT NULL DEFAULT true");
  expect(sql).toContain("forecast_set_baseline_compute_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("forecast persistence validates schema and never mutates baseline compute truth", async () => {
  const compute = await computeOutcome({
    basis_artifact_refs: [
      "input-freeze://manifest-0122-integration",
      "snapshot://snapshot-0122-integration",
      "canonical-fact-set://manifest-0122-integration",
    ],
    canonical_facts: [fact()],
    computed_at: "2026-04-28T12:00:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0122-integration",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0122",
    runtime_scope: ["year_end"],
    schema_bundle_hash: "schema-bundle-hash://compute/0122",
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  const before = structuredClone(compute.compute_result);
  const repository = new ForecastSetRepository();
  const forecast = await generateForecastSet({
    baseline_compute_result: compute.compute_result,
    counterfactual_basis: "counterfactual://forecast/integration",
    created_at: "2026-04-28T12:05:00Z",
    execution_mode: "ANALYSIS",
    forecast_profile: forecastProfile,
    persisted_at: "2026-04-28T12:05:01Z",
    repository,
    schema_bundle_hash: "schema-bundle-hash://compute/0122",
  });

  expect(compute.compute_result).toEqual(before);
  await validatePayloadAgainstSchema("forecast_set.schema.json", forecast.forecast_set);
  expect(forecast.forecast_set.execution_mode).toBe("ANALYSIS");
  expect(forecast.forecast_set.analysis_only).toBe(true);
  expect(forecast.forecast_set.scenarios).toHaveLength(2);
  await expect(
    repository.getForecastSetByRef(forecastSetRef(forecast.forecast_set)),
  ).resolves.toMatchObject({
    forecast_id: forecast.forecast_set.forecast_id,
    forecast_set_row_version: 1,
  });
  await expect(
    repository.listForecastSetsByBaselineComputeRef(forecast.forecast_set.baseline_compute_ref),
  ).resolves.toHaveLength(1);
});
