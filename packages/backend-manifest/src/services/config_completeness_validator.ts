import {
  CONFIG_COMPLETENESS_STATE,
  CONFIG_CONSUMPTION_MODE,
  CONFIG_TYPE_TO_FREEZE_REF_FIELD,
  ConfigFreezeModelError,
  normalizeConfigFreezeRecord,
  REQUIRED_CONFIG_TYPE_ORDER,
  REQUIRED_CONFIG_TYPES_PRESENT,
  REQUIRED_FREEZE_REF_FIELDS,
  type ConfigFreezeConfigEntry,
  type ConfigFreezeRecord,
  type ConfigTypeRef,
} from "../models/config_freeze.ts";

export type ConfigCompletenessErrorCode =
  | "CONFIG_FREEZE_COMPLETENESS_INVALID"
  | "CONFIG_FREEZE_CONSUMPTION_MODE_INVALID"
  | "CONFIG_FREEZE_HASH_DRIFT"
  | "CONFIG_FREEZE_PROFILE_REF_MISSING"
  | "CONFIG_FREEZE_REQUIRED_TYPE_MISSING"
  | "FROZEN_WORKER_PACKET_DRIFT";

export class ConfigCompletenessError extends Error {
  readonly code: ConfigCompletenessErrorCode;

  constructor(code: ConfigCompletenessErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigCompletenessError";
    this.code = code;
  }
}

function assertCompleteness(
  condition: unknown,
  code: ConfigCompletenessErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ConfigCompletenessError(code, detail);
  }
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function entriesByTypeFromOrderedEntries(
  entries: readonly ConfigFreezeConfigEntry[],
): Record<ConfigTypeRef, ConfigFreezeConfigEntry> {
  return Object.fromEntries(entries.map((entry) => [entry.config_type, entry])) as Record<
    ConfigTypeRef,
    ConfigFreezeConfigEntry
  >;
}

function preflightCompletenessShape(record: ConfigFreezeRecord) {
  assertCompleteness(
    record.config_completeness_state === CONFIG_COMPLETENESS_STATE,
    "CONFIG_FREEZE_COMPLETENESS_INVALID",
    "config_completeness_state must be COMPLETE_REQUIRED_CONFIG_SET",
  );
  assertCompleteness(
    record.config_consumption_mode === CONFIG_CONSUMPTION_MODE,
    "CONFIG_FREEZE_CONSUMPTION_MODE_INVALID",
    "runtime config consumption must be FROZEN_CONFIG_ONLY",
  );
  assertCompleteness(
    sameOrderedStrings(record.required_config_types_present, REQUIRED_CONFIG_TYPES_PRESENT),
    "CONFIG_FREEZE_REQUIRED_TYPE_MISSING",
    "required_config_types_present must match the required config catalog order",
  );

  const entryTypes = record.entries.map((entry) => entry.config_type);
  assertCompleteness(
    sameOrderedStrings(entryTypes, REQUIRED_CONFIG_TYPE_ORDER),
    "CONFIG_FREEZE_REQUIRED_TYPE_MISSING",
    "ConfigFreeze entries must contain exactly one entry for each required type in catalog order",
  );

  for (const field of REQUIRED_FREEZE_REF_FIELDS) {
    assertCompleteness(
      typeof record[field] === "string" && record[field].trim().length > 0,
      "CONFIG_FREEZE_PROFILE_REF_MISSING",
      `${field} must be present before frozen config can be materialized`,
    );
  }
}

export function assertCompleteConfigFreeze(configFreeze: ConfigFreezeRecord): ConfigFreezeRecord {
  preflightCompletenessShape(configFreeze);
  try {
    return normalizeConfigFreezeRecord(configFreeze);
  } catch (error) {
    if (error instanceof ConfigFreezeModelError && error.code === "CONFIG_FREEZE_HASH_MISMATCH") {
      throw new ConfigCompletenessError("CONFIG_FREEZE_HASH_DRIFT", error.message);
    }
    if (error instanceof Error) {
      throw new ConfigCompletenessError("CONFIG_FREEZE_COMPLETENESS_INVALID", error.message);
    }
    throw error;
  }
}

export function configEntriesByType(
  configFreeze: ConfigFreezeRecord,
): Record<ConfigTypeRef, ConfigFreezeConfigEntry> {
  const freeze = assertCompleteConfigFreeze(configFreeze);
  return entriesByTypeFromOrderedEntries(freeze.entries);
}

export function projectConfigRefsByType(configFreeze: ConfigFreezeRecord): Record<ConfigTypeRef, string> {
  const freeze = assertCompleteConfigFreeze(configFreeze);
  const refs = {} as Record<ConfigTypeRef, string>;
  for (const configType of REQUIRED_CONFIG_TYPE_ORDER) {
    refs[configType] = freeze[CONFIG_TYPE_TO_FREEZE_REF_FIELD[configType]];
  }
  return refs;
}

export type FrozenConfigWorkerPacket = {
  config_consumption_mode: typeof CONFIG_CONSUMPTION_MODE;
  config_freeze_hash: string;
  config_freeze_id: string;
  config_resolution_basis: ConfigFreezeRecord["config_resolution_basis"];
  config_surface_hash: string;
  feature_flag_snapshot_hash: string | null;
  manifest_id: string;
  packet_contract: "FROZEN_CONFIG_WORKER_PACKET_V1";
  schema_bundle_hash: string;
};

export function createFrozenConfigWorkerPacket(
  configFreeze: ConfigFreezeRecord,
): FrozenConfigWorkerPacket {
  const freeze = assertCompleteConfigFreeze(configFreeze);
  return {
    packet_contract: "FROZEN_CONFIG_WORKER_PACKET_V1",
    config_freeze_id: freeze.config_freeze_id,
    manifest_id: freeze.manifest_id,
    config_freeze_hash: freeze.config_freeze_hash,
    config_surface_hash: freeze.config_surface_hash,
    schema_bundle_hash: freeze.schema_bundle_hash,
    feature_flag_snapshot_hash: freeze.feature_flag_snapshot_hash,
    config_resolution_basis: freeze.config_resolution_basis,
    config_consumption_mode: freeze.config_consumption_mode,
  };
}

export function assertWorkerFrozenConfigPacketMatches(input: {
  config_freeze: ConfigFreezeRecord;
  worker_packet: FrozenConfigWorkerPacket;
}) {
  const expected = createFrozenConfigWorkerPacket(input.config_freeze);
  const packet = input.worker_packet;
  for (const field of Object.keys(expected) as Array<keyof FrozenConfigWorkerPacket>) {
    assertCompleteness(
      packet[field] === expected[field],
      "FROZEN_WORKER_PACKET_DRIFT",
      `${field} drifted between ConfigFreeze and worker packet`,
    );
  }
  return packet;
}
