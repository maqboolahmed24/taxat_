import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeConfigFreezeHash,
  computeConfigSurfaceHash,
} from "./config_surface_hash.ts";
import { resolveSourceConfigLineage } from "./config_inheritance_mapper.ts";
import {
  ConfigResolutionError,
  createConfigResolutionContext,
  normalizeStringList,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeArtifact,
  type ConfigFreezeConfigEntry,
  type ConfigResolutionContext,
  type ConfigVersionRecord,
  type ContinuationConfigInheritanceMode,
  type FeatureFlagProviderState,
  type FeatureFlagSnapshotArtifact,
} from "./config_resolution_context.ts";
import {
  assertConfigFreezeCompleteness,
  projectFreezeRefFields,
  loadConfigCompletenessBarrierPolicy,
} from "./frozen_config_loader.ts";

export type ConfigTypeCatalog = {
  catalogVersion: string;
  requiredConfigTypeOrder: typeof REQUIRED_CONFIG_TYPE_ORDER;
  directResolutionAllowedStates: ["APPROVED"];
  freezeRefFields: Record<(typeof REQUIRED_CONFIG_TYPE_ORDER)[number], string>;
  types: Array<{
    config_type: (typeof REQUIRED_CONFIG_TYPE_ORDER)[number];
    freeze_ref_field: string;
    provider_aware: boolean;
    summary: string;
  }>;
};

export type ConfigResolutionBasisMatrix = {
  matrixVersion: string;
  mappings: Array<{
    continuation_config_inheritance_mode: ContinuationConfigInheritanceMode;
    config_resolution_basis: ConfigResolutionContext["config_resolution_basis"];
    exact_reuse: boolean;
    source_lineage_required: boolean;
    explanation: string;
  }>;
};

type ResolveConfigFreezeParams = {
  manifestId: string;
  configFreezeId: string;
  approvalSnapshotRef: string;
  continuationConfigInheritanceMode: ContinuationConfigInheritanceMode;
  configVersions: ConfigVersionRecord[];
  featureFlagSnapshotOrNull?: FeatureFlagSnapshotArtifact | null;
  providerState?: FeatureFlagProviderState;
  schemaBundleHash: string;
  sourceConfigFreezeOrNull?: ConfigFreezeArtifact | null;
};

type ResolveConfigFreezeResult = {
  configFreeze: ConfigFreezeArtifact;
  resolutionContext: ConfigResolutionContext;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const typeCatalogPath = path.join(
  repoRoot,
  "config",
  "configuration",
  "config_type_catalog.json",
);
const basisMatrixPath = path.join(
  repoRoot,
  "config",
  "configuration",
  "config_resolution_basis_matrix.json",
);

export async function loadConfigTypeCatalog() {
  return JSON.parse(await readFile(typeCatalogPath, "utf8")) as ConfigTypeCatalog;
}

export async function loadConfigResolutionBasisMatrix() {
  return JSON.parse(await readFile(basisMatrixPath, "utf8")) as ConfigResolutionBasisMatrix;
}

function toConfigFreezeEntry(version: ConfigVersionRecord): ConfigFreezeConfigEntry {
  return {
    config_type: version.config_type,
    version_id: version.version_id,
    content_hash: version.content_hash,
    status_at_freeze: version.lifecycle_state,
    effective_scope: version.effective_scope[0] ?? null,
    effective_from: version.approved_at_or_null ?? version.created_at,
    effective_to: version.retired_at_or_null,
    ccr_id: version.ccr_id_or_null ?? null,
    test_suite_refs: normalizeStringList(version.test_suite_refs ?? []),
    provider_api_version: version.provider_api_version_or_null ?? null,
    provider_schema_version: version.provider_schema_version_or_null ?? null,
    environment_allowlist: normalizeStringList(version.environment_allowlist ?? []),
    compatibility_class: version.compatibility_class_or_null ?? null,
    superseded_by_version_id: version.superseded_by_version_id_or_null,
  };
}

async function selectRequiredConfigVersions(versions: ConfigVersionRecord[]) {
  const catalog = await loadConfigTypeCatalog();
  const barrierPolicy = await loadConfigCompletenessBarrierPolicy();
  const selectedEntries: ConfigFreezeConfigEntry[] = [];

  for (const configType of catalog.requiredConfigTypeOrder) {
    const candidates = versions.filter((version) => version.config_type === configType);
    if (candidates.length === 0) {
      throw new ConfigResolutionError(
        "CONFIG_REQUIRED_TYPE_MISSING",
        `missing governed config version for ${configType}`,
      );
    }
    const approved = candidates.find(
      (version) =>
        version.lifecycle_state === barrierPolicy.directResolutionAllowedStates[0] &&
        version.approvals.length > 0 &&
        version.approved_at_or_null !== null,
    );
    if (!approved) {
      const invalidStatus = candidates[0]?.lifecycle_state ?? "<missing>";
      if (invalidStatus !== "APPROVED") {
        throw new ConfigResolutionError(
          "CONFIG_VERSION_STATUS_INVALID",
          `direct resolution requires APPROVED config for ${configType}, received ${invalidStatus}`,
        );
      }
      throw new ConfigResolutionError(
        "CONFIG_VERSION_APPROVAL_REQUIRED",
        `approved config ${configType} is missing approval evidence`,
      );
    }
    selectedEntries.push(toConfigFreezeEntry(approved));
  }

  return selectedEntries;
}

async function buildDirectRequestResolution(params: ResolveConfigFreezeParams) {
  const selectedEntries = await selectRequiredConfigVersions(params.configVersions);
  const entriesByType = Object.fromEntries(
    selectedEntries.map((entry) => [entry.config_type, entry]),
  ) as Record<(typeof REQUIRED_CONFIG_TYPE_ORDER)[number], ConfigFreezeConfigEntry>;
  const featureFlagSnapshot = params.featureFlagSnapshotOrNull;
  if (!featureFlagSnapshot) {
    throw new ConfigResolutionError(
      "CONFIG_FLAG_SNAPSHOT_INVALID",
      "direct resolution requires an explicit feature flag snapshot posture",
    );
  }
  if (
    params.providerState === "OUTAGE" &&
    featureFlagSnapshot.surface_state === "GOVERNED_FLAG_SURFACE_PRESENT"
  ) {
    throw new ConfigResolutionError(
      "CONFIG_FLAG_PROVIDER_OUTAGE",
      "governed feature-flag surfaces cannot fresh-resolve while the provider is unavailable",
    );
  }
  if (
    featureFlagSnapshot.surface_state === "GOVERNED_FLAG_SURFACE_PRESENT" &&
    featureFlagSnapshot.feature_flag_snapshot_hash === null
  ) {
    throw new ConfigResolutionError(
      "CONFIG_FLAG_SNAPSHOT_INVALID",
      "governed feature-flag surfaces require a non-null feature_flag_snapshot_hash",
    );
  }

  const projectedRefs = projectFreezeRefFields(entriesByType);
  const configFreezeHash = computeConfigFreezeHash({
    entries: selectedEntries,
    requiredConfigTypesPresent: [...REQUIRED_CONFIG_TYPE_ORDER],
    schemaBundleHash: params.schemaBundleHash,
    featureFlagSnapshotHash: featureFlagSnapshot.feature_flag_snapshot_hash,
  });

  const configFreeze: ConfigFreezeArtifact = {
    config_freeze_id: params.configFreezeId,
    manifest_id: params.manifestId,
    artifact_type: "ConfigFreeze",
    entries: selectedEntries,
    config_freeze_hash: configFreezeHash,
    schema_bundle_hash: params.schemaBundleHash,
    feature_flag_snapshot_hash: featureFlagSnapshot.feature_flag_snapshot_hash,
    config_surface_hash: "",
    config_completeness_state: "COMPLETE_REQUIRED_CONFIG_SET",
    config_resolution_basis: "DIRECT_REQUEST_RESOLUTION",
    source_config_freeze_ref: null,
    source_config_freeze_hash: null,
    source_config_surface_hash: null,
    config_consumption_mode: "FROZEN_CONFIG_ONLY",
    approval_snapshot_ref: params.approvalSnapshotRef,
    ...projectedRefs,
    required_config_types_present: [...REQUIRED_CONFIG_TYPE_ORDER],
  };

  configFreeze.config_surface_hash = computeConfigSurfaceHash(configFreeze);
  await assertConfigFreezeCompleteness(configFreeze);
  return configFreeze;
}

async function buildInheritedResolution(params: ResolveConfigFreezeParams) {
  const sourceFreeze = params.sourceConfigFreezeOrNull;
  if (!sourceFreeze) {
    throw new ConfigResolutionError(
      "CONFIG_FREEZE_SOURCE_REQUIRED",
      "exact or historical reuse requires a source ConfigFreeze",
    );
  }
  await assertConfigFreezeCompleteness(sourceFreeze);
  const sourceLineage = resolveSourceConfigLineage({
    continuationConfigInheritanceMode: params.continuationConfigInheritanceMode,
    providerState: params.providerState,
    sourceConfigFreezeOrNull: sourceFreeze,
  });

  return {
    ...sourceFreeze,
    config_freeze_id: params.configFreezeId,
    manifest_id: params.manifestId,
    config_resolution_basis: createConfigResolutionContext({
      continuationConfigInheritanceMode: params.continuationConfigInheritanceMode,
      providerState: params.providerState ?? "AVAILABLE",
    }).config_resolution_basis,
    source_config_freeze_ref: sourceLineage.source_config_freeze_ref,
    source_config_freeze_hash: sourceLineage.source_config_freeze_hash,
    source_config_surface_hash: sourceLineage.source_config_surface_hash,
  } satisfies ConfigFreezeArtifact;
}

export async function resolveConfigFreeze(
  params: ResolveConfigFreezeParams,
): Promise<ResolveConfigFreezeResult> {
  const resolutionContext = createConfigResolutionContext({
    continuationConfigInheritanceMode: params.continuationConfigInheritanceMode,
    providerState: params.providerState ?? "AVAILABLE",
  });
  const basisMatrix = await loadConfigResolutionBasisMatrix();
  const matrixRow = basisMatrix.mappings.find(
    (entry) =>
      entry.continuation_config_inheritance_mode ===
      params.continuationConfigInheritanceMode,
  );
  if (!matrixRow) {
    throw new ConfigResolutionError(
      "CONFIG_FREEZE_UNKNOWN_INHERITANCE_MODE",
      `basis matrix does not define ${String(params.continuationConfigInheritanceMode)}`,
    );
  }

  const configFreeze = resolutionContext.exact_reuse
    ? await buildInheritedResolution(params)
    : await buildDirectRequestResolution(params);

  return {
    configFreeze,
    resolutionContext,
  };
}
