import {
  executeReplayAgainstHistoricalBasis,
  type ReplayHistoricalExecutionResult,
} from "./execute_replay_against_historical_basis.ts";
import {
  HistoricalReplayBasisLoadError,
  loadHistoricalConfigFreeze,
  type HistoricalArtifactReadPolicy,
  type HistoricalReplayArtifactKind,
} from "./load_historical_config_freeze.ts";
import { loadHistoricalInputFreeze } from "./load_historical_input_freeze.ts";
import { loadHistoricalPostSealBasis } from "./load_historical_post_seal_basis.ts";
import { loadHistoricalPresealGateContext } from "./load_historical_preseal_gate_context.ts";
import {
  resolveIdempotentReplayRerun,
  type ReplayRerunCandidate,
} from "./resolve_idempotent_replay_rerun.ts";
import {
  validateReplayPreconditions,
  type ReplayCounterfactualDimension,
  type ReplayPreconditionArtifactStates,
  type ReplayPreconditionFailureCode,
  type ReplayPreconditionResult,
} from "./validate_replay_preconditions.ts";
import type {
  MaterialOutcomeComponentInput,
  OutcomeComponentClass,
  RunManifestRecord,
  RunManifestReplayClass,
} from "../../../backend-manifest/src/index.ts";

export type OrchestrateReplayPipelineInput = {
  actual_deterministic_outcome_hash?: string | null;
  actual_outcome_components?: readonly MaterialOutcomeComponentInput[];
  compared_at: string;
  counterfactual_basis?: string | null;
  declared_counterfactual_dimensions?: readonly ReplayCounterfactualDimension[];
  declared_outcome_component_classes?: readonly OutcomeComponentClass[];
  exact_historical_schema_bundle_available?: boolean;
  existing_replay_candidates?: readonly ReplayRerunCandidate[];
  expected_deterministic_outcome_hash?: string | null;
  expected_outcome_components?: readonly MaterialOutcomeComponentInput[];
  fresh_config_resolution_requested?: boolean;
  fresh_source_collection_requested?: boolean;
  historical_artifact_read_policies?: Partial<
    Record<HistoricalReplayArtifactKind, HistoricalArtifactReadPolicy>
  >;
  historical_artifact_states?: ReplayPreconditionArtifactStates;
  late_data_rescan_requested?: boolean;
  live_authority_read_requested?: boolean;
  live_connector_read_requested?: boolean;
  live_mutation_scope_tokens?: readonly string[];
  non_persisted_outcome_component_classes?: readonly OutcomeComponentClass[];
  replay_class?: RunManifestReplayClass;
  replay_manifest: RunManifestRecord;
  replay_reader_schema_bundle_hash_or_null?: string | null;
  request_idempotency_key: string;
  require_material_post_seal_basis?: boolean;
  source_manifest: RunManifestRecord;
  transport_recovery_metadata?: Record<string, unknown>;
};

export type OrchestrateReplayPipelineResult =
  | {
      kind: "IDEMPOTENT_REPLAY_RETURNED";
      attestation: ReplayHistoricalExecutionResult["attestation"];
      idempotency_key: string;
      replay_manifest: RunManifestRecord;
    }
  | {
      kind: "PRECONDITION_BLOCKED";
      preconditions: ReplayPreconditionResult;
    }
  | {
      execution: ReplayHistoricalExecutionResult;
      idempotency_key: string;
      kind: "REPLAY_EXECUTED";
      preconditions: ReplayPreconditionResult;
    };

function replayClassFor(input: OrchestrateReplayPipelineInput) {
  return (
    input.replay_class ??
    input.replay_manifest.replay_class ??
    ("STANDARD_REPLAY" as const)
  );
}

function readPolicyFor(input: {
  kind: HistoricalReplayArtifactKind;
  policies?: Partial<Record<HistoricalReplayArtifactKind, HistoricalArtifactReadPolicy>>;
  states?: ReplayPreconditionArtifactStates;
}) {
  const policy = input.policies?.[input.kind];
  const state = input.states?.[input.kind];
  if (policy === undefined && state === undefined) {
    return undefined;
  }
  return {
    ...(policy ?? {}),
    availability_state: state ?? policy?.availability_state ?? "AVAILABLE",
  } satisfies HistoricalArtifactReadPolicy;
}

function failureCodeForLoadError(
  error: HistoricalReplayBasisLoadError,
): ReplayPreconditionFailureCode {
  switch (error.code) {
    case "HISTORICAL_CONFIG_FREEZE_MISSING":
      return "FROZEN_CONFIG_MISSING";
    case "HISTORICAL_INPUT_FREEZE_MISSING":
      return "FROZEN_INPUT_MISSING";
    case "HISTORICAL_PRESEAL_GATE_TAPE_MISSING":
      return "PRESEAL_GATE_TAPE_MISSING";
    case "HISTORICAL_POST_SEAL_BASIS_MISSING":
      return "POST_SEAL_BASIS_MISSING";
    case "HISTORICAL_ARTIFACT_SCHEMA_INCOMPATIBLE":
      return "SCHEMA_READER_INCOMPATIBLE";
    case "HISTORICAL_ARTIFACT_RETENTION_LIMITED":
      return "HISTORICAL_ARTIFACT_RETENTION_LIMITED";
    case "HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE":
      return "HISTORICAL_ARTIFACT_BUILD_UNAVAILABLE";
    case "HISTORICAL_ARTIFACT_UNDECRYPTABLE":
      return "HISTORICAL_ARTIFACT_UNDECRYPTABLE";
    case "HISTORICAL_ARTIFACT_TYPE_MISMATCH":
    case "HISTORICAL_ARTIFACT_HASH_MISMATCH":
    case "HISTORICAL_ARTIFACT_CORRUPT":
      return "HISTORICAL_ARTIFACT_CORRUPT";
  }
}

function appendLoadFailure(input: {
  error: HistoricalReplayBasisLoadError;
  preconditions: ReplayPreconditionResult;
}): ReplayPreconditionResult {
  const failure = failureCodeForLoadError(input.error);
  return {
    ...input.preconditions,
    basis_validation_state: input.error.basis_validation_state,
    exact_replay_claim_allowed: false,
    failure_codes: [...new Set([...input.preconditions.failure_codes, failure])].sort(),
    precondition_state: "BLOCKED",
  };
}

export function orchestrateReplayPipeline(
  input: OrchestrateReplayPipelineInput,
): OrchestrateReplayPipelineResult {
  const replayClass = replayClassFor(input);
  const idempotent = resolveIdempotentReplayRerun({
    declared_counterfactual_dimensions: input.declared_counterfactual_dimensions,
    existing_replay_candidates: input.existing_replay_candidates,
    replay_class: replayClass,
    request_idempotency_key: input.request_idempotency_key,
    source_manifest: input.source_manifest,
  });
  if (idempotent.resolved) {
    return {
      attestation: idempotent.existing_attestation,
      idempotency_key: idempotent.idempotency_key,
      kind: "IDEMPOTENT_REPLAY_RETURNED",
      replay_manifest: idempotent.existing_replay_manifest,
    };
  }

  const preconditions = validateReplayPreconditions({
    counterfactual_basis: input.counterfactual_basis,
    declared_counterfactual_dimensions: input.declared_counterfactual_dimensions,
    exact_historical_schema_bundle_available: input.exact_historical_schema_bundle_available,
    fresh_config_resolution_requested: input.fresh_config_resolution_requested,
    fresh_source_collection_requested: input.fresh_source_collection_requested,
    historical_artifact_states: input.historical_artifact_states,
    late_data_rescan_requested: input.late_data_rescan_requested,
    live_authority_read_requested: input.live_authority_read_requested,
    live_connector_read_requested: input.live_connector_read_requested,
    live_mutation_scope_tokens: input.live_mutation_scope_tokens,
    non_persisted_outcome_component_classes:
      input.non_persisted_outcome_component_classes,
    replay_class: replayClass,
    replay_manifest: input.replay_manifest,
    replay_reader_schema_bundle_hash_or_null:
      input.replay_reader_schema_bundle_hash_or_null,
    source_manifest: input.source_manifest,
    transport_recovery_metadata: input.transport_recovery_metadata,
  });
  if (preconditions.precondition_state === "BLOCKED") {
    return {
      kind: "PRECONDITION_BLOCKED",
      preconditions,
    };
  }

  try {
    const loadedBasis = {
      config: loadHistoricalConfigFreeze({
        read_policy: readPolicyFor({
          kind: "CONFIG",
          policies: input.historical_artifact_read_policies,
          states: input.historical_artifact_states,
        }),
        source_manifest: input.source_manifest,
      }),
      input: loadHistoricalInputFreeze({
        read_policy: readPolicyFor({
          kind: "INPUT",
          policies: input.historical_artifact_read_policies,
          states: input.historical_artifact_states,
        }),
        source_manifest: input.source_manifest,
      }),
      preseal: loadHistoricalPresealGateContext({
        read_policy: readPolicyFor({
          kind: "PRESEAL_GATE_TAPE",
          policies: input.historical_artifact_read_policies,
          states: input.historical_artifact_states,
        }),
        source_manifest: input.source_manifest,
      }),
      post_seal: loadHistoricalPostSealBasis({
        read_policy: readPolicyFor({
          kind: "POST_SEAL",
          policies: input.historical_artifact_read_policies,
          states: input.historical_artifact_states,
        }),
        require_material_basis: input.require_material_post_seal_basis,
        source_manifest: input.source_manifest,
      }),
    };
    const execution = executeReplayAgainstHistoricalBasis({
      actual_deterministic_outcome_hash: input.actual_deterministic_outcome_hash,
      actual_outcome_components: input.actual_outcome_components,
      basis_integrity_contract: preconditions.basis_integrity_contract,
      basis_validation_state: preconditions.basis_validation_state,
      compared_at: input.compared_at,
      counterfactual_basis: input.counterfactual_basis,
      declared_counterfactual_dimensions: input.declared_counterfactual_dimensions,
      declared_outcome_component_classes: input.declared_outcome_component_classes,
      expected_deterministic_outcome_hash: input.expected_deterministic_outcome_hash,
      expected_outcome_components: input.expected_outcome_components,
      historical_basis: loadedBasis,
      non_persisted_outcome_component_classes:
        input.non_persisted_outcome_component_classes,
      replay_class: replayClass,
      replay_manifest: input.replay_manifest,
      source_manifest: input.source_manifest,
    });
    return {
      execution,
      idempotency_key: idempotent.idempotency_key,
      kind: "REPLAY_EXECUTED",
      preconditions,
    };
  } catch (error) {
    if (error instanceof HistoricalReplayBasisLoadError) {
      return {
        kind: "PRECONDITION_BLOCKED",
        preconditions: appendLoadFailure({ error, preconditions }),
      };
    }
    throw error;
  }
}
