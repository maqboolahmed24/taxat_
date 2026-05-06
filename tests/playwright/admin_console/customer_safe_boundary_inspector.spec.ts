import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/debug/customer-safe-boundary-inspector/index.html";

test("customer-safe boundary inspector shows binding alignment and stripped families", async ({
  page,
}) => {
  await page.goto(route);

  await expect(page.getByTestId("customer-safe-boundary-inspector")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Customer-safe boundary inspector" }),
  ).toBeVisible();
  await expect(page.getByTestId("visibility-binding-summary")).toContainText("access-0152-preview");
  await expect(page.getByTestId("visibility-binding-summary")).toContainText("mask-0152-preview");
  await expect(page.getByTestId("visibility-binding-summary")).toContainText(
    "projection-cache://WORKSPACE_SNAPSHOT/preview-customer-visible",
  );
  await expect(page.getByTestId("stripped-field-family-chip")).toContainText([
    "ASSIGNMENT_STATE",
    "INTERNAL_ACTIVITY",
    "INTERNAL_ATTACHMENTS",
    "INTERNAL_COUNTS",
    "STAFF_ROUTE_CONTEXT",
  ]);
});

test("published customer-safe side never renders forbidden internal families", async ({ page }) => {
  await page.goto(route);

  await expect(page.getByTestId("candidate-internal-payload")).toContainText(
    "current_assignee_ref",
  );
  await expect(page.getByTestId("candidate-internal-payload")).toContainText("INTERNAL_ACTIVITY");
  await expect(page.getByTestId("published-customer-safe-payload")).toContainText(
    "CLIENT_PORTAL_SHELL",
  );
  await expect(page.getByTestId("published-customer-safe-payload")).toContainText(
    "/portal/requests/workflow-item-0152-preview",
  );
  await expect(page.getByTestId("published-customer-safe-payload")).not.toContainText(
    "current_assignee_ref",
  );
  await expect(page.getByTestId("published-customer-safe-payload")).not.toContainText(
    "INTERNAL_ACTIVITY",
  );
  await expect(page.getByTestId("published-customer-safe-payload")).not.toContainText(
    "attachment://internal-review-pack",
  );
  await expect(page.getByTestId("published-customer-safe-payload")).not.toContainText(
    "/work/items",
  );
});
