import type {
  FeatureFlagProviderState,
  FeatureFlagSnapshotArtifact,
} from "../../../domain-kernel/src/config/config_resolution_context.ts";
import {
  configVersionToFreezeEntry,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeConfigEntry,
  type ConfigFreezeRunKind,
  type ConfigFreezeUsageMode,
  type ConfigTypeRef,
} from "../models/config_freeze.ts";
import {
  normalizeConfigVersionRecord,
  type ConfigVersionLifecycleState,
  type ConfigVersionRecord,
} from "../models/config_version.ts";

export type ConfigResolutionServiceErrorCode =
  | "CONFIG_FLAG_PROVIDER_OUTAGE"
  | "CONFIG_FLAG_SNAPSHOT_INVALID"
  | "CONFIG_REQUIRED_TYPE_MISSING"
  | "CONFIG_VERSION_APPROVAL_REQUIRED"
  | "CONFIG_VERSION_STATUS_INVALID";

export class ConfigResolutionServiceError extends Error {
  readonly code: ConfigResolutionServiceErrorCode;

  constructor(code: ConfigResolutionServiceErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigResolutionServiceError";
    this.code = code;
  }
}

export type ConfigFreezeEntryMetadata = {
  ccr_id?: string | null;
  compatibility_class?: string | null;
  environment_allowlist?: string[];
  provider_api_version?: string | null;
  provider_schema_version?: string | null;
  test_suite_refs?: string[];
};

export type ResolveConfigInput = {
  config_versions: ConfigVersionRecord[];
  entry_metadata_by_version_id?: Record<string, ConfigFreezeEntryMetadata>;
  feature_flag_provider_state?: FeatureFlagProviderState;
  feature_flag_snapshot: FeatureFlagSnapshotArtifact | null;
  usage: {
    mode: ConfigFreezeUsageMode;
    run_kind: ConfigFreezeRunKind;
  };
};

export type ResolvedConfigBasis = {
  entries: ConfigFreezeConfigEntry[];
  feature_flag_snapshot: FeatureFlagSnapshotArtifact;
  feature_flag_snapshot_hash: string | null;
  refs_by_type: Record<ConfigTypeRef, string>;
  selected_versions: ConfigVersionRecord[];
};

const ANALYSIS_ALLOWED_STATES = [
  "APPROVED",
  "VERIFIED",
  "CANDIDATE",
  "DRAFT",
  "DEPRECATED",
] satisfies ConfigVersionLifecycleState[];

const COMPLIANCE_REPLAY_ALLOWED_STATES = [
  "APPROVED",
  "DEPRECATED",
  "REVOKED",
] satisfies ConfigVersionLifecycleState[];

const NEW_COMPLIANCE_ALLOWED_STATES = ["APPROVED"] satisfies ConfigVersionLifecycleState[];

const STATE_PRIORITY = {
  APPROVED: 50,
  VERIFIED: 40,
  CANDIDATE: 30,
  DRAFT: 20,
  DEPRECATED: 10,
  REVOKED: 0,
  RETIRED: -10,
} satisfies Record<ConfigVersionLifecycleState, number>;

function assertResolution(
  condition: unknown,
  code: ConfigResolutionServiceErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ConfigResolutionServiceError(code, detail);
  }
}

function allowedStatesForUsage(input: ResolveConfigInput["usage"]) {
  if (input.mode === "COMPLIANCE" && input.run_kind !== "REPLAY") {
    return NEW_COMPLIANCE_ALLOWED_STATES;
  }
  if (input.mode === "COMPLIANCE" && input.run_kind === "REPLAY") {
    return COMPLIANCE_REPLAY_ALLOWED_STATES;
  }
  return ANALYSIS_ALLOWED_STATES;
}

function versionFreshnessTimestamp(version: ConfigVersionRecord) {
  return (
    version.approved_at_or_null ??
    version.state_changed_at ??
    version.created_at ??
    version.version_id
  );
}

function compareConfigVersionCandidates(
  left: ConfigVersionRecord,
  right: ConfigVersionRecord,
) {
  const stateRank = STATE_PRIORITY[right.lifecycle_state] - STATE_PRIORITY[left.lifecycle_state];
  if (stateRank !== 0) {
    return stateRank;
  }
  const timeRank = versionFreshnessTimestamp(right).localeCompare(versionFreshnessTimestamp(left));
  if (timeRank !== 0) {
    return timeRank;
  }
  return right.version_id.localeCompare(left.version_id);
}

function assertApprovedEvidence(version: ConfigVersionRecord) {
  assertResolution(
    version.approvals.length > 0 &&
      version.verification_evidence_ref_or_null !== null &&
      version.approved_at_or_null !== null,
    "CONFIG_VERSION_APPROVAL_REQUIRED",
    `approved config ${version.config_type} is missing approval or verification evidence`,
  );
}

function selectVersionForType(input: {
  allowed_states: readonly ConfigVersionLifecycleState[];
  config_type: ConfigTypeRef;
  usage: ResolveConfigInput["usage"];
  versions: ConfigVersionRecord[];
}) {
  const candidates = input.versions
    .map((version) => normalizeConfigVersionRecord(version))
    .filter((version) => version.config_type === input.config_type);
  assertResolution(
    candidates.length > 0,
    "CONFIG_REQUIRED_TYPE_MISSING",
    `missing governed config version for ${input.config_type}`,
  );

  const legal = candidates
    .filter((version) => input.allowed_states.includes(version.lifecycle_state))
    .sort(compareConfigVersionCandidates);
  const selected = legal[0] ?? null;
  assertResolution(
    selected !== null,
    "CONFIG_VERSION_STATUS_INVALID",
    `${input.config_type} has no legal ${input.usage.mode}/${input.usage.run_kind} config version`,
  );
  if (
    input.usage.mode === "COMPLIANCE" &&
    (input.usage.run_kind !== "REPLAY" || selected.lifecycle_state === "APPROVED")
  ) {
    assertApprovedEvidence(selected);
  }
  return selected;
}

function assertFeatureFlagSnapshot(input: {
  feature_flag_provider_state: FeatureFlagProviderState;
  feature_flag_snapshot: FeatureFlagSnapshotArtifact | null;
}) {
  const snapshot = input.feature_flag_snapshot;
  assertResolution(
    snapshot !== null,
    "CONFIG_FLAG_SNAPSHOT_INVALID",
    "fresh config resolution requires an explicit feature-flag snapshot posture",
  );
  if (snapshot.surface_state === "GOVERNED_FLAG_SURFACE_PRESENT") {
    assertResolution(
      input.feature_flag_provider_state !== "OUTAGE",
      "CONFIG_FLAG_PROVIDER_OUTAGE",
      "governed feature-flag surfaces cannot fresh-resolve while provider state is OUTAGE",
    );
    assertResolution(
      snapshot.feature_flag_snapshot_hash !== null,
      "CONFIG_FLAG_SNAPSHOT_INVALID",
      "governed feature-flag surfaces require a non-null feature_flag_snapshot_hash",
    );
  } else {
    assertResolution(
      snapshot.feature_flag_snapshot_hash === null,
      "CONFIG_FLAG_SNAPSHOT_INVALID",
      "NO_GOVERNED_FLAG_SURFACE snapshots must materialize a null feature_flag_snapshot_hash",
    );
  }
  return structuredClone(snapshot);
}

export function resolveConfig(input: ResolveConfigInput): ResolvedConfigBasis {
  const allowedStates = allowedStatesForUsage(input.usage);
  const featureFlagSnapshot = assertFeatureFlagSnapshot({
    feature_flag_provider_state: input.feature_flag_provider_state ?? "AVAILABLE",
    feature_flag_snapshot: input.feature_flag_snapshot,
  });
  const selectedVersions = REQUIRED_CONFIG_TYPE_ORDER.map((configType) =>
    selectVersionForType({
      config_type: configType,
      versions: input.config_versions,
      allowed_states: allowedStates,
      usage: input.usage,
    }),
  );
  const entries = selectedVersions.map((version) =>
    configVersionToFreezeEntry({
      version,
      ...(input.entry_metadata_by_version_id?.[version.version_id] ?? {}),
    }),
  );
  const entriesByType = new Map(entries.map((entry) => [entry.config_type, entry]));
  const refsByType = Object.fromEntries(
    REQUIRED_CONFIG_TYPE_ORDER.map((configType) => {
      const entry = entriesByType.get(configType);
      assertResolution(
        entry !== undefined,
        "CONFIG_REQUIRED_TYPE_MISSING",
        `missing freeze entry for ${configType}`,
      );
      return [configType, entry.version_id];
    }),
  ) as Record<ConfigTypeRef, string>;

  return {
    selected_versions: selectedVersions,
    entries,
    refs_by_type: refsByType,
    feature_flag_snapshot: featureFlagSnapshot,
    feature_flag_snapshot_hash: featureFlagSnapshot.feature_flag_snapshot_hash,
  };
}
