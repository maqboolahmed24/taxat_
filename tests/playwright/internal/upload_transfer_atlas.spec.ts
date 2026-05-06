import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/upload-transfer-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("upload-transfer-atlas")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Upload transfer stages" })).toBeVisible();
}

test("renders the upload transfer atlas with reduced-motion parity and current-session default focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Upload Transfer Atlas")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Upload session selector Session A · reconnect-safe current request",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#request-binding-badge")).toHaveText("original current");
  await expect(
    page.getByRole("button", {
      name: "upload chunk range 524288 to 786431 pending checksum and remains bound to original current request",
    }),
  ).toBeVisible();
});

test("supports keyboard traversal, reveals request-binding detail, and keeps accepted stale uploads distinct from attached truth", async ({
  page,
}) => {
  await gotoAtlas(page);

  const staleSession = page.getByRole("button", {
    name: "Upload session selector Session B · accepted stale upload",
  });
  await staleSession.focus();
  await page.keyboard.press("Enter");

  const attachmentStage = page.getByRole("button", { name: "Transfer stage ATTACHMENT" });
  await attachmentStage.focus();
  await page.keyboard.press("Enter");

  const bindingToggle = page.getByRole("button", { name: "View request binding contract" });
  await bindingToggle.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("binding-panel")).toContainText("request-version.client-doc.2026-04-23.v3");
  await expect(page.getByTestId("binding-panel")).toContainText("request-version.client-doc.2026-04-23.v4");
  await expect(page.getByTestId("binding-panel")).toContainText("RECONFIRM_REQUEST");

  await expect(page.locator("#transfer-state-chip")).toHaveText("ACCEPTED");
  await expect(page.getByTestId("upload-transfer-inspector")).toContainText("REBIND_REQUIRED");
  await expect(page.getByTestId("upload-transfer-inspector")).toContainText("RECONFIRM_REQUEST");
  await expect(page.getByTestId("upload-transfer-inspector")).not.toContainText("ATTACHED");
});
