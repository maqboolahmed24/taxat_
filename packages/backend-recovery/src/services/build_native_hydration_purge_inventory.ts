import {
  nativeHydrationAutomationPurgeInventory,
  type NativeCacheHydrationAutomationPackAutomationCase,
} from "../models/native_cache_hydration_automation_pack.ts";

export function buildNativeHydrationPurgeInventory(input?: {
  purge_required?: boolean | undefined;
}) {
  return input?.purge_required === false ? [] : [...nativeHydrationAutomationPurgeInventory];
}

export function nativeHydrationCaseRequiresFullPurgeInventory(
  automationCase: NativeCacheHydrationAutomationPackAutomationCase,
) {
  return automationCase.purge_reason_code_or_null !== null;
}
