import { expect, test } from "@playwright/test";

const storageBucketTopologyUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=storage-bucket-topology-board";

test("renders the storage bucket topology board with semantic zones and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(storageBucketTopologyUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Storage buckets and purpose zones" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Upload Intake", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Retained Evidence", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Derived / Export Artifacts",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".storage-zone .panel-heading h3").filter({ hasText: "Quarantine" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Lifecycle / Retention / Event Routes",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Upload staging");
  await expect(page.locator("#run-status")).toHaveText("PROVIDER SELECTION REQUIRED");
});

test("supports keyboard selection across buckets, lifecycle rules, and event routes", async ({
  page,
}) => {
  await page.goto(storageBucketTopologyUrl);

  await page.locator("#environment-select").selectOption("env_production");

  const quarantineBucket = page
    .locator(".storage-bucket-rail-list button")
    .filter({ hasText: "Quarantine" });
  await quarantineBucket.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("Quarantine");
  await expect(page.locator("#drawer-title")).toHaveText("Quarantine");
  await expect(page.locator("#drawer-body")).toContainText(
    "taxat-prod-quarantine",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "Release uses copy/promote semantics with history retained",
  );

  const restrictedLifecycle = page.getByRole("button", {
    name: /Retention law Restricted exports/i,
  });
  await restrictedLifecycle.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("Restricted exports");
  await expect(page.locator("#drawer-body")).toContainText(
    "EXPORT_RESTRICTED_ACTIVE",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "SIGNED GATEWAY ONLY OPERATOR STEP UP",
  );

  const restrictedEvent = page.getByRole("button", {
    name: /Event route Restricted export finalized -> operator delivery attestation/i,
  });
  await restrictedEvent.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-body")).toContainText(
    "channel.export.delivery.attestation.restricted",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "delivery_binding_hash",
  );
});
