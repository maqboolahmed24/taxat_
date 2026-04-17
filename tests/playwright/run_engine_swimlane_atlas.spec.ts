import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/run_engine_swimlane_atlas/index.html";

async function gotoAtlas(page: Parameters<typeof test>[0]["page"], phaseId = "P01") {
  await page.goto(`${atlasPath}#${phaseId}`);
  await expect(page.getByTestId("run-engine-atlas")).toBeVisible();
  await expect(page.getByTestId("phase-rail")).toBeVisible();
  await expect(page.getByTestId("lane-canvas")).toBeVisible();
  await expect(page.getByTestId("selected-phase-detail")).toContainText(phaseId);
}

test("first render", async ({ page }) => {
  await gotoAtlas(page, "P01");
  await expect(page.getByText("Taxat Run Engine Observatory")).toBeVisible();
  await expect(page.getByTestId("phase-row-01")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("lane-CALLER_AND_SCOPE")).toBeVisible();
  await expect(page.getByTestId("event-pin").first()).toBeVisible();
});

test("phase selection updates inspector state", async ({ page }) => {
  await gotoAtlas(page, "P01");
  await page.getByTestId("phase-row-09").click();
  await expect(page.getByTestId("phase-row-09")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("selected-phase-detail")).toContainText("Authority context, comparison basis");
  await expect(page.getByTestId("branch-chip").first()).toBeVisible();
});

test("keyboard navigation across the sticky phase rail", async ({ page }) => {
  await gotoAtlas(page, "P01");
  const first = page.getByTestId("phase-row-01");
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("phase-row-03")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("selected-phase-detail")).toContainText("Allocate, continue, or reuse manifest context");
  await page.keyboard.press("End");
  await expect(page.getByTestId("phase-row-18")).toHaveAttribute("aria-selected", "true");
});

test("horizontal lane scrolling preserves selected phase", async ({ page }) => {
  await gotoAtlas(page, "P01");
  await page.getByTestId("phase-row-16").click();
  const canvas = page.getByTestId("lane-canvas");
  await canvas.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(page.getByTestId("phase-row-16")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("selected-phase-detail")).toContainText("Submission enqueue, governed transmit");
  await expect(page.getByTestId("transaction-span").first()).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced-motion rendering keeps semantic state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoAtlas(page, "P13");
    await expect(page.getByTestId("selected-phase-detail")).toContainText("Publish live read-model projections");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
      .toBe("reduce");
  });
});

test("overview screenshot baseline", async ({ page }) => {
  await gotoAtlas(page, "P01");
  await expect(page.getByTestId("run-engine-atlas")).toHaveScreenshot("run-engine-atlas-overview.png", {
    animations: "disabled",
    fullPage: true,
  });
});

test("branch-heavy phase screenshot baseline", async ({ page }) => {
  await gotoAtlas(page, "P16");
  await page.getByTestId("phase-row-16").click();
  await expect(page.getByTestId("selected-phase-detail")).toContainText("Submission enqueue, governed transmit");
  await expect(page.getByTestId("run-engine-atlas")).toHaveScreenshot("run-engine-atlas-phase-16.png", {
    animations: "disabled",
    fullPage: true,
  });
});
