import {
  buildEmptyRunManifestAppendOnlyOutcomeProjection,
  type RunManifestGateDecisionRecord,
  type RunManifestRecord,
} from "../models/run_manifest.ts";
import { synchronizeManifestOutcomeProjectionMirrors } from "./output_ref_projection_normalizer.ts";
import {
  assertPresealGateChain,
  assertPresealPrefixUnchanged,
} from "./preseal_gate_chain_validator.ts";

export type UpdateManifestGatesErrorCode =
  | "MANIFEST_GATE_BATCH_DUPLICATE_ID"
  | "MANIFEST_GATE_BATCH_STAGE_ORDER_INVALID";

export class UpdateManifestGatesError extends Error {
  readonly code: UpdateManifestGatesErrorCode;

  constructor(code: UpdateManifestGatesErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "UpdateManifestGatesError";
    this.code = code;
  }
}

function assertGateBatchIdentity(gateRecords: RunManifestGateDecisionRecord[]) {
  const seenIds = new Set<string>();
  let previousStageIndex = 0;
  for (const gate of gateRecords) {
    if (seenIds.has(gate.gate_decision_id)) {
      throw new UpdateManifestGatesError(
        "MANIFEST_GATE_BATCH_DUPLICATE_ID",
        `gate batch contains duplicate gate_decision_id ${gate.gate_decision_id}`,
      );
    }
    seenIds.add(gate.gate_decision_id);
    if (gate.gate_stage_index <= previousStageIndex) {
      throw new UpdateManifestGatesError(
        "MANIFEST_GATE_BATCH_STAGE_ORDER_INVALID",
        "gate_stage_index values must be strictly increasing in persisted order",
      );
    }
    previousStageIndex = gate.gate_stage_index;
  }
}

export function updateManifestGates(input: {
  gate_records: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
}): RunManifestRecord {
  const gateRecords = structuredClone(input.gate_records);
  assertGateBatchIdentity(gateRecords);
  if (
    input.manifest.preseal_gate_evaluation != null &&
    input.manifest.preseal_gate_evaluation.completion_state !== "PENDING_PREREQUISITES"
  ) {
    assertPresealGateChain({
      manifest: input.manifest,
      gate_records: gateRecords,
      evaluation: input.manifest.preseal_gate_evaluation,
    });
    assertPresealPrefixUnchanged({
      current_gate_records: input.manifest.gating_decisions,
      next_gate_records: gateRecords,
    });
  }

  const projection = structuredClone(
    input.manifest.append_only_outcome_projection ??
      buildEmptyRunManifestAppendOnlyOutcomeProjection(),
  );
  projection.gating_decisions = gateRecords;
  projection.projection_generation = Math.max(
    projection.projection_generation,
    input.manifest.append_only_outcome_projection?.projection_generation ?? 0,
  );

  return synchronizeManifestOutcomeProjectionMirrors({
    ...structuredClone(input.manifest),
    append_only_outcome_projection: projection,
  });
}
