import { expect, test } from "@playwright/test";

const releaseSupplyChainAtlasUrl =
  "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=release-supply-chain-atlas";

test("renders the release supply chain atlas with semantic planes and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(releaseSupplyChainAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", {
      name: "Artifact families and release chain custody",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source / Build", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Registry", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign / Notarize", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attest / SBOM", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Promotion Inputs", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "digest -> signature -> provenance -> SBOM -> candidate admission",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("API");
  await expect(page.locator("#run-status")).toHaveText("PROVIDER SELECTION REQUIRED");
});

test("supports keyboard selection across artifact families, rows, and chain segments", async ({
  page,
}) => {
  await page.goto(releaseSupplyChainAtlasUrl);

  await page.locator("#environment-select").selectOption("env_production");

  const nativeFamily = page
    .locator(".supplychain-family-rail-list button")
    .filter({ hasText: "NATIVE_DESKTOP" });
  await nativeFamily.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main-title")).toHaveText("NATIVE_DESKTOP");

  const signRow = page.getByRole("button", {
    name: /Sign \/ Notarize row Sign and notarize/i,
  });
  await signRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Sign and notarize");
  await expect(page.locator("#drawer-body")).toContainText("Developer ID Application certificate");
  await expect(page.locator("#drawer-body")).toContainText("notarization_ref");

  const candidateSegment = page.getByRole("button", {
    name: /Chain segment Candidate admission/i,
  });
  await candidateSegment.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Candidate admission");
  await expect(page.locator("#drawer-body")).toContainText("candidate_hash");
  await expect(page.locator("#drawer-body")).toContainText("schema_bundle_hash");
});
