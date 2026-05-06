import { expect, test } from "@playwright/test";

const route = "/apps/client-portal-web/public/debug/request-detail-continuity-preview/index.html";

test("request detail preview restores the serialized parent row instead of a tab root", async ({
  page,
}) => {
  await page.goto(route);

  await expect(page.getByTestId("continuity-contract-preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request detail continuity" })).toBeVisible();
  await expect(page.getByTestId("continuity-case-row")).toHaveCount(3);
  await expect(page.getByTestId("continuity-route-focus-map")).toContainText(
    "/portal/requests/workflow-item-0155-preview",
  );
  await expect(page.getByTestId("continuity-route-focus-map")).toContainText(
    "customer-request-row://workflow-item-0155-preview",
  );
  await expect(page.getByTestId("continuity-fallback-order")).toContainText("OBJECT_SUMMARY");
  await expect(page.getByTestId("continuity-invalidation-reasons")).toContainText("OBJECT_GONE");
});

test("request detail preview proves help handoff and stale same-object fallback", async ({
  page,
}) => {
  await page.goto(route);

  await page.getByRole("button", { name: /Help returns to source anchor/ }).click();
  await expect(page.getByTestId("continuity-route-focus-map")).toContainText(
    "help-link:workflow-item-0155-preview",
  );

  await page.getByRole("button", { name: /Stale exact target uses object summary/ }).click();
  await expect(page.getByTestId("continuity-route-focus-map")).toContainText(
    "request-summary://workflow-item-0155-preview",
  );
  await expect(page.getByTestId("continuity-fallback-order")).toContainText(
    "NARROWEST_SURVIVING_LIST",
  );
});
