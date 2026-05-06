import type { FeatureFlagSnapshotArtifact } from "../../../domain-kernel/src/config/config_resolution_context.ts";
import type { SchemaBundleLoader } from "./schema_bundle_loader.ts";
import type { ConfigFreezeRepository } from "../repositories/config_freeze_repository.ts";
import type { ConfigVersionRepository } from "../repositories/config_version_repository.ts";
import type { SchemaReaderWindowContractRecord } from "../models/schema_reader_window_contract.ts";
import {
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeRecord,
  type ConfigFreezeRunKind,
  type ConfigFreezeUsageMode,
  type ConfigResolutionBasis,
  type ConfigTypeRef,
} from "../models/config_freeze.ts";
import type { ConfigVersionRecord } from "../models/config_version.ts";
import {
  createManifestBoundConfigResolutionContext,
  deriveSourceConfigLineage,
  mapConfigInheritanceModeToResolutionBasis,
  type ContinuationConfigInheritanceMode,
  type FeatureFlagProviderState,
  type ManifestBoundConfigResolutionContext,
} from "./config_basis_mapper.ts";
import { freezeConfig, freezeConfigFromSourceReuse } from "./freeze_config.ts";
import { loadConfigFreeze, type LoadedConfigFreezePacket } from "./load_config_freeze.ts";
import {
  materializeCfgFromFreeze,
  type MaterializedFrozenRuntimeConfig,
} from "./materialize_cfg_from_freeze.ts";
import {
  resolveConfig,
  type ConfigFreezeEntryMetadata,
  type ResolvedConfigBasis,
} from "./resolve_config.ts";

export type ResolveConfigForRequestErrorCode =
  | "CONFIG_FREEZE_SOURCE_REQUIRED"
  | "CONFIG_SCHEMA_BUNDLE_REQUIRED"
  | "CONFIG_VERSION_SOURCE_REQUIRED"
  | "SCHEMA_READER_WINDOW_REQUIRED";

export class ResolveConfigForRequestError extends Error {
  readonly code: ResolveConfigForRequestErrorCode;

  constructor(code: ResolveConfigForRequestErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ResolveConfigForRequestError";
    this.code = code;
  }
}

export type ResolveConfigForRequestInput = {
  approval_snapshot_ref: string;
  config_freeze_id: string;
  config_freeze_repository?: ConfigFreezeRepository;
  config_version_repository?: ConfigVersionRepository;
  config_versions?: ConfigVersionRecord[];
  continuation_config_inheritance_mode?: ContinuationConfigInheritanceMode;
  entry_metadata_by_version_id?: Record<string, ConfigFreezeEntryMetadata>;
  feature_flag_provider_state?: FeatureFlagProviderState;
  feature_flag_snapshot?: FeatureFlagSnapshotArtifact | null;
  manifest_id: string;
  persist_freeze?: {
    config_freeze_repository: ConfigFreezeRepository;
    persisted_at: string;
    tenant_id: string;
  };
  schema_bundle_hash?: string;
  schema_bundle_loader?: SchemaBundleLoader;
  schema_reader_window_contract?: SchemaReaderWindowContractRecord | null;
  source_config_freeze?: ConfigFreezeRecord | null;
  source_config_freeze_id?: string;
  tenant_id?: string;
  usage: {
    mode: ConfigFreezeUsageMode;
    run_kind: ConfigFreezeRunKind;
  };
};

export type ResolveConfigForRequestResult = {
  config_freeze: ConfigFreezeRecord;
  frozen_config_packet: LoadedConfigFreezePacket;
  materialized_config: MaterializedFrozenRuntimeConfig;
  resolution_context: ManifestBoundConfigResolutionContext;
  resolved_config_basis: ResolvedConfigBasis | null;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
};

type ExactReuseBasis = Exclude<ConfigResolutionBasis, "DIRECT_REQUEST_RESOLUTION">;

async function listConfigVersionsForFreshResolution(input: ResolveConfigForRequestInput) {
  if (input.config_versions) {
    return input.config_versions;
  }
  if (!input.config_version_repository) {
    throw new ResolveConfigForRequestError(
      "CONFIG_VERSION_SOURCE_REQUIRED",
      "fresh config resolution requires config_versions or a ConfigVersionRepository",
    );
  }
  const groups = await Promise.all(
    REQUIRED_CONFIG_TYPE_ORDER.map((configType: ConfigTypeRef) =>
      input.config_version_repository!.listVersionsByConfigType(configType),
    ),
  );
  return groups.flatMap((records) => records.map((record) => record.version));
}

async function resolveSourceFreeze(input: ResolveConfigForRequestInput) {
  if (input.source_config_freeze) {
    return input.source_config_freeze;
  }
  if (
    input.config_freeze_repository &&
    input.tenant_id &&
    input.source_config_freeze_id
  ) {
    const stored = await input.config_freeze_repository.requireFreezeById(
      input.tenant_id,
      input.source_config_freeze_id,
    );
    return stored.freeze;
  }
  throw new ResolveConfigForRequestError(
    "CONFIG_FREEZE_SOURCE_REQUIRED",
    "exact config reuse requires a source ConfigFreeze",
  );
}

async function resolveSchemaReaderWindow(input: {
  schema_bundle_hash: string;
  schema_bundle_loader?: SchemaBundleLoader;
  schema_reader_window_contract?: SchemaReaderWindowContractRecord | null;
}) {
  if (input.schema_bundle_loader) {
    const context = await input.schema_bundle_loader.requireBundleContext(input.schema_bundle_hash);
    return context.schema_reader_window_contract;
  }
  if (input.schema_reader_window_contract) {
    return input.schema_reader_window_contract;
  }
  throw new ResolveConfigForRequestError(
    "SCHEMA_READER_WINDOW_REQUIRED",
    "resolved config basis must attach schema-reader window posture",
  );
}

export async function resolveConfigForRequest(
  input: ResolveConfigForRequestInput,
): Promise<ResolveConfigForRequestResult> {
  const mode = input.continuation_config_inheritance_mode ?? null;
  const basis = mapConfigInheritanceModeToResolutionBasis(mode);
  const exactReuse = basis !== "DIRECT_REQUEST_RESOLUTION";

  const resolvedConfigBasis = exactReuse
    ? null
    : resolveConfig({
        config_versions: await listConfigVersionsForFreshResolution(input),
        ...(input.entry_metadata_by_version_id
          ? { entry_metadata_by_version_id: input.entry_metadata_by_version_id }
          : {}),
        feature_flag_provider_state: input.feature_flag_provider_state ?? "AVAILABLE",
        feature_flag_snapshot: input.feature_flag_snapshot ?? null,
        usage: input.usage,
      });

  const sourceFreeze = exactReuse ? await resolveSourceFreeze(input) : null;
  if (exactReuse) {
    deriveSourceConfigLineage({
      continuation_config_inheritance_mode: mode,
      source_config_freeze: sourceFreeze,
    });
  }

  const schemaBundleHash = exactReuse
    ? sourceFreeze!.schema_bundle_hash
    : input.schema_bundle_hash;
  if (!schemaBundleHash) {
    throw new ResolveConfigForRequestError(
      "CONFIG_SCHEMA_BUNDLE_REQUIRED",
      "fresh config resolution requires a schema_bundle_hash",
    );
  }

  const configFreeze = exactReuse
    ? freezeConfigFromSourceReuse({
        config_freeze_id: input.config_freeze_id,
        manifest_id: input.manifest_id,
        config_resolution_basis: basis as ExactReuseBasis,
        source_config_freeze: sourceFreeze!,
        usage: input.usage,
      })
    : freezeConfig({
        config_freeze_id: input.config_freeze_id,
        manifest_id: input.manifest_id,
        entries: resolvedConfigBasis!.entries,
        schema_bundle_hash: schemaBundleHash,
        feature_flag_snapshot_hash: resolvedConfigBasis!.feature_flag_snapshot_hash,
        approval_snapshot_ref: input.approval_snapshot_ref,
        config_resolution_basis: "DIRECT_REQUEST_RESOLUTION",
        usage: input.usage,
      });

  if (input.persist_freeze) {
    await input.persist_freeze.config_freeze_repository.persistFreeze({
      tenant_id: input.persist_freeze.tenant_id,
      persisted_at: input.persist_freeze.persisted_at,
      freeze: configFreeze,
      usage: input.usage,
    });
  }

  const schemaReaderWindowContract = await resolveSchemaReaderWindow({
    schema_bundle_hash: configFreeze.schema_bundle_hash,
    ...(input.schema_bundle_loader ? { schema_bundle_loader: input.schema_bundle_loader } : {}),
    ...(input.schema_reader_window_contract
      ? { schema_reader_window_contract: input.schema_reader_window_contract }
      : {}),
  });
  const frozenConfigPacket = await loadConfigFreeze({ config_freeze: configFreeze });
  const materializedConfig = materializeCfgFromFreeze({
    config_freeze: configFreeze,
    schema_reader_window_contract: schemaReaderWindowContract,
    worker_packet: frozenConfigPacket.worker_packet,
  });
  const resolutionContext = createManifestBoundConfigResolutionContext({
    continuation_config_inheritance_mode: mode,
    feature_flag_provider_state: input.feature_flag_provider_state ?? "AVAILABLE",
    schema_bundle_hash: configFreeze.schema_bundle_hash,
    feature_flag_snapshot_hash: configFreeze.feature_flag_snapshot_hash,
  });

  return {
    config_freeze: configFreeze,
    frozen_config_packet: frozenConfigPacket,
    materialized_config: materializedConfig,
    resolution_context: resolutionContext,
    resolved_config_basis: resolvedConfigBasis,
    schema_reader_window_contract: schemaReaderWindowContract,
  };
}
