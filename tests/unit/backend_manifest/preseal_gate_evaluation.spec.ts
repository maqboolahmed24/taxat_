import { expect, test } from "@playwright/test";

import {
  AppendManifestGatesError,
  PresealGateChainValidationError,
  appendManifestGates,
  assertPresealGateChain,
  buildPresealGateEvaluation,
  buildRunManifestGateDecisionRecord,
  persistGateBatch,
  validateSealReadiness,
  type RunManifestGateDecisionRecord,
  type RunManifestRecord,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildFrozenBasis,
  buildPresealPassGates,
} from "../../fixtures/run_manifest_fixture.ts";

function frozenManifest(manifestId: string): RunManifestRecord {
  const allocated = buildBaseAllocatedManifest({
    manifest_id: manifestId,
    idempotency_key: `idempotency://${manifestId}`,
  });
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-27T12:10:00Z",
    ...buildFrozenBasis(allocated),
  } as unknown as RunManifestRecord;
  const pending = buildPresealGateEvaluation({ manifest: frozen });
  return {
    ...frozen,
    preseal_gate_evaluation: pending.preseal_gate_evaluation,
  };
}

function blockedDataQualityGate(
  manifest: RunManifestRecord,
  priorGates: RunManifestGateDecisionRecord[],
) {
  return buildRunManifestGateDecisionRecord({
    manifest_id: manifest.manifest_id,
    gate_code: "DATA_QUALITY_GATE",
    gate_stage_index: 4,
    effective_scope: manifest.access_decision?.effective_scope ?? manifest.requested_scope,
    decision: "HARD_BLOCK",
    reason_codes: ["DATA_QUALITY_HARD_BLOCK"],
    prerequisite_gate_refs: priorGates.map((gate) => gate.gate_decision_id),
    decided_at: "2026-04-27T12:15:00Z",
  });
}

test("preseal gate evaluation maps canonical ready and blocked tapes", () => {
  const manifest = frozenManifest("manifest.run.preseal-gates.0105");
  const gates = buildPresealPassGates(manifest);
  const ready = buildPresealGateEvaluation({ manifest, gate_records: gates });

  expect(ready.completion_state).toBe("COMPLETE_READY_TO_SEAL");
  expect(ready.preseal_gate_evaluation.evaluated_gate_codes).toEqual([
    "MANIFEST_GATE",
    "ARTIFACT_CONTRACT_GATE",
    "INPUT_BOUNDARY_GATE",
    "DATA_QUALITY_GATE",
  ]);
  expect(ready.preseal_gate_evaluation.ordered_gate_decision_ids).toEqual(
    gates.map((gate) => gate.gate_decision_id),
  );

  const blockedGates = [...gates.slice(0, 3), blockedDataQualityGate(manifest, gates.slice(0, 3))];
  const blocked = buildPresealGateEvaluation({ manifest, gate_records: blockedGates });
  expect(blocked.completion_state).toBe("COMPLETE_BLOCKED_PRESTART");
  expect(blocked.blocking_gate_codes).toEqual(["DATA_QUALITY_GATE"]);
  expect(blocked.preseal_gate_evaluation.durability_boundary).toBe(
    "PERSIST_PRESTART_TERMINAL_CONTEXT",
  );
});

test("pending prerequisites publish no persisted gate tape", () => {
  const manifest = frozenManifest("manifest.run.preseal-pending.0105");
  const pending = buildPresealGateEvaluation({
    manifest,
    missing_prerequisite_refs: ["snapshot://pending-0105"],
  });

  expect(pending.completion_state).toBe("PENDING_PREREQUISITES");
  expect(pending.gate_records).toEqual([]);
  expect(pending.preseal_gate_evaluation.ordered_gate_decision_ids).toEqual([]);
  expect(pending.preseal_gate_evaluation.missing_prerequisite_refs).toEqual([
    "snapshot://pending-0105",
  ]);
});

test("preseal chain validator rejects order and prerequisite drift", () => {
  const manifest = frozenManifest("manifest.run.preseal-drift.0105");
  const gates = buildPresealPassGates(manifest);
  const drifted = [gates[1]!, gates[0]!, ...gates.slice(2)];

  expect(() =>
    assertPresealGateChain({
      manifest,
      gate_records: drifted,
    }),
  ).toThrow(PresealGateChainValidationError);
});

test("seal readiness requires a fully materialized ready preseal tape", () => {
  const manifest = frozenManifest("manifest.run.preseal-readiness.0105");
  expect(validateSealReadiness(manifest).valid).toBe(false);

  const persisted = persistGateBatch({
    manifest,
    gate_records: buildPresealPassGates(manifest),
  });
  const readiness = validateSealReadiness(persisted.manifest);
  expect(readiness.valid).toBe(true);
});

test("later gate append preserves the frozen preseal prefix", () => {
  const manifest = frozenManifest("manifest.run.preseal-append.0105");
  const persisted = persistGateBatch({
    manifest,
    gate_records: buildPresealPassGates(manifest),
  });
  const laterGate = buildRunManifestGateDecisionRecord({
    manifest_id: manifest.manifest_id,
    gate_code: "TRUST_GATE",
    gate_stage_index: 5,
    effective_scope: manifest.access_decision?.effective_scope ?? manifest.requested_scope,
    decision: "PASS_WITH_NOTICE",
    reason_codes: ["TRUST_NOTICE_RETAINED"],
  });
  const appended = appendManifestGates({
    manifest: persisted.manifest,
    gate_records: [laterGate],
  });
  expect(appended.gating_decisions.map((gate) => gate.gate_code)).toEqual([
    "MANIFEST_GATE",
    "ARTIFACT_CONTRACT_GATE",
    "INPUT_BOUNDARY_GATE",
    "DATA_QUALITY_GATE",
    "TRUST_GATE",
  ]);

  expect(() =>
    appendManifestGates({
      manifest: appended,
      gate_records: [
        {
          ...appended.gating_decisions[0]!,
          decision: "PASS_WITH_NOTICE",
          reason_codes: ["DOWNGRADE_ATTEMPT"],
        },
      ],
    }),
  ).toThrow(AppendManifestGatesError);
});
