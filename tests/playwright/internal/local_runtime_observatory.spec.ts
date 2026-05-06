import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/local-runtime-observatory/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("local-runtime-observatory")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Local runtime topology" })).toBeVisible();
}

test("renders the local runtime observatory with reduced-motion parity and the default control-store selection", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Local Runtime Observatory")).toBeVisible();
  await expect(page.locator("#environment-badge")).toHaveText("Local authoring");
  await expect(page.locator("#seed-profile-chip")).toHaveText("PROFILE_DETERMINISTIC_BASELINE");
  await expect(page.locator("#validator-status-chip")).toHaveText("Authoritative validators wired");
  await expect(
    page.getByRole("button", {
      name: "control store service is durable truth and protects mutable workflow law in topology rail",
    }),
  ).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("runtime-inspector")).toContainText("Never remove postgres-data");
});

test("supports keyboard traversal across service and edge selections without exposing mutable controls", async ({
  page,
}) => {
  await gotoAtlas(page);

  const queue = page.getByRole("button", {
    name: "queue service is disposable delivery fabric and rebuilds from outbox truth in topology rail",
  });
  await queue.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("runtime-inspector")).toContainText("Disposable reset may delete rabbitmq-data");
  await expect(page.getByTestId("runtime-inspector")).toContainText("queue.stage-work");

  const edge = page.getByRole("button", { name: /outbox to queue delivery is derived transport/i });
  await edge.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#edge-title")).toHaveText("Outbox to queue delivery");
  await expect(page.locator("#edge-summary")).toContainText("persisted outbox");
  await expect(page.getByTestId("local-runtime-observatory")).not.toContainText("Open console");
});
