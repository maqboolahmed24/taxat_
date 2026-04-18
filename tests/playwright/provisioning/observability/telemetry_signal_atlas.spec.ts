import { expect, test } from "@playwright/test";

const telemetrySignalAtlasUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=telemetry-signal-atlas";

test("renders the telemetry signal atlas with semantic planes and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(telemetrySignalAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Signal families and telemetry routes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emission", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Collector / Processors", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Backends / Sinks", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Correlation To Audit", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Traces");
  await expect(page.locator("#run-status")).toHaveText("PROVIDER SELECTION REQUIRED");
});

test("supports keyboard selection across signal families and atlas rows", async ({
  page,
}) => {
  await page.goto(telemetrySignalAtlasUrl);

  await page.locator("#environment-select").selectOption("env_production");

  const securityFamily = page
    .locator(".telemetry-family-rail-list button")
    .filter({ hasText: "Security telemetry" });
  await securityFamily.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("Security telemetry");

  const collectorRow = page.getByRole("button", {
    name: /Collector \/ Processors row Security and privacy telemetry/i,
  });
  await collectorRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText(
    "Security and privacy telemetry",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "backend.security_signal_store",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "Restricted export path with separate datasets and no vendor forwarding.",
  );

  const correlationRow = page.getByRole("button", {
    name: /Correlation To Audit row Mandatory keys/i,
  });
  await correlationRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Mandatory keys");
  await expect(page.locator("#drawer-body")).toContainText(
    "accepted_risk_approval_id",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "approval audit evidence",
  );
});
