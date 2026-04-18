import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/surface_requirements_atlas/index.html";

async function gotoAtlas(page, hash = "#page=overview&record=collaboration_staff_inbox") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("surface-requirements-atlas")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Atlas pages" })).toBeVisible();
}

test("overview renders summary and navigation", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByText("Surface Requirements Atlas")).toBeVisible();
  await expect(page.getByTestId("summary-surface-families")).toContainText("4");
  await expect(page.getByTestId("summary-route-scenes")).toContainText("30");
  await expect(page.getByRole("tab", { name: "Collaboration" })).toBeVisible();
});

test("family pages render collaboration, portal, governance, and native compositions", async ({ page }) => {
  await gotoAtlas(page);

  await page.getByRole("tab", { name: "Collaboration" }).click();
  await expect(page.getByTestId("collaboration-lane-map")).toBeVisible();
  await expect(page.getByTestId("route-card-collaboration_staff_workspace")).toBeVisible();

  await page.getByRole("tab", { name: "Portal" }).click();
  await expect(page.getByTestId("portal-mobile-frame")).toBeVisible();
  await expect(page.getByTestId("upload-state-transfer")).toBeVisible();

  await page.getByRole("tab", { name: "Governance" }).click();
  await expect(page.getByTestId("governance-basket-ribbon")).toBeVisible();

  await page.getByRole("tab", { name: "Native" }).click();
  await expect(page.getByTestId("native-primary-scene")).toBeVisible();
});

test("overview screenshot baseline", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByTestId("surface-requirements-atlas")).toHaveScreenshot("surface-requirements-atlas-overview.png", {
    animations: "disabled",
    fullPage: true,
  });
});
