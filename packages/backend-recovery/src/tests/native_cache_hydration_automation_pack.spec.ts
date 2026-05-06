import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertNativeCacheHydrationAutomationPack,
  buildNativeCacheHydrationAutomationPack,
  buildNativeHydrationPurgeInventory,
  exportNativePersistenceFixtureCases,
  exportXcuitestHydrationCases,
  nativeCacheHydrationAutomationPackSerializedFailureTrace,
  nativeHydrationAutomationPurgeInventory,
  nativeHydrationAutomationScenarioOrder,
} from "../index.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function sampleNativeHydrationAutomationPack() {
  return JSON.parse(
    await readFile(
      path.join(
        repoRoot,
        "Algorithm",
        "schemas",
        "sample_native_cache_hydration_automation_pack.json",
      ),
      "utf8",
    ),
  );
}

test("builds the canonical schema-valid native hydration automation pack", async () => {
  const pack = buildNativeCacheHydrationAutomationPack();

  await validateContractSchema("native_cache_hydration_automation_pack", pack);
  expect(pack).toEqual(await sampleNativeHydrationAutomationPack());
  expect(pack.run_mode).toBe("DETERMINISTIC_SEEDED_ENUMERATION");
  expect(pack.cases.map((automationCase) => automationCase.scenario_class)).toEqual(
    nativeHydrationAutomationScenarioOrder,
  );
  expect(pack.cases.map((automationCase) => automationCase.case_id)).toEqual([
    "compatible-cold-start-primary",
    "schema-incompatible-cold-start",
    "tenant-switch-primary-scene",
    "privilege-downgrade-workspace",
    "session-revocation-primary-scene",
    "cache-only-restore-needs-rebase",
    "secondary-window-masking-purge",
  ]);
});

test("exports deterministic XCUITest and native persistence fixture case views from the same pack", () => {
  const pack = buildNativeCacheHydrationAutomationPack();
  const xcuiTest = exportXcuitestHydrationCases(pack);
  const persistenceFixtures = exportNativePersistenceFixtureCases(pack);

  expect(xcuiTest.harness_class).toBe("XCUITEST");
  expect(persistenceFixtures.harness_class).toBe("NATIVE_PERSISTENCE_FIXTURE");
  expect(xcuiTest.cases).toEqual(
    pack.cases.filter((automationCase) => automationCase.automation_harness === "XCUITEST"),
  );
  expect(persistenceFixtures.cases).toEqual(
    pack.cases.filter(
      (automationCase) => automationCase.automation_harness === "NATIVE_PERSISTENCE_FIXTURE",
    ),
  );
  expect([...xcuiTest.cases, ...persistenceFixtures.cases].map((entry) => entry.case_id).sort()).toEqual(
    pack.cases.map((entry) => entry.case_id).sort(),
  );
});

test("requires full purge inventory for every purge-triggered native case", () => {
  const pack = buildNativeCacheHydrationAutomationPack();
  const purgeCases = pack.cases.filter(
    (automationCase) => automationCase.purge_reason_code_or_null !== null,
  );
  expect(purgeCases).toHaveLength(5);
  for (const automationCase of purgeCases) {
    expect(automationCase.purged_artifact_classes).toEqual([
      "STRUCTURED_CACHE",
      "RESUME_METADATA",
      "SCENE_RESTORATION_PAYLOAD",
      "NSUSERACTIVITY",
      "PREVIEW_CACHE",
      "TEMP_EXPORT_FILE",
      "LOCAL_SEARCH_INDEX",
    ]);
  }
  expect(buildNativeHydrationPurgeInventory()).toEqual([
    ...nativeHydrationAutomationPurgeInventory,
  ]);
  expect(buildNativeHydrationPurgeInventory({ purge_required: false })).toEqual([]);
});

test("keeps cache-only restoration read-only until live rebase", () => {
  const pack = buildNativeCacheHydrationAutomationPack();
  const cacheOnlyRestore = pack.cases.find(
    (automationCase) =>
      automationCase.scenario_class === "CACHE_ONLY_RESTORE_REBASE_REQUIRED",
  );

  expect(cacheOnlyRestore).toMatchObject({
    compatibility_check_completed_before_render: true,
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_REBASE",
    expected_first_paint_outcome: "CACHED_RENDER_AFTER_CHECK",
    expected_resume_binding_state: "CLEARED_FOR_REBASE",
    incompatible_content_rendered: false,
    purge_reason_code_or_null: null,
    purged_artifact_classes: [],
  });
});

test("fails closed with serialized traces when required automation proof drifts", () => {
  const pack = buildNativeCacheHydrationAutomationPack();
  const drifted = {
    ...pack,
    cases: pack.cases.map((automationCase) =>
      automationCase.scenario_class === "TENANT_SWITCH"
        ? {
            ...automationCase,
            purged_artifact_classes: ["STRUCTURED_CACHE"],
          }
        : automationCase,
    ),
  };

  expect(() => assertNativeCacheHydrationAutomationPack(drifted)).toThrow(/trace=/);
  expect(nativeCacheHydrationAutomationPackSerializedFailureTrace(drifted)).toContain(
    "TENANT_SWITCH",
  );
});
