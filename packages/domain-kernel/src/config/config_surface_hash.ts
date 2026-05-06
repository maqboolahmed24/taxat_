import { NONE_SENTINEL, stableJsonHash } from "../primitives/hash.ts";
import {
  normalizeStringList,
  type ConfigFreezeArtifact,
  type ConfigFreezeConfigEntry,
  type ConfigTypeRef,
} from "./config_resolution_context.ts";

export type ConfigSurfaceHashInput = Pick<
  ConfigFreezeArtifact,
  | "config_freeze_hash"
  | "approval_snapshot_ref"
  | "materiality_profile_ref"
  | "amendment_materiality_profile_ref"
  | "retention_profile_ref"
  | "provider_contract_profile_ref"
  | "workflow_policy_ref"
  | "override_policy_ref"
  | "masking_export_policy_ref"
  | "canonicalization_rules_ref"
  | "connector_mapping_rules_ref"
  | "parity_threshold_profile_ref"
  | "trust_threshold_profile_ref"
  | "risk_threshold_profile_ref"
  | "evidence_confidence_policy_ref"
  | "computation_rules_ref"
  | "schema_bundle_hash"
  | "feature_flag_snapshot_hash"
>;

export function normalizeConfigFreezeEntries(entries: ConfigFreezeConfigEntry[]) {
  return entries.map((entry) => ({
    ...entry,
    test_suite_refs: normalizeStringList(entry.test_suite_refs),
    environment_allowlist: normalizeStringList(entry.environment_allowlist),
  }));
}

export function computeConfigFreezeHash(params: {
  entries: ConfigFreezeConfigEntry[];
  requiredConfigTypesPresent: ConfigTypeRef[];
  schemaBundleHash: string;
  featureFlagSnapshotHash: string | null;
}) {
  return stableJsonHash({
    profile: "CONFIG_FREEZE_CONTENT_V1",
    entries: normalizeConfigFreezeEntries(params.entries),
    required_config_types_present: params.requiredConfigTypesPresent,
    schema_bundle_hash: params.schemaBundleHash,
    feature_flag_snapshot_hash: params.featureFlagSnapshotHash ?? NONE_SENTINEL,
  });
}

export function createConfigSurfaceHashVector(input: ConfigSurfaceHashInput) {
  return [
    { field: "config_freeze_hash", value: input.config_freeze_hash },
    { field: "approval_snapshot_ref", value: input.approval_snapshot_ref },
    { field: "materiality_profile_ref", value: input.materiality_profile_ref },
    {
      field: "amendment_materiality_profile_ref",
      value: input.amendment_materiality_profile_ref,
    },
    { field: "retention_profile_ref", value: input.retention_profile_ref },
    { field: "provider_contract_profile_ref", value: input.provider_contract_profile_ref },
    { field: "workflow_policy_ref", value: input.workflow_policy_ref },
    { field: "override_policy_ref", value: input.override_policy_ref },
    { field: "masking_export_policy_ref", value: input.masking_export_policy_ref },
    { field: "canonicalization_rules_ref", value: input.canonicalization_rules_ref },
    { field: "connector_mapping_rules_ref", value: input.connector_mapping_rules_ref },
    { field: "parity_threshold_profile_ref", value: input.parity_threshold_profile_ref },
    { field: "trust_threshold_profile_ref", value: input.trust_threshold_profile_ref },
    { field: "risk_threshold_profile_ref", value: input.risk_threshold_profile_ref },
    { field: "evidence_confidence_policy_ref", value: input.evidence_confidence_policy_ref },
    { field: "computation_rules_ref", value: input.computation_rules_ref },
    { field: "schema_bundle_hash", value: input.schema_bundle_hash },
    {
      field: "feature_flag_snapshot_hash",
      value: input.feature_flag_snapshot_hash ?? NONE_SENTINEL,
    },
  ] as const;
}

export function computeConfigSurfaceHash(input: ConfigSurfaceHashInput) {
  return stableJsonHash({
    profile: "CONFIG_SURFACE_HASH_V1",
    vector: createConfigSurfaceHashVector(input),
  });
}
