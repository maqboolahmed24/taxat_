import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/event-envelope-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("event-envelope-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Message family rail and packet-lane posture",
    }),
  ).toBeVisible();
}

test("renders the event envelope atlas with reduced-motion parity and default authority packet lane focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Event Envelope Atlas")).toBeVisible();
  await expect(page.locator("#lane-axis")).toContainText("PRODUCER");
  await expect(page.locator("#lane-axis")).toContainText("OUTBOX");
  await expect(page.locator("#lane-axis")).toContainText("BROKER");
  await expect(page.locator("#lane-axis")).toContainText("INBOX");
  await expect(page.locator("#lane-axis")).toContainText("LEDGER");
  await expect(page.locator("#active-family-chip")).toHaveText("AUTHORITY");
  await expect(page.locator("#active-lane-chip")).toHaveText("INBOX");
  await expect(
    page.getByRole("button", { name: "Message family rail entry AUTHORITY" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    page.getByText(
      "Token rotation can change request_hash while leaving duplicate meaning and idempotency stable.",
    ),
  ).toBeVisible();
});

test("supports keyboard traversal from ingress family into the inbox gate and exposes quarantine posture", async ({
  page,
}) => {
  await gotoAtlas(page);

  const ingressButton = page.getByRole("button", {
    name: "Message family rail entry INGRESS",
  });
  await ingressButton.focus();
  await page.keyboard.press("Enter");

  const inboxLaneButton = page.getByRole("button", {
    name: "Packet lane node INBOX durable inbox gate",
  });
  await inboxLaneButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Durable inbox gate");
  await expect(page.locator("#drawer-body")).toContainText(
    "Missing or stale source-record continuity on inbox arrival must quarantine before any mutation.",
  );
  const exampleGroup = page.getByRole("group", {
    name: "Example identity INGRESS",
  });
  await expect(exampleGroup).toContainText("ingress.receipt.hmrc.case-2026-04-23");
  await expect(page.locator("#drawer-body")).toContainText(
    "Quarantine ambiguous or drifted ingress instead of applying a speculative state transition.",
  );
});
