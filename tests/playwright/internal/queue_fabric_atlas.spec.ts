import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/queue-fabric-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("queue-fabric-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Dispatch stage rail and queue posture",
    }),
  ).toBeVisible();
}

test("renders the queue fabric atlas with reduced-motion parity and default authority queue focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Queue Fabric Atlas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Queue family selector AUTHORITY" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("reconcile then retry")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "authority transmit queue packet references interaction record and uses resend legality queued unassessed",
    }),
  ).toBeVisible();
  await expect(page.getByText("Queued authority sends remain subordinate")).toBeVisible();
});

test("supports keyboard traversal into stage claim posture and keeps the DOM redaction-safe", async ({
  page,
}) => {
  await gotoAtlas(page);

  const stageFamily = page.getByRole("button", { name: "Queue family selector STAGE" });
  await stageFamily.focus();
  await page.keyboard.press("Enter");

  const claimStage = page.getByRole("button", { name: "Dispatch stage rail entry CLAIM" });
  await claimStage.focus();
  await page.keyboard.press("Enter");

  const claimNode = page.getByRole("button", {
    name: "stage work claim lease fences stale workers with visibility timeout reclaim",
  });
  await claimNode.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("CLAIM · Stage work")).toBeVisible();
  await expect(page.getByText("Claim fencing prevents a stale worker")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("access_token");
  await expect(page.locator("body")).not.toContainText("declaration_text");
});
