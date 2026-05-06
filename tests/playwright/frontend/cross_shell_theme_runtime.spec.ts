import { expect, test } from "@playwright/test";
import {
  assertRouteLocalThemeOverridesAreBound,
  deriveShellThemeContract,
  sharedWebShellRouteContracts,
  ThemeContractError,
  type ShellFamily,
} from "../../../packages/frontend-shell-core/src/index";
import {
  themeContractFixture,
  themeContractForShellFamily,
} from "../../../packages/playwright-kit/src/fixtures/theme_contract_fixture";

const shellFamilies = themeContractFixture.shellFamilies satisfies readonly ShellFamily[];

function routeForShell(shellFamily: ShellFamily) {
  const route = sharedWebShellRouteContracts.find((candidate) => candidate.shell_family === shellFamily);
  expect(route).toBeTruthy();
  if (!route) {
    throw new Error(`Missing route fixture for ${shellFamily}`);
  }
  return route;
}

test("theme runtime derives contract-bound CSS variables for every shell family", () => {
  for (const shellFamily of shellFamilies) {
    const theme = themeContractForShellFamily(shellFamily);

    expect(theme.css_vars["--taxat-accent"]).toBe(
      themeContractFixture.expectedAccentByFamily[shellFamily],
    );
    expect(theme.css_vars["--taxat-motion-duration"]).toBe("160ms");
    expect(Number(theme.css_vars["--taxat-motion-duration"].replace("ms", ""))).toBeLessThanOrEqual(
      theme.motion_ceiling_ms,
    );
    expect(theme.data_attributes["data-taxat-shell-family"]).toBe(shellFamily);
    expect(theme.data_attributes["data-responsive-compaction-token"]).toContain("_V1");
    expect(theme.token_strips.map((strip) => strip.label)).toEqual(
      expect.arrayContaining(["density", "spacing", "support", "compaction", "motion"]),
    );
  }
});

test("mismatched shell family and selector profile fail closed", () => {
  const calmRoute = routeForShell("CALM_SHELL");

  expect(() =>
    deriveShellThemeContract({
      shellFamily: "CLIENT_PORTAL_SHELL",
      foundationContract: calmRoute.interaction_layer_foundation_contract,
    }),
  ).toThrow(ThemeContractError);
});

test("missing foundation contract and route-local motion overrides fail closed", () => {
  expect(() =>
    deriveShellThemeContract({
      shellFamily: "CALM_SHELL",
      foundationContract: null,
    }),
  ).toThrow(ThemeContractError);

  expect(() =>
    assertRouteLocalThemeOverridesAreBound({
      "--taxat-motion-duration": "900ms",
    }),
  ).toThrow(ThemeContractError);
});

test("foundation atlas exposes shell cards with computed token variables and headings", async ({
  page,
}) => {
  await page.goto(themeContractFixture.atlasPath);
  await expect(page.getByTestId("frontend-shell-foundation-atlas")).toBeVisible();

  for (const shellFamily of shellFamilies) {
    const card = page.getByTestId(`theme.card.${shellFamily}`);
    await expect(card).toBeVisible();
    await expect(card.getByRole("heading", { name: shellFamily })).toBeVisible();
    await expect(card).toHaveAttribute("data-taxat-shell-family", shellFamily);
    await expect(card).toHaveAttribute("data-theme-contract-state", "valid");

    await expect
      .poll(async () =>
        card.evaluate((element) => getComputedStyle(element).getPropertyValue("--taxat-accent").trim()),
      )
      .toBe(themeContractFixture.expectedAccentByFamily[shellFamily]);
  }
});

test("focus ring is visible and contract-bound on each shell card", async ({ page }) => {
  await page.goto(themeContractFixture.atlasPath);

  for (const shellFamily of shellFamilies) {
    const focusButton = page.getByTestId(`theme.focus-ring.${shellFamily}`);
    await focusButton.focus();
    await expect(focusButton).toBeFocused();
    const outline = await focusButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.outlineColor,
        style: style.outlineStyle,
        width: style.outlineWidth,
      };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).not.toBe("0px");
  }
});

test("reduced motion preserves semantics while removing spatial displacement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(themeContractFixture.atlasPath);

  for (const shellFamily of shellFamilies) {
    const card = page.getByTestId(`theme.card.${shellFamily}`);
    await expect(card).toHaveAttribute("data-motion-mode", "reduced");
    await expect(card).toHaveAttribute("data-taxat-shell-family", shellFamily);
    await expect
      .poll(async () =>
        card.evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--taxat-motion-translate-y").trim(),
        ),
      )
      .toBe("0px");
    await expect
      .poll(async () =>
        card.evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--taxat-motion-duration").trim(),
        ),
      )
      .toBe("1ms");
  }
});

test("compact viewport changes compaction token only, not shell meaning", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await page.goto(themeContractFixture.atlasPath);

  for (const shellFamily of shellFamilies) {
    const route = routeForShell(shellFamily);
    const card = page.getByTestId(`theme.card.${shellFamily}`);
    await expect(card).toHaveAttribute("data-taxat-shell-family", shellFamily);
    await expect(card).toHaveAttribute(
      "data-responsive-compaction-token",
      route.interaction_layer_foundation_contract.responsive_compaction_token,
    );
  }
});

test("route-local motion probe cannot exceed the contract ceiling", async ({ page }) => {
  await page.goto(themeContractFixture.atlasPath);

  for (const shellFamily of shellFamilies) {
    const durationSeconds = await page
      .getByTestId(`theme.motion-probe.${shellFamily}`)
      .evaluate((element) => {
        const duration = getComputedStyle(element).transitionDuration;
        return Number(duration.replace("s", ""));
      });

    expect(durationSeconds * 1000).toBeLessThanOrEqual(180);
  }
});

test("internal atlas renders typed missing-contract errors", async ({ page }) => {
  await page.goto(themeContractFixture.atlasPath);
  const error = page.getByTestId("theme.contract-error.missing-foundation");
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("data-theme-contract-error", "THEME_CONTRACT_MISSING_FOUNDATION");
});
