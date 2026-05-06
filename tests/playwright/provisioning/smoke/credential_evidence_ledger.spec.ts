import { expect, test } from "@playwright/test";

const credentialEvidenceLedgerUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=credential-evidence-ledger";

test("renders the credential evidence ledger with reduced-motion parity and the four semantic planes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(credentialEvidenceLedgerUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", {
      name: "Credential families and smoke-validation evidence",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Credential Family", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Expected Principal / Scope",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Masked Evidence", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Outcome / Next Action", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#run-status")).toHaveText(
    "7 ready · 2 manual · 12 blocked · 0 soft fail",
  );
  await expect(page.locator("#drawer-title")).toHaveText(
    "Email provider API key and sender domain",
  );
  await expect(page.locator(".credential-evidence-strip__list")).toBeVisible();
});

test("supports keyboard selection across the family rail and outcome rows", async ({ page }) => {
  await page.goto(credentialEvidenceLedgerUrl);

  await page.locator("#environment-select").selectOption("env_preproduction_verification");

  const familyButton = page
    .locator(".smoke-family-rail-list button")
    .filter({ hasText: "Email provider API key and sender domain" });
  await familyButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("Email provider API key and sender domain");

  const outcomeRow = page.getByRole("button", {
    name: /Outcome \/ Next Action row MANUAL CHECKPOINT REQUIRED/i,
  });
  await outcomeRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("MANUAL CHECKPOINT REQUIRED");
  await expect(page.locator("#drawer-body")).toContainText("EMAIL OR DOMAIN VERIFICATION REQUIRED");
  await expect(page.locator("#drawer-body")).toContainText("notify.preprod.taxat.example");
});
