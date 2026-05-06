import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/operations/reconciliation-insights/index.html";

test("renders the reconciliation insight surface with semantic anchors", async ({ page }) => {
  await page.goto(route);

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reconciliation insights" })).toBeVisible();
  await expect(page.getByTestId("reconciliation-profile-header")).toContainText("HMRC_SANDBOX");
  await expect(page.getByTestId("reconciliation-dominant-insight")).toContainText(
    "Ambiguity is the dominant pressure",
  );
  await expect(page.getByTestId("reconciliation-budget-band")).toBeVisible();
  await expect(page.getByTestId("reconciliation-reason-matrix")).toContainText(
    "RECONCILIATION_DEADLINE_EXPIRED",
  );
  await expect(page.getByTestId("reconciliation-resume-escalation-strip")).toContainText(
    "Blocked resend",
  );
});

test("applies filters to a zero-interaction window without false success copy", async ({
  page,
}) => {
  await page.goto(route);

  await page.getByLabel("Provider environment").selectOption("HMRC_PRODUCTION");
  await page.getByLabel("Operation family").selectOption("AUTH_SUBMIT_FINAL_DECLARATION");
  await page
    .getByLabel("Authority operation profile")
    .selectOption("authority-operation-profile://hmrc-empty-window");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByTestId("reconciliation-empty-state")).toBeVisible();
  await expect(page.getByTestId("reconciliation-empty-state")).toContainText(
    "Active filter: HMRC_PRODUCTION",
  );
  await expect(page.getByTestId("reconciliation-dominant-insight")).toContainText(
    "No interactions in this snapshot window",
  );
  await expect(page.getByRole("button", { name: "Apply filters" })).toBeFocused();
});

test("drill actions preserve the same route and work on compact viewports", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await page.goto(`${route}?scenario=resume-heavy`);
  const startingUrl = page.url();

  await expect(page.getByTestId("reconciliation-query-panel")).toBeVisible();
  await expect(page.getByTestId("reconciliation-dominant-insight")).toContainText(
    "Replay resume is visible",
  );
  await page.getByRole("button", { name: "Inspect Total interaction count" }).click();

  expect(page.url()).toBe(startingUrl);
  await expect(page.getByTestId("reconciliation-drill-table")).toContainText(
    "DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY",
  );
});
