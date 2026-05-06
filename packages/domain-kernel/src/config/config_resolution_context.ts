export const REQUIRED_CONFIG_TYPE_ORDER = [
  "COMPUTATION_RULES",
  "PARITY_THRESHOLDS",
  "TRUST_THRESHOLDS",
  "RISK_THRESHOLDS",
  "WORKFLOW_POLICY",
  "OVERRIDE_POLICY",
  "RETENTION_POLICY",
  "EVIDENCE_CONFIDENCE_POLICY",
  "CANONICALIZATION_RULES",
  "CONNECTOR_MAPPING_RULES",
  "PROVIDER_CONTRACT_PROFILE",
  "MATERIALITY_PROFILE",
  "AMENDMENT_MATERIALITY_PROFILE",
  "MASKING_EXPORT_POLICY",
] as const;

export type ConfigTypeRef = (typeof REQUIRED_CONFIG_TYPE_ORDER)[number];

export const CONFIG_TYPE_TO_FREEZE_REF_FIELD = {
  COMPUTATION_RULES: "computation_rules_ref",
  PARITY_THRESHOLDS: "parity_threshold_profile_ref",
  TRUST_THRESHOLDS: "trust_threshold_profile_ref",
  RISK_THRESHOLDS: "risk_threshold_profile_ref",
  WORKFLOW_POLICY: "workflow_policy_ref",
  OVERRIDE_POLICY: "override_policy_ref",
  RETENTION_POLICY: "retention_profile_ref",
  EVIDENCE_CONFIDENCE_POLICY: "evidence_confidence_policy_ref",
  CANONICALIZATION_RULES: "canonicalization_rules_ref",
  CONNECTOR_MAPPING_RULES: "connector_mapping_rules_ref",
  PROVIDER_CONTRACT_PROFILE: "provider_contract_profile_ref",
  MATERIALITY_PROFILE: "materiality_profile_ref",
  AMENDMENT_MATERIALITY_PROFILE: "amendment_materiality_profile_ref",
  MASKING_EXPORT_POLICY: "masking_export_policy_ref",
} as const satisfies Record<ConfigTypeRef, string>;

export type ConfigFreezeRefField =
  (typeof CONFIG_TYPE_TO_FREEZE_REF_FIELD)[ConfigTypeRef] | "approval_snapshot_ref";

export type ConfigVersionLifecycleState =
  | "DRAFT"
  | "CANDIDATE"
  | "VERIFIED"
  | "APPROVED"
  | "DEPRECATED"
  | "REVOKED"
  | "RETIRED";

export type ConfigResolutionBasis =
  | "DIRECT_REQUEST_RESOLUTION"
  | "REPLAY_EXACT_REUSE"
  | "RECOVERY_EXACT_REUSE"
  | "HISTORICAL_EXPLICIT_REUSE";

export type ContinuationConfigInheritanceMode =
  | null
  | "FRESH_CHILD_RESOLUTION"
  | "REPLAY_EXACT"
  | "RECOVERY_EXACT"
  | "HISTORICAL_EXPLICIT";

export type FeatureFlagSurfaceState =
  | "GOVERNED_FLAG_SURFACE_PRESENT"
  | "NO_GOVERNED_FLAG_SURFACE";

export type FeatureFlagProviderState = "AVAILABLE" | "OUTAGE";

export type FeatureFlagReasonCode =
  | "TARGETING_MATCH"
  | "STATIC_DEFAULT"
  | "NO_GOVERNED_FLAG_SURFACE";

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ConfigVersionRecord = {
  artifact_type: "ConfigVersion";
  version_id: string;
  config_type: ConfigTypeRef;
  lifecycle_state: ConfigVersionLifecycleState;
  content_hash: string;
  effective_scope: string[];
  approvals: string[];
  verification_evidence_ref_or_null: string | null;
  approved_at_or_null: string | null;
  superseded_by_version_id_or_null: string | null;
  revocation_reason_code_or_null: string | null;
  retired_at_or_null: string | null;
  state_changed_at: string;
  created_at: string;
  audit_refs: string[];
  provenance_refs: string[];
  ccr_id_or_null?: string | null;
  test_suite_refs?: string[];
  provider_api_version_or_null?: string | null;
  provider_schema_version_or_null?: string | null;
  environment_allowlist?: string[];
  compatibility_class_or_null?: string | null;
};

export type ConfigFreezeConfigEntry = {
  config_type: ConfigTypeRef;
  version_id: string;
  content_hash: string;
  status_at_freeze: Extract<
    ConfigVersionLifecycleState,
    "APPROVED" | "DEPRECATED" | "REVOKED" | "VERIFIED" | "CANDIDATE" | "DRAFT"
  >;
  effective_scope: string | null;
  effective_from: string;
  effective_to: string | null;
  ccr_id: string | null;
  test_suite_refs: string[];
  provider_api_version: string | null;
  provider_schema_version: string | null;
  environment_allowlist: string[];
  compatibility_class: string | null;
  superseded_by_version_id: string | null;
};

export type FeatureFlagEvaluationContext = {
  tenant_id: string;
  client_id_or_null: string | null;
  environment_ref: string;
  requested_scope: string[];
  executable_scope: string[];
  principal_context_ref_or_null: string | null;
  access_binding_hash_or_null: string | null;
  route_identity_ref_or_null: string | null;
};

export type FeatureFlagSnapshotEntry = {
  flag_key: string;
  enabled: boolean;
  variant_ref_or_null: string | null;
  value_json: JsonValue;
  default_value_json: JsonValue | null;
  rule_ref_or_null: string | null;
  reason_code: FeatureFlagReasonCode;
};

export type FeatureFlagSnapshotArtifact = {
  feature_flag_snapshot_id: string;
  artifact_type: "FeatureFlagSnapshot";
  surface_state: FeatureFlagSurfaceState;
  provider_adapter_ref_or_null: string | null;
  provider_environment_ref_or_null: string | null;
  provider_contract_profile_ref_or_null: string | null;
  evaluation_context: FeatureFlagEvaluationContext;
  entries: FeatureFlagSnapshotEntry[];
  ordered_flag_keys: string[];
  feature_flag_snapshot_hash: string | null;
};

export type ConfigFreezeArtifact = {
  config_freeze_id: string;
  manifest_id: string;
  artifact_type: "ConfigFreeze";
  entries: ConfigFreezeConfigEntry[];
  config_freeze_hash: string;
  schema_bundle_hash: string;
  feature_flag_snapshot_hash: string | null;
  config_surface_hash: string;
  config_completeness_state: "COMPLETE_REQUIRED_CONFIG_SET";
  config_resolution_basis: ConfigResolutionBasis;
  source_config_freeze_ref: string | null;
  source_config_freeze_hash: string | null;
  source_config_surface_hash: string | null;
  config_consumption_mode: "FROZEN_CONFIG_ONLY";
  approval_snapshot_ref: string;
  materiality_profile_ref: string;
  amendment_materiality_profile_ref: string;
  retention_profile_ref: string;
  provider_contract_profile_ref: string;
  workflow_policy_ref: string;
  override_policy_ref: string;
  masking_export_policy_ref: string;
  canonicalization_rules_ref: string;
  connector_mapping_rules_ref: string;
  parity_threshold_profile_ref: string;
  trust_threshold_profile_ref: string;
  risk_threshold_profile_ref: string;
  evidence_confidence_policy_ref: string;
  computation_rules_ref: string;
  required_config_types_present: ConfigTypeRef[];
};

export type FrozenConfigPacket = {
  configByType: Record<ConfigTypeRef, ConfigFreezeConfigEntry>;
  configFreeze: ConfigFreezeArtifact;
  configResolutionBasis: ConfigResolutionBasis;
  configSurfaceHash: string;
  featureFlagSnapshotHash: string | null;
};

export type ConfigResolutionContext = {
  continuation_config_inheritance_mode: ContinuationConfigInheritanceMode;
  config_resolution_basis: ConfigResolutionBasis;
  exact_reuse: boolean;
  provider_read_required: boolean;
  source_lineage_required: boolean;
  resolution_reason_code:
    | "ROOT_DIRECT_RESOLUTION"
    | "FRESH_CHILD_DIRECT_RESOLUTION"
    | "REPLAY_EXACT_REUSE"
    | "RECOVERY_EXACT_REUSE"
    | "HISTORICAL_EXPLICIT_REUSE";
};

export class ConfigResolutionError extends Error {
  readonly code:
    | "CONFIG_BARRIER_INCOMPLETE"
    | "CONFIG_FREEZE_SOURCE_REQUIRED"
    | "CONFIG_FREEZE_UNKNOWN_INHERITANCE_MODE"
    | "CONFIG_FLAG_PROVIDER_OUTAGE"
    | "CONFIG_FLAG_SNAPSHOT_INVALID"
    | "CONFIG_LIVE_FALLBACK_FORBIDDEN"
    | "CONFIG_REQUIRED_FREEZE_MISSING"
    | "CONFIG_REQUIRED_TYPE_MISSING"
    | "CONFIG_VERSION_APPROVAL_REQUIRED"
    | "CONFIG_VERSION_STATUS_INVALID";

  constructor(
    code: ConfigResolutionError["code"],
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ConfigResolutionError";
    this.code = code;
  }
}

export function normalizeStringList(values: readonly string[]) {
  return [...new Set(values.map((value) => value.normalize("NFC")))].sort();
}

export function normalizeFeatureFlagEvaluationContext(
  context: FeatureFlagEvaluationContext,
): FeatureFlagEvaluationContext {
  return {
    tenant_id: context.tenant_id.normalize("NFC"),
    client_id_or_null: context.client_id_or_null?.normalize("NFC") ?? null,
    environment_ref: context.environment_ref.normalize("NFC"),
    requested_scope: normalizeStringList(context.requested_scope),
    executable_scope: normalizeStringList(context.executable_scope),
    principal_context_ref_or_null: context.principal_context_ref_or_null?.normalize("NFC") ?? null,
    access_binding_hash_or_null: context.access_binding_hash_or_null?.normalize("NFC") ?? null,
    route_identity_ref_or_null: context.route_identity_ref_or_null?.normalize("NFC") ?? null,
  };
}

export function createConfigResolutionContext(params: {
  continuationConfigInheritanceMode: ContinuationConfigInheritanceMode;
  providerState: FeatureFlagProviderState;
}) {
  const mode = params.continuationConfigInheritanceMode;
  switch (mode) {
    case null:
      return {
        continuation_config_inheritance_mode: null,
        config_resolution_basis: "DIRECT_REQUEST_RESOLUTION",
        exact_reuse: false,
        provider_read_required: params.providerState === "AVAILABLE",
        source_lineage_required: false,
        resolution_reason_code: "ROOT_DIRECT_RESOLUTION",
      } satisfies ConfigResolutionContext;
    case "FRESH_CHILD_RESOLUTION":
      return {
        continuation_config_inheritance_mode: mode,
        config_resolution_basis: "DIRECT_REQUEST_RESOLUTION",
        exact_reuse: false,
        provider_read_required: params.providerState === "AVAILABLE",
        source_lineage_required: false,
        resolution_reason_code: "FRESH_CHILD_DIRECT_RESOLUTION",
      } satisfies ConfigResolutionContext;
    case "REPLAY_EXACT":
      return {
        continuation_config_inheritance_mode: mode,
        config_resolution_basis: "REPLAY_EXACT_REUSE",
        exact_reuse: true,
        provider_read_required: false,
        source_lineage_required: true,
        resolution_reason_code: "REPLAY_EXACT_REUSE",
      } satisfies ConfigResolutionContext;
    case "RECOVERY_EXACT":
      return {
        continuation_config_inheritance_mode: mode,
        config_resolution_basis: "RECOVERY_EXACT_REUSE",
        exact_reuse: true,
        provider_read_required: false,
        source_lineage_required: true,
        resolution_reason_code: "RECOVERY_EXACT_REUSE",
      } satisfies ConfigResolutionContext;
    case "HISTORICAL_EXPLICIT":
      return {
        continuation_config_inheritance_mode: mode,
        config_resolution_basis: "HISTORICAL_EXPLICIT_REUSE",
        exact_reuse: true,
        provider_read_required: false,
        source_lineage_required: true,
        resolution_reason_code: "HISTORICAL_EXPLICIT_REUSE",
      } satisfies ConfigResolutionContext;
    default:
      throw new ConfigResolutionError(
        "CONFIG_FREEZE_UNKNOWN_INHERITANCE_MODE",
        `unrecognized config inheritance mode ${String(mode)}`,
      );
  }
}

export function isRequiredConfigType(value: string): value is ConfigTypeRef {
  return (REQUIRED_CONFIG_TYPE_ORDER as readonly string[]).includes(value);
}
