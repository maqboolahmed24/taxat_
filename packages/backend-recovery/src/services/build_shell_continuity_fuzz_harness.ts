import type {
  ShellContinuityFuzzHarness,
  ShellContinuityFuzzHarnessFuzzCase,
  ShellContinuityFuzzHarnessStateSnapshot,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  enumerateShellContinuityCases,
  shellContinuityBrowserScopes,
  shellContinuityNativePerturbations,
  shellContinuityNativeScopes,
  shellContinuityRequiredInvariants,
  shellContinuitySurfaceBindings,
} from "./enumerate_shell_continuity_cases.ts";

export type { ShellContinuityFuzzHarness, ShellContinuityFuzzHarnessFuzzCase };

export type BuildShellContinuityFuzzHarnessInput = {
  deterministic_seed?: number | undefined;
  harness_id?: string | undefined;
};

export const defaultShellContinuityDeterministicSeed = 6701;
export const defaultShellContinuityHarnessId = "shell-continuity-harness-67";
const browserScopeSet = new Set<string>(shellContinuityBrowserScopes);
const nativeScopeSet = new Set<string>(shellContinuityNativeScopes);
const nativePerturbationSet = new Set<string>(shellContinuityNativePerturbations);

export class ShellContinuityFuzzHarnessBuildError extends Error {
  readonly code:
    | "SHELL_CONTINUITY_FUZZ_CASE_INVALID"
    | "SHELL_CONTINUITY_FUZZ_COVERAGE_INVALID"
    | "SHELL_CONTINUITY_FUZZ_HARNESS_INVALID";
  readonly trace: string;

  constructor(input: {
    code: ShellContinuityFuzzHarnessBuildError["code"];
    detail: string;
    payload: unknown;
  }) {
    const trace = shellContinuityFuzzHarnessSerializedFailureTrace(input.payload);
    super(`${input.code}: ${input.detail}; ${trace}`);
    this.name = "ShellContinuityFuzzHarnessBuildError";
    this.code = input.code;
    this.trace = trace;
  }
}

function fail(
  code: ShellContinuityFuzzHarnessBuildError["code"],
  detail: string,
  payload: unknown,
): never {
  throw new ShellContinuityFuzzHarnessBuildError({ code, detail, payload });
}

export function shellContinuityFuzzHarnessSerializedFailureTrace(payload: unknown) {
  return `trace=${JSON.stringify(payload, null, 2)}`;
}

function arrayEquals<T>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertUniqueStrings(field: string, values: readonly string[], payload: unknown) {
  if (values.length === 0) {
    fail("SHELL_CONTINUITY_FUZZ_CASE_INVALID", `${field} must not be empty`, payload);
  }
  if (new Set(values).size !== values.length) {
    fail("SHELL_CONTINUITY_FUZZ_CASE_INVALID", `${field} must not contain duplicates`, payload);
  }
}

function assertNonEmptyString(field: string, value: string | null, payload: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    fail("SHELL_CONTINUITY_FUZZ_CASE_INVALID", `${field} must remain a non-empty string`, payload);
  }
}

function isBrowserScope(scope: ShellContinuityFuzzHarnessFuzzCase["continuity_scope"]) {
  return browserScopeSet.has(scope);
}

function isNativeScope(scope: ShellContinuityFuzzHarnessFuzzCase["continuity_scope"]) {
  return nativeScopeSet.has(scope);
}

function hasNativePerturbation(fuzzCase: ShellContinuityFuzzHarnessFuzzCase) {
  return fuzzCase.perturbations.some((perturbation) => nativePerturbationSet.has(perturbation));
}

function assertSameTruthFalseInvariants(fuzzCase: ShellContinuityFuzzHarnessFuzzCase) {
  if (fuzzCase.truth_change_detected !== false) {
    return;
  }

  const fieldByInvariant = {
    ACTIVE_CONTEXT: "active_context_ref_or_null",
    DOMINANT_MEANING: "dominant_meaning_ref_or_null",
    DOMINANT_QUESTION: "dominant_question",
    FOCUS_ANCHOR: "focus_anchor_ref_or_null",
    OBJECT_ANCHOR: "canonical_object_ref",
    RETURN_FOCUS_ANCHOR: "return_focus_anchor_ref_or_null",
    ROUTE_IDENTITY: "route_identity_ref",
    SETTLEMENT_STATE: "settlement_state_or_null",
    SHELL_FAMILY: "shell_family",
  } as const satisfies Record<
    (typeof shellContinuityRequiredInvariants)[number],
    keyof ShellContinuityFuzzHarnessStateSnapshot
  >;

  for (const invariant of fuzzCase.asserted_invariants) {
    const field = fieldByInvariant[invariant];
    if (fuzzCase.pre_state[field] !== fuzzCase.post_state[field]) {
      fail(
        "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
        `${field} must remain stable when truth_change_detected = false`,
        fuzzCase,
      );
    }
  }

  if (
    fuzzCase.expected_outcome === "PRESERVED" &&
    fuzzCase.pre_state.recovery_posture_or_null !== fuzzCase.post_state.recovery_posture_or_null
  ) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "PRESERVED cases must keep recovery_posture_or_null stable",
      fuzzCase,
    );
  }
  if (
    fuzzCase.expected_outcome === "INLINE_RECOVERY" &&
    (fuzzCase.post_state.recovery_posture_or_null === null ||
      fuzzCase.post_state.recovery_posture_or_null ===
        fuzzCase.pre_state.recovery_posture_or_null)
  ) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "INLINE_RECOVERY cases must change to one explicit recovery posture",
      fuzzCase,
    );
  }
}

function assertShellContinuityFuzzCase(fuzzCase: ShellContinuityFuzzHarnessFuzzCase) {
  const binding = shellContinuitySurfaceBindings[fuzzCase.surface_type];
  if (fuzzCase.continuity_scope !== binding.continuity_scope) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      `${fuzzCase.surface_type} must bind to ${binding.continuity_scope}`,
      fuzzCase,
    );
  }
  if (!binding.allowed_shell_families.includes(fuzzCase.shell_family as never)) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      `${fuzzCase.surface_type} shell_family is outside its allowed shell families`,
      fuzzCase,
    );
  }

  assertUniqueStrings("perturbations", fuzzCase.perturbations, fuzzCase);
  assertUniqueStrings("shrink_sequence", fuzzCase.shrink_sequence, fuzzCase);

  if (
    fuzzCase.shrink_sequence.length >= fuzzCase.perturbations.length ||
    fuzzCase.shrink_sequence.some((perturbation) => !fuzzCase.perturbations.includes(perturbation))
  ) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "shrink_sequence must remain a strict non-empty subset of perturbations",
      fuzzCase,
    );
  }
  if (isBrowserScope(fuzzCase.continuity_scope) && hasNativePerturbation(fuzzCase)) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "browser continuity cases must not inject native restoration perturbations",
      fuzzCase,
    );
  }
  if (isNativeScope(fuzzCase.continuity_scope) && !hasNativePerturbation(fuzzCase)) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "native continuity cases must include native restoration perturbation",
      fuzzCase,
    );
  }
  if (
    fuzzCase.continuity_scope === "NATIVE_SECONDARY_WINDOW" &&
    !fuzzCase.perturbations.includes("SECONDARY_WINDOW_RESTORE")
  ) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "secondary-window continuity cases must include SECONDARY_WINDOW_RESTORE",
      fuzzCase,
    );
  }

  for (const invariant of shellContinuityRequiredInvariants) {
    if (!fuzzCase.asserted_invariants.includes(invariant)) {
      fail(
        "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
        `asserted_invariants must include ${invariant}`,
        fuzzCase,
      );
    }
  }

  for (const [stateName, stateSnapshot] of [
    ["pre_state", fuzzCase.pre_state],
    ["post_state", fuzzCase.post_state],
  ] as const) {
    if (stateSnapshot.shell_family !== fuzzCase.shell_family) {
      fail(
        "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
        `${stateName}.shell_family must mirror the case shell_family`,
        fuzzCase,
      );
    }
    assertNonEmptyString(`${stateName}.route_identity_ref`, stateSnapshot.route_identity_ref, fuzzCase);
    assertNonEmptyString(
      `${stateName}.canonical_object_ref`,
      stateSnapshot.canonical_object_ref,
      fuzzCase,
    );
    assertNonEmptyString(`${stateName}.dominant_question`, stateSnapshot.dominant_question, fuzzCase);
  }

  if (
    fuzzCase.expected_outcome === "PRESERVED" &&
    fuzzCase.expected_inline_recovery_reason_or_null !== null
  ) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "PRESERVED cases must clear expected_inline_recovery_reason_or_null",
      fuzzCase,
    );
  }
  if (
    fuzzCase.expected_outcome === "INLINE_RECOVERY" &&
    (fuzzCase.expected_inline_recovery_reason_or_null === null ||
      fuzzCase.expected_inline_recovery_reason_or_null.length === 0)
  ) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "INLINE_RECOVERY cases must retain a typed recovery reason",
      fuzzCase,
    );
  }

  assertSameTruthFalseInvariants(fuzzCase);

  if (
    fuzzCase.continuity_scope === "NATIVE_SECONDARY_WINDOW" &&
    (fuzzCase.pre_state.return_focus_anchor_ref_or_null === null ||
      fuzzCase.post_state.return_focus_anchor_ref_or_null === null)
  ) {
    fail(
      "SHELL_CONTINUITY_FUZZ_CASE_INVALID",
      "secondary-window cases must retain non-null parent return focus anchors",
      fuzzCase,
    );
  }
}

export function assertShellContinuityFuzzHarness(
  harness: ShellContinuityFuzzHarness,
): ShellContinuityFuzzHarness {
  const expectedTopLevel = {
    action_meaning_policy: "DOMINANT_MEANING_STABLE_WITHOUT_TRUTH_CHANGE",
    continuity_invariant_policy: "SHELL_ROUTE_OBJECT_QUESTION_MODULE_FOCUS_STABLE_WHEN_LAWFUL",
    contract_version: "SHELL_CONTINUITY_FUZZ_HARNESS_V1",
    coverage_policy: "BROWSER_AND_NATIVE_COVERAGE_REQUIRED",
    inline_recovery_policy: "INLINE_TYPED_RECOVERY_INSTEAD_OF_SILENT_REMOUNT",
    native_return_policy: "SECONDARY_AND_RESTORED_SCENES_RETURN_TO_PARENT_ANCHOR",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    shrink_policy: "REMOVE_NONESSENTIAL_PERTURBATIONS_KEEP_FIRST_BREAK",
    suite_profile: "SAME_OBJECT_SAME_SHELL_PERTURBATION_MATRIX",
  } as const;

  for (const [field, expectedValue] of Object.entries(expectedTopLevel) as Array<
    [keyof typeof expectedTopLevel, (typeof expectedTopLevel)[keyof typeof expectedTopLevel]]
  >) {
    if (harness[field] !== expectedValue) {
      fail(
        "SHELL_CONTINUITY_FUZZ_HARNESS_INVALID",
        `${field} must stay ${expectedValue}`,
        harness,
      );
    }
  }
  if (!Number.isInteger(harness.deterministic_seed) || harness.deterministic_seed < 0) {
    fail(
      "SHELL_CONTINUITY_FUZZ_HARNESS_INVALID",
      "deterministic_seed must stay a non-negative integer",
      harness,
    );
  }
  assertNonEmptyString("harness_id", harness.harness_id, harness);
  if (harness.cases.length < 5) {
    fail(
      "SHELL_CONTINUITY_FUZZ_COVERAGE_INVALID",
      "cases must cover at least five governed continuity surfaces",
      harness,
    );
  }

  const caseIds = harness.cases.map((fuzzCase) => fuzzCase.case_id);
  assertUniqueStrings("cases.case_id", caseIds, harness);

  let hasBrowserCase = false;
  let hasNativeCase = false;
  let hasPreservedCase = false;
  let hasInlineRecoveryCase = false;
  let hasRebaseCase = false;
  let hasReconnectCase = false;
  let hasResizeOrCollapseCase = false;
  let hasCatchupCase = false;
  let hasNativeRestoreCase = false;

  for (const fuzzCase of harness.cases) {
    assertShellContinuityFuzzCase(fuzzCase);

    hasBrowserCase ||= isBrowserScope(fuzzCase.continuity_scope);
    hasNativeCase ||= isNativeScope(fuzzCase.continuity_scope);
    hasPreservedCase ||= fuzzCase.expected_outcome === "PRESERVED";
    hasInlineRecoveryCase ||= fuzzCase.expected_outcome === "INLINE_RECOVERY";
    hasRebaseCase ||= fuzzCase.perturbations.includes("REBASE");
    hasReconnectCase ||= fuzzCase.perturbations.includes("RECONNECT");
    hasResizeOrCollapseCase ||=
      fuzzCase.perturbations.includes("RESIZE_WIDE_TO_NARROW") ||
      fuzzCase.perturbations.includes("RESPONSIVE_COLLAPSE");
    hasCatchupCase ||=
      fuzzCase.perturbations.includes("STREAM_CATCH_UP") ||
      fuzzCase.perturbations.includes("FRAME_EPOCH_ADVANCE");
    hasNativeRestoreCase ||= hasNativePerturbation(fuzzCase);
  }

  const coverage = [
    ["browser continuity", hasBrowserCase],
    ["native continuity", hasNativeCase],
    ["preserved outcome", hasPreservedCase],
    ["inline recovery outcome", hasInlineRecoveryCase],
    ["REBASE perturbation", hasRebaseCase],
    ["RECONNECT perturbation", hasReconnectCase],
    ["resize or responsive collapse perturbation", hasResizeOrCollapseCase],
    ["stream catch-up or frame epoch perturbation", hasCatchupCase],
    ["native restore perturbation", hasNativeRestoreCase],
  ] as const;
  const missingCoverage = coverage
    .filter(([, covered]) => !covered)
    .map(([label]) => label);
  if (missingCoverage.length > 0) {
    fail(
      "SHELL_CONTINUITY_FUZZ_COVERAGE_INVALID",
      `missing coverage: ${missingCoverage.join(", ")}`,
      harness,
    );
  }

  return harness;
}

export function buildShellContinuityFuzzHarness(
  input: BuildShellContinuityFuzzHarnessInput = {},
): ShellContinuityFuzzHarness {
  const deterministicSeed = input.deterministic_seed ?? defaultShellContinuityDeterministicSeed;
  const harness = {
    action_meaning_policy: "DOMINANT_MEANING_STABLE_WITHOUT_TRUTH_CHANGE",
    cases: enumerateShellContinuityCases({ deterministic_seed: deterministicSeed }),
    continuity_invariant_policy: "SHELL_ROUTE_OBJECT_QUESTION_MODULE_FOCUS_STABLE_WHEN_LAWFUL",
    contract_version: "SHELL_CONTINUITY_FUZZ_HARNESS_V1",
    coverage_policy: "BROWSER_AND_NATIVE_COVERAGE_REQUIRED",
    deterministic_seed: deterministicSeed,
    harness_id:
      input.harness_id ??
      (deterministicSeed === defaultShellContinuityDeterministicSeed
        ? defaultShellContinuityHarnessId
        : `shell-continuity-harness-${deterministicSeed}`),
    inline_recovery_policy: "INLINE_TYPED_RECOVERY_INSTEAD_OF_SILENT_REMOUNT",
    native_return_policy: "SECONDARY_AND_RESTORED_SCENES_RETURN_TO_PARENT_ANCHOR",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    shrink_policy: "REMOVE_NONESSENTIAL_PERTURBATIONS_KEEP_FIRST_BREAK",
    suite_profile: "SAME_OBJECT_SAME_SHELL_PERTURBATION_MATRIX",
  } satisfies ShellContinuityFuzzHarness;

  return assertShellContinuityFuzzHarness(harness);
}

export function exportBrowserShellContinuityCases(harness: ShellContinuityFuzzHarness) {
  return assertShellContinuityFuzzHarness(harness).cases.filter((fuzzCase) =>
    isBrowserScope(fuzzCase.continuity_scope),
  );
}

export function exportNativeShellContinuityCases(harness: ShellContinuityFuzzHarness) {
  return assertShellContinuityFuzzHarness(harness).cases.filter((fuzzCase) =>
    isNativeScope(fuzzCase.continuity_scope),
  );
}
