import { expect, test } from "@playwright/test";

const messageFabricAtlasUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=message-fabric-atlas";

test("renders the message fabric atlas with semantic lanes and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(messageFabricAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Channel families and coordination flows" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Durable Outboxes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Broker Channels", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Inbox / Consumers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Ordering / Partition / Retry",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Authority callback ingress");
  await expect(page.locator("#run-status")).toHaveText("PROVIDER SELECTION REQUIRED");
});

test("supports keyboard selection across families, channels, and policy strips", async ({
  page,
}) => {
  await page.goto(messageFabricAtlasUrl);

  await page.locator("#environment-select").selectOption("env_production");

  const governanceFamily = page
    .locator(".message-family-rail-list button")
    .filter({ hasText: "External Delivery / Governance" });
  await governanceFamily.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText(
    "External Delivery / Governance",
  );

  const restrictedAttestation = page.getByRole("button", {
    name: /Restricted export delivery attestation/i,
  });
  await restrictedAttestation.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText(
    "Restricted export delivery attestation",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "control_async.delivery_evidence_inbox",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "worker.export-attestation-restricted",
  );

  const retryPolicy = page.getByRole("button", {
    name: /Retry policy Delivery evidence backoff/i,
  });
  await retryPolicy.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-body")).toContainText(
    "DEAD_LETTER_QUEUE_REQUIRED",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "dedupe.delivery_binding",
  );
});
