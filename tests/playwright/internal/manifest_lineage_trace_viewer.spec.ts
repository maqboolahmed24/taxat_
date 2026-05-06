import { expect, type Page, test } from "@playwright/test";

const viewerPath = "/apps/operator-web/public/internal/manifest-lineage-trace-viewer/index.html";

async function gotoViewer(page: Page) {
  await page.goto(viewerPath);
  await expect(page.getByTestId("manifest-lineage-trace-viewer")).toBeVisible();
  await expect(page.getByTestId("manifest-lineage-canvas")).toBeVisible();
  await expect(page.getByTestId("lineage-trace-inspector")).toBeVisible();
}

async function candidateActions(page: Page) {
  return page
    .locator("[data-testid='branch-candidate']")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-action")).filter(Boolean));
}

test("renders candidate order and reduced-motion-safe branch explorer chrome", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoViewer(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  expect(await candidateActions(page)).toEqual([
    "NEW_MANIFEST",
    "RETURN_EXISTING_BUNDLE",
    "REUSE_SEALED_MANIFEST",
    "REPLAY_CHILD",
    "RECOVERY_CHILD",
    "CONTINUATION_CHILD",
    "NEW_REQUEST_CHILD",
  ]);
  await expect(page.locator("#action-chip")).toHaveText("Return Existing Bundle");
  await expect(page.locator("#reason-chip")).toHaveText("Terminal Idempotent Retry");
  await expect(page.locator("#inspector-rows")).toContainText("ALL_MIRRORS_IN_SYNC");
});

test("selects candidates deterministically and updates decision cards", async ({ page }) => {
  await gotoViewer(page);

  await page
    .getByRole("button", {
      name: "replay child rejected because replay class mismatched",
    })
    .click();

  await expect(
    page.locator("[data-testid='branch-candidate'][data-action='REPLAY_CHILD']"),
  ).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#ribbon-title")).toHaveText("Replay Child / Rejected");
  await expect(page.locator("#decision-cards")).toContainText("REPLAY_CLASS_MISMATCH");
});

test("supports keyboard navigation across the candidate rail", async ({ page }) => {
  await gotoViewer(page);

  const selectedButton = page.locator(
    "[data-testid='branch-candidate'][data-action='RETURN_EXISTING_BUNDLE']",
  );
  await selectedButton.focus();
  await page.keyboard.press("ArrowDown");

  await expect(
    page.locator("[data-testid='branch-candidate'][data-action='REUSE_SEALED_MANIFEST']"),
  ).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#ribbon-title")).toHaveText("Reuse Sealed Manifest / Rejected");
});

test("nightly context chip highlights same-window reuse without changing manifest-local basis", async ({
  page,
}) => {
  await gotoViewer(page);

  await page.getByRole("button", { name: "Highlight nightly context same window reuse" }).click();

  await expect(page.getByRole("button", { name: /Highlight nightly context/ })).toHaveAttribute(
    "data-highlighted",
    "true",
  );
  await expect(
    page.locator("[data-testid='branch-candidate'][data-action='RETURN_EXISTING_BUNDLE']"),
  ).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#inspector-rows")).toContainText("NEW_MANIFEST");
});
