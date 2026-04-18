import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/frontend_contract_atlas/index.html";

async function gotoContinuity(page: Parameters<typeof test>[0]["page"], scenario = "refresh_preserves_same_object") {
  await page.goto(`${atlasPath}#page=continuity&scenario=${scenario}`);
  await expect(page.getByTestId("frontend-contract-atlas")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
}

test("scenario selection updates the live region and restoration order", async ({ page }) => {
  await gotoContinuity(page);
  await page.getByTestId("continuity-scenario-publication_or_epoch_rebase").click();
  await expect(page.getByRole("heading", { name: "publication_or_epoch_rebase" })).toBeVisible();
  await expect(page.getByTestId("continuity-live-region")).toHaveAttribute("aria-live", "assertive");
  await expect(page.getByTestId("continuity-restoration-order")).toContainText("serialized parent return target");
});

test("support region close returns focus to the invoker", async ({ page }) => {
  await gotoContinuity(page, "secondary_window_return");
  const opener = page.getByTestId("continuity-open-support");
  await opener.click();
  await expect(page.getByTestId("continuity-support-panel")).toBeVisible();
  await page.getByTestId("continuity-close-support").click();
  await expect(opener).toBeFocused();
});

test("back and forward navigation preserve page and scenario history", async ({ page }) => {
  await page.goto(`${atlasPath}#page=overview`);
  await page.getByRole("tab", { name: "CALM_SHELL" }).click();
  await page.getByRole("tab", { name: "Continuity Lab" }).click();
  await page.getByTestId("continuity-scenario-cache_hydration_purge_and_rebase").click();
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "refresh_preserves_same_object" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced motion mode is surfaced without changing semantic state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoContinuity(page, "reduced_motion_semantic_equivalence");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
      .toBe("reduce");
    await expect(page.getByTestId("motion-mode")).toContainText("reduce");
  });
});
