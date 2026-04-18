import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/frontend_contract_atlas/index.html";

async function gotoAtlas(page: Parameters<typeof test>[0]["page"], hash = "#page=overview") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("frontend-contract-atlas")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Shell families" })).toBeVisible();
}

test("overview renders shell summary and route matrix", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByText("Frontend Contract Atlas")).toBeVisible();
  await expect(page.getByTestId("atlas-summary-shells")).toContainText("3");
  await expect(page.getByTestId("atlas-summary-routes")).toContainText("21");
  await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toBeVisible();
  await expect(page.getByText("Canonical browser route families")).toBeVisible();
});

test("shell tabs switch between calm, portal, and governance pages", async ({ page }) => {
  await gotoAtlas(page);
  await page.getByRole("tab", { name: "CALM_SHELL" }).click();
  await expect(page.getByTestId("context-bar")).toBeVisible();
  await expect(page.getByTestId("detail-drawer")).toBeVisible();

  await page.getByRole("tab", { name: "CLIENT_PORTAL_SHELL" }).click();
  await expect(page.getByTestId("portal-shell")).toBeVisible();
  await expect(page.getByTestId("portal-route-tabs")).toBeVisible();

  await page.getByRole("tab", { name: "GOVERNANCE_DENSITY_SHELL" }).click();
  await expect(page.getByTestId("governance-primary-worklist")).toBeVisible();
  await expect(page.getByTestId("governance-support-sidecar")).toBeVisible();
});

test("overview screenshot baseline", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByTestId("frontend-contract-atlas")).toHaveScreenshot("frontend-contract-atlas-overview.png", {
    animations: "disabled",
    fullPage: true,
  });
});

test("continuity lab screenshot baseline", async ({ page }) => {
  await gotoAtlas(page, "#page=continuity&scenario=publication_or_epoch_rebase");
  await expect(page.getByTestId("frontend-contract-atlas")).toHaveScreenshot("frontend-contract-atlas-continuity.png", {
    animations: "disabled",
    fullPage: true,
  });
});
