import { expect, test } from "@playwright/test";

import { semanticAccessibilityFixture } from "../../../packages/playwright-kit/src/index";

test("anchor catalog groups semantic anchors by shell family and governed surface", async ({ page }) => {
  await page.goto(semanticAccessibilityFixture.atlasPath);

  const catalog = page.getByTestId("semantic-anchor-catalog");
  await expect(catalog).toBeVisible();
  await expect(page.getByRole("main", { name: "Semantic anchor catalog" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Anchor Catalog" })).toBeVisible();

  await expect(page.getByTestId("anchor-catalog-shell-group")).toHaveCount(3);
  await expect(page.getByTestId("semantic-anchor-surface-group")).toHaveCount(6);

  for (const shellFamily of semanticAccessibilityFixture.shellFamilies) {
    await expect(
      page.getByTestId("anchor-catalog-shell-group").filter({
        has: page.getByRole("heading", { name: shellFamily }),
      }),
    ).toBeVisible();
  }
});

test("calm required anchor refs and dynamic detail entry are stable data-testid anchors", async ({
  page,
}) => {
  await page.goto(semanticAccessibilityFixture.atlasPath);

  for (const anchorRef of semanticAccessibilityFixture.calmRequiredAnchorRefs) {
    const anchor = page.getByTestId(anchorRef).first();
    await expect(anchor).toBeVisible();
  }

  const detailEntry = page.getByTestId("detail-entry-evidence-prism");
  await expect(detailEntry).toHaveAttribute("data-semantic-anchor-code", "DETAIL_DRAWER");
  await expect(detailEntry).toHaveAttribute("data-native-identifier", "detail-entry-evidence-prism");
});

test("semantic anchors expose roles, names, headings, live badges, and no visual selector ids", async ({
  page,
}) => {
  await page.goto(semanticAccessibilityFixture.atlasPath);

  await expect(page.getByRole("navigation", { name: "calm shell focus path" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "LowNoiseExperienceFrame" })).toBeVisible();
  await expect(page.getByTestId("limitation-notice").first()).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("recovery-notice").first()).toHaveAttribute("aria-live", "assertive");

  for (const forbiddenFragment of semanticAccessibilityFixture.illegalVisualSelectorFragments) {
    await expect(page.locator(`[data-testid*="${forbiddenFragment}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-semantic-anchor-ref*="${forbiddenFragment}"]`)).toHaveCount(0);
  }
});
