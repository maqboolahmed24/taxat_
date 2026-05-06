import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/stream-recovery-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("stream-recovery-atlas")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Continuity phase rail" })).toBeVisible();
}

test("renders the stream recovery atlas with reduced-motion parity and default workspace live focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Stream Recovery Atlas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stream scope selector WORKSPACE" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#rebase-badge")).toHaveText("access rebind required");
  await expect(
    page.getByRole("button", {
      name: "workspace stream sequence 21 in epoch 3 requires exact route session scope masking match",
    }),
  ).toBeVisible();
});

test("supports keyboard rebase selection, overlay posture, and removes old epoch markers after rebase", async ({
  page,
}) => {
  await gotoAtlas(page);

  const experienceScope = page.getByRole("button", { name: "Stream scope selector EXPERIENCE" });
  await experienceScope.focus();
  await page.keyboard.press("Enter");

  const overlayToggle = page.getByRole("button", {
    name: "Show duplicate and compaction posture",
  });
  await overlayToggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator("#ribbon-grid .metric-chip").filter({ hasText: "duplicate scope / epoch / sequence" }).first(),
  ).toBeVisible();

  const rebasePhase = page.getByRole("button", { name: "Continuity phase REBASE" });
  await rebasePhase.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("stream-inspector").getByText("Epoch 4", { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-scope-class="MANIFEST_EXPERIENCE"] [data-frame-epoch="3"]'),
  ).toHaveCount(0);
  await expect(page.getByText("Epoch advance invalidates prior sequence windows")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("resume.experience.42");
});
