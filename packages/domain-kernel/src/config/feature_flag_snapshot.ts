import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stableJsonHash } from "../primitives/hash.ts";
import {
  ConfigResolutionError,
  normalizeFeatureFlagEvaluationContext,
  type FeatureFlagEvaluationContext,
  type FeatureFlagSnapshotArtifact,
  type FeatureFlagSnapshotEntry,
  type FeatureFlagSurfaceState,
} from "./config_resolution_context.ts";

export type FeatureFlagSnapshotPolicy = {
  policyVersion: string;
  snapshotIdPrefix: string;
  hashProfile: string;
  noGovernedFlagSurfaceState: FeatureFlagSurfaceState;
  requiredEvaluationContextKeys: string[];
  reasonCodes: string[];
  notes: string[];
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const policyPath = path.join(
  repoRoot,
  "config",
  "configuration",
  "feature_flag_snapshot_policy.json",
);

export async function loadFeatureFlagSnapshotPolicy() {
  return JSON.parse(await readFile(policyPath, "utf8")) as FeatureFlagSnapshotPolicy;
}

function normalizeEntries(entries: FeatureFlagSnapshotEntry[]) {
  const normalized = [...entries].map((entry) => ({
    flag_key: entry.flag_key.normalize("NFC"),
    enabled: entry.enabled,
    variant_ref_or_null: entry.variant_ref_or_null?.normalize("NFC") ?? null,
    value_json: entry.value_json,
    default_value_json: entry.default_value_json,
    rule_ref_or_null: entry.rule_ref_or_null?.normalize("NFC") ?? null,
    reason_code: entry.reason_code,
  }));
  normalized.sort((left, right) => left.flag_key.localeCompare(right.flag_key));
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index - 1]!.flag_key === normalized[index]!.flag_key) {
      throw new ConfigResolutionError(
        "CONFIG_FLAG_SNAPSHOT_INVALID",
        `duplicate feature flag key ${normalized[index]!.flag_key}`,
      );
    }
  }
  return normalized;
}

export async function computeFeatureFlagSnapshotHash(params: {
  entries: FeatureFlagSnapshotEntry[];
  evaluationContext: FeatureFlagEvaluationContext;
  providerAdapterRefOrNull: string | null;
  providerContractProfileRefOrNull: string | null;
  providerEnvironmentRefOrNull: string | null;
  surfaceState: FeatureFlagSurfaceState;
}) {
  const policy = await loadFeatureFlagSnapshotPolicy();
  if (params.surfaceState === policy.noGovernedFlagSurfaceState) {
    return null;
  }

  return stableJsonHash({
    profile: policy.hashProfile,
    surface_state: params.surfaceState,
    provider_adapter_ref_or_null: params.providerAdapterRefOrNull,
    provider_contract_profile_ref_or_null: params.providerContractProfileRefOrNull,
    provider_environment_ref_or_null: params.providerEnvironmentRefOrNull,
    evaluation_context: normalizeFeatureFlagEvaluationContext(params.evaluationContext),
    entries: normalizeEntries(params.entries),
  });
}

export async function createFeatureFlagSnapshot(params: {
  featureFlagSnapshotId: string;
  surfaceState: FeatureFlagSurfaceState;
  providerAdapterRefOrNull: string | null;
  providerEnvironmentRefOrNull: string | null;
  providerContractProfileRefOrNull: string | null;
  evaluationContext: FeatureFlagEvaluationContext;
  entries: FeatureFlagSnapshotEntry[];
}): Promise<FeatureFlagSnapshotArtifact> {
  const policy = await loadFeatureFlagSnapshotPolicy();
  const normalizedContext = normalizeFeatureFlagEvaluationContext(params.evaluationContext);
  const normalizedEntries = normalizeEntries(params.entries);
  const noGovernedSurface = params.surfaceState === policy.noGovernedFlagSurfaceState;

  if (noGovernedSurface) {
    if (normalizedEntries.length > 0) {
      throw new ConfigResolutionError(
        "CONFIG_FLAG_SNAPSHOT_INVALID",
        "no-governed-flag posture must not persist evaluation entries",
      );
    }
    if (
      params.providerAdapterRefOrNull !== null ||
      params.providerEnvironmentRefOrNull !== null ||
      params.providerContractProfileRefOrNull !== null
    ) {
      throw new ConfigResolutionError(
        "CONFIG_FLAG_SNAPSHOT_INVALID",
        "no-governed-flag posture must clear provider binding fields",
      );
    }
  } else if (
    params.providerAdapterRefOrNull === null ||
    params.providerEnvironmentRefOrNull === null ||
    params.providerContractProfileRefOrNull === null
  ) {
    throw new ConfigResolutionError(
      "CONFIG_FLAG_SNAPSHOT_INVALID",
      "governed flag snapshots require provider adapter, environment, and contract profile refs",
    );
  }

  return {
    feature_flag_snapshot_id: params.featureFlagSnapshotId.normalize("NFC"),
    artifact_type: "FeatureFlagSnapshot",
    surface_state: params.surfaceState,
    provider_adapter_ref_or_null: params.providerAdapterRefOrNull?.normalize("NFC") ?? null,
    provider_environment_ref_or_null:
      params.providerEnvironmentRefOrNull?.normalize("NFC") ?? null,
    provider_contract_profile_ref_or_null:
      params.providerContractProfileRefOrNull?.normalize("NFC") ?? null,
    evaluation_context: normalizedContext,
    entries: normalizedEntries,
    ordered_flag_keys: normalizedEntries.map((entry) => entry.flag_key),
    feature_flag_snapshot_hash: await computeFeatureFlagSnapshotHash({
      entries: normalizedEntries,
      evaluationContext: normalizedContext,
      providerAdapterRefOrNull: params.providerAdapterRefOrNull,
      providerContractProfileRefOrNull: params.providerContractProfileRefOrNull,
      providerEnvironmentRefOrNull: params.providerEnvironmentRefOrNull,
      surfaceState: params.surfaceState,
    }),
  };
}
