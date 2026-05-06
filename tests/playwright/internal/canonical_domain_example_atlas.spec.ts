import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/canonical-domain-example-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("canonical-domain-example-atlas")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Canonical embodiments" })).toBeVisible();
}

test("renders the canonical domain example atlas with reduced-motion parity and the default golden-pack embodiment", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Canonical Domain Example Atlas")).toBeVisible();
  await expect(page.getByLabel("Embodiment selector")).toHaveValue("EMB-01");
  await expect(page.locator("#replay-class-badge")).toHaveText("STANDARD_REPLAY");
  await expect(page.locator("#golden-pack-chip")).toHaveText("2 golden-pack fixtures");
  await expect(
    page.getByRole("button", {
      name: /embodiment direct-subject quarterly update from structured records maps to test vectors tv-01/i,
    }),
  ).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("canonical-domain-example-atlas")).toContainText("Synthetic values only");
});

test("supports keyboard traversal, variant switching, and golden-pack overlay inspection without exposing live data", async ({
  page,
}) => {
  await gotoAtlas(page);

  const emb12 = page.getByRole("button", {
    name: /embodiment multi-product compatible chain maps to test vectors tv-12/i,
  });
  await emb12.focus();
  await page.keyboard.press("Enter");

  const uploadVariant = page.getByRole("button", {
    name: "Scenario variant Upload request rebase and reconfirmation",
  });
  await uploadVariant.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#replay-class-badge")).toHaveText("LIVE_REQUEST_REBASE");
  await expect(page.getByTestId("example-inspector")).toContainText("TV-27A");
  await expect(page.getByTestId("example-inspector")).toContainText("TV-27G");
  await expect(page.getByTestId("example-inspector")).toContainText("Only synthetic request ids");

  const emb01 = page.getByRole("button", {
    name: /embodiment direct-subject quarterly update from structured records maps to test vectors tv-01/i,
  });
  await emb01.focus();
  await page.keyboard.press("Enter");

  const toggle = page.getByRole("button", { name: "Show golden-pack coverage overlay" });
  await toggle.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("golden-pack-overlay")).toBeVisible();
  await expect(page.getByTestId("golden-pack-overlay")).toContainText("module.compute-result.emb-01");
  await expect(page.getByTestId("golden-pack-overlay")).toContainText("replay.exact.emb-01");
});
