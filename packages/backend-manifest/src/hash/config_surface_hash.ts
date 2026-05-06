import { NONE_SENTINEL, stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ConfigFreezeArtifact } from "../../../domain-kernel/src/config/config_resolution_context.ts";

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

function hashValue(value: string | null) {
  return (value ?? NONE_SENTINEL).normalize("NFC");
}

export function createConfigSurfaceHashVector(input: ConfigSurfaceHashInput) {
  return [
    { field: "config_freeze_hash", value: hashValue(input.config_freeze_hash) },
    { field: "approval_snapshot_ref", value: hashValue(input.approval_snapshot_ref) },
    { field: "materiality_profile_ref", value: hashValue(input.materiality_profile_ref) },
    {
      field: "amendment_materiality_profile_ref",
      value: hashValue(input.amendment_materiality_profile_ref),
    },
    { field: "retention_profile_ref", value: hashValue(input.retention_profile_ref) },
    { field: "provider_contract_profile_ref", value: hashValue(input.provider_contract_profile_ref) },
    { field: "workflow_policy_ref", value: hashValue(input.workflow_policy_ref) },
    { field: "override_policy_ref", value: hashValue(input.override_policy_ref) },
    { field: "masking_export_policy_ref", value: hashValue(input.masking_export_policy_ref) },
    { field: "canonicalization_rules_ref", value: hashValue(input.canonicalization_rules_ref) },
    { field: "connector_mapping_rules_ref", value: hashValue(input.connector_mapping_rules_ref) },
    { field: "parity_threshold_profile_ref", value: hashValue(input.parity_threshold_profile_ref) },
    { field: "trust_threshold_profile_ref", value: hashValue(input.trust_threshold_profile_ref) },
    { field: "risk_threshold_profile_ref", value: hashValue(input.risk_threshold_profile_ref) },
    { field: "evidence_confidence_policy_ref", value: hashValue(input.evidence_confidence_policy_ref) },
    { field: "computation_rules_ref", value: hashValue(input.computation_rules_ref) },
    { field: "schema_bundle_hash", value: hashValue(input.schema_bundle_hash) },
    { field: "feature_flag_snapshot_hash", value: hashValue(input.feature_flag_snapshot_hash) },
  ] as const;
}

export function computeConfigSurfaceHash(input: ConfigSurfaceHashInput) {
  return stableJsonHash({
    profile: "CONFIG_SURFACE_HASH_V1",
    vector: createConfigSurfaceHashVector(input),
  });
}
