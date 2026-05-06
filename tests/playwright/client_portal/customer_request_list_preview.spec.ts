import { expect, test } from "@playwright/test";

const route = "/apps/client-portal-web/public/debug/customer-request-list-preview/index.html";

test("customer request list preview renders task rows and action authority", async ({ page }) => {
  await page.goto(route);

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer request list preview" })).toBeVisible();
  await expect(page.getByTestId("customer-request-list-preview")).toContainText("CLIENT_PORTAL_SHELL");
  await expect(page.getByTestId("customer-request-list-preview")).toContainText("/portal/requests");
  await expect(page.getByTestId("customer-request-list-preview")).toContainText(
    "customer-request-row://workflow-item-0150-preview",
  );
  await expect(page.getByTestId("customer-request-row")).toHaveCount(2);
  await expect(page.getByTestId("customer-request-authoritative-action").first()).toContainText(
    "RESPOND_TO_REQUEST_INFO",
  );
});

test("customer request list preview stays client-safe after reload", async ({ page }) => {
  await page.goto(route);
  await page.reload();

  await expect(page.getByTestId("customer-request-list-preview")).not.toContainText(/manifest|gate|staff/i);
  await expect(page.getByTestId("customer-request-authoritative-action").nth(1)).toContainText(
    "We are reviewing this",
  );
});
