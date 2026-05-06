import {
  CONFIG_TYPE_TO_FREEZE_REF_FIELD,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeArtifact,
  type ConfigFreezeConfigEntry,
  type ConfigResolutionBasis,
  type ConfigTypeRef,
} from "../../../domain-kernel/src/config/config_resolution_context.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  computeConfigFreezeHash,
  normalizeConfigFreezeEntrySets,
  orderConfigFreezeEntriesByRequiredType,
} from "../hash/config_freeze_hash.ts";
import { computeConfigSurfaceHash } from "../hash/config_surface_hash.ts";
import type { ConfigVersionRecord } from "./config_version.ts";

export type ConfigFreezeRecord = ConfigFreezeArtifact;
export type ConfigFreezeUsageMode = "ANALYSIS" | "COMPLIANCE";
export type ConfigFreezeRunKind =
  | "INTERACTIVE"
  | "NIGHTLY"
  | "BACKFILL"
  | "REPLAY"
  | "REMEDIATION"
  | "AMENDMENT"
  | "MIGRATION";

export const CONFIG_TYPE_CATALOG_VERSION = "CONFIG_TYPE_CATALOG_V1";
export const CONFIG_COMPLETENESS_STATE = "COMPLETE_REQUIRED_CONFIG_SET";
export const CONFIG_CONSUMPTION_MODE = "FROZEN_CONFIG_ONLY";
export const REQUIRED_CONFIG_TYPES_PRESENT = [...REQUIRED_CONFIG_TYPE_ORDER];

type RequiredFreezeRefFields = Exclude<
  keyof Pick<
    ConfigFreezeRecord,
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
  >,
  never
>;

export const REQUIRED_FREEZE_REF_FIELDS: RequiredFreezeRefFields[] = [
  "approval_snapshot_ref",
  "materiality_profile_ref",
  "amendment_materiality_profile_ref",
  "retention_profile_ref",
  "provider_contract_profile_ref",
  "workflow_policy_ref",
  "override_policy_ref",
  "masking_export_policy_ref",
  "canonicalization_rules_ref",
  "connector_mapping_rules_ref",
  "parity_threshold_profile_ref",
  "trust_threshold_profile_ref",
  "risk_threshold_profile_ref",
  "evidence_confidence_policy_ref",
  "computation_rules_ref",
];

export type ConfigFreezeBuildInput = Omit<
  ConfigFreezeRecord,
  | "artifact_type"
  | "config_completeness_state"
  | "config_consumption_mode"
  | "config_freeze_hash"
  | "config_surface_hash"
  | "required_config_types_present"
>;

type ConfigFreezeModelErrorCode =
  | "CONFIG_FREEZE_COMPLETENESS_INVALID"
  | "CONFIG_FREEZE_FIELD_REQUIRED"
  | "CONFIG_FREEZE_HASH_MISMATCH"
  | "CONFIG_FREEZE_PROVIDER_INVARIANT_INVALID"
  | "CONFIG_FREEZE_SOURCE_LINEAGE_INVALID"
  | "CONFIG_FREEZE_STATUS_NOT_ALLOWED";

export class ConfigFreezeModelError extends Error {
  readonly code: ConfigFreezeModelErrorCode;

  constructor(code: ConfigFreezeModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigFreezeModelError";
    this.code = code;
  }
}

function assertFreeze(
  condition: unknown,
  code: ConfigFreezeModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ConfigFreezeModelError(code, detail);
  }
}

function normalizeOptionalString(label: string, value: string | null) {
  return value === null ? null : requireTrimmedString(label, value);
}

function normalizeOptionalInstant(label: string, value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

function normalizeUniqueStrings(label: string, values: readonly string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const candidate = requireTrimmedString(label, value);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      normalized.push(candidate);
    }
  }
  return normalized;
}

function assertConfigType(value: string): asserts value is ConfigTypeRef {
  assertFreeze(
    (REQUIRED_CONFIG_TYPE_ORDER as readonly string[]).includes(value),
    "CONFIG_FREEZE_COMPLETENESS_INVALID",
    `config_type ${value} is outside the required config-type catalog`,
  );
}

function normalizeConfigFreezeEntry(entry: ConfigFreezeConfigEntry): ConfigFreezeConfigEntry {
  assertConfigType(entry.config_type);
  const normalized = normalizeConfigFreezeEntrySets({
    config_type: entry.config_type,
    version_id: requireTrimmedString("config_freeze.entry.version_id", entry.version_id),
    content_hash: requireTrimmedString("config_freeze.entry.content_hash", entry.content_hash),
    status_at_freeze: entry.status_at_freeze,
    effective_scope: normalizeOptionalString(
      "config_freeze.entry.effective_scope",
      entry.effective_scope,
    ),
    effective_from: normalizeUtcInstantString(entry.effective_from),
    effective_to: normalizeOptionalInstant("config_freeze.entry.effective_to", entry.effective_to),
    ccr_id: normalizeOptionalString("config_freeze.entry.ccr_id", entry.ccr_id),
    test_suite_refs: normalizeUniqueStrings(
      "config_freeze.entry.test_suite_refs",
      entry.test_suite_refs,
    ),
    provider_api_version: normalizeOptionalString(
      "config_freeze.entry.provider_api_version",
      entry.provider_api_version,
    ),
    provider_schema_version: normalizeOptionalString(
      "config_freeze.entry.provider_schema_version",
      entry.provider_schema_version,
    ),
    environment_allowlist: normalizeUniqueStrings(
      "config_freeze.entry.environment_allowlist",
      entry.environment_allowlist,
    ),
    compatibility_class: normalizeOptionalString(
      "config_freeze.entry.compatibility_class",
      entry.compatibility_class,
    ),
    superseded_by_version_id: normalizeOptionalString(
      "config_freeze.entry.superseded_by_version_id",
      entry.superseded_by_version_id,
    ),
  });

  const hasProviderApi = normalized.provider_api_version !== null;
  const hasProviderSchema = normalized.provider_schema_version !== null;
  assertFreeze(
    hasProviderApi === hasProviderSchema &&
      (!hasProviderApi || normalized.environment_allowlist.length > 0),
    "CONFIG_FREEZE_PROVIDER_INVARIANT_INVALID",
    "provider-aware config entries require API version, schema version, and non-empty environment allowlist together",
  );
  return normalized;
}

function normalizeConfigFreezeEntries(entries: readonly ConfigFreezeConfigEntry[]) {
  const byType = new Map<ConfigTypeRef, ConfigFreezeConfigEntry>();
  for (const rawEntry of entries) {
    const entry = normalizeConfigFreezeEntry(rawEntry);
    assertFreeze(
      !byType.has(entry.config_type),
      "CONFIG_FREEZE_COMPLETENESS_INVALID",
      `duplicate config entry for ${entry.config_type}`,
    );
    byType.set(entry.config_type, entry);
  }
  for (const configType of REQUIRED_CONFIG_TYPE_ORDER) {
    assertFreeze(
      byType.has(configType),
      "CONFIG_FREEZE_COMPLETENESS_INVALID",
      `missing required config entry for ${configType}`,
    );
  }
  assertFreeze(
    byType.size === REQUIRED_CONFIG_TYPE_ORDER.length,
    "CONFIG_FREEZE_COMPLETENESS_INVALID",
    "config freeze must contain exactly one entry for every required config type",
  );
  return orderConfigFreezeEntriesByRequiredType([...byType.values()]);
}

function assertRequiredRefs(record: ConfigFreezeRecord) {
  for (const field of REQUIRED_FREEZE_REF_FIELDS) {
    requireTrimmedString(`config_freeze.${field}`, record[field]);
  }
}

function assertProjectedRefs(record: ConfigFreezeRecord) {
  const entriesByType = new Map(record.entries.map((entry) => [entry.config_type, entry]));
  for (const configType of REQUIRED_CONFIG_TYPE_ORDER) {
    const field = CONFIG_TYPE_TO_FREEZE_REF_FIELD[configType];
    const entry = entriesByType.get(configType);
    assertFreeze(
      entry !== undefined && record[field] === entry.version_id,
      "CONFIG_FREEZE_COMPLETENESS_INVALID",
      `${field} must mirror the frozen ${configType} version_id`,
    );
  }
}

function assertSourceLineage(record: ConfigFreezeRecord) {
  if (record.config_resolution_basis === "DIRECT_REQUEST_RESOLUTION") {
    assertFreeze(
      record.source_config_freeze_ref === null &&
        record.source_config_freeze_hash === null &&
        record.source_config_surface_hash === null,
      "CONFIG_FREEZE_SOURCE_LINEAGE_INVALID",
      "DIRECT_REQUEST_RESOLUTION must keep all source_config_* fields null",
    );
    return;
  }

  assertFreeze(
    record.source_config_freeze_ref !== null &&
      record.source_config_freeze_hash !== null &&
      record.source_config_surface_hash !== null,
    "CONFIG_FREEZE_SOURCE_LINEAGE_INVALID",
    `${record.config_resolution_basis} requires all source_config_* fields`,
  );
  assertFreeze(
    record.config_freeze_hash === record.source_config_freeze_hash &&
      record.config_surface_hash === record.source_config_surface_hash,
    "CONFIG_FREEZE_SOURCE_LINEAGE_INVALID",
    `${record.config_resolution_basis} must preserve exact freeze and surface hash equality`,
  );
}

function normalizeTopLevelFields(record: ConfigFreezeRecord): ConfigFreezeRecord {
  return {
    ...record,
    config_freeze_id: requireTrimmedString(
      "config_freeze.config_freeze_id",
      record.config_freeze_id,
    ),
    manifest_id: requireTrimmedString("config_freeze.manifest_id", record.manifest_id),
    schema_bundle_hash: requireTrimmedString(
      "config_freeze.schema_bundle_hash",
      record.schema_bundle_hash,
    ),
    feature_flag_snapshot_hash: normalizeOptionalString(
      "config_freeze.feature_flag_snapshot_hash",
      record.feature_flag_snapshot_hash,
    ),
    source_config_freeze_ref: normalizeOptionalString(
      "config_freeze.source_config_freeze_ref",
      record.source_config_freeze_ref,
    ),
    source_config_freeze_hash: normalizeOptionalString(
      "config_freeze.source_config_freeze_hash",
      record.source_config_freeze_hash,
    ),
    source_config_surface_hash: normalizeOptionalString(
      "config_freeze.source_config_surface_hash",
      record.source_config_surface_hash,
    ),
    approval_snapshot_ref: requireTrimmedString(
      "config_freeze.approval_snapshot_ref",
      record.approval_snapshot_ref,
    ),
    materiality_profile_ref: requireTrimmedString(
      "config_freeze.materiality_profile_ref",
      record.materiality_profile_ref,
    ),
    amendment_materiality_profile_ref: requireTrimmedString(
      "config_freeze.amendment_materiality_profile_ref",
      record.amendment_materiality_profile_ref,
    ),
    retention_profile_ref: requireTrimmedString(
      "config_freeze.retention_profile_ref",
      record.retention_profile_ref,
    ),
    provider_contract_profile_ref: requireTrimmedString(
      "config_freeze.provider_contract_profile_ref",
      record.provider_contract_profile_ref,
    ),
    workflow_policy_ref: requireTrimmedString(
      "config_freeze.workflow_policy_ref",
      record.workflow_policy_ref,
    ),
    override_policy_ref: requireTrimmedString(
      "config_freeze.override_policy_ref",
      record.override_policy_ref,
    ),
    masking_export_policy_ref: requireTrimmedString(
      "config_freeze.masking_export_policy_ref",
      record.masking_export_policy_ref,
    ),
    canonicalization_rules_ref: requireTrimmedString(
      "config_freeze.canonicalization_rules_ref",
      record.canonicalization_rules_ref,
    ),
    connector_mapping_rules_ref: requireTrimmedString(
      "config_freeze.connector_mapping_rules_ref",
      record.connector_mapping_rules_ref,
    ),
    parity_threshold_profile_ref: requireTrimmedString(
      "config_freeze.parity_threshold_profile_ref",
      record.parity_threshold_profile_ref,
    ),
    trust_threshold_profile_ref: requireTrimmedString(
      "config_freeze.trust_threshold_profile_ref",
      record.trust_threshold_profile_ref,
    ),
    risk_threshold_profile_ref: requireTrimmedString(
      "config_freeze.risk_threshold_profile_ref",
      record.risk_threshold_profile_ref,
    ),
    evidence_confidence_policy_ref: requireTrimmedString(
      "config_freeze.evidence_confidence_policy_ref",
      record.evidence_confidence_policy_ref,
    ),
    computation_rules_ref: requireTrimmedString(
      "config_freeze.computation_rules_ref",
      record.computation_rules_ref,
    ),
  };
}

export function buildConfigFreezeRecord(input: ConfigFreezeBuildInput): ConfigFreezeRecord {
  const entries = normalizeConfigFreezeEntries(input.entries);
  const configFreezeHash = computeConfigFreezeHash(entries);
  const base: ConfigFreezeRecord = normalizeTopLevelFields({
    ...input,
    artifact_type: "ConfigFreeze",
    entries,
    config_freeze_hash: configFreezeHash,
    config_surface_hash: "",
    config_completeness_state: CONFIG_COMPLETENESS_STATE,
    config_consumption_mode: CONFIG_CONSUMPTION_MODE,
    required_config_types_present: [...REQUIRED_CONFIG_TYPE_ORDER],
  });
  const configSurfaceHash = computeConfigSurfaceHash(base);
  return normalizeConfigFreezeRecord({
    ...base,
    config_surface_hash: configSurfaceHash,
  });
}

export function normalizeConfigFreezeRecord(record: ConfigFreezeRecord): ConfigFreezeRecord {
  assertFreeze(
    record.config_completeness_state === CONFIG_COMPLETENESS_STATE,
    "CONFIG_FREEZE_COMPLETENESS_INVALID",
    "config_completeness_state must be COMPLETE_REQUIRED_CONFIG_SET",
  );
  assertFreeze(
    record.config_consumption_mode === CONFIG_CONSUMPTION_MODE,
    "CONFIG_FREEZE_COMPLETENESS_INVALID",
    "config_consumption_mode must be FROZEN_CONFIG_ONLY",
  );
  assertFreeze(
    JSON.stringify(record.required_config_types_present) ===
      JSON.stringify(REQUIRED_CONFIG_TYPE_ORDER),
    "CONFIG_FREEZE_COMPLETENESS_INVALID",
    "required_config_types_present must match the required config-type catalog order",
  );
  const normalized = normalizeTopLevelFields({
    ...structuredClone(record),
    artifact_type: "ConfigFreeze",
    config_completeness_state: record.config_completeness_state,
    config_consumption_mode: record.config_consumption_mode,
    entries: normalizeConfigFreezeEntries(record.entries),
    required_config_types_present: [...record.required_config_types_present],
  });
  assertRequiredRefs(normalized);
  assertProjectedRefs(normalized);

  const expectedFreezeHash = computeConfigFreezeHash(normalized.entries);
  assertFreeze(
    normalized.config_freeze_hash === expectedFreezeHash,
    "CONFIG_FREEZE_HASH_MISMATCH",
    "config_freeze_hash must match the canonical ordered config entry vector",
  );
  const expectedSurfaceHash = computeConfigSurfaceHash(normalized);
  assertFreeze(
    normalized.config_surface_hash === expectedSurfaceHash,
    "CONFIG_FREEZE_HASH_MISMATCH",
    "config_surface_hash must match the whole governed config surface vector",
  );
  assertSourceLineage(normalized);
  return normalized;
}

export function assertConfigFreezeUsageAllowed(
  configFreeze: ConfigFreezeRecord,
  usage: { mode: ConfigFreezeUsageMode; run_kind: ConfigFreezeRunKind },
) {
  const freeze = normalizeConfigFreezeRecord(configFreeze);
  if (usage.mode === "COMPLIANCE" && usage.run_kind !== "REPLAY") {
    const invalid = freeze.entries.find((entry) => entry.status_at_freeze !== "APPROVED");
    assertFreeze(
      !invalid,
      "CONFIG_FREEZE_STATUS_NOT_ALLOWED",
      `new compliance-capable runs may freeze only APPROVED config versions; ${invalid?.config_type} was ${invalid?.status_at_freeze}`,
    );
    return freeze;
  }
  if (usage.mode === "COMPLIANCE" && usage.run_kind === "REPLAY") {
    const invalid = freeze.entries.find(
      (entry) => !["APPROVED", "DEPRECATED", "REVOKED"].includes(entry.status_at_freeze),
    );
    assertFreeze(
      !invalid,
      "CONFIG_FREEZE_STATUS_NOT_ALLOWED",
      `compliance replay may reference only APPROVED, DEPRECATED, or REVOKED frozen versions; ${invalid?.config_type} was ${invalid?.status_at_freeze}`,
    );
    return freeze;
  }

  const invalid = freeze.entries.find((entry) => entry.status_at_freeze === "REVOKED");
  assertFreeze(
    !invalid,
    "CONFIG_FREEZE_STATUS_NOT_ALLOWED",
    `analysis-mode freezes may not consume REVOKED config versions; ${invalid?.config_type} was REVOKED`,
  );
  return freeze;
}

export function configFreezeRef(freeze: Pick<ConfigFreezeRecord, "config_freeze_id">) {
  return requireTrimmedString("config_freeze_id", freeze.config_freeze_id);
}

export function cloneConfigFreezeRecord(record: ConfigFreezeRecord) {
  return structuredClone(record);
}

export function configVersionToFreezeEntry(input: {
  version: ConfigVersionRecord;
  ccr_id?: string | null;
  test_suite_refs?: string[];
  provider_api_version?: string | null;
  provider_schema_version?: string | null;
  environment_allowlist?: string[];
  compatibility_class?: string | null;
}) {
  const version = input.version;
  assertFreeze(
    version.lifecycle_state !== "RETIRED",
    "CONFIG_FREEZE_STATUS_NOT_ALLOWED",
    "RETIRED config versions cannot be represented as active freeze entries",
  );
  return normalizeConfigFreezeEntry({
    config_type: version.config_type,
    version_id: version.version_id,
    content_hash: version.content_hash,
    status_at_freeze: version.lifecycle_state,
    effective_scope: version.effective_scope[0] ?? null,
    effective_from: version.approved_at_or_null ?? version.created_at,
    effective_to: version.retired_at_or_null,
    ccr_id: input.ccr_id ?? null,
    test_suite_refs: input.test_suite_refs ?? [],
    provider_api_version: input.provider_api_version ?? null,
    provider_schema_version: input.provider_schema_version ?? null,
    environment_allowlist: input.environment_allowlist ?? [],
    compatibility_class: input.compatibility_class ?? null,
    superseded_by_version_id: version.superseded_by_version_id_or_null,
  });
}

export type { ConfigFreezeConfigEntry, ConfigResolutionBasis, ConfigTypeRef };
export { CONFIG_TYPE_TO_FREEZE_REF_FIELD, REQUIRED_CONFIG_TYPE_ORDER };
