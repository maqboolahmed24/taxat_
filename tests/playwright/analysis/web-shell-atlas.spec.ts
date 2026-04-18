import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/web-shell-atlas/index.html";

async function gotoAtlas(page: Parameters<typeof test>[0]["page"], hash = "#page=overview") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("web-shell-atlas")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Atlas pages" })).toBeVisible();
}

test("overview renders the selected topology and deployable split", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByText("Web Shell Atlas")).toBeVisible();
  await expect(page.getByTestId("summary-deployables")).toContainText("2");
  await expect(page.getByTestId("summary-browser-routes")).toContainText("24");
  await expect(page.getByTestId("deployable-card-operator-web")).toContainText("Operator Web");
  await expect(page.getByTestId("deployable-card-client-portal-web")).toContainText("Client Portal Web");
});

test("keyboard tab flow reaches shell pages and the verification lab", async ({ page }) => {
  await gotoAtlas(page);

  const overviewTab = page.getByRole("tab", { name: "Overview" });
  await overviewTab.focus();
  await overviewTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "CALM_SHELL" }).press("End");
  await expect(page.getByRole("tab", { name: "Verification Lab" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Verification Lab" })).toHaveAttribute("aria-selected", "true");
});

test("calm shell route switches preserve shell ownership while changing object context", async ({ page }) => {
  await gotoAtlas(page, "#page=calm&calm=manifest");

  await expect(page.getByTestId("current-shell-family")).toContainText("CALM_SHELL");
  await expect(page.getByTestId("calm-object-anchor")).toContainText("manifest:2026-Q1");

  await page.getByTestId("route-variant-calm-workitem").click();
  await expect(page.getByTestId("current-shell-family")).toContainText("CALM_SHELL");
  await expect(page.getByTestId("calm-object-anchor")).toContainText("work-item:REQ-184");
  await expect(page.getByTestId("shell-continuity-live-region")).toContainText("CALM_SHELL preserved");
});

test("portal shell stays customer-safe and exposes the portal support anchors", async ({ page }) => {
  await gotoAtlas(page, "#page=portal&portal=request-detail");

  await expect(page.getByTestId("current-shell-family")).toContainText("CLIENT_PORTAL_SHELL");
  await expect(page.getByTestId("portal-customer-safe-boundary")).toContainText("request:REQ-184");
  await expect(page.getByTestId("portal-support-region")).toContainText("Support");
  await expect(page.getByTestId("portal-primary-column")).toContainText("Provide requested file");
});

test("governance shell renders density anchors without changing shell meaning", async ({ page }) => {
  await gotoAtlas(page, "#page=governance&governance=audit");

  await expect(page.getByTestId("current-shell-family")).toContainText("GOVERNANCE_DENSITY_SHELL");
  await expect(page.getByTestId("governance-density-nav")).toContainText("audit:case-117");
  await expect(page.getByTestId("governance-density-canvas")).toContainText("Open evidence trace");
  await expect(page.getByTestId("governance-sidecar")).toContainText("Promoted support region");
});

test("closing the support panel returns focus to its opener", async ({ page }) => {
  await gotoAtlas(page, "#page=calm&calm=manifest");

  const opener = page.getByTestId("calm-support-opener");
  await opener.click();
  await expect(page.getByTestId("support-panel")).toBeVisible();

  await page.getByTestId("support-close-button").click();
  await expect(opener).toBeFocused();
});

test("stale-rebase simulation preserves object context while updating the live region", async ({ page }) => {
  await gotoAtlas(page, "#page=calm&calm=manifest");

  await expect(page.getByTestId("calm-object-anchor")).toContainText("manifest:2026-Q1");
  await page.getByTestId("calm-simulate-stale").click();
  await expect(page.getByTestId("shell-continuity-live-region")).toContainText("manifest:2026-Q1");
  await expect(page.getByTestId("calm-object-anchor")).toContainText("manifest:2026-Q1");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced motion mode is surfaced without changing semantic state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoAtlas(page, "#page=lab&scenario=reduced_motion_semantic_equivalence");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
      .toBe("reduce");
    await expect(page.getByTestId("motion-mode")).toContainText("reduce");
    await expect(page.getByTestId("lab-live-region")).toContainText("Reduced motion");
  });
});

test("overview screenshot baseline", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByTestId("web-shell-atlas")).toHaveScreenshot("web-shell-atlas-overview.png", {
    animations: "disabled",
    fullPage: true,
  });
});
