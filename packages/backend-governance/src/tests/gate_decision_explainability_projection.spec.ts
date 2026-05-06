import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildDecisionBundleRecord,
  buildGateDecisionRecord,
  projectDecisionBundleExplainabilityView,
  projectGateDecisionExplainabilityView,
  projectTrustSummaryExplainabilityView,
  synthesizeTrust,
  validatePersistedGateDecisionExplainabilityAlignment,
  type ComputeResultRecord,
  type ParityResultRecord,
  type RiskReportRecord,
} from "../../../backend-compute/src/index.ts";
import {
  PersistedDecisionExplainabilityAlignmentError,
} from "../../../backend-compute/src/services/validate_persisted_decision_explainability_alignment.ts";
import { buildGateDecisionExplainabilityProjection } from "../index.ts";

function gateRecord() {
  return buildGateDecisionRecord({
    decided_at: "2026-05-05T10:00:00Z",
    decision: "MANUAL_REVIEW",
    effective_scope: ["year_end"],
    gate_code: "MANIFEST_GATE",
    manifest_id: "manifest.pc0198.projection",
    reason_codes: [
      "TRUST_REVIEW_REQUIRED",
      "PARITY_PARTIAL_COVERAGE",
      "ARTIFACT_CONTRACT_MISMATCH",
      "GATE_MANUAL_REVIEW",
    ],
  });
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

async function trustSummary(manifestId: string) {
  return (
    await synthesizeTrust({
      authority_uncertainty_score: 12,
      baseline_submission_state: "UNKNOWN",
      compute_result: compute(manifestId),
      execution_mode: "COMPLIANCE",
      graph_quality_basis: {
        completeness_score: 88,
        data_quality_score: 92,
        evidence_graph_ref: `evidence-graph://${manifestId}`,
        graph_quality_score: 91,
        lifecycle_state: "BUILT",
        manifest_id: manifestId,
      },
      live_authority_progression_requested: true,
      manifest_id: manifestId,
      override_dependency_state: "INVALID_OVERRIDE_RELIED_UPON",
      parity_result: parity(manifestId),
      required_human_steps: ["review-authority-state"],
      risk_report: risk(manifestId),
      synthesized_at: "2026-05-05T10:01:00Z",
      upstream_gate_records: [
        {
          blocking_dependency_refs: ["gate-dependency://pc0198/manual-review"],
          decision: "MANUAL_REVIEW",
          gate_decision_ref: `gate-decision://${manifestId}`,
          manifest_id: manifestId,
        },
      ],
    })
  ).trust_summary;
}

function decisionBundle(manifestId: string) {
  return buildDecisionBundleRecord({
    active_detail_surface_code: "AUTHORITY_TUNNEL",
    blocked_action_codes: ["DECLARE_CONFIRMED_FILED"],
    compute_id: "compute://pc0198/primary",
    filing_case_id: "filing-case://pc0198",
    focus_anchor_ref: "submission-record://pc0198",
    graph_id: "evidence-graph://pc0198",
    manifest_id: manifestId,
    next_action_codes: ["AWAIT_AUTHORITY_RECONCILIATION"],
    outcome_class: "AUTHORITY_PENDING",
    parity_id: "parity://pc0198",
    persisted_at: "2026-05-05T10:02:00Z",
    primary_proof_bundle_ref: "proof-bundle://pc0198",
    reason_codes: [
      "APPROVAL_PENDING",
      "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION",
      "GATE_PASS_WITH_NOTICE",
      "AUTHORITY_PENDING",
    ],
    risk_id: "risk://pc0198",
    snapshot_id: "snapshot://pc0198",
    submission_record_id: "submission-record://pc0198",
    trust_id: "trust://pc0198",
    twin_id: "twin-view://pc0198",
    workflow_item_refs: [
      { ref: "workflow-item://resolved", state: "RESOLVED" },
      { ref: "workflow-item://authority-open", state: "OPEN" },
    ],
  });
}

test("projects gate explainability from the persisted contract without recomputing reason order", async () => {
  const gate = gateRecord();
  await validateContractSchema("gate_decision_record", gate);

  const view = projectGateDecisionExplainabilityView(gate);
  const projection = buildGateDecisionExplainabilityProjection(view);

  expect(view.ordered_reason_codes).toEqual(
    gate.decision_explainability_contract.ordered_reason_codes,
  );
  expect(view.compressed_reason_codes).toEqual(gate.reason_codes.slice(0, 3));
  expect(view.suppressed_reason_count).toBe(1);
  expect(projection.reason_ladder.map((row) => row.reason_code)).toEqual(gate.reason_codes);
  expect(projection.reason_ladder[0]).toMatchObject({
    compressed_prefix_member: true,
    is_dominant: true,
    position: 1,
  });
  expect(projection.qualifier_badges.map((badge) => badge.qualifier_code)).toEqual([
    "LIMITATION_STATE",
    "ACTIONABILITY_STATE",
  ]);
  expect(projection.plain_language.value).toBe(gate.plain_explanation);
});

test("fails closed when persisted explainability drifts from the parent artifact", () => {
  const gate = gateRecord();
  const compressedDrift = structuredClone(gate);
  compressedDrift.decision_explainability_contract.compressed_reason_codes = ["DRIFTED_REASON"];

  expect(() => validatePersistedGateDecisionExplainabilityAlignment(compressedDrift)).toThrow(
    PersistedDecisionExplainabilityAlignmentError,
  );
  try {
    validatePersistedGateDecisionExplainabilityAlignment(compressedDrift);
  } catch (error) {
    expect(error).toMatchObject({ code: "COMPRESSED_PREFIX_DRIFT" });
  }

  const qualifierDrift = structuredClone(gate);
  qualifierDrift.decision_explainability_contract.semantic_qualifiers = [
    "ACTIONABILITY_STATE",
    "LIMITATION_STATE",
  ];
  expect(() => validatePersistedGateDecisionExplainabilityAlignment(qualifierDrift)).toThrow(
    PersistedDecisionExplainabilityAlignmentError,
  );
  try {
    validatePersistedGateDecisionExplainabilityAlignment(qualifierDrift);
  } catch (error) {
    expect(error).toMatchObject({ code: "QUALIFIER_ORDER_DRIFT" });
  }
});

test("uses the same projection grammar for trust summaries and terminal decision bundles", async () => {
  const manifestId = "manifest.pc0198.cross-family";
  const trust = await trustSummary(manifestId);
  const bundle = decisionBundle(manifestId);
  await validateContractSchema("decision_bundle", bundle);

  const trustProjection = buildGateDecisionExplainabilityProjection(
    projectTrustSummaryExplainabilityView(trust),
  );
  const bundleProjection = buildGateDecisionExplainabilityProjection(
    projectDecisionBundleExplainabilityView(bundle),
  );

  expect(trustProjection.projection_family).toBe("TRUST_SUMMARY");
  expect(trustProjection.compressed_reason_rail.compressed_reason_codes).toEqual(
    trust.decision_explainability_contract.compressed_reason_codes,
  );
  expect(trustProjection.qualifier_badges.map((badge) => badge.qualifier_code)).toEqual(
    trust.decision_explainability_contract.semantic_qualifiers,
  );
  expect(bundleProjection.projection_family).toBe("DECISION_BUNDLE");
  expect(bundleProjection.compressed_reason_rail.compressed_reason_codes).toEqual(
    bundle.decision_reason_codes,
  );
  expect(bundleProjection.action_panel.state).toBe("PRIMARY_ACTION");
});
