import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/surface_requirements_atlas/index.html";

async function gotoAtlas(page, hash = "#page=continuity&scenario=inline_rebase&record=collaboration_staff_workspace") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("surface-requirements-atlas")).toBeVisible();
}

test("continuity scenarios switch and support focus returns to the parent trigger", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByTestId("continuity-scenario-list")).toBeVisible();

  await page.getByTestId("support-demo-toggle").click();
  await expect(page.getByTestId("support-demo-drawer")).toBeVisible();
  await page.getByTestId("support-demo-close").click();
  await expect(page.getByTestId("support-demo-toggle")).toBeFocused();

  await page.getByRole("button", { name: "Native scene restore under legality checks" }).click();
  await expect(page.getByTestId("evidence-inspector")).toContainText("Native scene restore under legality checks");
});

test("reduced motion mode is reflected in the document dataset", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.motion)).toBe("reduce");
});

test("continuity screenshot baseline", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByTestId("surface-requirements-atlas")).toHaveScreenshot("surface-requirements-atlas-continuity.png", {
    animations: "disabled",
    fullPage: true,
  });
});
