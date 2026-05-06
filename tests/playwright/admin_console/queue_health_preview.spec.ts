import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/debug/queue-health-preview/index.html";

test("queue health preview renders the persisted contract band and reason table", async ({
  page,
}) => {
  await page.goto(route);

  await expect(page.getByRole("heading", { name: "Queue health preview" })).toBeVisible();
  await expect(page.getByTestId("queue-health-band")).toContainText("SATURATED");
  await expect(page.getByTestId("queue-pressure-strip")).toContainText("72/100");
  await expect(page.getByTestId("queue-intervention-card")).toContainText("STAFFING_REVIEW");
  await expect(page.getByLabel("Contract basis")).toContainText(
    "PERSISTED_WORK_QUEUE_HEALTH_CONTRACT_ONLY",
  );
  await expect(page.getByTestId("queue-reason-table")).toContainText(
    "WORK_QUEUE_UTILIZATION_SATURATED",
  );
});
