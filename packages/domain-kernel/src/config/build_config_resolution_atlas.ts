import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createConfigSurfaceHashVector } from "./config_surface_hash.ts";
import { resolveConfigFreeze } from "./config_version_resolver.ts";
import { createFeatureFlagSnapshot } from "./feature_flag_snapshot.ts";
import type {
  ConfigFreezeArtifact,
  ConfigVersionRecord,
  FeatureFlagSnapshotArtifact,
  JsonValue,
} from "./config_resolution_context.ts";

type AtlasLayerRef =
  | "CONFIG_VERSIONS"
  | "FLAG_SNAPSHOT"
  | "INHERITANCE"
  | "BARRIER"
  | "FREEZE"
  | "SURFACE_HASH";

type AtlasLayerCard = {
  layerRef: AtlasLayerRef;
  label: string;
  summary: string;
  tone: "success" | "warning" | "danger";
  sourceRefs: string[];
  lineagePosture: string;
  notes: string[];
};

type AtlasScenario = {
  blocked: boolean;
  completenessState: string;
  configFreezeHashOrNull: string | null;
  configSurfaceHashOrNull: string | null;
  displayName: string;
  failureCodeOrNull: string | null;
  featureFlagSurfaceState: string;
  hashVector: Array<{ field: string; value: string }>;
  layerCards: AtlasLayerCard[];
  manifestLabel: string;
  resolutionBasis: string;
  scenarioId: string;
  summary: string;
};

type ConfigResolutionAtlasPayload = {
  basisStatement: string;
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  layerRail: Array<{
    accessibleLabel: string;
    label: string;
    layerRef: AtlasLayerRef;
  }>;
  palette: Record<string, string>;
  routeId: "config-resolution-atlas";
  scenarios: AtlasScenario[];
  selectedLayerRef: AtlasLayerRef;
  selectedScenarioId: string;
  subtitle: string;
  title: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "config-resolution-atlas",
  "data",
  "config-resolution-atlas.json",
);

const inputPaths = {
  basisMatrix: path.join(
    repoRoot,
    "config",
    "configuration",
    "config_resolution_basis_matrix.json",
  ),
  completenessBarrier: path.join(
    repoRoot,
    "config",
    "configuration",
    "config_completeness_barrier_policy.json",
  ),
  featureFlagSchema: path.join(
    repoRoot,
    "Algorithm",
    "schemas",
    "feature_flag_snapshot.schema.json",
  ),
  featureFlagSnapshotPolicy: path.join(
    repoRoot,
    "config",
    "configuration",
    "feature_flag_snapshot_policy.json",
  ),
  typeCatalog: path.join(repoRoot, "config", "configuration", "config_type_catalog.json"),
} as const;

async function readUtf8(filePath: string) {
  return readFile(filePath, "utf8");
}

async function inputHashes() {
  const { stableJsonHash } = await import("../primitives/hash.ts");
  const entries = await Promise.all(
    Object.entries(inputPaths).map(
      async ([key, filePath]) => [key, stableJsonHash(await readUtf8(filePath))] as const,
    ),
  );
  return Object.fromEntries(entries);
}

async function emitAtlasPayload(payload: ConfigResolutionAtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: ConfigResolutionAtlasPayload) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(atlasDataPath, "utf8");
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

function createConfigVersion(configType: ConfigVersionRecord["config_type"]): ConfigVersionRecord {
  const lower = configType.toLowerCase();
  return {
    artifact_type: "ConfigVersion",
    version_id: `${lower}-v1`,
    config_type: configType,
    lifecycle_state: "APPROVED",
    content_hash: `content-hash-${lower}-v1`,
    effective_scope: ["tenant"],
    approvals: [`approval-${lower}-1`],
    verification_evidence_ref_or_null: `verification-${lower}-1`,
    approved_at_or_null: "2026-04-20T09:00:00Z",
    superseded_by_version_id_or_null: null,
    revocation_reason_code_or_null: null,
    retired_at_or_null: null,
    state_changed_at: "2026-04-20T09:00:00Z",
    created_at: "2026-04-19T09:00:00Z",
    audit_refs: [`audit-${lower}-1`],
    provenance_refs: [`provenance-${lower}-1`],
    ccr_id_or_null: `ccr-${lower}-1`,
    test_suite_refs: [`suite-${lower}-1`],
    provider_api_version_or_null:
      configType === "PROVIDER_CONTRACT_PROFILE" ? "2026-04" : null,
    provider_schema_version_or_null:
      configType === "PROVIDER_CONTRACT_PROFILE" ? "flag-provider-v1" : null,
    environment_allowlist: configType === "PROVIDER_CONTRACT_PROFILE" ? ["PRODUCTION"] : [],
    compatibility_class_or_null: "stable",
  };
}

function buildApprovedConfigVersions() {
  return [
    createConfigVersion("COMPUTATION_RULES"),
    createConfigVersion("PARITY_THRESHOLDS"),
    createConfigVersion("TRUST_THRESHOLDS"),
    createConfigVersion("RISK_THRESHOLDS"),
    createConfigVersion("WORKFLOW_POLICY"),
    createConfigVersion("OVERRIDE_POLICY"),
    createConfigVersion("RETENTION_POLICY"),
    createConfigVersion("EVIDENCE_CONFIDENCE_POLICY"),
    createConfigVersion("CANONICALIZATION_RULES"),
    createConfigVersion("CONNECTOR_MAPPING_RULES"),
    createConfigVersion("PROVIDER_CONTRACT_PROFILE"),
    createConfigVersion("MATERIALITY_PROFILE"),
    createConfigVersion("AMENDMENT_MATERIALITY_PROFILE"),
    createConfigVersion("MASKING_EXPORT_POLICY"),
  ] satisfies ConfigVersionRecord[];
}

async function createGovernedSnapshot(
  idSuffix: string,
  values?: Array<{
    flag_key: string;
    enabled: boolean;
    variant_ref_or_null: string | null;
    value_json: JsonValue;
    default_value_json: JsonValue | null;
    rule_ref_or_null: string | null;
    reason_code: "TARGETING_MATCH" | "STATIC_DEFAULT";
  }>,
) {
  return createFeatureFlagSnapshot({
    featureFlagSnapshotId: `feature-flag-snapshot-${idSuffix}`,
    surfaceState: "GOVERNED_FLAG_SURFACE_PRESENT",
    providerAdapterRefOrNull: "provider.flagd.taxat",
    providerEnvironmentRefOrNull: "PRODUCTION",
    providerContractProfileRefOrNull: "provider_contract_profile-v1",
    evaluationContext: {
      tenant_id: "tenant.taxat-sandbox",
      client_id_or_null: "client.ops.74",
      environment_ref: "PRODUCTION",
      requested_scope: ["prepare_submission", "year_end"],
      executable_scope: ["prepare_submission", "year_end"],
      principal_context_ref_or_null: "principal-context.ops.74",
      access_binding_hash_or_null: "access-binding.ops.74",
      route_identity_ref_or_null: "/work/runs/manifest-74",
    },
    entries:
      values ??
      [
        {
          flag_key: "governed.precision.portal_explainability",
          enabled: false,
          variant_ref_or_null: "disabled",
          value_json: false,
          default_value_json: false,
          rule_ref_or_null: "rule.portal.disabled",
          reason_code: "STATIC_DEFAULT",
        },
        {
          flag_key: "governed.precision.review_path",
          enabled: true,
          variant_ref_or_null: "strict",
          value_json: "strict",
          default_value_json: "balanced",
          rule_ref_or_null: "rule.review.strict",
          reason_code: "TARGETING_MATCH",
        },
      ],
  });
}

async function createNoSurfaceSnapshot(idSuffix: string) {
  return createFeatureFlagSnapshot({
    featureFlagSnapshotId: `feature-flag-snapshot-${idSuffix}`,
    surfaceState: "NO_GOVERNED_FLAG_SURFACE",
    providerAdapterRefOrNull: null,
    providerEnvironmentRefOrNull: null,
    providerContractProfileRefOrNull: null,
    evaluationContext: {
      tenant_id: "tenant.taxat-sandbox",
      client_id_or_null: "client.ops.74",
      environment_ref: "PRODUCTION",
      requested_scope: ["year_end"],
      executable_scope: ["year_end"],
      principal_context_ref_or_null: "principal-context.ops.74",
      access_binding_hash_or_null: "access-binding.ops.74",
      route_identity_ref_or_null: "/work/runs/manifest-74",
    },
    entries: [],
  });
}

function buildLayerCards(params: {
  configFreezeOrNull: ConfigFreezeArtifact | null;
  featureFlagSnapshotOrNull: FeatureFlagSnapshotArtifact | null;
  summary: string;
  blocked: boolean;
  failureCodeOrNull: string | null;
}) {
  const freeze = params.configFreezeOrNull;
  const featureFlags = params.featureFlagSnapshotOrNull;
  if (!freeze) {
    return [
      {
        layerRef: "CONFIG_VERSIONS",
        label: "CONFIG VERSIONS",
        summary: "Required versions were inspected, but the barrier blocked freeze materialization.",
        tone: "warning",
        sourceRefs: ["required-config-selection"],
        lineagePosture: "DIRECT_RESOLUTION_ATTEMPTED",
        notes: [params.summary],
      },
      {
        layerRef: "FLAG_SNAPSHOT",
        label: "FLAG SNAPSHOT",
        summary:
          featureFlags?.surface_state === "NO_GOVERNED_FLAG_SURFACE"
            ? "Explicit null feature-flag surface posture."
            : "Provider-neutral feature-flag snapshot was ready.",
        tone: "warning",
        sourceRefs: featureFlags?.ordered_flag_keys ?? ["<NONE>"],
        lineagePosture: featureFlags?.surface_state ?? "UNKNOWN",
        notes: [params.summary],
      },
      {
        layerRef: "INHERITANCE",
        label: "INHERITANCE",
        summary: "No historical freeze was reused; the failure happened before a lawful freeze could persist.",
        tone: "warning",
        sourceRefs: params.failureCodeOrNull ? [params.failureCodeOrNull] : ["CONFIG_BARRIER_BLOCKED"],
        lineagePosture: "DIRECT_REQUEST_RESOLUTION",
        notes: [params.summary],
      },
      {
        layerRef: "BARRIER",
        label: "BARRIER",
        summary: params.failureCodeOrNull ?? "config resolution failed closed",
        tone: "danger",
        sourceRefs: ["COMPLETE_REQUIRED_CONFIG_SET", "FROZEN_CONFIG_ONLY"],
        lineagePosture: "BLOCKED",
        notes: [params.summary],
      },
      {
        layerRef: "FREEZE",
        label: "FREEZE",
        summary: "No ConfigFreeze artifact was emitted.",
        tone: "danger",
        sourceRefs: ["<NONE>"],
        lineagePosture: "NOT_MATERIALIZED",
        notes: [params.summary],
      },
      {
        layerRef: "SURFACE_HASH",
        label: "SURFACE HASH",
        summary: "No config_surface_hash exists because the completeness barrier did not pass.",
        tone: "danger",
        sourceRefs: ["<NONE>"],
        lineagePosture: "NOT_COMPUTED",
        notes: [params.summary],
      },
    ] satisfies AtlasLayerCard[];
  }

  return [
    {
      layerRef: "CONFIG_VERSIONS",
      label: "CONFIG VERSIONS",
      summary: `${freeze.entries.length} required config versions are frozen in canonical order.`,
      tone: "success",
      sourceRefs: freeze.entries.map((entry) => `${entry.config_type}:${entry.version_id}`),
      lineagePosture: freeze.config_resolution_basis,
      notes: [params.summary],
    },
    {
      layerRef: "FLAG_SNAPSHOT",
      label: "FLAG SNAPSHOT",
      summary:
        freeze.feature_flag_snapshot_hash === null
          ? "Explicit null feature-flag posture; no governed flag surface applied."
          : `${featureFlags?.ordered_flag_keys.length ?? 0} governed flags were resolved into a provider-neutral snapshot.`,
      tone: freeze.feature_flag_snapshot_hash === null ? "warning" : "success",
      sourceRefs:
        featureFlags?.ordered_flag_keys.length
          ? featureFlags.ordered_flag_keys
          : ["<NONE>"],
      lineagePosture: featureFlags?.surface_state ?? "UNKNOWN",
      notes: [
        freeze.feature_flag_snapshot_hash === null
          ? "Manifest-level feature_flag_snapshot_hash remains explicitly null."
          : "Workers consume only the frozen snapshot hash after seal.",
      ],
    },
    {
      layerRef: "INHERITANCE",
      label: "INHERITANCE",
      summary:
        freeze.source_config_freeze_ref === null
          ? "Fresh direct resolution with no inherited config surface."
          : `Exact reuse from ${freeze.source_config_freeze_ref}.`,
      tone: freeze.source_config_freeze_ref === null ? "success" : "warning",
      sourceRefs:
        freeze.source_config_freeze_ref === null
          ? ["DIRECT_REQUEST_RESOLUTION"]
          : [
              freeze.source_config_freeze_ref,
              freeze.source_config_freeze_hash ?? "<missing-hash>",
              freeze.source_config_surface_hash ?? "<missing-surface-hash>",
            ],
      lineagePosture: freeze.config_resolution_basis,
      notes: [params.summary],
    },
    {
      layerRef: "BARRIER",
      label: "BARRIER",
      summary: `${freeze.config_completeness_state} and ${freeze.config_consumption_mode} are both sealed.`,
      tone: "success",
      sourceRefs: ["COMPLETE_REQUIRED_CONFIG_SET", "FROZEN_CONFIG_ONLY"],
      lineagePosture: "PASSED",
      notes: ["No downstream worker may live-fallback after this barrier passes."],
    },
    {
      layerRef: "FREEZE",
      label: "FREEZE",
      summary: `ConfigFreeze ${freeze.config_freeze_id} materializes one lawful execution basis.`,
      tone: "success",
      sourceRefs: [freeze.config_freeze_id, freeze.config_freeze_hash],
      lineagePosture: freeze.config_resolution_basis,
      notes: [params.summary],
    },
    {
      layerRef: "SURFACE_HASH",
      label: "SURFACE HASH",
      summary: `config_surface_hash ${freeze.config_surface_hash} closes the whole frozen config packet.`,
      tone: "success",
      sourceRefs: [freeze.config_surface_hash],
      lineagePosture: "HASH_VECTOR_FROZEN",
      notes: ["Use the hash-vector toggle to inspect the exact contributing components."],
    },
  ] satisfies AtlasLayerCard[];
}

async function buildScenarioPayloads() {
  const approvedVersions = buildApprovedConfigVersions();
  const directSnapshot = await createGovernedSnapshot("direct-74");
  const direct = await resolveConfigFreeze({
    manifestId: "manifest.direct.74",
    configFreezeId: "cfg-freeze-direct-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: null,
    configVersions: approvedVersions,
    featureFlagSnapshotOrNull: directSnapshot,
    providerState: "AVAILABLE",
    schemaBundleHash: "schema-bundle-hash-74",
  });

  const noFlagsSnapshot = await createNoSurfaceSnapshot("no-flags-74");
  const noFlags = await resolveConfigFreeze({
    manifestId: "manifest.no-flags.74",
    configFreezeId: "cfg-freeze-no-flags-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: null,
    configVersions: approvedVersions,
    featureFlagSnapshotOrNull: noFlagsSnapshot,
    providerState: "AVAILABLE",
    schemaBundleHash: "schema-bundle-hash-74",
  });

  const replay = await resolveConfigFreeze({
    manifestId: "manifest.replay.74",
    configFreezeId: "cfg-freeze-replay-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: "REPLAY_EXACT",
    configVersions: approvedVersions,
    providerState: "OUTAGE",
    schemaBundleHash: "schema-bundle-hash-74",
    sourceConfigFreezeOrNull: direct.configFreeze,
  });

  const recovery = await resolveConfigFreeze({
    manifestId: "manifest.recovery.74",
    configFreezeId: "cfg-freeze-recovery-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: "RECOVERY_EXACT",
    configVersions: approvedVersions,
    providerState: "OUTAGE",
    schemaBundleHash: "schema-bundle-hash-74",
    sourceConfigFreezeOrNull: direct.configFreeze,
  });

  const historical = await resolveConfigFreeze({
    manifestId: "manifest.historical.74",
    configFreezeId: "cfg-freeze-historical-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: "HISTORICAL_EXPLICIT",
    configVersions: approvedVersions,
    providerState: "OUTAGE",
    schemaBundleHash: "schema-bundle-hash-74",
    sourceConfigFreezeOrNull: direct.configFreeze,
  });

  const brokenVersions = approvedVersions.filter((version) => version.config_type !== "RETENTION_POLICY");
  let blockedScenario: AtlasScenario;
  try {
    await resolveConfigFreeze({
      manifestId: "manifest.blocked.74",
      configFreezeId: "cfg-freeze-blocked-74",
      approvalSnapshotRef: "approval-snapshot-v1",
      continuationConfigInheritanceMode: null,
      configVersions: brokenVersions,
      featureFlagSnapshotOrNull: directSnapshot,
      providerState: "AVAILABLE",
      schemaBundleHash: "schema-bundle-hash-74",
    });
    throw new Error("expected direct resolution to fail closed");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    blockedScenario = {
      blocked: true,
      completenessState: "BLOCKED_REQUIRED_CONFIG_MISSING",
      configFreezeHashOrNull: null,
      configSurfaceHashOrNull: null,
      displayName: "Blocked missing required config",
      failureCodeOrNull: detail.split(":")[0] ?? "CONFIG_BARRIER_BLOCKED",
      featureFlagSurfaceState: directSnapshot.surface_state,
      hashVector: [],
      layerCards: buildLayerCards({
        configFreezeOrNull: null,
        featureFlagSnapshotOrNull: directSnapshot,
        summary:
          "The completeness barrier fails closed when one required approved config version is missing.",
        blocked: true,
        failureCodeOrNull: detail.split(":")[0] ?? "CONFIG_BARRIER_BLOCKED",
      }),
      manifestLabel: "blocked/manifest-74",
      resolutionBasis: "DIRECT_REQUEST_RESOLUTION",
      scenarioId: "blocked-missing-required-config",
      summary:
        "Missing required approved config prevents ConfigFreeze materialization and therefore prevents any surface hash from being treated as execution truth.",
    };
  }

  const successfulScenarios = [
    {
      displayName: "Direct governed flags",
      manifestLabel: "direct/manifest-74",
      result: direct,
      snapshot: directSnapshot,
      scenarioId: "direct-governed-flags",
      summary:
        "Fresh direct resolution combines approved config versions with a provider-neutral flag snapshot and freezes them into one config basis.",
    },
    {
      displayName: "Direct null feature-flag surface",
      manifestLabel: "direct-null/manifest-74",
      result: noFlags,
      snapshot: noFlagsSnapshot,
      scenarioId: "direct-null-feature-flag-surface",
      summary:
        "Fresh resolution remains lawful when no governed flag surface applies, but that null posture stays explicit instead of being inferred from omission.",
    },
    {
      displayName: "Replay exact reuse",
      manifestLabel: "replay/manifest-74",
      result: replay,
      snapshot: null,
      scenarioId: "replay-exact-reuse",
      summary:
        "Replay exact reuse reloads the historical ConfigFreeze without live provider reads, even during provider outage.",
    },
    {
      displayName: "Recovery exact reuse",
      manifestLabel: "recovery/manifest-74",
      result: recovery,
      snapshot: null,
      scenarioId: "recovery-exact-reuse",
      summary:
        "Same-attempt recovery reuses the interrupted frozen config basis instead of rebuilding it from live state.",
    },
    {
      displayName: "Historical explicit reuse",
      manifestLabel: "historical/manifest-74",
      result: historical,
      snapshot: null,
      scenarioId: "historical-explicit-reuse",
      summary:
        "Historical explicit reuse remains distinct from fresh resolution even when the inherited frozen surface still matches current bytes.",
    },
  ] as const;

  const mapped = successfulScenarios.map((scenario) => ({
    blocked: false,
    completenessState: scenario.result.configFreeze.config_completeness_state,
    configFreezeHashOrNull: scenario.result.configFreeze.config_freeze_hash,
    configSurfaceHashOrNull: scenario.result.configFreeze.config_surface_hash,
    displayName: scenario.displayName,
    failureCodeOrNull: null,
    featureFlagSurfaceState:
      scenario.snapshot?.surface_state ??
      (scenario.result.configFreeze.feature_flag_snapshot_hash === null
        ? "NO_GOVERNED_FLAG_SURFACE"
        : "REUSED_FROZEN_SNAPSHOT"),
    hashVector: createConfigSurfaceHashVector(scenario.result.configFreeze).map((entry) => ({
      field: entry.field,
      value: entry.value,
    })),
    layerCards: buildLayerCards({
      configFreezeOrNull: scenario.result.configFreeze,
      featureFlagSnapshotOrNull: scenario.snapshot,
      summary: scenario.summary,
      blocked: false,
      failureCodeOrNull: null,
    }),
    manifestLabel: scenario.manifestLabel,
    resolutionBasis: scenario.result.configFreeze.config_resolution_basis,
    scenarioId: scenario.scenarioId,
    summary: scenario.summary,
  })) satisfies AtlasScenario[];

  return [...mapped, blockedScenario];
}

export async function buildConfigResolutionAtlasPayload(): Promise<ConfigResolutionAtlasPayload> {
  return {
    routeId: "config-resolution-atlas",
    title: "Taxat Config Resolution Atlas",
    subtitle:
      "One frozen config packet closes approved versions, feature-flag truth, completeness, lineage, and the final reproducibility hash.",
    basisStatement:
      "ConfigFreeze is execution truth: fresh resolution, exact reuse, and explicit historical reuse stay typed, provider-neutral, and fail closed before downstream work begins.",
    generationBasis: {
      emittedAtBasis: "CONFIG_RESOLUTION_ATLAS_STATIC_V1",
      inputHashes: await inputHashes(),
    },
    layerRail: [
      {
        layerRef: "CONFIG_VERSIONS",
        label: "CONFIG VERSIONS",
        accessibleLabel:
          "config versions contribute version lineage and required profile refs to frozen config surface",
      },
      {
        layerRef: "FLAG_SNAPSHOT",
        label: "FLAG SNAPSHOT",
        accessibleLabel:
          "feature flag snapshot contributes hash component to frozen config surface",
      },
      {
        layerRef: "INHERITANCE",
        label: "INHERITANCE",
        accessibleLabel:
          "inheritance layer distinguishes fresh resolution from exact or historical frozen reuse",
      },
      {
        layerRef: "BARRIER",
        label: "BARRIER",
        accessibleLabel:
          "completeness barrier proves frozen config only consumption before artifacts persist",
      },
      {
        layerRef: "FREEZE",
        label: "FREEZE",
        accessibleLabel:
          "config freeze layer binds the manifest to one deterministic config packet",
      },
      {
        layerRef: "SURFACE_HASH",
        label: "SURFACE HASH",
        accessibleLabel:
          "surface hash layer shows the exact reproducibility vector for frozen config",
      },
    ],
    palette: {
      background: "#F5F5F2",
      surface: "#FFFFFF",
      secondary: "#EEF0EC",
      ink: "#101418",
      muted: "#69717A",
      hairline: "rgba(16,20,24,0.08)",
      accentNavy: "#4B6078",
      accentSage: "#60705E",
      accentGold: "#8B6A40",
      success: "#17614B",
      warning: "#8C5D1B",
      danger: "#A53A31",
    },
    scenarios: await buildScenarioPayloads(),
    selectedScenarioId: "direct-governed-flags",
    selectedLayerRef: "FLAG_SNAPSHOT",
  };
}

async function main(args: string[]) {
  const mode = args.includes("--check") ? "check" : "emit";
  const payload = await buildConfigResolutionAtlasPayload();
  if (mode === "check") {
    await checkAtlasPayload(payload);
    return;
  }
  await emitAtlasPayload(payload);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
