import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/debug/continuity-contract-preview/index.html";

test("continuity contract preview renders route, focus, fallback, and invalidation metadata", async ({
  page,
}) => {
  await page.goto(route);

  await expect(page.getByTestId("continuity-contract-preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continuity contract preview" })).toBeVisible();
  await expect(page.getByTestId("continuity-case-row")).toHaveCount(3);
  await expect(page.getByTestId("continuity-route-focus-map")).toContainText(
    "/work/items/workflow-item-0155-preview",
  );
  await expect(page.getByTestId("continuity-fallback-order")).toContainText("OBJECT_SUMMARY");
  await expect(page.getByTestId("continuity-invalidation-reasons")).toContainText(
    "SESSION_REVOKED",
  );

  await page.getByRole("button", { name: /Notification open stale focus/ }).click();
  await expect(page.getByTestId("continuity-route-focus-map")).toContainText(
    "object-summary://workflow-item-0155-preview",
  );
  await expect(page.getByTestId("continuity-fallback-order")).toContainText("PARENT_RETURN");
});

test("continuity contract preview keeps reduced-motion route map stable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);

  await expect(page.getByTestId("continuity-route-focus-map")).toContainText(
    "work-inbox-row://workflow-item-0155-preview",
  );
});
