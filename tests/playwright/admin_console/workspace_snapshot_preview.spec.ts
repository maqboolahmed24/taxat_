import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/debug/workspace-snapshot-preview/index.html";

test("staff workspace preview renders the calm shell with internal modules", async ({ page }) => {
  await page.goto(`${route}?scenario=staff`);

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspace snapshot preview" })).toBeVisible();
  await expect(page.getByTestId("workspace-context-bar")).toContainText("CALM_SHELL");
  await expect(page.getByTestId("workspace-context-bar")).toContainText(
    "/work/items/workflow-item-0150-preview",
  );
  await expect(page.getByTestId("workspace-detail-drawer")).toContainText("INTERNAL_ACTIVITY");
  await expect(page.getByTestId("workspace-detail-drawer")).toContainText("AUDIT_TRAIL");
  await expect(page.getByTestId("workspace-detail-drawer")).toContainText(
    "download://workflow-item-0150-preview/internal",
  );
  await expect(page.getByTestId("workspace-route-focus-map")).toContainText("/work");
});

test("customer workspace preview keeps the same item in portal shell and suppresses internal fields", async ({ page }) => {
  await page.goto(`${route}?scenario=customer`);

  await expect(page.getByTestId("workspace-context-bar")).toContainText("CLIENT_PORTAL_SHELL");
  await expect(page.getByTestId("workspace-context-bar")).toContainText(
    "/portal/requests/workflow-item-0150-preview",
  );
  await expect(page.getByTestId("workspace-action-strip")).toContainText("RESPOND_TO_REQUEST_INFO");
  await expect(page.getByTestId("workspace-detail-drawer")).toContainText("CUSTOMER_ACTIVITY");
  await expect(page.getByTestId("workspace-detail-drawer")).toContainText("FILES");
  await expect(page.getByTestId("workspace-detail-drawer")).not.toContainText("INTERNAL_ACTIVITY");
  await expect(page.getByTestId("workspace-detail-drawer")).toContainText("Not exposed");
  await expect(page.getByTestId("workspace-route-focus-map")).toContainText("/portal/requests");
});
