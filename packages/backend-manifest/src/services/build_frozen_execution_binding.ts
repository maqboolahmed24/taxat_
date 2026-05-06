import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  RunManifestConfigFreeze,
  RunManifestFrozenExecutionBinding,
  RunManifestHashSet,
  RunManifestInputFreeze,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  RunManifestRecord,
  RunManifestScopeExecutionBinding,
} from "../models/run_manifest.ts";
import { buildEmptyRunManifestAppendOnlyOutcomeProjection } from "../models/run_manifest.ts";
import { mapConfigInheritanceModeToResolutionBasis } from "./config_basis_mapper.ts";

export type FrozenExecutionBindingBuildResult = {
  append_only_outcome_projection: ReturnType<typeof buildEmptyRunManifestAppendOnlyOutcomeProjection>;
  frozen_execution_binding: RunManifestFrozenExecutionBinding;
  hash_set: RunManifestHashSet;
};

export type FrozenExecutionBindingBuildErrorCode =
  | "CONFIG_INHERITANCE_BASIS_MISMATCH"
  | "FROZEN_ACCESS_BINDING_HASH_MISMATCH"
  | "INPUT_INHERITANCE_MODE_MISMATCH";

export class FrozenExecutionBindingBuildError extends Error {
  readonly code: FrozenExecutionBindingBuildErrorCode;

  constructor(code: FrozenExecutionBindingBuildErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "FrozenExecutionBindingBuildError";
    this.code = code;
  }
}

function buildFrozenScopeBinding(
  scopeExecutionBinding: RunManifestScopeExecutionBinding,
): RunManifestFrozenExecutionBinding["scope_execution_binding"] {
  return {
    ...structuredClone(scopeExecutionBinding),
    binding_scope_class: "FROZEN_EXECUTION_BINDING",
  } as RunManifestFrozenExecutionBinding["scope_execution_binding"];
}

function assertInputInheritanceMode(input: {
  input_freeze: RunManifestInputFreeze;
  manifest: RunManifestRecord;
}) {
  const mode = input.manifest.continuation_set.input_inheritance_mode;
  if (
    (mode === "REPLAY_EXACT" || mode === "RECOVERY_EXACT" || mode === "HISTORICAL_EXPLICIT") &&
    input.input_freeze.input_consumption_mode !== "FROZEN_INPUT_ONLY"
  ) {
    throw new FrozenExecutionBindingBuildError(
      "INPUT_INHERITANCE_MODE_MISMATCH",
      `${mode} requires FROZEN_INPUT_ONLY input consumption`,
    );
  }
}

export function buildFrozenExecutionBinding(input: {
  access_decision_effective_scope?: RunManifestRecord["requested_scope"] | undefined;
  config_freeze: RunManifestConfigFreeze;
  input_freeze: RunManifestInputFreeze;
  manifest: RunManifestRecord;
  scope_execution_binding?: RunManifestScopeExecutionBinding;
}): FrozenExecutionBindingBuildResult {
  const scopeExecutionBinding = input.scope_execution_binding ?? input.manifest.scope_execution_binding;
  if (scopeExecutionBinding.access_binding_hash !== input.manifest.access_binding_hash) {
    throw new FrozenExecutionBindingBuildError(
      "FROZEN_ACCESS_BINDING_HASH_MISMATCH",
      "scope_execution_binding.access_binding_hash must mirror manifest.access_binding_hash",
    );
  }
  const expectedConfigBasis = mapConfigInheritanceModeToResolutionBasis(
    input.manifest.continuation_set.config_inheritance_mode,
  );
  if (input.config_freeze.config_resolution_basis !== expectedConfigBasis) {
    throw new FrozenExecutionBindingBuildError(
      "CONFIG_INHERITANCE_BASIS_MISMATCH",
      `config_freeze.config_resolution_basis must equal ${expectedConfigBasis}`,
    );
  }
  assertInputInheritanceMode({
    input_freeze: input.input_freeze,
    manifest: input.manifest,
  });

  const executionBasisHash = stableJsonHash({
    access_binding_hash: input.manifest.access_binding_hash,
    config_freeze_hash: input.config_freeze.config_freeze_hash,
    input_set_hash: input.input_freeze.input_set_hash,
    deterministic_seed: input.manifest.deterministic_seed,
  });
  const manifestHash = stableJsonHash({
    manifest_id: input.manifest.manifest_id,
    continuation_basis: input.manifest.continuation_basis,
    execution_basis_hash: executionBasisHash,
  });
  const hashSet: RunManifestHashSet = {
    access_binding_hash: input.manifest.access_binding_hash,
    config_freeze_hash: input.config_freeze.config_freeze_hash,
    config_surface_hash: input.config_freeze.config_surface_hash,
    input_set_hash: input.input_freeze.input_set_hash,
    execution_basis_hash: executionBasisHash,
    manifest_hash: manifestHash,
  };
  const frozenExecutionBinding: RunManifestFrozenExecutionBinding = {
    manifest_id: input.manifest.manifest_id,
    manifest_hash: manifestHash,
    execution_basis_hash: executionBasisHash,
    continuation_basis: input.manifest.continuation_basis,
    root_manifest_id: input.manifest.root_manifest_id ?? input.manifest.manifest_id,
    parent_manifest_id: input.manifest.parent_manifest_id,
    continuation_of_manifest_id: input.manifest.continuation_of_manifest_id,
    replay_of_manifest_id: input.manifest.replay_of_manifest_id,
    supersedes_manifest_id: input.manifest.supersedes_manifest_id,
    manifest_generation: input.manifest.manifest_generation,
    parent_manifest_hash_at_branch: input.manifest.continuation_set.parent_manifest_hash_at_branch,
    config_inheritance_mode: input.manifest.continuation_set.config_inheritance_mode,
    input_inheritance_mode: input.manifest.continuation_set.input_inheritance_mode,
    inherited_config_freeze_ref: input.manifest.continuation_set.inherited_config_freeze_ref,
    fresh_resolution_reason_code: input.manifest.continuation_set.fresh_resolution_reason_code,
    inherited_input_freeze_ref: input.manifest.continuation_set.inherited_input_freeze_ref,
    fresh_collection_reason_code: input.manifest.continuation_set.fresh_collection_reason_code,
    config_freeze_ref: input.config_freeze.config_freeze_id,
    config_freeze_hash: input.config_freeze.config_freeze_hash,
    config_surface_hash: input.config_freeze.config_surface_hash,
    config_resolution_basis: input.config_freeze.config_resolution_basis,
    input_freeze_ref: input.input_freeze.input_freeze_id,
    input_set_hash: input.input_freeze.input_set_hash,
    source_plan_ref: input.input_freeze.source_plan_ref,
    source_plan_hash: input.input_freeze.source_plan_hash,
    source_window_ref: input.input_freeze.source_window_ref,
    source_window_hash: input.input_freeze.source_window_hash,
    collection_boundary_ref: input.input_freeze.collection_boundary_ref,
    collection_boundary_hash: input.input_freeze.collection_boundary_hash,
    normalization_context_ref: input.input_freeze.normalization_context_ref,
    normalization_context_hash: input.input_freeze.normalization_context_hash,
    requested_scope: input.manifest.requested_scope,
    executable_scope:
      input.access_decision_effective_scope ??
      input.manifest.access_decision?.effective_scope ??
      scopeExecutionBinding.executable_scope,
    scope_execution_binding: buildFrozenScopeBinding(scopeExecutionBinding),
    access_binding_hash: input.manifest.access_binding_hash,
    environment_ref: input.manifest.environment_ref,
    provider_environment_refs: input.manifest.provider_environment_refs,
    code_build_id: input.manifest.code_build_id,
    schema_bundle_hash: input.manifest.schema_bundle_hash,
    feature_flag_snapshot_hash: input.manifest.feature_flag_snapshot_hash,
    deterministic_seed: input.manifest.deterministic_seed,
    authority_context_ref: input.manifest.authority_context_ref ?? null,
    config_consumption_mode: input.config_freeze.config_consumption_mode,
    input_consumption_mode: input.input_freeze.input_consumption_mode,
    worker_consumption_mode: "MANIFEST_BOUND_ONLY",
  };

  return {
    hash_set: hashSet,
    frozen_execution_binding: frozenExecutionBinding,
    append_only_outcome_projection: buildEmptyRunManifestAppendOnlyOutcomeProjection(),
  };
}
