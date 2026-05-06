import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  appendManifestGates,
  buildGateDecisionRecord,
  evaluateGateChain,
  GateDecisionRecordRepository,
  gateDecisionRef,
  persistGateBatch,
} from "../../../packages/backend-compute/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0126_gate_decision_record_and_ordered_gate_engine.sql",
);

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

test("migration defines gate register, posture constraints, indexes, and RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.gate_decision_record_register");
  expect(sql).toContain("gate_decision_stage_code_chk");
  expect(sql).toContain("gate_decision_no_valid_override_chk");
  expect(sql).toContain("gate_decision_valid_override_active_chk");
  expect(sql).toContain("gate_decision_manifest_stage_uniq");
  expect(sql).toContain("gate_decision_manifest_stage_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("persists gate batches append-only and projects manifest outcomes", async () => {
  const manifestId = "manifest-0126-integration";
  const repository = new GateDecisionRecordRepository();
  const preseal = evaluateGateChain({
    decided_at: "2026-04-28T13:00:00Z",
    effective_scope: ["year_end"],
    gate_inputs: [
      { gate_code: "MANIFEST_GATE" },
      { gate_code: "ARTIFACT_CONTRACT_GATE" },
      { gate_code: "INPUT_BOUNDARY_GATE" },
      { gate_code: "DATA_QUALITY_GATE" },
    ],
    manifest_id: manifestId,
    policy_version_ref: "policy://gate-chain/0126",
    required_gate_codes: [
      "MANIFEST_GATE",
      "ARTIFACT_CONTRACT_GATE",
      "INPUT_BOUNDARY_GATE",
      "DATA_QUALITY_GATE",
    ],
  });

  for (const record of preseal.gate_records) {
    await validatePayloadAgainstSchema("gate_decision_record.schema.json", record);
    await validatePayloadAgainstSchema(
      "gate_semantics_contract.schema.json",
      record.gate_semantics_contract,
    );
    await validatePayloadAgainstSchema(
      "decision_explainability_contract.schema.json",
      record.decision_explainability_contract,
    );
  }

  const persisted = await persistGateBatch({
    gate_records: preseal.gate_records,
    persisted_at: "2026-04-28T13:00:01Z",
    repository,
  });
  expect(persisted.gate_events).toHaveLength(4);
  await expect(repository.listGateDecisionsByManifestId(manifestId)).resolves.toHaveLength(4);
  await expect(repository.listGateDecisionsByGateCode("DATA_QUALITY_GATE")).resolves.toHaveLength(
    1,
  );
  await expect(repository.listGateDecisionsBySeverity("INFO")).resolves.toHaveLength(4);

  await expect(
    repository.persistGateDecisionRecord({
      gate_decision_record: preseal.gate_records[0],
      persisted_at: "2026-04-28T13:00:02Z",
    }),
  ).resolves.toMatchObject({ gate_decision_id: preseal.gate_records[0].gate_decision_id });

  const differentSameStage = buildGateDecisionRecord({
    decision: "MANUAL_REVIEW",
    effective_scope: ["year_end"],
    gate_code: "DATA_QUALITY_GATE",
    gate_decision_id: "gate.manifest-0126-integration.data_quality_gate.alternate",
    manifest_id: manifestId,
    prerequisite_gate_refs: preseal.gate_records.slice(0, 3).map(gateDecisionRef),
  });
  await expect(
    repository.persistGateDecisionRecord({
      gate_decision_record: differentSameStage,
      persisted_at: "2026-04-28T13:00:03Z",
    }),
  ).rejects.toThrow(/GATE_DECISION_STAGE_DUPLICATE/);

  const projection = appendManifestGates({
    effective_scope: ["year_end"],
    gate_records: preseal.gate_records,
    manifest_id: manifestId,
  });
  expect(projection.last_gate_stage_index).toBe(4);
  expect(projection.outcomes.deferred_gate_codes.slice(0, 3)).toEqual([
    "RETENTION_EVIDENCE_GATE",
    "PARITY_GATE",
    "TRUST_GATE",
  ]);

  const decidedAtBeforeAppend = projection.gate_records[0].decided_at;
  const postseal = evaluateGateChain({
    decided_at: "2026-04-28T13:05:00Z",
    effective_scope: ["year_end"],
    existing_gate_records: projection.gate_records,
    gate_inputs: [
      { gate_code: "RETENTION_EVIDENCE_GATE" },
      { gate_code: "PARITY_GATE" },
      { gate_code: "TRUST_GATE" },
    ],
    manifest_id: manifestId,
  });
  const updatedProjection = appendManifestGates({
    effective_scope: ["year_end"],
    gate_records: postseal.gate_records,
    manifest_id: manifestId,
    projection,
  });
  expect(updatedProjection.last_gate_stage_index).toBe(7);
  expect(updatedProjection.gate_records[0].decided_at).toBe(decidedAtBeforeAppend);
  expect(updatedProjection.outcomes.projection_state).toBe("AUTO_ELIGIBLE");
  expect(updatedProjection.outcomes.progression_ceiling_rank).toBe(2);
});
