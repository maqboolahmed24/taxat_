import type { ReplayAttestation } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  OUTCOME_COMPONENT_CLASSES,
  buildOutcomeComponentInventory,
  buildReplayAttestation,
  buildReplayBasisDimensionResults,
  buildReplayOutcomeComponentResults,
  computeDeterministicOutcomeHash,
  type BuildReplayBasisIntegrityContractInput,
  type MaterialOutcomeComponentInput,
  type OutcomeComponentClass,
  type ReplayBasisDimensionCode,
  type ReplayBasisValidationState,
  type RunManifestRecord,
  type RunManifestReplayClass,
} from "../../../backend-manifest/src/index.ts";
import type { LoadedHistoricalConfigFreeze } from "./load_historical_config_freeze.ts";
import type { LoadedHistoricalInputFreeze } from "./load_historical_input_freeze.ts";
import type { LoadedHistoricalPostSealBasis } from "./load_historical_post_seal_basis.ts";
import type { LoadedHistoricalPresealGateContext } from "./load_historical_preseal_gate_context.ts";
import type { ReplayCounterfactualDimension } from "./validate_replay_preconditions.ts";

export type LoadedHistoricalReplayBasis = {
  config: LoadedHistoricalConfigFreeze;
  input: LoadedHistoricalInputFreeze;
  post_seal: LoadedHistoricalPostSealBasis;
  preseal: LoadedHistoricalPresealGateContext;
};

export type ExecuteReplayAgainstHistoricalBasisInput = {
  actual_deterministic_outcome_hash?: string | null;
  actual_outcome_components?: readonly MaterialOutcomeComponentInput[];
  basis_integrity_contract?: BuildReplayBasisIntegrityContractInput;
  basis_validation_state?: ReplayBasisValidationState;
  compared_at: string;
  counterfactual_basis?: string | null;
  declared_counterfactual_dimensions?: readonly ReplayCounterfactualDimension[];
  declared_outcome_component_classes?: readonly OutcomeComponentClass[];
  expected_deterministic_outcome_hash?: string | null;
  expected_outcome_components?: readonly MaterialOutcomeComponentInput[];
  historical_basis: LoadedHistoricalReplayBasis;
  non_persisted_outcome_component_classes?: readonly OutcomeComponentClass[];
  replay_class?: RunManifestReplayClass;
  replay_manifest: RunManifestRecord;
  source_manifest: RunManifestRecord;
};

export type ReplayHistoricalExecutionResult = {
  actual_execution_basis_hash: string | null;
  attestation: ReplayAttestation;
  expected_execution_basis_hash: string | null;
  replay_manifest_id: string;
  replay_of_manifest_id: string;
};

function executionBasisHash(manifest: RunManifestRecord) {
  return (
    manifest.hash_set?.execution_basis_hash ??
    manifest.frozen_execution_binding?.execution_basis_hash ??
    null
  );
}

function deterministicHash(manifest: RunManifestRecord) {
  return (
    manifest.append_only_outcome_projection?.deterministic_outcome_hash ??
    manifest.deterministic_outcome_hash ??
    null
  );
}

function dimensionHashes(input: {
  manifest: RunManifestRecord;
  post_seal_basis_hash: string;
}) {
  return {
    IDENTITY_AUTHORITY: input.manifest.access_binding_hash,
    EXECUTABLE: stableJsonHash({
      code_build_id: input.manifest.code_build_id,
      code_commit_sha: input.manifest.code_commit_sha,
      container_image_digest: input.manifest.container_image_digest,
      schema_bundle_hash: input.manifest.schema_bundle_hash,
    }),
    CONFIG:
      input.manifest.config_freeze?.config_freeze_hash ??
      input.manifest.frozen_execution_binding?.config_freeze_hash ??
      input.manifest.hash_set?.config_freeze_hash ??
      null,
    INPUT:
      input.manifest.input_freeze?.input_set_hash ??
      input.manifest.frozen_execution_binding?.input_set_hash ??
      input.manifest.hash_set?.input_set_hash ??
      null,
    POST_SEAL: input.post_seal_basis_hash,
    DETERMINISM: stableJsonHash({
      deterministic_seed: input.manifest.deterministic_seed,
      non_deterministic_module_allowlist: input.manifest.non_deterministic_module_allowlist,
    }),
  } satisfies Partial<Record<ReplayBasisDimensionCode, string | null>>;
}

function componentSlug(componentClass: OutcomeComponentClass) {
  return componentClass.toLowerCase().replaceAll("_", "-");
}

function outputLinkForComponent(
  manifest: RunManifestRecord,
  componentClass: OutcomeComponentClass,
) {
  const role = componentClass === "AUTHORITY_RESULT" ? "SUBMISSION_RECORD" : componentClass;
  return Object.values(manifest.append_only_outcome_projection?.output_refs ?? manifest.output_refs).find(
    (entry) =>
      entry.linkage_role_code === role ||
      entry.artifact_type.toUpperCase().replaceAll(" ", "_") === componentClass,
  );
}

export function buildHistoricalOutcomeSurfaceFromManifest(
  manifest: RunManifestRecord,
): MaterialOutcomeComponentInput[] {
  const projection = manifest.append_only_outcome_projection;
  return OUTCOME_COMPONENT_CLASSES.map((componentClass, index) => {
    const outputLink = outputLinkForComponent(manifest, componentClass);
    const componentRef =
      outputLink?.artifact_ref ??
      `historical-outcome://${manifest.manifest_id}/${componentSlug(componentClass)}`;
    return {
      component_class: componentClass,
      component_ref: componentRef,
      payload: {
        artifact_hash_or_null: outputLink?.artifact_hash_or_null ?? null,
        artifact_ref_or_null: outputLink?.artifact_ref ?? null,
        component_class: componentClass,
        deterministic_outcome_hash: deterministicHash(manifest),
        gate_decision_ids:
          componentClass === "GATE_SEQUENCE"
            ? (projection?.gating_decisions ?? manifest.gating_decisions).map(
                (gate) => gate.gate_decision_id,
              )
            : [],
        manifest_id: manifest.manifest_id,
        ordinal: index + 1,
        post_seal_basis_hash: projection?.post_seal_basis.post_seal_basis_hash ?? null,
      },
    };
  });
}

function declaredBasisDimensions(
  dimensions: readonly ReplayCounterfactualDimension[],
): ReplayBasisDimensionCode[] {
  const declared = new Set<ReplayBasisDimensionCode>();
  for (const dimension of dimensions) {
    if (
      dimension === "AUTHORITY_POST_SEAL" ||
      dimension === "BASELINE_POST_SEAL" ||
      dimension === "LATE_DATA_POST_SEAL" ||
      dimension === "TEMPORAL_PROPAGATION_POST_SEAL"
    ) {
      declared.add("POST_SEAL");
    } else if (
      dimension === "IDENTITY_AUTHORITY" ||
      dimension === "EXECUTABLE" ||
      dimension === "CONFIG" ||
      dimension === "INPUT" ||
      dimension === "POST_SEAL" ||
      dimension === "DETERMINISM"
    ) {
      declared.add(dimension);
    }
  }
  return [...declared];
}

function withCounterfactualBasisDrift(input: {
  actual_hashes: Partial<Record<ReplayBasisDimensionCode, string | null>>;
  declared_dimensions: readonly ReplayBasisDimensionCode[];
  expected_execution_basis_hash: string | null;
}) {
  const actual = { ...input.actual_hashes };
  for (const dimension of input.declared_dimensions) {
    actual[dimension] = stableJsonHash({
      declared_counterfactual_dimension: dimension,
      expected_execution_basis_hash: input.expected_execution_basis_hash,
    });
  }
  return actual;
}

function mergeBasisIntegrity(input: ExecuteReplayAgainstHistoricalBasisInput) {
  const replayClass =
    input.replay_class ?? input.replay_manifest.replay_class ?? "STANDARD_REPLAY";
  const base: BuildReplayBasisIntegrityContractInput = {
    ...(input.basis_integrity_contract ?? { replay_class: replayClass }),
    replay_class: replayClass,
    ...input.historical_basis.config.basis_integrity_fragment,
    ...input.historical_basis.input.basis_integrity_fragment,
    ...input.historical_basis.preseal.basis_integrity_fragment,
    ...input.historical_basis.post_seal.basis_integrity_fragment,
  };
  if ((input.declared_counterfactual_dimensions ?? []).length > 0) {
    base.declared_counterfactual_dimensions = [
      ...new Set(input.declared_counterfactual_dimensions),
    ];
  }
  if ((input.non_persisted_outcome_component_classes ?? []).length > 0) {
    base.non_persisted_outcome_component_classes = [
      ...new Set(input.non_persisted_outcome_component_classes),
    ];
  }
  return base;
}

export function executeReplayAgainstHistoricalBasis(
  input: ExecuteReplayAgainstHistoricalBasisInput,
): ReplayHistoricalExecutionResult {
  const replayClass =
    input.replay_class ?? input.replay_manifest.replay_class ?? "STANDARD_REPLAY";
  const declaredDimensions = [...new Set(input.declared_counterfactual_dimensions ?? [])];
  const declaredBasis = declaredBasisDimensions(declaredDimensions);
  const expectedExecutionBasisHash = executionBasisHash(input.source_manifest);
  const actualExecutionBasisHash =
    replayClass === "COUNTERFACTUAL_ANALYSIS" && declaredBasis.length > 0
      ? stableJsonHash({
          declared_counterfactual_dimensions: declaredDimensions,
          expected_execution_basis_hash: expectedExecutionBasisHash,
          replay_manifest_id: input.replay_manifest.manifest_id,
        })
      : executionBasisHash(input.replay_manifest);
  const sourceBasisHashes = dimensionHashes({
    manifest: input.source_manifest,
    post_seal_basis_hash: input.historical_basis.post_seal.post_seal_basis.post_seal_basis_hash,
  });
  const replayBasisHashes = withCounterfactualBasisDrift({
    actual_hashes: dimensionHashes({
      manifest: input.replay_manifest,
      post_seal_basis_hash:
        input.historical_basis.post_seal.post_seal_basis.post_seal_basis_hash,
    }),
    declared_dimensions: declaredBasis,
    expected_execution_basis_hash: expectedExecutionBasisHash,
  });
  const basisDimensionResults = buildReplayBasisDimensionResults({
    actual_hashes: replayBasisHashes,
    declared_change_dimensions: declaredBasis,
    expected_hashes: sourceBasisHashes,
  });

  const expectedComponents =
    input.expected_outcome_components ?? buildHistoricalOutcomeSurfaceFromManifest(input.source_manifest);
  const actualComponents =
    input.actual_outcome_components ?? expectedComponents;
  const expectedOutcome = computeDeterministicOutcomeHash({
    components: expectedComponents,
  });
  const actualOutcome = computeDeterministicOutcomeHash({
    components: actualComponents,
  });
  const expectedDeterministicOutcomeHash =
    input.expected_deterministic_outcome_hash ??
    deterministicHash(input.source_manifest) ??
    expectedOutcome.deterministic_outcome_hash;
  const actualDeterministicOutcomeHash =
    input.actual_deterministic_outcome_hash ??
    (input.actual_outcome_components
      ? actualOutcome.deterministic_outcome_hash
      : expectedDeterministicOutcomeHash);
  const unobservableComponents = [
    ...new Set(input.non_persisted_outcome_component_classes ?? []),
  ];
  const outcomeComparison = buildReplayOutcomeComponentResults({
    actual: buildOutcomeComponentInventory({ components: actualComponents }),
    declared_change_components: input.declared_outcome_component_classes,
    expected: buildOutcomeComponentInventory({ components: expectedComponents }),
    unobservable_components: unobservableComponents,
  });
  const basisValidationState =
    input.basis_validation_state ??
    (unobservableComponents.length > 0 ? "MISSING_DEPENDENCY" : "VALID");

  const attestation = buildReplayAttestation({
    actual_deterministic_outcome_hash: actualDeterministicOutcomeHash,
    actual_execution_basis_hash: actualExecutionBasisHash,
    basis_dimension_results: basisDimensionResults,
    basis_integrity_contract: mergeBasisIntegrity(input),
    basis_validation_state: basisValidationState,
    compared_at: input.compared_at,
    counterfactual_basis: input.counterfactual_basis,
    expected_deterministic_outcome_hash: expectedDeterministicOutcomeHash,
    expected_execution_basis_hash: expectedExecutionBasisHash,
    manifest_id: input.replay_manifest.manifest_id,
    mismatch_inventory: outcomeComparison.mismatch_inventory,
    outcome_component_results: outcomeComparison.outcome_component_results,
    replay_class: replayClass,
    replay_of_manifest_id: input.source_manifest.manifest_id,
    schema_bundle_hash: input.replay_manifest.schema_bundle_hash,
    writer_build_id: input.replay_manifest.code_build_id,
  });

  return {
    actual_execution_basis_hash: actualExecutionBasisHash,
    attestation,
    expected_execution_basis_hash: expectedExecutionBasisHash,
    replay_manifest_id: input.replay_manifest.manifest_id,
    replay_of_manifest_id: input.source_manifest.manifest_id,
  };
}
