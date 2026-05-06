import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/workspace-topology-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("workspace-topology-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Workspace families and topology clusters",
    }),
  ).toBeVisible();
}

test("renders the workspace topology atlas with reduced-motion parity and the three semantic planes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Workspace Topology Atlas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ownership", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dependency / Task Graph", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Runtime Surface", exact: true })).toBeVisible();
  await expect(page.locator("#bootstrap-posture")).toHaveText("PROVIDER_OVERRIDE_APPLIED");
  await expect(page.locator("#drawer-title")).toHaveText("Operator Web App");
});

test("supports keyboard selection across family rail and ownership rows", async ({ page }) => {
  await gotoAtlas(page);

  const sharedPackagesButton = page.getByRole("button", { name: /SHARED_PACKAGES/i });
  await sharedPackagesButton.focus();
  await page.keyboard.press("Enter");

  const contractsCoreRow = page.getByRole("button", {
    name: /Ownership row Contracts Core/i,
  });
  await contractsCoreRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Contracts Core");
  await expect(page.locator("#drawer-body")).toContainText("packages/contracts-core");
  await expect(page.locator("#drawer-body")).toContainText("@taxat/foundations-contracts");

  const nativeButton = page.getByRole("button", { name: /NATIVE_MACOS/i });
  await nativeButton.focus();
  await page.keyboard.press("Enter");

  const nativeRow = page.getByRole("button", {
    name: /Ownership row TaxatOperator Xcode Workspace/i,
  });
  await nativeRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("TaxatOperator Xcode Workspace");
  await expect(page.locator("#drawer-body")).toContainText("native/TaxatOperator");
  await expect(page.locator("#drawer-body")).toContainText(
    "Signed macOS Xcode and SwiftPM boundary",
  );
});
