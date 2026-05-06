import { expect, test } from "@playwright/test";

import {
  buildTwinDeltaArcRecord,
  buildTwinInterpretationState,
  buildTwinMismatchSummaryRecord,
  buildTwinPortfolioSummary,
  buildTwinReadinessStateRecord,
  buildTwinReconciliationStateRecord,
  type ExecutionModeBoundaryContract,
  twinDeltaArcRef,
} from "../../../packages/backend-twin/src/index.ts";

const at = "2026-04-29T14:00:00Z";
const execution_mode_boundary_contract: ExecutionModeBoundaryContract = {
  analysis_only: false,
  boundary_hash: "hash.execution-boundary.0132",
  contract_version: "EXECUTION_MODE_BOUNDARY_V1",
  counterfactual_basis: null,
  disclosure_reason_codes: [],
  execution_mode: "COMPLIANCE",
  execution_posture: "LIVE_COMPLIANCE",
  legal_effect_boundary: "COMPLIANCE_CAPABLE",
  non_compliance_config_refs: [],
  replay_class_or_null: null,
  run_kind: "INTERACTIVE",
};

function delta(subject_identity_code: string, delta_class: "ACK_CONTRADICTORY" | "MATCH_EXACT") {
  return buildTwinDeltaArcRecord({
    authority_scope_ref_or_null: "authority://hmrc/vat",
    basis_type_or_null: "VAT_RETURN",
    business_partition_ref_or_null: "partition://vat",
    delta_class,
    last_compared_at: at,
    left_observed_at: at,
    left_subject_refs: [`internal-subject://${subject_identity_code}`],
    period_ref_or_null: "period://2026-Q1",
    reporting_scope_ref_or_null: "scope://client-0132/vat",
    right_observed_at: at,
    right_subject_refs: [`authority-subject://${subject_identity_code}`],
    subject_class: "ACKNOWLEDGEMENT",
    subject_identity_code,
    timeline_ref: "twin-timeline://interpretation-test",
    twin_id: `twin-${subject_identity_code}`,
  });
}

test("persists low-noise authority-first interpretation when contradiction dominates", async () => {
  const contradictory = delta("CONTRADICTORY", "ACK_CONTRADICTORY");
  const mismatchSummary = buildTwinMismatchSummaryRecord({
    deltas: [contradictory],
    generated_at: at,
    twin_id: "twin-CONTRADICTORY",
  });
  const deltaRef = twinDeltaArcRef(contradictory);
  const readiness = buildTwinReadinessStateRecord({
    authority_posture: "CURRENT_MISMATCHED",
    baseline_state: "PROVED",
    blocking_mismatch_refs: [deltaRef],
    blocking_reason_codes: ["TWIN_BLOCKED"],
    contradictory_mismatch_refs: [deltaRef],
    decision_usefulness: "LOW",
    execution_mode_boundary_contract,
    filing_readiness: "NOT_READY",
    last_evaluated_at: at,
    no_safe_action_reason_codes: ["NO_SAFE_TWIN_ACTION"],
    safe_action_state: "NO_SAFE_ACTION",
    trust_summary_ref: "trust-summary://0132",
    twin_id: "twin-CONTRADICTORY",
    twin_readiness_class: "BLOCKED",
    unresolved_conflict_refs: [deltaRef],
    usefulness_cap_reason_codes: ["CONTRADICTORY_MISMATCH"],
  });
  const reconciliation = buildTwinReconciliationStateRecord({
    blocking_mismatch_refs: [deltaRef],
    generated_at: at,
    lifecycle_state: "WAITING_ON_OPERATOR",
    next_action_due_at: "2026-04-30T14:00:00Z",
    next_action_owner: "OPERATOR",
    primary_workflow_item_ref_or_null: "workflow-item://twin-reconciliation/contradictory",
    reason_codes: ["ACK_CONTRADICTORY"],
    recommended_action_code: "RUN_MANUAL_RECONCILIATION",
    reconciliation_budget_state: "MANUAL_ESCALATION",
    target_mismatch_refs: [deltaRef],
    twin_id: "twin-CONTRADICTORY",
    workflow_item_refs: ["workflow-item://twin-reconciliation/contradictory"],
  });
  const interpretation = await buildTwinInterpretationState({
    deltas: [contradictory],
    mismatch_summary: mismatchSummary,
    readiness,
    reconciliation_state: reconciliation,
  });

  expect(interpretation.interpretation_state).toMatchObject({
    authority_first_summary: true,
    default_noise_filter: "ACTIONABLE_ONLY",
    default_sort_mode: "PRIORITY_RANK",
    dominant_attention_state: "CONTRADICTORY",
    dominant_delta_arc_ref_or_null: deltaRef,
    summary_priority_mode: "AUTHORITY_FIRST",
    suppress_informational_when_higher_severity_present: true,
  });
  expect(interpretation.interpretation_state.dominant_reconciliation_state_ref_or_null).toContain(
    "twin-reconciliation-state://",
  );
});

test("ready interpretation clears dominant refs instead of inventing audit focus", async () => {
  const matched = delta("MATCHED", "MATCH_EXACT");
  const mismatchSummary = buildTwinMismatchSummaryRecord({
    deltas: [matched],
    generated_at: at,
    twin_id: "twin-MATCHED",
  });
  const readiness = buildTwinReadinessStateRecord({
    authority_posture: "CURRENT_MATCHED",
    baseline_state: "PROVED",
    decision_bundle_ref: "decision-bundle://ready",
    decision_usefulness: "HIGH",
    execution_mode_boundary_contract,
    filing_readiness: "READY_TO_SUBMIT",
    gate_decision_refs: ["gate-decision://ready"],
    last_evaluated_at: at,
    safe_action_state: "SAFE_TO_ACT",
    trust_summary_ref: "trust-summary://0132",
    twin_id: "twin-MATCHED",
    twin_readiness_class: "READY",
  });
  const reconciliation = buildTwinReconciliationStateRecord({
    generated_at: at,
    lifecycle_state: "NOT_REQUIRED",
    twin_id: "twin-MATCHED",
  });
  const interpretation = await buildTwinInterpretationState({
    mismatch_summary: mismatchSummary,
    readiness,
    reconciliation_state: reconciliation,
  });

  expect(interpretation.interpretation_state.dominant_attention_state).toBe("READY");
  expect(interpretation.interpretation_state.compare_mode).toBe("LOCKED");
  expect(interpretation.interpretation_state.dominant_delta_arc_ref_or_null).toBeNull();
  expect(interpretation.interpretation_state.dominant_reconciliation_state_ref_or_null).toBeNull();
});

test("portfolio attention ranking is deterministic and uses persisted summaries only", async () => {
  const left = delta("TIE_A", "ACK_CONTRADICTORY");
  const right = delta("TIE_B", "ACK_CONTRADICTORY");
  const leftSummary = buildTwinMismatchSummaryRecord({
    deltas: [left],
    generated_at: at,
    twin_id: "twin-TIE_A",
  });
  const rightSummary = buildTwinMismatchSummaryRecord({
    deltas: [right],
    generated_at: at,
    twin_id: "twin-TIE_B",
  });
  const leftRef = twinDeltaArcRef(left);
  const rightRef = twinDeltaArcRef(right);
  const leftReadiness = buildTwinReadinessStateRecord({
    authority_posture: "CURRENT_MISMATCHED",
    baseline_state: "PROVED",
    blocking_mismatch_refs: [leftRef],
    blocking_reason_codes: ["TWIN_BLOCKED"],
    contradictory_mismatch_refs: [leftRef],
    decision_usefulness: "LOW",
    execution_mode_boundary_contract,
    filing_readiness: "NOT_READY",
    last_evaluated_at: at,
    no_safe_action_reason_codes: ["NO_SAFE_TWIN_ACTION"],
    safe_action_state: "NO_SAFE_ACTION",
    trust_summary_ref: "trust-summary://left",
    twin_id: "twin-TIE_A",
    twin_readiness_class: "BLOCKED",
    unresolved_conflict_refs: [leftRef],
    usefulness_cap_reason_codes: ["CONTRADICTORY_MISMATCH"],
  });
  const rightReadiness = buildTwinReadinessStateRecord({
    authority_posture: "CURRENT_MISMATCHED",
    baseline_state: "PROVED",
    blocking_mismatch_refs: [rightRef],
    blocking_reason_codes: ["TWIN_BLOCKED"],
    contradictory_mismatch_refs: [rightRef],
    decision_usefulness: "LOW",
    execution_mode_boundary_contract,
    filing_readiness: "NOT_READY",
    last_evaluated_at: at,
    no_safe_action_reason_codes: ["NO_SAFE_TWIN_ACTION"],
    safe_action_state: "NO_SAFE_ACTION",
    trust_summary_ref: "trust-summary://right",
    twin_id: "twin-TIE_B",
    twin_readiness_class: "BLOCKED",
    unresolved_conflict_refs: [rightRef],
    usefulness_cap_reason_codes: ["CONTRADICTORY_MISMATCH"],
  });
  const before = JSON.stringify([rightSummary, leftSummary]);
  const portfolio = await buildTwinPortfolioSummary({
    generated_at: at,
    scope_ref: "portfolio-scope://unit",
    tenant_id: "tenant-0132",
    twins: [
      { mismatch_summary: rightSummary, readiness: rightReadiness },
      { mismatch_summary: leftSummary, readiness: leftReadiness },
    ],
  });

  expect(JSON.stringify([rightSummary, leftSummary])).toBe(before);
  expect(portfolio.portfolio_summary.total_twin_count).toBe(2);
  expect(portfolio.portfolio_summary.blocked_count).toBe(2);
  expect(portfolio.portfolio_summary.top_mismatch_refs).toEqual([leftRef, rightRef].sort());
  expect(portfolio.portfolio_summary.top_twin_refs).toEqual(
    portfolio.portfolio_summary.top_mismatch_refs.map((ref) =>
      ref === leftRef ? "twin-view://twin-TIE_A" : "twin-view://twin-TIE_B",
    ),
  );
  expect(portfolio.portfolio_summary.highest_attention_rank).toBeGreaterThan(1000);
});
