import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/schema-compatibility-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("schema-compatibility-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Schema drift navigator grouped by severity families",
    }),
  ).toBeVisible();
}

test("renders the schema compatibility observatory with reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Schema Compatibility Atlas")).toBeVisible();
  await expect(page.locator("#verdict-chip")).toHaveText("ROLLBACK SAFE");
  await expect(page.locator("#data-mode-chip")).toHaveText("CANONICAL SCENARIOS");
  await expect(page.locator("#reader-window-chip")).toContainText(
    "compatibility-window.control-plane.000001",
  );
  await expect(
    page.getByRole("button", {
      name: "optional field addition remains rollback safe because existing readers still accept the old payload",
    }),
  ).toBeVisible();
});

test("supports deterministic keyboard filtering across severity groups, chronology phases, and inspector detail", async ({
  page,
}) => {
  await gotoAtlas(page);

  const destructiveGroup = page.getByRole("button", {
    name: "Filter destructive drift cards",
  });
  await destructiveGroup.focus();
  await page.keyboard.press("Enter");

  const contractPhase = page.getByRole("button", { name: "Chronology phase contract" });
  await contractPhase.focus();
  await page.keyboard.press("Enter");

  const destructiveWindowCard = page.getByRole("button", {
    name: "destructive field removal blocks promotion until compatibility window closes",
  });
  await destructiveWindowCard.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#inspector-title")).toContainText(
    "Field removal has a migration ledger but the reader window is still open.",
  );
  await expect(page.locator("#inspector-body")).toContainText("READER_WINDOW_STILL_OPEN");

  const migrationGapGroup = page.getByRole("button", {
    name: "Filter migration gap drift cards",
  });
  await migrationGapGroup.focus();
  await page.keyboard.press("Enter");

  const backfillPhase = page.getByRole("button", { name: "Chronology phase backfill" });
  await backfillPhase.focus();
  await page.keyboard.press("Enter");

  const backfillCard = page.getByRole("button", {
    name: "migration ledger exists but missing backfill evidence blocks promotion",
  });
  await backfillCard.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#inspector-title")).toContainText(
    "Migration ledger exists, but the required backfill execution contract is incomplete.",
  );
  await expect(page.locator("#inspector-body")).toContainText(
    "config/migrations/backfill_execution_policy.json",
  );
});
