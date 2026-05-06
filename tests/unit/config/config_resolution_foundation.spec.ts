import { expect, test } from "@playwright/test";

import {
  createConfigResolutionContext,
  type ConfigVersionRecord,
  REQUIRED_CONFIG_TYPE_ORDER,
} from "../../../packages/domain-kernel/src/config/config_resolution_context.ts";
import {
  computeConfigSurfaceHash,
  createConfigSurfaceHashVector,
} from "../../../packages/domain-kernel/src/config/config_surface_hash.ts";
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
    featureFlagSnapshotId: "feature-flag-snapshot-foundation",
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
        flag_key: "governed.precision.review_path",
        enabled: true,
        variant_ref_or_null: "strict",
        value_json: "strict",
        default_value_json: "balanced",
        rule_ref_or_null: "rule.review.strict",
        reason_code: "TARGETING_MATCH",
      },
      {
        flag_key: "governed.precision.portal_explainability",
        enabled: false,
        variant_ref_or_null: "disabled",
        value_json: false,
        default_value_json: false,
        rule_ref_or_null: "rule.portal.disabled",
        reason_code: "STATIC_DEFAULT",
      },
    ],
  });
}

test("feature flag snapshots hash stably and sort ordered flag keys", async () => {
  const first = await createGovernedSnapshot();
  const second = await createFeatureFlagSnapshot({
    featureFlagSnapshotId: "feature-flag-snapshot-foundation-reordered",
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
    entries: [...first.entries].reverse(),
  });

  expect(first.feature_flag_snapshot_hash).toBe(second.feature_flag_snapshot_hash);
  expect(second.ordered_flag_keys).toEqual([
    "governed.precision.portal_explainability",
    "governed.precision.review_path",
  ]);
});

test("config surface hash keeps explicit null feature-flag posture distinct", async () => {
  const vector = createConfigSurfaceHashVector({
    config_freeze_hash: "cfg-hash-74",
    approval_snapshot_ref: "approval-snapshot-v1",
    materiality_profile_ref: "materiality_profile-v1",
    amendment_materiality_profile_ref: "amendment_materiality_profile-v1",
    retention_profile_ref: "retention_policy-v1",
    provider_contract_profile_ref: "provider_contract_profile-v1",
    workflow_policy_ref: "workflow_policy-v1",
    override_policy_ref: "override_policy-v1",
    masking_export_policy_ref: "masking_export_policy-v1",
    canonicalization_rules_ref: "canonicalization_rules-v1",
    connector_mapping_rules_ref: "connector_mapping_rules-v1",
    parity_threshold_profile_ref: "parity_thresholds-v1",
    trust_threshold_profile_ref: "trust_thresholds-v1",
    risk_threshold_profile_ref: "risk_thresholds-v1",
    evidence_confidence_policy_ref: "evidence_confidence_policy-v1",
    computation_rules_ref: "computation_rules-v1",
    schema_bundle_hash: "schema-bundle-hash-74",
    feature_flag_snapshot_hash: null,
  });

  expect(vector.at(-1)).toEqual({
    field: "feature_flag_snapshot_hash",
    value: "<NONE>",
  });

  const withFlags = computeConfigSurfaceHash({
    config_freeze_hash: "cfg-hash-74",
    approval_snapshot_ref: "approval-snapshot-v1",
    materiality_profile_ref: "materiality_profile-v1",
    amendment_materiality_profile_ref: "amendment_materiality_profile-v1",
    retention_profile_ref: "retention_policy-v1",
    provider_contract_profile_ref: "provider_contract_profile-v1",
    workflow_policy_ref: "workflow_policy-v1",
    override_policy_ref: "override_policy-v1",
    masking_export_policy_ref: "masking_export_policy-v1",
    canonicalization_rules_ref: "canonicalization_rules-v1",
    connector_mapping_rules_ref: "connector_mapping_rules-v1",
    parity_threshold_profile_ref: "parity_thresholds-v1",
    trust_threshold_profile_ref: "trust_thresholds-v1",
    risk_threshold_profile_ref: "risk_thresholds-v1",
    evidence_confidence_policy_ref: "evidence_confidence_policy-v1",
    computation_rules_ref: "computation_rules-v1",
    schema_bundle_hash: "schema-bundle-hash-74",
    feature_flag_snapshot_hash: "flags-hash-74",
  });
  const withoutFlags = computeConfigSurfaceHash({
    config_freeze_hash: "cfg-hash-74",
    approval_snapshot_ref: "approval-snapshot-v1",
    materiality_profile_ref: "materiality_profile-v1",
    amendment_materiality_profile_ref: "amendment_materiality_profile-v1",
    retention_profile_ref: "retention_policy-v1",
    provider_contract_profile_ref: "provider_contract_profile-v1",
    workflow_policy_ref: "workflow_policy-v1",
    override_policy_ref: "override_policy-v1",
    masking_export_policy_ref: "masking_export_policy-v1",
    canonicalization_rules_ref: "canonicalization_rules-v1",
    connector_mapping_rules_ref: "connector_mapping_rules-v1",
    parity_threshold_profile_ref: "parity_thresholds-v1",
    trust_threshold_profile_ref: "trust_thresholds-v1",
    risk_threshold_profile_ref: "risk_thresholds-v1",
    evidence_confidence_policy_ref: "evidence_confidence_policy-v1",
    computation_rules_ref: "computation_rules-v1",
    schema_bundle_hash: "schema-bundle-hash-74",
    feature_flag_snapshot_hash: null,
  });

  expect(withFlags).not.toBe(withoutFlags);
});

test("resolution basis classification stays typed and loader forbids live fallback", async () => {
  expect(
    createConfigResolutionContext({
      continuationConfigInheritanceMode: "REPLAY_EXACT",
      providerState: "OUTAGE",
    }),
  ).toMatchObject({
    config_resolution_basis: "REPLAY_EXACT_REUSE",
    exact_reuse: true,
    source_lineage_required: true,
    provider_read_required: false,
  });

  const resolved = await resolveConfigFreeze({
    manifestId: "manifest.foundation.74",
    configFreezeId: "cfg-freeze-foundation-74",
    approvalSnapshotRef: "approval-snapshot-v1",
    continuationConfigInheritanceMode: null,
    configVersions: createApprovedVersions(),
    featureFlagSnapshotOrNull: await createGovernedSnapshot(),
    providerState: "AVAILABLE",
    schemaBundleHash: "schema-bundle-hash-74",
  });

  await expect(
    loadFrozenConfigPacket({
      configFreezeOrNull: resolved.configFreeze,
      attemptedFallbackSourceOrNull: "LIVE_PROVIDER",
    }),
  ).rejects.toThrow(/CONFIG_LIVE_FALLBACK_FORBIDDEN/);
});
