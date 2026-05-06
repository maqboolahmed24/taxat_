import type {
  ReplayBasisIntegrityContract,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RunManifestRecord } from "../../../backend-manifest/src/index.ts";
import {
  assertHistoricalArtifactType,
  assertHistoricalHashMatches,
  ensureHistoricalArtifactReadable,
  HistoricalReplayBasisLoadError,
  type HistoricalArtifactLoadReceipt,
  type HistoricalArtifactReadPolicy,
} from "./load_historical_config_freeze.ts";

export type LoadedHistoricalInputFreeze = {
  artifact_load_receipt: HistoricalArtifactLoadReceipt;
  basis_integrity_fragment: Pick<ReplayBasisIntegrityContract, "input_basis_source_class">;
  input_freeze: NonNullable<RunManifestRecord["input_freeze"]>;
};

export { HistoricalReplayBasisLoadError };

export function loadHistoricalInputFreeze(input: {
  expected_input_freeze_ref?: string | null;
  expected_input_set_hash?: string | null;
  read_policy?: HistoricalArtifactReadPolicy;
  source_manifest: RunManifestRecord;
}): LoadedHistoricalInputFreeze {
  ensureHistoricalArtifactReadable({
    artifact_kind: "INPUT",
    policy: input.read_policy,
  });

  const inputFreeze = input.source_manifest.input_freeze;
  if (inputFreeze == null) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "INPUT",
      basis_validation_state: "MISSING_DEPENDENCY",
      code: "HISTORICAL_INPUT_FREEZE_MISSING",
      detail: "source manifest does not retain input_freeze",
    });
  }

  assertHistoricalArtifactType({
    actual_artifact_type: inputFreeze.artifact_type,
    artifact_kind: "INPUT",
    expected_artifact_type: "InputFreeze",
  });
  const expectedRef =
    input.expected_input_freeze_ref ??
    input.source_manifest.frozen_execution_binding?.input_freeze_ref ??
    inputFreeze.input_freeze_id;
  if (inputFreeze.input_freeze_id !== expectedRef) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "INPUT",
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: "input_freeze_id must match frozen execution binding ref",
    });
  }
  assertHistoricalHashMatches({
    actual_hash: inputFreeze.input_set_hash,
    artifact_kind: "INPUT",
    expected_hash:
      input.expected_input_set_hash ??
      input.source_manifest.frozen_execution_binding?.input_set_hash ??
      input.source_manifest.hash_set?.input_set_hash,
    label: "input_set_hash",
  });
  assertHistoricalHashMatches({
    actual_hash: inputFreeze.source_window_hash,
    artifact_kind: "INPUT",
    expected_hash: input.source_manifest.frozen_execution_binding?.source_window_hash,
    label: "source_window_hash",
  });
  assertHistoricalHashMatches({
    actual_hash: inputFreeze.collection_boundary_hash,
    artifact_kind: "INPUT",
    expected_hash: input.source_manifest.frozen_execution_binding?.collection_boundary_hash,
    label: "collection_boundary_hash",
  });
  if (inputFreeze.input_consumption_mode !== "FROZEN_INPUT_ONLY") {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "INPUT",
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_CORRUPT",
      detail: "historical input freeze must be consumed in FROZEN_INPUT_ONLY mode",
    });
  }

  return {
    artifact_load_receipt: {
      artifact_kind: "INPUT",
      artifact_ref: inputFreeze.input_freeze_id,
      artifact_type: inputFreeze.artifact_type,
      basis_validation_state: "VALID",
      content_hash: inputFreeze.input_set_hash,
      decryptability_verified: input.read_policy?.decryptable !== false,
      schema_reader_compatible: input.read_policy?.reader_schema_compatible !== false,
    },
    basis_integrity_fragment: {
      input_basis_source_class: "HISTORICAL_FROZEN_REUSED",
    },
    input_freeze: structuredClone(inputFreeze),
  };
}
