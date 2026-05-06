import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/binding-coverage-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("binding-coverage-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Binding languages and coverage posture",
    }),
  ).toBeVisible();
}

test("renders the binding coverage atlas with reduced-motion parity and the three semantic planes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Binding Coverage Atlas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Schema Family", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Generated Output / Tool", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Coverage / Gap Posture", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#generation-posture")).toHaveText("DETERMINISTIC_BINDING_GENERATION");
  await expect(page.locator("#drawer-title")).toHaveText("Surface & Experience");
  await expect(page.locator("#lineage-strip")).toContainText("schema source hash");
});

test("supports keyboard selection across language, family, and gap rows", async ({ page }) => {
  await gotoAtlas(page);

  const languageRail = page.getByRole("navigation", {
    name: "Binding languages and coverage posture",
  });

  const swiftButton = languageRail.getByRole("button", { name: /^SWIFT\b/i });
  await swiftButton.focus();
  await page.keyboard.press("Enter");

  const authorityRow = page.getByRole("button", {
    name: /Schema family row Authority & Access/i,
  });
  await authorityRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Authority & Access");
  await expect(page.locator("#drawer-body")).toContainText(
    "native/TaxatOperator/GeneratedContracts/Sources/GeneratedContracts/Generated/AuthorityAndAccess.swift",
  );

  const gapRow = page.getByRole("button", {
    name: /Gap row SWIFT:AUTHORITY_AND_ACCESS:SWIFT_EXTERNAL_REF_FALLBACK/i,
  });
  await gapRow.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText(
    "SWIFT:AUTHORITY_AND_ACCESS:SWIFT_EXTERNAL_REF_FALLBACK",
  );
  await expect(page.locator("#drawer-body")).toContainText(
    "Promote the referenced family into the Swift subset or add a manual native adapter outside GeneratedContracts.",
  );
});
