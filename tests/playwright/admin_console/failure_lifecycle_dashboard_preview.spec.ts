import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/debug/failure-lifecycle-dashboard-preview/index.html";

test("failure lifecycle dashboard preview renders persisted lineage, owner, action, and accepted-risk review", async ({
  page,
}) => {
  await page.goto(route);

  await expect(page.getByTestId("failure-lifecycle-dashboard-preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Failure lifecycle dashboard" })).toBeVisible();
  await expect(page.getByTestId("failure-lineage-ribbon")).toContainText("error://error-0154-root");
  await expect(page.getByTestId("failure-lineage-ribbon")).toContainText(
    "error://error-0154-current",
  );
  await expect(page.getByTestId("failure-current-owner-card")).toContainText("TENANT_ADMIN");
  await expect(page.getByTestId("failure-current-owner-card")).toContainText(
    "tenant-admin://taxat/ops-owner",
  );
  await expect(page.getByTestId("failure-next-legal-action-card")).toContainText(
    "REVIEW_ACCEPTED_RISK_EXPIRY",
  );
  await expect(page.getByTestId("failure-next-legal-action-card")).toContainText(
    "workflow-item://workflow-0154-preview",
  );
  await expect(page.getByTestId("failure-accepted-risk-card")).toContainText("ACTIVE");
  await expect(page.getByTestId("failure-accepted-risk-card")).toContainText(
    "2026-06-03T10:00:00Z",
  );
  await expect(page.getByTestId("failure-blocking-scope-card")).toContainText("BLOCKS_FILING");
});
