import { expect, test } from "@playwright/test";

const edgeBoundaryAtlasUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=edge-boundary-atlas";

test("renders the edge boundary atlas with four semantic planes and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(edgeBoundaryAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", {
      name: "Surface families and edge boundary planes",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hostnames / Origins", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "TLS / Certificates", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "WAF / Rate Limits", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cache / Delivery Binding", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#run-status")).toHaveText("PROVIDER DEFAULT APPLIED");
  await expect(page.locator("#drawer-title")).toHaveText("Operator application shell");
});

test("supports keyboard selection across families and boundary planes", async ({ page }) => {
  await page.goto(edgeBoundaryAtlasUrl);

  await page.locator("#environment-select").selectOption("env_production");

  const callbackFamily = page
    .locator(".edge-family-rail-list button")
    .filter({ hasText: "CALLBACKS" });
  await callbackFamily.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("CALLBACKS");

  const authorityIngress = page.getByRole("button", {
    name: /Hostnames \/ Origins row Provider callback ingress/i,
  });
  await authorityIngress.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Provider callback ingress");
  await expect(page.locator("#drawer-body")).toContainText(
    "authority-ingress.production.taxat.example",
  );
  await expect(page.locator("#drawer-body")).toContainText("waf.callbacks");

  const callbackCache = page.getByRole("button", {
    name: /Cache \/ Delivery Binding row Callback and webhook cache bypass/i,
  });
  await callbackCache.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Callback and webhook cache bypass");
  await expect(page.locator("#drawer-body")).toContainText("Cache-Control: no-store");
  await expect(page.locator("#drawer-body")).toContainText("CALLBACK_REQUEST_PROOF_ONLY");
});
