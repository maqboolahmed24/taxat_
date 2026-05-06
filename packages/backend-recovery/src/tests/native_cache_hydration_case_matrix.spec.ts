import { expect, test } from "@playwright/test";

import {
  assertNativeCacheHydrationAutomationCase,
  buildNativeCacheHydrationAutomationPack,
  enumerateNativeHydrationCases,
  nativeHydrationAutomationHarnesses,
  nativeHydrationAutomationPurgeInventory,
  nativeHydrationAutomationScenarioExpectations,
  nativeHydrationAutomationScenarioOrder,
  scenarioRequiresPurge,
} from "../index.ts";

test("enumerates every required scenario exactly once in deterministic order", () => {
  const cases = enumerateNativeHydrationCases({ deterministic_seed: 7501 });

  expect(cases.map((automationCase) => automationCase.scenario_class)).toEqual(
    nativeHydrationAutomationScenarioOrder,
  );
  expect(new Set(cases.map((automationCase) => automationCase.scenario_class)).size).toBe(
    nativeHydrationAutomationScenarioOrder.length,
  );
  expect(new Set(cases.map((automationCase) => automationCase.case_id)).size).toBe(cases.length);
});

test("covers both native harness classes without duplicating scenario semantics", () => {
  const pack = buildNativeCacheHydrationAutomationPack();
  expect(new Set(pack.cases.map((automationCase) => automationCase.automation_harness))).toEqual(
    new Set(nativeHydrationAutomationHarnesses),
  );

  const scenariosByHarness = new Map(
    nativeHydrationAutomationHarnesses.map(
      (harness) =>
        [
          harness,
          pack.cases
            .filter((automationCase) => automationCase.automation_harness === harness)
            .map((automationCase) => automationCase.scenario_class),
        ] as const,
    ),
  );
  expect(scenariosByHarness.get("XCUITEST")).toEqual([
    "COLD_START_COMPATIBLE_CACHE",
    "TENANT_SWITCH",
    "SESSION_REVOCATION",
    "CACHE_ONLY_RESTORE_REBASE_REQUIRED",
  ]);
  expect(scenariosByHarness.get("NATIVE_PERSISTENCE_FIXTURE")).toEqual([
    "COLD_START_SCHEMA_INCOMPATIBLE",
    "PRIVILEGE_DOWNGRADE",
    "SECONDARY_WINDOW_MASKING_PURGE",
  ]);
});

test("pins first-paint, action-gate, resume-binding, and purge expectations by scenario", () => {
  for (const automationCase of enumerateNativeHydrationCases()) {
    const expected = nativeHydrationAutomationScenarioExpectations[automationCase.scenario_class];
    expect(assertNativeCacheHydrationAutomationCase(automationCase)).toBe(automationCase);
    expect(automationCase.compatibility_check_completed_before_render).toBe(true);
    expect(automationCase.incompatible_content_rendered).toBe(false);
    expect(automationCase.resume_lineage_reused_illegally).toBe(false);
    expect(automationCase.restoration_reopened_stale_context).toBe(false);
    expect(automationCase.expected_first_paint_outcome).toBe(
      expected.expected_first_paint_outcome,
    );
    expect(automationCase.expected_action_outcome).toBe(expected.expected_action_outcome);
    expect(automationCase.expected_resume_binding_state).toBe(
      expected.expected_resume_binding_state,
    );
    expect(automationCase.purge_reason_code_or_null).toBe(expected.purge_reason_code_or_null);
    expect(automationCase.purged_artifact_classes).toEqual(
      scenarioRequiresPurge(automationCase.scenario_class)
        ? [...nativeHydrationAutomationPurgeInventory]
        : [],
    );
  }
});

test("represents secondary-window masking or preview purge with preview-related artifacts", () => {
  const secondaryCase = buildNativeCacheHydrationAutomationPack().cases.find(
    (automationCase) => automationCase.scenario_class === "SECONDARY_WINDOW_MASKING_PURGE",
  );

  expect(secondaryCase).toMatchObject({
    automation_harness: "NATIVE_PERSISTENCE_FIXTURE",
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_ACCESS_REBIND",
    expected_first_paint_outcome: "PURGED_NO_RESTORE",
    hydration_scope_class: "NATIVE_SECONDARY_WINDOW",
    purge_reason_code_or_null: "MASKING_CHANGE",
  });
  expect(secondaryCase?.purged_artifact_classes).toEqual(
    expect.arrayContaining(["PREVIEW_CACHE", "TEMP_EXPORT_FILE", "NSUSERACTIVITY"]),
  );
});
