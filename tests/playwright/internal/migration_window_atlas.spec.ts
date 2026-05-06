import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/migration-window-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("migration-window-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Migration state rail and rollout posture",
    }),
  ).toBeVisible();
}

test("renders the migration observatory with reduced-motion parity and semantic compatibility bands", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Migration Window Atlas")).toBeVisible();
  await expect(page.locator("#schema-badge")).toContainText("000001");
  await expect(page.locator("#rollout-chip")).toHaveText("HALTED / ROLLBACK SAFE");
  await expect(
    page.getByRole("button", { name: "Migration rail entry HALTED" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    page.getByRole("group", {
      name: "Compatibility band for migration 000006 halted rollback safe",
    }),
  ).toBeVisible();
});

test("supports keyboard traversal across the state rail and timeline rows while updating the inspector", async ({
  page,
}) => {
  await gotoAtlas(page);

  const failedRail = page.getByRole("button", { name: "Migration rail entry FAILED" });
  await failedRail.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#rollout-chip")).toHaveText("FAILED / FAIL FORWARD ONLY");
  await expect(page.locator("#inspector-title")).toHaveText("000007_failed_contract_cleanup");
  await expect(page.locator("#inspector-body")).toContainText("failure.ref.contract-phase-cleanup");

  const verifyingRow = page.getByRole("button", {
    name: "migration 000004 verifying rollback safe",
  });
  await verifyingRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#rollout-chip")).toHaveText("VERIFYING / ROLLBACK SAFE");
  await expect(page.locator("#inspector-title")).toHaveText("000004_verify_replay_window");
  await expect(page.locator("#inspector-body")).toContainText("verification.release-manifest.000004");
  await expect(
    page.getByRole("group", {
      name: "Compatibility band for migration 000004 verifying rollback safe",
    }),
  ).toBeVisible();
});
