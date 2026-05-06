import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/reference-grammar-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("reference-grammar-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Reference family rail and contract posture",
    }),
  ).toBeVisible();
}

test("renders the reference grammar atlas with reduced motion and default delivery focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Reference Grammar Atlas")).toBeVisible();
  await expect(page.locator("#grammar-badge")).toHaveText("REFERENCE GRAMMAR V1");
  await expect(page.locator("#active-family-chip")).toHaveText("DELIVERY");
  await expect(
    page.getByRole("button", { name: "Reference family rail entry DELIVERY" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    page.getByText("signed delivery handle cannot be treated as durable artifact ref"),
  ).toBeVisible();
  const deliveryExample = page.getByRole("group", {
    name: "Delivery example customer download requires explicit binding",
  });
  await expect(deliveryExample).toContainText("download.current.manifest-2026-q2");
});

test("supports keyboard traversal from family rail to lattice nodes and updates the inspector semantically", async ({
  page,
}) => {
  await gotoAtlas(page);

  const storageButton = page.getByRole("button", { name: "Reference family rail entry STORAGE" });
  await storageButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#active-family-chip")).toHaveText("STORAGE");
  await expect(page.getByText("storage ref cannot be used as customer download ref")).toBeVisible();
  await expect(page.locator("#inspector-title")).toHaveText("STORAGE");
  await expect(page.locator("#inspector-body")).toContainText("Upload staging storage ref");

  const routeNode = page.getByRole("button", {
    name: "Reference lattice node ROUTE route token",
  });
  await routeNode.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#active-family-chip")).toHaveText("ROUTE");
  await expect(page.locator("#inspector-title")).toHaveText("ROUTE");
  const routeExample = page.getByRole("group", {
    name: "Route example route identity token stays session scoped",
  });
  await expect(routeExample).toContainText("/manifests/{manifest_id}?focus=workflow:{item_id}");
  await expect(page.locator("#inspector-body")).toContainText(
    "Route tokens may describe patterns or scene keys but may not be full URLs.",
  );
});
