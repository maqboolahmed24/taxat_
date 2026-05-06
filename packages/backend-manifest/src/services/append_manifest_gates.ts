import type {
  RunManifestGateDecisionRecord,
  RunManifestRecord,
} from "../models/run_manifest.ts";
import { updateManifestGates } from "./update_manifest_gates.ts";
import {
  assertPresealGateChain,
  isPresealGateCode,
} from "./preseal_gate_chain_validator.ts";

export type AppendManifestGatesErrorCode =
  | "MANIFEST_GATE_APPEND_DUPLICATE_ID"
  | "MANIFEST_GATE_APPEND_PRESEAL_PREFIX_REQUIRED"
  | "MANIFEST_GATE_APPEND_PRESEAL_REWRITE"
  | "MANIFEST_GATE_APPEND_STAGE_ORDER_INVALID";

export class AppendManifestGatesError extends Error {
  readonly code: AppendManifestGatesErrorCode;

  constructor(code: AppendManifestGatesErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AppendManifestGatesError";
    this.code = code;
  }
}

export function appendManifestGates(input: {
  gate_records: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
}): RunManifestRecord {
  if (
    input.manifest.preseal_gate_evaluation == null ||
    input.manifest.preseal_gate_evaluation.completion_state === "PENDING_PREREQUISITES"
  ) {
    throw new AppendManifestGatesError(
      "MANIFEST_GATE_APPEND_PRESEAL_PREFIX_REQUIRED",
      "later gate append requires a persisted complete pre-seal gate prefix",
    );
  }
  assertPresealGateChain({
    manifest: input.manifest,
    gate_records: input.manifest.gating_decisions,
    evaluation: input.manifest.preseal_gate_evaluation,
  });

  const currentGateIds = new Set(
    input.manifest.gating_decisions.map((gate) => gate.gate_decision_id),
  );
  const nextGates = structuredClone(input.manifest.gating_decisions);
  let previousStageIndex = nextGates.at(-1)?.gate_stage_index ?? 0;
  for (const gate of input.gate_records) {
    if (isPresealGateCode(gate.gate_code)) {
      throw new AppendManifestGatesError(
        "MANIFEST_GATE_APPEND_PRESEAL_REWRITE",
        "pre-seal gate records cannot be appended or rewritten after publication",
      );
    }
    if (currentGateIds.has(gate.gate_decision_id)) {
      throw new AppendManifestGatesError(
        "MANIFEST_GATE_APPEND_DUPLICATE_ID",
        `gate_decision_id ${gate.gate_decision_id} already exists on the manifest tape`,
      );
    }
    if (gate.gate_stage_index <= previousStageIndex) {
      throw new AppendManifestGatesError(
        "MANIFEST_GATE_APPEND_STAGE_ORDER_INVALID",
        "post-seal gates must append after the current manifest gate tape",
      );
    }
    currentGateIds.add(gate.gate_decision_id);
    previousStageIndex = gate.gate_stage_index;
    nextGates.push(structuredClone(gate));
  }

  return updateManifestGates({
    manifest: input.manifest,
    gate_records: nextGates,
  });
}
