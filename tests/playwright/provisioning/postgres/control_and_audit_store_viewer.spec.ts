import { expect, test } from "@playwright/test";

const postgresLedgerUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=control-and-audit-store-ledger";

test("renders the control and audit store ledger with semantic regions and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(postgresLedgerUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "PostgreSQL stores and profiles" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Transactional Control Truth / Append-Only Audit Evidence",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Role Model" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PITR / Restore / Migration Window" }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Control Store");
  await expect(page.locator("#run-status")).toHaveText("PROVIDER SELECTION REQUIRED");
});

test("supports keyboard selection across stores, roles, and restore policy rows", async ({
  page,
}) => {
  await page.goto(postgresLedgerUrl);

  const storeButton = page
    .locator(".postgres-store-rail-list button")
    .filter({ hasText: "Audit Store" });
  await storeButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("Audit Store");
  await expect(page.locator("#drawer-title")).toHaveText("Audit Store");

  const roleButton = page
    .locator(".postgres-role-row")
    .filter({ hasText: "Audit append writer" });
  await roleButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-body")).toContainText(
    "role.pg.audit.append_writer",
  );
  await expect(page.locator("#drawer-body")).toContainText("INSERT AUDIT EVENT");
  await expect(page.locator("#drawer-body")).toContainText("UPDATE AUDIT ROWS");

  const policyButton = page
    .locator(".postgres-policy-row")
    .filter({ hasText: "PITR and WAL" });
  await policyButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-body")).toContainText(
    "wal_level=replica, archive_mode=on, archive_timeout=60s for authoritative environments.",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "RESTORE_EVIDENCE_BOUND",
  );
});
