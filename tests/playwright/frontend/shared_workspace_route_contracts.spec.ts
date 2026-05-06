import fs from "node:fs";
import { expect, test } from "@playwright/test";
import {
  loadWebShellContractFixture,
  webShellContractFixturePaths,
} from "../../../packages/playwright-kit/src/fixtures/web_shell_contract_fixture";

const fixture = loadWebShellContractFixture();

const selectorByShellFamily = {
  CALM_SHELL: "OPERATOR_SEMANTIC_SELECTORS_V1",
  CLIENT_PORTAL_SHELL: "PORTAL_SEMANTIC_SELECTORS_V1",
  GOVERNANCE_DENSITY_SHELL: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
} as const;

test("shared workspace scaffold files exist at the documented route boundaries", () => {
  const requiredFiles = [
    "apps/operator-web/src/app/root.tsx",
    "apps/operator-web/src/routes/calm/index.tsx",
    "apps/operator-web/src/routes/governance/index.tsx",
    "apps/operator-web/src/routes/internal/frontend-shell-foundation-atlas.tsx",
    "apps/client-portal-web/src/app/root.tsx",
    "apps/client-portal-web/src/routes/home/index.tsx",
    "packages/frontend-shell-core/package.json",
    "packages/frontend-shell-core/src/shell_family_registry.ts",
    "packages/frontend-shell-core/src/route_contracts/route_stability.ts",
    "packages/frontend-shell-core/src/route_contracts/semantic_accessibility.ts",
    "packages/frontend-shell-core/src/route_contracts/interaction_layer_foundation.ts",
    "packages/frontend-shell-core/src/route_contracts/shell_state_taxonomy.ts",
    "packages/frontend-shell-core/src/providers/route_contract_provider.tsx",
    "packages/shared-ui/src/foundation/TaxatThemeProvider.tsx",
    "packages/playwright-kit/src/fixtures/web_shell_contract_fixture.ts",
    "tests/playwright/frontend/shared_workspace_scaffold.spec.ts",
    "tests/playwright/frontend/shared_workspace_route_contracts.spec.ts",
    "docs/frontend/shared_web_workspace_and_route_contract_scaffold.md",
  ];

  for (const relativePath of requiredFiles) {
    expect(fs.existsSync(`${webShellContractFixturePaths.repoRoot}/${relativePath}`)).toBe(true);
  }
});

test("route stability contracts preserve stream and snapshot resume rules", () => {
  for (const route of fixture.routes) {
    const contract = route.route_stability_contract;
    expect(contract.route_scope_class).toBe(route.route_scope_class);
    expect(contract.guard_vector_hash).toContain("sha256:");
    expect(contract.guard_vector_components.shell_stability_token_or_null).toBe(
      route.route_contract.route_context.shell_stability_token,
    );

    if (contract.resume_capability === "SNAPSHOT_ONLY") {
      expect(contract.last_published_sequence_or_null).toBeNull();
      expect(contract.resume_token_or_null).toBeNull();
    }

    if (contract.resume_capability === "STREAM_RESUMABLE") {
      expect(contract.last_published_sequence_or_null).not.toBeNull();
      expect(contract.resume_token_or_null).not.toBeNull();
    }
  }
});

test("semantic selector contracts and browser identifiers mirror anchor meaning", () => {
  for (const route of fixture.routes) {
    expect(route.semantic_accessibility_contract.selector_profile).toBe(
      selectorByShellFamily[route.shell_family],
    );
    expect(route.semantic_accessibility_contract.required_anchor_codes.length).toBeGreaterThanOrEqual(
      6,
    );

    for (const anchor of route.semantic_anchors) {
      expect(anchor.browser_identifier).toBe(anchor.semantic_anchor_ref);
      expect(anchor.native_identifier).toBe(anchor.semantic_anchor_ref);
      expect(route.semantic_accessibility_contract.required_anchor_codes).toContain(
        anchor.anchor_code,
      );
    }
  }
});

test("semantic regression pack covers all shell families and deterministic modalities", () => {
  expect(fixture.semantic_regression_pack.cases.length).toBeGreaterThanOrEqual(6);
  const coveredShellFamilies = new Set(
    fixture.semantic_regression_pack.cases.map((entry) => String(entry.shell_family)),
  );

  expect(coveredShellFamilies).toEqual(
    new Set(["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"]),
  );

  for (const entry of fixture.semantic_regression_pack.cases) {
    expect(entry.automation_harness).toBe("PLAYWRIGHT");
    expect(entry.covered_modalities).toEqual(
      expect.arrayContaining(["KEYBOARD_ONLY", "SCREEN_READER", "REDUCED_MOTION"]),
    );
    expect(entry.live_update_focus_theft_detected).toBe(false);
    expect(entry.excessive_live_noise_detected).toBe(false);
    expect(entry.support_surface_modal_trap_detected).toBe(false);
    expect(entry.reduced_motion_semantics_preserved).toBe(true);
  }
});
