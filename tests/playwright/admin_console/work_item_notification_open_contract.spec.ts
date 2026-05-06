import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/debug/work-item-notification-preview/index.html";

test("customer-visible notifications open the portal shell, route, module, and focus", async ({ page }) => {
  await page.goto(`${route}?scenario=customer`);

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Work item notification preview" })).toBeVisible();
  await expect(page.getByTestId("notification-route-map")).toContainText("CLIENT_PORTAL_SHELL");
  await expect(page.getByTestId("notification-route-map")).toContainText(
    "/portal/requests/workflow-item-0149-preview",
  );
  await expect(page.getByTestId("notification-route-map")).toContainText("CUSTOMER_ACTIVITY");
  await expect(page.getByTestId("notification-focus-contract")).toContainText(
    "request-info-focus://request-info://workflow-item-0149-preview/1",
  );
  await expect(page.getByTestId("notification-fallback-contract")).toContainText("/portal/requests");
});

test("internal notifications open the staff shell with internal activity focus", async ({ page }) => {
  await page.goto(`${route}?scenario=internal`);

  await expect(page.getByTestId("notification-route-map")).toContainText("CALM_SHELL");
  await expect(page.getByTestId("notification-route-map")).toContainText(
    "/work/items/workflow-item-0149-preview",
  );
  await expect(page.getByTestId("notification-route-map")).toContainText("INTERNAL_ACTIVITY");
  await expect(page.getByTestId("notification-focus-contract")).toContainText(
    "work-item-focus://workflow-item-0149-preview/internal-activity",
  );
  await expect(page.getByTestId("notification-fallback-contract")).toContainText("/work");
});

test("suppressed or invalidated notifications do not expose an active open target", async ({ page }) => {
  await page.goto(`${route}?scenario=suppressed`);

  await expect(page.getByTestId("notification-suppression-state")).toContainText(
    "ACCESS_BINDING_CHANGED",
  );
  await expect(page.getByTestId("notification-route-map")).toContainText("No active open target");
  await expect(page.getByTestId("notification-route-map")).toContainText("Not exposed");
  await expect(page.getByTestId("notification-focus-contract")).toContainText("INVALIDATED");
});
