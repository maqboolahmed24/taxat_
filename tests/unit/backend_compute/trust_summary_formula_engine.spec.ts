import { expect, test } from "@playwright/test";

import {
  type ComputeResultRecord,
  deriveTrustPosture,
  type ParityResultRecord,
  type RiskReportRecord,
  synthesizeTrust,
} from "../../../packages/backend-compute/src/index.ts";

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

function risk(manifestId: string, overrides: Partial<RiskReportRecord> = {}): RiskReportRecord {
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
    ...overrides,
  } as RiskReportRecord;
}

function parity(
  manifestId: string,
  overrides: Partial<ParityResultRecord> = {},
): ParityResultRecord {
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
    ...overrides,
  } as ParityResultRecord;
}

async function synthesize(
  manifestId: string,
  overrides: Partial<Parameters<typeof synthesizeTrust>[0]> = {},
) {
  return synthesizeTrust({
    authority_uncertainty_score: 0,
    baseline_submission_state: "NOT_APPLICABLE",
    compute_result: compute(manifestId),
    execution_mode: "COMPLIANCE",
    graph_quality_basis: {
      completeness_score: 98,
      data_quality_score: 98,
      evidence_graph_ref: `evidence-graph://${manifestId}`,
      graph_quality_score: 96,
      lifecycle_state: "BUILT",
      manifest_id: manifestId,
    },
    live_authority_progression_requested: false,
    manifest_id: manifestId,
    parity_result: parity(manifestId),
    risk_report: risk(manifestId),
    synthesized_at: "2026-04-28T10:00:00Z",
    upstream_gate_records: [
      {
        decision: "PASS",
        gate_decision_ref: `gate-decision://${manifestId}`,
        manifest_id: manifestId,
      },
    ],
    ...overrides,
  });
}

test("synthesizes weighted geometric trust score and a green automation posture", async () => {
  const result = await synthesize("trust-green");
  const trust = result.trust_summary;
  const expectedCore =
    100 *
    Math.exp(
      0.3 * Math.log(98 / 100) +
        0.25 * Math.log(98 / 100) +
        0.25 * Math.log(96 / 100) +
        0.2 * Math.log(90 / 100),
    );

  expect(trust.trust_core_score).toBeCloseTo(expectedCore, 10);
  expect(trust.trust_score).toBe(Math.round(expectedCore));
  expect(trust.score_band).toBe("GREEN");
  expect(trust.cap_band).toBe("GREEN");
  expect(trust.trust_band).toBe("GREEN");
  expect(trust.automation_level).toBe("ALLOWED");
  expect(trust.filing_readiness).toBe("READY_TO_SUBMIT");
  expect(trust.reason_codes).toEqual(["TRUST_GREEN"]);
  expect(
    trust.trust_sensitivity_analysis_contract.projected_case_results.map(
      (projection) => projection.case_code,
    ),
  ).toEqual([
    "TRUST_SCORE_MINUS_ONE",
    "TRUST_SCORE_PLUS_ONE",
    "RISK_SCORE_PLUS_ONE",
    "AUTHORITY_UNCERTAINTY_PLUS_ONE",
    "FRESHNESS_INVALIDATED",
    "INVALID_OVERRIDE_RELIED_UPON",
  ]);
});

test("caps an otherwise green score when an upstream gate requires review", async () => {
  const result = await synthesize("trust-review-cap", {
    upstream_gate_records: [
      {
        blocking_dependency_refs: ["gate-dependency://manual-review"],
        decision: "MANUAL_REVIEW",
        gate_decision_ref: "gate-decision://manual-review",
        manifest_id: "trust-review-cap",
      },
    ],
  });
  const trust = result.trust_summary;

  expect(trust.score_band).toBe("GREEN");
  expect(trust.cap_band).toBe("AMBER");
  expect(trust.trust_band).toBe("AMBER");
  expect(trust.automation_level).toBe("LIMITED");
  expect(trust.filing_readiness).toBe("READY_REVIEW");
  expect(trust.reason_codes).toContain("TRUST_UPSTREAM_GATE_REVIEW_REQUIRED");
  expect(trust.trust_sensitivity_analysis_contract.score_cap_alignment_state).toBe(
    "CAP_STRICTER_THAN_SCORE",
  );
  expect(trust.trust_sensitivity_analysis_contract.cap_driver_reason_codes).toContain(
    "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED",
  );
});

test("marks edge-review thresholds and blocks ready-to-submit", () => {
  const posture = deriveTrustPosture({
    active_filing_critical_override_count: 0,
    authority_penalty: 0,
    authority_uncertainty_score: 0,
    baseline_submission_state: "NOT_APPLICABLE",
    basis_automation_ceiling: "ALLOWED",
    completeness_score: 90,
    critical_retention_limited_count: 0,
    execution_legal_effect_boundary: "COMPLIANCE_CAPABLE",
    execution_mode: "COMPLIANCE",
    graph_quality_score: 90,
    input_reason_codes: [],
    late_data_invalidation_state: "NONE",
    live_authority_progression_requested: false,
    override_dependency_state: "NO_ACTIVE_OR_VALID_OVERRIDES",
    required_human_step_count: 0,
    risk_score: 10,
    trust_input_state: "ADMISSIBLE_CURRENT",
    trust_score: 85,
    unresolved_blocking_risk_flag: false,
    unresolved_material_blocking_risk_flag: false,
    upstream_gate_cap: "AUTO_ELIGIBLE",
  });

  expect(posture.score_band).toBe("GREEN");
  expect(posture.threshold.threshold_stability_state).toBe("EDGE_REVIEW");
  expect(posture.threshold.edge_trigger_codes).toContain("TRUST_GREEN_GUARD_BAND");
  expect(posture.cap_band).toBe("AMBER");
  expect(posture.trust_band).toBe("AMBER");
  expect(posture.automation_level).toBe("LIMITED");
  expect(posture.reason_codes).toContain("TRUST_THRESHOLD_EDGE_REVIEW");
});

test("fails closed on invalid override dependency", async () => {
  const result = await synthesize("trust-invalid-override", {
    override_dependency_state: "INVALID_OVERRIDE_RELIED_UPON",
  });
  const trust = result.trust_summary;

  expect(trust.trust_input_state).toBe("CONTRADICTED");
  expect(trust.trust_band).toBe("INSUFFICIENT_DATA");
  expect(trust.automation_level).toBe("BLOCKED");
  expect(trust.filing_readiness).toBe("NOT_READY");
  expect(trust.reason_codes).toContain("TRUST_INPUT_CONTRADICTION");
  expect(trust.reason_codes).toContain("TRUST_OVERRIDE_INVALID");
  expect(trust.trust_input_basis_contract.input_reason_codes).toContain("TRUST_OVERRIDE_INVALID");
  expect(trust.blocking_dependency_refs.length).toBeGreaterThan(0);
});

test("stale freshness input limits trust to review", async () => {
  const result = await synthesize("trust-stale", {
    freshness_deadlines: [
      {
        dependency_class: "LATE_DATA_MONITOR",
        dependency_ref: "late-data-monitor://trust-stale",
        fresh_until: "2026-04-28T09:59:00Z",
      },
    ],
  });
  const trust = result.trust_summary;

  expect(trust.trust_input_state).toBe("ADMISSIBLE_STALE");
  expect(trust.cap_band).toBe("AMBER");
  expect(trust.trust_band).toBe("AMBER");
  expect(trust.automation_level).toBe("LIMITED");
  expect(trust.reason_codes).toContain("TRUST_INPUT_STALE");
  expect(trust.reason_codes).toContain("TRUST_RECALCULATION_REQUIRED");
  expect(trust.trust_fresh_until).toBe("2026-04-28T09:59:00Z");
});

test("live authority guard band populates authority margins and edge trigger", async () => {
  const result = await synthesize("trust-authority-edge", {
    authority_uncertainty_score: 34,
    baseline_submission_state: "KNOWN_MATCHED",
    live_authority_progression_requested: true,
  });
  const sensitivity = result.trust_summary.trust_sensitivity_analysis_contract;

  expect(result.trust_summary.threshold_stability_state).toBe("EDGE_REVIEW");
  expect(result.trust_summary.trust_band).toBe("AMBER");
  expect(result.trust_summary.automation_level).toBe("LIMITED");
  expect(sensitivity.authority_review_margin_or_null).toBe(1);
  expect(sensitivity.authority_block_margin_or_null).toBe(36);
  expect(sensitivity.edge_trigger_codes).toContain("AUTHORITY_REVIEW_GUARD_BAND");
});
