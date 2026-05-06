import { expect, test } from "@playwright/test";

const deliveryPipelineAtlasUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=delivery-pipeline-atlas";

test("renders the delivery pipeline atlas with four semantic planes and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(deliveryPipelineAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", {
      name: "Execution lanes and delivery control topology",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Runner Pools", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Identity / Secret Resolution", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gates", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview Lifecycle", exact: true })).toBeVisible();
  await expect(page.locator("#run-status")).toHaveText("PROVIDER OVERRIDE APPLIED");
  await expect(page.locator("#drawer-title")).toHaveText("Linux build and contract validation");
});

test("supports keyboard selection across execution lanes, gates, and preview lifecycle rows", async ({
  page,
}) => {
  await page.goto(deliveryPipelineAtlasUrl);

  await page.locator("#environment-select").selectOption("env_ephemeral_review_preview");

  const previewLane = page.getByRole("button", { name: /^PREVIEW\b/i });
  await previewLane.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("PREVIEW");

  const previewPolicy = page.getByRole("button", {
    name: /Preview Lifecycle row Preview access and domain boundary/i,
  });
  await previewPolicy.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Preview access and domain boundary");
  await expect(page.locator("#drawer-body")).toContainText(
    "operator-preview-{preview_id}.review.taxat.example",
  );
  await expect(page.locator("#drawer-body")).toContainText("sec_ephemeral_review");

  const previewGate = page.getByRole("button", {
    name: /Gates row Preview publication gate/i,
  });
  await previewGate.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Preview publication gate");
  await expect(page.locator("#drawer-body")).toContainText("preview_deploy_receipt");
  await expect(page.locator("#drawer-body")).toContainText("env_ephemeral_review_preview");
});
