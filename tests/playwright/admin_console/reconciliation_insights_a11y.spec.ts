import { expect, test } from "@playwright/test";

const route = "/apps/admin-console-web/public/operations/reconciliation-insights/index.html";

test("tables expose captions and column headers", async ({ page }) => {
  await page.goto(route);

  await expect(
    page.getByRole("table", {
      name: "Durable resend-refusal and escalation reason counts for the active snapshot.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Reason" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Window share" })).toBeVisible();
  await expect(
    page.getByRole("table", {
      name: "Read-only fields projected from the persisted reconciliation analytics snapshot.",
    }),
  ).toBeVisible();
});

test("keyboard focus moves through query controls in visible order", async ({ page }) => {
  await page.goto(route);
  await page.getByLabel("Provider environment").focus();
  await expect(page.getByLabel("Provider environment")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Operation family")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Authority operation profile")).toBeFocused();
});

test("reduced motion keeps filter application state available without animation dependence", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await page.getByRole("button", { name: "Apply filters" }).click();

  const duration = await page.getByTestId("reconciliation-profile-header").evaluate((element) => {
    return window.getComputedStyle(element).transitionDuration;
  });
  expect(["0.001ms", "1e-06s"]).toContain(duration);
});
