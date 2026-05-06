import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONFIG_TYPE_TO_FREEZE_REF_FIELD,
  ConfigResolutionError,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeArtifact,
  type ConfigFreezeConfigEntry,
  type ConfigTypeRef,
  type FrozenConfigPacket,
} from "./config_resolution_context.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const barrierPolicyPath = path.join(
  repoRoot,
  "config",
  "configuration",
  "config_completeness_barrier_policy.json",
);

export type ConfigCompletenessBarrierPolicy = {
  policyVersion: string;
  completenessState: "COMPLETE_REQUIRED_CONFIG_SET";
  consumptionMode: "FROZEN_CONFIG_ONLY";
  requiredConfigTypesPresent: ConfigTypeRef[];
  requiredFreezeRefFields: Array<keyof ConfigFreezeArtifact>;
  directResolutionAllowedStates: ["APPROVED"];
  exactReuseAllowsProviderOutage: boolean;
  notes: string[];
};

export async function loadConfigCompletenessBarrierPolicy() {
  return JSON.parse(await readFile(barrierPolicyPath, "utf8")) as ConfigCompletenessBarrierPolicy;
}

export function configEntriesByType(entries: ConfigFreezeConfigEntry[]) {
  return Object.fromEntries(entries.map((entry) => [entry.config_type, entry])) as Record<
    ConfigTypeRef,
    ConfigFreezeConfigEntry
  >;
}

export async function assertConfigFreezeCompleteness(configFreeze: ConfigFreezeArtifact) {
  const policy = await loadConfigCompletenessBarrierPolicy();
  if (configFreeze.config_completeness_state !== policy.completenessState) {
    throw new ConfigResolutionError(
      "CONFIG_BARRIER_INCOMPLETE",
      "config completeness state must stay COMPLETE_REQUIRED_CONFIG_SET",
    );
  }
  if (configFreeze.config_consumption_mode !== policy.consumptionMode) {
    throw new ConfigResolutionError(
      "CONFIG_BARRIER_INCOMPLETE",
      "config consumption mode must stay FROZEN_CONFIG_ONLY",
    );
  }
  if (
    JSON.stringify(configFreeze.required_config_types_present) !==
    JSON.stringify(policy.requiredConfigTypesPresent)
  ) {
    throw new ConfigResolutionError(
      "CONFIG_BARRIER_INCOMPLETE",
      "required_config_types_present must match the completeness barrier policy",
    );
  }
  const presentTypes = configFreeze.entries.map((entry) => entry.config_type);
  if (JSON.stringify(presentTypes) !== JSON.stringify(REQUIRED_CONFIG_TYPE_ORDER)) {
    throw new ConfigResolutionError(
      "CONFIG_BARRIER_INCOMPLETE",
      "config freeze entries must retain the canonical config-type order",
    );
  }
  for (const field of policy.requiredFreezeRefFields) {
    const value = configFreeze[field];
    if (typeof value !== "string" || value.length === 0) {
      throw new ConfigResolutionError(
        "CONFIG_BARRIER_INCOMPLETE",
        `required config freeze field ${String(field)} is missing`,
      );
    }
  }
}

export async function loadFrozenConfigPacket(params: {
  attemptedFallbackSourceOrNull?: "LIVE_PROVIDER" | "PROCESS_ENV" | null;
  configFreezeOrNull: ConfigFreezeArtifact | null;
}): Promise<FrozenConfigPacket> {
  const configFreeze = params.configFreezeOrNull;
  if (!configFreeze) {
    throw new ConfigResolutionError(
      "CONFIG_REQUIRED_FREEZE_MISSING",
      "frozen config packet is required before runtime consumption",
    );
  }
  if (params.attemptedFallbackSourceOrNull) {
    throw new ConfigResolutionError(
      "CONFIG_LIVE_FALLBACK_FORBIDDEN",
      "downstream loaders must not fall back to live provider or environment config once frozen",
    );
  }
  await assertConfigFreezeCompleteness(configFreeze);
  return {
    configByType: configEntriesByType(configFreeze.entries),
    configFreeze,
    configResolutionBasis: configFreeze.config_resolution_basis,
    configSurfaceHash: configFreeze.config_surface_hash,
    featureFlagSnapshotHash: configFreeze.feature_flag_snapshot_hash,
  };
}

export function projectFreezeRefFields(entriesByType: Record<ConfigTypeRef, ConfigFreezeConfigEntry>) {
  return Object.fromEntries(
    REQUIRED_CONFIG_TYPE_ORDER.map((configType) => [
      CONFIG_TYPE_TO_FREEZE_REF_FIELD[configType],
      entriesByType[configType].version_id,
    ]),
  ) as Record<(typeof CONFIG_TYPE_TO_FREEZE_REF_FIELD)[ConfigTypeRef], string>;
}
