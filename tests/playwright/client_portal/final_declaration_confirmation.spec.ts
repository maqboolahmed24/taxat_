import { expect, test } from "@playwright/test";

const route = "/apps/client-portal-web/public/approvals/final-declaration-confirmation/index.html";

async function gotoConfirmation(page, scenario = "happy") {
  await page.goto(`${route}?scenario=${scenario}`);
  await expect(page.getByRole("main", { name: "Final declaration confirmation" })).toBeVisible();
  await expect(page.getByTestId("approval-summary")).toBeVisible();
}

async function surfaceOrder(page) {
  const ids = ["approval-summary", "change-digest", "declaration-panel", "sign-off-panel"];
  const tops = [];
  for (const id of ids) {
    const box = await page.getByTestId(id).boundingBox();
    tops.push(box?.y ?? 0);
  }
  return tops;
}

test("renders canonical surface order and completes happy-path pending-to-receipt flow", async ({
  page,
}) => {
  await gotoConfirmation(page);
  const order = await surfaceOrder(page);
  expect(order).toEqual([...order].sort((left, right) => left - right));

  await page.getByRole("button", { name: "Show detail" }).click();
  await expect(page.getByText("Calculation ID CALC-2026-FD-0004")).toBeVisible();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();

  await page.getByLabel("I have reviewed the current calculation").check();
  await expect(page.getByTestId("approval-submit")).toBeEnabled();
  await page.getByRole("button", { name: "Sign and submit" }).click();
  await expect(page.getByTestId("approval-pending-receipt")).toBeVisible();
  await expect(page.getByTestId("approval-final-receipt")).toBeHidden();

  await page.getByRole("button", { name: "Show final receipt" }).click();
  await expect(page.getByTestId("approval-pending-receipt")).toBeHidden();
  await expect(page.getByTestId("approval-final-receipt")).toBeVisible();
});

test("stale and superseded packs lock sign-off and current-material actions", async ({ page }) => {
  await gotoConfirmation(page, "stale");
  await expect(page.getByTestId("calculation-stale-notice")).toBeVisible();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
  await expect(page.getByTestId("declaration-download")).toBeDisabled();
  await expect(page.getByTestId("declaration-print")).toBeDisabled();

  await page.goto(`${route}?scenario=superseded`);
  await expect(page.getByTestId("calculation-stale-notice")).toBeVisible();
  await expect(page.getByText("Superseded")).toBeVisible();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
});

test("modeled calculation shows separate non-filing posture", async ({ page }) => {
  await gotoConfirmation(page, "modeled");
  await expect(page.getByTestId("calculation-modeled-notice")).toBeVisible();
  await expect(
    page.getByTestId("approval-context-bar").getByText("Modeled calculation"),
  ).toBeVisible();
  await page.getByLabel("I have reviewed the current calculation").check();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
});

test("inline step-up stays on route and removal enables sign-off after acknowledgement", async ({
  page,
}) => {
  await gotoConfirmation(page, "stepup");
  await expect(page.getByTestId("approval-step-up-inline")).toBeVisible();
  await page.getByLabel("I have reviewed the current calculation").check();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();

  await page.getByRole("button", { name: "Complete step-up" }).click();
  await expect(page.getByTestId("approval-step-up-inline")).toBeHidden();
  await expect(page.getByTestId("approval-submit")).toBeEnabled();
});

test("mobile layout keeps same reading order after reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await gotoConfirmation(page);
  const before = await surfaceOrder(page);
  expect(before).toEqual([...before].sort((left, right) => left - right));
  await page.reload();
  await expect(page.getByTestId("calculation-identity-strip")).toContainText("2025 to 2026");
  const after = await surfaceOrder(page);
  expect(after).toEqual([...after].sort((left, right) => left - right));
});
