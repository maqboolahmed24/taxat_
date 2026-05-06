import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/schema-catalog-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("schema-catalog-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Schema families and document clusters",
    }),
  ).toBeVisible();
}

test("renders the schema catalog atlas with reduced-motion parity and the three semantic planes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Schema Catalog Atlas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Schema Identity", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Source / Hash Lineage", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sample / Validator Binding", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#import-posture")).toHaveText("MIRRORED_IMPORT_SYNCED");
  await expect(page.locator("#drawer-title")).toHaveText(
    "Schema Bundle Compatibility Gate Contract",
  );
});

test("supports keyboard selection across family, schema, and sample-binding rows", async ({
  page,
}) => {
  await gotoAtlas(page);

  const surfaceFamilyButton = page.getByRole("button", { name: /Surface & Experience/i });
  await surfaceFamilyButton.focus();
  await page.keyboard.press("Enter");

  const semanticAccessibilityRow = page.getByRole("button", {
    name: /Schema row Semantic Accessibility Contract/i,
  });
  await semanticAccessibilityRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Semantic Accessibility Contract");
  await expect(page.locator("#drawer-body")).toContainText(
    "packages/contracts-core/schemas/semantic_accessibility_contract.schema.json",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "sample_semantic_accessibility_contract.json",
  );

  const sampleBindingRow = page.getByRole("button", {
    name: /Binding row sample_semantic_accessibility_contract.json/i,
  });
  await sampleBindingRow.focus();
  await page.keyboard.press("Enter");

  await expect(sampleBindingRow).toHaveAttribute("data-active", "true");
  await expect(page.locator("#drawer-body")).toContainText(
    "python3 packages/contracts-core/python/validate_contracts.py --self-test",
  );
});
