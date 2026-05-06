import type {
  ReplayBasisIntegrityContract,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  ReplayBasisValidationState,
  RunManifestRecord,
} from "../../../backend-manifest/src/index.ts";

export type HistoricalArtifactReadState =
  | "AVAILABLE"
  | "MISSING"
  | "CORRUPT"
  | "SCHEMA_INCOMPATIBLE"
  | "RETENTION_LIMITED"
  | "UNDECRYPTABLE"
  | "BUILD_UNAVAILABLE";

export type HistoricalReplayArtifactKind =
  | "CONFIG"
  | "INPUT"
  | "PRESEAL_GATE_TAPE"
  | "POST_SEAL"
  | "AUTHORITY_POST_SEAL"
  | "BASELINE_POST_SEAL"
  | "LATE_DATA_POST_SEAL"
  | "TEMPORAL_PROPAGATION_POST_SEAL";

export type HistoricalReplayBasisLoadErrorCode =
  | "HISTORICAL_CONFIG_FREEZE_MISSING"
  | "HISTORICAL_INPUT_FREEZE_MISSING"
  | "HISTORICAL_PRESEAL_GATE_TAPE_MISSING"
  | "HISTORICAL_POST_SEAL_BASIS_MISSING"
  | "HISTORICAL_ARTIFACT_TYPE_MISMATCH"
  | "HISTORICAL_ARTIFACT_HASH_MISMATCH"
  | "HISTORICAL_ARTIFACT_UNDECRYPTABLE"
  | "HISTORICAL_ARTIFACT_RETENTION_LIMITED"
  | "HISTORICAL_ARTIFACT_SCHEMA_INCOMPATIBLE"
  | "HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE"
  | "HISTORICAL_ARTIFACT_CORRUPT";

export type HistoricalArtifactReadPolicy = {
  availability_state?: HistoricalArtifactReadState;
  content_hash_verified?: boolean;
  decryptable?: boolean;
  reader_schema_compatible?: boolean;
  retention_available?: boolean;
  build_available?: boolean;
};

export type HistoricalArtifactLoadReceipt = {
  artifact_kind: HistoricalReplayArtifactKind;
  artifact_ref: string;
  artifact_type: string;
  basis_validation_state: ReplayBasisValidationState;
  content_hash: string;
  decryptability_verified: boolean;
  schema_reader_compatible: boolean;
};

export class HistoricalReplayBasisLoadError extends Error {
  readonly artifact_kind: HistoricalReplayArtifactKind;
  readonly basis_validation_state: ReplayBasisValidationState;
  readonly code: HistoricalReplayBasisLoadErrorCode;

  constructor(input: {
    artifact_kind: HistoricalReplayArtifactKind;
    basis_validation_state: ReplayBasisValidationState;
    code: HistoricalReplayBasisLoadErrorCode;
    detail: string;
  }) {
    super(`${input.code}: ${input.detail}`);
    this.name = "HistoricalReplayBasisLoadError";
    this.artifact_kind = input.artifact_kind;
    this.basis_validation_state = input.basis_validation_state;
    this.code = input.code;
  }
}

function throwLoadError(input: {
  artifact_kind: HistoricalReplayArtifactKind;
  basis_validation_state: ReplayBasisValidationState;
  code: HistoricalReplayBasisLoadErrorCode;
  detail: string;
}): never {
  throw new HistoricalReplayBasisLoadError(input);
}

export function mapHistoricalArtifactReadState(
  state: HistoricalArtifactReadState,
): ReplayBasisValidationState {
  switch (state) {
    case "AVAILABLE":
      return "VALID";
    case "MISSING":
      return "MISSING_DEPENDENCY";
    case "CORRUPT":
    case "UNDECRYPTABLE":
      return "CORRUPT";
    case "SCHEMA_INCOMPATIBLE":
      return "SCHEMA_INCOMPATIBLE";
    case "RETENTION_LIMITED":
      return "RETENTION_LIMITED";
    case "BUILD_UNAVAILABLE":
      return "BUILD_UNAVAILABLE";
  }
}

export function replayBasisLoadFailureForState(input: {
  artifact_kind: HistoricalReplayArtifactKind;
  state: Exclude<HistoricalArtifactReadState, "AVAILABLE">;
}): HistoricalReplayBasisLoadErrorCode {
  switch (input.state) {
    case "MISSING":
      if (input.artifact_kind === "CONFIG") {
        return "HISTORICAL_CONFIG_FREEZE_MISSING";
      }
      if (input.artifact_kind === "INPUT") {
        return "HISTORICAL_INPUT_FREEZE_MISSING";
      }
      if (input.artifact_kind === "PRESEAL_GATE_TAPE") {
        return "HISTORICAL_PRESEAL_GATE_TAPE_MISSING";
      }
      return "HISTORICAL_POST_SEAL_BASIS_MISSING";
    case "CORRUPT":
      return "HISTORICAL_ARTIFACT_CORRUPT";
    case "SCHEMA_INCOMPATIBLE":
      return "HISTORICAL_ARTIFACT_SCHEMA_INCOMPATIBLE";
    case "RETENTION_LIMITED":
      return "HISTORICAL_ARTIFACT_RETENTION_LIMITED";
    case "UNDECRYPTABLE":
      return "HISTORICAL_ARTIFACT_UNDECRYPTABLE";
    case "BUILD_UNAVAILABLE":
      return "HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE";
  }
}

export function ensureHistoricalArtifactReadable(input: {
  artifact_kind: HistoricalReplayArtifactKind;
  policy?: HistoricalArtifactReadPolicy | undefined;
}) {
  const state = input.policy?.availability_state ?? "AVAILABLE";
  if (state !== "AVAILABLE") {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: mapHistoricalArtifactReadState(state),
      code: replayBasisLoadFailureForState({
        artifact_kind: input.artifact_kind,
        state,
      }),
      detail: `${input.artifact_kind} historical artifact is ${state}`,
    });
  }
  if (input.policy?.retention_available === false) {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "RETENTION_LIMITED",
      code: "HISTORICAL_ARTIFACT_RETENTION_LIMITED",
      detail: `${input.artifact_kind} historical artifact is retention limited`,
    });
  }
  if (input.policy?.reader_schema_compatible === false) {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "SCHEMA_INCOMPATIBLE",
      code: "HISTORICAL_ARTIFACT_SCHEMA_INCOMPATIBLE",
      detail: `${input.artifact_kind} historical artifact has no compatible schema reader`,
    });
  }
  if (input.policy?.build_available === false) {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "BUILD_UNAVAILABLE",
      code: "HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE",
      detail: `${input.artifact_kind} historical artifact requires an unavailable build`,
    });
  }
  if (input.policy?.decryptable === false) {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_UNDECRYPTABLE",
      detail: `${input.artifact_kind} historical artifact cannot be decrypted`,
    });
  }
  if (input.policy?.content_hash_verified === false) {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: `${input.artifact_kind} historical artifact content hash was not verified`,
    });
  }
}

export function assertHistoricalArtifactType(input: {
  actual_artifact_type: string | null | undefined;
  artifact_kind: HistoricalReplayArtifactKind;
  expected_artifact_type: string;
}) {
  if (input.actual_artifact_type !== input.expected_artifact_type) {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_TYPE_MISMATCH",
      detail: `${input.artifact_kind} expected ${input.expected_artifact_type} but found ${input.actual_artifact_type ?? "<missing>"}`,
    });
  }
}

export function assertHistoricalHashMatches(input: {
  actual_hash: string | null | undefined;
  artifact_kind: HistoricalReplayArtifactKind;
  expected_hash: string | null | undefined;
  label: string;
}) {
  if (!input.actual_hash || !input.expected_hash || input.actual_hash !== input.expected_hash) {
    throwLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: `${input.artifact_kind} ${input.label} must match retained historical hash`,
    });
  }
}

export type LoadedHistoricalConfigFreeze = {
  artifact_load_receipt: HistoricalArtifactLoadReceipt;
  basis_integrity_fragment: Pick<
    ReplayBasisIntegrityContract,
    "config_basis_source_class"
  >;
  config_freeze: NonNullable<RunManifestRecord["config_freeze"]>;
};

export function loadHistoricalConfigFreeze(input: {
  expected_config_freeze_hash?: string | null;
  expected_config_freeze_ref?: string | null;
  read_policy?: HistoricalArtifactReadPolicy;
  source_manifest: RunManifestRecord;
}): LoadedHistoricalConfigFreeze {
  ensureHistoricalArtifactReadable({
    artifact_kind: "CONFIG",
    policy: input.read_policy,
  });

  const configFreeze = input.source_manifest.config_freeze;
  if (configFreeze == null) {
    throwLoadError({
      artifact_kind: "CONFIG",
      basis_validation_state: "MISSING_DEPENDENCY",
      code: "HISTORICAL_CONFIG_FREEZE_MISSING",
      detail: "source manifest does not retain config_freeze",
    });
  }

  assertHistoricalArtifactType({
    actual_artifact_type: configFreeze.artifact_type,
    artifact_kind: "CONFIG",
    expected_artifact_type: "ConfigFreeze",
  });
  const expectedRef =
    input.expected_config_freeze_ref ??
    input.source_manifest.frozen_execution_binding?.config_freeze_ref ??
    configFreeze.config_freeze_id;
  if (configFreeze.config_freeze_id !== expectedRef) {
    throwLoadError({
      artifact_kind: "CONFIG",
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: "config_freeze_id must match frozen execution binding ref",
    });
  }
  assertHistoricalHashMatches({
    actual_hash: configFreeze.config_freeze_hash,
    artifact_kind: "CONFIG",
    expected_hash:
      input.expected_config_freeze_hash ??
      input.source_manifest.frozen_execution_binding?.config_freeze_hash ??
      input.source_manifest.hash_set?.config_freeze_hash,
    label: "config_freeze_hash",
  });
  assertHistoricalHashMatches({
    actual_hash: configFreeze.config_surface_hash,
    artifact_kind: "CONFIG",
    expected_hash:
      input.source_manifest.frozen_execution_binding?.config_surface_hash ??
      input.source_manifest.hash_set?.config_surface_hash,
    label: "config_surface_hash",
  });
  if (configFreeze.config_consumption_mode !== "FROZEN_CONFIG_ONLY") {
    throwLoadError({
      artifact_kind: "CONFIG",
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_CORRUPT",
      detail: "historical config freeze must be consumed in FROZEN_CONFIG_ONLY mode",
    });
  }

  return {
    artifact_load_receipt: {
      artifact_kind: "CONFIG",
      artifact_ref: configFreeze.config_freeze_id,
      artifact_type: configFreeze.artifact_type,
      basis_validation_state: "VALID",
      content_hash: configFreeze.config_freeze_hash,
      decryptability_verified: input.read_policy?.decryptable !== false,
      schema_reader_compatible: input.read_policy?.reader_schema_compatible !== false,
    },
    basis_integrity_fragment: {
      config_basis_source_class: "HISTORICAL_FROZEN_REUSED",
    },
    config_freeze: structuredClone(configFreeze),
  };
}
