import type {
  NativeCacheHydrationAutomationPack,
  NativeCacheHydrationAutomationPackAutomationCase,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type NativeHydrationHarnessCaseExport = {
  cases: NativeCacheHydrationAutomationPackAutomationCase[];
  deterministic_seed: number;
  harness_class: "XCUITEST" | "NATIVE_PERSISTENCE_FIXTURE";
  pack_id: string;
  run_mode: "DETERMINISTIC_SEEDED_ENUMERATION";
};

export function exportXcuitestHydrationCases(
  pack: NativeCacheHydrationAutomationPack,
): NativeHydrationHarnessCaseExport {
  return {
    cases: pack.cases.filter((automationCase) => automationCase.automation_harness === "XCUITEST"),
    deterministic_seed: pack.deterministic_seed,
    harness_class: "XCUITEST",
    pack_id: pack.pack_id,
    run_mode: pack.run_mode,
  };
}
