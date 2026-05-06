import { expect, test } from "@playwright/test";

import {
  buildGateDecisionRecord,
  GATE_TRUTH_BOUNDARY_CONTRACT,
  GateDecisionRecordModelError,
} from "../../../packages/backend-compute/src/index.ts";

test("builds a schema-shaped pass record with canonical scope and mirrored contracts", () => {
  const record = buildGateDecisionRecord({
    decided_at: "2026-04-28T12:00:00Z",
    effective_scope: ["submit", "year_end"],
    gate_code: "MANIFEST_GATE",
    manifest_id: "manifest-0126-contract",
  });

  expect(record.artifact_type).toBe("GateDecisionRecord");
  expect(record.gate_stage_index).toBe(1);
  expect(record.effective_scope).toEqual(["year_end", "submit"]);
  expect(record.reason_codes).toEqual(["GATE_PASS"]);
  expect(record.dominant_reason_code).toBe(record.reason_codes[0]);
  expect(record.severity).toBe("INFO");
  expect(record.gate_semantics_contract).toMatchObject({
    blocking_class: "NON_BLOCKING",
    decision_rank: 0,
    override_dependency_state: "OVERRIDE_INDEPENDENT",
    progression_rank: 2,
    progression_semantics: "AUTOMATED_CONTINUE",
  });
  expect(record.decision_explainability_contract).toMatchObject({
    artifact_family: "GATE_DECISION_RECORD",
    dominant_reason_code: "GATE_PASS",
    ordered_reason_codes: ["GATE_PASS"],
    plain_text_field_name: "plain_explanation",
  });
  expect(record.truth_boundary_contract).toEqual(GATE_TRUTH_BOUNDARY_CONTRACT);
});

test("keeps VALID_OVERRIDE_ACTIVE governed and requires active override refs", () => {
  const record = buildGateDecisionRecord({
    active_override_refs: ["override://b", "override://a"],
    decision: "PASS_WITH_NOTICE",
    effective_scope: ["year_end"],
    gate_code: "MANIFEST_GATE",
    manifest_id: "manifest-0126-override-active",
    override_resolution_state: "VALID_OVERRIDE_ACTIVE",
    reason_codes: ["TRUST_REVIEW_REQUIRED", "GATE_PASS_WITH_NOTICE"],
  });

  expect(record.active_override_refs).toEqual(["override://a", "override://b"]);
  expect(record.overrideability).toBe("NONE");
  expect(record.required_override_scope).toBeNull();
  expect(record.gate_semantics_contract.override_dependency_state).toBe("VALID_OVERRIDE_GOVERNED");
});

test("reserves NO_VALID_OVERRIDE exactly for overridable blocks", () => {
  const record = buildGateDecisionRecord({
    decision: "OVERRIDABLE_BLOCK",
    effective_scope: ["year_end"],
    gate_code: "MANIFEST_GATE",
    manifest_id: "manifest-0126-overridable",
  });

  expect(record.override_resolution_state).toBe("NO_VALID_OVERRIDE");
  expect(record.overrideability).toBe("SCOPED_OVERRIDE_REQUIRED");
  expect(record.required_override_scope).toBe("manifest_gate.override_scope");
  expect(record.active_override_refs).toEqual([]);
  expect(record.next_action_codes).toEqual(["RESOLVE_SCOPED_OVERRIDE"]);
  expect(record.gate_semantics_contract.override_dependency_state).toBe(
    "OVERRIDE_REQUIRED_MISSING",
  );
});

test("rejects invalid dominant reason, stage, and override posture", () => {
  expect(() =>
    buildGateDecisionRecord({
      dominant_reason_code: "SECONDARY_REASON",
      effective_scope: ["year_end"],
      gate_code: "MANIFEST_GATE",
      manifest_id: "manifest-0126-dominant",
      reason_codes: ["GATE_PASS", "SECONDARY_REASON"],
    }),
  ).toThrow(GateDecisionRecordModelError);

  expect(() =>
    buildGateDecisionRecord({
      decision: "MANUAL_REVIEW",
      effective_scope: ["year_end"],
      gate_code: "MANIFEST_GATE",
      manifest_id: "manifest-0126-bad-override",
      override_resolution_state: "NO_VALID_OVERRIDE",
    }),
  ).toThrow(/NO_VALID_OVERRIDE/);

  expect(() =>
    buildGateDecisionRecord({
      effective_scope: ["year_end"],
      gate_code: "ARTIFACT_CONTRACT_GATE",
      manifest_id: "manifest-0126-no-prereq",
    }),
  ).toThrow(/requires at least one prerequisite/);
});
