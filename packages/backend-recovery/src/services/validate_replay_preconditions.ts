import type {
  ReplayBasisIntegrityContract,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  LIVE_MANIFEST_SCOPE_TOKENS,
  evaluateSchemaReaderWindowGuard,
  type BuildReplayBasisIntegrityContractInput,
  type OutcomeComponentClass,
  type ReplayBasisValidationState,
  type RunManifestRecord,
  type RunManifestReplayClass,
} from "../../../backend-manifest/src/index.ts";
import type {
  HistoricalArtifactReadState,
  HistoricalReplayArtifactKind,
} from "./load_historical_config_freeze.ts";

export type ReplayExecutionPath =
  | "EXACT_REPLAY"
  | "SAME_ATTEMPT_RECOVERY"
  | "COUNTERFACTUAL_ANALYSIS";

export type ReplayCounterfactualDimension =
  ReplayBasisIntegrityContract["declared_counterfactual_dimensions"][number];

export type ReplayPreconditionFailureCode =
  | "SOURCE_MANIFEST_NOT_REPLAYABLE"
  | "SOURCE_MANIFEST_NOT_RECOVERABLE"
  | "REPLAY_LINEAGE_EDGE_INVALID"
  | "REPLAY_CHILD_REQUIRED"
  | "RECOVERY_CHILD_REQUIRED"
  | "CONFIG_INHERITANCE_NOT_EXACT"
  | "INPUT_INHERITANCE_NOT_EXACT"
  | "EXECUTION_BASIS_HASH_MISSING"
  | "EXECUTION_BASIS_HASH_MISMATCH"
  | "FROZEN_CONFIG_MISSING"
  | "FROZEN_INPUT_MISSING"
  | "FROZEN_EXECUTION_BINDING_MISSING"
  | "PRESEAL_GATE_TAPE_MISSING"
  | "POST_SEAL_BASIS_MISSING"
  | "SCHEMA_READER_INCOMPATIBLE"
  | "HISTORICAL_ARTIFACT_CORRUPT"
  | "HISTORICAL_ARTIFACT_RETENTION_LIMITED"
  | "HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE"
  | "HISTORICAL_ARTIFACT_UNDECRYPTABLE"
  | "LIVE_MUTATION_SCOPE_FORBIDDEN"
  | "FRESH_CONFIG_RESOLUTION_FORBIDDEN"
  | "LIVE_CONNECTOR_READ_FORBIDDEN"
  | "LIVE_AUTHORITY_READ_FORBIDDEN"
  | "LATE_DATA_RESCAN_FORBIDDEN"
  | "COUNTERFACTUAL_BASIS_MISSING"
  | "NON_PERSISTED_OUTCOME_MATERIAL";

export type ReplayPreconditionArtifactStates = Partial<
  Record<HistoricalReplayArtifactKind, HistoricalArtifactReadState>
>;

export type ValidateReplayPreconditionsInput = {
  declared_counterfactual_dimensions?: readonly ReplayCounterfactualDimension[];
  exact_historical_schema_bundle_available?: boolean;
  fresh_config_resolution_requested?: boolean;
  fresh_source_collection_requested?: boolean;
  historical_artifact_states?: ReplayPreconditionArtifactStates;
  late_data_rescan_requested?: boolean;
  live_authority_read_requested?: boolean;
  live_connector_read_requested?: boolean;
  live_mutation_scope_tokens?: readonly string[];
  non_persisted_outcome_component_classes?: readonly OutcomeComponentClass[];
  replay_class?: RunManifestReplayClass;
  replay_manifest: RunManifestRecord;
  replay_reader_schema_bundle_hash_or_null?: string | null;
  source_manifest: RunManifestRecord;
  transport_recovery_metadata?: Record<string, unknown>;
  counterfactual_basis?: string | null;
};

export type ReplayPreconditionResult = {
  actual_execution_basis_hash: string | null;
  basis_integrity_contract: BuildReplayBasisIntegrityContractInput;
  basis_validation_state: ReplayBasisValidationState;
  exact_replay_claim_allowed: boolean;
  expected_execution_basis_hash: string | null;
  failure_codes: ReplayPreconditionFailureCode[];
  precondition_state: "READY" | "BLOCKED";
  replay_class: RunManifestReplayClass;
  replay_manifest_id: string;
  replay_path: ReplayExecutionPath;
  schema_reader_guard_reason_codes: string[];
  source_manifest_id: string;
};

const REPLAYABLE_SOURCE_STATES = new Set<RunManifestRecord["lifecycle_state"]>([
  "COMPLETED",
  "REPLAY_ONLY",
  "SUPERSEDED",
  "RETIRED",
  "FAILED",
  "BLOCKED",
]);

const RECOVERABLE_SOURCE_STATES = new Set<RunManifestRecord["lifecycle_state"]>([
  "SEALED",
  "IN_PROGRESS",
  "BLOCKED",
  "FAILED",
]);

function replayClassFor(input: ValidateReplayPreconditionsInput): RunManifestReplayClass {
  return (
    input.replay_class ??
    input.replay_manifest.replay_class ??
    (input.replay_manifest.run_kind === "REPLAY" ? "STANDARD_REPLAY" : "STANDARD_REPLAY")
  );
}

function replayPathFor(input: {
  replay_class: RunManifestReplayClass;
  replay_manifest: RunManifestRecord;
}) {
  if (input.replay_class === "COUNTERFACTUAL_ANALYSIS") {
    return "COUNTERFACTUAL_ANALYSIS" as const;
  }
  if (input.replay_manifest.continuation_basis === "RECOVERY_CHILD") {
    return "SAME_ATTEMPT_RECOVERY" as const;
  }
  return "EXACT_REPLAY" as const;
}

function executionBasisHash(manifest: RunManifestRecord) {
  return (
    manifest.hash_set?.execution_basis_hash ??
    manifest.frozen_execution_binding?.execution_basis_hash ??
    null
  );
}

function hasMutationScope(input: ValidateReplayPreconditionsInput) {
  const explicitTokens = input.live_mutation_scope_tokens ?? [];
  if (explicitTokens.length > 0) {
    return true;
  }
  return [...input.replay_manifest.requested_scope, ...input.replay_manifest.scope_execution_binding.executable_scope].some(
    (scope) => LIVE_MANIFEST_SCOPE_TOKENS.has(scope),
  );
}

function addArtifactStateFailures(input: {
  basis_integrity: BuildReplayBasisIntegrityContractInput;
  failures: Set<ReplayPreconditionFailureCode>;
  states: ReplayPreconditionArtifactStates;
}) {
  for (const [artifactKind, state] of Object.entries(input.states) as Array<
    [HistoricalReplayArtifactKind, HistoricalArtifactReadState]
  >) {
    if (state === "AVAILABLE") {
      continue;
    }
    if (state === "MISSING") {
      if (artifactKind === "CONFIG") {
        input.failures.add("FROZEN_CONFIG_MISSING");
        input.basis_integrity.config_basis_source_class = "MISSING_HISTORICAL_FREEZE";
      } else if (artifactKind === "INPUT") {
        input.failures.add("FROZEN_INPUT_MISSING");
        input.basis_integrity.input_basis_source_class = "MISSING_HISTORICAL_FREEZE";
      } else if (artifactKind === "PRESEAL_GATE_TAPE") {
        input.failures.add("PRESEAL_GATE_TAPE_MISSING");
        input.basis_integrity.preseal_gate_source_class = "MISSING_PRESEAL_TAPE";
      } else {
        input.failures.add("POST_SEAL_BASIS_MISSING");
        if (artifactKind === "AUTHORITY_POST_SEAL" || artifactKind === "POST_SEAL") {
          input.basis_integrity.authority_basis_source_class = "MISSING_HISTORICAL_BASIS";
        }
        if (artifactKind === "BASELINE_POST_SEAL" || artifactKind === "POST_SEAL") {
          input.basis_integrity.baseline_basis_source_class = "MISSING_HISTORICAL_BASIS";
        }
        if (artifactKind === "LATE_DATA_POST_SEAL" || artifactKind === "POST_SEAL") {
          input.basis_integrity.late_data_basis_source_class = "MISSING_HISTORICAL_BASIS";
        }
        if (artifactKind === "TEMPORAL_PROPAGATION_POST_SEAL" || artifactKind === "POST_SEAL") {
          input.basis_integrity.temporal_propagation_event_source_class =
            "MISSING_HISTORICAL_BASIS";
        }
      }
      continue;
    }
    if (state === "SCHEMA_INCOMPATIBLE") {
      input.failures.add("SCHEMA_READER_INCOMPATIBLE");
      continue;
    }
    if (state === "RETENTION_LIMITED") {
      input.failures.add("HISTORICAL_ARTIFACT_RETENTION_LIMITED");
      continue;
    }
    if (state === "BUILD_UNAVAILABLE") {
      input.failures.add("HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE");
      continue;
    }
    if (state === "UNDECRYPTABLE") {
      input.failures.add("HISTORICAL_ARTIFACT_UNDECRYPTABLE");
    } else {
      input.failures.add("HISTORICAL_ARTIFACT_CORRUPT");
    }
    if (artifactKind === "CONFIG") {
      input.basis_integrity.config_basis_source_class = "CORRUPT_HISTORICAL_FREEZE";
    } else if (artifactKind === "INPUT") {
      input.basis_integrity.input_basis_source_class = "CORRUPT_HISTORICAL_FREEZE";
    } else if (artifactKind === "PRESEAL_GATE_TAPE") {
      input.basis_integrity.preseal_gate_source_class = "CORRUPT_PRESEAL_TAPE";
    } else {
      if (artifactKind === "AUTHORITY_POST_SEAL" || artifactKind === "POST_SEAL") {
        input.basis_integrity.authority_basis_source_class = "CORRUPT_HISTORICAL_BASIS";
      }
      if (artifactKind === "BASELINE_POST_SEAL" || artifactKind === "POST_SEAL") {
        input.basis_integrity.baseline_basis_source_class = "CORRUPT_HISTORICAL_BASIS";
      }
      if (artifactKind === "LATE_DATA_POST_SEAL" || artifactKind === "POST_SEAL") {
        input.basis_integrity.late_data_basis_source_class = "CORRUPT_HISTORICAL_BASIS";
      }
      if (artifactKind === "TEMPORAL_PROPAGATION_POST_SEAL" || artifactKind === "POST_SEAL") {
        input.basis_integrity.temporal_propagation_event_source_class =
          "CORRUPT_HISTORICAL_BASIS";
      }
    }
  }
}

function validationStateFor(failures: Set<ReplayPreconditionFailureCode>) {
  if (
    failures.has("HISTORICAL_ARTIFACT_CORRUPT") ||
    failures.has("HISTORICAL_ARTIFACT_UNDECRYPTABLE")
  ) {
    return "CORRUPT" as const;
  }
  if (failures.has("SCHEMA_READER_INCOMPATIBLE")) {
    return "SCHEMA_INCOMPATIBLE" as const;
  }
  if (failures.has("HISTORICAL_ARTIFACT_RETENTION_LIMITED")) {
    return "RETENTION_LIMITED" as const;
  }
  if (failures.has("HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE")) {
    return "BUILD_UNAVAILABLE" as const;
  }
  if (
    failures.has("FROZEN_CONFIG_MISSING") ||
    failures.has("FROZEN_INPUT_MISSING") ||
    failures.has("FROZEN_EXECUTION_BINDING_MISSING") ||
    failures.has("PRESEAL_GATE_TAPE_MISSING") ||
    failures.has("POST_SEAL_BASIS_MISSING") ||
    failures.has("EXECUTION_BASIS_HASH_MISSING") ||
    failures.has("NON_PERSISTED_OUTCOME_MATERIAL")
  ) {
    return "MISSING_DEPENDENCY" as const;
  }
  return "VALID" as const;
}

function exactConfigMode(path: ReplayExecutionPath) {
  return path === "SAME_ATTEMPT_RECOVERY" ? "RECOVERY_EXACT" : "REPLAY_EXACT";
}

function exactInputMode(path: ReplayExecutionPath) {
  return path === "SAME_ATTEMPT_RECOVERY" ? "RECOVERY_EXACT" : "REPLAY_EXACT";
}

function lineageMatches(input: {
  path: ReplayExecutionPath;
  replay_manifest: RunManifestRecord;
  source_manifest: RunManifestRecord;
}) {
  if (input.path === "SAME_ATTEMPT_RECOVERY") {
    return (
      input.replay_manifest.parent_manifest_id === input.source_manifest.manifest_id &&
      input.replay_manifest.continuation_of_manifest_id === input.source_manifest.manifest_id
    );
  }
  return input.replay_manifest.replay_of_manifest_id === input.source_manifest.manifest_id;
}

export function validateReplayPreconditions(
  input: ValidateReplayPreconditionsInput,
): ReplayPreconditionResult {
  const replayClass = replayClassFor(input);
  const replayPath = replayPathFor({
    replay_class: replayClass,
    replay_manifest: input.replay_manifest,
  });
  const failures = new Set<ReplayPreconditionFailureCode>();
  const declaredCounterfactualDimensions = [
    ...new Set(input.declared_counterfactual_dimensions ?? []),
  ];
  const basisIntegrity: BuildReplayBasisIntegrityContractInput = {
    replay_class: replayClass,
  };
  if (declaredCounterfactualDimensions.length > 0) {
    basisIntegrity.declared_counterfactual_dimensions = declaredCounterfactualDimensions;
  }
  if ((input.non_persisted_outcome_component_classes ?? []).length > 0) {
    basisIntegrity.non_persisted_outcome_component_classes = [
      ...new Set(input.non_persisted_outcome_component_classes),
    ];
    failures.add("NON_PERSISTED_OUTCOME_MATERIAL");
  }

  const sourceExecutionBasisHash = executionBasisHash(input.source_manifest);
  const replayExecutionBasisHash = executionBasisHash(input.replay_manifest);

  if (replayPath === "SAME_ATTEMPT_RECOVERY") {
    if (!RECOVERABLE_SOURCE_STATES.has(input.source_manifest.lifecycle_state)) {
      failures.add("SOURCE_MANIFEST_NOT_RECOVERABLE");
    }
    if (input.replay_manifest.continuation_basis !== "RECOVERY_CHILD") {
      failures.add("RECOVERY_CHILD_REQUIRED");
    }
  } else {
    if (!REPLAYABLE_SOURCE_STATES.has(input.source_manifest.lifecycle_state)) {
      failures.add("SOURCE_MANIFEST_NOT_REPLAYABLE");
    }
    if (input.replay_manifest.continuation_basis !== "REPLAY_CHILD") {
      failures.add("REPLAY_CHILD_REQUIRED");
    }
  }

  if (
    !lineageMatches({
      path: replayPath,
      replay_manifest: input.replay_manifest,
      source_manifest: input.source_manifest,
    })
  ) {
    failures.add("REPLAY_LINEAGE_EDGE_INVALID");
  }

  if (!sourceExecutionBasisHash || !replayExecutionBasisHash) {
    failures.add("EXECUTION_BASIS_HASH_MISSING");
  } else if (
    replayPath !== "COUNTERFACTUAL_ANALYSIS" &&
    sourceExecutionBasisHash !== replayExecutionBasisHash
  ) {
    failures.add("EXECUTION_BASIS_HASH_MISMATCH");
  }

  if (input.source_manifest.config_freeze == null) {
    failures.add("FROZEN_CONFIG_MISSING");
    basisIntegrity.config_basis_source_class = "MISSING_HISTORICAL_FREEZE";
  }
  if (input.source_manifest.input_freeze == null) {
    failures.add("FROZEN_INPUT_MISSING");
    basisIntegrity.input_basis_source_class = "MISSING_HISTORICAL_FREEZE";
  }
  if (input.source_manifest.frozen_execution_binding == null) {
    failures.add("FROZEN_EXECUTION_BINDING_MISSING");
  }
  if (input.source_manifest.preseal_gate_evaluation == null) {
    failures.add("PRESEAL_GATE_TAPE_MISSING");
    basisIntegrity.preseal_gate_source_class = "MISSING_PRESEAL_TAPE";
  }
  if (input.source_manifest.append_only_outcome_projection?.post_seal_basis == null) {
    failures.add("POST_SEAL_BASIS_MISSING");
    basisIntegrity.authority_basis_source_class = "MISSING_HISTORICAL_BASIS";
    basisIntegrity.baseline_basis_source_class = "MISSING_HISTORICAL_BASIS";
    basisIntegrity.late_data_basis_source_class = "MISSING_HISTORICAL_BASIS";
    basisIntegrity.temporal_propagation_event_source_class = "MISSING_HISTORICAL_BASIS";
  }

  const requiredConfigMode = exactConfigMode(replayPath);
  const requiredInputMode = exactInputMode(replayPath);
  const configMode = input.replay_manifest.continuation_set.config_inheritance_mode;
  const inputMode = input.replay_manifest.continuation_set.input_inheritance_mode;
  const configDeclared =
    replayPath === "COUNTERFACTUAL_ANALYSIS" &&
    declaredCounterfactualDimensions.includes("CONFIG");
  const inputDeclared =
    replayPath === "COUNTERFACTUAL_ANALYSIS" &&
    declaredCounterfactualDimensions.includes("INPUT");
  if (configMode !== requiredConfigMode && !configDeclared) {
    failures.add("CONFIG_INHERITANCE_NOT_EXACT");
  }
  if (inputMode !== requiredInputMode && !inputDeclared) {
    failures.add("INPUT_INHERITANCE_NOT_EXACT");
  }

  if (input.fresh_config_resolution_requested === true) {
    failures.add("FRESH_CONFIG_RESOLUTION_FORBIDDEN");
    if (replayPath === "COUNTERFACTUAL_ANALYSIS" && configDeclared) {
      basisIntegrity.config_basis_source_class = "DECLARED_COUNTERFACTUAL_SUBSTITUTION";
    }
  }
  if (
    input.fresh_source_collection_requested === true ||
    input.live_connector_read_requested === true
  ) {
    failures.add("LIVE_CONNECTOR_READ_FORBIDDEN");
    basisIntegrity.live_connector_read_class =
      replayPath === "COUNTERFACTUAL_ANALYSIS" && inputDeclared
        ? "DECLARED_COUNTERFACTUAL_EXECUTED"
        : "UNDECLARED_EXECUTED";
  }
  if (input.live_authority_read_requested === true) {
    failures.add("LIVE_AUTHORITY_READ_FORBIDDEN");
    basisIntegrity.live_authority_read_class =
      replayPath === "COUNTERFACTUAL_ANALYSIS" &&
      declaredCounterfactualDimensions.includes("AUTHORITY_POST_SEAL")
        ? "DECLARED_COUNTERFACTUAL_EXECUTED"
        : "UNDECLARED_EXECUTED";
  }
  if (input.late_data_rescan_requested === true) {
    failures.add("LATE_DATA_RESCAN_FORBIDDEN");
    basisIntegrity.late_data_rescan_class =
      replayPath === "COUNTERFACTUAL_ANALYSIS" &&
      declaredCounterfactualDimensions.includes("LATE_DATA_POST_SEAL")
        ? "DECLARED_COUNTERFACTUAL_EXECUTED"
        : "UNDECLARED_EXECUTED";
  }
  if (hasMutationScope(input)) {
    failures.add("LIVE_MUTATION_SCOPE_FORBIDDEN");
  }

  if (replayPath === "COUNTERFACTUAL_ANALYSIS") {
    if (!input.counterfactual_basis || declaredCounterfactualDimensions.length === 0) {
      failures.add("COUNTERFACTUAL_BASIS_MISSING");
    }
  }

  addArtifactStateFailures({
    basis_integrity: basisIntegrity,
    failures,
    states: input.historical_artifact_states ?? {},
  });

  const schemaGuard = evaluateSchemaReaderWindowGuard({
    contract: input.source_manifest.schema_reader_window_contract,
    exact_historical_bundle_available:
      input.exact_historical_schema_bundle_available ?? false,
    historical_schema_bundle_hash_or_null: input.source_manifest.schema_bundle_hash,
    replay_reader_schema_bundle_hash_or_null:
      input.replay_reader_schema_bundle_hash_or_null ??
      input.replay_manifest.schema_bundle_hash ??
      null,
  });
  if (schemaGuard.overall_state === "BLOCKED") {
    failures.add("SCHEMA_READER_INCOMPATIBLE");
  }

  const basisValidationState = validationStateFor(failures);
  const failureCodes = [...failures].sort();
  const exactReplayClaimAllowed =
    failureCodes.length === 0 &&
    basisValidationState === "VALID" &&
    (replayClass === "STANDARD_REPLAY" || replayClass === "AUDIT_REPLAY") &&
    replayPath !== "COUNTERFACTUAL_ANALYSIS";

  return {
    actual_execution_basis_hash: replayExecutionBasisHash,
    basis_integrity_contract: basisIntegrity,
    basis_validation_state: basisValidationState,
    exact_replay_claim_allowed: exactReplayClaimAllowed,
    expected_execution_basis_hash: sourceExecutionBasisHash,
    failure_codes: failureCodes,
    precondition_state: failureCodes.length === 0 ? "READY" : "BLOCKED",
    replay_class: replayClass,
    replay_manifest_id: input.replay_manifest.manifest_id,
    replay_path: replayPath,
    schema_reader_guard_reason_codes: schemaGuard.reason_codes,
    source_manifest_id: input.source_manifest.manifest_id,
  };
}
