import { expect, test } from "@playwright/test";

const secretRootLedgerUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=secret-root-topology-ledger";

test("renders the secret root topology ledger with semantic sections and safe refs only", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(secretRootLedgerUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Secret alias families" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alias Catalog" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key Hierarchy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access Matrix" })).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText(
    "hmrc/client-secret/web-app-via-server",
  );
  await expect(page.getByText("BEGIN PRIVATE KEY")).toHaveCount(0);
});

test("supports keyboard selection across alias families and updates the persistent inspector", async ({
  page,
}) => {
  await page.goto(secretRootLedgerUrl);

  const environmentSelect = page.locator("#environment-select");
  await environmentSelect.selectOption("env_preproduction_verification");

  const aliasButton = page
    .locator(".secret-alias-rail-list button")
    .filter({ hasText: "monitoring/sentry/ingest-dsn" });
  await aliasButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText(
    "monitoring/sentry/ingest-dsn",
  );
  await expect(page.locator("#drawer-title")).toHaveText(
    "monitoring/sentry/ingest-dsn",
  );

  const grantButton = page
    .locator(".secret-access-row")
    .filter({ hasText: "Observability agent" });
  await grantButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-body").getByText("role.observability_agent")).toBeVisible();
  await expect(
    page
      .locator("#step-list .field-row")
      .filter({ hasText: "Store ref preview" })
      .getByText(
        "vault://secret/sec_preprod_runtime/monitoring/sentry/ingest-dsn/current",
      ),
  ).toBeVisible();
});
