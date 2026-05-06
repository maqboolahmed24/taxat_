import { expect, test } from "@playwright/test";

import {
  buildDecisionBundleRecord,
  buildGateDecisionRecord,
  DecisionBundleRepository,
  GateDecisionRecordRepository,
  gateDecisionRef,
  synthesizeTrust,
  TrustSummaryRepository,
  type ComputeResultRecord,
  type ParityResultRecord,
  type RiskReportRecord,
} from "../../../backend-compute/src/index.ts";
import {
  GateDecisionExplainabilityQueryError,
  getGateDecisionExplainability,
  listDecisionExplainabilityRows,
} from "../index.ts";

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
    risk_score: 11,
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
    parity_score: 97,
  } as ParityResultRecord;
}

async function persistedFixture() {
  const manifestId = "manifest.pc0198.route";
  const gateRepository = new GateDecisionRecordRepository();
  const trustRepository = new TrustSummaryRepository();
  const bundleRepository = new DecisionBundleRepository();
  const gate = buildGateDecisionRecord({
    decided_at: "2026-05-05T11:00:00Z",
    decision: "MANUAL_REVIEW",
    effective_scope: ["year_end"],
    gate_code: "MANIFEST_GATE",
    manifest_id: manifestId,
    reason_codes: [
      "TRUST_REVIEW_REQUIRED",
      "PARITY_PARTIAL_COVERAGE",
      "ARTIFACT_CONTRACT_MISMATCH",
      "GATE_MANUAL_REVIEW",
    ],
  });
  const storedGate = await gateRepository.persistGateDecisionRecord({
    gate_decision_record: gate,
    persisted_at: "2026-05-05T11:00:00Z",
  });
  const trustResult = await synthesizeTrust({
    authority_uncertainty_score: 8,
    baseline_submission_state: "UNKNOWN",
    compute_result: compute(manifestId),
    execution_mode: "COMPLIANCE",
    graph_quality_basis: {
      completeness_score: 89,
      data_quality_score: 93,
      evidence_graph_ref: `evidence-graph://${manifestId}`,
      graph_quality_score: 92,
      lifecycle_state: "BUILT",
      manifest_id: manifestId,
    },
    live_authority_progression_requested: true,
    manifest_id: manifestId,
    override_dependency_state: "INVALID_OVERRIDE_RELIED_UPON",
    parity_result: parity(manifestId),
    persisted_at: "2026-05-05T11:01:00Z",
    repository: trustRepository,
    required_human_steps: ["review-authority-state"],
    risk_report: risk(manifestId),
    synthesized_at: "2026-05-05T11:01:00Z",
    upstream_gate_records: [
      {
        blocking_dependency_refs: gate.blocking_dependency_refs,
        decision: gate.decision,
        gate_decision_ref: gateDecisionRef(gate),
        manifest_id: gate.manifest_id,
      },
    ],
  });
  const bundle = buildDecisionBundleRecord({
    active_detail_surface_code: "AUTHORITY_TUNNEL",
    blocked_action_codes: ["DECLARE_CONFIRMED_FILED"],
    compute_id: "compute://pc0198/route",
    filing_case_id: "filing-case://pc0198/route",
    focus_anchor_ref: "submission-record://pc0198/route",
    graph_id: "evidence-graph://pc0198/route",
    manifest_id: manifestId,
    next_action_codes: ["AWAIT_AUTHORITY_RECONCILIATION"],
    outcome_class: "AUTHORITY_PENDING",
    parity_id: "parity://pc0198/route",
    persisted_at: "2026-05-05T11:02:00Z",
    primary_proof_bundle_ref: "proof-bundle://pc0198/route",
    reason_codes: [
      "APPROVAL_PENDING",
      "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION",
      "GATE_PASS_WITH_NOTICE",
      "AUTHORITY_PENDING",
    ],
    risk_id: "risk://pc0198/route",
    snapshot_id: "snapshot://pc0198/route",
    submission_record_id: "submission-record://pc0198/route",
    trust_id: trustResult.trust_summary.trust_id,
    twin_id: "twin-view://pc0198/route",
    workflow_item_refs: [
      { ref: "workflow-item://resolved", state: "RESOLVED" },
      { ref: "workflow-item://authority-open", state: "OPEN" },
    ],
  });
  const storedBundle = await bundleRepository.persistDecisionBundle({
    decision_bundle: bundle,
    persisted_at: "2026-05-05T11:02:00Z",
  });

  return {
    bundleRepository,
    gateRepository,
    manifestId,
    storedBundle,
    storedGate,
    storedTrust: trustResult.stored_trust_summary,
    trustRepository,
  };
}

test("gets a persisted gate decision explainability projection by artifact ref", async () => {
  const fixture = await persistedFixture();
  const result = await getGateDecisionExplainability({
    artifact_family: "GATE_DECISION",
    artifact_ref: fixture.storedGate.gate_decision_ref,
    gate_reader: fixture.gateRepository,
  });

  expect(result.query_contract_version).toBe("GATE_DECISION_EXPLAINABILITY_QUERY_V1");
  expect(result.row_source_policy).toBe(
    "PERSISTED_ARTIFACT_DECISION_EXPLAINABILITY_CONTRACT_ONLY",
  );
  expect(result.view.artifact_id).toBe(fixture.storedGate.gate_decision_id);
  expect(result.projection.reason_ladder.map((row) => row.reason_code)).toEqual(
    fixture.storedGate.gate_decision_record.reason_codes,
  );
  expect(result.projection.compressed_reason_rail.compressed_reason_codes).toEqual(
    fixture.storedGate.gate_decision_record.decision_explainability_contract
      .compressed_reason_codes,
  );
});

test("lists gate, trust, and bundle explainability rows for one manifest", async () => {
  const fixture = await persistedFixture();
  const result = await listDecisionExplainabilityRows({
    bundle_reader: fixture.bundleRepository,
    gate_reader: fixture.gateRepository,
    manifest_id: fixture.manifestId,
    trust_reader: fixture.trustRepository,
  });

  expect(result.row_count).toBe(3);
  expect(result.rows.map((row) => row.artifact_family)).toEqual([
    "GATE_DECISION",
    "TRUST_SUMMARY",
    "DECISION_BUNDLE",
  ]);
  expect(result.rows[0].view.ordered_reason_codes).toEqual(
    fixture.storedGate.gate_decision_record.decision_explainability_contract
      .ordered_reason_codes,
  );
  expect(result.rows[1].view.compressed_reason_codes).toEqual(
    fixture.storedTrust?.trust_summary.decision_explainability_contract.compressed_reason_codes,
  );
  expect(result.rows[2].view.compressed_reason_codes).toEqual(
    fixture.storedBundle.record.decision_reason_codes,
  );
});

test("requires an explicit backing reader for each requested explainability family", async () => {
  const fixture = await persistedFixture();

  await expect(
    listDecisionExplainabilityRows({
      artifact_families: ["TRUST_SUMMARY"],
      manifest_id: fixture.manifestId,
    }),
  ).rejects.toThrow(GateDecisionExplainabilityQueryError);
});
