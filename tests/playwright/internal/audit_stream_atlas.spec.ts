import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/audit-stream-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("audit-stream-atlas")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Audit family selector" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Audit stream selector" })).toBeVisible();
}

test("renders the audit stream atlas with reduced-motion posture and strict continuity framing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Audit Stream Atlas")).toBeVisible();
  await expect(page.locator("#continuity-chip")).toHaveText("STRICT_CONTINUITY_VERIFIED");
  await expect(
    page.getByRole("button", {
      name: "Audit family WORKFLOW with none signature posture",
    }),
  ).toBeVisible();
});

test("supports keyboard traversal and merged explanation mode without reordering the strict ledger", async ({
  page,
}) => {
  await gotoAtlas(page);

  const scenario = page.getByRole("button", {
    name: "Audit scenario Signature batch failure does not rewrite the row",
  });
  await scenario.focus();
  await page.keyboard.press("Enter");

  const family = page.getByRole("button", {
    name: "Audit family RELEASE with required batch signature posture",
  });
  await family.focus();
  await page.keyboard.press("Enter");

  const stream = page.getByRole("button", {
    name: /Audit stream audit\.tenant\.tenant\.taxat\.family\.RELEASE for RELEASE/,
  });
  await stream.focus();
  await page.keyboard.press("Enter");

  const before = await page.locator("[data-testid='audit-ledger'] .ledger-event-title").allTextContents();

  const mergedToggle = page.getByRole("button", { name: "Show merged explanation mode" });
  await mergedToggle.focus();
  await page.keyboard.press("Enter");

  const after = await page.locator("[data-testid='audit-ledger'] .ledger-event-title").allTextContents();
  expect(after).toEqual(before);
  await expect(page.getByText("BuildAttested · audit.tenant.tenant.taxat.family.RELEASE")).toBeVisible();
});

test("shows signature failure and limited explainability without raw payload leakage", async ({
  page,
}) => {
  await gotoAtlas(page);

  await page
    .getByRole("button", {
      name: "Audit scenario Retention-limited proof remains explicit",
    })
    .click();
  await page
    .getByRole("button", {
      name: "audit stream sequence 2 records retention limited with prior hash continuity",
    })
    .click();

  await expect(page.getByTestId("audit-inspector")).toContainText("HASH_ONLY");
  await expect(page.getByTestId("audit-inspector")).toContainText("PAYLOAD_EXPIRED");
  await expect(page.getByTestId("audit-inspector")).not.toContainText("raw-payload-secret-076");

  await page
    .getByRole("button", {
      name: "Audit scenario Signature batch failure does not rewrite the row",
    })
    .click();
  await page
    .getByRole("button", {
      name: "audit stream sequence 2 records release promoted with prior hash continuity",
    })
    .click();

  await expect(page.getByTestId("audit-inspector")).toContainText("KMS_BATCH_TIMEOUT");
  await expect(page.getByTestId("audit-inspector")).not.toContainText("release-private-key");
});
