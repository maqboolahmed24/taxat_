import { expect, test } from "@playwright/test";

import { createFeatureFlagSnapshot } from "../../../packages/domain-kernel/src/config/feature_flag_snapshot.ts";
import {
  ConfigCompletenessError,
  ConfigResolutionServiceError,
  assertCompleteConfigFreeze,
  buildConfigVersionStateTransitionContract,
  buildSchemaReaderWindowContract,
  continuationReusesFrozenConfig,
  createFrozenConfigWorkerPacket,
  freezeConfig,
  freezeConfigFromSourceReuse,
  mapConfigInheritanceModeToResolutionBasis,
  materializeCfgFromFreeze,
  normalizeConfigVersionRecord,
  resolveConfig,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeRecord,
  type ConfigVersionLifecycleState,
  type ConfigVersionRecord,
} from "../../../packages/backend-manifest/src/index.ts";

function lower(configType: string) {
  return configType.toLowerCase();
}

function transitionEvent(state: ConfigVersionLifecycleState) {
  if (state === "APPROVED") {
    return "approval_granted";
  }
  if (state === "VERIFIED") {
    return "verification_pass";
  }
  if (state === "DEPRECATED") {
    return "replacement_approved";
  }
  if (state === "REVOKED") {
    return "urgent_withdrawal";
  }
  return "submit_for_test";
}

function buildVersion(
  configType: ConfigVersionRecord["config_type"],
  state: ConfigVersionLifecycleState = "APPROVED",
  suffix = "v1",
) {
  const approved =
    state === "APPROVED" ||
    state === "DEPRECATED" ||
    state === "REVOKED" ||
    state === "RETIRED";
  const verified = approved || state === "VERIFIED";
  return normalizeConfigVersionRecord({
    artifact_type: "ConfigVersion",
    version_id: `config-version://${lower(configType)}/${suffix}`,
    config_type: configType,
    lifecycle_state: state,
    state_transition_contract: buildConfigVersionStateTransitionContract({
      current_state: state,
      previous_state_or_null: state === "APPROVED" ? "VERIFIED" : null,
      transition_event_code: transitionEvent(state),
      transition_applied_at: "2026-04-24T09:00:00Z",
      transition_audit_ref: `audit://${lower(configType)}/${suffix}`,
    }),
    content_hash: `content-hash://${lower(configType)}/${suffix}`,
    effective_scope: ["tenant"],
    approvals: approved ? [`approval://${lower(configType)}/${suffix}`] : [],
    verification_evidence_ref_or_null: verified
      ? `verification://${lower(configType)}/${suffix}`
      : null,
    approved_at_or_null: approved ? "2026-04-24T09:00:00Z" : null,
    superseded_by_version_id_or_null:
      state === "DEPRECATED" ? `config-version://${lower(configType)}/successor` : null,
    revocation_reason_code_or_null: state === "REVOKED" ? "URGENT_WITHDRAWAL" : null,
    retired_at_or_null: state === "RETIRED" ? "2026-04-30T09:00:00Z" : null,
    state_changed_at: "2026-04-24T09:00:00Z",
    created_at: "2026-04-23T09:00:00Z",
    audit_refs: [`audit://${lower(configType)}/created/${suffix}`],
    provenance_refs: [`provenance://${lower(configType)}/${suffix}`],
  });
}

function approvedVersions() {
  return REQUIRED_CONFIG_TYPE_ORDER.map((configType) => buildVersion(configType));
}

function metadataByVersionId(versions: ConfigVersionRecord[]) {
  return Object.fromEntries(
    versions.map((version) => [
      version.version_id,
      {
        ccr_id: `ccr://${lower(version.config_type)}`,
        compatibility_class: "BACKWARD_COMPATIBLE",
        environment_allowlist:
          version.config_type === "PROVIDER_CONTRACT_PROFILE" ? ["PRODUCTION"] : [],
        provider_api_version:
          version.config_type === "PROVIDER_CONTRACT_PROFILE" ? "2026-04" : null,
        provider_schema_version:
          version.config_type === "PROVIDER_CONTRACT_PROFILE" ? "provider-v1" : null,
        test_suite_refs: [`suite://${lower(version.config_type)}`],
      },
    ]),
  );
}

async function noSurfaceSnapshot() {
  return createFeatureFlagSnapshot({
    featureFlagSnapshotId: "feature-flag-snapshot://unit/no-surface",
    surfaceState: "NO_GOVERNED_FLAG_SURFACE",
    providerAdapterRefOrNull: null,
    providerEnvironmentRefOrNull: null,
    providerContractProfileRefOrNull: null,
    evaluationContext: {
      tenant_id: "tenant://unit",
      client_id_or_null: null,
      environment_ref: "PRODUCTION",
      requested_scope: ["unit"],
      executable_scope: ["unit"],
      principal_context_ref_or_null: null,
      access_binding_hash_or_null: null,
      route_identity_ref_or_null: null,
    },
    entries: [],
  });
}

function readerWindow(schemaBundleHash: string) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://unit",
    writer_schema_bundle_hash: schemaBundleHash,
    supported_reader_schema_bundle_hashes: [schemaBundleHash],
    protected_historical_schema_bundle_hashes: [],
    window_state: "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
  });
}

async function directFreeze(
  overrides?: Partial<{
    config_freeze_id: string;
    manifest_id: string;
    schema_bundle_hash: string;
  }>,
) {
  const versions = approvedVersions();
  const resolved = resolveConfig({
    config_versions: versions,
    entry_metadata_by_version_id: metadataByVersionId(versions),
    feature_flag_snapshot: await noSurfaceSnapshot(),
    usage: { mode: "COMPLIANCE", run_kind: "INTERACTIVE" },
  });
  return freezeConfig({
    config_freeze_id: overrides?.config_freeze_id ?? "config-freeze://unit/root",
    manifest_id: overrides?.manifest_id ?? "manifest://unit/root",
    entries: resolved.entries,
    schema_bundle_hash: overrides?.schema_bundle_hash ?? "schema-bundle-hash://unit",
    feature_flag_snapshot_hash: resolved.feature_flag_snapshot_hash,
    approval_snapshot_ref: "approval-snapshot://unit",
    usage: { mode: "COMPLIANCE", run_kind: "INTERACTIVE" },
  });
}

test("basis mapping and continuation reuse decisions stay explicit", () => {
  expect(mapConfigInheritanceModeToResolutionBasis(null)).toBe("DIRECT_REQUEST_RESOLUTION");
  expect(mapConfigInheritanceModeToResolutionBasis("FRESH_CHILD_RESOLUTION")).toBe(
    "DIRECT_REQUEST_RESOLUTION",
  );
  expect(mapConfigInheritanceModeToResolutionBasis("REPLAY_EXACT")).toBe("REPLAY_EXACT_REUSE");
  expect(mapConfigInheritanceModeToResolutionBasis("RECOVERY_EXACT")).toBe(
    "RECOVERY_EXACT_REUSE",
  );
  expect(mapConfigInheritanceModeToResolutionBasis("HISTORICAL_EXPLICIT")).toBe(
    "HISTORICAL_EXPLICIT_REUSE",
  );

  expect(
    continuationReusesFrozenConfig({
      run_kind: "REPLAY",
      replay_class: "EXACT_REPLAY",
    }),
  ).toMatchObject({
    reuse_frozen_config: true,
    continuation_config_inheritance_mode: "REPLAY_EXACT",
    config_resolution_basis: "REPLAY_EXACT_REUSE",
  });
  expect(
    continuationReusesFrozenConfig({
      run_kind: "INTERACTIVE",
      fresh_child_requested: true,
    }),
  ).toMatchObject({
    reuse_frozen_config: false,
    continuation_config_inheritance_mode: "FRESH_CHILD_RESOLUTION",
  });
});

test("fresh direct resolution remains distinct from exact reuse even when hashes match", async () => {
  const root = await directFreeze();
  const freshChild = await directFreeze({
    config_freeze_id: "config-freeze://unit/fresh-child",
    manifest_id: "manifest://unit/fresh-child",
  });
  expect(freshChild.config_freeze_hash).toBe(root.config_freeze_hash);
  expect(freshChild.config_surface_hash).toBe(root.config_surface_hash);
  expect(freshChild.config_resolution_basis).toBe("DIRECT_REQUEST_RESOLUTION");
  expect(freshChild.source_config_freeze_ref).toBeNull();

  const replay = freezeConfigFromSourceReuse({
    config_freeze_id: "config-freeze://unit/replay",
    manifest_id: "manifest://unit/replay",
    config_resolution_basis: "REPLAY_EXACT_REUSE",
    source_config_freeze: root,
    usage: { mode: "COMPLIANCE", run_kind: "REPLAY" },
  });
  expect(replay.config_freeze_hash).toBe(root.config_freeze_hash);
  expect(replay.config_surface_hash).toBe(root.config_surface_hash);
  expect(replay.source_config_freeze_ref).toBe(root.config_freeze_id);
});

test("materialization derives runtime cfg only from a complete frozen packet", async () => {
  const freeze = await directFreeze();
  const workerPacket = createFrozenConfigWorkerPacket(freeze);
  const cfg = materializeCfgFromFreeze({
    config_freeze: freeze,
    schema_reader_window_contract: readerWindow(freeze.schema_bundle_hash),
    worker_packet: workerPacket,
  });
  expect(cfg.runtime_config_source).toBe("CONFIG_FREEZE");
  expect(cfg.config_consumption_mode).toBe("FROZEN_CONFIG_ONLY");
  expect(cfg.entries_by_type.COMPUTATION_RULES.version_id).toBe(
    freeze.computation_rules_ref,
  );
  expect(cfg.schema_basis.schema_bundle_hash).toBe(freeze.schema_bundle_hash);

  expect(() =>
    materializeCfgFromFreeze({
      config_freeze: freeze,
      schema_reader_window_contract: readerWindow(freeze.schema_bundle_hash),
      worker_packet: {
        ...workerPacket,
        schema_bundle_hash: "schema-bundle-hash://drifted",
      },
    }),
  ).toThrow(ConfigCompletenessError);

  expect(() =>
    materializeCfgFromFreeze({
      config_freeze: {
        ...freeze,
        config_consumption_mode: "LIVE_CONFIG_ALLOWED",
      } as unknown as ConfigFreezeRecord,
      schema_reader_window_contract: readerWindow(freeze.schema_bundle_hash),
    }),
  ).toThrow(ConfigCompletenessError);
});

test("fresh compliance resolution fails closed without approved versions", async () => {
  const deprecatedOnly = REQUIRED_CONFIG_TYPE_ORDER.map((configType) =>
    buildVersion(configType, configType === "RETENTION_POLICY" ? "REVOKED" : "DEPRECATED"),
  );
  const snapshot = await noSurfaceSnapshot();
  expect(() =>
    resolveConfig({
      config_versions: deprecatedOnly,
      feature_flag_snapshot: snapshot,
      usage: { mode: "COMPLIANCE", run_kind: "INTERACTIVE" },
    }),
  ).toThrow(ConfigResolutionServiceError);
});

test("completeness validation rejects missing required entries and profile refs", async () => {
  const freeze = await directFreeze();
  expect(() =>
    assertCompleteConfigFreeze({
      ...freeze,
      entries: freeze.entries.slice(1),
    }),
  ).toThrow(ConfigCompletenessError);
  expect(() =>
    assertCompleteConfigFreeze({
      ...freeze,
      materiality_profile_ref: "",
    }),
  ).toThrow(ConfigCompletenessError);
});
