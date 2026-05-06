import type {
  RunManifestGateDecisionRecord,
  RunManifestRecord,
} from "../models/run_manifest.ts";
import type { PresealGateResult } from "../types/preseal_gate_result.ts";
import { appendManifestGates } from "./append_manifest_gates.ts";
import { buildPresealGateEvaluation } from "./build_preseal_gate_evaluation.ts";
import { updateManifestGates } from "./update_manifest_gates.ts";

export type PersistGateBatchKind = "PRESEAL" | "POSTSEAL_APPEND";

export type PersistGateBatchResult = PresealGateResult & {
  manifest: RunManifestRecord;
  persisted_gate_refs: string[];
};

export function persistGateBatch(input: {
  batch_kind?: PersistGateBatchKind;
  gate_records: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
  missing_prerequisite_refs?: string[];
}): PersistGateBatchResult {
  const batchKind = input.batch_kind ?? "PRESEAL";
  if (batchKind === "POSTSEAL_APPEND") {
    const manifest = appendManifestGates({
      manifest: input.manifest,
      gate_records: input.gate_records,
    });
    const presealEvaluation = manifest.preseal_gate_evaluation!;
    return {
      manifest,
      preseal_gate_evaluation: presealEvaluation,
      completion_state: presealEvaluation.completion_state,
      gate_records: input.gate_records.map((gate) => structuredClone(gate)),
      blocking_gate_codes: presealEvaluation.blocking_gate_codes,
      missing_prerequisite_refs: presealEvaluation.missing_prerequisite_refs,
      persisted_gate_refs: input.gate_records.map((gate) => gate.gate_decision_id),
      reason_codes: ["POSTSEAL_GATES_APPENDED"],
    };
  }

  const buildInput: Parameters<typeof buildPresealGateEvaluation>[0] = {
    manifest: input.manifest,
    gate_records: input.gate_records,
  };
  if (input.missing_prerequisite_refs !== undefined) {
    buildInput.missing_prerequisite_refs = input.missing_prerequisite_refs;
  }
  const preseal = buildPresealGateEvaluation(buildInput);
  const manifest = updateManifestGates({
    manifest: {
      ...structuredClone(input.manifest),
      preseal_gate_evaluation: preseal.preseal_gate_evaluation,
    },
    gate_records: preseal.gate_records,
  });
  return {
    ...preseal,
    manifest,
    persisted_gate_refs: preseal.gate_records.map((gate) => gate.gate_decision_id),
  };
}
