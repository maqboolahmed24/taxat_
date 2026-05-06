import { expect, test } from "@playwright/test";

import {
  resolveSurfaceMountPlan,
  type ShellFamily,
} from "../../../packages/frontend-shell-core/src/index";
import { themeContractFixture } from "../../../packages/playwright-kit/src/fixtures/theme_contract_fixture";

const shellFamilies = themeContractFixture.shellFamilies satisfies readonly ShellFamily[];

test("surface registry diagram renders primary surfaces and one promoted support region per shell", async ({
  page,
}) => {
  await page.goto(themeContractFixture.atlasPath);
  const diagram = page.getByTestId("surface-registry-diagram");
  await expect(diagram).toBeVisible();
  await expect(diagram.getByRole("heading", { name: "Surface Registry Diagram" })).toBeVisible();

  for (const shellFamily of shellFamilies) {
    const plan = resolveSurfaceMountPlan({ shellFamily });
    const row = page.getByTestId("surface-registry-row").filter({
      has: page.getByRole("heading", { name: shellFamily }),
    });
    await expect(row).toHaveAttribute("data-shell-family", shellFamily);
    await expect(row).toHaveAttribute(
      "data-support-budget-policy",
      "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
    );

    for (const surfaceCode of plan.default_reading_order) {
      await expect(row.getByText(surfaceCode, { exact: true })).toBeVisible();
    }

    const supportRegion = row.getByTestId("promoted-support-region");
    await expect(supportRegion).toHaveCount(1);
    await expect(supportRegion).toHaveAttribute(
      "data-support-surface-code",
      plan.promoted_support_regions[0]?.surface_code ?? "NONE",
    );
    await expect(row.getByTestId("support-budget-chip")).toHaveText(
      "ONE_PROMOTED_SUPPORT_SURFACE_MAX:1",
    );
  }
});

test("support promotion and demotion are keyboard reachable and restore focus", async ({ page }) => {
  await page.goto(themeContractFixture.atlasPath);

  const row = page.getByTestId("surface-registry-row").filter({
    has: page.getByRole("heading", { name: "CALM_SHELL" }),
  });
  const promote = row.getByTestId("surface-registry.promote.CALM_SHELL");
  const demote = row.getByTestId("surface-registry.demote.CALM_SHELL");
  const supportRegion = row.getByTestId("promoted-support-region");

  await promote.focus();
  await expect(promote).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(demote).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(supportRegion).toHaveAttribute("data-promoted-state", "demoted");
  await expect(promote).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(supportRegion).toHaveAttribute("data-promoted-state", "promoted");
  await expect(supportRegion).toBeFocused();
});

test("reduced motion preserves diagram semantics without spatial movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(themeContractFixture.atlasPath);

  const diagram = page.getByTestId("surface-registry-diagram");
  await expect(diagram).toHaveAttribute("data-motion-mode", "reduced");

  const supportRegion = page.getByTestId("promoted-support-region").first();
  await expect(supportRegion).toBeVisible();
  await expect
    .poll(async () =>
      supportRegion.evaluate((element) => {
        const style = getComputedStyle(element);
        const durations = style.transitionDuration.split(",").map((part) => part.trim());
        return {
          durationSafe: durations.every(
            (duration) =>
              duration === "0s" ||
              duration === "0.001ms" ||
              Number(duration.replace("ms", "").replace("s", "")) <= 0.001,
          ),
          transform: style.transform,
        };
      }),
    )
    .toEqual({ durationSafe: true, transform: "none" });
});

test("diagram uses semantic test anchors rather than layout names", async ({ page }) => {
  await page.goto(themeContractFixture.atlasPath);

  await expect(page.getByTestId("promoted-support-region")).toHaveCount(shellFamilies.length);
  await expect(page.locator('[data-testid*="left-column"]')).toHaveCount(0);
  await expect(page.locator('[data-testid*="middle-column"]')).toHaveCount(0);
  await expect(page.locator('[data-testid*="right-column"]')).toHaveCount(0);
});
