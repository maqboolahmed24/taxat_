import { expect, test } from "@playwright/test";

import {
  buildTwinStateSnapshotRecord,
  buildTwinView,
  type ExecutionModeBoundaryContract,
} from "../../../packages/backend-twin/src/index.ts";

const at = "2026-04-29T12:00:00Z";

const execution_mode_boundary_contract: ExecutionModeBoundaryContract = {
  analysis_only: false,
  boundary_hash: "hash.execution-boundary.0131",
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
    reporting_scope_ref_or_null: "scope://client-0131/vat",
    subject_class: "TOTAL" as const,
    subject_identity_code: "VAT_BOX_1",
    subject_ref: ref,
    value_normal_form: value,
    ...overrides,
  };
}

function snapshots(caseName: "partial" | "stale" | "contradictory" | "missing-baseline") {
  const baseline_state = caseName === "missing-baseline" ? "MISSING" : "PROVED";
  const baseline_ref = caseName === "missing-baseline" ? null : "baseline://filed/vat/2026-Q1";
  const internal = buildTwinStateSnapshotRecord({
    as_of: at,
    baseline_ref,
    baseline_state,
    comparison_basis_ref: "comparison-basis://0131",
    generated_at: at,
    lane_code: "INTERNAL_COMPUTED",
    subjects: [subject("100.00", "internal-subject://vat-box-1", { baseline_state })],
    twin_id: `twin-${caseName}-0131`,
  });
  const authority = buildTwinStateSnapshotRecord({
    as_of: at,
    authority_truth_state:
      caseName === "partial"
        ? "PARTIAL_ACK"
        : caseName === "contradictory"
          ? "CONFIRMED"
          : "CONFIRMED",
    baseline_ref,
    baseline_state,
    comparison_basis_ref: "comparison-basis://0131",
    contradictory_component_refs:
      caseName === "contradictory" ? ["authority-subject://vat-box-1"] : [],
    freshness_state: caseName === "stale" ? "STALE" : "LIVE",
    generated_at: at,
    lane_code: "AUTHORITY",
    subjects: [
      subject(caseName === "contradictory" ? "101.00" : "100.00", "authority-subject://vat-box-1", {
        authority_admission: "AUTHORITY_ORIGINATED",
        authority_truth_state: caseName === "partial" ? "PARTIAL_ACK" : "CONFIRMED",
        baseline_state,
        contradiction_component_refs:
          caseName === "contradictory" ? ["authority-subject://vat-box-1"] : [],
      }),
    ],
    twin_id: `twin-${caseName}-0131`,
  });
  return { authority, internal };
}

async function build(caseName: "partial" | "stale" | "contradictory" | "missing-baseline") {
  const pair = snapshots(caseName);
  return buildTwinView({
    authority: pair.authority,
    built_at: at,
    decision_bundle_ref: "decision-bundle://0131",
    execution_mode_boundary_contract,
    filing_readiness: "READY_TO_SUBMIT",
    gate_decision_refs: ["gate-decision://0131"],
    internal: pair.internal,
    manifest_id: `manifest-${caseName}-0131`,
    parity_result_ref: "parity-result://0131",
    trust_summary_ref: "trust-summary://0131",
  });
}

test("partial authority acknowledgement keeps twin in reconciliation posture", async () => {
  const result = await build("partial");

  expect(result.deltas[0].delta_class).toBe("ACK_PARTIAL");
  expect(result.readiness.twin_readiness_class).toBe("RECONCILIATION_REQUIRED");
  expect(result.readiness.reconciliation_mismatch_refs).toHaveLength(1);
});

test("stale authority snapshot makes the root stale and caps safe action", async () => {
  const result = await build("stale");

  expect(result.view.lifecycle_state).toBe("STALE");
  expect(result.deltas[0].delta_class).toBe("STALE_COMPARISON");
  expect(result.readiness.safe_action_state).toBe("REFRESH_REQUIRED");
  expect(result.readiness.usefulness_cap_reason_codes).toContain("AUTHORITY_STALE");
});

test("contradictory authority components surface explicit contradiction posture", async () => {
  const result = await build("contradictory");

  expect(result.authority.snapshot.assembly_state).toBe("CONTRADICTORY");
  expect(result.deltas[0].comparability_state).toBe("CONTRADICTORY");
  expect(result.readiness.twin_readiness_class).toBe("BLOCKED");
  expect(result.readiness.contradictory_mismatch_refs).toHaveLength(1);
});

test("missing legal baseline blocks decision-useful equivalence", async () => {
  const result = await build("missing-baseline");

  expect(result.deltas[0].delta_class).toBe("BASELINE_MISSING");
  expect(result.readiness.twin_readiness_class).toBe("BLOCKED");
  expect(result.readiness.no_safe_action_reason_codes).toContain("NO_SAFE_TWIN_ACTION");
});
