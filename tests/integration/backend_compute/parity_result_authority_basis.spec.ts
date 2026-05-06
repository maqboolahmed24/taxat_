import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  type CalculationBasisRecord,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
  computeOutcome,
  evaluateParity,
  ParityResultRepository,
  type ParityThresholdProfile,
  parityResultRef,
} from "../../../packages/backend-compute/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(repoRoot, "db", "migrations", "phase03_0124_parity_result.sql");

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
    canonical_fact_id: "canonical-fact-parity",
    canonical_fact_ref: "canonical-fact://canonical-fact-parity",
    category: "turnover",
    effective_date: "2026-04-01",
    fact_family: "RECORD_FACT",
    lineage_refs: [
      "input-freeze://manifest-0124-integration",
      "snapshot://snapshot-0124-integration",
      "canonical-fact-set://manifest-0124-integration",
    ],
    manifest_id: "manifest-0124-integration",
    partition_scope_refs: ["partition://self-employment/main"],
    promotion_state: "CANONICAL",
    signed_amount: "120.00",
  };
}

const calculationBasis: CalculationBasisRecord = {
  artifact_type: "CalculationBasis",
  basis_hash: "basis-hash://0124/integration",
  basis_payload_ref: "authority-payload://0124/integration",
  basis_status: "CONFIRMED",
  calculation_basis_id: "calc-basis-0124-integration",
  manifest_id: "manifest-0124-integration",
  parity_reusable: true,
};

const thresholdProfile: ParityThresholdProfile = {
  blocking_ratio_cap: 3,
  fields: [
    {
      abs_floor: "1.00",
      abs_threshold: "5.00",
      authority_value: "120.00",
      criticality_class: "CRITICAL",
      criticality_weight: 2,
      field_code: "turnover",
      internal_value: "120.00",
      rel_threshold: 0.05,
    },
    {
      abs_floor: "1.00",
      abs_threshold: "5.00",
      authority_value: "30.00",
      criticality_class: "NORMAL",
      criticality_weight: 1,
      field_code: "expenses",
      internal_value: "30.00",
      rel_threshold: 0.05,
    },
  ],
  minimum_rel_floor: "1.00",
  parity_threshold_profile_ref: "parity-threshold-profile://integration/0124",
};

test("migration defines parity register, indexes, lifecycle posture, and invalid-set constraints", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.parity_result_register");
  expect(sql).toContain("parity_result_execution_boundary_chk");
  expect(sql).toContain("parity_result_not_evaluated_posture_chk");
  expect(sql).toContain("parity_result_invalid_set_chk");
  expect(sql).toContain("parity_result_comparison_basis_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("parity persistence reuses confirmed CalculationBasis and validates the schema payload", async () => {
  const compute = await computeOutcome({
    basis_artifact_refs: [
      "input-freeze://manifest-0124-integration",
      "snapshot://snapshot-0124-integration",
      "canonical-fact-set://manifest-0124-integration",
    ],
    canonical_facts: [fact()],
    computed_at: "2026-04-28T16:00:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0124-integration",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0124",
    runtime_scope: ["year_end"],
    schema_bundle_hash: "schema-bundle-hash://compute/0124",
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  const before = structuredClone(compute.compute_result);
  const repository = new ParityResultRepository();
  const parity = await evaluateParity({
    calculation_basis: calculationBasis,
    compute_result: compute.compute_result,
    created_at: "2026-04-28T16:05:00Z",
    execution_mode: "COMPLIANCE",
    persisted_at: "2026-04-28T16:05:01Z",
    repository,
    schema_bundle_hash: "schema-bundle-hash://compute/0124",
    temporal_propagation_event_refs: ["temporal-propagation://0124/integration"],
    threshold_profile: thresholdProfile,
  });

  expect(compute.compute_result).toEqual(before);
  await validatePayloadAgainstSchema("parity_result.schema.json", parity.parity_result);
  expect(parity.parity_result.comparison_basis_ref).toBe(
    "calculation-basis://calc-basis-0124-integration",
  );
  expect(parity.parity_result.parity_classification).toBe("MATCH");
  expect(parity.parity_result.temporal_propagation_event_refs).toEqual([
    "temporal-propagation://0124/integration",
  ]);
  await expect(
    repository.getParityResultByRef(parityResultRef(parity.parity_result)),
  ).resolves.toMatchObject({
    parity_id: parity.parity_result.parity_id,
    parity_result_row_version: 1,
  });
  await expect(
    repository.listParityResultsByBasisRef(parity.parity_result.comparison_basis_ref ?? ""),
  ).resolves.toHaveLength(1);
  await expect(
    repository.listParityResultsByProfileRef(
      parity.parity_result.parity_threshold_profile_ref ?? "",
    ),
  ).resolves.toHaveLength(1);
});

test("missing required CalculationBasis still emits a schema-valid fail-closed parity result", async () => {
  const compute = await computeOutcome({
    basis_artifact_refs: ["input-freeze://manifest-0124-integration"],
    canonical_facts: [fact()],
    computed_at: "2026-04-28T16:10:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0124-integration",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0124",
    runtime_scope: ["year_end"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  const parity = await evaluateParity({
    calculation_basis: null,
    compute_result: compute.compute_result,
    created_at: "2026-04-28T16:15:00Z",
    execution_mode: "COMPLIANCE",
    threshold_profile: thresholdProfile,
  });

  await validatePayloadAgainstSchema("parity_result.schema.json", parity.parity_result);
  expect(parity.parity_result.comparison_set_state).toBe("INVALID");
  expect(parity.parity_result.parity_classification).toBe("NOT_COMPARABLE");
  expect(parity.parity_result.ordered_field_codes).toEqual([]);
  expect(parity.parity_result.deltas).toEqual({});
  expect(parity.parity_result.reason_codes).toContain("PARITY_COMPARISON_BASIS_MISSING");
});
