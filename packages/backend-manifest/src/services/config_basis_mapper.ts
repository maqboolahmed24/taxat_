import {
  createConfigResolutionContext,
  type ConfigResolutionContext,
  type ContinuationConfigInheritanceMode,
  type FeatureFlagProviderState,
} from "../../../domain-kernel/src/config/config_resolution_context.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  normalizeConfigFreezeRecord,
  type ConfigFreezeRecord,
  type ConfigResolutionBasis,
} from "../models/config_freeze.ts";

export type ConfigBasisMapperErrorCode =
  | "CONFIG_FREEZE_SOURCE_REQUIRED"
  | "CONFIG_FREEZE_UNKNOWN_INHERITANCE_MODE";

export class ConfigBasisMapperError extends Error {
  readonly code: ConfigBasisMapperErrorCode;

  constructor(code: ConfigBasisMapperErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigBasisMapperError";
    this.code = code;
  }
}

export type SourceConfigLineage = {
  source_config_freeze_hash: string | null;
  source_config_freeze_ref: string | null;
  source_config_surface_hash: string | null;
};

export type ManifestBoundConfigResolutionContext = ConfigResolutionContext & {
  feature_flag_snapshot_hash: string | null;
  schema_bundle_hash: string;
};

export function mapConfigInheritanceModeToResolutionBasis(
  mode: ContinuationConfigInheritanceMode,
): ConfigResolutionBasis {
  switch (mode) {
    case null:
    case "FRESH_CHILD_RESOLUTION":
      return "DIRECT_REQUEST_RESOLUTION";
    case "REPLAY_EXACT":
      return "REPLAY_EXACT_REUSE";
    case "RECOVERY_EXACT":
      return "RECOVERY_EXACT_REUSE";
    case "HISTORICAL_EXPLICIT":
      return "HISTORICAL_EXPLICIT_REUSE";
    default:
      throw new ConfigBasisMapperError(
        "CONFIG_FREEZE_UNKNOWN_INHERITANCE_MODE",
        `unrecognized config inheritance mode ${String(mode)}`,
      );
  }
}

export function createManifestBoundConfigResolutionContext(input: {
  continuation_config_inheritance_mode: ContinuationConfigInheritanceMode;
  feature_flag_provider_state?: FeatureFlagProviderState;
  feature_flag_snapshot_hash: string | null;
  schema_bundle_hash: string;
}): ManifestBoundConfigResolutionContext {
  const context = createConfigResolutionContext({
    continuationConfigInheritanceMode: input.continuation_config_inheritance_mode,
    providerState: input.feature_flag_provider_state ?? "AVAILABLE",
  });
  const schemaBundleHash = requireTrimmedString(
    "config_resolution_context.schema_bundle_hash",
    input.schema_bundle_hash,
  );
  const featureFlagSnapshotHash =
    input.feature_flag_snapshot_hash === null
      ? null
      : requireTrimmedString(
          "config_resolution_context.feature_flag_snapshot_hash",
          input.feature_flag_snapshot_hash,
        );

  if (
    context.config_resolution_basis !==
    mapConfigInheritanceModeToResolutionBasis(input.continuation_config_inheritance_mode)
  ) {
    throw new ConfigBasisMapperError(
      "CONFIG_FREEZE_UNKNOWN_INHERITANCE_MODE",
      "domain-kernel context and backend-manifest basis mapping diverged",
    );
  }

  return {
    ...context,
    schema_bundle_hash: schemaBundleHash,
    feature_flag_snapshot_hash: featureFlagSnapshotHash,
  };
}

export function deriveSourceConfigLineage(input: {
  continuation_config_inheritance_mode: ContinuationConfigInheritanceMode;
  source_config_freeze: ConfigFreezeRecord | null;
}): SourceConfigLineage {
  const basis = mapConfigInheritanceModeToResolutionBasis(
    input.continuation_config_inheritance_mode,
  );
  if (basis === "DIRECT_REQUEST_RESOLUTION") {
    return {
      source_config_freeze_ref: null,
      source_config_freeze_hash: null,
      source_config_surface_hash: null,
    };
  }

  if (input.source_config_freeze === null) {
    throw new ConfigBasisMapperError(
      "CONFIG_FREEZE_SOURCE_REQUIRED",
      `${basis} requires a source ConfigFreeze`,
    );
  }

  const source = normalizeConfigFreezeRecord(input.source_config_freeze);
  return {
    source_config_freeze_ref: source.config_freeze_id,
    source_config_freeze_hash: source.config_freeze_hash,
    source_config_surface_hash: source.config_surface_hash,
  };
}

export function assertExactReuseLineageMatchesSource(input: {
  freeze: ConfigFreezeRecord;
  source_config_freeze: ConfigFreezeRecord;
}) {
  const freeze = normalizeConfigFreezeRecord(input.freeze);
  const source = normalizeConfigFreezeRecord(input.source_config_freeze);
  if (
    freeze.source_config_freeze_ref !== source.config_freeze_id ||
    freeze.source_config_freeze_hash !== source.config_freeze_hash ||
    freeze.source_config_surface_hash !== source.config_surface_hash ||
    freeze.config_freeze_hash !== source.config_freeze_hash ||
    freeze.config_surface_hash !== source.config_surface_hash
  ) {
    throw new ConfigBasisMapperError(
      "CONFIG_FREEZE_SOURCE_REQUIRED",
      `${freeze.config_resolution_basis} must preserve exact source freeze/hash/surface identity`,
    );
  }
}

export type { ContinuationConfigInheritanceMode, FeatureFlagProviderState };
