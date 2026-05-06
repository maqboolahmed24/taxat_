import type {
  ReplayBasisIntegrityContract,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  PRESEAL_REQUIRED_GATE_CODES,
  type RunManifestGateDecisionRecord,
  type RunManifestRecord,
} from "../../../backend-manifest/src/index.ts";
import {
  ensureHistoricalArtifactReadable,
  HistoricalReplayBasisLoadError,
  type HistoricalArtifactLoadReceipt,
  type HistoricalArtifactReadPolicy,
} from "./load_historical_config_freeze.ts";

export type LoadedHistoricalPresealGateContext = {
  artifact_load_receipt: HistoricalArtifactLoadReceipt;
  basis_integrity_fragment: Pick<
    ReplayBasisIntegrityContract,
    "preseal_gate_source_class"
  >;
  evaluation: NonNullable<RunManifestRecord["preseal_gate_evaluation"]>;
  gates: RunManifestGateDecisionRecord[];
};

function retainedPresealGates(sourceManifest: RunManifestRecord) {
  const gates = sourceManifest.append_only_outcome_projection?.gating_decisions?.length
    ? sourceManifest.append_only_outcome_projection.gating_decisions
    : sourceManifest.gating_decisions;
  return gates.filter((gate) =>
    PRESEAL_REQUIRED_GATE_CODES.includes(gate.gate_code as (typeof PRESEAL_REQUIRED_GATE_CODES)[number]),
  );
}

export function loadHistoricalPresealGateContext(input: {
  read_policy?: HistoricalArtifactReadPolicy;
  source_manifest: RunManifestRecord;
}): LoadedHistoricalPresealGateContext {
  ensureHistoricalArtifactReadable({
    artifact_kind: "PRESEAL_GATE_TAPE",
    policy: input.read_policy,
  });

  const evaluation = input.source_manifest.preseal_gate_evaluation;
  if (evaluation == null) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "PRESEAL_GATE_TAPE",
      basis_validation_state: "MISSING_DEPENDENCY",
      code: "HISTORICAL_PRESEAL_GATE_TAPE_MISSING",
      detail: "source manifest does not retain preseal gate evaluation",
    });
  }
  if (evaluation.execution_basis_hash !== input.source_manifest.hash_set?.execution_basis_hash) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "PRESEAL_GATE_TAPE",
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: "preseal gate evaluation must bind the source execution_basis_hash",
    });
  }
  if (evaluation.completion_state !== "COMPLETE_READY_TO_SEAL") {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "PRESEAL_GATE_TAPE",
      basis_validation_state: "MISSING_DEPENDENCY",
      code: "HISTORICAL_PRESEAL_GATE_TAPE_MISSING",
      detail: "preseal gate evaluation is not complete and ready to seal",
    });
  }

  const gates = retainedPresealGates(input.source_manifest);
  const gateIds = new Set(gates.map((gate) => gate.gate_decision_id));
  const missingGateIds = evaluation.ordered_gate_decision_ids.filter((id) => !gateIds.has(id));
  if (
    gates.length !== PRESEAL_REQUIRED_GATE_CODES.length ||
    evaluation.ordered_gate_decision_ids.length !== PRESEAL_REQUIRED_GATE_CODES.length ||
    missingGateIds.length > 0
  ) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "PRESEAL_GATE_TAPE",
      basis_validation_state: "MISSING_DEPENDENCY",
      code: "HISTORICAL_PRESEAL_GATE_TAPE_MISSING",
      detail: "retained preseal gate tape must contain the complete ordered gate prefix",
    });
  }

  return {
    artifact_load_receipt: {
      artifact_kind: "PRESEAL_GATE_TAPE",
      artifact_ref: `preseal-gate-tape://${input.source_manifest.manifest_id}`,
      artifact_type: "PresealGateEvaluation",
      basis_validation_state: "VALID",
      content_hash: evaluation.execution_basis_hash,
      decryptability_verified: input.read_policy?.decryptable !== false,
      schema_reader_compatible: input.read_policy?.reader_schema_compatible !== false,
    },
    basis_integrity_fragment: {
      preseal_gate_source_class: "HISTORICAL_PRESEAL_TAPE_REUSED",
    },
    evaluation: structuredClone(evaluation),
    gates: structuredClone(gates),
  };
}
