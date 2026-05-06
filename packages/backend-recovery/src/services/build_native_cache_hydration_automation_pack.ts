import type { NativeCacheHydrationAutomationPack } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { assertNativeCacheHydrationAutomationPack } from "../models/native_cache_hydration_automation_pack.ts";
import { enumerateNativeHydrationCases } from "./enumerate_native_hydration_cases.ts";

export type BuildNativeCacheHydrationAutomationPackInput = {
  deterministic_seed?: number | undefined;
  pack_id?: string | undefined;
};

const defaultDeterministicSeed = 7501;
const defaultPackId = "native-cache-hydration-pack-75";

export function buildNativeCacheHydrationAutomationPack(
  input: BuildNativeCacheHydrationAutomationPackInput = {},
): NativeCacheHydrationAutomationPack {
  const deterministicSeed = input.deterministic_seed ?? defaultDeterministicSeed;
  const pack = {
    action_gate_assertion_policy: "CACHE_ONLY_RESTORE_CANNOT_MUTATE_UNTIL_LIVE_REBASE",
    cases: enumerateNativeHydrationCases({
      deterministic_seed: deterministicSeed,
    }),
    contract_version: "NATIVE_CACHE_HYDRATION_AUTOMATION_PACK_V1",
    coverage_policy: "COLD_START_RECONNECT_TENANT_SWITCH_DOWNGRADE_REVOCATION_AND_SCHEMA_DRIFT",
    deterministic_seed: deterministicSeed,
    first_paint_assertion_policy: "COMPATIBILITY_VERIFIED_BEFORE_RENDERED_CONTENT",
    pack_id:
      input.pack_id ??
      (deterministicSeed === defaultDeterministicSeed
        ? defaultPackId
        : `native-cache-hydration-pack-${deterministicSeed}`),
    purge_assertion_policy: "IMMEDIATE_SELECTIVE_PURGE_ACROSS_CACHE_AND_LOCAL_ARTIFACTS",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    suite_profile: "MACOS_CACHE_HYDRATION_PURGE_REBASE_AND_RESTORATION_MATRIX",
  } satisfies NativeCacheHydrationAutomationPack;

  return assertNativeCacheHydrationAutomationPack(pack);
}
