import type {
  NativeCacheHydrationAutomationPack,
  NativeCacheHydrationAutomationPackActionOutcome,
  NativeCacheHydrationAutomationPackArtifactClass,
  NativeCacheHydrationAutomationPackAutomationCase,
  NativeCacheHydrationAutomationPackAutomationHarness,
  NativeCacheHydrationAutomationPackFirstPaintOutcome,
  NativeCacheHydrationAutomationPackHydrationScopeClass,
  NativeCacheHydrationAutomationPackPurgeReason,
  NativeCacheHydrationAutomationPackResumeBindingState,
  NativeCacheHydrationAutomationPackScenarioClass,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type {
  NativeCacheHydrationAutomationPack,
  NativeCacheHydrationAutomationPackAutomationCase,
};

export const nativeHydrationAutomationScenarioOrder = [
  "COLD_START_COMPATIBLE_CACHE",
  "COLD_START_SCHEMA_INCOMPATIBLE",
  "TENANT_SWITCH",
  "PRIVILEGE_DOWNGRADE",
  "SESSION_REVOCATION",
  "CACHE_ONLY_RESTORE_REBASE_REQUIRED",
  "SECONDARY_WINDOW_MASKING_PURGE",
] as const satisfies readonly NativeCacheHydrationAutomationPackScenarioClass[];

export const nativeHydrationAutomationHarnesses = [
  "XCUITEST",
  "NATIVE_PERSISTENCE_FIXTURE",
] as const satisfies readonly NativeCacheHydrationAutomationPackAutomationHarness[];

export const nativeHydrationAutomationPurgeInventory = [
  "STRUCTURED_CACHE",
  "RESUME_METADATA",
  "SCENE_RESTORATION_PAYLOAD",
  "NSUSERACTIVITY",
  "PREVIEW_CACHE",
  "TEMP_EXPORT_FILE",
  "LOCAL_SEARCH_INDEX",
] as const satisfies readonly NativeCacheHydrationAutomationPackArtifactClass[];

type ScenarioExpectation = {
  expected_action_outcome: NativeCacheHydrationAutomationPackActionOutcome;
  expected_first_paint_outcome: NativeCacheHydrationAutomationPackFirstPaintOutcome;
  expected_resume_binding_state: NativeCacheHydrationAutomationPackResumeBindingState;
  purge_reason_code_or_null: NativeCacheHydrationAutomationPackPurgeReason;
  purged_artifact_classes: readonly NativeCacheHydrationAutomationPackArtifactClass[];
};

export const nativeHydrationAutomationScenarioExpectations = {
  COLD_START_COMPATIBLE_CACHE: {
    expected_first_paint_outcome: "CACHED_RENDER_AFTER_CHECK",
    expected_action_outcome: "LIVE_ACTIONS_ALLOWED",
    expected_resume_binding_state: "UNCHANGED_LIVE",
    purge_reason_code_or_null: null,
    purged_artifact_classes: [],
  },
  COLD_START_SCHEMA_INCOMPATIBLE: {
    expected_first_paint_outcome: "PLACEHOLDER_UNTIL_FRESH_SNAPSHOT",
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_ACCESS_REBIND",
    expected_resume_binding_state: "CLEARED_FOR_ACCESS_REBIND",
    purge_reason_code_or_null: "SCHEMA_INCOMPATIBLE",
    purged_artifact_classes: nativeHydrationAutomationPurgeInventory,
  },
  TENANT_SWITCH: {
    expected_first_paint_outcome: "PURGED_NO_RESTORE",
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_ACCESS_REBIND",
    expected_resume_binding_state: "CLEARED_FOR_ACCESS_REBIND",
    purge_reason_code_or_null: "TENANT_SWITCH",
    purged_artifact_classes: nativeHydrationAutomationPurgeInventory,
  },
  PRIVILEGE_DOWNGRADE: {
    expected_first_paint_outcome: "PLACEHOLDER_UNTIL_FRESH_SNAPSHOT",
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_ACCESS_REBIND",
    expected_resume_binding_state: "CLEARED_FOR_ACCESS_REBIND",
    purge_reason_code_or_null: "PRIVILEGE_DOWNGRADE",
    purged_artifact_classes: nativeHydrationAutomationPurgeInventory,
  },
  SESSION_REVOCATION: {
    expected_first_paint_outcome: "PURGED_NO_RESTORE",
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_ACCESS_REBIND",
    expected_resume_binding_state: "CLEARED_FOR_ACCESS_REBIND",
    purge_reason_code_or_null: "SESSION_REVOKED",
    purged_artifact_classes: nativeHydrationAutomationPurgeInventory,
  },
  CACHE_ONLY_RESTORE_REBASE_REQUIRED: {
    expected_first_paint_outcome: "CACHED_RENDER_AFTER_CHECK",
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_REBASE",
    expected_resume_binding_state: "CLEARED_FOR_REBASE",
    purge_reason_code_or_null: null,
    purged_artifact_classes: [],
  },
  SECONDARY_WINDOW_MASKING_PURGE: {
    expected_first_paint_outcome: "PURGED_NO_RESTORE",
    expected_action_outcome: "MUTATION_BLOCKED_PENDING_ACCESS_REBIND",
    expected_resume_binding_state: "CLEARED_FOR_ACCESS_REBIND",
    purge_reason_code_or_null: "MASKING_CHANGE",
    purged_artifact_classes: nativeHydrationAutomationPurgeInventory,
  },
} as const satisfies Record<NativeCacheHydrationAutomationPackScenarioClass, ScenarioExpectation>;

export type NativeHydrationAutomationCaseSeed = {
  automation_harness: NativeCacheHydrationAutomationPackAutomationHarness;
  case_id: string;
  hydration_scope_class: NativeCacheHydrationAutomationPackHydrationScopeClass;
  scenario_class: NativeCacheHydrationAutomationPackScenarioClass;
};

export const nativeHydrationAutomationCaseSeeds = [
  {
    case_id: "compatible-cold-start-primary",
    automation_harness: "XCUITEST",
    hydration_scope_class: "NATIVE_PRIMARY_SCENE",
    scenario_class: "COLD_START_COMPATIBLE_CACHE",
  },
  {
    case_id: "schema-incompatible-cold-start",
    automation_harness: "NATIVE_PERSISTENCE_FIXTURE",
    hydration_scope_class: "EXPERIENCE_CURSOR",
    scenario_class: "COLD_START_SCHEMA_INCOMPATIBLE",
  },
  {
    case_id: "tenant-switch-primary-scene",
    automation_harness: "XCUITEST",
    hydration_scope_class: "NATIVE_PRIMARY_SCENE",
    scenario_class: "TENANT_SWITCH",
  },
  {
    case_id: "privilege-downgrade-workspace",
    automation_harness: "NATIVE_PERSISTENCE_FIXTURE",
    hydration_scope_class: "WORKSPACE_CURSOR",
    scenario_class: "PRIVILEGE_DOWNGRADE",
  },
  {
    case_id: "session-revocation-primary-scene",
    automation_harness: "XCUITEST",
    hydration_scope_class: "NATIVE_PRIMARY_SCENE",
    scenario_class: "SESSION_REVOCATION",
  },
  {
    case_id: "cache-only-restore-needs-rebase",
    automation_harness: "XCUITEST",
    hydration_scope_class: "NATIVE_PRIMARY_SCENE",
    scenario_class: "CACHE_ONLY_RESTORE_REBASE_REQUIRED",
  },
  {
    case_id: "secondary-window-masking-purge",
    automation_harness: "NATIVE_PERSISTENCE_FIXTURE",
    hydration_scope_class: "NATIVE_SECONDARY_WINDOW",
    scenario_class: "SECONDARY_WINDOW_MASKING_PURGE",
  },
] as const satisfies readonly NativeHydrationAutomationCaseSeed[];

export class NativeCacheHydrationAutomationPackError extends Error {
  readonly code:
    | "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID"
    | "NATIVE_HYDRATION_AUTOMATION_PACK_INVALID";
  readonly trace: string;

  constructor(input: {
    code:
      | "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID"
      | "NATIVE_HYDRATION_AUTOMATION_PACK_INVALID";
    detail: string;
    payload: unknown;
  }) {
    const trace = nativeCacheHydrationAutomationPackSerializedFailureTrace(input.payload);
    super(`${input.code}: ${input.detail}; ${trace}`);
    this.name = "NativeCacheHydrationAutomationPackError";
    this.code = input.code;
    this.trace = trace;
  }
}

function fail(
  code: NativeCacheHydrationAutomationPackError["code"],
  detail: string,
  payload: unknown,
): never {
  throw new NativeCacheHydrationAutomationPackError({ code, detail, payload });
}

function arrayEqual<T>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function nativeCacheHydrationAutomationPackSerializedFailureTrace(payload: unknown) {
  return `trace=${JSON.stringify(payload, null, 2)}`;
}

export function scenarioRequiresPurge(
  scenarioClass: NativeCacheHydrationAutomationPackScenarioClass,
) {
  return (
    scenarioClass !== "COLD_START_COMPATIBLE_CACHE" &&
    scenarioClass !== "CACHE_ONLY_RESTORE_REBASE_REQUIRED"
  );
}

export function assertNativeCacheHydrationAutomationCase(
  automationCase: NativeCacheHydrationAutomationPackAutomationCase,
) {
  if (automationCase.compatibility_check_completed_before_render !== true) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID",
      "compatibility_check_completed_before_render must stay true",
      automationCase,
    );
  }
  if (
    automationCase.incompatible_content_rendered !== false ||
    automationCase.resume_lineage_reused_illegally !== false ||
    automationCase.restoration_reopened_stale_context !== false
  ) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID",
      "native automation cases must never render incompatible content, reuse illegal lineage, or reopen stale context",
      automationCase,
    );
  }

  const expected =
    nativeHydrationAutomationScenarioExpectations[automationCase.scenario_class] ?? null;
  if (expected === null) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID",
      "scenario_class must stay inside the FE-75 native hydration automation vocabulary",
      automationCase,
    );
  }
  for (const field of [
    "expected_first_paint_outcome",
    "expected_action_outcome",
    "expected_resume_binding_state",
    "purge_reason_code_or_null",
  ] as const) {
    if (automationCase[field] !== expected[field]) {
      fail(
        "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID",
        `${field} must match ${automationCase.scenario_class}`,
        automationCase,
      );
    }
  }
  if (!arrayEqual(automationCase.purged_artifact_classes, expected.purged_artifact_classes)) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID",
      "purged_artifact_classes must match the governed FE-75 purge inventory expectation",
      automationCase,
    );
  }
  if (
    scenarioRequiresPurge(automationCase.scenario_class) &&
    !arrayEqual(automationCase.purged_artifact_classes, nativeHydrationAutomationPurgeInventory)
  ) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_CASE_INVALID",
      "purge-triggered cases must clear the full regulated local-artifact inventory",
      automationCase,
    );
  }
  return automationCase;
}

export function assertNativeCacheHydrationAutomationPack(
  pack: NativeCacheHydrationAutomationPack,
) {
  const expectedConstants = {
    contract_version: "NATIVE_CACHE_HYDRATION_AUTOMATION_PACK_V1",
    suite_profile: "MACOS_CACHE_HYDRATION_PURGE_REBASE_AND_RESTORATION_MATRIX",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    first_paint_assertion_policy: "COMPATIBILITY_VERIFIED_BEFORE_RENDERED_CONTENT",
    purge_assertion_policy: "IMMEDIATE_SELECTIVE_PURGE_ACROSS_CACHE_AND_LOCAL_ARTIFACTS",
    action_gate_assertion_policy: "CACHE_ONLY_RESTORE_CANNOT_MUTATE_UNTIL_LIVE_REBASE",
    coverage_policy: "COLD_START_RECONNECT_TENANT_SWITCH_DOWNGRADE_REVOCATION_AND_SCHEMA_DRIFT",
  } as const;
  for (const [field, expected] of Object.entries(expectedConstants)) {
    if (pack[field as keyof typeof expectedConstants] !== expected) {
      fail(
        "NATIVE_HYDRATION_AUTOMATION_PACK_INVALID",
        `${field} must stay ${expected}`,
        pack,
      );
    }
  }
  if (!Number.isInteger(pack.deterministic_seed) || pack.deterministic_seed < 0) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_PACK_INVALID",
      "deterministic_seed must stay a non-negative integer",
      pack,
    );
  }
  if (pack.pack_id.length === 0) {
    fail("NATIVE_HYDRATION_AUTOMATION_PACK_INVALID", "pack_id must be non-empty", pack);
  }
  const coveredScenarios = new Set(pack.cases.map((entry) => entry.scenario_class));
  const coveredHarnesses = new Set(pack.cases.map((entry) => entry.automation_harness));
  const missingScenarios = nativeHydrationAutomationScenarioOrder.filter(
    (scenario) => !coveredScenarios.has(scenario),
  );
  const missingHarnesses = nativeHydrationAutomationHarnesses.filter(
    (harness) => !coveredHarnesses.has(harness),
  );
  if (missingScenarios.length > 0) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_PACK_INVALID",
      `missing required scenarios: ${missingScenarios.join(", ")}`,
      pack,
    );
  }
  if (missingHarnesses.length > 0) {
    fail(
      "NATIVE_HYDRATION_AUTOMATION_PACK_INVALID",
      `missing required harnesses: ${missingHarnesses.join(", ")}`,
      pack,
    );
  }
  for (const automationCase of pack.cases) {
    assertNativeCacheHydrationAutomationCase(automationCase);
  }
  return pack;
}
