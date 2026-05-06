import { expect, test, type Page } from "@playwright/test";

const previewPath =
  "/apps/operator-web/public/internal/principal-access-view-preview/index.html";

async function gotoPreview(page: Page) {
  await page.goto(previewPath);
  await expect(page.getByTestId("principal-access-view-preview")).toBeVisible();
  await expect(page.getByTestId("principal-access-matrix-canvas")).toBeVisible();
  await expect(page.getByTestId("principal-access-inspector")).toBeVisible();
}

async function visibleCellRefs(page: Page) {
  return page
    .locator("[data-testid='principal-access-cell']")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-cell-ref")).filter(Boolean),
    );
}

test("renders the principal access preview with reduced motion and frozen context chips", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoPreview(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Principal Access View Preview")).toBeVisible();
  await expect(page.locator("#principal-chip")).toContainText("Alex Rowan");
  await expect(page.locator("#authn-chip")).toContainText("Mfa authn");
  await expect(page.locator("#stepup-chip")).toContainText("Step-up");
  await expect(page.locator("#policy-chip")).toContainText("Policy");
  await expect(page.locator("#summary-strip")).toContainText(
    "Selected cell.Override.CREATE_OVERRIDE",
  );
});

test("supports keyboard travel across the mounted matrix and updates the inspector", async ({
  page,
}) => {
  await gotoPreview(page);

  const maskedCell = page.locator("[data-cell-ref='cell.Client.VIEW_MASKED']");
  await maskedCell.focus();
  await page.keyboard.press("ArrowRight");

  const nextCell = page.locator("[data-cell-ref='cell.Client.VIEW_FULL']");
  await expect(nextCell).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#shelf-title")).toHaveText("Client / View Full");
  await expect(page.locator("#inspector-title")).toHaveText("Client / View Full");
});

test("applies lawful principal filters deterministically without dropping the mounted selection", async ({
  page,
}) => {
  await gotoPreview(page);

  await page
    .getByRole("button", { name: "Filter principal type Human" })
    .click();
  await page.getByRole("button", { name: "Filter role ref Tenant Admin" }).click();
  await page
    .getByRole("button", { name: "Filter delegated client Client Taxpayer 321" })
    .click();
  const firstPass = await visibleCellRefs(page);

  await page.getByRole("button", { name: "Clear all principal access filters" }).click();

  await page
    .getByRole("button", { name: "Filter delegated client Client Taxpayer 321" })
    .click();
  await page.getByRole("button", { name: "Filter role ref Tenant Admin" }).click();
  await page
    .getByRole("button", { name: "Filter principal type Human" })
    .click();
  const secondPass = await visibleCellRefs(page);

  expect(secondPass).toEqual(firstPass);
  await expect(page.locator("#summary-strip")).toContainText(
    "Selected cell.Override.CREATE_OVERRIDE",
  );
});

test("surfaces typed recovery when filters exclude the mounted principal", async ({
  page,
}) => {
  await gotoPreview(page);

  await page.getByRole("button", { name: "Filter principal type Service" }).click();

  await expect(page.locator("#recovery-banner")).toContainText(
    "The selected principal is no longer visible in the filtered directory slice.",
  );
  await expect(page.locator("#summary-strip")).toContainText("Recovery Required");
  await expect(page.locator("#shelf-title")).toHaveText("Selection recovery required");
  await expect(page.locator("#inspector-title")).toHaveText("Selection recovery required");
});
