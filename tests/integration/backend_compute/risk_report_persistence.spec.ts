import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  RiskReportRepository,
  computeOutcome,
  riskReportRef,
  scoreRisk,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
  type RiskThresholdProfile,
} from "../../../packages/backend-compute/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(repoRoot, "db", "migrations", "phase03_0123_risk_report.sql");

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
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

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
    canonical_fact_id: "canonical-fact-risk",
    canonical_fact_ref: "canonical-fact://canonical-fact-risk",
    category: "turnover",
    effective_date: "2026-04-01",
    fact_family: "RECORD_FACT",
    lineage_refs: [
      "input-freeze://manifest-0123-integration",
      "snapshot://snapshot-0123-integration",
      "canonical-fact-set://manifest-0123-integration",
    ],
    manifest_id: "manifest-0123-integration",
    partition_scope_refs: ["partition://self-employment/main"],
    promotion_state: "CANONICAL",
    signed_amount: "120.00",
  };
}

const riskProfile: RiskThresholdProfile = {
  features: [
    {
      blocking_threshold: 0.9,
      feature_code: "authority_link_pressure",
      feature_weight: 1,
      material_threshold: 0.6,
    },
    {
      blocking_threshold: 0.8,
      feature_code: "snapshot_completeness_pressure",
      feature_weight: 3,
      material_threshold: 0.5,
    },
  ],
  risk_threshold_profile_ref: "risk-threshold-profile://integration/0123",
};

test("migration defines risk register, indexes, and execution-boundary constraints", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.risk_report_register");
  expect(sql).toContain("risk_report_execution_boundary_chk");
  expect(sql).toContain("RISK_WEIGHT_PROFILE_INVALID");
  expect(sql).toContain("risk_report_threshold_profile_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("risk persistence validates schema and exposes deterministic trust inputs", async () => {
  const compute = await computeOutcome({
    basis_artifact_refs: [
      "input-freeze://manifest-0123-integration",
      "snapshot://snapshot-0123-integration",
      "canonical-fact-set://manifest-0123-integration",
    ],
    canonical_facts: [fact()],
    computed_at: "2026-04-28T14:00:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0123-integration",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0123",
    runtime_scope: ["year_end"],
    schema_bundle_hash: "schema-bundle-hash://compute/0123",
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  const before = structuredClone(compute.compute_result);
  const repository = new RiskReportRepository();
  const risk = await scoreRisk({
    compute_result: compute.compute_result,
    created_at: "2026-04-28T14:05:00Z",
    execution_mode: "COMPLIANCE",
    feature_context: {
      frozen_feature_values: {
        authority_link_pressure: { feature_resolved: false, feature_value: 0.7 },
        snapshot_completeness_pressure: { feature_resolved: true, feature_value: 0.1 },
      },
      snapshot_ref: "snapshot://snapshot-0123-integration",
    },
    persisted_at: "2026-04-28T14:05:01Z",
    repository,
    risk_threshold_profile: riskProfile,
    schema_bundle_hash: "schema-bundle-hash://compute/0123",
  });

  expect(compute.compute_result).toEqual(before);
  await validatePayloadAgainstSchema("risk_report.schema.json", risk.risk_report);
  expect(risk.risk_report.risk_score).toBe(25);
  expect(risk.risk_report.unresolved_material_blocking_risk_flag).toBe(true);
  expect(risk.risk_report.unresolved_blocking_risk_flag).toBe(false);
  await expect(
    repository.getRiskReportByRef(riskReportRef(risk.risk_report)),
  ).resolves.toMatchObject({
    risk_id: risk.risk_report.risk_id,
    risk_report_row_version: 1,
  });
  await expect(
    repository.listRiskReportsByProfileRef(risk.risk_report.risk_threshold_profile_ref),
  ).resolves.toHaveLength(1);
});
