import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertShellContinuityFuzzHarness,
  buildShellContinuityFuzzHarness,
  exportBrowserShellContinuityCases,
  exportNativeShellContinuityCases,
  ShellContinuityFuzzHarnessBuildError,
} from "../index.ts";

test("builds a deterministic schema-valid shell continuity fuzz harness", async () => {
  const harness = buildShellContinuityFuzzHarness();

  await validateContractSchema("shell_continuity_fuzz_harness", harness);
  expect(harness).toMatchObject({
    contract_version: "SHELL_CONTINUITY_FUZZ_HARNESS_V1",
    deterministic_seed: 6701,
    harness_id: "shell-continuity-harness-67",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
  });
  expect(harness.cases.map((fuzzCase) => fuzzCase.case_id)).toEqual([
    "manifest-rebase-inline-recovery",
    "workspace-reconnect-catchup",
    "portal-responsive-collapse",
    "governance-reconnect-preserved",
    "native-primary-scene-restore",
    "native-secondary-return-anchor",
  ]);
  for (const fuzzCase of harness.cases) {
    expect(fuzzCase.shrink_sequence.length).toBeLessThan(fuzzCase.perturbations.length);
    expect(
      fuzzCase.shrink_sequence.every((perturbation) =>
        fuzzCase.perturbations.includes(perturbation),
      ),
    ).toBe(true);
  }
});

test("exports browser and native slices from the same asserted harness", () => {
  const harness = buildShellContinuityFuzzHarness();
  const browserCases = exportBrowserShellContinuityCases(harness);
  const nativeCases = exportNativeShellContinuityCases(harness);

  expect(browserCases.map((fuzzCase) => fuzzCase.continuity_scope)).toEqual([
    "MANIFEST_ROUTE",
    "WORKSPACE_ROUTE",
    "CLIENT_PORTAL_ROUTE",
    "GOVERNANCE_ROUTE",
  ]);
  expect(nativeCases.map((fuzzCase) => fuzzCase.continuity_scope)).toEqual([
    "NATIVE_PRIMARY_SCENE",
    "NATIVE_SECONDARY_WINDOW",
  ]);
});

test("fails when native coverage is removed", () => {
  const harness = buildShellContinuityFuzzHarness();
  const missingNative = {
    ...harness,
    cases: harness.cases.filter(
      (fuzzCase) =>
        fuzzCase.continuity_scope !== "NATIVE_PRIMARY_SCENE" &&
        fuzzCase.continuity_scope !== "NATIVE_SECONDARY_WINDOW",
    ),
  };

  expect(() => assertShellContinuityFuzzHarness(missingNative)).toThrow(
    ShellContinuityFuzzHarnessBuildError,
  );
});

test("fails on route drift without truth change", () => {
  const harness = structuredClone(buildShellContinuityFuzzHarness());
  const workspace = harness.cases.find(
    (fuzzCase) => fuzzCase.case_id === "workspace-reconnect-catchup",
  );
  expect(workspace).toBeDefined();
  workspace!.post_state.route_identity_ref = "/work/items/other";

  expect(() => assertShellContinuityFuzzHarness(harness)).toThrow(
    ShellContinuityFuzzHarnessBuildError,
  );
});

test("fails when browser cases inject native restoration perturbations", () => {
  const harness = structuredClone(buildShellContinuityFuzzHarness());
  const portal = harness.cases.find((fuzzCase) => fuzzCase.case_id === "portal-responsive-collapse");
  expect(portal).toBeDefined();
  portal!.perturbations.push("NATIVE_SCENE_RESTORE");

  expect(() => assertShellContinuityFuzzHarness(harness)).toThrow(
    ShellContinuityFuzzHarnessBuildError,
  );
});

test("fails when inline recovery omits a typed reason", () => {
  const harness = structuredClone(buildShellContinuityFuzzHarness());
  const manifest = harness.cases.find(
    (fuzzCase) => fuzzCase.case_id === "manifest-rebase-inline-recovery",
  );
  expect(manifest).toBeDefined();
  manifest!.expected_inline_recovery_reason_or_null = null;

  expect(() => assertShellContinuityFuzzHarness(harness)).toThrow(
    ShellContinuityFuzzHarnessBuildError,
  );
});

test("fails when shrink sequence is not a strict perturbation subset", () => {
  const harness = structuredClone(buildShellContinuityFuzzHarness());
  const governance = harness.cases.find(
    (fuzzCase) => fuzzCase.case_id === "governance-reconnect-preserved",
  );
  expect(governance).toBeDefined();
  governance!.shrink_sequence = ["STREAM_CATCH_UP"];

  expect(() => assertShellContinuityFuzzHarness(harness)).toThrow(
    ShellContinuityFuzzHarnessBuildError,
  );
});

test("fails when secondary native restore loses its parent return anchor", () => {
  const harness = structuredClone(buildShellContinuityFuzzHarness());
  const secondary = harness.cases.find(
    (fuzzCase) => fuzzCase.case_id === "native-secondary-return-anchor",
  );
  expect(secondary).toBeDefined();
  secondary!.post_state.return_focus_anchor_ref_or_null = null;

  expect(() => assertShellContinuityFuzzHarness(harness)).toThrow(
    ShellContinuityFuzzHarnessBuildError,
  );
});
