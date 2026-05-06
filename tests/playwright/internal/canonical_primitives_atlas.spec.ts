import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/canonical-primitives-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("canonical-primitives-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Primitive families and canonical posture",
    }),
  ).toBeVisible();
}

test("renders the canonical primitives atlas with reduced-motion parity and the default hash specimen", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Canonical Primitives Atlas")).toBeVisible();
  await expect(page.locator("#canonicality-badge")).toHaveText("CANONICAL V1");
  await expect(page.locator("#active-family-chip")).toHaveText("HASHES");
  await expect(
    page.getByRole("heading", { name: "Four vertical columns, one active at a time" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Primitive family tab HASHES" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.getByRole("button", { name: "Activate HASHES specimen" })).toBeVisible();
  const hashRow = page.getByRole("group", {
    name: "Literal output row Authority hash example HMRC request identity seed",
  });
  await expect(hashRow).toContainText(
    "72538effc0f17cadec9dc33e60f9c5798b9f92b8aa89e5ae2691fb2884e867d9",
  );
  await expect(
    page.getByRole("button", {
      name: /Copy literal for Authority hash example HMRC request identity seed/i,
    }),
  ).toBeVisible();
});

test("supports semantic traversal across family rail, specimen activation, and inspector updates", async ({
  page,
}) => {
  await gotoAtlas(page);

  const decimalRailButton = page.getByRole("button", {
    name: "Primitive family rail entry DECIMALS",
  });
  await decimalRailButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#active-family-chip")).toHaveText("DECIMALS");
  await expect(page.locator("#drawer-title")).toHaveText("DECIMALS");
  await expect(page.locator("#drawer-body")).toContainText("Exact decimal addition parity");
  await expect(page.locator("#drawer-body")).toContainText("1.203");

  const timeSpecimen = page.getByRole("button", { name: "Activate TIME specimen" });
  await timeSpecimen.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#active-family-chip")).toHaveText("TIME");
  await expect(page.locator("#drawer-title")).toHaveText("TIME");
  await expect(page.locator("#drawer-body")).toContainText("UTC instant normalization parity");
  const timeRow = page.getByRole("group", {
    name: "Literal output row Time instant example Offset timestamp normalizes before emission",
  });
  await expect(timeRow).toContainText("2026-04-23T09:15:00Z");
  await expect(
    page.getByRole("button", {
      name: /Copy literal for Time instant example Offset timestamp normalizes before emission/i,
    }),
  ).toBeVisible();
});
