import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/code-quality-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("code-quality-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Code quality tool families",
    }),
  ).toBeVisible();
}

test("renders the code quality atlas with reduced-motion parity and stage-lane semantics", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Code Quality Atlas")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Guardrail stage coverage", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("SAVE", { exact: true })).toBeVisible();
  await expect(page.getByText("STAGED", { exact: true })).toBeVisible();
  await expect(page.getByText("COMMIT", { exact: true })).toBeVisible();
  await expect(page.getByText("CI", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Biome Format SAVE active")).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Biome Format");
});

test("supports keyboard traversal from family rail into the loom and exposes JS, Python, and generated coverage paths", async ({
  page,
}) => {
  await gotoAtlas(page);

  const formatFamilyButton = page.getByRole("button", { name: /FORMAT tool family/i });
  await formatFamilyButton.focus();
  await page.keyboard.press("Enter");

  const biomeButton = page.getByRole("button", { name: /Tool band Biome Format/i });
  await biomeButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Biome Format");
  await expect(page.locator("#drawer-body")).toContainText(
    "apps/operator-web/src/routes/internal/code-quality-atlas.tsx",
  );

  const typecheckFamilyButton = page.getByRole("button", { name: /TYPECHECK tool family/i });
  await typecheckFamilyButton.focus();
  await page.keyboard.press("Enter");

  const pyrightButton = page.getByRole("button", { name: /Tool band Pyright/i });
  await pyrightButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Pyright");
  await expect(page.locator("#drawer-body")).toContainText("python/validators/src/**");

  const hooksFamilyButton = page.getByRole("button", { name: /HOOKS tool family/i });
  await hooksFamilyButton.focus();
  await page.keyboard.press("Enter");

  const guardButton = page.getByRole("button", {
    name: /Tool band Generated \/ Mirror Edit Guard/i,
  });
  await guardButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Generated / Mirror Edit Guard");
  await expect(page.locator("#drawer-body")).toContainText(
    "packages/generated-models/src/generated/typescript/**",
  );
});
