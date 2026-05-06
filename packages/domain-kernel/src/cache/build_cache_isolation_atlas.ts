import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { computeMaskingPostureFingerprint } from "./masking_posture_fingerprint.ts";
import {
  buildCacheIsolationKey,
  createCacheIsolationContract,
  loadCacheScopePolicyBundle,
} from "./cache_isolation_key.ts";
import { buildCachePurgePlan } from "./cache_purge_plan.ts";
import { assessCacheReuseGuard } from "./cache_reuse_guard.ts";
import {
  assessPreviewExportReuse,
  loadPreviewExportReusePolicy,
} from "./preview_export_binding.ts";

type AtlasScenario = {
  cacheKey: string;
  cacheScopeClass: string;
  decision: "EXACT_REUSE" | "READ_ONLY_RESTORE" | "REJECT_AND_PURGE";
  displayName: string;
  liveLegalityState: "CACHE_ONLY" | "CURRENT" | "REVALIDATING";
  mismatchFields: string[];
  mutationGate: string;
  previewDecision: string;
  previewSubjectRefOrNull: string | null;
  purgeArtifactClasses: string[];
  purgeTriggerCodes: string[];
  requestedVisibilityPartitionKeyOrNull: string | null;
  routeIdentityRef: string;
  scenarioId: string;
  selectedSubjectRefOrNull: string | null;
  storedVisibilityPartitionKeyOrNull: string | null;
  summary: string;
};

type CacheIsolationAtlasPayload = {
  basisStatement: string;
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  palette: Record<string, string>;
  routeId: "cache-isolation-atlas";
  scenarios: AtlasScenario[];
  scopeRows: Array<{
    cacheScopeClass: string;
    customerSafeProjectionMode: string;
    displayName: string;
    keySegments: string[];
    railLabel: string;
    requiresPreviewSubject: boolean;
    requiresVisibilityPartition: boolean;
    restorePosture: string;
  }>;
  selectedScenarioId: string;
  selectedScopeClass: string;
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
  "cache-isolation-atlas",
  "data",
  "cache-isolation-atlas.json",
);

const inputPaths = {
  cachePurgeTriggerMatrix: path.join(
    repoRoot,
    "config",
    "cache",
    "cache_purge_trigger_matrix.json",
  ),
  cacheScopeMatrix: path.join(repoRoot, "config", "cache", "cache_scope_matrix.json"),
  previewExportReusePolicy: path.join(
    repoRoot,
    "config",
    "cache",
    "preview_export_reuse_policy.json",
  ),
  visibilityPartitionPolicy: path.join(
    repoRoot,
    "config",
    "cache",
    "visibility_partition_policy.json",
  ),
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

async function emitAtlasPayload(payload: unknown) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: unknown) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(atlasDataPath, "utf8");
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

async function buildScenarioPayloads() {
  const workspaceStored = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73",
    cacheScopeClass: "WORKSPACE_SNAPSHOT",
    canonicalObjectRef: "artifact.workspace.item-73",
    clientIdOrNull: "client.ops.73",
    maskingDimensionRefsOrNull: ["masking.visibility.staff", "masking.route.workspace"],
    maskingPostureFingerprintOrNull: computeMaskingPostureFingerprint({
      accessBindingHashOrNull: "access-binding.workspace.73",
      customerSafeProjection: false,
      maskingDimensionRefsOrNull: ["masking.visibility.staff", "masking.route.workspace"],
      principalClass: "STAFF_FULL",
    }),
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.workspace.item-73.v4",
    routeIdentityRef: "/work/items/item-73",
    sessionBindingHash: "session-binding.workspace.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "shell.stability.workspace.73",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["visibility.staff-full", "queue.assigned"],
  });
  const workspaceRequested = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73",
    cacheScopeClass: "WORKSPACE_SNAPSHOT",
    canonicalObjectRef: "artifact.workspace.item-73",
    clientIdOrNull: "client.ops.73",
    maskingDimensionRefsOrNull: ["masking.visibility.staff", "masking.route.workspace"],
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.workspace.item-73.v4",
    routeIdentityRef: "/work/items/item-73",
    sessionBindingHash: "session-binding.workspace.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "shell.stability.workspace.73",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["visibility.staff-full", "queue.assigned"],
  });
  const workspaceGuard = await assessCacheReuseGuard({
    liveLegalityState: "CACHE_ONLY",
    requestedContract: workspaceRequested,
    storedContract: workspaceStored,
  });

  const portalStored = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.portal.73.v1",
    cacheScopeClass: "CLIENT_PORTAL_WORKSPACE",
    canonicalObjectRef: "artifact.portal.request-73",
    clientIdOrNull: "client.portal.73",
    maskingDimensionRefsOrNull: ["masking.portal.customer-safe", "masking.portal.history"],
    principalClass: "CUSTOMER_VISIBLE",
    projectionVersionRef: "projection.portal.request-73.v9",
    routeIdentityRef: "/portal/requests/request-73",
    sessionBindingHash: "session-binding.portal.73",
    shellFamily: "CLIENT_PORTAL_SHELL",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["visibility.portal.request-73", "audience.customer"],
  });
  const portalRequested = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.portal.73.v2",
    cacheScopeClass: "CLIENT_PORTAL_WORKSPACE",
    canonicalObjectRef: "artifact.portal.request-73",
    clientIdOrNull: "client.portal.73",
    maskingDimensionRefsOrNull: ["masking.portal.customer-safe", "masking.portal.redacted"],
    principalClass: "CUSTOMER_VISIBLE",
    projectionVersionRef: "projection.portal.request-73.v9",
    routeIdentityRef: "/portal/requests/request-73",
    sessionBindingHash: "session-binding.portal.73",
    shellFamily: "CLIENT_PORTAL_SHELL",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["visibility.portal.request-73", "audience.customer.narrowed"],
  });
  const portalGuard = await assessCacheReuseGuard({
    liveLegalityState: "CURRENT",
    requestedContract: portalRequested,
    storedContract: portalStored,
  });

  const nativeStored = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.native.73",
    cacheScopeClass: "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE",
    canonicalObjectRef: "artifact.packet.73",
    clientIdOrNull: null,
    maskingDimensionRefsOrNull: ["masking.native.secondary", "masking.packet.preview"],
    previewSubjectRefOrNull: "artifact.preview.packet-73",
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.packet.73.v3",
    routeIdentityRef: "/native/secondary/packet-73",
    sessionBindingHash: "session-binding.native.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "scene.shell.secondary.73",
    tenantId: "tenant.taxat-sandbox",
  });
  const nativeRequested = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.native.73",
    cacheScopeClass: "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE",
    canonicalObjectRef: "artifact.packet.73",
    clientIdOrNull: null,
    maskingDimensionRefsOrNull: ["masking.native.secondary", "masking.packet.preview"],
    previewSubjectRefOrNull: "artifact.preview.packet-74",
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.packet.73.v3",
    routeIdentityRef: "/native/secondary/packet-73",
    sessionBindingHash: "session-binding.native.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "scene.shell.secondary.73",
    tenantId: "tenant.taxat-sandbox",
  });
  const nativeGuard = await assessCacheReuseGuard({
    liveLegalityState: "CURRENT",
    requestedContract: nativeRequested,
    storedContract: nativeStored,
  });

  const governanceStored = await createCacheIsolationContract({
    cacheScopeClass: "GOVERNANCE_POLICY_SNAPSHOT",
    canonicalObjectRef: "artifact.governance.policy.73",
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.governance.policy.73.v5",
    routeIdentityRef: "/governance/policies/73",
    sessionBindingHash: "session-binding.governance.73",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId: "tenant.taxat-sandbox",
  });
  const governanceRequested = await createCacheIsolationContract({
    cacheScopeClass: "GOVERNANCE_POLICY_SNAPSHOT",
    canonicalObjectRef: "artifact.governance.policy.73",
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.governance.policy.73.v5",
    routeIdentityRef: "/governance/policies/73",
    sessionBindingHash: "session-binding.governance.73",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId: "tenant.taxat-sandbox",
  });
  const governanceGuard = await assessCacheReuseGuard({
    liveLegalityState: "CURRENT",
    requestedContract: governanceRequested,
    storedContract: governanceStored,
  });

  const scenarios = [
    {
      contract: workspaceStored,
      guard: workspaceGuard,
      id: "workspace-readonly-restore",
      liveLegalityState: "CACHE_ONLY" as const,
      requested: workspaceRequested,
      summary:
        "Exact scope identity is intact, so the snapshot may rehydrate for continuity, but mutation stays blocked until live legality returns.",
    },
    {
      contract: portalStored,
      guard: portalGuard,
      id: "portal-narrowing-purge",
      liveLegalityState: "CURRENT" as const,
      requested: portalRequested,
      summary:
        "Access and masking narrowed, so broader portal variants purge immediately instead of replaying customer-safe rows from a stale partition.",
    },
    {
      contract: nativeStored,
      guard: nativeGuard,
      id: "native-preview-selection-drift",
      liveLegalityState: "CURRENT" as const,
      requested: nativeRequested,
      summary:
        "A secondary native window may not reuse preview cache or temp exports when the selected subject changes, even if route and session stay stable.",
    },
    {
      contract: governanceStored,
      guard: governanceGuard,
      id: "governance-exact-reuse",
      liveLegalityState: "CURRENT" as const,
      requested: governanceRequested,
      summary:
        "Governance snapshots keep access, masking, and visibility bindings null and can reuse only when that governance-only envelope remains exact.",
    },
  ] as const;

  return Promise.all(
    scenarios.map(async (scenario) => {
      const purgePlan = await buildCachePurgePlan({
        requestedContract: scenario.requested,
        storedContract: scenario.contract,
      });
      const previewDecision = await assessPreviewExportReuse({
        cacheContract: scenario.contract,
        currentOnly: true,
        liveLegalityState: scenario.liveLegalityState,
        routeIdentityRef: scenario.requested.route_identity_ref,
        selectedSubjectRefOrNull: scenario.requested.preview_subject_ref_or_null,
      });
      return {
        cacheKey: await buildCacheIsolationKey(scenario.requested),
        cacheScopeClass: scenario.contract.cache_scope_class,
        decision: scenario.guard.decision,
        displayName:
          scenario.id === "workspace-readonly-restore"
            ? "Workspace exact restore"
            : scenario.id === "portal-narrowing-purge"
              ? "Portal access narrowing"
              : scenario.id === "native-preview-selection-drift"
                ? "Native preview selection drift"
                : "Governance exact reuse",
        liveLegalityState: scenario.liveLegalityState,
        mismatchFields: purgePlan.mismatchFields,
        mutationGate: scenario.guard.mutationGate,
        previewDecision: previewDecision.decisionCode,
        previewSubjectRefOrNull: scenario.contract.preview_subject_ref_or_null,
        purgeArtifactClasses: purgePlan.purgeArtifactClasses,
        purgeTriggerCodes: purgePlan.triggerCodes,
        requestedVisibilityPartitionKeyOrNull:
          scenario.requested.visibility_cache_partition_key_or_null,
        routeIdentityRef: scenario.contract.route_identity_ref,
        scenarioId: scenario.id,
        selectedSubjectRefOrNull: scenario.requested.preview_subject_ref_or_null,
        storedVisibilityPartitionKeyOrNull:
          scenario.contract.visibility_cache_partition_key_or_null,
        summary: scenario.summary,
      } satisfies AtlasScenario;
    }),
  );
}

async function buildPayload() {
  const [scopeBundle, previewPolicy, hashes, scenarios] = await Promise.all([
    loadCacheScopePolicyBundle({ reload: true }),
    loadPreviewExportReusePolicy({ reload: true }),
    inputHashes(),
    buildScenarioPayloads(),
  ]);

  return {
    basisStatement: `${scopeBundle.cacheScopeMatrix.basis_statement} ${previewPolicy.basis_statement}`,
    generationBasis: {
      emittedAtBasis:
        "generated from cache scope, purge-trigger, preview/export, and visibility policy bundles",
      inputHashes: hashes,
    },
    palette: {
      background: "#F4F3EE",
      surface: "#FFFFFF",
      secondary: "#ECEFE8",
      ink: "#111418",
      muted: "#64707A",
      hairline: "rgba(17,20,24,0.08)",
      accentForest: "#47685A",
      accentSlate: "#446377",
      accentClay: "#916343",
      success: "#175F4A",
      warning: "#915D19",
      danger: "#A53A31",
    },
    routeId: "cache-isolation-atlas",
    scenarios,
    scopeRows: scopeBundle.cacheScopeMatrix.scope_rows.map((row) => ({
      cacheScopeClass: row.cache_scope_class,
      customerSafeProjectionMode: row.customer_safe_projection_mode,
      displayName: row.display_name,
      keySegments: row.key_segments,
      railLabel: row.rail_label,
      requiresPreviewSubject: row.requires_preview_subject,
      requiresVisibilityPartition: row.requires_visibility_partition,
      restorePosture: row.restore_posture,
    })),
    selectedScenarioId: "workspace-readonly-restore",
    selectedScopeClass: "WORKSPACE_SNAPSHOT",
    subtitle:
      "One cache law now binds browser snapshots, shared projection caches, preview exports, and native restoration under the same route, masking, partition, and selection envelope.",
    title: "Taxat Cache Isolation Atlas",
  } satisfies CacheIsolationAtlasPayload;
}

export async function main() {
  const mode = new Set(process.argv.slice(2)).has("--emit") ? "emit" : "check";
  const payload = await buildPayload();
  if (mode === "emit") {
    await emitAtlasPayload(payload);
  } else {
    await checkAtlasPayload(payload);
  }
  console.log(`${mode === "emit" ? "emitted" : "verified"} cache isolation atlas payload`);
  console.log(`scopes: ${payload.scopeRows.length}`);
  console.log(`scenarios: ${payload.scenarios.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
