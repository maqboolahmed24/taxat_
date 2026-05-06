import type { NativeCacheHydrationAutomationPack } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { NativeHydrationHarnessCaseExport } from "./export_xcuitest_hydration_cases.ts";

export function exportNativePersistenceFixtureCases(
  pack: NativeCacheHydrationAutomationPack,
): NativeHydrationHarnessCaseExport {
  return {
    cases: pack.cases.filter(
      (automationCase) => automationCase.automation_harness === "NATIVE_PERSISTENCE_FIXTURE",
    ),
    deterministic_seed: pack.deterministic_seed,
    harness_class: "NATIVE_PERSISTENCE_FIXTURE",
    pack_id: pack.pack_id,
    run_mode: pack.run_mode,
  };
}
