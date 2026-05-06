import { expect, test } from "@playwright/test";

import {
  evaluateGateChain,
  gateDecisionRef,
  getCanonicalGateStageProfile,
} from "../../../packages/backend-compute/src/index.ts";

const PRESEAL_CODES = [
  "MANIFEST_GATE",
  "ARTIFACT_CONTRACT_GATE",
  "INPUT_BOUNDARY_GATE",
  "DATA_QUALITY_GATE",
] as const;

test("materializes canonical non-access order with conditional action gates only when scoped", () => {
  expect(
    getCanonicalGateStageProfile({ effective_scope: ["year_end"] }).map(
      (profile) => profile.gate_code,
    ),
  ).toEqual([
    "MANIFEST_GATE",
    "ARTIFACT_CONTRACT_GATE",
    "INPUT_BOUNDARY_GATE",
    "DATA_QUALITY_GATE",
    "RETENTION_EVIDENCE_GATE",
    "PARITY_GATE",
    "TRUST_GATE",
  ]);

  expect(
    getCanonicalGateStageProfile({ effective_scope: ["year_end", "amendment_submit"] }).map(
      (profile) => profile.gate_code,
    ),
  ).toEqual([
    "MANIFEST_GATE",
    "ARTIFACT_CONTRACT_GATE",
    "INPUT_BOUNDARY_GATE",
    "DATA_QUALITY_GATE",
    "RETENTION_EVIDENCE_GATE",
    "PARITY_GATE",
    "TRUST_GATE",
    "AMENDMENT_GATE",
    "FILING_GATE",
    "SUBMISSION_GATE",
  ]);

  expect(
    getCanonicalGateStageProfile({ effective_scope: ["year_end", "prepare_submission"] }).map(
      (profile) => profile.gate_code,
    ),
  ).not.toContain("SUBMISSION_GATE");
});

test("evaluates preseal gates in stable order and freezes prerequisite refs", () => {
  const result = evaluateGateChain({
    effective_scope: ["year_end"],
    gate_inputs: PRESEAL_CODES.map((gate_code) => ({ gate_code })),
    manifest_id: "manifest-0126-preseal",
    required_gate_codes: PRESEAL_CODES,
  });

  expect(result.deferred_gate_codes).toEqual([]);
  expect(result.gate_records.map((record) => record.gate_code)).toEqual([...PRESEAL_CODES]);
  expect(result.gate_records.map((record) => record.gate_stage_index)).toEqual([1, 2, 3, 4]);
  expect(result.gate_records[0].prerequisite_gate_refs).toEqual([]);
  expect(result.gate_records[1].prerequisite_gate_refs).toEqual([
    gateDecisionRef(result.gate_records[0]),
  ]);
  expect(result.gate_records[2].prerequisite_gate_refs).toEqual([
    gateDecisionRef(result.gate_records[0]),
    gateDecisionRef(result.gate_records[1]),
  ]);
});

test("defers the first missing required gate input instead of treating it as inapplicable", () => {
  const result = evaluateGateChain({
    effective_scope: ["year_end"],
    gate_inputs: [{ gate_code: "MANIFEST_GATE" }, { gate_code: "ARTIFACT_CONTRACT_GATE" }],
    manifest_id: "manifest-0126-missing",
    required_gate_codes: PRESEAL_CODES,
  });

  expect(result.gate_records.map((record) => record.gate_code)).toEqual([
    "MANIFEST_GATE",
    "ARTIFACT_CONTRACT_GATE",
  ]);
  expect(result.deferred_gate_codes).toEqual(["INPUT_BOUNDARY_GATE"]);
  expect(result.missing_prerequisite_refs).toEqual([
    "gate-input://manifest-0126-missing/input_boundary_gate",
  ]);
});

test("rejects duplicate inputs and backwards persisted prefixes", () => {
  expect(() =>
    evaluateGateChain({
      effective_scope: ["year_end"],
      gate_inputs: [{ gate_code: "MANIFEST_GATE" }, { gate_code: "MANIFEST_GATE" }],
      manifest_id: "manifest-0126-duplicate",
      required_gate_codes: PRESEAL_CODES,
    }),
  ).toThrow(/multiple gate input/);

  const full = evaluateGateChain({
    effective_scope: ["year_end"],
    gate_inputs: PRESEAL_CODES.map((gate_code) => ({ gate_code })),
    manifest_id: "manifest-0126-backwards",
    required_gate_codes: PRESEAL_CODES,
  });
  expect(() =>
    evaluateGateChain({
      effective_scope: ["year_end"],
      existing_gate_records: [full.gate_records[1]],
      gate_inputs: [{ gate_code: "MANIFEST_GATE" }],
      manifest_id: "manifest-0126-backwards",
      required_gate_codes: PRESEAL_CODES,
    }),
  ).toThrow(/required earlier MANIFEST_GATE/);
});

test("does not let later passes downgrade an earlier hard block", () => {
  const blocked = evaluateGateChain({
    effective_scope: ["year_end"],
    gate_inputs: [
      { gate_code: "MANIFEST_GATE" },
      {
        decision: "HARD_BLOCK",
        gate_code: "ARTIFACT_CONTRACT_GATE",
        reason_codes: ["ARTIFACT_CONTRACT_MISMATCH"],
      },
    ],
    manifest_id: "manifest-0126-hard-block",
    required_gate_codes: ["MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE"],
  });
  const continued = evaluateGateChain({
    effective_scope: ["year_end"],
    existing_gate_records: blocked.ordered_gate_records,
    gate_inputs: [{ gate_code: "INPUT_BOUNDARY_GATE" }],
    manifest_id: "manifest-0126-hard-block",
    required_gate_codes: ["MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE", "INPUT_BOUNDARY_GATE"],
  });

  expect(continued.progression_ceiling_rank).toBe(0);
  expect(continued.blocking_gate_codes).toEqual(["ARTIFACT_CONTRACT_GATE"]);
  expect(continued.gate_records[0].decision).toBe("PASS");
});
