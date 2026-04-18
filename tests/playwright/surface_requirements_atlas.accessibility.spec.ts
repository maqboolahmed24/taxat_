import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/surface_requirements_atlas/index.html";

async function gotoAtlas(page, hash = "#page=portal&record=portal_documents") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("surface-requirements-atlas")).toBeVisible();
}

test("page tabs support keyboard navigation", async ({ page }) => {
  await gotoAtlas(page);
  const portalTab = page.getByRole("tab", { name: "Portal" });
  await portalTab.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: "Governance" })).toBeFocused();
});

test("portal selector chips and evidence inspector are visible", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByTestId("selector-chip-portal-shell")).toBeVisible();
  await expect(page.getByTestId("selector-chip-portal-support-panel")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Evidence inspector" })).toBeVisible();
});

test("inspector close returns to the selected route anchor", async ({ page }) => {
  await gotoAtlas(page);
  await page.getByTestId("route-card-portal_documents").click();
  await page.getByTestId("inspector-close").click();
  await expect(page.getByTestId("route-card-portal_documents")).toBeFocused();
});
