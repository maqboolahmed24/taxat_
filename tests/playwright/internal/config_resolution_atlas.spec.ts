import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/config-resolution-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("config-resolution-atlas")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Manifest selector" })).toBeVisible();
}

test("renders the config resolution atlas with semantic layer rails and reduced-motion posture", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Config Resolution Atlas")).toBeVisible();
  await expect(page.locator("#basis-chip")).toHaveText("DIRECT_REQUEST_RESOLUTION");
  await expect(
    page.getByRole("button", {
      name: "feature flag snapshot contributes hash component to frozen config surface",
    }),
  ).toBeVisible();
});

test("supports keyboard traversal and shows hash-vector explainability for historical explicit reuse", async ({
  page,
}) => {
  await gotoAtlas(page);

  const scenario = page.getByRole("button", {
    name: "Manifest selector Historical explicit reuse",
  });
  await scenario.focus();
  await page.keyboard.press("Enter");

  const inheritanceLayer = page.getByRole("button", {
    name: "inheritance layer distinguishes fresh resolution from exact or historical frozen reuse",
  });
  await inheritanceLayer.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#basis-chip")).toHaveText("HISTORICAL_EXPLICIT_REUSE");
  await expect(page.getByTestId("config-inspector")).toContainText("cfg-freeze-direct-74");

  const toggle = page.getByRole("button", { name: "Show hash vector" });
  await toggle.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("config-inspector")).toContainText("feature_flag_snapshot_hash");
  await expect(page.getByTestId("config-inspector")).toContainText("schema_bundle_hash");
});

test("shows the explicit null-surface posture without implying live mutation controls", async ({
  page,
}) => {
  await gotoAtlas(page);

  await page.getByRole("button", { name: "Manifest selector Direct null feature-flag surface" }).click();
  await page.getByRole("button", {
    name: "feature flag snapshot contributes hash component to frozen config surface",
  }).click();

  await expect(page.locator("#flags-chip")).toHaveText("NO_GOVERNED_FLAG_SURFACE");
  await expect(page.getByTestId("config-inspector")).toContainText(
    "Manifest-level feature_flag_snapshot_hash remains explicitly null.",
  );
  await expect(page.getByText("Taxat Config Resolution Atlas")).toBeVisible();
});
