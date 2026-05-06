import { appendManifestGates, type ManifestGateProjection } from "./append_manifest_gates.ts";
import type { GateDecisionRecord } from "../models/gate_decision_record.ts";

export type GateProjectionTransitionState =
  | "GATE_PROJECTION_APPENDED"
  | "GATE_PROJECTION_REBUILT";

export type TransitionGateProjectionInput = {
  effective_scope: readonly string[];
  gate_records: readonly GateDecisionRecord[];
  manifest_id: string;
  projection?: ManifestGateProjection | null;
  reason: "APPEND_GATE_BATCH" | "REPLAY_DURABLE_GATES";
};

export function transitionGateProjection(input: TransitionGateProjectionInput) {
  const projection = appendManifestGates({
    effective_scope: input.effective_scope,
    gate_records: input.gate_records,
    manifest_id: input.manifest_id,
    projection: input.reason === "REPLAY_DURABLE_GATES" ? null : input.projection,
  });
  return {
    projection,
    transition_state:
      input.reason === "REPLAY_DURABLE_GATES"
        ? "GATE_PROJECTION_REBUILT"
        : "GATE_PROJECTION_APPENDED",
  } as const;
}
