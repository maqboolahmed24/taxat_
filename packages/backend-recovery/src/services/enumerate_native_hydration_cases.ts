import {
  assertNativeCacheHydrationAutomationCase,
  nativeHydrationAutomationCaseSeeds,
  nativeHydrationAutomationScenarioExpectations,
  type NativeCacheHydrationAutomationPackAutomationCase,
} from "../models/native_cache_hydration_automation_pack.ts";

export type EnumerateNativeHydrationCasesInput = {
  deterministic_seed?: number | undefined;
};

export function enumerateNativeHydrationCases(
  _input: EnumerateNativeHydrationCasesInput = {},
): NativeCacheHydrationAutomationPackAutomationCase[] {
  return nativeHydrationAutomationCaseSeeds.map((seed) => {
    const expected = nativeHydrationAutomationScenarioExpectations[seed.scenario_class];
    return assertNativeCacheHydrationAutomationCase({
      automation_harness: seed.automation_harness,
      case_id: seed.case_id,
      compatibility_check_completed_before_render: true,
      expected_action_outcome: expected.expected_action_outcome,
      expected_first_paint_outcome: expected.expected_first_paint_outcome,
      expected_resume_binding_state: expected.expected_resume_binding_state,
      hydration_scope_class: seed.hydration_scope_class,
      incompatible_content_rendered: false,
      purge_reason_code_or_null: expected.purge_reason_code_or_null,
      purged_artifact_classes: [...expected.purged_artifact_classes],
      restoration_reopened_stale_context: false,
      resume_lineage_reused_illegally: false,
      scenario_class: seed.scenario_class,
    } satisfies NativeCacheHydrationAutomationPackAutomationCase);
  });
}
