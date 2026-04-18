import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/failure_ops_contract_atlas/index.html";

async function gotoAtlas(page, hash = "#page=signal-model") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("failure-ops-contract-atlas")).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Atlas pages" })).toBeVisible();
}

test("atlas renders signal, audit, and failure pages from the domain rail", async ({ page }) => {
  await gotoAtlas(page);

  await expect(page.getByText("Failure Ops Contract Atlas")).toBeVisible();
  await expect(page.getByTestId("signal-separation-diagram")).toBeVisible();

  await page.getByRole("tab", { name: "Audit Families" }).click();
  await expect(page.getByTestId("audit-family-ledger")).toBeVisible();

  await page.getByRole("tab", { name: "Failure Lifecycle" }).click();
  await expect(page.getByTestId("failure-lineage-ribbon")).toBeVisible();
  await expect(page.getByTestId("failure-dashboard-projection")).toBeVisible();

  await page.getByRole("tab", { name: "Query Contracts" }).click();
  await expect(page.getByTestId("query-contract-catalog")).toBeVisible();

  await page.getByRole("tab", { name: "Retention & Visibility" }).click();
  await expect(page.getByTestId("retention-visibility-matrix")).toBeVisible();
});

test("signal model screenshot baseline", async ({ page }) => {
  await gotoAtlas(page);
  await expect(page.getByTestId("failure-ops-contract-atlas")).toHaveScreenshot("failure-ops-contract-atlas-signal-model.png", {
    animations: "disabled",
    fullPage: true,
  });
});
