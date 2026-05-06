import type { RuntimeConsumerRef, RuntimeScalar, RuntimeSourceRef } from "./runtime_environment.ts";
import { RuntimeEnvironmentError } from "./runtime_environment.ts";

export type FrozenConfigBinding = {
  configFreezeRef: string;
  configFreezeHash: string;
  configSurfaceHash: string;
  configConsumptionMode: "FROZEN_CONFIG_ONLY";
};

export function createFrozenConfigBinding(
  values: Record<string, RuntimeScalar | undefined>,
): FrozenConfigBinding | null {
  const configFreezeRef =
    typeof values.TAXAT_CONFIG_FREEZE_REF === "string" ? values.TAXAT_CONFIG_FREEZE_REF : null;
  const configFreezeHash =
    typeof values.TAXAT_CONFIG_FREEZE_HASH === "string" ? values.TAXAT_CONFIG_FREEZE_HASH : null;
  const configSurfaceHash =
    typeof values.TAXAT_CONFIG_SURFACE_HASH === "string" ? values.TAXAT_CONFIG_SURFACE_HASH : null;
  const configConsumptionMode =
    typeof values.TAXAT_CONFIG_CONSUMPTION_MODE === "string"
      ? values.TAXAT_CONFIG_CONSUMPTION_MODE
      : null;

  const presentCount = [
    configFreezeRef,
    configFreezeHash,
    configSurfaceHash,
    configConsumptionMode,
  ].filter(Boolean).length;
  if (presentCount === 0) {
    return null;
  }
  if (presentCount !== 4) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_CONFIG_FREEZE_REQUIRED",
      detail: "partial frozen-config identity is not allowed",
    });
  }
  if (configConsumptionMode !== "FROZEN_CONFIG_ONLY") {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_CONFIG_FREEZE_REQUIRED",
      envKey: "TAXAT_CONFIG_CONSUMPTION_MODE",
      detail: "config consumption mode must remain FROZEN_CONFIG_ONLY",
    });
  }

  return {
    configFreezeRef,
    configFreezeHash,
    configSurfaceHash,
    configConsumptionMode: "FROZEN_CONFIG_ONLY",
  };
}

export function assertFrozenConfigPresent(
  consumerRef: RuntimeConsumerRef,
  binding: FrozenConfigBinding | null,
) {
  if (!binding) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_CONFIG_FREEZE_REQUIRED",
      consumerRef,
      detail: "consumer requires ConfigFreeze identity before runtime access",
    });
  }
}

export function assertFrozenConfigAccess(params: {
  consumerRef: RuntimeConsumerRef;
  binding: FrozenConfigBinding | null;
  attemptedSource: RuntimeSourceRef;
  envKey: string;
  allowLiveBootstrap: boolean;
}) {
  if (!params.binding || params.allowLiveBootstrap || params.attemptedSource === "FROZEN_CONFIG") {
    return;
  }

  throw new RuntimeEnvironmentError({
    code: "RUNTIME_CONFIG_FREEZE_REQUIRED",
    consumerRef: params.consumerRef,
    envKey: params.envKey,
    source: params.attemptedSource,
    detail: "live environment fallback is forbidden once ConfigFreeze is present",
  });
}
