import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/acceptance-atlas/index.html";

async function gotoAtlas(page: Parameters<typeof test>[0]["page"]) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("acceptance-atlas")).toBeVisible();
  await expect(page.getByTestId("manifest-status-chip")).toContainText("pc_0030");
}

test("phase and layer filters change the visible task set", async ({ page }) => {
  await gotoAtlas(page);

  await page.getByTestId("filter-phase").selectOption("phase_06");
  await expect(page.getByTestId("results-summary")).toContainText("91 tasks visible");
  await expect(page.getByTestId("task-row-pc_0301")).toBeVisible();
  await expect(page.getByTestId("task-list").getByTestId("task-row-pc_0030")).toHaveCount(0);

  await page.getByTestId("filter-layer").selectOption("release");
  await expect(page.getByTestId("summary-release-count")).not.toContainText("0");
});

test("inspector opens, shows exact validator commands, and closes with focus return", async ({
  page,
}) => {
  await gotoAtlas(page);

  const row = page.getByTestId("task-row-pc_0030");
  await row.click();

  await expect(page.getByTestId("inspector")).toBeVisible();
  await expect(page.getByTestId("inspector")).toContainText(
    "python3 Algorithm/scripts/validate_contracts.py --self-test",
  );
  await expect(page.getByTestId("inspector")).toContainText(
    "npm exec --workspaces=false -- playwright test tests/playwright/analysis/acceptance-atlas.spec.ts",
  );

  await page.getByTestId("inspector-close").click();
  await expect(row).toBeFocused();
});

test("keyboard traversal moves between task rows with arrow keys", async ({ page }) => {
  await gotoAtlas(page);

  const firstRow = page.getByTestId("task-row-pc_0001");
  const secondRow = page.getByTestId("task-row-pc_0002");

  await firstRow.focus();
  await firstRow.press("ArrowDown");
  await expect(secondRow).toBeFocused();

  await secondRow.press("ArrowUp");
  await expect(firstRow).toBeFocused();
});

test("typed gap state is rendered for gapped tasks", async ({ page }) => {
  await gotoAtlas(page);

  await page.getByTestId("filter-gap").selectOption("gapped");
  const row = page.getByTestId("task-row-pc_0030");
  await row.click();

  await expect(page.getByTestId("typed-gap-state")).toContainText(
    "shared_operating_contract_0030_to_0037_missing",
  );
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced motion mode is surfaced without changing atlas meaning", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoAtlas(page);

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
      .toBe("reduce");
    await expect(page.getByTestId("motion-mode")).toContainText("reduce");
    await expect(page.getByTestId("results-summary")).toContainText("tasks visible");
  });
});
