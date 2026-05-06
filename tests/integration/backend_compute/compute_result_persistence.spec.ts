import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ComputeResultRepository,
  computeOutcome,
  computeResultRef,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
} from "../../../packages/backend-compute/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(repoRoot, "db", "migrations", "phase03_0121_compute_result.sql");

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
from validate_contracts import Draft202012Validator, build_registry, load_json, validate_compute_result  # type: ignore

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
issues.extend(str(issue) for issue in validate_compute_result(payload, schema_name))
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

function fact(input: {
  amount: string;
  canonical_fact_id: string;
  category: string;
  date: string;
  partition: string;
}): ComputeFactContribution {
  return {
    business_partition: input.partition,
    canonical_fact_id: input.canonical_fact_id,
    canonical_fact_ref: `canonical-fact://${input.canonical_fact_id}`,
    category: input.category,
    effective_date: input.date,
    fact_family: "RECORD_FACT",
    lineage_refs: [
      "input-freeze://manifest-0121-integration",
      "snapshot://snapshot-0121-integration",
      "canonical-fact-set://manifest-0121-integration",
    ],
    manifest_id: "manifest-0121-integration",
    partition_scope_refs: [input.partition],
    promotion_state: "CANONICAL",
    signed_amount: input.amount,
  };
}

test("migration defines compute result register, transition log, indexes, and RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS control_compute");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.compute_result_register");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.compute_result_transition_log");
  expect(sql).toContain("money_profile jsonb NOT NULL");
  expect(sql).toContain("quarterly_basis_profile_or_null");
  expect(sql).toContain("compute_result_reporting_scope_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("repository persists and reloads schema-valid compute results from frozen basis refs", async () => {
  const repository = new ComputeResultRepository();
  const result = await computeOutcome({
    basis_artifact_refs: [
      "input-freeze://manifest-0121-integration",
      "snapshot://snapshot-0121-integration",
      "canonical-fact-set://manifest-0121-integration",
    ],
    canonical_facts: [
      fact({
        amount: "100.005",
        canonical_fact_id: "canonical-fact-1",
        category: "turnover",
        date: "2026-04-01",
        partition: "partition://self-employment/main",
      }),
      fact({
        amount: "50.005",
        canonical_fact_id: "canonical-fact-2",
        category: "turnover",
        date: "2026-04-02",
        partition: "partition://self-employment/main",
      }),
      fact({
        amount: "12.00",
        canonical_fact_id: "canonical-fact-3",
        category: "turnover",
        date: "2026-04-02",
        partition: "partition://property/main",
      }),
    ],
    computed_at: "2026-04-28T10:00:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0121-integration",
    money_profile: moneyProfile,
    persisted_at: "2026-04-28T10:00:01Z",
    repository,
    required_slices: [
      {
        business_partition: "partition://self-employment/main",
        category: "expenses",
      },
    ],
    rule_version_ref: "rule-version://compute/0121",
    runtime_scope: ["year_end", "prepare_submission"],
    schema_bundle_hash: "schema-bundle-hash://compute/0121",
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });

  expect(result.stored_compute_result).not.toBeNull();
  await validatePayloadAgainstSchema("compute_result.schema.json", result.compute_result);
  expect(result.compute_result.totals.reportable_totals).toEqual({
    "business_partition=partition://property/main|category=turnover": "12.00",
    "business_partition=partition://self-employment/main|category=expenses": "0.00",
    "business_partition=partition://self-employment/main|category=turnover": "150.01",
  });

  await expect(
    repository.getComputeResultByRef(computeResultRef(result.compute_result)),
  ).resolves.toMatchObject({
    compute_id: result.compute_result.compute_id,
    compute_result_row_version: 1,
  });
  await expect(
    repository.listComputeResultsByReportingScope({
      manifest_id: "manifest-0121-integration",
      reporting_scope: "year_end",
    }),
  ).resolves.toHaveLength(1);

  await expect(
    repository.persistComputeResult({
      compute_result: result.compute_result,
      persisted_at: "2026-04-28T10:00:02Z",
    }),
  ).resolves.toMatchObject({ compute_result_row_version: 1 });

  await expect(
    repository.persistComputeResult({
      compute_result: {
        ...result.compute_result,
        rule_version_ref: "rule-version://compute/different",
      },
      persisted_at: "2026-04-28T10:00:03Z",
    }),
  ).rejects.toThrow("COMPUTE_RESULT_DUPLICATE");
});
