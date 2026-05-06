import {
  CONFIG_TYPE_TO_FREEZE_REF_FIELD,
  assertConfigFreezeUsageAllowed,
  buildConfigFreezeRecord,
  normalizeConfigFreezeRecord,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeBuildInput,
  type ConfigFreezeConfigEntry,
  type ConfigFreezeRecord,
  type ConfigFreezeRunKind,
  type ConfigFreezeUsageMode,
  type ConfigResolutionBasis,
} from "../models/config_freeze.ts";
import { assertCompleteConfigFreeze } from "./config_completeness_validator.ts";

export type FreezeConfigErrorCode =
  | "CONFIG_FREEZE_BASIS_INVALID"
  | "CONFIG_FREEZE_SOURCE_REQUIRED";

export class FreezeConfigError extends Error {
  readonly code: FreezeConfigErrorCode;

  constructor(code: FreezeConfigErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "FreezeConfigError";
    this.code = code;
  }
}

export type FreezeConfigInput = {
  approval_snapshot_ref: string;
  config_freeze_id: string;
  config_resolution_basis?: ConfigResolutionBasis;
  entries: ConfigFreezeConfigEntry[];
  feature_flag_snapshot_hash: string | null;
  manifest_id: string;
  schema_bundle_hash: string;
  source_config_freeze?: ConfigFreezeRecord | null;
  usage?: {
    mode: ConfigFreezeUsageMode;
    run_kind: ConfigFreezeRunKind;
  };
};

export type ReuseFrozenConfigInput = {
  config_freeze_id: string;
  config_resolution_basis: Exclude<ConfigResolutionBasis, "DIRECT_REQUEST_RESOLUTION">;
  manifest_id: string;
  source_config_freeze: ConfigFreezeRecord;
  usage?: {
    mode: ConfigFreezeUsageMode;
    run_kind: ConfigFreezeRunKind;
  };
};

export function projectFreezeRefFieldsFromEntries(entries: readonly ConfigFreezeConfigEntry[]) {
  const entriesByType = new Map(entries.map((entry) => [entry.config_type, entry]));
  return Object.fromEntries(
    REQUIRED_CONFIG_TYPE_ORDER.map((configType) => [
      CONFIG_TYPE_TO_FREEZE_REF_FIELD[configType],
      entriesByType.get(configType)?.version_id ?? "",
    ]),
  ) as Pick<
    ConfigFreezeBuildInput,
    | "amendment_materiality_profile_ref"
    | "canonicalization_rules_ref"
    | "computation_rules_ref"
    | "connector_mapping_rules_ref"
    | "evidence_confidence_policy_ref"
    | "masking_export_policy_ref"
    | "materiality_profile_ref"
    | "override_policy_ref"
    | "parity_threshold_profile_ref"
    | "provider_contract_profile_ref"
    | "retention_profile_ref"
    | "risk_threshold_profile_ref"
    | "trust_threshold_profile_ref"
    | "workflow_policy_ref"
  >;
}

function maybeAssertUsage(
  freeze: ConfigFreezeRecord,
  usage: FreezeConfigInput["usage"],
) {
  return usage ? assertConfigFreezeUsageAllowed(freeze, usage) : normalizeConfigFreezeRecord(freeze);
}

export function freezeConfig(input: FreezeConfigInput): ConfigFreezeRecord {
  const basis = input.config_resolution_basis ?? "DIRECT_REQUEST_RESOLUTION";
  if (basis === "DIRECT_REQUEST_RESOLUTION" && input.source_config_freeze) {
    throw new FreezeConfigError(
      "CONFIG_FREEZE_BASIS_INVALID",
      "DIRECT_REQUEST_RESOLUTION must not carry source ConfigFreeze lineage",
    );
  }

  const source = input.source_config_freeze
    ? assertCompleteConfigFreeze(input.source_config_freeze)
    : null;
  const freeze = buildConfigFreezeRecord({
    config_freeze_id: input.config_freeze_id,
    manifest_id: input.manifest_id,
    entries: input.entries,
    schema_bundle_hash: input.schema_bundle_hash,
    feature_flag_snapshot_hash: input.feature_flag_snapshot_hash,
    config_resolution_basis: basis,
    source_config_freeze_ref: source?.config_freeze_id ?? null,
    source_config_freeze_hash: source?.config_freeze_hash ?? null,
    source_config_surface_hash: source?.config_surface_hash ?? null,
    approval_snapshot_ref: input.approval_snapshot_ref,
    ...projectFreezeRefFieldsFromEntries(input.entries),
  });
  return maybeAssertUsage(freeze, input.usage);
}

export function freezeConfigFromSourceReuse(input: ReuseFrozenConfigInput): ConfigFreezeRecord {
  const source = assertCompleteConfigFreeze(input.source_config_freeze);
  const freeze = buildConfigFreezeRecord({
    config_freeze_id: input.config_freeze_id,
    manifest_id: input.manifest_id,
    entries: source.entries,
    schema_bundle_hash: source.schema_bundle_hash,
    feature_flag_snapshot_hash: source.feature_flag_snapshot_hash,
    config_resolution_basis: input.config_resolution_basis,
    source_config_freeze_ref: source.config_freeze_id,
    source_config_freeze_hash: source.config_freeze_hash,
    source_config_surface_hash: source.config_surface_hash,
    approval_snapshot_ref: source.approval_snapshot_ref,
    ...projectFreezeRefFieldsFromEntries(source.entries),
  });
  return maybeAssertUsage(freeze, input.usage);
}
