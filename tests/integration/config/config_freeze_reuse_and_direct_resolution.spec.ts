import { expect, test } from "@playwright/test";

import {
  type ConfigVersionRecord,
  REQUIRED_CONFIG_TYPE_ORDER,
} from "../../../packages/domain-kernel/src/config/config_resolution_context.ts";
import { resolveConfigFreeze } from "../../../packages/domain-kernel/src/config/config_version_resolver.ts";
import { createFeatureFlagSnapshot } from "../../../packages/domain-kernel/src/config/feature_flag_snapshot.ts";
import { loadFrozenConfigPacket } from "../../../packages/domain-kernel/src/config/frozen_config_loader.ts";

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

function createApprovedVersions() {
  return REQUIRED_CONFIG_TYPE_ORDER.map((configType) => createConfigVersion(configType));
}

async function createGovernedSnapshot() {
  return createFeatureFlagSnapshot({
    featureFlagSnapshotId: "feature-flag-snapshot-integration",
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
    entries: [
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

async function createNoSurfaceSnapshot() {
  return createFeatureFlagSnapshot({
    featureFlagSnapshotId: "feature-flag-snapshot-null-surface",
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

test("direct resolution, exact reuse classes, and missing required config all obey the frozen config law", async () => {
  const approvedVersions = createApprovedVersions();
  const governedSnapshot = await createGovernedSnapshot();

  const direct = await resolveConfigFreeze({
    manifestId: "manifest.direct.74",
    configFreezeId: "cfg-freeze-direct-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: null,
    configVersions: approvedVersions,
    featureFlagSnapshotOrNull: governedSnapshot,
    providerState: "AVAILABLE",
    schemaBundleHash: "schema-bundle-hash-74",
  });
  expect(direct.configFreeze.config_resolution_basis).toBe("DIRECT_REQUEST_RESOLUTION");
  expect(direct.configFreeze.feature_flag_snapshot_hash).toBe(
    governedSnapshot.feature_flag_snapshot_hash,
  );

  const nullSurface = await resolveConfigFreeze({
    manifestId: "manifest.null.74",
    configFreezeId: "cfg-freeze-null-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: null,
    configVersions: approvedVersions,
    featureFlagSnapshotOrNull: await createNoSurfaceSnapshot(),
    providerState: "AVAILABLE",
    schemaBundleHash: "schema-bundle-hash-74",
  });
  expect(nullSurface.configFreeze.feature_flag_snapshot_hash).toBeNull();

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
  expect(replay.configFreeze.config_resolution_basis).toBe("REPLAY_EXACT_REUSE");
  expect(replay.configFreeze.config_surface_hash).toBe(direct.configFreeze.config_surface_hash);
  expect(replay.configFreeze.source_config_freeze_ref).toBe(direct.configFreeze.config_freeze_id);

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
  expect(recovery.configFreeze.config_resolution_basis).toBe("RECOVERY_EXACT_REUSE");
  expect(recovery.configFreeze.config_freeze_hash).toBe(direct.configFreeze.config_freeze_hash);

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
  expect(historical.configFreeze.config_resolution_basis).toBe("HISTORICAL_EXPLICIT_REUSE");

  await expect(
    resolveConfigFreeze({
      manifestId: "manifest.missing.74",
      configFreezeId: "cfg-freeze-missing-74",
      approvalSnapshotRef: "approval-snapshot-v1",
      continuationConfigInheritanceMode: null,
      configVersions: approvedVersions.filter((version) => version.config_type !== "RETENTION_POLICY"),
      featureFlagSnapshotOrNull: governedSnapshot,
      providerState: "AVAILABLE",
      schemaBundleHash: "schema-bundle-hash-74",
    }),
  ).rejects.toThrow(/CONFIG_REQUIRED_TYPE_MISSING/);

  await expect(
    resolveConfigFreeze({
      manifestId: "manifest.outage.74",
      configFreezeId: "cfg-freeze-outage-74",
      approvalSnapshotRef: "approval-snapshot-v1",
      continuationConfigInheritanceMode: null,
      configVersions: approvedVersions,
      featureFlagSnapshotOrNull: governedSnapshot,
      providerState: "OUTAGE",
      schemaBundleHash: "schema-bundle-hash-74",
    }),
  ).rejects.toThrow(/CONFIG_FLAG_PROVIDER_OUTAGE/);

  await expect(
    loadFrozenConfigPacket({
      configFreezeOrNull: direct.configFreeze,
      attemptedFallbackSourceOrNull: "PROCESS_ENV",
    }),
  ).rejects.toThrow(/CONFIG_LIVE_FALLBACK_FORBIDDEN/);
});
