import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/cache-isolation-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("cache-isolation-atlas")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Cache scope selector" })).toBeVisible();
}

test("renders the cache atlas with workspace read-only restore as the default scenario", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Cache Isolation Atlas")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Cache scope selector WORKSPACE",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#decision-chip")).toHaveText("READ_ONLY_RESTORE");
  await expect(page.locator("#mutation-gate-chip")).toHaveText(
    "BLOCK_MUTATION_PENDING_LIVE_LEGALITY",
  );
  await expect(page.getByTestId("cache-inspector")).toContainText(
    "visibility_cache_partition_key_or_null",
  );
});

test("supports keyboard selection and shows purge drift for native secondary preview mismatch", async ({
  page,
}) => {
  await gotoAtlas(page);

  const nativeScope = page.getByRole("button", {
    name: "Cache scope selector NATIVE SECONDARY",
  });
  await nativeScope.focus();
  await page.keyboard.press("Enter");

  const nativeScenario = page.getByRole("button", {
    name: "Cache scenario selector Native preview selection drift",
  });
  await nativeScenario.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#decision-chip")).toHaveText("REJECT_AND_PURGE");
  await expect(page.locator("#preview-chip")).toHaveText("SELECTION_MISMATCH");
  await expect(page.getByTestId("cache-inspector")).toContainText("PREVIEW_SELECTION_DRIFT");
  await expect(page.getByTestId("cache-inspector")).toContainText("TEMP_EXPORT_FILE");
  await expect(page.getByTestId("cache-inspector")).toContainText("artifact.preview.packet-74");
});
