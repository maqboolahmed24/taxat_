import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  type ComputeResultRecord,
  type ParityResultRecord,
  type RiskReportRecord,
  supersedeTrustSummary,
  synthesizeTrust,
  TrustSummaryRepository,
  trustSummaryRef,
} from "../../../packages/backend-compute/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(repoRoot, "db", "migrations", "phase03_0125_trust_summary.sql");

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

function compute(manifestId: string): ComputeResultRecord {
  return {
    analysis_only: false,
    artifact_type: "ComputeResult",
    compute_id: `compute-${manifestId}`,
    counterfactual_basis: null,
    execution_mode: "COMPLIANCE",
    lifecycle_state: "COMPUTED",
    manifest_id: manifestId,
    non_compliance_config_refs: [],
  } as ComputeResultRecord;
}

function risk(manifestId: string): RiskReportRecord {
  return {
    analysis_only: false,
    artifact_type: "RiskReport",
    counterfactual_basis: null,
    execution_mode: "COMPLIANCE",
    manifest_id: manifestId,
    non_compliance_config_refs: [],
    risk_id: `risk-${manifestId}`,
    risk_score: 10,
    unresolved_blocking_risk_flag: false,
    unresolved_material_blocking_risk_flag: false,
  } as RiskReportRecord;
}

function parity(manifestId: string): ParityResultRecord {
  return {
    analysis_only: false,
    artifact_type: "ParityResult",
    comparison_requirement: "MANDATORY",
    counterfactual_basis: null,
    execution_mode: "COMPLIANCE",
    lifecycle_state: "EVALUATED",
    manifest_id: manifestId,
    non_compliance_config_refs: [],
    parity_classification: "MATCH",
    parity_id: `parity-${manifestId}`,
    parity_score: 98,
  } as ParityResultRecord;
}

test("migration defines trust register, posture constraints, indexes, and RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.trust_summary_register");
  expect(sql).toContain("trust_summary_execution_boundary_chk");
  expect(sql).toContain("trust_summary_automation_readiness_bridge_chk");
  expect(sql).toContain("trust_summary_edge_review_chk");
  expect(sql).toContain("trust_summary_upstream_gate_cap_chk");
  expect(sql).toContain("trust_summary_threshold_stability_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("trust persistence validates schema payloads, indexes, and supersession", async () => {
  const manifestId = "manifest-0125-integration";
  const repository = new TrustSummaryRepository();
  const result = await synthesizeTrust({
    authority_uncertainty_score: 10,
    baseline_submission_state: "KNOWN_MATCHED",
    compute_result: compute(manifestId),
    execution_mode: "COMPLIANCE",
    freshness_deadlines: [
      {
        dependency_class: "AUTHORITY_STATE",
        dependency_ref: "authority-state://manifest-0125-integration",
        fresh_until: "2026-04-28T18:30:00Z",
      },
    ],
    graph_quality_basis: {
      completeness_score: 98,
      data_quality_score: 98,
      evidence_graph_ref: "evidence-graph://manifest-0125-integration",
      graph_quality_score: 96,
      lifecycle_state: "BUILT",
      manifest_id: manifestId,
    },
    live_authority_progression_requested: true,
    manifest_id: manifestId,
    parity_result: parity(manifestId),
    persisted_at: "2026-04-28T17:00:01Z",
    repository,
    risk_report: risk(manifestId),
    schema_bundle_hash: "schema-bundle-hash://compute/0125",
    synthesized_at: "2026-04-28T17:00:00Z",
    temporal_propagation_event_refs: ["temporal-propagation://0125/integration"],
    upstream_gate_records: [
      {
        decision: "PASS_WITH_NOTICE",
        gate_decision_ref: "gate-decision://0125/notice",
        manifest_id: manifestId,
      },
    ],
  });

  const trust = result.trust_summary;
  await validatePayloadAgainstSchema("trust_summary.schema.json", trust);
  await validatePayloadAgainstSchema(
    "trust_input_basis_contract.schema.json",
    trust.trust_input_basis_contract,
  );
  await validatePayloadAgainstSchema(
    "trust_sensitivity_analysis_contract.schema.json",
    trust.trust_sensitivity_analysis_contract,
  );
  expect(trust.trust_band).toBe("GREEN");
  expect(trust.automation_level).toBe("ALLOWED");
  expect(trust.reason_codes).toContain("TRUST_UPSTREAM_GATE_NOTICE_ACTIVE");
  expect(trust.trust_sensitivity_analysis_contract.graph_filing_margin_or_null).toBe(46);
  expect(trust.trust_sensitivity_analysis_contract.authority_review_margin_or_null).toBe(25);
  expect(trust.trust_sensitivity_analysis_contract.authority_block_margin_or_null).toBe(60);
  expect(trust.trust_fresh_until).toBe("2026-04-28T18:30:00Z");

  await expect(repository.getTrustSummaryByRef(trustSummaryRef(trust))).resolves.toMatchObject({
    trust_id: trust.trust_id,
    trust_summary_row_version: 1,
  });
  await expect(repository.listTrustSummariesByManifestId(manifestId)).resolves.toHaveLength(1);
  await expect(repository.listTrustSummariesByBand("GREEN")).resolves.toHaveLength(1);
  await expect(repository.listTrustSummariesByAutomationLevel("ALLOWED")).resolves.toHaveLength(1);
  await expect(repository.listTrustSummariesByUpstreamGateCap("NOTICE_ONLY")).resolves.toHaveLength(
    1,
  );

  const superseded = supersedeTrustSummary({
    reason: "LATE_DATA_OR_AUTHORITY_CHANGE",
    superseded_at: "2026-04-28T17:15:00Z",
    superseded_by_trust_id: "trust.next-0125",
    trust_summary: trust,
  });
  await validatePayloadAgainstSchema("trust_summary.schema.json", superseded);
  await repository.compareAndSwapTrustSummary({
    expected_row_version: 1,
    persisted_at: "2026-04-28T17:15:01Z",
    trust_id: trust.trust_id,
    trust_summary: superseded,
  });
  await expect(repository.listTrustSummariesByLifecycleState("SUPERSEDED")).resolves.toHaveLength(
    1,
  );
});
