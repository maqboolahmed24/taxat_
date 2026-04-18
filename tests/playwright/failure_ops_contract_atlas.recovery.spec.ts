import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/failure_ops_contract_atlas/index.html";

async function gotoAtlas(page, hash = "#page=failure-lifecycle&lineage=open_failure") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("failure-ops-contract-atlas")).toBeVisible();
}

test("failure lifecycle state transitions keep closure posture explicit", async ({ page }) => {
  await gotoAtlas(page);

  await page.getByRole("button", { name: "Accepted risk" }).click();
  await expect(page.getByTestId("failure-dashboard-projection")).toContainText("ACTIVE");
  await expect(page.getByTestId("failure-dashboard-projection")).toContainText("bounded exception path");
  await expect(page.getByTestId("failure-evidence-inspector")).toContainText("Accepted risk is explicit, bounded, and reviewable");

  await page.getByRole("button", { name: "Resolved" }).click();
  await expect(page.getByTestId("failure-dashboard-projection")).toContainText("NO_FURTHER_ACTION");
  await expect(page.getByTestId("failure-dashboard-projection")).toContainText("VERIFIED");
  await expect(page.getByTestId("failure-evidence-inspector")).toContainText("Resolution is terminal only because typed artifacts say it is");
});

test("responsive inspector collapse preserves anchors", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1200 });
  await gotoAtlas(page, "#page=query-contracts");
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.inspectorLayout)).toBe("stacked");
  await expect(page.getByTestId("failure-evidence-inspector")).toBeVisible();
  await expect(page.getByTestId("query-contract-catalog")).toBeVisible();

  await page.setViewportSize({ width: 820, height: 1200 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.stackLayout)).toBe("stacked");
  await expect(page.getByTestId("failure-evidence-inspector")).toBeVisible();
});

test("failure lifecycle screenshot baseline", async ({ page }) => {
  await gotoAtlas(page, "#page=failure-lifecycle&lineage=accepted_risk");
  await expect(page.getByTestId("failure-ops-contract-atlas")).toHaveScreenshot("failure-ops-contract-atlas-failure-lifecycle.png", {
    animations: "disabled",
    fullPage: true,
  });
});
