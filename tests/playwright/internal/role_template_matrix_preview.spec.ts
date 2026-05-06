import { expect, test, type Page } from "@playwright/test";

const previewPath =
  "/apps/operator-web/public/internal/role-template-matrix-preview/index.html";

async function gotoPreview(page: Page) {
  await page.goto(previewPath);
  await expect(page.getByTestId("role-template-matrix-preview")).toBeVisible();
  await expect(page.getByTestId("role-matrix-canvas")).toBeVisible();
  await expect(page.getByTestId("role-cell-inspector")).toBeVisible();
}

async function visibleCellRefs(page: Page) {
  return page.locator("[data-testid='role-matrix-cell']").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-cell-ref")).filter(Boolean),
  );
}

test("renders the role template matrix preview with reduced motion and frozen hash context", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoPreview(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Role Template Matrix Preview")).toBeVisible();
  await expect(page.locator("#role-chip")).toContainText("Tenant Admin");
  await expect(page.locator("#policy-hash-chip")).toContainText("Policy");
  await expect(page.locator("#version-hash-chip")).toContainText("Version");
  await expect(page.locator("#stale-chip")).toHaveText("Stale Review Required");
  await expect(page.locator("#summary-strip")).toContainText("Selected");
});

test("supports keyboard traversal across cells and updates inspector with the new focus anchor", async ({
  page,
}) => {
  await gotoPreview(page);

  const selectedCell = page.locator("[data-cell-ref='cell.RetentionAction.EXECUTE_ERASURE']");
  await selectedCell.focus();
  await page.keyboard.press("ArrowRight");

  const nextCell = page.locator("[data-cell-ref='cell.RetentionAction.EXECUTE_RETENTION']");
  await expect(nextCell).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#inspector-title")).toHaveText(
    "Retention Action / Execute Retention",
  );
  await expect(page.locator("#summary-strip")).toContainText(
    "Focus cell.RetentionAction.EXECUTE_RETENTION",
  );
});

test("applies filters deterministically regardless of selection order", async ({ page }) => {
  await gotoPreview(page);

  await page.getByRole("button", { name: "Filter resource class Submission Record" }).click();
  await page.getByRole("button", { name: "Filter action family Submit To Authority" }).click();
  await page.getByRole("button", { name: "Filter decision outcome Step-up" }).click();
  const firstPass = await visibleCellRefs(page);

  await page.getByRole("button", { name: "Clear all role matrix filters" }).click();

  await page.getByRole("button", { name: "Filter decision outcome Step-up" }).click();
  await page.getByRole("button", { name: "Filter action family Submit To Authority" }).click();
  await page.getByRole("button", { name: "Filter resource class Submission Record" }).click();
  const secondPass = await visibleCellRefs(page);

  expect(secondPass).toEqual(firstPass);
  expect(secondPass).toEqual(["cell.SubmissionRecord.SUBMIT_TO_AUTHORITY"]);
});

test("preserves the selected cell when filters keep it visible", async ({ page }) => {
  await gotoPreview(page);

  const selectedCell = page.locator("[data-cell-ref='cell.SubmissionRecord.SUBMIT_TO_AUTHORITY']");
  await selectedCell.click();
  await page.getByRole("button", { name: "Filter resource class Submission Record" }).click();
  await page.getByRole("button", { name: "Filter decision outcome Step-up" }).click();

  await expect(selectedCell).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#inspector-title")).toHaveText(
    "Submission Record / Submit To Authority",
  );
  await expect(page.locator("#summary-strip")).toContainText(
    "Selected cell.SubmissionRecord.SUBMIT_TO_AUTHORITY",
  );
});

test("surfaces deterministic recovery posture when filters remove the selected cell", async ({
  page,
}) => {
  await gotoPreview(page);

  const selectedCell = page.locator("[data-cell-ref='cell.SubmissionRecord.SUBMIT_TO_AUTHORITY']");
  await selectedCell.click();
  await page.getByRole("button", { name: "Filter resource class Client" }).click();

  await expect(page.locator("#recovery-banner")).toContainText(
    "The selected cell is no longer visible in the filtered slice.",
  );
  await expect(page.locator("#summary-strip")).toContainText("Recovery Required");
  await expect(page.locator("#summary-strip")).toContainText("Access Rebind Required");
  await expect(page.locator("#inspector-title")).toHaveText("Selection recovery required");
});
