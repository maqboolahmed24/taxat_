import {
  ConfigResolutionError,
  createConfigResolutionContext,
  type ConfigFreezeArtifact,
  type ConfigResolutionBasis,
  type ContinuationConfigInheritanceMode,
  type FeatureFlagProviderState,
} from "./config_resolution_context.ts";

export type SourceConfigLineage = {
  source_config_freeze_ref: string | null;
  source_config_freeze_hash: string | null;
  source_config_surface_hash: string | null;
};

export function mapConfigInheritanceModeToResolutionBasis(
  mode: ContinuationConfigInheritanceMode,
): ConfigResolutionBasis {
  return createConfigResolutionContext({
    continuationConfigInheritanceMode: mode,
    providerState: "AVAILABLE",
  }).config_resolution_basis;
}

export function resolveSourceConfigLineage(params: {
  continuationConfigInheritanceMode: ContinuationConfigInheritanceMode;
  providerState?: FeatureFlagProviderState;
  sourceConfigFreezeOrNull?: ConfigFreezeArtifact | null;
}): SourceConfigLineage {
  const context = createConfigResolutionContext({
    continuationConfigInheritanceMode: params.continuationConfigInheritanceMode,
    providerState: params.providerState ?? "AVAILABLE",
  });

  if (!context.source_lineage_required) {
    return {
      source_config_freeze_ref: null,
      source_config_freeze_hash: null,
      source_config_surface_hash: null,
    };
  }

  const source = params.sourceConfigFreezeOrNull;
  if (!source) {
    throw new ConfigResolutionError(
      "CONFIG_FREEZE_SOURCE_REQUIRED",
      `resolution basis ${context.config_resolution_basis} requires a source config freeze`,
    );
  }

  return {
    source_config_freeze_ref: source.config_freeze_id,
    source_config_freeze_hash: source.config_freeze_hash,
    source_config_surface_hash: source.config_surface_hash,
  };
}
