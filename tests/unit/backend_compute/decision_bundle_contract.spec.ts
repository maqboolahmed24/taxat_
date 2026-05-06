import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildDecisionBundleRecord,
  DecisionBundleModelError,
} from "../../../packages/backend-compute/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validateDecisionBundle(payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    Draft202012Validator,
    build_registry,
    load_json,
    validate_decision_bundle,
)

payload = json.loads(sys.argv[2])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / "decision_bundle.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
issues.extend(f"{issue.location}: {issue.message}" for issue in validate_decision_bundle(payload, "decision_bundle"))
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    JSON.stringify(payload),
  ]);
}

test("builds authority-pending bundles with compressed reasons and actionability bridge", async () => {
  const bundle = buildDecisionBundleRecord({
    active_detail_surface_code: "AUTHORITY_TUNNEL",
    blocked_action_codes: ["DECLARE_CONFIRMED_FILED"],
    compute_id: "compute://0127/primary",
    filing_case_id: "filing-case://0127",
    focus_anchor_ref: "submission-record://0127",
    graph_id: "evidence-graph://0127",
    manifest_id: "manifest-0127-contract",
    next_action_codes: ["AWAIT_AUTHORITY_RECONCILIATION"],
    outcome_class: "AUTHORITY_PENDING",
    parity_id: "parity://0127",
    persisted_at: "2026-04-28T12:00:00Z",
    primary_proof_bundle_ref: "proof-bundle://0127",
    reason_codes: [
      "APPROVAL_PENDING",
      "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION",
      "GATE_PASS_WITH_NOTICE",
      "AUTHORITY_PENDING",
    ],
    risk_id: "risk://0127",
    snapshot_id: "snapshot://0127",
    submission_record_id: "submission-record://0127",
    trust_id: "trust://0127",
    twin_id: "twin-view://0127",
    workflow_item_refs: [
      { ref: "workflow-item://resolved", state: "RESOLVED" },
      { ref: "workflow-item://authority-open", state: "OPEN" },
    ],
  });

  expect(bundle.decision_status).toBe("REVIEW_REQUIRED");
  expect(bundle.waiting_on).toBe("AUTHORITY");
  expect(bundle.workflow_item_refs).toEqual(["workflow-item://authority-open"]);
  expect(bundle.reason_codes.slice(0, 4)).toEqual([
    "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION",
    "AUTHORITY_PENDING",
    "APPROVAL_PENDING",
    "GATE_PASS_WITH_NOTICE",
  ]);
  expect(bundle.decision_reason_codes).toEqual(bundle.reason_codes.slice(0, 3));
  expect(bundle.dominant_reason_code).toBe(bundle.reason_codes[0]);
  expect(bundle.primary_action_code).toBe("AWAIT_AUTHORITY_RECONCILIATION");
  expect(bundle.blocked_action_codes).not.toContain(bundle.primary_action_code);
  expect(bundle.decision_explainability_contract).toMatchObject({
    action_projection_state: "PRIMARY_ACTION_INCLUDED",
    artifact_family: "DECISION_BUNDLE",
    compressed_reason_codes: bundle.decision_reason_codes,
    dominant_reason_code: bundle.dominant_reason_code,
    plain_text_field_name: "plain_reason",
    suppressed_reason_count: 1,
  });
  await validateDecisionBundle(bundle);
});

test("enforces proof, twin, action, and analysis execution constraints", () => {
  expect(() =>
    buildDecisionBundleRecord({
      manifest_id: "manifest-0127-proof-missing-graph",
      outcome_class: "FINAL_SUCCESS",
      persisted_at: "2026-04-28T12:05:00Z",
      primary_proof_bundle_ref: "proof-bundle://missing-graph",
    }),
  ).toThrow(DecisionBundleModelError);

  expect(() =>
    buildDecisionBundleRecord({
      graph_id: "graph://without-parity",
      manifest_id: "manifest-0127-twin-missing-parity",
      outcome_class: "FINAL_SUCCESS",
      persisted_at: "2026-04-28T12:06:00Z",
      twin_id: "twin-view://without-parity",
    }),
  ).toThrow(DecisionBundleModelError);

  expect(() =>
    buildDecisionBundleRecord({
      blocked_action_codes: ["RETRY"],
      manifest_id: "manifest-0127-primary-blocked",
      next_action_codes: ["RETRY"],
      outcome_class: "HUMAN_REVIEW",
      persisted_at: "2026-04-28T12:07:00Z",
      workflow_item_refs: ["workflow-item://review"],
    }),
  ).toThrow(DecisionBundleModelError);

  const analysis = buildDecisionBundleRecord({
    counterfactual_basis: "counterfactual://0127",
    execution_mode: "ANALYSIS",
    manifest_id: "manifest-0127-analysis",
    outcome_class: "HUMAN_REVIEW",
    persisted_at: "2026-04-28T12:08:00Z",
    workflow_item_refs: ["workflow-item://analysis-review"],
  });

  expect(analysis.reason_codes).toContain("NON_LIVE_EXECUTION_BOUNDARY");
  expect(analysis.waiting_on).toBe("HUMAN");
  expect(analysis.submission_record_id).toBeNull();
  expect(analysis.primary_proof_bundle_ref).toBeNull();
});
