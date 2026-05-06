import { NONE_SENTINEL, stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  normalizeStringList,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigFreezeConfigEntry,
  type ConfigTypeRef,
} from "../../../domain-kernel/src/config/config_resolution_context.ts";

export type ConfigFreezeHashEntry = Pick<
  ConfigFreezeConfigEntry,
  | "config_type"
  | "version_id"
  | "content_hash"
  | "provider_api_version"
  | "provider_schema_version"
  | "status_at_freeze"
>;

export type ConfigFreezeHashVectorEntry = {
  config_type: ConfigTypeRef;
  content_hash: string;
  provider_api_version: string;
  provider_schema_version: string;
  status_at_freeze: ConfigFreezeConfigEntry["status_at_freeze"];
  version_id: string;
};

const REQUIRED_CONFIG_TYPE_RANK = new Map(
  REQUIRED_CONFIG_TYPE_ORDER.map((configType, index) => [configType, index]),
);

function canonicalNull(value: string | null) {
  return value ?? NONE_SENTINEL;
}

export function orderConfigFreezeEntriesByRequiredType<
  T extends Pick<ConfigFreezeConfigEntry, "config_type">,
>(entries: readonly T[]) {
  return [...entries].sort((left, right) => {
    const leftRank = REQUIRED_CONFIG_TYPE_RANK.get(left.config_type) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = REQUIRED_CONFIG_TYPE_RANK.get(right.config_type) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.config_type.localeCompare(right.config_type);
  });
}

export function createConfigFreezeHashVector(
  entries: readonly ConfigFreezeHashEntry[],
): ConfigFreezeHashVectorEntry[] {
  return orderConfigFreezeEntriesByRequiredType(entries).map((entry) => ({
    config_type: entry.config_type,
    version_id: entry.version_id.normalize("NFC"),
    content_hash: entry.content_hash.normalize("NFC"),
    provider_api_version: canonicalNull(entry.provider_api_version).normalize("NFC"),
    provider_schema_version: canonicalNull(entry.provider_schema_version).normalize("NFC"),
    status_at_freeze: entry.status_at_freeze,
  }));
}

export function computeConfigFreezeHash(entries: readonly ConfigFreezeHashEntry[]) {
  return stableJsonHash({
    profile: "CONFIG_FREEZE_HASH_V1",
    vector: createConfigFreezeHashVector(entries),
  });
}

export function normalizeConfigFreezeEntrySets<T extends ConfigFreezeConfigEntry>(entry: T): T {
  return {
    ...entry,
    test_suite_refs: normalizeStringList(entry.test_suite_refs),
    environment_allowlist: normalizeStringList(entry.environment_allowlist),
  };
}
