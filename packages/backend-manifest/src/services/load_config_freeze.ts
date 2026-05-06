import type { ConfigFreezeRepository } from "../repositories/config_freeze_repository.ts";
import type {
  ConfigFreezeConfigEntry,
  ConfigFreezeRecord,
  ConfigTypeRef,
} from "../models/config_freeze.ts";
import {
  assertCompleteConfigFreeze,
  assertWorkerFrozenConfigPacketMatches,
  configEntriesByType,
  createFrozenConfigWorkerPacket,
  type FrozenConfigWorkerPacket,
} from "./config_completeness_validator.ts";

export type FrozenConfigFallbackSource =
  | "LIVE_CONFIG_SERVICE"
  | "LIVE_PROVIDER"
  | "PROCESS_ENV";

export type LoadConfigFreezeErrorCode =
  | "CONFIG_LIVE_FALLBACK_FORBIDDEN"
  | "CONFIG_REQUIRED_FREEZE_MISSING";

export class LoadConfigFreezeError extends Error {
  readonly code: LoadConfigFreezeErrorCode;

  constructor(code: LoadConfigFreezeErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LoadConfigFreezeError";
    this.code = code;
  }
}

export type LoadedConfigFreezePacket = {
  config_by_type: Record<ConfigTypeRef, ConfigFreezeConfigEntry>;
  config_freeze: ConfigFreezeRecord;
  config_resolution_basis: ConfigFreezeRecord["config_resolution_basis"];
  config_surface_hash: string;
  feature_flag_snapshot_hash: string | null;
  worker_packet: FrozenConfigWorkerPacket;
};

export type LoadConfigFreezeInput = {
  attempted_fallback_source_or_null?: FrozenConfigFallbackSource | null;
  config_freeze?: ConfigFreezeRecord | null;
  config_freeze_id?: string;
  config_freeze_repository?: ConfigFreezeRepository;
  expected_worker_packet?: FrozenConfigWorkerPacket | null;
  tenant_id?: string;
};

async function resolveFreeze(input: LoadConfigFreezeInput) {
  if (input.config_freeze) {
    return input.config_freeze;
  }
  if (input.config_freeze_repository && input.tenant_id && input.config_freeze_id) {
    const stored = await input.config_freeze_repository.requireFreezeById(
      input.tenant_id,
      input.config_freeze_id,
    );
    return stored.freeze;
  }
  throw new LoadConfigFreezeError(
    "CONFIG_REQUIRED_FREEZE_MISSING",
    "frozen config is required before runtime consumption",
  );
}

export async function loadConfigFreeze(
  input: LoadConfigFreezeInput,
): Promise<LoadedConfigFreezePacket> {
  if (input.attempted_fallback_source_or_null) {
    throw new LoadConfigFreezeError(
      "CONFIG_LIVE_FALLBACK_FORBIDDEN",
      "workers and replay loaders must not fall back to live config after seal",
    );
  }

  const configFreeze = assertCompleteConfigFreeze(await resolveFreeze(input));
  const workerPacket = input.expected_worker_packet
    ? assertWorkerFrozenConfigPacketMatches({
        config_freeze: configFreeze,
        worker_packet: input.expected_worker_packet,
      })
    : createFrozenConfigWorkerPacket(configFreeze);

  return {
    config_freeze: configFreeze,
    config_by_type: configEntriesByType(configFreeze),
    config_resolution_basis: configFreeze.config_resolution_basis,
    config_surface_hash: configFreeze.config_surface_hash,
    feature_flag_snapshot_hash: configFreeze.feature_flag_snapshot_hash,
    worker_packet: workerPacket,
  };
}
