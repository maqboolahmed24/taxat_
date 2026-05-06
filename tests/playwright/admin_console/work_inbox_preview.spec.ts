import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/debug/work-inbox-preview/index.html";

test("work inbox preview renders canonical order and split badges", async ({ page }) => {
  await page.goto(route);

  await expect(page.getByRole("heading", { name: "Work inbox preview" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Queue health" })).toContainText(
    "CANONICAL_SORT_KEY_ONLY",
  );
  await expect(page.getByLabel("Inbox rows").getByRole("article")).toHaveText([
    /Payroll records needed[\s\S]*Customer 1[\s\S]*Internal 1/,
    /Review bank evidence[\s\S]*Customer 0[\s\S]*Internal 1/,
    /Assign onboarding check[\s\S]*Customer 0[\s\S]*Internal 0/,
  ]);
});

test("work inbox preview preserves selected row and records deferred delta posture", async ({
  page,
}) => {
  await page.goto(route);

  await expect(page.getByLabel("Selected row")).toContainText("Payroll records needed");
  await expect(page.getByRole("region", { name: "Delta application log" })).toContainText(
    "Reorder deferred until focus exit",
  );
  const selectedRow = page.getByLabel(/Payroll records needed/);
  await expect(selectedRow.getByText("Customer 1")).toBeVisible();
  await expect(selectedRow.getByText("Internal 1")).toBeVisible();
});
