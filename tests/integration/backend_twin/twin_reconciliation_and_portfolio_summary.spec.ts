import { expect, test } from "@playwright/test";

import {
  buildTwinPortfolioSummary,
  buildTwinStateSnapshotRecord,
  buildTwinView,
  type ExecutionModeBoundaryContract,
} from "../../../packages/backend-twin/src/index.ts";

const at = "2026-04-29T15:00:00Z";
const execution_mode_boundary_contract: ExecutionModeBoundaryContract = {
  analysis_only: false,
  boundary_hash: "hash.execution-boundary.0132.integration",
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

function subject(value: string, ref: string, overrides = {}) {
  return {
    authority_scope_ref_or_null: "authority://hmrc/vat",
    basis_type_or_null: "VAT_RETURN",
    business_partition_ref_or_null: "partition://vat",
    component_ref: ref,
    observed_at: at,
    period_ref_or_null: "period://2026-Q1",
    reporting_scope_ref_or_null: "scope://client-0132/vat",
    subject_class: "ACKNOWLEDGEMENT" as const,
    subject_identity_code: "VAT_ACK",
    subject_ref: ref,
    value_normal_form: value,
    ...overrides,
  };
}

function pair(caseName: "partial" | "pending-expired" | "out-of-band" | "ready") {
  const twin_id = `twin-${caseName}-0132`;
  const internal = buildTwinStateSnapshotRecord({
    as_of: at,
    baseline_ref: "baseline://filed/vat/2026-Q1",
    baseline_state: "PROVED",
    comparison_basis_ref: "comparison-basis://0132",
    generated_at: at,
    lane_code: "INTERNAL_COMPUTED",
    subjects: [subject("100.00", `internal-subject://${caseName}`)],
    twin_id,
  });
  const authorityTruthState =
    caseName === "partial"
      ? "PARTIAL_ACK"
      : caseName === "pending-expired"
        ? "PENDING_ACK"
        : caseName === "out-of-band"
          ? "OUT_OF_BAND"
          : "CONFIRMED";
  const authority = buildTwinStateSnapshotRecord({
    as_of: at,
    authority_truth_state: authorityTruthState,
    baseline_ref: "baseline://filed/vat/2026-Q1",
    baseline_state: "PROVED",
    comparison_basis_ref: "comparison-basis://0132",
    generated_at: at,
    lane_code: "AUTHORITY",
    subjects: [
      subject(caseName === "ready" ? "100.00" : "101.00", `authority-subject://${caseName}`, {
        authority_admission: "AUTHORITY_ORIGINATED",
        authority_truth_state: authorityTruthState,
      }),
    ],
    twin_id,
  });
  return { authority, internal, twin_id };
}

async function build(caseName: "partial" | "pending-expired" | "out-of-band" | "ready") {
  const snapshots = pair(caseName);
  return buildTwinView({
    authority: snapshots.authority,
    built_at: at,
    decision_bundle_ref: caseName === "ready" ? "decision-bundle://ready-0132" : null,
    execution_mode_boundary_contract,
    filing_readiness: caseName === "ready" ? "READY_TO_SUBMIT" : "READY_REVIEW",
    gate_decision_refs: caseName === "ready" ? ["gate-decision://ready-0132"] : [],
    internal: snapshots.internal,
    manifest_id: `manifest-${caseName}-0132`,
    parity_result_ref: "parity-result://0132",
    reconciliation_profile:
      caseName === "pending-expired"
        ? { max_auto_attempts: 2, reconciliation_window_seconds: -1 }
        : undefined,
    trust_summary_ref: "trust-summary://0132",
    twin_id: snapshots.twin_id,
  });
}

test("twin build persists reconciliation and interpretation refs for partial acknowledgement", async () => {
  const result = await build("partial");

  expect(result.reconciliation.lifecycle_state).not.toBe("NOT_REQUIRED");
  expect(result.interpretation.dominant_attention_state).toBe("RECONCILIATION_REQUIRED");
  expect(result.view.reconciliation_state_ref).toContain("twin-reconciliation-state://");
  expect(result.view.interpretation_state_ref).toContain("twin-interpretation-state://");
  expect(result.view.reconciliation_state_ref).toBe(
    result.stored.reconciliation.twin_reconciliation_state_ref,
  );
  expect(result.view.interpretation_state_ref).toBe(
    result.stored.interpretation.twin_interpretation_state_ref,
  );
});

test("expired authority wait opens owned workflow instead of looping", async () => {
  const result = await build("pending-expired");

  expect(result.deltas[0].delta_class).toBe("ACK_PENDING");
  expect(result.reconciliation.lifecycle_state).toBe("WAITING_ON_OPERATOR");
  expect(result.reconciliation.next_action_owner).toBe("OPERATOR");
  expect(result.reconciliation.primary_workflow_item_ref_or_null).toContain(
    "workflow-item://twin-reconciliation/",
  );
});

test("out-of-band authority posture is interpretation-dominant and portfolio-ranked", async () => {
  const outOfBand = await build("out-of-band");
  const ready = await build("ready");
  const portfolio = await buildTwinPortfolioSummary({
    generated_at: at,
    scope_ref: "portfolio-scope://integration",
    tenant_id: "tenant-0132",
    twins: [
      {
        mismatch_summary: ready.summary,
        readiness: ready.readiness,
        reconciliation_state: ready.reconciliation,
        view: ready.view,
      },
      {
        mismatch_summary: outOfBand.summary,
        readiness: outOfBand.readiness,
        reconciliation_state: outOfBand.reconciliation,
        view: outOfBand.view,
      },
    ],
  });

  expect(outOfBand.interpretation.dominant_attention_state).toBe("OUT_OF_BAND");
  expect(outOfBand.reconciliation.lifecycle_state).toBe("WAITING_ON_OPERATOR");
  expect(portfolio.portfolio_summary.total_twin_count).toBe(2);
  expect(portfolio.portfolio_summary.ready_count).toBe(1);
  expect(portfolio.portfolio_summary.out_of_band_twin_count).toBe(1);
  expect(portfolio.portfolio_summary.top_twin_refs[0]).toBe(
    `twin-view://${outOfBand.view.twin_id}`,
  );
});
