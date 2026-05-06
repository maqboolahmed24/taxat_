import { expect, test, type Page } from "@playwright/test";

const observatoryPath = "/apps/operator-web/public/internal/contracts-observatory/index.html";

async function gotoObservatory(page: Page) {
  await page.goto(observatoryPath);
  await expect(page.getByTestId("contracts-observatory")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Contract observatory navigation" }),
  ).toBeVisible();
}

test("renders the contracts observatory shell with reduced-motion parity", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoObservatory(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.locator("#page-title")).toHaveText("Taxat Contract Observatory");
  await expect(page.locator("#artifact-kind-chip")).toHaveText("OVERVIEW");
  await expect(page.locator("#source-truth-chip")).toHaveText("Generated Observatory Overview");
});

test("supports command search, schema-field inspection, and deep-link state updates with keyboard-safe flow", async ({
  page,
}) => {
  await gotoObservatory(page);

  await page.getByRole("button", { name: "Open command search" }).click();
  await expect(
    page.getByRole("dialog", { name: "Command search across contract artifacts" }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Search contracts observatory" }).fill(
    "manifest lineage trace",
  );
  await page.keyboard.press("Enter");

  await expect(page.locator("#artifact-title")).toHaveText("Manifest Lineage Trace");

  const fieldButton = page.getByRole("button", {
    name: /access_binding_hash field links to 0 prose sections and 1 sample fragments/i,
  });
  await fieldButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#evidence-title")).toContainText("Field evidence");
  await expect(page.locator("#evidence-rail")).toContainText("/access_binding_hash");
  await expect(page).toHaveURL(/artifact=schema--manifest_lineage_trace/);
  await expect(page).toHaveURL(/field=access_binding_hash/);

  const headingButton = page.getByRole("button", { name: "Navigate to heading Overview" });
  await headingButton.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/heading=overview/);
});
