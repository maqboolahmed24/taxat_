import { expect, test } from "@playwright/test";

const resumeIsolationAtlasUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=resume-isolation-atlas";

test("renders the resume isolation atlas with semantic zones and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(resumeIsolationAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Surface families and resume scopes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Partition Identity", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Resume Binding", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Invalidation / Rebase", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Local / Shared Boundary", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Client portal workspace");
  await expect(page.locator("#run-status")).toHaveText("PROVIDER SELECTION REQUIRED");
});

test("supports keyboard selection across families, invalidation triggers, and local/shared rows", async ({
  page,
}) => {
  await page.goto(resumeIsolationAtlasUrl);

  await page.locator("#environment-select").selectOption("env_production");

  const nativeFamily = page
    .locator(".resume-family-rail-list button")
    .filter({ hasText: "Native hydration" });
  await nativeFamily.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("Native hydration");

  const schemaIncompatible = page.getByRole("button", {
    name: /Invalidation trigger Schema incompatible/i,
  });
  await schemaIncompatible.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Schema incompatible");
  await expect(page.locator("#drawer-body")).toContainText(
    "NO_RENDER_UNTIL_COMPATIBLE_SNAPSHOT_AVAILABLE",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "BLOCK_ALL_MUTATIONS_UNTIL_FRESH_COMPATIBLE_STATE",
  );

  const rawTokenRow = page.getByRole("button", {
    name: /Boundary row Raw resume token/i,
  });
  await rawTokenRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Raw resume token");
  await expect(page.locator("#drawer-body")).toContainText("FORBIDDEN_AT_REST");
  await expect(page.locator("#drawer-body")).toContainText(
    "transport material only",
  );
});
