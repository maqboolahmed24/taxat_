import { expect, test } from "@playwright/test";

import { semanticAccessibilityFixture } from "../../../packages/playwright-kit/src/index";

test("keyboard traversal follows the semantic calm focus ladder", async ({ page }) => {
  await page.goto(semanticAccessibilityFixture.atlasPath);

  const ladder = page.getByTestId("calm-focus-ladder");
  const [firstRef, ...remainingRefs] = semanticAccessibilityFixture.keyboardTraversalRefs;
  expect(firstRef).toBeDefined();
  if (firstRef === undefined) {
    throw new Error("Expected a keyboard traversal start anchor.");
  }

  await ladder.getByTestId(firstRef).focus();
  await expect(ladder.getByTestId(firstRef)).toBeFocused();

  for (const anchorRef of remainingRefs) {
    await page.keyboard.press("Tab");
    await expect(ladder.getByTestId(anchorRef)).toBeFocused();
  }

  const outline = await ladder.getByTestId("return-path-control").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.outlineColor,
      style: style.outlineStyle,
      width: style.outlineWidth,
    };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).not.toBe("0px");
});

test("live region updates are polite or assertive without moving active composer focus", async ({
  page,
}) => {
  await page.goto(semanticAccessibilityFixture.atlasPath);

  const composer = page.getByTestId("active-composer");
  const liveRegion = page.getByTestId("semantic-live-region");
  await composer.focus();
  await expect(composer).toBeFocused();

  await page.getByTestId("announce-activity").click();
  await expect(composer).toBeFocused();
  await expect(liveRegion).toHaveAttribute("aria-live", "polite");
  await expect(liveRegion).toHaveAttribute("role", "status");
  await expect(liveRegion).toContainText("politely");

  await page.getByTestId("announce-failure").click();
  await expect(composer).toBeFocused();
  await expect(liveRegion).toHaveAttribute("aria-live", "assertive");
  await expect(liveRegion).toHaveAttribute("role", "alert");
  await expect(liveRegion).toContainText("assertively");
});

test("reduced motion keeps the same focus order and live-region semantics", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(semanticAccessibilityFixture.atlasPath);

  const catalog = page.getByTestId("semantic-anchor-catalog");
  await expect(catalog).toHaveAttribute("data-motion-mode", "reduced");

  const ladder = page.getByTestId("calm-focus-ladder");
  const orderedRefs = await ladder.getByRole("button").evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("data-testid")),
  );
  expect(orderedRefs).toEqual(semanticAccessibilityFixture.keyboardTraversalRefs);

  await page.getByTestId("active-composer").focus();
  await page.getByTestId("announce-failure").click();
  await expect(page.getByTestId("active-composer")).toBeFocused();
  await expect(page.getByTestId("semantic-live-region")).toHaveAttribute(
    "data-live-region-mode",
    "ASSERTIVE",
  );
});
