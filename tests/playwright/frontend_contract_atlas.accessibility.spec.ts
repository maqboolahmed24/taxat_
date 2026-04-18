import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/frontend_contract_atlas/index.html";

async function gotoAtlas(page: Parameters<typeof test>[0]["page"], hash = "#page=overview") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("frontend-contract-atlas")).toBeVisible();
}

test("tab keyboard navigation works across the atlas pages", async ({ page }) => {
  await gotoAtlas(page);
  const overview = page.getByRole("tab", { name: "Overview" });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
});

test("calm shell page exposes the required semantic anchors", async ({ page }) => {
  await gotoAtlas(page, "#page=calm");
  await expect(page.getByTestId("context-bar")).toBeVisible();
  await expect(page.getByTestId("decision-summary")).toBeVisible();
  await expect(page.getByTestId("action-strip")).toBeVisible();
  await expect(page.getByTestId("detail-drawer")).toBeVisible();
  await expect(page.getByTestId("primary-action")).toBeVisible();
});

test("portal shell page exposes the client-safe semantic anchors", async ({ page }) => {
  await gotoAtlas(page, "#page=portal");
  await expect(page.getByTestId("portal-shell")).toBeVisible();
  await expect(page.getByTestId("portal-status-hero")).toBeVisible();
  await expect(page.getByTestId("portal-primary-action")).toBeVisible();
  await expect(page.getByTestId("portal-support-panel")).toBeVisible();
  await expect(page.getByTestId("portal-history-list")).toBeVisible();
});

test("governance shell page exposes the governance semantic anchors", async ({ page }) => {
  await gotoAtlas(page, "#page=governance");
  await expect(page.getByTestId("governance-shell-family")).toBeVisible();
  await expect(page.getByTestId("governance-context-bar")).toBeVisible();
  await expect(page.getByTestId("governance-primary-worklist")).toBeVisible();
  await expect(page.getByTestId("overview-attention-summary")).toBeVisible();
  await expect(page.getByTestId("governance-support-sidecar")).toBeVisible();
});

test("continuity lab toggles polite and assertive live regions", async ({ page }) => {
  await gotoAtlas(page, "#page=continuity&scenario=refresh_preserves_same_object");
  await expect(page.getByTestId("continuity-live-region")).toHaveAttribute("aria-live", "polite");
  await page.getByTestId("continuity-scenario-access_rebind_after_scope_change").click();
  await expect(page.getByTestId("continuity-live-region")).toHaveAttribute("aria-live", "assertive");
});
